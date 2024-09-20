import React from "react";
import { BackgroundImage } from "@/components/ui/background";
import { emit, listen } from "@tauri-apps/api/event";
import "../globals.css";

export default function SubtitlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-hidden bg-transparent h-full">
      <body className="h-full bg-transparent">
        <main className="h-full w-full">
          {children}
          {/*<BackgroundImage
            alt="background"
            width={1000}
            height={1000}
            className="absolute top-[-50px] inset-0 z-[-1] min-w-[calc(100vw+100px)] min-h-[calc(100%+100px)] w-full h-full"/> 
          */}
          {/* BackgroundImage is not included here */}
        </main>
      </body>
    </html>
  );
}
