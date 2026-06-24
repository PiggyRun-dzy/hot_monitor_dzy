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
      source_name: 'HackerNews',
      points: h.points || 0,
      num_comments: h.num_comments || 0,
      author: h.author || '',
      pub_date: h.created_at || ''
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
      source_name: 'B站',
      play: v.play || 0,
      danmaku: v.danmaku || 0,
      author: v.author || '',
      pub_date: v.pubdate ? new Date(v.pubdate * 1000).toISOString() : ''
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
      source_name: '微博热搜',
      hotness: item.num || 0
    }));
  } catch (e) { console.error('微博热搜:', e.message); return []; }
}

/**
 * 百度搜索 — 中文搜索引擎爬虫
 */
export async function searchBaidu(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://www.baidu.com/s?wd=${query}&rn=${maxResults}`;
  try {
    const resp = await rateLimitedFetch(url, 'baidu.com', {
      headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' }
    });
    if (!resp.ok) throw new Error(`Baidu ${resp.status}`);
    const $ = cheerio.load(await resp.text());
    const results = [];
    $('#content_left .result, #content_left .result-op').each((i, el) => {
      if (results.length >= maxResults) return false;
      const a = $(el).find('h3 a').first();
      const title = a.text().trim();
      const href = a.attr('href') || '';
      const snippet = $(el).find('.c-abstract, .c-span-last, .content-right_8Zs40').first().text().trim();
      if (title && href) results.push({ title, url: href, snippet, source: 'baidu', source_name: '百度' });
    });
    return results;
  } catch (e) { console.error('百度:', e.message); return []; }
}

/**
 * GitHub 搜索 — 免费 API，无需 Key（60 req/h 未认证）
 * 同时搜索仓库和用户，并检测账号信息
 */
export async function searchGitHub(keyword, maxResults = 3) {
  // Use double quotes for exact phrase match (GitHub search defaults to OR)
  const quotedQuery = keyword.includes(' ') ? `"${keyword}"` : keyword;
  const query = encodeURIComponent(quotedQuery);
  const apiUrl = `https://api.github.com/search/repositories?q=${query}&per_page=${maxResults}&sort=stars&order=desc`;
  try {
    const resp = await rateLimitedFetch(apiUrl, 'api.github.com', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Hot-Monitor/1.0'
      }
    });
    if (!resp.ok) throw new Error(`GitHub ${resp.status}`);
    const data = await resp.json();
    const kw = keyword.toLowerCase();
    const results = (data.items || [])
      // Filter: keyword must appear in repo full_name or description
      .filter(r => {
        const name = (r.full_name || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return name.includes(kw) || desc.includes(kw);
      })
      .slice(0, maxResults)
      .map(r => ({
        title: r.full_name,
        url: r.html_url,
        snippet: `⭐ ${r.stargazers_count} | Fork ${r.forks_count} | ${r.description || ''}`,
        source: 'github',
        source_name: 'GitHub',
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        language: r.language || '',
        owner: r.owner?.login || '',
        pub_date: r.pushed_at || r.updated_at || ''
      }));

    // If keyword looks like a username, also search users
    const userResults = await searchGitHubUser(keyword, maxResults);
    return [...results, ...userResults].slice(0, maxResults);
  } catch (e) { console.error('GitHub:', e.message); return []; }
}

