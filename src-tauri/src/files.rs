//! 文件与文件夹访问：系统选择框、目录扫描与按需读取。
//! 前端只能读取用户主动选择或系统启动传入的位置，其余路径一律拒绝。
use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::{
    fs::{self, Metadata},
    io::Read,
    path::{Path, PathBuf},
    sync::{Mutex, MutexGuard},
    time::UNIX_EPOCH,
};
use tauri::{ipc::Response, AppHandle, Manager, State};

const MAX_FILE_BYTES: u64 = 50 * 1024 * 1024;
const MAX_PDF_BYTES: u64 = 250 * 1024 * 1024;
const MAX_GRANTS: usize = 128;
const STORE: &str = "workspace-paths.json";
const IGNORED_DIRS: [&str; 9] = [
    "node_modules",
    "target",
    "dist",
    "$recycle.bin",
    "system volume information",
    "__pycache__",
    ".git",
    ".svn",
    ".hg",
];

fn file_size_limit(path: &Path) -> u64 {
    if kind_of(path) == Some("pdf") {
        MAX_PDF_BYTES
    } else {
        MAX_FILE_BYTES
    }
}

pub fn kind_of(path: &Path) -> Option<&'static str> {
    match path
        .extension()
        .and_then(|ext| ext.to_str())?
        .to_ascii_lowercase()
        .as_str()
    {
        "md" | "markdown" => Some("markdown"),
        "pdf" => Some("pdf"),
        "docx" => Some("word"),
        _ => None,
    }
}

fn canonical(path: &Path) -> AppResult<PathBuf> {
    fs::canonicalize(path).map_err(|_| AppError::invalid_input("文件或文件夹不存在，可能已被移动"))
}

// 规范化路径带 `\\?\` 前缀，界面直接展示会很难读，回传前还原成常规写法。
fn display_path(path: &Path) -> String {
    let text = path.to_string_lossy().into_owned();
    match text.strip_prefix(r"\\?\") {
        Some(rest) => match rest.strip_prefix("UNC\\") {
            Some(unc) => format!(r"\\{unc}"),
            None => rest.to_owned(),
        },
        None => text,
    }
}

fn modified_millis(meta: &Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

/// 已获许可的位置：文件夹许可覆盖其子孙，文件许可只覆盖自身。
fn permitted(granted: &[PathBuf], target: &Path) -> bool {
    granted.iter().any(|path| target.starts_with(path))
}

#[derive(Default)]
struct Store {
    loaded: bool,
    paths: Vec<PathBuf>,
}

#[derive(Default)]
pub struct Grants(Mutex<Store>);

impl Grants {
    fn store(&self, app: &AppHandle) -> AppResult<MutexGuard<'_, Store>> {
        let mut store = self.0.lock().map_err(|_| {
            AppError::internal("文件访问状态不可用，请重启应用")
        })?;
        if !store.loaded {
            store.loaded = true;
            store.paths = read_store(app);
        }
        Ok(store)
    }
    /// 记录用户刚刚选中的位置，重启后仍可从“最近打开”直接载入。
    pub fn grant(&self, app: &AppHandle, path: &Path) -> AppResult<PathBuf> {
        let target = canonical(path)?;
        let mut store = self.store(app)?;
        let before = store.paths.len();
        // 选中父目录后，它覆盖的旧许可就不必单独保留。
        store.paths.retain(|granted| !granted.starts_with(&target));
        let covered = permitted(&store.paths, &target);
        if !covered {
            store.paths.push(target.clone());
            while store.paths.len() > MAX_GRANTS {
                store.paths.remove(0);
            }
        }
        if !covered || store.paths.len() != before {
            write_store(app, &store.paths);
        }
        Ok(target)
    }
    pub fn ensure(&self, app: &AppHandle, path: &Path) -> AppResult<PathBuf> {
        let target = canonical(path)?;
        if permitted(&self.store(app)?.paths, &target) {
            return Ok(target);
        }
        Err(AppError::invalid_input(
            "这个位置还没有访问许可，请通过“打开文件夹”或“导入文档”重新选择",
        ))
    }
}

fn store_path(app: &AppHandle) -> AppResult<PathBuf> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|_| AppError::internal("无法定位应用数据目录"))?
        .join(STORE))
}

