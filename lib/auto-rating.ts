import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  recomputeOfferScore,
} from "@/lib/rating";

export const AUTO_RATING_PREFIX =
  "[AUTO:v1]";

const SUPPORTED_CATEGORY_SLUG =
  "hosting-www";

const SUPPORTED_CRITERIA =
  new Set([
    "cena-koszt",
    "wydajnosc-zasoby",
    "pojemnosc-limity",
    "backup-niezawodnosc",
    "bezpieczenstwo",
    "technologie-funkcje",
    "skalowalnosc",
    "migracja-wsparcie",
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

export type AutoRatingResult = {
  offerId: string;
  generated: number;
  skippedManual: number;
};

export type AutoCategoryRatingResult = {
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
      clamp(value) *
        10,
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
    );
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
        features[key],
      );

    if (value) {
      return value;
    }
  }

  return "";
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
    ].join(" "),
  );
}

function containsAny(
  text: string,
  values: string[],
) {
  return values.some(
    (value) =>
      text.includes(
        normalizeText(
          value,
        ),
      ),
  );
}

function parseNumber(
  raw: string,
) {
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

  const parsed =
    Number(cleaned);

  return Number.isFinite(
    parsed,
  )
    ? parsed
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

  if (
    match[2] ===
    "tb"
  ) {
    return (
      value * 1024
    );
  }

  if (
    match[2] ===
    "mb"
  ) {
    return (
      value / 1024
    );
  }

  return value;
}

function parseCount(
  raw: string,
) {
  if (!raw) {
    return null;
  }

  const text =
    normalizeText(
      raw,
    );

  if (
    containsAny(
      text,
      [
        "bez limitu",
        "nielimit",
        "unlimited",
      ],
    )
  ) {
    return Infinity;
  }

  const match =
    text.match(
      /([0-9]+)/,
    );

  if (!match) {
    return null;
  }

  return Number(
    match[1],
  );
}

function featureEnabled(
  features:
    FeatureMap,
  key: string,
) {
  const raw =
    valueText(
      features[key],
    );

  if (!raw) {
    return false;
  }

  const text =
    normalizeText(
      raw,
    );

  if (
    [
      "nie",
      "false",
      "brak",
      "0",
    ].includes(
      text,
    )
  ) {
    return false;
  }

  return true;
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
        amount * 12
      );

    case "YEAR":
      return amount;

    case "ONE_TIME":
      return amount;

    default:
      return amount;
  }
}

