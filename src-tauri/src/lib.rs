//! Aether desktop backend (Tauri 2). Commands live in the modules below;
//! this file wires up plugins, the tray, the global hotkey and the window.

mod discovery;
mod hotkey;
mod icons;
mod launch;
mod storage;
mod updates;
mod util;

use std::time::Duration;
use tauri::menu::MenuBuilder;
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::ShortcutState;
use tauri_plugin_window_state::StateFlags;
/// Passed by the Windows login entry (see the autostart plugin below) so Aether
/// knows it was started at sign-in rather than by the user.
const AUTOSTART_FLAG: &str = "--autostart";

fn launched_at_login() -> bool {
    // The restart after an update keeps the old arguments; show the window anyway.
    std::env::args().any(|a| a == AUTOSTART_FLAG) && !updates::resumed_after_update()
}

/// UI asks this before its first render to decide whether to stay in the tray.
#[tauri::command]
fn launch_context() -> bool {
    launched_at_login()
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be first: a second launch hands off to the running copy (which
        // comes to the front) and exits before it can fight over the hotkey.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app)
        }))
        .plugin(tauri_plugin_opener::init())
        // Signed updates from GitHub Releases (endpoint and public key in tauri.conf.json).
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        // Window starts hidden and the UI shows it after first paint (no white
        // flash, startup animation begins on frame one), so don't restore visibility.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::all() & !StateFlags::VISIBLE)
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![AUTOSTART_FLAG]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _, event| {
                    if event.state() == ShortcutState::Pressed {
                        show_main(app);
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.emit("aether:show-search", ());
                        }
                    }
                })
                .build(),
        )
        .manage(hotkey::HotkeyState::default())
        .setup(|app| {
            updates::take_restart_marker(app.handle());
            // Non-fatal: if another program owns the hotkey, Aether still starts and
            // Settings → Desktop says so (and lets you pick another).
            hotkey::register_saved(app.handle());
            let menu = MenuBuilder::new(app)
                .text("show", "Show Aether")
                .text("quit", "Quit Aether")
                .build()?;
            TrayIconBuilder::new()
                .icon(
                    app.default_window_icon()
                        .cloned()
                        .ok_or("missing app icon")?,
                )
                .tooltip("Aether — Veyl Studios")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => show_main(app),
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;
            // Safety net: if the UI fails to load or call show(), reveal the window anyway.
            // Skipped for login launches, which may intentionally stay in the tray.
            let handle = app.handle().clone();
            if !launched_at_login() {
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_secs(4));
                    if let Some(win) = handle.get_webview_window("main") {
                        if !win.is_visible().unwrap_or(true) {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                });
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            discovery::discover_installed_apps,
            hotkey::hotkey_status,
            hotkey::set_hotkey,
            icons::extract_app_icons,
            icons::icon_cache_folder,
            icons::icon_cache_lookup,
            icons::prune_icon_cache,
            icons::clear_icon_cache,
            icons::icon_cache_stats,
            launch::launch_target,
            launch::reveal_in_explorer,
            launch::target_exists,
            storage::set_wallpaper,
            storage::load_wallpaper,
            storage::clear_wallpaper,
            storage::card_art_folder,
            storage::save_card_art,
            storage::read_card_art,
            storage::delete_card_art,
            storage::prune_card_art,
            storage::read_image_file,
            storage::app_data_folder,
            storage::open_app_data_folder,
            updates::updates_configured,
            updates::prepare_update_restart,
            launch_context
        ])
        .run(tauri::generate_context!())
        .expect("error while running Aether");
}
