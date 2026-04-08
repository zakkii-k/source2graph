export const SupportedLanguage = {
  Java: 'java',
  TypeScript: 'typescript',
  JavaScript: 'javascript',
  TypeScriptReact: 'typescriptreact',
  JavaScriptReact: 'javascriptreact',
  Scala: 'scala',
} as const

export type SupportedLanguage = (typeof SupportedLanguage)[keyof typeof SupportedLanguage]

const extensionMap: Record<string, SupportedLanguage> = {
  '.java': SupportedLanguage.Java,
  '.ts': SupportedLanguage.TypeScript,
  '.tsx': SupportedLanguage.TypeScriptReact,
  '.js': SupportedLanguage.JavaScript,
  '.mjs': SupportedLanguage.JavaScript,
  '.cjs': SupportedLanguage.JavaScript,
  '.jsx': SupportedLanguage.JavaScriptReact,
  '.scala': SupportedLanguage.Scala,
  '.sbt': SupportedLanguage.Scala,
}

export function getLanguageFromExtension(ext: string): SupportedLanguage | undefined {
  return extensionMap[ext.toLowerCase()]
}

export function isSupportedExtension(ext: string): boolean {
  return ext.toLowerCase() in extensionMap
}

// Normalize language for tree-sitter grammar selection
export function getTreeSitterLanguage(lang: SupportedLanguage): 'java' | 'typescript' | 'javascript' | 'scala' {
  switch (lang) {
    case SupportedLanguage.Java:
      return 'java'
    case SupportedLanguage.TypeScript:
    case SupportedLanguage.TypeScriptReact:
      return 'typescript'
    case SupportedLanguage.JavaScript:
    case SupportedLanguage.JavaScriptReact:
      return 'javascript'
    case SupportedLanguage.Scala:
      return 'scala'
  }
}
