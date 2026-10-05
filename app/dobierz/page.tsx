import Link from "next/link";

import {
  prisma,
} from "@/lib/prisma";

import {
  activeOfferWindowWhere,
  publicOfferWhere,
} from "@/lib/offer-validity";

import {
  formatMoney,
  periodLabel,
  polishDate,
} from "@/lib/format";

import {
  getOfferOutboundLink,
} from "@/lib/offer-link";

import {
  type AdvisorPriority,
  rankAdvisorOffers,
} from "@/lib/advisor";

export const dynamic =
  "force-dynamic";

type SearchParams =
  Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;

type BillingFilter =
  | "ALL"
  | "MONTH"
  | "YEAR"
  | "ONE_TIME"
  | "CUSTOM";

function singleValue(
  value:
    | string
    | string[]
    | undefined,
) {
  return typeof value ===
    "string"
    ? value
    : "";
}

function parsePositiveNumber(
  value: string,
) {
  if (!value) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number,
    ) ||
    number < 0
  ) {
    return null;
  }

  return number;
}

function parsePriority(
  value: string,
): AdvisorPriority {
  if (
    value ===
      "QUALITY" ||
    value ===
      "PRICE" ||
    value ===
      "FRESHNESS"
  ) {
    return value;
  }

  return "BALANCED";
}

function parseBilling(
  value: string,
): BillingFilter {
  if (
    value ===
      "MONTH" ||
    value ===
      "YEAR" ||
    value ===
      "ONE_TIME" ||
    value ===
      "CUSTOM"
  ) {
    return value;
  }

  return "ALL";
}

function parseAge(
  value: string,
) {
  if (value === "7") {
    return 7;
  }

  if (value === "14") {
    return 14;
  }

  if (value === "30") {
    return 30;
  }

  if (value === "90") {
    return 90;
  }

  return null;
}

function priorityLabel(
  priority:
    AdvisorPriority,
) {
  switch (priority) {
    case "QUALITY":
      return "Jakość";

    case "PRICE":
      return "Cena";

    case "FRESHNESS":
      return "Aktualność";

    default:
      return "Balans";
  }
}

