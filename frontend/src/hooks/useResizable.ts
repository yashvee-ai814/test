import { useCallback, useRef, useState } from "react";

export function useResizable(initial: number, min: number, max: number) {
  const [width, setWidth] = useState(initial);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(initial);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, direction: "left" | "right" = "right") => {
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;

      function onMouseMove(ev: MouseEvent) {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        const next = direction === "right" ? startWidth.current + delta : startWidth.current - delta;
        setWidth(Math.min(max, Math.max(min, next)));
      }

      function onMouseUp() {
        dragging.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [width, min, max],
  );

  return { width, onMouseDown };
}
