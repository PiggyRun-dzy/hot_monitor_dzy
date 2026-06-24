# Hot Monitor — 方案设计文档

> **版本**: v1.2 | **日期**: 2026-06-25

---

## 1. 技术选型

| 层 | 技术 | 版本 | 理由 |
|---|------|------|------|
| 前端 | React + Vite + TailwindCSS 3 | 18.3 / 5.4 / 3.4 | 组件化 + 极速构建 + 原子化样式 |
| 动效 | 自研 ui/ (Spotlight, ShootingStar, GlowingEffect, LampEffect) | - | Aceternity 风格，纯 CSS，零依赖 |
| 后端 | Express | 4.22 | 轻量级 API |
| 数据库 | sql.js (SQLite WASM) | 1.14.1 | 纯 JS，无编译依赖 |
| AI | OpenRouter → DeepSeek V4 Pro | API v1 | 国内直连，推理模型 |
| 搜索 | Cheerio + Fetch | - | 7 源爬虫/API |
| 调度 | node-cron | 3.0.3 | Cron 表达式 |
| 启动 | start.js (child_process.spawn) | - | 单窗口，自动检测 node 路径 |

---

## 2. 系统架构

```
Browser (:5173)  ──API Proxy──▶  Express (:3456)
                                    ├─ Routes (keywords/hotspots/settings)
                                    ├─ Monitor Engine
                                    │   ├─ Search (7 sources)
                                    │   ├─ AI Verify (OpenRouter)
                                    │   └─ Notifier (Email)
                                    ├─ Scheduler (node-cron)
                                    └─ SQLite (sql.js WASM)
```

### 数据流

```
Scheduler → searchAll(7源) → AI Verify → score≥60 && isRelevant → SQLite INSERT
                                                                      ↓
                                                              前端轮询15s + 邮件通知
```

---

## 3. 数据模型

### keywords

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| keyword | TEXT NOT NULL | 监控词 |
| scope | TEXT | 范围 |
| status | CHECK('active','paused') | 状态 |
| created_at / updated_at | DATETIME | 时间 |

### hotspots

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| keyword_id | FK→keywords | 关联 |
| title | TEXT | 标题 |
| url | TEXT | 来源 |
| summary | TEXT | AI 摘要 |
| source / source_name | TEXT | 来源标识 |
| ai_verified | INTEGER | 验证状态 |
| relevance_score | INTEGER | 0-100 |
| is_fake | INTEGER | 假冒标记 |
| detected_at | DATETIME | 发现时间 |
| notified | INTEGER | 通知状态 |

### monitor_logs / settings

日志和配置键值对表。

---

## 4. API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/keywords` | 列表（含 hotspot_count + last_detected） |
| POST | `/api/keywords` | 添加 `{keyword, scope}` |
| PATCH | `/api/keywords/:id` | 更新 `{status}` 或 `{keyword, scope}` |
| DELETE | `/api/keywords/:id` | 删除 |
| GET | `/api/hotspots` | 分页列表 `?page&limit&status` |
| GET | `/api/hotspots/new` | 新热点 + AI 批量摘要 |
| GET | `/api/stats` | `{totalKeywords,activeKeywords,totalHotspots,recent24h,verified,lastScan}` |
| GET | `/api/logs` | 最近 20 条 |
| GET/PUT | `/api/settings` | 配置读写 |

---

## 5. UI 组件

```
App.jsx                      三 Tab 主布局 + Header
├── StatsBar.jsx             4 统计卡片（ShootingStar + GlowingEffect）
├── HotspotFeed.jsx          热点信号流
│   └── HotspotCard.jsx      SVG 环形评分 + 来源 badge
├── KeywordManager.jsx       滑块开关 + 编辑/删除图标 + 编辑弹窗
├── SearchPanel.jsx          全文搜索历史
├── LogPopover.jsx           Header 日志按钮 → 弹窗
├── AddKeywordModal.jsx      玻璃弹窗
├── SettingsModal.jsx        配置弹窗
└── ui/
    ├── Spotlight.jsx        全屏光束（linear-gradient 140deg）
    ├── ShootingStar.jsx     随机流星（CSS @keyframes starFall）
    ├── GlowingEffect.jsx    hover 外发光
    └── LampEffect.jsx       头部环境光
```

---

## 6. 核心模块

### ai.js — DeepSeek V4 Pro 验证

```javascript
// 请求
POST https://openrouter.ai/api/v1/chat/completions
{
  model: 'deepseek/deepseek-v4-pro',
  response_format: { type: 'json_object' },
  max_tokens: 600
}

// 返回兼容
const isRelevant = result.isRelevant ?? result.relevant ?? true;
const isFake     = result.isFake     ?? result.fake     ?? false;
```

### web-scraper.js — 7 源搜索

```
searchAll(keyword, maxResults)
  ├─ Promise.allSettled([
  │    searchBing(), searchGoogle(), searchDuckDuckGo(),
  │    searchSogou(), searchHackerNews(), searchBilibili(),
  │    searchWeibo()
  │  ])
  └─ 去重(URL) → slice(maxResults)
```

### start.js — 启动脚本

```javascript
const nodeExe = process.execPath;  // 自动检测 node 路径
spawn(nodeExe, ['server/index.js'])
spawn(nodeExe, [viteBin, '--host'])
```

---

## 7. 部署

```bash
npm run setup         # 安装前后端依赖
cp .env.example .env  # 配置 OPENROUTER_API_KEY
npm run dev           # 一键启动 → :5173 / :3456
```

| 变量 | 必填 | 默认值 |
|------|:--:|------|
| `OPENROUTER_API_KEY` | ✅ | - |
| `OPENROUTER_MODEL` | - | `deepseek/deepseek-v4-pro` |
| `PORT` | - | `3456` |
| `SCAN_INTERVAL_MINUTES` | - | `30` |

---

## 8. 填坑记录

| # | 问题 | 根因 | 解决 |
|---|------|------|------|
| 1 | concurrently 启动失败 | rxjs 损坏 + PATH | start.js (process.execPath) |
| 2 | better-sqlite3 编译失败 | Node v24 无预编译 | sql.js WASM |
| 3 | 热点始终为 0 | DeepSeek 字段名不同 (`relevant`/`fake`) | `??` 兼容 |
| 4 | content 为 null | max_tokens=300 不够推理模型 | → 600 + null 检查 |
| 5 | 聚光灯不显示 | Tailwind z-index 冲突 | inline style + fixed |
| 6 | 流星旋转消失 | animation transform 覆盖静态 rotate | 写入 keyframes |
| 7 | 日志弹窗裁剪 | header overflow-hidden | 移到子元素 |
| 8 | 时间不准 | SQLite 本地时间无时区 | `+08:00` 后缀 |