async function searchGitHubUser(username, maxResults = 2) {
  try {
    // Try direct user lookup first
    const userResp = await rateLimitedFetch(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      'api.github.com',
      { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Hot-Monitor/1.0' } }
    );
    if (userResp.ok) {
      const u = await userResp.json();
      if (u.login) {
        return [{
          title: `${u.login}${u.name ? ` (${u.name})` : ''} — GitHub ${u.type || 'User'}`,
          url: u.html_url,
          snippet: `👥 ${u.followers} followers | 📦 ${u.public_repos} repos | ${u.bio || ''}`,
          source: 'github',
          source_name: 'GitHub',
          followers: u.followers || 0,
          public_repos: u.public_repos || 0,
          isAccount: true,
          accountType: u.type || 'User',
          avatar: u.avatar_url || ''
        }];
      }
    }
  } catch { /* 用户不存在则忽略 */ }
  return [];
}

/**
 * 掘金 — 国内高质量开发者社区，官方 API
 */
export async function searchJuejin(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://api.juejin.cn/search_api/v1/search?query=${query}&cursor=0&limit=${maxResults}&sort_type=200`;
  try {
    const resp = await rateLimitedFetch(url, 'juejin.cn', {
      headers: {
        'Referer': 'https://juejin.cn',
        'User-Agent': USER_AGENTS[0]
      }
    });
    if (!resp.ok) throw new Error(`Juejin ${resp.status}`);
    const data = await resp.json();
    return (data.data || []).slice(0, maxResults).map(item => {
      // Handle result_model wrapper
      const model = item.result_model || item;
      const info = model.article_info || model;
      return {
        title: String(info.title || info.article_title || '').replace(/<[^>]+>/g, ''),
        url: `https://juejin.cn/post/${info.article_id || item.article_id || ''}`,
        snippet: `👍 ${info.digg_count || 0} | 💬 ${info.comment_count || 0} | 👀 ${info.view_count || 0}`,
        source: 'juejin',
        source_name: '掘金',
        digg_count: info.digg_count || 0,
        comment_count: info.comment_count || 0,
        view_count: info.view_count || 0,
        author: info.author_user_info?.user_name || model.author_user_info?.user_name || '',
        pub_date: info.ctime ? new Date(parseInt(info.ctime) * 1000).toISOString() : (info.mtime ? new Date(parseInt(info.mtime) * 1000).toISOString() : '')
      };
    });
  } catch (e) { console.error('掘金:', e.message); return []; }
}

/**
 * 知乎搜索 — 中文问答/文章社区，爬虫
 */
export async function searchZhihu(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://www.zhihu.com/search?type=content&q=${query}`;
  try {
    const resp = await rateLimitedFetch(url, 'zhihu.com', {
      headers: {
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://www.zhihu.com'
      }
    });
    if (!resp.ok) throw new Error(`Zhihu ${resp.status}`);
    const $ = cheerio.load(await resp.text());
    const results = [];
    $('.List-item').each((i, el) => {
      if (results.length >= maxResults) return false;
      const titleEl = $(el).find('.ContentItem-title a, .SearchResult-CardTitle a');
      const title = titleEl.text().trim();
      const href = titleEl.attr('href') || '';
      const snippet = $(el).find('.RichText, .SearchResult-CardSnippet').text().trim().slice(0, 120);
      const url = href.startsWith('http') ? href : `https://www.zhihu.com${href}`;
      // Extract vote count
      const votes = parseInt($(el).find('[class*="Vote"]').text().trim()) || 0;
      if (title && href) results.push({
        title, url, snippet, votes,
        source: 'zhihu', source_name: '知乎'
      });
    });

    // Fallback: try different selectors if no results
    if (!results.length) {
      $('.Card, .SearchResult-Card').each((i, el) => {
        if (results.length >= maxResults) return false;
        const a = $(el).find('a[data-za-detail-view-element_name="Title"], h2 a').first();
        const title = a.text().trim();
        const href = a.attr('href') || '';
        const snippet = $(el).find('.RichText, .SearchResult-CardSnippet, .Summary').text().trim().slice(0, 120);
        const url = href && href.startsWith('http') ? href : `https://www.zhihu.com${href}`;
        if (title && url) results.push({ title, url, snippet, source: 'zhihu', source_name: '知乎' });
      });
    }
    return results;
  } catch (e) { console.error('知乎:', e.message); return []; }
}

/**
 * Reddit 搜索 — .json API，无需 Key
 */
export async function searchReddit(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://www.reddit.com/search.json?q=${query}&limit=${maxResults}&sort=relevance`;
  try {
    const resp = await rateLimitedFetch(url, 'reddit.com', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENTS[0]
      }
    });
    if (!resp.ok) throw new Error(`Reddit ${resp.status}`);
    const data = await resp.json();
    return (data.data?.children || []).slice(0, maxResults).map(c => {
      const d = c.data;
      return {
        title: d.title || '',
        url: `https://www.reddit.com${d.permalink}`,
        snippet: `⬆ ${d.score} | 💬 ${d.num_comments} | r/${d.subreddit}`,
        source: 'reddit',
        source_name: 'Reddit',
        score: d.score || 0,
        num_comments: d.num_comments || 0,
        subreddit: d.subreddit || '',
        author: d.author || '',
        isAccount: d.author === keyword,
        pub_date: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : ''
      };
    });
  } catch (e) { console.error('Reddit:', e.message); return []; }
}

