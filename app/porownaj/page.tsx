import Link from "next/link";

import {
  prisma,
} from "@/lib/prisma";

import {
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
  ComparePicker,
} from "@/components/ComparePicker";

export const dynamic =
  "force-dynamic";

type SearchParams =
  Promise<{
    oferty?:
      | string
      | string[];
  }>;

function parsedIds(
  value:
    | string
    | string[]
    | undefined,
) {
  const raw =
    Array.isArray(value)
      ? value.join(",")
      : value ?? "";

  return Array.from(
    new Set(
      raw
        .split(",")
        .map(
          (id) =>
            id.trim(),
        )
        .filter(Boolean),
    ),
  ).slice(
    0,
    4,
  );
}

function numeric(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
    : null;
}

function winnersMax(
  values: {
    id: string;
    value: number | null;
  }[],
) {
  const valid =
    values.filter(
      (
        item,
      ): item is {
        id: string;
        value: number;
      } =>
        item.value !==
        null,
    );

  if (
    valid.length < 2
  ) {
    return new Set<string>();
  }

  const best =
    Math.max(
      ...valid.map(
        (item) =>
          item.value,
      ),
    );

  return new Set(
    valid
      .filter(
        (item) =>
          item.value ===
          best,
      )
      .map(
        (item) =>
          item.id,
      ),
  );
}

function winnersMin(
  values: {
    id: string;
    value: number | null;
  }[],
) {
  const valid =
    values.filter(
      (
        item,
      ): item is {
        id: string;
        value: number;
      } =>
        item.value !==
        null,
    );

  if (
    valid.length < 2
  ) {
    return new Set<string>();
  }

  const best =
    Math.min(
      ...valid.map(
        (item) =>
          item.value,
      ),
    );

  return new Set(
    valid
      .filter(
        (item) =>
          item.value ===
          best,
      )
      .map(
        (item) =>
          item.id,
      ),
  );
}

