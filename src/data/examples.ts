import type { DocumentRecord } from '@/types/document'

const markdown = `# 产品设计文档

## 项目介绍
MiraiHub 是一个面向开发者的桌面工作台。
支持服务器连接、文件管理、数据库操作以及 AI Agent。

### 核心功能
- SSH 服务器管理
- 数据库管理
- Markdown 文档
- PDF 阅读
- Word 文档
- AI 辅助

## 设计目标
打造一个简洁、高效、专业的开发者工具，让用户能够
在一个应用中完成大部分的日常工作，提升生产力。

### 界面设计原则
1. 简洁：去除不必要的复杂性
2. 高效：快速访问核心功能
3. 专注：减少视觉干扰
4. 优雅：遵循 Apple 设计语言

\`\`\`bash
# 启动应用
miraihub
\`\`\`
`

const word = `<h1>产品规划与设计方案</h1><p class="document-subtitle">MiraiHub Docs · 产品与体验设计</p><h2>一、项目概述</h2><p>我们希望构建一个简洁、专注的文档工作台，让阅读、思考与创作自然地发生在同一个空间里。</p><p>围绕文档建立连贯的工作方式，以清晰的信息结构和克制的界面语言，帮助用户在复杂的工作中保持专注。</p><h2>二、核心体验</h2><p><strong>文档是核心，功能是辅助。</strong>通过标签页和灵活分屏，在多个文档之间轻松切换、对照与整理。</p><ul><li>统一管理 Markdown、PDF 与 Word 文档</li><li>恢复工作现场，让每一次开始都延续上一次思考</li><li>使用搜索与收藏，快速找到需要的内容</li></ul><h2>三、里程碑</h2><table><thead><tr><th>阶段</th><th>交付内容</th><th>重点</th></tr></thead><tbody><tr><td>设计基础</td><td>设计系统与应用布局</td><td>视觉一致性</td></tr><tr><td>文档体验</td><td>编辑器与阅读器</td><td>内容优先</td></tr><tr><td>工作空间</td><td>搜索、分屏与恢复</td><td>流畅交互</td></tr></tbody></table><h2>四、下一步</h2><p>通过真实的阅读与写作场景持续验证设计，让每一个细节都服务于文档本身。</p>`

export function exampleDocuments(): DocumentRecord[] {
  const base = { source: 'example' as const, createdAt: '2025-09-08T14:32:00+08:00', modifiedAt: '2025-09-08T15:20:00+08:00', openedAt: '2025-09-08T15:20:00+08:00', dirty: false }
  return [
    { ...base, id: 'product-design', name: '产品设计文档.md', kind: 'markdown', path: '文档 / 设计 / 产品设计文档.md', content: markdown, text: markdown, size: 2458, tags: ['设计', '产品', 'Markdown'], favorite: true },
    { ...base, id: 'design-guide', name: '设计规范.pdf', kind: 'pdf', path: '文档 / 设计 / 设计规范.pdf', content: '', text: 'MiraiHub 设计规范 设计理念 字体与排版 色彩系统 组件与布局 简洁 高效 专注 优雅', size: 248320, pages: 6, tags: ['设计', '规范'], favorite: false },
    { ...base, id: 'project-plan', name: '产品规划.docx', kind: 'word', path: '文档 / 产品 / 产品规划.docx', content: word, text: '产品规划与设计方案 项目概述 核心体验 里程碑 下一步 统一管理 Markdown PDF Word', size: 18432, pages: 2, tags: ['产品', '规划'], favorite: true },
    { ...base, id: 'meeting-notes', name: '每周设计回顾.md', kind: 'markdown', path: '文档 / 会议 / 每周设计回顾.md', content: '# 每周设计回顾\n\n> 让每一个细节，都服务于内容。\n\n## 本周进展\n\n完成文档工作台的交互方案，统一编辑与阅读体验。\n\n## 待办事项\n\n- [x] 确定设计系统\n- [x] 整理文档布局\n- [ ] 验证多文档分屏体验\n- [ ] 补充深色主题\n\n## 讨论记录\n\n| 议题 | 结论 |\n| --- | --- |\n| 工具栏 | 保持克制，按文档类型显示 |\n| Inspector | 默认收起，按需查看 |\n| 工作区 | 自动恢复上次打开的文档 |\n', text: '每周设计回顾 本周进展 待办事项 讨论记录 工作区 深色主题', size: 862, tags: ['会议'], favorite: false },
  ]
}
