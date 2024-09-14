import React from "react";
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
          {/* BackgroundImage is not included here */}
        </main>
      </body>
    </html>
  );
}
