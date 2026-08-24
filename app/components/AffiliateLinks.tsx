"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import {
  CONSENT_CHANGED_EVENT,
  hasFreshConsent,
  readConsent,
  type ConsentChangedDetail,
} from "@/lib/cookieConsentClient";

// Skimlinks auto-converts outbound retailer links into affiliate links and
// sets its own tracking cookie to attribute commission - not strictly
// necessary for the site to function, so like GA it must only load once a
// visitor has granted the "advertising" consent category (see
// CookieConsent.tsx and the Cookie Policy's advertising section). Unlike
// GA there's no consent-mode signal Skimlinks respects once loaded, so this
// component controls whether the script tag is injected at all, rather than
// always loading it and relying on Skimlinks itself to honour consent.
export default function AffiliateLinks() {
  const [advertisingGranted, setAdvertisingGranted] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (hasFreshConsent(existing) && existing.advertising) {
      setAdvertisingGranted(true);
    }

    const onConsentChanged = (event: Event) => {
      const detail = (event as CustomEvent<ConsentChangedDetail>).detail;
      if (detail?.advertising) setAdvertisingGranted(true);
    };

    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
  }, []);

  if (!advertisingGranted) return null;

  return (
    <Script
      id="skimlinks"
      src="https://s.skimresources.com/js/308096X1796393.skimlinks.js"
      strategy="afterInteractive"
    />
  );
}
