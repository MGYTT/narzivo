import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  getOfferScoreState,
} from "@/lib/rating";

import {
  getOfferOutboundLink,
} from "@/lib/offer-link";

import {
  formatMoney,
  periodLabel,
  polishDate,
} from "@/lib/format";

import {
  OfferCard,
} from "@/components/OfferCard";

export const revalidate =
  900;

function featureValue(
  value: unknown,
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "Tak"
      : "Nie";
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .map(String)
      .join(", ");
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return JSON.stringify(
      value,
    );
  }

  return value ===
      null ||
    value ===
      undefined
    ? "—"
    : String(value);
}

function scoreDescription(
  score: number,
) {
  if (score >= 9) {
    return "Wybitna";
  }

  if (score >= 8) {
    return "Bardzo dobra";
  }

  if (score >= 7) {
    return "Dobra";
  }

  if (score >= 6) {
    return "Przeciętna";
  }

  return "Poniżej średniej";
}

export default async function OfferPage({
  params,
}: {
  params:
    Promise<{
      slug: string;
    }>;
}) {
  const {
    slug,
  } =
    await params;

  const offer =
    await prisma.offer.findUnique({
      where: {
        slug,
      },

      include: {
        provider:
          true,

        category: {
          include: {
            ratingCriteria: {
              where: {
                isPublished:
                  true,
              },

              orderBy: {
                sortOrder:
                  "asc",
              },
            },
          },
        },

        priceHistory: {
          orderBy: {
            capturedAt:
              "desc",
          },

          take: 8,
        },

        ratings: {
          include: {
            criterion:
              true,
          },
        },
      },
    });

  if (
    !offer ||
    !offer.isPublished ||
    !offer.provider
      .isPublished ||
    !offer.category
      .isPublished
  ) {
    notFound();
  }

  const [
    related,
    scoreState,
  ] =
    await Promise.all([
      prisma.offer.findMany({
        where: {
          id: {
            not:
              offer.id,
          },

          categoryId:
            offer.categoryId,

          isPublished:
            true,

          provider: {
            isPublished:
              true,
          },
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

        take: 3,
      }),

      getOfferScoreState(
        offer.id,
      ),
    ]);

  const outbound =
    getOfferOutboundLink(
      offer,
    );

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

  const features =
    offer.features &&
    typeof offer.features ===
      "object" &&
    !Array.isArray(
      offer.features,
    )
      ? Object.entries(
          offer.features as Record<
            string,
            unknown
          >,
        )
      : [];

  const ratingMap =
    new Map(
      offer.ratings.map(
        (rating) => [
          rating.criterionId,
          rating,
        ],
      ),
    );

  const totalWeight =
    offer.category.ratingCriteria.reduce(
      (
        total,
        criterion,
      ) =>
        total +
        Number(
          criterion.weight,
        ),
      0,
    );

  const initials =
    offer.provider.name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) =>
        part.charAt(0),
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <main>
      <section className="border-b border-[#eceef2] bg-white">
        <div className="container py-7">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#98a2b3]">
            <Link href="/">
              Narzivo
            </Link>

            <span>/</span>

            <Link
              href={`/kategorie/${offer.category.slug}`}
            >
              {
                offer.category.name
              }
            </Link>

            <span>/</span>

            <span className="text-[#344054]">
              {offer.name}
            </span>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_370px]">
          <article>
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-[13px] border border-[#e7e9ee] bg-white">
                {offer.provider.logoUrl ? (
                  <img
                    src={
                      offer.provider.logoUrl
                    }
                    alt={`Logo ${offer.provider.name}`}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-sm font-bold text-[#475467]">
                    {initials}
                  </span>
                )}
              </div>

              <div>
                <div className="text-[13px] font-semibold">
                  {
                    offer.provider.name
                  }
                </div>

                <div className="mt-1 text-[12px] text-[#98a2b3]">
                  {
                    offer.category.name
                  }
                </div>
              </div>
            </div>

            <div className="mt-8">
              <span className="badge">
                {
                  outbound.isAffiliate
                    ? "Materiał reklamowy · link afiliacyjny"
                    : "Zweryfikowana oferta"
                }
              </span>

              <h1 className="mt-6 max-w-4xl text-[clamp(2.5rem,5vw,4.5rem)] font-[720] leading-[1] tracking-[-0.055em]">
                {offer.name}
              </h1>

              <p className="mt-6 max-w-3xl text-[18px] leading-8 text-[#667085]">
                {
                  offer.description
                }
              </p>
            </div>

            {scoreState.complete &&
            scoreState.score !==
              null ? (
              <section className="mt-10 overflow-hidden rounded-[20px] border border-[#dedcff] bg-[#fafaff]">
                <div className="grid md:grid-cols-[220px_1fr]">
                  <div className="border-b border-[#e8e6ff] p-6 md:border-b-0 md:border-r">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7771d7]">
                      Ocena Narzivo
                    </div>

                    <div className="mt-3 text-[50px] font-[740] tracking-[-0.055em]">
                      {scoreState.score.toFixed(
                        1,
                      )}

                      <span className="ml-1 text-xl font-medium text-[#98a2b3]">
                        /10
                      </span>
                    </div>

                    <div className="mt-3 text-sm font-semibold text-[#5048d8]">
                      {scoreDescription(
                        scoreState.score,
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <h2 className="text-lg font-[680]">
                      Wynik oparty na{" "}
                      {
                        scoreState.criteriaCount
                      }{" "}
                      kryteriach
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#667085]">
                      Relacja
                      afiliacyjna nie
                      wpływa na ocenę.
                    </p>

                    <Link
                      href="/metodologia"
                      className="mt-4 inline-flex text-sm font-semibold text-[#5048d8]"
                    >
                      Metodologia →
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            {offer.category
              .ratingCriteria
              .length > 0 ? (
              <section className="mt-14">
                <span className="eyebrow">
                  Ocena Narzivo
                </span>

                <h2 className="mt-3 text-[28px] font-[700]">
                  Oceny składowe
                </h2>

                <div className="mt-7 space-y-3">
                  {offer.category.ratingCriteria.map(
                    (criterion) => {
                      const rating =
                        ratingMap.get(
                          criterion.id,
                        );

                      const score =
                        rating
                          ? Number(
                              rating.score,
                            )
                          : null;

                      const weight =
                        totalWeight >
                        0
                          ? (Number(
                              criterion.weight,
                            ) /
                              totalWeight) *
                            100
                          : 0;

                      return (
                        <article
                          key={
                            criterion.id
                          }
                          className="rounded-[16px] border border-[#e7e9ee] bg-white p-5"
                        >
                          <div className="flex justify-between gap-5">
                            <div>
                              <div className="font-[680]">
                                {
                                  criterion.name
                                }
                              </div>

                              {criterion.description ? (
                                <p className="mt-2 text-xs leading-5 text-[#667085]">
                                  {
                                    criterion.description
                                  }
                                </p>
                              ) : null}

                              <div className="mt-2 text-[10px] text-[#98a2b3]">
                                Waga{" "}
                                {weight.toLocaleString(
                                  "pl-PL",
                                  {
                                    maximumFractionDigits: 1,
                                  },
                                )}
                                %
                              </div>
                            </div>

                            <div className="shrink-0 font-semibold">
                              {score !==
                              null
                                ? `${score.toFixed(
                                    1,
                                  )}/10`
                                : "—"}
                            </div>
                          </div>

                          {score !==
                          null ? (
                            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f2f4f7]">
                              <div
                                className="h-full rounded-full bg-[#635bff]"
                                style={{
                                  width: `${score *
                                    10}%`,
                                }}
                              />
                            </div>
                          ) : null}

                          {rating?.note ? (
                            <p className="mt-4 text-xs leading-5 text-[#667085]">
                              {
                                rating.note
                              }
                            </p>
                          ) : null}
                        </article>
                      );
                    },
                  )}
                </div>
              </section>
            ) : null}

            {(offer.pros.length >
              0 ||
              offer.cons.length >
                0) ? (
              <section className="mt-14">
                <span className="eyebrow">
                  Analiza
                </span>

                <h2 className="mt-3 text-[28px] font-[700]">
                  Mocne strony i
                  ograniczenia
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="card p-6">
                    <h3 className="font-[680]">
                      Mocne strony
                    </h3>

                    <ul className="mt-5 space-y-3">
                      {offer.pros.map(
                        (item) => (
                          <li
                            key={
                              item
                            }
                            className="text-sm leading-6 text-[#667085]"
                          >
                            ✓ {item}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div className="card p-6">
                    <h3 className="font-[680]">
                      Ograniczenia
                    </h3>

                    <ul className="mt-5 space-y-3">
                      {offer.cons.map(
                        (item) => (
                          <li
                            key={
                              item
                            }
                            className="text-sm leading-6 text-[#667085]"
                          >
                            – {item}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              </section>
            ) : null}

            {features.length >
            0 ? (
              <section className="mt-14">
                <span className="eyebrow">
                  Parametry
                </span>

                <h2 className="mt-3 text-[28px] font-[700]">
                  Specyfikacja
                </h2>

                <div className="table-wrap mt-6">
                  <table>
                    <tbody>
                      {features.map(
                        ([
                          key,
                          value,
                        ]) => (
                          <tr
                            key={
                              key
                            }
                          >
                            <th>
                              {key}
                            </th>

                            <td>
                              {featureValue(
                                value,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            <section className="mt-14 rounded-[20px] border border-[#e7e9ee] bg-[#fafbfc] p-6">
              <span className="eyebrow">
                Transparentność
              </span>

              <h2 className="mt-3 text-xl font-[680]">
                Źródło i
                weryfikacja
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#667085]">
                Dane zweryfikowano{" "}
                <strong>
                  {polishDate(
                    offer.lastVerifiedAt,
                  )}
                </strong>
                .
              </p>

              <a
                href={
                  offer.sourceUrl
                }
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-[#5048d8]"
              >
                Oficjalne źródło ↗
              </a>

              <p className="mt-4 text-xs leading-6 text-[#667085]">
                {outbound.isAffiliate
                  ? "Przycisk oferty korzysta obecnie z linku partnerskiego. Narzivo może otrzymać prowizję po zakupie."
                  : "Narzivo nie posiada obecnie aktywnego linku partnerskiego do tej oferty. Główny przycisk prowadzi bezpośrednio do oficjalnej strony dostawcy."}
              </p>
            </section>
          </article>

          <aside>
            <div className="card sticky top-24 overflow-hidden">
              <div className="p-6">
                <div className="text-xs text-[#98a2b3]">
                  Cena zweryfikowana
                </div>

                <div className="mt-3 text-[34px] font-[730] tracking-[-0.045em]">
                  {price ??
                    "Cena indywidualna"}
                </div>

                <div className="mt-2 text-[13px] text-[#98a2b3]">
                  {periodLabel(
                    offer.billingPeriod,
                    offer.billingLabel,
                  )}
                </div>

                {regularPrice ? (
                  <div className="mt-2 text-sm text-[#98a2b3] line-through">
                    {
                      regularPrice
                    }
                  </div>
                ) : null}

                <a
                  href={
                    outbound.href
                  }
                  target="_blank"
                  rel={
                    outbound.rel
                  }
                  className="btn btn-primary mt-6 w-full"
                >
                  {
                    outbound.label
                  }

                  <span>
                    ↗
                  </span>
                </a>

                <Link
                  href={`/porownaj?oferty=${offer.id}`}
                  className="btn btn-secondary mt-2 w-full"
                >
                  Dodaj do
                  porównania
                </Link>
              </div>

              <div className="border-t border-[#eceef2] bg-[#fafbfc] p-5 text-[11px] leading-5 text-[#98a2b3]">
                {
                  outbound.disclosure
                }

                {outbound.isAffiliate
                  ? ". Narzivo może otrzymać prowizję. Nie wpływa to na ocenę produktu."
                  : ". Brak aktywnej afiliacji Narzivo."}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {related.length >
      0 ? (
        <section className="border-t border-[#eceef2] bg-[#fafbfc]">
          <div className="container page-section">
            <span className="eyebrow">
              Alternatywy
            </span>

            <h2 className="h2 mt-3">
              Sprawdź również
            </h2>

            <div className="grid-auto mt-9">
              {related.map(
                (relatedOffer) => (
                  <OfferCard
                    key={
                      relatedOffer.id
                    }
                    offer={
                      relatedOffer
                    }
                  />
                ),
              )}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}