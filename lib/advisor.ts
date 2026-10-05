export type AdvisorPriority =
  | "BALANCED"
  | "QUALITY"
  | "PRICE"
  | "FRESHNESS";

export type AdvisorOfferInput = {
  id: string;
  name: string;
  summary: string;
  description: string;

  priceAmount: number | null;
  currency: string;

  editorScore: number | null;

  lastVerifiedAt: Date;

  useCases: string[];

  features: unknown;
};

export type AdvisorOptions = {
  budget: number | null;
  currency: string;

  priority: AdvisorPriority;

  useCase: string;

  requireScore: boolean;

  maxVerificationAgeDays:
    | number
    | null;
};

export type AdvisorResult = {
  offerId: string;

  matchScore: number;

  dataCompleteness: number;

  qualityScore:
    | number
    | null;

  priceScore:
    | number
    | null;

  freshnessScore: number;

  fitScore:
    | number
    | null;

  ageDays: number;

  reasons: string[];
};

type ComponentScores = {
  quality:
    | number
    | null;

  price:
    | number
    | null;

  freshness: number;

  fit:
    | number
    | null;
};

const PRIORITY_WEIGHTS: Record<
  AdvisorPriority,
  {
    quality: number;
    price: number;
    freshness: number;
    fit: number;
  }
> = {
  BALANCED: {
    quality: 0.45,
    price: 0.25,
    freshness: 0.15,
    fit: 0.15,
  },

  QUALITY: {
    quality: 0.65,
    price: 0.1,
    freshness: 0.1,
    fit: 0.15,
  },

  PRICE: {
    quality: 0.25,
    price: 0.5,
    freshness: 0.1,
    fit: 0.15,
  },

  FRESHNESS: {
    quality: 0.3,
    price: 0.15,
    freshness: 0.4,
    fit: 0.15,
  },
};

function clamp(
  value: number,
  min = 0,
  max = 1,
) {
  return Math.min(
    max,
    Math.max(
      min,
      value,
    ),
  );
}

function normalizeText(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function queryTokens(
  value: string,
) {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(" ")
        .map((token) =>
          token.trim(),
        )
        .filter(
          (token) =>
            token.length >= 3,
        ),
    ),
  );
}

function searchableText(
  offer: AdvisorOfferInput,
) {
  let featuresText =
    "";

  try {
    featuresText =
      JSON.stringify(
        offer.features ??
          {},
      );
  } catch {
    featuresText =
      "";
  }

  return normalizeText(
    [
      offer.name,
      offer.summary,
      offer.description,

      ...offer.useCases,

      featuresText,
    ].join(" "),
  );
}

function calculateFitScore(
  offer: AdvisorOfferInput,
  query: string,
) {
  const tokens =
    queryTokens(query);

  if (
    tokens.length === 0
  ) {
    return null;
  }

  const corpus =
    searchableText(
      offer,
    );

  let matched =
    0;

  for (
    const token of tokens
  ) {
    if (
      corpus.includes(
        token,
      )
    ) {
      matched +=
        1;
    }
  }

  return clamp(
    matched /
      tokens.length,
  );
}

function calculateAgeDays(
  date: Date,
) {
  const age =
    Date.now() -
    date.getTime();

  if (age <= 0) {
    return 0;
  }

  return Math.floor(
    age /
      (
        24 *
        60 *
        60 *
        1000
      ),
  );
}

function calculateFreshnessScore(
  ageDays: number,
) {
  /*
   * 1.00 = zweryfikowane dziś.
   * Wynik spada liniowo do 0
   * po 90 dniach.
   */
  return clamp(
    1 -
      ageDays /
        90,
  );
}

