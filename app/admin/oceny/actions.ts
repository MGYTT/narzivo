"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  requireAdmin,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  recomputeCategoryScores,
  recomputeOfferScore,
} from "@/lib/rating";

function stringValue(
  value: FormDataEntryValue | null,
) {
  return String(
    value ?? "",
  ).trim();
}

function numberValue(
  value: FormDataEntryValue | null,
) {
  const raw =
    stringValue(value);

  if (!raw) {
    return null;
  }

  const valueNumber =
    Number(raw);

  if (
    !Number.isFinite(
      valueNumber,
    )
  ) {
    return null;
  }

  return valueNumber;
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

function normalizeKey(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /ł/g,
      "l",
    )
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

function assertHttpUrl(
  value: string,
) {
  let url: URL;

  try {
    url =
      new URL(value);
  } catch {
    throw new Error(
      "Nieprawidłowy URL źródła.",
    );
  }

  if (
    url.protocol !==
      "https:" &&
    url.protocol !==
      "http:"
  ) {
    throw new Error(
      "URL musi rozpoczynać się od http:// albo https://.",
    );
  }

  return url.toString();
}

function parseDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      "Nieprawidłowa data weryfikacji.",
    );
  }

  return date;
}

function revalidateRatings() {
  revalidatePath(
    "/admin",
  );

  revalidatePath(
    "/admin/oceny",
  );

  revalidatePath(
    "/admin/oferty",
  );

  revalidatePath("/");

  revalidatePath(
    "/kategorie/[slug]",
    "page",
  );

  revalidatePath(
    "/uslugi/[slug]",
    "page",
  );
}

/* =========================================================
   CRITERIA
========================================================= */

export async function saveRatingCriterion(
  formData: FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get("id"),
    );

  const categoryId =
    stringValue(
      formData.get(
        "categoryId",
      ),
    );

  const name =
    stringValue(
      formData.get(
        "name",
      ),
    );

  const enteredKey =
    stringValue(
      formData.get(
        "key",
      ),
    );

  const key =
    normalizeKey(
      enteredKey ||
        name,
    );

  const description =
    stringValue(
      formData.get(
        "description",
      ),
    );

  const weight =
    numberValue(
      formData.get(
        "weight",
      ),
    );

  const sortOrder =
    numberValue(
      formData.get(
        "sortOrder",
      ),
    );

  const isPublished =
    boolValue(
      formData.get(
        "isPublished",
      ),
    );

  if (!categoryId) {
    throw new Error(
      "Kategoria jest wymagana.",
    );
  }

  if (!name) {
    throw new Error(
      "Nazwa kryterium jest wymagana.",
    );
  }

  if (!key) {
    throw new Error(
      "Klucz kryterium jest wymagany.",
    );
  }

  if (
    weight === null ||
    weight <= 0 ||
    weight > 100
  ) {
    throw new Error(
      "Waga musi być większa od 0 i nie większa niż 100.",
    );
  }

  const category =
    await prisma.category.findUnique({
      where: {
        id:
          categoryId,
      },

      select: {
        id: true,
      },
    });

  if (!category) {
    throw new Error(
      "Kategoria nie istnieje.",
    );
  }

  if (id) {
    const current =
      await prisma.ratingCriterion.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          categoryId:
            true,
        },
      });

    if (!current) {
      throw new Error(
        "Kryterium nie istnieje.",
      );
    }

    /*
     * Nie przenosimy istniejącego
     * kryterium między kategoriami,
     * ponieważ mogłoby posiadać
     * istniejące oceny.
     */
    if (
      current.categoryId !==
      categoryId
    ) {
      throw new Error(
        "Nie można przenieść istniejącego kryterium do innej kategorii.",
      );
    }

    await prisma.ratingCriterion.update({
      where: {
        id,
      },

      data: {
        name,
        key,

        description:
          description ||
          null,

        weight,

        sortOrder:
          Math.round(
            sortOrder ??
              0,
          ),

        isPublished,
      },
    });
  } else {
    await prisma.ratingCriterion.create({
      data: {
        categoryId,
        name,
        key,

        description:
          description ||
          null,

        weight,

        sortOrder:
          Math.round(
            sortOrder ??
              0,
          ),

        isPublished,
      },
    });
  }

  /*
   * Dodanie, wyłączenie albo zmiana wagi
   * kryterium wpływa na wynik wszystkich
   * ofert tej kategorii.
   */
  await recomputeCategoryScores(
    categoryId,
  );

  revalidateRatings();

  redirect(
    `/admin/oceny?kategoria=${categoryId}&criterionSaved=1`,
  );
}

