import Link from "next/link";

import {
  requireAdmin,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  AdminNav,
} from "@/components/AdminNav";

import {
  ConfirmSubmitButton,
} from "@/components/ConfirmSubmitButton";

import {
  approveChange,
  rejectChange,
  scanOffersNow,
} from "./actions";

export const dynamic =
  "force-dynamic";

type SearchParams =
  Promise<{
    scanned?: string;
    changed?: string;
    unchanged?: string;
    failed?: string;

    approved?: string;
    rejected?: string;
  }>;

function objectValue(
  value: unknown,
) {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function displayValue(
  value: unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return "—";
  }

  return String(
    value,
  );
}

function diffRows(
  value: unknown,
) {
  const diff =
    objectValue(
      value,
    );

  const rows:
    Array<{
      label: string;
      from: unknown;
      to: unknown;
    }> = [];

  for (
    const key of [
      "priceAmount",
      "currency",
      "billingPeriod",
      "billingLabel",
    ]
  ) {
    const change =
      objectValue(
        diff[
          key
        ],
      );

    if (
      Object.keys(
        change,
      ).length >
      0
    ) {
      const labels:
        Record<
          string,
          string
        > = {
          priceAmount:
            "Cena",

          currency:
            "Waluta",

          billingPeriod:
            "Okres",

          billingLabel:
            "Warunki ceny",
        };

      rows.push({
        label:
          labels[
            key
          ],

        from:
          change.from,

        to:
          change.to,
      });
    }
  }

  const features =
    objectValue(
      diff.features,
    );

  for (
    const [
      key,
      rawChange,
    ] of Object.entries(
      features,
    )
  ) {
    const change =
      objectValue(
        rawChange,
      );

    rows.push({
      label:
        `Parametr: ${key}`,

      from:
        change.from,

      to:
        change.to,
    });
  }

  return rows;
}

