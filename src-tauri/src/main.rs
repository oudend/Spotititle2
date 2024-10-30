// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use once_cell::sync::OnceCell;
use serde_json::{Value, json};
use tokio::sync::Mutex;
use lazy_static::lazy_static;
use tauri::{Manager, WindowEvent};
use std::{cmp, path::{Path, PathBuf}};
use std::time::Duration;
use tauri::Wry;
use tauri_plugin_store::{with_store, StoreCollection};
use wana_kana::ConvertJapanese;
use pinyin::ToPinyin;
use std::fs::{OpenOptions, create_dir_all};
use std::io::Write; // Bring the Write trait into scope


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
                current_song
            },
            Err(e) => {
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

fn log_to_debug(app_handle: &tauri::AppHandle, debug_text: String) {
    // Get the app data directory
    if let Some(app_data_dir) = app_handle.path_resolver().app_data_dir() {
        // Ensure the directory exists
        if let Err(e) = create_dir_all(&app_data_dir) {
            println!("Failed to create app data directory: {}", e);
        }

        // Open (or create and append to) the log file
        let log_path = app_data_dir.join("log.txt");
        if let Ok(mut file) = OpenOptions::new().append(true).create(true).open(&log_path) {
            if let Err(e) = writeln!(file, "{}", debug_text) {
                println!("Failed to write to log file: {}", e);
            }
        } else {
            println!("Failed to open or create log file.");
        }
    } else {
        println!("App data directory could not be determined.");
    }

    // Print to console and emit to frontend
    println!("debug: {}", debug_text);
    app_handle.emit_all("debug", debug_text).unwrap();
}

async fn send_lyric(app_handle: &tauri::AppHandle, lyric_text: String, current_lyric_index: i16, lyric_display_time: u64) {
    let stores = app_handle.state::<StoreCollection<Wry>>();
    let path = PathBuf::from(".settings.dat");

    let stored_subtitle_conversions = get_store_value(app_handle.clone(), stores, path, "ConvertText"); 

    let subtitle_conversions = match stored_subtitle_conversions {
        Ok(value) => {
            value.as_array().cloned().unwrap_or_else(Vec::new)
        }
        Err(e) => {
            log_to_debug(app_handle, format!("Could not retrieve subtitle conversions. {}", e));
            Vec::new()
        }
    };

    let mut new_lyric_text = lyric_text.clone();

    fn detect_language(text: &str) -> Option<&'static str> {
        let mut chinese_count = 0;
        let mut japanese_count = 0;
    
        for c in text.chars() {
            if (c >= '\u{4E00}' && c <= '\u{9FFF}') || // CJK Unified Ideographs
               (c >= '\u{3400}' && c <= '\u{4DBF}') || // CJK Unified Ideographs Extension A
               (c >= '\u{20000}' && c <= '\u{2A6DF}') || // CJK Unified Ideographs Extension B
               (c >= '\u{F900}' && c <= '\u{FAFF}') { // CJK Compatibility Ideographs
                chinese_count += 1;
            } else if (c >= '\u{3040}' && c <= '\u{309F}') || // Hiragana
                      (c >= '\u{30A0}' && c <= '\u{30FF}') { // Katakana
                japanese_count += 1;
            }
        }
    
        if chinese_count > japanese_count {
            Some("Chinese")
        } else if japanese_count > chinese_count {
            Some("Japanese")
        } else {
            None // If counts are equal or both are 0
        }
    }

    for conversion in subtitle_conversions {
        if let Some(conversion_str) = conversion.as_str() {
            let detected_language = detect_language(&lyric_text);

            match conversion_str {
                "KanjiToRomaji" => {
                    if detected_language == Some("Japanese") {
                        new_lyric_text = new_lyric_text.to_romaji();
                        log_to_debug(app_handle, format!("Handling KanjiToRomaji conversion {}", new_lyric_text));
                    }

                    // Handle KanjiToRomaji logic here
                }
                "toPinyin" => {
                    // if is_simplified_chinese(&lyric_text) || is_traditional_chinese(&lyric_text) {
                    if detected_language == Some("Chinese") {
                        new_lyric_text = new_lyric_text
                            .chars()
                            .map(|c| {
                                // Check if the character is Chinese (i.e., it has Pinyin)
                                if let Some(pinyin) = c.to_pinyin() {
                                    pinyin.plain().to_string() // Convert Chinese character to Pinyin
                                } else {
                                    c.to_string() // Keep non-Chinese characters as they are
                                }
                            })
                            .collect();
                        
                        log_to_debug(app_handle, format!("Handling toPinyin conversion {}", new_lyric_text));
                    }

                    // Handle blatobla logic here
                }
                other => {
                    log_to_debug(app_handle, format!("Unknown conversion: {}", other));
                }
            }
        } else {
            log_to_debug(app_handle, "Invalid conversion type, not a string".to_string());
        }
    }

    let json_data = json!({
        "text": new_lyric_text,
        "index": current_lyric_index,
        "displayTime": lyric_display_time
    });

    app_handle.emit_all("current-song-lyric-updated", json_data.to_string()).unwrap();
}

