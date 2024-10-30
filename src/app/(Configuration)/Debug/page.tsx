"use client";

import Image from "next/image";
import Sidebar from "@/components/ui/sidebar/sidebar";
import React, { useEffect, useState } from "react";
import { readTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import { Skeleton } from "@/components/ui/skeleton";
import { listen } from "@tauri-apps/api/event";
import { ScrollArea } from "@/components/ui/scroll-area";

import { TextInput, CheckboxButton } from "@/components/ui/inputs";

export default function Home() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Load initial log file content
    async function loadLogs() {
      try {
        const logContent = await readTextFile("log.txt", {
          dir: BaseDirectory.AppData,
        });
        console.log(logContent, "log content");
        setLogs(logContent.split("\n").filter((line) => line.trim() !== ""));
      } catch (error) {
        console.error("Failed to load log file:", error);
      }
    }

    // Listen for "debug" events and append new logs
    const unlisten = listen<string>("debug", (event) => {
      setLogs((prevLogs) => [...prevLogs, event.payload]);
    });

    loadLogs();

    return () => {
      // Clean up the event listener when the component unmounts
      unlisten.then((unsub) => unsub());
    };
  }, []);

  return (
    <div className="overflow-hidden min-h-screen flex flex-col">
      <Sidebar />
      <main
        className="flex text-xl text-zinc-400 flex-col items-center pl-[300px] flex-grow
      "
      >
        <div className="w-full p-4 bg-[rgba(0,0,0,0.8)] max-h-screen overflow-y-auto">
          {logs.length > 0 ? (
            logs.map((log, index) => <div key={index}>{log}</div>)
          ) : (
            <Skeleton className="h-6 w-full" />
          )}
        </div>
      </main>
    </div>
  );
}
