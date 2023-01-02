#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs;

#[tauri::command]
fn load_store(app_handle: tauri::AppHandle) -> Option<String> {
    let app_directory = tauri::api::path::app_config_dir(&app_handle.config())?;
    let config_file_path = get_config_path(&app_directory);
    let contents = fs::read_to_string(config_file_path);
    match contents {
        Ok(contents) => {
            return Some(contents);
        }
        Err(_e) => {
            // Do nothing
            println!("File not found");
            return None;
        }
    }
}

#[tauri::command]
fn save_store(app_handle: tauri::AppHandle, data: String) -> Option<()> {
    let app_directory = tauri::api::path::app_config_dir(&app_handle.config())?;

    let result = fs::create_dir_all(&app_directory);
    match result {
        Ok(_) => {}
        Err(e) => {
            // Do nothing
            println!("Failed to create directories {}", e);
            return None;
        }
    }

    let config_file_path = get_config_path(&app_directory);
    let result = fs::write(config_file_path, data);
    match result {
        Ok(_) => {
            return Some(());
        }
        Err(e) => {
            // Do nothing
            println!("Failed to write to file {}", e);
            return None;
        }
    }
}

fn get_config_path(app_directory: &std::path::PathBuf) -> std::path::PathBuf {
    app_directory.join("config.json")
}

#[tauri::command]
fn generate_ytdl_config(app_handle: tauri::AppHandle, download_folder: String) -> Option<()> {
    let config_file_path = get_ytdl_config_path(app_handle)?;

    // https://github.com/ytdl-org/youtube-dl#output-template
    let contents = format!("-o {download_folder}/%(title)s.%(ext)s")
        .to_string();

    let result = fs::write(config_file_path, contents);
    match result {
        Ok(_) => {
            return Some(());
        }
        Err(e) => {
            // Do nothing
            println!("Failed to write to file {}", e);
            return None;
        }
    }
}

#[tauri::command]
fn get_ytdl_config_path(app_handle: tauri::AppHandle) -> Option<String> {
    let app_directory = tauri::api::path::app_config_dir(&app_handle.config())?;

    let config_file_path = app_directory.join("ytld_config.json");

    let result = config_file_path.to_str();
    match result {
        Some(path) => {
            return Some(path.to_string());
        }
        None => {
            // Do nothing
            println!("Failed to get path");
            return None;
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_store, save_store, generate_ytdl_config, get_ytdl_config_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
