"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase";

import {
  isAllowedAdminEmail,
  requireAdmin,
} from "@/lib/auth";

const PROVIDER_LOGO_BUCKET =
  "provider-logos";

const MAX_LOGO_SIZE =
  2 * 1024 * 1024;

const ALLOWED_LOGO_TYPES =
  new Map<string, string>([
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"],
  ]);

const BILLING_PERIODS = [
  "ONE_TIME",
  "MONTH",
  "YEAR",
  "CUSTOM",
] as const;

const AFFILIATE_STATUSES = [
  "PENDING",
  "ACTIVE",
  "PAUSED",
  "REJECTED",
] as const;

type BillingPeriodValue =
  (typeof BILLING_PERIODS)[number];

type AffiliateStatusValue =
  (typeof AFFILIATE_STATUSES)[number];

function stringValue(
  value: FormDataEntryValue | null,
) {
  return String(value ?? "").trim();
}

function boolValue(
  value: FormDataEntryValue | null,
) {
  return (
    value === "on" ||
    value === "true" ||
    value === "1"
  );
}

function numberValue(
  value: FormDataEntryValue | null,
) {
  const raw =
    stringValue(value);

  if (!raw) {
    return null;
  }

  const parsed =
    Number(raw);

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return null;
  }

  return parsed;
}

function linesValue(
  value: FormDataEntryValue | null,
) {
  return stringValue(value)
    .split(/\r?\n/)
    .map((line) =>
      line.trim(),
    )
    .filter(Boolean);
}

function jsonObject(
  value: FormDataEntryValue | null,
): Prisma.InputJsonValue {
  const raw =
    stringValue(value);

  if (!raw) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(raw);
  } catch {
    throw new Error(
      "Pole parametrów zawiera nieprawidłowy JSON.",
    );
  }

  if (
    parsed === null ||
    typeof parsed !==
      "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "Parametry muszą być obiektem JSON.",
    );
  }

  return parsed as Prisma.InputJsonValue;
}

function normalizeSlug(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
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
  slug: string,
) {
  if (
    !slug ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug,
    )
  ) {
    throw new Error(
      "Nieprawidłowy slug.",
    );
  }
}

function assertHttpUrl(
  value: string,
  fieldName: string,
) {
  let url: URL;

  try {
    url =
      new URL(value);
  } catch {
    throw new Error(
      `Nieprawidłowy adres URL w polu „${fieldName}”.`,
    );
  }

  if (
    url.protocol !==
      "https:" &&
    url.protocol !==
      "http:"
  ) {
    throw new Error(
      `Pole „${fieldName}” musi rozpoczynać się od http:// lub https://.`,
    );
  }

  return url.toString();
}

function parseDate(
  value: string,
  fieldName: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      `Nieprawidłowa data w polu „${fieldName}”.`,
    );
  }

  return date;
}

function providerLogoPathFromUrl(
  url:
    | string
    | null
    | undefined,
) {
  if (!url) {
    return null;
  }

  const marker =
    `/storage/v1/object/public/${PROVIDER_LOGO_BUCKET}/`;

  const markerIndex =
    url.indexOf(marker);

  if (
    markerIndex === -1
  ) {
    return null;
  }

  const encodedPath =
    url.slice(
      markerIndex +
        marker.length,
    );

  try {
    return decodeURIComponent(
      encodedPath,
    );
  } catch {
    return encodedPath;
  }
}

