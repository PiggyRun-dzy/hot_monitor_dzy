# Hot Monitor — 方案设计文档

> **版本**: v1.3 | **日期**: 2026-06-25

---

## 1. 技术选型

| 层 | 技术 | 版本 | 理由 |
|---|------|------|------|
| 前端 | React + Vite + TailwindCSS 3 | 18.3 / 5.4 / 3.4 | 组件化 + 极速构建 + 原子化样式 |
| 动效 | 自研 ui/ (Spotlight, ShootingStar, GlowingEffect, LampEffect) | - | Aceternity 风格，纯 CSS，零依赖 |
| 后端 | Express | 4.22 | 轻量级 API |
| 数据库 | sql.js (SQLite WASM) | 1.14.1 | 纯 JS，无编译依赖 |
| AI | OpenRouter → DeepSeek V4 Pro | API v1 | 国内直连，推理模型 |
| 搜索 | Cheerio + Fetch | - | 12 源爬虫/API |
| 调度 | node-cron | 3.0.3 | Cron 表达式 |
| 启动 | start.js (child_process.spawn) | - | 单窗口，自动检测 node 路径 |

---

## 2. 系统架构

```
Browser (:5173)  ──API Proxy──▶  Express (:3456)
                                   ├─ Routes (keywords/hotspots/settings)
                                   ├─ Monitor Engine
                                   │   ├─ Search (12 sources, round-robin)
                                   │   ├─ Freshness Filter (pub_date > max_age_days)
                                   │   ├─ Engagement Filter (source-specific)
                                   │   ├─ AI Verify (3D: R+I+F, OpenRouter)
                                   │   └─ Notifier (Email)
                                   ├─ Scheduler (node-cron)
                                   └─ SQLite (sql.js WASM)
```

### 数据流

```
搜索(12源轮询) → 时效预过滤(pub_date>7天→丢弃)
                       ↓
               互动量预过滤(源级阈值)
                       ↓
               AI 三维验证(Relevance+Importance+Freshness)
                       ↓  F<40→丢弃; 综合分≥阈值
                    SQLite INSERT → 前端轮询15s + 邮件通知
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
| relevance_score | INTEGER | 相关性 R (0-100) |
| importance | INTEGER | 重要性 I (0-100) |
| freshness | INTEGER | 时效性 F (0-100) |
| is_fake | INTEGER | 假冒标记 |
| detected_at | DATETIME | 发现时间 (UTC) |
| notified | INTEGER | 通知状态 |

### monitor_logs / settings

| 配置键 | 默认值 | 说明 |
|--------|:---:|------|
| `scan_interval` | 30 | 扫描间隔（分钟） |
| `min_score_engine` | 70 | 搜索引擎源综合分阈值 |
| `min_score_community` | 55 | 社区源综合分阈值 |
| `max_age_days` | 7 | 内容最大天数（超过丢弃） |

---

## 4. API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/keywords` | 列表（含 hotspot_count + last_detected） |
| POST | `/api/keywords` | 添加 `{keyword, scope}` |
| PATCH | `/api/keywords/:id` | 更新 `{status}` 或 `{keyword, scope}` |
| DELETE | `/api/keywords/:id` | 删除 |
| GET | `/api/hotspots` | 分页列表 `?page&limit&status`，含 `combined_score` |
| GET | `/api/hotspots/new` | 新热点 + AI 批量摘要 |
| **POST** | **`/api/scan`** | **触发全量扫描**（新增） |
| GET | `/api/stats` | `{totalKeywords,activeKeywords,totalHotspots,recent24h,verified,lastScan}` |
| GET | `/api/logs` | 最近 20 条 |
| GET/PUT | `/api/settings` | 配置读写 |
| GET | `/api/debug/search` | 调试：测试各源原始返回（`?keyword=`） |

---

## 5. UI 组件

```
App.jsx                      三 Tab 主布局 + Header + 扫描轮询
├── StatsBar.jsx             4 统计卡片（ShootingStar + GlowingEffect）
├── HotspotFeed.jsx          热点信号流
│   └── HotspotCard.jsx      SVG 环形综合评分 + R:I:F 三维 + 来源 badge
├── KeywordManager.jsx       滑块开关 + 编辑/删除图标 + 编辑弹窗
├── SearchPanel.jsx          全文搜索历史
├── LogPopover.jsx           Header 日志按钮 → 弹窗
├── AddKeywordModal.jsx      玻璃弹窗
├── SettingsModal.jsx        扫描间隔 + 引擎/社区阈值滑块 + 最大天数滑块 + SMTP
└── ui/
    ├── Spotlight.jsx        全屏光束
    ├── ShootingStar.jsx     随机流星
    ├── GlowingEffect.jsx    hover 外发光
    └── LampEffect.jsx       头部环境光
```

