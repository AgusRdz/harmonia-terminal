import { color, toHex } from '../theme.js'

const ansi = {
  black: 'Black',
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  blue: 'Blue',
  purple: 'Magenta',
  cyan: 'Cyan',
  white: 'White'
}

function scheme(theme) {
  const hex = (key) => toHex(color(theme, key))
  const result = {
    name: theme.name,
    background: hex('editor.background'),
    foreground: hex('editor.foreground'),
    cursorColor: hex('terminalCursor.foreground'),
    selectionBackground: hex('terminal.selectionBackground')
  }
  for (const [key, suffix] of Object.entries(ansi)) {
    result[key] = hex(`terminal.ansi${suffix}`)
  }
  for (const [key, suffix] of Object.entries(ansi)) {
    const bright = `bright${key[0].toUpperCase()}${key.slice(1)}`
    result[bright] = hex(`terminal.ansiBright${suffix}`)
  }
  return result
}

export function generateWindowsTerminal(themes) {
  return JSON.stringify({ schemes: themes.map(scheme) }, null, 2) + '\n'
}
