use serde::Serialize;
use std::{
    ffi::OsString,
    fs::File,
    io::Read,
    path::{Path, PathBuf},
    sync::Mutex,
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Emitter, Manager};

const MAX_FILE_BYTES: u64 = 50 * 1024 * 1024;

#[derive(Default)]
pub struct LaunchFiles(Mutex<Vec<PathBuf>>);

impl LaunchFiles {
    pub fn from_env() -> Self {
        let files = Self::default();
        if let Ok(cwd) = std::env::current_dir() {
            files.enqueue(std::env::args_os().skip(1), &cwd);
        }
        files
    }

    fn enqueue(&self, args: impl IntoIterator<Item = OsString>, cwd: &Path) {
        let mut pending = self.0.lock().unwrap_or_else(|e| e.into_inner());
        for arg in args {
            let path = PathBuf::from(arg);
            let extension = path.extension().and_then(|ext| ext.to_str()).unwrap_or("");
            if !extension.eq_ignore_ascii_case("md") && !extension.eq_ignore_ascii_case("markdown")
            {
                continue;
            }
            let path = if path.is_absolute() {
                path
            } else {
                cwd.join(path)
            };
            if !pending.contains(&path) {
                pending.push(path);
            }
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchDocument {
    path: String,
    name: String,
    content: Option<String>,
    modified_at: u64,
    error: Option<String>,
}

fn read_markdown(path: &Path) -> LaunchDocument {
    let mut document = LaunchDocument {
        path: path.to_string_lossy().into_owned(),
        name: path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned(),
        content: None,
        modified_at: 0,
        error: None,
    };
    let read = || -> Result<(String, u64, String), String> {
        let canonical = path.canonicalize().map_err(|_| "文件不存在或无法访问")?;
        let file = File::open(&canonical).map_err(|_| "无法读取文件")?;
        let metadata = file.metadata().map_err(|_| "无法读取文件信息")?;
        if !metadata.is_file() {
            return Err("请选择 Markdown 文件，不能打开文件夹".into());
        }
        if metadata.len() > MAX_FILE_BYTES {
            return Err("当前版本支持导入 50 MB 以内的文档".into());
        }
        let modified = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or(0);
        let mut bytes = Vec::new();
        file.take(MAX_FILE_BYTES + 1)
            .read_to_end(&mut bytes)
            .map_err(|_| "无法读取文件内容")?;
        if bytes.len() as u64 > MAX_FILE_BYTES {
            return Err("当前版本支持导入 50 MB 以内的文档".into());
        }
        let content =
            String::from_utf8_lossy(bytes.strip_prefix(&[0xef, 0xbb, 0xbf]).unwrap_or(&bytes))
                .into_owned();
        // Keep the canonical path for repeat-open identity, including paths with spaces/Unicode.
        Ok((content, modified, canonical.to_string_lossy().into_owned()))
    };
    match read() {
        Ok((content, modified, canonical)) => {
            document.path = canonical;
            document.content = Some(content);
            document.modified_at = modified;
        }
        Err(error) => document.error = Some(error),
    }
    document
}

pub fn receive(app: &AppHandle, args: Vec<String>, cwd: String) {
    app.state::<LaunchFiles>().enqueue(
        args.into_iter().skip(1).map(OsString::from),
        Path::new(&cwd),
    );
    if let Err(error) = app.emit("desktop:files-opened", ()) {
        eprintln!("Could not notify launch files: {error}");
    }
}

#[tauri::command]
pub async fn desktop_take_launch_files(app: AppHandle) -> Result<Vec<LaunchDocument>, String> {
    // IPC can only read paths supplied by the OS launch; it cannot name arbitrary files.
    let paths = std::mem::take(
        &mut *app
            .state::<LaunchFiles>()
            .0
            .lock()
            .map_err(|_| "文件队列不可用")?,
    );
    let documents: Vec<LaunchDocument> = tauri::async_runtime::spawn_blocking(move || {
        paths.iter().map(|path| read_markdown(path)).collect()
    })
    .await
    .map_err(|e| e.to_string())?;
    // 双击打开过的文件同样计入访问许可，之后可以从“最近打开”重新载入。
    let grants = app.state::<crate::files::Grants>();
    for document in &documents {
        if document.error.is_none() {
            let _ = grants.grant(&app, Path::new(&document.path));
        }
    }
    Ok(documents)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn launch_queue_resolves_relative_paths_filters_and_deduplicates() {
        let files = LaunchFiles::default();
        let cwd = std::env::temp_dir();
        files.enqueue(
            [
                "中文 空格.MD",
                "中文 空格.MD",
                "notes.markdown",
                "ignored.exe",
            ]
            .map(OsString::from),
            &cwd,
        );
        assert_eq!(
            *files.0.lock().unwrap(),
            vec![cwd.join("中文 空格.MD"), cwd.join("notes.markdown")]
        );
    }

    #[test]
    fn reads_markdown_bom_and_reports_missing_directory_and_oversized_files() {
        let root = std::env::temp_dir().join(format!("mirainote-launch-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&root).unwrap();
        let path = root.join("中文 空格.md");
        std::fs::write(&path, b"\xef\xbb\xbf# hello").unwrap();
        let file = read_markdown(&path);
        assert_eq!(file.content.as_deref(), Some("# hello"));
        assert!(file.error.is_none());
        assert!(read_markdown(&root.join("missing.md")).error.is_some());
        assert!(read_markdown(&root).error.is_some());
        File::create(&path)
            .unwrap()
            .set_len(MAX_FILE_BYTES + 1)
            .unwrap();
        assert!(read_markdown(&path).error.unwrap().contains("50 MB"));
        std::fs::remove_file(path).unwrap();
        std::fs::remove_dir(root).unwrap();
    }
}
