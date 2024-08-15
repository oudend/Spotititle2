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
      <main className="flex text-xl text-zinc-400 min-h-screen flex-col items-center pl-[300px] overflow-visible"></main>
    </div>
  );
}
