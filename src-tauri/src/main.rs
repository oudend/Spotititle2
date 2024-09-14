// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use std::path::{Path, PathBuf};
use once_cell::sync::OnceCell;
use serde_json::Value;
use tokio::sync::Mutex;
use tauri::{Manager, WindowEvent};
use std::path::Path;
use tokio::sync::mpsc;
use std::time::Duration;
use wana_kana::ConvertJapanese;

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

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>>  {
    let spotify_instance = spotify::Spotify::new();
    SPOTIFY.set(Mutex::new(spotify_instance)).unwrap();

    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            
            let mut last_song_id: String = String::new();

            let mut song_lyrics: Vec<Value> = Vec::new();  // Storing the lyrics as a vector

            let mut current_lyric_index: i16 = -1;

            let mut progress: u64 = 0;

            const UPDATE_INTERVAL: u64 = 1000;

            // Spawn an asynchronous task
            tauri::async_runtime::spawn(async move {
                // Call the status_stream_process which contains the infinite loop
                loop {
                    if let Some(spotify) = SPOTIFY.get() {
                        let spotify = spotify.lock().await;
        
                        if let Ok(current_song) = spotify.get_currently_playing().await {
                            // Emit an event for the current song
                            let song_id =  current_song["item"]["id"].as_str().unwrap_or("").to_string();

                            progress = current_song["progress_ms"].as_u64().unwrap_or(0);

                            println!("progress: {}", progress);

                            if last_song_id != song_id {
                                last_song_id = song_id.clone();
                                
                                println!("song changed: {}", song_id);

                                app_handle.emit_all("current-song-updated", current_song.to_string()).unwrap();

                                song_lyrics = match spotify.get_lyrics(&song_id).await {
                                    Ok(lyrics) => {
                                        println!("Currently playing song's lyrics: {:?}", lyrics["lyrics"]["lines"]);
                                        if let Some(lines) = lyrics["lyrics"]["lines"].as_array() {
                                            println!("Currently playing song's lyrics: {:?}", song_lyrics);
                                            lines.clone()
                                        } else {
                                            println!("Lyrics or lines are missing.");
                                            Vec::new()
                                        }
                                    },
                                    Err(e) => {
                                        println!("Could not get song lyrics: {:?}", e);
                                        Vec::new()
                                    }
                                };

                                current_lyric_index = -1;

                                for lyric in song_lyrics.iter() {
                                    // println!("{}", lyric["words"].as_str().unwrap_or("").to_string().to_romaji());

                                    let start_time = lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();

                                    println!("process: {}, {}", start_time, progress);

                                    if progress < start_time  {
                                        println!("finished: {}, {}", start_time, progress);
                                        if current_lyric_index != -1 {
                                            let lyric_text = song_lyrics[current_lyric_index as usize]["words"].as_str().unwrap_or("").to_string();
                                            println!("{}", lyric_text);
                                            app_handle.emit_all("current-song-lyric-updated", lyric_text).unwrap();
                                        }

                                        break;
                                    }

                                    current_lyric_index += 1;
                                }

                            }

                        }

                        let mut total_time_spent = 0;

                        loop {
                            if let Some(next_lyric) = song_lyrics.get((current_lyric_index + 1) as usize) {
                                let next_start_time = next_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();

                                let next_lyric_text = next_lyric["words"].as_str().unwrap_or("").to_string();
    
                                println!("{} - {}, {}", next_start_time, progress, current_lyric_index);

                                if let Some(current_lyric) = song_lyrics.get(current_lyric_index as usize) { //? check if progress was reversed by user
                                    let current_start_time = current_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();
                                    if progress < current_start_time {
                                        current_lyric_index -= 1;
                                        continue;
                                    }
                                }

                                if progress > next_start_time { //? check if progress was increased by user and prevent possible misses
                                    current_lyric_index += 1;

                                    if let Some(next_next_lyric) = song_lyrics.get((current_lyric_index + 1) as usize) { //? check if the program skipped by mistake 
                                        let next_next_start_time = next_next_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();

                                        println!("next_next_start_time: {}", next_next_start_time);

                                        if progress < next_next_start_time {
                                            println!("{}", next_lyric_text);
                                            app_handle.emit_all("current-song-lyric-updated", next_lyric_text).unwrap();
                                        }
                                    }

                                    continue;
                                }

                                let time_left = next_start_time - progress;
    
                                if total_time_spent + time_left > UPDATE_INTERVAL {
                                    break;
                                }

                                total_time_spent += time_left;


                                progress += time_left;

                                println!("waiting for: {} ms until next line", time_left);

                                tokio::time::sleep(Duration::from_millis(time_left)).await;

                                println!("{}", next_lyric_text);

                                app_handle.emit_all("current-song-lyric-updated", next_lyric_text).unwrap();

                                current_lyric_index += 1;
                            } else {
                                break;
                            }
                        }

            
                        // Sleep for a bit before checking again
                        tokio::time::sleep(Duration::from_millis(UPDATE_INTERVAL - total_time_spent)).await;
                    }
                }
            });
    
            Ok(())
        })
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
