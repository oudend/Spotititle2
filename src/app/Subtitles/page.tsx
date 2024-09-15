"use client";

import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox"; //chadcn
import Sidebar from "@/components/ui/sidebar/sidebar";
import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Subtitles } from "@/components/ui/subtitles";

import { Store } from "tauri-plugin-store-api";

import { emit, listen } from "@tauri-apps/api/event";

export default function Home() {
  const [opacity, setOpacity] = useState(1.0);
  const [fontSize, setFontSize] = useState(10.0);
  const [subtitle, setSubtitle] = useState("subtitles");

  const storeRef = useRef(new Store(".settings.dat"));

  useEffect(() => {
    const loadSettings = async () => {
      const tauriWindow = await import("@tauri-apps/api/window");

      const store = storeRef.current;

      const fontSize = await store.get("fontSize");

      setFontSize(Math.min(Math.max(10, fontSize as number), 100));

      const opacity = await store.get("backgroundOpacity");

      setOpacity((opacity as number) / 100);

      const hideSubtitles =
        (await store.get("hideSubtitles")) === "true" ? true : false;

      if (hideSubtitles) {
        await tauriWindow.appWindow.hide();
      }
    };

    const noDragSelector = "input, a, button"; // CSS selector
    document.addEventListener("mousedown", async (e) => {
      if (e.target && (e.target as HTMLElement).closest(noDragSelector)) return; // a non-draggable element either in target or its ancestors
      const tauriWindow = await import("@tauri-apps/api/window");
      await tauriWindow.appWindow.startDragging();
    });

    listen("fontSize", (event) => {
      //? validation required
      setFontSize(Math.min(Math.max(10, event.payload as number), 100));
    });

    listen("backgroundOpacity", (event) => {
      //? validation required
      setOpacity((event.payload as number) / 100);
    });

    listen("hideSubtitles", async (event) => {
      console.log("Hide subtitles event: ", event);
      //? validation required
      const tauriWindow = await import("@tauri-apps/api/window");

      if (event.payload === true) await tauriWindow.appWindow.hide();
      else await tauriWindow.appWindow.show();
    });

    listen("current-song-updated", async (event) => {
      try {
        const current_song_data = JSON.parse(event.payload as string);

        setSubtitle(current_song_data.item.name);
      } catch (e) {
        console.error(e);
      }
    });
    listen("current-song-lyric-updated", async (event) => {
      const current_lyric_data = JSON.parse(event.payload as string);

      setSubtitle(current_lyric_data.text as string);
    });

    loadSettings();
  }, []);

  return (
    <div
      className="overflow-hidden w-full h-full"
      style={{ fontSize: `${fontSize}px` }}
    >
      <Subtitles subtitle={subtitle} opacity={opacity} />
    </div>
  );
}