function revalidatePublicContent() {
  revalidatePath("/");

  revalidatePath(
    "/dobierz",
  );

  revalidatePath(
    "/porownaj",
  );

  revalidatePath(
    "/metodologia",
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

function revalidateAdminContent() {
  revalidatePath(
    "/admin",
  );

  revalidatePath(
    "/admin/kategorie",
  );

  revalidatePath(
    "/admin/dostawcy",
  );

  revalidatePath(
    "/admin/oferty",
  );

  revalidatePath(
    "/admin/afiliacja",
  );

  revalidatePath(
    "/admin/analityka",
  );

  revalidatePath(
    "/admin/oceny",
  );
}

/* =========================================================
   AUTH
========================================================= */

export async function loginAdmin(
  formData: FormData,
) {
  const email =
    stringValue(
      formData.get("email"),
    ).toLowerCase();

  const password =
    stringValue(
      formData.get("password"),
    );

  if (
    !email ||
    !password
  ) {
    redirect(
      "/admin/login?error=missing",
    );
  }

  if (
    !isAllowedAdminEmail(
      email,
    )
  ) {
    redirect(
      "/admin/login?error=forbidden",
    );
  }

  const supabase =
    await createSupabaseServerClient();

  const {
    error:
      loginError,
  } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (loginError) {
    redirect(
      "/admin/login?error=credentials",
    );
  }

  const {
    data,
    error:
      claimsError,
  } =
    await supabase.auth.getClaims();

  const claims =
    data?.claims as
      | {
          email?: string;
        }
      | undefined;

  if (
    claimsError ||
    !isAllowedAdminEmail(
      claims?.email,
    )
  ) {
    await supabase.auth.signOut();

    redirect(
      "/admin/login?error=forbidden",
    );
  }

  redirect(
    "/admin",
  );
}

export async function logoutAdmin() {
  const supabase =
    await createSupabaseServerClient();

  await supabase.auth.signOut();

  redirect(
    "/admin/login",
  );
}

/* =========================================================
   CATEGORIES
========================================================= */

export async function saveCategory(
  formData: FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get("id"),
    );

  const name =
    stringValue(
      formData.get("name"),
    );

  const slug =
    normalizeSlug(
      stringValue(
        formData.get(
          "slug",
        ),
      ) || name,
    );

  const description =
    stringValue(
      formData.get(
        "description",
      ),
    );

  const icon =
    stringValue(
      formData.get("icon"),
    );

  const sortOrder =
    Math.round(
      numberValue(
        formData.get(
          "sortOrder",
        ),
      ) ?? 0,
    );

  if (!name) {
    throw new Error(
      "Nazwa kategorii jest wymagana.",
    );
  }

  if (!description) {
    throw new Error(
      "Opis kategorii jest wymagany.",
    );
  }

  assertSlug(slug);

  const data:
    Prisma.CategoryUncheckedCreateInput =
    {
      name,
      slug,
      description,

      icon:
        icon || null,

      sortOrder,

      isPublished:
        boolValue(
          formData.get(
            "isPublished",
          ),
        ),
    };

  if (id) {
    await prisma.category.update({
      where: {
        id,
      },

      data,
    });
  } else {
    await prisma.category.create({
      data,
    });
  }

  revalidatePublicContent();
  revalidateAdminContent();

  redirect(
    "/admin/kategorie?saved=1",
  );
}

export async function deleteCategory(
  formData: FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get("id"),
    );

  if (!id) {
    redirect(
      "/admin/kategorie",
    );
  }

  const category =
    await prisma.category.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

  if (!category) {
    redirect(
      "/admin/kategorie",
    );
  }

  if (
    category._count.offers >
    0
  ) {
    redirect(
      "/admin/kategorie?error=used",
    );
  }

  await prisma.category.delete({
    where: {
      id,
    },
  });

  revalidatePublicContent();
  revalidateAdminContent();

  redirect(
    "/admin/kategorie?deleted=1",
  );
}

/* =========================================================
   PROVIDERS
========================================================= */

export async function saveProvider(
  formData: FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get("id"),
    );

  const name =
    stringValue(
      formData.get("name"),
    );

  const slug =
    normalizeSlug(
      stringValue(
        formData.get(
          "slug",
        ),
      ) || name,
    );

  const websiteUrlRaw =
    stringValue(
      formData.get(
        "websiteUrl",
      ),
    );

  const description =
    stringValue(
      formData.get(
        "description",
      ),
    );

  const countryCode =
    stringValue(
      formData.get(
        "countryCode",
      ),
    ).toUpperCase();

  if (!name) {
    throw new Error(
      "Nazwa dostawcy jest wymagana.",
    );
  }

  if (!websiteUrlRaw) {
    throw new Error(
      "Strona WWW dostawcy jest wymagana.",
    );
  }

  if (!description) {
    throw new Error(
      "Opis dostawcy jest wymagany.",
    );
  }

  assertSlug(slug);

  const websiteUrl =
    assertHttpUrl(
      websiteUrlRaw,
      "strona WWW",
    );

  if (
    countryCode &&
    !/^[A-Z]{2}$/.test(
      countryCode,
    )
  ) {
    throw new Error(
      "Kod kraju musi składać się z dwóch liter.",
    );
  }

  const data:
    Prisma.ProviderUncheckedCreateInput =
    {
      name,
      slug,
      websiteUrl,
      description,

      countryCode:
        countryCode ||
        null,

      isPublished:
        boolValue(
          formData.get(
            "isPublished",
          ),
        ),
    };

  let providerId =
    id;

  if (id) {
    await prisma.provider.update({
      where: {
        id,
      },

      data,
    });
  } else {
    const created =
      await prisma.provider.create({
        data,
      });

    providerId =
      created.id;
  }

  revalidatePublicContent();
  revalidateAdminContent();

  redirect(
    `/admin/dostawcy?edit=${providerId}&saved=1`,
  );
}

