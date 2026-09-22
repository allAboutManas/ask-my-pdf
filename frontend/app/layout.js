import "./globals.css";

export const metadata = {
  title: "Ask My PDF",
  description: "A simple RAG chat app for PDF and document Q&A.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
