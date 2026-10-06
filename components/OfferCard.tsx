import Link from "next/link";

import {
  formatMoney,
  polishDate,
} from "@/lib/format";

import {
  getOfferOutboundLink,
} from "@/lib/offer-link";

import {
  isOfferActiveAt,
} from "@/lib/offer-validity";

type OfferCardOffer = {
  id: string;
  slug: string;
  name: string;
  summary: string;

  priceAmount:
    unknown;

  regularPrice:
    unknown;

  currency: string;
  billingPeriod: string;

  billingLabel:
    | string
    | null;

  editorScore:
    unknown;

  affiliateUrl:
    | string
    | null;

  sourceUrl: string;

  features?:
    unknown;

  validFrom?:
    | Date
    | null;

  validTo?:
    | Date
    | null;

  lastVerifiedAt:
    Date;

  provider: {
    name: string;

    logoUrl:
      | string
      | null;
  };

  category: {
    name: string;
    slug: string;
  };
};

type FeatureMap =
  Record<
    string,
    unknown
  >;

function featureObject(
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

function featureText(
  features:
    FeatureMap,
  ...keys:
    string[]
) {
  for (
    const key of keys
  ) {
    const value =
      features[
        key
      ];

    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      typeof value ===
        "number"
    ) {
      return String(
        value,
      );
    }
  }

  return null;
}

function compactPeriodLabel(
  period:
    string,
) {
  switch (
    period
  ) {
    case "MONTH":
      return "/ mies.";

    case "YEAR":
      return "/ rok";

    case "ONE_TIME":
      return "jednorazowo";

    default:
      return "";
  }
}

function scoreLabel(
  score:
    number,
) {
  if (
    score >=
    8.5
  ) {
    return "Świetna";
  }

  if (
    score >=
    8
  ) {
    return "Bardzo dobra";
  }

  if (
    score >=
    7
  ) {
    return "Dobra";
  }

  if (
    score >=
    6
  ) {
    return "Solidna";
  }

  return "Podstawowa";
}

function getHighlights(
  offer:
    OfferCardOffer,
) {
  const features =
    featureObject(
      offer.features,
    );

  const candidates =
    offer.category.slug ===
    "vps-cloud-server"
      ? [
          {
            label:
              "CPU",
            value:
              featureText(
                features,
                "vcpu",
                "cpu",
              ),
          },

          {
            label:
              "RAM",
            value:
              featureText(
                features,
                "ram",
              ),
          },

          {
            label:
              "Dysk",
            value:
              featureText(
                features,
                "dysk",
              ),
          },
        ]
      : [
          {
            label:
              "Dysk",
            value:
              featureText(
                features,
                "dysk",
                "dysk_bazowy",
              ),
          },

          {
            label:
              "Transfer",
            value:
              featureText(
                features,
                "transfer",
              ),
          },

          {
            label:
              "Backup",
            value:
              featureText(
                features,
                "backup",
              ),
          },
        ];

  return candidates
    .filter(
      (
        item,
      ): item is {
        label:
          string;

        value:
          string;
      } =>
        Boolean(
          item.value,
        ),
    )
    .slice(
      0,
      3,
    );
}

