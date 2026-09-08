# MiraiNote

基于 Vue 3、TypeScript、Tailwind CSS 4 和 Tauri 2 的 Windows 文档工作台。界面按提供的 Markdown 设计稿实现，采用可调整侧栏、标签页、递归分屏和按需打开的 Inspector / AI 面板，没有底部状态栏。

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

浏览器预览地址为 `http://localhost:1420`。Windows 桌面开发需要 Rust、MSVC 编译工具和 WebView2。

## 当前实现

- Markdown：CodeMirror 编辑、markdown-it 预览、编辑 / 阅读 / 分屏、格式操作、撤销重做和文档内查找。
- PDF：PDF.js 解析与 Worker 渲染；连续滚动阅读、翻页 / 页码跳转、全文查找、缩放、适合宽度 / 页面、旋转。缩略图栏可在 120–360px 间拖动调整；页码、阅读偏移、缩放和栏宽会保存在工作区。正文和真实 PDF 缩略图使用 VueUse 虚拟列表，只挂载视口附近的页面。
- DOCX：docx-preview 保留原始排版阅读，Mammoth 提取内容，Tiptap 提供基础富文本编辑。
- 工作区：类型筛选、最近打开、收藏、标签、搜索、命令面板、右键菜单、标签拖动排序和边缘分屏；拖动通过 VueUse 管理指针事件，更新真实 Layout Tree。
- 外观：浅色 / 深色 / 跟随系统，侧栏、Inspector、AI 面板可调整宽度。
- AI：当前文档、活动 Pane / Tab、内容版本和发送时快照的请求预览；架构参考 `D:/code/MiraiHub/src-tauri/src/agent`，详见 `docs/agent-integration.md`。

## 当前阶段边界

这是界面与文档引擎接入阶段，尚未完成需求中的全部 19 个阶段。导入内容保存在此设备的工作区（文本草稿使用 localStorage，PDF / DOCX 原文件副本使用 IndexedDB），当前保存与重命名、移动、移除操作针对工作区记录；Rust 文件系统写回尚未接入。

Markdown 可导出 `.md`；PDF 和未编辑 DOCX 可导出原文件；编辑后的 Word 暂导出 HTML，尚未实现 DOCX 编辑稿回写和旧 `.doc` 格式。Markdown 的 Mermaid / 数学公式、真实 PDF 目录和 AI 模型调用仍待接入。AI 面板明确显示模型未连接，不会返回模拟模型答案。当前单文件导入限制为 50 MB。

## 代码边界

- `src/components/ui`：全部基础 UI 组件；业务界面按 layout、tabs、workspace、search 分类。
- `src/assets/styles/main.css`：以 `@import 'tailwindcss';` 引入 Tailwind；颜色和字体变量在 `tokens.css`。
- `src/modules/{markdown,pdf,word,ai}`：各文档引擎及 AI 独立实现。
- `src/stores` / `src/composables`：工作区状态与交互协调。
- `src/api/ipc`：集中管理文档、文件和窗口 API。
- `src-tauri/src/lib.rs`：保持应用入口与插件注册职责。

## 验收

`pnpm test` 检查递归布局、阅读位置校验、连续 PDF 页高和旋转定位、AI 文档快照绑定。运行开发服务后可打开 `http://localhost:1420/tests/engine-smoke.html`，点击“运行验收”检查三类文档导入、PDF 二进制保存、DOCX 原始排版渲染以及 Markdown 危险链接处理。测试仅使用 `tests/fixtures` 中的合成文件。

设计基准及阶段顺序见 `docs/design-system.md`。Windows 的窗口吸附、多显示器、安装包和长时间运行仍需桌面专项验收。
