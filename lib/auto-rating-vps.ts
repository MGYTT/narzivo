import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  recomputeOfferScore,
} from "@/lib/rating";

import {
  AUTO_RATING_PREFIX,
  isAutomaticRatingNote,
} from "@/lib/auto-rating";

const SUPPORTED_CATEGORY_SLUG =
  "vps-cloud-server";

const SUPPORTED_CRITERIA =
  new Set([
    "cena-wartosc",
    "cpu-ram",
    "dysk-transfer",
    "backup-niezawodnosc",
    "bezpieczenstwo",
    "zarzadzanie-wsparcie",
    "skalowalnosc",
    "elastycznosc-platformy",
  ]);

type FeatureMap =
  Record<
    string,
    unknown
  >;

type ScorableOffer = {
  id: string;

  name: string;
  summary: string;
  description: string;

  categoryId: string;

  priceAmount:
    | unknown
    | null;

  regularPrice:
    | unknown
    | null;

  currency: string;
  billingPeriod: string;

  billingLabel:
    | string
    | null;

  sourceUrl: string;

  features: unknown;

  useCases: string[];
  pros: string[];
  cons: string[];

  lastVerifiedAt: Date;

  category: {
    name: string;
    slug: string;
  };

  ratings: Array<{
    criterionId: string;

    note:
      | string
      | null;
  }>;
};

type RatingCriterionInput = {
  id: string;
  key: string;
  name: string;
  isPublished: boolean;
};

type CriterionResult = {
  score: number;
  note: string;
};

export type AutoVpsRatingResult = {
  offerId: string;
  generated: number;
  skippedManual: number;
};

export type AutoVpsCategoryRatingResult = {
  offers: number;
  generated: number;
  skippedManual: number;
};

function clamp(
  value: number,
  min = 0,
  max = 10,
) {
  return Math.min(
    max,
    Math.max(
      min,
      value,
    ),
  );
}

function roundScore(
  value: number,
) {
  return (
    Math.round(
      clamp(
        value,
      ) * 10,
    ) / 10
  );
}

function normalizeText(
  value: string,
) {
  return value
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
      /\s+/g,
      " ",
    )
    .trim();
}

function featuresObject(
  value: unknown,
): FeatureMap {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as FeatureMap;
  }

  return {};
}

