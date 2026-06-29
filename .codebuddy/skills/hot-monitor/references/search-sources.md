# Hot Monitor Skill — 搜索源参考

## 12 大免费数据源（无需 API Key）

### 搜索引擎（6 个）

| 来源 | 标识 | 类型 | 方式 | 说明 |
|------|------|------|------|------|
| **Bing** | `bing` | 国际搜索 | 网页爬虫 | `cheerio` 解析 `#b_results .b_algo`，多段摘要合并 |
| **Google** | `google` | 国际搜索 | 网页爬虫 | `cheerio` 解析 `div.g`，h3 标题 |
| **DuckDuckGo** | `ddg` | 隐私搜索 | Lite HTML | 无需 JS，`cheerio` 解析 `table.result` |
| **搜狗** | `sogou` | 中文搜索 | 网页爬虫 | `cheerio` 解析 `.results .vrwrap` |
| **百度** | `baidu` | 中文搜索 | 网页爬虫 | `cheerio` 解析 `#content_left .result`，多段摘要合并 |
| **知乎** | `zhihu` | 问答社区 | 网页爬虫 | `cheerio` 解析 `.List-item`，含备选选择器 |

> 搜索引擎无 `pub_date` 字段，没有互动数据，完全依赖 AI 判断。

### 社区/内容平台（6 个）

| 来源 | 标识 | 类型 | 方式 | 返回字段 |
|------|------|------|------|---------|
| **HackerNews** | `hackernews` | 科技社区 | Algolia API | `title`, `url`, `story_text`, `points`, `num_comments`, `author`, `created_at` |
| **GitHub** | `github` | 开发者社区 | 官方 API | `full_name`, `html_url`, `stargazers_count`, `forks`, `language`, `owner`, `pushed_at` |
| **掘金** | `juejin` | 中文技术社区 | 官方 API | `title`, `article_id`, `brief_content`, `digg_count`, `comment_count`, `view_count`, `ctime` |
| **Reddit** | `reddit` | 国际社区 | .json API | `title`, `permalink`, `selftext`, `score`, `num_comments`, `subreddit`, `author`, `created_utc` |
| **B站** | `bilibili` | 视频平台 | 官方 API | `title`, `bvid`, `description`, `play`, `danmaku`, `author`, `pubdate` |
| **微博** | `weibo` | 社交媒体 | 网页爬虫 | `title` (微博正文前80字), `url`, `snippet` |
| **微博热搜** | `weibo_hot` | 热搜榜单 | Ajax API | `word`, `num`(热度), 无需关键词即可获取 |

> 社区源返回 `pub_date`、互动数据（点赞/播放/Star/评论等），支持互动量预过滤。

---

## 互动量预过滤阈值

| 来源 | 条件 |
|------|------|
| HackerNews | `points >= 10` AND `num_comments >= 5` |
| B站 | `play >= 500` |
| GitHub (仓库) | `stars >= 10` |
| GitHub (用户) | `followers >= 5` |
| 掘金 | `digg_count >= 5` |
| Reddit | `score >= 10` AND `num_comments >= 3` |
| 微博热搜 | `hotness >= 100000` |
| 搜索引擎 | 无预过滤（交 AI 判断） |

---

## AI 多维验证字段

每次验证返回 8 个字段：

| 字段 | 类型 | 范围 | 说明 |
|------|------|:---:|------|
| `isRelevant` | boolean | — | 是否与关键词直接相关 |
| `isFake` | boolean | — | 是否为假冒/虚假内容 |
| `score` (R) | number | 0-100 | 相关性评分（最重要维度） |
| `importance` (I) | number | 0-100 | 重要性/新闻价值 |
| `freshness` (F) | number | 0-100 | 时效性/新鲜度 |
| `summary` | string | ≤120字 | AI 生成的一句话中文摘要 |
| `reason` | string | 20-40字 | AI 判断理由（含内容类型前缀） |
| `contentType` | string | — | article / announcement / discussion / profile / product / mention / spam |

**硬拒绝规则：**
- `score < 40` → 直接丢弃（不相关/垃圾/商业内容）
- `freshness < 40` → 直接丢弃（过时内容）
- `combinedScore = (R + I + F) / 3 < 阈值` → 丢弃（引擎70，社区55）

**内容类型语义：**
- `article` / `announcement` / `discussion` / `profile` → R ≥ 40 即可通过基础关
- `product` / `mention` / `spam` → R 强制 < 40，自动拒绝

---

## URL/标题去重策略

1. **URL 归一化**：提取 Google/Baidu/Sogou 重定向中的真实 URL → 剥离 20+ 追踪参数（utm_*, fbclid, gclid...） → 去尾部斜杠 → 去 www → 去 hash → 排序 query params
2. **标题归一化**：小写 → 标点→空格 → 去特殊字符 → 截断 80 字 → 比对去重
