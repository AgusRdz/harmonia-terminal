import { terminalPalette } from '../palette.js'

const component = (value) => (value / 255).toFixed(6).replace(/0+$/, '').replace(/\.$/, '.0')

function entry(key, rgb) {
  const [red, green, blue] = rgb
  return [
    `\t<key>${key}</key>`,
    '\t<dict>',
    '\t\t<key>Alpha Component</key>',
    '\t\t<real>1</real>',
    '\t\t<key>Blue Component</key>',
    `\t\t<real>${component(blue)}</real>`,
    '\t\t<key>Color Space</key>',
    '\t\t<string>sRGB</string>',
    '\t\t<key>Green Component</key>',
    `\t\t<real>${component(green)}</real>`,
    '\t\t<key>Red Component</key>',
    `\t\t<real>${component(red)}</real>`,
    '\t</dict>'
  ]
}

export function generateITerm2(theme) {
  const p = terminalPalette(theme)
  const entries = [
    ...p.ansi.map((rgb, i) => [`Ansi ${i} Color`, rgb]),
    ['Background Color', p.background],
    ['Bold Color', p.foreground],
    ['Cursor Color', p.cursor],
    ['Cursor Text Color', p.background],
    ['Foreground Color', p.foreground],
    ['Selected Text Color', p.foreground],
    ['Selection Color', p.selection]
  ]
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    ...entries.flatMap(([key, rgb]) => entry(key, rgb)),
    '</dict>',
    '</plist>'
  ].join('\n') + '\n'
}
