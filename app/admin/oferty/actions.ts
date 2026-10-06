"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import type {
  Prisma,
} from "@/generated/prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  requireAdmin,
} from "@/lib/auth";

import {
  parseWarsawDateTimeInput,
} from "@/lib/warsaw-datetime";

import {
  autoRateOfferById,
} from "@/lib/auto-rating";

import {
  getOfferReadinessById,
} from "@/lib/offer-readiness";

import {
  generateAffiliateUrl,
} from "@/lib/affiliate-url";

import {
  mergeHostingFeatures,
} from "@/lib/hosting-features";

const BILLING_PERIODS = [
  "ONE_TIME",
  "MONTH",
  "YEAR",
  "CUSTOM",
] as const;

type BillingPeriod =
  (typeof BILLING_PERIODS)[number];

function stringValue(
  value:
    FormDataEntryValue
    | null,
) {
  return String(
    value ?? "",
  ).trim();
}

function boolValue(
  value:
    FormDataEntryValue
    | null,
) {
  return (
    value === "on" ||
    value === "true" ||
    value === "1"
  );
}

function numberValue(
  value:
    FormDataEntryValue
    | null,
) {
  const raw =
    stringValue(
      value,
    );

  if (!raw) {
    return null;
  }

  const result =
    Number(
      raw,
    );

  if (
    !Number.isFinite(
      result,
    )
  ) {
    throw new Error(
      "Nieprawidłowa wartość liczbowa.",
    );
  }

  return result;
}

function linesValue(
  value:
    FormDataEntryValue
    | null,
) {
  return stringValue(
    value,
  )
    .split(
      /\r?\n/,
    )
    .map(
      (item) =>
        item.trim(),
    )
    .filter(
      Boolean,
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

function assertSlug(
  value: string,
) {
  if (
    !value ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      value,
    )
  ) {
    throw new Error(
      "Nieprawidłowy slug.",
    );
  }
}

function httpUrl(
  value: string,
  fieldName: string,
) {
  let url: URL;

  try {
    url =
      new URL(
        value,
      );
  } catch {
    throw new Error(
      `Nieprawidłowy URL: ${fieldName}.`,
    );
  }

  if (
    url.protocol !==
      "https:" &&
    url.protocol !==
      "http:"
  ) {
    throw new Error(
      `${fieldName} musi używać http:// lub https://.`,
    );
  }

  return url.toString();
}

function featuresValue(
  value:
    FormDataEntryValue
    | null,
):
  | Prisma.InputJsonValue
  | null {
  const raw =
    stringValue(
      value,
    );

  if (!raw) {
    return null;
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        raw,
      );
  } catch {
    throw new Error(
      "Parametry zawierają nieprawidłowy JSON.",
    );
  }

  if (
    !parsed ||
    typeof parsed !==
      "object" ||
    Array.isArray(
      parsed,
    )
  ) {
    throw new Error(
      "Parametry muszą być obiektem JSON.",
    );
  }

  return parsed as Prisma.InputJsonValue;
}

function isEmptyJsonObject(
  value:
    unknown,
) {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value,
      ) &&
      Object.keys(
        value,
      ).length ===
        0,
  );
}

function jsonObjectValue(
  value:
    unknown,
): Prisma.InputJsonValue {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as Prisma.InputJsonValue;
  }

  return {};
}

function optionalDate(
  value:
    string,
) {
  return value
    ? parseWarsawDateTimeInput(
        value,
      )
    : null;
}

function revalidateOfferPages() {
  revalidatePath(
    "/",
  );

  revalidatePath(
    "/admin",
  );

  revalidatePath(
    "/admin/oferty",
  );

  revalidatePath(
    "/admin/analityka",
  );

  revalidatePath(
    "/admin/oceny",
  );

  revalidatePath(
    "/dobierz",
  );

  revalidatePath(
    "/porownaj",
  );

  revalidatePath(
    "/sitemap.xml",
  );

  revalidatePath(
    "/kategorie/[slug]",
    "page",
  );

  revalidatePath(
    "/uslugi/[slug]",
    "page",
  );
}

async function autoRateAfterSave(
  offerId: string,
  categorySlug: string,
) {
  if (
    categorySlug !==
    "hosting-www"
  ) {
    return false;
  }

  try {
    await autoRateOfferById(
      offerId,
    );

    return true;
  } catch (
    error
  ) {
    console.error(
      "Automatyczny scoring nie powiódł się:",
      {
        offerId,
        error,
      },
    );

    return false;
  }
}