fn read_store(app: &AppHandle) -> Vec<PathBuf> {
    let Ok(target) = store_path(app) else {
        return Vec::new();
    };
    let Ok(bytes) = fs::read(target) else {
        return Vec::new();
    };
    serde_json::from_slice::<Vec<String>>(&bytes)
        .unwrap_or_default()
        .into_iter()
        .map(PathBuf::from)
        .filter(|path| path.exists())
        .collect()
}

fn write_store(app: &AppHandle, paths: &[PathBuf]) {
    let Ok(target) = store_path(app) else { return };
    if let Some(dir) = target.parent() {
        let _ = fs::create_dir_all(dir);
    }
    let list: Vec<String> = paths
        .iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect();
    if let Ok(bytes) = serde_json::to_vec(&list) {
        let _ = fs::write(target, bytes);
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    path: String,
    name: String,
    relative_path: String,
    kind: &'static str,
    size: u64,
    modified_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderScan {
    path: String,
    name: String,
    entries: Vec<FileEntry>,
    truncated: bool,
    oversized: usize,
    unreadable: usize,
}

fn entry(path: &Path, root: Option<&Path>, kind: &'static str, meta: &Metadata) -> FileEntry {
    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    let relative_path = root
        .and_then(|root| path.strip_prefix(root).ok())
        .map(|rest| rest.to_string_lossy().replace('\\', "/"))
        .unwrap_or_else(|| name.clone());
    FileEntry {
        path: display_path(path),
        name,
        relative_path,
        kind,
        size: meta.len(),
        modified_at: modified_millis(meta),
    }
}

fn stat(path: &Path) -> Option<FileEntry> {
    let kind = kind_of(path)?;
    let meta = fs::metadata(path).ok()?;
    if !meta.is_file() {
        return None;
    }
    Some(entry(path, None, kind, &meta))
}

fn scan(root: &Path) -> AppResult<FolderScan> {
    if !root.is_dir() {
        return Err(AppError::invalid_input("请选择文件夹"));
    }
    let mut entries: Vec<FileEntry> = Vec::new();
    let mut queue = vec![root.to_path_buf()];
    let mut oversized = 0usize;
    let mut unreadable = 0usize;
    while let Some(dir) = queue.pop() {
        let Ok(listing) = fs::read_dir(&dir) else {
            if dir == root {
                return Err(AppError::invalid_input("无法读取这个文件夹，请检查访问权限"));
            }
            unreadable += 1;
            continue;
        };
        for item in listing {
            let Ok(item) = item else {
                unreadable += 1;
                continue;
            };
            let Ok(file_type) = item.file_type() else {
                unreadable += 1;
                continue;
            };
            // 跳过软链接，既避免目录环，也避免绕过访问许可。
            if file_type.is_symlink() {
                continue;
            }
            let name = item.file_name().to_string_lossy().into_owned();
            let path = item.path();
            if file_type.is_dir() {
                if !IGNORED_DIRS.contains(&name.to_ascii_lowercase().as_str()) {
                    queue.push(path);
                }
                continue;
            }
            let Some(kind) = kind_of(&path) else { continue };
            let Ok(meta) = item.metadata() else {
                unreadable += 1;
                continue;
            };
            if !meta.is_file() {
                continue;
            }
            if meta.len() > file_size_limit(&path) {
                oversized += 1;
            }
            entries.push(entry(&path, Some(root), kind, &meta));
        }
    }
    entries.sort_by(|a, b| {
        a.relative_path
            .to_lowercase()
            .cmp(&b.relative_path.to_lowercase())
    });
    Ok(FolderScan {
        path: display_path(root),
        name: root
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| display_path(root)),
        entries,
        truncated: false,
        oversized,
        unreadable,
    })
}

fn read_bytes(path: &Path) -> AppResult<Vec<u8>> {
    let file = fs::File::open(path).map_err(|_| AppError::invalid_input("无法读取文件"))?;
    let meta = file
        .metadata()
        .map_err(|_| AppError::invalid_input("无法读取文件信息"))?;
    if !meta.is_file() {
        return Err(AppError::invalid_input("请选择文档，不能读取文件夹"));
    }
    let limit = file_size_limit(path);
    if meta.len() > limit {
        return Err(AppError::invalid_input(format!(
            "文件大小超过 {} MB，暂时无法载入",
            limit / 1024 / 1024
        )));
    }
    let mut bytes = Vec::new();
    file.take(limit + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| AppError::invalid_input("无法读取文件内容"))?;
    if bytes.len() as u64 > limit {
        return Err(AppError::invalid_input(format!(
            "文件大小超过 {} MB，暂时无法载入",
            limit / 1024 / 1024
        )));
    }
    Ok(bytes)
}

async fn offload<T: Send + 'static>(task: impl FnOnce() -> T + Send + 'static) -> AppResult<T> {
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|_| AppError::internal("文件操作被中断，请重试"))
}

