# Aether roadmap

## Next: v0.15 — Updater and release build
- Windows installer with proper metadata (name, publisher, icons, uninstall entry).
- Auto-updates through GitHub Releases (Tauri updater plugin, signed update manifests).
- "Check for updates" and current version in Settings → About.
- A repeatable release checklist: bump version, changelog, build, sign, publish.

## After that
- **Launch Sets:** group shortcuts ("Gaming", "Dev") and open them all with one click or from the quick launcher.
- **Quick launcher upgrades:** open typed URLs directly, web-search fallback, simple math, Launch Sets in results.
- **Theme presets:** one-click looks alongside theme import/export.
- **Custom hotkey:** rebind `Ctrl + Alt + Space` with a shortcut recorder and conflict warning.
- **Large libraries:** virtualized grid for 1,000+ shortcuts; benchmark scanning and icon extraction on real machines.
- **Veyl Studios website** (separate project).

## Done
- v0.1–v0.9: library, discovery, icons, tray, hotkey, autostart, themes, wallpaper, card art, backups, NexusBar import.
- v0.10: performance pass, right-click menu, Off / Subtle / Full motion, branded startup.
- v0.11: shortcut editor redesign. v0.12: scrollbars, Prism logo, single instance, start hidden at sign-in.
- v0.13: custom order with drag-and-drop, smooth reshuffle, icon cache on disk.
- v0.14: Settings revamp. v0.14.1: codebase split into modules, CSS cleanup, tests, docs.

## Ruled out
- Dashboard widgets (decided in v0.4.1): Aether focuses on launching, the library and appearance.
