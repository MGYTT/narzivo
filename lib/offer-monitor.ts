import "server-only";

import type {
  Prisma,
} from "@/generated/prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  inspectOfferUrl,
} from "@/lib/offer-importer";

import {
  autoRateOfferById,
} from "@/lib/auto-rating";

type JsonObject =
  Record<string, unknown>;

type StringMap =
  Record<string, string>;

const FEATURE_ALIASES:
  Record<string, string> = {
    dysk_bazowy:
      "dysk",

    maksymalny_dysk:
      "dysk_maksymalny",

    ram_bazowy:
      "ram",

    cpu_bazowe:
      "cpu",

    cpu_gwarantowane:
      "cpu",

    cpu_maksymalne:
      "cpu_maksymalny",

    cpu_dynamiczne:
      "cpu_maksymalny",

    backup_systemowy:
      "backup",

    ochrona_ddos:
      "antyddos",
  };

const CANONICAL_ALIASES:
  Record<
    string,
    string[]
  > = {
    dysk: [
      "dysk_bazowy",
    ],

    dysk_maksymalny: [
      "maksymalny_dysk",
    ],

    ram: [
      "ram_bazowy",
    ],

    cpu: [
      "cpu_bazowe",
      "cpu_gwarantowane",
    ],

    cpu_maksymalny: [
      "cpu_maksymalne",
      "cpu_dynamiczne",
    ],

    backup: [
      "backup_systemowy",
    ],

    antyddos: [
      "ochrona_ddos",
    ],
  };

function jsonObject(
  value: unknown,
): JsonObject {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as JsonObject;
  }

  return {};
}

function stringValue(
  value: unknown,
) {
  if (
    typeof value ===
      "string"
  ) {
    return value.trim();
  }

  if (
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value,
    );
  }

  return "";
}

function comparable(
  value: unknown,
) {
  return stringValue(
    value,
  )
    .toLowerCase()
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function canonicalKey(
  key: string,
) {
  return (
    FEATURE_ALIASES[
      key
    ] ??
    key
  );
}

function canonicalFeatures(
  value: unknown,
) {
  const input =
    jsonObject(
      value,
    );

  const output:
    StringMap = {};

  for (
    const [
      rawKey,
      rawValue,
    ] of Object.entries(
      input,
    )
  ) {
    const valueText =
      stringValue(
        rawValue,
      );

    if (!valueText) {
      continue;
    }

    const key =
      canonicalKey(
        rawKey,
      );

    /*
     * Kanoniczny klucz
     * ma pierwszeństwo
     * przed aliasem.
     */
    if (
      rawKey === key ||
      !output[
        key
      ]
    ) {
      output[
        key
      ] =
        valueText;
    }
  }

  return output;
}

function mergeFeatures(
  current:
    unknown,
  detected:
    unknown,
) {
  const result =
    {
      ...jsonObject(
        current,
      ),
    };

  const detectedFeatures =
    canonicalFeatures(
      detected,
    );

  for (
    const [
      key,
      value,
    ] of Object.entries(
      detectedFeatures,
    )
  ) {
    for (
      const alias of
        CANONICAL_ALIASES[
          key
        ] ??
        []
    ) {
      delete result[
        alias
      ];
    }

    result[
      key
    ] =
      value;
  }

  return result as Prisma.InputJsonValue;
}

function numberOrNull(
  value: unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }

  const number =
    Number(
      value,
    );

  return Number.isFinite(
    number,
  )
    ? number
    : null;
}

function hasOwn(
  object:
    JsonObject,
  key: string,
) {
  return Object.prototype.hasOwnProperty.call(
    object,
    key,
  );
}

function diffCount(
  diff:
    JsonObject,
) {
  let count =
    0;

  for (
    const [
      key,
      value,
    ] of Object.entries(
      diff,
    )
  ) {
    if (
      key ===
        "features" &&
      value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value,
      )
    ) {
      count +=
        Object.keys(
          value,
        ).length;
    } else {
      count +=
        1;
    }
  }

  return count;
}

