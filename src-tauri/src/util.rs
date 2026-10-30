//! Shared helpers: worker threads, PowerShell runner, image checks, atomic writes.
#![allow(unused_imports)]
use std::{
    fs,
    path::Path,
    process::{Command, Stdio},
    time::{Duration, Instant},
};

// ---------------------------------------------------------------------------
// v0.10: every slow native task runs on a blocking worker thread instead of
// Tauri's main thread, so scans and icon extraction never freeze the window.
// ---------------------------------------------------------------------------
pub(crate) async fn blocking<T: Send + 'static>(
    job: impl FnOnce() -> T + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(job)
        .await
        .map_err(|e| e.to_string())
}

/// Runs a PowerShell script with a hard timeout and no console window flash.
/// Returns stdout only when the script exits successfully in time.
#[cfg(target_os = "windows")]
pub(crate) fn run_powershell(
    script: &str,
    envs: &[(&str, String)],
    timeout: Duration,
) -> Option<Vec<u8>> {
    use std::io::Read;
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let mut command = Command::new("powershell.exe");
    command
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW);
    for (key, value) in envs {
        command.env(key, value);
    }
    let mut child = command.spawn().ok()?;
    let mut stdout = child.stdout.take()?;
    // Drain stdout on a helper thread so a large result can't deadlock the pipe.
    let reader = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = stdout.read_to_end(&mut buf);
        buf
    });
    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Some(status),
            Ok(None) if started.elapsed() < timeout => {
                std::thread::sleep(Duration::from_millis(40))
            }
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                break None;
            }
        }
    };
    let output = reader.join().ok()?;
    if status?.success() {
        Some(output)
    } else {
        None
    }
}

// ---------------------------------------------------------------------------
// Local image storage (wallpaper + card art), kept outside the webview database.
// ---------------------------------------------------------------------------
pub(crate) const MAX_IMAGE_BYTES: u64 = 12 * 1024 * 1024;

pub(crate) fn image_extension(contents: &[u8]) -> Option<&'static str> {
    if contents.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some("png")
    } else if contents.starts_with(b"\xff\xd8\xff") {
        Some("jpg")
    } else if contents.starts_with(b"GIF87a") || contents.starts_with(b"GIF89a") {
        Some("gif")
    } else if contents.starts_with(b"BM") {
        Some("bmp")
    } else if contents.len() >= 12 && &contents[..4] == b"RIFF" && &contents[8..12] == b"WEBP" {
        Some("webp")
    } else {
        None
    }
}

pub(crate) fn write_atomic(destination: &Path, contents: &[u8]) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let temp = destination.with_extension("tmp");
    fs::write(&temp, contents).map_err(|e| e.to_string())?;
    if destination.exists() {
        fs::remove_file(destination).map_err(|e| e.to_string())?;
    }
    fs::rename(temp, destination).map_err(|e| e.to_string())
}
