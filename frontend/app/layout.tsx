import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assistant RAG Local",
  description: "Interface de recherche documentaire et d'assistance RAG en local",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}