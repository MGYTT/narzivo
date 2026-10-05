import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata:
  Metadata = {
  title:
    "Jak zarabia Narzivo",

  description:
    "Wyjaśniamy model afiliacyjny Narzivo, sposób oznaczania linków partnerskich oraz zasady oddzielania prowizji od rankingu usług.",

  alternates: {
    canonical:
      "/jak-zarabiamy",
  },

  openGraph: {
    title:
      "Jak zarabia Narzivo",

    description:
      "Transparentne zasady afiliacji i monetyzacji Narzivo.",

    url:
      "/jak-zarabiamy",

    siteName:
      "Narzivo",

    locale:
      "pl_PL",

    type:
      "website",
  },
};

export default function AffiliateDisclosureLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  return children;
}