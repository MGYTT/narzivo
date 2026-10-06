import "server-only";

import {
  prisma,
} from "@/lib/prisma";

const DAY_MS =
  24 * 60 * 60 * 1000;

export type OfferReadinessCheck = {
  key: string;
  label: string;
  weight: number;
  passed: boolean;
  detail: string;
};

export type OfferReadiness = {
  score: number;
  ready: boolean;

  checks:
    OfferReadinessCheck[];

  missing: string[];

  affiliateActive:
    boolean;
};

type ReadinessOffer = {
  name: string;
  slug: string;
  summary: string;
  description: string;

  priceAmount:
    unknown | null;

  currency: string;
  billingPeriod: string;

  billingLabel:
    string | null;

  affiliateUrl:
    string | null;

  sourceUrl: string;

  features:
    unknown;

  useCases:
    string[];

  pros:
    string[];

  cons:
    string[];

  editorScore:
    unknown | null;

  lastVerifiedAt:
    Date;

  provider: {
    isPublished:
      boolean;
  };

  category: {
    isPublished:
      boolean;

    ratingCriteria:
      Array<{
        id: string;
      }>;
  };

  ratings:
    Array<{
      criterionId:
        string;
    }>;
};

function validHttpUrl(
  value: string,
) {
  try {
    const url =
      new URL(
        value,
      );

    return (
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
    );
  } catch {
    return false;
  }
}

function isJsonObject(
  value: unknown,
) {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value,
      ),
  );
}

function featureCount(
  value: unknown,
) {
  if (
    !isJsonObject(
      value,
    )
  ) {
    return 0;
  }

  return Object.keys(
    value as Record<
      string,
      unknown
    >,
  ).length;
}

function isFresh(
  date: Date,
) {
  const age =
    Date.now() -
    date.getTime();

  /*
   * Maksymalnie 45 dni.
   * Tolerujemy do 24h
   * przesunięcia w przyszłość.
   */
  return (
    age >= -DAY_MS &&
    age <=
      45 * DAY_MS
  );
}