export async function deleteProvider(
  formData: FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get("id"),
    );

  if (!id) {
    redirect(
      "/admin/dostawcy",
    );
  }

  const provider =
    await prisma.provider.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            offers:
              true,

            affiliatePrograms:
              true,
          },
        },
      },
    });

  if (!provider) {
    redirect(
      "/admin/dostawcy",
    );
  }

  if (
    provider._count.offers >
      0 ||
    provider._count
        .affiliatePrograms >
      0
  ) {
    redirect(
      "/admin/dostawcy?error=used",
    );
  }

  const logoPath =
    providerLogoPathFromUrl(
      provider.logoUrl,
    );

  await prisma.provider.delete({
    where: {
      id,
    },
  });

  if (logoPath) {
    try {
      const supabase =
        createSupabaseAdminClient();

      const {
        error,
      } =
        await supabase.storage
          .from(
            PROVIDER_LOGO_BUCKET,
          )
          .remove([
            logoPath,
          ]);

      if (error) {
        console.error(
          "Nie udało się usunąć logo:",
          error,
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Błąd czyszczenia Storage:",
        error,
      );
    }
  }

  revalidatePublicContent();
  revalidateAdminContent();

  redirect(
    "/admin/dostawcy?deleted=1",
  );
}

export async function uploadProviderLogo(
  formData: FormData,
) {
  await requireAdmin();

  const providerId =
    stringValue(
      formData.get(
        "providerId",
      ),
    );

  if (!providerId) {
    redirect(
      "/admin/dostawcy",
    );
  }

  const file =
    formData.get("logo");

  if (
    !(file instanceof File) ||
    file.size === 0
  ) {
    redirect(
      `/admin/dostawcy?edit=${providerId}&logoError=missing`,
    );
  }

  const extension =
    ALLOWED_LOGO_TYPES.get(
      file.type,
    );

  if (!extension) {
    redirect(
      `/admin/dostawcy?edit=${providerId}&logoError=type`,
    );
  }

  if (
    file.size >
    MAX_LOGO_SIZE
  ) {
    redirect(
      `/admin/dostawcy?edit=${providerId}&logoError=size`,
    );
  }

  const provider =
    await prisma.provider.findUnique({
      where: {
        id:
          providerId,
      },
    });

  if (!provider) {
    redirect(
      "/admin/dostawcy",
    );
  }

  const supabase =
    createSupabaseAdminClient();

  const path =
    `providers/${provider.id}/${randomUUID()}.${extension}`;

  const bytes =
    await file.arrayBuffer();

  const {
    error:
      uploadError,
  } =
    await supabase.storage
      .from(
        PROVIDER_LOGO_BUCKET,
      )
      .upload(
        path,
        bytes,
        {
          contentType:
            file.type,

          cacheControl:
            "31536000",

          upsert:
            false,
        },
      );

  if (uploadError) {
    console.error(
      uploadError,
    );

    redirect(
      `/admin/dostawcy?edit=${providerId}&logoError=upload`,
    );
  }

  const {
    data:
      publicData,
  } =
    supabase.storage
      .from(
        PROVIDER_LOGO_BUCKET,
      )
      .getPublicUrl(
        path,
      );

  const oldLogoPath =
    providerLogoPathFromUrl(
      provider.logoUrl,
    );

  try {
    await prisma.provider.update({
      where: {
        id:
          provider.id,
      },

      data: {
        logoUrl:
          publicData.publicUrl,
      },
    });
  } catch (
    error
  ) {
    await supabase.storage
      .from(
        PROVIDER_LOGO_BUCKET,
      )
      .remove([
        path,
      ]);

    throw error;
  }

  if (
    oldLogoPath &&
    oldLogoPath !== path
  ) {
    const {
      error,
    } =
      await supabase.storage
        .from(
          PROVIDER_LOGO_BUCKET,
        )
        .remove([
          oldLogoPath,
        ]);

    if (error) {
      console.error(
        error,
      );
    }
  }

  revalidatePublicContent();
  revalidateAdminContent();

  redirect(
    `/admin/dostawcy?edit=${providerId}&logo=1`,
  );
}

