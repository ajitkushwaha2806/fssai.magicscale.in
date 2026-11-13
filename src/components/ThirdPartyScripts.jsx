"use client";

import { useEffect } from "react";
import { META_PIXEL_ID } from "@/lib/meta-pixel";

const CONFIG = {
  googleAnalyticsIds: ["G-XVLEDXG07G"],
  metaPixelIds: [META_PIXEL_ID],
};

// Initialize window tracking stubs synchronously
if (typeof window !== "undefined") {
  // Google Analytics stub
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    CONFIG.googleAnalyticsIds.forEach((id) => {
      window.gtag("config", id);
    });
  }

  // Meta Pixel stub
  if (CONFIG.metaPixelIds.length > 0 && !window.fbq) {
    const f = window;
    const n = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    CONFIG.metaPixelIds.forEach((id) => {
      window.fbq("init", id);
    });
    window.fbq("track", "PageView");
  }
}

export default function ThirdPartyScripts() {
  useEffect(() => {
    // 1. Immediately inject Meta Pixel script (vital for ad attribution & ROAS)
    if (CONFIG.metaPixelIds.length > 0 && !document.getElementById("facebook-jssdk")) {
      const t = document.createElement("script");
      t.id = "facebook-jssdk";
      t.async = true;
      t.src = "https://connect.facebook.net/en_US/fbevents.js";
      const s = document.getElementsByTagName("script")[0];
      if (s && s.parentNode) {
        s.parentNode.insertBefore(t, s);
      } else {
        document.head.appendChild(t);
      }
    }

    // 2. Inject Google Analytics script
    if (CONFIG.googleAnalyticsIds.length > 0 && !document.getElementById("google-gtag")) {
      const gaScript = document.createElement("script");
      gaScript.id = "google-gtag";
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.googleAnalyticsIds[0]}`;
      document.head.appendChild(gaScript);
    }
  }, []);

  if (CONFIG.metaPixelIds.length === 0) return null;

  return (
    <noscript>
      {CONFIG.metaPixelIds.map((id) => (
        <img
          key={id}
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
          alt=""
        />
      ))}
    </noscript>
  );
}
