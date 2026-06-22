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

export async function createRepository(token: string, name: string, description: string = 'My Markdown Documents') {
  return githubRequest(token, '/user/repos', 'POST', {
    name,
    description,
    private: false,
    auto_init: true,
  })
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css">
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 0; }
    @media (prefers-color-scheme: dark) {
      body { background: #0d1117; }
      .markdown-body { background: #0d1117; color: #c9d1d9; border-color: #30363d; }
      .markdown-body h1, .markdown-body h2 { border-color: #30363d; }
      .markdown-body blockquote { color: #8b949e; border-color: #3b434b; }
      .markdown-body code { background: #161b22; }
      .markdown-body pre { background: #161b22 !important; }
      .markdown-body table tr { background: #0d1117; }
      .markdown-body table td, .markdown-body table th { border-color: #30363d; }
      .markdown-body table tr:nth-child(2n) { background: #161b22; }
      .markdown-body hr { border-color: #30363d; }
      .markdown-body a { color: #58a6ff; }
    }
    @media (prefers-color-scheme: light) {
      body { background: #f6f8fa; }
      .markdown-body { background: #fff; }
    }
    .markdown-body { max-width: 900px; margin: 40px auto; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
    img { max-width: 100%; }
    code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
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
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/css.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/xml.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/json.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/java.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/go.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/rust.min.js"></script>
  <script>
    document.querySelectorAll('pre code').forEach((el) => {
      hljs.highlightElement(el);
    });
  </script>
</body>
</html>`
}
