# 前端与路由

## App Router 页面

| 路由 | 文件 | 说明 |
|------|------|------|
| `/` | `src/app/page.tsx` | 首页：版本、设置、新建简历、工具入口、简历列表 |
| `/resumes/[id]` | `src/app/resumes/[id]/page.tsx` | 简历编辑工作台 |
| `/resumes/[id]/download` | `src/app/resumes/[id]/download/page.tsx` | 打印 / PDF 专用页 |
| `/tools/job-match` | `src/app/tools/job-match/page.tsx` | JD 列表与创建 |
| `/tools/job-match/[id]` | `src/app/tools/job-match/[id]/page.tsx` | JD 详情与匹配 |
| `/release-notes` | `src/app/release-notes/page.tsx` | 版本列表 |
| `/release-notes/[version]` | `src/app/release-notes/[version]/page.tsx` | 单版本说明 |

查询参数 `lang`、`ui` 与 Cookie 共同决定语言与主题（见 [i18n-and-settings.md](./i18n-and-settings.md)）。

## 核心组件

### 简历编辑（`src/components/resume/`）

| 组件 | 职责 |
|------|------|
| `resume-workspace.tsx` | 三栏布局：节点列表、编辑器、预览；拖拽排序；保存/删除 |
| `node-editor.tsx` | 按节点类型编辑表单 |
| `resume-preview.tsx` | 模板实时预览 |
| `template-select.tsx` | 切换 `templateId` |
| `ai-panel.tsx` | AI 三种模式 UI、Plan 确认 |
| `print-button.tsx` | 跳转下载页 |

### 系统（`src/components/`）

| 组件 | 职责 |
|------|------|
| `system-settings.tsx` | 语言、UI 主题、Electron AI 配置 |
| `language-switcher.tsx` | 语言切换控件 |

### 岗位工具（`src/components/job-match/`）

- `job-match-tool.tsx` — JD 选择、简历选择、调用 API 展示结果

## Server Actions（`src/app/actions.ts`）

- `createResumeAction` — 创建简历并 `redirect` 到编辑页
- `createJobDescriptionAction` / `updateJobDescriptionAction` — JD 写入后重定向

## 客户端持久化

编辑页通过 `fetch` 调用：

- `PATCH /api/resumes/[id]` — 保存（`resume-workspace`）
- `DELETE /api/resumes/[id]` — 删除简历
- `POST /api/ai` — AI 交互

## 布局与样式

- `src/app/layout.tsx` — 根布局，设置 `html[lang]` 与 `data-ui-style`
- `src/app/globals.css` — CSS 变量驱动的主题（`--app-*`）

## 动态渲染

首页与编辑相关页面使用 `export const dynamic = "force-dynamic"`，确保每次请求读取最新数据库状态。
