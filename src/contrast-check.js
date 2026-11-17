import { readFileSync } from 'fs'
import { join } from 'path'
import { color, contrast, toHex } from './theme.js'

export const minContrast = 4.5

const fgPattern = /(?<![0-9])38;2;(\d+);(\d+);(\d+)/g
const bgPattern = /(?<![0-9])48;2;(\d+);(\d+);(\d+)/

// Parses the generated files rather than the role list so code paths that bypass the helpers are caught
export function checkContrast(themes, dir) {
  let count = 0
  let min = Infinity
  const failures = []

  for (const theme of themes) {
    const editorBg = color(theme, 'editor.background')
    for (const file of [`${theme.slug}.ps1`, `${theme.slug}.format.ps1xml`]) {
      const text = readFileSync(join(dir, file), 'utf8')
      for (const m of text.matchAll(fgPattern)) {
        // The sequence is the run of digits and semicolons around the match; a 48;2 in it is the real background
        let start = m.index
        let end = m.index + m[0].length
        while (start > 0 && /[0-9;]/.test(text[start - 1])) start--
        while (end < text.length && /[0-9;]/.test(text[end])) end++
        const bgMatch = text.slice(start, end).match(bgPattern)
        const bg = bgMatch ? bgMatch.slice(1).map(Number) : editorBg
        const fg = [m[1], m[2], m[3]].map(Number)
        const ratio = contrast(fg, bg)
        count++
        min = Math.min(min, ratio)
        if (ratio < minContrast) {
          failures.push(`${theme.slug} ${file}: ${toHex(fg)} on ${toHex(bg)} is ${ratio.toFixed(2)}:1 (need ${minContrast}:1)`)
        }
      }
    }
  }

  if (failures.length) {
    throw new Error(`Contrast check failed:\n${failures.map((f) => `  ${f}`).join('\n')}`)
  }
  return { count, min }
}
