//! On-disk icon cache and batched PowerShell icon extraction.
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

// ---------------------------------------------------------------------------
// v0.13: on-disk icon cache. Extracted icons are PNG files in
// <app data>/icon-cache/, named by a stable hash of the target path plus its
// modified time and size, so an updated program gets a fresh icon by itself.
// The UI receives file names only and loads them through the asset protocol.
// ---------------------------------------------------------------------------
pub(crate) fn icon_cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(base.join("icon-cache"))
}

/// FNV-1a: tiny and stable across Rust versions (unlike DefaultHasher).
pub(crate) fn fnv1a(bytes: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for b in bytes {
        hash ^= *b as u64;
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    hash
}

/// Cache file name for a target, or None if the target doesn't exist.
pub(crate) fn icon_key(target: &str) -> Option<String> {
    let target = target.trim();
    let meta = fs::metadata(target).ok()?;
    // Folders: their modified time changes whenever contents change, but their icon doesn't.
    let (stamp, size) = if meta.is_dir() {
        (0, 0)
    } else {
        let stamp = meta
            .modified()
            .ok()
            .and_then(|m| m.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);
        (stamp, meta.len())
    };
    let identity = format!("{}|{}|{}", target.to_lowercase(), stamp, size);
    Some(format!("{:016x}.png", fnv1a(identity.as_bytes())))
}

pub(crate) fn valid_icon_file(name: &str) -> bool {
    name.is_ascii()
        && name.len() == 20
        && name.ends_with(".png")
        && name[..16].chars().all(|c| c.is_ascii_hexdigit())
}

#[tauri::command]
pub fn icon_cache_folder(app: tauri::AppHandle) -> Result<String, String> {
    let dir = icon_cache_dir(&app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().into_owned())
}

/// Which targets already have a cached icon (same order; None = not cached).
#[tauri::command]
pub async fn icon_cache_lookup(
    app: tauri::AppHandle,
    targets: Vec<String>,
) -> Result<Vec<Option<String>>, String> {
    blocking(move || {
        let dir = icon_cache_dir(&app)?;
        Ok(targets
            .iter()
            .map(|t| icon_key(t).filter(|k| dir.join(k).is_file()))
            .collect())
    })
    .await?
}

/// Extract icons for targets that aren't cached yet, write them as files, and
/// return the file names (same order; None = no icon available). Batched:
/// one PowerShell process per batch of misses.
#[tauri::command]
pub async fn extract_app_icons(
    app: tauri::AppHandle,
    targets: Vec<String>,
) -> Result<Vec<Option<String>>, String> {
    blocking(move || {
        use base64::Engine;
        let dir = icon_cache_dir(&app)?;
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let keys: Vec<Option<String>> = targets.iter().map(|t| icon_key(t)).collect();
        let mut results: Vec<Option<String>> = vec![None; targets.len()];
        let mut misses = Vec::new();
        for (i, key) in keys.iter().enumerate() {
            match key {
                Some(k) if dir.join(k).is_file() => results[i] = Some(k.clone()),
                Some(_) => misses.push(i),
                None => {}
            }
        }
        if misses.is_empty() {
            return Ok(results);
        }
        let extracted =
            extract_icons_blocking(misses.iter().map(|&i| targets[i].clone()).collect());
        for (slot, data) in misses.into_iter().zip(extracted) {
            let (Some(data), Some(key)) = (data, keys[slot].clone()) else {
                continue;
            };
            let payload = data.split_once(',').map(|(_, b)| b).unwrap_or(&data);
            let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(payload) else {
                continue;
            };
            if image_extension(&bytes) != Some("png") {
                continue;
            }
            if write_atomic(&dir.join(&key), &bytes).is_ok() {
                results[slot] = Some(key);
            }
        }
        Ok(results)
    })
    .await?
}

/// Delete cached icons no current shortcut uses (old versions, removed shortcuts).
#[tauri::command]
pub async fn prune_icon_cache(app: tauri::AppHandle, keep: Vec<String>) -> Result<u32, String> {
    blocking(move || {
        let dir = icon_cache_dir(&app)?;
        let keep: HashSet<String> = keep.into_iter().map(|k| k.to_lowercase()).collect();
        let Ok(entries) = fs::read_dir(&dir) else {
            return Ok(0);
        };
        let mut removed = 0;
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().into_owned();
            if valid_icon_file(&name)
                && !keep.contains(&name.to_lowercase())
                && fs::remove_file(entry.path()).is_ok()
            {
                removed += 1;
            }
        }
        Ok(removed)
    })
    .await?
}