export function OfferCard({
  offer,
}: {
  offer:
    OfferCardOffer;
}) {
  if (
    !isOfferActiveAt({
      validFrom:
        offer.validFrom ??
        null,

      validTo:
        offer.validTo ??
        null,
    })
  ) {
    return null;
  }

  const price =
    formatMoney(
      offer.priceAmount,
      offer.currency,
    );

  const regularPrice =
    formatMoney(
      offer.regularPrice,
      offer.currency,
    );

  const score =
    offer.editorScore !==
      null &&
    offer.editorScore !==
      undefined
      ? Number(
          offer.editorScore,
        )
      : null;

  const outbound =
    getOfferOutboundLink(
      offer,
    );

  const initials =
    offer.provider.name
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      )
      .map(
        (
          part,
        ) =>
          part.charAt(
            0,
          ),
      )
      .join(
        "",
      )
      .slice(
        0,
        2,
      )
      .toUpperCase();

  const highlights =
    getHighlights(
      offer,
    );

  return (
    <article className="group relative flex min-h-full flex-col overflow-hidden rounded-[22px] border border-[#e7e9ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all duration-200 hover:-translate-y-1 hover:border-[#d8d4ff] hover:shadow-[0_18px_50px_rgba(16,24,40,0.08)]">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#635bff] to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[12px] border border-[#e7e9ee] bg-[#fafbfc]">
              {offer.provider.logoUrl ? (
                <img
                  src={
                    offer.provider.logoUrl
                  }
                  alt={`Logo ${offer.provider.name}`}
                  loading="lazy"
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <span className="text-xs font-bold text-[#475467]">
                  {
                    initials
                  }
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate text-[13px] font-[680] text-[#344054]">
                {
                  offer.provider.name
                }
              </div>

              <Link
                href={`/kategorie/${offer.category.slug}`}
                className="mt-1 block truncate text-[11px] text-[#98a2b3] transition hover:text-[#635bff]"
              >
                {
                  offer.category.name
                }
              </Link>
            </div>
          </div>

          {score !==
          null ? (
            <div className="shrink-0 text-right">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#dedcff] bg-[#f7f6ff] px-2.5 py-1.5">
                <span className="text-[13px] font-[760] tracking-[-0.02em] text-[#5048d8]">
                  {score.toFixed(
                    1,
                  )}
                </span>

                <span className="text-[10px] font-medium text-[#8b86d8]">
                  /10
                </span>
              </div>

              <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                {scoreLabel(
                  score,
                )}
              </div>
            </div>
          ) : null}
        </div>

        <Link
          href={`/uslugi/${offer.slug}`}
          className="mt-6 block"
        >
          <h3 className="text-[21px] font-[710] leading-[1.18] tracking-[-0.035em] text-[#101114] transition group-hover:text-[#5048d8]">
            {
              offer.name
            }
          </h3>
        </Link>

        <p className="mt-3 line-clamp-3 min-h-[72px] text-[13px] leading-6 text-[#667085]">
          {
            offer.summary
          }
        </p>

        {highlights.length >
        0 ? (
          <div className="mt-5 grid grid-cols-3 gap-2">
            {highlights.map(
              (
                item,
              ) => (
                <div
                  key={
                    item.label
                  }
                  className="min-w-0 rounded-[12px] border border-[#edf0f3] bg-[#fafbfc] px-3 py-2.5"
                >
                  <div className="text-[9px] font-bold uppercase tracking-[0.07em] text-[#98a2b3]">
                    {
                      item.label
                    }
                  </div>

                  <div className="mt-1 truncate text-[11px] font-[650] text-[#344054]">
                    {
                      item.value
                    }
                  </div>
                </div>
              ),
            )}
          </div>
        ) : null}

        <div className="mt-6 border-t border-[#edf0f3] pt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#98a2b3]">
                Cena
              </div>

              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                <span className="text-[28px] font-[750] tracking-[-0.045em] text-[#101114]">
                  {price ??
                    "Cena indywidualna"}
                </span>

                {price ? (
                  <span className="text-[11px] text-[#98a2b3]">
                    {compactPeriodLabel(
                      offer.billingPeriod,
                    )}
                  </span>
                ) : null}
              </div>
            </div>

            {regularPrice ? (
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-[0.06em] text-[#b0b5bf]">
                  regularnie
                </div>

                <div className="mt-1 text-[12px] text-[#98a2b3] line-through">
                  {
                    regularPrice
                  }
                </div>
              </div>
            ) : null}
          </div>

          {offer.billingLabel ? (
            <div className="mt-2 line-clamp-1 text-[10px] leading-5 text-[#98a2b3]">
              {
                offer.billingLabel
              }
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-2 text-[10px] text-[#98a2b3]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />

            <span>
              Zweryfikowano{" "}
              {polishDate(
                offer.lastVerifiedAt,
              )}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-6">
          <div className="grid grid-cols-[0.9fr_1.1fr] gap-2">
            <Link
              href={`/uslugi/${offer.slug}`}
              className="btn btn-secondary"
            >
              Szczegóły
            </Link>

            <a
              href={
                outbound.href
              }
              target="_blank"
              rel={
                outbound.rel
              }
              className="btn btn-primary"
            >
              {
                outbound.label
              }

              <span>
                ↗
              </span>
            </a>
          </div>

          <Link
            href={`/porownaj?oferty=${offer.id}`}
            className="mt-2 flex min-h-10 w-full items-center justify-center rounded-[10px] px-4 text-[12px] font-[650] text-[#5048d8] transition hover:bg-[#f5f4ff]"
          >
            + Dodaj do porównania
          </Link>
        </div>
      </div>

      <div className="border-t border-[#f0f1f3] bg-[#fafbfc] px-5 py-3">
        <p className="text-[9px] leading-4 text-[#98a2b3]">
          {
            outbound.disclosure
          }
        </p>
      </div>
    </article>
  );
}