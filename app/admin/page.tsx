import Link from "next/link";

import {
  requireAdmin,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  getOfferWindowStatus,
  isPublicOfferAt,
} from "@/lib/offer-validity";

import {
  polishDate,
} from "@/lib/format";

import {
  AdminNav,
} from "@/components/AdminNav";

export const dynamic =
  "force-dynamic";

const DAY_MS =
  24 * 60 * 60 * 1000;

function daysUntil(
  date: Date,
  now: Date,
) {
  return Math.ceil(
    (
      date.getTime() -
      now.getTime()
    ) /
      DAY_MS,
  );
}

function MetricCard({
  label,
  value,
  description,
  href,
  attention = false,
}: {
  label: string;
  value: number;
  description: string;
  href?: string;
  attention?: boolean;
}) {
  const content = (
    <div
      className={[
        "h-full rounded-[18px] border bg-white p-5 transition",
        attention &&
        value > 0
          ? "border-[#fedf89] bg-[#fffcf5]"
          : "border-[#e7e9ee]",
        href
          ? "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)]"
          : "",
      ].join(" ")}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3]">
        {label}
      </div>

      <div
        className={[
          "mt-3 text-[34px] font-[730] leading-none tracking-[-0.05em]",
          attention &&
          value > 0
            ? "text-[#b54708]"
            : "text-[#101114]",
        ].join(" ")}
      >
        {value}
      </div>

      <p className="mt-3 text-xs leading-5 text-[#667085]">
        {description}
      </p>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="block"
    >
      {content}
    </Link>
  );
}

