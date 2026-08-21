# CLAUDE.md — Zey AI

## Cara Kerja Saya
- MVP dulu, fitur kompleks belakangan
- Test tiap fitur sebelum deploy

## Error yang Sering Muncul
- Groq model deprecated → ganti ke llama-3.3-70b-versatile
- Supabase RLS → pastikan policy user_id benar

## Tech Stack
- Next.js 14, Supabase, Groq, Vercel
- Gateway: zey-ai.vercel.app/api/chat

## Aturan
- Rate limiting: 20 req/menit/user
- Input sanitizer wajib
- Output validator wajib