function calculatePriceScores(
  offers: AdvisorOfferInput[],
  currency: string,
) {
  const priced =
    offers.filter(
      (offer) =>
        offer.priceAmount !==
          null &&
        offer.currency ===
          currency,
    );

  const prices =
    priced.map(
      (offer) =>
        offer.priceAmount as number,
    );

  const min =
    prices.length > 0
      ? Math.min(
          ...prices,
        )
      : null;

  const max =
    prices.length > 0
      ? Math.max(
          ...prices,
        )
      : null;

  const scores =
    new Map<
      string,
      number | null
    >();

  for (
    const offer of offers
  ) {
    if (
      offer.priceAmount ===
        null ||
      offer.currency !==
        currency ||
      min === null ||
      max === null
    ) {
      scores.set(
        offer.id,
        null,
      );

      continue;
    }

    if (max === min) {
      scores.set(
        offer.id,
        1,
      );

      continue;
    }

    const score =
      1 -
      (
        offer.priceAmount -
        min
      ) /
        (
          max -
          min
        );

    scores.set(
      offer.id,
      clamp(score),
    );
  }

  return scores;
}

function availableWeight(
  components: ComponentScores,
  weights: {
    quality: number;
    price: number;
    freshness: number;
    fit: number;
  },
  fitRequested: boolean,
) {
  let available =
    weights.freshness;

  let expected =
    weights.quality +
    weights.price +
    weights.freshness;

  if (
    components.quality !==
    null
  ) {
    available +=
      weights.quality;
  }

  if (
    components.price !==
    null
  ) {
    available +=
      weights.price;
  }

  if (fitRequested) {
    expected +=
      weights.fit;

    if (
      components.fit !==
      null
    ) {
      available +=
        weights.fit;
    }
  }

  if (
    expected === 0
  ) {
    return 1;
  }

  return clamp(
    available /
      expected,
  );
}

function weightedScore(
  components: ComponentScores,
  weights: {
    quality: number;
    price: number;
    freshness: number;
    fit: number;
  },
  fitRequested: boolean,
) {
  let score =
    0;

  let usedWeight =
    0;

  if (
    components.quality !==
    null
  ) {
    score +=
      components.quality *
      weights.quality;

    usedWeight +=
      weights.quality;
  }

  if (
    components.price !==
    null
  ) {
    score +=
      components.price *
      weights.price;

    usedWeight +=
      weights.price;
  }

  score +=
    components.freshness *
    weights.freshness;

  usedWeight +=
    weights.freshness;

  if (
    fitRequested &&
    components.fit !==
      null
  ) {
    score +=
      components.fit *
      weights.fit;

    usedWeight +=
      weights.fit;
  }

  if (
    usedWeight === 0
  ) {
    return 0;
  }

  return clamp(
    score /
      usedWeight,
  );
}

function buildReasons(
  offer: AdvisorOfferInput,
  options: AdvisorOptions,
  components: ComponentScores,
  ageDays: number,
) {
  const reasons:
    string[] = [];

  if (
    offer.editorScore !==
    null
  ) {
    reasons.push(
      `Ocena Narzivo ${offer.editorScore.toFixed(
        1,
      )}/10`,
    );
  }

  if (
    options.budget !==
      null &&
    offer.priceAmount !==
      null &&
    offer.currency ===
      options.currency &&
    offer.priceAmount <=
      options.budget
  ) {
    reasons.push(
      "Cena mieści się w określonym budżecie",
    );
  }

  if (
    components.fit !==
      null &&
    components.fit >
      0
  ) {
    reasons.push(
      `Dopasowanie do potrzeby: ${Math.round(
        components.fit *
          100,
      )}%`,
    );
  }

  if (
    ageDays <= 7
  ) {
    reasons.push(
      "Dane zweryfikowane w ostatnich 7 dniach",
    );
  } else if (
    ageDays <= 30
  ) {
    reasons.push(
      "Aktualna weryfikacja danych",
    );
  }

  if (
    components.price !==
      null &&
    components.price >=
      0.75
  ) {
    reasons.push(
      "Konkurencyjna cena na tle wyników",
    );
  }

  return reasons.slice(
    0,
    4,
  );
}

