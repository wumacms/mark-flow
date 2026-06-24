import { common } from 'lowlight'
import bashLang from 'highlight.js/lib/languages/bash'

export const customBash = (hljs: any) => {
  const lang = bashLang(hljs)
  if (lang && lang.keywords && typeof lang.keywords === 'object' && !Array.isArray(lang.keywords)) {
    const customCommands = [
      "npm", "yarn", "pnpm", "bun", "npx", "git", "docker", "curl", "wget",
      "install", "add", "run", "build", "dev", "start", "test", "init", "create",
      "clone", "commit", "push", "pull", "status", "checkout", "branch",
      "pip", "python", "node", "deno", "go", "cargo"
    ]
    const keywords = lang.keywords as Record<string, string | string[] | RegExp>
    let builtIn: string[] = []
    if (typeof keywords.built_in === 'string') {
      builtIn = keywords.built_in.split(' ')
    } else if (Array.isArray(keywords.built_in)) {
      builtIn = keywords.built_in as string[]
    }
    keywords.built_in = [...new Set([...builtIn, ...customCommands])]
  }
  return lang
}

export const highlightLanguages = {
  ...common,
  bash: customBash,
}

export const highlightOptions = {
  aliases: { xml: ['vue', 'svelte'] },
  languages: highlightLanguages,
}
