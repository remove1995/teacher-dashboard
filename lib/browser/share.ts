export type NativeSharePayload = { title: string; text: string };

export async function copyText(text: string, clipboard?: Pick<Clipboard, "writeText">) {
  if (!clipboard) return false;
  await clipboard.writeText(text);
  return true;
}

export async function nativeShare(payload: NativeSharePayload, share?: (data: ShareData) => Promise<void>) {
  if (!share) return "unsupported" as const;
  try { await share(payload); return "shared" as const; }
  catch (error) { return (error as DOMException).name === "AbortError" ? "cancelled" as const : "failed" as const; }
}
