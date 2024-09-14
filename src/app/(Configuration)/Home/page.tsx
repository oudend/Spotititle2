"use client";

import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox"; //chadcn
import Sidebar from "@/components/ui/sidebar/sidebar";
import React, { useEffect, useState } from "react";
import { Store } from "tauri-plugin-store-api";
import { TextInput, CheckboxButton, SecretInput } from "@/components/ui/inputs";
import { invoke } from "@tauri-apps/api/tauri";
import { emit, listen } from "@tauri-apps/api/event";

export default function Home() {
  const [incorrectSP_DC, setIncorrectSP_DC] = useState(false);

  const store = new Store(".settings.dat");

  const storeChange = async (id: string, value: string) => {
    await store.set(id, value);
    await store.save();
  };

  const loadChange = async (id: string): Promise<string | null> => {
    const value = await store.get(id);
    console.log(id, value, "storeget");
    return await store.get(id);
  };

  const check_SP_DC = async () => {
    const SP_DC = await store.get("SP_DC");

    try {
      await invoke("refresh_spotify_token", {
        spDc: SP_DC,
      });
      setIncorrectSP_DC(false);

      // emit("SP_DC_Loaded");
    } catch (e) {
      console.error(e);
      setIncorrectSP_DC(true);
    }

    // try {
    //   const current_song_string = await invoke("get_current_song");

    //   const current_song_data = JSON.parse(current_song_string as string);

    //   console.log(current_song_data);

    //   const song_lyrics_string = await invoke("get_song_lyrics", {
    //     songId: current_song_data.item.id,
    //   });

    //   const song_lyrics_data = JSON.parse(song_lyrics_string as string);

    //   console.log(song_lyrics_data);
    // } catch (e) {
    //   console.error(e);
    // }
  };

  useEffect(() => {
    check_SP_DC();
  }, []);

  return (
    <div className="overflow-hidden">
      <Sidebar></Sidebar>
      <main className="flex text-xl text-zinc-400 min-h-screen flex-col items-center pl-[300px] overflow-visible">
        <SecretInput
          label="SP DC"
          tooltip="SP DC"
          id="SP_DC"
          placeholder="SP DC"
          storeChange={storeChange}
          loadChange={loadChange}
          incorrect={incorrectSP_DC}
        ></SecretInput>
        <CheckboxButton
          label="Auto Update"
          tooltip="Refresh SP DC automatically every hour"
          id="Auto_Update"
          buttonId="Update_SP_DC"
          buttonText="UPDATE SP DC"
          storeChange={storeChange}
          loadChange={loadChange}
          onClick={check_SP_DC}
        ></CheckboxButton>
        {/* <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full bg-white" />
          <div className="space-y-2">
          <Skeleton className="h-4 w-[250px] bg-white" />
          <Skeleton className="h-4 w-[200px] bg-white" />
          </div>
        </div> */}
      </main>
    </div>
  );
}
