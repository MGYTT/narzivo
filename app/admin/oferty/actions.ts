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
    Number(raw);

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
    .split(/\r?\n/)
    .map(
      (item) =>
        item.trim(),
    )
    .filter(Boolean);
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

/*
 * Zwraca null dla pustego pola.
 *
 * Jest to celowe:
 * null oznacza:
 * "użytkownik nie przesłał parametrów".
 *
 * Dzięki temu podczas edycji nie
 * nadpisujemy istniejących danych
 * pustym obiektem.
 */
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

  let parsed: unknown;

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
  value: unknown,
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return false;
  }

  return (
    Object.keys(
      value,
    ).length ===
    0
  );
}

function jsonObjectValue(
  value: unknown,
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
  value: string,
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

export async function saveOffer(
  formData: FormData,
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
      ) || name,
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
    priceAmount < 0
  ) {
    throw new Error(
      "Cena nie może być ujemna.",
    );
  }

  if (
    regularPrice !==
      null &&
    regularPrice < 0
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
          id: true,
        },
      }),

      prisma.provider.findUnique({
        where: {
          id:
            providerId,
        },

        select: {
          id: true,
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

  const affiliateUrl =
    affiliateRaw
      ? httpUrl(
          affiliateRaw,
          "Link afiliacyjny",
        )
      : null;

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

    isPublished:
      boolValue(
        formData.get(
          "isPublished",
        ),
      ),

    validFrom,
    validTo,

    lastVerifiedAt,
  } satisfies Omit<
    Prisma.OfferUncheckedUpdateInput,
    "features"
  >;

  let offerId =
    id;

  if (id) {
    const before =
      await prisma.offer.findUnique({
        where: {
          id,
        },

        select: {
          id: true,

          categoryId:
            true,

          priceAmount:
            true,

          regularPrice:
            true,

          currency:
            true,

          /*
           * Musimy pobrać istniejące
           * parametry, aby chronić je
           * przed przypadkowym
           * wyzerowaniem.
           */
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

    /*
     * Najważniejsze zabezpieczenie.
     *
     * Jeżeli formularz podczas
     * edycji prześle pustą wartość
     * albo {}, a w bazie istnieją
     * już parametry, NIE kasujemy
     * istniejących danych.
     *
     * Jawnie przesłany niepusty JSON
     * normalnie aktualizuje features.
     */
    const features =
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

    const updateData:
      Prisma.OfferUncheckedUpdateInput =
      {
        ...commonData,
        features,
      };

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

          data:
            updateData,
        });

        if (
          categoryChanged
        ) {
          /*
           * Oceny starej kategorii
           * nie mogą być przenoszone
           * do nowej metodologii.
           */
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
    const features =
      submittedFeatures ??
      {};

    const createData:
      Prisma.OfferUncheckedCreateInput =
      {
        ...commonData,

        features,

        editorScore:
          null,
      };

    const created =
      await prisma.$transaction(
        async (
          tx,
        ) => {
          const result =
            await tx.offer.create({
              data:
                createData,
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

  revalidateOfferPages();

  redirect(
    `/admin/oferty?edit=${offerId}&saved=1`,
  );
}

export async function deleteOffer(
  formData: FormData,
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