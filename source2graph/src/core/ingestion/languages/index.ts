import type { LanguageProvider } from '../language-provider.js'
import { javaProvider } from './java.js'
import { typescriptProvider, tsxProvider } from './typescript.js'
import { javascriptProvider } from './javascript.js'
import { scalaProvider } from './scala.js'

const providers: LanguageProvider[] = [
  javaProvider,
  typescriptProvider,
  tsxProvider,
  javascriptProvider,
  scalaProvider,
]

const extensionToProvider = new Map<string, LanguageProvider>()
for (const provider of providers) {
  for (const ext of provider.extensions) {
    extensionToProvider.set(ext, provider)
  }
}

export function getProviderForExtension(ext: string): LanguageProvider | undefined {
  return extensionToProvider.get(ext.toLowerCase())
}

export { javaProvider, typescriptProvider, tsxProvider, javascriptProvider, scalaProvider }
