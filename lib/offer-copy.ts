import "server-only";

import {
  getHostingFeature,
} from "@/lib/hosting-features";

export const AUTO_COPY_VERSION =
  "hosting-copy-v1";

type Input = {
  categorySlug: string;

  offerName: string;
  providerName: string;

  priceAmount:
    | number
    | null;

  currency: string;

  billingPeriod: string;

  billingLabel:
    | string
    | null;

  features: unknown;
};

export type GeneratedOfferCopy = {
  summary: string;

  description: string;

  useCases: string[];

  pros: string[];

  cons: string[];

  methodologyNotes: string;
};

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

function parseNumber(
  raw: string,
) {
  const value =
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

  if (!value) {
    return null;
  }

  const parsed =
    Number(
      value,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function capacityGb(
  raw: string,
) {
  if (!raw) {
    return null;
  }

  const match =
    normalizeText(
      raw,
    ).match(
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

function countValue(
  raw: string,
) {
  if (!raw) {
    return null;
  }

  const normalized =
    normalizeText(
      raw,
    );

  if (
    normalized.includes(
      "bez limitu",
    ) ||
    normalized.includes(
      "unlimited",
    )
  ) {
    return Infinity;
  }

  const match =
    normalized.match(
      /([0-9]+)/,
    );

  return match
    ? Number(
        match[1],
      )
    : null;
}

function featureYes(
  raw: string,
) {
  if (!raw) {
    return null;
  }

  const normalized =
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
      normalized,
    )
  ) {
    return false;
  }

  return true;
}

function isUnlimited(
  raw: string,
) {
  const normalized =
    normalizeText(
      raw,
    );

  return (
    normalized.includes(
      "bez limitu",
    ) ||
    normalized.includes(
      "unlimited",
    )
  );
}

function money(
  value: number,
  currency: string,
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
  billingPeriod: string,
) {
  switch (
    billingPeriod
  ) {
    case "MONTH":
      return (
        amount *
        12
      );

    default:
      return amount;
  }
}

function renewalPrice(
  billingLabel:
    | string
    | null,
) {
  if (!billingLabel) {
    return null;
  }

  const match =
    normalizeText(
      billingLabel,
    ).match(
      /odnowieni[a-z]*[^0-9]{0,40}([0-9]+(?:[.,][0-9]+)?)\s*(?:zl|pln)/,
    );

  if (!match) {
    return null;
  }

  return parseNumber(
    match[1],
  );
}

function backupDays(
  raw: string,
) {
  if (!raw) {
    return null;
  }

  const normalized =
    normalizeText(
      raw,
    );

  const days =
    normalized.match(
      /([0-9]+)\s*dni/,
    );

  if (days) {
    return Number(
      days[1],
    );
  }

  const copies =
    normalized.match(
      /([0-9]+)\s*ostatnich\s*kopii/,
    );

  if (copies) {
    return Number(
      copies[1],
    );
  }

  return null;
}

function pushUnique(
  target: string[],
  value:
    string
    | null
    | undefined,
) {
  if (!value) {
    return;
  }

  if (
    !target.includes(
      value,
    )
  ) {
    target.push(
      value,
    );
  }
}

function compact(
  values: Array<
    string
    | null
    | undefined
  >,
) {
  return values.filter(
    (
      value,
    ): value is string =>
      Boolean(
        value,
      ),
  );
}

function truncate(
  value: string,
  max:
    number,
) {
  if (
    value.length <=
    max
  ) {
    return value;
  }

  return `${value
    .slice(
      0,
      max - 1,
    )
    .trimEnd()}…`;
}

function hostingCopy({
  offerName,
  providerName,
  priceAmount,
  currency,
  billingPeriod,
  billingLabel,
  features,
}: Input): GeneratedOfferCopy {
  const get = (
    key: string,
  ) =>
    getHostingFeature(
      features,
      key,
    );

  const disk =
    get(
      "dysk",
    );

  const diskTechnology =
    get(
      "technologia_dysku",
    );

  const diskMax =
    get(
      "dysk_maksymalny",
    );

  const ram =
    get(
      "ram",
    );

  const ramMax =
    get(
      "ram_maksymalny",
    );

  const cpu =
    get(
      "cpu",
    );

  const cpuMax =
    get(
      "cpu_maksymalny",
    );

  const transfer =
    get(
      "transfer",
    );

  const websites =
    get(
      "strony_www",
    );

  const email =
    get(
      "konta_email",
    );

  const databases =
    get(
      "bazy_mysql",
    ) ||
    get(
      "bazy_danych",
    );

  const backup =
    get(
      "backup",
    );

  const ssl =
    get(
      "ssl",
    );

  const ssh =
    get(
      "ssh",
    );

  const redis =
    get(
      "redis",
    );

  const waf =
    get(
      "waf",
    );

  const ddos =
    get(
      "antyddos",
    );

  const http3 =
    get(
      "http3",
    );

  const migration =
    get(
      "migracja",
    );

  const trial =
    get(
      "okres_testowy",
    );

  const wordpress =
    get(
      "wordpress",
    );

  const prestashop =
    get(
      "prestashop",
    );

  const nodejs =
    get(
      "nodejs",
    );

  const python =
    get(
      "python",
    );

  const postgresql =
    get(
      "postgresql",
    );

  const mongodb =
    get(
      "mongodb",
    );

  const scaling =
    get(
      "skalowanie",
    );

  const coreFacts =
    compact([
      disk
        ? `dysk ${disk}`
        : null,

      ram
        ? `${ram} RAM`
        : null,

      cpu
        ? `CPU ${cpu}`
        : null,

      transfer
        ? `transfer ${transfer}`
        : null,

      backup
        ? `backup ${backup}`
        : null,
    ]);

  let summary =
    coreFacts.length >
    0
      ? `${offerName} od ${providerName}: ${coreFacts
          .slice(
            0,
            4,
          )
          .join(
            ", ",
          )}.`
      : `${offerName} to oferta ${providerName} w kategorii hostingu WWW.`;

  if (
    priceAmount !==
    null
  ) {
    summary +=
      ` Cena: ${money(
        priceAmount,
        currency,
      )}`;

    if (
      billingPeriod ===
      "YEAR"
    ) {
      summary +=
        " za pierwszy rok";
    } else if (
      billingPeriod ===
      "MONTH"
    ) {
      summary +=
        " miesięcznie";
    }

    summary +=
      ".";
  }

  summary =
    truncate(
      summary,
      320,
    );

  const additionalFacts:
    string[] = [];

  if (
    diskTechnology &&
    !normalizeText(
      disk,
    ).includes(
      normalizeText(
        diskTechnology,
      ),
    )
  ) {
    pushUnique(
      additionalFacts,
      `technologia dysku ${diskTechnology}`,
    );
  }

  if (ssh) {
    pushUnique(
      additionalFacts,
      `SSH: ${ssh}`,
    );
  }

  if (redis) {
    pushUnique(
      additionalFacts,
      `Redis: ${redis}`,
    );
  }

  if (waf) {
    pushUnique(
      additionalFacts,
      `WAF: ${waf}`,
    );
  }

  if (ddos) {
    pushUnique(
      additionalFacts,
      `ochrona DDoS: ${ddos}`,
    );
  }

  if (http3) {
    pushUnique(
      additionalFacts,
      `HTTP/3: ${http3}`,
    );
  }

  if (diskMax) {
    pushUnique(
      additionalFacts,
      `maksymalny dysk ${diskMax}`,
    );
  }

  if (ramMax) {
    pushUnique(
      additionalFacts,
      `maksymalny RAM ${ramMax}`,
    );
  }

  if (cpuMax) {
    pushUnique(
      additionalFacts,
      `maksymalny CPU ${cpuMax}`,
    );
  }

  let description =
    summary;

  if (
    additionalFacts.length >
    0
  ) {
    description +=
      ` Dodatkowe zapisane parametry obejmują: ${additionalFacts.join(
        ", ",
      )}.`;
  }

  if (
    billingLabel
  ) {
    description +=
      ` Warunki rozliczenia: ${billingLabel}.`;
  }

  description +=
    " Opis został utworzony automatycznie wyłącznie z parametrów zapisanych przy ofercie; przed publikacją dane powinny odpowiadać oficjalnemu źródłu.";

  const useCases:
    string[] = [];

  if (
    featureYes(
      wordpress,
    )
  ) {
    pushUnique(
      useCases,
      "Strony i serwisy WordPress.",
    );
  }

  if (
    featureYes(
      prestashop,
    )
  ) {
    pushUnique(
      useCases,
      "Sklepy internetowe oparte na PrestaShop.",
    );
  }

  if (
    featureYes(
      nodejs,
    )
  ) {
    pushUnique(
      useCases,
      "Aplikacje wykorzystujące Node.js.",
    );
  }

  if (
    featureYes(
      python,
    )
  ) {
    pushUnique(
      useCases,
      "Aplikacje wykorzystujące Python.",
    );
  }

  if (
    featureYes(
      postgresql,
    ) ||
    featureYes(
      mongodb,
    )
  ) {
    pushUnique(
      useCases,
      "Projekty wymagające dodatkowych silników baz danych.",
    );
  }

  const siteCount =
    countValue(
      websites,
    );

  if (
    siteCount !==
      null &&
    siteCount !==
      Infinity
  ) {
    if (
      siteCount <=
      2
    ) {
      pushUnique(
        useCases,
        `Pojedyncze strony WWW i niewielkie projekty w ramach limitu ${siteCount} stron.`,
      );
    } else if (
      siteCount >=
      25
    ) {
      pushUnique(
        useCases,
        "Obsługa wielu stron WWW w ramach wysokiego limitu pakietu.",
      );
    }
  }

  const diskGb =
    capacityGb(
      disk,
    );

  const ramGb =
    capacityGb(
      ram,
    );

  if (
    diskGb !==
      null &&
    diskGb >=
      100 &&
    ramGb !==
      null &&
    ramGb >=
      4
  ) {
    pushUnique(
      useCases,
      "Projekty wymagające większej przestrzeni dyskowej i pamięci RAM.",
    );
  }

  if (
    useCases.length ===
    0
  ) {
    pushUnique(
      useCases,
      "Strony WWW zgodne z deklarowanymi limitami i funkcjami pakietu.",
    );
  }

  const pros:
    string[] = [];

  const diskText =
    normalizeText(
      `${disk} ${diskTechnology}`,
    );

  if (
    diskText.includes(
      "nvme",
    )
  ) {
    pushUnique(
      pros,
      "Dysk NVMe.",
    );
  }

  if (
    isUnlimited(
      transfer,
    )
  ) {
    pushUnique(
      pros,
      "Transfer bez limitu.",
    );
  }

  const retention =
    backupDays(
      backup,
    );

  if (
    retention !==
      null &&
    retention >=
      30
  ) {
    pushUnique(
      pros,
      `Kopie zapasowe z retencją ${retention} dni.`,
    );
  } else if (
    backup
  ) {
    pushUnique(
      pros,
      `Backup: ${backup}.`,
    );
  }

  if (
    featureYes(
      ssl,
    )
  ) {
    pushUnique(
      pros,
      `SSL: ${ssl}.`,
    );
  }

  if (
    featureYes(
      ssh,
    )
  ) {
    pushUnique(
      pros,
      "Dostęp SSH.",
    );
  }

  if (
    featureYes(
      redis,
    )
  ) {
    pushUnique(
      pros,
      "Redis dostępny w pakiecie.",
    );
  }

  if (
    featureYes(
      waf,
    )
  ) {
    pushUnique(
      pros,
      "WAF dostępny w pakiecie.",
    );
  }

  if (
    featureYes(
      ddos,
    )
  ) {
    pushUnique(
      pros,
      "Ochrona DDoS.",
    );
  }

  if (
    featureYes(
      http3,
    )
  ) {
    pushUnique(
      pros,
      "Obsługa HTTP/3.",
    );
  }

  const migrationNormalized =
    normalizeText(
      migration,
    );

  if (
    migrationNormalized.includes(
      "bezplat",
    ) ||
    migrationNormalized.includes(
      "darm",
    )
  ) {
    pushUnique(
      pros,
      "Bezpłatna migracja.",
    );
  }

  if (
    trial
  ) {
    pushUnique(
      pros,
      `Okres testowy: ${trial}.`,
    );
  }

  if (
    scaling ||
    diskMax ||
    ramMax ||
    cpuMax
  ) {
    pushUnique(
      pros,
      "Możliwość zwiększenia części zasobów.",
    );
  }

  const cons:
    string[] = [];

  if (
    diskGb !==
      null &&
    diskGb <=
      10
  ) {
    pushUnique(
      cons,
      `Przestrzeń dyskowa ograniczona do ${disk}.`,
    );
  }

  if (
    ramGb !==
      null &&
    ramGb <=
      1
  ) {
    pushUnique(
      cons,
      `Pamięć RAM ograniczona do ${ram}.`,
    );
  }

  if (
    siteCount !==
      null &&
    siteCount !==
      Infinity &&
    siteCount <=
      2
  ) {
    pushUnique(
      cons,
      `Limit liczby stron WWW: ${websites}.`,
    );
  }

  const emailCount =
    countValue(
      email,
    );

  if (
    emailCount !==
      null &&
    emailCount !==
      Infinity &&
    emailCount <=
      3
  ) {
    pushUnique(
      cons,
      `Limit kont e-mail: ${email}.`,
    );
  }

  if (
    featureYes(
      ssh,
    ) === false
  ) {
    pushUnique(
      cons,
      "Brak SSH w pakiecie.",
    );
  }

  if (
    featureYes(
      redis,
    ) === false
  ) {
    pushUnique(
      cons,
      "Brak Redis w pakiecie.",
    );
  }

  if (
    transfer &&
    !isUnlimited(
      transfer,
    )
  ) {
    pushUnique(
      cons,
      `Transfer jest limitowany: ${transfer}.`,
    );
  }

  if (
    priceAmount !==
    null
  ) {
    const intro =
      annualPrice(
        priceAmount,
        billingPeriod,
      );

    const renewal =
      renewalPrice(
        billingLabel,
      );

    if (
      renewal !==
        null &&
      intro >
        0 &&
      renewal /
        intro >=
        2
    ) {
      pushUnique(
        cons,
        `Cena odnowienia (${money(
          renewal,
          currency,
        )}) jest wyraźnie wyższa od ceny pierwszego okresu.`,
      );
    }
  }

  const missingCore =
    compact([
      !disk
        ? "dysk"
        : null,

      !ram
        ? "RAM"
        : null,

      !cpu
        ? "CPU"
        : null,

      !backup
        ? "backup"
        : null,
    ]);

  /*
   * Nie wymyślamy minusa tylko
   * dlatego, że pole musi być
   * wypełnione.
   *
   * Jeśli danych brakuje,
   * jawnie to komunikujemy.
   */
  if (
    cons.length ===
      0 &&
    missingCore.length >
      0
  ) {
    pushUnique(
      cons,
      `W danych źródłowych brakuje pełnych informacji o: ${missingCore.join(
        ", ",
      )}.`,
    );
  }

  const methodologyNotes =
    `[AUTO:${AUTO_COPY_VERSION}] ` +
    "Treść wygenerowana deterministycznie na podstawie zapisanej ceny, warunków rozliczenia i parametrów technicznych. " +
    "Brakujące parametry nie są zgadywane. Dane afiliacyjne nie wpływają na treść ani ocenę.";

  return {
    summary,

    description,

    useCases:
      useCases.slice(
        0,
        6,
      ),

    pros:
      pros.slice(
        0,
        8,
      ),

    cons:
      cons.slice(
        0,
        8,
      ),

    methodologyNotes,
  };
}

export function generateOfferCopy(
  input: Input,
): GeneratedOfferCopy {
  switch (
    input.categorySlug
  ) {
    case "hosting-www":
      return hostingCopy(
        input,
      );

    default:
      /*
       * Nie generujemy treści
       * dla kategorii, której
       * metodologii jeszcze nie
       * zdefiniowaliśmy.
       */
      return {
        summary:
          `${input.offerName} od ${input.providerName}.`,

        description:
          `${input.offerName} od ${input.providerName}. Przed publikacją uzupełnij opis na podstawie oficjalnego źródła.`,

        useCases:
          [],

        pros:
          [],

        cons:
          [],

        methodologyNotes:
          `[AUTO:${AUTO_COPY_VERSION}] Brak reguł automatycznego generowania treści dla tej kategorii.`,
      };
  }
}