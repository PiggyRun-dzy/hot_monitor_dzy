/**
 * Hot Monitor Skill — AI 多维验证 + 查询扩展
 * 通过 OpenRouter API 调用 DeepSeek V4 Pro
 * API Key 显式注入，不依赖 .env 隐式加载
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek/deepseek-v4-pro';

/**
 * 共享 AI 调用器
 */
async function callAI(prompt, { apiKey, model = DEFAULT_MODEL, maxTokens = 1000, temperature = 0.1, forceJSON = true } = {}) {
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required. Set it via options.apiKey or .env file.');
  }

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature
  };
  if (forceJSON) body.response_format = { type: 'json_object' };

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3456',
      'X-Title': 'Hot Monitor Skill'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OpenRouter API error: ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error('Empty response from AI model (reasoning may have exhausted tokens)');
  }

  return { text: content.trim(), usage: data.usage };
}

/**
 * AI 多维验证：判断搜索结果与关键词的真实相关性
 *
 * @param {string} title - 搜索结果标题
 * @param {string} snippet - 搜索结果摘要/描述
 * @param {string} url - 来源 URL
 * @param {string} keyword - 监控关键词
 * @param {string} scope - 监控范围（可选）
 * @param {object} options - { apiKey, model }
 * @returns {{ isRelevant, isFake, score, importance, freshness, summary, reason, contentType }}
 */
export async function verifyContent(title, snippet, url, keyword, scope = '', options = {}) {
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
   示例："京东商品页，仅因书名含鱼皮而匹配，非人物动态" 或 "直接报道程序员鱼皮的AI导航项目上线，来自技术社区"

## 第三步：isRelevant判定
isRelevant = (contentType 为 article/announcement/discussion/profile) AND (score >= 40)

返回JSON，字段名必须精确使用以下8个字段：
{"isRelevant":true/false,"isFake":true/false,"score":0-100,"importance":0-100,"freshness":0-100,"summary":"一句话中文摘要","reason":"20-40字判断理由","contentType":"article/discussion/product/mention/spam等"}`;

  try {
    const { text } = await callAI(prompt, { ...options, maxTokens: 1000, forceJSON: true });

    const result = JSON.parse(text);

    // 兼容 DeepSeek 可能的字段名差异
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
    // 严格模式：AI 失败即抛错，不静默接受
    throw new Error(`AI verification failed for "${title}": ${error.message}`);
  }
}

/**
 * AI 查询扩展：将关键词扩展为 3-5 个相关搜索词
 *
 * @param {string} keyword - 原始关键词
 * @param {string} scope - 监控范围（可选）
 * @param {object} options - { apiKey, model }
 * @returns {string[]} 扩展后的查询词数组（含原始关键词）
 */
export async function expandQuery(keyword, scope = '', options = {}) {
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
    const { text } = await callAI(prompt, { ...options, maxTokens: 200, temperature: 0.7, forceJSON: true });
    const result = JSON.parse(text);

    if (Array.isArray(result) && result.length > 0) {
      const queries = [keyword];
      for (const q of result) {
        const qStr = String(q).trim();
        if (qStr && qStr !== keyword && !queries.includes(qStr)) {
          queries.push(qStr);
        }
      }
      return queries.slice(0, 5);
    }
    return [keyword];
  } catch (error) {
    // 扩展失败时降级使用原始关键词
    return [keyword];
  }
}

export default { verifyContent, expandQuery, callAI };
