import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { loadThemes, color, toHex } from '../src/theme.js'
import { formatPalette } from '../src/targets/powershell-format.js'
import { terminalPalette } from '../src/palette.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist', 'powershell')
const out = join(root, 'docs', 'preview.html')

// Read colors back from the generated scripts so the preview shows exactly what ships
function scriptColor(text, role) {
  const m = text.match(new RegExp(String.raw`(?:^|[ .])${role} = "[^"]*?38;2;(\d+);(\d+);(\d+)`, 'm'))
  if (!m) throw new Error(`preview: no color for ${role}`)
  return toHex(m.slice(1).map(Number))
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const span = (hex, text, bold = false) => `<span style="color:${hex}${bold ? ';font-weight:bold' : ''}">${esc(text)}</span>`

function section(theme) {
  const text = readFileSync(join(dist, `${theme.slug}.ps1`), 'utf8')
  const c = (role) => scriptColor(text, role)
  const { quiet, accent } = formatPalette(theme)
  const q = Object.fromEntries(Object.entries(quiet).map(([k, v]) => [k, toHex(v)]))
  const a = Object.fromEntries(Object.entries(accent).map(([k, v]) => [k, toHex(v)]))
  const bg = toHex(color(theme, 'editor.background'))
  const fg = toHex(color(theme, 'editor.foreground'))

  const mode = (m) => [...m].map((ch) =>
    ch === 'd' ? span(a.folder, ch) : 'rhs'.includes(ch) ? span(a.flag, ch) : ch === 'l' ? span(a.link, ch) : span(q.dim, ch)
  ).join('')
  const row = (m, date, len, name, today = false) =>
    `${mode(m.padEnd(7))} ${span(today ? fg : q.dim, date.padStart(19))} ${span(q.dim, len.padStart(14))} ${name}`
  const header = c('TableHeader')

  const lines = [
    `    ${span(q.dim, 'Directory:')} ${span(fg, 'C:\\dev\\app')}`,
    '',
    `${span(header, 'Mode'.padEnd(7), true)} ${span(header, 'LastWriteTime'.padStart(19), true)} ${span(header, 'Length'.padStart(14), true)} ${span(header, 'Name', true)}`,
    `${span(header, '----'.padEnd(7))} ${span(header, '-------------'.padStart(19))} ${span(header, '------'.padStart(14))} ${span(header, '----')}`,
    row('d----', '11/17/2026  9:14 AM', '', span(c('Directory'), 'src', true), true),
    row('d--h-', '11/10/2026  4:02 PM', '', span(q.softFolder, '.git')),
    row('-a---', '11/10/2026  4:02 PM', '412', span(q.muted, '.gitignore')),
    row('-a---', '11/17/2026  9:20 AM', '1284', span(fg, 'index.js'), true),
    row('-a---', ' 11/3/2026  1:45 PM', '3071', span(c(String.raw`Extension\['\.ps1'\]`), 'build.ps1')),
    row('-a---', '10/28/2026  8:30 AM', '88320', span(c('Executable'), 'tool.exe')),
    row('-ar--', ' 10/2/2026  2:11 PM', '96', span(fg, 'LICENSE')),
    row('la---', ' 9/30/2026  7:00 AM', '', span(c('SymbolicLink'), 'shared -> ..\\shared'))
  ]
  const typed = [
    span(c('Command'), 'Get-ChildItem'), ' ', span(c('Parameter'), '-Recurse'), ' ', span(c('Operator'), '|'), ' ',
    span(c('Command'), 'Where-Object'), ' ', span(c('Operator'), '{'), ' ', span(c('Variable'), '$_'), span(fg, '.'),
    span(c('Member'), 'Length'), ' ', span(c('Operator'), '-gt'), ' ', span(c('Number'), '1024'), ' ', span(c('Operator'), '}'), ' ',
    span(c('Comment'), '# large files'), span(c('InlinePrediction'), ' | Select -First 5')
  ].join('')
  // Same layout as the README's printf check, so the two can be compared side by side
  const ansi = terminalPalette(theme).ansi.map(toHex)
  const ansiRow = (from) => ansi.slice(from, from + 8).map((hex, i) => span(hex, String(from + i).padStart(3))).join(' ')

  return `<section id="${theme.slug}" style="background:${bg};color:${fg}">
<h2>${esc(theme.name)}</h2>
<pre>${lines.join('\n')}

${span(fg, 'PS> ')}${typed}

${ansiRow(0)}
${ansiRow(8)}</pre>
</section>`
}

const themes = loadThemes()
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `<!doctype html>
<html><head><meta charset="utf-8"><title>Harmonia terminal preview</title>
<style>
body{margin:0;padding:16px;background:#808080;font-family:Consolas,'Cascadia Mono',monospace}
section{margin:0 0 16px;padding:14px 18px;border-radius:6px;overflow-x:auto}
h2{margin:0 0 10px;font:600 14px Consolas,'Cascadia Mono',monospace}
pre{margin:0;font:14px/1.4 Consolas,'Cascadia Mono',monospace}
body.single{padding:0;background:transparent}
body.single section{margin:0;border-radius:0;min-height:100vh;box-sizing:border-box}
</style></head><body>
${themes.map(section).join('\n')}
<script>
// ?variant=<slug> shows one variant edge to edge, used for the README screenshots
const v = new URLSearchParams(location.search).get('variant')
if (v) {
  document.body.classList.add('single')
  for (const s of document.querySelectorAll('section')) if (s.id !== v) s.remove()
}
</script>
</body></html>
`)
console.log(`Wrote ${out}`)
