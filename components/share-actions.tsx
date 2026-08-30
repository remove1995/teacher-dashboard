"use client";

import { useEffect, useState } from "react";
import { copyText, nativeShare } from "@/lib/browser/share";

export function ShareActions({ title, text, copyLabel = "Скопировать текст", sendLabel = "Отправить" }: { title: string; text: string; copyLabel?: string; sendLabel?: string }) {
  const [canShare, setCanShare] = useState(false), [message, setMessage] = useState("");
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);
  const copy = async () => { const done = await copyText(text, navigator.clipboard); setMessage(done ? "Скопировано" : "Копирование недоступно"); };
  const send = async () => { const result = await nativeShare({ title, text }, navigator.share?.bind(navigator)); if (result === "failed") setMessage("Не удалось открыть отправку — текст можно скопировать."); };
  return <div className="share-actions"><div><button type="button" onClick={copy}>{copyLabel}</button>{canShare ? <button className="secondary-button" type="button" onClick={send}>{sendLabel}</button> : null}</div>{!canShare && <small>Скопируйте текст и вставьте его в нужный мессенджер.</small>}{message && <small aria-live="polite">{message}</small>}</div>;
}
