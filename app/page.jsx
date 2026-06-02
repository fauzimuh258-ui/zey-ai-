import { useState, useRef } from 'react';

// ============================================================
// ZEYAI v2 — Chat + RAG Optional
// Gateway : https://my-api-3z63p7294-fauzimuh258-uis-projects.vercel.app
// Secret  : vvbam988
// RAG     : Transformers.js + IndexedDB (gratis, no server)
// ============================================================

const GATEWAY_URL = "https://my-api-b63pqj068-fauzimuh258-uis-projects.vercel.app";
const SECRET_KEY  = "vvbam988";

const GROQ_MODELS = [
  { id: "llama3-70b-8192",    label: "Llama3 70B" },
  { id: "llama3-8b-8192",     label: "Llama3 8B" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  { id: "gemma2-9b-it",       label: "Gemma2 9B" },
];

const DB_NAME  = "zeyai_rag_v2";
const DB_STORE = "chunks";
const TOP_K    = 4;

// ── IndexedDB helpers ─────────────────────────────────────────
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE))
        db.createObjectStore(DB_STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = (e) => res(e.target.result);
    req.onerror   = () => rej(req.error);
  });
}
async function dbSave(rows) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    rows.forEach((r) => tx.objectStore(DB_STORE).add(r));
    tx.oncomplete = res;
    tx.onerror    = () => rej(tx.error);
  });
}
async function dbLoad() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}
async function dbClear() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).clear();
    tx.oncomplete = res;
    tx.onerror    = () => rej(tx.error);
  });
}

// ── Chunking (per 500 karakter, overlap 50) ───────────────────
function chunkText(text, size = 500, overlap = 50) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const c = text.slice(i, i + size).trim();
    if (c.length > 30) chunks.push(c);
    i += size - overlap;
  }
  return chunks;
}

// ── Cosine similarity ─────────────────────────────────────────
function cosine(a, b) {
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    ma  += a[i] * a[i];
    mb  += b[i] * b[i];
  }
  return ma && mb ? dot / (Math.sqrt(ma) * Math.sqrt(mb)) : 0;
}

