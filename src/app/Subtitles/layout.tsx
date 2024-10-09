"use client";
import React, { useEffect, useRef, useState } from "react";
import { BackgroundImage } from "@/components/ui/background";
import { emit, listen } from "@tauri-apps/api/event";
import "../globals.css";
import { ImageInputOptionsProps } from "@/components/ui/inputs";
import { Store } from "tauri-plugin-store-api";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import "../../components/ui/backgroundEffects.css";

export default function SubtitlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [opacity, setOpacity] = useState(1.0);
  const [textBackground, setTextBackground] = useState(false);
  const [blur, setBlur] = useState("blur-none");
  const [alignment, setAlignment] = useState("object-cover");
  const [src, setSrc] = useState("/assets/backgrounds/default.png");
  const [isVideo, setIsVideo] = useState(false);
  const [backgroundEffect, setBackgroundEffect] = useState("");

  const storeRef = useRef(new Store(".settings.dat"));

  useEffect(() => {
    const loadSettings = async () => {
      const store = storeRef.current;

      const opacity = await store.get("backgroundOpacity");

      setOpacity((opacity as number) / 100);

      const backgroundTypeSetting = await store.get("backgroundType");

      if (backgroundTypeSetting)
        setTextBackground((backgroundTypeSetting as string) === "Text");
    };

    async function updateBackground() {
      const store = storeRef.current;

      let imageOption: ImageInputOptionsProps = (await store.get(
        "subtitleBackgroundImage"
      )) as ImageInputOptionsProps;

      console.log("imageOption: ", imageOption);

      const blurOption: string | null = await store.get(
        "subtitleBackgroundBlur"
      );

      const backgroundEffect: string | null = await store.get(
        "subtitleBackgroundEffect"
      );

      const alignmentOption: string | null = await store.get(
        "subtitleBackgroundAlignment"
      );

      if (backgroundEffect) {
        setBackgroundEffect(backgroundEffect);
      } else {
        setBackgroundEffect("");
      }

      if (imageOption) {
        const convertedSrc = imageOption.static
          ? imageOption.path
          : convertFileSrc(imageOption.path as string);

        setSrc(convertedSrc as string);

        setIsVideo(imageOption.extension === "mp4");
      } else {
        setSrc("/assets/backgrounds/default.png");
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

    listen("subtitleBackgroundUpdate", async (event) => {
      await updateBackground();
    });

    listen("backgroundOpacity", (event) => {
      //? validation required
      setOpacity((event.payload as number) / 100);
    });

    listen("backgroundType", (event) => {
      const backgroundTypeSetting = event.payload as string;

      if (backgroundTypeSetting)
        setTextBackground(backgroundTypeSetting === "Text");
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

    loadSettings();
    updateBackground();
  });

  // className={` ${
  //   textBackground
  //     ? "relative w-fit h-fit overflow-hidden"
  //     : "w-full h-full"
  // }`}

  return (
    <html lang="en" className="overflow-hidden bg-transparent h-full">
      <body className="h-full bg-transparent">
        <main className="h-full w-full flex justify-center items-center">
          <div
            className={`${
              textBackground
                ? "relative inline-block overflow-hidden text-center"
                : ""
            }`}
          >
            {children} {/* Centered text */}
            <BackgroundImage
              alt="background"
              width={1000}
              height={1000}
              src={src ?? "/assets/backgrounds/default.png"}
              isVideo={isVideo}
              className={`${backgroundEffect} absolute inset-0 z-[-1] w-full h-full`}
              blur={blur}
              alignment={alignment}
              blendMode="mix-blend-soft-light"
              style={{
                opacity: opacity,
              }}
            />
          </div>
        </main>
      </body>
    </html>
  );
}