async function uniqueCloneSlug(
  sourceSlug:
    string,
) {
  let index =
    1;

  while (
    index <
    1000
  ) {
    const suffix =
      index === 1
        ? "kopia"
        : `kopia-${index}`;

    const slug =
      `${sourceSlug}-${suffix}`;

    const exists =
      await prisma.offer.findUnique({
        where: {
          slug,
        },

        select: {
          id:
            true,
        },
      });

    if (!exists) {
      return slug;
    }

    index +=
      1;
  }

  throw new Error(
    "Nie udało się wygenerować slugu kopii.",
  );
}

export async function cloneOffer(
  formData:
    FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get(
        "id",
      ),
    );

  if (!id) {
    redirect(
      "/admin/oferty",
    );
  }

  const source =
    await prisma.offer.findUnique({
      where: {
        id,
      },
    });

  if (!source) {
    redirect(
      "/admin/oferty",
    );
  }

  const slug =
    await uniqueCloneSlug(
      source.slug,
    );

  const features =
    JSON.parse(
      JSON.stringify(
        source.features,
      ),
    ) as Prisma.InputJsonValue;

  const created =
    await prisma.offer.create({
      data: {
        name:
          `KOPIA — ${source.name}`,

        slug,

        summary:
          source.summary,

        description:
          source.description,

        categoryId:
          source.categoryId,

        providerId:
          source.providerId,

        priceAmount:
          source.priceAmount,

        regularPrice:
          source.regularPrice,

        currency:
          source.currency,

        billingPeriod:
          source.billingPeriod,

        billingLabel:
          source.billingLabel,

        promoCode:
          source.promoCode,

        affiliateUrl:
          source.affiliateUrl,

        sourceUrl:
          source.sourceUrl,

        features,

        useCases:
          source.useCases,

        pros:
          source.pros,

        cons:
          source.cons,

        methodologyNotes:
          source.methodologyNotes,

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
          source.lastVerifiedAt,
      },
    });

  revalidateOfferPages();

  redirect(
    `/admin/oferty?edit=${created.id}&cloned=1`,
  );
}

