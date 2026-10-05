import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

import "./globals.css";

import {
  Header,
} from "@/components/Header";

import {
  Footer,
} from "@/components/Footer";

import {
  absoluteUrl,
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/site";

import {
  safeJsonLd,
} from "@/lib/seo";

export const metadata:
  Metadata = {
  metadataBase:
    getSiteUrl(),

  title: {
    default:
      `${SITE_NAME} — ${SITE_TAGLINE}`,

    template:
      `%s | ${SITE_NAME}`,
  },

  description:
    SITE_DESCRIPTION,

  applicationName:
    SITE_NAME,

  creator:
    SITE_NAME,

  publisher:
    SITE_NAME,

  category:
    "technology",

  formatDetection: {
    email:
      false,

    address:
      false,

    telephone:
      false,
  },

  /*
   * Celowo NIE ustawiamy tutaj:
   *
   * alternates: {
   *   canonical: "/"
   * }
   *
   * Każda podstrona ma własny
   * canonical.
   */
  robots: {
    index:
      true,

    follow:
      true,

    googleBot: {
      index:
        true,

      follow:
        true,

      "max-image-preview":
        "large",

      "max-snippet":
        -1,

      "max-video-preview":
        -1,
    },
  },

  openGraph: {
    type:
      "website",

    locale:
      "pl_PL",

    siteName:
      SITE_NAME,

    url:
      "/",

    title:
      `${SITE_NAME} — ${SITE_TAGLINE}`,

    description:
      SITE_DESCRIPTION,
  },

  twitter: {
    card:
      "summary",

    title:
      `${SITE_NAME} — ${SITE_TAGLINE}`,

    description:
      SITE_DESCRIPTION,
  },
};

const websiteJsonLd = {
  "@context":
    "https://schema.org",

  "@type":
    "WebSite",

  name:
    SITE_NAME,

  url:
    absoluteUrl("/"),

  description:
    SITE_DESCRIPTION,

  inLanguage:
    "pl-PL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children:
    ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html:
              safeJsonLd(
                websiteJsonLd,
              ),
          }}
        />

        <Header />

        <main>
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}