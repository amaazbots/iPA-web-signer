import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AmaazSign — IPA Signer by Amaazbots",
  description: "Sign your own IPA files in your browser and prepare an iPhone installation link.",
  icons: {
    icon: "/amaazsign-logo.png",
    shortcut: "/amaazsign-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
