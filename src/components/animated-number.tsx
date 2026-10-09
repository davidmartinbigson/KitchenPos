"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/** Smoothly tweens from the previous value to the new one. */
export function AnimatedNumber({
  value,
  format = (n: number) => Math.round(n).toLocaleString("en-US"),
  duration = 1.2,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const controls = animate(previous.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
      onComplete: () => {
        previous.current = value;
      },
    });
    return () => controls.stop();
  }, [value, duration]);

  return <>{format(display)}</>;
}
