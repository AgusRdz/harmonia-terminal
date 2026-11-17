import { toHex } from '../theme.js'
import { terminalPalette } from '../palette.js'

const hex = (rgb) => toHex(rgb).toLowerCase()
const list = (colors) => `[${colors.map((rgb) => `"${hex(rgb)}"`).join(', ')}]`

export function generateWezTerm(theme) {
  const p = terminalPalette(theme)
  const lines = [
    '[metadata]',
    `name = "${theme.name}"`,
    '',
    '[colors]',
    `foreground = "${hex(p.foreground)}"`,
    `background = "${hex(p.background)}"`,
    `cursor_bg = "${hex(p.cursor)}"`,
    `cursor_border = "${hex(p.cursor)}"`,
    `cursor_fg = "${hex(p.background)}"`,
    `selection_bg = "${hex(p.selection)}"`,
    `selection_fg = "${hex(p.foreground)}"`,
    `ansi = ${list(p.ansi.slice(0, 8))}`,
    `brights = ${list(p.ansi.slice(8))}`
  ]
  return lines.join('\n') + '\n'
}
