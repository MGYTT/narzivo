import type {
  MetadataRoute,
} from "next";

import {
  prisma,
} from "@/lib/prisma";

import {
  absoluteUrl,
} from "@/lib/site";

import {
  publicOfferWhere,
} from "@/lib/offer-validity";

export default async function sitemap():
  Promise<MetadataRoute.Sitemap> {
  const now =
    new Date();

  const [
    categories,
    offers,
  ] =
    await Promise.all([
      prisma.category.findMany({
        where: {
          isPublished:
            true,
        },

        select: {
          slug:
            true,

          updatedAt:
            true,
        },

        orderBy: {
          sortOrder:
            "asc",
        },
      }),

      prisma.offer.findMany({
        where:
          publicOfferWhere(
            now,
          ),

        select: {
          slug:
            true,

          updatedAt:
            true,
        },

        orderBy: {
          updatedAt:
            "desc",
        },
      }),
    ]);

  return [
    {
      url:
        absoluteUrl(
          "/",
        ),

      changeFrequency:
        "weekly",

      priority:
        1,
    },

    {
      url:
        absoluteUrl(
          "/metodologia",
        ),

      changeFrequency:
        "monthly",

      priority:
        0.7,
    },

    {
      url:
        absoluteUrl(
          "/jak-zarabiamy",
        ),

      changeFrequency:
        "monthly",

      priority:
        0.6,
    },

    {
      url:
        absoluteUrl(
          "/polityka-prywatnosci",
        ),

      changeFrequency:
        "yearly",

      priority:
        0.2,
    },

    {
      url:
        absoluteUrl(
          "/regulamin",
        ),

      changeFrequency:
        "yearly",

      priority:
        0.2,
    },

    ...categories.map(
      (category) => ({
        url:
          absoluteUrl(
            `/kategorie/${category.slug}`,
          ),

        lastModified:
          category.updatedAt,

        changeFrequency:
          "weekly" as const,

        priority:
          0.8,
      }),
    ),

    ...offers.map(
      (offer) => ({
        url:
          absoluteUrl(
            `/uslugi/${offer.slug}`,
          ),

        lastModified:
          offer.updatedAt,

        changeFrequency:
          "weekly" as const,

        priority:
          0.9,
      }),
    ),
  ];
}