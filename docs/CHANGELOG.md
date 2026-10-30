# Aether changelog

Newest first. Entries are numbered continuously across versions (the numbers are referenced in code comments and discussions). "Validation" notes record how each change was checked.

## v0.15.0 — Updates and installer — 2026-10-30
- **117 — Automatic updates:** Aether checks GitHub Releases when it starts and every six hours (Settings → About → "Check for updates automatically"). Updates are signed; Aether refuses any update that isn't signed with the Veyl Studios key.
- **118 — Update notice:** when a new version is ready, a card in the bottom-right corner offers What's new, Later and Restart now. Restart downloads the update with a progress bar, saves your library, then the installer closes Aether, installs quietly and reopens it. "Aether updated to vX" shows once afterwards.
- **119 — Settings → About:** current version, update status with "Check for updates" (or "Restart to update"), the new version's notes, the automatic-check toggle and a View releases link.
- **120 — Installer:** a per-user Windows installer (no admin prompt) with Start Menu entry, uninstall entry, Prism icon and Veyl Studios as publisher. Uninstalling keeps your library unless you tick "Delete the application data".
- **121 — Release builds:** pushing a version tag runs GitHub Actions: unit tests, a version/signing/changelog check, then a clean Windows build that publishes the release with the installer, signatures and `latest.json`. This changelog section becomes the release notes.
- **122 — Tooling:** `npm run bump 0.15.1` sets the version everywhere at once; `npm run setup-signing` creates the signing key and saves its public half; `npm run desktop:build` makes a local test installer without needing the key.
- **123 — Sign-in launches after an update:** the restart after an update always opens the window, even if Aether was started hidden at sign-in.
- **Validation:** typecheck clean; 35 unit tests pass (new: release notes cleanup, time-ago text, version comparison). In a headless browser with a mocked updater: automatic check, notice states (ready, downloading with progress, installing, failed and retry), Later, What's new, every About state, and the corner stack with toasts. Release scripts run against copies of the real files. Rust module compiled against mocks. The four earlier interaction suites give the same results as v0.14.1 (only the About page row count changed, as expected).

## v0.14.1 — Housekeeping — 2026-10-30
No visible changes; verified pixel-identical (25 screens) and behavior-identical (4 interaction suites) against v0.14.0.
- **110 — Frontend split:** `main.tsx` (≈68 KB) is now a 10-line entry point. `App.tsx` composes the app; new folders: `components/` (Sidebar, Toolbar, Pages, Overlays), `hooks/` (database, toast, wallpaper, library files, icon cache, reorder), `lib/` (storage and migrations, Rust command wrappers, image prep, importers, ordering, menus).
- **111 — CSS split:** `style.css` (≈43 KB of stacked per-version patches) is now 11 topic files in `src/styles/` loaded in a fixed order by `index.css`. 34 dead rules removed (old dialog, old settings page, old sliders). Verified with zero computed-style differences on every element in 25 UI states. `src/style.css` is now an empty placeholder and can be deleted.
- **112 — Rust split:** `lib.rs` is now setup only; commands live in `discovery.rs`, `icons.rs`, `launch.rs`, `storage.rs`, with shared helpers in `util.rs`. Formatted with rustfmt. Function bodies unchanged.
- **113 — Tests:** Vitest added (`npm test`). 31 tests cover data migrations, backup import validation, NexusBar parsing, theme sanitizing, custom-order math, sorting and quick-launcher ranking.
- **114 — One version number:** `tauri.conf.json` and the About page read the version from `package.json`; only `package.json` and `Cargo.toml` need bumping.
- **115 — Cleanup:** removed the unused `@tauri-apps/plugin-window-state` JS package (the Rust plugin stays). Added `.gitignore`.
- **116 — Docs:** README rewritten; changelog reordered newest-first with consistent headings; roadmap updated.

