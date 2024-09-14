"use client";

import React, { useEffect, useRef, useState } from "react";
import Image, { ImageProps } from "next/image";

interface SubtitleProps {
  subtitle: string;
  opacity: number;
}

const Subtitles: React.FC<SubtitleProps> = ({ subtitle, opacity }) => {
  return (
    <div className=" cursor-default h-full w-full text-wrap bg-black bg-transparent text-center text-2xl font-medium text-white">
      <div
        className="absolute top-0 h-full w-full bg-black"
        style={{ opacity: opacity }}
      ></div>
      <article className="relative z-10 h-full text-white">{subtitle}</article>
    </div>
  );
};

export { Subtitles };
