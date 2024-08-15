"use client";

import React, { useEffect, useRef, useState } from "react";
import Image, { ImageProps } from "next/image";
import { Store } from "tauri-plugin-store-api";
import { convertFileSrc } from "@tauri-apps/api/tauri";

import { ImageInputOptionsProps } from "@/components/ui/inputs";

import eventBus from "@/lib/EventBus";
// import { window as tauriWindow } from "@tauri-apps/api";
//ImageProps
// type BackgroundImageProps = Omit<ImageProps, "src" | "ref">;

// type BackgroundImageProps = Omit<ImageProps, "src" | "ref"> & {
//   src: string;
//   isVideo: boolean;
// };

const Subtitles = () => {
  useEffect(() => {
    const noDragSelector = "input, a, button"; // CSS selector
    document.addEventListener("mousedown", async (e) => {
      if (e.target && (e.target as HTMLElement).closest(noDragSelector)) return; // a non-draggable element either in target or its ancestors
      const tauriWindow = await import("@tauri-apps/api/window");
      await tauriWindow.appWindow.startDragging();
    });
  }, []);

  return <div>subtitles</div>;
};

export { Subtitles };
