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
  isPublicOfferAt,
  publicOfferWhere,
} from "@/lib/offer-validity";

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

const getOffer =
  cache(
    async (
      slug: string,
    ) =>
      prisma.offer.findUnique({
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

          summary:
            true,

          description:
            true,

          priceAmount:
            true,

          currency:
            true,

          validFrom:
            true,

          validTo:
            true,

          isPublished:
            true,

          provider: {
            select: {
              name:
                true,

              websiteUrl:
                true,

              logoUrl:
                true,

              isPublished:
                true,
            },
          },

          category: {
            select: {
              name:
                true,

              slug:
                true,

              isPublished:
                true,
            },
          },
        },
      }),
  );

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const {
    slug,
  } =
    await params;

  const offer =
    await getOffer(
      slug,
    );

  if (
    !offer ||
    !isPublicOfferAt(
      offer,
    )
  ) {
    return {
      title:
        "Oferta niedostępna",

      robots: {
        index:
          false,

        follow:
          false,
      },
    };
  }

  const description =
    seoDescription(
      offer.summary ||
        offer.description,
    );

  const canonical =
    `/uslugi/${offer.slug}`;

  return {
    title:
      `${offer.name} — ${offer.provider.name}`,

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
        `${offer.name} — ${offer.provider.name} | Narzivo`,

      description,
    },
  };
}

export default async function OfferLayout({
  children,
  params,
}: Props) {
  const {
    slug,
  } =
    await params;

  const offer =
    await getOffer(
      slug,
    );

  if (
    !offer ||
    !isPublicOfferAt(
      offer,
    )
  ) {
    return children;
  }

  const offerUrl =
    absoluteUrl(
      `/uslugi/${offer.slug}`,
    );

  const categoryUrl =
    absoluteUrl(
      `/kategorie/${offer.category.slug}`,
    );

  const service:
    Record<
      string,
      unknown
    > = {
    "@type":
      "Service",

    name:
      offer.name,

    description:
      seoDescription(
        offer.description,
        500,
      ),

    url:
      offerUrl,

    serviceType:
      offer.category.name,

    provider: {
      "@type":
        "Organization",

      name:
        offer.provider.name,

      url:
        offer.provider.websiteUrl,

      ...(offer.provider.logoUrl
        ? {
            logo:
              offer.provider.logoUrl,
          }
        : {}),
    },
  };

  if (
    offer.priceAmount !==
    null
  ) {
    service.offers = {
      "@type":
        "Offer",

      url:
        offerUrl,

      price:
        Number(
          offer.priceAmount,
        ).toFixed(
          2,
        ),

      priceCurrency:
        offer.currency,

      ...(offer.validTo
        ? {
            priceValidUntil:
              offer.validTo
                .toISOString()
                .slice(
                  0,
                  10,
                ),
          }
        : {}),
    };
  }

  const jsonLd = {
    "@context":
      "https://schema.org",

    "@graph": [
      service,

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
              offer.category.name,

            item:
              categoryUrl,
          },

          {
            "@type":
              "ListItem",

            position:
              3,

            name:
              offer.name,

            item:
              offerUrl,
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