export async function removeProviderLogo(
  formData: FormData,
) {
  await requireAdmin();

  const providerId =
    stringValue(
      formData.get(
        "providerId",
      ),
    );

  if (!providerId) {
    redirect(
      "/admin/dostawcy",
    );
  }

  const provider =
    await prisma.provider.findUnique({
      where: {
        id:
          providerId,
      },
    });

  if (!provider) {
    redirect(
      "/admin/dostawcy",
    );
  }

  const logoPath =
    providerLogoPathFromUrl(
      provider.logoUrl,
    );

  await prisma.provider.update({
    where: {
      id:
        providerId,
    },

    data: {
      logoUrl:
        null,
    },
  });

  if (logoPath) {
    try {
      const supabase =
        createSupabaseAdminClient();

      await supabase.storage
        .from(
          PROVIDER_LOGO_BUCKET,
        )
        .remove([
          logoPath,
        ]);
    } catch (
      error
    ) {
      console.error(
        error,
      );
    }
  }

  revalidatePublicContent();
  revalidateAdminContent();

  redirect(
    `/admin/dostawcy?edit=${providerId}&logoRemoved=1`,
  );
}

/* =========================================================
   OFFERS
========================================================= */

export async function saveOffer(
  formData: FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get("id"),
    );

  const name =
    stringValue(
      formData.get("name"),
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
      ) || "PLN"
    ).toUpperCase();

  const billingRaw =
    stringValue(
      formData.get(
        "billingPeriod",
      ),
    );

  const billingPeriod:
    BillingPeriodValue =
    BILLING_PERIODS.includes(
      billingRaw as BillingPeriodValue,
    )
      ? (billingRaw as BillingPeriodValue)
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

  const affiliateUrlRaw =
    stringValue(
      formData.get(
        "affiliateUrl",
      ),
    );

  const sourceUrlRaw =
    stringValue(
      formData.get(
        "sourceUrl",
      ),
    );

  const methodologyNotes =
    stringValue(
      formData.get(
        "methodologyNotes",
      ),
    );

  const lastVerifiedRaw =
    stringValue(
      formData.get(
        "lastVerifiedAt",
      ),
    );

  if (!name) {
    throw new Error(
      "Nazwa oferty jest wymagana.",
    );
  }

  if (!summary) {
    throw new Error(
      "Krótki opis oferty jest wymagany.",
    );
  }

  if (!description) {
    throw new Error(
      "Pełny opis oferty jest wymagany.",
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

  if (!sourceUrlRaw) {
    throw new Error(
      "Oficjalne źródło danych jest wymagane.",
    );
  }

  assertSlug(slug);

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
    !/^[A-Z]{3}$/.test(
      currency,
    )
  ) {
    throw new Error(
      "Waluta musi mieć trzyliterowy kod.",
    );
  }

  /*
   * Link afiliacyjny jest teraz
   * OPCJONALNY.
   *
   * Jeśli jest pusty, oferta nadal
   * może być publikowana i prowadzi
   * do oficjalnego sourceUrl.
   */
  const affiliateUrl =
    affiliateUrlRaw
      ? assertHttpUrl(
          affiliateUrlRaw,
          "link afiliacyjny",
        )
      : null;

  const sourceUrl =
    assertHttpUrl(
      sourceUrlRaw,
      "oficjalne źródło danych",
    );

  const lastVerifiedAt =
    lastVerifiedRaw
      ? parseDate(
          lastVerifiedRaw,
          "ostatnia weryfikacja",
        )
      : new Date();

  const features:
    Prisma.InputJsonValue =
    jsonObject(
      formData.get(
        "features",
      ),
    );

  /*
   * editorScore NIE jest już
   * pobierany z formularza.
   *
   * Jest obliczany przez system
   * RatingCriterion / OfferRating.
   */
  const data:
    Prisma.OfferUncheckedCreateInput =
    {
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

      features,

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
          id: true,
          priceAmount:
            true,
          regularPrice:
            true,
          currency:
            true,
        },
      });

    if (!before) {
      throw new Error(
        "Oferta nie istnieje.",
      );
    }

    const oldPrice =
      before.priceAmount ===
        null
        ? null
        : Number(
            before.priceAmount,
          );

    const oldRegularPrice =
      before.regularPrice ===
        null
        ? null
        : Number(
            before.regularPrice,
          );

    const priceChanged =
      oldPrice !==
        priceAmount ||
      oldRegularPrice !==
        regularPrice ||
      before.currency !==
        currency;

    const updateData:
      Prisma.OfferUncheckedUpdateInput =
      {
        name:
          data.name,

        slug:
          data.slug,

        summary:
          data.summary,

        description:
          data.description,

        categoryId:
          data.categoryId,

        providerId:
          data.providerId,

        priceAmount:
          data.priceAmount,

        regularPrice:
          data.regularPrice,

        currency:
          data.currency,

        billingPeriod:
          data.billingPeriod,

        billingLabel:
          data.billingLabel,

        promoCode:
          data.promoCode,

        affiliateUrl:
          data.affiliateUrl,

        sourceUrl:
          data.sourceUrl,

        features:
          data.features,

        useCases:
          data.useCases,

        pros:
          data.pros,

        cons:
          data.cons,

        methodologyNotes:
          data.methodologyNotes,

        isFeatured:
          data.isFeatured,

        isPublished:
          data.isPublished,

        lastVerifiedAt:
          data.lastVerifiedAt,
      };

    await prisma.offer.update({
      where: {
        id,
      },

      data:
        updateData,
    });

    if (priceChanged) {
      await prisma.offerPriceHistory.create({
        data: {
          offerId:
            id,

          priceAmount,
          regularPrice,
          currency,
        },
      });
    }
  } else {
    const created =
      await prisma.offer.create({
        data,
      });

    offerId =
      created.id;

    if (
      priceAmount !==
        null ||
      regularPrice !==
        null
    ) {
      await prisma.offerPriceHistory.create({
        data: {
          offerId:
            created.id,

          priceAmount,
          regularPrice,
          currency,
        },
      });
    }
  }

  revalidatePublicContent();
  revalidateAdminContent();

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
      formData.get("id"),
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

  revalidatePublicContent();
  revalidateAdminContent();

  redirect(
    "/admin/oferty?deleted=1",
  );
}

