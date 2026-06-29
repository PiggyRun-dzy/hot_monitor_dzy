/**
 * Hot Monitor Skill — 12 源搜索引擎 + 社区平台爬虫
 * 纯函数，零外部状态，可直接被 Agent 调用
 */
import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
];

// Rate limiting
const lastRequestTime = {};
const MIN_INTERVAL_MS = 2000;

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
    signal: AbortSignal.timeout(10000),
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
      const snippet = $(el).find('.b_caption p').map((_, p) => $(p).text().trim()).get().filter(Boolean).join(' ') || $(el).find('.b_lineclamp2').text().trim();
      if (title && href) results.push({ title, url: href, snippet, source: 'bing', source_name: 'Bing' });
    });
    return results;
  } catch (e) { return []; }
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
  } catch (e) { return []; }
}

export async function searchDuckDuckGo(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
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
  } catch (e) { return []; }
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
      const snippet = $(el).find('.star-wiki, .str-text, .space-txt, .abstract').text().trim();
      if (title && href) results.push({ title, url: href, snippet, source: 'sogou', source_name: '搜狗搜索' });
    });
    return results;
  } catch (e) { return []; }
}

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
      const snippet = $(el).find('.c-abstract, .c-span-last, .content-right_8Zs40').map((_, p) => $(p).text().trim()).get().filter(Boolean).join(' ');
      if (title && href) results.push({ title, url: href, snippet, source: 'baidu', source_name: '百度' });
    });
    return results;
  } catch (e) { return []; }
}

// ===================== 社交 / 内容平台 =====================

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
      snippet: (h.story_text || h.comment_text || '').slice(0, 300) || `${h.points} points | ${h.num_comments} comments`,
      source: 'hackernews',
      source_name: 'HackerNews',
      points: h.points || 0,
      num_comments: h.num_comments || 0,
      author: h.author || '',
      pub_date: h.created_at || ''
    }));
  } catch (e) { return []; }
}

export async function searchBilibili(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=video&keyword=${query}&page=1`;
  try {
    const resp = await rateLimitedFetch(url, 'bilibili.com', {
      headers: { 'Referer': 'https://www.bilibili.com', 'Origin': 'https://www.bilibili.com' }
    });
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { return []; }
    if (data.code !== 0) return [];
    return (data.data?.result || []).slice(0, maxResults).map(v => ({
      title: String(v.title || '').replace(/<[^>]+>/g, ''),
      url: `https://www.bilibili.com/video/${v.bvid}`,
      snippet: (v.description || '').slice(0, 200) || `${v.play || 0}播放 | ${v.danmaku || 0}弹幕 | UP: ${v.author}`,
      source: 'bilibili',
      source_name: 'B站',
      play: v.play || 0,
      danmaku: v.danmaku || 0,
      author: v.author || '',
      pub_date: v.pubdate ? new Date(v.pubdate * 1000).toISOString() : ''
    }));
  } catch (e) { return []; }
}

export async function searchWeibo(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://s.weibo.com/weibo?q=${query}&typeall=1&suball=1&timescope=custom:1hour`;
  try {
    const resp = await rateLimitedFetch(url, 'weibo.com', {
      headers: { 'Accept': 'text/html,application/xhtml+xml', 'Referer': 'https://weibo.com' }
    });
    if (!resp.ok) return [];
    const $ = cheerio.load(await resp.text());
    const results = [];
    $('.card-wrap').each((i, el) => {
      if (results.length >= maxResults) return false;
      const a = $(el).find('.from a').first();
      const title = $(el).find('.txt').text().trim() || a.text().trim();
      const href = a.attr('href') || '';
      const resultUrl = href.startsWith('//') ? 'https:' + href : href;
      const weiboSnippet = $(el).find('.txt').text().trim().slice(0, 200);
      if (title && resultUrl) results.push({ title, url: resultUrl, snippet: weiboSnippet, source: 'weibo', source_name: '微博' });
    });
    if (!results.length) {
      $('.card-feed .content').each((i, el) => {
        if (results.length >= maxResults) return false;
        const a = $(el).find('p a').first();
        const title = $(el).find('p').text().trim().slice(0, 80);
        const href = a.attr('href') || '';
        const resultUrl = href.startsWith('//') ? 'https:' + href : href;
        const weiboSnippet = $(el).find('.txt').text().trim().slice(0, 200);
        if (title && resultUrl) results.push({ title, url: resultUrl, snippet: weiboSnippet, source: 'weibo', source_name: '微博' });
      });
    }
    return results;
  } catch (e) { return []; }
}

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
  } catch (e) { return []; }
}

export async function searchGitHub(keyword, maxResults = 3) {
  const quotedQuery = keyword.includes(' ') ? `"${keyword}"` : keyword;
  const query = encodeURIComponent(quotedQuery);
  const apiUrl = `https://api.github.com/search/repositories?q=${query}&per_page=${maxResults}&sort=stars&order=desc`;
  try {
    const resp = await rateLimitedFetch(apiUrl, 'api.github.com', {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Hot-Monitor/1.0' }
    });
    if (!resp.ok) throw new Error(`GitHub ${resp.status}`);
    const data = await resp.json();
    const kw = keyword.toLowerCase();
    const results = (data.items || [])
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
    const userResults = await searchGitHubUser(keyword, maxResults);
    return [...results, ...userResults].slice(0, maxResults);
  } catch (e) { return []; }
}

