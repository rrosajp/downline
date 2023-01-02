#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs;

#[tauri::command]
fn load_store(app_handle: tauri::AppHandle) -> String {
    let app_directory = tauri::api::path::app_config_dir(&app_handle.config());
    match app_directory {
        Some(mut path) => {
            path.push("config.json");
            let contents = fs::read_to_string(path);
            match contents {
                Ok(contents) => {
                    return contents;
                }
                Err(_e) => {
                    // Do nothing
                    println!("File not found");
                    return "".into();
                }
            }
        }
        None => {
            // Do nothing
            println!("No Tauri config");
            return "".into();
        }
    }
}

#[tauri::command]
fn save_store(app_handle: tauri::AppHandle, data: String) {
    let app_directory = tauri::api::path::app_config_dir(&app_handle.config());
    match app_directory {
        Some(mut path) => {
            let result = fs::create_dir_all(&path);
            match result {
                Ok(_) => {}
                Err(e) => {
                    // Do nothing
                    println!("Failed to create directories {}", e);
                }
            }

            path.push("config.json");
            let result = fs::write(path, data);
            match result {
                Ok(_) => {}
                Err(e) => {
                    // Do nothing
                    println!("Failed to write to file {}", e);
                }
            }
        }
        None => {
            // Do nothing
            println!("No Tauri config");
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_store, save_store])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
