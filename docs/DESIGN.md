# Hot Monitor — AI 热点雷达监测站

> **版本**: v1.2 | **最后更新**: 2026-06-25 | **作者**: AI Programming Blogger

---

## 📋 目录

1. [项目概述](#1-项目概述)
2. [需求分析](#2-需求分析)
3. [技术选型](#3-技术选型)
4. [系统架构](#4-系统架构)
5. [数据模型](#5-数据模型)
6. [API 接口设计](#6-api-接口设计)
7. [UI/UX 设计](#7-uiux-设计)
8. [核心流程](#8-核心流程)
9. [项目结构](#9-项目结构)
10. [部署指南](#10-部署指南)
11. [开发路线图](#11-开发路线图)
12. [已验证测试结果](#12-已验证测试结果)
13. [填坑记录](#13-填坑记录)

---

## 1. 项目概述

### 1.1 定位

面向 AI 编程博主的轻量级热点监控工具：自动搜索、AI 验证、及时通知。

### 1.2 核心价值

| 痛点 | 解决方案 |
|------|---------|
| 人工搜索效率低 | 7 大免费数据源自动聚合搜索 + 30 分钟定时扫描 |
| 假冒/标题党内容 | DeepSeek V4 Pro AI 验证真伪，排除蹭热度 |
| 单一信息源不可靠 | Bing + Google + DDG + 搜狗 + HN + B站 + 微博热搜 |
| 无法及时获知 | 邮件通知 + 页面实时轮询 |

---

## 2. 需求分析

### 2.1 功能需求

#### F1: 关键词监控
- 手动输入关键词 + 监控范围（scope）
- **滑块开关** 激活/暂停，**编辑/删除** 图标始终可见
- 状态持久化到 SQLite

#### F2: AI 真伪识别
- DeepSeek V4 Pro via OpenRouter
- `response_format: json_object` 强制 JSON
- 字段名兼容 `isRelevant`/`relevant`、`isFake`/`fake`
- `max_tokens: 600`（推理模型）+ fallback score: 65

#### F3: 7 大免费数据源
| 数据源 | 方式 | 需要 Key |
|--------|------|:--:|
| Bing | Cheerio 爬虫 | ❌ |
| Google | Cheerio 爬虫 | ❌ |
| DuckDuckGo | Lite HTML | ❌ |
| 搜狗 | Cheerio 爬虫 | ❌ |
| HackerNews | Algolia API | ❌ |
| B站 | 官方 API | ❌ |
| 微博热搜 | Ajax API | ❌ |

> `searchAll` 聚合 + URL 去重，每次扫描取最多 5 条。

#### F4: 定时扫描
- node-cron `*/30 * * * *`，启动 10 秒后首次扫描
- 手动触发：Header "手动扫描" 按钮

#### F5: 通知
- 邮件通知（SMTP，待配置）
- 前端 15 秒轮询 + 新热点计数 badge

#### F6: Web 界面
- React + Vite + TailwindCSS 3
- **深空玻璃风格**：暗色背景 + `backdrop-blur: 24px` 透明卡片
- **Aceternity 动效**：光束聚光灯、随机流星、hover 光晕、头部环境光
- **三 Tab**：热点流（首页）/ 监控词 / 搜索历史
- 系统日志：Header 按钮 → 点击弹窗

---

## 3. 技术选型

| 层 | 技术 | 版本 |
|---|------|------|
| 前端 | React + Vite + TailwindCSS 3 | 18.3 / 5.4 / 3.4 |
| 动效 | 自研 ui/ 组件（Spotlight, ShootingStar, GlowingEffect, LampEffect） | - |
| 后端 | Express | 4.22 |
| 数据库 | sql.js (SQLite WASM) | 1.14.1 |
| AI | OpenRouter → DeepSeek V4 Pro | API v1 |
| 搜索 | Cheerio (Bing/Google/DDG/搜狗) + Fetch API (HN/B站/微博) | - |
| 调度 | node-cron | 3.0.3 |
| 启动 | start.js (child_process.spawn) | - |

---

## 4. 系统架构

同 v1.1，搜索模块扩展为 7 源。

---

## 5. 数据模型

同 v1.1，keywords/hotspots/monitor_logs/settings 四张表无变化。

---

## 6. API 接口设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/keywords` | 列表/添加 |
| PATCH | `/api/keywords/:id` | 更新 status/keyword/scope |
| DELETE | `/api/keywords/:id` | 删除 |
| GET | `/api/hotspots` | 分页列表 |
| GET | `/api/hotspots/new` | 新热点 + AI 摘要 |
| GET | `/api/stats` | 统计 |
| GET | `/api/logs` | 日志 |
| GET/PUT | `/api/settings` | 配置 |

> **变更**: `PATCH /api/keywords/:id` 支持同时更新 `keyword` 和 `scope`。

---

## 7. UI/UX 设计

### 7.1 设计方向：深空玻璃（v1.2）

从 v1.0 Cyberpunk HUD 升级为克制、透明的现代科技风格。

### 7.2 配色系统

```
背景      #05050A        深空黑
卡片      rgba(10,10,20,0.25) + blur(24px)    玻璃拟态
强调      #6366F1 / #818CF8    indigo
成功      #34D399              emerald
警报      #F472B6              pink
```

### 7.3 组件清单

| 组件 | 说明 |
|------|------|
| `StatsBar` | 4 统计卡片（流星 + hover 光晕） |
| `KeywordManager` | 滑块开关 + 编辑/删除图标 + 编辑弹窗 |
| `HotspotFeed` + `HotspotCard` | 热点流 + SVG 环形评分 |
| `SearchPanel` | 历史热点全文搜索 |
| `AddKeywordModal` / `SettingsModal` | 玻璃弹窗 |
| `LogPopover` | Header 按钮 → 点击弹窗 |
| `ui/Spotlight` | 全屏光束（linear-gradient 从左到右） |
| `ui/ShootingStar` | CSS 动画随机流星 |
| `ui/GlowingEffect` | hover 外发光 |
| `ui/LampEffect` | 头部环境光 |

---

## 8. 核心流程

同 v1.1，搜索阶段扩展为 7 源并行。

---

## 9. 项目结构

```
hot-monitor/
├── start.js                      # 一键启动
├── server/
│   ├── index.js / db.js / ai.js / monitor.js / scheduler.js / notifier.js
│   ├── search/web-scraper.js     # 7 大源
│   └── routes/                   # keywords, hotspots, settings
├── client/src/
│   ├── App.jsx                   # 三 Tab 主布局
│   ├── index.css                 # 全局样式 + @keyframes starFall
│   └── components/
│       ├── StatsBar.jsx          # 统计卡片（流星+光晕）
│       ├── KeywordManager.jsx    # 滑块开关+编辑删除
│       ├── HotspotFeed.jsx / HotspotCard.jsx
│       ├── SearchPanel.jsx       # 搜索历史
│       ├── LogPopover.jsx        # Header 日志按钮
│       ├── AddKeywordModal.jsx / SettingsModal.jsx
│       └── ui/                   # Aceternity 风格动效库
│           ├── Spotlight.jsx     # 光束聚光灯
│           ├── ShootingStar.jsx  # 随机流星
│           ├── GlowingEffect.jsx # hover 光晕
│           └── LampEffect.jsx    # 环境光
├── docs/DESIGN.md
└── README.md
```

---

## 10. 部署指南

```bash
npm run setup      # 安装依赖
cp .env.example .env  # 配置 OPENROUTER_API_KEY
npm run dev        # 一键启动 → :5173 / :3456
```

---

## 11. 开发路线图

### Phase 1 ✅ 已完成
- [x] 全链路：Express + SQLite + DeepSeek V4 Pro + 7 数据源
- [x] UI v1.2：深空玻璃 + 三 Tab + Aceternity 动效
- [x] 关键词编辑 + 滑块开关
- [x] 时间显示 +08:00 时区修复

### Phase 2
- [ ] 邮件通知配置
- [ ] 数据可视化图表

---

## 12. 已验证测试结果

| 测试项 | 结果 |
|--------|------|
| 7 源聚合搜索 | ✅ 8 条去重结果 |
| DeepSeek V4 Pro AI | ✅ score=95-100 |
| 全链路端到端 | ✅ 搜索→验证→入库→展示 |

---

## 13. 填坑记录

| # | 问题 | 根因 | 解决 |
|---|------|------|------|
| 1 | concurrently 启动失败 | rxjs 损坏 + PATH | start.js |
| 2 | better-sqlite3 编译失败 | Node v24 无预编译 | sql.js |
| 3 | 热点始终为 0 | DeepSeek 字段名不同 | ??兼容 |
| 4 | content 为 null | tokens 不足 | max_tokens→600 |
| 5 | 聚光灯不显示 | Tailwind z-index 冲突 | inline style + fixed |
| 6 | 流星动画垂直覆盖旋转 | transform 冲突 | rotate 写入 keyframes |
| 7 | 日志弹窗被裁剪 | header overflow-hidden | 移到 LampEffect |
| 8 | 时间显示不准 | 无时区 | +08:00 后缀 |
