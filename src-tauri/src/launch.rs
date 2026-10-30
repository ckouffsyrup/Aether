//! Launching targets, Run as administrator, File Explorer reveal, target checks.
#![allow(unused_imports)]
use crate::util::*;
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{Duration, Instant},
};
use tauri::Manager;

/// Launch a target with Windows shell associations. `verb` is "open" (default)
/// or "runas" (Run as administrator; executables and shortcuts only).
#[tauri::command]
pub async fn launch_target(target: String, verb: Option<String>) -> Result<(), String> {
    blocking(move || launch_blocking(target, verb)).await?
}

pub(crate) fn launch_blocking(target: String, verb: Option<String>) -> Result<(), String> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err("Shortcut target is empty".into());
    }
    let verb = verb.unwrap_or_else(|| "open".into());
    if verb != "open" && verb != "runas" {
        return Err("Unsupported launch action".into());
    }
    #[cfg(target_os = "windows")]
    {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::System::Com::{
            CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE,
        };
        use windows_sys::Win32::UI::Shell::ShellExecuteW;
        let is_url = target.starts_with("https://") || target.starts_with("http://");
        let is_app_id = target.starts_with("shell:AppsFolder\\");
        if verb == "runas" && (is_url || is_app_id) {
            return Err(
                "Run as administrator is only available for programs and shortcuts.".into(),
            );
        }
        if !is_url && !is_app_id && !Path::new(&target).exists() {
            return Err(format!(
                "Target does not exist: {}. Edit this shortcut and browse to the correct file.",
                target
            ));
        }
        let wide: Vec<u16> = OsStr::new(&target)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let action: Vec<u16> = OsStr::new(&verb)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        // ShellExecute may rely on COM shell extensions; initialize COM on this worker thread.
        let com = unsafe {
            CoInitializeEx(
                std::ptr::null(),
                (COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE) as u32,
            )
        };
        let result = unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                action.as_ptr(),
                wide.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                1,
            )
        } as isize;
        if com >= 0 {
            unsafe { CoUninitialize() };
        }
        if result <= 32 {
            // 5 = access denied, which is what a cancelled UAC prompt reports.
            if verb == "runas" && result == 5 {
                return Err("cancelled".into());
            }
            return Err(format!("Windows could not open this target (ShellExecute code {}). Try editing the shortcut target: {}", result, target));
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (target, verb);
        Err("Native launching is available on Windows only".into())
    }
}

/// Open File Explorer with the shortcut's file selected.
#[tauri::command]
pub async fn reveal_in_explorer(target: String) -> Result<(), String> {
    blocking(move || {
        let target = target.trim().to_owned();
        if target.starts_with("http://")
            || target.starts_with("https://")
            || target.starts_with("shell:")
        {
            return Err("This shortcut has no file location.".to_string());
        }
        if !Path::new(&target).exists() {
            return Err(format!("Target does not exist: {}", target));
        }
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            // Windows paths cannot contain quotes, so this raw argument is safe.
            Command::new("explorer.exe")
                .raw_arg(format!("/select,\"{}\"", target))
                .spawn()
                .map(|_| ())
                .map_err(|e| e.to_string())
        }
        #[cfg(not(target_os = "windows"))]
        {
            Err("File Explorer is available on Windows only".to_string())
        }
    })
    .await?
}

/// Editor: does a local shortcut target exist? (Worker thread: network paths can be slow.)
#[tauri::command]
pub async fn target_exists(target: String) -> Result<bool, String> {
    blocking(move || Path::new(target.trim()).exists()).await
}
