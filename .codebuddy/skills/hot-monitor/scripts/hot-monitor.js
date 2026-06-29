#!/usr/bin/env node
/**
 * Hot Monitor Skill — 主入口
 *
 * 用法:
 *   node scripts/hot-monitor.js --keyword "GPT-5" [--freshness] [--min-score 70] [--max-age 7] [--limit 20]
 *
 * 编程调用:
 *   import { searchHotTopics } from './hot-monitor.js';
 *   const result = await searchHotTopics('GPT-5', { apiKey: 'sk-xxx', minScore: 70 });
 */
import 'dotenv/config';
import { searchAll } from './search.js';
import { verifyContent, expandQuery } from './ai.js';

// ==================== URL/标题归一化 ====================

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'ref', 'source', 'from', 'spm', 'scm',
  'tracking', 'track', 'session_id', 'vd_source',
  '_ga', '_gl', 'mc_cid', 'mc_eid', 'pk_campaign', 'pk_kwd',
  'igshid', 'wd', 'eqid', 'rsv_spt', 'rsv_iqid'
]);

function normalizeUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim().toLowerCase();

  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
    // 提取搜索引擎重定向中的真实 URL
    if (parsed.hostname.includes('google') && parsed.searchParams.has('q')) {
      const q = parsed.searchParams.get('q');
      if (q && q.startsWith('http')) url = q.toLowerCase();
    }
    if (parsed.hostname.includes('baidu.com') && parsed.searchParams.has('url')) {
      const real = parsed.searchParams.get('url');
      if (real && real.startsWith('http')) url = real.toLowerCase();
    }
    if (parsed.hostname.includes('sogou.com') && parsed.searchParams.has('url')) {
      const real = parsed.searchParams.get('url');
      if (real && real.startsWith('http')) {
        try { url = decodeURIComponent(real).toLowerCase(); } catch { url = real.toLowerCase(); }
      }
    }
  } catch { /* invalid URL, use raw */ }

  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key);
    }
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    if (u.hostname.startsWith('www.')) u.hostname = u.hostname.slice(4);
    u.hash = '';
    u.searchParams.sort();
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[\s\-_|·•,，。！？、；：""''（）()【】\[\]《》<>「」『』～~]+/g, ' ')
    .replace(/[^\w\u4e00-\u9fff\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

// ==================== 过滤规则 ====================

const ENGAGEMENT_RULES = [
  { sources: ['hackernews'], name: 'HackerNews', check: (r) => (r.points || 0) >= 10 && (r.num_comments || 0) >= 5 },
  { sources: ['bilibili'],   name: 'B站',       check: (r) => (r.play || 0) >= 500 },
  { sources: ['weibo_hot'],  name: '微博热搜',   check: (r) => (r.hotness || 0) >= 100000 },
  { sources: ['github'],     name: 'GitHub',    check: (r) => r.isAccount ? (r.followers || 0) >= 5 : (r.stars || 0) >= 10 },
  { sources: ['juejin'],     name: '掘金',       check: (r) => (r.digg_count || 0) >= 5 },
  { sources: ['reddit'],     name: 'Reddit',    check: (r) => (r.score || 0) >= 10 && (r.num_comments || 0) >= 3 }
];

const COMMUNITY_SOURCES = new Set(['hackernews', 'bilibili', 'weibo_hot', 'github', 'juejin', 'reddit']);

function getSourceCategory(source) {
  return COMMUNITY_SOURCES.has(source) ? 'community' : 'engine';
}

function filterByEngagement(results) {
  const passed = [];
  const rejected = [];
  for (const r of results) {
    const rule = ENGAGEMENT_RULES.find(rule => rule.sources.includes(r.source));
    if (!rule) { passed.push(r); continue; }
    if (rule.check(r)) { passed.push(r); } else { rejected.push(r); }
  }
  return { passed, rejected };
}

function buildEngagement(result) {
  const e = {};
  const s = result.source;
  if (s === 'hackernews')  { if (result.points) e.points = result.points; if (result.num_comments) e.num_comments = result.num_comments; }
  else if (s === 'bilibili')   { if (result.play) e.play = result.play; if (result.danmaku) e.danmaku = result.danmaku; }
  else if (s === 'weibo_hot')  { if (result.hotness) e.hotness = result.hotness; }
  else if (s === 'github')     {
    if (result.isAccount) { if (result.followers) e.followers = result.followers; if (result.public_repos) e.public_repos = result.public_repos; }
    else { if (result.stars) e.stars = result.stars; if (result.forks) e.forks = result.forks; }
    if (result.language) e.language = result.language;
    if (result.owner) e.owner = result.owner;
  }
  else if (s === 'juejin')     { if (result.digg_count) e.digg_count = result.digg_count; if (result.comment_count) e.comment_count = result.comment_count; if (result.view_count) e.view_count = result.view_count; }
  else if (s === 'zhihu')      { if (result.votes) e.votes = result.votes; }
  else if (s === 'reddit')     { if (result.score) e.score = result.score; if (result.num_comments) e.num_comments = result.num_comments; if (result.subreddit) e.subreddit = result.subreddit; }
  return e;
}

// ==================== 主搜索管线 ====================

/**
 * 搜索热点主题 — 完整管线：扩展 → 搜索 → 去重 → 过滤 → AI验证 → 排序
 *
 * @param {string} keyword - 搜索关键词
 * @param {object} options
 * @param {string} options.apiKey - OpenRouter API Key（可选，默认从 .env 读取）
 * @param {string} options.model - AI 模型（可选）
 * @param {number} options.minScore - 最低综合分阈值（默认 55，引擎 70/社区 55）
 * @param {number} options.maxAge - 内容最大天数（默认 7，超过丢弃）
 * @param {boolean} options.freshness - 是否启用时效优先模式（仅保留 24h 内内容）
 * @param {number} options.limit - 最大返回条数（默认 20）
 * @returns {object} { keyword, expandedQueries, stats, results }
 */
export async function searchHotTopics(keyword, options = {}) {
  const {
    apiKey = process.env.OPENROUTER_API_KEY,
    model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-pro',
    minScore,
    maxAge: maxAgeDays = options.freshness ? 1 : 7,
    freshness = false,
    limit = 20
  } = options;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required. Set it in .env or pass via options.apiKey.');
  }

  const aiOptions = { apiKey, model };

  console.error(`[HotMonitor] Searching: "${keyword}"`);

  // Step 0: AI 查询扩展
  let expandedQueries = [keyword];
  try {
    expandedQueries = await expandQuery(keyword, '', aiOptions);
    console.error(`[HotMonitor] Expanded → ${expandedQueries.length} queries: [${expandedQueries.join(', ')}]`);
  } catch (e) {
    console.error(`[HotMonitor] Query expansion failed, using raw keyword: ${e.message}`);
  }

  // Step 1: 多源搜索（每个扩展词搜索，合并去重）
  const perQueryResults = Math.max(3, Math.floor(8 / expandedQueries.length));
  const allRawResults = [];
  const seenUrls = new Set();
  const seenTitles = new Set();

  for (const q of expandedQueries) {
    try {
      const results = await searchAll(q, perQueryResults);
      for (const r of results) {
        const normUrl = normalizeUrl(r.url);
        const normTitle = normalizeTitle(r.title);
        if (normUrl && seenUrls.has(normUrl)) continue;
        if (normTitle && seenTitles.has(normTitle)) continue;
        if (normUrl) seenUrls.add(normUrl);
        if (normTitle) seenTitles.add(normTitle);
        allRawResults.push(r);
      }
    } catch (e) {
      console.error(`[HotMonitor] Search error for "${q}": ${e.message}`);
    }
  }

  const totalRaw = allRawResults.length;
  console.error(`[HotMonitor] Raw results: ${totalRaw} (from ${expandedQueries.length} queries)`);

  if (!allRawResults.length) {
    return { keyword, expandedQueries, stats: { totalRaw: 0, afterDedup: 0, afterFilter: 0, afterAI: 0, final: 0 }, results: [] };
  }

  // Step 2: 时效预过滤
  const now = Date.now();
  const ageFiltered = [];
  for (const r of allRawResults) {
    if (r.pub_date) {
      const pubTime = new Date(r.pub_date).getTime();
      const ageDays = (now - pubTime) / (86400 * 1000);
      if (ageDays > maxAgeDays) continue;
    }
    ageFiltered.push(r);
  }
  console.error(`[HotMonitor] After freshness filter: ${ageFiltered.length} (dropped ${allRawResults.length - ageFiltered.length} stale)`);

  // Step 3: 互动量预过滤
  const { passed, rejected } = filterByEngagement(ageFiltered);
  console.error(`[HotMonitor] After engagement filter: ${passed.length} passed, ${rejected.length} rejected`);

  if (!passed.length) {
    return { keyword, expandedQueries, stats: { totalRaw, afterDedup: totalRaw, afterFilter: 0, afterAI: 0, final: 0 }, results: [] };
  }

  // Step 4: AI 多维验证 + 排序
  const defaultMinScoreEngine = minScore ?? 70;
  const defaultMinScoreCommunity = minScore ?? 55;

  const verified = [];
  for (const result of passed) {
    try {
      const ai = await verifyContent(
        result.title, result.snippet, result.url, keyword, '', aiOptions
      );

      const combinedScore = Math.round((ai.score + ai.importance + ai.freshness) / 3);
      const sourceCategory = getSourceCategory(result.source);
      const threshold = sourceCategory === 'community' ? defaultMinScoreCommunity : defaultMinScoreEngine;

      // 硬拒绝
      if (ai.score < 40) {
        console.error(`  [Skip] relevance=${ai.score} < 40 type=${ai.contentType}: "${result.title?.slice(0, 40)}"`);
        continue;
      }
      if (ai.freshness < 40) {
        console.error(`  [Skip] freshness=${ai.freshness} < 40: "${result.title?.slice(0, 40)}"`);
        continue;
      }
      if (!ai.isRelevant || ai.isFake || combinedScore < threshold) {
        console.error(`  [Skip] R=${ai.score} I=${ai.importance} F=${ai.freshness} combined=${combinedScore} threshold=${threshold}: "${result.title?.slice(0, 40)}"`);
        continue;
      }

      const engagement = buildEngagement(result);

      verified.push({
        title: result.title,
        url: result.url,
        snippet: result.snippet || '',
        source: result.source,
        sourceName: result.source_name,
        relevanceScore: ai.score,
        importance: ai.importance,
        freshness: ai.freshness,
        combinedScore,
        isRelevant: ai.isRelevant,
        isFake: ai.isFake,
        aiSummary: ai.summary,
        aiReason: ai.reason,
        contentType: ai.contentType,
        pubDate: result.pub_date || '',
        author: result.author || '',
        engagement
      });

      console.error(`  [Pass] R=${ai.score} I=${ai.importance} F=${ai.freshness} combined=${combinedScore} type=${ai.contentType}: "${result.title?.slice(0, 40)}"`);
    } catch (e) {
      console.error(`  [Fail] "${result.title?.slice(0, 40)}" — ${e.message}`);
    }
  }

  // 按综合分降序排列
  verified.sort((a, b) => b.combinedScore - a.combinedScore);

  const final = verified.slice(0, limit);

  return {
    keyword,
    expandedQueries,
    stats: {
      totalRaw,
      afterDedup: allRawResults.length,
      afterFilter: passed.length,
      afterAI: verified.length,
      final: final.length
    },
    results: final
  };
}

// ==================== CLI 入口 ====================

async function main() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keyword' || args[i] === '-k') params.keyword = args[++i];
    else if (args[i] === '--min-score') params.minScore = Number(args[++i]);
    else if (args[i] === '--max-age') params.maxAge = Number(args[++i]);
    else if (args[i] === '--limit') params.limit = Number(args[++i]);
    else if (args[i] === '--freshness') params.freshness = true;
    else if (args[i] === '--model') params.model = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Hot Monitor Skill — 多源热点搜索 + AI 多维验证

用法:
  node hot-monitor.js --keyword <关键词> [选项]

选项:
  -k, --keyword <词>    搜索关键词（必填）
  --freshness           启用时效优先（仅 24h 内内容）
  --min-score <n>       最低综合分阈值（默认：引擎70，社区55）
  --max-age <n>         内容最大天数（默认 7）
  --limit <n>           最大返回条数（默认 20）
  --model <name>        AI 模型（默认: deepseek/deepseek-v4-pro）
  -h, --help           显示帮助

环境变量:
  OPENROUTER_API_KEY    OpenRouter API Key（必填，在 .env 中配置）

示例:
  node hot-monitor.js -k "GPT-5" --freshness
  node hot-monitor.js -k "程序员鱼皮 AI" --freshness --limit 10
`);
      process.exit(0);
    }
  }

  if (!params.keyword) {
    console.error('Error: --keyword is required. Use --help for usage.');
    process.exit(1);
  }

  try {
    const result = await searchHotTopics(params.keyword, params);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// 直接运行时执行 CLI；被 import 时仅导出
const isMain = process.argv[1] && (
  process.argv[1].endsWith('hot-monitor.js') ||
  process.argv[1].endsWith('hot-monitor')
);

if (isMain) {
  main();
}

export default { searchHotTopics };
