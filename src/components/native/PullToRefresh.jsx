import React, { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Native-style pull-to-refresh for the scrollable page content. The app's
// pages scroll the document (window), not a nested container, so this checks
// window.scrollY: only when the page is scrolled to the very top and the user
// drags downward does a spinner grow above the content. Releasing past the
// threshold calls onRefresh (async) and holds until it resolves.
export default function PullToRefresh({ onRefresh, children }) {
  const THRESHOLD = 64;
  const startYRef = useRef(null);
  const pullingRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const atTop = () =>
    (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) <= 0;

  const onTouchStart = (e) => {
    if (refreshing) return;
    if (!atTop()) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  };

  const onTouchMove = (e) => {
    if (!pullingRef.current || refreshing) return;
    if (!atTop()) {
      pullingRef.current = false;
      setPull(0);
      return;
    }
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) setPull(Math.min(delta * 0.5, 96));
  };

  const onTouchEnd = async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const height = refreshing ? THRESHOLD : pull;
  const opacity = refreshing ? 1 : Math.min(pull / THRESHOLD, 1);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ height, transition: pullingRef.current ? "none" : "height 0.2s ease" }}
      >
        <Loader2
          className={`w-6 h-6 text-emerald-500 ${refreshing ? "animate-spin" : ""}`}
          style={{ opacity }}
        />
      </div>
      {children}
    </div>
  );
}