// GitHub API operations for managing repositories and files

const GITHUB_API = 'https://api.github.com'

export interface GitHubFile {
  path: string;
  content: string;
  sha?: string;
}

async function githubRequest(
  token: string,
  url: string,
  method: string = 'GET',
  body?: object
) {
  const response = await fetch(`${GITHUB_API}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub API error (${response.status}): ${errorText}`)
  }

  return response.json()
}

export async function createRepository(token: string, name: string, description: string = 'My Markdown Documents', autoInit: boolean = false) {
  return githubRequest(token, '/user/repos', 'POST', {
    name,
    description,
    private: false,
    auto_init: autoInit,
  })
}

/**
 * Check if a repository already exists for the authenticated user.
 * Returns repo info if exists, null otherwise.
 */
export async function checkRepoExists(token: string, owner: string, repo: string): Promise<{ name: string; full_name: string; default_branch: string } | null> {
  try {
    const result = await githubRequest(token, `/repos/${owner}/${repo}`)
    return result
  } catch {
    return null
  }
}

export async function enableGitHubPages(token: string, owner: string, repo: string) {
  // First, we need to ensure the gh-pages branch exists
  // Create gh-pages branch from main
  const mainRef = await githubRequest(token, `/repos/${owner}/${repo}/git/ref/heads/main`)
  
  try {
    await githubRequest(token, `/repos/${owner}/${repo}/git/refs`, 'POST', {
      ref: 'refs/heads/gh-pages',
      sha: mainRef.object.sha,
    })
  } catch (e: any) {
    // Branch might already exist, that's fine
    if (!e.message?.includes('already exists')) {
      throw e
    }
  }

  // Enable GitHub Pages with gh-pages branch
  try {
    return await githubRequest(token, `/repos/${owner}/${repo}/pages`, 'POST', {
      source: {
        branch: 'gh-pages',
        path: '/',
      },
    })
  } catch (e: any) {
    // Pages might already be enabled, that's fine
    if (!e.message?.includes('already') && !e.message?.includes('enabled')) {
      throw e
    }
    return { html_url: `https://${owner}.github.io/${repo}/` }
  }
}

export async function getFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<{ content: string; sha: string } | null> {
  try {
    const result = await githubRequest(
      token,
      `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    )
    // Content is base64 encoded
    const content = atob(result.content.replace(/\n/g, ''))
    return { content, sha: result.sha }
  } catch {
    return null
  }
}

/**
 * Get file with retry — useful right after repo creation when files
 * may not be immediately available.
 */
export async function getFileWithRetry(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main',
  maxRetries: number = 5,
  delayMs: number = 1500
): Promise<{ content: string; sha: string }> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await getFile(token, owner, repo, path, branch)
    if (result && result.sha) {
      return result
    }
    if (i < maxRetries - 1) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  throw new Error(`无法获取文件 "${path}" 的信息，已重试 ${maxRetries} 次`)
}

export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
  branch: string = 'main'
) {
  const body: Record<string, string> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
  }
  if (sha) {
    body.sha = sha
  }
  return githubRequest(token, `/repos/${owner}/${repo}/contents/${path}`, 'PUT', body)
}

export async function getDirectoryContents(
  token: string,
  owner: string,
  repo: string,
  path: string = '',
  branch: string = 'main'
): Promise<Array<{ name: string; path: string; type: string; sha: string }>> {
  try {
    const result = await githubRequest(
      token,
      `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    )
    return Array.isArray(result) ? result : []
  } catch {
    return []
  }
}

export async function deleteFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string,
  branch: string = 'main'
) {
  return githubRequest(token, `/repos/${owner}/${repo}/contents/${path}`, 'DELETE', {
    message,
    sha,
    branch,
  })
}

export async function getRepoInfo(token: string, owner: string, repo: string) {
  return githubRequest(token, `/repos/${owner}/${repo}`)
}

export async function getPagesInfo(token: string, owner: string, repo: string) {
  try {
    return await githubRequest(token, `/repos/${owner}/${repo}/pages`)
  } catch {
    return null
  }
}

