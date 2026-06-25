# Hot Monitor — 方案设计文档

> **版本**: v1.4 | **日期**: 2026-06-26

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
                                   │   │   ├─ Rich snippet extraction (description/story_text etc.)
                                   │   │   └─ Engagement data capture (points/play/stars etc.)
                                   │   ├─ Freshness Filter (pub_date > max_age_days)
                                   │   ├─ Engagement Filter (source-specific)
                                   │   ├─ AI Verify (3D: R+I+F + reason, OpenRouter)
                                   │   └─ Notifier (Email)
                                   ├─ Scheduler (node-cron)
                                   └─ SQLite (sql.js WASM)
```

### 数据流

```
搜索(12源轮询) → 提取丰富片段+互动数据
                       ↓
               时效预过滤(pub_date>7天→丢弃)
                       ↓
               互动量预过滤(源级阈值)
                       ↓
               AI 四维验证(Relevance+Importance+Freshness+Reason)
                       ↓  F<40→丢弃; 综合分≥阈值
               SQLite INSERT (含engagement JSON+pub_date+author+original_snippet+ai_reason)
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

### hotspots (v1.4 扩展)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| keyword_id | FK→keywords | 关联 |
| title | TEXT | 标题 |
| url | TEXT | 来源 |
| summary | TEXT | AI 摘要（上限 120 字符） |
| source / source_name | TEXT | 来源标识 |
| ai_verified | INTEGER | 验证状态 |
| relevance_score | INTEGER | 相关性 R (0-100) |
| importance | INTEGER | 重要性 I (0-100) |
| freshness | INTEGER | 时效性 F (0-100) |
| is_fake | INTEGER | 假冒标记 |
| detected_at | DATETIME | 发现时间 (UTC) |
| notified | INTEGER | 通知状态 |
| **pub_date** | **TEXT** | **原始发布时间** |
| **original_snippet** | **TEXT** | **搜索源原始描述片段** |
| **author** | **TEXT** | **作者/UP主** |
| **engagement** | **TEXT (JSON)** | **互动数据** |
| **ai_reason** | **TEXT** | **AI 相关性判断理由** |

### engagement JSON 结构（按来源）

```json
// HackerNews:  { "points": 120, "num_comments": 45 }
// B站:         { "play": 5000, "danmaku": 200 }
// GitHub(仓库): { "stars": 12000, "forks": 2100, "language": "Python", "owner": "openai" }
// GitHub(用户): { "followers": 500, "public_repos": 30 }
// 掘金:        { "digg_count": 150, "comment_count": 45, "view_count": 5200 }
// 知乎:        { "votes": 300 }
// Reddit:      { "score": 200, "num_comments": 30, "subreddit": "programming" }
// 微博热搜:     { "hotness": 500000 }
```

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
| GET | `/api/hotspots` | 分页列表，查询参数见下方 |
| GET | `/api/hotspots/new` | 新热点 + AI 批量摘要 |
| POST | `/api/scan` | 触发全量扫描 |
| GET | `/api/stats` | `{totalKeywords,activeKeywords,totalHotspots,recent24h,verified,lastScan}` |
| GET | `/api/logs` | 最近 20 条 |
| GET/PUT | `/api/settings` | 配置读写 |
| GET | `/api/debug/search` | 调试：测试各源原始返回（`?keyword=`） |

### GET `/api/hotspots` 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|:---:|------|
| `page` | int | 1 | 页码 |
| `limit` | int | 20 | 每页条数 |
| `sort` | string | `detected_at` | `combined_score` / `detected_at` / `relevance_score` / `importance` / `freshness` / `source` |
| `order` | string | `desc` | `asc` / `desc` |
| `status` | string | `all` | `notified` / `unread` |
| `source` | string | - | 逗号分隔来源标识，如 `bing,github,hackernews` |
| `source_type` | string | - | `engine` / `community` |
| `keyword_id` | string | - | 逗号分隔关键词 ID |
| `time` | string | - | `1h` / `24h` / `7d` / `30d` |
| `score_min` / `score_max` | int | - | 综合评分区间 |
| `r_min` / `r_max` | int | - | 相关性区间 |
| `i_min` / `i_max` | int | - | 重要性区间 |
| `f_min` / `f_max` | int | - | 时效性区间 |
| `ai_verified` | string | - | `1` / `0` |

> 排序字段白名单校验，所有用户输入参数化查询，防 SQL 注入。

---

## 5. UI 组件

```
App.jsx                      三 Tab 主布局 + Header + 扫描轮询 + 排序/筛选/分页状态
├── StatsBar.jsx             4 统计卡片（ShootingStar + GlowingEffect）
├── HotspotFeed.jsx          热点信号流 + 展开/折叠全部 AI 分析
│   ├── FilterBar.jsx        排序下拉(6种) + 时间/来源/关键词/评分筛选 + 更多筛选(展开)
│   └── HotspotCard.jsx      SVG 环形评分 + R:I:F + 颜色评分点 + AI摘要(hover全文)
│                             + 原文预览(折叠) + 作者 + 互动badge + 发布时间
│                             + AI理由(折叠) + 标题独立链接(↗) + 卡片hover动效
├── KeywordManager.jsx       滑块开关 + 编辑/删除图标 + 编辑弹窗
├── SearchPanel.jsx          全文搜索 + FilterBar + 分页 + 展开/折叠全部
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

### ai.js — DeepSeek V4 Pro 四维验证（v1.4 扩展）

```javascript
// 请求
POST https://openrouter.ai/api/v1/chat/completions
{
  model: 'deepseek/deepseek-v4-pro',
  response_format: { type: 'json_object' },
  max_tokens: 1000
}

