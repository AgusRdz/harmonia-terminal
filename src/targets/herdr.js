import { color, contrast, toHex, toTier, tiers } from '../theme.js'
import { terminalPalette } from '../palette.js'

const hex = (rgb) => toHex(rgb).toLowerCase()

// Fits a text color to its tier against the terminal background, then confirms it holds on every surface it sits on
function textRole(theme, role, tier, rgb, surfaces) {
  const fitted = toTier(theme, role, tier, rgb, surfaces[0])
  const { min, max = Infinity } = tiers[tier]
  for (const surface of surfaces) {
    const ratio = contrast(fitted, surface)
    if (ratio < min || ratio > max) {
      throw new Error(`${theme.slug}: ${role} ${toHex(fitted)} on ${toHex(surface)} is ${ratio.toFixed(2)}:1, outside ${tier} tier [${min}, ${max}]`)
    }
  }
  return fitted
}

function pair(theme, role, fg, bg) {
  const ratio = contrast(fg, bg)
  if (ratio < tiers.aa.min) {
    throw new Error(`${theme.slug}: ${role} ${toHex(fg)} on ${toHex(bg)} is ${ratio.toFixed(2)}:1, below ${tiers.aa.min}:1`)
  }
}

// Herdr derives every panel color from the terminal colors; only roles the editor UI maps onto cleanly are overridden
function herdrTheme(theme) {
  const palette = terminalPalette(theme)
  const chrome = color(theme, 'sideBar.background')
  const surfaces = [palette.background, chrome]
  const c = (key) => color(theme, key)
  // Status colors render as text (group labels, "Needs you"), so they follow the accent tier
  const text = (role, tier, key) => textRole(theme, role, tier, c(key), surfaces)

  const accent = text('accent', 'accent', 'activityBar.activeBorder')
  const accentForeground = c('badge.foreground')
  const solid = c('button.background')
  const solidForeground = c('button.foreground')
  pair(theme, 'accent_foreground', accentForeground, accent)
  pair(theme, 'solid_foreground', solidForeground, solid)

  const colors = {
    chrome,
    surface: c('editorWidget.background'),
    popover: c('menu.background'),
    raised: c('tab.inactiveBackground'),
    hover: c('list.hoverBackground'),
    selected: c('list.activeSelectionBackground'),
    border: c('sideBar.border'),
    input: c('input.border'),
    muted: text('muted', 'quiet', 'descriptionForeground'),
    dim: text('dim', 'quiet', 'editorLineNumber.foreground'),
    accent,
    accent_foreground: accentForeground,
    solid,
    solid_foreground: solidForeground,
    working: text('working', 'accent', 'editorInfo.foreground'),
    blocked: text('blocked', 'accent', 'editorWarning.foreground'),
    done: text('done', 'accent', 'testing.iconPassed')
  }

  return {
    background: hex(palette.background),
    foreground: hex(palette.foreground),
    selection: hex(palette.selection),
    cursor: hex(palette.cursor),
    ansi: palette.ansi.map(hex),
    colors: Object.fromEntries(Object.entries(colors).map(([key, rgb]) => [key, hex(rgb)]))
  }
}

export function generateHerdr(theme) {
  return JSON.stringify(herdrTheme(theme), null, 2) + '\n'
}