function extractLabelPrice(
  label:
    | string
    | null,
  type:
    | "renewal"
    | "standard",
) {
  if (!label) {
    return null;
  }

  const text =
    normalizeText(
      label,
    );

  const pattern =
    type ===
    "renewal"
      ? /odnowieni[a-z]*[^0-9]{0,30}([0-9][0-9\s.,]*)\s*zl([^;]*)/
      : /standardowo[^0-9]{0,30}([0-9][0-9\s.,]*)\s*zl([^;]*)/;

  const match =
    text.match(
      pattern,
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

  const monthly =
    /mies/.test(
      unit,
    );

  return monthly
    ? amount * 12
    : amount;
}

function renewalAnnualPrice(
  offer:
    ScorableOffer,
  introAnnual:
    number,
) {
  const renewal =
    extractLabelPrice(
      offer.billingLabel,
      "renewal",
    );

  if (
    renewal !== null
  ) {
    return renewal;
  }

  const standard =
    extractLabelPrice(
      offer.billingLabel,
      "standard",
    );

  if (
    standard !== null
  ) {
    return standard;
  }

  return introAnnual;
}

function money(
  value: number,
  currency = "PLN",
) {
  return `${value.toLocaleString(
    "pl-PL",
    {
      maximumFractionDigits:
        2,
    },
  )} ${currency}`;
}

/* =========================================================
   PRICE
========================================================= */

function costBaseScore(
  annualCost: number,
) {
  if (
    annualCost <= 100
  ) {
    return 10;
  }

  if (
    annualCost <= 180
  ) {
    return 9.3;
  }

  if (
    annualCost <= 300
  ) {
    return 8.4;
  }

  if (
    annualCost <= 450
  ) {
    return 7.5;
  }

  if (
    annualCost <= 650
  ) {
    return 6.5;
  }

  if (
    annualCost <= 900
  ) {
    return 5.5;
  }

  if (
    annualCost <= 1200
  ) {
    return 4.5;
  }

  if (
    annualCost <= 1800
  ) {
    return 3.5;
  }

  if (
    annualCost <= 2400
  ) {
    return 2.5;
  }

  return 1.5;
}

function renewalPenalty(
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

  if (
    ratio <= 8
  ) {
    return 1.3;
  }

  return 1.7;
}

function scorePrice(
  offer:
    ScorableOffer,
): CriterionResult {
  const amount =
    offer.priceAmount ===
      null
      ? null
      : Number(
          offer.priceAmount,
        );

  if (
    amount === null ||
    !Number.isFinite(
      amount,
    )
  ) {
    return {
      score: 5,
      note:
        "Brak wystarczających danych liczbowych o cenie. Przyznano neutralną ocenę 5/10.",
    };
  }

  const introAnnual =
    annualPrice(
      amount,
      offer.billingPeriod,
    );

  const renewalAnnual =
    renewalAnnualPrice(
      offer,
      introAnnual,
    );

  /*
   * Średni roczny koszt
   * w perspektywie 3 lat.
   */
  const averageAnnual =
    (
      introAnnual +
      renewalAnnual *
        2
    ) / 3;

  const ratio =
    introAnnual > 0
      ? renewalAnnual /
        introAnnual
      : 1;

  const score =
    roundScore(
      costBaseScore(
        averageAnnual,
      ) -
        renewalPenalty(
          ratio,
        ),
    );

  return {
    score,

    note:
      `Cena pierwszego roku po normalizacji: ${money(
        introAnnual,
        offer.currency,
      )}. ` +
      `Cena kolejnego roku: ${money(
        renewalAnnual,
        offer.currency,
      )}. ` +
      `Średni roczny koszt w perspektywie 3 lat: ${money(
        averageAnnual,
        offer.currency,
      )}. ` +
      `Algorytm uwzględnia zarówno poziom kosztu, jak i wzrost ceny po pierwszym okresie.`,
  };
}

/* =========================================================
   PERFORMANCE
========================================================= */

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
    ramGb >= 16
  ) {
    return 10;
  }

  if (
    ramGb >= 8
  ) {
    return 9.2;
  }

  if (
    ramGb >= 4
  ) {
    return 7.2;
  }

  if (
    ramGb >= 3
  ) {
    return 6.5;
  }

  if (
    ramGb >= 2
  ) {
    return 5.5;
  }

  if (
    ramGb >= 1
  ) {
    return 4;
  }

  return 2.5;
}

function cpuScore(
  raw: string,
) {
  if (!raw) {
    return 5.5;
  }

  const text =
    normalizeText(
      raw,
    );

  const vcpu =
    text.match(
      /([0-9]+(?:[.,][0-9]+)?)\s*vcpu/,
    );

  if (vcpu) {
    const value =
      parseNumber(
        vcpu[1],
      ) ?? 0;

    if (
      value >= 8
    ) {
      return 10;
    }

    if (
      value >= 4
    ) {
      return 9;
    }

    if (
      value >= 2
    ) {
      return 7;
    }

    return 5;
  }

  const percent =
    text.match(
      /([0-9]+(?:[.,][0-9]+)?)\s*%/,
    );

  if (percent) {
    const value =
      parseNumber(
        percent[1],
      ) ?? 0;

    if (
      value >= 300
    ) {
      return 9.5;
    }

    if (
      value >= 200
    ) {
      return 8;
    }

    if (
      value >= 150
    ) {
      return 6.5;
    }

    if (
      value >= 100
    ) {
      return 5;
    }

    if (
      value >= 50
    ) {
      return 3.5;
    }

    return 2.5;
  }

  const ghz =
    text.match(
      /([0-9]+(?:[.,][0-9]+)?)\s*ghz/,
    );

  if (ghz) {
    const value =
      parseNumber(
        ghz[1],
      ) ?? 0;

    if (
      value >= 8
    ) {
      return 9.5;
    }

    if (
      value >= 6
    ) {
      return 8.5;
    }

    if (
      value >= 4
    ) {
      return 7.5;
    }

    if (
      value >= 3
    ) {
      return 6.5;
    }

    return 5;
  }

  return 5.5;
}

