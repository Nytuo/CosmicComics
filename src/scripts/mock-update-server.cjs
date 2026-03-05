#!/usr/bin/env node
/**
 * Local mock update server for development testing.
 *
 * ─── QUICK SETUP (notification UI only) ─────────────────────────────────────
 *   Terminal 1:  npm run mock-server
 *   Terminal 2:  npm run dev:update
 *
 *   This is enough to test the update-available modal, release notes, the
 *   "Later" / dismiss / "All releases" buttons, and the progress bar for
 *   downloading.  The "Install" step will fail with a signature error (which
 *   exercises the error state of the modal) because we serve FAKESIG.
 *
 * ─── FULL END-TO-END (including install) ────────────────────────────────────
 *   Step 1 — Generate a test key pair (one-time):
 *     cd src/src-tauri && cargo tauri signer generate -w /tmp/test-updater.key
 *     # Prints a public key like: dW50cnVzdGVkIGNvbW1lbnQ6...
 *     # Save the path to the .key.pub file shown in the output.
 *
 *   Step 2 — Build a signed fake bundle:
 *     mkdir -p /tmp/fake-app.app/Contents
 *     tar -czf /tmp/fake-update.tar.gz -C /tmp fake-app.{app, exe}
 *     cargo tauri signer sign --private-key /tmp/test-updater.key \
 *           --private-key-password "" -- /tmp/fake-update.tar.gz
 *     # Creates /tmp/fake-update.tar.gz.sig  (a minisign signature)
 *
 *   Step 3 — Put the sig in SIGNED_SIG below, put the pubkey in SIGNED_PUBKEY
 *
 *   Step 4 — Launch with:
 *     UPDATER_ENDPOINT=http://localhost:8765/latest.json \
 *     UPDATER_PUBKEY=<the-pubkey-from-step-1> \
 *     npm run dev
 *
 * ─── OPTIONS ────────────────────────────────────────────────────────────────
 *   node scripts/mock-update-server.js [version]
 *   version defaults to "99.0.0"
 */

const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

const VERSION = process.argv[2] || '99.0.0';
const PORT = 8765;

let signature = process.env.UPDATER_SIG || 'FAKESIG';
if (signature && fs.existsSync(signature)) {
  signature = fs.readFileSync(signature, 'utf8').trim();
}

function tauriTarget() {
  const p = os.platform();
  const a = os.arch();
  if (p === 'darwin') return a === 'arm64' ? 'darwin-aarch64' : 'darwin-x86_64';
  if (p === 'linux') return 'linux-x86_64';
  if (p === 'win32') return 'windows-x86_64';
  return 'linux-x86_64';
}

const FAKE_DOWNLOAD_SIZE = 5 * 1024 * 1024;
const REAL_BUNDLE = process.env.UPDATER_BUNDLE || null;

const latestJson = {
  version: VERSION,
  notes: `## What's new in v${VERSION}\n\n- ✨ Fake feature for local testing\n- Imaginary bug fix\n- Performance improvements`,
  pub_date: new Date().toISOString(),
  platforms: {
    'darwin-aarch64': {
      signature,
      url: `http://localhost:${PORT}/fake-update`,
    },
    'darwin-x86_64': { signature, url: `http://localhost:${PORT}/fake-update` },
    'linux-x86_64': { signature, url: `http://localhost:${PORT}/fake-update` },
    'windows-x86_64': {
      signature,
      url: `http://localhost:${PORT}/fake-update`,
    },
  },
};

const server = http.createServer((req, res) => {
  console.log(`[mock-server] ${req.method} ${req.url}`);

  if (req.url === '/latest.json') {
    const body = JSON.stringify(latestJson, null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
    return;
  }

  if (req.url === '/fake-update') {
    if (REAL_BUNDLE && fs.existsSync(REAL_BUNDLE)) {
      const stat = fs.statSync(REAL_BUNDLE);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(REAL_BUNDLE).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(FAKE_DOWNLOAD_SIZE),
      'Access-Control-Allow-Origin': '*',
    });
    let sent = 0;
    const chunk = Buffer.alloc(64 * 1024, 0xab);
    const interval = setInterval(() => {
      if (sent >= FAKE_DOWNLOAD_SIZE || res.destroyed) {
        clearInterval(interval);
        res.end();
        return;
      }
      res.write(chunk);
      sent += chunk.length;
    }, 30);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  const target = tauriTarget();
  const sigStatus =
    signature === 'FAKESIG'
      ? '⚠️  FAKESIG  (notification UI only — install will fail)'
      : '✅  real sig (full end-to-end install possible)';

  console.log(`\nMock update server running on http://localhost:${PORT}`);
  console.log(`   Reporting version : ${VERSION}`);
  console.log(`   Detected target   : ${target}`);
  console.log(`   Signature         : ${sigStatus}`);
  console.log(`\nLaunch the app with:\n`);
  if (signature === 'FAKESIG') {
    console.log(
      `   UPDATER_ENDPOINT=http://localhost:${PORT}/latest.json npm run dev\n`
    );
    console.log(
      `   To enable full install testing, set UPDATER_SIG=/path/to/fake-update.tar.gz.sig`
    );
    console.log(
      `   and also set UPDATER_PUBKEY=<pubkey> when running the app.`
    );
  } else {
    console.log(`   UPDATER_ENDPOINT=http://localhost:${PORT}/latest.json \\`);
    console.log(`   UPDATER_PUBKEY=<your-test-pubkey> npm run dev\n`);
  }
  console.log('');
});
