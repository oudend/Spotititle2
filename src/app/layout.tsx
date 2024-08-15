import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { BackgroundImage } from "@/components/ui/background";
import Image from "next/image";
import "./globals.css";
import { Store } from "tauri-plugin-store-api";
import React from "react";

const store = new Store(".settings.dat");

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spotititle",
  description: "Spotify subtitles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-hidden">
      <body className={inter.className}>
        <main>
          {children}
          {/* <Image
            src={"/assets/backgrounds/default.png"}
            alt="background"
            width={1000}
            height={1000}
            className="absolute inset-0 blur-xl z-[-1] object-cover min-w-[calc(100vw+100px)] min-h-[calc(100vh+100px)]"
          /> */}
          <BackgroundImage
            alt="background"
            width={1000}
            height={1000}
            className="absolute top-[-50px] inset-0 z-[-1] min-w-[calc(100vw+100px)] min-h-[calc(100%+100px)] w-full h-full"
          />
        </main>
        {/* <Toaster
          toastOptions={{
            style: { background: "red" },
            className: "my-toast",
          }}
        /> */}
      </body>
    </html>
  );
}
