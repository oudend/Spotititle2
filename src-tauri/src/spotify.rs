use serde_json::Value;
use flate2::read::GzDecoder;
use std::io::Read;

#[derive(Debug)]
pub struct Spotify {
    access_token: String,
    authorization_string: String,
    pub sp_dc: String
}

impl Spotify {
    pub fn new() -> Self {
        let mut spotify = Spotify {
            access_token: String::new(),
            authorization_string: String::new(),
            sp_dc: String::new(),
        };
        // spotify.refresh_access_token(sp_dc).await.unwrap();
        // tokio::runtime::Runtime::new()
        //     .unwrap()
        //     .block_on(spotify.refresh_access_token(sp_dc));
        spotify
    }

    pub async fn refresh_access_token(&mut self, sp_dc: &str) -> Result<(), String> {
        let client = reqwest::Client::new();
        let response = client
            .get("https://open.spotify.com/get_access_token?reason=transport&productType=web_player")
            .header("Accept", "*/*")
            .header("Accept-Encoding", "gzip, deflate")
            .header("Connection", "keep-alive")
            .header(
                "User-Agent",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Safari/537.36",
            )
            .header("app-platform", "WebPlayer")
            .header("Cookie", format!("sp_dc={}", sp_dc))
            .send()
            .await;

        if let Ok(response) = response {
            let response_headers = response.headers().clone();
            let response_bytes = response.bytes().await.unwrap(); // Store bytes in a variable
            let mut response_text = String::new();

            if let Some(encoding) = response_headers.get("content-encoding") {
                if encoding == "gzip" {
                    let mut d = GzDecoder::new(response_bytes.as_ref());
                    d.read_to_string(&mut response_text).unwrap();
                } else {
                    response_text = String::from_utf8(response_bytes.to_vec()).unwrap();
                }
            } else {
                response_text = String::from_utf8(response_bytes.to_vec()).unwrap();
            }

            let response_json: Value = serde_json::from_str(&response_text).unwrap_or_default();
            if let Some(access_token) = response_json["accessToken"].as_str() {
                self.access_token = access_token.to_string();
                self.authorization_string =
                    format!("Bearer {}", self.access_token);
                self.sp_dc = sp_dc.to_string();
                return Ok(());
            }
        }
        Err("Failed to refresh access token".into())
    }

    pub async fn get_currently_playing(&self) -> std::result::Result<Value, String> {
        let client = reqwest::Client::new();
        let response = client
            .get("https://api.spotify.com/v1/me/player/currently-playing")
            .header("Authorization", &self.authorization_string)
            .send()
            .await;

        if let Ok(response) = response {
            if let Ok(response_text) = response.text().await {
                let data: Value = match serde_json::from_str(&response_text) {
                    Ok(data) => data,
                    Err(_) => {
                        return Err("Failed to parse response text".into());
                    }
                };

                // let progress_ms = data["progress_ms"].as_u64().unwrap_or(0);
                let item = &data["item"];

                if item.is_null() {
                    return Err("No item currently playing".into());
                }

                return Ok(data);

                // let id = item["id"].as_str().unwrap_or("").to_string();
                // let name = item["name"].as_str().unwrap_or("").to_string();
                // let album_image_link = item["album"]["images"][0]["url"]
                //     .as_str()
                //     .unwrap_or("")
                //     .to_string();

                // return Ok(CurrentSongData {
                //     name,
                //     id,
                //     album_image_link,
                //     progress: progress_ms
                // });
            }
        }
        Err("Failed to get currently playing song".into())
    }

    pub async fn get_lyrics(&self, id: &str) -> std::result::Result<Value, String> {
        let client = reqwest::Client::new();
        let request_url = format!(
            "https://spclient.wg.spotify.com/color-lyrics/v2/track/{}?format=json&market=from_token",
            id
        );

        println!("Request URL: {}", request_url);
        println!("Authorization: {}", self.authorization_string);

        let response = client
            .get(&request_url)
            .header("Accept", "*/*")
            .header("Accept-Encoding", "gzip, deflate")
            .header("Connection", "keep-alive")
            .header(
                "User-Agent",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Safari/537.36",
            )
            .header("app-platform", "WebPlayer")
            .header("Authorization", &self.authorization_string)
            .send()
            .await;

        if let Ok(response) = response {
            let response_headers = response.headers().clone();
            let response_bytes = response.bytes().await.unwrap(); // Store bytes in a variable
            let mut response_text = String::new();

            if let Some(encoding) = response_headers.get("content-encoding") {
                if encoding == "gzip" {
                    let mut d = GzDecoder::new(response_bytes.as_ref());
                    d.read_to_string(&mut response_text).unwrap();
                } else {
                    response_text = String::from_utf8(response_bytes.to_vec()).unwrap();
                }
            } else {
                response_text = String::from_utf8(response_bytes.to_vec()).unwrap();
            }

            // println!("Response Text: {}", response_text);

            return match serde_json::from_str::<Value>(&response_text) {
                Ok(json_value) => Ok(json_value),
                Err(err) => Err(format!("Failed to parse JSON: {}", err)),
            };

            // return Ok(LyricsData {
            //     sync_type: SyncType::None,
            //     lyrics_time_data: Vec::new(),
            // });
            // return self.parse_lyrics_string(&response_text);
        }
        Err("Failed to get response".to_string())
    }
}