async function searchGitHubUser(username, maxResults = 2) {
  try {
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

export async function searchJuejin(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://api.juejin.cn/search_api/v1/search?query=${query}&cursor=0&limit=${maxResults}&sort_type=200`;
  try {
    const resp = await rateLimitedFetch(url, 'juejin.cn', {
      headers: { 'Referer': 'https://juejin.cn', 'User-Agent': USER_AGENTS[0] }
    });
    if (!resp.ok) throw new Error(`Juejin ${resp.status}`);
    const data = await resp.json();
    return (data.data || []).slice(0, maxResults).map(item => {
      const model = item.result_model || item;
      const info = model.article_info || model;
      return {
        title: String(info.title || info.article_title || '').replace(/<[^>]+>/g, ''),
        url: `https://juejin.cn/post/${info.article_id || item.article_id || ''}`,
        snippet: (info.brief_content || '').slice(0, 200) || `👍 ${info.digg_count || 0} | 💬 ${info.comment_count || 0} | 👀 ${info.view_count || 0}`,
        source: 'juejin',
        source_name: '掘金',
        digg_count: info.digg_count || 0,
        comment_count: info.comment_count || 0,
        view_count: info.view_count || 0,
        author: info.author_user_info?.user_name || model.author_user_info?.user_name || '',
        pub_date: info.ctime ? new Date(parseInt(info.ctime) * 1000).toISOString() : (info.mtime ? new Date(parseInt(info.mtime) * 1000).toISOString() : '')
      };
    });
  } catch (e) { return []; }
}

export async function searchZhihu(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://www.zhihu.com/search?type=content&q=${query}`;
  try {
    const resp = await rateLimitedFetch(url, 'zhihu.com', {
      headers: { 'Accept-Language': 'zh-CN,zh;q=0.9', 'Referer': 'https://www.zhihu.com' }
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
      const resultUrl = href.startsWith('http') ? href : `https://www.zhihu.com${href}`;
      const votes = parseInt($(el).find('[class*="Vote"]').text().trim()) || 0;
      if (title && href) results.push({ title, url: resultUrl, snippet, votes, source: 'zhihu', source_name: '知乎' });
    });
    if (!results.length) {
      $('.Card, .SearchResult-Card').each((i, el) => {
        if (results.length >= maxResults) return false;
        const a = $(el).find('a[data-za-detail-view-element_name="Title"], h2 a').first();
        const title = a.text().trim();
        const href = a.attr('href') || '';
        const snippet = $(el).find('.RichText, .SearchResult-CardSnippet, .Summary').text().trim().slice(0, 120);
        const resultUrl = href && href.startsWith('http') ? href : `https://www.zhihu.com${href}`;
        if (title && resultUrl) results.push({ title, url: resultUrl, snippet, source: 'zhihu', source_name: '知乎' });
      });
    }
    return results;
  } catch (e) { return []; }
}

export async function searchReddit(keyword, maxResults = 3) {
  const query = encodeURIComponent(keyword);
  const url = `https://www.reddit.com/search.json?q=${query}&limit=${maxResults}&sort=relevance`;
  try {
    const resp = await rateLimitedFetch(url, 'reddit.com', {
      headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENTS[0] }
    });
    if (!resp.ok) throw new Error(`Reddit ${resp.status}`);
    const data = await resp.json();
    return (data.data?.children || []).slice(0, maxResults).map(c => {
      const d = c.data;
      return {
        title: d.title || '',
        url: `https://www.reddit.com${d.permalink}`,
        snippet: (d.selftext || '').slice(0, 250) || `⬆ ${d.score} | 💬 ${d.num_comments} | r/${d.subreddit}`,
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
  } catch (e) { return []; }
}

// ===================== 聚合搜索 =====================

/**
 * 12 源 round-robin 聚合搜索
 * 确保来源多样性：每源各取 1 条，再填充剩余名额
 */
export async function searchAll(keyword, maxResults = 8) {
  const engines = [
    { name: 'bing',       fn: () => searchBing(keyword, 3) },
    { name: 'google',     fn: () => searchGoogle(keyword, 3) },
    { name: 'ddg',        fn: () => searchDuckDuckGo(keyword, 3) },
    { name: 'sogou',      fn: () => searchSogou(keyword, 3) },
    { name: 'baidu',      fn: () => searchBaidu(keyword, 3) },
    { name: 'hackernews', fn: () => searchHackerNews(keyword, 3) },
    { name: 'bilibili',   fn: () => searchBilibili(keyword, 3) },
    { name: 'weibo',      fn: () => searchWeibo(keyword, 3) },
    { name: 'github',     fn: () => searchGitHub(keyword, 3) },
    { name: 'juejin',     fn: () => searchJuejin(keyword, 3) },
    { name: 'zhihu',      fn: () => searchZhihu(keyword, 3) },
    { name: 'reddit',     fn: () => searchReddit(keyword, 3) },
  ];

  const settled = await Promise.allSettled(engines.map(e => e.fn()));

  const sourceResults = settled.map((s, i) => ({
    name: engines[i].name,
    results: s.status === 'fulfilled' ? s.value : []
  }));

  // Round-robin: 每源先取 1 条，再填充剩余名额
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

export default {
  searchBing, searchGoogle, searchDuckDuckGo, searchSogou, searchBaidu,
  searchHackerNews, searchBilibili, searchWeibo,
  searchGitHub, searchJuejin, searchZhihu, searchReddit,
  searchAll, fetchWeiboHotSearch
};
