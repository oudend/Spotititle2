// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use std::path::{Path, PathBuf};
use once_cell::sync::OnceCell;
use serde_json::{Value, json};
use tokio::sync::Mutex;
use lazy_static::lazy_static;
use tauri::{Manager, WindowEvent};
use std::{cmp, path::{Path, PathBuf}};
use tokio::sync::mpsc;
use std::time::Duration;
// use tauri_plugin_store::StoreBuilder;
use tauri::Wry;
use tauri_plugin_store::{with_store, StoreCollection};

// use wana_kana::ConvertJapanese;
// use pinyin::{ToPinyin, ToPinyinMulti};
// use cjk::{is_japanese, is_korean, is_simplified_chinese, is_traditional_chinese};


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

fn send_lyric(app_handle: &tauri::AppHandle, lyric_text: String, current_lyric_index: i16) {
    let json_data = json!({
        "text": lyric_text,
        "index": current_lyric_index
    });

    app_handle.emit_all("current-song-lyric-updated", json_data.to_string()).unwrap();
}

lazy_static! {
    static ref UPDATE_INTERVAL: Mutex<u64> = Mutex::new(1000); // Default value 1000ms
    static ref SUBTITLE_OFFSET: Mutex<i64> = Mutex::new(0); // Default value 1000ms
}

#[tauri::command]
async fn set_update_interval(new_interval: u64) {
    let mut interval = UPDATE_INTERVAL.lock().await; // Await the lock
    *interval = new_interval;

    // println!("set_update_interval: {}", interval);
}

