// npm run setup-signing
// One-time: creates the update signing key in %USERPROFILE%\.tauri\ (outside the
// project, so it is never committed) and puts its public half in tauri.conf.json.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const configPath = join(root, 'src-tauri', 'tauri.conf.json');
const keyDir = join(homedir(), '.tauri');
const key = join(keyDir, 'aether.key');
const pub = key + '.pub';
const fail = text => { console.error(`\n  ${text}\n`); process.exit(1); };

if (!existsSync(cli)) fail('Tauri CLI not found. Run "npm install" first.');

if (existsSync(key) && existsSync(pub)) {
 console.log(`\nUsing your existing key: ${key}`);
} else {
 mkdirSync(keyDir, {recursive: true});
 console.log(`
Creating the update signing key.
Pick a password you will remember: GitHub needs it to sign releases.
`);
 const run = spawnSync(process.execPath, [cli, 'signer', 'generate', '-w', key], {stdio: 'inherit'});
 if (run.status !== 0 || !existsSync(pub)) fail('Key generation did not finish. Run "npm run setup-signing" again.');
}

const pubkey = readFileSync(pub, 'utf8').trim();
const config = JSON.parse(readFileSync(configPath, 'utf8'));
config.plugins ??= {};
config.plugins.updater ??= {};
const changed = config.plugins.updater.pubkey !== pubkey;
config.plugins.updater.pubkey = pubkey;
writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

console.log(`
${changed ? 'Public key saved to src-tauri/tauri.conf.json.' : 'tauri.conf.json already has this public key.'}

Now:
  1. BACK UP ${key}
     (a USB drive or password manager). Lose it and installed copies of Aether can never update again.
  2. On GitHub: your repo -> Settings -> Secrets and variables -> Actions -> New repository secret
       TAURI_SIGNING_PRIVATE_KEY           = everything inside ${key}
                                             (open it with: notepad "${key}")
       TAURI_SIGNING_PRIVATE_KEY_PASSWORD  = the password you just chose
  3. Commit tauri.conf.json:  git add src-tauri/tauri.conf.json  then  git commit -m "Add update signing key"
`);
