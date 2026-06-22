# Supabase 数据库设置指南

## 1. 创建 Supabase 项目

访问 https://supabase.com/dashboard 创建新项目。

## 2. 执行 SQL 创建表结构

在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL：

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

-- RLS 策略
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

-- 自动更新 updated_at
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

1. 在 GitHub 创建 OAuth App: https://github.com/settings/developers
2. Authorization callback URL 设置为: `https://your-project.supabase.co/auth/v1/callback`
3. 在 Supabase Dashboard → Authentication → Providers → GitHub 中填入 Client ID 和 Client Secret
4. 确保勾选 `repo` scope

## 4. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的 Supabase URL 和 Anon Key。
