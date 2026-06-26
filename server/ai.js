import 'dotenv/config';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Shared API caller: sends prompt to OpenRouter and returns parsed JSON.
 */
async function callAI(prompt, { maxTokens = 1000, temperature = 0.1, forceJSON = true } = {}) {
  const body = {
    model: OPENROUTER_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature
  };
  if (forceJSON) body.response_format = { type: 'json_object' };

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:3456',
      'X-Title': 'Hot Monitor'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  if (!content || !content.trim()) {
    throw new Error('Empty response from model (reasoning exhausted tokens)');
  }

  return { text: content.trim(), data };
}

/**
 * Verify if a search result is genuinely about the keyword using AI.
 * Enhanced: includes commercial/spam detection, content-type classification,
 * and direct vs indirect relevance judgment.
 * Returns: { isRelevant, isFake, score, importance, freshness, summary, reason, contentType }
 * Throws on failure (strict mode — no fallback acceptance).
 */
export async function verifyContent(title, snippet, url, keyword, scope) {
  const prompt = `你是一个热点监控系统的内容审核专家。请严格分析以下搜索结果是否与监控关键词真正紧密相关。

【待审核内容】
关键词: "${keyword}"
标题: ${title}
摘要: ${snippet}
来源URL: ${url}
监控范围: ${scope || '无特定范围'}

【核心原则：只保留与关键词主体直接相关且有信息量的内容】

## 第一步：内容分类 (contentType)
先判断这条内容属于哪种类型：
- "article": 新闻/报道/博客文章，核心内容围绕关键词主体
- "announcement": 官方公告/发布说明/更新日志
- "discussion": 社区讨论/问答/技术交流
- "profile": 个人/组织主页、GitHub主页
- "product": 商品/电商页面、售卖链接、课程推广、广告
- "mention": 仅在文中一笔带过或顺便提及关键词，主要内容与关键词无关
- "spam": 垃圾信息、SEO页面、内容农场

## 第二步：严格评分

1. 相关性(score, 0-100)：
   这是最重要的维度！判断标准如下：
   - 90-100: 核心内容直接围绕关键词主体。如搜索"程序员鱼皮"，结果是关于他的专访/最新动态/他本人的文章
   - 70-89: 主要内容与关键词高度相关，如关键技术/人物/事件的深度讨论
   - 50-69: 有一定关联但非核心主体，如搜索结果中提及了关键词人物但主要讲的是其他内容
   - 30-49: 仅间接相关。如关键词人物的某件商品、某个课程、某条被转发的微博
   - 0-29: 几乎无关。如仅URL或标签中含有该词、商品页售卖的书籍（即使是该作者写的）
   
   【重要反例】以下情况 score 应 < 40：
   - 电商/商品页面（京东、淘宝、拼多多等）
   - 仅在列表中出现的推荐/相关链接
   - 以关键词命名的书籍/课程/产品售卖页
   - 内容主体是其他话题，仅在末尾或侧栏提及关键词
   - 招聘信息中仅要求"熟悉XX技术"

2. 重要性(importance, 0-100)：这条信息的新闻价值或讨论价值有多高？
   - 90-100: 官方公告、重大突破、行业地震级新闻
   - 70-89: 有实质内容的技术分析、深度报道、热门讨论
   - 50-69: 一般性报道、常规讨论
   - 30-49: 个人观点、碎碎念，信息量低
   - 0-29: 完全无价值的灌水内容
   （注意：如果是product/spam类型，importance自动给最低分）

3. 时效性(freshness, 0-100)：这条信息是否够"新"？
   - 90-100: 今天/昨天刚发生，正在热传中
   - 70-89: 近一周内，仍在讨论/发酵中
   - 50-69: 近一月内，有一定参考价值
   - 30-49: 数月前，已是旧闻
   - 0-29: 半年以上，完全过时
   （注意：官方文档/项目主页等长期页面，只要仍在更新/维护，freshness 可给 70-80）

4. 真伪(isFake)：是否为假冒/虚假内容？

5. 判断理由(reason)：用20-40字简述为何给出此相关性评分。
   示例："京东商品页，仅因书名含鱼皮而匹配，非人物动态" 或
         "直接报道程序员鱼皮的AI导航项目上线，来自技术社区"

## 第三步：isRelevant判定
isRelevant = (contentType 为 article/announcement/discussion/profile) AND (score >= 40)

返回JSON，字段名必须精确使用以下8个字段：
{"isRelevant":true/false,"isFake":true/false,"score":0-100,"importance":0-100,"freshness":0-100,"summary":"一句话中文摘要","reason":"20-40字判断理由","contentType":"article/discussion/product/mention/spam等"}`;

  try {
    const { text } = await callAI(prompt);

    const result = JSON.parse(text);

    // DeepSeek may use different field names: handle both conventions
    const isRelevant = result.isRelevant ?? result.relevant ?? true;
    const isFake = result.isFake ?? result.fake ?? false;
    const score = Number(result.score ?? 50);
    const importance = Number(result.importance ?? 50);
    const freshness = Number(result.freshness ?? 50);
    const summary = result.summary ?? snippet?.slice(0, 50) ?? title;
    const reason = result.reason ?? '';
    const contentType = result.contentType ?? result.content_type ?? '';

    return {
      isRelevant: Boolean(isRelevant),
      isFake: Boolean(isFake),
      score: Math.min(100, Math.max(0, score)),
      importance: Math.min(100, Math.max(0, importance)),
      freshness: Math.min(100, Math.max(0, freshness)),
      summary: String(summary).slice(0, 120),
      reason: String(reason).slice(0, 80),
      contentType: String(contentType).slice(0, 20)
    };
  } catch (error) {
    console.error('[AI] Verification failed for:', title, '|', error.message);
    // Strict mode: throw instead of silently accepting unverified content
    throw error;
  }
}

