// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use std::path::{Path, PathBuf};
use once_cell::sync::OnceCell;
use tokio::sync::Mutex;
use tauri::{Manager, WindowEvent};
use std::path::Path;

use cached::proc_macro::cached;

use tauri_plugin_window_state::{AppHandleExt, StateFlags};

mod spotify;

static SPOTIFY: OnceCell<Mutex<spotify::Spotify>> = OnceCell::new();

#[tauri::command]
async fn refresh_spotify_token(sp_dc: &str) -> Result<(), String> {
    if let Some(spotify) = SPOTIFY.get() {
        let mut spotify = spotify.lock().await;
        match spotify.refresh_access_token(sp_dc).await {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Access Token could not be accessed: {}", e))
        }
    } else {
        Err("Spotify instance not initialized".into())
    }
}

#[tauri::command]
async fn get_current_song() -> Result<String, String> {
    if let Some(spotify) = SPOTIFY.get() {
        let spotify = spotify.lock().await;
        let song_data = match spotify.get_currently_playing().await {
            Ok(current_song) => {
                // println!("Currently playing song: {:?}", current_song);
                current_song
            },
            Err(e) => {
                // eprintln!("Failed to get currently playing song: {}", e);
                return Err(format!("Failed to get currently playing song: {}", e))
            }
        };
        Ok(song_data.to_string())
    } else {
        Err("Spotify instance not initialized".into())
    }
}

#[tauri::command]
async fn get_song_lyrics(song_id: &str) -> Result<String, String> {
    if let Some(spotify) = SPOTIFY.get() {
        let spotify = spotify.lock().await;
        let song_lyrics = match spotify.get_lyrics(song_id).await {
            Ok(lyrics) => {
                // println!("Currently playing song's lyrics: {:?}", lyrics);
                lyrics
            },
            Err(e) => {
                return Err(format!("Failed to get song lyrics: {}", e))
            }
        };

        Ok(song_lyrics.to_string())
    } else {
        Err("Spotify instance not initialized".into())
    }
}

#[tauri::command]
fn create_thumbnail(src: &str, dest: &str, width: u16, height: u16) -> Result<(), String> {
    let file_extension = Path::new(src).extension().and_then(std::ffi::OsStr::to_str);

    match file_extension {
        Some("mp4") => {
            Ok(())
        }
        _ => {
            let img = image::open(src).map_err(|e| format!("Failed to open source image: {}", e))?;
            let thumbnail = img.thumbnail(width.into(), height.into());
            thumbnail.save(dest).map_err(|e| format!("Failed to save thumbnail: {}", e))?;
            Ok(())
        }
    }
}
// #[tauri::command]
// fn create_thumbnail(src: &str, dest: &str, width: u16, height: u16) -> String {
//     let file_extension = Path::new(src).extension().and_then(std::ffi::OsStr::to_str);

//     match file_extension {
//         Some("mp4") => {
//             String::new()
//         }
//         _ => {
//             // Handle image files
//             let img = match image::open(src) {
//                 Ok(img) => img,
//                 Err(e) => return format!("Failed to open source image: {}", e),
//             };

//             // Resize the image to the specified dimensions
//             let thumbnail = img.thumbnail(width.into(), height.into());

//             // Save the thumbnail to the destination path
//             match thumbnail.save(dest) {
//                 Ok(_) => String::new(),
//                 Err(e) => format!("Failed to save thumbnail: {}", e),
//             }
//         }
//     }
// }


fn main() -> Result<(), Box<dyn std::error::Error>>  {
    let spotify_instance = spotify::Spotify::new();
    SPOTIFY.set(Mutex::new(spotify_instance)).unwrap();
    // tauri::Builder::default()
    //   .run(tauri::generate_context!())
    //   .expect("error while running tauri application");
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![create_thumbnail, refresh_spotify_token, get_current_song, get_song_lyrics])
        .on_window_event(|e| {
            if let WindowEvent::Resized(_) = e.event() {
                std::thread::sleep(std::time::Duration::from_nanos(1));
            }
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::Destroyed => {
                event.window().app_handle().save_window_state(StateFlags::all()).unwrap();
                let window = event.window();
                window.app_handle().exit(0);
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
