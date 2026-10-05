import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata:
  Metadata = {
  title:
    "Metodologia ocen",

  description:
    "Dowiedz się, jak Narzivo ocenia hosting, VPS, domeny i inne usługi cyfrowe oraz jak liczymy wyniki i rekomendacje.",

  alternates: {
    canonical:
      "/metodologia",
  },

  openGraph: {
    title:
      "Metodologia ocen | Narzivo",

    description:
      "Transparentne kryteria, wagi i zasady tworzenia ocen Narzivo.",

    url:
      "/metodologia",

    siteName:
      "Narzivo",

    locale:
      "pl_PL",

    type:
      "website",
  },
};

export default function MethodologyLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  return children;
}