// Generate HTML from markdown for publishing
export function generateHtmlFromMarkdown(title: string, htmlContent: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css">
  <!-- Highlight.js themes: light default, dark via media query -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css" media="(prefers-color-scheme: light)">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css" media="(prefers-color-scheme: dark)">
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 0; }
    @media (prefers-color-scheme: dark) {
      body { background: #0d1117; }
      .markdown-body { background: #0d1117; color: #c9d1d9; }
      .markdown-body h1, .markdown-body h2 { border-color: #30363d; }
      .markdown-body blockquote { color: #8b949e; border-color: #3b434b; }
      .markdown-body code { background: #161b22; color: #c9d1d9; }
      .markdown-body pre { background: #161b22 !important; border-color: #30363d; }
      .markdown-body pre code { color: #e6edf3; background: transparent !important; }
      .markdown-body pre code.hljs { background: transparent !important; color: #e6edf3; }
      .markdown-body table tr { background: #0d1117; }
      .markdown-body table td, .markdown-body table th { border-color: #30363d; }
      .markdown-body table tr:nth-child(2n) { background: #161b22; }
      .markdown-body hr { border-color: #30363d; }
      .markdown-body a { color: #58a6ff; }
    }
    @media (prefers-color-scheme: light) {
      body { background: #f6f8fa; }
      .markdown-body { background: #fff; }
      .markdown-body pre { background: #f6f8fa !important; border: 1px solid #d0d7de; border-radius: 8px; }
      .markdown-body pre code { color: #24292f; background: transparent !important; }
      .markdown-body pre code.hljs { background: transparent !important; color: #24292f; }
      .markdown-body code { background: #eff1f3; color: #24292f; }
    }
    .markdown-body { max-width: 900px; margin: 40px auto; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); line-height: 1.75; }
    .markdown-body img { max-width: 100%; border-radius: 8px; }
    .markdown-body code { font-family: 'SF Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 0.875em; }
    .markdown-body pre { padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; }
    .markdown-body pre code { padding: 0; font-size: 0.85em; line-height: 1.6; background: transparent !important; }
    .markdown-body pre code.hljs { padding: 0 !important; background: transparent !important; }
    .markdown-body .katex-display { overflow-x: auto; overflow-y: hidden; }
  </style>
</head>
<body>
  <div class="markdown-body">
    ${htmlContent}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/core.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/javascript.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/typescript.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/python.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/bash.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/shell.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/css.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/xml.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/json.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/yaml.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/java.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/go.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/rust.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/c.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/cpp.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/csharp.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/php.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/ruby.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/swift.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/kotlin.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/sql.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/dockerfile.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/nginx.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/diff.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/markdown.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/ini.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/toml.min.js"></script>
  <script>
    // Apply highlight.js to all code blocks
    // highlightAll() finds all <pre><code> and highlights them
    hljs.highlightAll();

    // Fallback: manually highlight any <pre><code> that wasn't picked up
    document.querySelectorAll('pre code:not(.hljs)').forEach(function(el) {
      hljs.highlightElement(el);
    });

    // Simple theme toggle for published pages
    (function() {
      var saved = localStorage.getItem('mf-theme');
      if (saved === 'dark') {
        document.body.style.background = '#0d1117';
        var md = document.querySelector('.markdown-body');
        if (md) { md.style.background = '#0d1117'; md.style.color = '#c9d1d9'; }
      }
    })();
  </script>
</body>
</html>`
}

/**
 * Article entry for the blog index page.
 */
export interface BlogArticle {
  title: string;
  slug: string;
  folder_path: string;
  published_at: string;
  url: string;
  excerpt: string;
}

/**
 * Generate a blog-style index.html that lists all published articles,
 * grouped by their folder (category).
 */
export function generateBlogIndexHtml(articles: BlogArticle[], siteTitle: string = 'MarkFlow'): string {
  // Group articles by folder_path (category)
  const grouped: Record<string, BlogArticle[]> = {}
  for (const article of articles) {
    const category = article.folder_path || '未分类'
    if (!grouped[category]) grouped[category] = []
    grouped[category].push(article)
  }

  // Sort categories alphabetically, but put '未分类' last
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    if (a === '未分类') return 1
    if (b === '未分类') return -1
    return a.localeCompare(b, 'zh-CN')
  })

  // Build category sections HTML
  let categoriesHtml = ''
  for (const category of sortedCategories) {
    const items = grouped[category]
    // Sort articles by published_at descending
    items.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())

    const articlesHtml = items.map(a => {
      const date = new Date(a.published_at).toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      })
      return `
        <article class="article-card">
          <a href="${a.url}" class="article-link">
            <h3 class="article-title">${a.title}</h3>
            <p class="article-excerpt">${a.excerpt}</p>
            <div class="article-meta">
              <time>${date}</time>
            </div>
          </a>
        </article>`
    }).join('')

    categoriesHtml += `
      <section class="category-section">
        <h2 class="category-heading">${category}</h2>
        <div class="articles-grid">
          ${articlesHtml}
        </div>
      </section>`
  }

  const totalArticles = articles.length

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteTitle}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #fafafa;
      --bg-card: #ffffff;
      --fg: #1a1a2e;
      --fg-muted: #6b7280;
      --border: #e5e7eb;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --card-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
      --card-shadow-hover: 0 10px 25px rgba(0,0,0,0.1), 0 6px 10px rgba(0,0,0,0.08);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f0f14;
        --bg-card: #1a1a24;
        --fg: #e4e4e7;
        --fg-muted: #71717a;
        --border: #27272a;
        --accent: #60a5fa;
        --accent-hover: #93bbfd;
        --card-shadow: 0 1px 3px rgba(0,0,0,0.3);
        --card-shadow-hover: 0 10px 25px rgba(0,0,0,0.4);
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.7;
      min-height: 100vh;
    }
    .container { max-width: 960px; margin: 0 auto; padding: 0 24px; }

    /* Header */
    header {
      padding: 48px 0 32px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 48px;
    }
    header h1 {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 8px;
    }
    header p {
      color: var(--fg-muted);
      font-size: 1rem;
    }
    .article-count {
      display: inline-block;
      margin-top: 12px;
      padding: 4px 12px;
      background: var(--accent);
      color: #fff;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* Category sections */
    .category-section {
      margin-bottom: 48px;
    }
    .category-heading {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--accent);
      display: inline-block;
    }
    .articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    /* Article card */
    .article-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--card-shadow);
      transition: box-shadow 0.25s ease, transform 0.25s ease;
      overflow: hidden;
    }
    .article-card:hover {
      box-shadow: var(--card-shadow-hover);
      transform: translateY(-3px);
    }
    .article-link {
      display: block;
      padding: 24px;
      text-decoration: none;
      color: inherit;
    }
    .article-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 8px;
      line-height: 1.4;
      color: var(--fg);
    }
    .article-card:hover .article-title {
      color: var(--accent);
    }
    .article-excerpt {
      font-size: 0.875rem;
      color: var(--fg-muted);
      line-height: 1.6;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .article-meta {
      font-size: 0.8rem;
      color: var(--fg-muted);
    }

    /* Footer */
    footer {
      padding: 32px 0;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--fg-muted);
      font-size: 0.85rem;
      margin-top: 48px;
    }
    footer a { color: var(--accent); text-decoration: none; }
    footer a:hover { text-decoration: underline; }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 80px 24px;
      color: var(--fg-muted);
    }
    .empty-state p { font-size: 1.1rem; }

    @media (max-width: 640px) {
      header h1 { font-size: 1.75rem; }
      .articles-grid { grid-template-columns: 1fr; }
      .article-link { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${siteTitle}</h1>
      <p>用 Markdown 书写，向世界发布</p>
      ${totalArticles > 0 ? `<span class="article-count">共 ${totalArticles} 篇文章</span>` : ''}
    </header>

    <main>
      ${totalArticles > 0 ? categoriesHtml : '<div class="empty-state"><p>暂无已发布的文章，开始创作吧！</p></div>'}
    </main>

    <footer>
      <p>Powered by <a href="https://github.com" target="_blank" rel="noopener">MarkFlow</a></p>
    </footer>
  </div>
</body>
</html>`
}
