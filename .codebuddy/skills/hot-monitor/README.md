# Hot Monitor Skill

> 🔥 多源热点搜索 + AI 多维验证 Agent Skill  
> 12 大免费数据源实时搜索，DeepSeek AI 智能验证内容真伪与相关性

## 快速开始

```bash
# 1. 进入目录
cd .codebuddy/skills/hot-monitor

# 2. 安装依赖
npm install

# 3. 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 OpenRouter API Key
# 免费获取: https://openrouter.ai/keys

# 4. 搜索热点
node scripts/hot-monitor.js -k "GPT-5" --freshness
```

## 命令行用法

```bash
node scripts/hot-monitor.js --keyword "关键词" [选项]
```

| 选项 | 说明 | 默认值 |
|------|------|:---:|
| `-k, --keyword` | 搜索关键词（必填） | — |
| `--freshness` | 时效优先（仅 24h） | false |
| `--min-score <n>` | 最低综合分 | 引擎70/社区55 |
| `--max-age <n>` | 内容最大天数 | 7 |
| `--limit <n>` | 最大返回条数 | 20 |
| `--model <name>` | AI 模型 | deepseek-v4-pro |
| `-h, --help` | 显示帮助 | — |

## 编程调用

```javascript
import { searchHotTopics } from './scripts/hot-monitor.js';

const result = await searchHotTopics('GPT-5', {
  apiKey: 'sk-or-xxx',
  freshness: true,
  minScore: 70,
  limit: 10
});

console.log(result.results);
// [{ title, url, sourceName, combinedScore, aiSummary, ... }]
```

## 输出格式

```json
{
  "keyword": "GPT-5",
  "expandedQueries": ["GPT-5", "GPT5", "OpenAI GPT-5"],
  "stats": {
    "totalRaw": 36,
    "afterDedup": 24,
    "afterFilter": 18,
    "afterAI": 6,
    "final": 6
  },
  "results": [
    {
      "title": "OpenAI 正式发布 GPT-5",
      "url": "https://openai.com/blog/gpt-5",
      "sourceName": "HackerNews",
      "relevanceScore": 95,
      "importance": 90,
      "freshness": 98,
      "combinedScore": 94,
      "aiSummary": "OpenAI 正式发布 GPT-5 模型，性能大幅提升",
      "aiReason": "[announcement] 官方公告，核心内容为 GPT-5 发布",
      "contentType": "announcement",
      "pubDate": "2026-06-29T08:00:00Z",
      "author": "openai",
      "engagement": { "points": 1200, "num_comments": 350 }
    }
  ]
}
```

## 搜索源

| 来源 | 类型 | 方式 |
|------|------|------|
| Bing, Google, DuckDuckGo, 搜狗, 百度 | 搜索引擎 | 网页爬虫 |
| HackerNews, GitHub, 掘金 | 技术社区 | 官方 API |
| Reddit | 国际社区 | .json API |
| B站 | 视频平台 | 官方 API |
| 微博, 知乎 | 中文社交 | 网页爬虫 |
| 微博热搜 | 热搜榜 | Ajax API |

## 依赖

- **Node.js** ≥ 18
- **npm 依赖**：`cheerio` (HTML 解析), `dotenv` (环境变量)
- **AI**：OpenRouter API（免费额度可用）

## 许可证

MIT
