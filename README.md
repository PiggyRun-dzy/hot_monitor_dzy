# 📡 Hot Monitor — AI 热点雷达监测站

> AI 驱动的热点监控工具，7 大免费数据源 × DeepSeek V4 Pro AI 验证，帮你走在吃瓜第一线。

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

- **🎯 关键词监控** — 输入关键词（如 "GPT-5"），自动追踪相关热点
- **🤖 AI 真伪识别** — DeepSeek V4 Pro 验证内容真伪，排除标题党和蹭热度内容
- **🌐 7 大免费数据源** — Bing、Google、DuckDuckGo、搜狗、HackerNews、B站、微博热搜
- **⏰ 定时扫描** — 每 30 分钟自动扫描，也支持手动触发
- **📧 邮件通知** — 发现新热点自动发送邮件通知（待配置）
- **🎨 赛博雷达 UI** — 独特的 Cyberpunk HUD 风格界面，雷达扫描动画

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
| **HackerNews** | 科技社区 | ❌ | Algolia API |
| **B站** | 视频平台 | ❌ | 官方 API |
| **微博热搜** | 实时热搜 | ❌ | Ajax API |

> 全部免费，开箱即用，`searchAll` 自动聚合去重。

---

## 🎨 界面预览

赛博朋克 HUD 雷达监测站风格：

- 深空背景 `#0A0E27` + 电光青 `#00FFFF` 强调色
- 顶部雷达扫描动画（旋转扫描线 + 信号点脉冲）
- 热点卡片带环形评分指示器
- 终端风格系统日志
- 关键词管理面板（信号强度可视化）

---

## 📁 项目结构

```
hot-monitor/
├── server/                 # 后端 Express
│   ├── index.js            # 服务入口
│   ├── db.js               # SQLite (sql.js)
│   ├── ai.js               # DeepSeek V4 Pro AI
│   ├── monitor.js          # 监控引擎
│   ├── scheduler.js        # 定时任务
│   ├── notifier.js         # 邮件通知
│   ├── search/
│   │   └── web-scraper.js  # 7 大数据源爬虫
│   └── routes/             # API 路由
├── client/                 # 前端 React + Vite
│   └── src/components/     # 7 个 UI 组件
├── start.js                # 一键启动脚本
├── docs/DESIGN.md          # 详细设计文档
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

## 📖 更多文档

- [完整设计文档](docs/DESIGN.md) — 架构设计、数据模型、API 接口
- [OpenRouter 文档](https://openrouter.ai/docs) — AI 服务对接
- [sql.js 文档](https://github.com/sql-js/sql.js) — 数据库引擎

---

## 📝 License

MIT
