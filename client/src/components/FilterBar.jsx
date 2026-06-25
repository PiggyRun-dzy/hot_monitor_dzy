import { useState, useRef, useEffect } from 'react';

const SORT_OPTIONS = [
  { value: 'detected_at', label: '发现时间' },
  { value: 'combined_score', label: '综合评分' },
  { value: 'relevance_score', label: '相关性 (R)' },
  { value: 'importance', label: '重要性 (I)' },
  { value: 'freshness', label: '时效性 (F)' },
  { value: 'source', label: '来源' },
];

const TIME_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7天' },
  { value: '30d', label: '30天' },
];

const SCORE_QUICK = [
  { value: 'high', label: '≥80', min: 80, max: '' },
  { value: 'mid', label: '60-79', min: 60, max: 79 },
  { value: 'low', label: '<60', min: '', max: 59 },
];

const SOURCE_OPTIONS = [
  { value: 'bing', label: 'Bing', type: 'engine' },
  { value: 'google', label: 'Google', type: 'engine' },
  { value: 'ddg', label: 'DuckDuckGo', type: 'engine' },
  { value: 'sogou', label: '搜狗', type: 'engine' },
  { value: 'baidu', label: '百度', type: 'engine' },
  { value: 'hackernews', label: 'HackerNews', type: 'community' },
  { value: 'bilibili', label: 'B站', type: 'community' },
  { value: 'weibo', label: '微博', type: 'community' },
  { value: 'github', label: 'GitHub', type: 'community' },
  { value: 'juejin', label: '掘金', type: 'community' },
  { value: 'zhihu', label: '知乎', type: 'community' },
  { value: 'reddit', label: 'Reddit', type: 'community' },
];