function calculate(
  offer:
    ReadinessOffer,
): OfferReadiness {
  const activeCriterionIds =
    offer.category.ratingCriteria.map(
      (
        criterion,
      ) =>
        criterion.id,
    );

  const ratingIds =
    new Set(
      offer.ratings.map(
        (
          rating,
        ) =>
          rating.criterionId,
      ),
    );

  const ratingsComplete =
    activeCriterionIds.length >
      0 &&
    activeCriterionIds.every(
      (
        criterionId,
      ) =>
        ratingIds.has(
          criterionId,
        ),
    ) &&
    offer.editorScore !==
      null;

  const price =
    offer.priceAmount ===
      null
      ? null
      : Number(
          offer.priceAmount,
        );

  const isClone =
    offer.name
      .toUpperCase()
      .startsWith(
        "KOPIA —",
      ) ||
    /-kopia(?:-\d+)?$/.test(
      offer.slug,
    );

  const checks:
    OfferReadinessCheck[] =
    [
      {
        key:
          "basic",

        label:
          "Dane podstawowe",

        weight:
          15,

        passed:
          !isClone &&
          offer.name.trim()
            .length > 0 &&
          offer.summary.trim()
            .length >= 20 &&
          offer.description.trim()
            .length >= 80,

        detail:
          isClone
            ? "To nadal kopia robocza. Zmień nazwę i slug."
            : "Nazwa, krótki opis i pełny opis.",
      },

      {
        key:
          "relations",

        label:
          "Kategoria i dostawca",

        weight:
          10,

        passed:
          offer.category
            .isPublished &&
          offer.provider
            .isPublished,

        detail:
          "Kategoria i dostawca muszą być opublikowani.",
      },

      {
        key:
          "source",

        label:
          "Oficjalne źródło",

        weight:
          10,

        passed:
          validHttpUrl(
            offer.sourceUrl,
          ),

        detail:
          "Oferta musi mieć poprawny URL oficjalnego źródła danych.",
      },

      {
        key:
          "price",

        label:
          "Cena i rozliczenie",

        weight:
          15,

        passed:
          price !== null &&
          Number.isFinite(
            price,
          ) &&
          price >= 0 &&
          /^[A-Z]{3}$/.test(
            offer.currency,
          ) &&
          Boolean(
            offer.billingPeriod,
          ) &&
          Boolean(
            offer.billingLabel?.trim(),
          ),

        detail:
          "Cena, waluta, okres i czytelna etykieta rozliczenia.",
      },

      {
        key:
          "features",

        label:
          "Parametry techniczne",

        weight:
          15,

        passed:
          featureCount(
            offer.features,
          ) >= 3,

        detail:
          `${featureCount(
            offer.features,
          )} zapisanych parametrów JSON.`,
      },

      {
        key:
          "editorial",

        label:
          "Treść porównawcza",

        weight:
          10,

        passed:
          offer.useCases
            .length > 0 &&
          offer.pros.length >
            0 &&
          offer.cons.length >
            0,

        detail:
          "Zastosowania, plusy i minusy.",
      },

      {
        key:
          "freshness",

        label:
          "Aktualność danych",

        weight:
          10,

        passed:
          isFresh(
            offer.lastVerifiedAt,
          ),

        detail:
          "Weryfikacja nie starsza niż 45 dni.",
      },

      {
        key:
          "rating",

        label:
          "Kompletna ocena",

        weight:
          15,

        passed:
          ratingsComplete,

        detail:
          activeCriterionIds.length >
          0
            ? `${offer.ratings.length}/${activeCriterionIds.length} zapisanych ocen aktywnych kryteriów.`
            : "Brak aktywnych kryteriów oceny.",
      },
    ];

  const score =
    checks.reduce(
      (
        total,
        check,
      ) =>
        total +
        (check.passed
          ? check.weight
          : 0),
      0,
    );

  return {
    score,

    ready:
      score === 100,

    checks,

    missing:
      checks
        .filter(
          (
            check,
          ) =>
            !check.passed,
        )
        .map(
          (
            check,
          ) =>
            check.label,
        ),

    /*
     * Afiliacja nie wpływa
     * na możliwość publikacji.
     */
    affiliateActive:
      Boolean(
        offer.affiliateUrl,
      ),
  };
}

const readinessSelect = {
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

  billingPeriod:
    true,

  billingLabel:
    true,

  affiliateUrl:
    true,

  sourceUrl:
    true,

  features:
    true,

  useCases:
    true,

  pros:
    true,

  cons:
    true,

  editorScore:
    true,

  lastVerifiedAt:
    true,

  provider: {
    select: {
      isPublished:
        true,
    },
  },

  category: {
    select: {
      isPublished:
        true,

      ratingCriteria: {
        where: {
          isPublished:
            true,
        },

        select: {
          id:
            true,
        },
      },
    },
  },

  ratings: {
    select: {
      criterionId:
        true,
    },
  },
} as const;

export async function getOfferReadinessById(
  offerId: string,
) {
  const offer =
    await prisma.offer.findUnique({
      where: {
        id:
          offerId,
      },

      select:
        readinessSelect,
    });

  if (!offer) {
    return null;
  }

  return calculate(
    offer,
  );
}

export async function getOfferReadinessByIds(
  offerIds: string[],
) {
  if (
    offerIds.length === 0
  ) {
    return new Map<
      string,
      OfferReadiness
    >();
  }

  const offers =
    await prisma.offer.findMany({
      where: {
        id: {
          in:
            offerIds,
        },
      },

      select: {
        id:
          true,

        ...readinessSelect,
      },
    });

  return new Map(
    offers.map(
      (
        offer,
      ) => [
        offer.id,
        calculate(
          offer,
        ),
      ],
    ),
  );
}