import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
];

// Rate limiting: track last request time per domain
const lastRequestTime = {};
const MIN_INTERVAL_MS = 5000;

async function rateLimitedFetch(url, domain, opts = {}) {
  const now = Date.now();
  const last = lastRequestTime[domain] || 0;
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - last));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime[domain] = Date.now();

  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return fetch(url, {
    headers: {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      ...opts.headers
    },
    ...opts
  });
}

// ===================== 搜索引擎 =====================

export async function searchBing(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://www.bing.com/search?q=${query}&count=${maxResults}`;
  try {
    const resp = await rateLimitedFetch(url, 'bing.com');
    if (!resp.ok) throw new Error(`Bing ${resp.status}`);
    const $ = cheerio.load(await resp.text());
    const results = [];
    $('#b_results .b_algo').each((i, el) => {
      if (results.length >= maxResults) return false;
      const a = $(el).find('h2 a');
      const title = a.text().trim();
      const href = a.attr('href') || '';
      const snippet = ($(el).find('.b_caption p').first().text() || $(el).find('.b_lineclamp2').text()).trim();
      if (title && href) results.push({ title, url: href, snippet, source: 'bing', source_name: 'Bing' });
    });
    return results;
  } catch (e) { console.error('Bing:', e.message); return []; }
}

export async function searchGoogle(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://www.google.com/search?q=${query}&num=${maxResults}&hl=zh-CN`;
  try {
    const resp = await rateLimitedFetch(url, 'google.com');
    if (!resp.ok) throw new Error(`Google ${resp.status}`);
    const $ = cheerio.load(await resp.text());
    const results = [];
    $('div.g').each((i, el) => {
      if (results.length >= maxResults) return false;
      const title = $(el).find('h3').text().trim();
      const href = $(el).find('a[href^="http"]').attr('href') || '';
      const snippet = $(el).find('.VwiC3b, .lEBKkf span').text().trim();
      if (title && href) results.push({ title, url: href, snippet, source: 'google', source_name: 'Google' });
    });
    return results;
  } catch (e) { console.error('Google:', e.message); return []; }
}

export async function searchDuckDuckGo(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  // DuckDuckGo lite — no JS, easy to scrape
  const url = `https://lite.duckduckgo.com/lite/?q=${query}`;
  try {
    const resp = await rateLimitedFetch(url, 'duckduckgo.com');
    if (!resp.ok) throw new Error(`DDG ${resp.status}`);
    const $ = cheerio.load(await resp.text());
    const results = [];
    $('table.result').each((i, el) => {
      if (results.length >= maxResults) return false;
      const a = $(el).find('a.result-link');
      const title = a.text().trim();
      const href = a.attr('href') || '';
      const snippet = $(el).find('td.result-snippet').text().trim();
      if (title && href) results.push({ title, url: href, snippet, source: 'ddg', source_name: 'DuckDuckGo' });
    });
    return results;
  } catch (e) { console.error('DuckDuckGo:', e.message); return []; }
}

export async function searchSogou(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://www.sogou.com/web?query=${query}&num=${maxResults}`;
  try {
    const resp = await rateLimitedFetch(url, 'sogou.com');
    if (!resp.ok) throw new Error(`Sogou ${resp.status}`);
    const $ = cheerio.load(await resp.text());
    const results = [];
    $('.results .vrwrap, .results .rb').each((i, el) => {
      if (results.length >= maxResults) return false;
      const a = $(el).find('h3 a, .vr-title a');
      const title = a.text().trim();
      const href = a.attr('href') || '';
      const snippet = $(el).find('.star-wiki, .str-text, .space-txt').text().trim();
      if (title && href) results.push({ title, url: href, snippet, source: 'sogou', source_name: '搜狗搜索' });
    });
    return results;
  } catch (e) { console.error('Sogou:', e.message); return []; }
}

// ===================== 社交/内容平台 =====================

/**
 * HackerNews via Algolia search API (free, no key needed)
 */
export async function searchHackerNews(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://hn.algolia.com/api/v1/search?query=${query}&hitsPerPage=${maxResults}&tags=story`;
  try {
    const resp = await rateLimitedFetch(url, 'hn.algolia.com');
    if (!resp.ok) throw new Error(`HN ${resp.status}`);
    const data = await resp.json();
    return (data.hits || []).slice(0, maxResults).map(h => ({
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      snippet: `${h.points} points | ${h.num_comments} comments`,
      source: 'hackernews',
      source_name: 'HackerNews'
    }));
  } catch (e) { console.error('HackerNews:', e.message); return []; }
}

