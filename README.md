<p align="center"><img src="public/aether.svg" width="96" alt="Aether logo"></p>

# Aether

A Windows desktop hub for launching your apps, games, folders and websites, by **Veyl Studios**.
Built with Tauri 2 (Rust) and React + TypeScript.

> Status: pre-release (v0.14). Runs from source on Windows; installer and auto-updates are next on the [roadmap](docs/ROADMAP.md).

## Features

- **Library:** shortcuts to programs, `.lnk`/`.url` files, folders, websites and Windows Store apps. Categories, favorites, recents, search, bulk organizing.
- **Custom order:** drag cards to arrange them (Alt + arrow keys work too). Cards glide into place when you sort, filter or search.
- **Detect apps:** scans the Start Menu, registered App Paths and Windows apps; you confirm before anything is added.
- **Real icons:** extracted from Windows in the background, cached as files, refreshed when a program updates. Or pick your own icon and card artwork (drag an image onto the editor).
- **Right-click menu:** Open, Run as administrator, Open file location, Copy path, Edit, Change icon or art, Move to category, and more.
- **Quick launcher:** `Ctrl + K` inside Aether, `Ctrl + Alt + Space` from anywhere.
- **Desktop integration:** tray icon, launch at sign-in (optionally hidden in the tray), single instance.
- **Make it yours:** accent and surface colors, wallpaper, density, corner radius, scale, list or grid, and Off / Subtle / Full motion with a branded startup animation.
- **Backups:** one JSON file with every shortcut, image and setting. NexusBar exports can be imported.

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
| `npm run desktop:build` | Build the Windows installer into `src-tauri\target\release\bundle\`. |
| `npm run dev` | Browser-only preview at http://localhost:1420 (no launching, tray or file access). |
| `npm test` | Run the unit tests once (`npm run test:watch` to keep them running). |
| `npm run repair` | Reinstall packages if `node_modules` is stale or broken. |

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Ctrl + Alt + Space` | Open Aether's quick launcher from anywhere in Windows |
| `Ctrl + K` | Quick launcher inside Aether |
| `Ctrl + ,` | Settings |
| `Shift + F10` or the Menu key | Right-click menu for the focused shortcut |
| `Alt + arrow keys` | Move the focused shortcut (switches to Custom order) |
| `Ctrl + S` | Save in the shortcut editor |
| `Esc` | Close the topmost dialog or menu; cancel a drag |

## Where your data lives

- **Shortcuts and settings:** Aether's webview storage. Use **Settings → Data → Backup → Export** before reinstalling.
- **Images, icon cache and wallpaper:** `%APPDATA%\studio.veyl.aether\` (`card-art\`, `icon-cache\`, `custom-wallpaper`). **Settings → About → Open folder** takes you there.

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
  icons.rs            icon extraction and on-disk cache
  launch.rs           launching, Run as administrator, File Explorer
  storage.rs          wallpaper, card art, custom icons, app-data folder
  util.rs             shared helpers (worker threads, PowerShell, image checks)
docs/                 CHANGELOG.md, ROADMAP.md
```

## Versioning

The version lives in `package.json` (the app and `tauri.conf.json` read it from there) and in `src-tauri/Cargo.toml`. Bump both together, and add an entry to [docs/CHANGELOG.md](docs/CHANGELOG.md).

## Troubleshooting

- **"Cannot find module" or a missing plugin error:** run `npm run repair`, then `npm run desktop`.
- **The taskbar still shows an old icon:** Windows caches icons. Sign out and back in, or restart Explorer.
- **`Ctrl + Alt + Space` does nothing:** another program owns that shortcut. Aether still runs; close the other program or use the tray icon.
- **Inspecting the UI in development:** `Shift + right-click` opens the browser's own menu (with Inspect) in `npm run desktop`.

## License and branding

All rights reserved by Veyl Studios. Trademark clearance for "Aether" and "Veyl" is still pending.
