# AI Agent

参考：`D:/code/MiraiHub/src-tauri/src/agent` 及其前端 AI 设置面板。复用并适配配置、协议、模型发现和容量控制模块；源项目只读参考，未读取用户保存的凭据。

## 配置与入口

设置 → AI Agent；AI 侧栏齿轮可直达。配置支持名称、启用开关、OpenAI Chat Completions / Claude Messages 协议、基础地址、密钥、模型及任务容量。可添加多份官网、中转站或本机服务配置。模型列表支持获取和手动输入；Claude 模型列表支持分页。

测试连接使用当前表单草稿，仅发送固定测试消息，不读取文档，不保存、不切换配置。保存并使用会激活配置并停止当前任务。密钥留空保留原值，勾选清除后删除；更换地址不得复用原服务密钥。删除当前使用的配置后不会自动选择其他提供商。

Windows 使用 DPAPI 加密整个 `ai-settings.bin`，位于应用数据目录。前端只获取 `hasApiKey`，输入密钥仅存在于设置表单内存，关闭时清空。配置不写入 localStorage、Pinia 或日志。HTTPS 为默认，本机服务支持 HTTP；禁止携带凭据重定向，响应最多 1 MB，请求超时 60 秒。

## 文档协作

发送前捕获 `workspaceId + paneId + tabId + documentId + revision` 与正文、页码及光标位置。Markdown 使用编辑缓冲区，PDF 使用解析文本，Word 使用当前编辑文本；切换 Tab 不改变已发送的快照。对话按文档、Pane、Tab 和配置隔离，不会把上一份文档的会话混入新目标。

Rust 后端执行真实模型调用，支持文档搜索与 Markdown 标题提取的只读工具循环。模型请求次数、上下文大小和消息数分别受所选配置限制。停止通过独立 IPC 取消等待中的 HTTP 请求。模型内容经 markdown-it 与 DOMPurify 渲染，禁止自动加载模型回复中的远程图片。

会话当前只保留在应用内存中；模型结果可复制。尚未实现跨重启聊天历史、直接回写编辑建议，以及 SSH / Shell / SQL 操作。后续加入文档写回前必须校验原文版本并提供可审阅的修改结果。

## 模块与验证

- `src/modules/ai`：设置表单、侧栏组件、配置类型和文档快照。
- `src/stores/agent.ts`：配置公开元数据、当前对话与任务状态。
- `src/api/ipc/agent.ts`：唯一的前端 Agent IPC 入口。
- `src-tauri/src/commands/agent.rs`：参数接收和服务分发。
- `src-tauri/src/services/agent`：配置加密、协议适配、模型发现、任务管理、只读工具与限制。

`cargo test --manifest-path src-tauri/Cargo.toml --locked` 用本机模拟 HTTP 服务验证协议、认证、模型发现、工具循环、错误、容量、取消和密钥保护；不会连接付费模型。

协议参考：[OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)、[Claude Models API](https://platform.claude.com/docs/en/api/models)。
