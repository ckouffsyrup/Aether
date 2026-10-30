<p align="center"><img src="public/aether.svg" width="96" alt="Aether logo"></p>

# Aether

A Windows desktop hub for launching your apps, games, folders and websites, by **Veyl Studios**.
Built with Tauri 2 (Rust) and React + TypeScript.

> Status: pre-release (v0.15). Install it from [Releases](https://github.com/ckouffsyrup/Aether/releases); it updates itself from there.

## Features

- **Library:** shortcuts to programs, `.lnk`/`.url` files, folders, websites and Windows Store apps. Categories, favorites, recents, search, bulk organizing.
- **Custom order:** drag cards to arrange them (Alt + arrow keys work too). Cards glide into place when you sort, filter or search.
- **Detect apps:** scans the Start Menu, registered App Paths and Windows apps; you confirm before anything is added.
- **Real icons:** extracted from Windows in the background, cached as files, refreshed when a program updates. Or pick your own icon and card artwork (drag an image onto the editor).
- **Right-click menu:** Open, Run as administrator, Open file location, Copy path, Edit, Change icon or art, Move to category, and more.
- **Quick launcher:** `Ctrl + K` inside Aether, `Ctrl + Alt + Space` from anywhere (change it in **Settings → Desktop**).
- **Desktop integration:** tray icon, launch at sign-in (optionally hidden in the tray), single instance.
- **Make it yours:** accent and surface colors, app icons on cards (always, only without artwork, or never), wallpaper, density, corner radius, scale, list or grid, and Off / Subtle / Full motion with a branded startup animation.
- **Backups:** one JSON file with every shortcut, image and setting. NexusBar exports can be imported.
- **Automatic updates:** signed updates from GitHub Releases. A notice offers Restart now; nothing installs without you.

## Installing

Download `Aether_x.y.z_x64-setup.exe` from [Releases](https://github.com/ckouffsyrup/Aether/releases) and run it. It installs for your user only (no admin prompt).

The installer isn't code-signed yet, so Windows SmartScreen may say "Windows protected your PC": choose **More info → Run anyway**. Updates after that install without the warning.

**Coming from `npm run desktop`?** The development app and the installed app keep separate libraries. In the development app use **Settings → Data → Backup → Export**, then **Import** that file in the installed app.

## Getting started (Windows)

You need [Node.js 20+](https://nodejs.org/), [Rust](https://www.rust-lang.org/tools/install) and the [Tauri 2 Windows prerequisites](https://v2.tauri.app/start/prerequisites/) (Microsoft C++ Build Tools and WebView2).

In **Command Prompt**:

```bat
cd /d C:\Users\YourUser\Documents\Aether
npm install
npm run desktop
```

The first `npm run desktop` compiles the Rust side and takes a few minutes; later runs are fast.

| Command | What it does |
| --- | --- |
| `npm run desktop` | Run the desktop app in development mode (hot reload). |
| `npm run desktop:build` | Build a test installer into `src-tauri\target\release\bundle\nsis\` (real releases come from GitHub Actions). |
| `npm run dev` | Browser-only preview at http://localhost:1420 (no launching, tray or file access). |
| `npm test` | Run the unit tests once (`npm run test:watch` to keep them running). |
| `npm run repair` | Reinstall packages if `node_modules` is stale or broken. |
| `npm run bump 0.15.1` | Set a new version in every file that holds it. |
| `npm run setup-signing` | One-time: create the update signing key (see Releasing). |

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Ctrl + Alt + Space` | Open Aether's quick launcher from anywhere in Windows (rebind in **Settings → Desktop**) |
| `Ctrl + K` | Quick launcher inside Aether |
| `Ctrl + ,` | Settings |
| `Shift + F10` or the Menu key | Right-click menu for the focused shortcut |
| `Alt + arrow keys` | Move the focused shortcut (switches to Custom order) |
| `Ctrl + S` | Save in the shortcut editor |
| `Esc` | Close the topmost dialog or menu; cancel a drag |

## Where your data lives

- **Shortcuts and settings:** Aether's webview storage. Use **Settings → Data → Backup → Export** before reinstalling.
- **Images, icon cache and wallpaper:** `%APPDATA%\studio.veyl.aether\` (`card-art\`, `icon-cache\`, `custom-wallpaper`, `hotkey.txt`). **Settings → About → Open folder** takes you there.

Removing a shortcut never touches the program or file it points to.

## Project layout

```
src/
  main.tsx            entry point
  App.tsx             composes the app: state, actions, layout
  components/         Sidebar, Toolbar, Home/Library pages, dialogs, quick launcher
  hooks/              database + saving, toasts, wallpaper, image files, icon cache, reordering
  lib/                storage + migrations, Rust command wrappers, importers, ordering, menus (+ tests)
  styles/             CSS by topic, loaded in order by index.css
  Card.tsx  ContextMenu.tsx  FlipGrid.tsx  ShortcutEditor.tsx  SettingsPage.tsx  Splash.tsx
  motion.ts  reorder.ts  scrollbars.ts  shared.tsx
src-tauri/src/
  lib.rs              plugins, tray, global hotkey, window setup
  discovery.rs        installed-app scanning
  hotkey.rs           global hotkey: saved combination, status, rebinding
  icons.rs            icon extraction and on-disk cache
  launch.rs           launching, Run as administrator, File Explorer
  storage.rs          wallpaper, card art, custom icons, app-data folder
  updates.rs          update checks setup and the restart after an update
  util.rs             shared helpers (worker threads, PowerShell, image checks)
scripts/              bump, setup-signing, desktop:build, release checks
.github/workflows/    release.yml (builds and publishes releases)
docs/                 CHANGELOG.md, ROADMAP.md
```

## Releasing

Releases are built by GitHub Actions (`.github/workflows/release.yml`) when you push a version tag. Installed copies of Aether find them through `latest.json` on the newest release.

### One-time setup

1. In Command Prompt:
   ```bat
   cd /d C:\Users\YourUser\Documents\Aether
   npm install
   npm run setup-signing
   ```
   It asks for a password, creates `%USERPROFILE%\.tauri\aether.key` (outside the project, never committed) and writes the public key into `src-tauri\tauri.conf.json`.
2. **Back up `%USERPROFILE%\.tauri\aether.key` and the password.** If you lose either, installed copies can never update again; users would have to reinstall by hand.
3. On GitHub: **repo → Settings → Secrets and variables → Actions → New repository secret**, twice:
   - `TAURI_SIGNING_PRIVATE_KEY`: the whole contents of the key file. `notepad "%USERPROFILE%\.tauri\aether.key"`, select all, copy.
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the password.
4. Commit and push the public key:
   ```bat
   git add src-tauri/tauri.conf.json
   git commit -m "Add update signing key"
   git push
   ```

### Every release

```bat
cd /d C:\Users\YourUser\Documents\Aether
npm run bump 0.15.1
```
Add a `## v0.15.1 — Title — date` section at the top of `docs/CHANGELOG.md` (it becomes the release notes shown in the app), then:
```bat
npm test
git add .
git commit -m "Aether v0.15.1"
git push
git tag v0.15.1
git push origin v0.15.1
```
Watch it on the repo's **Actions** tab (about 10–15 minutes). If the version, key or changelog doesn't line up, the run stops early and says why. When it finishes, the release is live and installed copies pick it up within six hours (or right away with **Settings → About → Check for updates**).

The version lives in `package.json` (the app and `tauri.conf.json` read it from there) and `src-tauri/Cargo.toml`; `npm run bump` changes both, plus the lock files.

## Troubleshooting

- **"Cannot find module" or a missing plugin error:** run `npm run repair`, then `npm run desktop`.
- **The taskbar still shows an old icon:** Windows caches icons. Sign out and back in, or restart Explorer.
- **The global hotkey does nothing:** check **Settings → Desktop → Quick launcher hotkey**. "Not active" means another program owns that combination: click **Change** and press a different one (for example `Ctrl + Alt + A`). If the recorder shows nothing when you press a combination, another program has that one too.
- **A release run failed:** open it on the Actions tab; the red step says what's wrong (usually a missing secret, a tag that doesn't match the version, or no changelog section). Fix it, then delete and re-push the tag: `git tag -d v0.15.1`, `git push origin :refs/tags/v0.15.1`, `git tag v0.15.1`, `git push origin v0.15.1`.
- **"Updates: Not set up in this build" in About:** the build has no public key. Run `npm run setup-signing`, commit `tauri.conf.json`, release again.
- **Inspecting the UI in development:** `Shift + right-click` opens the browser's own menu (with Inspect) in `npm run desktop`.

## License and branding

All rights reserved by Veyl Studios. Trademark clearance for "Aether" and "Veyl" is still pending.
