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

const MAX_VARIANTS =
  12;

function stringValue(
  value:
    FormDataEntryValue
    | null,
) {
  return String(
    value ?? "",
  ).trim();
}

function normalize(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " ",
    );
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
  value: string,
) {
  const base =
    normalizeSlug(
      value,
    ) ||
    "importowana-oferta";

  let candidate =
    base;

  let number =
    2;

  while (
    await prisma.offer.findUnique({
      where: {
        slug:
          candidate,
      },

      select: {
        id:
          true,
      },
    })
  ) {
    candidate =
      `${base}-${number}`;

    number +=
      1;
  }

  return candidate;
}

export async function bulkImportOffers(
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

  const categoryId =
    stringValue(
      formData.get(
        "categoryId",
      ),
    );

  const variants =
    stringValue(
      formData.get(
        "variants",
      ),
    )
      .split(
        /\r?\n/,
      )
      .map(
        (
          item,
        ) =>
          item.trim(),
      )
      .filter(
        Boolean,
      );

  const uniqueVariants =
    Array.from(
      new Set(
        variants,
      ),
    ).slice(
      0,
      MAX_VARIANTS,
    );

  if (!sourceUrl) {
    throw new Error(
      "URL jest wymagany.",
    );
  }

  if (!categoryId) {
    throw new Error(
      "Kategoria jest wymagana.",
    );
  }

  if (
    uniqueVariants.length ===
    0
  ) {
    throw new Error(
      "Podaj co najmniej jeden pakiet.",
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
      "Kategoria nie istnieje.",
    );
  }

  let created =
    0;

  let skipped =
    0;

  let failed =
    0;

  for (
    const variantName of
      uniqueVariants
  ) {
    try {
      const imported =
        await inspectOfferUrl({
          sourceUrl,

          variantName,

          categorySlug:
            category.slug,
        });

      const existing =
        await prisma.offer.findMany({
          where: {
            providerId:
              imported.providerId,

            categoryId:
              category.id,
          },

          select: {
            id:
              true,

            name:
              true,
          },
        });

      const duplicate =
        existing.some(
          (
            offer,
          ) =>
            normalize(
              offer.name,
            ) ===
              normalize(
                imported.name,
              ) ||
            normalize(
              offer.name,
            ) ===
              normalize(
                variantName,
              ),
        );

      if (duplicate) {
        skipped +=
          1;

        continue;
      }

      const slug =
        await uniqueSlug(
          `${imported.providerSlug}-${imported.name}`,
        );

      const offer =
        await prisma.$transaction(
          async (
            tx,
          ) => {
            const result =
              await tx.offer.create({
                data: {
                  name:
                    imported.name,

                  slug,

                  summary:
                    imported.summary,

                  description:
                    imported.description,

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
                    [],

                  pros:
                    [],

                  cons:
                    [],

                  methodologyNotes:
                    "Szkic utworzony przez masowy importer z oficjalnej strony dostawcy.",

                  editorScore:
                    null,

                  isFeatured:
                    false,

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
                    result.id,

                  priceAmount:
                    imported.priceAmount,

                  regularPrice:
                    null,

                  currency:
                    imported.currency,
                },
              });
            }

            return result;
          },
        );

      if (
        category.slug ===
        "hosting-www"
      ) {
        try {
          await autoRateOfferById(
            offer.id,
          );
        } catch (
          error
        ) {
          console.error(
            error,
          );
        }
      }

      created +=
        1;
    } catch (
      error
    ) {
      console.error(
        `Import ${variantName}:`,
        error,
      );

      failed +=
        1;
    }
  }

  const params =
    new URLSearchParams({
      created:
        String(
          created,
        ),

      skipped:
        String(
          skipped,
        ),

      failed:
        String(
          failed,
        ),
    });

  redirect(
    `/admin/oferty/import/masowy?${params.toString()}`,
  );
}