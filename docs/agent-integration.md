# AI Agent

参考：`D:/code/MiraiHub/src-tauri/src/agent` 及其前端 AI 面板。复用并适配配置、协议、模型发现、附件、聊天记录和容量控制模块；源项目只读参考，未读取用户保存的凭据。

## 配置与入口

设置 → AI Agent；AI 侧栏齿轮可直达。配置支持名称、启用开关、OpenAI Chat Completions / Claude Messages 协议、基础地址、密钥、模型及任务容量。可添加多份官网、中转站或本机服务配置。模型列表支持获取和手动输入；Claude 模型列表支持分页。

测试连接使用当前表单草稿，仅发送固定测试消息，不读取文档，不保存、不切换配置。保存并使用会激活配置并停止当前任务。密钥留空保留原值，勾选清除后删除；更换地址不得复用原服务密钥。删除当前使用的配置后不会自动选择其他提供商。

Windows 使用 DPAPI 加密整个 `ai-settings.bin`，位于应用数据目录。配置列表只回传 `hasApiKey`；点击密钥输入框旁的小眼睛才通过 `agent_reveal_key` 按需取回单个配置的明文，仅停留在设置表单内存，关闭时清空。取回后未改动的密钥提交为空值，因此更换地址依旧要求重新输入。配置不写入 localStorage、Pinia 或日志。HTTPS 为默认，本机服务支持 HTTP；禁止携带凭据重定向，响应最多 1 MB，请求超时 60 秒。

## 文档协作

发送前捕获 `workspaceId + paneId + tabId + documentId + revision` 与正文、页码及光标位置。Markdown 使用编辑缓冲区，PDF 使用解析文本，Word 使用当前编辑文本。快照按修订号发送一次；同一会话内文档被编辑后会补发新快照，并在对话里留下可见记录。嵌入提示词的正文最多 60 KB，超出时标记截断，模型改用工具分页读取，长文档不再直接触发容量上限。

后端持有会话：`agent_start` 建立任务，`agent_step` 每次只完成一次模型请求，前端循环推进，因此 `search_document`、`document_outline`、`read_document_lines` 的每次调用都会作为可折叠条目出现在对话里，工具失败也会回传给模型继续处理。`agent_send` 在同一文档上继续对话，`agent_cancel` 取消等待中的 HTTP 请求，`agent_forget` 释放运行时上下文。模型请求次数、上下文大小和消息数分别受所选配置限制。模型内容经 markdown-it 与 DOMPurify 渲染，禁止自动加载模型回复中的远程图片。

## 附件

每条消息最多 4 个文件，单个文本不超过 64 KB，合计不超过 128 KB。文本、日志、代码直接读取；`.pdf` 与 `.docx` 复用文档引擎的 `inspectPdf` / `importWord` 在前端抽成纯文本再发送，抽取结果超限时明确拒绝而不静默截断，`.doc` 需先转存为 `.docx`。后端只接受非空 UTF-8 文本，拒绝二进制与非法文件名；附件正文进入模型上下文并标注为不可信资料，对话记录里只保留文件名和大小。

## 聊天记录

记录按文档隔离，保存在应用数据目录 `ai-conversations/<32 位十六进制>.bin`，整份文件用 DPAPI 加密，写入走临时文件加重命名。打开时校验会话归属当前文档，跨文档拒绝。系统提示词不入库、恢复时重建；缺少结果的工具调用会补一条“已中断、没有结果”的说明，不会被当成可以重放。只有最新的活跃任务能写自己的记录，迟到的响应无法覆盖已恢复或已删除的会话；重命名与进行中的请求互不打断。侧栏可新建对话、按文档浏览与搜索记录、重命名、删除并复制整段对话。保存失败通过 `saveError` 提示，不会中断当前回答。

尚未实现：直接回写编辑建议，以及 SSH / Shell / SQL 操作。后续加入文档写回前必须校验原文版本并提供可审阅的修改结果。

## 模块与验证

- `src/modules/ai`：设置表单、侧栏组件、聊天记录弹层、附件读取、草稿状态和文档快照。
- `src/stores/agent.ts`：配置公开元数据、当前会话快照、step 循环与聊天记录状态。
- `src/api/ipc/agent.ts`：唯一的前端 Agent IPC 入口。
- `src-tauri/src/commands/agent.rs`：参数接收和服务分发。
- `src-tauri/src/services/agent`：配置加密、协议适配、模型发现、任务管理、附件校验、加密聊天记录、只读工具与限制。

`cargo test --manifest-path src-tauri/Cargo.toml --locked` 用本机模拟 HTTP 服务验证协议、认证、模型发现、step 工具循环、错误回传、容量、取消、长文档截断、附件校验、聊天记录加密与归属；不会连接付费模型。`pnpm test` 验证文档快照绑定、附件限制和密钥提交规则。`pnpm test:ui` 通过 Tauri 官方 mock IPC 走完上传附件、逐步工具调用、停止、失败回填、新建对话、记录重命名与删除，以及小眼睛取回密钥的完整流程。

协议参考：[OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)、[Claude Models API](https://platform.claude.com/docs/en/api/models)。
