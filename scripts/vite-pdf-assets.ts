import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'
import { createRequire } from 'node:module'
import type { Plugin } from 'vite'

/** Ship PDF.js support data with the app; CJK fonts and scanned images work offline. */
export function pdfAssets(): Plugin {
  const require = createRequire(import.meta.url)
  const root = dirname(require.resolve('pdfjs-dist/package.json'))
  const files = new Map<string, string>()
  for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
    for (const name of readdirSync(join(root, folder)))
      files.set(`pdfjs/${folder}/${name}`, join(root, folder, name))
  }
  return {
    name: 'mirainote-pdf-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        const file = files.get(url.replace(/^\//, ''))
        if (!file) return next()
        res.setHeader(
          'Content-Type',
          extname(file) === '.wasm'
            ? 'application/wasm'
            : extname(file) === '.js'
              ? 'text/javascript'
              : 'application/octet-stream'
        )
        res.end(readFileSync(file))
      })
    },
    generateBundle() {
      for (const [fileName, file] of files)
        this.emitFile({ type: 'asset', fileName, source: readFileSync(file) })
    },
  }
}
