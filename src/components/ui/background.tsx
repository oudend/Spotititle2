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

//? listen for song_update and update if the current image is the current cover.

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

      let imageOption: ImageInputOptionsProps = (await store.get(
        "backgroundImage"
      )) as ImageInputOptionsProps;

      console.log("imageOption", imageOption);

      const blurOption: string | null = await store.get("backgroundBlur");

      const alignmentOption: string | null = await store.get(
        "backgroundAlignment"
      );

      if (imageOption) {
        console.log("setting imageOption path", imageOption.path, imageOption);

        if (imageOption.extension === "mp4") setIsVideo(true);
        else setIsVideo(false);
        if (imageOption.static && imageOption.path) {
          setSrc(imageOption.path);
        } else if (imageOption.path) {
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

    console.log("mounting listener");
    listen("backgroundUpdate", async (event) => {
      // event.event is the event name (useful if you want to use a single callback fn for multiple event types)
      // event.payload is the payload object
      // console.log("background update????");
      await updateBackgroundImage();
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

          await store.set("backgroundImage", imageOption);
          await updateBackgroundImage();
        }
      } catch (e) {
        console.error(e);
      }
    });

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