// ── Icons ─────────────────────────────────────────────────────
const IcoSettings = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IcoUpload = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4" />
  </svg>
);
const IcoSend = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const IcoTrash = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ════════════════════════════════════════════════════════════════
export default function ZeyAI() {
  const [model,        setModel]        = useState("llama3-70b-8192");
  const [ragMode,      setRagMode]      = useState(false);
  const [ragReady,     setRagReady]     = useState(false);
  const [ragBusy,      setRagBusy]      = useState(false);
  const [progress,     setProgress]     = useState("");
  const [docs,         setDocs]         = useState([]);
  const [totalChunks,  setTotalChunks]  = useState(0);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [sending,      setSending]      = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDocs,     setShowDocs]     = useState(false);
  const [uploading,    setUploading]    = useState(false);

  const bottomRef   = useRef(null);
  const fileRef     = useRef(null);
  const embedderRef = useRef(null);

  // auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  // load persisted chunks on mount
  useEffect(() => {
    dbLoad().then((rows) => {
      if (!rows.length) return;
      setTotalChunks(rows.length);
      const map = {};
      rows.forEach((r) => { map[r.docName] = (map[r.docName] || 0) + 1; });
      setDocs(Object.entries(map).map(([name, count]) => ({ name, count })));
    }).catch(() => {});
  }, []);

  // ── Push helpers ─────────────────────────────────────────────
  const sys  = (txt) => setMessages((p) => [...p, { role: "system",    content: txt }]);
  const push = (role, content, err = false) =>
    setMessages((p) => [...p, { role, content, err }]);

  // ── Load Transformers.js model ────────────────────────────────
  const loadEmbedder = useCallback(async () => {
    if (embedderRef.current) return embedderRef.current;
    setRagBusy(true);
    setProgress("Mengunduh model embedding (~23 MB, sekali saja)...");
    try {
      const { pipeline } = await import(
        "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/src/transformers.js"
      );
      setProgress("Memuat all-MiniLM-L6-v2...");
      const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        progress_callback: (p) => {
          if (p.status === "progress")
            setProgress(`${p.file} — ${Math.round(p.progress || 0)}%`);
        },
      });
      embedderRef.current = pipe;
      setRagReady(true);
      return pipe;
    } finally {
      setRagBusy(false);
      setProgress("");
    }
  }, []);

  const embed = useCallback(async (text) => {
    const pipe = await loadEmbedder();
    const out  = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data);
  }, [loadEmbedder]);

  // ── File upload + embed ───────────────────────────────────────
  const handleUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const text   = await file.text();
        const chunks = chunkText(text);
        const rows   = [];
        for (let i = 0; i < chunks.length; i++) {
          setProgress(`${file.name}: embedding ${i + 1}/${chunks.length}`);
          const embedding = await embed(chunks[i]);
          rows.push({ docName: file.name, text: chunks[i], embedding });
        }
        await dbSave(rows);
        setTotalChunks((n) => n + rows.length);
        setDocs((p) => {
          const ex = p.find((d) => d.name === file.name);
          return ex
            ? p.map((d) => d.name === file.name ? { ...d, count: d.count + rows.length } : d)
            : [...p, { name: file.name, count: rows.length }];
        });
        sys(`✅ ${file.name} — ${rows.length} chunk diindeks ke IndexedDB.`);
      }
    } catch (err) {
      sys(`⚠️ Upload gagal: ${err.message}`);
    } finally {
      setUploading(false);
      setProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [embed]);

  // ── RAG search ────────────────────────────────────────────────
  const ragSearch = useCallback(async (query) => {
    const qEmb = await embed(query);
    const rows = await dbLoad();
    return rows
      .map((r) => ({ text: r.text, score: cosine(qEmb, r.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K)
      .map((r) => r.text);
  }, [embed]);

  // ── Call gateway ──────────────────────────────────────────────
  const callGateway = useCallback(async (msgs, systemPrompt) => {
    const res = await fetch(`${GATEWAY_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SECRET_KEY,
      },
      body: JSON.stringify({
        messages:    msgs,
        system:      systemPrompt,
        model:       model,
        max_tokens:  1024,
        temperature: ragMode ? 0.5 : 0.7,
        stream:      false,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error?.message || e.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return (
      data?.choices?.[0]?.message?.content ||
      data?.content?.[0]?.text ||
      data?.message ||
      data?.response ||
      "Tidak ada respons."
    );
  }, [model, ragMode]);

  // ── handleChatWithoutRAG ──────────────────────────────────────
  const handleChatWithoutRAG = useCallback(async (query, history) => {
    const system = "Kamu adalah Zey, asisten AI personal yang cerdas dan to-the-point. Jawab dalam bahasa yang sama dengan pertanyaan. Gunakan markdown sederhana jika perlu.";
    return callGateway([...history, { role: "user", content: query }], system);
  }, [callGateway]);

  // ── handleChatWithRAG ─────────────────────────────────────────
  const handleChatWithRAG = useCallback(async (query, history) => {
    setProgress("Mencari chunk relevan...");
    const top = await ragSearch(query);
    setProgress("");
    const ctx =
      `Gunakan HANYA konteks berikut untuk menjawab. Jika tidak ada, katakan jujur.\n\n` +
      `--- KONTEKS ---\n${top.join("\n\n---\n")}\n--- AKHIR ---\n\n`;
    const system =
      "Kamu adalah Zey. Jawab HANYA dari konteks dokumen. " +
      "Jika tidak ada di konteks, katakan: 'Tidak ditemukan di dokumen yang diindeks.' " +
      "Jawab dalam bahasa yang sama dengan pertanyaan.";
    return callGateway([...history, { role: "user", content: ctx + query }], system);
  }, [callGateway, ragSearch]);

  // ── Main send ─────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const query = input.trim();
    setInput("");
    push("user", query);
    setSending(true);

    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      let reply;
      if (ragMode && totalChunks > 0) {
        reply = await handleChatWithRAG(query, history);
      } else {
        if (ragMode && totalChunks === 0)
          sys("⚠️ RAG ON tapi belum ada dokumen — pakai chat biasa.");
        reply = await handleChatWithoutRAG(query, history);
      }
      push("assistant", reply);
    } catch (err) {
      push("assistant", `⚠️ Error: ${err.message}`, true);
    } finally {
      setSending(false);
      setProgress("");
    }
  }, [input, sending, messages, ragMode, totalChunks, handleChatWithRAG, handleChatWithoutRAG]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleRag = async () => {
    if (!ragMode && !ragReady && !ragBusy) {
      try { await loadEmbedder(); setRagMode(true); sys("🧠 RAG aktif. Upload dokumen .txt/.md/.csv/.json"); }
      catch (err) { sys(`⚠️ Gagal load RAG: ${err.message}`); }
    } else {
      setRagMode((v) => !v);
    }
  };

  const clearDocs = async () => {
    await dbClear();
    setDocs([]);
    setTotalChunks(0);
    sys("🗑️ Semua dokumen dihapus dari IndexedDB.");
  };

  const modelLabel = GROQ_MODELS.find((m) => m.id === model)?.label || model;

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }}
      className="min-h-screen bg-[#080808] text-[#ddd8cc] flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
        .fu{animation:fu .22s ease both}
        @keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .blink{animation:bl 1s step-start infinite}
        @keyframes bl{50%{opacity:0}}
      `}</style>

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-30 bg-[#080808] border-b border-[#161616] px-4 py-3 flex items-center gap-2">

        {/* Logo */}
        <div className="flex items-center gap-2 mr-auto">
          <div className="w-7 h-7 rounded-lg bg-[#f0c040] flex items-center justify-center text-black text-xs font-black"
            style={{ fontFamily: "'Syne',sans-serif" }}>Z</div>
          <div>
            <p style={{ fontFamily: "'Syne',sans-serif" }} className="text-sm font-black text-[#f0c040] leading-none">
              ZEY<span className="text-[#ddd8cc]">AI</span>
            </p>
            <p className="text-[9px] text-[#333] tracking-widest uppercase">rag · groq</p>
          </div>
        </div>

        {/* RAG toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#444]">RAG</span>
          <button onClick={toggleRag} disabled={ragBusy}
            className={`relative w-9 h-5 rounded-full border transition-colors ${
              ragMode ? "bg-[#f0c040] border-[#f0c040]" : "bg-[#111] border-[#252525]"
            }`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
              ragMode ? "left-4 bg-black" : "left-0.5 bg-[#444]"
            }`} />
          </button>
          {ragBusy && <span className="text-[9px] text-[#f0c040] blink">load…</span>}
          {ragMode && totalChunks > 0 &&
            <span className="text-[9px] text-[#4a8a4a]">{totalChunks}c</span>}
        </div>

        {/* Upload (hanya saat RAG ON) */}
        {ragMode && (
          <button onClick={() => fileRef.current?.click()} disabled={uploading || ragBusy}
            className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded border border-[#222] hover:border-[#f0c040] hover:text-[#f0c040] transition-all disabled:opacity-30">
            <IcoUpload />{uploading ? "…" : "Upload"}
          </button>
        )}
        <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json" multiple className="hidden" onChange={handleUpload} />

        {/* Docs button */}
        {docs.length > 0 && (
          <button onClick={() => setShowDocs((v) => !v)}
            className="text-[11px] px-2 py-1.5 rounded border border-[#222] hover:border-[#f0c040] hover:text-[#f0c040] transition-all">
            Docs
          </button>
        )}

        {/* Settings */}
        <button onClick={() => setShowSettings((v) => !v)}
          className="p-1.5 rounded border border-[#222] hover:border-[#f0c040] hover:text-[#f0c040] transition-all text-[#555]">
          <IcoSettings />
        </button>
      </header>

      {/* ══ PROGRESS ══ */}
      {progress && (
        <div className="bg-[#0c0c0c] border-b border-[#161616] px-4 py-2 fu">
          <span className="text-[#f0c040] blink mr-2 text-xs">▊</span>
          <span className="text-[11px] text-[#666]">{progress}</span>
        </div>
      )}

      {/* ══ SETTINGS ══ */}
      {showSettings && (
        <div className="border-b border-[#161616] bg-[#0b0b0b] px-4 py-4 fu space-y-3">
          <p className="text-[10px] text-[#444] uppercase tracking-widest">Konfigurasi Gateway</p>

          {/* Gateway info (read-only) */}
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#444]">Gateway URL</span>
              <span className="text-[#5a8a5a] truncate max-w-[60%]">{GATEWAY_URL}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#444]">Auth Key</span>
              <span className="text-[#5a8a5a]">{"•".repeat(SECRET_KEY.length)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#444]">Status</span>
              <span className="text-[#5a9a5a]">● Connected</span>
            </div>
          </div>

          {/* Model selector */}
          <div>
            <label className="text-[10px] text-[#444] block mb-1">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-[#222] rounded px-3 py-2 text-sm text-[#ddd8cc] focus:outline-none focus:border-[#f0c040] transition-colors">
              {GROQ_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label} — {m.id}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ══ DOCS LIST ══ */}
      {showDocs && docs.length > 0 && (
        <div className="border-b border-[#161616] bg-[#0b0b0b] px-4 py-3 fu">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-[#444] uppercase tracking-widest">Indexed Docs</span>
            <button onClick={clearDocs} className="flex items-center gap-1 text-[10px] text-red-800 hover:text-red-500 transition-colors">
              <IcoTrash /> Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {docs.map((d, i) => (
              <span key={i} className="text-[11px] bg-[#0f0f0f] border border-[#1e1e1e] rounded px-2 py-1 text-[#666]">
                {d.name} <span className="text-[#333]">({d.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══ CHAT ══ */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto space-y-4">

        {/* Welcome */}
        {messages.length === 0 && (
          <div className="text-center py-16 fu select-none">
            <div className="text-5xl mb-4 opacity-[0.06]">◈</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif" }}
              className="text-xl font-black text-[#282828] mb-1">Zey siap.</h2>
            <p className="text-sm text-[#2a2a2a]">
              {ragMode ? "RAG aktif — upload dokumen lalu tanya." : `Chat biasa · ${modelLabel}`}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {["Apa yang bisa kamu bantu?", "Rangkum dokumen ini", "Siapa kamu?"].map((s) => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-[11px] px-3 py-1.5 border border-[#181818] rounded-full text-[#333] hover:border-[#f0c040] hover:text-[#f0c040] transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          if (msg.role === "system") return (
            <div key={i} className="text-center fu">
              <span className="inline-block text-[10px] text-[#2e2e2e] bg-[#0e0e0e] border border-[#181818] rounded-full px-3 py-1">
                {msg.content}
              </span>
            </div>
          );
          return (
            <div key={i} className={`flex gap-2 fu ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div style={{ fontFamily: "'Syne',sans-serif" }}
                  className="w-6 h-6 rounded-md bg-[#f0c040] text-black text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">Z</div>
              )}
              <div className={`max-w-[82%] rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#111] border border-[#1e1e1e] text-[#aaa]"
                  : msg.err
                  ? "bg-[#180e0e] border border-[#2e1515] text-[#c47]"
                  : "bg-[#0d0d0d] border border-[#181818] text-[#d8d4c8]"
              }`} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {msg.role === "assistant" && !msg.err && (
                  <span className={`text-[9px] uppercase tracking-wider block mb-2 ${ragMode ? "text-[#3a5a3a]" : "text-[#3a3a5a]"}`}>
                    {ragMode ? "◈ rag" : "◈ chat"} · {modelLabel}
                  </span>
                )}
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-2 fu">
            <div style={{ fontFamily: "'Syne',sans-serif" }}
              className="w-6 h-6 rounded-md bg-[#f0c040] text-black text-[10px] font-black flex items-center justify-center shrink-0">Z</div>
            <div className="bg-[#0d0d0d] border border-[#181818] rounded-xl px-4 py-3">
              <span className="text-[#f0c040] blink">▊</span>
              {progress && <span className="text-[11px] text-[#444] ml-2">{progress}</span>}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ══ INPUT BAR ══ */}
      <div className="border-t border-[#141414] bg-[#080808] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder={
              ragMode && totalChunks > 0
                ? `Tanya tentang ${docs.map((d) => d.name).join(", ")}...`
                : ragMode ? "Upload dokumen dulu..."
                : "Tanya Zey sesuatu..."
            }
            className="flex-1 bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-4 py-3 text-[13px] text-[#ddd8cc] placeholder-[#2e2e2e] focus:outline-none focus:border-[#f0c040] transition-colors resize-none"
            style={{ minHeight: "46px", maxHeight: "130px" }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px";
            }}
          />
          <button onClick={handleSend} disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-xl bg-[#f0c040] text-black flex items-center justify-center shrink-0 hover:bg-[#ffd060] transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
            <IcoSend />
          </button>
        </div>
        <p className="text-center text-[9px] text-[#181818] mt-1.5 select-none">
          Enter kirim · Shift+Enter baris baru · {ragMode ? `RAG ON · ${totalChunks} chunks` : "Chat Mode"} · {modelLabel}
        </p>
      </div>
    </div>
  );
}