#[tauri::command]
async fn set_subtitle_offset(new_offset: i64) {
    let mut offset = SUBTITLE_OFFSET.lock().await; // Await the lock
    *offset = new_offset;

    // println!("set_update_interval: {}", offset);
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>>  {
    
    tauri::Builder::default()
    .setup(|app| {
        let app_handle = app.handle();
        
        let mut last_song_id: String = String::new();
        
        let mut song_lyrics: Vec<Value> = Vec::new();  // Storing the lyrics as a vector
        
        let mut current_lyric_index: i16 = -1;
        
        let mut progress: u64 = 0;
        
        let spotify_instance = spotify::Spotify::new();
        SPOTIFY.set(Mutex::new(spotify_instance)).unwrap();
        // const UPDATE_INTERVAL: u64 = 1000;

        let stores = app.state::<StoreCollection<Wry>>();
        let path = PathBuf::from(".settings.dat");

        // Define a helper function to get values from the store
        fn get_store_value(
            app_handle: tauri::AppHandle<Wry>,
            stores: tauri::State<'_,StoreCollection<Wry>>,
            path: PathBuf,
            key: &str,
        ) -> Result<serde_json::Value, tauri_plugin_store::Error> {
            with_store(app_handle, stores, path, |store| {
                match store.get(key) {
                    Some(value) => Ok(value.clone()), // Return the value wrapped in Ok
                    None => Err(tauri_plugin_store::Error::NotFound(PathBuf::from(key))),
                }
            })
        }

        // let app_handle_clone = app_handle.clone(); // Clone the handle to avoid borrowing issues


        // Get the "updateInterval" from the store
        let update_interval_result = get_store_value(app_handle.clone(), stores.clone(), path.clone(), "updateInterval");

        // Get the "subtitleOffset" from the store
        let subtitle_offset_result = get_store_value(app_handle.clone(), stores.clone(), path.clone(), "subtitleOffset");

        // Use the cloned handle in with_store
        // let update_interval_result = with_store(app_handle_clone, stores, path.clone(), |store| {
        //     match store.get("updateInterval") {
        //         Some(value) => Ok(value.clone()), // Return the value wrapped in Ok
        //         None => Err(tauri_plugin_store::Error::NotFound(path))
        //     }
        // });

        // // Use the cloned handle in with_store
        // let subtitle_offset_result = with_store(app_handle_clone, stores, path.clone(), |store| {
        //     match store.get("subtitleOffset") {
        //         Some(value) => Ok(value.clone()), // Return the value wrapped in Ok
        //         None => Err(tauri_plugin_store::Error::NotFound(path))
        //     }
        // });

        // println!("update_interval_result: {}", update_interval_result.unwrap().clone());
        
        // Spawn an asynchronous task
        tauri::async_runtime::spawn(async move {
            // Call the status_stream_process which contains the infinite loop

            // println!("getting update_interval_result {}", update_interval_result.unwrap());

            // Handle the result of the operation
            match update_interval_result {
                Ok(stored_update_interval) => {
                    println!("stored_update_interval: {}", stored_update_interval);

                    // Assuming UPDATE_INTERVAL is a Mutex<u64>
                    let mut interval = UPDATE_INTERVAL.lock().await; // Await the lock
                    if let Some(str_value) = stored_update_interval.as_str() {
                        match str_value.parse::<u64>() {
                            Ok(u64_value) => {
                                println!("stored update interval: {:?}", u64_value);
                                *interval = u64_value; // Update the mutable variable
                            }
                            Err(e) => {
                                println!("Stored update interval is not a valid u64. {}", e);
                            }
                        }
                        // if Ok(u64_value) = str_value.parse::<u64>() {
                        //     println!("stored update interval: {:?}", u64_value);
                        //     *interval = u64_value; // Update the mutable variable
                        // }
                    } else {
                        println!("Stored update interval is not a valid str.");
                    }
                }
                Err(e) => {
                    // Handle the error case
                    println!("Error retrieving update interval: {:?}", e);
                }
            }
            match subtitle_offset_result {
                Ok(stored_subtitle_offset) => {
                    // println!("stored_update_interval: {}", stored_subtitle_offset);

                    // Assuming UPDATE_INTERVAL is a Mutex<u64>
                    let mut offset = SUBTITLE_OFFSET.lock().await; // Await the lock
                    if let Some(str_value) = stored_subtitle_offset.as_str() {
                        match str_value.parse::<i64>() {
                            Ok(i64_value) => {
                                println!("stored subtitle offset: {:?}", i64_value);
                                *offset = i64_value; // Update the mutable variable
                            }
                            Err(e) => {
                                println!("Stored update interval is not a valid u64. {}", e);
                            }
                        }
                        // if Ok(u64_value) = str_value.parse::<u64>() {
                        //     println!("stored update interval: {:?}", u64_value);
                        //     *interval = u64_value; // Update the mutable variable
                        // }
                    } else {
                        println!("Stored update interval is not a valid str.");
                    }
                }
                Err(e) => {
                    // Handle the error case
                    println!("Error retrieving update interval: {:?}", e);
                }
            }

            loop {

                if let Some(spotify) = SPOTIFY.get() {
                    let spotify = spotify.lock().await;
        
                        if let Ok(current_song) = spotify.get_currently_playing().await {
                            // Emit an event for the current song
                            let song_id =  current_song["item"]["id"].as_str().unwrap_or("").to_string();

                            progress = current_song["progress_ms"].as_u64().unwrap_or(0);

                            // println!("progress: {}", progress);

                            if last_song_id != song_id {
                                last_song_id = song_id.clone();
                                
                                // println!("song changed: {}", song_id);

                                app_handle.emit_all("current-song-updated", current_song.to_string()).unwrap();

                                song_lyrics = match spotify.get_lyrics(&song_id).await {
                                    Ok(lyrics) => {
                                        // println!("Currently playing song's lyrics: {:?}", lyrics["lyrics"]["lines"]);

                                        app_handle.emit_all("current-song-lyrics", lyrics.to_string()).unwrap();

                                        if let Some(lines) = lyrics["lyrics"]["lines"].as_array() {
                                            // println!("Currently playing song's lyrics: {:?}", song_lyrics);

                                            lines.clone()
                                        } else {
                                            // println!("Lyrics or lines are missing.");
                                            Vec::new()
                                        }
                                    },
                                    Err(e) => {
                                        // println!("Could not get song lyrics: {:?}", e);
                                        Vec::new()
                                    }
                                };

                                current_lyric_index = -1;

                                for lyric in song_lyrics.iter() {
                                    // println!("{}", lyric["words"].as_str().unwrap_or("").to_string().to_romaji());

                                    let start_time = lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();

                                    // println!("process: {}, {}", start_time, progress);

                                    if progress < start_time  {
                                        // println!("finished: {}, {}", start_time, progress);
                                        if current_lyric_index != -1 {
                                            let lyric_text = song_lyrics[current_lyric_index as usize]["words"].as_str().unwrap_or("").to_string();
                                            // println!("{}", lyric_text);
                                            send_lyric(&app_handle, lyric_text, current_lyric_index);
                                            // app_handle.emit_all("current-song-lyric-updated", lyric_text).unwrap();
                                        }

                                        break;
                                    }

                                    current_lyric_index += 1;
                                }

                            }

                        }

                        let update_interval = cmp::max(200, *UPDATE_INTERVAL.lock().await);

                        let subtitle_offset = *SUBTITLE_OFFSET.lock().await;

                        let mut total_time_spent = 0;

                        loop {
                            // let offset_progress = progress + subtitle_offset;

                            let offset_progress = if subtitle_offset < 0 {
                                progress.saturating_sub((-subtitle_offset) as u64)
                            } else {
                                progress.saturating_add(subtitle_offset as u64)
                            };

                            if let Some(next_lyric) = song_lyrics.get((current_lyric_index + 1) as usize) {
                                let next_start_time = next_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();

                                // let next_lyric_text = next_lyric["words"].as_str().unwrap_or("").to_romaji();
                                let next_lyric_text = next_lyric["words"].as_str().unwrap_or("");
    
                                // println!("{} - {}, {}", next_start_time, progress, current_lyric_index);

                                if let Some(current_lyric) = song_lyrics.get(current_lyric_index as usize) { //? check if progress was reversed by user
                                    let current_start_time = current_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();
                                    if offset_progress < current_start_time {
                                        current_lyric_index -= 1;
                                        continue;
                                    }
                                }

                                if offset_progress > next_start_time { //? check if progress was increased by user and prevent possible misses
                                    current_lyric_index += 1;

                                    if let Some(next_next_lyric) = song_lyrics.get((current_lyric_index + 1) as usize) { //? check if the program skipped by mistake 
                                        let next_next_start_time = next_next_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();

                                        // println!("next_next_start_time: {}", next_next_start_time);

                                        if offset_progress < next_next_start_time {
                                            // println!("{}", next_lyric_text);
                                            // app_handle.emit_all("current-song-lyric-updated", next_lyric_text).unwrap();
                                            send_lyric(&app_handle, next_lyric_text.to_string(), current_lyric_index);
                                        }
                                    }

                                    continue;
                                }

                                let time_left = next_start_time - offset_progress;
    
                                if total_time_spent + time_left > update_interval {
                                    break;
                                }

                                total_time_spent += time_left;


                                progress += time_left;

                                // println!("waiting for: {} ms until next line", time_left);

                                tokio::time::sleep(Duration::from_millis(time_left)).await;

                                // println!("{}", next_lyric_text);

                                
                                send_lyric(&app_handle, next_lyric_text.to_string(), current_lyric_index);
                                
                                // app_handle.emit_all("current-song-lyric-updated", next_lyric_text).unwrap();
                                
                                current_lyric_index += 1;
                            } else {
                                break;
                            }
                        }

                        println!("update_interval: {}", update_interval);
            
                        // Sleep for a bit before checking again
                        tokio::time::sleep(Duration::from_millis(update_interval - total_time_spent)).await;
                    }
                }
            });
    
            Ok(())
        })
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![create_thumbnail, refresh_spotify_token, get_current_song, get_song_lyrics, set_update_interval, set_subtitle_offset])
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
