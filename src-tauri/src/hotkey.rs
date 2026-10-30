//! Global hotkey (v0.15.2): the saved key combination, whether Windows gave it
//! to Aether, and rebinding it from Settings → Desktop.
//!
//! The combination is kept in `hotkey.txt` in the app-data folder so it can be
//! registered at startup, before the UI loads (Aether may start hidden at sign-in).

use std::fs;
use std::str::FromStr;
use std::sync::{Mutex, MutexGuard};

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

use crate::util::write_atomic;

pub const DEFAULT_HOTKEY: &str = "Ctrl+Alt+Space";
const FILE: &str = "hotkey.txt";

#[derive(Default)]
pub struct HotkeyState(Mutex<HotkeyStatus>);

impl HotkeyState {
    fn lock(&self) -> MutexGuard<'_, HotkeyStatus> {
        self.0
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

#[derive(Clone, Default, Serialize)]
pub struct HotkeyStatus {
    /// The saved combination, e.g. "Ctrl+Alt+Space".
    shortcut: String,
    /// True when Windows registered it for Aether.
    active: bool,
    /// Why it isn't active, in plain words.
    error: Option<String>,
}

fn parse(text: &str) -> Option<Shortcut> {
    Shortcut::from_str(text.trim()).ok()
}

fn saved(app: &AppHandle) -> String {
    app.path()
        .app_data_dir()
        .ok()
        .and_then(|dir| fs::read_to_string(dir.join(FILE)).ok())
        .map(|text| text.trim().to_string())
        .filter(|text| parse(text).is_some())
        .unwrap_or_else(|| DEFAULT_HOTKEY.to_string())
}

fn save(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    write_atomic(&dir.join(FILE), shortcut.as_bytes())
}

fn friendly(error: impl ToString) -> String {
    let text = error.to_string();
    if text.contains("already registered") {
        "Another app is already using this shortcut.".into()
    } else {
        format!("Windows refused this shortcut ({text}).")
    }
}

/// Startup: register the saved combination. Failure is recorded, never fatal.
pub fn register_saved(app: &AppHandle) {
    let shortcut = saved(app);
    let result = app.global_shortcut().register(shortcut.as_str());
    if let Err(e) = &result {
        eprintln!("Aether: could not register {shortcut}: {e}");
    }
    let state = app.state::<HotkeyState>();
    let mut status = state.lock();
    *status = HotkeyStatus {
        shortcut,
        active: result.is_ok(),
        error: result.err().map(friendly),
    };
}

#[tauri::command]
pub async fn hotkey_status(state: State<'_, HotkeyState>) -> Result<HotkeyStatus, String> {
    Ok(state.lock().clone())
}

/// Switches to `shortcut`, or retries the current one if it is the same. The new
/// combination is registered before the old one is released, so a refused
/// combination leaves the working one in place.
#[tauri::command]
pub async fn set_hotkey(
    app: AppHandle,
    state: State<'_, HotkeyState>,
    shortcut: String,
) -> Result<HotkeyStatus, String> {
    let shortcut = shortcut.trim().to_string();
    let next = parse(&shortcut).ok_or("That key combination isn't supported.")?;
    let mut status = state.lock();
    let current = parse(&status.shortcut);
    let same = current.map(|c| c.id()) == Some(next.id());

    if same && status.active {
        if status.shortcut != shortcut {
            save(&app, &shortcut)?;
            status.shortcut = shortcut;
        }
        return Ok(status.clone());
    }

    let shortcuts = app.global_shortcut();
    if let Err(e) = shortcuts.register(next) {
        let message = friendly(e);
        if same {
            // Retrying the saved combination: keep showing why it failed.
            status.error = Some(message.clone());
        }
        return Err(message);
    }
    if status.active {
        if let Some(old) = current {
            let _ = shortcuts.unregister(old);
        }
    }
    if let Err(e) = save(&app, &shortcut) {
        eprintln!("Aether: could not save the hotkey: {e}");
    }
    *status = HotkeyStatus {
        shortcut,
        active: true,
        error: None,
    };
    Ok(status.clone())
}
