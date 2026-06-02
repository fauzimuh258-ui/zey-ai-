"use client";

import { useState, useRef } from "react";

const GATEWAY_URL = "https://my-api-b63pqj068-fauzimuh258-uis-projects.vercel.app";
const SECRET_KEY = "vvbam988";

const GROQ_MODELS = [
  { id: "llama3-70b-8192", label: "Llama3 70B" },
  { id: "llama3-8b-8192", label: "Llama3 8B" },
];

export default function ZeyAI() {
  const [model, setModel] = useState("llama3-70b-8192");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const push = (role, content) =>
    setMessages((prev) => [...prev, { role, content }]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const query = input.trim();
    setInput("");
    push("user", query);
    setSending(true);

    try {
      const res = await fetch(`${GATEWAY_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SECRET_KEY,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: query }],
          model: model,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content || "Tidak ada respons.";
      push("assistant", reply);
    } catch (err) {
      push("assistant", `Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#080808", color: "#ddd8cc", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "16px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ color: "#f0c040" }}>ZeyAI</h1>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={{ background: "#111", color: "#ddd8cc", border: "1px solid #333", borderRadius: "8px", padding: "4px 8px" }}>
          {GROQ_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </header>

      <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ textAlign: msg.role === "user" ? "right" : "left", marginBottom: "12px" }}>
            <span style={{ background: msg.role === "user" ? "#1a1a1a" : "#0d0d0d", padding: "8px 12px", borderRadius: "12px", display: "inline-block" }}>
              {msg.content}
            </span>
          </div>
        ))}
        {sending && <div style={{ textAlign: "left" }}><span style={{ background: "#0d0d0d", padding: "8px 12px", borderRadius: "12px" }}>▊</span></div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "16px", borderTop: "1px solid #222", display: "flex", gap: "8px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Tanya Zey..."
          style={{ flex: 1, background: "#111", border: "1px solid #333", borderRadius: "8px", padding: "12px", color: "#ddd8cc" }}
        />
        <button onClick={sendMessage} disabled={sending} style={{ background: "#f0c040", color: "black", border: "none", borderRadius: "8px", padding: "12px 16px" }}>
          Kirim
        </button>
      </div>
    </div>
  );
    }
