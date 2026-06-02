import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================
// ZEYAI — Personal RAG Chatbot
// Stack: React + Tailwind + Anthropic API (in-browser)
// Author: Fauzi | Modal: 0 Rupiah
// ============================================================

// ── UTILS: Text chunking ─────────────────────────────────────
function chunkText(text, chunkSize = 400, overlap = 80) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 20) chunks.push(chunk);
  }
  return chunks;
}

// ── UTILS: Simple TF-IDF style similarity (no external lib) ──
function termFreq(text) {
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  const freq = {};
  words.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  return freq;
}

function cosineSim(a, b) {
  const freqA = termFreq(a);
  const freqB = termFreq(b);
  const keys = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dot = 0, magA = 0, magB = 0;
  keys.forEach((k) => {
    const va = freqA[k] || 0;
    const vb = freqB[k] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  });
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

function retrieveTopChunks(query, chunks, topK = 4) {
  return chunks
    .map((chunk) => ({ chunk, score: cosineSim(query, chunk) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.chunk);
}

// ── ICONS ─────────────────────────────────────────────────────
const UploadIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4" />
  </svg>
);
const SendIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const DocIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const BrainIcon = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ── MAIN COMPONENT ─────────────────────────────────────────────
export default function ZeyAI() {
  const [apiKey, setApiKey] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [docs, setDocs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Handle file upload (TXT only in artifact, PDF needs server) ──
  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newChunks = [];
    const newDocs = [];
    for (const file of files) {
      const text = await file.text();
      const fileChunks = chunkText(text);
      newChunks.push(...fileChunks);
      newDocs.push({ name: file.name, chunkCount: fileChunks.length });
    }
    setChunks((prev) => [...prev, ...newChunks]);
    setDocs((prev) => [...prev, ...newDocs]);
    setUploading(false);
    fileRef.current.value = "";

    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        content: `✅ ${newDocs.map((d) => d.name).join(", ")} berhasil diindeks. ${newChunks.length} chunk siap dicari.`,
      },
    ]);
  }, []);

  // ── Call Claude API with RAG context ──────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    if (!apiKeySet && !apiKey) {
      setShowKeyInput(true);
      return;
    }

    const query = input.trim();
    setInput("");
    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Retrieve relevant chunks
      let contextBlock = "";
      if (chunks.length > 0) {
        const topChunks = retrieveTopChunks(query, chunks, 4);
        contextBlock = `Gunakan konteks berikut untuk menjawab pertanyaan user. Jika jawaban tidak ada dalam konteks, katakan jujur.\n\n--- KONTEKS DOKUMEN ---\n${topChunks.join("\n\n---\n")}\n--- AKHIR KONTEKS ---\n\n`;
      }

      const systemPrompt = `Kamu adalah Zey, asisten AI personal yang cerdas, to-the-point, dan membantu. ${chunks.length > 0 ? "Kamu memiliki akses ke dokumen pengguna." : "Tidak ada dokumen yang diupload, jawab dari pengetahuan umum."} Jawab dalam bahasa yang sama dengan pertanyaan user. Gunakan markdown sederhana jika diperlukan.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            // Pass last 6 messages for context
            ...messages.slice(-6).filter((m) => m.role !== "system").map((m) => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: "user",
              content: contextBlock + query,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Tidak ada respons.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Error:** ${err.message}\n\nPastikan API key valid dan format benar.`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, chunks, messages, apiKey, apiKeySet]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeDoc = (idx) => {
    const removed = docs[idx];
    setDocs((prev) => prev.filter((_, i) => i !== idx));
    // Note: in production, remove specific chunks. Here simplified.
    setMessages((prev) => [
      ...prev,
      { role: "system", content: `🗑️ ${removed.name} dihapus dari memori.` },
    ]);
  };

  const confirmApiKey = () => {
    if (apiKey.startsWith("sk-ant-")) {
      setApiKeySet(true);
      setShowKeyInput(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div
      style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}
      className="min-h-screen bg-[#0a0a0a] text-[#e8e4d8] flex flex-col"
    >
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;700;800&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        .msg-enter { animation: fadeUp 0.3s ease forwards; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
        .blink { animation: blink 1s step-start infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        .glow { box-shadow: 0 0 20px rgba(255,210,100,0.15); }
      `}</style>

      {/* ── HEADER ── */}
      <header className="border-b border-[#1e1e1e] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ffd264] flex items-center justify-center text-black">
            <BrainIcon />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-lg font-800 tracking-tight text-[#ffd264] leading-none">
              ZEY<span className="text-[#e8e4d8]">AI</span>
            </h1>
            <p className="text-[10px] text-[#555] tracking-widest uppercase">personal rag assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* API Key status */}
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`text-xs px-3 py-1.5 rounded border transition-all ${
              apiKeySet
                ? "border-[#2a4a2a] text-[#5a9a5a] bg-[#0f1f0f]"
                : "border-[#4a2a2a] text-[#9a5a5a] bg-[#1f0f0f] hover:border-[#ffd264]"
            }`}
          >
            {apiKeySet ? "● API Connected" : "○ Set API Key"}
          </button>

          {/* Upload button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-[#2a2a2a] hover:border-[#ffd264] hover:text-[#ffd264] transition-all"
          >
            <UploadIcon />
            {uploading ? "Indexing..." : "Upload Doc"}
          </button>
          <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json" multiple className="hidden" onChange={handleFileUpload} />
        </div>
      </header>

      {/* ── API KEY PANEL ── */}
      {showKeyInput && (
        <div className="border-b border-[#1e1e1e] bg-[#0e0e0e] px-6 py-4 msg-enter">
          <p className="text-xs text-[#666] mb-2">Masukkan Anthropic API Key. Tersimpan hanya di memori browser session ini.</p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="sk-ant-api03-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmApiKey()}
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-[#e8e4d8] placeholder-[#444] focus:outline-none focus:border-[#ffd264] transition-colors"
            />
            <button
              onClick={confirmApiKey}
              className="px-4 py-2 bg-[#ffd264] text-black text-xs font-bold rounded hover:bg-[#ffe090] transition-colors"
            >
              Confirm
            </button>
          </div>
          <p className="text-[10px] text-[#444] mt-2">
            Dapatkan API key gratis di{" "}
            <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-[#ffd264] underline">
              console.anthropic.com
            </a>
          </p>
        </div>
      )}

      {/* ── DOCS SIDEBAR ROW ── */}
      {docs.length > 0 && (
        <div className="border-b border-[#1a1a1a] px-6 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] text-[#444] uppercase tracking-widest shrink-0">Indexed:</span>
          {docs.map((doc, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded px-2 py-1 text-[11px] text-[#888] shrink-0">
              <DocIcon />
              <span className="max-w-[140px] truncate">{doc.name}</span>
              <span className="text-[#444]">({doc.chunkCount})</span>
              <button onClick={() => removeDoc(i)} className="ml-1 text-[#444] hover:text-red-400 transition-colors">
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── CHAT AREA ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl w-full mx-auto">
        {/* Welcome state */}
        {messages.length === 0 && (
          <div className="text-center py-20 msg-enter">
            <div className="text-5xl mb-4 opacity-20">⬡</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-bold text-[#333] mb-2">
              Zey siap digunakan
            </h2>
            <p className="text-sm text-[#3a3a3a] max-w-sm mx-auto">
              Upload dokumen (.txt, .md, .csv, .json) lalu tanya apa saja. Atau langsung chat tanpa dokumen.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["Apa isi dokumen ini?", "Buat ringkasan singkat", "Cari informasi tentang..."].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 border border-[#222] rounded-full text-[#555] hover:border-[#ffd264] hover:text-[#ffd264] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          if (msg.role === "system") {
            return (
              <div key={i} className="text-center msg-enter">
                <span className="text-xs text-[#444] bg-[#111] border border-[#1e1e1e] rounded-full px-3 py-1">
                  {msg.content}
                </span>
              </div>
            );
          }
          return (
            <div key={i} className={`flex msg-enter ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-md bg-[#ffd264] flex items-center justify-center text-black mr-2 mt-0.5 shrink-0 text-xs font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Z
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc]"
                    : msg.isError
                    ? "bg-[#1a0f0f] border border-[#4a2a2a] text-[#cc8888]"
                    : "bg-[#0f0f0f] border border-[#1e1e1e] text-[#d8d4c8]"
                }`}
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start msg-enter">
            <div className="w-7 h-7 rounded-md bg-[#ffd264] flex items-center justify-center text-black mr-2 shrink-0 text-xs font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
              Z
            </div>
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl px-4 py-3">
              <span className="text-[#ffd264] text-lg blink">▊</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── INPUT BAR ── */}
      <div className="border-t border-[#1a1a1a] px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={chunks.length > 0 ? `Tanya tentang ${docs.map(d=>d.name).join(', ')}...` : "Tanya Zey sesuatu..."}
              rows={1}
              className="w-full bg-[#0e0e0e] border border-[#222] rounded-xl px-4 py-3 text-sm text-[#e8e4d8] placeholder-[#3a3a3a] focus:outline-none focus:border-[#ffd264] transition-colors resize-none"
              style={{ minHeight: "48px", maxHeight: "140px" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              loading || !input.trim()
                ? "bg-[#1a1a1a] text-[#333] cursor-not-allowed"
                : "bg-[#ffd264] text-black hover:bg-[#ffe090] glow"
            }`}
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-center text-[10px] text-[#2a2a2a] mt-2">
          Enter untuk kirim · Shift+Enter baris baru · {chunks.length} chunks di memori
        </p>
      </div>
    </div>
  );
}
