// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lazy Donut Undercover',
  description: 'Simple online Undercover game with lobbies',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-root">
          <header className="app-header">
            <h1>Lazy Donut Undercover</h1>
          </header>
          <main className="app-main">{children}</main>
          <footer className="app-footer">
            <small>Play Undercover with your friends 🎮</small>
          </footer>
        </div>
      </body>
    </html>
  );
}