function scorePerformance(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
): CriterionResult {
  const ramRaw =
    featureText(
      features,
      "ram",
      "ram_bazowy",
    );

  const ramGb =
    parseCapacityGb(
      ramRaw,
    );

  const cpuRaw =
    featureText(
      features,
      "cpu_gwarantowane",
      "cpu",
      "cpu_bazowe",
    );

  const diskRaw =
    featureText(
      features,
      "dysk",
      "dysk_bazowy",
    );

  const diskTechnology =
    normalizeText(
      [
        diskRaw,
        featureText(
          features,
          "technologia_dysku",
        ),
      ].join(" "),
    );

  let diskBonus =
    0;

  if (
    diskTechnology.includes(
      "nvme",
    )
  ) {
    diskBonus = 0.6;
  } else if (
    diskTechnology.includes(
      "ssd",
    )
  ) {
    diskBonus = 0.3;
  }

  const score =
    roundScore(
      cpuScore(
        cpuRaw,
      ) *
        0.55 +
        ramScore(
          ramGb,
        ) *
          0.45 +
        diskBonus,
    );

  return {
    score,

    note:
      `Wykryte zasoby bazowe: CPU ${cpuRaw || "brak jednoznacznych danych"}, ` +
      `RAM ${ramRaw || "brak jednoznacznych danych"}, ` +
      `dysk ${diskRaw || "brak jednoznacznych danych"}. ` +
      `Dyski NVMe/SSD zwiększają wynik, a ocena wykorzystuje wyłącznie parametry zapisane przy ofercie.`,
  };
}

/* =========================================================
   CAPACITY
========================================================= */

function diskCapacityScore(
  gb:
    number
    | null,
) {
  if (
    gb === null
  ) {
    return 6;
  }

  if (
    gb >= 1024
  ) {
    return 10;
  }

  if (
    gb >= 500
  ) {
    return 9.5;
  }

  if (
    gb >= 100
  ) {
    return 8.5;
  }

  if (
    gb >= 50
  ) {
    return 7.5;
  }

  if (
    gb >= 25
  ) {
    return 6.3;
  }

  if (
    gb >= 10
  ) {
    return 4.8;
  }

  if (
    gb >= 5
  ) {
    return 3.5;
  }

  return 2.5;
}

function transferScore(
  raw: string,
) {
  if (!raw) {
    return 6;
  }

  const text =
    normalizeText(
      raw,
    );

  if (
    containsAny(
      text,
      [
        "bez limitu",
        "nielimit",
      ],
    )
  ) {
    return 10;
  }

  const gb =
    parseCapacityGb(
      raw,
    );

  if (
    gb === null
  ) {
    return 6;
  }

  if (
    gb >=
    10 * 1024
  ) {
    return 9.5;
  }

  if (
    gb >=
    5 * 1024
  ) {
    return 8.5;
  }

  if (
    gb >= 1024
  ) {
    return 7;
  }

  if (
    gb >= 500
  ) {
    return 6;
  }

  return 4.5;
}

