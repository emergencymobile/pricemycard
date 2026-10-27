import React from "react";

const LOGO_URL = "/logo.png";

export default function Logo({ className = "h-10 w-auto" }) {
  return <img src={LOGO_URL} alt="Price My Card" className={`${className} drop-shadow-[0_0_12px_rgba(152,255,36,0.5)]`} />;
}