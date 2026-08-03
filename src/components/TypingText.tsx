"use client";

import { useEffect, useState } from "react";

type TypingTextProps = {
  text: string;
  className?: string;
  speedMs?: number;
  startDelayMs?: number;
};

export default function TypingText({
  text,
  className = "",
  speedMs = 80,
  startDelayMs = 300,
}: TypingTextProps) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let charIndex = 0;
    let typingInterval: ReturnType<typeof setInterval>;

    const startTimeout = setTimeout(() => {
      typingInterval = setInterval(() => {
        charIndex += 1;
        setDisplayed(text.slice(0, charIndex));

        if (charIndex >= text.length) {
          clearInterval(typingInterval);
        }
      }, speedMs);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(typingInterval);
    };
  }, [text, speedMs, startDelayMs]);

  return (
    <span className={className}>
      {displayed}
      <span className="animate-blink border-r-2 border-current ml-1" />
    </span>
  );
}