#[tauri::command]
pub async fn files_pick_folder(
    app: AppHandle,
    grants: State<'_, Grants>,
) -> AppResult<Option<FolderScan>> {
    let Some(root) = pick(&app, true).await?.into_iter().next() else {
        return Ok(None);
    };
    let root = grants.grant(&app, &root)?;
    offload(move || scan(&root)).await?.map(Some)
}

#[tauri::command]
pub async fn files_pick_documents(
    app: AppHandle,
    grants: State<'_, Grants>,
) -> AppResult<Vec<FileEntry>> {
    let picked = pick(&app, false).await?;
    let mut granted = Vec::new();
    for path in picked {
        granted.push(grants.grant(&app, &path)?);
    }
    offload(move || granted.iter().filter_map(|path| stat(path)).collect::<Vec<_>>()).await
}

#[tauri::command]
pub async fn files_scan_folder(
    app: AppHandle,
    grants: State<'_, Grants>,
    path: String,
) -> AppResult<FolderScan> {
    let root = grants.ensure(&app, Path::new(&path))?;
    offload(move || scan(&root)).await?
}

/// 校验“最近打开”里的路径是否仍然可用，失效的条目不会返回。
#[tauri::command]
pub async fn files_stat(
    app: AppHandle,
    grants: State<'_, Grants>,
    paths: Vec<String>,
) -> AppResult<Vec<FileEntry>> {
    let mut granted = Vec::new();
    for path in paths.iter().take(MAX_GRANTS) {
        if let Ok(target) = grants.ensure(&app, Path::new(path)) {
            granted.push(target);
        }
    }
    offload(move || granted.iter().filter_map(|path| stat(path)).collect::<Vec<_>>()).await
}

#[tauri::command]
pub async fn files_read(
    app: AppHandle,
    grants: State<'_, Grants>,
    path: String,
) -> AppResult<Response> {
    let target = grants.ensure(&app, Path::new(&path))?;
    Ok(Response::new(offload(move || read_bytes(&target)).await??))
}

async fn pick(app: &AppHandle, folder: bool) -> AppResult<Vec<PathBuf>> {
    let owner = owner_handle(app);
    offload(move || pick_blocking(owner, folder)).await?
}

#[cfg(windows)]
fn owner_handle(app: &AppHandle) -> Option<isize> {
    app.get_webview_window("main")
        .and_then(|window| window.hwnd().ok())
        .map(|handle| handle.0 as isize)
}

#[cfg(not(windows))]
fn owner_handle(_app: &AppHandle) -> Option<isize> {
    None
}

