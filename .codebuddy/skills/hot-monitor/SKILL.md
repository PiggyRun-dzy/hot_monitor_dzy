---
name: hot-monitor
description: >-
  Multi-source hotspot search with AI verification. This skill should be used when
  the user asks to search for the latest news, hot topics, or trends about any
  keyword (e.g., "search for GPT-5 updates", "find AI hot topics about 程序员鱼皮",
  "what's trending about React 19"). It searches 12 free data sources (Bing, Google,
  DuckDuckGo, Sogou, Baidu, HackerNews, Bilibili, Weibo, GitHub, Juejin, Zhihu, Reddit)
  and uses AI (DeepSeek via OpenRouter) to verify relevance, importance, and freshness
  of each result with multi-dimensional scoring (R+I+F).
---

# Hot Monitor Skill

Multi-source hotspot search and AI verification tool. Give a keyword, get verified,
scored, and summarized hot topics from 12 platforms.

## When to Use

Use this skill when the user wants to:
- Search for the latest news/updates about a topic or person
- Find trending discussions across platforms
- Verify if information is genuine and relevant to a specific keyword
- Compare hotness of different topics
- Get AI-verified summaries of search results

## How to Use

### Step 1: Extract search parameters from user query

Analyze the user's natural language and extract:

| User says | Extract |
|-----------|---------|
| "今天/最新/最近/本周" | `freshness: true` (last 24h) |
| "可靠/权威/高质量/准确" | `minScore: 80` |
| "详细/更多/全部" | `limit: 20` |
| A person/thing name | Use as `keyword` (combine with context words) |

**Keyword extraction rules:**
- If user mentions a person + topic (e.g., "程序员鱼皮的 AI 热点"), combine them: `"程序员鱼皮 AI"`
- If user mentions a product version (e.g., "GPT-5 最新消息"), use the product name: `"GPT-5"`
- Remove filler words like "帮我找", "搜索一下", "有什么"

### Step 2: Execute the search script

Run the script with extracted parameters:

```bash
node .codebuddy/skills/hot-monitor/scripts/hot-monitor.js \
  --keyword "<extracted keyword>" \
  [--freshness] \
  [--min-score <number>] \
  [--limit <number>]
```

**Prerequisites:** The user must have an `OPENROUTER_API_KEY` set in `.codebuddy/skills/hot-monitor/.env`. If not configured, instruct the user to:
1. Get a free API key from https://openrouter.ai/keys
2. Copy `.env.example` to `.env` and fill in the key
3. Run `npm install` in the skill directory

### Step 3: Parse the JSON output and present results

The script outputs a JSON object to stdout. Parse it and present results to the user:

```json
{
  "keyword": "GPT-5",
  "expandedQueries": ["GPT-5", "GPT5", "OpenAI GPT-5"],
  "stats": { "totalRaw": 36, "afterAI": 6, "final": 6 },
  "results": [
    {
      "title": "...",
      "url": "...",
      "sourceName": "GitHub",
      "relevanceScore": 90,
      "importance": 85,
      "freshness": 95,
      "combinedScore": 90,
      "aiSummary": "一句话中文摘要",
      "aiReason": "AI 判断理由（含内容类型）",
      "contentType": "announcement",
      "pubDate": "2026-06-29T08:00:00Z",
      "author": "...",
      "engagement": { "stars": 5600, "forks": 1200 }
    }
  ]
}
```

**Presentation guidelines:**
1. **Default view:** Show title (as clickable link), source name, AI summary, combined score
2. **Expand details:** If user asks for more detail, show R:I:F breakdown, AI reason, engagement data, publish date, author
3. **Sorting:** Results are pre-sorted by combined score descending. Present in this order.
4. **Empty results:** If `stats.final === 0`, tell the user no high-quality results found and suggest:
   - Try a broader keyword
   - Remove freshness constraint
   - Lower the min-score threshold

### Result quality interpretation

| Combined Score | Quality |
|:---:|------|
| 80-100 | High quality, directly relevant, fresh |
| 60-79 | Good quality, relevant, reasonably fresh |
| 40-59 | Acceptable, somewhat relevant (filtered by default) |
| < 40 | Rejected (irrelevant, stale, or spam) |

The AI labels each result with a `contentType`:
- `article` / `announcement` / `discussion` / `profile` → Accepted if score ≥ 40
- `product` / `mention` / `spam` → Automatically rejected (score forced < 40)

### Example queries and parameter mapping

| User query | Parameters |
|------------|-----------|
| "帮我找一下程序员鱼皮今天发布的 AI 热点" | `--keyword "程序员鱼皮 AI" --freshness` |
| "GPT-5 有什么最新可靠的消息" | `--keyword "GPT-5" --freshness --min-score 80` |
| "最近关于 React 19 的讨论" | `--keyword "React 19" --max-age 7` |
| "看看 AI Agent 开发框架有什么热点" | `--keyword "AI Agent 开发框架" --freshness --limit 10` |

### Programmatic usage

For advanced use cases, import the function directly:

```javascript
import { searchHotTopics } from '.codebuddy/skills/hot-monitor/scripts/hot-monitor.js';

const result = await searchHotTopics('GPT-5', {
  apiKey: 'sk-or-xxx',
  freshness: true,
  minScore: 70,
  limit: 10
});
```

## Search Sources

12 free sources with no API keys required:
- **Search engines:** Bing, Google, DuckDuckGo, Sogou, Baidu
- **Tech communities:** HackerNews, GitHub, Juejin (掘金)
- **Social media:** Weibo (微博), Weibo Hot Search (微博热搜), Zhihu (知乎)
- **Video:** Bilibili (B站)
- **International:** Reddit

See `references/search-sources.md` for detailed source descriptions and field mappings.

## Dependencies

- Node.js ≥ 18
- npm packages: `cheerio`, `dotenv` (install via `npm install` in the skill directory)
- OpenRouter API key (free tier available)
