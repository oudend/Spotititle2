"use client";

import React, { useEffect, useRef, useState } from "react";
import Image, { ImageProps } from "next/image";
import "./subtitles.css"; // We'll use this for CSS animations

interface SubtitleProps {
  subtitle: string;
  textOpacity?: boolean;
  opacity: number;
  length: number; // total animation time in ms
  animate: boolean;
  animationDurationPercentage: number;
  updateKey: string;
  className?: string;
  animationClass?: string;
}

const Subtitles: React.FC<SubtitleProps> = ({
  subtitle,
  opacity,
  length,
  animate,
  animationDurationPercentage,
  updateKey,
  className,
  animationClass,
  textOpacity = false,
}) => {
  const [words, setWords] = useState<string[][]>([]);
  const [individualAnimationDuration, setIndividualAnimationDuration] =
    useState(0);
  const [maxDelay, setMaxDelay] = useState(0);

  // Split the text into individual letters and store them in state
  useEffect(() => {
    if (!animate) {
      setWords(subtitle.split(" ").map((word) => word.split("")));
      return;
    }

    setWords(subtitle.split(" ").map((word) => word.split("")));

    // Calculate the animation timing
    const newIndividualAnimationDuration = length * animationDurationPercentage; // Each letter's animation time
    const newMaxDelay = length - newIndividualAnimationDuration; // Maximum delay

    // Update state with new values
    setIndividualAnimationDuration(newIndividualAnimationDuration);
    setMaxDelay(newMaxDelay);
    // setTimeout(() => setShouldAnimate(true), 10);
  }, [subtitle, animate, length, animationDurationPercentage]);

  return (
    <div
      className=" cursor-default h-full w-full text-wrap bg-black bg-transparent font-medium text-white"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${!textOpacity ? opacity : 0})`,
      }}
    >
      <div className="absolute top-0 h-full w-full bg-black bg-transparent"></div>
      <article
        className={`noselect ${animationClass} relative z-10 h-full text-white`}
      >
        {words.map((word, wordIndex) => (
          <span
            key={`${subtitle}-${updateKey}-${wordIndex}`}
            className={`word-wrapper noselect`}
            style={{
              backgroundColor: `rgba(0, 0, 0, ${textOpacity ? opacity : 0})`,
            }}
          >
            {word.map((letter, letterIndex) => {
              // Calculate the global index for this letter
              const previousLetters = words
                .slice(0, wordIndex)
                .reduce((sum, word) => sum + word.length, 0);

              const globalLetterIndex = previousLetters + letterIndex;

              const totalLetters = words.reduce(
                (sum, word) => sum + word.length,
                0
              );

              return (
                <span
                  key={`${subtitle}-${updateKey}-${wordIndex}-${letterIndex}`}
                  className={`noselect ${animate ? animationClass : ""}`}
                  style={{
                    // Calculate animation delay based on global index and total letters
                    animationDelay: `${
                      (globalLetterIndex / totalLetters) * maxDelay
                    }ms`,
                    animationDuration: `${individualAnimationDuration}ms`,
                  }}
                >
                  {letter === " " ? "\u00A0" : letter}
                </span>
              );
            })}
            {/* Add a space after each word, except for the last word */}
            {wordIndex < words.length - 1 && "\u00A0"}
          </span>
        ))}
      </article>
    </div>
  );
};

export { Subtitles };
