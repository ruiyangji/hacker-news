import "./globals.css";

export const metadata = {
  title: "HN — Hacker News",
  description: "Hacker News reader with cached feeds",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
