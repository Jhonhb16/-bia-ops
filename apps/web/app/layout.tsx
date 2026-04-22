import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BIA OPS",
  description: "Plataforma operativa para Bia Agency."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;0,900;1,900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