---

## 6. 核心模块

### ai.js — DeepSeek V4 Pro 三维验证

```javascript
// 请求
POST https://openrouter.ai/api/v1/chat/completions
{
  model: 'deepseek/deepseek-v4-pro',
  response_format: { type: 'json_object' },
  max_tokens: 1000
}

// 三维评分 (Relevance + Importance + Freshness)
const isRelevant = result.isRelevant ?? result.relevant ?? true;
const isFake     = result.isFake     ?? result.fake     ?? false;
const score      = Number(result.score ?? 50);
const importance = Number(result.importance ?? 50);
const freshness  = Number(result.freshness ?? 50);

// 综合分 + 硬拒绝
if (freshness < 40) continue; // 过时内容直接丢弃
const combined = Math.round((score + importance + freshness) / 3);
// 入库条件: isRelevant && !isFake && combined >= minScore(source)
```

### web-scraper.js — 12 源 round-robin 搜索

```
searchAll(keyword, maxResults=8)
  ├─ Promise.allSettled([
  │    searchBing(), searchGoogle(), searchDuckDuckGo(),
  │    searchSogou(), searchBaidu(), searchHackerNews(),
  │    searchBilibili(), searchWeibo(),
  │    searchGitHub(), searchJuejin(), searchZhihu(), searchReddit()
  │  ])
  ├─ 轮询取结果 (每源各取1条，确保多样性)
  └─ 去重(URL) → 返回
```

### 搜索源返回字段

| 字段 | 提供源 |
|------|--------|
| `pub_date` | HN (`created_at`), GitHub (`pushed_at`), B站 (`pubdate`), 掘金 (`ctime`), Reddit (`created_utc`) |
| `points`/`num_comments` | HN |
| `play`/`danmaku` | B站 |
| `stars`/`forks` | GitHub |
| `followers`/`isAccount` | GitHub User |
| `digg_count`/`view_count` | 掘金 |
| `score`/`num_comments` | Reddit |

### 互动量预过滤阈值

| 源 | 条件 |
|----|------|
| HN | points ≥ 10 AND num_comments ≥ 5 |
| B站 | play ≥ 500 |
| GitHub | (repo) stars ≥ 10; (account) followers ≥ 5 |
| 掘金 | digg_count ≥ 5 |
| Reddit | score ≥ 10 AND num_comments ≥ 3 |
| 微博热搜 | hotness ≥ 100000 |
| 搜索引擎 | 无预过滤（交 AI 判断） |

### monitor.js — 监控引擎

```javascript
monitorKeyword(keywordObj, db)
  ① searchAll(keyword, 8)                    // 12 源轮询
  ② 时效预过滤 (pub_date > max_age_days)     // 省 AI token
  ③ 互动量预过滤 (源级阈值)                   // 质量门槛
  ④ for each → AI verifyContent()             // R+I+F 三维
  ⑤ F<40 → 跳过 | 综合分<阈值 → 跳过          // 硬拒绝
  ⑥ 去重 URL → INSERT                         // 入库
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
| 4 | content 为 null | max_tokens=300 不够推理模型 | → 1000 + null 检查 |
| 5 | 聚光灯不显示 | Tailwind z-index 冲突 | inline style + fixed |
| 6 | 流星旋转消失 | animation transform 覆盖静态 rotate | 写入 keyframes |
| 7 | 日志弹窗裁剪 | header overflow-hidden | 移到子元素 |
| 8 | 时间不准 | SQLite CURRENT_TIMESTAMP 返回 UTC，前端误加 +08:00 | 改为 `'Z'` (UTC) |
| 9 | 低质量帖子混入 | AI 兜底策略过于宽松 + 无互动量过滤 | 严格模式 + 三层过滤 + 多维评分 |
| 10 | 新搜索源不生效 | round-robin 前序源占满 5 条结果 | 轮询取结果 + maxResults→8 |
| 11 | 手动扫描无响应 | 前端只等 5s 但扫描需 60-90s | 轮询等待 + `POST /api/scan` |
| 12 | 旧内容混入热点 | 无时效判断 | pub_date 预过滤 + AI freshness 评分 |
