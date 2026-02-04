/**
 * Generate PWA icon PNGs from an SVG template.
 *
 * This script creates simple placeholder PNG icons for the PWA manifest.
 * It writes raw PNG data using only Node.js built-ins (no canvas/sharp needed).
 *
 * For production, replace these with properly designed icons.
 *
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const iconsDir = path.join(__dirname, '..', 'public', 'icons')

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Create SVG icon
const createSvg = (size, maskable = false) => {
  const padding = maskable ? size * 0.1 : 0
  const innerSize = size - padding * 2
  const fontSize = Math.round(innerSize * 0.22)
  const subFontSize = Math.round(innerSize * 0.08)
  const cx = size / 2
  const cy = size / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0A0A0B" rx="${maskable ? 0 : size * 0.15}"/>
  ${maskable ? '' : `<rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}" rx="${size * 0.12}" fill="none" stroke="#D4A853" stroke-width="${size * 0.008}" opacity="0.3"/>`}
  <text x="${cx}" y="${cy - subFontSize * 0.3}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="800" fill="#D4A853" text-anchor="middle" dominant-baseline="central" letter-spacing="${size * 0.01}">MPM</text>
  <text x="${cx}" y="${cy + fontSize * 0.7}" font-family="system-ui, -apple-system, sans-serif" font-size="${subFontSize}" font-weight="500" fill="#D4A853" text-anchor="middle" dominant-baseline="central" opacity="0.6" letter-spacing="${size * 0.005}">DISCOUNTS</text>
</svg>`
}

// Write SVGs (these work as fallbacks and source files)
const svgContent = createSvg(512)
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent)
console.log('Created: public/icons/icon.svg')

// Write SVG versions that can be converted to PNG
// For now, write SVGs and rename them -- browsers handle SVG icons well
const sizes = [
  { name: 'icon-192.svg', size: 192, maskable: false },
  { name: 'icon-512.svg', size: 512, maskable: false },
  { name: 'icon-512-maskable.svg', size: 512, maskable: true },
]

for (const { name, size, maskable } of sizes) {
  const svg = createSvg(size, maskable)
  fs.writeFileSync(path.join(iconsDir, name), svg)
  console.log(`Created: public/icons/${name}`)
}

// Try to convert SVGs to PNGs using available tools
let converted = false

// Try using npx sharp-cli
try {
  for (const { name, size } of sizes) {
    const svgPath = path.join(iconsDir, name)
    const pngName = name.replace('.svg', '.png')
    const pngPath = path.join(iconsDir, pngName)

    // Use built-in Node approach: create a minimal valid PNG
    // This creates a simple colored square as a placeholder
    createMinimalPng(pngPath, size)
    console.log(`Created: public/icons/${pngName} (placeholder)`)
  }
  converted = true
} catch (e) {
  console.log('Note: Created SVG icons. For PNG icons, convert manually or install sharp.')
}

/**
 * Creates a minimal valid PNG file with a dark background.
 * This is a legitimate placeholder -- replace with real branded icons for production.
 */
function createMinimalPng(filePath, size) {
  // For simplicity, create a 1x1 PNG and let the browser scale it.
  // A real implementation would use sharp or canvas.

  // Minimal 1x1 dark PNG (base64 decoded)
  // This is a valid 1x1 PNG with color #0A0A0B
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  ])

  // We'll create a very small valid PNG
  // IHDR chunk
  const width = 1
  const height = 1
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 2 // color type (RGB)
  ihdrData[10] = 0 // compression
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace

  const ihdrChunk = createPngChunk('IHDR', ihdrData)

  // IDAT chunk (raw pixel data, filtered)
  const rawData = Buffer.from([0x00, 0x0A, 0x0A, 0x0B]) // filter byte + RGB
  const { deflateSync } = require('zlib')
  const compressed = deflateSync(rawData)
  const idatChunk = createPngChunk('IDAT', compressed)

  // IEND chunk
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0))

  const png = Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk])
  fs.writeFileSync(filePath, png)
}

function createPngChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])

  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcData), 0)

  return Buffer.concat([length, typeBuffer, data, crc])
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

console.log('\nDone! For production, replace placeholder PNGs with properly designed icons.')
console.log('Recommended: Use a tool like https://realfavicongenerator.net/')