/**
 * Expand a monitoring keyword into 3-5 related search queries to improve coverage.
 * Uses AI to generate synonyms, variants, and related phrases.
 * Returns array with original keyword first, then expanded queries (max 5 total).
 */
export async function expandQuery(keyword, scope) {
  const prompt = `你是一个搜索查询优化专家。将以下监控关键词扩展为3-5个相关的搜索查询词，用于提高搜索引擎的覆盖率。

原始关键词: "${keyword}"
监控范围: ${scope || '无特定范围'}

扩展要求：
1. 包含近义词、同义词、缩写/全称、中英文变体（如 "GPT-5" → "GPT5"、"GPT 5.0"）
2. 包含更具体的组合查询（如 "鱼皮的AI导航" → "程序员鱼皮AI导航"、"鱼皮AI编程教程"）
3. 加入换序变体（如 "AI导航 鱼皮" → "鱼皮 AI导航"）
4. 保持与原始关键词的语义关联，不要产出无关查询
5. 优先产出更容易搜到相关内容的查询词

返回JSON数组，包含原始关键词和扩展查询词（总共3-5个）：["原始关键词", "变体1", "变体2", "变体3"]`;

  try {
    const { text } = await callAI(prompt, { maxTokens: 200, temperature: 0.7, forceJSON: true });
    const result = JSON.parse(text);

    if (Array.isArray(result) && result.length > 0) {
      // Ensure original keyword is included and deduplicate
      const queries = [keyword];
      for (const q of result) {
        const qStr = String(q).trim();
        if (qStr && qStr !== keyword && !queries.includes(qStr)) {
          queries.push(qStr);
        }
      }
      const final = queries.slice(0, 5);
      console.log(`[AI] Query expansion: "${keyword}" → [${final.join(', ')}]`);
      return final;
    }
    return [keyword];
  } catch (error) {
    console.error(`[AI] Query expansion failed for "${keyword}":`, error.message);
    return [keyword];
  }
}

/**
 * AI Self-Evaluation: Re-evaluate historical hotspots and compare with original judgments.
 * Returns an evaluation report with accuracy metrics, discrepancy cases, and suggestions.
 */