## v0.14.0 — Settings revamp — 2026-10-30
- **101 — New layout:** new `src/SettingsPage.tsx`. A sticky section list (Appearance, Background, Motion, Library, Desktop, Data, About) with one section shown at a time instead of one long page. The last section you opened is remembered. Switching sections crossfades.
- **102 — Search:** searches every setting by name, description and keywords; results are grouped by section with the match highlighted. Esc clears it.
- **103 — Controls:** toggle switches replace checkboxes; segmented buttons for layout, density and sidebar categories; sliders with an accent fill and live value; color fields with swatch and hex; restyled sort dropdown.
- **104 — Appearance preview:** a live mini sidebar and cards that follow your accent, surface colors, text color and corner radius.
- **105 — Motion cards:** Off / Subtle / Full as cards with a hover preview of each level (previews still respect Windows' reduce-motion setting).
- **106 — Per-section reset:** "Reset … to defaults" at the bottom of each section replaces the single Reset appearance button.
- **107 — Danger zone (Data):** Reset all settings (shortcuts kept, wallpaper removed) and Clear library (also deletes stored icons and card images; files on the PC untouched), both behind a confirm dialog.
- **108 — About:** shows the app-data folder path with an Open folder button (new `app_data_folder` / `open_app_data_folder` commands).
- **109 — Ctrl + comma** opens Settings from anywhere.
- `Preferences` type moved to `src/shared.tsx`.
- **Validation:** typecheck clean. In a headless browser: every section rendered; Ctrl+comma; toggle, segmented and slider changes saved; per-section reset; search with highlighting and Esc; both danger-zone confirms; narrow-window layout. No console errors. Rust syntax-checked.

## v0.13.0 — Custom order, smooth reshuffle, icon files — 2026-10-30
**Drag to reorder**
- **092 — Custom sort:** new "Custom (drag to arrange)" option. The library's stored order is your custom order.
- **093 — Dragging:** press and drag a card (a 6 px threshold keeps clicks working). A lifted copy follows the pointer, the card's slot shows as an accent outline, and other cards slide aside live. Near the top or bottom edge it auto-scrolls; Esc cancels and restores the previous order and sort; the click after a drop is swallowed so nothing launches. New `src/reorder.ts`, no drag library.
- **094 — Auto-switch:** dragging in Library or Favorites under another sort first locks the current on-screen order, then switches to Custom with a toast, so nothing jumps.
- **095 — Keyboard:** Alt + arrow keys move the focused card.
- Works in Library, Favorites, the Home favorites row and category views; off on Recent, while searching, and in bulk-select mode.

**Smooth reshuffle**
- **096 — FLIP grid:** new `src/FlipGrid.tsx`. On sort, filter, search, favorite and removal changes, cards that stay glide to their new spot (Full: 300 ms with slight overshoot, Subtle: 180 ms, Off: instant) and cards that leave shrink and fade. Positions are measured right before each update, so window resizes never animate. Only on-screen cards animate.

**Icon cache to files**
- **097 — On-disk icon cache:** extracted icons are PNGs in `%APPDATA%\studio.veyl.aether\icon-cache\`, written by Rust; the UI receives file names only. New commands `icon_cache_folder`, `icon_cache_lookup`, `prune_icon_cache`, `clear_icon_cache`, `icon_cache_stats`; `extract_app_icons` now returns file names. The 250-icon limit is gone.
- **098 — Auto-refresh:** cache files are keyed by a stable FNV-1a hash of the target path plus its modified time and size, so an updated program gets a new icon automatically. Stale files are pruned at startup. (For Start Menu shortcuts, the key follows the shortcut file, which installers usually rewrite on update.)
- **099 — Custom icons as files:** icons you pick are stored beside card art (`icon-<id>-<time>.<ext>`) instead of inside the library database, with automatic migration of existing custom icons. Backups still embed them. New context-menu entry: **Use automatic icon**.
- **100 — Settings:** the Icon cache section shows file count and size; Clear rebuilds in the background without a restart. The old localStorage icon cache is removed on first launch.

**Validation:** typecheck clean. In a headless browser: drag reorder, auto-switch toast, Esc cancel restoring order and sort, Alt+arrow nudge with focus kept, plain clicks still launching, order persisting across reload, filter reshuffle (gliding and exiting cards, copies cleaned up), drag disabled while searching; no console errors. Rust syntax-checked; icon key helpers compiled and tested on their own.

## v0.12.2 — Launch behavior — 2026-10-29
- **088 — Single instance:** added `tauri-plugin-single-instance` (registered first). Launching Aether while it's already running, even hidden in the tray, now brings the existing window forward instead of starting a second copy.
- **089 — Crash fix:** a second copy used to fail to register Ctrl+Alt+Space and abort startup. Hotkey registration is now non-fatal, so Aether also starts if another program owns that shortcut.
- **090 — Start hidden at sign-in:** the Windows login entry now passes `--autostart`. New `launch_context` command lets the UI check this before its first render; with the new **Start hidden in the tray** setting (default on), a sign-in launch skips the splash and stays in the tray. The window-reveal safety net is skipped for these launches.
- **091 — Login entry refresh:** with launch-at-login on, the entry is rewritten on every start so existing installs pick up the new flag automatically.
- **Validation:** typecheck clean; plugin APIs verified against `tauri-plugin-single-instance` 2.5.5 and `tauri-plugin-autostart` 2.7.0 source; browser smoke test clean. Rust syntax-checked; first build downloads the new plugin crate.

## v0.12.1 — Prism brand mark — 2026-10-29
- **084 — New logo:** the "Prism" mark (three-faced pyramid in lavender, accent and deep accent, with a triangular "A" counter) replaces the placeholder "A" in `public/aether.svg`, so the sidebar, favicon and the window/title icon all pick it up.
- **085 — Windows icon set:** regenerated `src-tauri/icons/` (`32x32.png`, `128x128.png`, `128x128@2x.png`, 512 px `icon.png`, and a 7-size `icon.ico` at 16/24/32/48/64/128/256). Each size is rendered at 8× and downsampled. At 16 px the mark is enlarged and the counter dropped so it stays crisp in the tray.
- **086 — Splash:** the startup splash draws the prism's outline and inner edges, fills each face in sequence in the current accent color, then opens the counter; the outline fades so it settles on the exact logo before dissolving.
- **087 — Home banner:** the watermark letter is replaced with a large outlined prism.
- Icon artwork is now final rather than placeholder; trademark clearance for Veyl and Aether is still outstanding.

## v0.12.0 — Auto-hiding scrollbars — 2026-10-29
- **082 — Custom scrollbars:** the Windows scrollbar is replaced app-wide with a slim, track-less pill (no arrow buttons). Accent-tinted while scrolling, brighter on hover, full accent while dragging.
- **083 — Auto-hide:** new `src/scrollbars.ts` adds `is-scrolling` to a container on scroll (cleared after 900 ms idle) and `is-scroll-hot` when the pointer is within 18 px of its right edge or dragging the thumb. The thumb color is a registered `@property`, so it fades in quickly and out slowly in Subtle/Full, and switches instantly in Off.
- Removed two `scrollbar-width: thin` declarations, which override custom scrollbar styling in current Chromium/WebView2.
- **Validation:** typecheck clean. Hidden, scrolling, faded and edge-hover states verified in a headless browser with scrollbars enabled; no console errors.

## v0.11.0 — Shortcut editor redesign — 2026-10-29
- **077 — Layout:** new `src/ShortcutEditor.tsx` replaces the inline modal. Wider two-column dialog with a pinned header and footer; only the body scrolls, so Save can no longer be pushed off-screen. Stacks to one column under 900 px.
- **078 — Live preview + framing:** the real card markup is rendered live (name, category, icon, favorite, art). The X/Y sliders are replaced by dragging the picture inside the preview (pointer capture, cover-aware so the image tracks the cursor), arrow-key nudges, and a Center button.
- **079 — Drag-and-drop art:** image files dropped on the editor become card art. Desktop uses Tauri's native drag-drop event and a new `read_image_file` command (extension, size and signature validated); browser preview uses HTML5 drop.
- **080 — Fields:** category chips, monospace target with inline Browse buttons, type badge, a live "not found on this PC" warning through the new `target_exists` command, inline validation instead of toasts, a favorite toggle in the footer, Ctrl+S to save.
- **081 — Fixes:** the card-image label no longer runs into its description; native white slider tracks are gone; BMP accepted for card art.
- **Validation:** typecheck clean. Exercised in a headless browser at 1380×860 and 960×620 (footer always visible, drag/keyboard framing, chips, validation, Ctrl+S, Esc, art selection) with no console errors. Rust syntax-checked; Windows compile pending.

## v0.10.0 — Performance, context menu, motion system — 2026-10-29
**Performance**
- **065 — Native work off the main thread:** `discover_installed_apps`, icon extraction, launching, wallpaper and card-art commands are now async and run on blocking worker threads. Scans and icon pulls no longer freeze the window.
- **066 — Batched icon extraction:** new `extract_app_icons` handles up to 40 targets per PowerShell process (was one process per icon). Shortcuts with a custom icon are skipped. PowerShell runs with a hard timeout and no console-window flash.
- **067 — Cards stop remounting:** `Card` moved out of `App` into `src/Card.tsx` and memoized with stable callbacks. Typing in search, toasts and toggles no longer rebuild every card.
- **068 — Blur removed from cards:** per-card `backdrop-filter` (very expensive in WebView2 over a wallpaper) replaced with a denser translucent fill.
- **069 — Debounced saves:** the library saves 400 ms after the last change and flushes when the window hides. A full storage quota now shows a notice instead of crashing the UI.
- **070 — Wallpaper as raw bytes:** `load_wallpaper` returns an ArrayBuffer instead of a JSON number array (~3-4x smaller, faster startup).
- **071 — Card art as files:** card images are stored in `AppData\Roaming\studio.veyl.aether\card-art\` and loaded through Tauri's asset protocol (scoped to that folder only). Existing inline images migrate automatically on first launch; a card only switches to its file after the write succeeds. Backups embed the images, so they stay portable. Orphaned files are pruned at startup.
- **072 — Smaller fixes:** memoized category counts and search index, deferred search filtering, async icon decoding, overlapping toast timers fixed, native error messages now actually shown (they were swallowed as a generic message), Escape closes only the topmost layer, tray icon set explicitly and left-click no longer fires on right-click.

**Right-click menu**
- **073 — Custom context menu** replaces the WebView2 default everywhere except text fields: Open, Run as administrator (programs only), Open file location, Copy path/link/app ID, Add/Remove favorite, Edit, Change icon, Change card art, Move to category (submenu), Reset launch stats, Remove from Aether.
- Bulk mode shows a selection menu ("N selected"). Quick-launcher results support right-click too.
- Keyboard: arrows, Home/End, Enter, Esc, first-letter jump, Shift+F10 / Menu key on a focused card. Stays inside the window; menu and submenu flip at edges.
- Rust: `launch_target` takes `verb` (`open`/`runas`, a cancelled UAC prompt is silent); new `reveal_in_explorer`.

**Motion**
- **074 — Off / Subtle / Full** replaces the on/off toggle (on → Full, off → Off). Windows' reduce-motion setting forces Off.
- **075 — Startup:** the window is created hidden and shown after first paint (no white flash). Full plays a branded splash (mark draws, fills with accent glow, dissolves into the UI, ~1.2 s, skippable with any key/click). Subtle plays a ~0.6 s arrival (sidebar slide, content rise, card cascade).
- **076 — Effects:** page crossfade/slide, card hover lift and accent glow, press feedback, launch ripple and icon bounce (Full), favorite star pop and burst (Full), card cascade in / collapse out, scale-and-fade for dialogs, confirm, quick launcher and context menu with real exit animations, toast slide with countdown bar, animated sidebar collapse. Only transform/opacity are animated.

**Validation:** TypeScript typecheck clean; UI exercised in a headless browser (startup sequence, menus, submenus, edge flipping, keyboard navigation, removal animation, bulk menu, quick-launcher menu, debounced persistence) with no console errors. Rust syntax-checked and every Tauri / window-state / windows-sys API verified against the locked source versions; a full Windows compile still needs to run on your machine. Backup of the replaced files: `_backup-v0.9.2/`.

## v0.9.2 — Serde compilation fix — 2026-10-29
### 064 - v0.9.2 Serde compilation fix
- Added `Deserialize` derive to `DiscoveredApp` so JSON output from the Windows scanner can be decoded using `serde_json::from_slice`.
- Confirmed Cargo.toml includes Serde derive feature.
- Windows build still requires local verification.

## v0.9.1 — Rust discovery syntax repair — 2026-10-29
### 063 — v0.9.1 Rust discovery syntax repair
- Corrected invalid `const script = ...` in `discover_installed_apps` to `let script: &str = ...`.
- Missing Tauri command macros were cascading errors from this invalid Rust declaration.
- Windows compilation has not been verified in this environment.

## v0.9.0 — Windows app discovery and large libraries — 2026-10-29
- **057 — Expanded discovery:** Search registered Windows App Paths and packaged Windows Start apps in addition to current Start Menu shortcut scan; indicate source in native results.
- **058 — Target-specific deduplication:** Preserve similarly named entries where targets differ; keep existing Aether shortcuts untouched.
- **059 — Scan confirmation:** Display counts by discovery source before adding; import remains opt-in.
- **060 — Launchable Windows app IDs:** Allow `shell:AppsFolder\...` identities through native Windows ShellExecute without requiring file existence.
- **061 — Scanner robustness:** PowerShell scan runs once per user-invoked scan; malformed/failed additional results do not erase Start Menu matches; native icon work skips unsupported packaged targets.
- **062 — Validation:** JSON/TOML and archive verified; Windows compilation and runtime not tested in this environment.

Note: Full program inventory, performance benchmarks, and complete Store detection are not guaranteed. Some packaged apps may not appear in Get-StartApps.

## v0.8.0 — Core workflow and layout — 2026-10-29
- 050: Fixed sidebar and content scrolling independently; footer stays visible.
- 051: Slimmer welcome hero with reduced padding and decorative lettering.
- 052: Responsive toolbar and content spacing for smaller window sizes.
- 053: Bulk-select library shortcuts; favorite, move category, or remove with confirmation.
- 054: Quick launcher smarter ranking, arrow key navigation and selection highlight.
- 055: Maintain existing library data, wallpaper and icon settings.
- 056: Dependency manifest and configuration version updated.

**Scope note:** Windows discovery still scans Start Menu shortcuts. Registry/UWP discovery is deferred to a later release; this version prioritizes safe library management and launcher usability.
**Validation:** source/static checks only; Windows runtime testing required.

## v0.7.0 — Card framing, launch counts, complete backups — 2026-10-29
### 047 — Aether v0.7 card image framing
**Added:** Per-card horizontal and vertical image positioning sliders in the shortcut editor, 0–100% with reset to center. Position stored with each shortcut.
**Why:** Let each card show the exact part of the selected image the user prefers.
**Status:** Implemented in source, Windows runtime verification pending.

### 048 — Launch frequency and library sorting
**Added:** Per-shortcut successful launch counter and “Most launched” sort mode. Existing recent usage tracking remains.
**Why:** Improve core launcher usefulness beyond appearance customization.
**Status:** Implemented in source, Windows runtime verification pending.

### 049 — Backup completeness
**Changed:** Aether JSON backup import now retains custom icons, optimized card image data, framing positions, last-opened time, and launch counters where available. Existing import confirmation remains.
**Why:** Restoring a backup should not silently erase customized shortcut details or usage history.
**Status:** Implemented in source; legacy backup formats remain accepted.

## v0.6.1 — Large card artwork — 2026-10-29
### 046 — Large card artwork support (v0.6.1)
- Removed the 1.5 MB input-file limit for card art.
- Added client-side downscaling and WebP compression before persistence, avoiding storing full-resolution photos in localStorage.
- Originals remain unchanged; animated GIF artwork is stored as a still frame.
- This release has not been compiled or Windows-runtime tested in this environment.

## v0.6.0 — Responsive personal workspace — 2026-10-29
- **038: Wallpaper visibility:** Removed opaque main-content background, introduced translucent surfaces and adjustable dashboard banner opacity. Existing copied local wallpaper remains in place.
- **039: Categories:** Show, collapse, or hide the sidebar categories. Choice persists with the existing Aether preferences.
- **040: Sidebar:** Icon-only collapse with expand control, saved across relaunches.
- **041: Cards:** Entire shortcut card launches on click or keyboard Enter/Space; star/edit/delete controls stop propagation.
- **042: Artwork:** Full custom card imagery, separate from shortcut icon. Artwork saved with the shortcut in the existing library data (1.5 MB per image cap).
- **043: Startup:** Subtle CSS fade/slide-in, disabled when motion is off.
- **044: Window state:** Official Tauri window-state plugin registered to persist native window position, dimensions and maximization state. Adaptive layouts at smaller sizes.

**Testing:** Source reviewed and packaged; native Windows execution still requires testing. Existing app library uses unchanged storage key.

### 045 — v0.6.0 build repair (2026-10-29)
- Removed a duplicate `[package]` and repeated Cargo sections that stopped parsing at line 26.
- Kept the `tauri-plugin-window-state = "2"` Rust dependency under the single `[dependencies]` section.
- Declared `@tauri-apps/plugin-window-state` in `package.json` alongside the existing Rust window-state plugin.
- Verified `Cargo.toml` parses with Python `tomllib`, `package.json` is valid JSON, and all configured bundle icons exist.
- Not yet compiled or tested on Windows; original app features and saved application storage were left unchanged.

## v0.5.0 — Launch reliability and customization — 2026-10-29
- **033**: Switched application launching to Windows `ShellExecuteW` through a Rust command; supports .exe, .lnk, .url, folders and web links. Errors now identify broken targets.
- **034**: Added customizable sidebar, panels, cards, primary text, and sidebar width.
- **035**: Added per-shortcut custom PNG/JPEG/WebP/GIF images (350 KB limit). Automatic icon extraction remains the fallback.
- **036**: Added import/export of validated appearance-only JSON themes. Aether never imports executable content through themes.
- **037**: Version metadata synchronized to v0.5.0. Windows launch and actual GUI behavior still need on-device validation.

## v0.4.1 — Local background image picker — 2026-10-29
### 031 — v0.4.1: Local background image picker
- Replaced the wallpaper URL text field with **Choose image** and **Remove** controls.
- On Windows, uses native file selection and copies the image into Aether's application data directory.
- Loads the image after the UI mounts, avoiding storing multi-megabyte images in localStorage.
- File extension, signature and 12 MB maximum checked before copying.
- Browser preview supports session-only local file selection.

### 032 — Widget scope decision
- Removed dashboard widgets from planned features at user request.
- Existing dashboard summary counts are unchanged; no new widgets were added.
- Validation: static checks and archive test only; Windows runtime unverified.

## v0.4.0 — Customization and startup performance — 2026-10-29
- **027**: Stored extracted icon data persistently in a separate local cache, capped at 250 entries (browser storage permitting).
- **028**: Delayed icon extraction for 2.5 seconds after startup; changed extraction to sequential background requests. Existing cached icons appear immediately.
- **029**: Added flexible color picker, grid/list layout, sort order, interface density, rounded corners, scaling control, motion toggle, and a background image URL with opacity.
- **030**: Persist last viewed page and add cache status and clear-cache action.
- **Known limitations**: Extracting icons still invokes PowerShell for uncached targets. LocalStorage quota can prevent caching large icon libraries. Preferences only modify the Aether UI, not the actual Windows desktop. Native window drag performance must be tested on Windows.

## v0.3.0 — Confirmations, quick launcher, tray — 2026-10-29
### 017 — Quiet confirmation system
- Removed all uses of `window.confirm` from deletion, backup import, Start Menu discovery, and NexusBar import.
- Added a branded, silent, keyboard-accessible React confirmation overlay. Cancel receives initial focus; Escape dismisses; destructive actions are red.
- Shortcut removal affects Aether's library only, not underlying files.

### 018 — Quick launcher
- Ctrl+K opens searchable in-app launcher; Enter launches the first result.
- Native global Ctrl+Alt+Space shortcut focuses the app and opens quick search.

### 019 — System integration
- Tray icon with Show and Quit actions. Closing the main window hides it to tray.
- Optional Windows startup setting via official Tauri autostart plugin. Defaults off.

### 020 — Dependency consistency
- Declared both frontend and Rust dialog, global-shortcut and autostart plugins.
- Added `npm run repair` to re-install packages if node_modules is stale.
- Source packaging excludes node_modules; users must install dependencies.

### Verification
- Static checks and package integrity are performed in the build environment.
- Native Windows compile/runtime and startup/tray behavior remain unverified until tested on Windows.

## v0.2.0 — Native Windows discovery — 2026-10-29
### 013 — Start Menu discovery
**Added:** Windows-native scanning of current-user and all-users Start Menu `.lnk` / `.url` shortcuts, with duplicate filtering, category suggestions, confirmation before adding, and a "Detect apps" action.
**Why:** Populate a useful starter library without manually entering every path.
**Editable:** `src-tauri/src/lib.rs`, `src/main.tsx`.
**Status:** Implemented in source; Windows execution not yet validated.

### 014 — Real application icons
**Added:** Native-associated icon extraction via PowerShell and System.Drawing for local targets, shortcut target resolution, and fallbacks to category icons. Extraction is bounded and cached in the running UI session.
**Why:** Display actual Windows icons where extraction works instead of only generic category glyphs.
**Editable:** `src-tauri/src/lib.rs`, `src/main.tsx`, `src/style.css`.
**Status:** Implemented in source; not available in browser mode; some link/icon types will fall back.

### 015 — Native target browsing
**Added:** Tauri OS file and folder dialogs for manually configured shortcuts.
**Why:** Avoid copying long file paths manually.
**Editable:** `src/main.tsx`, Tauri dialog permissions.
**Status:** Implemented in source; native build validation pending.

### 016 — NexusBar JSON migration
**Added:** Separate importer for legacy NexusBar backups with `apps`, `path`, `favorite` or `is_favorite`; merges only new targets and asks for confirmation, preserving current Aether data.
**Why:** Preserve the old library without silently overwriting newer data.
**Editable:** `parseLegacy()` in `src/main.tsx`.
**Status:** Implemented in source; test with your real legacy export recommended.

### Testing and caveats
- No successful npm/Tauri build in this environment: npm installation timed out; Windows native integration cannot be exercised on Linux.
- Detection is based on Start Menu shortcuts only; portable apps and some UWP apps may need manual addition.
- Icons are not persisted and are lazily requested for up to 120 local shortcuts per library change.
- Existing v0.1 localStorage key retained to preserve prior shortcuts.
- Studio/product artwork remains editable and is not a finalized brand mark.

## v0.1.0 — Foundation — 2026-10-29
### 009 — Project foundation
**Added:** Fresh Tauri 2 / React / TypeScript project with Windows desktop packaging configuration and web preview.
**Why:** A clean modern foundation independent of NexusBar's older Python / CustomTkinter interface.
**Editable:** All source files, branding assets, palette, and UI.
**Status:** Source prototype; Windows installer not built or tested in this environment.

### 010 — Workspace UI
**Added:** Dark purple dashboard, sidebar, app library, category counts, favorites section, recent section, search, modal editing, responsive layouts.
**Why:** Establish the new product visual language and a usable app manager before adding native integrations.
**Editable:** `src/main.tsx`, `src/style.css`.
**Status:** Implemented.

### 011 — Shortcut management
**Added:** Add/edit/remove, target opening (Tauri opener / browser URL preview), favoriting, last-opened timestamps, category filtering, local persistence, backup import/export.
**Why:** Make v0.1 functional instead of just a UI mockup.
**Editable:** `src/main.tsx`.
**Status:** Implemented in source; requires user-side Windows testing.

### 012 — Editable brand assets
**Added:** Placeholder vector icons `public/aether.svg`, `public/veyl.svg`; desktop icon set.
**Why:** Visual identity can be swapped without changing product behavior.
**Editable:** All icons are temporary; user can replace any of them.
**Status:** Placeholder branding.

### Deferred (not implemented)
Automatic app scanning, global system-wide hotkeys, updater, true icon detection, import of old NexusBar data, auto-launch at login, system tray, drag-and-drop cards, studio website.

### Legacy reference
Older NexusBar source in Library demonstrated theme selection, favorites, categories, recent items, import/export, and updates. This release is not a copy or migration of the old code.
