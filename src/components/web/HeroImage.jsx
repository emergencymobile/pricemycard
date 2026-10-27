import { useState, useEffect } from "react";

// A single large representative image shown for a search. Renders nothing
// (graceful skip) when there is no source URL or the image fails to load, so a
// broken/placeholder image is never displayed. `imgClassName` and
// `wrapClassName` let callers place it inline (e.g. beside the value bar).
export default function HeroImage({ src, alt, imgClassName, wrapClassName }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) return null;
  return (
    <div className={wrapClassName ?? "mb-6 flex justify-center"}>
      <img
        src={src}
        alt={alt || "Card image"}
        onError={() => setFailed(true)}
        className={imgClassName ?? "max-h-80 w-auto max-w-full rounded-2xl border border-border object-contain"}
      />
    </div>
  );
}