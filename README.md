# 📡 Hot Monitor — AI 热点雷达监测站

> AI 驱动的热点监控工具，12 大免费数据源 × DeepSeek V4 Pro 多维 AI 验证，帮你走在吃瓜第一线。

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express" alt="Express">
  <img src="https://img.shields.io/badge/SQLite-sql.js-blue" alt="SQLite">
  <img src="https://img.shields.io/badge/AI-DeepSeek_V4_Pro-7C3AED" alt="DeepSeek">
</p>

---

## ✨ 功能

- **🎯 关键词监控** — 输入关键词，自动追踪热点，滑块开关 + 编辑/删除
- **🤖 AI 多维验证** — DeepSeek V4 Pro 评估 内容类型 + 相关性(R) + 重要性(I) + 时效性(F)，识别商业/垃圾页面
- **🔎 AI 查询扩展** — 关键词自动扩展为 3-5 个相关搜索词，提升搜索覆盖率
- **🌐 12 大免费数据源** — Bing/Google/DDG/搜狗/百度/HN/B站/微博/GitHub/掘金/知乎/Reddit
- **🛡️ 三层质量过滤+去重** — 互动量预过滤 → 时效预过滤 → AI 多维评分 + URL/标题归一化去重
- **🔍 账号检测** — GitHub/B站/知乎自动识别博主/官方账号，提取粉丝数等信息
- **⏰ 定时扫描** — 每 30 分钟自动，支持手动触发（轮询等待完成）
- **📡 三 Tab 布局** — 热点流（首页）/ 监控词 / 搜索历史
- **🔔 实时通知** — Toast 弹窗 + 铃铛下拉列表，新热点即时可见
- **🧪 AI 自评估** — 回顾历史审核记录，抽样重评，输出准确率+偏差报告
- **✨ Aceternity 动效** — 光束聚光灯、流星效果、玻璃拟态卡片
- **📊 统计卡片** — 关键词/热点/24h/AI验证，透明玻璃风格
- **📧 邮件通知** — 热点发现自动邮件（待配置）

---

## 🚀 快速开始

### 1. 环境要求

- **Node.js** ≥ 18（推荐 v20+）
- **npm** ≥ 9

### 2. 安装

```bash
cd hot-monitor
npm run setup          # 安装前后端依赖
```

### 3. 配置

```bash
cp .env.example .env   # 复制配置模板
```

编辑 `.env`，填入 OpenRouter API Key：

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=deepseek/deepseek-v4-pro
```

> 💡 在 https://openrouter.ai/settings/keys 获取 API Key。

### 4. 启动

```bash
npm run dev
```

> ⚠️ Windows 下如果 `npm run dev` 找不到 node，改用：
> ```bash
> "C:\Program Files\nodejs\node.exe" start.js
> ```

打开 **http://localhost:5173** 即可看到赛博雷达监测站界面。

---

## 🔧 手动操作

### 启动项目

```bash
npm run dev
```

或分窗口启动（适合调试）：

```bash
# 窗口 1 — 后端（端口 3456）
cd hot-monitor
"C:\Program Files\nodejs\node.exe" server/index.js

# 窗口 2 — 前端（端口 5173）
cd hot-monitor\client
"C:\Program Files\nodejs\node.exe" node_modules\vite\bin\vite.js
```

### 停止项目

```bash
# 方式 1: 在启动窗口按 Ctrl+C

# 方式 2: 强制停止所有 Node 进程
taskkill /f /im node.exe
```

### 重启项目

```bash
# 一键重启
taskkill /f /im node.exe && npm run dev

# 完全重启（清除数据库）
taskkill /f /im node.exe && del server\hot-monitor.db && npm run dev
```

### 查看运行状态

```bash
# 检查端口占用
netstat -ano | findstr ":3456 :5173"

# 检查 API 健康
curl http://localhost:3456/api/stats
```

### 如果端口被占用杀不掉

```bash
# 1. 查找占用端口的 PID
netstat -ano | findstr ":3456" | findstr "LISTENING"
# 输出示例: TCP  0.0.0.0:3456  0.0.0.0:0  LISTENING  12345
#                                                            ↑ PID

