"use client";

import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox"; //chadcn
import Sidebar from "@/components/ui/sidebar/sidebar";
import React from "react";

import { TextInput, CheckboxButton } from "@/components/ui/inputs";

export default function Home() {
  return (
    <div className="overflow-hidden">
      <Sidebar></Sidebar>
      <main className="flex text-xl text-zinc-400 min-h-screen flex-col items-center pl-[300px] overflow-visible">
        <TextInput label="SP DC" id="SP_DC2" placeholder="SP DC"></TextInput>
        <CheckboxButton
          label="Auto Update"
          checkboxId="Auto_Update2"
          buttonId="Update_SP_DC2"
          buttonText="UPDATE SP DC"
        ></CheckboxButton>
        {/* <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full bg-white" />
          <div className="space-y-2">
          <Skeleton className="h-4 w-[250px] bg-white" />
          <Skeleton className="h-4 w-[200px] bg-white" />
          </div>
        </div> */}
      </main>
      <Image
        src={"/Background.png"}
        alt="background"
        fill
        className="absolute blur-xl z-[-1] object-cover"
      />
    </div>
  );
}
