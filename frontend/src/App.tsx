import { useEffect, useRef, useState } from "react";
import { useTheme } from "./useTheme";
import Dropdown from "./components/Dropdown";

type Msg = {
  role: "user" | "ai";
  text: string;
};

type Provider = "openai" | "ollama" | "openrouter";

export default function App() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  //  scroll
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const [unreadCount, setUnreadCount] = useState(0);

  //  models
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const [provider, setProvider] = useState<Provider>("ollama");
  const [model, setModel] = useState("");

  const MODEL_CONFIG: Record<Provider, string[]> = {
    openai: ["gpt-4o", "gpt-4.1"],
    ollama: ["llama3", "mistral"],
    openrouter: ["mixtral", "deepseek"],
  };

  const { setTheme } = useTheme();

  //  scroll detect
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const threshold = 60;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    setIsAtBottom(atBottom);
  };

  // auto scroll
  useEffect(() => {
    if (isAtBottom) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages, isAtBottom]);

  //  ยิง list_models 
  const didLoad = useRef(false);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;

    setLoadingModels(true);

    window.ipc.postMessage(
      JSON.stringify({
        type: "list_models",
        provider,
      })
    );
  }, [provider]);

  //  click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && popRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // รับ Rust
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      console.log("🔥 RAW EVENT:", event.data);

      try {
        const data = JSON.parse(event.data);

        // chat
        if (data.type === "chat_response") {
          setMessages((m) => [...m, { role: "ai", text: data.message }]);

          if (!isAtBottom) {
            setUnreadCount((c) => c + 1);
          }
        }

        //  models
        if (data.type === "model_list") {
          console.log("📦 models:", data.models);

          setModels(data.models || []);
          setLoadingModels(false);

          if (data.models?.length > 0) {
            setModel(data.models[0]);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isAtBottom]);

  // send chat
  const send = () => {
    if (!text.trim()) return;

    window.ipc.postMessage(
      JSON.stringify({
        type: "chat",
        message: text,
        provider,
        model,
      })
    );

    setMessages((m) => [...m, { role: "user", text }]);
    setText("");
  };

  return (
      <div className="h-screen flex flex-col min-h-0 overflow-hidden bg-[rgb(var(--bg))] text-white">
      
      {/* HEADER */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-white/10 bg-neutral-900">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <div className="w-3 h-3 bg-green-500 rounded-full" />
        </div>

        <div className="relative z-50" ref={popRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="w-7 h-7 rounded-md border border-white/10 bg-neutral-800 hover:bg-neutral-700"
          >
            ⚙️
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 z-[100] rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl p-3 text-sm space-y-3">
              
              {/* Theme */}
              <div>
                <div className="text-xs text-neutral-400 mb-1">Theme</div>
                <div className="space-y-1">
                  <div onClick={() => setTheme("default")} className="px-2 py-1 hover:bg-neutral-800 cursor-pointer">AI Tech</div>
                  <div onClick={() => setTheme("pink")} className="px-2 py-1 hover:bg-neutral-800 cursor-pointer">Pink</div>
                  <div onClick={() => setTheme("dark")} className="px-2 py-1 hover:bg-neutral-800 cursor-pointer">Dark</div>
                </div>
              </div>

              {/* Provider */}
              <div>
                <div className="text-xs text-neutral-400 mb-1">Provider</div>
                <Dropdown
                  value={provider}
                  options={["openai", "ollama", "openrouter"]}
                  onChange={(p) => {
                    setProvider(p as Provider);
                    setModel("");
                  }}
                />
              </div>

              {/* Model */}
              <div>
                <div className="text-xs text-neutral-400 mb-1">Model</div>
                <Dropdown
                  value={loadingModels ? "Loading..." : model}
                  options={models.length ? models : MODEL_CONFIG[provider]}
                  onChange={(m) => setModel(m)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHAT */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-10 py-4 flex flex-col gap-3"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[60%] px-4 py-2 rounded-2xl text-sm ${
              m.role === "user"
                ? "ml-auto bg-white/10"
                : "bg-white/5 border border-white/10"
            }`}
          >
            {m.text}
          </div>
        ))}

        <div ref={bottomRef} />

        {!isAtBottom && (
          <button
            onClick={() => {
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
              setUnreadCount(0);
            }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 px-2 py-1 bg-white/10 rounded-full"
          >
            ↓ {unreadCount > 0 && unreadCount}
          </button>
        )}
      </div>

      {/* INPUT */}
      <div className="p-4 border-t border-white/10 bg-neutral-900">
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            placeholder="Message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />

          <button
            onClick={send}
            className="px-4 py-1 bg-white/10 rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}