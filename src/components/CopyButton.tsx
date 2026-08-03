"use client";

import { useState } from "react";

export function CopyButton({ label = "Copy ID", value }: { label?: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="button secondary" onClick={copyValue} type="button">
      {copied ? "Copied" : label}
    </button>
  );
}
