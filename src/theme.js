import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const themesDir = join(__dirname, '..', 'node_modules', 'harmonia-theme', 'themes')

export function loadThemes() {
  return readdirSync(themesDir)
    .filter((file) => file.endsWith('-color-theme.json'))
    .sort()
    .map((file) => {
      const json = JSON.parse(readFileSync(join(themesDir, file), 'utf8'))
      return {
        slug: file.replace(/-color-theme\.json$/, ''),
        name: json.name,
        type: json.type,
        colors: json.colors,
        tokenColors: json.tokenColors
      }
    })
}

function parseHex(hex) {
  let h = hex.replace(/^#/, '')
  if (h.length === 3 || h.length === 4) {
    h = [...h].map((c) => c + c).join('')
  }
  if (!/^([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(h)) {
    throw new Error(`Unsupported color: ${hex}`)
  }
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  const alpha = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  return { rgb, alpha }
}

// Terminals have no alpha channel, so translucent colors are flattened onto the editor background
export function toRgb(theme, hex) {
  const { rgb, alpha } = parseHex(hex)
  if (alpha === 1) return rgb
  const bg = parseHex(theme.colors['editor.background']).rgb
  return rgb.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)))
}

export function color(theme, key) {
  const value = theme.colors[key]
  if (!value) throw new Error(`${theme.name}: missing color ${key}`)
  return toRgb(theme, value)
}

export function toHex(rgb) {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function scopesOf(rule) {
  const list = Array.isArray(rule.scope) ? rule.scope : [rule.scope ?? '']
  return list.flatMap((s) => s.split(',')).map((s) => s.trim())
}

export function resolveScope(theme, scope) {
  let match = null
  for (const rule of theme.tokenColors) {
    if (rule.settings?.foreground && scopesOf(rule).includes(scope)) match = rule
  }
  if (!match) {
    return { rgb: color(theme, 'editor.foreground'), fontStyle: '' }
  }
  return {
    rgb: toRgb(theme, match.settings.foreground),
    fontStyle: match.settings.fontStyle ?? ''
  }
}

// WCAG 2.x relative luminance of an sRGB triplet
export function luminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const toLinear = (c) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const fromLinear = (v) => {
  const c = Math.min(1, Math.max(0, v))
  return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055))
}

// sRGB to OKLCH [L, C, h in degrees] (Bjorn Ottosson's OKLab)
export function toOklch(rgb) {
  const [r, g, b] = rgb.map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360]
}

function oklchToLinear(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ]
}

// Out-of-gamut colors lose chroma, not hue or lightness
function fromOklch(L, C, h) {
  const eps = 1e-4
  const inGamut = ([r, g, b]) => [r, g, b].every((v) => v >= -eps && v <= 1 + eps)
  let lin = oklchToLinear(L, C, h)
  if (!inGamut(lin)) {
    let lo = 0
    let hi = C
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(oklchToLinear(L, mid, h))) lo = mid
      else hi = mid
    }
    lin = oklchToLinear(L, lo, h)
  }
  return lin.map(fromLinear)
}

// Moves only OKLCH lightness (hue kept, chroma reduced only to stay in sRGB) until contrast against bg
// lies in [min, max]. Too low: away from bg. Too high: toward bg's lightness. Smallest move that fits.
export function fitContrast(rgb, bg, min, max = Infinity) {
  const ratio = contrast(rgb, bg)
  if (ratio >= min && ratio <= max) return rgb
  const [L, C, h] = toOklch(rgb)
  const raise = ratio < min
  const lighter = contrast([255, 255, 255], bg) > contrast([0, 0, 0], bg)
  const end = raise ? (lighter ? 1 : 0) : toOklch(bg)[0]
  const at = (t) => fromOklch(L + (end - L) * t, C, h)
  const ok = (c) => (raise ? contrast(c, bg) >= min : contrast(c, bg) <= max)
  if (!ok(at(1))) return at(1)
  let lo = 0
  let hi = 1
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (ok(at(mid))) hi = mid
    else lo = mid
  }
  return at(hi)
}

export const tiers = {
  accent: { min: 7 },
  quiet: { min: 4.5, max: 5.5 }
}

// Fits rgb to its tier and throws if the result still misses it, so a bad role fails the build
export function toTier(theme, role, tier, rgb, bg) {
  const { min, max = Infinity } = tiers[tier]
  const fitted = fitContrast(rgb, bg, min, max)
  const ratio = contrast(fitted, bg)
  if (ratio < min || ratio > max) {
    throw new Error(`${theme.slug}: ${role} ${toHex(fitted)} on ${toHex(bg)} is ${ratio.toFixed(2)}:1, outside ${tier} tier [${min}, ${max}]`)
  }
  return fitted
}
