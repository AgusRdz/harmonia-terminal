#!/usr/bin/env bash
# Installs every Harmonia variant for the terminals found on this machine (macOS and Linux),
# then checks the copies and reports which variant each terminal is set to. It never edits your
# config files; it prints the line to add instead.
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
dist="$root/dist"
config="${XDG_CONFIG_HOME:-$HOME/.config}"
variant="${1:-harmonia-dark}"
os="$(uname -s)"
failures=0
repo_tmp=""
trap 'rm -rf "$repo_tmp"' EXIT

if [ -t 1 ]; then green=$'\033[32m' yellow=$'\033[33m' red=$'\033[31m' reset=$'\033[0m'
else green='' yellow='' red='' reset=''
fi
ok() { printf '  %sok%s    %s\n' "$green" "$reset" "$1"; }
todo() { printf '  %stodo%s  %s\n' "$yellow" "$reset" "$1"; }
fail() { printf '  %sfail%s  %s\n' "$red" "$reset" "$1"; failures=$((failures + 1)); }
skip() { printf '  skip  %s\n' "$1"; }

if [ "$os" != Darwin ] && [ "$os" != Linux ]; then
  echo "Unsupported system: $os. On Windows use install.ps1." >&2
  exit 1
fi
if [ ! -d "$dist/ghostty" ]; then
  # Run without a clone (curl ... | bash): fetch the latest release into a temporary folder
  repo_tmp="$(mktemp -d)"
  tag="$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/AgusRdz/harmonia-terminal/releases/latest)"
  tag="${tag##*/}"
  case "$tag" in
    v*) ;;
    *) echo "No Harmonia release found on GitHub." >&2; exit 1 ;;
  esac
  echo "Downloading Harmonia $tag from GitHub..."
  curl -fsSL "https://github.com/AgusRdz/harmonia-terminal/archive/refs/tags/$tag.tar.gz" | tar -xz -C "$repo_tmp" --strip-components=1
  dist="$repo_tmp/dist"
fi
if [ ! -f "$dist/ghostty/$variant" ]; then
  echo "Unknown variant '$variant'. Available:" >&2
  ls "$dist/ghostty" | sed 's/^/  /' >&2
  exit 1
fi

# The display name ("Harmonia Dark") is what WezTerm and Kitty match on
name="$(sed -n 's/^name = "\(.*\)"$/\1/p' "$dist/wezterm/$variant.toml")"

has_app() { [ "$os" = Darwin ] && [ -d "/Applications/$1.app" ]; }
has_cmd() { command -v "$1" >/dev/null 2>&1; }

# Copies every file of dist/<target> matching the glob into dest and verifies each copy
install_files() {
  local target="$1" glob="$2" dest="$3" file
  mkdir -p "$dest"
  for file in "$dist/$target"/$glob; do
    cp "$file" "$dest/"
    if ! cmp -s "$file" "$dest/$(basename "$file")"; then
      fail "$target: $(basename "$file") differs after copy"
      return
    fi
  done
  ok "$target: $(ls "$dist/$target"/$glob | wc -l | tr -d ' ') themes in $dest"
}

# Prints the first non-comment line of a file matching a pattern
active_line() {
  [ -f "$1" ] && grep -v '^[[:space:]]*[#-]' "$1" | grep -m1 "$2" || true
}

echo "Installing Harmonia (selected variant: $variant)"

echo "Ghostty"
ghostty_bin=""
if has_app Ghostty; then ghostty_bin=/Applications/Ghostty.app/Contents/MacOS/ghostty
elif has_cmd ghostty; then ghostty_bin="$(command -v ghostty)"
fi
if [ -n "$ghostty_bin" ] || [ -d "$config/ghostty" ]; then
  # Ghostty only reads themes from here, even when its config is in ~/Library/Application Support
  install_files ghostty '*' "$config/ghostty/themes"
  ghostty_config=""
  for f in "$HOME/Library/Application Support/com.mitchellh.ghostty/config" \
           "$HOME/Library/Application Support/com.mitchellh.ghostty/config.ghostty" \
           "$config/ghostty/config" "$config/ghostty/config.ghostty"; do
    if [ -f "$f" ]; then ghostty_config="$f"; break; fi
  done
  line="$(active_line "$ghostty_config" '^[[:space:]]*theme[[:space:]]*=')"
  case "$line" in
    *harmonia*) ok "config: $line" ;;
    *) todo "add 'theme = $variant' to ${ghostty_config:-$config/ghostty/config}, then reload with Cmd+Shift+, (Linux: Ctrl+Shift+,)" ;;
  esac
  if [ -n "$ghostty_bin" ] && [ -n "$ghostty_config" ]; then
    if out="$("$ghostty_bin" +validate-config 2>&1)"; then ok "ghostty +validate-config passed"
    else fail "ghostty +validate-config: $out"
    fi
  fi
else
  skip "not installed"
fi

