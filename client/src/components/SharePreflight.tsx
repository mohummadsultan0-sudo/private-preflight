/** Audit Ledger style: sharing is explicit, quiet, and never touches a visitor's selected local files. */
import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

type ShareSurface = "csv" | "image" | "privacy";

const shareCopy: Record<ShareSurface, { text: string; label: string }> = {
  csv: {
    text: "Check a CSV locally before you open or share it with Private Preflight.",
    label: "Share tool",
  },
  image: {
    text: "Inspect and clean image metadata locally before you share a photo with Private Preflight.",
    label: "Share tool",
  },
  privacy: {
    text: "A browser-only tool for checking CSV files and image metadata locally.",
    label: "Share tool",
  },
};

export function SharePreflight({ surface, className = "" }: { surface: ShareSurface; className?: string }) {
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);
  const { text, label } = shareCopy[surface];
  const hasNativeShare = "share" in navigator;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = async (url: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      setCopied(true);
      setFeedback("Link copied — send it wherever you like.");
    } catch {
      setFeedback("Could not copy automatically. Use your browser’s address bar to copy this page.");
    }
  };

  const share = async () => {
    const isManagedPreview = window.location.hostname.endsWith("manus.computer");
    const url = isManagedPreview
      ? new URL(window.location.pathname, "https://csvcheck-fj8jo5gq.manus.space").toString()
      : window.location.href;
    setFeedback("");

    if (hasNativeShare) {
      try {
        await navigator.share({ title: "Private Preflight", text, url });
        setFeedback("Thanks for sharing this local-first tool.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await copyLink(url);
  };

  return (
    <span className={`share-preflight ${className}`}>
      <button type="button" className="share-preflight__button" onClick={() => void share()} aria-label={label}>
        {copied ? <Check aria-hidden="true" /> : hasNativeShare ? <Share2 aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span>{copied ? "Link copied" : "Share"}</span>
      </button>
      <span className="share-preflight__feedback" aria-live="polite">{feedback}</span>
    </span>
  );
}
