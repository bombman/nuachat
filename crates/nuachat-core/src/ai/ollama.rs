use serde_json::Value;
use std::time::Duration;

const OLLAMA_URL: &str = "http://localhost:11434";

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .unwrap()
}

// call model
pub async fn call_ollama(model: String, prompt: String) -> String {
    let client = client();

    let res = client
        .post(format!("{}/api/generate", OLLAMA_URL))
        .json(&serde_json::json!({
            "model": model,
            "prompt": prompt,
            "stream": false
        }))
        .send()
        .await;

    match res {
        Ok(r) => {
            match r.json::<Value>().await {
                Ok(json) => json["response"]
                    .as_str()
                    .unwrap_or("No response")
                    .to_string(),

                Err(e) => format!("Parse error: {}", e),
            }
        }
        Err(e) => format!("Ollama error: {}", e),
    }
}

// list models
pub async fn list_ollama_models() -> Vec<String> {
    let client = client();

    let res = client
        .get(format!("{}/api/tags", OLLAMA_URL))
        .send()
        .await;

    match res {
        Ok(r) => {
            match r.json::<Value>().await {
                Ok(json) => json["models"]
                    .as_array()
                    .unwrap_or(&vec![])
                    .iter()
                    .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
                    .collect(),

                Err(e) => {
                    eprintln!("parse error: {}", e);
                    fallback_models()
                }
            }
        }
        Err(e) => {
            eprintln!("ollama error: {}", e);
            fallback_models()
        }
    }
}

//  fallback function
fn fallback_models() -> Vec<String> {
    vec![
        "llama3".to_string(),
        "mistral".to_string(),
        "gemma".to_string(),
    ]
}