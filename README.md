# MiraiNote

基于 Vue 3、TypeScript、Tailwind CSS 4 和 Tauri 2 的 Windows 文档工作台，支持 Markdown、PDF、Word、分屏阅读和 AI 文档助手。

## 安装与使用

从 [GitHub Releases](https://github.com/XiangZi7/MiraiNote/releases) 下载 Windows x64 版本：

- `MiraiNote_<版本>_windows_x64_setup.exe`：安装版，支持简体中文与英文，默认安装到当前用户目录并创建开始菜单入口。缺少 WebView2 Runtime 时会联网下载并安装。
- `MiraiNote_<版本>_windows_x64_portable.zip`：免安装包，解压后运行 `mirainote.exe`，需要预先安装 WebView2 Runtime。免安装包仍使用当前用户的应用数据目录，不将工作区保存在解压目录。
- `SHA256SUMS.txt`：下载文件的 SHA-256 校验值；可用 PowerShell `Get-FileHash <文件路径> -Algorithm SHA256` 核对。
- `version.json`：版本、平台和构建所用的源码提交。

关闭窗口或按 Alt+F4 后应用驻留系统托盘；左键点击托盘图标恢复窗口，右键菜单可以打开或退出应用。再次启动 MiraiNote 会恢复已有窗口。退出前会保存工作区，保存失败时恢复窗口并提示导出。普通最小化仍保留在任务栏。

安装信息的发布者为 `XiangZi7`，项目主页与问题反馈入口位于“设置 → 关于”；版本号随发版自动同步。应用标识 `com.admin.mirainote` 保持稳定，以继续使用已有工作区和安装升级标识。

安装欢迎页提供默认勾选的“用 MiraiNote 默认打开 .md 文档”选项。勾选后注册 Markdown 打开方式，并在安装后打开 Windows 默认应用设置，选择 MiraiNote 后确认 `.md` 关联；取消勾选则不更改关联。Windows 10/11 的最终默认应用由用户在系统设置中确认，安装器不会修改受保护的 `UserChoice`。静默升级保留此前的选择，不弹出设置页；卸载会移除此安装的注册信息。相关系统接口见 [Windows 默认应用设置](https://learn.microsoft.com/en-us/windows/apps/develop/launch/launch-default-apps-settings)。

双击 `.md` 文件会在 MiraiNote 中打开，支持含中文、空格的文件路径；程序已驻留时会恢复窗口并打开文件。重复打开同一文件会切换到已有草稿，保留未保存的修改。编辑仍保存到工作区，导出后才能另存文件。

## 打开文件夹与批量导入

侧栏顶部的工作区菜单、命令面板（Ctrl+Shift+P）和标题栏“更多操作”都提供三个入口：

- **导入文档…**（Ctrl+O）：系统选择框多选 Markdown / PDF / DOCX；桌面端会记住文件真实路径。
- **打开文件夹…**（Ctrl+Shift+O）：选中的文件夹出现在侧栏“文件夹”分组，递归列出其中的文档，点击某一份才读取内容。适合上百份文档的目录，不会一次性占满工作区草稿。
- **导入整个文件夹…**：把文件夹里的全部文档一次性读入工作区；超过 40 份会先确认，导入过程有进度提示。

也可以把文件或整个文件夹直接拖进窗口，拖入文件夹时只导入其中支持的文档。文件夹视图支持关键词筛选、按子目录分组、重新扫描、在资源管理器中显示；右键侧栏中的文件夹可以全部导入、重新扫描或从列表移除（不会删除磁盘文件）。

扫描会跳过软链接、以 `.` 开头的隐藏项以及 `node_modules`、`target`、`dist` 等目录，最多向下 8 层、列出 2000 份文档，超过 50 MB 的文件会被跳过并在界面上说明。

“最近打开”同时显示最近打开过的文件夹和最近的文档；已经从工作区移除但打开过的本地文件也会单独列出，点击即可重新载入。文件夹与最近记录保存在本机，重启后仍在。

出于安全考虑，前端只能读取用户通过选择框选中的文件夹（及其子目录）或系统启动传入的文件；许可列表保存在应用数据目录的 `workspace-paths.json`，最多 128 条，其他路径的读取请求会被拒绝。

## Markdown 目录与 PDF 书签

Markdown 标题目录和 PDF 书签目录位于阅读区右上角，使用绝对定位浮层。展开目录不会改变正文宽度、排版或 PDF 页面视口；点击标题跳转，Esc 可收起目录。PDF 缩略图仍是单独可调整宽度的导航栏。

## 运行

```sh
pnpm install
pnpm dev
# Windows 桌面开发（会启动 Vite，不要同时占用 1420 端口）
pnpm tauri dev
```

```sh
pnpm build
pnpm test
cargo check --manifest-path src-tauri/Cargo.toml --locked
```

浏览器预览地址为 `http://localhost:1420`。Windows 桌面开发需要 Node.js 22.22.2 或更高版本、pnpm 10.33.0、Rust、MSVC 编译工具和 WebView2。CI 使用 Rust 1.96.0。

## 打包与 GitHub 自动发版

本地构建 NSIS 安装包：

```sh
pnpm version:check
pnpm release:build
```

安装包生成在 `src-tauri/target/release/bundle/nsis/`。自动发版使用仓库中的 `.github/workflows/release.yml`，请先将本次源码及该工作流提交到 Git；仅上传源码不会创建 Release，推送 `v*` 标签才会触发。

```sh
pnpm release --dry-run  # 预览下一个版本
pnpm release            # 补丁版本 +1，提交版本号并推送当前分支和版本标签
pnpm release minor      # 次版本 +1
pnpm release major      # 主版本 +1
```

脚本会同步 `package.json`、`tauri.conf.json`、`Cargo.toml`、`Cargo.lock`，检查工作区、远程分支和已有标签，再原子推送分支及本次标签。`origin` 应指向此项目在 GitHub 的仓库，并具有推送权限。

Actions 自动执行前端测试、桌面 IPC/UI 回归、Rust 测试、NSIS 构建和产物校验，再将安装版、免安装包、版本清单与校验文件发布到 GitHub Release。附件上传完成前 Release 保持草稿状态。工作流使用自带的 `GITHUB_TOKEN`，发布任务已声明 `contents: write`，不需要额外填写个人令牌；仓库需启用 Actions，组织策略也需允许工作流发布 Release。

推送失败后按脚本提示执行 `pnpm release --retry vX.Y.Z`，会复用已经准备好的提交和标签。标签已成功推送但 Actions 失败时，在 GitHub Actions 中重新运行失败任务，或通过 Release 工作流的 Run workflow 输入同一标签；重复推送已有标签不会重新触发构建。已正式发布的版本不覆盖，应递增版本后再发布。

预发布可执行 `pnpm version:set v0.2.0-beta.1`，提交版本文件后创建并推送同名 Git 标签。支持 `alpha`、`beta`、`rc`，Actions 会同步标签版本并标记为预发布。也支持直接推送新标签，CI 会在构建前同步版本；建议优先使用发版脚本，让 Git 中的版本与发布产物保持一致。

## 当前实现

- Markdown：CodeMirror 编辑、markdown-it 预览、编辑 / 阅读 / 分屏、格式操作、撤销重做和文档内查找。
- PDF：PDF.js 解析与 Worker 渲染；连续滚动阅读、翻页 / 页码跳转、全文查找、缩放、适合宽度 / 页面、旋转。缩略图栏可在 120–360px 间拖动调整；页码、阅读偏移、缩放和栏宽会保存在工作区。正文和真实 PDF 缩略图使用 VueUse 虚拟列表，只挂载视口附近的页面。
- DOCX：docx-preview 保留原始排版阅读，Mammoth 提取内容，Tiptap 提供基础富文本编辑。
- 工作区：类型筛选、最近打开、收藏、标签、搜索、命令面板、右键菜单、标签拖动排序和边缘分屏；拖动通过 VueUse 管理指针事件，更新真实 Layout Tree。
- 文件与文件夹：系统选择框导入文档、打开文件夹按需阅读、整个文件夹批量导入、拖入文件夹、最近打开的文件夹与本地文件；目录扫描与读取在 Rust 侧完成，只允许访问用户选中过的位置。
- 外观：浅色 / 深色 / 跟随系统，侧栏、Inspector、AI 面板可调整宽度。
- AI：设置 → AI Agent 管理多份服务配置；支持 OpenAI 兼容 / Claude Messages、模型列表获取、连接测试、Windows 密钥加密保存（可用小眼睛按需查看）、任务容量设置。侧栏可切换模型、分析当前文档、上传文本 / PDF / DOCX 附件、逐步查看只读文档搜索、标题提取与分页读取的工具调用、停止任务、复制整段对话；聊天记录按文档加密保存，可跨重启浏览、搜索、重命名和删除。架构参考 `D:/code/MiraiHub/src-tauri/src/agent`，详见 `docs/agent-integration.md`。

## 当前阶段边界

这是界面与文档引擎接入阶段，尚未完成需求中的全部 19 个阶段。导入内容保存在此设备的工作区（文本草稿使用 localStorage，PDF / DOCX 原文件副本使用 IndexedDB），当前保存与重命名、移动、移除操作针对工作区记录；Rust 文件系统写回尚未接入。“打开文件夹”只读取文档，不监听目录变化，磁盘上新增或改名的文件需要手动重新扫描。

Markdown 可导出 `.md`；PDF 和未编辑 DOCX 可导出原文件；编辑后的 Word 暂导出 HTML，尚未实现 DOCX 编辑稿回写和旧 `.doc` 格式。Markdown 的 Mermaid / 数学公式仍待接入。AI 在 Windows 桌面端通过用户配置的模型服务调用；浏览器仅预览设置界面。AI 聊天记录按文档加密保存在应用数据目录，可跨重启恢复；直接把编辑建议写回文档尚未实现。AI 附件限单条消息 4 个文件、单个 64 KB 文本、合计 128 KB。当前单文件导入限制为 50 MB。

## 代码边界

- `src/components/ui`：全部基础 UI 组件；业务界面按 layout、tabs、workspace、search 分类。
- `src/assets/styles/main.css`：以 `@import 'tailwindcss';` 引入 Tailwind；颜色和字体变量在 `tokens.css`。
- `src/modules/{markdown,pdf,word,ai}`：各文档引擎及 AI 独立实现。
- `src/stores` / `src/composables`：工作区状态与交互协调。
- `src/api/ipc`：集中管理文档、文件和窗口 API。
- `src-tauri/src/files.rs`：系统选择框、目录扫描、按需读取与访问许可。
- `src-tauri/src/lib.rs`：保持应用入口与插件注册职责。

## 验收

`pnpm test` 检查递归布局、阅读位置校验、连续 PDF 页高和旋转定位、AI 文档快照绑定、附件限制与密钥提交规则、文件夹条目分组与导入路径。`cargo test` 另外覆盖目录扫描（跳过噪音目录、超大文件与软链接）和访问许可判定。运行开发服务后可打开 `http://localhost:1420/tests/engine-smoke.html`，点击“运行验收”检查三类文档导入、PDF 二进制保存、DOCX 原始排版渲染以及 Markdown 危险链接处理。测试仅使用 `tests/fixtures` 中的合成文件。

AI 配置回归测试：先运行 `pnpm exec playwright install chromium`，再运行 `pnpm test:ui`。测试通过 Tauri 官方 mock IPC 验证表单、密钥查看、侧栏、附件上传、逐步工具调用、聊天记录管理、配置隔离和取消；后端用 `cargo test --manifest-path src-tauri/Cargo.toml --locked` 验证真实 HTTP 协议适配、加密聊天记录与附件校验。也可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定已有 Chromium 路径。

设计基准及阶段顺序见 `docs/design-system.md`。`tests/release.test.mjs` 使用临时本地 Git 仓库验证版本同步、发版推送与失败重试，不会推送真实远程仓库。`tests/desktop-ui.spec.ts` 验证托盘保存与退出的 IPC 协调，`tests/folder-ui.spec.ts` 用 mock IPC 验证打开文件夹、按需载入、全部导入与最近打开的重新载入。Windows 托盘点击、窗口吸附、多显示器、安装升级和长时间运行仍需桌面专项验收；系统文件夹选择框依赖真实 Windows Shell 对话框，需要在桌面端手动验收。
