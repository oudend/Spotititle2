import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox"; //chadcn
import Sidebar from "@/components/ui/sidebar/sidebar";
import React, { useEffect, useState } from "react";

import { Subtitles } from "@/components/ui/subtitles";

export default function Home() {
  // const noDragSelector = "input, a, button"; // CSS selector
  // document.addEventListener("mousedown", async (e) => {
  //   if (e.target && (e.target as HTMLElement).closest(noDragSelector)) return; // a non-draggable element either in target or its ancestors
  //   await tauriWindow.appWindow.startDragging();
  // });

  return (
    <div className="overflow-hidden w-full h-full">
      <Subtitles />
    </div>
  );
}
