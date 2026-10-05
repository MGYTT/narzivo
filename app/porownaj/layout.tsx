import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata:
  Metadata = {
  title:
    "Porównywarka ofert",

  description:
    "Porównaj ceny, oceny i kryteria Narzivo dla usług cyfrowych należących do tej samej kategorii.",

  alternates: {
    canonical:
      "/porownaj",
  },

  robots: {
    index: false,
    follow: true,
  },

  openGraph: {
    title:
      "Porównywarka ofert | Narzivo",

    description:
      "Porównuj oferty punkt po punkcie według transparentnej metodologii Narzivo.",

    url:
      "/porownaj",

    siteName:
      "Narzivo",

    locale:
      "pl_PL",

    type:
      "website",
  },
};

export default function CompareLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  return children;
}