// ===================== 账号检测 =====================

/**
 * 检测 B站 UP主账号信息（通过 B站空间 API）
 */
export async function detectBilibiliAccount(mid) {
  try {
    const resp = await rateLimitedFetch(
      `https://api.bilibili.com/x/space/acc/info?mid=${mid}`,
      'bilibili.com',
      { headers: { 'Referer': 'https://space.bilibili.com' } }
    );
    const data = await resp.json();
    if (data.code === 0 && data.data) {
      return {
        followers: data.data.follower || 0,
        name: data.data.name || '',
        official: data.data.official?.type >= 0 || false, // 认证状态
        level: data.data.level || 0
      };
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * 检测知乎用户账号信息
 */
export async function detectZhihuAccount(urlToken) {
  try {
    const resp = await rateLimitedFetch(
      `https://www.zhihu.com/api/v4/members/${encodeURIComponent(urlToken)}`,
      'zhihu.com',
      { headers: { 'Referer': 'https://www.zhihu.com' } }
    );
    if (resp.ok) {
      const data = await resp.json();
      return {
        followers: data.follower_count || 0,
        name: data.name || '',
        headline: data.headline || ''
      };
    }
  } catch { /* ignore */ }
  return null;
}

// ===================== 聚合搜索 =====================

/**
 * Keyword-based search: aggregate from all engines with source diversity.
 * Ensures every working source contributes at least 1 result.
 */
export async function searchAll(keyword, maxResults = 8) {
  const engines = [
    { name: 'bing',      fn: () => searchBing(keyword, 3) },
    { name: 'google',    fn: () => searchGoogle(keyword, 3) },
    { name: 'ddg',       fn: () => searchDuckDuckGo(keyword, 3) },
    { name: 'sogou',     fn: () => searchSogou(keyword, 3) },
    { name: 'baidu',     fn: () => searchBaidu(keyword, 3) },
    { name: 'hackernews',fn: () => searchHackerNews(keyword, 3) },
    { name: 'bilibili',  fn: () => searchBilibili(keyword, 3) },
    { name: 'weibo',     fn: () => searchWeibo(keyword, 3) },
    { name: 'github',    fn: () => searchGitHub(keyword, 3) },
    { name: 'juejin',    fn: () => searchJuejin(keyword, 3) },
    { name: 'zhihu',     fn: () => searchZhihu(keyword, 3) },
    { name: 'reddit',    fn: () => searchReddit(keyword, 3) },
  ];

  // Run all engines in parallel
  const settled = await Promise.allSettled(engines.map(e => e.fn()));

  // Round-robin: take 1 from each source first, then fill remaining slots
  const sourceResults = settled.map((s, i) => ({
    name: engines[i].name,
    results: s.status === 'fulfilled' ? s.value : []
  }));

  const collected = [];
  const seen = new Set();
  const sourceIndex = new Array(sourceResults.length).fill(0);
  let added = true;

  while (added && collected.length < maxResults) {
    added = false;
    for (let i = 0; i < sourceResults.length && collected.length < maxResults; i++) {
      const sr = sourceResults[i];
      while (sourceIndex[i] < sr.results.length) {
        const r = sr.results[sourceIndex[i]++];
        if (!seen.has(r.url)) {
          seen.add(r.url);
          collected.push(r);
          added = true;
          break;
        }
      }
    }
  }

  return collected;
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
  searchBing, searchGoogle, searchDuckDuckGo, searchSogou, searchBaidu,
  searchHackerNews, searchBilibili, searchWeibo,
  searchGitHub, searchJuejin, searchZhihu, searchReddit,
  searchAll, fetchWeiboHotSearch, fetchTrending,
  detectBilibiliAccount, detectZhihuAccount
};