export async function scanOfferForChanges(
  offerId: string,
) {
  const offer =
    await prisma.offer.findUnique({
      where: {
        id:
          offerId,
      },

      include: {
        category: {
          select: {
            slug:
              true,
          },
        },

        provider: {
          select: {
            id:
              true,
          },
        },
      },
    });

  if (!offer) {
    throw new Error(
      "Oferta nie istnieje.",
    );
  }

  const imported =
    await inspectOfferUrl({
      sourceUrl:
        offer.sourceUrl,

      variantName:
        offer.name,

      categorySlug:
        offer.category.slug,
    });

  if (
    imported.providerId !==
    offer.providerId
  ) {
    throw new Error(
      "Importer wykrył innego dostawcę niż zapisany przy ofercie.",
    );
  }

  if (
    imported.priceAmount ===
      null &&
    imported.featureCount ===
      0 &&
    !imported.billingLabel
  ) {
    throw new Error(
      "Nie udało się odczytać wystarczających danych do porównania.",
    );
  }

  const currentFeatures =
    canonicalFeatures(
      offer.features,
    );

  const detectedFeatures =
    canonicalFeatures(
      imported.features,
    );

  const diff:
    JsonObject = {};

  const currentPrice =
    numberOrNull(
      offer.priceAmount,
    );

  if (
    imported.priceAmount !==
      null &&
    currentPrice !==
      imported.priceAmount
  ) {
    diff.priceAmount = {
      from:
        currentPrice,

      to:
        imported.priceAmount,
    };
  }

  if (
    imported.priceAmount !==
      null &&
    imported.currency !==
      offer.currency
  ) {
    diff.currency = {
      from:
        offer.currency,

      to:
        imported.currency,
    };
  }

  if (
    imported.priceAmount !==
      null &&
    imported.billingPeriod !==
      "CUSTOM" &&
    imported.billingPeriod !==
      offer.billingPeriod
  ) {
    diff.billingPeriod = {
      from:
        offer.billingPeriod,

      to:
        imported.billingPeriod,
    };
  }

  if (
    imported.billingLabel &&
    comparable(
      imported.billingLabel,
    ) !==
      comparable(
        offer.billingLabel,
      )
  ) {
    diff.billingLabel = {
      from:
        offer.billingLabel,

      to:
        imported.billingLabel,
    };
  }

  const featureDiff:
    JsonObject = {};

  for (
    const [
      key,
      detectedValue,
    ] of Object.entries(
      detectedFeatures,
    )
  ) {
    const currentValue =
      currentFeatures[
        key
      ] ??
      null;

    if (
      comparable(
        currentValue,
      ) !==
      comparable(
        detectedValue,
      )
    ) {
      featureDiff[
        key
      ] = {
        from:
          currentValue,

        to:
          detectedValue,
      };
    }
  }

  if (
    Object.keys(
      featureDiff,
    ).length >
    0
  ) {
    diff.features =
      featureDiff;
  }

  const changes =
    diffCount(
      diff,
    );

  /*
   * Brak zmian.
   *
   * Przy sensownym poziomie
   * pewności możemy automatycznie
   * odświeżyć lastVerifiedAt.
   */
  if (
    changes ===
    0
  ) {
    if (
      imported.confidence >=
      60
    ) {
      await prisma.offer.update({
        where: {
          id:
            offer.id,
        },

        data: {
          lastVerifiedAt:
            new Date(),
        },
      });
    }

    return {
      offerId:
        offer.id,

      changed:
        false,

      changeId:
        null,

      confidence:
        imported.confidence,

      changes:
        0,
    };
  }

  const currentSnapshot = {
    offerUpdatedAt:
      offer.updatedAt.toISOString(),

    priceAmount:
      currentPrice,

    currency:
      offer.currency,

    billingPeriod:
      offer.billingPeriod,

    billingLabel:
      offer.billingLabel,

    features:
      currentFeatures,
  };

  const detectedSnapshot = {
    sourceUrl:
      imported.sourceUrl,

    confidence:
      imported.confidence,

    ...(imported.priceAmount !==
    null
      ? {
          priceAmount:
            imported.priceAmount,

          currency:
            imported.currency,
        }
      : {}),

    ...(imported.billingPeriod !==
    "CUSTOM"
      ? {
          billingPeriod:
            imported.billingPeriod,
        }
      : {}),

    ...(imported.billingLabel
      ? {
          billingLabel:
            imported.billingLabel,
        }
      : {}),

    features:
      detectedFeatures,
  };

  const existing =
    await prisma.offerChangeReview.findFirst({
      where: {
        offerId:
          offer.id,

        status:
          "PENDING",
      },

      orderBy: {
        detectedAt:
          "desc",
      },
    });

  const data = {
    sourceUrl:
      imported.sourceUrl,

    currentSnapshot:
      currentSnapshot as Prisma.InputJsonValue,

    detectedSnapshot:
      detectedSnapshot as Prisma.InputJsonValue,

    diff:
      diff as Prisma.InputJsonValue,

    detectedAt:
      new Date(),
  };

  const review =
    existing
      ? await prisma.offerChangeReview.update({
          where: {
            id:
              existing.id,
          },

          data,
        })
      : await prisma.offerChangeReview.create({
          data: {
            offerId:
              offer.id,

            ...data,
          },
        });

  return {
    offerId:
      offer.id,

    changed:
      true,

    changeId:
      review.id,

    confidence:
      imported.confidence,

    changes,
  };
}

