// Used by .github/workflows/release.yml before building:
//   node scripts/release-check.mjs v0.15.1
// Fails early (with a readable reason) if the tag, versions, signing setup or
// changelog don't line up, then hands the release notes to the next step (GITHUB_OUTPUT).
import {appendFileSync, existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFileSync(join(root, name), 'utf8');
const problems = [];

const tag = process.argv[2] || '';
const version = JSON.parse(read('package.json')).version;
const cargo = (read('src-tauri/Cargo.toml').match(/^version\s*=\s*"([^"]*)"/m) || [])[1];
const config = JSON.parse(read('src-tauri/tauri.conf.json'));

if (tag !== `v${version}`) problems.push(`Tag "${tag}" does not match package.json version ${version}. Run "npm run bump ${tag.replace(/^v/, '') || 'x.y.z'}" or tag v${version}.`);
if (cargo !== version) problems.push(`src-tauri/Cargo.toml says ${cargo}, package.json says ${version}. Use "npm run bump" to change both.`);
if (!config.plugins?.updater?.pubkey) problems.push('No update public key in tauri.conf.json. Run "npm run setup-signing" and commit the change.');
if (!process.env.TAURI_SIGNING_PRIVATE_KEY) problems.push('The TAURI_SIGNING_PRIVATE_KEY secret is missing (repo Settings -> Secrets and variables -> Actions).');
if (!existsSync(join(root, 'package-lock.json'))) problems.push('package-lock.json is missing. Run "npm install" and commit it.');

// Release notes: this version's changelog section, minus the internal validation notes.
const changelog = read('docs/CHANGELOG.md');
const start = changelog.search(new RegExp(`^## v${version.replace(/\./g, '\\.')}\\b`, 'm'));
let notes = '';
if (start < 0) problems.push(`docs/CHANGELOG.md has no "## v${version}" section.`);
else {
 const rest = changelog.slice(start);
 const end = rest.slice(3).search(/^## v/m);
 const section = end < 0 ? rest : rest.slice(0, end + 3);
 notes = section.split(/\r?\n/).slice(1)
  .filter(line => !/^\s*-\s*\*\*Validation/i.test(line))
  .join('\n').trim();
}

if (problems.length) {
 for (const p of problems) console.log(`::error::${p}`);
 process.exit(1);
}
const marker = `NOTES_${Date.now()}`;
const output = `body<<${marker}\n${notes}\n${marker}\n`;
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
else console.log(notes);
console.log(`Release v${version} checks passed.`);