#[cfg(windows)]
fn pick_blocking(owner: Option<isize>, folder: bool) -> AppResult<Vec<PathBuf>> {
    use windows::core::{HSTRING, PCWSTR, PWSTR};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_INPROC_SERVER,
        COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::UI::Shell::{
        Common::COMDLG_FILTERSPEC, FileOpenDialog, IFileOpenDialog, FOS_ALLOWMULTISELECT,
        FOS_FILEMUSTEXIST, FOS_FORCEFILESYSTEM, FOS_PATHMUSTEXIST, FOS_PICKFOLDERS,
        SIGDN_FILESYSPATH,
    };
    // HRESULT_FROM_WIN32(ERROR_CANCELLED)：用户关掉选择框不是错误。
    const CANCELLED: i32 = -2147023673;

    unsafe fn take_string(text: PWSTR) -> String {
        let mut length = 0usize;
        while *text.0.add(length) != 0 {
            length += 1;
        }
        let value = String::from_utf16_lossy(std::slice::from_raw_parts(text.0, length));
        CoTaskMemFree(Some(text.0 as *const _));
        value
    }

    unsafe {
        let initialized = CoInitializeEx(None, COINIT_APARTMENTTHREADED).is_ok();
        let filters = [
            (
                HSTRING::from("MiraiNote 文档"),
                HSTRING::from("*.md;*.markdown;*.pdf;*.docx"),
            ),
            (
                HSTRING::from("Markdown"),
                HSTRING::from("*.md;*.markdown"),
            ),
            (HSTRING::from("PDF"), HSTRING::from("*.pdf")),
            (HSTRING::from("Word"), HSTRING::from("*.docx")),
        ];
        let title = HSTRING::from(if folder {
            "选择要打开的文件夹"
        } else {
            "选择要导入的文档"
        });
        let show = || -> windows::core::Result<Vec<PathBuf>> {
            let dialog: IFileOpenDialog =
                CoCreateInstance(&FileOpenDialog, None, CLSCTX_INPROC_SERVER)?;
            let mut options = dialog.GetOptions()? | FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST;
            options |= if folder {
                FOS_PICKFOLDERS
            } else {
                FOS_ALLOWMULTISELECT | FOS_FILEMUSTEXIST
            };
            dialog.SetOptions(options)?;
            dialog.SetTitle(&title)?;
            if !folder {
                let specs: Vec<COMDLG_FILTERSPEC> = filters
                    .iter()
                    .map(|(name, spec)| COMDLG_FILTERSPEC {
                        pszName: PCWSTR(name.as_ptr()),
                        pszSpec: PCWSTR(spec.as_ptr()),
                    })
                    .collect();
                dialog.SetFileTypes(&specs)?;
            }
            dialog.Show(owner.map(|handle| HWND(handle as *mut _)))?;
            let mut paths = Vec::new();
            if folder {
                paths.push(PathBuf::from(take_string(
                    dialog.GetResult()?.GetDisplayName(SIGDN_FILESYSPATH)?,
                )));
            } else {
                let items = dialog.GetResults()?;
                for index in 0..items.GetCount()? {
                    paths.push(PathBuf::from(take_string(
                        items.GetItemAt(index)?.GetDisplayName(SIGDN_FILESYSPATH)?,
                    )));
                }
            }
            Ok(paths)
        };
        let result = show();
        if initialized {
            CoUninitialize();
        }
        match result {
            Ok(paths) => Ok(paths),
            Err(error) if error.code().0 == CANCELLED => Ok(Vec::new()),
            Err(_) => Err(AppError::internal("无法打开系统选择框，请重试")),
        }
    }
}