/* =========================================================
   AFFILIATE PROGRAMS
========================================================= */

export async function saveAffiliateProgram(
  formData: FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get("id"),
    );

  const providerId =
    stringValue(
      formData.get(
        "providerId",
      ),
    );

  const network =
    stringValue(
      formData.get(
        "network",
      ),
    );

  const programName =
    stringValue(
      formData.get(
        "programName",
      ),
    );

  const statusRaw =
    stringValue(
      formData.get(
        "status",
      ),
    );

  const status:
    AffiliateStatusValue =
    AFFILIATE_STATUSES.includes(
      statusRaw as AffiliateStatusValue,
    )
      ? (statusRaw as AffiliateStatusValue)
      : "PENDING";

  const termsUrlRaw =
    stringValue(
      formData.get(
        "termsUrl",
      ),
    );

  const cookieDaysRaw =
    numberValue(
      formData.get(
        "cookieDays",
      ),
    );

  const commissionNote =
    stringValue(
      formData.get(
        "commissionNote",
      ),
    );

  const accountReference =
    stringValue(
      formData.get(
        "accountReference",
      ),
    );

  const verifiedRaw =
    stringValue(
      formData.get(
        "lastVerifiedAt",
      ),
    );

  if (!providerId) {
    throw new Error(
      "Dostawca jest wymagany.",
    );
  }

  if (!network) {
    throw new Error(
      "Sieć lub typ programu jest wymagany.",
    );
  }

  if (!programName) {
    throw new Error(
      "Nazwa programu jest wymagana.",
    );
  }

  const termsUrl =
    termsUrlRaw
      ? assertHttpUrl(
          termsUrlRaw,
          "regulamin programu",
        )
      : null;

  const cookieDays =
    cookieDaysRaw ===
      null
      ? null
      : Math.max(
          0,
          Math.round(
            cookieDaysRaw,
          ),
        );

  const lastVerifiedAt =
    verifiedRaw
      ? parseDate(
          verifiedRaw,
          "weryfikacja programu",
        )
      : null;

  const data:
    Prisma.AffiliateProgramUncheckedCreateInput =
    {
      providerId,
      network,
      programName,
      status,
      termsUrl,
      cookieDays,

      commissionNote:
        commissionNote ||
        null,

      accountReference:
        accountReference ||
        null,

      lastVerifiedAt,
    };

  if (id) {
    await prisma.affiliateProgram.update({
      where: {
        id,
      },

      data,
    });
  } else {
    await prisma.affiliateProgram.create({
      data,
    });
  }

  revalidateAdminContent();

  redirect(
    "/admin/afiliacja?saved=1",
  );
}

export async function deleteAffiliateProgram(
  formData: FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get("id"),
    );

  if (!id) {
    redirect(
      "/admin/afiliacja",
    );
  }

  await prisma.affiliateProgram.delete({
    where: {
      id,
    },
  });

  revalidateAdminContent();

  redirect(
    "/admin/afiliacja?deleted=1",
  );
}