#[tauri::command]
pub async fn clear_icon_cache(app: tauri::AppHandle) -> Result<(), String> {
    blocking(move || {
        let dir = icon_cache_dir(&app)?;
        if dir.exists() {
            fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
        }
        fs::create_dir_all(&dir).map_err(|e| e.to_string())
    })
    .await?
}

/// (file count, total bytes) for the Settings page.
#[tauri::command]
pub async fn icon_cache_stats(app: tauri::AppHandle) -> Result<(u32, u64), String> {
    blocking(move || {
        let dir = icon_cache_dir(&app)?;
        let Ok(entries) = fs::read_dir(&dir) else {
            return Ok((0, 0));
        };
        let (mut count, mut bytes) = (0u32, 0u64);
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    count += 1;
                    bytes += meta.len();
                }
            }
        }
        Ok((count, bytes))
    })
    .await?
}

pub(crate) fn extract_icons_blocking(targets: Vec<String>) -> Vec<Option<String>> {
    #[cfg(not(target_os = "windows"))]
    {
        return targets.iter().map(|_| None).collect();
    }
    #[cfg(target_os = "windows")]
    {
        const SCRIPT: &str = r#"
$ErrorActionPreference='SilentlyContinue'
Add-Type -AssemblyName System.Drawing
# PowerShell 5.1 emits JSON arrays as one object; foreach enumerates it correctly.
$targets = ConvertFrom-Json $env:AETHER_ICON_TARGETS
$shell = New-Object -ComObject WScript.Shell
$out = New-Object System.Collections.Generic.List[string]
foreach ($p in $targets) {
  $value = ''
  try {
    if ($p -and (Test-Path -LiteralPath $p)) {
      if ([IO.Path]::GetExtension($p) -ieq '.lnk') {
        $link = $shell.CreateShortcut($p)
        if ($link.IconLocation -and $link.IconLocation -notmatch ',[-0-9]+$' -and (Test-Path -LiteralPath $link.IconLocation)) { $p = $link.IconLocation }
        elseif ($link.TargetPath -and (Test-Path -LiteralPath $link.TargetPath)) { $p = $link.TargetPath }
      }
      $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($p)
      if ($null -ne $icon) {
        $bitmap = $icon.ToBitmap()
        $stream = New-Object IO.MemoryStream
        $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
        $value = [Convert]::ToBase64String($stream.ToArray())
        $stream.Dispose(); $bitmap.Dispose(); $icon.Dispose()
      }
    }
  } catch { $value = '' }
  $out.Add($value)
}
ConvertTo-Json -InputObject @($out.ToArray()) -Compress
"#;
        let mut results: Vec<Option<String>> = vec![None; targets.len()];
        // Keep each batch's environment payload well under Windows' 32,767-char limit.
        let mut start = 0;
        while start < targets.len() {
            let mut end = start;
            let mut size = 2;
            while end < targets.len()
                && end - start < 40
                && size + targets[end].len() * 2 + 4 < 24_000
            {
                size += targets[end].len() * 2 + 4;
                end += 1;
            }
            if end == start {
                start += 1;
                continue;
            } // single absurdly long path: skip it
            let batch = &targets[start..end];
            let Ok(json) = serde_json::to_string(batch) else {
                start = end;
                continue;
            };
            let timeout = Duration::from_secs(10 + batch.len() as u64 * 2);
            if let Some(stdout) = run_powershell(SCRIPT, &[("AETHER_ICON_TARGETS", json)], timeout)
            {
                let body = stdout.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(&stdout);
                // A one-element array may be emitted as a bare string by older PowerShell.
                let parsed: Vec<String> = serde_json::from_slice::<Vec<String>>(body)
                    .or_else(|_| serde_json::from_slice::<String>(body).map(|s| vec![s]))
                    .unwrap_or_default();
                for (offset, encoded) in parsed.into_iter().enumerate().take(batch.len()) {
                    let encoded = encoded.trim();
                    if !encoded.is_empty()
                        && encoded.len() <= 500_000
                        && encoded
                            .chars()
                            .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '=')
                    {
                        results[start + offset] =
                            Some(format!("data:image/png;base64,{}", encoded));
                    }
                }
            }
            start = end;
        }
        results
    }
}
