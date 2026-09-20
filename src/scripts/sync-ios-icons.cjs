const fs = require('fs');
const path = require('path');

const tauriDir = path.resolve(__dirname, '..', 'src-tauri');
const source = path.join(tauriDir, 'icons', 'ios');
const target = path.join(
  tauriDir,
  'gen',
  'apple',
  'Assets.xcassets',
  'AppIcon.appiconset'
);

if (!fs.existsSync(source) || !fs.existsSync(target)) {
  process.exit(0);
}

const wanted = JSON.parse(
  fs.readFileSync(path.join(target, 'Contents.json'), 'utf8')
).images.map((image) => image.filename);

let synced = 0;
const missing = [];
for (const name of wanted) {
  const from = path.join(source, name);
  if (!fs.existsSync(from)) {
    missing.push(name);
    continue;
  }
  const to = path.join(target, name);
  const bytes = fs.readFileSync(from);
  if (!fs.existsSync(to) || !bytes.equals(fs.readFileSync(to))) {
    fs.writeFileSync(to, bytes);
    synced += 1;
  }
}

if (synced > 0) {
  console.log(`[ios-icons] copied ${synced} icon(s) from src-tauri/icons/ios`);
}
if (missing.length > 0) {
  console.warn(
    `[ios-icons] missing in src-tauri/icons/ios: ${missing.join(', ')}`
  );
}