function countScore(
  count:
    number
    | null,
  thresholds: Array<
    [
      number,
      number,
    ]
  >,
) {
  if (
    count ===
    Infinity
  ) {
    return 10;
  }

  if (
    count === null
  ) {
    return 6.5;
  }

  for (
    const [
      minimum,
      score,
    ] of thresholds
  ) {
    if (
      count >= minimum
    ) {
      return score;
    }
  }

  return 2.5;
}

function scoreCapacity(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
): CriterionResult {
  const diskRaw =
    featureText(
      features,
      "dysk",
      "dysk_bazowy",
    );

  const transferRaw =
    featureText(
      features,
      "transfer",
    );

  const sitesRaw =
    featureText(
      features,
      "strony_www",
    );

  const emailRaw =
    featureText(
      features,
      "konta_email",
    );

  const disk =
    parseCapacityGb(
      diskRaw,
    );

  const sites =
    parseCount(
      sitesRaw,
    );

  const email =
    parseCount(
      emailRaw,
    );

  const score =
    roundScore(
      diskCapacityScore(
        disk,
      ) *
        0.35 +
        transferScore(
          transferRaw,
        ) *
          0.25 +
        countScore(
          sites,
          [
            [100, 9],
            [25, 8],
            [10, 7],
            [5, 6],
            [2, 4],
            [1, 3],
          ],
        ) *
          0.25 +
        countScore(
          email,
          [
            [500, 9],
            [100, 8],
            [25, 7],
            [10, 6],
            [3, 4],
            [1, 3],
          ],
        ) *
          0.15,
    );

  return {
    score,

    note:
      `Pojemność: ${diskRaw || "brak danych"}, ` +
      `transfer: ${transferRaw || "brak danych"}, ` +
      `strony WWW: ${sitesRaw || "brak danych"}, ` +
      `konta e-mail: ${emailRaw || "brak danych"}. ` +
      `Brak jawnego limitu w danych jest traktowany neutralnie, a nie jako brak funkcji.`,
  };
}

/* =========================================================
   BACKUP
========================================================= */

function backupRetentionDays(
  raw: string,
) {
  if (!raw) {
    return null;
  }

  const text =
    normalizeText(
      raw,
    );

  const days =
    text.match(
      /([0-9]+)\s*dni/,
    );

  if (days) {
    return Number(
      days[1],
    );
  }

  const copies =
    text.match(
      /([0-9]+)\s*ostatnich\s*kopii/,
    );

  if (copies) {
    return Number(
      copies[1],
    );
  }

  const hours =
    text.match(
      /([0-9]+)\s*h/,
    );

  if (hours) {
    return (
      Number(
        hours[1],
      ) / 24
    );
  }

  return null;
}

