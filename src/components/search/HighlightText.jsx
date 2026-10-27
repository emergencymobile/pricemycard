import React from "react";
import { fuzzyHighlightParts } from "@/lib/fuzzySearch";

export function HighlightText({ text, query }) {
  if (!text) return <>{text}</>;
  const parts = fuzzyHighlightParts(text, query);

  return (
    <>
      {parts.map((part, i) =>
        part.hl ? (
          <mark key={i} className="text-purple-600 dark:text-purple-400 font-bold bg-transparent">{part.text}</mark>
        ) : (
          <React.Fragment key={i}>{part.text}</React.Fragment>
        )
      )}
    </>
  );
}