function IssueRow({
  title,
  description,
  href,
  badge,
  badgeTone = "neutral",
}: {
  title: string;
  description: string;
  href: string;
  badge?: string;
  badgeTone?:
    | "neutral"
    | "warning"
    | "danger"
    | "success";
}) {
  const badgeClass = {
    neutral:
      "bg-[#f2f4f7] text-[#667085]",

    warning:
      "bg-[#fffaeb] text-[#b54708]",

    danger:
      "bg-[#fff1f0] text-[#b42318]",

    success:
      "bg-[#ecfdf3] text-[#087443]",
  }[badgeTone];

  return (
    <Link
      href={href}
      className="group flex flex-col justify-between gap-4 border-b border-[#eceef2] px-5 py-4 transition last:border-b-0 hover:bg-[#fafbfc] sm:flex-row sm:items-center"
    >
      <div className="min-w-0">
        <div className="font-semibold text-[#101114] transition group-hover:text-[#5048d8]">
          {title}
        </div>

        <div className="mt-1 text-xs leading-5 text-[#667085]">
          {description}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {badge ? (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${badgeClass}`}
          >
            {badge}
          </span>
        ) : null}

        <span className="text-[#98a2b3]">
          →
        </span>
      </div>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const now =
    new Date();

  const sevenDaysAgo =
    new Date(
      now.getTime() -
        7 *
          DAY_MS,
    );

  const thirtyDaysAgo =
    new Date(
      now.getTime() -
        30 *
          DAY_MS,
    );

  const fourteenDaysAhead =
    new Date(
      now.getTime() +
        14 *
          DAY_MS,
    );

  const [
    offers,
    categories,
    providers,
    clicksLast7Days,
    totalClicks,
  ] =
    await Promise.all([
      prisma.offer.findMany({
        include: {
          provider: {
            select: {
              id:
                true,

              name:
                true,

              isPublished:
                true,
            },
          },

          category: {
            select: {
              id:
                true,

              name:
                true,

              isPublished:
                true,
            },
          },

          _count: {
            select: {
              ratings:
                true,

              clicks:
                true,
            },
          },
        },

        orderBy: {
          updatedAt:
            "desc",
        },
      }),

      prisma.category.findMany({
        include: {
          _count: {
            select: {
              offers:
                true,

              ratingCriteria: {
                where: {
                  isPublished:
                    true,
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

      prisma.provider.findMany({
        include: {
          _count: {
            select: {
              offers:
                true,

              affiliatePrograms:
                true,
            },
          },
        },

        orderBy: {
          name:
            "asc",
        },
      }),

      prisma.affiliateClick.count({
        where: {
          createdAt: {
            gte:
              sevenDaysAgo,
          },
        },
      }),

      prisma.affiliateClick.count(),
    ]);

  const publishedOffers =
    offers.filter(
      (offer) =>
        offer.isPublished,
    );

  const publicOffers =
    offers.filter(
      (offer) =>
        isPublicOfferAt(
          offer,
          now,
        ),
    );

  const upcomingOffers =
    offers
      .filter(
        (offer) =>
          offer.isPublished &&
          getOfferWindowStatus(
            offer,
            now,
          ) ===
            "UPCOMING",
      )
      .sort(
        (a, b) =>
          (
            a.validFrom?.getTime() ??
            Infinity
          ) -
          (
            b.validFrom?.getTime() ??
            Infinity
          ),
      );

  const expiredOffers =
    offers.filter(
      (offer) =>
        offer.isPublished &&
        getOfferWindowStatus(
          offer,
          now,
        ) ===
          "EXPIRED",
    );

  const expiringSoon =
    publicOffers
      .filter(
        (offer) =>
          offer.validTo !==
            null &&
          offer.validTo >=
            now &&
          offer.validTo <=
            fourteenDaysAhead,
      )
      .sort(
        (a, b) =>
          (
            a.validTo?.getTime() ??
            Infinity
          ) -
          (
            b.validTo?.getTime() ??
            Infinity
          ),
      );

  const staleVerification =
    publicOffers
      .filter(
        (offer) =>
          offer.lastVerifiedAt <
          thirtyDaysAgo,
      )
      .sort(
        (a, b) =>
          a.lastVerifiedAt.getTime() -
          b.lastVerifiedAt.getTime(),
      );

  const missingScore =
    publicOffers.filter(
      (offer) =>
        offer.editorScore ===
        null,
    );

  const missingAffiliate =
    publicOffers.filter(
      (offer) =>
        !offer.affiliateUrl,
    );

  const blockedOffers =
    publishedOffers.filter(
      (offer) =>
        !offer.provider
          .isPublished ||
        !offer.category
          .isPublished,
    );

  const categoriesWithoutMethodology =
    categories.filter(
      (category) =>
        category.isPublished &&
        category._count
          .ratingCriteria ===
          0,
    );

  const providersWithoutPublishedOffers =
    providers.filter(
      (provider) =>
        provider.isPublished &&
        provider._count
          .offers ===
          0,
    );

  const qualityIssues =
    expiringSoon.length +
    expiredOffers.length +
    staleVerification.length +
    missingScore.length +
    blockedOffers.length +
    categoriesWithoutMethodology.length;

  const recentOffers =
    offers.slice(
      0,
      6,
    );

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AdminNav />

          <section className="min-w-0">
            {/* HEADER */}

            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div>
                <span className="eyebrow">
                  Centrum operacyjne
                </span>

                <h1 className="mt-3 text-[34px] font-[730] tracking-[-0.045em] text-[#101114]">
                  Dashboard Narzivo
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                  Stan katalogu,
                  jakość danych,
                  metodologia,
                  publikacja i
                  afiliacja w jednym
                  miejscu.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/oferty"
                  className="btn btn-primary"
                >
                  Zarządzaj ofertami
                  <span>
                    →
                  </span>
                </Link>

                <Link
                  href="/"
                  target="_blank"
                  className="btn btn-secondary"
                >
                  Otwórz stronę
                  <span>
                    ↗
                  </span>
                </Link>
              </div>
            </div>

            {/* HEALTH */}

            <section
              className={[
                "mt-7 rounded-[18px] border p-5",
                qualityIssues ===
                0
                  ? "border-[#abefc6] bg-[#ecfdf3]"
                  : "border-[#fedf89] bg-[#fffaeb]",
              ].join(" ")}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div
                    className={[
                      "text-sm font-[680]",
                      qualityIssues ===
                      0
                        ? "text-[#087443]"
                        : "text-[#93370d]",
                    ].join(" ")}
                  >
                    {qualityIssues ===
                    0
                      ? "Katalog nie ma obecnie krytycznych problemów jakościowych"
                      : `${qualityIssues} elementów wymaga uwagi`}
                  </div>

                  <p
                    className={[
                      "mt-1 text-xs leading-5",
                      qualityIssues ===
                      0
                        ? "text-[#067647]"
                        : "text-[#b54708]",
                    ].join(" ")}
                  >
                    Sprawdzamy
                    ważność ofert,
                    świeżość
                    weryfikacji,
                    kompletność ocen
                    i metodologii.
                  </p>
                </div>

                <span
                  className={[
                    "grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold",
                    qualityIssues ===
                    0
                      ? "bg-white text-[#087443]"
                      : "bg-white text-[#b54708]",
                  ].join(" ")}
                >
                  {qualityIssues ===
                  0
                    ? "✓"
                    : qualityIssues}
                </span>
              </div>
            </section>

            {/* METRICS */}

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Aktywne publicznie"
                value={
                  publicOffers.length
                }
                description="Oferty aktualnie widoczne użytkownikom."
                href="/admin/oferty"
              />

              <MetricCard
                label="Wygasające"
                value={
                  expiringSoon.length
                }
                description="Kończą się w ciągu najbliższych 14 dni."
                href="/admin/oferty"
                attention
              />

              <MetricCard
                label="Stara weryfikacja"
                value={
                  staleVerification.length
                }
                description="Aktywne oferty nieweryfikowane od ponad 30 dni."
                href="/admin/oferty"
                attention
              />

              <MetricCard
                label="Brak kompletnej oceny"
                value={
                  missingScore.length
                }
                description="Aktywne oferty bez końcowej oceny Narzivo."
                href="/admin/oceny"
                attention
              />
            </section>

            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Oferty opublikowane"
                value={
                  publishedOffers.length
                }
                description="Włączony status publikacji niezależnie od okresu ważności."
                href="/admin/oferty"
              />

              <MetricCard
                label="Przyszłe oferty"
                value={
                  upcomingOffers.length
                }
                description="Opublikowane, ale ich validFrom jeszcze nie nastąpił."
                href="/admin/oferty"
              />

              <MetricCard
                label="Bez afiliacji"
                value={
                  missingAffiliate.length
                }
                description="Aktywne oferty prowadzące bezpośrednio do dostawcy."
                href="/admin/oferty"
              />

              <MetricCard
                label="Kliknięcia 7 dni"
                value={
                  clicksLast7Days
                }
                description={`Łącznie zapisanych kliknięć afiliacyjnych: ${totalClicks}.`}
                href="/admin/analityka"
              />
            </section>

            {/* ISSUES */}

            <div className="mt-8 grid gap-6 xl:grid-cols-2">
              <section className="overflow-hidden rounded-[18px] border border-[#e7e9ee] bg-white">
                <div className="border-b border-[#eceef2] px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-[680]">
                        Pilne działania
                      </h2>

                      <p className="mt-1 text-xs text-[#98a2b3]">
                        Elementy, które
                        mogą wpływać na
                        publiczny katalog.
                      </p>
                    </div>

                    <span className="rounded-full bg-[#fff1f0] px-2.5 py-1 text-xs font-semibold text-[#b42318]">
                      {expiringSoon.length +
                        expiredOffers.length +
                        blockedOffers.length}
                    </span>
                  </div>
                </div>

                {expiringSoon.length ===
                  0 &&
                expiredOffers.length ===
                  0 &&
                blockedOffers.length ===
                  0 ? (
                  <div className="p-8 text-center">
                    <div className="text-sm font-semibold text-[#087443]">
                      Brak pilnych
                      problemów
                    </div>

                    <p className="mt-2 text-xs text-[#98a2b3]">
                      Publiczne oferty
                      są obecnie w
                      prawidłowym stanie.
                    </p>
                  </div>
                ) : (
                  <>
                    {expiringSoon
                      .slice(
                        0,
                        5,
                      )
                      .map(
                        (
                          offer,
                        ) => (
                          <IssueRow
                            key={`expiring-${offer.id}`}
                            title={
                              offer.name
                            }
                            description={`Oferta wygaśnie ${polishDate(
                              offer.validTo!,
                            )}.`}
                            href={`/admin/oferty?edit=${offer.id}`}
                            badge={`${daysUntil(
                              offer.validTo!,
                              now,
                            )} dni`}
                            badgeTone="warning"
                          />
                        ),
                      )}

                    {expiredOffers
                      .slice(
                        0,
                        5,
                      )
                      .map(
                        (
                          offer,
                        ) => (
                          <IssueRow
                            key={`expired-${offer.id}`}
                            title={
                              offer.name
                            }
                            description="Oferta jest nadal oznaczona jako opublikowana, ale jej okres ważności już minął."
                            href={`/admin/oferty?edit=${offer.id}`}
                            badge="Wygasła"
                            badgeTone="danger"
                          />
                        ),
                      )}

                    {blockedOffers
                      .slice(
                        0,
                        5,
                      )
                      .map(
                        (
                          offer,
                        ) => (
                          <IssueRow
                            key={`blocked-${offer.id}`}
                            title={
                              offer.name
                            }
                            description={
                              !offer.provider
                                .isPublished
                                ? `Dostawca ${offer.provider.name} nie jest opublikowany.`
                                : `Kategoria ${offer.category.name} nie jest opublikowana.`
                            }
                            href={`/admin/oferty?edit=${offer.id}`}
                            badge="Zablokowana"
                            badgeTone="danger"
                          />
                        ),
                      )}
                  </>
                )}
              </section>

              <section className="overflow-hidden rounded-[18px] border border-[#e7e9ee] bg-white">
                <div className="border-b border-[#eceef2] px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-[680]">
                        Jakość danych
                      </h2>

                      <p className="mt-1 text-xs text-[#98a2b3]">
                        Oceny i
                        weryfikacje do
                        uzupełnienia.
                      </p>
                    </div>

                    <span className="rounded-full bg-[#fffaeb] px-2.5 py-1 text-xs font-semibold text-[#b54708]">
                      {staleVerification.length +
                        missingScore.length}
                    </span>
                  </div>
                </div>

                {staleVerification.length ===
                  0 &&
                missingScore.length ===
                  0 ? (
                  <div className="p-8 text-center">
                    <div className="text-sm font-semibold text-[#087443]">
                      Dane są aktualne
                    </div>
                  </div>
                ) : (
                  <>
                    {staleVerification
                      .slice(
                        0,
                        5,
                      )
                      .map(
                        (
                          offer,
                        ) => (
                          <IssueRow
                            key={`stale-${offer.id}`}
                            title={
                              offer.name
                            }
                            description={`Ostatnia weryfikacja: ${polishDate(
                              offer.lastVerifiedAt,
                            )}.`}
                            href={`/admin/oferty?edit=${offer.id}`}
                            badge="Do weryfikacji"
                            badgeTone="warning"
                          />
                        ),
                      )}

                    {missingScore
                      .slice(
                        0,
                        5,
                      )
                      .map(
                        (
                          offer,
                        ) => (
                          <IssueRow
                            key={`score-${offer.id}`}
                            title={
                              offer.name
                            }
                            description="Oferta jest publiczna, ale nie posiada jeszcze kompletnego wyniku Narzivo."
                            href={`/admin/oceny?kategoria=${offer.category.id}&oferta=${offer.id}`}
                            badge="Brak oceny"
                            badgeTone="warning"
                          />
                        ),
                      )}
                  </>
                )}
              </section>
            </div>

            {/* METHODOLOGY */}

            <section className="mt-6 overflow-hidden rounded-[18px] border border-[#e7e9ee] bg-white">
              <div className="flex flex-col justify-between gap-4 border-b border-[#eceef2] px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-[680]">
                    Metodologia kategorii
                  </h2>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Publiczna kategoria
                    powinna posiadać
                    przynajmniej jedno
                    aktywne kryterium.
                  </p>
                </div>

                <Link
                  href="/admin/oceny"
                  className="text-sm font-semibold text-[#5048d8]"
                >
                  Zarządzaj ocenami →
                </Link>
              </div>

              {categoriesWithoutMethodology.length >
              0 ? (
                categoriesWithoutMethodology.map(
                  (
                    category,
                  ) => (
                    <IssueRow
                      key={
                        category.id
                      }
                      title={
                        category.name
                      }
                      description={`${category._count.offers} ofert w kategorii · brak aktywnych kryteriów metodologii.`}
                      href={`/admin/oceny?kategoria=${category.id}`}
                      badge="Brak metodologii"
                      badgeTone="danger"
                    />
                  ),
                )
              ) : (
                <div className="p-7 text-sm text-[#087443]">
                  Wszystkie
                  opublikowane
                  kategorie posiadają
                  aktywną metodologię.
                </div>
              )}
            </section>

            {/* UPCOMING */}

            {upcomingOffers.length >
            0 ? (
              <section className="mt-6 overflow-hidden rounded-[18px] border border-[#e7e9ee] bg-white">
                <div className="border-b border-[#eceef2] px-5 py-4">
                  <h2 className="font-[680]">
                    Zaplanowane oferty
                  </h2>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Są opublikowane w
                    panelu, ale publicznie
                    pojawią się dopiero
                    po `validFrom`.
                  </p>
                </div>

                {upcomingOffers
                  .slice(
                    0,
                    8,
                  )
                  .map(
                    (
                      offer,
                    ) => (
                      <IssueRow
                        key={
                          offer.id
                        }
                        title={
                          offer.name
                        }
                        description={`Start: ${
                          offer.validFrom
                            ? polishDate(
                                offer.validFrom,
                              )
                            : "—"
                        } · ${offer.provider.name}`}
                        href={`/admin/oferty?edit=${offer.id}`}
                        badge="Zaplanowana"
                        badgeTone="neutral"
                      />
                    ),
                  )}
              </section>
            ) : null}

            {/* RECENT */}

            <section className="mt-6 overflow-hidden rounded-[18px] border border-[#e7e9ee] bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-[#eceef2] px-5 py-4">
                <div>
                  <h2 className="font-[680]">
                    Ostatnio zmieniane
                  </h2>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Najnowsze zmiany w
                    katalogu ofert.
                  </p>
                </div>

                <Link
                  href="/admin/oferty"
                  className="text-sm font-semibold text-[#5048d8]"
                >
                  Wszystkie →
                </Link>
              </div>

              {recentOffers.length >
              0 ? (
                recentOffers.map(
                  (
                    offer,
                  ) => {
                    const windowStatus =
                      getOfferWindowStatus(
                        offer,
                        now,
                      );

                    const publicNow =
                      isPublicOfferAt(
                        offer,
                        now,
                      );

                    let badge =
                      "Szkic";

                    let tone:
                      | "neutral"
                      | "success"
                      | "warning"
                      | "danger" =
                      "neutral";

                    if (
                      publicNow
                    ) {
                      badge =
                        "Publiczna";

                      tone =
                        "success";
                    } else if (
                      offer.isPublished &&
                      windowStatus ===
                        "UPCOMING"
                    ) {
                      badge =
                        "Przyszła";

                      tone =
                        "neutral";
                    } else if (
                      offer.isPublished &&
                      windowStatus ===
                        "EXPIRED"
                    ) {
                      badge =
                        "Wygasła";

                      tone =
                        "danger";
                    } else if (
                      offer.isPublished
                    ) {
                      badge =
                        "Zablokowana";

                      tone =
                        "warning";
                    }

                    return (
                      <IssueRow
                        key={
                          offer.id
                        }
                        title={
                          offer.name
                        }
                        description={`${offer.provider.name} · ${offer.category.name} · aktualizacja ${polishDate(
                          offer.updatedAt,
                        )}`}
                        href={`/admin/oferty?edit=${offer.id}`}
                        badge={
                          badge
                        }
                        badgeTone={
                          tone
                        }
                      />
                    );
                  },
                )
              ) : (
                <div className="p-8 text-center text-sm text-[#667085]">
                  Brak ofert.
                </div>
              )}
            </section>

            {/* SECONDARY WARNINGS */}

            {(missingAffiliate.length >
              0 ||
              providersWithoutPublishedOffers.length >
                0) && (
              <section className="mt-6 rounded-[18px] border border-[#e7e9ee] bg-white p-6">
                <div className="text-sm font-[680]">
                  Informacje operacyjne
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[14px] bg-[#fafbfc] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3]">
                      Bez afiliacji
                    </div>

                    <div className="mt-2 text-2xl font-[720]">
                      {
                        missingAffiliate.length
                      }
                    </div>

                    <p className="mt-2 text-xs leading-5 text-[#667085]">
                      To nie jest błąd.
                      Te oferty kierują
                      bezpośrednio do
                      oficjalnego źródła.
                    </p>
                  </div>

                  <div className="rounded-[14px] bg-[#fafbfc] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3]">
                      Dostawcy bez ofert
                    </div>

                    <div className="mt-2 text-2xl font-[720]">
                      {
                        providersWithoutPublishedOffers.length
                      }
                    </div>

                    <p className="mt-2 text-xs leading-5 text-[#667085]">
                      Opublikowani
                      dostawcy bez
                      przypisanych ofert.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}