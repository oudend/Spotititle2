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
  const [subtitleKey, setSubtitleKey] = useState("0");
  const [textBackground, setTextBackground] = useState(false);
  const [animationClass, setAnimationClass] = useState("none");
  const [animationDurationPercentage, setAnimationDurationPercentage] =
    useState<number>(0.1);
  const [length, setLength] = useState<number>(0);
  const [animateSubtitles, setAnimateSubtitles] = useState(true);
  const [textAlign, setTextAlign] = useState<"left" | "right" | "center">(
    "center"
  );

  const storeRef = useRef(new Store(".settings.dat"));

  useEffect(() => {
    const loadSettings = async () => {
      const tauriWindow = await import("@tauri-apps/api/window");

      const store = storeRef.current;

      const fontSize = await store.get("fontSize");

      setFontSize(Math.min(Math.max(10, fontSize as number), 100));

      const opacity = await store.get("backgroundOpacity");

      setOpacity((opacity as number) / 100);

      var storedTextAlign = (await store.get("textAlignment")) as string;
      if (storedTextAlign) {
        storedTextAlign = storedTextAlign.toLowerCase();

        if (
          storedTextAlign === "left" ||
          storedTextAlign === "right" ||
          storedTextAlign === "center"
        ) {
          setTextAlign(storedTextAlign);
        } else {
          setTextAlign("center"); // Fallback to default value
        }
      }

      const hideSubtitles =
        (await store.get("hideSubtitles")) === "true" ? true : false;

      if (hideSubtitles) {
        await tauriWindow.appWindow.hide();
      }

      const textAnimation = await store.get("textAnimation");

      if (textAnimation) setAnimationClass(textAnimation as string);

      const animationDurationPercentageSetting = await store.get(
        "animationDurationPercentage"
      );

      if (animationDurationPercentageSetting)
        setAnimationDurationPercentage(
          animationDurationPercentageSetting as number
        );

      const backgroundTypeSetting = await store.get("backgroundType");

      if (backgroundTypeSetting)
        setTextBackground((backgroundTypeSetting as string) === "Text");
    };

    var tauriWindow: any; // Hold the imported module reference

    function throttle(callback: any, limit: number) {
      var wait = false; // Initially, we're not waiting
      return function () {
        // We return a throttled function
        if (!wait) {
          // If we're not waiting
          callback.call(); // Execute users function
          wait = true; // Prevent future invocations
          setTimeout(function () {
            // After a period of time
            wait = false; // And allow future invocations
          }, limit);
        }
      };
    }

    const handleMouseDown = async (e: MouseEvent) => {
      // Only run in a Tauri environment
      // e.preventDefault();
      if (window.__TAURI__) {
        // console.log(tauriWindow, "eööp??")
        // if (e.target && (e.target as HTMLElement).closest(noDragSelector)) return; // Example of handling specific elements

        await tauriWindow.appWindow.startDragging();
        console.log("mouseDown event sent");
      }
    };

    const setupDragListener = async () => {
      if (window.__TAURI__) {
        // Dynamically import the module only once, at the start
        tauriWindow = await import("@tauri-apps/api/window");
        document.addEventListener("mousedown", throttle(handleMouseDown, 500));
      }
    };

    setupDragListener();

    const noDragSelector = "input, a, button"; // CSS selector
    // document.addEventListener("mousedown", async (e) => {
    //   // if (e.target && (e.target as HTMLElement).closest(noDragSelector)) return; // a non-draggable element either in target or its ancestors
    //   const tauriWindow = await import("@tauri-apps/api/window");
    //   await tauriWindow.appWindow.startDragging();
    // });

    listen("backgroundType", (event) => {
      const backgroundTypeSetting = event.payload as string;

      if (backgroundTypeSetting)
        setTextBackground(backgroundTypeSetting === "Text");
    });
    listen("animationDurationPercentage", (event) => {
      const animationDurationPercentageSetting = event.payload as number;

      console.log(
        animationDurationPercentageSetting,
        "animationDurationPercentageSetting"
      );

      if (animationDurationPercentageSetting)
        setAnimationDurationPercentage(animationDurationPercentageSetting);
    });
    listen("textAnimation", (event) => {
      const textAnimation = event.payload as string;

      if (textAnimation) setAnimationClass(textAnimation as string);
    });

    listen("textAlignment", (event) => {
      var newTextAlign = event.payload as string;

      newTextAlign = newTextAlign.toLowerCase();

      console.log(newTextAlign);

      if (
        newTextAlign === "left" ||
        newTextAlign === "right" ||
        newTextAlign === "center"
      ) {
        console.log("updated");
        setTextAlign(newTextAlign);
      } else {
        setTextAlign("center"); // Fallback to default value
      }
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

        setAnimateSubtitles(false);
        setSubtitle(current_song_data.item.name);
      } catch (e) {
        console.error(e);
      }
    });
    listen("current-song-lyric-updated", async (event) => {
      const current_lyric_data = JSON.parse(event.payload as string);

      setAnimateSubtitles(true);

      setLength(current_lyric_data.displayTime);

      setSubtitle(current_lyric_data.text as string);

      setSubtitleKey((current_lyric_data.index as number).toString());

      console.log(current_lyric_data);
    });

    loadSettings();
  }, []);

  return (
    <div
      className="overflow-hidden w-full h-full"
      style={{ fontSize: `${fontSize}px`, textAlign: textAlign }}
    >
      <Subtitles
        subtitle={subtitle}
        opacity={0}
        length={length}
        textOpacity={textBackground}
        animationDurationPercentage={animationDurationPercentage}
        updateKey={subtitleKey}
        animate={animateSubtitles}
        animationClass={animationClass}
      />
    </div>
  );
}
