/** Audit Ledger style: future advertising stays visibly separate from file actions and is structurally unable to load before explicit owner configuration. */
import { useEffect, useRef } from "react";

declare global {
  interface Window { adsbygoogle?: unknown[]; }
}

type AdSlotKey = "supporting-content" | "field-library";

const slotEnvironment: Record<AdSlotKey, string> = {
  "supporting-content": "VITE_ADSENSE_SLOT_SUPPORTING_CONTENT",
  "field-library": "VITE_ADSENSE_SLOT_FIELD_LIBRARY",
};

function environmentValue(name: string) {
  return (import.meta.env as Record<string, string | boolean | undefined>)[name];
}

function isConfiguredValue(value: string | boolean | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function AdSlot({ slotKey }: { slotKey: AdSlotKey }) {
  const initialized = useRef(false);
  const publisherId = environmentValue("VITE_ADSENSE_PUBLISHER_ID");
  const slotId = environmentValue(slotEnvironment[slotKey]);
  const enabled = environmentValue("VITE_ADSENSE_ENABLED") === "true";
  const consentConfigured = environmentValue("VITE_ADSENSE_CONSENT_MODE") === "configured";
  const canLoad = enabled && consentConfigured && isConfiguredValue(publisherId) && /^ca-pub-\d+$/.test(publisherId) && isConfiguredValue(slotId) && /^\d+$/.test(slotId);

  useEffect(() => {
    if (!canLoad || initialized.current) return;
    const existingScript = document.querySelector('script[data-private-preflight-adsense="true"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
      script.crossOrigin = "anonymous";
      script.dataset.privatePreflightAdsense = "true";
      document.head.appendChild(script);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      initialized.current = true;
    } catch {
      // An ad failure never interrupts local file inspection or changes any file state.
    }
  }, [canLoad, publisherId]);

  if (!canLoad) return null;

  return <aside className="advertising-slot" aria-label="Advertisement" data-ad-slot={slotKey}><span>ADVERTISEMENT</span><ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={publisherId} data-ad-slot={slotId} data-ad-format="auto" data-full-width-responsive="true" /></aside>;
}
