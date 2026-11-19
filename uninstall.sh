#!/usr/bin/env bash
# Removes the Harmonia themes install.sh copied (macOS and Linux) and the Harmonia color presets in
# iTerm2, then lists config lines that still point at Harmonia. It never edits your config files.
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
dist="$root/dist"
config="${XDG_CONFIG_HOME:-$HOME/.config}"
os="$(uname -s)"
failures=0
repo_tmp=""
presets_tmp=""
trap 'rm -rf "$repo_tmp" "$presets_tmp"' EXIT

if [ -t 1 ]; then green=$'\033[32m' yellow=$'\033[33m' red=$'\033[31m' reset=$'\033[0m'
else green='' yellow='' red='' reset=''
fi
ok() { printf '  %sok%s    %s\n' "$green" "$reset" "$1"; }
todo() { printf '  %stodo%s  %s\n' "$yellow" "$reset" "$1"; }
fail() { printf '  %sfail%s  %s\n' "$red" "$reset" "$1"; failures=$((failures + 1)); }
skip() { printf '  skip  %s\n' "$1"; }

if [ "$os" != Darwin ] && [ "$os" != Linux ]; then
  echo "Unsupported system: $os." >&2
  exit 1
fi
if [ ! -d "$dist/ghostty" ]; then
  # Run without a clone (curl ... | bash): fetch the repo into a temporary folder
  repo_tmp="$(mktemp -d)"
  echo "Downloading Harmonia from GitHub..."
  curl -fsSL https://github.com/AgusRdz/harmonia-terminal/archive/refs/heads/main.tar.gz | tar -xz -C "$repo_tmp" --strip-components=1
  dist="$repo_tmp/dist"
fi

# Removes only the files this repo ships, so other themes in the folder stay
remove_files() {
  local target="$1" glob="$2" dest="$3" file removed=0 left=""
  if [ ! -d "$dest" ]; then
    skip "$target: nothing installed"
    return
  fi
  for file in "$dist/$target"/$glob; do
    if [ -e "$dest/$(basename "$file")" ]; then
      rm "$dest/$(basename "$file")"
      removed=$((removed + 1))
    fi
    [ -e "$dest/$(basename "$file")" ] && left="$left $(basename "$file")"
  done
  if [ -n "$left" ]; then fail "$target: could not remove$left"
  elif [ "$removed" -eq 0 ]; then skip "$target: nothing installed"
  else ok "$target: removed $removed themes from $dest"
  fi
}

# Warns about non-comment lines in a config file that still mention Harmonia
check_config() {
  local file="$1" hint="$2" line
  [ -f "$file" ] || return 0
  while IFS= read -r line; do
    todo "$file still has: $(echo "$line" | sed 's/^[[:space:]]*//') ($hint)"
  done < <(grep -v '^[[:space:]]*[#-]' "$file" | grep -i 'harmonia' || true)
}

echo "Uninstalling Harmonia"

echo "Ghostty"
remove_files ghostty '*' "$config/ghostty/themes"
for f in "$HOME/Library/Application Support/com.mitchellh.ghostty/config" \
         "$HOME/Library/Application Support/com.mitchellh.ghostty/config.ghostty" \
         "$config/ghostty/config" "$config/ghostty/config.ghostty"; do
  check_config "$f" "Ghostty reports the theme as not found until you change it"
done

echo "iTerm2"
if [ "$os" = Darwin ] && defaults read com.googlecode.iterm2 "Custom Color Presets" >/dev/null 2>&1; then
  presets_tmp="$(mktemp)"
  tmp="$presets_tmp"
  defaults export com.googlecode.iterm2 "$tmp"
  # Also catches the "harmonia-dark (2)" copies that importing a preset twice creates
  presets="$(plutil -extract "Custom Color Presets" raw -o - "$tmp" | grep '^harmonia-' || true)"
  if [ -z "$presets" ]; then
    skip "no Harmonia presets"
  else
    count=0
    while IFS= read -r preset; do
      plutil -remove "Custom Color Presets.$preset" "$tmp"
      count=$((count + 1))
    done <<< "$presets"
    defaults write com.googlecode.iterm2 "Custom Color Presets" \
      "$(plutil -extract "Custom Color Presets" xml1 -o - "$tmp" | sed '1,3d;$d')"
    if defaults read com.googlecode.iterm2 "Custom Color Presets" | grep -q '^    "harmonia-'; then
      fail "Harmonia presets still in iTerm2"
    else
      ok "removed $count color presets"
      todo "profiles keep their own copy of the colors; pick another preset in Settings > Profiles > Colors"
    fi
  fi
else
  skip "not installed"
fi

echo "WezTerm"
remove_files wezterm '*.toml' "$config/wezterm/colors"
for f in "$HOME/.wezterm.lua" "$config/wezterm/wezterm.lua"; do
  check_config "$f" "WezTerm falls back to its default colors"
done

echo "Kitty"
remove_files kitty '*.conf' "$config/kitty/themes"
# current-theme.conf is kitten themes' copy and kitty.conf includes it, so it is left for kitten themes to replace
if sed -n '1p' "$config/kitty/current-theme.conf" 2>/dev/null | grep -q '^## name: Harmonia'; then
  todo "current-theme.conf is still a Harmonia theme; run 'kitten themes' and pick another"
fi
check_config "$config/kitty/kitty.conf" "Kitty fails to load the removed file"

echo "Alacritty"
remove_files alacritty '*.toml' "$config/alacritty/themes"
check_config "$config/alacritty/alacritty.toml" "Alacritty fails to load the removed file"

echo "Herdr"
remove_files herdr '*.json' "$config/herdr-app/themes"

echo
if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed."
  exit 1
fi
echo "Done."
