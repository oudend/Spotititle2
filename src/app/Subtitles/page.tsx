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
  const [subtitle, setSubtitle] = useState("subtitles");

  const storeRef = useRef(new Store(".settings.dat"));

  useEffect(() => {
    const loadSettings = async () => {
      const tauriWindow = await import("@tauri-apps/api/window");

      // const window = tauriWindow.

      const store = storeRef.current;

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

    listen("SP_DC_Loaded", async (event) => {
      try {
        const current_song_string = await invoke("get_current_song");

        const current_song_data = JSON.parse(current_song_string as string);

        console.log(current_song_data);

        const song_lyrics_string = await invoke("get_song_lyrics", {
          songId: current_song_data.item.id,
        });

        setSubtitle(current_song_data.item.name);

        const song_lyrics_data = JSON.parse(song_lyrics_string as string);

        console.log(song_lyrics_data);
      } catch (e) {
        console.error(e);
      }
    });

    loadSettings();
  }, []);

  return (
    <div className="overflow-hidden w-full h-full">
      <Subtitles subtitle={subtitle} opacity={opacity} />
    </div>
  );
}
