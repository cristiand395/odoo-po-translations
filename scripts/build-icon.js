// Rasterizes media/icon.svg to media/icon.png (128x128).
// The VS Code Marketplace requires a PNG icon (SVG is not allowed there),
// so we keep the SVG as the editable source and generate the PNG from it.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = path.join(__dirname, '..', 'media', 'icon.svg');
const png = path.join(__dirname, '..', 'media', 'icon.png');

sharp(fs.readFileSync(svg))
  .resize(128, 128)
  .png()
  .toFile(png)
  .then(() => console.log('Generado', png))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
