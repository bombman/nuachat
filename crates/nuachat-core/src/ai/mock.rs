use crate::ai::models::chat::ChatRequest;

pub fn mock_ai(chat: ChatRequest) -> String {
    format!("🤖 Mock: คุณพิมพ์ว่า → {}", chat.message)
}