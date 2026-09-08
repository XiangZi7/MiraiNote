# MiraiNote · 设计与交付基准

视觉来源：用户提供的 `C:/Users/admin/Desktop/markdown.png`（1586 × 992）。文字需求决定行为，截图决定视觉。桌面壁纸及 macOS 红黄绿按钮不属于 Windows 应用内容。

## 视觉规则

应用使用占满窗口的原生工作台布局。浅灰侧栏、近白编辑区、白色阅读区、浅灰 Inspector 构成背景层次；仅在结构边界使用 1px 分隔线。正文优先，避免卡片式后台布局。

| Token            | 基准                                                  |
| ---------------- | ----------------------------------------------------- |
| Sidebar          | 默认 240px，180–420px，可折叠为 56px                  |
| Inspector        | 默认关闭，280px，220–420px                            |
| Header           | 48px；Windows 窗口按钮置右                            |
| Tab bar          | 36px；单文档也保留真实 Tab                            |
| Document toolbar | 44px；图标 16px，按钮 28px                            |
| UI font          | 本地 Inter + Segoe UI + Microsoft YaHei UI，13px      |
| Editor font      | 本地 JetBrains Mono + Microsoft YaHei UI，14px / 26px |
| Preview          | 14px / 27px，标题 26px、20px、16px                    |
| Padding          | Sidebar 12px；编辑区 24px；阅读区 36px                |
| Radius           | 控件 6px；菜单 10px；浮层 12px                        |
| Motion           | 150ms / 180ms；支持 reduced-motion                    |
| Split            | 默认 50:50，30%–70%                                   |

颜色以 `src/assets/styles/tokens.css` 为唯一来源。Dark / Light / System 使用同一语义变量体系。没有底部 Status Bar。截图中 Inspector 为展开状态，但初始状态遵循文字要求收起。

## 组件与状态边界

| 组件          | 单一职责 / 输入与事件                                           |
| ------------- | --------------------------------------------------------------- |
| AppShell      | 组装 Header / Sidebar / Workspace / 面板 / 浮层                 |
| AppHeader     | 文档标题、搜索、导出、菜单、窗口控制                            |
| Sidebar       | 工作区入口、类型筛选、最近、收藏；导航交给 workspace store      |
| ResizeHandle  | `modelValue / min / max / axis`，发出尺寸更新                   |
| WorkspaceNode | 接收 LayoutNode，递归渲染分割与 Pane                            |
| DocumentPane  | 接收 PaneNode，挂载活动文档，处理拖入区域                       |
| TabBar        | 接收 PaneNode，发出激活、关闭、排序、分屏动作                   |
| MarkdownView  | 接收 Document，通过 Store 读写；独立 Editor / Preview / Toolbar |
| PdfView       | 独立页面阅读、缩略图、目录与工具栏                              |
| WordView      | 独立富文本页面和格式工具栏                                      |
| Inspector     | 接收当前 Document，展示属性、标签、收藏                         |
| SearchPalette | 统一键盘导航；文件搜索与命令模式                                |
| ContextMenu   | 接收菜单项与位置；统一焦点、越界约束和关闭行为                  |
| AiPanel       | 当前文档、Pane、Tab 上下文及 AI 操作入口                        |

Document 内容与 Tab 分离：同一文档可在不同 Pane 显示，内容只有一个真源。LayoutNode 是递归的 Pane / Split 联合类型。视图位置按 Tab 保存。业务组件通过 Store / Composable 调用 API，禁止直接 invoke。

## 顺序与验收

1. Phase 1：设计 tokens、字体和基础控件；检查尺寸、主题与间距。
2. Phase 2–3：布局、Sidebar、Header、Tabs；检查模块结构、窗口适配。
3. Phase 4：递归分屏；检查空 Pane 收拢、排序、移动、分割比例。
4. Phase 5–7：Markdown、PDF、Word 独立 UI；以示例数据进行视觉检查。
5. Phase 8–9：Inspector、搜索、右键菜单、命令面板、AI UI；检查键盘和焦点。
6. Phase 10–17：依序接入各文档引擎、文件系统、持久化和 AI；逐模块真实文件验收。
7. Phase 18–19：大文件、虚拟化、按需加载、暗色模式与 Windows 最终打磨。

每步检查结构、UI、功能后再继续。示例数据与真实文件必须有明确来源，不将本地演示回答描述为在线 AI 结果，不将浏览器缓存描述为已保存到源文件。
