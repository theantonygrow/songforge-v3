import './globals.css';

export const metadata = {
  title: 'SongForge v3',
  description: 'AI music generator with secure Sonauto API backend proxy',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
