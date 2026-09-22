// Lets device sync find other devices on Android. Android drops incoming
// multicast (mDNS) packets unless the app holds a Wi-Fi MulticastLock, which
// needs the CHANGE_WIFI_MULTICAST_STATE permission. src-tauri/gen/android is
// not tracked, so CI patches the generated project after `tauri android init`.
const fs = require('fs');
const path = require('path');

const appDir = path.resolve(
  __dirname,
  '..',
  'src-tauri',
  'gen',
  'android',
  'app',
  'src',
  'main'
);

function fail(message) {
  console.error(`android-multicast: ${message}`);
  process.exit(1);
}

function findFile(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

const manifestFile = path.join(appDir, 'AndroidManifest.xml');
if (!fs.existsSync(manifestFile)) {
  fail(`${manifestFile} not found, run "tauri android init" first`);
}
let manifest = fs.readFileSync(manifestFile, 'utf8');
for (const permission of [
  'android.permission.CHANGE_WIFI_MULTICAST_STATE',
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.ACCESS_NETWORK_STATE',
]) {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace(
      /(<manifest[^>]*>)/,
      `$1\n    <uses-permission android:name="${permission}" />`
    );
  }
}
fs.writeFileSync(manifestFile, manifest);

const activityFile = findFile(path.join(appDir, 'java'), 'MainActivity.kt');
if (!activityFile) fail('MainActivity.kt not found');
let activity = fs.readFileSync(activityFile, 'utf8');

if (!activity.includes('MulticastLock')) {
  const imports = ['android.net.wifi.WifiManager', 'android.os.Bundle']
    .filter((name) => !activity.includes(`import ${name}\n`))
    .map((name) => `import ${name}\n`)
    .join('');
  activity = activity.replace(/^(package [^\n]+\n)/, `$1\n${imports}`);

  const members = `  private var multicastLock: WifiManager.MulticastLock? = null

  private fun acquireMulticastLock() {
    val wifi = applicationContext.getSystemService(WIFI_SERVICE) as? WifiManager ?: return
    multicastLock = wifi.createMulticastLock("cosmiccomics-sync").apply {
      setReferenceCounted(false)
      acquire()
    }
  }

  override fun onDestroy() {
    multicastLock?.release()
    super.onDestroy()
  }
`;

  if (/super\.onCreate\(savedInstanceState\)/.test(activity)) {
    activity = activity.replace(
      /(super\.onCreate\(savedInstanceState\)\n)/,
      `$1    acquireMulticastLock()\n`
    );
    activity = activity.replace(
      /(class MainActivity\s*:\s*TauriActivity\(\)\s*\{\n)/,
      `$1${members}\n`
    );
  } else if (/class MainActivity\s*:\s*TauriActivity\(\)\s*$/m.test(activity)) {
    activity = activity.replace(
      /class MainActivity\s*:\s*TauriActivity\(\)\s*$/m,
      `class MainActivity : TauriActivity() {
${members}
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    acquireMulticastLock()
  }
}`
    );
  } else {
    fail(`unexpected MainActivity layout in ${activityFile}`);
  }
  if (!activity.includes('acquireMulticastLock()\n')) {
    fail('could not add the multicast lock to MainActivity');
  }
  fs.writeFileSync(activityFile, activity);
}

console.log(`android-multicast: patched ${manifestFile} and ${activityFile}`);
