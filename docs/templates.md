# 简历模板模块

## 职责

提供多套可切换的简历 HTML/React 模板，供编辑页预览与下载/打印页渲染。

## 关键文件

| 路径 | 说明 |
|------|------|
| `src/templates/resume/registry.ts` | 模板注册表与 `getResumeTemplate()` |
| `src/templates/resume/types.ts` | `ResumeTemplate` 类型 |
| `src/templates/resume/*.tsx` | 各模板实现 |
| `src/templates/resume/markdown-content.tsx` | 节点 Markdown 渲染复用 |
| `src/templates/resume/registry.test.ts` | 注册表单元测试 |

## 内置模板

| ID | 文件 | 风格简述 |
|----|------|----------|
| `classic` | `classic.tsx` | 经典双栏式 |
| `modern` | `modern.tsx` | 现代简洁 |
| `compact` | `compact.tsx` | 紧凑高密度 |
| `elegant` | `elegant.tsx` | 优雅衬线感 |
| `timeline` | `timeline.tsx` | 时间轴布局 |
| `creative` | `creative.tsx` | 创意视觉 |

未知 `templateId` 时回退到 `classic`。

## 模板接口

每个模板导出符合 `ResumeTemplate` 的对象，通常包含：

- `id`、`name`（展示名）
- React 组件：接收 `ResumeWithNodes` 与 locale，渲染完整简历

## 使用位置

- **编辑预览**：`src/components/resume/resume-preview.tsx` 根据 `resume.templateId` 选用模板组件。
- **模板选择**：`src/components/resume/template-select.tsx` 列出 `resumeTemplates`。
- **下载页**：`src/app/resumes/[id]/download/page.tsx` 专用于打印/PDF，样式独立于应用壳。

## 扩展新模板

1. 在 `src/templates/resume/` 新增 `*.tsx` 并实现 `ResumeTemplate`。
2. 加入 `registry.ts` 的 `resumeTemplates` 数组。
3. 可选：在 `registry.test.ts` 断言 ID 唯一性与必要字段。
