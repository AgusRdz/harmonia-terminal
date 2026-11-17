# harmonia-terminal

Converts the [Harmonia](https://github.com/AgusRdz/harmonia-theme) VS Code theme into Windows Terminal color schemes and PowerShell color scripts. All nine variants are generated from harmonia-theme's published theme JSON, then tuned for long terminal sessions (see [Contrast](#contrast)).

## Variants

| | |
|---|---|
| ![Harmonia Dark](docs/images/harmonia-dark.png) | ![Harmonia Light](docs/images/harmonia-light.png) |
| ![Harmonia Aurora](docs/images/harmonia-aurora.png) | ![Harmonia Daybreak](docs/images/harmonia-daybreak.png) |
| ![Harmonia Moonlit](docs/images/harmonia-moonlit.png) | ![Harmonia Paper White](docs/images/harmonia-paper-white.png) |
| ![Harmonia Noir](docs/images/harmonia-noir.png) | ![Harmonia Dark High Contrast](docs/images/harmonia-dark-high-contrast.png) |
| ![Harmonia OLED True Black](docs/images/harmonia-oled-true-black.png) | |

## Layers

1. **Windows Terminal color schemes** (`dist/windows-terminal/harmonia.json`): background, foreground, cursor, selection and the 16 ANSI colors, as a fragment extension.
2. **PSReadLine colors** (`dist/powershell/harmonia-<variant>.ps1`): syntax highlighting while typing, predictions and selection.
3. **`$PSStyle` colors** (same script, PowerShell 7.2+): table headers, errors, warnings, progress, file listings.
4. **`Get-ChildItem` format** (`dist/powershell/harmonia-<variant>.format.ps1xml`, PowerShell 7.2+): the default table view with brightness hierarchy instead of more hues. Names carry the color, metadata (mode, size, older timestamps) is dim, and flags such as read-only or hidden get a single accent. The script loads it when `harmonia.format.ps1xml` sits next to it.
5. **oh-my-posh prompt** (`oh-my-posh/harmonia.omp.json`): user, path, git branch, and exit code on failure. It uses ANSI color names instead of hex, so it follows whichever Harmonia scheme Windows Terminal is using; one file covers every variant.

The PowerShell scripts work in PowerShell 7 and Windows PowerShell 5.1; settings the running version does not support are skipped.

## Install

Script:

```powershell
.\install.ps1 -Variant harmonia-dark
```

It copies the fragment to `%LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments\Harmonia\`, copies the chosen script to `~\.config\harmonia\harmonia.ps1` and its format file to `harmonia.format.ps1xml` beside it, copies the oh-my-posh theme to `~\.config\harmonia\harmonia.omp.json`, and prints the lines to add to `$PROFILE`. It does not edit your profile.

Manual:

1. Copy `dist/windows-terminal/harmonia.json` into the Fragments folder above.
2. Copy a `dist/powershell/harmonia-<variant>.ps1` somewhere stable, copy the matching `.format.ps1xml` next to it as `harmonia.format.ps1xml`, and add `. "<path>"` to `$PROFILE`.
3. Restart Windows Terminal and select a Harmonia scheme in the profile's Appearance settings.

PSReadLine and `Get-ChildItem` colors are baked per variant, so when you switch the Windows Terminal scheme, reinstall the matching variant too. Normal text uses the terminal's default foreground, so nothing turns unreadable in the meantime.

## Contrast

Every variant follows the same three-tier hierarchy, measured with WCAG contrast against the variant's background:

| Tier | What | Contrast |
|---|---|---|
| Normal | file names, today's timestamps, typed text | terminal default foreground |
| Accent | folders, flags, links, executables, scripts, table headers, syntax tokens | at least 7:1 (AAA) |
| Quiet | mode, size, older timestamps, dotfiles, dot-folders, comments, predictions | 4.5:1 to 5.5:1 (AA, kept below accents) |

Colors that miss their tier are moved along OKLCH lightness, keeping their hue, so a few accents in the light variants are darker than in the editor. `npm run build` fails if any generated foreground drops below 4.5:1.

## Troubleshooting

If PowerShell 7 starts with `Cannot load PSReadline module`, run `.\check-psreadline.ps1`. It reports, without changing anything, whether PSReadLine's Microsoft signing certificate is in your `CurrentUser\Disallowed` store (usually from answering `[V] Never run` at a publisher prompt). If it is, `.\fix-psreadline.ps1` backs the certificate up, removes it, and verifies PSReadLine loads; `.\fix-psreadline.ps1 -Undo` restores it. Machine-level or Group Policy entries are left alone.

## Update

Bump the pinned commit of `harmonia-theme` in `package.json`, then:

```
npm install
npm run build
npm run preview
.\scripts\screenshots.ps1
```

`npm run preview` writes `docs/preview.html` with every variant side by side; `scripts/screenshots.ps1` captures one image per variant into `docs/images/` using headless Edge. The `dist/` output is committed.
