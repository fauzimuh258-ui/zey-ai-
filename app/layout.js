"use server";
import "./globals.css";

export const metadata = {
  title: "ZeyAI",
  description: "Personal RAG Assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
