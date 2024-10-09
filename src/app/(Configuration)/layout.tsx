"use client";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { BackgroundImage } from "@/components/ui/background";
import { emit, listen } from "@tauri-apps/api/event";
import Image from "next/image";
import "../globals.css";
import { Store } from "tauri-plugin-store-api";
import React, { useEffect, useRef, useState } from "react";
import { ImageInputOptionsProps } from "@/components/ui/inputs";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import "../../components/ui/backgroundEffects.css";

const store = new Store(".settings.dat");

const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "Spotititle",
//   description: "Spotify subtitles",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [blur, setBlur] = useState("blur-none");
  const [alignment, setAlignment] = useState("object-cover");
  const [src, setSrc] = useState("/assets/backgrounds/default.png");
  const [isVideo, setIsVideo] = useState(false);
  const [backgroundEffect, setBackgroundEffect] = useState("");

  const storeRef = useRef(new Store(".settings.dat"));

  useEffect(() => {
    async function updateBackground() {
      const store = storeRef.current;

      let imageOption: ImageInputOptionsProps = (await store.get(
        "backgroundImage"
      )) as ImageInputOptionsProps;

      const blurOption: string | null = await store.get("backgroundBlur");

      const backgroundEffect: string | null = await store.get(
        "backgroundEffect"
      );

      const alignmentOption: string | null = await store.get(
        "backgroundAlignment"
      );

      if (backgroundEffect) {
        setBackgroundEffect(backgroundEffect);
      } else {
        setBackgroundEffect("/assets/backgrounds/default.png");
      }

      if (imageOption) {
        const convertedSrc = imageOption.static
          ? imageOption.path
          : convertFileSrc(imageOption.path as string);

        if (convertedSrc) {
          setSrc(convertedSrc as string);
        } else {
          setSrc(convertedSrc as string);
        }

        setIsVideo(imageOption.extension === "mp4");
      }

      if (blurOption) {
        switch (blurOption) {
          case "none":
            setBlur("blur-none");
            break;
          case "small":
            setBlur("blur-sm");
            break;
          case "medium":
            setBlur("blur-md");
            break;
          case "large":
            setBlur("blur-lg");
            break;
        }
      }
      if (alignmentOption) {
        switch (alignmentOption) {
          case "cover":
            setAlignment("object-cover");
            break;
          case "fit":
            setAlignment("object-fit");
            break;
        }
      }
    }

    listen("backgroundUpdate", async (event) => {
      await updateBackground();
    });

    listen("current-song-updated", async (event) => {
      const store = storeRef.current;

      try {
        const current_song_data = JSON.parse(event.payload as string);

        const images = current_song_data?.item?.album?.images;

        let imageOption: ImageInputOptionsProps = (await store.get(
          "backgroundImage"
        )) as ImageInputOptionsProps;

        if (
          imageOption !== null &&
          imageOption.label === "Current Song Cover" &&
          images &&
          images.length > 0
        ) {
          imageOption.path = images[0].url;
          imageOption.static = true;

          setSrc(imageOption.path as string);

          await store.set("backgroundImage", imageOption);
        }
      } catch (e) {
        console.error(e);
      }
    });

    updateBackground();
  });

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
            src={src ?? "/assets/backgrounds/default.png"}
            isVideo={isVideo}
            className={`${backgroundEffect} absolute inset-0 z-[-1] top-[-50px] min-w-[calc(100vw+100px)] min-h-[calc(100%+100px)] w-full h-full`}
            blur={blur}
            alignment={alignment}
            blendMode="mix-blend-soft-light"
          />
          {/* <BackgroundImage
            alt="background"
            width={1000}
            height={1000}
            className="absolute top-[-50px] inset-0 z-[-1] min-w-[calc(100vw+100px)] min-h-[calc(100%+100px)] w-full h-full"
          /> */}
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
