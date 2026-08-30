"use client";

import { useEffect, useState } from "react";

export function AvatarImage({ src, fallback, alt = "" }: { src?: string | null; fallback: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <span>{fallback}</span>;
  return <img src={src} alt={alt} onError={() => setFailed(true)} />;
}
