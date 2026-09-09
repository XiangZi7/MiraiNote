//! Encrypted per-document transcripts, independent of live runs.
use super::{
    config,
    manager::{now, Cell, Entry, Run, Snapshot},
};
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    io::Write,
    path::{Path, PathBuf},
    sync::{atomic::Ordering, Arc, Weak},
};
use tauri::{AppHandle, Manager};

pub(super) struct Identity {
    pub id: String,
    pub title: String,
    pub document_id: String,
    pub created_at: i64,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub id: String,
    pub title: String,
    pub model: String,
    pub provider: String,
    pub document_name: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Record {
    #[serde(flatten)]
    pub summary: Summary,
    document_id: String,
    pub revision: String,
    status: String,
    pub entries: Vec<Entry>,
    pub messages: Vec<Value>,
}

impl Record {
    fn from_run(run: &Run, cell: &Cell) -> Self {
        Self {
            summary: Summary {
                id: run.history.id.clone(),
                title: run.history.title.clone(),
                model: run.config.model.clone(),
                provider: run.config.base_url.clone(),
                document_name: run.context.document.name.clone(),
                created_at: run.history.created_at,
                updated_at: now(),
            },
            document_id: run.history.document_id.clone(),
            revision: run.snapshot_revision.clone(),
            status: run.snapshot(cell).status,
            entries: run.entries.clone(),
            // Rebuild the system policy on resume, and never serialize credentials.
            messages: run
                .messages
                .iter()
                .filter(|message| message["role"] != "system")
                .cloned()
                .collect(),
        }
    }
    pub fn identity(&self) -> Identity {
        Identity {
            id: self.summary.id.clone(),
            title: self.summary.title.clone(),
            document_id: self.document_id.clone(),
            created_at: self.summary.created_at,
        }
    }
    pub fn snapshot(self) -> Snapshot {
        Snapshot {
            id: String::new(),
            conversation_id: self.summary.id,
            document: self.summary.document_name,
            document_id: self.document_id,
            model: self.summary.model,
            provider: self.summary.provider,
            // A restored transcript has no live run, so unfinished work is never shown as active.
            status: match self.status.as_str() {
                "running" => "cancelled".into(),
                other => other.into(),
            },
            entries: self.entries,
            save_error: None,
        }
    }
}

#[derive(Default)]
pub(super) struct Store {
    // Only the newest live run may write a transcript. Late responses cannot resurrect a deleted
    // conversation or overwrite a resumed one. Weak handles do not retain API keys.
    owners: std::collections::HashMap<String, Weak<Cell>>,
    // Title edits are independent of an in-flight model or tool response.
    titles: std::collections::HashMap<String, String>,
}

fn directory(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|_| AppError::internal("无法定位聊天记录目录"))?
        .join("ai-conversations"))
}
fn record_path(dir: &Path, id: &str) -> AppResult<PathBuf> {
    if id.len() != 32 || !id.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(AppError::invalid_input("无效的聊天会话 ID"));
    }
    Ok(dir.join(format!("{id}.bin")))
}
fn decode(path: &Path) -> AppResult<Record> {
    if std::fs::metadata(path)?.len() > 16 * 1024 * 1024 {
        return Err(AppError::invalid_input("聊天记录文件过大"));
    }
    let bytes = config::protect(&std::fs::read(path)?, false)?;
    serde_json::from_slice(&bytes).map_err(|_| AppError::invalid_input("聊天记录已损坏"))
}
fn read(dir: &Path, id: &str, document_id: &str) -> AppResult<Record> {
    let record = decode(&record_path(dir, id)?)?;
    if record.summary.id != id || record.document_id != document_id {
        return Err(AppError::invalid_input("此聊天记录不属于当前文档"));
    }
    Ok(record)
}
fn write(dir: &Path, record: &Record) -> AppResult<()> {
    let path = record_path(dir, &record.summary.id)?;
    std::fs::create_dir_all(dir)?;
    let bytes = serde_json::to_vec(record).map_err(|_| AppError::internal("无法保存聊天记录"))?;
    let encrypted = config::protect(&bytes, true)?;
    let temporary = path.with_extension("bin.tmp");
    let mut file = std::fs::File::create(&temporary)?;
    file.write_all(&encrypted)?;
    file.sync_all()?;
    drop(file);
    std::fs::rename(temporary, path)?;
    Ok(())
}

