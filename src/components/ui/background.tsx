"use client";

import React, { useEffect, useRef, useState } from "react";
import Image, { ImageProps } from "next/image";
import { Store } from "tauri-plugin-store-api";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { emit, listen } from "@tauri-apps/api/event";
import { ImageInputOptionsProps } from "@/components/ui/inputs";
//ImageProps
// type BackgroundImageProps = Omit<ImageProps, "src" | "ref">;

// type BackgroundImageProps = Omit<ImageProps, "src" | "ref"> & {
//   src: string;
//   isVideo: boolean;
// };

interface BackgroundImageProps {
  width: number;
  height: number;
  className: string;
  alt: string;
}

const BackgroundImage = (props: BackgroundImageProps) => {
  const [src, setSrc] = useState("/assets/backgrounds/default.png");
  const [isVideo, setIsVideo] = useState(false);

  const [classNameExtensions, setclassNameExtensions] = useState("");

  const storeRef = useRef(new Store(".settings.dat"));

  useEffect(() => {
    const updateBackgroundImage = async () => {
      const store = storeRef.current;

      let imageOption: ImageInputOptionsProps | null = JSON.parse(
        (await store.get("backgroundImage")) as string
      );

      const blurOption: string | null = await store.get("backgroundBlur");

      const alignmentOption: string | null = await store.get(
        "backgroundAlignment"
      );

      if (imageOption) {
        if (imageOption.extension === "mp4") setIsVideo(true);
        else setIsVideo(false);
        if (imageOption.static) {
          setSrc(imageOption.path);
        } else {
          setSrc(convertFileSrc(imageOption.path));
        }
      }

      let classNameExtension = "";

      if (blurOption) {
        switch (blurOption) {
          case "none":
            classNameExtension += "blur-none ";
            break;
          case "small":
            classNameExtension += "blur-sm ";
            break;
          case "medium":
            classNameExtension += "blur-md ";
            break;
          case "large":
            classNameExtension += "blur-lg ";
            break;
        }
      }
      if (alignmentOption) {
        switch (alignmentOption) {
          case "cover":
            classNameExtension += "object-cover ";
            break;
          case "fit":
            classNameExtension += "object-fit ";
            break;
        }
      }

      setclassNameExtensions(classNameExtension);
    };

    (async () => {
      console.log("mounting listener");
      const unlisten = await listen("backgroundUpdate", async (event) => {
        // event.event is the event name (useful if you want to use a single callback fn for multiple event types)
        // event.payload is the payload object
        console.log("background update????");
        await updateBackgroundImage();
      });
    })();

    updateBackgroundImage();
  }, [storeRef]);

  return (
    <>
      {(isVideo && (
        <video
          {...props}
          key={src}
          autoPlay
          loop
          muted
          preload="auto"
          className={`${props.className} ${classNameExtensions}`}
        >
          <source src={src} type="video/mp4" />
        </video>
      )) || (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image
          {...props}
          key={src}
          src={src}
          priority={true}
          quality={100}
          className={`${props.className} ${classNameExtensions}`}
          unoptimized={true}
        />
      )}
    </>
  );
};

export { BackgroundImage };