lazy_static! {
    static ref UPDATE_INTERVAL: Mutex<u64> = Mutex::new(1000); // Default value 1000ms
    static ref SUBTITLE_OFFSET: Mutex<i64> = Mutex::new(0); // Default value 1000ms
    static ref SAVE_SUBTITLE_OFFSET: Mutex<bool> = Mutex::new(false);
    static ref SAVE_SUBTITLE_OFFSET_UPDATE: Mutex<bool> = Mutex::new(false);
}

#[tauri::command]
async fn set_update_interval(new_interval: u64) {
    let mut interval = UPDATE_INTERVAL.lock().await; // Await the lock
    *interval = new_interval;
}

#[tauri::command]
async fn set_subtitle_offset(new_offset: i64) {
    let mut offset = SUBTITLE_OFFSET.lock().await; // Await the lock
    *offset = new_offset;
}

#[tauri::command]
async fn set_save_subtitle_offset(save: bool) {
    if save == true {
        let mut save_offset_update = SAVE_SUBTITLE_OFFSET_UPDATE.lock().await; // Await the lock
        *save_offset_update = true;
    }

    let mut save_offset = SAVE_SUBTITLE_OFFSET.lock().await; // Await the lock
    *save_offset = save;

}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>>  {
    
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    tauri::Builder::default()
    .setup(|app| {
        let app_handle = app.handle();
        
        let mut last_song_id: String = String::new();

        let mut song_duration: u64 = u64::MAX;
        
        let mut song_lyrics: Vec<Value> = Vec::new();  // Storing the lyrics as a vector
        
        let mut current_lyric_index: i16 = -1;
        
        let mut progress: u64 = 0;

        let mut song_id: String = String::new();
        
        let spotify_instance = spotify::Spotify::new();
        SPOTIFY.set(Mutex::new(spotify_instance)).unwrap();
        // const UPDATE_INTERVAL: u64 = 1000;

        let stores = app.state::<StoreCollection<Wry>>();
        let path = PathBuf::from(".settings.dat");

        // Get the "updateInterval" from the store
        let update_interval_result = get_store_value(app_handle.clone(), stores.clone(), path.clone(), "updateInterval");

        // Get the "subtitleOffset" from the store
        let subtitle_offset_result = get_store_value(app_handle.clone(), stores.clone(), path.clone(), "subtitleOffset");

        let save_offset_result = get_store_value(app_handle.clone(), stores.clone(), path.clone(), "subtitleOffsetSync");


        // Get the app's data directory
        if let Some(app_data_dir) = app.path_resolver().app_data_dir() {
            // Create the file path for log.txt
            let log_path = app_data_dir.join("log.txt");

            // Open or clear the log file
            match OpenOptions::new().write(true).create(true).truncate(true).open(&log_path) {
                Ok(_) => println!("Log file initialized and cleared."),
                Err(e) => eprintln!("Failed to initialize log file: {}", e),
            }
        } else {
            eprintln!("Failed to determine app data directory.");
        }
        

        // Spawn an asynchronous task
        tauri::async_runtime::spawn(async move {

            // Handle the result of the operation
            match update_interval_result {
                Ok(stored_update_interval) => {
                    log_to_debug(&app_handle, format!("stored_update_interval: {}", stored_update_interval));

                    // Assuming UPDATE_INTERVAL is a Mutex<u64> 
                    let mut interval = UPDATE_INTERVAL.lock().await; // Await the lock
                    if let Some(str_value) = stored_update_interval.as_str() {
                        match str_value.parse::<u64>() {
                            Ok(u64_value) => {
                                log_to_debug(&app_handle, format!("stored update interval: {:?}", u64_value));

                                *interval = u64_value; // Update the mutable variable
                            }
                            Err(e) => {
                                log_to_debug(&app_handle, format!("Stored update interval is not a valid u64. {}", e));
                            }
                        }
                    } else {
                        log_to_debug(&app_handle, "Stored update interval is not a valid str.".to_string());
                    }
                }
                Err(e) => {
                    // Handle the error case
                    log_to_debug(&app_handle, format!("Error retrieving update interval: {:?}", e));
                }
            }
            match subtitle_offset_result {
                Ok(stored_subtitle_offset) => {

                    // Assuming UPDATE_INTERVAL is a Mutex<u64>
                    let mut offset = SUBTITLE_OFFSET.lock().await; // Await the lock
                    if let Some(str_value) = stored_subtitle_offset.as_str() {
                        match str_value.parse::<i64>() {
                            Ok(i64_value) => {
                                log_to_debug(&app_handle, format!("stored subtitle offset: {:?}", i64_value));
                                *offset = i64_value; // Update the mutable variable
                            }
                            Err(e) => {
                                log_to_debug(&app_handle, format!("Stored update interval is not a valid u64. {}", e));
                            }
                        }
                    } else {
                        log_to_debug(&app_handle, "Stored update interval is not a valid str.".to_string());
                    }
                }
                Err(e) => {
                    log_to_debug(&app_handle, format!("Error retrieving update interval: {:?}", e));
                }
            }
            match save_offset_result {
                Ok(stored_save_offset) => {
                    let mut save_offset = SAVE_SUBTITLE_OFFSET.lock().await; // Await the lock
                    if let Some(bool_value) = stored_save_offset.as_str() {
                        *save_offset = bool_value.eq("song"); // Update the mutable variable
                    } else {
                        log_to_debug(&app_handle, "Stored save offset is not a valid bool.".to_string());
                    }
                }
                Err(e) => {
                    log_to_debug(&app_handle, format!("Error retrieving save offset: {:?}", e));
                }
            }

            loop {
                let save_subtitle_offset = *SAVE_SUBTITLE_OFFSET.lock().await;
                let mut save_offset_update = SAVE_SUBTITLE_OFFSET_UPDATE.lock().await; // Await the lock

                if let Some(spotify) = SPOTIFY.get() {
                    let spotify = spotify.lock().await;
        
                        if let Ok(current_song) = spotify.get_currently_playing().await {
                            // Emit an event for the current song
                            song_id =  current_song["item"]["id"].as_str().unwrap_or("").to_string();

                            progress = current_song["progress_ms"].as_u64().unwrap_or(0);

                            if save_subtitle_offset && (last_song_id != song_id || *save_offset_update == true) {
                                *save_offset_update = false;

                                let offset_app_handle = app_handle.clone();
                                let offset_stores = offset_app_handle.state::<StoreCollection<Wry>>();
                                let offset_path = PathBuf::from(".settings.dat");

                                let stored_offset = get_store_value(app_handle.clone(), offset_stores.clone(), path.clone(), &format!("song-{}", song_id));

                                let offset = match stored_offset {
                                    Ok(offset_value) => offset_value.as_i64().unwrap_or(0),
                                    Err(err) => {
                                        log_to_debug(&app_handle, format!("song offset could not be retrieved {}", err));
                                        0
                                    }
                                };

                                let mut subtitle_offset = SUBTITLE_OFFSET.lock().await;
                                *subtitle_offset = offset.clone();


                                match with_store(offset_app_handle.clone(), offset_stores.clone(), offset_path.clone(), |store| {
                                    store.insert("subtitleOffset".to_string(), json!(offset))
                                }) {
                                    Ok(_) => {
                                        log_to_debug(&app_handle, "Successfully updated store.".to_string());
                                        with_store(offset_app_handle.clone(), offset_stores, offset_path, |store| store.save()).unwrap();
                                    },
                                    Err(e) => log_to_debug(&app_handle, format!("Failed to update store: {:?}", e)),
                                }

                                app_handle.emit_all("current-song-offset", offset.clone()).unwrap();
                            }

                            if last_song_id != song_id {
                                song_duration = current_song["item"]["duration_ms"].as_u64().unwrap_or(u64::MAX);

                                log_to_debug(&app_handle, format!("song_duration: {}", song_duration));


                                last_song_id = song_id.clone();
                                
                                app_handle.emit_all("current-song-updated", current_song.to_string()).unwrap();

                                song_lyrics = match spotify.get_lyrics(&song_id).await {
                                    Ok(lyrics) => {

                                        app_handle.emit_all("current-song-lyrics", lyrics.to_string()).unwrap();

                                        if let Some(lines) = lyrics["lyrics"]["lines"].as_array() {

                                            lines.clone()
                                        } else {
                                            Vec::new()
                                        }
                                    },
                                    Err(_) => {
                                        Vec::new()
                                    }
                                };

                                current_lyric_index = -1;
                            }

                        }

                        let update_interval = cmp::max(500, *UPDATE_INTERVAL.lock().await);

                        let subtitle_offset = *SUBTITLE_OFFSET.lock().await;

                        if save_subtitle_offset {
                            let offset_app_handle = app_handle.clone();
                            let offset_stores = offset_app_handle.state::<StoreCollection<Wry>>();
                            let offset_path = PathBuf::from(".settings.dat");

                            match with_store(offset_app_handle.clone(), offset_stores.clone(), offset_path.clone(), |store| {
                                store.insert(format!("song-{}", song_id).to_string(), subtitle_offset.into())
                            }) {
                                Ok(_) => {
                                    log_to_debug(&app_handle, "Successfully updated store.".to_string());
                                    with_store(offset_app_handle.clone(), offset_stores, offset_path, |store| store.save()).unwrap();
                                },
                                Err(e) => log_to_debug(&app_handle, format!("Failed to update store: {:?}", e)),
                            }
                        }

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

                                let mut next_lyric_display_time: u64 = song_duration - next_start_time;

                                if let Some(next_next_lyric) = song_lyrics.get((current_lyric_index + 2) as usize) {
                                    let next_next_start_time = next_next_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();
                                    //(next_next_start_time - next_start_time)
                                    next_lyric_display_time = next_next_start_time - next_start_time;
                                }
        
                            

                                // let next_lyric_text = next_lyric["words"].as_str().unwrap_or("").to_romaji();
                                let next_lyric_text = next_lyric["words"].as_str().unwrap_or("");

                                if let Some(current_lyric) = song_lyrics.get(current_lyric_index as usize) { //? check if progress was reversed by user
                                    let current_start_time = current_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();
                                    if offset_progress < current_start_time {
                                        log_to_debug(&app_handle, format!("program fixed reversed progress: {}", next_lyric_text));
                                        current_lyric_index -= 1;
                                        continue;
                                    }
                                }

                                if offset_progress > next_start_time { //? check if progress was increased by user and prevent possible misses

                                    if let Some(next_next_lyric) = song_lyrics.get((current_lyric_index + 2) as usize) { //? check if the program skipped by mistake 
                                        let next_next_start_time = next_next_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();
                                        let next_next_lyric_text = next_next_lyric["words"].as_str().unwrap_or("");
                                        
                                        log_to_debug(&app_handle, format!("offset_progress: {}, next_next_start_time: {}, next_next_lyric_text: {}", offset_progress, next_next_start_time, next_next_lyric_text));
                                        
                                        if offset_progress < next_next_start_time {
                                            next_lyric_display_time = next_next_start_time.saturating_sub(offset_progress);
                                            log_to_debug(&app_handle, format!("program fixed mistaken skip: {}", next_lyric_text));
                                            send_lyric(&app_handle, next_lyric_text.to_string(), current_lyric_index, next_lyric_display_time).await;
                                        }
                                    }
                                    log_to_debug(&app_handle, format!("program fixed skipped progress: {}", next_lyric_text));
                                    current_lyric_index += 1;
                                    

                                    continue;
                                }

                                let time_left = next_start_time - offset_progress;
    
                                if total_time_spent + time_left > update_interval {
                                    break;
                                }

                                total_time_spent += time_left;

                                progress += time_left;

                                tokio::time::sleep(Duration::from_millis(time_left)).await;

                                if let Some(next_next_lyric) = song_lyrics.get((current_lyric_index + 2) as usize) {
                                    let next_next_start_time = next_next_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();
                                    next_lyric_display_time = next_next_start_time.saturating_sub(offset_progress + time_left);
                                }

                                
                                send_lyric(&app_handle, next_lyric_text.to_string(), current_lyric_index, next_lyric_display_time).await;
                                
                                // app_handle.emit_all("current-song-lyric-updated", next_lyric_text).unwrap();
                                
                                current_lyric_index += 1;
                            } else {
                                break;
                            }
                        }

                        log_to_debug(&app_handle, format!("update_interval: {}", update_interval));
                        
                        tokio::time::sleep(Duration::from_millis(update_interval.saturating_sub(total_time_spent).saturating_sub(300))).await;
                    }
                }
            });
    
            Ok(())
        })
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![create_thumbnail, refresh_spotify_token, get_current_song, get_song_lyrics, set_update_interval, set_subtitle_offset, set_save_subtitle_offset])
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