function valueText(
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

function featureText(
  features: FeatureMap,
  ...keys: string[]
) {
  for (
    const key of keys
  ) {
    const value =
      valueText(
        features[
          key
        ],
      );

    if (value) {
      return value;
    }
  }

  return "";
}

function containsAny(
  text: string,
  values: string[],
) {
  const normalized =
    normalizeText(
      text,
    );

  return values.some(
    (
      value,
    ) =>
      normalized.includes(
        normalizeText(
          value,
        ),
      ),
  );
}

function offerCorpus(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
) {
  return normalizeText(
    [
      offer.name,

      offer.summary,

      offer.description,

      offer.billingLabel ??
        "",

      ...offer.useCases,
      ...offer.pros,
      ...offer.cons,

      JSON.stringify(
        features,
      ),
    ].join(
      " ",
    ),
  );
}

function parseNumber(
  raw: string,
) {
  if (!raw) {
    return null;
  }

  const cleaned =
    raw
      .replace(
        /\s/g,
        "",
      )
      .replace(
        ",",
        ".",
      )
      .replace(
        /[^0-9.]/g,
        "",
      );

  if (!cleaned) {
    return null;
  }

  const value =
    Number(
      cleaned,
    );

  return Number.isFinite(
    value,
  )
    ? value
    : null;
}

function parseCapacityGb(
  raw: string,
) {
  if (!raw) {
    return null;
  }

  const text =
    normalizeText(
      raw,
    );

  const match =
    text.match(
      /([0-9]+(?:[.,][0-9]+)?)\s*(tb|gb|mb)/,
    );

  if (!match) {
    return null;
  }

  const value =
    parseNumber(
      match[1],
    );

  if (
    value === null
  ) {
    return null;
  }

  switch (
    match[2]
  ) {
    case "tb":
      return (
        value *
        1024
      );

    case "mb":
      return (
        value /
        1024
      );

    default:
      return value;
  }
}

function featureEnabled(
  features:
    FeatureMap,
  ...keys: string[]
) {
  const raw =
    featureText(
      features,
      ...keys,
    );

  if (!raw) {
    return false;
  }

  const normalized =
    normalizeText(
      raw,
    );

  return ![
    "nie",
    "false",
    "brak",
    "0",
  ].includes(
    normalized,
  );
}

function parseCpuCores(
  features:
    FeatureMap,
) {
  const raw =
    featureText(
      features,
      "vcpu",
      "cpu",
      "cpu_gwarantowane",
      "cpu_bazowe",
    );

  if (!raw) {
    return {
      raw: "",
      cores: null,
    };
  }

  const match =
    raw.match(
      /([0-9]+(?:[.,][0-9]+)?)/,
    );

  return {
    raw,

    cores:
      match
        ? parseNumber(
            match[1],
          )
        : null,
  };
}

function money(
  value: number,
  currency:
    string,
) {
  return `${value.toLocaleString(
    "pl-PL",
    {
      maximumFractionDigits:
        2,
    },
  )} ${currency}`;
}

function annualPrice(
  amount: number,
  billingPeriod:
    string,
) {
  switch (
    billingPeriod
  ) {
    case "MONTH":
      return (
        amount *
        12
      );

    case "YEAR":
      return amount;

    case "ONE_TIME":
      return amount;

    default:
      return amount;
  }
}

function labelAnnualPrice(
  label:
    | string
    | null,
) {
  if (!label) {
    return null;
  }

  const normalized =
    normalizeText(
      label,
    );

  const match =
    normalized.match(
      /(?:standardowo|odnowieni[a-z]*)[^0-9]{0,40}([0-9]+(?:[.,][0-9]+)?)\s*(?:zl|pln)([^;]*)/,
    );

  if (!match) {
    return null;
  }

  const amount =
    parseNumber(
      match[1],
    );

  if (
    amount === null
  ) {
    return null;
  }

  const unit =
    match[2] ??
    "";

  if (
    /mies/.test(
      unit,
    )
  ) {
    return (
      amount *
      12
    );
  }

  return amount;
}

function effectiveAnnualPrices(
  offer:
    ScorableOffer,
) {
  const price =
    offer.priceAmount ===
      null
      ? null
      : Number(
          offer.priceAmount,
        );

  if (
    price === null ||
    !Number.isFinite(
      price,
    )
  ) {
    return null;
  }

  const introAnnual =
    annualPrice(
      price,
      offer.billingPeriod,
    );

  const regular =
    offer.regularPrice ===
      null
      ? null
      : Number(
          offer.regularPrice,
        );

  let regularAnnual:
    number;

  if (
    regular !== null &&
    Number.isFinite(
      regular,
    )
  ) {
    regularAnnual =
      annualPrice(
        regular,
        offer.billingPeriod,
      );
  } else {
    regularAnnual =
      labelAnnualPrice(
        offer.billingLabel,
      ) ??
      introAnnual;
  }

  /*
   * Średni koszt roczny
   * w perspektywie 3 lat.
   */
  const averageAnnual =
    (
      introAnnual +
      regularAnnual *
        2
    ) / 3;

  return {
    introAnnual,

    regularAnnual,

    averageAnnual,

    averageMonthly:
      averageAnnual /
      12,
  };
}

/* =========================================================
   PRICE / VALUE
========================================================= */

function monthlyCostScore(
  monthly:
    number,
) {
  if (
    monthly <= 50
  ) {
    return 10;
  }

  if (
    monthly <= 100
  ) {
    return 9.3;
  }

  if (
    monthly <= 200
  ) {
    return 8.4;
  }

  if (
    monthly <= 300
  ) {
    return 7.5;
  }

  if (
    monthly <= 450
  ) {
    return 6.5;
  }

  if (
    monthly <= 650
  ) {
    return 5.5;
  }

  if (
    monthly <= 900
  ) {
    return 4.5;
  }

  if (
    monthly <= 1200
  ) {
    return 3.5;
  }

  if (
    monthly <= 1600
  ) {
    return 2.5;
  }

  return 1.5;
}

function priceJumpPenalty(
  ratio: number,
) {
  if (
    ratio <= 1.25
  ) {
    return 0;
  }

  if (
    ratio <= 2
  ) {
    return 0.2;
  }

  if (
    ratio <= 3
  ) {
    return 0.5;
  }

  if (
    ratio <= 5
  ) {
    return 0.9;
  }

  return 1.3;
}

function scorePriceValue(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
): CriterionResult {
  const prices =
    effectiveAnnualPrices(
      offer,
    );

  if (!prices) {
    return {
      score: 5,

      note:
        "Brak wystarczających danych liczbowych o cenie. Przyznano neutralną ocenę 5/10.",
    };
  }

  const {
    cores,
  } =
    parseCpuCores(
      features,
    );

  const ramGb =
    parseCapacityGb(
      featureText(
        features,
        "ram",
      ),
    );

  const resourceUnits =
    (
      cores ??
      0
    ) *
      2 +
    (
      ramGb ??
      0
    ) /
      2;

  /*
   * Prosty wskaźnik zasobów
   * do średniego kosztu miesięcznego.
   *
   * Nie bierze pod uwagę afiliacji,
   * prowizji ani pozycji handlowej.
   */
  const efficiency =
    prices.averageMonthly >
      0
      ? (
          resourceUnits /
          prices.averageMonthly
        ) *
        100
      : 0;

  let valueAdjustment =
    0;

  if (
    efficiency >= 5
  ) {
    valueAdjustment =
      1;
  } else if (
    efficiency >= 3
  ) {
    valueAdjustment =
      0.7;
  } else if (
    efficiency >= 2
  ) {
    valueAdjustment =
      0.4;
  } else if (
    efficiency >= 1
  ) {
    valueAdjustment =
      0.1;
  } else if (
    resourceUnits >
    0
  ) {
    valueAdjustment =
      -0.3;
  }

  const priceRatio =
    prices.introAnnual >
      0
      ? prices.regularAnnual /
        prices.introAnnual
      : 1;

  const score =
    roundScore(
      monthlyCostScore(
        prices.averageMonthly,
      ) +
        valueAdjustment -
        priceJumpPenalty(
          priceRatio,
        ),
    );

  return {
    score,

    note:
      `Cena pierwszego roku: ${money(
        prices.introAnnual,
        offer.currency,
      )}. ` +
      `Koszt kolejnego roku: ${money(
        prices.regularAnnual,
        offer.currency,
      )}. ` +
      `Średni koszt miesięczny w perspektywie 3 lat: ${money(
        prices.averageMonthly,
        offer.currency,
      )}. ` +
      `Uwzględniono również relację zapisanych zasobów CPU/RAM do kosztu oraz ewentualny wzrost ceny po okresie promocyjnym.`,
  };
}

/* =========================================================
   CPU + RAM
========================================================= */

function cpuScore(
  cores:
    number
    | null,
) {
  if (
    cores === null
  ) {
    return 5.5;
  }

  if (
    cores >= 16
  ) {
    return 10;
  }

  if (
    cores >= 8
  ) {
    return 9.2;
  }

  if (
    cores >= 4
  ) {
    return 8;
  }

  if (
    cores >= 2
  ) {
    return 6.5;
  }

  if (
    cores >= 1
  ) {
    return 4.5;
  }

  return 2;
}

function ramScore(
  ramGb:
    number
    | null,
) {
  if (
    ramGb === null
  ) {
    return 5.5;
  }

  if (
    ramGb >= 32
  ) {
    return 10;
  }

  if (
    ramGb >= 16
  ) {
    return 9;
  }

  if (
    ramGb >= 8
  ) {
    return 7.8;
  }

  if (
    ramGb >= 4
  ) {
    return 6;
  }

  if (
    ramGb >= 2
  ) {
    return 4.5;
  }

  return 3;
}

function scoreCpuRam(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
): CriterionResult {
  const cpu =
    parseCpuCores(
      features,
    );

  const ramRaw =
    featureText(
      features,
      "ram",
    );

  const ramGb =
    parseCapacityGb(
      ramRaw,
    );

  const processor =
    featureText(
      features,
      "procesor",
    );

  let technologyBonus =
    0;

  const bonuses:
    string[] = [];

  if (
    containsAny(
      processor,
      [
        "amd epyc",
        "epyc",
      ],
    )
  ) {
    technologyBonus +=
      0.3;

    bonuses.push(
      "AMD EPYC",
    );
  }

  if (
    containsAny(
      ramRaw,
      [
        "ecc",
      ],
    )
  ) {
    technologyBonus +=
      0.2;

    bonuses.push(
      "RAM ECC",
    );
  }

  const score =
    roundScore(
      cpuScore(
        cpu.cores,
      ) *
        0.55 +
        ramScore(
          ramGb,
        ) *
          0.45 +
        technologyBonus,
    );

  return {
    score,

    note:
      `Wykryte zasoby: CPU ${cpu.raw || "brak jednoznacznych danych"}, ` +
      `RAM ${ramRaw || "brak jednoznacznych danych"}. ` +
      (
        bonuses.length >
        0
          ? `Dodatkowo uwzględniono: ${bonuses.join(
              ", ",
            )}.`
          : "Nie zastosowano dodatkowego bonusu technologicznego."
      ),
  };
}

/* =========================================================
   DISK + TRANSFER
========================================================= */

function diskScore(
  diskGb:
    number
    | null,
) {
  if (
    diskGb === null
  ) {
    return 6;
  }

  if (
    diskGb >= 400
  ) {
    return 10;
  }

  if (
    diskGb >= 200
  ) {
    return 9;
  }

  if (
    diskGb >= 100
  ) {
    return 8;
  }

  if (
    diskGb >= 50
  ) {
    return 6.8;
  }

  if (
    diskGb >= 25
  ) {
    return 5.5;
  }

  return 4;
}

function transferScore(
  transferRaw:
    string,
) {
  if (!transferRaw) {
    /*
     * Brak informacji nie oznacza
     * braku transferu.
     */
    return 6;
  }

  const normalized =
    normalizeText(
      transferRaw,
    );

  if (
    normalized.includes(
      "bez limitu",
    ) ||
    normalized.includes(
      "unlimited",
    )
  ) {
    return 10;
  }

  const transferGb =
    parseCapacityGb(
      transferRaw,
    );

  if (
    transferGb === null
  ) {
    return 6;
  }

  if (
    transferGb >=
    20 * 1024
  ) {
    return 10;
  }

  if (
    transferGb >=
    10 * 1024
  ) {
    return 9;
  }

  if (
    transferGb >=
    5 * 1024
  ) {
    return 8;
  }

  if (
    transferGb >=
    1024
  ) {
    return 6.5;
  }

  return 5;
}

function scoreDiskTransfer(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
): CriterionResult {
  const diskRaw =
    featureText(
      features,
      "dysk",
    );

  const transferRaw =
    featureText(
      features,
      "transfer",
    );

  const diskGb =
    parseCapacityGb(
      diskRaw,
    );

  let bonus =
    0;

  const extras:
    string[] = [];

  if (
    containsAny(
      diskRaw,
      [
        "nvme",
      ],
    )
  ) {
    bonus +=
      0.4;

    extras.push(
      "NVMe",
    );
  } else if (
    containsAny(
      diskRaw,
      [
        "ssd",
      ],
    )
  ) {
    bonus +=
      0.2;

    extras.push(
      "SSD",
    );
  }

  if (
    featureEnabled(
      features,
      "dysk_skalowalny",
      "skalowanie_dysku",
    )
  ) {
    bonus +=
      0.4;

    extras.push(
      "skalowalny dysk",
    );
  }

  const score =
    roundScore(
      diskScore(
        diskGb,
      ) *
        0.55 +
        transferScore(
          transferRaw,
        ) *
          0.45 +
        bonus,
    );

  return {
    score,

    note:
      `Dysk: ${diskRaw || "brak jednoznacznej pojemności"}. ` +
      `Transfer: ${transferRaw || "brak opublikowanej wartości — zastosowano ocenę neutralną"}. ` +
      (
        extras.length >
        0
          ? `Uwzględnione cechy dodatkowe: ${extras.join(
              ", ",
            )}.`
          : ""
      ),
  };
}

/* =========================================================
   BACKUP + RELIABILITY
========================================================= */

function backupRetentionDays(
  raw: string,
) {
  if (!raw) {
    return null;
  }

  const normalized =
    normalizeText(
      raw,
    );

  const hours =
    normalized.match(
      /([0-9]+)\s*(?:godzin|godziny|godz|h)/,
    );

  if (hours) {
    return (
      Number(
        hours[1],
      ) /
      24
    );
  }

  const days =
    normalized.match(
      /([0-9]+)\s*dni/,
    );

  if (days) {
    return Number(
      days[1],
    );
  }

  return null;
}

function backupScore(
  days:
    number
    | null,
) {
  if (
    days === null
  ) {
    return 5;
  }

  if (
    days >= 30
  ) {
    return 10;
  }

  if (
    days >= 14
  ) {
    return 9;
  }

  if (
    days >= 7
  ) {
    return 8;
  }

  if (
    days >= 3
  ) {
    return 6.5;
  }

  if (
    days >= 1
  ) {
    return 5.5;
  }

  return 4;
}

function slaScore(
  sla:
    number
    | null,
) {
  if (
    sla === null
  ) {
    return 5.5;
  }

  if (
    sla >= 99.99
  ) {
    return 10;
  }

  if (
    sla >= 99.95
  ) {
    return 9.5;
  }

  if (
    sla >= 99.9
  ) {
    return 9;
  }

  if (
    sla >= 99.5
  ) {
    return 7;
  }

  if (
    sla >= 99
  ) {
    return 5.5;
  }

  return 4;
}

function scoreBackupReliability(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
): CriterionResult {
  const backupRaw =
    featureText(
      features,
      "backup",
    );

  const slaRaw =
    featureText(
      features,
      "sla",
    );

  const retention =
    backupRetentionDays(
      backupRaw,
    );

  const sla =
    parseNumber(
      slaRaw,
    );

  const score =
    roundScore(
      backupScore(
        retention,
      ) *
        0.6 +
        slaScore(
          sla,
        ) *
          0.4,
    );

  return {
    score,

    note:
      `Backup: ${backupRaw || "brak jednoznacznych danych"}. ` +
      `SLA: ${slaRaw || "brak jednoznacznych danych"}. ` +
      `Backup odpowiada za 60% oceny kryterium, a deklarowane SLA za 40%.`,
  };
}

/* =========================================================
   SECURITY
========================================================= */

function scoreSecurity(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
  corpus:
    string,
): CriterionResult {
  let score =
    4.5;

  const detected:
    string[] = [];

  const hasDdos =
    featureEnabled(
      features,
      "ochrona_ddos",
      "antyddos",
    ) ||
    containsAny(
      corpus,
      [
        "ochrona ddos",
        "anti-ddos",
        "antyddos",
      ],
    );

  const hasBruteforce =
    featureEnabled(
      features,
      "ochrona_bruteforce",
    ) ||
    containsAny(
      corpus,
      [
        "anti-bruteforce",
        "anty-bruteforce",
        "brute force",
      ],
    );

  const hasKvm =
    containsAny(
      featureText(
        features,
        "wirtualizacja",
      ),
      [
        "kvm",
      ],
    ) ||
    containsAny(
      corpus,
      [
        "wirtualizacja kvm",
      ],
    );

  const highAvailability =
    featureEnabled(
      features,
      "wysoka_dostepnosc",
    ) ||
    containsAny(
      corpus,
      [
        "wysokiej dostepnosci",
        "high availability",
      ],
    );

  if (hasDdos) {
    score +=
      2;

    detected.push(
      "ochrona DDoS",
    );
  }

  if (
    hasBruteforce
  ) {
    score +=
      1;

    detected.push(
      "ochrona BruteForce",
    );
  }

  if (hasKvm) {
    score +=
      1;

    detected.push(
      "izolacja KVM",
    );
  }

  if (
    highAvailability
  ) {
    score +=
      1;

    detected.push(
      "wysoka dostępność",
    );
  }

  return {
    score:
      roundScore(
        score,
      ),

    note:
      detected.length >
      0
        ? `W zapisanych danych wykryto: ${detected.join(
            ", ",
          )}.`
        : "Nie znaleziono wystarczającej liczby jednoznacznie zapisanych mechanizmów bezpieczeństwa. Zastosowano neutralną wartość bazową.",
  };
}

/* =========================================================
   MANAGEMENT + SUPPORT
========================================================= */

function scoreManagementSupport(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
  corpus:
    string,
): CriterionResult {
  let score =
    4;

  const detected:
    string[] = [];

  const management =
    featureText(
      features,
      "zarzadzanie",
    );

  if (
    management &&
    !containsAny(
      management,
      [
        "brak",
        "nie",
      ],
    )
  ) {
    score +=
      3.5;

    detected.push(
      `zarządzanie: ${management}`,
    );
  }

  const monitoring =
    featureText(
      features,
      "monitoring",
    );

  if (
    monitoring ||
    containsAny(
      corpus,
      [
        "monitoring 24/7",
        "monitoring cpu",
      ],
    )
  ) {
    score +=
      1;

    detected.push(
      "monitoring",
    );
  }

  const support =
    featureText(
      features,
      "support",
    );

  if (
    containsAny(
      `${support} ${corpus}`,
      [
        "24/7",
        "24 godziny",
      ],
    )
  ) {
    score +=
      1;

    detected.push(
      "wsparcie 24/7",
    );
  }

  const panel =
    featureText(
      features,
      "panel",
    );

  if (panel) {
    score +=
      0.5;

    detected.push(
      `panel ${panel}`,
    );
  }

  if (
    featureEnabled(
      features,
      "root",
      "ssh",
    )
  ) {
    score +=
      0.5;

    detected.push(
      "dostęp administracyjny",
    );
  }

  return {
    score:
      roundScore(
        score,
      ),

    note:
      detected.length >
      0
        ? `Wykryte elementy zarządzania i wsparcia: ${detected.join(
            ", ",
          )}.`
        : "Brak jednoznacznych informacji o administracji lub dodatkowym wsparciu. Zastosowano neutralną wartość bazową.",
  };
}

/* =========================================================
   SCALABILITY
========================================================= */

function scoreScalability(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
  corpus:
    string,
): CriterionResult {
  let score =
    4;

  const detected:
    string[] = [];

  if (
    featureEnabled(
      features,
      "skalowanie_cpu",
    )
  ) {
    score +=
      2;

    detected.push(
      "skalowanie CPU",
    );
  }

  if (
    featureEnabled(
      features,
      "skalowanie_ram",
    )
  ) {
    score +=
      1.5;

    detected.push(
      "skalowanie RAM",
    );
  }

  if (
    featureEnabled(
      features,
      "skalowanie_dysku",
      "dysk_skalowalny",
    )
  ) {
    score +=
      1.5;

    detected.push(
      "skalowanie dysku",
    );
  }

  if (
    featureEnabled(
      features,
      "tymczasowe_zwiekszenie_zasobow",
    )
  ) {
    score +=
      1;

    detected.push(
      "tymczasowe zwiększenie zasobów",
    );
  }

  if (
    detected.length ===
      0 &&
    containsAny(
      corpus,
      [
        "mozliwosc zwiekszania zasobow",
        "skalowanie zasobow",
        "zwiekszanie zasobow",
      ],
    )
  ) {
    score +=
      1.5;

    detected.push(
      "ogólna możliwość zwiększania zasobów",
    );
  }

  return {
    score:
      roundScore(
        score,
      ),

    note:
      detected.length >
      0
        ? `Wykryte mechanizmy skalowania: ${detected.join(
            ", ",
          )}.`
        : "Brak jednoznacznie zapisanych mechanizmów zwiększania zasobów. Przyznano bazową ocenę skalowalności.",
  };
}

/* =========================================================
   PLATFORM FLEXIBILITY
========================================================= */

function scorePlatformFlexibility(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
  corpus:
    string,
): CriterionResult {
  let score =
    3.5;

  const detected:
    string[] = [];

  const systems =
    featureText(
      features,
      "systemy_operacyjne",
      "system",
    );

  if (systems) {
    if (
      systems.includes(
        ",",
      ) ||
      systems.includes(
        "/",
      )
    ) {
      score +=
        1.5;
    } else {
      score +=
        0.8;
    }

    detected.push(
      `systemy: ${systems}`,
    );
  }

  if (
    featureEnabled(
      features,
      "root",
      "ssh",
    )
  ) {
    score +=
      1.5;

    detected.push(
      "root/SSH",
    );
  }

  const virtualization =
    featureText(
      features,
      "wirtualizacja",
    );

  if (
    containsAny(
      virtualization,
      [
        "kvm",
      ],
    ) ||
    containsAny(
      corpus,
      [
        "wirtualizacja kvm",
      ],
    )
  ) {
    score +=
      1;

    detected.push(
      "KVM",
    );
  }

  if (
    featureText(
      features,
      "ipv4",
    )
  ) {
    score +=
      0.5;

    detected.push(
      "IPv4",
    );
  }

  const locations =
    featureText(
      features,
      "lokalizacje",
      "lokalizacja",
    );

  if (locations) {
    score +=
      locations.includes(
        ",",
      ) ||
      locations.includes(
        "/",
      )
        ? 1
        : 0.5;

    detected.push(
      `lokalizacja: ${locations}`,
    );
  }

  const panel =
    featureText(
      features,
      "panel",
    );

  if (panel) {
    score +=
      0.5;

    detected.push(
      `panel: ${panel}`,
    );
  }

  if (
    featureEnabled(
      features,
      "zmiana_systemu",
    )
  ) {
    score +=
      0.5;

    detected.push(
      "zmiana systemu",
    );
  }

  return {
    score:
      roundScore(
        score,
      ),

    note:
      detected.length >
      0
        ? `Wykryte elementy elastyczności platformy: ${detected.join(
            ", ",
          )}.`
        : "Brak wystarczających danych o możliwościach konfiguracji platformy. Zastosowano neutralną ocenę bazową.",
  };
}

/* =========================================================
   DISPATCH
========================================================= */

function calculateCriterion(
  offer:
    ScorableOffer,
  criterionKey:
    string,
) {
  const features =
    featuresObject(
      offer.features,
    );

  const corpus =
    offerCorpus(
      offer,
      features,
    );

  switch (
    criterionKey
  ) {
    case "cena-wartosc":
      return scorePriceValue(
        offer,
        features,
      );

    case "cpu-ram":
      return scoreCpuRam(
        offer,
        features,
      );

    case "dysk-transfer":
      return scoreDiskTransfer(
        offer,
        features,
      );

    case "backup-niezawodnosc":
      return scoreBackupReliability(
        offer,
        features,
      );

    case "bezpieczenstwo":
      return scoreSecurity(
        offer,
        features,
        corpus,
      );

    case "zarzadzanie-wsparcie":
      return scoreManagementSupport(
        offer,
        features,
        corpus,
      );

    case "skalowalnosc":
      return scoreScalability(
        offer,
        features,
        corpus,
      );

    case "elastycznosc-platformy":
      return scorePlatformFlexibility(
        offer,
        features,
        corpus,
      );

    default:
      throw new Error(
        `Brak automatycznej reguły VPS/Cloud dla kryterium „${criterionKey}”.`,
      );
  }
}

function assertSupportedCategory(
  slug: string,
) {
  if (
    slug !==
    SUPPORTED_CATEGORY_SLUG
  ) {
    throw new Error(
      "Ten profil automatycznego scoringu obsługuje wyłącznie kategorię VPS i Cloud Server.",
    );
  }
}

function assertCriteriaSupported(
  criteria:
    RatingCriterionInput[],
) {
  const unsupported =
    criteria
      .filter(
        (
          criterion,
        ) =>
          criterion.isPublished &&
          !SUPPORTED_CRITERIA.has(
            criterion.key,
          ),
      )
      .map(
        (
          criterion,
        ) =>
          criterion.key,
      );

  if (
    unsupported.length >
    0
  ) {
    throw new Error(
      `Brak reguł VPS/Cloud dla kryteriów: ${unsupported.join(
        ", ",
      )}.`,
    );
  }

  const activeKeys =
    new Set(
      criteria
        .filter(
          (
            criterion,
          ) =>
            criterion.isPublished,
        )
        .map(
          (
            criterion,
          ) =>
            criterion.key,
        ),
    );

  const missing =
    Array.from(
      SUPPORTED_CRITERIA,
    ).filter(
      (
        key,
      ) =>
        !activeKeys.has(
          key,
        ),
    );

  if (
    missing.length >
    0
  ) {
    throw new Error(
      `Brakuje opublikowanych kryteriów VPS/Cloud: ${missing.join(
        ", ",
      )}.`,
    );
  }
}

async function rateLoadedOffer(
  offer:
    ScorableOffer,
  criteria:
    RatingCriterionInput[],
): Promise<AutoVpsRatingResult> {
  assertSupportedCategory(
    offer.category.slug,
  );

  assertCriteriaSupported(
    criteria,
  );

  const existing =
    new Map(
      offer.ratings.map(
        (
          rating,
        ) => [
          rating.criterionId,
          rating,
        ],
      ),
    );

  let generated =
    0;

  let skippedManual =
    0;

  for (
    const criterion of
      criteria
  ) {
    if (
      !criterion.isPublished
    ) {
      continue;
    }

    const current =
      existing.get(
        criterion.id,
      );

    /*
     * Ręczny override ma zawsze
     * pierwszeństwo.
     */
    if (
      current &&
      !isAutomaticRatingNote(
        current.note,
      )
    ) {
      skippedManual +=
        1;

      continue;
    }

    const result =
      calculateCriterion(
        offer,
        criterion.key,
      );

    await prisma.offerRating.upsert({
      where: {
        offerId_criterionId: {
          offerId:
            offer.id,

          criterionId:
            criterion.id,
        },
      },

      create: {
        offerId:
          offer.id,

        criterionId:
          criterion.id,

        score:
          result.score,

        note:
          `${AUTO_RATING_PREFIX} ${result.note}`,

        sourceUrl:
          offer.sourceUrl,

        lastVerifiedAt:
          offer.lastVerifiedAt,
      },

      update: {
        score:
          result.score,

        note:
          `${AUTO_RATING_PREFIX} ${result.note}`,

        sourceUrl:
          offer.sourceUrl,

        lastVerifiedAt:
          offer.lastVerifiedAt,
      },
    });

    generated +=
      1;
  }

  await recomputeOfferScore(
    offer.id,
  );

  return {
    offerId:
      offer.id,

    generated,

    skippedManual,
  };
}

const offerSelect = {
  id:
    true,

  name:
    true,

  summary:
    true,

  description:
    true,

  categoryId:
    true,

  priceAmount:
    true,

  regularPrice:
    true,

  currency:
    true,

  billingPeriod:
    true,

  billingLabel:
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

  lastVerifiedAt:
    true,

  category: {
    select: {
      name:
        true,

      slug:
        true,
    },
  },

  ratings: {
    select: {
      criterionId:
        true,

      note:
        true,
    },
  },
} as const;

export async function autoRateVpsOfferById(
  offerId:
    string,
): Promise<AutoVpsRatingResult> {
  const offer =
    await prisma.offer.findUnique({
      where: {
        id:
          offerId,
      },

      select:
        offerSelect,
    });

  if (!offer) {
    throw new Error(
      "Oferta nie istnieje.",
    );
  }

  assertSupportedCategory(
    offer.category.slug,
  );

  const criteria =
    await prisma.ratingCriterion.findMany({
      where: {
        categoryId:
          offer.categoryId,
      },

      select: {
        id:
          true,

        key:
          true,

        name:
          true,

        isPublished:
          true,
      },

      orderBy: {
        sortOrder:
          "asc",
      },
    });

  return rateLoadedOffer(
    offer,
    criteria,
  );
}

export async function autoRateVpsCategoryById(
  categoryId:
    string,
): Promise<AutoVpsCategoryRatingResult> {
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

  assertSupportedCategory(
    category.slug,
  );

  const [
    criteria,
    offers,
  ] =
    await Promise.all([
      prisma.ratingCriterion.findMany({
        where: {
          categoryId,
        },

        select: {
          id:
            true,

          key:
            true,

          name:
            true,

          isPublished:
            true,
        },

        orderBy: {
          sortOrder:
            "asc",
        },
      }),

      prisma.offer.findMany({
        where: {
          categoryId,
        },

        select:
          offerSelect,

        orderBy: {
          name:
            "asc",
        },
      }),
    ]);

  assertCriteriaSupported(
    criteria,
  );

  let generated =
    0;

  let skippedManual =
    0;

  for (
    const offer of
      offers
  ) {
    const result =
      await rateLoadedOffer(
        offer,
        criteria,
      );

    generated +=
      result.generated;

    skippedManual +=
      result.skippedManual;
  }

  return {
    offers:
      offers.length,

    generated,

    skippedManual,
  };
}