impl Store {
    pub fn register(&mut self, conversation_id: &str, cell: &Arc<Cell>) {
        self.owners
            .insert(conversation_id.into(), Arc::downgrade(cell));
    }
    pub fn save(&self, app: &AppHandle, run: &Run, cell: &Cell) -> AppResult<()> {
        self.save_at(&directory(app)?, run, cell)
    }
    fn save_at(&self, dir: &Path, run: &Run, cell: &Cell) -> AppResult<()> {
        if self
            .owners
            .get(&run.history.id)
            .and_then(Weak::upgrade)
            .is_some_and(|owner| std::ptr::eq(owner.as_ref(), cell))
        {
            let mut record = Record::from_run(run, cell);
            if let Some(title) = self.titles.get(&run.history.id) {
                record.summary.title = title.clone();
            }
            write(dir, &record)?;
        }
        Ok(())
    }
    pub fn list(&self, app: &AppHandle, document_id: &str) -> AppResult<Vec<Summary>> {
        let dir = directory(app)?;
        let files = match std::fs::read_dir(&dir) {
            Ok(files) => files,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
            Err(error) => return Err(error.into()),
        };
        let mut summaries = Vec::new();
        for file in files.take(2000) {
            let path = file?.path();
            if path.extension().and_then(|value| value.to_str()) != Some("bin") {
                continue;
            }
            let record = decode(&path)?;
            if record_path(&dir, &record.summary.id)? != path {
                return Err(AppError::invalid_input("聊天记录文件与会话 ID 不匹配"));
            }
            if record.document_id == document_id {
                summaries.push(record.summary);
            }
        }
        summaries.sort_by(|a, b| {
            b.updated_at
                .cmp(&a.updated_at)
                .then_with(|| a.id.cmp(&b.id))
        });
        summaries.truncate(200);
        Ok(summaries)
    }
    pub fn open(&self, app: &AppHandle, id: &str, document_id: &str) -> AppResult<Record> {
        read(&directory(app)?, id, document_id)
    }
    pub fn rename(
        &mut self,
        app: &AppHandle,
        id: &str,
        document_id: &str,
        title: &str,
    ) -> AppResult<Summary> {
        self.rename_at(&directory(app)?, id, document_id, title)
    }
    fn rename_at(
        &mut self,
        dir: &Path,
        id: &str,
        document_id: &str,
        title: &str,
    ) -> AppResult<Summary> {
        let title = title.trim();
        if title.is_empty() || title.chars().count() > 60 || title.chars().any(char::is_control) {
            return Err(AppError::invalid_input(
                "请输入 1 至 60 个字符的会话名称，不能包含换行或控制字符",
            ));
        }
        let mut record = read(dir, id, document_id)?;
        record.summary.title = title.into();
        write(dir, &record)?;
        self.titles.insert(id.into(), title.into());
        Ok(record.summary)
    }
    pub fn delete(&mut self, app: &AppHandle, id: &str, document_id: &str) -> AppResult<()> {
        let dir = directory(app)?;
        read(&dir, id, document_id)?;
        std::fs::remove_file(record_path(&dir, id)?)?;
        self.titles.remove(id);
        if let Some(owner) = self.owners.remove(id).and_then(|owner| owner.upgrade()) {
            owner.cancelled.store(true, Ordering::SeqCst);
        }
        Ok(())
    }
    pub fn resume(&self, app: &AppHandle, id: &str, document_id: &str) -> AppResult<Record> {
        let dir = directory(app)?;
        // Validate the document before touching any live owner.
        let record = read(&dir, id, document_id)?;
        if let Some(owner) = self.owners.get(id).and_then(Weak::upgrade) {
            let run = owner
                .run
                .try_lock()
                .map_err(|_| AppError::invalid_input("上一轮请求仍在结束中，请稍后继续此会话"))?;
            if !owner.cancelled.load(Ordering::SeqCst) && run.status == "running" {
                return Err(AppError::invalid_input(
                    "此会话仍在处理中，请先停止当前任务",
                ));
            }
            self.save(app, &run, &owner)?;
            owner.cancelled.store(true, Ordering::SeqCst);
            return read(&dir, id, document_id);
        }
        Ok(record)
    }
}

