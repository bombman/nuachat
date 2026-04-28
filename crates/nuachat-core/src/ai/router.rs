use crate::ai::models::chat::{ChatRequest, ChatResponse};
use crate::ai::mock::mock_ai;
use crate::ai::ollama::call_ollama;
use crate::ai::ollama::list_ollama_models;

pub async fn call_ai(req: ChatRequest) -> ChatResponse {
    let use_mock = false;

    if use_mock {
        println!("🔥 USING MOCK"); // 👈 debug
        return ChatResponse {
            message: mock_ai(req),
        };
    }

    let model = req.model.clone();
    let provider = req.provider.clone();

    println!("🚀 {} | {}", provider, model);

    let result = match provider.as_str() {
        "ollama" => call_ollama(model, req.message).await,
        _ => "Provider not supported".to_string(),
    };

    ChatResponse {
        message: result,
    }
}

pub async fn list_models(provider: String) -> Vec<String> {
    match provider.as_str() {
        "ollama" => list_ollama_models().await,
        _ => vec!["gpt-4o".to_string()],
    }
}