function scoreBackup(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
): CriterionResult {
  const backupRaw =
    featureText(
      features,
      "backup",
      "backup_systemowy",
    );

  const retention =
    backupRetentionDays(
      backupRaw,
    );

  let score =
    4.5;

  if (
    retention !== null
  ) {
    if (
      retention >= 30
    ) {
      score = 9.3;
    } else if (
      retention >= 14
    ) {
      score = 8.7;
    } else if (
      retention >= 7
    ) {
      score = 8;
    } else if (
      retention >= 3
    ) {
      score = 7.2;
    } else if (
      retention >= 2
    ) {
      score = 6.5;
    } else {
      score = 5.8;
    }
  }

  const normalizedBackup =
    normalizeText(
      backupRaw,
    );

  if (
    containsAny(
      normalizedBackup,
      [
        "codzien",
        "24 godz",
        "raz na dobe",
      ],
    )
  ) {
    score += 0.3;
  }

  const slaRaw =
    featureText(
      features,
      "sla",
    );

  const sla =
    parseNumber(
      slaRaw,
    );

  if (
    sla !== null &&
    sla >= 99.9
  ) {
    score += 0.4;
  }

  return {
    score:
      roundScore(
        score,
      ),

    note:
      `Backup: ${backupRaw || "brak jednoznacznych danych"}. ` +
      `SLA: ${slaRaw || "brak danych"}. ` +
      `Największy wpływ na wynik mają częstotliwość kopii, okres retencji i deklarowana dostępność usługi.`,
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
  corpus: string,
): CriterionResult {
  const detected:
    string[] = [];

  let score = 5;

  const hasSsl =
    featureEnabled(
      features,
      "ssl",
    ) ||
    containsAny(
      corpus,
      [
        "ssl",
        "let's encrypt",
        "lets encrypt",
      ],
    );

  const hasWaf =
    featureEnabled(
      features,
      "waf",
    ) ||
    containsAny(
      corpus,
      [
        "web application firewall",
        " waf ",
      ],
    );

  const hasDdos =
    featureEnabled(
      features,
      "antyddos",
    ) ||
    featureEnabled(
      features,
      "ochrona_ddos",
    ) ||
    containsAny(
      corpus,
      [
        "antyddos",
        "anti-ddos",
        "ochrona ddos",
      ],
    );

  const hasTls13 =
    featureEnabled(
      features,
      "tls13",
    ) ||
    corpus.includes(
      "tls 1.3",
    );

  const hasAntivirus =
    containsAny(
      corpus,
      [
        "antywirus",
        "antivirus",
      ],
    );

  if (hasSsl) {
    score += 1;
    detected.push(
      "SSL",
    );
  }

  if (hasWaf) {
    score += 1.5;
    detected.push(
      "WAF",
    );
  }

  if (hasDdos) {
    score += 1.5;
    detected.push(
      "ochrona DDoS",
    );
  }

  if (hasTls13) {
    score += 0.5;
    detected.push(
      "TLS 1.3",
    );
  }

  if (
    hasAntivirus
  ) {
    score += 0.5;
    detected.push(
      "ochrona antywirusowa",
    );
  }

  return {
    score:
      roundScore(
        score,
      ),

    note:
      detected.length > 0
        ? `W zapisanych danych wykryto: ${detected.join(
            ", ",
          )}. Ocena bazuje wyłącznie na udokumentowanych zabezpieczeniach zapisanych przy ofercie.`
        : "W zapisanych danych nie znaleziono wystarczającej liczby jednoznacznych informacji o zabezpieczeniach. Zastosowano neutralną ocenę bazową.",
  };
}

/* =========================================================
   TECHNOLOGIES
========================================================= */

function scoreTechnologies(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
  corpus: string,
): CriterionResult {
  const technologies:
    string[] = [];

  const checks: Array<
    [
      string,
      boolean,
    ]
  > = [
    [
      "SSH",
      featureEnabled(
        features,
        "ssh",
      ) ||
        corpus.includes(
          "ssh",
        ),
    ],
    [
      "Redis",
      featureEnabled(
        features,
        "redis",
      ) ||
        corpus.includes(
          "redis",
        ),
    ],
    [
      "Memcached",
      featureEnabled(
        features,
        "memcached",
      ) ||
        corpus.includes(
          "memcached",
        ),
    ],
    [
      "Node.js",
      featureEnabled(
        features,
        "nodejs",
      ) ||
        corpus.includes(
          "node.js",
        ),
    ],
    [
      "Python",
      featureEnabled(
        features,
        "python",
      ) ||
        corpus.includes(
          "python",
        ),
    ],
    [
      "Git",
      featureEnabled(
        features,
        "git",
      ) ||
        containsAny(
          corpus,
          [
            " git ",
            "git",
          ],
        ),
    ],
    [
      "CRON",
      featureEnabled(
        features,
        "cron",
      ) ||
        corpus.includes(
          "cron",
        ),
    ],
    [
      "PostgreSQL",
      featureEnabled(
        features,
        "postgresql",
      ) ||
        corpus.includes(
          "postgresql",
        ),
    ],
    [
      "MongoDB",
      featureEnabled(
        features,
        "mongodb",
      ) ||
        corpus.includes(
          "mongodb",
        ),
    ],
    [
      "HTTP/3",
      featureEnabled(
        features,
        "http3",
      ) ||
        corpus.includes(
          "http/3",
        ),
    ],
  ];

  for (
    const [
      name,
      enabled,
    ] of checks
  ) {
    if (enabled) {
      technologies.push(
        name,
      );
    }
  }

  const score =
    roundScore(
      4.5 +
        technologies.length *
          0.55,
    );

  return {
    score,

    note:
      technologies.length > 0
        ? `Wykryte technologie i funkcje: ${technologies.join(
            ", ",
          )}. Wynik rośnie wraz z dostępnością funkcji istotnych dla bardziej zaawansowanych wdrożeń.`
        : "Brak wystarczających ustrukturyzowanych danych o dodatkowych technologiach. Zastosowano neutralną wartość bazową.",
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
  corpus: string,
): CriterionResult {
  let score = 4;

  const mechanisms:
    string[] = [];

  const dynamic =
    featureEnabled(
      features,
      "skalowanie",
    ) ||
    featureEnabled(
      features,
      "cpu_dynamiczne",
    ) ||
    containsAny(
      corpus,
      [
        "elastyczne skalowanie",
        "dynamiczne skalowanie",
        "dynamiczne rozdzielanie",
        "automatyczne skalowanie",
      ],
    );

  if (dynamic) {
    score += 4;
    mechanisms.push(
      "dynamiczne skalowanie",
    );
  }

  if (
    featureText(
      features,
      "cpu_maksymalne",
    )
  ) {
    score += 0.8;
    mechanisms.push(
      "zwiększanie CPU",
    );
  }

  if (
    featureText(
      features,
      "ram_maksymalny",
    )
  ) {
    score += 0.6;
    mechanisms.push(
      "zwiększanie RAM",
    );
  }

  if (
    featureText(
      features,
      "dysk_maksymalny",
      "maksymalny_dysk",
    )
  ) {
    score += 0.6;
    mechanisms.push(
      "rozbudowa przestrzeni",
    );
  }

  return {
    score:
      roundScore(
        score,
      ),

    note:
      mechanisms.length > 0
        ? `Wykryte mechanizmy skalowania: ${mechanisms.join(
            ", ",
          )}.`
        : "W zapisanych danych nie wykryto automatycznego lub elastycznego zwiększania zasobów. Oferta otrzymuje bazową ocenę skalowalności.",
  };
}

/* =========================================================
   MIGRATION / SUPPORT
========================================================= */

function scoreMigrationSupport(
  offer:
    ScorableOffer,
  features:
    FeatureMap,
  corpus: string,
): CriterionResult {
  let score = 5;

  const benefits:
    string[] = [];

  const migrationRaw =
    featureText(
      features,
      "migracja",
    );

  const freeMigration =
    (
      migrationRaw &&
      containsAny(
        normalizeText(
          migrationRaw,
        ),
        [
          "bezplat",
          "darm",
        ],
      )
    ) ||
    containsAny(
      corpus,
      [
        "bezplatna migracja",
        "bezplatny transfer strony",
        "darmowa migracja",
      ],
    );

  if (
    freeMigration
  ) {
    score += 3;
    benefits.push(
      "bezpłatna migracja",
    );
  }

  const trialRaw =
    featureText(
      features,
      "okres_testowy",
    );

  const trial =
    Boolean(
      trialRaw,
    ) ||
    containsAny(
      corpus,
      [
        "okres testowy",
        "dniowy okres testowy",
      ],
    );

  if (trial) {
    score += 1;
    benefits.push(
      "okres testowy",
    );
  }

  const support247 =
    containsAny(
      corpus,
      [
        "24/7",
        "24 godziny na dobe",
      ],
    );

  if (
    support247
  ) {
    score += 1;
    benefits.push(
      "wsparcie 24/7",
    );
  }

  return {
    score:
      roundScore(
        score,
      ),

    note:
      benefits.length > 0
        ? `Wykryte elementy obsługi klienta: ${benefits.join(
            ", ",
          )}.`
        : "Brak jednoznacznie zapisanych informacji o bezpłatnej migracji, okresie testowym lub całodobowym wsparciu. Przyznano neutralną ocenę bazową.",
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
    case "cena-koszt":
      return scorePrice(
        offer,
      );

    case "wydajnosc-zasoby":
      return scorePerformance(
        offer,
        features,
      );

    case "pojemnosc-limity":
      return scoreCapacity(
        offer,
        features,
      );

    case "backup-niezawodnosc":
      return scoreBackup(
        offer,
        features,
      );

    case "bezpieczenstwo":
      return scoreSecurity(
        offer,
        features,
        corpus,
      );

    case "technologie-funkcje":
      return scoreTechnologies(
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

    case "migracja-wsparcie":
      return scoreMigrationSupport(
        offer,
        features,
        corpus,
      );

    default:
      throw new Error(
        `Brak automatycznej reguły dla kryterium „${criterionKey}”.`,
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
      "Automatyczny scoring jest obecnie skonfigurowany wyłącznie dla kategorii Hosting WWW.",
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
        (criterion) =>
          criterion.isPublished &&
          !SUPPORTED_CRITERIA.has(
            criterion.key,
          ),
      )
      .map(
        (criterion) =>
          criterion.key,
      );

  if (
    unsupported.length >
    0
  ) {
    throw new Error(
      `Brak reguł automatycznych dla kryteriów: ${unsupported.join(
        ", ",
      )}.`,
    );
  }
}

export function isAutomaticRatingNote(
  note:
    | string
    | null
    | undefined,
) {
  return Boolean(
    note?.startsWith(
      AUTO_RATING_PREFIX,
    ),
  );
}

export function stripAutomaticRatingPrefix(
  note:
    | string
    | null
    | undefined,
) {
  if (!note) {
    return "";
  }

  return note
    .replace(
      /^\[AUTO:v[0-9]+\]\s*/,
      "",
    )
    .trim();
}

async function rateLoadedOffer(
  offer:
    ScorableOffer,
  criteria:
    RatingCriterionInput[],
): Promise<AutoRatingResult> {
  assertSupportedCategory(
    offer.category.slug,
  );

  assertCriteriaSupported(
    criteria,
  );

  const existing =
    new Map(
      offer.ratings.map(
        (rating) => [
          rating.criterionId,
          rating,
        ],
      ),
    );

  let generated = 0;
  let skippedManual = 0;

  for (
    const criterion of criteria
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
     * Ręczna ocena jest override'em.
     * Automat jej nie dotyka.
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

    generated += 1;
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
  id: true,
  name: true,
  summary: true,
  description: true,

  categoryId: true,

  priceAmount: true,
  regularPrice: true,
  currency: true,
  billingPeriod: true,
  billingLabel: true,

  sourceUrl: true,
  features: true,

  useCases: true,
  pros: true,
  cons: true,

  lastVerifiedAt: true,

  category: {
    select: {
      name: true,
      slug: true,
    },
  },

  ratings: {
    select: {
      criterionId: true,
      note: true,
    },
  },
} as const;

export async function autoRateOfferById(
  offerId: string,
): Promise<AutoRatingResult> {
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

  const criteria =
    await prisma.ratingCriterion.findMany({
      where: {
        categoryId:
          offer.categoryId,
      },

      select: {
        id: true,
        key: true,
        name: true,
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

export async function autoRateCategoryById(
  categoryId: string,
): Promise<AutoCategoryRatingResult> {
  const category =
    await prisma.category.findUnique({
      where: {
        id:
          categoryId,
      },

      select: {
        id: true,
        slug: true,
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
          id: true,
          key: true,
          name: true,
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

  let generated = 0;
  let skippedManual = 0;

  for (
    const offer of offers
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