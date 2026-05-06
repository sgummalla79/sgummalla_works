/**
 * Generates dist/index.d.ts — the package types entry point.
 * Run after vue-tsc --emitDeclarationOnly so dist/src/** exists.
 */
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outFile = resolve(__dirname, '../dist/index.d.ts')

writeFileSync(outFile, `export * from './src/index'\n`)
console.log('[Sgummalla Works] Generated dist/index.d.ts')
