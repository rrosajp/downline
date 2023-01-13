#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::Serialize;
use std::{fs, path::PathBuf};

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

fn main() {
    fix_path_env::fix();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_store, save_store])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
