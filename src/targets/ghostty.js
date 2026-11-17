import { toHex } from '../theme.js'
import { terminalPalette } from '../palette.js'

const hex = (rgb) => toHex(rgb).toLowerCase()

export function generateGhostty(theme) {
  const p = terminalPalette(theme)
  const lines = [
    `background = ${hex(p.background)}`,
    `foreground = ${hex(p.foreground)}`,
    `cursor-color = ${hex(p.cursor)}`,
    `cursor-text = ${hex(p.background)}`,
    `selection-background = ${hex(p.selection)}`,
    `selection-foreground = ${hex(p.foreground)}`,
    ...p.ansi.map((rgb, i) => `palette = ${i}=${hex(rgb)}`)
  ]
  return lines.join('\n') + '\n'
}
