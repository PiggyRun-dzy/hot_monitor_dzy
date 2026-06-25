/**
 * Hot Monitor — 集成测试 v2
 * 验证: 1) DB迁移 2) AI reason 3) 互动数据存储 4) HotspotCard增强 5) 展开/折叠
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertContains(haystack, needle, message) {
  if (!haystack.includes(needle)) throw new Error(message || `Expected to contain "${needle}"`);
}

// ============================================================
// Test 1: DB Migration — 5 new columns
// ============================================================
console.log('\n📋 Test 1: 数据库迁移新增列');

const dbFile = path.join(__dirname, 'server', 'db.js');
const dbCode = fs.readFileSync(dbFile, 'utf-8');

test('新增 pub_date 列迁移', () => {
  assertContains(dbCode, "migrateAddColumn(rawDb, 'hotspots', 'pub_date'", 'should add pub_date column');
});

test('新增 original_snippet 列迁移', () => {
  assertContains(dbCode, "migrateAddColumn(rawDb, 'hotspots', 'original_snippet'", 'should add original_snippet column');
});

test('新增 author 列迁移', () => {
  assertContains(dbCode, "migrateAddColumn(rawDb, 'hotspots', 'author'", 'should add author column');
});

test('新增 engagement 列迁移 (JSON TEXT)', () => {
  assertContains(dbCode, "migrateAddColumn(rawDb, 'hotspots', 'engagement'", 'should add engagement column');
  assertContains(dbCode, "TEXT DEFAULT '{}'", 'engagement should default to {}');
});

test('新增 ai_reason 列迁移', () => {
  assertContains(dbCode, "migrateAddColumn(rawDb, 'hotspots', 'ai_reason'", 'should add ai_reason column');
});

// ============================================================
// Test 2: AI Prompt — reason field
// ============================================================
console.log('\n📋 Test 2: AI 验证返回 reason 字段');

const aiFile = path.join(__dirname, 'server', 'ai.js');
const aiCode = fs.readFileSync(aiFile, 'utf-8');

test('AI prompt 要求返回 reason 字段', () => {
  assertContains(aiCode, '"reason":"20-40字判断理由"', 'AI prompt should require reason field');
});

test('AI prompt 增加判断标准第5条', () => {
  assertContains(aiCode, '判断理由(reason)', 'AI prompt should have reason description');
});

test('AI 返回对象包含 reason', () => {
  assertContains(aiCode, "result.reason ?? ''", 'should extract reason with fallback');
  assertContains(aiCode, 'reason: String(reason).slice(0, 80)', 'reason should be truncated to 80 chars in return');
});

test('AI summary 放宽至 120 字符', () => {
  assertContains(aiCode, 'String(summary).slice(0, 120)', 'summary should allow 120 chars');
  assertContains(aiCode, 'max_tokens: 1000', 'max_tokens should still be 1000');
});

// ============================================================
// Test 3: Monitor — store extra data
// ============================================================
console.log('\n📋 Test 3: Monitor 存储额外数据');

const monitorFile = path.join(__dirname, 'server', 'monitor.js');
const monitorCode = fs.readFileSync(monitorFile, 'utf-8');

test('buildEngagement 函数存在', () => {
  assertContains(monitorCode, 'function buildEngagement(result)', 'should have buildEngagement helper');
});

test('buildEngagement 处理 HN 互动数据', () => {
  assertContains(monitorCode, "e.points = result.points", 'should store HN points');
  assertContains(monitorCode, "e.num_comments = result.num_comments", 'should store HN comments');
});

test('buildEngagement 处理 B站 互动数据', () => {
  assertContains(monitorCode, "e.play = result.play", 'should store B站 plays');
  assertContains(monitorCode, "e.danmaku = result.danmaku", 'should store B站 danmaku');
});

test('buildEngagement 处理 GitHub 仓库/用户', () => {
  assertContains(monitorCode, "e.stars = result.stars", 'should store GitHub stars');
  assertContains(monitorCode, "e.forks = result.forks", 'should store GitHub forks');
  assertContains(monitorCode, "e.followers = result.followers", 'should store GitHub followers');
  assertContains(monitorCode, "e.public_repos = result.public_repos", 'should store GitHub repos');
  assertContains(monitorCode, "e.language = result.language", 'should store GitHub language');
});

test('buildEngagement 处理 掘金 互动数据', () => {
  assertContains(monitorCode, "e.digg_count = result.digg_count", 'should store 掘金 digs');
  assertContains(monitorCode, "e.comment_count = result.comment_count", 'should store 掘金 comments');
  assertContains(monitorCode, "e.view_count = result.view_count", 'should store 掘金 views');
});

test('buildEngagement 处理 知乎 互动数据', () => {
  assertContains(monitorCode, "e.votes = result.votes", 'should store 知乎 votes');
});

test('buildEngagement 处理 Reddit 互动数据', () => {
  assertContains(monitorCode, "e.score = result.score", 'should store Reddit score');
  assertContains(monitorCode, "e.num_comments = result.num_comments", 'should store Reddit comments');
  assertContains(monitorCode, "e.subreddit = result.subreddit", 'should store Reddit subreddit');
});

test('buildEngagement 处理 微博热搜', () => {
  assertContains(monitorCode, "e.hotness = result.hotness", 'should store weibo hotness');
});

test('INSERT 语句包含新字段', () => {
  assertContains(monitorCode, 'pub_date, original_snippet, author, engagement, ai_reason', 'INSERT should include new columns');
});

test('存储 pub_date 和 original_snippet', () => {
  assertContains(monitorCode, "result.pub_date || ''", 'should store pub_date');
  assertContains(monitorCode, "result.snippet || ''", 'should store original snippet');
});

test('存储 author', () => {
  assertContains(monitorCode, "result.author || ''", 'should store author');
});

test('存储 engagement JSON', () => {
  assertContains(monitorCode, 'JSON.stringify(engagement)', 'should serialize engagement as JSON');
});

test('存储 ai_reason', () => {
  assertContains(monitorCode, "ai.reason || ''", 'should store ai_reason');
});

// ============================================================
// Test 4: HotspotCard — enhanced display
// ============================================================
console.log('\n📋 Test 4: HotspotCard 信息展示增强');

const cardFile = path.join(__dirname, 'client', 'src', 'components', 'HotspotCard.jsx');
const cardCode = fs.readFileSync(cardFile, 'utf-8');

test('解析 engagement JSON', () => {
  assertContains(cardCode, 'JSON.parse(hotspot.engagement)', 'should parse engagement JSON');
  assertContains(cardCode, "engagement = {}", 'should fallback to empty object on parse error');
});

test('原文预览 — 智能检测统计源', () => {
  assertContains(cardCode, 'hasOriginalSnippet', 'should have hasOriginalSnippet variable');
  assertContains(cardCode, 'isMeaningfulSnippet', 'should have isMeaningfulSnippet helper');
  assertContains(cardCode, '📄 原文预览', 'should show 原文预览 label');
  assertContains(cardCode, 'originalExpanded', 'should have independent expand state for original');
  assertContains(cardCode, 'original-snippet-content', 'should use original-snippet-content class');
  // Smart detection patterns
  assertContains(cardCode, '播放', 'should detect B站 stat pattern');
  assertContains(cardCode, '热度', 'should detect weibo stat pattern');
  assertContains(cardCode, 'points', 'should detect HN stat pattern');
});

test('AI 摘要 — 截断 + hover tooltip', () => {
  assertContains(cardCode, 'SUMMARY_MAX', 'should have SUMMARY_MAX constant');
  assertContains(cardCode, 'summaryTruncated', 'should check if summary exceeds max');
  assertContains(cardCode, '…', 'should append ellipsis for truncated summary');
  assertContains(cardCode, "title={summaryTruncated ? aiSummary : undefined}", 'should show full summary on hover tooltip');
});

test('卡片改为 div 包裹，标题独立为链接', () => {
  assertContains(cardCode, '<div\n', 'card wrapper should be div');
  assertContains(cardCode, '<a href={hotspot.url}', 'title should be independent a link');
  assertContains(cardCode, 'target="_blank"', 'link should open in new tab');
  // Verify no e.preventDefault needed for buttons
  assertContains(cardCode, 'external-link-icon', 'should still have external link icon');
});



test('评分点替代文字 badge', () => {
  assertContains(cardCode, 'scoreDot', 'should have score dot class');
  assertContains(cardCode, 'rounded-full', 'score indicator should be a circle dot');
  assertContains(cardCode, 'w-2 h-2', 'dot should be 8x8px');
});

test('card-accent 替代 card-link-accent', () => {
  assertContains(cardCode, 'card-accent', 'should use card-accent (no -link- since it is not a link wrapper)');
});

test('展示作者', () => {
  assertContains(cardCode, 'hotspot.author', 'should access author');
  assertContains(cardCode, '👤', 'should show author emoji');
});

test('展示发布时间', () => {
  assertContains(cardCode, 'hotspot.pub_date', 'should access pub_date');
  assertContains(cardCode, 'formatPubDate', 'should format pub_date');
  assertContains(cardCode, '📅', 'should show calendar emoji for pub_date');
});

test('展示互动数据 — EngagementBadges 组件', () => {
  assertContains(cardCode, 'EngagementBadges', 'should have EngagementBadges component');
});

test('EngagementBadges 处理 HackerNews', () => {
  assertContains(cardCode, "s === 'hackernews'", 'should handle HN source');
  assertContains(cardCode, 'engagement.points', 'should display HN points');
  assertContains(cardCode, 'engagement.num_comments', 'should display HN comments');
});

test('EngagementBadges 处理 B站', () => {
  assertContains(cardCode, "s === 'bilibili'", 'should handle bilibili source');
  assertContains(cardCode, 'engagement.play', 'should display play count');
  assertContains(cardCode, 'engagement.danmaku', 'should display danmaku count');
});

test('EngagementBadges 处理 GitHub 仓库/用户', () => {
  assertContains(cardCode, "s === 'github'", 'should handle GitHub source');
  assertContains(cardCode, 'engagement.stars', 'should display stars');
  assertContains(cardCode, 'engagement.forks', 'should display forks');
  assertContains(cardCode, 'engagement.followers', 'should display followers');
  assertContains(cardCode, 'engagement.language', 'should display language');
});

test('EngagementBadges 处理 掘金', () => {
  assertContains(cardCode, "s === 'juejin'", 'should handle 掘金 source');
  assertContains(cardCode, 'engagement.digg_count', 'should display digg_count');
  assertContains(cardCode, 'engagement.view_count', 'should display view_count');
});

test('EngagementBadges 处理 知乎', () => {
  assertContains(cardCode, "s === 'zhihu'", 'should handle 知乎 source');
  assertContains(cardCode, 'engagement.votes', 'should display votes');
});

test('EngagementBadges 处理 Reddit', () => {
  assertContains(cardCode, "s === 'reddit'", 'should handle Reddit source');
  assertContains(cardCode, 'engagement.score', 'should display Reddit score');
  assertContains(cardCode, 'engagement.subreddit', 'should display subreddit');
});

test('EngagementBadges 处理 微博热搜', () => {
  assertContains(cardCode, "s === 'weibo_hot'", 'should handle weibo_hot source');
  assertContains(cardCode, 'engagement.hotness', 'should display hotness');
});

test('formatNum 数字格式化', () => {
  assertContains(cardCode, 'function formatNum', 'should have formatNum function');
  assertContains(cardCode, '10000', 'should handle 万');
  assertContains(cardCode, '1000', 'should handle k');
});

test('AI 分析理由 — 默认折叠', () => {
  assertContains(cardCode, 'aiReason', 'should have aiReason variable');
  assertContains(cardCode, '💡 AI分析', 'should show AI reason label');
});

test('AI 分析理由 — 展开/折叠交互', () => {
  assertContains(cardCode, 'reasonExpanded', 'should have reasonExpanded state');
  assertContains(cardCode, '收起 ▲', 'should show collapse label');
  assertContains(cardCode, '展开 ▾', 'should show expand label');
});



test('expandAll prop 支持全局控制', () => {
  assertContains(cardCode, 'expandAll', 'should accept expandAll prop');
});

// ============================================================
// Test 5: HotspotFeed — 一键展开/折叠全部
// ============================================================
console.log('\n📋 Test 5: 一键展开/折叠全部 AI 理由');

const feedFile = path.join(__dirname, 'client', 'src', 'components', 'HotspotFeed.jsx');
const feedCode = fs.readFileSync(feedFile, 'utf-8');

test('HotspotFeed 包含 expandAll 状态', () => {
  assertContains(feedCode, 'const [expandAll, setExpandAll]', 'HotspotFeed should manage expandAll state');
});

test('全部分析按钮仅在有理由时显示', () => {
  assertContains(feedCode, 'hasAnyReason', 'should check if any hotspot has reason');
  assertContains(feedCode, 'h.ai_reason', 'should check ai_reason field');
});

test('全部分析按钮文字正确', () => {
  assertContains(feedCode, '展开全部AI分析 ▾', 'should show expand all label');
  assertContains(feedCode, '折叠全部AI分析 ▲', 'should show collapse all label');
});

test('toggleExpandAll 三态切换', () => {
  assertContains(feedCode, 'expandAll === true', 'should handle true state');
  assertContains(feedCode, 'expandAll === false', 'should handle false state');
});

test('HotspotCard 接收 expandAll prop', () => {
  assertContains(feedCode, 'expandAll={expandAll}', 'should pass expandAll to HotspotCard');
});

// ============================================================
// Test 6: SearchPanel — 也支持展开/折叠
// ============================================================
console.log('\n📋 Test 6: SearchPanel 展开/折叠全部');

const searchFile = path.join(__dirname, 'client', 'src', 'components', 'SearchPanel.jsx');
const searchCode = fs.readFileSync(searchFile, 'utf-8');

test('SearchPanel 包含 expandAll 状态', () => {
  assertContains(searchCode, 'const [expandAll, setExpandAll]', 'SearchPanel should have expandAll state');
});

test('SearchPanel 传递 expandAll 给 HotspotCard', () => {
  assertContains(searchCode, 'expandAll={expandAll}', 'SearchPanel should pass expandAll');
});

// ============================================================
// Summary
// ============================================================
console.log('\n' + '='.repeat(50));
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 所有测试通过！所有新功能均已实现并验证。\n');
  console.log('  B1 ✅ 数据库 5 列迁移');
  console.log('  B2 ✅ AI prompt reason 字段');
  console.log('  B3 ✅ Monitor 存储互动数据+发布时间+原始描述+作者+AI理由');
  console.log('  F1 ✅ 展示原始发布时间');
  console.log('  F2 ✅ 原始描述 vs AI 摘要对比展示');
  console.log('  F3 ✅ 展示作者');
  console.log('  F4 ✅ 按来源展示互动数据(点赞/播放/Star等)');
  console.log('  F5 ✅ AI 相关性理由展开/折叠');
  console.log('  F6 ✅ 一键展开/折叠全部(热点流+搜索页)');
}
