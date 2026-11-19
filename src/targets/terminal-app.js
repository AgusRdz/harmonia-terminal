import { terminalPalette } from '../palette.js'

const names = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White']
const component = (value) => (value / 255).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
const base64 = (text) => Buffer.from(text, 'latin1').toString('base64')
const uid = (n) => `<dict><key>CF$UID</key><integer>${n}</integer></dict>`
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Terminal.app stores each color as a keyed-archived NSColor. Naming the sRGB color space by its
// NSID (7) instead of embedding its ICC profile keeps each color small and decodes to exact sRGB.
function archivedColor(rgb) {
  const values = rgb.map(component).join(' ')
  const archive = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0"><dict>',
    '<key>$archiver</key><string>NSKeyedArchiver</string>',
    '<key>$objects</key><array>',
    '<string>$null</string>',
    `<dict><key>$class</key>${uid(4)}<key>NSColorSpace</key><integer>1</integer>` +
      `<key>NSComponents</key><data>${base64(`${values} 1`)}</data>` +
      `<key>NSCustomColorSpace</key>${uid(2)}` +
      `<key>NSRGB</key><data>${base64(`${values}\0`)}</data></dict>`,
    `<dict><key>$class</key>${uid(3)}<key>NSID</key><integer>7</integer></dict>`,
    '<dict><key>$classes</key><array><string>NSColorSpace</string><string>NSObject</string></array><key>$classname</key><string>NSColorSpace</string></dict>',
    '<dict><key>$classes</key><array><string>NSColor</string><string>NSObject</string></array><key>$classname</key><string>NSColor</string></dict>',
    '</array>',
    `<key>$top</key><dict><key>root</key>${uid(1)}</dict>`,
    '<key>$version</key><integer>100000</integer>',
    '</dict></plist>'
  ].join('')
  return base64(archive)
}

export function generateTerminalApp(theme) {
  const p = terminalPalette(theme)
  const colors = [
    ...names.map((n, i) => [`ANSI${n}Color`, p.ansi[i]]),
    ...names.map((n, i) => [`ANSIBright${n}Color`, p.ansi[i + 8]]),
    ['BackgroundColor', p.background],
    ['CursorColor', p.cursor],
    ['SelectionColor', p.selection],
    ['TextBoldColor', p.foreground],
    ['TextColor', p.foreground]
  ]
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    ...colors.flatMap(([key, rgb]) => [`\t<key>${key}</key>`, `\t<data>${archivedColor(rgb)}</data>`]),
    '\t<key>ProfileCurrentVersion</key>',
    '\t<real>2.09</real>',
    '\t<key>name</key>',
    `\t<string>${escape(theme.name)}</string>`,
    '\t<key>type</key>',
    '\t<string>Window Settings</string>',
    '</dict>',
    '</plist>'
  ].join('\n') + '\n'
}