export default async function AdvisorPage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  const query =
    await searchParams;

  const now =
    new Date();

  const categorySlug =
    singleValue(
      query.kategoria,
    );

  const useCase =
    singleValue(
      query.potrzeba,
    );

  const budgetRaw =
    singleValue(
      query.budzet,
    );

  const currencyRaw =
    singleValue(
      query.waluta,
    ).toUpperCase();

  const priority =
    parsePriority(
      singleValue(
        query.priorytet,
      ),
    );

  const billing =
    parseBilling(
      singleValue(
        query.okres,
      ),
    );

  const ageRaw =
    singleValue(
      query.aktualnosc,
    ) || "30";

  const maxAge =
    parseAge(
      ageRaw,
    );

  const requireScore =
    singleValue(
      query.tylkoOcenione,
    ) === "1";

  const budget =
    parsePositiveNumber(
      budgetRaw,
    );

  const [
    categories,
    currencyRows,
  ] =
    await Promise.all([
      prisma.category.findMany({
        where: {
          isPublished:
            true,
        },

        include: {
          _count: {
            select: {
              offers: {
                where: {
                  isPublished:
                    true,

                  provider: {
                    isPublished:
                      true,
                  },

                  ...activeOfferWindowWhere(
                    now,
                  ),
                },
              },
            },
          },
        },

        orderBy: {
          sortOrder:
            "asc",
        },
      }),

      prisma.offer.findMany({
        where:
          publicOfferWhere(
            now,
          ),

        select: {
          currency:
            true,
        },

        distinct: [
          "currency",
        ],

        orderBy: {
          currency:
            "asc",
        },
      }),
    ]);

  const currencies =
    currencyRows.length >
    0
      ? currencyRows.map(
          (row) =>
            row.currency,
        )
      : ["PLN"];

  const currency =
    currencies.includes(
      currencyRaw,
    )
      ? currencyRaw
      : currencies.includes(
            "PLN",
          )
        ? "PLN"
        : currencies[0];

  const selectedCategory =
    categories.find(
      (category) =>
        category.slug ===
        categorySlug,
    ) ?? null;

  const rawOffers =
    selectedCategory
      ? await prisma.offer.findMany({
          where: {
            categoryId:
              selectedCategory.id,

            ...publicOfferWhere(
              now,
            ),
          },

          include: {
            provider:
              true,

            category:
              true,
          },

          orderBy: [
            {
              editorScore:
                "desc",
            },

            {
              lastVerifiedAt:
                "desc",
            },
          ],
        })
      : [];

  const offers =
    rawOffers.filter(
      (offer) =>
        billing ===
          "ALL" ||
        offer.billingPeriod ===
          billing,
    );

  const advisorInputs =
    offers.map(
      (offer) => ({
        id:
          offer.id,

        name:
          offer.name,

        summary:
          offer.summary,

        description:
          offer.description,

        priceAmount:
          offer.priceAmount ===
          null
            ? null
            : Number(
                offer.priceAmount,
              ),

        currency:
          offer.currency,

        editorScore:
          offer.editorScore ===
          null
            ? null
            : Number(
                offer.editorScore,
              ),

        lastVerifiedAt:
          offer.lastVerifiedAt,

        useCases:
          offer.useCases,

        features:
          offer.features,
      }),
    );

  const ranking =
    selectedCategory
      ? rankAdvisorOffers(
          advisorInputs,
          {
            budget,
            currency,
            priority,
            useCase,
            requireScore,

            maxVerificationAgeDays:
              maxAge,
          },
        )
      : [];

  const offerMap =
    new Map(
      offers.map(
        (offer) => [
          offer.id,
          offer,
        ],
      ),
    );

  const results =
    ranking
      .flatMap(
        (result) => {
          const offer =
            offerMap.get(
              result.offerId,
            );

          return offer
            ? [
                {
                  result,
                  offer,
                },
              ]
            : [];
        },
      )
      .slice(0, 12);

  return (
    <main>
      <section className="border-b border-[#eceef2] bg-white">
        <div className="container py-14 md:py-20">
          <div className="max-w-3xl">
            <span className="eyebrow">
              Doradca Narzivo
            </span>

            <h1 className="mt-4 text-[clamp(2.7rem,6vw,5rem)] font-[730] leading-[0.98] tracking-[-0.06em]">
              Znajdź usługę
              dopasowaną do
              swoich potrzeb.
            </h1>

            <p className="mt-6 max-w-2xl text-[17px] leading-8 text-[#667085]">
              Analizujemy tylko
              aktywne i aktualnie
              dostępne oferty.
            </p>
          </div>
        </div>
      </section>

      <section className="container py-10 md:py-14">
        <form
          method="get"
          className="card overflow-hidden"
        >
          <div className="border-b border-[#eceef2] px-6 py-5">
            <h2 className="text-lg font-[680]">
              Czego potrzebujesz?
            </h2>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
            <label>
              <span className="label">
                Kategoria *
              </span>

              <select
                name="kategoria"
                required
                className="field"
                defaultValue={
                  categorySlug
                }
              >
                <option value="">
                  Wybierz kategorię
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.slug
                      }
                    >
                      {
                        category.name
                      }{" "}
                      ({
                        category
                          ._count
                          .offers
                      })
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="xl:col-span-2">
              <span className="label">
                Do czego potrzebujesz
                usługi?
              </span>

              <input
                name="potrzeba"
                className="field"
                placeholder="Opisz zastosowanie"
                defaultValue={
                  useCase
                }
              />
            </label>

            <label>
              <span className="label">
                Maksymalny budżet
              </span>

              <div className="grid grid-cols-[1fr_100px] gap-2">
                <input
                  name="budzet"
                  type="number"
                  min="0"
                  step="0.01"
                  className="field"
                  defaultValue={
                    budgetRaw
                  }
                />

                <select
                  name="waluta"
                  className="field"
                  defaultValue={
                    currency
                  }
                >
                  {currencies.map(
                    (item) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {item}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </label>

            <label>
              <span className="label">
                Priorytet
              </span>

              <select
                name="priorytet"
                className="field"
                defaultValue={
                  priority
                }
              >
                <option value="BALANCED">
                  Balans
                </option>

                <option value="QUALITY">
                  Najwyższa jakość
                </option>

                <option value="PRICE">
                  Najlepsza cena
                </option>

                <option value="FRESHNESS">
                  Najświeższe dane
                </option>
              </select>
            </label>

            <label>
              <span className="label">
                Okres rozliczeniowy
              </span>

              <select
                name="okres"
                className="field"
                defaultValue={
                  billing
                }
              >
                <option value="ALL">
                  Dowolny
                </option>

                <option value="MONTH">
                  Miesięczny
                </option>

                <option value="YEAR">
                  Roczny
                </option>

                <option value="ONE_TIME">
                  Jednorazowy
                </option>

                <option value="CUSTOM">
                  Inny
                </option>
              </select>
            </label>

            <label>
              <span className="label">
                Aktualność danych
              </span>

              <select
                name="aktualnosc"
                className="field"
                defaultValue={
                  ageRaw
                }
              >
                <option value="7">
                  7 dni
                </option>

                <option value="14">
                  14 dni
                </option>

                <option value="30">
                  30 dni
                </option>

                <option value="90">
                  90 dni
                </option>

                <option value="ALL">
                  Bez limitu
                </option>
              </select>
            </label>

            <label className="flex items-start gap-3 rounded-[14px] border border-[#e7e9ee] bg-[#fafbfc] p-4 md:col-span-2 xl:col-span-3">
              <input
                type="checkbox"
                name="tylkoOcenione"
                value="1"
                className="mt-1"
                defaultChecked={
                  requireScore
                }
              />

              <div>
                <div className="text-sm font-semibold">
                  Tylko kompletne
                  oceny Narzivo
                </div>

                <p className="mt-1 text-xs text-[#98a2b3]">
                  Pomija produkty,
                  których metodologia
                  nie jest jeszcze
                  kompletna.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-between border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4">
            <Link
              href="/dobierz"
              className="text-sm font-medium text-[#667085]"
            >
              Wyczyść
            </Link>

            <button
              type="submit"
              className="btn btn-primary"
            >
              Znajdź oferty
              <span>
                →
              </span>
            </button>
          </div>
        </form>

        {selectedCategory ? (
          <section className="mt-12">
            <span className="eyebrow">
              Rekomendacje
            </span>

            <h2 className="mt-3 text-[30px] font-[700]">
              {
                selectedCategory.name
              }
            </h2>

            <p className="mt-2 text-sm text-[#667085]">
              Priorytet:{" "}
              <strong>
                {priorityLabel(
                  priority,
                )}
              </strong>
            </p>

            {results.length >
            0 ? (
              <div className="mt-7 space-y-4">
                {results.map(
                  ({
                    result,
                    offer,
                  }, index) => {
                    const outbound =
                      getOfferOutboundLink(
                        offer,
                      );

                    return (
                      <article
                        key={
                          offer.id
                        }
                        className="rounded-[20px] border border-[#e7e9ee] bg-white p-6"
                      >
                        <div className="grid gap-6 md:grid-cols-[70px_1fr_220px]">
                          <div className="text-[28px] font-[730]">
                            #
                            {index +
                              1}
                          </div>

                          <div>
                            <div className="text-xs text-[#98a2b3]">
                              {
                                offer.provider.name
                              }
                            </div>

                            <Link
                              href={`/uslugi/${offer.slug}`}
                              className="mt-1 block text-xl font-[700] hover:text-[#5048d8]"
                            >
                              {
                                offer.name
                              }
                            </Link>

                            <p className="mt-3 text-sm leading-6 text-[#667085]">
                              {
                                offer.summary
                              }
                            </p>

                            {result.reasons.length >
                            0 ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {result.reasons.map(
                                  (reason) => (
                                    <span
                                      key={
                                        reason
                                      }
                                      className="rounded-full bg-[#f2f4f7] px-3 py-1.5 text-[11px] text-[#475467]"
                                    >
                                      {
                                        reason
                                      }
                                    </span>
                                  ),
                                )}
                              </div>
                            ) : null}
                          </div>

                          <div className="border-t border-[#eceef2] pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                            <div className="text-[10px] uppercase text-[#98a2b3]">
                              Dopasowanie
                            </div>

                            <div className="mt-2 text-[38px] font-[740]">
                              {
                                result.matchScore
                              }
                              %
                            </div>

                            <div className="mt-4 text-lg font-[680]">
                              {formatMoney(
                                offer.priceAmount,
                                offer.currency,
                              ) ??
                                "Cena indywidualna"}
                            </div>

                            <div className="mt-1 text-[11px] text-[#98a2b3]">
                              {periodLabel(
                                offer.billingPeriod,
                                offer.billingLabel,
                              )}
                            </div>

                            <div className="mt-3 text-[10px] text-[#98a2b3]">
                              Zweryfikowano{" "}
                              {polishDate(
                                offer.lastVerifiedAt,
                              )}
                            </div>

                            <a
                              href={
                                outbound.href
                              }
                              target="_blank"
                              rel={
                                outbound.rel
                              }
                              className="btn btn-primary mt-5 w-full"
                            >
                              {
                                outbound.label
                              }
                            </a>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="mt-7 rounded-[20px] border border-dashed border-[#d9dde5] bg-[#fafbfc] p-10 text-center">
                Brak aktywnych ofert
                spełniających te
                kryteria.
              </div>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}