export async function deleteRatingCriterion(
  formData: FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get("id"),
    );

  if (!id) {
    redirect(
      "/admin/oceny",
    );
  }

  const criterion =
    await prisma.ratingCriterion.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        categoryId:
          true,
      },
    });

  if (!criterion) {
    redirect(
      "/admin/oceny",
    );
  }

  const categoryId =
    criterion.categoryId;

  /*
   * OfferRating ma ON DELETE CASCADE,
   * więc oceny tego kryterium
   * również zostaną usunięte.
   */
  await prisma.ratingCriterion.delete({
    where: {
      id,
    },
  });

  await recomputeCategoryScores(
    categoryId,
  );

  revalidateRatings();

  redirect(
    `/admin/oceny?kategoria=${categoryId}&criterionDeleted=1`,
  );
}

/* =========================================================
   OFFER RATINGS
========================================================= */

export async function saveOfferRating(
  formData: FormData,
) {
  await requireAdmin();

  const offerId =
    stringValue(
      formData.get(
        "offerId",
      ),
    );

  const criterionId =
    stringValue(
      formData.get(
        "criterionId",
      ),
    );

  const score =
    numberValue(
      formData.get(
        "score",
      ),
    );

  const note =
    stringValue(
      formData.get(
        "note",
      ),
    );

  const sourceUrlRaw =
    stringValue(
      formData.get(
        "sourceUrl",
      ),
    );

  const lastVerifiedRaw =
    stringValue(
      formData.get(
        "lastVerifiedAt",
      ),
    );

  if (!offerId) {
    throw new Error(
      "Oferta jest wymagana.",
    );
  }

  if (!criterionId) {
    throw new Error(
      "Kryterium jest wymagane.",
    );
  }

  if (
    score === null ||
    score < 0 ||
    score > 10
  ) {
    throw new Error(
      "Ocena musi mieścić się w zakresie 0–10.",
    );
  }

  const [
    offer,
    criterion,
  ] =
    await Promise.all([
      prisma.offer.findUnique({
        where: {
          id:
            offerId,
        },

        select: {
          id: true,
          categoryId:
            true,
        },
      }),

      prisma.ratingCriterion.findUnique({
        where: {
          id:
            criterionId,
        },

        select: {
          id: true,
          categoryId:
            true,
        },
      }),
    ]);

  if (!offer) {
    throw new Error(
      "Oferta nie istnieje.",
    );
  }

  if (!criterion) {
    throw new Error(
      "Kryterium nie istnieje.",
    );
  }

  if (
    offer.categoryId !==
    criterion.categoryId
  ) {
    throw new Error(
      "Nie można przypisać ofercie kryterium z innej kategorii.",
    );
  }

  let sourceUrl:
    string | null =
    null;

  if (sourceUrlRaw) {
    sourceUrl =
      assertHttpUrl(
        sourceUrlRaw,
      );
  }

  const lastVerifiedAt =
    lastVerifiedRaw
      ? parseDate(
          lastVerifiedRaw,
        )
      : new Date();

  await prisma.offerRating.upsert({
    where: {
      offerId_criterionId: {
        offerId,
        criterionId,
      },
    },

    update: {
      score,

      note:
        note || null,

      sourceUrl,

      lastVerifiedAt,
    },

    create: {
      offerId,
      criterionId,
      score,

      note:
        note || null,

      sourceUrl,

      lastVerifiedAt,
    },
  });

  await recomputeOfferScore(
    offerId,
  );

  revalidateRatings();

  redirect(
    `/admin/oceny?kategoria=${offer.categoryId}&oferta=${offerId}&ratingSaved=1`,
  );
}

export async function deleteOfferRating(
  formData: FormData,
) {
  await requireAdmin();

  const offerId =
    stringValue(
      formData.get(
        "offerId",
      ),
    );

  const criterionId =
    stringValue(
      formData.get(
        "criterionId",
      ),
    );

  if (
    !offerId ||
    !criterionId
  ) {
    redirect(
      "/admin/oceny",
    );
  }

  const offer =
    await prisma.offer.findUnique({
      where: {
        id:
          offerId,
      },

      select: {
        id: true,
        categoryId:
          true,
      },
    });

  if (!offer) {
    redirect(
      "/admin/oceny",
    );
  }

  await prisma.offerRating.deleteMany({
    where: {
      offerId,
      criterionId,
    },
  });

  /*
   * Brak choć jednej aktywnej oceny
   * spowoduje automatycznie
   * editorScore = null.
   */
  await recomputeOfferScore(
    offerId,
  );

  revalidateRatings();

  redirect(
    `/admin/oceny?kategoria=${offer.categoryId}&oferta=${offerId}&ratingDeleted=1`,
  );
}