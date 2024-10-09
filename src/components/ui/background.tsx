"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Store } from "tauri-plugin-store-api";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";

interface BackgroundImageProps {
  width: number;
  height: number;
  src: string;
  firstImageClassName?: string;
  secondImageClassName?: string;
  className?: string;
  alt: string;
  isVideo?: boolean; // Whether to use video or image
  blur?: string; // 'none', 'small', 'medium', 'large'
  alignment?: string;
  blendMode?: string; // Custom blend modes for the front layer
  style?: React.CSSProperties;
}

const BackgroundImage = ({
  width,
  height,
  src,
  firstImageClassName = "",
  secondImageClassName = "",
  className = "",
  alt,
  isVideo = false,
  blur = "blur-md", // Default blur
  alignment = "object-fit",
  blendMode = "normal", // Default blend mode
  style,
}: BackgroundImageProps) => {
  const commonClasses = `absolute inset-0 w-full h-full ${blur} ${alignment}`;

  const renderVideoLayer = (
    key: string,
    source: string,
    additionalClassName: string,
    dataValue: "first" | "second" = "first"
  ) => (
    <video
      key={key}
      autoPlay
      loop
      muted
      preload="auto"
      className={`${commonClasses} ${additionalClassName}`}
      data-value={dataValue}
      style={style}
    >
      <source src={source} type="video/mp4" />
    </video>
  );

  const renderImageLayer = (
    key: string,
    source: string,
    additionalClassName: string,
    dataValue: "first" | "second" = "first"
  ) => (
    // <div></div>
    <Image
      key={key}
      src={source}
      alt={alt}
      width={width}
      height={height}
      priority
      quality={100}
      className={`${commonClasses} ${additionalClassName}`}
      unoptimized
      data-value={dataValue}
      style={style}
    />
  );

  return (
    <>
      {/* Back blurred layer */}
      {
        isVideo
          ? renderVideoLayer(
              src + "back1",
              src,
              `z-[-2] ${className} ${firstImageClassName}`,
              "first"
            ) // Back video
          : renderImageLayer(
              src + "back1",
              src,
              `z-[-2] ${className} ${firstImageClassName}`,
              "first"
            ) // Back image
      }

      {/* Front blurred layer with blend mode */}
      {
        isVideo
          ? renderVideoLayer(
              src + "2",
              src,
              `z-[-1] ${blendMode} ${className} ${secondImageClassName}`,
              "second"
            ) // Front video
          : renderImageLayer(
              src + "2",
              src,
              `z-[-1] ${blendMode} ${className} ${secondImageClassName}`,
              "second"
            ) // Front image
      }
    </>
  );
};

export { BackgroundImage };
