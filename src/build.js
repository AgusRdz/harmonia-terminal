import { mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { loadThemes } from './theme.js'
import { generateWindowsTerminal } from './targets/windows-terminal.js'
import { generateHerdr } from './targets/herdr.js'
import { generateGhostty } from './targets/ghostty.js'
import { generateITerm2 } from './targets/iterm2.js'
import { generateWezTerm } from './targets/wezterm.js'
import { generateKitty } from './targets/kitty.js'
import { generateAlacritty } from './targets/alacritty.js'
import { generateTerminalApp } from './targets/terminal-app.js'
import { generatePowerShell } from './targets/powershell.js'
import { generatePowerShellFormat } from './targets/powershell-format.js'
import { checkContrast } from './contrast-check.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = join(__dirname, '..', 'dist')
const themes = loadThemes()

mkdirSync(join(dist, 'windows-terminal'), { recursive: true })
mkdirSync(join(dist, 'powershell'), { recursive: true })
mkdirSync(join(dist, 'herdr'), { recursive: true })
for (const dir of ['ghostty', 'iterm2', 'wezterm', 'kitty', 'alacritty', 'terminal-app']) mkdirSync(join(dist, dir), { recursive: true })

writeFileSync(join(dist, 'windows-terminal', 'harmonia.json'), generateWindowsTerminal(themes))

for (const theme of themes) {
  writeFileSync(join(dist, 'powershell', `${theme.slug}.ps1`), generatePowerShell(theme))
  writeFileSync(join(dist, 'powershell', `${theme.slug}.format.ps1xml`), generatePowerShellFormat(theme))
  writeFileSync(join(dist, 'herdr', `${theme.slug}.json`), generateHerdr(theme))
  writeFileSync(join(dist, 'ghostty', theme.slug), generateGhostty(theme))
  writeFileSync(join(dist, 'iterm2', `${theme.slug}.itermcolors`), generateITerm2(theme))
  writeFileSync(join(dist, 'wezterm', `${theme.slug}.toml`), generateWezTerm(theme))
  writeFileSync(join(dist, 'kitty', `${theme.slug}.conf`), generateKitty(theme))
  writeFileSync(join(dist, 'alacritty', `${theme.slug}.toml`), generateAlacritty(theme))
  writeFileSync(join(dist, 'terminal-app', `${theme.slug}.terminal`), generateTerminalApp(theme))
}

try {
  const { count, min } = checkContrast(themes, join(dist, 'powershell'))
  console.log(`Contrast check: ${count} foreground colors, minimum ${min.toFixed(2)}:1`)
} catch (err) {
  console.error(err.message)
  process.exit(1)
}

console.log(`Built ${themes.length} themes into ${dist}`)
