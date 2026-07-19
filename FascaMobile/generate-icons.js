const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceIcon = "C:\\Users\\T490\\.gemini\\antigravity\\brain\\d2e87822-f247-4b19-851a-bd71efaf656d\\fasca_app_icon_1783939989469.png";
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

async function generateIcons() {
  for (const [folder, size] of Object.entries(sizes)) {
    const targetDir = path.join(resDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Generate both regular and round icons
    const targetFile = path.join(targetDir, 'ic_launcher.png');
    const targetRoundFile = path.join(targetDir, 'ic_launcher_round.png');
    
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(targetFile);
      
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(targetRoundFile);
      
    console.log(`Generated ${size}x${size} for ${folder}`);
  }
}

generateIcons().catch(console.error);