// Missing tool results represent interrupted work, never permission to replay it.
pub(super) fn resume_messages(messages: Vec<Value>) -> Vec<Value> {
    let mut result = Vec::new();
    let mut pending = Vec::<String>::new();
    for message in messages {
        if message["role"] == "system" {
            continue;
        }
        if message["role"] != "tool" {
            close_pending(&mut result, &mut pending);
        } else if let Some(id) = message["tool_call_id"].as_str() {
            pending.retain(|value| value != id);
        }
        if let Some(calls) = message["tool_calls"].as_array() {
            pending.extend(
                calls
                    .iter()
                    .filter_map(|call| call["id"].as_str().map(String::from)),
            );
        }
        result.push(message);
    }
    close_pending(&mut result, &mut pending);
    result
}
fn close_pending(messages: &mut Vec<Value>, pending: &mut Vec<String>) {
    for call_id in pending.drain(..) {
        messages.push(json!({"role":"tool", "tool_call_id":call_id, "content":"The previous tool call was interrupted. There is no result. Do not assume what it would have returned; call the tool again if you still need the data."}));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::manager::tests::test_run;

    fn cell(conversation_id: &str) -> Arc<Cell> {
        let mut run = test_run();
        run.history.id = conversation_id.into();
        run.config.api_key = "test-secret-never-stored".into();
        run.messages = vec![
            json!({"role":"system","content":"current policy"}),
            json!({"role":"user","content":"总结这份文档"}),
        ];
        run.entry("user", "总结这份文档", None);
        Arc::new(Cell::new(run))
    }
    fn scratch() -> PathBuf {
        std::env::temp_dir().join(format!(
            "mirainote-history-test-{}",
            uuid::Uuid::new_v4().simple()
        ))
    }

    #[test]
    fn resumes_context_without_replaying_unfinished_tools() {
        let messages = resume_messages(vec![
            json!({"role":"system","content":"old policy"}),
            json!({"role":"user","content":"检查"}),
            json!({"role":"assistant","tool_calls":[{"id":"done"}]}),
            json!({"role":"tool","tool_call_id":"done","content":"confirmed result"}),
            json!({"role":"assistant","tool_calls":[{"id":"pending"}]}),
        ]);
        assert_eq!(messages.len(), 5);
        assert_eq!(messages[2]["content"], "confirmed result");
        assert_eq!(messages[4]["tool_call_id"], "pending");
        assert!(messages[4]["content"]
            .as_str()
            .unwrap()
            .contains("no result"));
        assert!(!messages.iter().any(|message| message["role"] == "system"));
    }

    #[test]
    fn rejects_paths_outside_the_history_directory() {
        for invalid in [
            "../other",
            "C:/secret",
            "",
            "abc",
            "0000000000000000000000000000000/",
        ] {
            assert!(record_path(Path::new("history"), invalid).is_err());
        }
        assert!(record_path(
            Path::new("history"),
            "0123456789abcdef0123456789abcdef"
        )
        .is_ok());
    }

    #[cfg(windows)]
    #[tokio::test]
    async fn encrypted_history_survives_reload_and_stays_bound_to_its_document() {
        let conversation_id = uuid::Uuid::new_v4().simple().to_string();
        let dir = scratch();
        let owner = cell(&conversation_id);
        let mut store = Store::default();
        store.register(&conversation_id, &owner);
        let mut run = owner.run.lock().await;
        store.save_at(&dir, &run, &owner).unwrap();
        run.entry("assistant", "**文档摘要**", None);
        store.save_at(&dir, &run, &owner).unwrap();
        drop(run);
        let record = read(&dir, &conversation_id, "doc-1").unwrap();
        assert_eq!(record.entries.len(), 2);
        let serialized = serde_json::to_string(&record).unwrap();
        assert!(!serialized.contains("test-secret-never-stored"));
        assert!(!serialized.contains("current policy"));
        assert!(read(&dir, &conversation_id, "another-document").is_err());
        let path = record_path(&dir, &conversation_id).unwrap();
        assert!(!std::fs::read(&path)
            .unwrap()
            .windows("总结这份文档".len())
            .any(|window| window == "总结这份文档".as_bytes()));
        assert!(!path.with_extension("bin.tmp").exists());
        let snapshot = record.snapshot();
        assert!(snapshot.id.is_empty());
        assert_eq!(snapshot.document_id, "doc-1");
        std::fs::remove_file(path).unwrap();
        std::fs::remove_dir(dir).unwrap();
    }

    #[cfg(windows)]
    #[tokio::test]
    async fn renaming_survives_live_saves_and_preserves_the_transcript() {
        let conversation_id = uuid::Uuid::new_v4().simple().to_string();
        let dir = scratch();
        let owner = cell(&conversation_id);
        let mut store = Store::default();
        store.register(&conversation_id, &owner);
        let mut run = owner.run.lock().await;
        store.save_at(&dir, &run, &owner).unwrap();
        let renamed = store
            .rename_at(&dir, &conversation_id, "doc-1", "  文档排查记录  ")
            .unwrap();
        assert_eq!(renamed.title, "文档排查记录");
        for invalid in [String::new(), "  ".into(), "a".repeat(61), "a\nb".into()] {
            assert!(store
                .rename_at(&dir, &conversation_id, "doc-1", &invalid)
                .is_err());
        }
        assert!(store
            .rename_at(&dir, &conversation_id, "another-document", "错误修改")
            .is_err());
        run.entry("assistant", "继续回答", None);
        store.save_at(&dir, &run, &owner).unwrap();
        drop(run);
        let restored = read(&dir, &conversation_id, "doc-1").unwrap();
        assert_eq!(restored.summary.title, "文档排查记录");
        assert_eq!(restored.entries.len(), 2);
        assert_eq!(restored.entries[0].text, "总结这份文档");
        assert!(!owner.cancelled.load(Ordering::SeqCst));
        std::fs::remove_file(record_path(&dir, &conversation_id).unwrap()).unwrap();
        std::fs::remove_dir(dir).unwrap();
    }

    #[cfg(windows)]
    #[tokio::test]
    async fn stale_runs_cannot_overwrite_or_resurrect_a_conversation() {
        let conversation_id = uuid::Uuid::new_v4().simple().to_string();
        let dir = scratch();
        let first = cell(&conversation_id);
        let second = cell(&conversation_id);
        let mut store = Store::default();
        store.register(&conversation_id, &first);
        store
            .save_at(&dir, &*first.run.lock().await, &first)
            .unwrap();
        store.register(&conversation_id, &second);
        let mut newer = second.run.lock().await;
        newer.entry("assistant", "新的回答", None);
        store.save_at(&dir, &newer, &second).unwrap();
        store
            .save_at(&dir, &*first.run.lock().await, &first)
            .unwrap();
        assert_eq!(
            read(&dir, &conversation_id, "doc-1")
                .unwrap()
                .entries
                .last()
                .unwrap()
                .text,
            "新的回答"
        );
        std::fs::remove_file(record_path(&dir, &conversation_id).unwrap()).unwrap();
        store.owners.remove(&conversation_id);
        store.save_at(&dir, &newer, &second).unwrap();
        assert!(!record_path(&dir, &conversation_id).unwrap().exists());
        std::fs::remove_dir(dir).unwrap();
    }
}
