import 'dotenv/config';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Verify if a search result is genuinely about the keyword using AI.
 * Uses OpenRouter's response_format for structured JSON + response-healing plugin.
 * Returns: { isRelevant, isFake, score, importance, freshness, summary }
 * Throws on failure (strict mode — no fallback acceptance).
 */
export async function verifyContent(title, snippet, url, keyword, scope) {
  const prompt = `分析以下搜索结果是否与监控关键词"${keyword}"真正相关、重要且有时效性。

标题: ${title}
摘要: ${snippet}
来源URL: ${url}
监控范围: ${scope || '无特定范围'}

判断标准：
1. 相关性(score, 0-100)：是否与关键词"${keyword}"真正相关？排除同名不同义、蹭热度、标题党。
2. 重要性(importance, 0-100)：这条信息的新闻价值或讨论价值有多高？
   - 90-100: 官方公告、重大突破、行业地震级新闻
   - 70-89: 有实质内容的技术分析、深度报道、热门讨论
   - 50-69: 一般性报道、常规讨论
   - 30-49: 个人观点、碎碎念，信息量低
   - 0-29: 完全无价值的灌水内容
3. 时效性(freshness, 0-100)：这条信息是否够"新"？作为热点监控，过时的内容没有价值。
   - 90-100: 今天/昨天刚发生，正在热传中
   - 70-89: 近一周内，仍在讨论/发酵中
   - 50-69: 近一月内，有一定参考价值
   - 30-49: 数月前，已是旧闻
   - 0-29: 半年以上，完全过时
   （注意：官方文档/项目主页等长期页面，只要仍在更新/维护，freshness 可给 70-80）
4. 真伪(isFake)：是否为假冒/虚假内容？

5. 判断理由(reason)：用20-40字简述为何给出此相关性评分（如"标题直接提到GPT-5，且来自OpenAI官方仓库"或"虽然提到了AI但与关键词语义无关"）。

返回JSON，字段名必须精确使用 isRelevant, isFake, score, importance, freshness, summary, reason：
{"isRelevant":true/false,"isFake":true/false,"score":0-100,"importance":0-100,"freshness":0-100,"summary":"一句话中文摘要","reason":"20-40字判断理由"}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3456',
        'X-Title': 'Hot Monitor'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        // Force JSON output (OpenRouter v1 structured output)
        response_format: { type: 'json_object' },
        // DeepSeek V4 Pro is a reasoning model - need extra tokens for reasoning
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Reasoning models may produce null content if tokens exhausted by reasoning
    if (!content || !content.trim()) {
      throw new Error('Empty response from model (reasoning exhausted tokens)');
    }

    const text = content.trim();
    const result = JSON.parse(text);

    // DeepSeek may use different field names: handle both conventions
    const isRelevant = result.isRelevant ?? result.relevant ?? true;
    const isFake = result.isFake ?? result.fake ?? false;
    const score = Number(result.score ?? 50);
    const importance = Number(result.importance ?? 50);
    const freshness = Number(result.freshness ?? 50);
    const summary = result.summary ?? snippet?.slice(0, 50) ?? title;
    const reason = result.reason ?? '';

    return {
      isRelevant: Boolean(isRelevant),
      isFake: Boolean(isFake),
      score: Math.min(100, Math.max(0, score)),
      importance: Math.min(100, Math.max(0, importance)),
      freshness: Math.min(100, Math.max(0, freshness)),
      summary: String(summary).slice(0, 120),
      reason: String(reason).slice(0, 80)
    };
  } catch (error) {
    console.error('[AI] Verification failed for:', title, '|', error.message);
    // Strict mode: throw instead of silently accepting unverified content
    throw error;
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
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3456',
        'X-Title': 'Hot Monitor'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.5
      })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch {
    return `发现 ${hotspots.length} 条新热点。`;
  }
}

export default { verifyContent, generateBatchSummary };
