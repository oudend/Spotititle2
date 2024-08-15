"use client";

import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox"; //chadcn
import Sidebar from "@/components/ui/sidebar/sidebar";
import React from "react";
import { Store } from "tauri-plugin-store-api";
import { TextInput, CheckboxButton, SecretInput } from "@/components/ui/inputs";

export default function Home() {
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
        ></SecretInput>
        <CheckboxButton
          label="Auto Update"
          tooltip="Refresh SP DC automatically every hour"
          id="Auto_Update"
          buttonId="Update_SP_DC"
          buttonText="UPDATE SP DC"
          storeChange={storeChange}
          loadChange={loadChange}
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
