"use server";

import {
  redirect,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  requireAdmin,
} from "@/lib/auth";

import {
  inspectOfferUrl,
} from "@/lib/offer-importer";

import {
  autoRateOfferById,
} from "@/lib/auto-rating";

import {
  generateOfferCopy,
} from "@/lib/offer-copy";

function stringValue(
  value:
    FormDataEntryValue
    | null,
) {
  return String(
    value ?? "",
  ).trim();
}

function normalizeSlug(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /ł/g,
      "l",
    )
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

async function uniqueSlug(
  base: string,
) {
  const normalized =
    normalizeSlug(
      base,
    ) ||
    "importowana-oferta";

  let current =
    normalized;

  let number =
    2;

  while (
    await prisma.offer.findUnique({
      where: {
        slug:
          current,
      },

      select: {
        id:
          true,
      },
    })
  ) {
    current =
      `${normalized}-${number}`;

    number +=
      1;
  }

  return current;
}

export async function importOfferFromUrl(
  formData:
    FormData,
) {
  await requireAdmin();

  const sourceUrl =
    stringValue(
      formData.get(
        "sourceUrl",
      ),
    );

  const variantName =
    stringValue(
      formData.get(
        "variantName",
      ),
    );

  const categoryId =
    stringValue(
      formData.get(
        "categoryId",
      ),
    );

  if (!sourceUrl) {
    throw new Error(
      "Oficjalny URL jest wymagany.",
    );
  }

  if (!categoryId) {
    throw new Error(
      "Kategoria jest wymagana.",
    );
  }

  const category =
    await prisma.category.findUnique({
      where: {
        id:
          categoryId,
      },

      select: {
        id:
          true,

        slug:
          true,
      },
    });

  if (!category) {
    throw new Error(
      "Wybrana kategoria nie istnieje.",
    );
  }

  const imported =
    await inspectOfferUrl({
      sourceUrl,

      variantName,

      categorySlug:
        category.slug,
    });

  /*
   * Treści powstają z danych
   * technicznych, a nie poprzez
   * kopiowanie marketingowego
   * tekstu ze strony dostawcy.
   */
  const copy =
    generateOfferCopy({
      categorySlug:
        category.slug,

      offerName:
        imported.name,

      providerName:
        imported.providerName,

      priceAmount:
        imported.priceAmount,

      currency:
        imported.currency,

      billingPeriod:
        imported.billingPeriod,

      billingLabel:
        imported.billingLabel,

      features:
        imported.features,
    });

  const slug =
    await uniqueSlug(
      `${imported.providerSlug}-${imported.name}`,
    );

  const created =
    await prisma.$transaction(
      async (
        tx,
      ) => {
        const offer =
          await tx.offer.create({
            data: {
              name:
                imported.name,

              slug,

              summary:
                copy.summary,

              description:
                copy.description,

              categoryId:
                category.id,

              providerId:
                imported.providerId,

              priceAmount:
                imported.priceAmount,

              regularPrice:
                null,

              currency:
                imported.currency,

              billingPeriod:
                imported.billingPeriod,

              billingLabel:
                imported.billingLabel,

              promoCode:
                null,

              affiliateUrl:
                imported.affiliateUrl,

              sourceUrl:
                imported.sourceUrl,

              features:
                imported.features,

              useCases:
                copy.useCases,

              pros:
                copy.pros,

              cons:
                copy.cons,

              methodologyNotes:
                copy.methodologyNotes,

              editorScore:
                null,

              isFeatured:
                false,

              /*
               * Import zawsze
               * tworzy szkic.
               */
              isPublished:
                false,

              validFrom:
                null,

              validTo:
                null,

              lastVerifiedAt:
                new Date(),
            },
          });

        if (
          imported.priceAmount !==
          null
        ) {
          await tx.offerPriceHistory.create({
            data: {
              offerId:
                offer.id,

              priceAmount:
                imported.priceAmount,

              regularPrice:
                null,

              currency:
                imported.currency,
            },
          });
        }

        return offer;
      },
    );

  if (
    category.slug ===
    "hosting-www"
  ) {
    try {
      await autoRateOfferById(
        created.id,
      );
    } catch (
      error
    ) {
      console.error(
        "Scoring po imporcie nie powiódł się:",
        {
          offerId:
            created.id,

          error,
        },
      );
    }
  }

  const params =
    new URLSearchParams();

  params.set(
    "edit",
    created.id,
  );

  params.set(
    "imported",
    "1",
  );

  params.set(
    "copyGenerated",
    "1",
  );

  params.set(
    "confidence",
    String(
      imported.confidence,
    ),
  );

  params.set(
    "featuresDetected",
    String(
      imported.featureCount,
    ),
  );

  params.set(
    "warnings",
    String(
      imported.warnings.length,
    ),
  );

  redirect(
    `/admin/oferty?${params.toString()}`,
  );
}