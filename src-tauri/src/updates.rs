//! Update support (v0.15). Downloading and installing is done by the Tauri
//! updater plugin from the UI; this module only answers "can this build
//! update?" and makes sure the restart after an update opens the window.

use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

/// Written right before the installer runs, removed on the next start.
const MARKER: &str = "update-restart";
/// A marker older than this is left over from an install that never happened.
const MARKER_MAX_AGE_SECS: u64 = 15 * 60;

static RESUMED_AFTER_UPDATE: AtomicBool = AtomicBool::new(false);

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Called once at startup. The installer relaunches Aether with the arguments
/// it was started with, so a copy started at sign-in (`--autostart`) would
/// otherwise come back hidden in the tray and the update would look like it failed.
pub fn take_restart_marker(app: &tauri::AppHandle) {
    let Ok(dir) = app.path().app_data_dir() else {
        return;
    };
    let path = dir.join(MARKER);
    let Ok(text) = fs::read_to_string(&path) else {
        return;
    };
    let _ = fs::remove_file(&path);
    let written = text.trim().parse::<u64>().unwrap_or(0);
    if now_secs().saturating_sub(written) <= MARKER_MAX_AGE_SECS {
        RESUMED_AFTER_UPDATE.store(true, Ordering::Relaxed);
    }
}

pub fn resumed_after_update() -> bool {
    RESUMED_AFTER_UPDATE.load(Ordering::Relaxed)
}

/// False until `npm run setup-signing` has put the public key in tauri.conf.json.
#[tauri::command]
pub fn updates_configured(app: tauri::AppHandle) -> bool {
    app.config()
        .plugins
        .0
        .get("updater")
        .and_then(|u| u.get("pubkey"))
        .and_then(|k| k.as_str())
        .is_some_and(|k| !k.trim().is_empty())
}

#[tauri::command]
pub fn prepare_update_restart(app: tauri::AppHandle) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join(MARKER), now_secs().to_string()).map_err(|e| e.to_string())
}
