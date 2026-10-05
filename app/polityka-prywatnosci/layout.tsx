import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata:
  Metadata = {
  title:
    "Polityka prywatności",

  description:
    "Polityka prywatności serwisu Narzivo.",

  alternates: {
    canonical:
      "/polityka-prywatnosci",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  return children;
}