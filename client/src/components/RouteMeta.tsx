/** Audit Ledger style: each public route receives a precise, evidence-first title and description rather than interchangeable promotional metadata. */
import { useEffect } from "react";
import { useLocation } from "wouter";

const publishedBase = "https://mohummadsultan0-sudo.github.io/private-preflight";

const routeMeta: Record<string, { title: string; description: string }> = {
  "/": { title: "Private Preflight — Inspect locally before data travels", description: "Inspect CSV structure, duplicates, formula-risk signals, potential PII, and supported image metadata locally in your browser." },
  "/image-inspector": { title: "Image Inspector — Private Preflight", description: "Inspect supported image metadata and generate a local clean copy in your browser before sharing." },
  "/csv-formula-injection-scanner": { title: "CSV Formula-Risk Scanner Guide — Private Preflight", description: "Understand formula-like CSV cells before a spreadsheet interprets an export." },
  "/csv-validator": { title: "CSV Validator Guide — Private Preflight", description: "Review delimiter, quote, row-width, and encoding signals in a local CSV before import." },
  "/csv-duplicate-finder": { title: "CSV Duplicate Finder Guide — Private Preflight", description: "Review local duplicate signals in a CSV before a downstream workflow is affected." },
  "/csv-pii-checker": { title: "CSV PII Signal Guide — Private Preflight", description: "Use explainable local signals to review a CSV for possible personal data before sharing." },
  "/image-metadata-guide": { title: "Image Metadata Sharing Guide — Private Preflight", description: "Learn what image metadata may contain and how a browser-local clean copy works." },
  "/guides": { title: "Field Guides — Private Preflight", description: "Short, practical guides for local CSV checks and image metadata decisions." },
  "/about": { title: "About & Contact — Private Preflight", description: "Read the project record, local-processing boundaries, and the public product-contact route." },
  "/privacy": { title: "Privacy — Private Preflight", description: "Understand Private Preflight's browser-local file inspection path and its stated limits." },
  "/consent": { title: "Consent Status — Private Preflight", description: "Advertising is inactive. Read the transparent consent and advertising status for Private Preflight." },
};

function setMeta(selector: string, attribute: "content" | "href", value: string) {
  const element = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (element) element.setAttribute(attribute, value);
}

export function RouteMeta() {
  const [location] = useLocation();

  useEffect(() => {
    const normalizedPath = location === "/" ? "/" : location.replace(/\/$/, "");
    const meta = routeMeta[normalizedPath] ?? routeMeta["/"];
    const url = `${publishedBase}${normalizedPath === "/" ? "/" : normalizedPath}`;
    document.title = meta.title;
    setMeta('meta[name="description"]', "content", meta.description);
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:title"]', "content", meta.title);
    setMeta('meta[property="og:description"]', "content", meta.description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[name="twitter:title"]', "content", meta.title);
    setMeta('meta[name="twitter:description"]', "content", meta.description);

    const data = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Private Preflight",
      url,
      description: meta.description,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web browser",
      inLanguage: "en",
      isAccessibleForFree: true,
    };
    let structuredData = document.getElementById("private-preflight-structured-data") as HTMLScriptElement | null;
    if (!structuredData) {
      structuredData = document.createElement("script");
      structuredData.id = "private-preflight-structured-data";
      structuredData.type = "application/ld+json";
      document.head.appendChild(structuredData);
    }
    structuredData.text = JSON.stringify(data);
  }, [location]);

  return null;
}
