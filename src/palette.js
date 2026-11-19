import { color, contrast, toTier } from './theme.js'

const names = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White']

// Black and white double as backgrounds (prompt segments, inverse video), so they stay as designed
const asDesigned = new Set([0, 7])

// The 16 ANSI colors plus base colors shared by every terminal emulator target, adjusted for legibility
export function terminalPalette(theme) {
  const background = color(theme, 'editor.background')
  const foreground = color(theme, 'editor.foreground')
  const raw = [
    ...names.map((n) => color(theme, `terminal.ansi${n}`)),
    ...names.map((n) => color(theme, `terminal.ansiBright${n}`))
  ]
  // No color may be louder than normal text, so bright colors and bright white don't glare
  const normal = contrast(foreground, background)
  const ansi = raw.map((rgb, i) => {
    if (asDesigned.has(i)) return rgb
    // Bright black is the de facto dim text color (autosuggestions, comments); the rest are also fills, so AA rather than AAA
    return toTier(theme, `ansi${i}`, i === 8 ? 'quiet' : 'aa', rgb, background, normal)
  })
  return {
    background,
    foreground,
    cursor: color(theme, 'terminalCursor.foreground'),
    selection: toTier(theme, 'selection background', 'aa', color(theme, 'terminal.selectionBackground'), foreground),
    ansi
  }
}
