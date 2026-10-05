import type {
  Metadata,
} from "next";

import {
  cache,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  prisma,
} from "@/lib/prisma";

import {
  absoluteUrl,
} from "@/lib/site";

import {
  safeJsonLd,
  seoDescription,
} from "@/lib/seo";

type Props = {
  children:
    ReactNode;

  params:
    Promise<{
      slug: string;
    }>;
};

const getCategory =
  cache(
    async (
      slug: string,
    ) => {
      return prisma.category.findUnique({
        where: {
          slug,
        },

        select: {
          id:
            true,

          name:
            true,

          slug:
            true,

          description:
            true,

          isPublished:
            true,

          updatedAt:
            true,
        },
      });
    },
  );

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const {
    slug,
  } =
    await params;

  const category =
    await getCategory(
      slug,
    );

  if (
    !category ||
    !category.isPublished
  ) {
    return {
      title:
        "Kategoria niedostępna",

      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description =
    seoDescription(
      category.description,
    );

  const canonical =
    `/kategorie/${category.slug}`;

  return {
    title:
      `${category.name} — porównanie ofert`,

    description,

    alternates: {
      canonical,
    },

    openGraph: {
      type:
        "website",

      locale:
        "pl_PL",

      siteName:
        "Narzivo",

      url:
        canonical,

      title:
        `${category.name} — porównanie ofert | Narzivo`,

      description,
    },

    twitter: {
      card:
        "summary",

      title:
        `${category.name} — porównanie ofert | Narzivo`,

      description,
    },
  };
}

export default async function CategoryLayout({
  children,
  params,
}: Props) {
  const {
    slug,
  } =
    await params;

  const category =
    await getCategory(
      slug,
    );

  if (
    !category ||
    !category.isPublished
  ) {
    return children;
  }

  const url =
    absoluteUrl(
      `/kategorie/${category.slug}`,
    );

  const jsonLd = {
    "@context":
      "https://schema.org",

    "@graph": [
      {
        "@type":
          "CollectionPage",

        name:
          `${category.name} — porównanie ofert`,

        description:
          seoDescription(
            category.description,
            300,
          ),

        url,
      },

      {
        "@type":
          "BreadcrumbList",

        itemListElement: [
          {
            "@type":
              "ListItem",

            position:
              1,

            name:
              "Narzivo",

            item:
              absoluteUrl(
                "/",
              ),
          },

          {
            "@type":
              "ListItem",

            position:
              2,

            name:
              category.name,

            item:
              url,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            safeJsonLd(
              jsonLd,
            ),
        }}
      />

      {children}
    </>
  );
}