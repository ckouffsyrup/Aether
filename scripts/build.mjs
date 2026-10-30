// npm run desktop:build
// Builds the Windows installer on this PC for testing. Signed update files are made
// by GitHub Actions on release, so they are skipped here unless the signing key is
// in TAURI_SIGNING_PRIVATE_KEY (then the build is identical to a release build).
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
if (!existsSync(cli)) { console.error('\n  Tauri CLI not found. Run "npm install" first.\n'); process.exit(1); }

const signed = !!process.env.TAURI_SIGNING_PRIVATE_KEY;
const args = [cli, 'build', ...process.argv.slice(2)];
if (!signed) args.push('--config', JSON.stringify({bundle: {createUpdaterArtifacts: false}}));
console.log(signed ? '\nRelease build (update files will be signed).\n' : '\nTest build (no update files; releases are built by GitHub Actions).\n');

const run = spawnSync(process.execPath, args, {stdio: 'inherit', cwd: root});
if (run.status === 0) console.log(`\nInstaller: ${join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis')}\n`);
process.exit(run.status ?? 1);