export function rankAdvisorOffers(
  allOffers: AdvisorOfferInput[],
  options: AdvisorOptions,
): AdvisorResult[] {
  let offers =
    allOffers.filter(
      (offer) => {
        const ageDays =
          calculateAgeDays(
            offer.lastVerifiedAt,
          );

        if (
          options.requireScore &&
          offer.editorScore ===
            null
        ) {
          return false;
        }

        if (
          options.maxVerificationAgeDays !==
            null &&
          ageDays >
            options.maxVerificationAgeDays
        ) {
          return false;
        }

        if (
          options.budget !==
          null
        ) {
          /*
           * Przy ustawionym budżecie
           * nie zgadujemy ceny.
           */
          if (
            offer.priceAmount ===
            null
          ) {
            return false;
          }

          if (
            offer.currency !==
            options.currency
          ) {
            return false;
          }

          if (
            offer.priceAmount >
            options.budget
          ) {
            return false;
          }
        }

        return true;
      },
    );

  const priceScores =
    calculatePriceScores(
      offers,
      options.currency,
    );

  const weights =
    PRIORITY_WEIGHTS[
      options.priority
    ];

  const fitRequested =
    queryTokens(
      options.useCase,
    ).length > 0;

  const results =
    offers.map(
      (
        offer,
      ): AdvisorResult => {
        const ageDays =
          calculateAgeDays(
            offer.lastVerifiedAt,
          );

        const components:
          ComponentScores =
          {
            quality:
              offer.editorScore !==
              null
                ? clamp(
                    offer.editorScore /
                      10,
                  )
                : null,

            price:
              priceScores.get(
                offer.id,
              ) ?? null,

            freshness:
              calculateFreshnessScore(
                ageDays,
              ),

            fit:
              calculateFitScore(
                offer,
                options.useCase,
              ),
          };

        const baseScore =
          weightedScore(
            components,
            weights,
            fitRequested,
          );

        const completeness =
          availableWeight(
            components,
            weights,
            fitRequested,
          );

        /*
         * Niepełne dane nadal mogą dać
         * wynik, ale nie powinny łatwo
         * wyprzedzać ofert ocenionych
         * kompletnie.
         */
        const confidenceFactor =
          0.7 +
          completeness *
            0.3;

        const finalScore =
          clamp(
            baseScore *
              confidenceFactor,
          );

        return {
          offerId:
            offer.id,

          matchScore:
            Math.round(
              finalScore *
                100,
            ),

          dataCompleteness:
            Math.round(
              completeness *
                100,
            ),

          qualityScore:
            components.quality !==
            null
              ? Math.round(
                  components.quality *
                    100,
                )
              : null,

          priceScore:
            components.price !==
            null
              ? Math.round(
                  components.price *
                    100,
                )
              : null,

          freshnessScore:
            Math.round(
              components.freshness *
                100,
            ),

          fitScore:
            components.fit !==
            null
              ? Math.round(
                  components.fit *
                    100,
                )
              : null,

          ageDays,

          reasons:
            buildReasons(
              offer,
              options,
              components,
              ageDays,
            ),
        };
      },
    );

  return results.sort(
    (a, b) => {
      if (
        b.matchScore !==
        a.matchScore
      ) {
        return (
          b.matchScore -
          a.matchScore
        );
      }

      const offerA =
        offers.find(
          (offer) =>
            offer.id ===
            a.offerId,
        );

      const offerB =
        offers.find(
          (offer) =>
            offer.id ===
            b.offerId,
        );

      const qualityA =
        offerA?.editorScore ??
        -1;

      const qualityB =
        offerB?.editorScore ??
        -1;

      if (
        qualityB !==
        qualityA
      ) {
        return (
          qualityB -
          qualityA
        );
      }

      const priceA =
        offerA?.priceAmount ??
        Number.POSITIVE_INFINITY;

      const priceB =
        offerB?.priceAmount ??
        Number.POSITIVE_INFINITY;

      return (
        priceA -
        priceB
      );
    },
  );
}