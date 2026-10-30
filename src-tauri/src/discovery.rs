//! Installed-app discovery: Start Menu shortcuts, App Paths, Windows apps.
#![allow(unused_imports)]
use crate::util::*;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{Duration, Instant},
};
use tauri::Manager;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredApp {
    name: String,
    target: String,
    source: String,
}

#[tauri::command]
pub async fn discover_installed_apps() -> Result<Vec<DiscoveredApp>, String> {
    blocking(discover_blocking).await
}

pub(crate) fn discover_blocking() -> Vec<DiscoveredApp> {
    #[cfg(not(target_os = "windows"))]
    {
        return vec![];
    }
    #[cfg(target_os = "windows")]
    {
        let mut result = Vec::new();
        let mut seen = HashSet::new();
        let mut roots = Vec::<PathBuf>::new();
        if let Ok(appdata) = std::env::var("APPDATA") {
            roots.push(Path::new(&appdata).join("Microsoft/Windows/Start Menu/Programs"));
        }
        if let Ok(programdata) = std::env::var("ProgramData") {
            roots.push(Path::new(&programdata).join("Microsoft/Windows/Start Menu/Programs"));
        }
        for root in roots {
            collect_shortcuts(&root, &mut result, &mut seen, 0);
        }
        // App Paths are executable paths registered by installers; Get-StartApps
        // exposes packaged app IDs. Neither requires an administrator account.
        let script: &str = r#"
$ErrorActionPreference='SilentlyContinue'
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false) } catch {}
$results = New-Object System.Collections.Generic.List[object]
$locations = @('HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths', 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths')
foreach($location in $locations){
  Get-ChildItem -LiteralPath $location -ErrorAction SilentlyContinue | ForEach-Object {
    $exe = (Get-Item -LiteralPath $_.PSPath -ErrorAction SilentlyContinue).GetValue('')
    if($exe -is [string] -and $exe) { $exe = $exe.Trim('"') }
    if($exe -is [string] -and $exe -and (Test-Path -LiteralPath $exe -PathType Leaf)) {
      $results.Add([PSCustomObject]@{name=[IO.Path]::GetFileNameWithoutExtension($_.PSChildName);target=$exe;source='App Paths'})
    }
  }
}
Get-StartApps -ErrorAction SilentlyContinue | ForEach-Object {
 if($_.Name -and $_.AppID -and $_.AppID -match '^[a-zA-Z0-9_.!\-]+$') {
   $results.Add([PSCustomObject]@{name=$_.Name;target=('shell:AppsFolder\' + $_.AppID);source='Windows Apps'})
 }
}
ConvertTo-Json -InputObject @($results.ToArray()) -Depth 3 -Compress
"#;
        if let Some(stdout) = run_powershell(script, &[], Duration::from_secs(45)) {
            // Strip a UTF-8 BOM if PowerShell emits one.
            let body = stdout.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(&stdout);
            if body.len() < 3_000_000 {
                if let Ok(discovered) = serde_json::from_slice::<Vec<DiscoveredApp>>(body) {
                    for item in discovered {
                        let key = item.target.to_lowercase();
                        if !item.name.trim().is_empty()
                            && !item.target.trim().is_empty()
                            && seen.insert(key)
                        {
                            result.push(item);
                        }
                    }
                }
            }
        }
        result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        result
    }
}

#[cfg(target_os = "windows")]
pub(crate) fn collect_shortcuts(
    path: &Path,
    out: &mut Vec<DiscoveredApp>,
    seen: &mut HashSet<String>,
    depth: usize,
) {
    if depth > 12 || out.len() >= 2000 {
        return;
    }
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_shortcuts(&path, out, seen, depth + 1);
            continue;
        }
        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if extension != "lnk" && extension != "url" {
            continue;
        }
        let Some(name) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        if name.is_empty()
            || name.eq_ignore_ascii_case("uninstall")
            || name.to_lowercase().starts_with("uninstall ")
        {
            continue;
        }
        let key = path.to_string_lossy().to_lowercase();
        if !seen.insert(key) {
            continue;
        }
        out.push(DiscoveredApp {
            name: name.to_owned(),
            target: path.to_string_lossy().into_owned(),
            source: "Start Menu".into(),
        });
    }
}
