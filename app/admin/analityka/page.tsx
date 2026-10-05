import Link from "next/link";

import { Prisma } from "@/generated/prisma/client";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { AdminNav } from "@/components/AdminNav";

export const dynamic = "force-dynamic";

type DailyClickRow = {
  day: string;
  clicks: number;
};

type TopOfferRow = {
  offerId: string;
  offerName: string;
  providerName: string;
  categoryName: string;
  clicks: number;
};

type ReferrerRow = {
  referrer: string | null;
  clicks: number;
};

function warsawDayKey(
  date: Date,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en",
      {
        timeZone:
          "Europe/Warsaw",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ],
      ),
    );

  return `${values.year}-${values.month}-${values.day}`;
}

function dayLabel(
  value: string,
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat(
    "pl-PL",
    {
      day: "2-digit",
      month: "2-digit",
    },
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12,
      ),
    ),
  );
}

function fullDateTime(
  value: Date,
) {
  return new Intl.DateTimeFormat(
    "pl-PL",
    {
      timeZone:
        "Europe/Warsaw",

      day: "2-digit",
      month: "2-digit",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(value);
}

function referrerLabel(
  value:
    | string
    | null,
) {
  if (!value) {
    return "Bez referrera";
  }

  try {
    return new URL(
      value,
    ).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return "Inne źródło";
  }
}

function trendValue(
  current: number,
  previous: number,
) {
  if (
    current === 0 &&
    previous === 0
  ) {
    return {
      label: "0%",
      positive: null,
    };
  }

  if (previous === 0) {
    return {
      label: "+100%",
      positive: true,
    };
  }

  const change =
    ((current -
      previous) /
      previous) *
    100;

  return {
    label: `${
      change >= 0
        ? "+"
        : ""
    }${Math.round(
      change,
    )}%`,

    positive:
      change >= 0,
  };
}

export default async function AnalyticsPage() {
  await requireAdmin();

  const now =
    new Date();

  const sevenDaysAgo =
    new Date(
      now.getTime() -
        7 *
          24 *
          60 *
          60 *
          1000,
    );

  const fourteenDaysAgo =
    new Date(
      now.getTime() -
        14 *
          24 *
          60 *
          60 *
          1000,
    );

  const thirtyDaysAgo =
    new Date(
      now.getTime() -
        30 *
          24 *
          60 *
          60 *
          1000,
    );

  const [
    totalClicks,
    clicks7,
    previous7,
    clicks30,
    activePrograms,
    dailyRaw,
    topOffers,
    recentClicks,
    referrers,
  ] = await Promise.all([
    prisma.affiliateClick.count(),

    prisma.affiliateClick.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    }),

    prisma.affiliateClick.count({
      where: {
        createdAt: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    }),

    prisma.affiliateClick.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),

    prisma.affiliateProgram.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.$queryRaw<DailyClickRow[]>(
      Prisma.sql`
        SELECT
          TO_CHAR(
            DATE_TRUNC(
              'day',
              (
                click."createdAt" AT TIME ZONE 'UTC'
              ) AT TIME ZONE 'Europe/Warsaw'
            ),
            'YYYY-MM-DD'
          ) AS "day",
          COUNT(*)::int AS "clicks"
        FROM narzivo."AffiliateClick" AS click
        WHERE click."createdAt" >= ${thirtyDaysAgo}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ),

    prisma.$queryRaw<TopOfferRow[]>(
      Prisma.sql`
        SELECT
          click."offerId" AS "offerId",
          offer."name" AS "offerName",
          provider."name" AS "providerName",
          category."name" AS "categoryName",
          COUNT(*)::int AS "clicks"
        FROM narzivo."AffiliateClick" AS click
        INNER JOIN narzivo."Offer" AS offer
          ON offer."id" = click."offerId"
        INNER JOIN narzivo."Provider" AS provider
          ON provider."id" = offer."providerId"
        INNER JOIN narzivo."Category" AS category
          ON category."id" = offer."categoryId"
        WHERE click."createdAt" >= ${thirtyDaysAgo}
        GROUP BY
          click."offerId",
          offer."name",
          provider."name",
          category."name"
        ORDER BY COUNT(*) DESC
        LIMIT 10
      `,
    ),

    prisma.affiliateClick.findMany({
      include: {
        offer: {
          include: {
            provider: true,
            category: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 20,
    }),

    prisma.$queryRaw<ReferrerRow[]>(
      Prisma.sql`
        SELECT
          click."referrer" AS "referrer",
          COUNT(*)::int AS "clicks"
        FROM narzivo."AffiliateClick" AS click
        WHERE click."createdAt" >= ${thirtyDaysAgo}
        GROUP BY click."referrer"
        ORDER BY COUNT(*) DESC
        LIMIT 20
      `,
    ),
  ]);

  /*
   * Uzupełniamy brakujące dni zerami,
   * żeby wykres zawsze pokazywał 30 dni.
   */
  const rawMap =
    new Map(
      dailyRaw.map(
        (row) => [
          row.day,
          Number(
            row.clicks,
          ),
        ],
      ),
    );

  const daily: {
    day: string;
    clicks: number;
  }[] = [];

  for (
    let offset = 29;
    offset >= 0;
    offset--
  ) {
    const date =
      new Date(
        now.getTime() -
          offset *
            24 *
            60 *
            60 *
            1000,
      );

    const key =
      warsawDayKey(
        date,
      );

    daily.push({
      day: key,

      clicks:
        rawMap.get(
          key,
        ) ?? 0,
    });
  }

  const maxDaily =
    Math.max(
      1,
      ...daily.map(
        (item) =>
          item.clicks,
      ),
    );

  /*
   * Agregujemy referrery po domenie,
   * zamiast wyświetlać pełne URL-e
   * wraz z query stringami.
   */
  const referrerMap =
    new Map<
      string,
      number
    >();

  for (
    const row of referrers
  ) {
    const label =
      referrerLabel(
        row.referrer,
      );

    referrerMap.set(
      label,
      (
        referrerMap.get(
          label,
        ) ?? 0
      ) +
        Number(
          row.clicks,
        ),
    );
  }

  const topReferrers =
    Array.from(
      referrerMap.entries(),
    )
      .map(
        ([
          label,
          clicks,
        ]) => ({
          label,
          clicks,
        }),
      )
      .sort(
        (a, b) =>
          b.clicks -
          a.clicks,
      )
      .slice(0, 8);

  const sevenDayTrend =
    trendValue(
      clicks7,
      previous7,
    );

  const averageDaily =
    clicks30 / 30;

  const strongestDay =
    [...daily].sort(
      (a, b) =>
        b.clicks -
        a.clicks,
    )[0];

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AdminNav />

          <section className="min-w-0">
            {/* HEADER */}

            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <span className="eyebrow">
                  Dane
                </span>

                <h1 className="mt-3 text-[34px] font-[720] tracking-[-0.045em]">
                  Analityka
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                  Ruch wychodzący z Narzivo do partnerów
                  afiliacyjnych. Kliknięcie nie jest traktowane
                  jako sprzedaż ani konwersja.
                </p>
              </div>

              <Link
                href="/admin/afiliacja"
                className="btn btn-secondary"
              >
                Programy afiliacyjne
              </Link>
            </div>

            {/* METRICS */}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="card p-5">
                <div className="text-xs font-medium text-[#98a2b3]">
                  Kliknięcia łącznie
                </div>

                <div className="mt-3 text-[34px] font-[720] tracking-[-0.045em]">
                  {totalClicks}
                </div>

                <div className="mt-3 text-[11px] text-[#98a2b3]">
                  od uruchomienia trackingu
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-[#98a2b3]">
                    Ostatnie 7 dni
                  </div>

                  <span
                    className={[
                      "rounded-full px-2 py-1 text-[10px] font-semibold",
                      sevenDayTrend.positive === true
                        ? "bg-[#ecfdf3] text-[#087443]"
                        : sevenDayTrend.positive === false
                          ? "bg-[#fff1f0] text-[#b42318]"
                          : "bg-[#f2f4f7] text-[#667085]",
                    ].join(" ")}
                  >
                    {sevenDayTrend.label}
                  </span>
                </div>

                <div className="mt-3 text-[34px] font-[720] tracking-[-0.045em]">
                  {clicks7}
                </div>

                <div className="mt-3 text-[11px] text-[#98a2b3]">
                  poprzednie 7 dni: {previous7}
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs font-medium text-[#98a2b3]">
                  Ostatnie 30 dni
                </div>

                <div className="mt-3 text-[34px] font-[720] tracking-[-0.045em]">
                  {clicks30}
                </div>

                <div className="mt-3 text-[11px] text-[#98a2b3]">
                  średnio{" "}
                  {averageDaily.toLocaleString(
                    "pl-PL",
                    {
                      maximumFractionDigits: 1,
                    },
                  )}{" "}
                  dziennie
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs font-medium text-[#98a2b3]">
                  Aktywne programy
                </div>

                <div className="mt-3 text-[34px] font-[720] tracking-[-0.045em]">
                  {activePrograms}
                </div>

                <div className="mt-3 text-[11px] text-[#98a2b3]">
                  aktywnych relacji afiliacyjnych
                </div>
              </div>
            </div>

            {/* CHART */}

            <section className="card mt-6 overflow-hidden">
              <div className="flex flex-col justify-between gap-3 border-b border-[#eceef2] px-6 py-5 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-lg font-[680] tracking-[-0.02em]">
                    Kliknięcia — 30 dni
                  </h2>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Dzienna liczba przejść przez `/go/...`.
                  </p>
                </div>

                {strongestDay ? (
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[#98a2b3]">
                      Najlepszy dzień
                    </div>

                    <div className="mt-1 text-xs font-semibold text-[#344054]">
                      {dayLabel(
                        strongestDay.day,
                      )}{" "}
                      · {strongestDay.clicks} klik.
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="p-6">
                <div className="flex h-[240px] items-end gap-[3px]">
                  {daily.map(
                    (item) => {
                      const percentage =
                        item.clicks > 0
                          ? Math.max(
                              4,
                              (item.clicks /
                                maxDaily) *
                                100,
                            )
                          : 1;

                      return (
                        <div
                          key={item.day}
                          className="group relative flex h-full min-w-0 flex-1 items-end"
                        >
                          <div
                            className={[
                              "w-full rounded-t-[4px] transition-all duration-150",
                              item.clicks > 0
                                ? "bg-[#635bff] group-hover:bg-[#5048d8]"
                                : "bg-[#eceef2]",
                            ].join(" ")}
                            style={{
                              height: `${percentage}%`,
                            }}
                          />

                          <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-[8px] bg-[#101114] px-2.5 py-1.5 text-[10px] font-medium text-white shadow-lg group-hover:block">
                            {dayLabel(
                              item.day,
                            )}{" "}
                            · {item.clicks}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                <div className="mt-3 flex justify-between text-[10px] text-[#98a2b3]">
                  <span>
                    {dayLabel(
                      daily[0]?.day ??
                        "",
                    )}
                  </span>

                  <span>
                    {dayLabel(
                      daily[
                        daily.length -
                          1
                      ]?.day ?? "",
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* TOP + SOURCES */}

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="card overflow-hidden">
                <div className="border-b border-[#eceef2] px-6 py-5">
                  <h2 className="text-lg font-[680] tracking-[-0.02em]">
                    Najczęściej klikane oferty
                  </h2>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Ostatnie 30 dni.
                  </p>
                </div>

                {topOffers.length > 0 ? (
                  <div className="divide-y divide-[#eceef2]">
                    {topOffers.map(
                      (
                        offer,
                        index,
                      ) => (
                        <div
                          key={offer.offerId}
                          className="flex items-center gap-4 px-6 py-4"
                        >
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#f2f1ff] text-xs font-bold text-[#5048d8]">
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/admin/oferty?edit=${offer.offerId}`}
                              className="block truncate text-sm font-semibold text-[#101114] hover:text-[#5048d8]"
                            >
                              {offer.offerName}
                            </Link>

                            <div className="mt-1 truncate text-xs text-[#98a2b3]">
                              {offer.providerName} ·{" "}
                              {offer.categoryName}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-[700] tracking-[-0.03em]">
                              {offer.clicks}
                            </div>

                            <div className="text-[10px] text-[#98a2b3]">
                              klik.
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-[#667085]">
                    Brak kliknięć w ostatnich 30 dniach.
                  </div>
                )}
              </section>

              <section className="card overflow-hidden">
                <div className="border-b border-[#eceef2] px-6 py-5">
                  <h2 className="text-lg font-[680] tracking-[-0.02em]">
                    Źródła kliknięć
                  </h2>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Domeny referrerów z ostatnich 30 dni.
                  </p>
                </div>

                {topReferrers.length > 0 ? (
                  <div className="divide-y divide-[#eceef2]">
                    {topReferrers.map(
                      (
                        source,
                        index,
                      ) => {
                        const share =
                          clicks30 > 0
                            ? (source.clicks /
                                clicks30) *
                              100
                            : 0;

                        return (
                          <div
                            key={`${source.label}-${index}`}
                            className="px-6 py-4"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="truncate text-sm font-semibold text-[#344054]">
                                {source.label}
                              </div>

                              <div className="shrink-0 text-sm font-semibold">
                                {source.clicks}
                              </div>
                            </div>

                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f2f4f7]">
                              <div
                                className="h-full rounded-full bg-[#635bff]"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    share,
                                  )}%`,
                                }}
                              />
                            </div>

                            <div className="mt-1.5 text-[10px] text-[#98a2b3]">
                              {share.toLocaleString(
                                "pl-PL",
                                {
                                  maximumFractionDigits: 1,
                                },
                              )}
                              % kliknięć
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-[#667085]">
                    Brak danych o źródłach.
                  </div>
                )}
              </section>
            </div>

            {/* RECENT CLICKS */}

            <section className="mt-6">
              <div className="mb-4">
                <h2 className="text-xl font-[680] tracking-[-0.025em]">
                  Ostatnie kliknięcia
                </h2>

                <p className="mt-1 text-xs text-[#98a2b3]">
                  Ostatnie 20 przejść do partnerów.
                </p>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Oferta
                      </th>

                      <th>
                        Dostawca
                      </th>

                      <th>
                        Kategoria
                      </th>

                      <th>
                        Źródło
                      </th>

                      <th>
                        Data
                      </th>

                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {recentClicks.map(
                      (click) => (
                        <tr key={click.id}>
                          <td>
                            <div className="min-w-[180px] font-semibold text-[#101114]">
                              {click.offer.name}
                            </div>
                          </td>

                          <td>
                            {click.offer.provider.name}
                          </td>

                          <td>
                            {click.offer.category.name}
                          </td>

                          <td>
                            <span className="inline-block max-w-[180px] truncate">
                              {referrerLabel(
                                click.referrer,
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="whitespace-nowrap">
                              {fullDateTime(
                                click.createdAt,
                              )}
                            </span>
                          </td>

                          <td>
                            <Link
                              href={`/admin/oferty?edit=${click.offer.id}`}
                              className="text-sm font-semibold text-[#5048d8]"
                            >
                              Oferta
                            </Link>
                          </td>
                        </tr>
                      ),
                    )}

                    {recentClicks.length ===
                    0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="py-10 text-center">
                            <div className="text-sm font-semibold text-[#344054]">
                              Brak kliknięć
                            </div>

                            <p className="mt-2 text-xs text-[#98a2b3]">
                              Dane pojawią się po pierwszych
                              przejściach przez linki afiliacyjne.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            {/* EXPLANATION */}

            <section className="mt-6 rounded-[18px] border border-[#e7e9ee] bg-white p-6">
              <div className="text-sm font-semibold text-[#101114]">
                Kliknięcie ≠ konwersja
              </div>

              <p className="mt-2 max-w-3xl text-xs leading-6 text-[#667085]">
                Ten dashboard pokazuje ruch wychodzący z Narzivo.
                Nie nazywamy kliknięcia sprzedażą ani przychodem.
                Konwersje i prowizje dodamy dopiero wtedy, gdy
                będziemy mieli wiarygodne dane z programu
                partnerskiego, API, feedu albo postbacku.
              </p>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}