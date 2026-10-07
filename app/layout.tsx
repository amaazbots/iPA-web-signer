import type { Metadata } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  metadataBase: new URL("https://amaazsign.amaazbots.workers.dev"),
  title: "AmaazSign — IPA Signer by Amaazbots",
  description: "Sign compatible IPA files privately in your browser and prepare an iPhone installation link with AmaazSign.",
  keywords: ["IPA signer","iOS sideloading","sign IPA","install IPA","AmaazSign","Amaazbots"],
  applicationName: "AmaazSign",
  manifest: "/manifest.webmanifest",
  openGraph: { title:"AmaazSign — Online IPA Signer", description:"Sign compatible IPA files in your browser and prepare an iPhone installation link.", url:"/", siteName:"AmaazSign", images:[{url:"/amaazsign-logo.png",width:512,height:512,alt:"AmaazSign"}], type:"website" },
  twitter: { card:"summary", title:"AmaazSign — Online IPA Signer", description:"Sign compatible IPA files in your browser and prepare an iPhone installation link.", images:["/amaazsign-logo.png"] },
  appleWebApp: { capable:true, title:"AmaazSign", statusBarStyle:"black-translucent" },
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
      <body className="antialiased">{children}<PwaRegister/></body>
    </html>
  );
}
