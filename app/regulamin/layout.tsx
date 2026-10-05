import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata:
  Metadata = {
  title:
    "Regulamin",

  description:
    "Regulamin korzystania z serwisu Narzivo.",

  alternates: {
    canonical:
      "/regulamin",
  },
};

export default function TermsLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  return children;
}