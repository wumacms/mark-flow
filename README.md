# MarkFlow — 用 Markdown 书写，向世界发布

一个基于 GitHub + Supabase 的 Markdown 文档管理平台。支持 GitHub 一键登录，文档自动同步到 GitHub 仓库，并通过 GitHub Pages 发布为静态网页。

## ✨ 功能特性

- **GitHub OAuth 登录** — 一键授权，自动获取仓库操作权限
- **Markdown 编辑器** — 实时预览，支持代码高亮、数学公式（KaTeX）、GFM 表格、图片、任务列表等
- **文档管理** — 侧边栏文件夹树 + 文档列表，支持搜索、创建、删除
- **一键保存** — 文档自动推送到 GitHub 仓库 `main` 分支
- **一键发布** — 生成 HTML 推送到 `gh-pages` 分支，每个文档拥有独立的网页和 URL
- **深色 / 浅色模式** — 跟随系统或手动切换
- **可折叠侧边栏** — 编辑 / 预览 / 分屏三种模式，面板可最大化

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 pnpm
- 一个 Supabase 账号
- 一个 GitHub 账号

### 1. 克隆并安装依赖

```bash
git clone <YOUR_REPO_URL>
cd markflow
npm install
```

### 2. 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard) 创建新项目
2. 在 SQL Editor 中执行 `SUPABASE_SETUP.md` 中的 SQL 语句，创建表结构和 RLS 策略
3. 在 **Authentication → Providers → GitHub** 中启用 GitHub 登录：
   - 前往 [GitHub Developer Settings](https://github.com/settings/developers) 创建 OAuth App
   - Authorization callback URL 填写：`https://你的项目ID.supabase.co/auth/v1/callback`
   - 将 Client ID 和 Client Secret 填入 Supabase
   - 确保 scopes 包含 `repo`

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的 Supabase 信息：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> URL 和 anon key 可在 Supabase Dashboard → Settings → API 中找到。

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173`，使用 GitHub 登录即可开始使用。

## 📁 项目结构

```
src/
├── components/          # UI 组件
│   ├── Header.tsx       # 顶部导航栏
│   ├── Sidebar.tsx      # 可折叠侧边栏
│   ├── MarkdownEditor.tsx  # Markdown 编辑器
│   ├── Onboarding.tsx   # 新用户引导流程
│   ├── ThemeToggle.tsx  # 主题切换
│   ├── SetupGuide.tsx   # Supabase 配置引导
│   └── ui/              # shadcn/ui 组件
├── contexts/            # React Context
│   ├── AuthContext.tsx  # 认证状态
│   └── AppContext.tsx   # 应用状态
├── hooks/               # 自定义 Hooks
├── lib/                 # 工具库
│   ├── supabase.ts      # Supabase 客户端 & 认证
│   ├── github.ts        # GitHub API 操作
│   ├── db.ts            # Supabase 数据库操作
│   └── utils.ts         # 通用工具函数
├── pages/               # 页面
│   └── EditorPage.tsx   # 主编辑页面
├── types/               # TypeScript 类型定义
├── App.tsx              # 应用入口
├── main.tsx             # 渲染入口
└── index.css            # 全局样式 & 设计令牌
```

## 🗄️ 数据库设计

### profiles 表
存储用户 GitHub 信息和仓库配置。

### documents 表
存储 Markdown 文档元数据（标题、内容、slug、发布状态等）。

### folders 表
存储文件夹层级结构，支持嵌套文件夹。

详细的建表 SQL 请查看 `SUPABASE_SETUP.md`。

## 📦 发布流程

1. **保存**：将 Markdown 内容推送到 GitHub 仓库 `main` 分支的 `{slug}/index.md` 路径
2. **发布**：生成 HTML 推送到 `gh-pages` 分支的 `{slug}/index.html`
3. 每个文档对应一个独立目录，结构如下：

```
repo/
├── main 分支
│   ├── doc-1/
│   │   └── index.md
│   └── doc-2/
│       └── index.md
└── gh-pages 分支
    ├── doc-1/
    │   └── index.html
    └── doc-2/
        └── index.html
```

发布成功后，可通过 `https://{username}.github.io/{repo}/{slug}/` 访问文档网页。

## 🛠️ 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **样式**：Tailwind CSS v4 + shadcn/ui
- **数据库 / 认证**：Supabase
- **Markdown 渲染**：react-markdown + remark-gfm + remark-math + rehype-highlight + rehype-katex
- **主题**：next-themes
- **通知**：sonner

## ⚠️ 注意事项

- GitHub OAuth 需要 `repo` scope 才能操作仓库
- 创建的仓库必须是公开仓库（public），GitHub Pages 才能正常访问
- GitHub Pages 部署可能需要几分钟才能生效
- 首次登录后需要完成引导流程（创建仓库 + 开启 Pages）

## 📄 License

MIT
