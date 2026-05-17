# 国际化与界面设置

## 国际化（`src/lib/i18n.ts`）

### 支持语言

`zh-CN`（默认）、`en`、`ko`、`es`、`ja`、`ru`、`de`、`fr`

### 核心 API

- `resolveLocale(value?)` — 解析合法 locale，非法则回退默认
- `languageName(locale)` — 供 AI 提示词指定回复语言
- `dictionaries[locale]` — 全站 UI 文案对象（首页、编辑、AI、JD 工具等）

### 传递方式

1. URL 查询参数 `?lang=xx`
2. Cookie `resume-pro-locale`（由 `language-switcher` / `SystemSettings` 写入）

页面通过 `searchParams.lang ?? cookie` 解析，并在链接中附带 `settingsQuery({ lang, style })` 保持状态。

## 界面主题（`src/lib/settings.ts`）

### UI 风格

| ID | 说明 |
|----|------|
| `github` | 默认，GitHub 风格中性色 |
| `warm` | 暖色主题 |
| `slate` | 石板灰主题 |

### 核心 API

- `resolveUiStyle(value?)` — 解析 `ui` 参数或 Cookie `resume-pro-ui-style`
- `settingsQuery({ lang, style })` — 生成 `lang=...&ui=...` 查询串

根布局 `layout.tsx` 在 `<html>` 上设置 `data-ui-style={uiStyle}`，`globals.css` 按属性切换 CSS 变量。

## SystemSettings 组件

`src/components/system-settings.tsx` 集中提供：

- 语言下拉
- 界面风格选择
- Electron 下 AI API URL / Key / Model 表单（提交 `/api/settings/ai`）

首页与编辑页通过 props 传入当前 `locale`、`uiStyle` 及文案 labels。