export async function evaluateAIPerformance(db, { sampleSize = 20, keywordId = null } = {}) {
  console.log(`[AI Eval] Starting self-evaluation (sampleSize=${sampleSize})...`);

  // Step 1: Fetch sample hotspots from DB
  let hotspots;
  if (keywordId) {
    hotspots = db.prepare(
      'SELECT h.*, k.keyword, k.scope FROM hotspots h JOIN keywords k ON h.keyword_id = k.id WHERE h.keyword_id = ? ORDER BY h.detected_at DESC LIMIT ?'
    ).all(keywordId, sampleSize);
  } else {
    hotspots = db.prepare(
      'SELECT h.*, k.keyword, k.scope FROM hotspots h JOIN keywords k ON h.keyword_id = k.id ORDER BY h.detected_at DESC LIMIT ?'
    ).all(sampleSize);
  }

  if (!hotspots.length) {
    return { error: 'No hotspots available for evaluation', sampleSize: 0 };
  }

  // Step 2: Build meta-evaluation prompt
  const items = hotspots.map((h, i) =>
    `[${i + 1}] 关键词="${h.keyword}" | 标题="${h.title}" | 摘要="${(h.original_snippet || '').slice(0, 100)}" | 原始评分: R=${h.relevance_score} I=${h.importance} F=${h.freshness} | AI理由: "${h.ai_reason || '无'}"`
  ).join('\n');

  const prompt = `你是一个AI审核系统的质量评估专家。以下是系统之前审核过的热点数据，请逐条重新评估并对比。

请严格根据以下标准重新打分：
- 相关性(R, 0-100): 搜索结果是否与关键词紧密直接相关？电商页/商品页/广告/间接提及 → R应<40
- 重要性(I, 0-100): 新闻价值/讨论价值
- 时效性(F, 0-100): 内容新鲜度
- isRelevant: R>=40 且内容类型为article/announcement/discussion/profile

待评估数据：
${items}

对每条给出重新评估结果+差异分析，最后给出整体评估报告。

返回JSON格式：
{
  "reviews": [
    {
      "index": 1,
      "original": {"R": 85, "I": 70, "F": 80, "isRelevant": true},
      "reevaluated": {"R": 60, "I": 50, "F": 70, "isRelevant": true},
      "discrepancy": "R差25分：原因是商品页面应给更低相关性分",
      "verdict": "overrated"
    }
  ],
  "summary": {
    "total": 20,
    "consistent": 12,
    "discrepant": 8,
    "overrated": 5,
    "underrated": 3,
    "accuracyPercentage": 60,
    "keyFindings": "主要问题：电商/商品页面得分过高..."
  }
}`;

  try {
    const { text } = await callAI(prompt, { maxTokens: 3000, temperature: 0.1, forceJSON: true });
    const report = JSON.parse(text);

    console.log(`[AI Eval] Complete: ${report.summary?.discrepant || 0} discrepancies found`);

    return {
      ...report,
      evaluatedAt: new Date().toISOString(),
      sampleSize: hotspots.length
    };
  } catch (error) {
    console.error('[AI Eval] Evaluation failed:', error.message);
    return {
      error: `Evaluation failed: ${error.message}`,
      sampleSize: hotspots.length
    };
  }
}

/**
 * Generate a summary for a batch of hotspots using AI.
 */
export async function generateBatchSummary(hotspots) {
  if (!hotspots.length) return '暂无新热点。';

  const items = hotspots.map((h, i) => `${i + 1}. ${h.title}`).join('\n');
  const prompt = `以下是最新监测到的热点内容列表，请用中文做一个简洁的总结（不超过100字），突出最重要的发现：\n${items}`;

  try {
    const { text } = await callAI(prompt, { maxTokens: 200, temperature: 0.5, forceJSON: false });
    return text;
  } catch {
    return `发现 ${hotspots.length} 条新热点。`;
  }
}

export default { verifyContent, generateBatchSummary, expandQuery, evaluateAIPerformance };