function BestBadge() {
  return (
    <span className="ml-2 inline-flex rounded-full bg-[#ecfdf3] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-[#087443]">
      najlepszy
    </span>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  const query =
    await searchParams;

  const now =
    new Date();

  const ids =
    parsedIds(
      query.oferty,
    );

  const [
    pickerOffers,
    selectedRaw,
  ] =
    await Promise.all([
      prisma.offer.findMany({
        where:
          publicOfferWhere(
            now,
          ),

        select: {
          id:
            true,

          name:
            true,

          provider: {
            select: {
              name:
                true,
            },
          },

          category: {
            select: {
              id:
                true,

              name:
                true,
            },
          },
        },

        orderBy: {
          name:
            "asc",
        },
      }),

      ids.length > 0
        ? prisma.offer.findMany({
            where: {
              id: {
                in:
                  ids,
              },

              ...publicOfferWhere(
                now,
              ),
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

              ratings:
                true,
            },
          })
        : Promise.resolve(
            [],
          ),
    ]);

  const ordered =
    ids.flatMap(
      (id) => {
        const offer =
          selectedRaw.find(
            (item) =>
              item.id ===
              id,
          );

        return offer
          ? [offer]
          : [];
      },
    );

  const categoryId =
    ordered[0]
      ?.categoryId ??
    null;

  const selected =
    categoryId
      ? ordered.filter(
          (offer) =>
            offer.categoryId ===
            categoryId,
        )
      : [];

  const removedCount =
    ids.length -
    selected.length;

  const criteria =
    selected[0]
      ?.category
      .ratingCriteria ??
    [];

  const totalWeight =
    criteria.reduce(
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

  const overallWinners =
    winnersMax(
      selected.map(
        (offer) => ({
          id:
            offer.id,

          value:
            numeric(
              offer.editorScore,
            ),
        }),
      ),
    );

  const currencies =
    new Set(
      selected
        .filter(
          (offer) =>
            offer.priceAmount !==
            null,
        )
        .map(
          (offer) =>
            offer.currency,
        ),
    );

  const comparablePrices =
    currencies.size <=
    1;

  const priceWinners =
    comparablePrices
      ? winnersMin(
          selected.map(
            (offer) => ({
              id:
                offer.id,

              value:
                numeric(
                  offer.priceAmount,
                ),
            }),
          ),
        )
      : new Set<string>();

  const criterionWinners =
    new Map<
      string,
      Set<string>
    >();

  for (
    const criterion of criteria
  ) {
    criterionWinners.set(
      criterion.id,

      winnersMax(
        selected.map(
          (offer) => {
            const rating =
              offer.ratings.find(
                (item) =>
                  item.criterionId ===
                  criterion.id,
              );

            return {
              id:
                offer.id,

              value:
                rating
                  ? Number(
                      rating.score,
                    )
                  : null,
            };
          },
        ),
      ),
    );
  }

  return (
    <main>
      <section className="border-b border-[#eceef2] bg-white">
        <div className="container py-14 md:py-20">
          <span className="eyebrow">
            Porównywarka
          </span>

          <h1 className="mt-4 max-w-4xl text-[clamp(2.8rem,6vw,5rem)] font-[730] leading-[0.98] tracking-[-0.06em]">
            Porównaj aktywne
            oferty punkt po punkcie.
          </h1>
        </div>
      </section>

      <div className="container py-10 md:py-14">
        <ComparePicker
          offers={
            pickerOffers
          }
          initialSelected={selected.map(
            (offer) =>
              offer.id,
          )}
        />

        {removedCount >
        0 ? (
          <div className="mt-5 rounded-[14px] border border-[#fedf89] bg-[#fffaeb] p-4 text-sm text-[#b54708]">
            Część ofert została
            pominięta, ponieważ
            wygasła, jeszcze się
            nie rozpoczęła, została
            ukryta albo pochodziła
            z innej kategorii.
          </div>
        ) : null}

        {selected.length >
        0 ? (
          <>
            <section className="mt-10">
              <span className="eyebrow">
                {
                  selected[0]
                    .category
                    .name
                }
              </span>

              <h2 className="mt-3 text-[30px] font-[700]">
                Zestawienie
              </h2>

              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {selected.map(
                  (offer) => {
                    const score =
                      numeric(
                        offer.editorScore,
                      );

                    const outbound =
                      getOfferOutboundLink(
                        offer,
                      );

                    return (
                      <article
                        key={
                          offer.id
                        }
                        className="card overflow-hidden"
                      >
                        <div className="p-5">
                          <div className="text-xs text-[#98a2b3]">
                            {
                              offer.provider.name
                            }
                          </div>

                          <Link
                            href={`/uslugi/${offer.slug}`}
                            className="mt-1 block text-lg font-[680] hover:text-[#5048d8]"
                          >
                            {
                              offer.name
                            }
                          </Link>

                          <div className="mt-6 text-[10px] uppercase text-[#98a2b3]">
                            Cena
                          </div>

                          <div className="mt-2 text-[24px] font-[720]">
                            {formatMoney(
                              offer.priceAmount,
                              offer.currency,
                            ) ??
                              "Cena indywidualna"}

                            {priceWinners.has(
                              offer.id,
                            ) ? (
                              <BestBadge />
                            ) : null}
                          </div>

                          <div className="mt-1 text-xs text-[#98a2b3]">
                            {periodLabel(
                              offer.billingPeriod,
                              offer.billingLabel,
                            )}
                          </div>

                          <div className="mt-5 border-t border-[#eceef2] pt-5">
                            <div className="text-[10px] uppercase text-[#98a2b3]">
                              Ocena
                            </div>

                            <div className="mt-2 text-xl font-[700]">
                              {score !==
                              null
                                ? `${score.toFixed(
                                    1,
                                  )}/10`
                                : "—"}

                              {overallWinners.has(
                                offer.id,
                              ) ? (
                                <BestBadge />
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-[#eceef2] bg-[#fafbfc] p-4">
                          <a
                            href={
                              outbound.href
                            }
                            target="_blank"
                            rel={
                              outbound.rel
                            }
                            className="btn btn-primary w-full"
                          >
                            {
                              outbound.label
                            }
                          </a>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-[28px] font-[700]">
                Pełne porównanie
              </h2>

              <div className="table-wrap mt-6">
                <table className="min-w-[900px]">
                  <thead>
                    <tr>
                      <th>
                        Parametr
                      </th>

                      {selected.map(
                        (offer) => (
                          <th
                            key={
                              offer.id
                            }
                          >
                            {
                              offer.name
                            }

                            <div className="mt-1 text-[10px] font-normal text-[#98a2b3]">
                              {
                                offer.provider.name
                              }
                            </div>
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <th>
                        Cena
                      </th>

                      {selected.map(
                        (offer) => (
                          <td
                            key={
                              offer.id
                            }
                          >
                            {formatMoney(
                              offer.priceAmount,
                              offer.currency,
                            ) ??
                              "—"}

                            {priceWinners.has(
                              offer.id,
                            ) ? (
                              <BestBadge />
                            ) : null}
                          </td>
                        ),
                      )}
                    </tr>

                    {!comparablePrices &&
                    selected.length >
                      1 ? (
                      <tr>
                        <th>
                          Waluty
                        </th>

                        <td
                          colSpan={
                            selected.length
                          }
                          className="text-xs text-[#b54708]"
                        >
                          Nie wskazujemy
                          najtańszej
                          oferty przy
                          różnych
                          walutach.
                        </td>
                      </tr>
                    ) : null}

                    <tr>
                      <th>
                        Ocena Narzivo
                      </th>

                      {selected.map(
                        (offer) => {
                          const score =
                            numeric(
                              offer.editorScore,
                            );

                          return (
                            <td
                              key={
                                offer.id
                              }
                            >
                              {score !==
                              null
                                ? `${score.toFixed(
                                    1,
                                  )}/10`
                                : "—"}

                              {overallWinners.has(
                                offer.id,
                              ) ? (
                                <BestBadge />
                              ) : null}
                            </td>
                          );
                        },
                      )}
                    </tr>

                    <tr>
                      <th>
                        Weryfikacja
                      </th>

                      {selected.map(
                        (offer) => (
                          <td
                            key={
                              offer.id
                            }
                          >
                            {polishDate(
                              offer.lastVerifiedAt,
                            )}
                          </td>
                        ),
                      )}
                    </tr>

                    {criteria.map(
                      (criterion) => {
                        const winners =
                          criterionWinners.get(
                            criterion.id,
                          ) ??
                          new Set<string>();

                        const weight =
                          totalWeight >
                          0
                            ? Number(
                                criterion.weight,
                              ) /
                              totalWeight *
                              100
                            : 0;

                        return (
                          <tr
                            key={
                              criterion.id
                            }
                          >
                            <th>
                              {
                                criterion.name
                              }

                              <div className="mt-1 text-[10px] font-normal text-[#98a2b3]">
                                waga{" "}
                                {weight.toLocaleString(
                                  "pl-PL",
                                  {
                                    maximumFractionDigits: 1,
                                  },
                                )}
                                %
                              </div>
                            </th>

                            {selected.map(
                              (offer) => {
                                const rating =
                                  offer.ratings.find(
                                    (item) =>
                                      item.criterionId ===
                                      criterion.id,
                                  );

                                const value =
                                  rating
                                    ? Number(
                                        rating.score,
                                      )
                                    : null;

                                const note =
                                  rating?.note ??
                                  null;

                                return (
                                  <td
                                    key={
                                      offer.id
                                    }
                                  >
                                    {value !==
                                    null ? (
                                      <>
                                        <strong>
                                          {value.toFixed(
                                            1,
                                          )}
                                          /10
                                        </strong>

                                        {winners.has(
                                          offer.id,
                                        ) ? (
                                          <BestBadge />
                                        ) : null}

                                        {note ? (
                                          <div className="mt-2 text-[10px] leading-5 text-[#667085]">
                                            {
                                              note
                                            }
                                          </div>
                                        ) : null}
                                      </>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                );
                              },
                            )}
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <div className="mt-10 rounded-[20px] border border-dashed border-[#d9dde5] bg-[#fafbfc] p-10 text-center">
            Wybierz aktywną ofertę
            do porównania.
          </div>
        )}
      </div>
    </main>
  );
}