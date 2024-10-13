// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use std::path::{Path, PathBuf};
use once_cell::sync::OnceCell;
use serde_json::{Value, json};
use tokio::sync::Mutex;
use lazy_static::lazy_static;
use tauri::{Manager, WindowEvent};
use std::{cmp, collections::HashMap, path::{Path, PathBuf}};
use tokio::sync::mpsc;
use std::time::Duration;
// use tauri_plugin_store::StoreBuilder;
use tauri::Wry;
use tauri_plugin_store::{with_store, StoreCollection};

use wana_kana::ConvertJapanese;
use pinyin::{ToPinyin, ToPinyinMulti, Pinyin};
use cjk::{is_japanese, is_korean, is_simplified_chinese, is_traditional_chinese, to_pinyin};


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
    let mut global_current_song = CURRENT_SONG.lock().await;
    return Ok(global_current_song.to_string());

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

async fn send_lyric(app_handle: &tauri::AppHandle, lyric_text: String, current_lyric_index: i16, lyric_display_time: u64) {
    let stores = app_handle.state::<StoreCollection<Wry>>();
    let path = PathBuf::from(".settings.dat");

    let stored_subtitle_conversions = get_store_value(app_handle.clone(), stores, path, "ConvertText"); 

    let subtitle_conversions = match stored_subtitle_conversions {
        Ok(value) => {
            value.as_array().cloned().unwrap_or_else(Vec::new)
        }
        Err(e) => {
            println!("Could not retrieve subtitle conversions. {}", e);
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
                        println!("Handling KanjiToRomaji conversion {}", new_lyric_text);
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

                        println!("Handling toPinyin conversion {}", new_lyric_text);
                    }

                    // Handle blatobla logic here
                }
                other => {
                    println!("Unknown conversion: {}", other);
                }
            }
        } else {
            println!("Invalid conversion type, not a string");
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
    static ref SUBTITLE_OFFSETS: Mutex<HashMap<String, i64>> = Mutex::new(HashMap::new()); // Default value 1000ms
    static ref SAVE_SUBTITLE_OFFSET: Mutex<bool> = Mutex::new(false);
    static ref SAVE_SUBTITLE_OFFSET_UPDATE: Mutex<bool> = Mutex::new(false);
    static ref CURRENT_SONG: Mutex<Value> = Mutex::new(Value::Null); // Default value 1000ms
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
        
        let spotify_instance = spotify::Spotify::new();
        SPOTIFY.set(Mutex::new(spotify_instance)).unwrap();
        // const UPDATE_INTERVAL: u64 = 1000;

        let stores = app.state::<StoreCollection<Wry>>();
        let path = PathBuf::from(".settings.dat");

        // let app_handle_clone = app_handle.clone(); // Clone the handle to avoid borrowing issues

        // Get the "updateInterval" from the store
        let update_interval_result = get_store_value(app_handle.clone(), stores.clone(), path.clone(), "updateInterval");

        // Get the "subtitleOffset" from the store
        let subtitle_offset_result = get_store_value(app_handle.clone(), stores.clone(), path.clone(), "subtitleOffset");

        let subtitle_offsets_result = get_store_value(app_handle.clone(), stores.clone(), path.clone(), "subtitleOffsets");

        let save_offset_result = get_store_value(app_handle.clone(), stores.clone(), path.clone(), "subtitleOffsetCheckbox");
        

        // Spawn an asynchronous task
        tauri::async_runtime::spawn(async move {

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
            match save_offset_result {
                Ok(stored_save_offset) => {
                    // println!("stored_update_interval: {}", stored_subtitle_offset);

                    // Assuming UPDATE_INTERVAL is a Mutex<u64>
                    let mut save_offset = SAVE_SUBTITLE_OFFSET.lock().await; // Await the lock
                    if let Some(bool_value) = stored_save_offset.as_str() {
                        *save_offset = bool_value.eq("true"); // Update the mutable variable
                    } else {
                        println!("Stored save offset is not a valid bool.");
                    }
                }
                Err(e) => {
                    // Handle the error case
                    println!("Error retrieving save offset: {:?}", e);
                }
            }
            match subtitle_offsets_result {
                Ok(stored_subtitle_offsets) => {
                    // println!("stored_update_interval: {}", stored_subtitle_offset);

                    // Assuming UPDATE_INTERVAL is a Mutex<u64>
                    let mut subtitle_offsets = SUBTITLE_OFFSETS.lock().await; // Await the lock
                    if let Some(object_value) = stored_subtitle_offsets.as_object() {
                        for (key, value) in object_value.iter() {
                            // Check if the value is an i64
                            if let Some(i64_value) = value.as_i64() {
                                // Insert the key and value into the HashMap
                                subtitle_offsets.insert(key.clone(), i64_value);
                                println!("Stored subtitle offset for {}: {}", key, i64_value);
                            } else {
                                println!("Value for key '{}' is not a valid i64.", key);
                            }
                        }
                    } else {
                        println!("Stored subtitle offsets are not a valid JSON object.");
                    }
                }
                Err(e) => {
                    // Handle the error case
                    println!("Error retrieving subtitle offsets: {:?}", e);
                }
            }

            loop {
                let save_subtitle_offset = *SAVE_SUBTITLE_OFFSET.lock().await;
                let mut subtitle_offsets = SUBTITLE_OFFSETS.lock().await;
                let mut save_offset_update = SAVE_SUBTITLE_OFFSET_UPDATE.lock().await; // Await the lock

                if let Some(spotify) = SPOTIFY.get() {
                    let spotify = spotify.lock().await;
        
                        if let Ok(current_song) = spotify.get_currently_playing().await {
                            // Emit an event for the current song
                            let song_id =  current_song["item"]["id"].as_str().unwrap_or("").to_string();

                            progress = current_song["progress_ms"].as_u64().unwrap_or(0);

                            // println!("progress: {}", progress);

                            if save_subtitle_offset && (last_song_id != song_id || *save_offset_update == true) {
                                *save_offset_update = false;

                                let offset = subtitle_offsets.entry(song_id.clone()).or_insert(0);

                                let mut subtitle_offset = SUBTITLE_OFFSET.lock().await;
                                *subtitle_offset = offset.clone();

                                let offset_app_handle = app_handle.clone();
                                let offset_stores = offset_app_handle.state::<StoreCollection<Wry>>();
                                let offset_path = PathBuf::from(".settings.dat");

                                match with_store(offset_app_handle.clone(), offset_stores.clone(), offset_path.clone(), |store| {
                                    store.insert("subtitleOffset".to_string(), json!(offset))
                                }) {
                                    Ok(_) => {
                                        println!("Successfully updated store.");
                                        with_store(offset_app_handle.clone(), offset_stores, offset_path, |store| store.save()).unwrap();
                                    },
                                    Err(e) => println!("Failed to update store: {:?}", e),
                                }

                                app_handle.emit_all("current-song-offset", offset.clone()).unwrap();
                            }

                            if last_song_id != song_id {
                                song_duration = current_song["item"]["duration_ms"].as_u64().unwrap_or(u64::MAX);

                                println!("song_duration: {}", song_duration);


                                last_song_id = song_id.clone();
                                
                                // println!("song changed: {}", song_id);

                                let mut global_current_song = CURRENT_SONG.lock().await;
                                
                                app_handle.emit_all("current-song-updated", current_song.to_string()).unwrap();

                                *global_current_song = current_song;

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

                                // for lyric in song_lyrics.iter() {
                                //     // println!("{}", lyric["words"].as_str().unwrap_or("").to_string().to_romaji());

                                //     let start_time = lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();

                                //     // println!("process: {}, {}", start_time, progress);

                                //     if progress < start_time  {
                                //         // println!("finished: {}, {}", start_time, progress);
                                //         if current_lyric_index != -1 {
                                //             let lyric_text = song_lyrics[current_lyric_index as usize]["words"].as_str().unwrap_or("").to_string();
                                //             // println!("{}", lyric_text);
                                //             send_lyric(&app_handle, lyric_text, current_lyric_index);
                                //             // app_handle.emit_all("current-song-lyric-updated", lyric_text).unwrap();
                                //         }

                                //         break;
                                //     }

                                //     current_lyric_index += 1;
                                // }

                            }

                        }

                        let update_interval = cmp::max(500, *UPDATE_INTERVAL.lock().await);

                        let subtitle_offset = *SUBTITLE_OFFSET.lock().await;

                        if save_subtitle_offset {
                            let offset = subtitle_offsets.entry(last_song_id.clone()).or_insert(subtitle_offset);
                            *offset = subtitle_offset;

                            let json_value: tauri_plugin_store::JsonValue = serde_json::to_value(&*subtitle_offsets).unwrap();

                            let offset_app_handle = app_handle.clone();
                            let offset_stores = offset_app_handle.state::<StoreCollection<Wry>>();
                            let offset_path = PathBuf::from(".settings.dat");

                            match with_store(offset_app_handle.clone(), offset_stores.clone(), offset_path.clone(), |store| {
                                store.insert("subtitleOffsets".to_string(), json_value)
                            }) {
                                Ok(_) => {
                                    println!("Successfully updated store.");
                                    with_store(offset_app_handle.clone(), offset_stores, offset_path, |store| store.save()).unwrap();
                                },
                                Err(e) => println!("Failed to update store: {:?}", e),
                            }
                        }

                        // let path = PathBuf::from(".settings.dat");

                        // if save_subtitle_offset {
                        //     match with_store(app_handle.clone(), stores.clone(), path.clone(), |store| {
                        //         store.insert("subtitleOffset".to_string(), json!(subtitle_offset))
                        //     }) {
                        //         Ok(_) => {
                        //             println!("Successfully updated store.");
                        //             with_store(app_handle.clone(), stores.clone(), path, |store| store.save()).unwrap();
                        //         },
                        //         Err(e) => println!("Failed to update store: {:?}", e),
                        //     }
                        // }

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

                                let mut next_lyric_display_time: u64 = (song_duration - next_start_time) ;

                                if let Some(next_next_lyric) = song_lyrics.get((current_lyric_index + 2) as usize) {
                                    let next_next_start_time = next_next_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();
                                    //(next_next_start_time - next_start_time)
                                    next_lyric_display_time = (next_next_start_time - next_start_time);
                                }
        
                            

                                // let next_lyric_text = next_lyric["words"].as_str().unwrap_or("").to_romaji();
                                let next_lyric_text = next_lyric["words"].as_str().unwrap_or("");
    
                                // println!("{} - {}, {}", next_start_time, progress, current_lyric_index);

                                if let Some(current_lyric) = song_lyrics.get(current_lyric_index as usize) { //? check if progress was reversed by user
                                    let current_start_time = current_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();
                                    if offset_progress < current_start_time {
                                        println!("program fixed reversed progress: {}", next_lyric_text);
                                        current_lyric_index -= 1;
                                        continue;
                                    }
                                }

                                if offset_progress > next_start_time { //? check if progress was increased by user and prevent possible misses

                                    if let Some(next_next_lyric) = song_lyrics.get((current_lyric_index + 2) as usize) { //? check if the program skipped by mistake 
                                        let next_next_start_time = next_next_lyric["startTimeMs"].as_str().unwrap_or("0").parse::<u64>().unwrap();
                                        let next_next_lyric_text = next_next_lyric["words"].as_str().unwrap_or("");
                                        
                                        println!("offset_progress: {}, next_next_start_time: {}, next_next_lyric_text: {}", offset_progress, next_next_start_time, next_next_lyric_text);
                                        
                                        if offset_progress < next_next_start_time {
                                            next_lyric_display_time = next_next_start_time.saturating_sub(offset_progress);
                                            println!("program fixed mistaken skip: {}", next_lyric_text);
                                            // app_handle.emit_all("current-song-lyric-updated", next_lyric_text).unwrap();
                                            send_lyric(&app_handle, next_lyric_text.to_string(), current_lyric_index, next_lyric_display_time).await;
                                        }
                                    }
                                    println!("program fixed skipped progress: {}", next_lyric_text);
                                    current_lyric_index += 1;
                                    

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

                        println!("update_interval: {}", update_interval);
            
                        // Make sure you give time to other tasks by using yield_now()
                        // tokio::task::yield_now().await;

                        // Sleep for a bit before checking again
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
