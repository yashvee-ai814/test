import { useEffect, useRef } from "react";
import type { Turn } from "../../types";
import { MessageBubble } from "./MessageBubble";
import { PricingAnalysisCard } from "./PricingAnalysisCard";

export function ChatWindow({ turns }: { turns: Turn[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
      {turns.map((turn) => (
        <div key={turn.id} className="flex flex-col gap-3">
          <MessageBubble question={turn.question} />
          <PricingAnalysisCard turn={turn} />
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