// AI prompt 要求返回 7 个字段
{ isRelevant, isFake, score(0-100), importance(0-100), freshness(0-100), summary(≤120chars), reason(20-40字) }

// 字段兼容 DeepSeek 命名差异
const isRelevant = result.isRelevant ?? result.relevant ?? true;
const isFake     = result.isFake     ?? result.fake     ?? false;
const score      = Number(result.score ?? 50);
const importance = Number(result.importance ?? 50);
const freshness  = Number(result.freshness ?? 50);
const summary    = String(result.summary).slice(0, 120);
const reason     = String(result.reason).slice(0, 80);

// 硬拒绝
if (freshness < 40) continue;
const combined = Math.round((score + importance + freshness) / 3);
// 入库: isRelevant && !isFake && combined >= minScore(source)
```

### web-scraper.js — 12 源 round-robin 搜索（v1.4 扩展片段提取）

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

### 搜索源返回字段（v1.4 扩展）

| 字段 | 提供源 |
|------|--------|
| `pub_date` | HN (`created_at`), GitHub (`pushed_at`), B站 (`pubdate`), 掘金 (`ctime`), Reddit (`created_utc`) |
| `points`/`num_comments` | HN |
| `play`/`danmaku` | B站 |
| `stars`/`forks` | GitHub |
| `followers`/`isAccount` | GitHub User |
| `digg_count`/`view_count` | 掘金 |
| `score`/`num_comments` | Reddit |
| **`snippet` (丰富)** | **Bing/百度 多段合并；B站 `description`；HN `story_text`；掘金 `brief_content`；Reddit `selftext`；微博正文** |

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

### monitor.js — 监控引擎（v1.4 扩展）

```javascript
monitorKeyword(keywordObj, db)
  ① searchAll(keyword, 8)                          // 12 源轮询，丰富片段
  ② 时效预过滤 (pub_date > max_age_days)           // 省 AI token
  ③ 互动量预过滤 (源级阈值)                         // 质量门槛
  ④ for each → AI verifyContent()                  // R+I+F+reason 四维
  ⑤ F<40 → 跳过 | 综合分<阈值 → 跳过                // 硬拒绝
  ⑥ buildEngagement(result)                         // 按源提取互动数据 JSON
  ⑦ 去重 URL → INSERT (含pub_date/original_snippet/author/engagement/ai_reason)
```

### HotspotCard.jsx — 卡片信息层级（v1.4）

```
紧凑默认展示：
┌─────────────────────────────────────────┐
│ [85]  OpenAI 正式发布 GPT-5 ↗   3小时前  │  ← 标题独立链接(↗图标)，hover 动效
│       AI摘要：OpenAI发布了GPT-5模型...    │  ← 超80字截断…，hover全文tooltip
│       ● R:85 I:90 F:78 [GPT-5] [GitHub] │  ← 颜色圆点替代文字badge
│       👤 openai  ⭐ 12.3k  🍴 2.1k       │  ← 作者 + 互动数据(按源)
│                         📅 6月25日       │  ← 原始发布时间
│       📄 原文预览 [展开 ▾]                │  ← 可折叠，暖金色左边框
│       💡 AI分析 [展开 ▾]                  │  ← 可折叠，紫色左边框
└─────────────────────────────────────────┘
```

- 卡片为 `<div>`，非整卡链接，支持文本选中复制
- hover 左侧紫色强调竖线 + 3px 右移动效
- 统计源（B站/微博/HN 等）的纯统计 snippet 自动隐藏原文预览
- 页面整体自然滚动，无内部滚动框

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
| 13 | 卡片整链无法复制文本 | `<a>` 包裹整卡 | 卡片改 `<div>`，标题独立为 `<a>` 链接 |
| 14 | AI 摘要截断 | summary slice(50) 太短 | → 120 字符；前端 >80 截断 + hover tooltip |
| 15 | 原文预览无内容 | 社区源 snippet 为纯统计 | 抓取 description/story_text/brief_content/selftext 等 |
| 16 | 卡片过多时滚动不便 | 固定高度 `max-h-[540px]` 锁死滚动 | 移除，页面整体自然滚动 |
| 17 | 原文跳转不明显 | hover 动效太弱 | 标题 ↗ 图标 + 卡片左侧紫色线 + 3px 右移动效 |
| 18 | 筛选/排序缺失 | 仅支持通知状态过滤 | 6 种排序 + 10 种筛选 + 服务端分页 |
| 19 | cloneDeep 重复声明 | 旧 replace 残留 | 文件清理 |
| 20 | buildEngagement 重复声明 | `/**` 匹配多处 | 写全文件重写 |
