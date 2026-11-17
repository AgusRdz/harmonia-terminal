import { toHex } from '../theme.js'
import { terminalPalette } from '../palette.js'

const ansi = ['black', 'red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'white']

function scheme(theme) {
  const palette = terminalPalette(theme)
  const result = {
    name: theme.name,
    background: toHex(palette.background),
    foreground: toHex(palette.foreground),
    cursorColor: toHex(palette.cursor),
    selectionBackground: toHex(palette.selection)
  }
  ansi.forEach((key, i) => {
    result[key] = toHex(palette.ansi[i])
    result[`bright${key[0].toUpperCase()}${key.slice(1)}`] = toHex(palette.ansi[i + 8])
  })
  return result
}

export function generateWindowsTerminal(themes) {
  return JSON.stringify({ schemes: themes.map(scheme) }, null, 2) + '\n'
}
