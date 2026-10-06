import "server-only";

import type {
  Prisma,
} from "@/generated/prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  generateAffiliateUrl,
} from "@/lib/affiliate-url";

const MAX_HTML_BYTES =
  2 * 1024 * 1024;

const FETCH_TIMEOUT_MS =
  12_000;

const MAX_REDIRECTS =
  4;

type BillingPeriod =
  | "ONE_TIME"
  | "MONTH"
  | "YEAR"
  | "CUSTOM";

type FeatureMap =
  Record<
    string,
    string
  >;

type ProviderForImport = {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string;

  affiliatePrograms: Array<{
    accountReference:
      string | null;
  }>;
};

export type ImportedOfferDraft = {
  providerId: string;
  providerName: string;
  providerSlug: string;

  name: string;
  summary: string;
  description: string;

  sourceUrl: string;

  affiliateUrl:
    string | null;

  priceAmount:
    number | null;

  currency: string;

  billingPeriod:
    BillingPeriod;

  billingLabel:
    string | null;

  features:
    Prisma.InputJsonValue;

  confidence: number;
  featureCount: number;

  warnings:
    string[];
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

function normalizeHost(
  hostname: string,
) {
  return hostname
    .toLowerCase()
    .replace(
      /\.$/,
      "",
    )
    .replace(
      /^www\./,
      "",
    );
}

function hostMatches(
  hostname: string,
  providerHost: string,
) {
  const current =
    normalizeHost(
      hostname,
    );

  const expected =
    normalizeHost(
      providerHost,
    );

  return (
    current === expected ||
    current.endsWith(
      `.${expected}`,
    )
  );
}

function assertSafeHttpsUrl(
  raw: string,
) {
  let url: URL;

  try {
    url =
      new URL(
        raw,
      );
  } catch {
    throw new Error(
      "Nieprawidłowy URL.",
    );
  }

  if (
    url.protocol !==
    "https:"
  ) {
    throw new Error(
      "Importer obsługuje wyłącznie HTTPS.",
    );
  }

  if (
    url.username ||
    url.password
  ) {
    throw new Error(
      "URL nie może zawierać danych logowania.",
    );
  }

  if (
    url.port &&
    url.port !==
      "443"
  ) {
    throw new Error(
      "Niestandardowy port nie jest dozwolony.",
    );
  }

  return url;
}

function decodeEntities(
  value: string,
) {
  return value
    .replace(
      /&#x([0-9a-f]+);/gi,
      (
        _,
        code: string,
      ) =>
        String.fromCodePoint(
          parseInt(
            code,
            16,
          ),
        ),
    )
    .replace(
      /&#([0-9]+);/g,
      (
        _,
        code: string,
      ) =>
        String.fromCodePoint(
          Number(
            code,
          ),
        ),
    )
    .replace(
      /&nbsp;/gi,
      " ",
    )
    .replace(
      /&amp;/gi,
      "&",
    )
    .replace(
      /&quot;/gi,
      "\"",
    )
    .replace(
      /&#39;/gi,
      "'",
    )
    .replace(
      /&lt;/gi,
      "<",
    )
    .replace(
      /&gt;/gi,
      ">",
    );
}

function plainText(
  html: string,
) {
  return decodeEntities(
    html
      .replace(
        /<script\b[\s\S]*?<\/script>/gi,
        " ",
      )
      .replace(
        /<style\b[\s\S]*?<\/style>/gi,
        " ",
      )
      .replace(
        /<noscript\b[\s\S]*?<\/noscript>/gi,
        " ",
      )
      .replace(
        /<svg\b[\s\S]*?<\/svg>/gi,
        " ",
      )
      .replace(
        /<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/gi,
        " $1 ",
      )
      .replace(
        /<(?:br|hr)\s*\/?>/gi,
        "\n",
      )
      .replace(
        /<\/(?:p|div|li|h1|h2|h3|h4|tr|td|th|section|article)>/gi,
        "\n",
      )
      .replace(
        /<[^>]+>/g,
        " ",
      ),
  )
    .replace(
      /[ \t]+/g,
      " ",
    )
    .replace(
      /\n[ \t]+/g,
      "\n",
    )
    .replace(
      /\n{3,}/g,
      "\n\n",
    )
    .trim();
}

function htmlAttribute(
  tag: string,
  name: string,
) {
  const match =
    tag.match(
      new RegExp(
        `\\b${name}\\s*=\\s*["']([^"']*)["']`,
        "i",
      ),
    );

  return match
    ? decodeEntities(
        match[1],
      ).trim()
    : "";
}

function metaValue(
  html: string,
  names: string[],
) {
  const metaTags =
    html.match(
      /<meta\b[^>]*>/gi,
    ) ?? [];

  const wanted =
    names.map(
      normalizeText,
    );

  for (
    const tag of metaTags
  ) {
    const key =
      htmlAttribute(
        tag,
        "name",
      ) ||
      htmlAttribute(
        tag,
        "property",
      );

    if (
      !wanted.includes(
        normalizeText(
          key,
        ),
      )
    ) {
      continue;
    }

    const content =
      htmlAttribute(
        tag,
        "content",
      );

    if (content) {
      return content;
    }
  }

  return "";
}

function tagText(
  html: string,
  tagName: string,
) {
  const match =
    html.match(
      new RegExp(
        `<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
        "i",
      ),
    );

  if (!match) {
    return "";
  }

  return plainText(
    match[1],
  );
}

function firstParagraph(
  html: string,
) {
  const matches =
    html.matchAll(
      /<p\b[^>]*>([\s\S]*?)<\/p>/gi,
    );

  for (
    const match of matches
  ) {
    const text =
      plainText(
        match[1],
      );

    if (
      text.length >= 40
    ) {
      return text;
    }
  }

  return "";
}

function parseNumber(
  value: string,
) {
  const normalized =
    value
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

  if (!normalized) {
    return null;
  }

  const number =
    Number(
      normalized,
    );

  return Number.isFinite(
    number,
  )
    ? number
    : null;
}

function jsonLdObjects(
  html: string,
) {
  const result:
    Record<
      string,
      unknown
    >[] = [];

  const scripts =
    html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );

  function collect(
    value: unknown,
  ) {
    if (
      Array.isArray(
        value,
      )
    ) {
      for (
        const item of value
      ) {
        collect(
          item,
        );
      }

      return;
    }

    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return;
    }

    const object =
      value as Record<
        string,
        unknown
      >;

    result.push(
      object,
    );

    if (
      object["@graph"]
    ) {
      collect(
        object["@graph"],
      );
    }
  }

  for (
    const script of scripts
  ) {
    try {
      collect(
        JSON.parse(
          decodeEntities(
            script[1],
          ),
        ),
      );
    } catch {
      // niepoprawny JSON-LD pomijamy
    }
  }

  return result;
}

function objectType(
  value: unknown,
) {
  if (
    typeof value ===
      "string"
  ) {
    return [
      normalizeText(
        value,
      ),
    ];
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return value
      .filter(
        (
          item,
        ) =>
          typeof item ===
          "string",
      )
      .map(
        (
          item,
        ) =>
          normalizeText(
            item as string,
          ),
      );
  }

  return [];
}

function productFromJsonLd(
  objects:
    Record<
      string,
      unknown
    >[],
  variantName:
    string,
) {
  const candidates =
    objects.filter(
      (
        object,
      ) => {
        const types =
          objectType(
            object[
              "@type"
            ],
          );

        return types.some(
          (
            type,
          ) =>
            [
              "product",
              "service",
            ].includes(
              type,
            ),
        );
      },
    );

  if (
    candidates.length ===
    0
  ) {
    return null;
  }

  const normalizedVariant =
    normalizeText(
      variantName,
    );

  if (
    normalizedVariant
  ) {
    const exact =
      candidates.find(
        (
          object,
        ) =>
          normalizeText(
            String(
              object.name ??
                "",
            ),
          ).includes(
            normalizedVariant,
          ),
      );

    if (exact) {
      return exact;
    }
  }

  if (
    candidates.length ===
    1
  ) {
    return candidates[0];
  }

  return null;
}

function structuredPrice(
  product:
    Record<
      string,
      unknown
    > | null,
) {
  if (!product) {
    return null;
  }

  const rawOffers =
    product.offers;

  const offers =
    Array.isArray(
      rawOffers,
    )
      ? rawOffers
      : rawOffers
        ? [
            rawOffers,
          ]
        : [];

  for (
    const value of offers
  ) {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      continue;
    }

    const offer =
      value as Record<
        string,
        unknown
      >;

    const price =
      parseNumber(
        String(
          offer.price ??
            offer.lowPrice ??
            "",
        ),
      );

    if (
      price === null
    ) {
      continue;
    }

    const currency =
      String(
        offer.priceCurrency ??
          "",
      )
        .trim()
        .toUpperCase();

    return {
      price,
      currency:
        /^[A-Z]{3}$/.test(
          currency,
        )
          ? currency
          : null,
    };
  }

  return null;
}

function extractTables(
  html: string,
) {
  const tables:
    string[][][] = [];

  const matches =
    html.matchAll(
      /<table\b[^>]*>([\s\S]*?)<\/table>/gi,
    );

  for (
    const match of matches
  ) {
    const rows:
      string[][] = [];

    const rowMatches =
      match[1].matchAll(
        /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi,
      );

    for (
      const rowMatch of rowMatches
    ) {
      const cells:
        string[] = [];

      const cellMatches =
        rowMatch[1].matchAll(
          /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi,
        );

      for (
        const cell of cellMatches
      ) {
        cells.push(
          plainText(
            cell[1],
          ),
        );
      }

      if (
        cells.length >
        0
      ) {
        rows.push(
          cells,
        );
      }
    }

    if (
      rows.length >
      0
    ) {
      tables.push(
        rows,
      );
    }
  }

  return tables;
}

function variantTable(
  tables:
    string[][][],
  variantName:
    string,
) {
  const wanted =
    normalizeText(
      variantName,
    );

  if (!wanted) {
    return null;
  }

  let best:
    {
      rows: string[][];
      column: number;
      size: number;
    } | null =
    null;

  for (
    const rows of tables
  ) {
    for (
      const row of rows
    ) {
      for (
        let column = 0;
        column <
        row.length;
        column++
      ) {
        if (
          !normalizeText(
            row[column],
          ).includes(
            wanted,
          )
        ) {
          continue;
        }

        if (
          !best ||
          row.length >
            best.size
        ) {
          best = {
            rows,
            column,
            size:
              row.length,
          };
        }
      }
    }
  }

  return best;
}

function tableValue(
  table:
    {
      rows: string[][];
      column: number;
    } | null,
  patterns:
    RegExp[],
) {
  if (
    !table ||
    table.column === 0
  ) {
    return "";
  }

  for (
    const row of
      table.rows
  ) {
    if (
      row.length <=
      table.column
    ) {
      continue;
    }

    const label =
      normalizeText(
        row[0],
      );

    if (
      patterns.some(
        (
          pattern,
        ) =>
          pattern.test(
            label,
          ),
      )
    ) {
      return row[
        table.column
      ].trim();
    }
  }

  return "";
}

function focusText(
  text: string,
  variantName:
    string,
) {
  const variant =
    variantName.trim();

  if (!variant) {
    return text.slice(
      0,
      12_000,
    );
  }

  const lower =
    text.toLocaleLowerCase(
      "pl-PL",
    );

  const index =
    lower.indexOf(
      variant.toLocaleLowerCase(
        "pl-PL",
      ),
    );

  if (
    index === -1
  ) {
    return text.slice(
      0,
      12_000,
    );
  }

  return text.slice(
    Math.max(
      0,
      index - 700,
    ),
    Math.min(
      text.length,
      index + 4500,
    ),
  );
}

function priceFromText(
  text: string,
) {
  const patterns =
    [
      /([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:zł|pln)?\s*\/?\s*(?:netto\s*)?(?:pierwszy rok|pierwszego roku)/i,

      /([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:zł|pln)\s*(?:netto\s*)?\/?\s*(?:rok|pierwszy rok)/i,

      /(?:cena[^0-9]{0,35})?pierwsz(?:y|ego)\s+rok[^0-9]{0,40}([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:zł|pln)/i,
    ];

  for (
    const pattern of patterns
  ) {
    const match =
      text.match(
        pattern,
      );

    if (match) {
      return parseNumber(
        match[1],
      );
    }
  }

  return null;
}

function renewalFromText(
  text: string,
) {
  const match =
    text.match(
      /(?:cena\s+)?odnowieni[a-z]*[^0-9]{0,60}([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:zł|pln)/i,
    );

  return match
    ? parseNumber(
        match[1],
      )
    : null;
}

function featureFromText(
  text: string,
  patterns:
    RegExp[],
) {
  for (
    const pattern of patterns
  ) {
    const match =
      text.match(
        pattern,
      );

    if (
      match?.[1]
    ) {
      return match[
        1
      ].trim();
    }
  }

  return "";
}

function buildFeatures(
  html: string,
  text: string,
  variantName:
    string,
) {
  const features:
    FeatureMap = {};

  const tables =
    extractTables(
      html,
    );

  const table =
    variantTable(
      tables,
      variantName,
    );

  const focused =
    focusText(
      text,
      variantName,
    );

  function set(
    key: string,
    value: string,
  ) {
    const clean =
      value.trim();

    if (clean) {
      features[
        key
      ] =
        clean;
    }
  }

  set(
    "dysk",
    tableValue(
      table,
      [
        /pojemnosc/,
        /powierzchnia dyskowa/,
      ],
    ) ||
      featureFromText(
        focused,
        [
          /(?:pojemnosc|dysk|powierzchnia)[^0-9]{0,30}([0-9]+(?:[.,][0-9]+)?\s*(?:gb|tb)(?:\s*(?:ssd\/nvme|ssd|nvme))?)/i,

          /\b([0-9]+(?:[.,][0-9]+)?\s*(?:gb|tb)\s*(?:ssd\/nvme|ssd|nvme))\b/i,
        ],
      ),
  );

  set(
    "ram",
    tableValue(
      table,
      [
        /pamiec ram/,
        /^ram$/,
      ],
    ) ||
      featureFromText(
        focused,
        [
          /(?:pamiec\s+ram|ram)[^0-9]{0,20}([0-9]+(?:[.,][0-9]+)?\s*gb)/i,

          /([0-9]+(?:[.,][0-9]+)?\s*gb)\s+(?:pamieci\s+)?ram/i,
        ],
      ),
  );

  set(
    "cpu",
    tableValue(
      table,
      [
        /gwarantowana moc/,
        /^cpu$/,
        /moc obliczeniowa/,
      ],
    ) ||
      featureFromText(
        focused,
        [
          /(?:cpu|moc obliczeniowa)[^0-9]{0,30}([0-9]+(?:[.,][0-9]+)?\s*(?:vcpu|ghz))/i,

          /([0-9]+(?:[.,][0-9]+)?\s*vcpu)/i,
        ],
      ),
  );

  set(
    "cpu_dynamiczne",
    tableValue(
      table,
      [
        /dynamiczne skalowanie/,
      ],
    ),
  );

  set(
    "transfer",
    tableValue(
      table,
      [
        /transfer/,
      ],
    ) ||
      featureFromText(
        focused,
        [
          /transfer[^.\n]{0,35}(bez\s+limitu)/i,
          /transfer[^0-9]{0,25}([0-9]+(?:[.,][0-9]+)?\s*(?:gb|tb))/i,
        ],
      ),
  );

  set(
    "backup",
    tableValue(
      table,
      [
        /backup/,
        /kopia zapasowa/,
      ],
    ) ||
      featureFromText(
        focused,
        [
          /((?:codzienny|codziennie)[^.\n]{0,40}(?:backup|kopi[a-z]*))/i,

          /((?:backup|kopi[a-z]*)[^.\n]{0,40}[0-9]+\s*dni)/i,
        ],
      ),
  );

  set(
    "php",
    tableValue(
      table,
      [
        /^php$/,
        /wersj[a-z]* php/,
      ],
    ) ||
      featureFromText(
        focused,
        [
          /php[^0-9]{0,20}([0-9]+\.[0-9]+(?:\s*[–-]\s*[0-9]+\.[0-9]+)?)/i,
        ],
      ),
  );

  const normalized =
    normalizeText(
      focused,
    );

  if (
    normalized.includes(
      "let's encrypt",
    ) ||
    normalized.includes(
      "lets encrypt",
    )
  ) {
    set(
      "ssl",
      "Let's Encrypt",
    );
  }

  if (
    /\bssh\b/i.test(
      focused,
    )
  ) {
    set(
      "ssh",
      "Tak",
    );
  }

  if (
    /\bredis\b/i.test(
      focused,
    )
  ) {
    set(
      "redis",
      "Tak",
    );
  }

  if (
    /http\/3/i.test(
      focused,
    )
  ) {
    set(
      "http3",
      "Tak",
    );
  }

  if (
    /\bwaf\b|web application firewall/i.test(
      focused,
    )
  ) {
    set(
      "waf",
      "Tak",
    );
  }

  if (
    /anti[- ]?ddos|ochrona ddos/i.test(
      focused,
    )
  ) {
    set(
      "antyddos",
      "Tak",
    );
  }

  if (
    /bezplatn[a-z]* migrac|darmow[a-z]* migrac/i.test(
      normalizeText(
        focused,
      ),
    )
  ) {
    set(
      "migracja",
      "Bezpłatna",
    );
  }

  const trial =
    focused.match(
      /(?:testuj|test|okres testowy)[^0-9]{0,40}([0-9]+\s*dni)/i,
    );

  if (trial) {
    set(
      "okres_testowy",
      trial[1],
    );
  }

  return features;
}

async function downloadHtml(
  initialUrl: URL,
  provider:
    ProviderForImport,
) {
  const providerUrl =
    assertSafeHttpsUrl(
      provider.websiteUrl,
    );

  let current =
    initialUrl;

  for (
    let redirect =
      0;
    redirect <=
    MAX_REDIRECTS;
    redirect++
  ) {
    if (
      !hostMatches(
        current.hostname,
        providerUrl.hostname,
      )
    ) {
      throw new Error(
        "Przekierowanie prowadzi poza domenę dostawcy.",
      );
    }

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        FETCH_TIMEOUT_MS,
      );

    let response:
      Response;

    try {
      response =
        await fetch(
          current.toString(),
          {
            method:
              "GET",

            redirect:
              "manual",

            cache:
              "no-store",

            signal:
              controller.signal,

            headers: {
              Accept:
                "text/html,application/xhtml+xml",

              "User-Agent":
                "Narzivo-Admin-Importer/1.0",
            },
          },
        );
    } finally {
      clearTimeout(
        timeout,
      );
    }

    if (
      [
        301,
        302,
        303,
        307,
        308,
      ].includes(
        response.status,
      )
    ) {
      const location =
        response.headers.get(
          "location",
        );

      if (!location) {
        throw new Error(
          "Niepoprawne przekierowanie HTTP.",
        );
      }

      current =
        assertSafeHttpsUrl(
          new URL(
            location,
            current,
          ).toString(),
        );

      continue;
    }

    if (!response.ok) {
      throw new Error(
        `Strona zwróciła HTTP ${response.status}.`,
      );
    }

    const contentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes(
          "text/html",
        ) &&
      !contentType
        .toLowerCase()
        .includes(
          "application/xhtml",
        )
    ) {
      throw new Error(
        "URL nie prowadzi do strony HTML.",
      );
    }

    const declaredLength =
      Number(
        response.headers.get(
          "content-length",
        ) ??
          "0",
      );

    if (
      declaredLength >
      MAX_HTML_BYTES
    ) {
      throw new Error(
        "Strona jest zbyt duża dla importera.",
      );
    }

    const bytes =
      await response.arrayBuffer();

    if (
      bytes.byteLength >
      MAX_HTML_BYTES
    ) {
      throw new Error(
        "Strona jest zbyt duża dla importera.",
      );
    }

    return {
      html:
        new TextDecoder().decode(
          bytes,
        ),

      finalUrl:
        current.toString(),
    };
  }

  throw new Error(
    "Zbyt wiele przekierowań.",
  );
}

export async function inspectOfferUrl({
  sourceUrl,
  variantName,
  categorySlug,
}: {
  sourceUrl: string;
  variantName: string;
  categorySlug: string;
}): Promise<ImportedOfferDraft> {
  const requestedUrl =
    assertSafeHttpsUrl(
      sourceUrl,
    );

  const providers =
    await prisma.provider.findMany({
      where: {
        isPublished:
          true,
      },

      select: {
        id:
          true,

        name:
          true,

        slug:
          true,

        websiteUrl:
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
    });

  const provider =
    providers.find(
      (
        candidate,
      ) => {
        try {
          const website =
            new URL(
              candidate.websiteUrl,
            );

          return hostMatches(
            requestedUrl.hostname,
            website.hostname,
          );
        } catch {
          return false;
        }
      },
    );

  if (!provider) {
    throw new Error(
      "URL nie należy do żadnego dostawcy zapisanego w Narzivo.",
    );
  }

  const {
    html,
    finalUrl,
  } =
    await downloadHtml(
      requestedUrl,
      provider,
    );

  const text =
    plainText(
      html,
    );

  const objects =
    jsonLdObjects(
      html,
    );

  const structuredProduct =
    productFromJsonLd(
      objects,
      variantName,
    );

  const structuredName =
    typeof structuredProduct?.name ===
      "string"
      ? structuredProduct.name.trim()
      : "";

  const metaTitle =
    metaValue(
      html,
      [
        "og:title",
        "twitter:title",
      ],
    ) ||
    tagText(
      html,
      "h1",
    ) ||
    tagText(
      html,
      "title",
    );

  const name =
    variantName.trim() ||
    structuredName ||
    metaTitle ||
    `${provider.name} — import`;

  const structuredDescription =
    typeof structuredProduct?.description ===
      "string"
      ? structuredProduct.description.trim()
      : "";

  const metaDescription =
    metaValue(
      html,
      [
        "description",
        "og:description",
        "twitter:description",
      ],
    );

  const summary =
    structuredDescription ||
    metaDescription ||
    firstParagraph(
      html,
    ) ||
    `Szkic oferty ${name} zaimportowany z oficjalnego źródła ${provider.name}.`;

  const description =
    summary;

  const warnings:
    string[] = [];

  if (
    !variantName.trim()
  ) {
    warnings.push(
      "Nie podano nazwy wariantu. Na stronach zawierających kilka pakietów parametry mogą wymagać ręcznej weryfikacji.",
    );
  }

  let features:
    FeatureMap = {};

  if (
    categorySlug ===
    "hosting-www"
  ) {
    features =
      buildFeatures(
        html,
        text,
        variantName ||
          name,
      );
  }

  const table =
    variantTable(
      extractTables(
        html,
      ),
      variantName ||
        name,
    );

  const tableFirstYear =
    tableValue(
      table,
      [
        /cena.*pierwsz.*rok/,
        /zamowienia.*pierwsz.*rok/,
      ],
    );

  const tableRenewal =
    tableValue(
      table,
      [
        /cena odnowienia$/,
        /^odnowienie$/,
      ],
    );

  const focused =
    focusText(
      text,
      variantName ||
        name,
    );

  const structured =
    structuredPrice(
      structuredProduct,
    );

  let priceAmount =
    parseNumber(
      tableFirstYear,
    );

  let priceDetectedAsFirstYear =
    priceAmount !==
    null;

  if (
    priceAmount ===
    null
  ) {
    priceAmount =
      priceFromText(
        focused,
      );

    priceDetectedAsFirstYear =
      priceAmount !==
      null;
  }

  if (
    priceAmount ===
      null &&
    structured &&
    structured.price >
      0
  ) {
    priceAmount =
      structured.price;
  }

  if (
    priceAmount === 0
  ) {
    warnings.push(
      "Na stronie wykryto cenę 0. Importer nie zapisuje jej automatycznie, ponieważ może oznaczać promocję lub bezpłatny pierwszy okres.",
    );

    priceAmount =
      null;
  }

  const renewal =
    parseNumber(
      tableRenewal,
    ) ??
    renewalFromText(
      focused,
    );

  let currency =
    structured?.currency ??
    "PLN";

  if (
    /\bzł\b|\bpln\b/i.test(
      focused,
    ) ||
    /\bzł\b|\bpln\b/i.test(
      tableFirstYear,
    )
  ) {
    currency =
      "PLN";
  }

  const billingPeriod:
    BillingPeriod =
    priceDetectedAsFirstYear
      ? "YEAR"
      : "CUSTOM";

  let billingLabel:
    string | null =
    null;

  const netto =
    /netto/i.test(
      `${tableFirstYear} ${tableRenewal} ${focused.slice(
        0,
        1500,
      )}`,
    );

  if (
    priceAmount !==
      null &&
    priceDetectedAsFirstYear
  ) {
    billingLabel =
      netto
        ? "netto / pierwszy rok"
        : "pierwszy rok";

    if (
      renewal !== null
    ) {
      billingLabel +=
        netto
          ? `; odnowienie ${renewal.toLocaleString(
              "pl-PL",
            )} ${currency} netto / rok`
          : `; odnowienie ${renewal.toLocaleString(
              "pl-PL",
            )} ${currency} / rok`;
    }
  }

  if (
    priceAmount ===
    null
  ) {
    warnings.push(
      "Nie znaleziono ceny o wystarczającej pewności. Uzupełnij ją ręcznie przed publikacją.",
    );
  }

  const featureCount =
    Object.keys(
      features,
    ).length;

  if (
    categorySlug ===
      "hosting-www" &&
    featureCount <
      3
  ) {
    warnings.push(
      "Automatycznie wykryto mniej niż 3 parametry techniczne. Sprawdź formularz parametrów hostingu.",
    );
  }

  const affiliateUrl =
    generateAffiliateUrl({
      providerSlug:
        provider.slug,

      accountReference:
        provider
          .affiliatePrograms[
          0
        ]
          ?.accountReference,

      sourceUrl:
        finalUrl,
    });

  let confidence =
    20;

  if (name) {
    confidence +=
      10;
  }

  if (
    summary.length >=
    40
  ) {
    confidence +=
      10;
  }

  if (
    priceAmount !==
    null
  ) {
    confidence +=
      20;
  }

  if (
    renewal !==
    null
  ) {
    confidence +=
      10;
  }

  if (
    featureCount >=
    3
  ) {
    confidence +=
      20;
  }

  if (
    affiliateUrl
  ) {
    confidence +=
      10;
  }

  return {
    providerId:
      provider.id,

    providerName:
      provider.name,

    providerSlug:
      provider.slug,

    name,

    summary,

    description,

    sourceUrl:
      finalUrl,

    affiliateUrl,

    priceAmount,

    currency,

    billingPeriod,

    billingLabel,

    features:
      features as Prisma.InputJsonValue,

    confidence:
      Math.min(
        100,
        confidence,
      ),

    featureCount,

    warnings,
  };
}