export default function FilterBar({ sortField, sortOrder, filters, keywords, onSortChange, onFilterChange }) {
  const [showMore, setShowMore] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showKeywordDropdown, setShowKeywordDropdown] = useState(false);
  const sourceRef = useRef(null);
  const keywordRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sourceRef.current && !sourceRef.current.contains(e.target)) setShowSourceDropdown(false);
      if (keywordRef.current && !keywordRef.current.contains(e.target)) setShowKeywordDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleSortOrder = () => onSortChange(sortField, sortOrder === 'desc' ? 'asc' : 'desc');

  const toggleSource = (src) => {
    const current = filters.sources || [];
    const next = current.includes(src) ? current.filter(s => s !== src) : [...current, src];
    onFilterChange({ ...filters, sources: next });
  };

  const toggleKeyword = (id) => {
    const current = filters.keywordIds || [];
    const next = current.includes(id) ? current.filter(k => k !== id) : [...current, id];
    onFilterChange({ ...filters, keywordIds: next });
  };

  const setTime = (t) => onFilterChange({ ...filters, time: t === filters.time ? 'all' : t });

  const setScoreQuick = (q) => {
    const currentMin = filters.scoreMin;
    const currentMax = filters.scoreMax;
    if (currentMin === q.min && currentMax === q.max) {
      // Deselect
      onFilterChange({ ...filters, scoreMin: '', scoreMax: '' });
    } else {
      onFilterChange({ ...filters, scoreMin: q.min, scoreMax: q.max });
    }
  };

  const isScoreActive = (q) => filters.scoreMin === q.min && filters.scoreMax === q.max;

  const clearAll = () => onFilterChange({
    time: 'all', sources: [], keywordIds: [],
    scoreMin: '', scoreMax: '',
    rMin: '', rMax: '', iMin: '', iMax: '', fMin: '', fMax: '',
    aiVerified: 'all', sourceType: 'all', notified: 'all'
  });

  // Build active filter chips
  const chips = [];
  if (filters.time && filters.time !== 'all') chips.push({ key: 'time', label: `时间: ${filters.time}` });
  if (filters.sources?.length > 0) {
    const names = filters.sources.map(s => SOURCE_OPTIONS.find(o => o.value === s)?.label || s).join(', ');
    chips.push({ key: 'source', label: `来源: ${names}` });
  }
  if (filters.keywordIds?.length > 0) {
    const names = filters.keywordIds.map(id => keywords.find(k => k.id === id)?.keyword || id).join(', ');
    chips.push({ key: 'keyword', label: `关键词: ${names}` });
  }
  if (filters.scoreMin !== '' || filters.scoreMax !== '') {
    chips.push({ key: 'score', label: `评分: ${filters.scoreMin || '0'}-${filters.scoreMax || '100'}` });
  }
  if (filters.rMin !== '' || filters.rMax !== '') chips.push({ key: 'r', label: `R: ${filters.rMin || '0'}-${filters.rMax || '100'}` });
  if (filters.iMin !== '' || filters.iMax !== '') chips.push({ key: 'i', label: `I: ${filters.iMin || '0'}-${filters.iMax || '100'}` });
  if (filters.fMin !== '' || filters.fMax !== '') chips.push({ key: 'f', label: `F: ${filters.fMin || '0'}-${filters.fMax || '100'}` });
  if (filters.aiVerified !== 'all') chips.push({ key: 'ai', label: filters.aiVerified === '1' ? 'AI已验证' : 'AI未验证' });
  if (filters.sourceType !== 'all') chips.push({ key: 'stype', label: filters.sourceType === 'engine' ? '搜索引擎' : '社区源' });
  if (filters.notified !== 'all') chips.push({ key: 'notif', label: filters.notified === '1' ? '已通知' : '未通知' });

  const sourceCount = filters.sources?.length || 0;
  const keywordCount = filters.keywordIds?.length || 0;

  return (
    <div className="filter-bar">
      {/* Main row */}
      <div className="filter-row">
        {/* Sort */}
        <div className="filter-group">
          <select
            className="filter-select"
            value={sortField}
            onChange={e => onSortChange(e.target.value, sortOrder)}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button onClick={toggleSortOrder} className="sort-order-btn" title={sortOrder === 'desc' ? '降序' : '升序'}>
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        <div className="filter-divider" />

        {/* Time range */}
        <div className="filter-group">
          {TIME_OPTIONS.map(t => (
            <button
              key={t.value}
              onClick={() => setTime(t.value)}
              className={`filter-chip ${filters.time === t.value ? 'filter-chip-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="filter-divider" />

        {/* Source multi-select */}
        <div className="filter-group" ref={sourceRef}>
          <button
            onClick={() => { setShowSourceDropdown(!showSourceDropdown); setShowKeywordDropdown(false); }}
            className={`filter-chip ${sourceCount > 0 ? 'filter-chip-active' : ''}`}
          >
            来源{sourceCount > 0 ? ` (${sourceCount})` : ''} ▾
          </button>
          {showSourceDropdown && (
            <div className="filter-dropdown">
              <div className="filter-dropdown-header">选择来源平台</div>
              {SOURCE_OPTIONS.map(s => (
                <label key={s.value} className="filter-dropdown-item">
                  <input
                    type="checkbox"
                    checked={filters.sources?.includes(s.value) || false}
                    onChange={() => toggleSource(s.value)}
                  />
                  <span>{s.label}</span>
                  <span className="filter-dropdown-tag">{s.type === 'engine' ? '搜索' : '社区'}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Keyword multi-select */}
        <div className="filter-group" ref={keywordRef}>
          <button
            onClick={() => { setShowKeywordDropdown(!showKeywordDropdown); setShowSourceDropdown(false); }}
            className={`filter-chip ${keywordCount > 0 ? 'filter-chip-active' : ''}`}
          >
            关键词{keywordCount > 0 ? ` (${keywordCount})` : ''} ▾
          </button>
          {showKeywordDropdown && (
            <div className="filter-dropdown">
              <div className="filter-dropdown-header">选择监控关键词</div>
              {keywords.length === 0 ? (
                <div className="filter-dropdown-empty">暂无关键词</div>
              ) : (
                keywords.map(k => (
                  <label key={k.id} className="filter-dropdown-item">
                    <input
                      type="checkbox"
                      checked={filters.keywordIds?.includes(k.id) || false}
                      onChange={() => toggleKeyword(k.id)}
                    />
                    <span>{k.keyword}</span>
                    <span className={`filter-dropdown-tag ${k.status === 'active' ? 'filter-dropdown-tag-active' : ''}`}>
                      {k.status === 'active' ? '活跃' : '暂停'}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <div className="filter-divider" />

        {/* Combined score quick */}
        <div className="filter-group">
          {SCORE_QUICK.map(q => (
            <button
              key={q.value}
              onClick={() => setScoreQuick(q)}
              className={`filter-chip ${isScoreActive(q) ? 'filter-chip-active' : ''}`}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* More filters toggle */}
        <button
          onClick={() => setShowMore(!showMore)}
          className={`filter-chip ${showMore ? 'filter-chip-active' : ''}`}
        >
          {showMore ? '收起 ▲' : '更多 ▾'}
        </button>
      </div>

      {/* Expanded: advanced filters */}
      {showMore && (
        <div className="filter-advanced">
          <div className="filter-advanced-grid">
            {/* R range */}
            <div className="filter-range-group">
              <span className="filter-range-label">相关性 R</span>
              <input type="number" min="0" max="100" placeholder="0"
                className="filter-range-input"
                value={filters.rMin || ''}
                onChange={e => onFilterChange({ ...filters, rMin: e.target.value })}
              />
              <span className="filter-range-sep">-</span>
              <input type="number" min="0" max="100" placeholder="100"
                className="filter-range-input"
                value={filters.rMax || ''}
                onChange={e => onFilterChange({ ...filters, rMax: e.target.value })}
              />
            </div>

            {/* I range */}
            <div className="filter-range-group">
              <span className="filter-range-label">重要性 I</span>
              <input type="number" min="0" max="100" placeholder="0"
                className="filter-range-input"
                value={filters.iMin || ''}
                onChange={e => onFilterChange({ ...filters, iMin: e.target.value })}
              />
              <span className="filter-range-sep">-</span>
              <input type="number" min="0" max="100" placeholder="100"
                className="filter-range-input"
                value={filters.iMax || ''}
                onChange={e => onFilterChange({ ...filters, iMax: e.target.value })}
              />
            </div>

            {/* F range */}
            <div className="filter-range-group">
              <span className="filter-range-label">时效性 F</span>
              <input type="number" min="0" max="100" placeholder="0"
                className="filter-range-input"
                value={filters.fMin || ''}
                onChange={e => onFilterChange({ ...filters, fMin: e.target.value })}
              />
              <span className="filter-range-sep">-</span>
              <input type="number" min="0" max="100" placeholder="100"
                className="filter-range-input"
                value={filters.fMax || ''}
                onChange={e => onFilterChange({ ...filters, fMax: e.target.value })}
              />
            </div>

            {/* AI verified */}
            <div className="filter-range-group">
              <span className="filter-range-label">AI验证</span>
              <select
                className="filter-select-sm"
                value={filters.aiVerified || 'all'}
                onChange={e => onFilterChange({ ...filters, aiVerified: e.target.value })}
              >
                <option value="all">全部</option>
                <option value="1">已验证</option>
                <option value="0">未验证</option>
              </select>
            </div>

            {/* Source type */}
            <div className="filter-range-group">
              <span className="filter-range-label">来源类型</span>
              <select
                className="filter-select-sm"
                value={filters.sourceType || 'all'}
                onChange={e => onFilterChange({ ...filters, sourceType: e.target.value })}
              >
                <option value="all">全部</option>
                <option value="engine">搜索引擎</option>
                <option value="community">社区源</option>
              </select>
            </div>

            {/* Notified */}
            <div className="filter-range-group">
              <span className="filter-range-label">通知状态</span>
              <select
                className="filter-select-sm"
                value={filters.notified || 'all'}
                onChange={e => onFilterChange({ ...filters, notified: e.target.value })}
              >
                <option value="all">全部</option>
                <option value="1">已通知</option>
                <option value="0">未通知</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="filter-chips-row">
          {chips.map(c => (
            <span key={c.key} className="filter-active-chip">
              {c.label}
              <button
                className="filter-chip-remove"
                onClick={() => {
                  const next = { ...filters };
                  if (c.key === 'time') next.time = 'all';
                  if (c.key === 'source') next.sources = [];
                  if (c.key === 'keyword') next.keywordIds = [];
                  if (c.key === 'score') { next.scoreMin = ''; next.scoreMax = ''; }
                  if (c.key === 'r') { next.rMin = ''; next.rMax = ''; }
                  if (c.key === 'i') { next.iMin = ''; next.iMax = ''; }
                  if (c.key === 'f') { next.fMin = ''; next.fMax = ''; }
                  if (c.key === 'ai') next.aiVerified = 'all';
                  if (c.key === 'stype') next.sourceType = 'all';
                  if (c.key === 'notif') next.notified = 'all';
                  onFilterChange(next);
                }}
              >
                ×
              </button>
            </span>
          ))}
          <button onClick={clearAll} className="filter-clear-all">清除全部</button>
        </div>
      )}
    </div>
  );
}
