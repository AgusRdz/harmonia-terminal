import { toHex } from '../theme.js'
import { terminalPalette } from '../palette.js'

const hex = (rgb) => toHex(rgb).toLowerCase()
const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']

const section = (title, entries) => [`[${title}]`, ...entries.map(([key, rgb]) => `${key} = "${hex(rgb)}"`)]

export function generateAlacritty(theme) {
  const p = terminalPalette(theme)
  const lines = [
    ...section('colors.primary', [['background', p.background], ['foreground', p.foreground]]),
    '',
    ...section('colors.cursor', [['text', p.background], ['cursor', p.cursor]]),
    '',
    ...section('colors.selection', [['text', p.foreground], ['background', p.selection]]),
    '',
    ...section('colors.normal', names.map((n, i) => [n, p.ansi[i]])),
    '',
    ...section('colors.bright', names.map((n, i) => [n, p.ansi[i + 8]]))
  ]
  return lines.join('\n') + '\n'
}