echo "iTerm2"
if has_app iTerm; then
  # Writing presets by name updates them in place; importing the .itermcolors files again would add copies
  for file in "$dist/iterm2"/*.itermcolors; do
    preset="$(basename "$file" .itermcolors)"
    defaults write com.googlecode.iterm2 "Custom Color Presets" -dict-add "$preset" \
      "$(sed -n '/^<plist/,/^<\/plist>/p' "$file" | sed '1d;$d')"
  done
  missing=""
  for file in "$dist/iterm2"/*.itermcolors; do
    preset="$(basename "$file" .itermcolors)"
    defaults read com.googlecode.iterm2 "Custom Color Presets" | grep -q "^    \"$preset\" =" || missing="$missing $preset"
  done
  if [ -z "$missing" ]; then ok "9 color presets in iTerm2"
  else fail "presets missing after install:$missing"
  fi
  todo "pick '$variant' in Settings > Profiles > Colors > Color Presets (pick it again after an update; profiles keep a copy of the colors)"
else
  skip "not installed"
fi

echo "Terminal.app"
if [ "$os" = Darwin ]; then
  # Same as iTerm2: written by name so reruns update the profiles; opening the .terminal files would open windows
  missing=""
  for file in "$dist/terminal-app"/*.terminal; do
    profile="$(plutil -extract name raw -o - "$file")"
    defaults write com.apple.Terminal "Window Settings" -dict-add "$profile" \
      "$(sed -n '/^<plist/,/^<\/plist>/p' "$file" | sed '1d;$d')"
    defaults export com.apple.Terminal - | plutil -extract "Window Settings" raw -o - - | grep -q -x "$profile" ||
      missing="$missing $profile"
  done
  if [ -z "$missing" ]; then ok "9 profiles in Terminal.app"
  else fail "profiles missing after install:$missing"
  fi
  default_profile="$(defaults read com.apple.Terminal "Default Window Settings" 2>/dev/null || true)"
  case "$default_profile" in
    Harmonia*) ok "default profile: $default_profile" ;;
    *) todo "in Settings > Profiles select $name and click Default; quit and reopen Terminal.app if the profiles don't show" ;;
  esac
else
  skip "macOS only"
fi

echo "WezTerm"
if has_app WezTerm || has_cmd wezterm || [ -d "$config/wezterm" ]; then
  install_files wezterm '*.toml' "$config/wezterm/colors"
  wezterm_config=""
  for f in "$HOME/.wezterm.lua" "$config/wezterm/wezterm.lua"; do
    if [ -f "$f" ]; then wezterm_config="$f"; break; fi
  done
  line="$(active_line "$wezterm_config" 'color_scheme')"
  case "$line" in
    *Harmonia*) ok "config: $(echo "$line" | sed 's/^[[:space:]]*//')" ;;
    *) todo "set config.color_scheme = '$name' in ${wezterm_config:-~/.wezterm.lua}" ;;
  esac
else
  skip "not installed"
fi

echo "Kitty"
if has_app kitty || has_cmd kitty || [ -d "$config/kitty" ]; then
  install_files kitty '*.conf' "$config/kitty/themes"
  # kitten themes saves a copy as current-theme.conf, so refresh it when it holds a Harmonia theme
  current="$config/kitty/current-theme.conf"
  current_name="$(sed -n '1s/^## name: //p' "$current" 2>/dev/null || true)"
  case "$current_name" in
    Harmonia*)
      source_file="$(grep -l -x "## name: $current_name" "$dist/kitty"/*.conf | head -1)"
      if [ -n "$source_file" ]; then
        cp "$source_file" "$current"
        ok "refreshed current-theme.conf ($current_name)"
      fi
      ;;
  esac
  if grep -q -i 'harmonia' "$current" 2>/dev/null && active_line "$config/kitty/kitty.conf" 'current-theme.conf' | grep -q .; then
    ok "config: $current_name"
  elif active_line "$config/kitty/kitty.conf" 'harmonia' | grep -q .; then
    ok "config: $(active_line "$config/kitty/kitty.conf" 'harmonia')"
  else
    todo "run 'kitten themes' and pick $name (User category), or add 'include themes/$variant.conf' to kitty.conf"
  fi
else
  skip "not installed"
fi

echo "Alacritty"
if has_app Alacritty || has_cmd alacritty || [ -d "$config/alacritty" ]; then
  install_files alacritty '*.toml' "$config/alacritty/themes"
  line="$(active_line "$config/alacritty/alacritty.toml" 'harmonia')"
  if [ -n "$line" ]; then ok "config: $line"
  else todo "add import = [\"${config/#$HOME/~}/alacritty/themes/$variant.toml\"] under [general] in $config/alacritty/alacritty.toml"
  fi
else
  skip "not installed"
fi

echo "Herdr"
if [ -d "$config/herdr-app" ]; then
  install_files herdr '*.json' "$config/herdr-app/themes"
  todo "pick a harmonia-* theme in Herdr's Settings"
else
  skip "not installed"
fi

echo
if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed."
  exit 1
fi
echo "Done. Restart or reload each terminal to see the new colors."