export async function scanOffersForChanges(
  limit =
    10,
) {
  const candidates =
    await prisma.offer.findMany({
      orderBy: {
        lastVerifiedAt:
          "asc",
      },

      select: {
        id:
          true,

        name:
          true,
      },

      take:
        Math.max(
          limit * 2,
          limit,
        ),
    });

  const offers =
    candidates
      .filter(
        (
          offer,
        ) =>
          !offer.name
            .toUpperCase()
            .startsWith(
              "KOPIA —",
            ),
      )
      .slice(
        0,
        limit,
      );

  let changed =
    0;

  let unchanged =
    0;

  let failed =
    0;

  const failures:
    Array<{
      offerId: string;
      name: string;
      message: string;
    }> = [];

  for (
    const offer of offers
  ) {
    try {
      const result =
        await scanOfferForChanges(
          offer.id,
        );

      if (
        result.changed
      ) {
        changed +=
          1;
      } else {
        unchanged +=
          1;
      }
    } catch (
      error
    ) {
      failed +=
        1;

      failures.push({
        offerId:
          offer.id,

        name:
          offer.name,

        message:
          error instanceof Error
            ? error.message
            : "Nieznany błąd.",
      });
    }
  }

  return {
    checked:
      offers.length,

    changed,

    unchanged,

    failed,

    failures,
  };
}

