use tao::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder},
    window::WindowBuilder,
};

mod ai;

use ai::models::chat::ChatRequest;
use ai::router::call_ai;

use wry::WebViewBuilder;

use tokio::runtime::Runtime;
use std::sync::Arc;

// 🐧 Linux support
#[cfg(target_os = "linux")]
use tao::platform::unix::WindowExtUnix;

#[cfg(target_os = "linux")]
use wry::WebViewBuilderExtUnix;

fn main() {
    let event_loop = EventLoopBuilder::<String>::with_user_event().build();
    let proxy = event_loop.create_proxy();

    //  Tokio runtime
    let rt = Arc::new(Runtime::new().unwrap());

    let window = WindowBuilder::new()
        .with_title("NuaChat")
        .build(&event_loop)
        .unwrap();

    //  shared handler 
    let build_webview = |proxy: tao::event_loop::EventLoopProxy<String>,
                     rt: Arc<Runtime>| {
    move |req: wry::http::Request<String>| {
        let body = req.body().to_string();
        println!("← from UI: {}", body);

        let data: serde_json::Value =
            serde_json::from_str(&body).unwrap_or_default();

        let proxy_inner = proxy.clone();
        let rt_inner = rt.clone();

        // 1. list_models
        if data["type"] == "list_models" {
            let provider = data["provider"]
                .as_str()
                .unwrap_or("ollama")
                .to_string();

            rt_inner.spawn(async move {
                let models = crate::ai::router::list_models(provider).await;

                let response = serde_json::json!({
                    "type": "model_list",
                    "models": models
                });

                let _ = proxy_inner.send_event(response.to_string());
            });

            return;
        }

        // 2. chat
        if data["type"] == "chat" {
            let chat: ChatRequest =
                serde_json::from_str(&body).unwrap();

            rt_inner.spawn(async move {
                let ai_res = call_ai(chat).await;

                let response = serde_json::json!({
                    "type": "chat_response",
                    "message": ai_res.message
                });

                let _ = proxy_inner.send_event(response.to_string());
            });

            return;
        }
    }
};




    let webview = {
        #[cfg(target_os = "linux")]
        {
            let vbox = window.default_vbox().expect("GTK vbox not available");

            WebViewBuilder::new()
                .with_url("http://localhost:5173")
                .with_ipc_handler(build_webview(proxy.clone(), rt.clone()))
                .build_gtk(vbox)
                .unwrap()
        }

        #[cfg(not(target_os = "linux"))]
        {
            WebViewBuilder::new()
                .with_url("http://localhost:5173")
                .with_ipc_handler(build_webview(proxy.clone(), rt.clone()))
                .build(&window)
                .unwrap()
        }
    };

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        match event {
            Event::UserEvent(msg) => {
                //  FIX: Rust → JS safe
                let script = match serde_json::to_string(&msg) {
                    Ok(safe_msg) => format!("window.postMessage({}, '*')", safe_msg),
                    Err(e) => {
                        eprintln!("script serialize error: {:?}", e);
                        return;
                    }
                };

                if let Err(e) = webview.evaluate_script(&script) {
                    eprintln!("evaluate_script error: {:?}", e);
                }
            }

            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => *control_flow = ControlFlow::Exit,

            _ => {}
        }
    });
}