/**
 * B站搜索 API
 */
export async function searchBilibili(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=video&keyword=${query}&page=1`;
  try {
    const resp = await rateLimitedFetch(url, 'bilibili.com', {
      headers: {
        'Referer': 'https://www.bilibili.com',
        'Origin': 'https://www.bilibili.com'
      }
    });
    const text = await resp.text();
    // B站 may return HTML instead of JSON — try parsing
    let data;
    try { data = JSON.parse(text); } catch { return []; }
    if (data.code !== 0) return [];
    return (data.data?.result || []).slice(0, maxResults).map(v => ({
      title: String(v.title || '').replace(/<[^>]+>/g, ''),
      url: `https://www.bilibili.com/video/${v.bvid}`,
      snippet: `${v.play || 0}播放 | ${v.danmaku || 0}弹幕 | UP: ${v.author}`,
      source: 'bilibili',
      source_name: 'B站'
    }));
  } catch (e) { console.error('B站:', e.message); return []; }
}

/**
 * 微博搜索
 */
export async function searchWeibo(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://s.weibo.com/weibo?q=${query}&typeall=1&suball=1&timescope=custom:1hour`;
  try {
    const resp = await rateLimitedFetch(url, 'weibo.com', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://weibo.com'
      }
    });
    if (!resp.ok) return [];
    const $ = cheerio.load(await resp.text());
    const results = [];
    $('.card-wrap').each((i, el) => {
      if (results.length >= maxResults) return false;
      const a = $(el).find('.from a').first();
      const title = $(el).find('.txt').text().trim() || a.text().trim();
      const href = a.attr('href') || '';
      const url = href.startsWith('//') ? 'https:' + href : href;
      if (title && url) results.push({ title, url, snippet: '', source: 'weibo', source_name: '微博' });
    });
    // Fallback: try card-feed
    if (!results.length) {
      $('.card-feed .content').each((i, el) => {
        if (results.length >= maxResults) return false;
        const a = $(el).find('p a').first();
        const title = $(el).find('p').text().trim().slice(0, 80);
        const href = a.attr('href') || '';
        const url = href.startsWith('//') ? 'https:' + href : href;
        if (title && url) results.push({ title, url, snippet: '', source: 'weibo', source_name: '微博' });
      });
    }
    return results;
  } catch (e) { console.error('微博:', e.message); return []; }
}

/**
 * 微博热搜榜 — 获取当前热搜 TOP (无需关键词)
 */
export async function fetchWeiboHotSearch(maxResults = 5) {
  const url = 'https://weibo.com/ajax/side/hotSearch';
  try {
    const resp = await rateLimitedFetch(url, 'weibo.com', {
      headers: { 'Referer': 'https://weibo.com' }
    });
    if (!resp.ok) throw new Error(`微博热搜 ${resp.status}`);
    const data = await resp.json();
    const items = data.data?.realtime || [];
    return items.slice(0, maxResults).map(item => ({
      title: item.note || item.word,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || '')}`,
      snippet: `${item.num || 0} 热度 | 微博热搜`,
      source: 'weibo_hot',
      source_name: '微博热搜'
    }));
  } catch (e) { console.error('微博热搜:', e.message); return []; }
}

// ===================== 聚合搜索 =====================

/**
 * Keyword-based search: aggregate from all engines
 */
export async function searchAll(keyword, maxResults = 5) {
  const engines = [
    searchBing(keyword, 3),
    searchGoogle(keyword, 3),
    searchDuckDuckGo(keyword, 3),
    searchSogou(keyword, 3),
    searchHackerNews(keyword, 3),
    searchBilibili(keyword, 3),
    searchWeibo(keyword, 3),
  ];

  const settled = await Promise.allSettled(engines);
  const all = settled
    .filter(s => s.status === 'fulfilled')
    .flatMap(s => s.value);

  // Deduplicate by URL
  const seen = new Set();
  return all.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  }).slice(0, maxResults);
}

/**
 * Get trending/hot topics from platforms (no keyword needed)
 */
export async function fetchTrending() {
  const [weiboHot] = await Promise.allSettled([
    fetchWeiboHotSearch(10),
  ]);
  return [
    ...(weiboHot.status === 'fulfilled' ? weiboHot.value : []),
  ];
}

export default {
  searchBing, searchGoogle, searchDuckDuckGo, searchSogou,
  searchHackerNews, searchBilibili, searchWeibo,
  searchAll, fetchWeiboHotSearch, fetchTrending
};
