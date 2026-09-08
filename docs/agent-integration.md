# AI Agent 接入约定

参考：`D:/code/MiraiHub/src-tauri/src/agent`。已检查运行管理、配置、模型协议、限制、历史和操作策略。源项目只读参考，未修改、未读取实际凭据配置。

沿用：后端持有运行状态；前端接收 Snapshot；取消独立于正在执行的请求；Profile 对 UI 只暴露 hasApiKey；协议适配与业务策略分离；历史恢复不重放审批；步骤、消息数和上下文字节数分别限制；执行前复验目标版本。

Docs 的目标为 `workspaceId + paneId + tabId + documentId + revision`。发送前捕获不可变上下文，包括当前草稿、选区或页码。切换 Tab 不得改变已发送请求的目标。回写修改前校验原文版本，避免覆盖新编辑。

Markdown 取编辑缓冲区，PDF 使用 PDF.js 文本层，Word 使用解析文本和 Tiptap 编辑内容。文档工具包括读取、搜索、提取标题、提取任务以及提出替换和插入内容。应用修改时提供可审阅的编辑结果。

后续后端实现放到 `commands/agent.rs` 和 `services/agent/{manager,context,protocol,policy,history,config,limits}.rs`。入口 `lib.rs` 只做注册。无需移植源项目的 SSH、Shell、数据库连接或 SQL 工具。

当前已落地：AI 面板和前端文档上下文快照；后端模型调用、Profile 设置、历史、执行与取消在 AI 阶段接入。请求预览不会发送文档。
