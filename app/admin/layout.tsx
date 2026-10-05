import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata:
  Metadata = {
  title:
    "Panel administratora",

  robots: {
    index: false,
    follow: false,
    nocache: true,

    googleBot: {
      index: false,
      follow: false,
      noimageindex:
        true,
    },
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children:
    ReactNode;
}>) {
  return (
    <>
      <style>{`
        body > header,
        body > footer {
          display: none !important;
        }

        body {
          background: #fafbfc;
        }
      `}</style>

      {children}
    </>
  );
}