import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export function QuestPanel({ title, eyebrow, children, className }: { title?: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("quest-panel p-5 md:p-6", className)}>
      {eyebrow && (
        <div className="text-[10px] tracking-[0.3em] uppercase gold-text font-semibold mb-1">{eyebrow}</div>
      )}
      {title && (
        <h2 className="font-serif text-lg md:text-xl gold-text mb-3">{title}</h2>
      )}
      {children}
    </section>
  );
}