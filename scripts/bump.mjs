// npm run bump 0.15.1
// Sets the version in package.json, package-lock.json, src-tauri/Cargo.toml and
// src-tauri/Cargo.lock in one go (tauri.conf.json and the About page read package.json).
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = name => join(root, name);
const fail = text => { console.error(`\n  ${text}\n`); process.exit(1); };

const next = (process.argv[2] || '').replace(/^v/, '');
if (!/^\d+\.\d+\.\d+$/.test(next)) fail('Usage: npm run bump 0.15.1   (major.minor.patch)');

const pkg = JSON.parse(readFileSync(file('package.json'), 'utf8'));
const current = pkg.version;
const parts = v => v.split('.').map(Number);
const newer = (a, b) => { const [x, y] = [parts(a), parts(b)]; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
if (!newer(next, current)) fail(`${next} is not newer than the current version ${current}. The updater only installs newer versions.`);

// Every file is checked first and only then written, so a problem never leaves half the files bumped.
const pending = [];
const edit = (name, change, required = true) => {
 if (!existsSync(file(name))) { if (required) fail(`Missing ${name}`); return; }
 const before = readFileSync(file(name), 'utf8');
 const after = change(before);
 if (after === before) { if (required) fail(`Could not find the version in ${name}`); return; }
 pending.push([name, after]);
};
const esc = s => s.replace(/\./g, '\\.');

console.log(`\nAether ${current} -> ${next}`);
// package.json: the top-level "version" only.
edit('package.json', t => t.replace(new RegExp(`("version":\\s*")${esc(current)}"`), `$1${next}"`));
// package-lock.json: the root entry appears twice (top level and packages[""]).
edit('package-lock.json', t => {
 const lock = JSON.parse(t);
 lock.version = next;
 if (lock.packages?.['']) lock.packages[''].version = next;
 return JSON.stringify(lock, null, 2) + '\n';
}, false);
// Cargo.toml: the first version line, which belongs to [package].
edit('src-tauri/Cargo.toml', t => t.replace(/^version\s*=\s*"[^"]*"/m, `version = "${next}"`));
// Cargo.lock: the aether package entry (Cargo also fixes this on the next build).
edit('src-tauri/Cargo.lock', t => t.replace(/(name = "aether"\r?\nversion = ")[^"]*"/, `$1${next}"`), false);

for (const [name, text] of pending) { writeFileSync(file(name), text); console.log(`  ${name}`); }

const changelog = existsSync(file('docs/CHANGELOG.md')) ? readFileSync(file('docs/CHANGELOG.md'), 'utf8') : '';
const hasNotes = new RegExp(`^## v${esc(next)}\\b`, 'm').test(changelog);
console.log(`
Next:
  1. ${hasNotes ? 'Changelog entry found for' : 'Add a "## v' + next + ' — Title — date" section to docs/CHANGELOG.md for'} v${next}${hasNotes ? '' : ' (it becomes the release notes)'}
  2. git add .
  3. git commit -m "Aether v${next}"
  4. git tag v${next}
  5. git push
  6. git push origin v${next}
`);
