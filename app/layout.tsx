import Script from "next/script";
import type { Metadata } from "next";
import Header from "./components/header";
import Footer from "./components/footer";
import ScrollToTop from "./components/ScrollToTop";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Parent",
  description:
    "Honest guidance for parents navigating UK football development and academy pathways.",
  icons: {
    icon: "/icon.png",
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
        <ScrollToTop />

        <Header />

        <main className="flex-1">{children}</main>

        <Footer />

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