# 2. 强制杀死进程
wmic process where processid=12345 delete
```

---

## 📡 数据源

| 数据源 | 类型 | 是否需要 Key | 说明 |
|--------|------|:---:|------|
| **Bing** | 国际搜索 | ❌ | Cheerio 爬虫 |
| **Google** | 国际搜索 | ❌ | Cheerio 爬虫 |
| **DuckDuckGo** | 隐私搜索 | ❌ | Lite HTML 解析 |
| **搜狗** | 中文搜索 | ❌ | Cheerio 爬虫 |
| **百度** | 中文搜索 | ❌ | Cheerio 爬虫 |
| **HackerNews** | 科技社区 | ❌ | Algolia API |
| **B站** | 视频平台 | ❌ | 官方 API + UP主信息检测 |
| **微博热搜** | 实时热搜 | ❌ | Ajax API |
| **GitHub** | 开发者社区 | ❌ | 官方 API（仓库+用户+组织检测） |
| **掘金** | 开发者社区 | ❌ | 官方 API |
| **知乎** | 问答社区 | ❌ | 网页爬虫 |
| **Reddit** | 国际社区 | ❌ | .json API |

> 全部免费，开箱即用，`searchAll` 轮询聚合去重。

---

## 🛡️ 三层质量过滤 + 去重

| 层级 | 说明 | 示例阈值 |
|:---:|------|------|
| L1 互动量 | 源特定互动量门槛 | HN ≥10赞+5评论, B站 ≥500播放, GitHub ≥10 Stars, 微博 ≥10万热度 |
| L2 时效 | `pub_date` 超过 `max_age_days` 直接丢弃 | 默认 7 天，可配 3-30 天 |
| L3 AI 多维 | 内容分类 + R+I+F 综合分 ≥ 来源阈值；R<40 或 F<40 硬拒绝 | 引擎源≥70, 社区源≥55 |
| 去重 | URL 规范化（提取重定向+去追踪参数）+ 标题归一化，三层防护 | 同一文章多源只存一条 |

---

## 🎨 界面

**深空玻璃风格** — 暗色背景 `#05050A` + 玻璃拟态卡片（`backdrop-blur: 24px`），光束聚光灯贯穿全页，随机流星动画点缀统计卡片。每张热点卡片展示 SVG 环形综合评分 + R:I:F 三维指标。

---

## 📁 项目结构

```
hot-monitor/
├── server/                 # 后端 Express
│   ├── index.js            # 服务入口
│   ├── db.js               # SQLite (sql.js) + 自动迁移
│   ├── ai.js               # DeepSeek V4 Pro AI（多维验证+查询扩展+自评估）
│   ├── monitor.js          # 监控引擎（查询扩展+三层过滤+URL/标题去重）
│   ├── scheduler.js        # 定时任务
│   ├── notifier.js         # 邮件通知
│   ├── search/
│   │   └── web-scraper.js  # 12 大数据源 + 账号检测
│   └── routes/             # API 路由
├── client/                 # 前端 React + Vite
│   └── src/components/     # 9 个 UI 组件（含通知系统）
├── start.js                # 一键启动脚本
├── docs/
│   ├── DESIGN.md           # 方案设计文档
│   └── REQUIREMENTS.md     # 需求文档
└── .env.example            # 配置模板
```

---

## 🔗 访问地址

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:5173 |
| API 后端 | http://localhost:3456 |
| API 统计 | http://localhost:3456/api/stats |

---

## 📖 文档

| 文档 | 内容 |
|------|------|
| [需求文档](docs/REQUIREMENTS.md) | 项目背景、用户角色、功能需求、非功能需求 |
| [方案设计](docs/DESIGN.md) | 技术选型、系统架构、数据模型、API、核心模块、填坑记录 |
| [OpenRouter 文档](https://openrouter.ai/docs) | AI 服务对接 |
| [sql.js 文档](https://github.com/sql-js/sql.js) | 数据库引擎

---

## 📝 License

MIT
