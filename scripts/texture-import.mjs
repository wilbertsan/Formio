// Gera os assets das texturas importadas do porta-lata a partir dos STLs de files/.
// Uso: node scripts/texture-import.mjs [--check]
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  readBinaryStl,
  unwrapCylinder,
} from '../src/features/studio/tools/lembrancinhas/porta-lata/textureImport.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TARGET_DIR = join(
  ROOT,
  'src/features/studio/tools/lembrancinhas/porta-lata',
)
const METADATA_FILE = join(TARGET_DIR, 'importedTextures.ts')
const DATA_FILE = join(TARGET_DIR, 'importedTextureData.ts')

const HEADER = '// Gerado por scripts/texture-import.mjs — não editar à mão.'

const SOURCES = [
  { file: '24tiles1inchgrid.stl', id: 'azulejos', label: 'Azulejos 1"' },
  { file: 'Mosaic_Tile.stl', id: 'mosaico', label: 'Mosaico' },
  { file: 'Small_Bricks.stl', id: 'tijolos_pequenos', label: 'Tijolos pequenos' },
  { file: 'Small_broken_plaster.stl', id: 'reboco_pequeno', label: 'Reboco quebrado pequeno' },
  { file: 'brick.stl', id: 'tijolos_rusticos', label: 'Tijolos rústicos' },
  { file: 'broken_plaster.stl', id: 'reboco_quebrado', label: 'Reboco quebrado' },
  { file: 'clean_bricks.stl', id: 'tijolos_limpos', label: 'Tijolos limpos' },
  { file: 'cobble.stl', id: 'paralelepipedos', label: 'Paralelepípedos' },
  { file: 'cobble_smooth_edges.stl', id: 'paralelepipedos_suaves', label: 'Paralelepípedos suaves' },
  { file: 'diamond_plate.stl', id: 'placa_diamantada', label: 'Placa diamantada' },
  { file: 'hex_stone.stl', id: 'pedra_hexagonal', label: 'Pedra hexagonal' },
  { file: 'road.stl', id: 'asfalto', label: 'Asfalto' },
  { file: 'scifi_hex.stl', id: 'hex_scifi', label: 'Hex sci-fi' },
  { file: 'smallscifihex.stl', id: 'hex_scifi_pequeno', label: 'Hex sci-fi pequeno' },
]

/** Arredonda para duas casas, como na metadata gerada. */
function round2(value) {
  return Math.round(value * 100) / 100
}

/** Literal TS de string com aspas simples, escapando o necessário. */
function quote(value) {
  const escaped = value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")
  return `'${escaped}'`
}

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
}

function unwrap(file) {
  const path = join(ROOT, 'files', file)
  let buffer
  try {
    buffer = readFileSync(path)
  } catch (error) {
    throw new Error(`Falha ao ler ${file}: ${error.message}`)
  }
  try {
    return unwrapCylinder(readBinaryStl(toArrayBuffer(buffer)))
  } catch (error) {
    throw new Error(`Falha ao desenrolar ${file}: ${error.message}`)
  }
}

function renderMetadata(entries) {
  const ids = entries.map((entry) => `  ${quote(entry.id)},`).join('\n')
  const records = entries
    .map(
      (entry) =>
        `  ${entry.id}: { label: ${quote(entry.label)}, nativeDepth: ${entry.nativeDepth}, ` +
        `maxSlopeDeg: ${entry.maxSlopeDeg}, width: ${entry.width}, height: ${entry.height} },`,
    )
    .join('\n')

  return `${HEADER}
export const IMPORTED_TEXTURE_IDS = [
${ids}
] as const

export type ImportedTextureId = (typeof IMPORTED_TEXTURE_IDS)[number]

export interface ImportedTextureMeta {
  label: string
  nativeDepth: number
  maxSlopeDeg: number
  width: number
  height: number
}

export const IMPORTED_TEXTURES: Record<ImportedTextureId, ImportedTextureMeta> = {
${records}
}
`
}

function renderData(entries) {
  const records = entries
    .map((entry) => `  ${entry.id}:\n    ${quote(entry.base64)},`)
    .join('\n')

  return `${HEADER}
import type { ImportedTextureId } from './importedTextures'

export const IMPORTED_TEXTURE_DATA: Record<ImportedTextureId, string> = {
${records}
}
`
}

function generate() {
  const entries = SOURCES.map((source) => {
    const map = unwrap(source.file)
    return {
      id: source.id,
      label: source.label,
      nativeDepth: round2(map.nativeDepth),
      maxSlopeDeg: round2(map.maxSlopeDeg),
      width: map.width,
      height: map.height,
      base64: Buffer.from(map.data).toString('base64'),
    }
  })

  return {
    entries,
    files: [
      { path: METADATA_FILE, content: renderMetadata(entries) },
      { path: DATA_FILE, content: renderData(entries) },
    ],
  }
}

function printTable(entries) {
  const rows = entries.map((entry) => [
    entry.id,
    entry.nativeDepth.toFixed(2),
    entry.maxSlopeDeg.toFixed(2),
  ])
  const header = ['id', 'nativeDepth', 'maxSlopeDeg']
  const widths = header.map((title, column) =>
    Math.max(title.length, ...rows.map((row) => row[column].length)),
  )
  const format = (cells) =>
    cells.map((cell, column) => cell.padEnd(widths[column])).join('  ')

  console.log(format(header))
  console.log(widths.map((width) => '-'.repeat(width)).join('  '))
  for (const row of rows) console.log(format(row))
}

function preview(line) {
  if (line === undefined) return '(fim do arquivo)'
  return line.length > 120 ? `${line.slice(0, 117)}...` : line
}

/** Compara o conteúdo gerado ao arquivo em disco e imprime a primeira diferença. */
function compare(file) {
  let current = null
  try {
    current = readFileSync(file.path, 'utf8')
  } catch {
    current = null
  }
  if (current === file.content) return true

  const name = relative(ROOT, file.path)
  if (current === null) {
    console.error(`${name}: arquivo ausente`)
    return false
  }
  const expected = file.content.split('\n')
  const actual = current.split('\n')
  const count = Math.max(expected.length, actual.length)
  for (let i = 0; i < count; i++) {
    if (expected[i] !== actual[i]) {
      console.error(`${name}: linha ${i + 1} difere`)
      console.error(`  esperado: ${preview(expected[i])}`)
      console.error(`  atual:    ${preview(actual[i])}`)
      break
    }
  }
  return false
}

const check = process.argv.includes('--check')
const { entries, files } = generate()

if (check) {
  const updated = files.map(compare).every(Boolean)
  if (!updated) {
    console.error('assets desatualizados: rode node scripts/texture-import.mjs')
    process.exit(1)
  }
  console.log('assets atualizados')
} else {
  for (const file of files) {
    const temporary = `${file.path}.tmp`
    writeFileSync(temporary, file.content)
    renameSync(temporary, file.path)
  }
  printTable(entries)
  console.log(`\n${files.length} arquivos gerados em ${relative(ROOT, TARGET_DIR)}`)
}
