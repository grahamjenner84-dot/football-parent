import Script from "next/script";
import type { Metadata } from "next";
import Header from "./components/header";
import Footer from "./components/footer";
import CookieConsent from "./components/CookieConsent";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Parent",
  description:
    "Independent guidance for parents navigating UK football development and academy pathways.",
  metadataBase: new URL("https://www.footballparent.co.uk"),
  verification: {
    other: {
      "p:domain_verify": "c030c42167a4aaea03d1fedd0e8264c2",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Football Parent",
    url: "https://www.footballparent.co.uk",
    logo: "https://www.footballparent.co.uk/logo.webp",
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Football Parent",
    url: "https://www.footballparent.co.uk",
    description:
      "Independent guidance for UK families navigating football academies, development centres and youth football pathways.",
    publisher: {
      "@type": "Organization",
      name: "Football Parent",
      url: "https://www.footballparent.co.uk",
    },
  };

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Graham Jenner",
    url: "https://www.footballparent.co.uk/author/graham-jenner",
    jobTitle: "Founder, Football Parent",
    description:
      "Football parent and grassroots coach helping families navigate football academies, development centres, trials and youth football pathways in the UK.",
    worksFor: {
      "@type": "Organization",
      name: "Football Parent",
      url: "https://www.footballparent.co.uk",
    },
  };

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* Google Consent Mode v2: must run before any GA script executes,
            so this stays beforeInteractive. Reads the same "fp-cookie-consent"
            localStorage key that app/components/CookieConsent.tsx writes to -
            keep the key name, and the 12-month max-age, in sync if either
            side changes. */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`
            (function () {
              window.dataLayer = window.dataLayer || [];
              function gtag() { window.dataLayer.push(arguments); }
              window.gtag = window.gtag || gtag;

              var MAX_CONSENT_AGE_MS = 365 * 24 * 60 * 60 * 1000;
              var consent = null;
              try {
                var stored = localStorage.getItem('fp-cookie-consent');
                if (stored) consent = JSON.parse(stored);
              } catch (e) {}

              var age = consent ? Date.now() - new Date(consent.timestamp).getTime() : Infinity;
              var isFresh = consent && age <= MAX_CONSENT_AGE_MS;

              window.gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: isFresh && consent.analytics ? 'granted' : 'denied',
                wait_for_update: 500,
              });
            })();
          `}
        </Script>

        <Header />

        <main className="flex-1">{children}</main>

        <Footer />

        <CookieConsent />

        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />

        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />

        <Script
          id="person-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personSchema),
          }}
        />

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2206W12H84"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-2206W12H84', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
      </body>
    </html>
  );
}