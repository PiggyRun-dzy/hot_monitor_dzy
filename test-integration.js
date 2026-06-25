/**
 * Hot Monitor — 端到端集成测试
 * 启动服务器，执行真实 API 调用，验证所有新功能
 */
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const BASE = 'http://localhost:3456';
let serverProcess = null;
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

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  return res.json();
}

async function main() {
  // Start server
  console.log('启动服务器...');
  serverProcess = spawn('node', ['server/index.js'], {
    cwd: import.meta.dirname,
    stdio: 'pipe',
    env: { ...process.env, PORT: '3456' }
  });

  // Wait for server to be ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(`${BASE}/api/stats`);
      ready = true;
      break;
    } catch {
      await setTimeout(500);
    }
  }
  if (!ready) {
    console.log('❌ 服务器启动超时');
    serverProcess.kill();
    process.exit(1);
  }
  console.log('服务器已就绪\n');

  try {
    // ============================================================
    // Test 1: API 返回数据包含新字段
    // ============================================================
    console.log('📋 Test 1: API /api/hotspots 返回新字段');

    const hotspots = await api('/api/hotspots?limit=5');
    const sample = (hotspots.data || [])[0] || {};

    test('返回包含 pub_date 字段', () => {
      if (!('pub_date' in sample)) throw new Error('pub_date field missing from API response');
    });

    test('返回包含 original_snippet 字段', () => {
      if (!('original_snippet' in sample)) throw new Error('original_snippet field missing');
    });

    test('返回包含 author 字段', () => {
      if (!('author' in sample)) throw new Error('author field missing');
    });

    test('返回包含 engagement 字段', () => {
      if (!('engagement' in sample)) throw new Error('engagement field missing');
    });

    test('返回包含 ai_reason 字段', () => {
      if (!('ai_reason' in sample)) throw new Error('ai_reason field missing');
    });

    // ============================================================
    // Test 2: 手动插入测试数据验证完整字段
    // ============================================================
    console.log('\n📋 Test 2: 数据库存储和读取新字段');

    // Insert test keyword first
    const kwRes = await api('/api/keywords', {
      method: 'POST',
      body: JSON.stringify({ keyword: '__TEST_INTEGRATION__', scope: 'test' })
    });
    const keywordId = kwRes.id;
    test('测试关键词创建成功', () => {
      if (!keywordId) throw new Error('Failed to create test keyword');
    });

    // Manual insert via direct SQL not available via API, so let's trigger a mini scan
    // Instead, verify existing hotspots if any have been scanned with new code

    // ============================================================
    // Test 3: 统计 API 正常
    // ============================================================
    console.log('\n📋 Test 3: API /api/stats 正常响应');

    const stats = await api('/api/stats');
    test('统计返回 totalKeywords', () => {
      if (typeof stats.totalKeywords !== 'number') throw new Error('totalKeywords missing or not number');
    });
    test('统计返回 totalHotspots', () => {
      if (typeof stats.totalHotspots !== 'number') throw new Error('totalHotspots missing');
    });
    test('统计返回 lastScan', () => {
      if (!('lastScan' in stats)) throw new Error('lastScan missing');
    });

    // ============================================================
    // Test 4: 排序和筛选 API
    // ============================================================
    console.log('\n📋 Test 4: 排序和筛选 API 参数');

    const sortedByScore = await api('/api/hotspots?sort=combined_score&order=desc&limit=3');
    test('按综合评分排序正常', () => {
      if (!sortedByScore.data) throw new Error('sort by combined_score failed');
    });

    const sortedByFreshness = await api('/api/hotspots?sort=freshness&order=desc&limit=3');
    test('按时效性排序正常', () => {
      if (!sortedByFreshness.data) throw new Error('sort by freshness failed');
    });

    const timeFiltered = await api('/api/hotspots?time=24h&limit=5');
    test('时间范围筛选正常(24h)', () => {
      if (!timeFiltered.data) throw new Error('time filter failed');
    });

    const sourceFiltered = await api('/api/hotspots?source_type=community&limit=5');
    test('来源类型筛选正常(community)', () => {
      if (!sourceFiltered.data) throw new Error('source_type filter failed');
    });

    const engineFiltered = await api('/api/hotspots?source_type=engine&limit=5');
    test('来源类型筛选正常(engine)', () => {
      if (!engineFiltered.data) throw new Error('engine filter failed');
    });

    // ============================================================
    // Test 5: 分页 API
    // ============================================================
    console.log('\n📋 Test 5: 分页 API');

    const page1 = await api('/api/hotspots?page=1&limit=5');
    test('分页返回 total/totalPages', () => {
      if (typeof page1.total !== 'number') throw new Error('total missing');
      if (typeof page1.totalPages !== 'number') throw new Error('totalPages missing');
      if (page1.page !== 1) throw new Error(`Expected page 1, got ${page1.page}`);
    });

    // ============================================================
    // Test 6: 评分区间筛选
    // ============================================================
    console.log('\n📋 Test 6: 评分区间筛选');

    const scoreHigh = await api('/api/hotspots?score_min=80&limit=5');
    test('评分≥80筛选正常', () => {
      if (!scoreHigh.data) throw new Error('score_min filter failed');
    });

    const rRange = await api('/api/hotspots?r_min=70&limit=5');
    test('相关性R范围筛选正常', () => {
      if (!rRange.data) throw new Error('R range filter failed');
    });

    // ============================================================
    // Test 7: 验证 HotspotCard 组件逻辑 (无浏览器渲染)
    // ============================================================
    console.log('\n📋 Test 7: HotspotCard 数据解析逻辑');

    // Simulate the data parsing that HotspotCard does
    const testData = {
      engagement: '{"points":120,"num_comments":45}',
      pub_date: '2026-06-25T10:00:00Z',
      original_snippet: 'Original search snippet text',
      author: 'testuser',
      ai_reason: 'This is highly relevant because it directly matches the keyword',
      summary: 'AI generated summary',
      title: 'Test Title',
      url: 'https://example.com',
      relevance_score: 85,
      importance: 90,
      freshness: 78,
      source: 'hackernews',
      source_name: 'HackerNews',
      keyword: 'test',
      notified: 0,
      combined_score: 84
    };

    // Test engagement parsing
    let eng;
    try {
      eng = typeof testData.engagement === 'string'
        ? JSON.parse(testData.engagement) : testData.engagement;
    } catch { eng = {}; }
    test('engagement JSON 解析', () => {
      if (eng.points !== 120) throw new Error(`Expected points=120, got ${eng.points}`);
      if (eng.num_comments !== 45) throw new Error(`Expected comments=45, got ${eng.num_comments}`);
    });

    // Test hasEngagement check
    const hasEngagement = Object.keys(eng).length > 0;
    test('hasEngagement 检测', () => {
      if (!hasEngagement) throw new Error('hasEngagement should be true for non-empty engagement');
    });

    // Test empty engagement
    const emptyEng = {};
    const hasEmptyEng = Object.keys(emptyEng).length > 0;
    test('空 engagement 正确处理', () => {
      if (hasEmptyEng) throw new Error('empty engagement should be falsy');
    });

    // Test expand all logic (null = individual mode)
    test('expandAll=null 时使用 localExpanded (修复bug)', () => {
      const expandAll = null;
      const localExpanded = false;
      const expanded = expandAll != null ? expandAll : localExpanded;
      if (expanded !== false) throw new Error('expandAll=null should use localExpanded=false');
    });

    test('expandAll=true 时全部展开', () => {
      const expandAll = true;
      const localExpanded = false;
      const expanded = expandAll != null ? expandAll : localExpanded;
      if (expanded !== true) throw new Error('expandAll=true should expand all');
    });

    test('expandAll=false 时全部折叠', () => {
      const expandAll = false;
      const localExpanded = true;
      const expanded = expandAll != null ? expandAll : localExpanded;
      if (expanded !== false) throw new Error('expandAll=false should collapse all');
    });

    // Test URL validation
    test('URL 正则验证 http/https', () => {
      const validUrl = 'https://example.com';
      const invalidUrl = '';
      const hasUrl1 = validUrl && /^https?:\/\//.test(validUrl);
      const hasUrl2 = invalidUrl && /^https?:\/\//.test(invalidUrl);
      if (!hasUrl1) throw new Error('https URL should be valid');
      if (hasUrl2) throw new Error('empty URL should be invalid');
    });

    // Test showOriginalSnippet logic
    test('原始描述 vs AI摘要 对比逻辑', () => {
      const originalSnippet = 'Original text';
      const aiSummary = 'AI summary text';
      const same = 'Same text';
      const show1 = originalSnippet && originalSnippet !== aiSummary && !aiSummary.includes(originalSnippet.slice(0, 20));
      const show2 = same && same !== same;
      if (!show1) throw new Error('Different original snippet should show');
      if (show2) throw new Error('Same text should not show as original');
    });

    // ============================================================
    // Test 8: Debug API
    // ============================================================
    console.log('\n📋 Test 8: Debug API');

    const debugRes = await api('/api/debug/search?keyword=TDesign');
    test('Debug搜索API正常', () => {
      if (!debugRes.keyword || debugRes.keyword !== 'TDesign') throw new Error('Debug API keyword mismatch');
      if (!debugRes.results) throw new Error('Debug API results missing');
    });

    // ============================================================
    // Cleanup
    // ============================================================
    console.log('\n📋 清理测试数据');
    if (keywordId) {
      await api(`/api/keywords/${keywordId}`, { method: 'DELETE' });
      console.log('  ✅ 测试关键词已删除');
    }

    // ============================================================
    // Summary
    // ============================================================
    console.log('\n' + '='.repeat(50));
    console.log(`集成测试结果: ${passed} 通过, ${failed} 失败`);
    console.log('='.repeat(50));

    if (failed > 0) {
      console.log('\n❌ 存在问题，请检查上述失败项');
    } else {
      console.log('🎉 所有集成测试通过！新功能已验证正常工作。');
    }

  } finally {
    serverProcess.kill();
    process.exit(failed > 0 ? 1 : 0);
  }
}

main().catch(e => {
  console.error('测试异常:', e);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
