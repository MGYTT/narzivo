import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata:
  Metadata = {
  title:
    "Doradca wyboru usług",

  description:
    "Dobierz usługę cyfrową na podstawie budżetu, zastosowania, jakości, aktualności danych i transparentnego wyniku Narzivo.",

  alternates: {
    canonical:
      "/dobierz",
  },

  robots: {
    index: false,
    follow: true,
  },

  openGraph: {
    title:
      "Doradca wyboru usług | Narzivo",

    description:
      "Znajdź usługę dopasowaną do swoich potrzeb na podstawie zweryfikowanych danych.",

    url:
      "/dobierz",

    siteName:
      "Narzivo",

    locale:
      "pl_PL",

    type:
      "website",
  },
};

export default function AdvisorLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  return children;
}