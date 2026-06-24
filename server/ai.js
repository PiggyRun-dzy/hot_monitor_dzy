import 'dotenv/config';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Verify if a search result is genuinely about the keyword using AI.
 * Uses OpenRouter's response_format for structured JSON + response-healing plugin.
 * Returns: { isRelevant, isFake, score, summary }
 */
export async function verifyContent(title, snippet, url, keyword, scope) {
  const prompt = `分析以下搜索结果是否与监控关键词"${keyword}"真正相关。

标题: ${title}
摘要: ${snippet}
来源URL: ${url}
监控范围: ${scope || '无特定范围'}

判断标准：
1. 是否与关键词"${keyword}"真正相关？（排除同名但不同含义、蹭热度、标题党）
2. 是否为假冒/虚假内容？
3. 给出相关性评分(0-100)

返回JSON，字段名必须精确使用 isRelevant, isFake, score, summary：
{"isRelevant":true/false,"isFake":true/false,"score":0-100,"summary":"一句话中文摘要"}`;

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
        max_tokens: 600,
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
    const summary = result.summary ?? snippet?.slice(0, 50) ?? title;

    return {
      isRelevant: Boolean(isRelevant),
      isFake: Boolean(isFake),
      score: Math.min(100, Math.max(0, score)),
      summary: String(summary).slice(0, 50)
    };
  } catch (error) {
    console.error('AI verification failed:', error.message);
    // Fallback: accept content but mark with moderate score
    return {
      isRelevant: true,
      isFake: false,
      score: 65,
      summary: snippet ? snippet.slice(0, 50) : title
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
