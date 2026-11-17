import { toHex } from '../theme.js'
import { terminalPalette } from '../palette.js'

const hex = (rgb) => toHex(rgb).toLowerCase()

export function generateKitty(theme) {
  const p = terminalPalette(theme)
  const lines = [
    `## name: ${theme.name}`,
    '',
    `foreground ${hex(p.foreground)}`,
    `background ${hex(p.background)}`,
    `selection_foreground ${hex(p.foreground)}`,
    `selection_background ${hex(p.selection)}`,
    `cursor ${hex(p.cursor)}`,
    `cursor_text_color ${hex(p.background)}`,
    '',
    ...p.ansi.map((rgb, i) => `color${i} ${hex(rgb)}`)
  ]
  return lines.join('\n') + '\n'
}