export async function saveOffer(
  formData:
    FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get(
        "id",
      ),
    );

  const name =
    stringValue(
      formData.get(
        "name",
      ),
    );

  const slug =
    normalizeSlug(
      stringValue(
        formData.get(
          "slug",
        ),
      ) ||
        name,
    );

  const summary =
    stringValue(
      formData.get(
        "summary",
      ),
    );

  const description =
    stringValue(
      formData.get(
        "description",
      ),
    );

  const categoryId =
    stringValue(
      formData.get(
        "categoryId",
      ),
    );

  const providerId =
    stringValue(
      formData.get(
        "providerId",
      ),
    );

  const priceAmount =
    numberValue(
      formData.get(
        "priceAmount",
      ),
    );

  const regularPrice =
    numberValue(
      formData.get(
        "regularPrice",
      ),
    );

  const currency =
    (
      stringValue(
        formData.get(
          "currency",
        ),
      ) ||
      "PLN"
    ).toUpperCase();

  const billingRaw =
    stringValue(
      formData.get(
        "billingPeriod",
      ),
    );

  const billingPeriod:
    BillingPeriod =
    BILLING_PERIODS.includes(
      billingRaw as BillingPeriod,
    )
      ? billingRaw as BillingPeriod
      : "MONTH";

  const billingLabel =
    stringValue(
      formData.get(
        "billingLabel",
      ),
    );

  const promoCode =
    stringValue(
      formData.get(
        "promoCode",
      ),
    );

  const affiliateRaw =
    stringValue(
      formData.get(
        "affiliateUrl",
      ),
    );

  const sourceRaw =
    stringValue(
      formData.get(
        "sourceUrl",
      ),
    );

  const validFrom =
    optionalDate(
      stringValue(
        formData.get(
          "validFrom",
        ),
      ),
    );

  const validTo =
    optionalDate(
      stringValue(
        formData.get(
          "validTo",
        ),
      ),
    );

  const verifiedRaw =
    stringValue(
      formData.get(
        "lastVerifiedAt",
      ),
    );

  const methodologyNotes =
    stringValue(
      formData.get(
        "methodologyNotes",
      ),
    );

  const submittedFeatures =
    featuresValue(
      formData.get(
        "features",
      ),
    );

  const requestedPublished =
    boolValue(
      formData.get(
        "isPublished",
      ),
    );

  if (!name) {
    throw new Error(
      "Nazwa jest wymagana.",
    );
  }

  if (!summary) {
    throw new Error(
      "Krótki opis jest wymagany.",
    );
  }

  if (!description) {
    throw new Error(
      "Opis jest wymagany.",
    );
  }

  if (!categoryId) {
    throw new Error(
      "Kategoria jest wymagana.",
    );
  }

  if (!providerId) {
    throw new Error(
      "Dostawca jest wymagany.",
    );
  }

  if (!sourceRaw) {
    throw new Error(
      "Oficjalne źródło jest wymagane.",
    );
  }

  assertSlug(
    slug,
  );

  if (
    !/^[A-Z]{3}$/.test(
      currency,
    )
  ) {
    throw new Error(
      "Waluta musi mieć trzyliterowy kod.",
    );
  }

  if (
    priceAmount !==
      null &&
    priceAmount <
      0
  ) {
    throw new Error(
      "Cena nie może być ujemna.",
    );
  }

  if (
    regularPrice !==
      null &&
    regularPrice <
      0
  ) {
    throw new Error(
      "Cena regularna nie może być ujemna.",
    );
  }

  if (
    validFrom &&
    validTo &&
    validFrom >
      validTo
  ) {
    throw new Error(
      "Początek ważności nie może być późniejszy niż koniec ważności.",
    );
  }

  const [
    category,
    provider,
  ] =
    await Promise.all([
      prisma.category.findUnique({
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
      }),

      prisma.provider.findUnique({
        where: {
          id:
            providerId,
        },

        select: {
          id:
            true,

          slug:
            true,

          affiliatePrograms: {
            where: {
              status:
                "ACTIVE",
            },

            orderBy: [
              {
                lastVerifiedAt:
                  "desc",
              },
              {
                updatedAt:
                  "desc",
              },
            ],

            take:
              1,

            select: {
              accountReference:
                true,
            },
          },
        },
      }),
    ]);

  if (!category) {
    throw new Error(
      "Wybrana kategoria nie istnieje.",
    );
  }

  if (!provider) {
    throw new Error(
      "Wybrany dostawca nie istnieje.",
    );
  }

  const sourceUrl =
    httpUrl(
      sourceRaw,
      "Oficjalne źródło",
    );

  const activeProgram =
    provider
      .affiliatePrograms[
      0
    ];

  const generatedAffiliate =
    affiliateRaw
      ? null
      : generateAffiliateUrl({
          providerSlug:
            provider.slug,

          accountReference:
            activeProgram?.accountReference,

          sourceUrl,
        });

  const affiliateUrl =
    affiliateRaw
      ? httpUrl(
          affiliateRaw,
          "Link afiliacyjny",
        )
      : generatedAffiliate;

  const affiliateWasGenerated =
    !affiliateRaw &&
    Boolean(
      generatedAffiliate,
    );

  const lastVerifiedAt =
    verifiedRaw
      ? parseWarsawDateTimeInput(
          verifiedRaw,
        )
      : new Date();

  const commonData = {
    name,
    slug,
    summary,
    description,

    categoryId,
    providerId,

    priceAmount,
    regularPrice,

    currency,
    billingPeriod,

    billingLabel:
      billingLabel ||
      null,

    promoCode:
      promoCode ||
      null,

    affiliateUrl,
    sourceUrl,

    useCases:
      linesValue(
        formData.get(
          "useCases",
        ),
      ),

    pros:
      linesValue(
        formData.get(
          "pros",
        ),
      ),

    cons:
      linesValue(
        formData.get(
          "cons",
        ),
      ),

    methodologyNotes:
      methodologyNotes ||
      null,

    isFeatured:
      boolValue(
        formData.get(
          "isFeatured",
        ),
      ),

    /*
     * Publikację uruchomimy
     * dopiero po kontroli
     * readiness.
     */
    isPublished:
      false,

    validFrom,
    validTo,

    lastVerifiedAt,
  };

  let offerId =
    id;

  if (id) {
    const before =
      await prisma.offer.findUnique({
        where: {
          id,
        },

        select: {
          id:
            true,

          categoryId:
            true,

          priceAmount:
            true,

          regularPrice:
            true,

          currency:
            true,

          features:
            true,
        },
      });

    if (!before) {
      throw new Error(
        "Oferta nie istnieje.",
      );
    }

    const existingFeatures =
      jsonObjectValue(
        before.features,
      );

    const hasExistingFeatures =
      !isEmptyJsonObject(
        existingFeatures,
      );

    let features:
      Prisma.InputJsonValue =
      (
        submittedFeatures ===
          null ||
        isEmptyJsonObject(
          submittedFeatures,
        )
      ) &&
      hasExistingFeatures
        ? existingFeatures
        : submittedFeatures ??
          {};

    /*
     * Formularz Hostingu WWW
     * automatycznie aktualizuje
     * JSON.
     */
    if (
      category.slug ===
      "hosting-www"
    ) {
      features =
        mergeHostingFeatures(
          features,
          formData,
        );
    }

    const priceChanged =
      (
        before.priceAmount ===
          null
          ? null
          : Number(
              before.priceAmount,
            )
      ) !==
        priceAmount ||
      (
        before.regularPrice ===
          null
          ? null
          : Number(
              before.regularPrice,
            )
      ) !==
        regularPrice ||
      before.currency !==
        currency;

    const categoryChanged =
      before.categoryId !==
      categoryId;

    await prisma.$transaction(
      async (
        tx,
      ) => {
        await tx.offer.update({
          where: {
            id,
          },

          data: {
            ...commonData,
            features,
          },
        });

        if (
          categoryChanged
        ) {
          await tx.offerRating.deleteMany({
            where: {
              offerId:
                id,
            },
          });

          await tx.offer.update({
            where: {
              id,
            },

            data: {
              editorScore:
                null,
            },
          });
        }

        if (
          priceChanged
        ) {
          await tx.offerPriceHistory.create({
            data: {
              offerId:
                id,

              priceAmount,
              regularPrice,
              currency,
            },
          });
        }
      },
    );
  } else {
    let features =
      submittedFeatures ??
      {};

    if (
      category.slug ===
      "hosting-www"
    ) {
      features =
        mergeHostingFeatures(
          features,
          formData,
        );
    }

    const created =
      await prisma.$transaction(
        async (
          tx,
        ) => {
          const result =
            await tx.offer.create({
              data: {
                ...commonData,

                features,

                editorScore:
                  null,
              },
            });

          if (
            priceAmount !==
              null ||
            regularPrice !==
              null
          ) {
            await tx.offerPriceHistory.create({
              data: {
                offerId:
                  result.id,

                priceAmount,
                regularPrice,
                currency,
              },
            });
          }

          return result;
        },
      );

    offerId =
      created.id;
  }

  const automaticallyRated =
    await autoRateAfterSave(
      offerId,
      category.slug,
    );

  const readiness =
    await getOfferReadinessById(
      offerId,
    );

  const publishAllowed =
    Boolean(
      requestedPublished &&
      readiness?.ready,
    );

  await prisma.offer.update({
    where: {
      id:
        offerId,
    },

    data: {
      isPublished:
        publishAllowed,
    },
  });

  revalidateOfferPages();

  const search =
    new URLSearchParams();

  search.set(
    "edit",
    offerId,
  );

  search.set(
    "saved",
    "1",
  );

  if (
    automaticallyRated
  ) {
    search.set(
      "rated",
      "1",
    );
  }

  if (
    affiliateWasGenerated
  ) {
    search.set(
      "affiliateGenerated",
      "1",
    );
  }

  if (readiness) {
    search.set(
      "readiness",
      String(
        readiness.score,
      ),
    );
  }

  if (
    requestedPublished &&
    !publishAllowed
  ) {
    search.set(
      "publishBlocked",
      "1",
    );
  }

  redirect(
    `/admin/oferty?${search.toString()}`,
  );
}

export async function deleteOffer(
  formData:
    FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get(
        "id",
      ),
    );

  if (!id) {
    redirect(
      "/admin/oferty",
    );
  }

  await prisma.offer.delete({
    where: {
      id,
    },
  });

  revalidateOfferPages();

  redirect(
    "/admin/oferty?deleted=1",
  );
}