#[cfg(not(windows))]
fn pick_blocking(_owner: Option<isize>, _folder: bool) -> AppResult<Vec<PathBuf>> {
    Err(AppError::invalid_input(
        "此平台尚未接入系统选择框，请改用拖拽或“导入文档”按钮",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(label: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "mirainote-files-{label}-{}",
            uuid::Uuid::new_v4()
        ));
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn recognizes_supported_extensions_only() {
        assert_eq!(kind_of(Path::new("a/说明.MD")), Some("markdown"));
        assert_eq!(kind_of(Path::new("a/b.markdown")), Some("markdown"));
        assert_eq!(kind_of(Path::new("a/b.PDF")), Some("pdf"));
        assert_eq!(kind_of(Path::new("a/b.docx")), Some("word"));
        for path in ["a/b.doc", "a/b.txt", "a/b", "a/b.exe"] {
            assert_eq!(kind_of(Path::new(path)), None, "{path}");
        }
    }

    #[test]
    fn scan_collects_nested_documents_and_skips_noise() {
        let root = temp_root("scan");
        fs::create_dir_all(root.join("子目录/更深")).unwrap();
        fs::create_dir_all(root.join("node_modules")).unwrap();
        fs::create_dir_all(root.join(".git")).unwrap();
        fs::write(root.join("说明 文档.md"), b"# hi").unwrap();
        fs::write(root.join("子目录/报告.PDF"), b"%PDF-").unwrap();
        fs::write(root.join("子目录/更深/合同.docx"), b"docx").unwrap();
        fs::write(root.join("子目录/忽略.txt"), b"nope").unwrap();
        fs::write(root.join("node_modules/包.md"), b"nope").unwrap();
        fs::write(root.join(".git/隐藏.md"), b"nope").unwrap();
        fs::write(root.join(".隐藏.md"), b"nope").unwrap();
        let result = scan(&root).unwrap();
        let paths: Vec<&str> = result
            .entries
            .iter()
            .map(|item| item.relative_path.as_str())
            .collect();
        // 排序只保证同一目录相邻且结果稳定，展示顺序由界面按中文规则再排。
        assert_eq!(paths, [".隐藏.md", "子目录/报告.PDF", "子目录/更深/合同.docx", "说明 文档.md"]);
        assert_eq!(result.entries[3].kind, "markdown");
        assert!(!result.truncated && result.oversized == 0);
        assert!(scan(&root.join("说明 文档.md")).is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn scan_reports_oversized_documents_without_failing() {
        let root = temp_root("oversized");
        let big = root.join("超大.md");
        fs::File::create(&big)
            .unwrap()
            .set_len(MAX_FILE_BYTES + 1)
            .unwrap();
        fs::write(root.join("正常.md"), b"ok").unwrap();
        let result = scan(&root).unwrap();
        assert_eq!(result.oversized, 1);
        assert_eq!(result.entries.len(), 2);
        assert!(result.entries.iter().any(|entry| entry.name == "超大.md"));
        assert!(read_bytes(&big).unwrap_err().message.contains("50 MB"));
        assert!(stat(&big).is_some());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn scan_includes_large_pdfs_deep_folders_and_more_than_2000_files() {
        let root = temp_root("complete-scan");
        let deep = root.join("1/2/3/4/5/6/7/8/9/10/.课程");
        fs::create_dir_all(&deep).unwrap();
        let pdf = deep.join("大文件.PDF");
        fs::File::create(&pdf).unwrap().set_len(MAX_FILE_BYTES + 1).unwrap();
        for index in 0..2001 {
            fs::write(root.join(format!("{index}.md")), b"ok").unwrap();
        }
        let result = scan(&root).unwrap();
        assert_eq!(result.entries.len(), 2002);
        assert_eq!(result.oversized, 0);
        assert!(!result.truncated);
        assert!(result.entries.iter().any(|entry| entry.name == "大文件.PDF"));
        assert_eq!(stat(&pdf).unwrap().size, MAX_FILE_BYTES + 1);
        assert_eq!(read_bytes(&pdf).unwrap().len() as u64, MAX_FILE_BYTES + 1);
        assert_eq!(file_size_limit(&pdf), MAX_PDF_BYTES);
        fs::File::create(&pdf).unwrap().set_len(MAX_PDF_BYTES + 1).unwrap();
        assert!(read_bytes(&pdf).unwrap_err().message.contains("250 MB"));
        assert!(stat(&pdf).is_some());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn grants_cover_children_but_not_siblings() {
        let root = temp_root("grants");
        let granted = vec![
            canonical(&root).unwrap(),
            canonical(&{
                let file = root.join("单独.md");
                fs::write(&file, b"ok").unwrap();
                file
            })
            .unwrap(),
        ];
        assert!(permitted(&granted, &canonical(&root).unwrap()));
        assert!(permitted(
            &granted,
            &canonical(&root).unwrap().join("子目录/深处.md")
        ));
        assert!(!permitted(
            &granted,
            &canonical(std::env::temp_dir().as_path()).unwrap()
        ));
        assert!(!permitted(&granted, Path::new(r"C:\Windows\win.ini")));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn display_path_restores_readable_form() {
        assert_eq!(display_path(Path::new(r"\\?\D:\笔记\a.md")), r"D:\笔记\a.md");
        assert_eq!(
            display_path(Path::new(r"\\?\UNC\server\share\a.md")),
            r"\\server\share\a.md"
        );
        assert_eq!(display_path(Path::new(r"D:\笔记\a.md")), r"D:\笔记\a.md");
    }
}