export default async function OfferChangesPage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  await requireAdmin();

  const query =
    await searchParams;

  const changes =
    await prisma.offerChangeReview.findMany({
      include: {
        offer: {
          include: {
            provider:
              true,

            category:
              true,
          },
        },
      },

      orderBy: [
        {
          status:
            "asc",
        },

        {
          detectedAt:
            "desc",
        },
      ],

      take:
        100,
    });

  const pending =
    changes.filter(
      (
        change,
      ) =>
        change.status ===
        "PENDING",
    );

  const reviewed =
    changes.filter(
      (
        change,
      ) =>
        change.status !==
        "PENDING",
    );

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AdminNav />

          <section className="min-w-0">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <span className="eyebrow">
                  Automatyzacja
                </span>

                <h1 className="mt-3 text-[34px] font-[720] tracking-[-0.045em]">
                  Zmiany ofert
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
                  Narzivo sprawdza
                  oficjalne źródła i
                  pokazuje zmiany cen
                  oraz parametrów przed
                  ich zastosowaniem.
                </p>
              </div>

              <form
                action={
                  scanOffersNow
                }
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Skanuj teraz
                  <span>
                    →
                  </span>
                </button>
              </form>
            </div>

            {query.scanned ? (
              <div className="mt-6 rounded-[12px] border border-[#d9d6fe] bg-[#f4f3ff] px-4 py-3 text-sm leading-6 text-[#5048d8]">
                Sprawdzono{" "}
                <strong>
                  {
                    query.scanned
                  }
                </strong>{" "}
                ofert. Zmiany:{" "}
                <strong>
                  {
                    query.changed
                  }
                </strong>
                , bez zmian:{" "}
                <strong>
                  {
                    query.unchanged
                  }
                </strong>
                , błędy:{" "}
                <strong>
                  {
                    query.failed
                  }
                </strong>
                .
              </div>
            ) : null}

            {query.approved ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087443]">
                Zmiana została
                zatwierdzona. Oferta i
                scoring zostały
                zaktualizowane.
              </div>
            ) : null}

            {query.rejected ? (
              <div className="mt-6 rounded-[12px] border border-[#e7e9ee] bg-white px-4 py-3 text-sm text-[#667085]">
                Zmiana została
                odrzucona.
              </div>
            ) : null}

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="card p-5">
                <div className="text-xs text-[#98a2b3]">
                  Do weryfikacji
                </div>

                <div className="mt-3 text-[30px] font-[720]">
                  {
                    pending.length
                  }
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs text-[#98a2b3]">
                  Zatwierdzone
                </div>

                <div className="mt-3 text-[30px] font-[720] text-[#087443]">
                  {
                    reviewed.filter(
                      (
                        item,
                      ) =>
                        item.status ===
                        "APPROVED",
                    ).length
                  }
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs text-[#98a2b3]">
                  Odrzucone
                </div>

                <div className="mt-3 text-[30px] font-[720]">
                  {
                    reviewed.filter(
                      (
                        item,
                      ) =>
                        item.status ===
                        "REJECTED",
                    ).length
                  }
                </div>
              </div>
            </div>

            <section className="mt-8">
              <div className="mb-4">
                <h2 className="text-xl font-[680]">
                  Wymagają decyzji
                </h2>
              </div>

              <div className="space-y-4">
                {pending.map(
                  (
                    change,
                  ) => {
                    const rows =
                      diffRows(
                        change.diff,
                      );

                    return (
                      <article
                        key={
                          change.id
                        }
                        className="overflow-hidden rounded-[18px] border border-[#e7e9ee] bg-white"
                      >
                        <div className="flex flex-col justify-between gap-4 border-b border-[#eceef2] px-6 py-5 md:flex-row">
                          <div>
                            <div className="text-lg font-[680]">
                              {
                                change.offer.name
                              }
                            </div>

                            <div className="mt-1 text-xs text-[#98a2b3]">
                              {
                                change.offer.provider.name
                              }{" "}
                              ·{" "}
                              {
                                change.offer.category.name
                              }
                            </div>
                          </div>

                          <div className="text-xs text-[#98a2b3]">
                            {change.detectedAt.toLocaleString(
                              "pl-PL",
                            )}
                          </div>
                        </div>

                        <div className="divide-y divide-[#eceef2]">
                          {rows.map(
                            (
                              row,
                              index,
                            ) => (
                              <div
                                key={`${row.label}-${index}`}
                                className="grid gap-3 px-6 py-4 md:grid-cols-[200px_1fr_40px_1fr] md:items-center"
                              >
                                <div className="text-xs font-semibold text-[#344054]">
                                  {
                                    row.label
                                  }
                                </div>

                                <div className="rounded-[9px] bg-[#fef3f2] px-3 py-2 text-xs text-[#b42318]">
                                  {displayValue(
                                    row.from,
                                  )}
                                </div>

                                <div className="hidden text-center text-[#98a2b3] md:block">
                                  →
                                </div>

                                <div className="rounded-[9px] bg-[#ecfdf3] px-3 py-2 text-xs text-[#087443]">
                                  {displayValue(
                                    row.to,
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>

                        <div className="flex flex-col justify-between gap-4 border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4 sm:flex-row sm:items-center">
                          <a
                            href={
                              change.sourceUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[#5048d8]"
                          >
                            Otwórz oficjalne
                            źródło ↗
                          </a>

                          <div className="flex gap-2">
                            <form
                              action={
                                rejectChange
                              }
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={
                                  change.id
                                }
                              />

                              <ConfirmSubmitButton
                                className="btn btn-secondary"
                                message="Odrzucić wykrytą zmianę?"
                              >
                                Odrzuć
                              </ConfirmSubmitButton>
                            </form>

                            <form
                              action={
                                approveChange
                              }
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={
                                  change.id
                                }
                              />

                              <ConfirmSubmitButton
                                className="btn btn-primary"
                                message="Zatwierdzić zmianę i przeliczyć ofertę?"
                              >
                                Zatwierdź
                              </ConfirmSubmitButton>
                            </form>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}

                {pending.length ===
                0 ? (
                  <div className="rounded-[18px] border border-[#e7e9ee] bg-white p-10 text-center">
                    <div className="text-sm font-semibold text-[#344054]">
                      Brak zmian
                      wymagających
                      decyzji
                    </div>

                    <p className="mt-2 text-xs text-[#98a2b3]">
                      Monitoring nie
                      wykrył obecnie
                      różnic.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4">
                <h2 className="text-xl font-[680]">
                  Historia
                </h2>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Oferta
                      </th>

                      <th>
                        Wykryto
                      </th>

                      <th>
                        Status
                      </th>

                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {reviewed
                      .slice(
                        0,
                        30,
                      )
                      .map(
                        (
                          change,
                        ) => (
                          <tr
                            key={
                              change.id
                            }
                          >
                            <td>
                              <div className="font-semibold">
                                {
                                  change.offer.name
                                }
                              </div>

                              <div className="mt-1 text-xs text-[#98a2b3]">
                                {
                                  change.offer.provider.name
                                }
                              </div>
                            </td>

                            <td>
                              {change.detectedAt.toLocaleString(
                                "pl-PL",
                              )}
                            </td>

                            <td>
                              {change.status ===
                              "APPROVED"
                                ? "Zatwierdzona"
                                : "Odrzucona"}
                            </td>

                            <td>
                              <Link
                                href={`/admin/oferty?edit=${change.offerId}`}
                                className="text-sm font-semibold text-[#5048d8]"
                              >
                                Oferta
                              </Link>
                            </td>
                          </tr>
                        ),
                      )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}