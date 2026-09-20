// Wires release signing into the Gradle project that `tauri android init`
// generates (src-tauri/gen/android is not tracked, so CI patches it after init).
// The keystore itself is described by gen/android/keystore.properties, written
// by the workflow from repository secrets.
const fs = require('fs');
const path = require('path');

const gradleFile = path.resolve(
  __dirname,
  '..',
  'src-tauri',
  'gen',
  'android',
  'app',
  'build.gradle.kts'
);

const signingConfigs = `    signingConfigs {
        create("release") {
            val keystoreProperties = Properties().apply {
                val file = rootProject.file("keystore.properties")
                if (file.exists()) {
                    file.inputStream().use { load(it) }
                }
            }
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }
`;

function fail(message) {
  console.error(`android-signing: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(gradleFile)) {
  fail(`${gradleFile} not found, run "tauri android init" first`);
}

let source = fs.readFileSync(gradleFile, 'utf8');
if (source.includes('signingConfigs.getByName("release")')) {
  console.log('android-signing: already patched');
  process.exit(0);
}

if (!/^import java\.util\.Properties$/m.test(source)) {
  fail('java.util.Properties is not imported, the template changed');
}

const buildTypes = /^([ \t]*)buildTypes\s*\{/m;
if (!buildTypes.test(source)) {
  fail('no buildTypes block found, the template changed');
}
source = source.replace(buildTypes, (match) => `${signingConfigs}${match}`);

const release = /^([ \t]*)getByName\("release"\)\s*\{/m;
if (!release.test(source)) {
  fail('no release build type found, the template changed');
}
source = source.replace(
  release,
  (match, indent) =>
    `${match}\n${indent}    signingConfig = signingConfigs.getByName("release")`
);

fs.writeFileSync(gradleFile, source);
console.log('android-signing: release signing configured');
