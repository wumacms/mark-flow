# Supabase 数据库设置指南

本文档说明如何配置 Supabase 以支持 MarkFlow 运行。

## 1. 创建 Supabase 项目

访问 https://supabase.com/dashboard 创建新项目。

## 2. 执行 SQL 创建表结构

在 Supabase Dashboard 的 **SQL Editor** 中执行以下 SQL：

```sql
-- 启用 UUID 扩展
create extension if not exists "uuid-ossp";

-- 用户档案表
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  github_username text,
  github_token text,
  repo_name text,
  repo_initialized boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 文件夹表
create table folders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  path text not null,
  parent_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 文档表
create table documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  slug text not null,
  content text default '',
  folder_path text default '',
  published boolean default false,
  published_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 启用行级安全（RLS）
alter table profiles enable row level security;
alter table folders enable row level security;
alter table documents enable row level security;

-- Profiles 策略
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Folders 策略
create policy "Users can view own folders"
  on folders for select
  using (auth.uid() = user_id);

create policy "Users can create own folders"
  on folders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own folders"
  on folders for update
  using (auth.uid() = user_id);

create policy "Users can delete own folders"
  on folders for delete
  using (auth.uid() = user_id);

-- Documents 策略
create policy "Users can view own documents"
  on documents for select
  using (auth.uid() = user_id);

create policy "Users can create own documents"
  on documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on documents for delete
  using (auth.uid() = user_id);

-- 自动更新 updated_at 触发器
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at_column();

create trigger update_documents_updated_at
  before update on documents
  for each row
  execute function update_updated_at_column();
```

## 3. 配置 GitHub OAuth

### 3.1 在 GitHub 创建 OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 **New OAuth App**
3. 填写信息：
   - **Application name**：MarkFlow（或任意名称）
   - **Homepage URL**：你的应用地址（如 `http://localhost:5173`）
   - **Authorization callback URL**：`https://你的项目ID.supabase.co/auth/v1/callback`
     > 项目 ID 可在 Supabase Dashboard → Settings → API 中找到

### 3.2 在 Supabase 中配置 GitHub Provider

1. 进入 Supabase Dashboard → **Authentication** → **Providers**
2. 找到 **GitHub**，点击启用
3. 填入刚才创建的 OAuth App 的 **Client ID** 和 **Client Secret**
4. **重要**：确保 Scopes 包含 `repo`（用于读写仓库）
5. 保存设置

## 4. 配置环境变量

复制项目根目录的 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

然后编辑 `.env`，填入你的 Supabase 信息：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **获取方式**：Supabase Dashboard → Settings → API
> - `VITE_SUPABASE_URL` = Project URL
> - `VITE_SUPABASE_ANON_KEY` = anon/public key（**不要**使用 service_role key）

## 5. 重启开发服务器

设置好环境变量后，重启开发服务器即可正常使用。
