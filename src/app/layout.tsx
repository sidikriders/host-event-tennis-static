import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "🎾 Tennis Event Host",
  description: "Host and manage tennis Americano/Mexicano events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