export async function approveOfferChange(
  changeId: string,
) {
  const review =
    await prisma.offerChangeReview.findUnique({
      where: {
        id:
          changeId,
      },

      include: {
        offer: {
          include: {
            category: {
              select: {
                slug:
                  true,
              },
            },
          },
        },
      },
    });

  if (!review) {
    throw new Error(
      "Zmiana nie istnieje.",
    );
  }

  if (
    review.status !==
    "PENDING"
  ) {
    throw new Error(
      "Ta zmiana została już rozpatrzona.",
    );
  }

  const currentSnapshot =
    jsonObject(
      review.currentSnapshot,
    );

  const detectedSnapshot =
    jsonObject(
      review.detectedSnapshot,
    );

  /*
   * Jeżeli administrator edytował
   * ofertę po wykryciu zmiany,
   * nie możemy nakładać starego
   * snapshotu.
   */
  if (
    stringValue(
      currentSnapshot.offerUpdatedAt,
    ) !==
    review.offer.updatedAt.toISOString()
  ) {
    throw new Error(
      "Oferta została zmieniona od czasu skanu. Wykonaj ponowną weryfikację.",
    );
  }

  const updateData:
    Prisma.OfferUncheckedUpdateInput =
    {
      lastVerifiedAt:
        new Date(),
    };

  if (
    hasOwn(
      detectedSnapshot,
      "priceAmount",
    )
  ) {
    updateData.priceAmount =
      numberOrNull(
        detectedSnapshot.priceAmount,
      );
  }

  if (
    hasOwn(
      detectedSnapshot,
      "currency",
    )
  ) {
    updateData.currency =
      stringValue(
        detectedSnapshot.currency,
      );
  }

  if (
    hasOwn(
      detectedSnapshot,
      "billingLabel",
    )
  ) {
    updateData.billingLabel =
      stringValue(
        detectedSnapshot.billingLabel,
      ) ||
      null;
  }

  if (
    hasOwn(
      detectedSnapshot,
      "billingPeriod",
    )
  ) {
    const period =
      stringValue(
        detectedSnapshot.billingPeriod,
      );

    if (
      [
        "ONE_TIME",
        "MONTH",
        "YEAR",
        "CUSTOM",
      ].includes(
        period,
      )
    ) {
      updateData.billingPeriod =
        period as Prisma.OfferUncheckedUpdateInput["billingPeriod"];
    }
  }

  const detectedFeatures =
    jsonObject(
      detectedSnapshot.features,
    );

  if (
    Object.keys(
      detectedFeatures,
    ).length >
    0
  ) {
    updateData.features =
      mergeFeatures(
        review.offer.features,
        detectedFeatures,
      );
  }

  const oldPrice =
    numberOrNull(
      review.offer.priceAmount,
    );

  const newPrice =
    hasOwn(
      detectedSnapshot,
      "priceAmount",
    )
      ? numberOrNull(
          detectedSnapshot.priceAmount,
        )
      : oldPrice;

  const newCurrency =
    hasOwn(
      detectedSnapshot,
      "currency",
    )
      ? stringValue(
          detectedSnapshot.currency,
        )
      : review.offer.currency;

  const priceChanged =
    oldPrice !==
      newPrice ||
    review.offer.currency !==
      newCurrency;

  await prisma.$transaction(
    async (
      tx,
    ) => {
      await tx.offer.update({
        where: {
          id:
            review.offerId,
        },

        data:
          updateData,
      });

      if (
        priceChanged
      ) {
        await tx.offerPriceHistory.create({
          data: {
            offerId:
              review.offerId,

            priceAmount:
              newPrice,

            regularPrice:
              review.offer.regularPrice,

            currency:
              newCurrency,
          },
        });
      }

      await tx.offerChangeReview.update({
        where: {
          id:
            review.id,
        },

        data: {
          status:
            "APPROVED",

          reviewedAt:
            new Date(),
        },
      });

      /*
       * Starsze oczekujące
       * snapshoty tej samej oferty
       * stają się nieaktualne.
       */
      await tx.offerChangeReview.updateMany({
        where: {
          offerId:
            review.offerId,

          status:
            "PENDING",

          id: {
            not:
              review.id,
          },
        },

        data: {
          status:
            "REJECTED",

          reviewedAt:
            new Date(),
        },
      });
    },
  );

  if (
    review.offer.category.slug ===
    "hosting-www"
  ) {
    await autoRateOfferById(
      review.offerId,
    );
  }

  return {
    offerId:
      review.offerId,
  };
}

export async function rejectOfferChange(
  changeId: string,
) {
  const review =
    await prisma.offerChangeReview.findUnique({
      where: {
        id:
          changeId,
      },

      select: {
        id:
          true,

        status:
          true,
      },
    });

  if (!review) {
    throw new Error(
      "Zmiana nie istnieje.",
    );
  }

  if (
    review.status !==
    "PENDING"
  ) {
    return;
  }

  await prisma.offerChangeReview.update({
    where: {
      id:
        review.id,
    },

    data: {
      status:
        "REJECTED",

      reviewedAt:
        new Date(),
    },
  });
}