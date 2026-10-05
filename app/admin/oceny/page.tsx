import Link from "next/link";

import {
  requireAdmin,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  getOfferScoreState,
} from "@/lib/rating";

import {
  AdminNav,
} from "@/components/AdminNav";

import {
  ConfirmSubmitButton,
} from "@/components/ConfirmSubmitButton";

import {
  deleteOfferRating,
  deleteRatingCriterion,
  saveOfferRating,
  saveRatingCriterion,
} from "./actions";

export const dynamic =
  "force-dynamic";

type SearchParams =
  Promise<{
    kategoria?: string;
    oferta?: string;

    editCriterion?: string;

    criterionSaved?: string;
    criterionDeleted?: string;

    ratingSaved?: string;
    ratingDeleted?: string;
  }>;

function decimalValue(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function dateTimeInput(
  value:
    | Date
    | null
    | undefined,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  const offset =
    date.getTimezoneOffset();

  const local =
    new Date(
      date.getTime() -
        offset *
          60 *
          1000,
    );

  return local
    .toISOString()
    .slice(0, 16);
}

function scoreLabel(
  score:
    | number
    | null,
) {
  if (score === null) {
    return "Ocena niekompletna";
  }

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

  return "Słaba";
}

export default async function RatingsAdminPage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  await requireAdmin();

  const query =
    await searchParams;

  const categories =
    await prisma.category.findMany({
      include: {
        _count: {
          select: {
            offers:
              true,

            ratingCriteria:
              true,
          },
        },
      },

      orderBy: {
        sortOrder:
          "asc",
      },
    });

  const selectedCategory =
    categories.find(
      (category) =>
        category.id ===
        query.kategoria,
    ) ??
    categories[0] ??
    null;

  const [
    criteria,
    offers,
    editingCriterion,
  ] =
    selectedCategory
      ? await Promise.all([
          prisma.ratingCriterion.findMany({
            where: {
              categoryId:
                selectedCategory.id,
            },

            include: {
              _count: {
                select: {
                  ratings:
                    true,
                },
              },
            },

            orderBy: [
              {
                sortOrder:
                  "asc",
              },
              {
                name:
                  "asc",
              },
            ],
          }),

          prisma.offer.findMany({
            where: {
              categoryId:
                selectedCategory.id,
            },

            include: {
              provider:
                true,
            },

            orderBy: [
              {
                isPublished:
                  "desc",
              },
              {
                name:
                  "asc",
              },
            ],
          }),

          query.editCriterion
            ? prisma.ratingCriterion.findFirst({
                where: {
                  id:
                    query.editCriterion,

                  categoryId:
                    selectedCategory.id,
                },
              })
            : null,
        ])
      : [
          [],
          [],
          null,
        ];

  const selectedOffer =
    offers.find(
      (offer) =>
        offer.id ===
        query.oferta,
    ) ??
    offers[0] ??
    null;

  const ratings =
    selectedOffer
      ? await prisma.offerRating.findMany({
          where: {
            offerId:
              selectedOffer.id,
          },

          orderBy: {
            updatedAt:
              "desc",
          },
        })
      : [];

  const ratingMap =
    new Map(
      ratings.map(
        (rating) => [
          rating.criterionId,
          rating,
        ],
      ),
    );

  const scoreState =
    selectedOffer
      ? await getOfferScoreState(
          selectedOffer.id,
        )
      : null;

  const activeCriteria =
    criteria.filter(
      (criterion) =>
        criterion.isPublished,
    );

  const totalWeight =
    activeCriteria.reduce(
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

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AdminNav />

          <section className="min-w-0">
            <div>
              <span className="eyebrow">
                Metodologia
              </span>

              <h1 className="mt-3 text-[34px] font-[720] tracking-[-0.045em]">
                System ocen
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
                Każda kategoria ma
                własne kryteria i
                własne wagi. Ocena
                końcowa jest liczona
                automatycznie jako
                średnia ważona.
              </p>
            </div>

            {query.criterionSaved ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087443]">
                Kryterium zapisane.
                Wyniki ofert zostały
                przeliczone.
              </div>
            ) : null}

            {query.criterionDeleted ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087443]">
                Kryterium i jego oceny
                zostały usunięte.
              </div>
            ) : null}

            {query.ratingSaved ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087443]">
                Ocena została zapisana,
                a wynik oferty
                przeliczony.
              </div>
            ) : null}

            {query.ratingDeleted ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087443]">
                Ocena składowa została
                usunięta.
              </div>
            ) : null}

            {/* KATEGORIE */}

            <section className="card mt-7 p-5">
              <div className="mb-4">
                <div className="text-sm font-[680]">
                  Kategoria
                </div>

                <p className="mt-1 text-xs text-[#98a2b3]">
                  Każda kategoria może
                  być oceniana według
                  innych zasad.
                </p>
              </div>

              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categories.map(
                    (category) => {
                      const active =
                        selectedCategory?.id ===
                        category.id;

                      return (
                        <Link
                          key={
                            category.id
                          }
                          href={`/admin/oceny?kategoria=${category.id}`}
                          className={[
                            "rounded-[11px] border px-4 py-3 transition",
                            active
                              ? "border-[#c9c5ff] bg-[#f2f1ff] text-[#5048d8]"
                              : "border-[#e7e9ee] bg-white text-[#475467] hover:border-[#d0d5dd]",
                          ].join(" ")}
                        >
                          <div className="text-sm font-semibold">
                            {
                              category.name
                            }
                          </div>

                          <div className="mt-1 text-[10px] opacity-70">
                            {
                              category
                                ._count
                                .ratingCriteria
                            }{" "}
                            kryteriów ·{" "}
                            {
                              category
                                ._count
                                .offers
                            }{" "}
                            ofert
                          </div>
                        </Link>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="py-4 text-sm text-[#667085]">
                  Najpierw utwórz
                  kategorię.
                </div>
              )}
            </section>

            {selectedCategory ? (
              <>
                {/* METRYKI */}

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="card p-5">
                    <div className="text-xs text-[#98a2b3]">
                      Aktywne kryteria
                    </div>

                    <div className="mt-3 text-[30px] font-[720] tracking-[-0.04em]">
                      {
                        activeCriteria.length
                      }
                    </div>
                  </div>

                  <div className="card p-5">
                    <div className="text-xs text-[#98a2b3]">
                      Łączna waga
                    </div>

                    <div className="mt-3 text-[30px] font-[720] tracking-[-0.04em]">
                      {totalWeight.toLocaleString(
                        "pl-PL",
                        {
                          maximumFractionDigits: 2,
                        },
                      )}
                    </div>
                  </div>

                  <div className="card p-5">
                    <div className="text-xs text-[#98a2b3]">
                      Oferty
                    </div>

                    <div className="mt-3 text-[30px] font-[720] tracking-[-0.04em]">
                      {offers.length}
                    </div>
                  </div>
                </div>

                {/* FORM KRYTERIUM */}

                <form
                  action={
                    saveRatingCriterion
                  }
                  className="card mt-6 overflow-hidden"
                >
                  <input
                    type="hidden"
                    name="id"
                    value={
                      editingCriterion?.id ??
                      ""
                    }
                  />

                  <input
                    type="hidden"
                    name="categoryId"
                    value={
                      selectedCategory.id
                    }
                  />

                  <div className="flex items-center justify-between border-b border-[#eceef2] px-6 py-5">
                    <div>
                      <h2 className="text-lg font-[680]">
                        {editingCriterion
                          ? "Edytuj kryterium"
                          : "Nowe kryterium"}
                      </h2>

                      <p className="mt-1 text-xs text-[#98a2b3]">
                        {
                          selectedCategory.name
                        }
                      </p>
                    </div>

                    {editingCriterion ? (
                      <Link
                        href={`/admin/oceny?kategoria=${selectedCategory.id}`}
                        className="btn btn-secondary"
                      >
                        Anuluj
                      </Link>
                    ) : null}
                  </div>

                  <div className="grid gap-5 p-6 md:grid-cols-2">
                    <label>
                      <span className="label">
                        Nazwa *
                      </span>

                      <input
                        name="name"
                        required
                        className="field"
                        placeholder="np. Cena i opłacalność"
                        defaultValue={
                          editingCriterion?.name ??
                          ""
                        }
                      />
                    </label>

                    <label>
                      <span className="label">
                        Klucz
                      </span>

                      <input
                        name="key"
                        className="field"
                        placeholder="cena-oplacalnosc"
                        defaultValue={
                          editingCriterion?.key ??
                          ""
                        }
                      />
                    </label>

                    <label>
                      <span className="label">
                        Waga *
                      </span>

                      <input
                        name="weight"
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        required
                        className="field"
                        placeholder="25"
                        defaultValue={decimalValue(
                          editingCriterion?.weight,
                        )}
                      />

                      <span className="mt-2 block text-[11px] leading-5 text-[#98a2b3]">
                        Nie musi sumować
                        się do 100.
                        Normalizujemy wagi
                        automatycznie.
                      </span>
                    </label>

                    <label>
                      <span className="label">
                        Kolejność
                      </span>

                      <input
                        name="sortOrder"
                        type="number"
                        step="1"
                        className="field"
                        defaultValue={
                          editingCriterion?.sortOrder ??
                          criteria.length *
                            10
                        }
                      />
                    </label>

                    <label className="md:col-span-2">
                      <span className="label">
                        Opis
                      </span>

                      <textarea
                        name="description"
                        className="field min-h-28 resize-y"
                        placeholder="Co dokładnie mierzy to kryterium?"
                        defaultValue={
                          editingCriterion?.description ??
                          ""
                        }
                      />
                    </label>

                    <label className="flex items-start gap-3 rounded-[14px] border border-[#e7e9ee] bg-[#fafbfc] p-4 md:col-span-2">
                      <input
                        type="checkbox"
                        name="isPublished"
                        className="mt-1"
                        defaultChecked={
                          editingCriterion
                            ? editingCriterion.isPublished
                            : true
                        }
                      />

                      <div>
                        <div className="text-sm font-semibold">
                          Aktywne kryterium
                        </div>

                        <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
                          Aktywne kryterium
                          jest wymagane do
                          uzyskania końcowego
                          wyniku.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4">
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      {editingCriterion
                        ? "Zapisz kryterium"
                        : "Dodaj kryterium"}

                      <span>
                        →
                      </span>
                    </button>
                  </div>
                </form>

                {/* LISTA KRYTERIÓW */}

                <section className="mt-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-[680] tracking-[-0.025em]">
                      Kryteria kategorii
                    </h2>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            Kryterium
                          </th>

                          <th>
                            Waga
                          </th>

                          <th>
                            Oceny
                          </th>

                          <th>
                            Status
                          </th>

                          <th />
                        </tr>
                      </thead>

                      <tbody>
                        {criteria.map(
                          (
                            criterion,
                          ) => (
                            <tr
                              key={
                                criterion.id
                              }
                            >
                              <td>
                                <div className="min-w-[240px]">
                                  <div className="font-semibold text-[#101114]">
                                    {
                                      criterion.name
                                    }
                                  </div>

                                  <div className="mt-1 font-mono text-[10px] text-[#98a2b3]">
                                    {
                                      criterion.key
                                    }
                                  </div>

                                  {criterion.description ? (
                                    <p className="mt-2 max-w-[420px] text-xs leading-5 text-[#667085]">
                                      {
                                        criterion.description
                                      }
                                    </p>
                                  ) : null}
                                </div>
                              </td>

                              <td>
                                <strong className="font-semibold text-[#344054]">
                                  {Number(
                                    criterion.weight,
                                  ).toLocaleString(
                                    "pl-PL",
                                    {
                                      maximumFractionDigits: 2,
                                    },
                                  )}
                                </strong>
                              </td>

                              <td>
                                {
                                  criterion
                                    ._count
                                    .ratings
                                }
                              </td>

                              <td>
                                {criterion.isPublished ? (
                                  <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-semibold text-[#087443]">
                                    Aktywne
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#667085]">
                                    Wyłączone
                                  </span>
                                )}
                              </td>

                              <td>
                                <div className="flex justify-end gap-4 whitespace-nowrap">
                                  <Link
                                    href={`/admin/oceny?kategoria=${selectedCategory.id}&editCriterion=${criterion.id}`}
                                    className="text-sm font-semibold text-[#5048d8]"
                                  >
                                    Edytuj
                                  </Link>

                                  <form
                                    action={
                                      deleteRatingCriterion
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="id"
                                      value={
                                        criterion.id
                                      }
                                    />

                                    <ConfirmSubmitButton
                                      type="submit"
                                      className="text-sm font-semibold text-[#b42318]"
                                      message={`Usunąć kryterium „${criterion.name}”? Wszystkie zapisane oceny tego kryterium również zostaną usunięte.`}
                                    >
                                      Usuń
                                    </ConfirmSubmitButton>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          ),
                        )}

                        {criteria.length ===
                        0 ? (
                          <tr>
                            <td
                              colSpan={
                                5
                              }
                            >
                              <div className="py-10 text-center">
                                <div className="text-sm font-semibold text-[#344054]">
                                  Brak kryteriów
                                </div>

                                <p className="mt-2 text-xs text-[#98a2b3]">
                                  Utwórz pierwsze
                                  kryterium dla tej
                                  kategorii.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* WYBÓR OFERTY */}

                <section className="card mt-8 p-5">
                  <div className="mb-4">
                    <div className="text-sm font-[680]">
                      Oferta do oceny
                    </div>

                    <p className="mt-1 text-xs text-[#98a2b3]">
                      Wybierz ofertę z
                      kategorii{" "}
                      <strong className="font-semibold text-[#667085]">
                        {
                          selectedCategory.name
                        }
                      </strong>
                      .
                    </p>
                  </div>

                  {offers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {offers.map(
                        (offer) => {
                          const active =
                            selectedOffer?.id ===
                            offer.id;

                          return (
                            <Link
                              key={
                                offer.id
                              }
                              href={`/admin/oceny?kategoria=${selectedCategory.id}&oferta=${offer.id}`}
                              className={[
                                "rounded-[11px] border px-4 py-3 transition",
                                active
                                  ? "border-[#c9c5ff] bg-[#f2f1ff]"
                                  : "border-[#e7e9ee] bg-white hover:border-[#d0d5dd]",
                              ].join(" ")}
                            >
                              <div
                                className={[
                                  "text-sm font-semibold",
                                  active
                                    ? "text-[#5048d8]"
                                    : "text-[#344054]",
                                ].join(" ")}
                              >
                                {
                                  offer.name
                                }
                              </div>

                              <div className="mt-1 text-[10px] text-[#98a2b3]">
                                {
                                  offer.provider.name
                                }

                                {!offer.isPublished
                                  ? " · ukryta"
                                  : ""}
                              </div>
                            </Link>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-sm text-[#667085]">
                      Brak ofert w tej
                      kategorii.
                    </div>
                  )}
                </section>

                {selectedOffer &&
                scoreState ? (
                  <>
                    {/* WYNIK */}

                    <section className="mt-6 overflow-hidden rounded-[18px] border border-[#e7e9ee] bg-white">
                      <div className="grid md:grid-cols-[1fr_220px]">
                        <div className="p-6">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                            Wynik Narzivo
                          </div>

                          <h2 className="mt-3 text-[25px] font-[700] tracking-[-0.035em]">
                            {
                              selectedOffer.name
                            }
                          </h2>

                          <div className="mt-2 text-sm text-[#667085]">
                            {
                              selectedOffer.provider.name
                            }
                          </div>

                          <div className="mt-6 flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#f2f4f7] px-3 py-1.5 text-xs text-[#667085]">
                              {
                                scoreState.ratedCount
                              }
                              /
                              {
                                scoreState.criteriaCount
                              }{" "}
                              kryteriów
                            </span>

                            {scoreState.complete ? (
                              <span className="rounded-full bg-[#ecfdf3] px-3 py-1.5 text-xs font-semibold text-[#087443]">
                                Ocena kompletna
                              </span>
                            ) : (
                              <span className="rounded-full bg-[#fffaeb] px-3 py-1.5 text-xs font-semibold text-[#b54708]">
                                Brakuje{" "}
                                {
                                  scoreState.missingCount
                                }{" "}
                                ocen
                              </span>
                            )}
                          </div>

                          {!scoreState.complete &&
                          activeCriteria.length >
                            0 ? (
                            <p className="mt-5 max-w-2xl text-xs leading-5 text-[#667085]">
                              Końcowa ocena nie
                              zostanie pokazana
                              publicznie, dopóki
                              wszystkie aktywne
                              kryteria nie zostaną
                              ocenione.
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-col justify-center border-t border-[#eceef2] bg-[#fafbfc] p-6 md:border-l md:border-t-0">
                          <div className="text-[10px] uppercase tracking-[0.06em] text-[#98a2b3]">
                            Wynik końcowy
                          </div>

                          <div className="mt-3 text-[46px] font-[740] leading-none tracking-[-0.055em]">
                            {scoreState.score !==
                            null
                              ? scoreState.score.toFixed(
                                  1,
                                )
                              : "—"}

                            <span className="ml-1 text-lg font-medium text-[#98a2b3]">
                              /10
                            </span>
                          </div>

                          <div className="mt-3 text-xs font-semibold text-[#5048d8]">
                            {scoreLabel(
                              scoreState.score,
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* OCENY SKŁADOWE */}

                    <section className="mt-8">
                      <div className="mb-4">
                        <h2 className="text-xl font-[680] tracking-[-0.025em]">
                          Oceny składowe
                        </h2>

                        <p className="mt-1 text-xs text-[#98a2b3]">
                          Każde kryterium
                          zapisujemy osobno
                          wraz ze źródłem,
                          uzasadnieniem i datą.
                        </p>
                      </div>

                      <div className="space-y-4">
                        {criteria.map(
                          (
                            criterion,
                          ) => {
                            const rating =
                              ratingMap.get(
                                criterion.id,
                              );

                            const normalizedWeight =
                              criterion.isPublished &&
                              totalWeight > 0
                                ? (Number(
                                    criterion.weight,
                                  ) /
                                    totalWeight) *
                                  100
                                : 0;

                            const saveFormId =
                              `rating-save-${criterion.id}`;

                            return (
                              <article
                                key={
                                  criterion.id
                                }
                                className={[
                                  "overflow-hidden rounded-[18px] border bg-white",
                                  criterion.isPublished
                                    ? "border-[#e7e9ee]"
                                    : "border-[#eceef2] opacity-70",
                                ].join(" ")}
                              >
                                <div className="flex flex-col justify-between gap-4 border-b border-[#eceef2] px-5 py-4 md:flex-row md:items-center">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="font-[680] text-[#101114]">
                                        {
                                          criterion.name
                                        }
                                      </h3>

                                      {!criterion.isPublished ? (
                                        <span className="rounded-full bg-[#f2f4f7] px-2 py-1 text-[9px] font-semibold text-[#667085]">
                                          WYŁĄCZONE
                                        </span>
                                      ) : null}
                                    </div>

                                    {criterion.description ? (
                                      <p className="mt-1 max-w-2xl text-xs leading-5 text-[#667085]">
                                        {
                                          criterion.description
                                        }
                                      </p>
                                    ) : null}
                                  </div>

                                  <div className="shrink-0 md:text-right">
                                    <div className="text-[10px] uppercase tracking-[0.06em] text-[#98a2b3]">
                                      Waga wyniku
                                    </div>

                                    <div className="mt-1 text-sm font-semibold">
                                      {criterion.isPublished
                                        ? `${normalizedWeight.toLocaleString(
                                            "pl-PL",
                                            {
                                              maximumFractionDigits: 1,
                                            },
                                          )}%`
                                        : "—"}
                                    </div>
                                  </div>
                                </div>

                                <form
                                  id={
                                    saveFormId
                                  }
                                  action={
                                    saveOfferRating
                                  }
                                  className="grid gap-5 p-5 md:grid-cols-[150px_1fr]"
                                >
                                  <input
                                    type="hidden"
                                    name="offerId"
                                    value={
                                      selectedOffer.id
                                    }
                                  />

                                  <input
                                    type="hidden"
                                    name="criterionId"
                                    value={
                                      criterion.id
                                    }
                                  />

                                  <label>
                                    <span className="label">
                                      Ocena 0–10 *
                                    </span>

                                    <input
                                      name="score"
                                      type="number"
                                      min="0"
                                      max="10"
                                      step="0.1"
                                      required
                                      className="field text-lg font-semibold"
                                      defaultValue={decimalValue(
                                        rating?.score,
                                      )}
                                    />
                                  </label>

                                  <label>
                                    <span className="label">
                                      Źródło
                                    </span>

                                    <input
                                      name="sourceUrl"
                                      type="url"
                                      className="field"
                                      placeholder="https://..."
                                      defaultValue={
                                        rating?.sourceUrl ??
                                        ""
                                      }
                                    />
                                  </label>

                                  <label className="md:col-span-2">
                                    <span className="label">
                                      Uzasadnienie
                                    </span>

                                    <textarea
                                      name="note"
                                      className="field min-h-28 resize-y"
                                      placeholder="Dlaczego oferta otrzymała właśnie taką ocenę?"
                                      defaultValue={
                                        rating?.note ??
                                        ""
                                      }
                                    />
                                  </label>

                                  <label className="md:col-span-2">
                                    <span className="label">
                                      Data weryfikacji
                                    </span>

                                    <input
                                      name="lastVerifiedAt"
                                      type="datetime-local"
                                      required
                                      className="field"
                                      defaultValue={dateTimeInput(
                                        rating?.lastVerifiedAt ??
                                          new Date(),
                                      )}
                                    />
                                  </label>

                                  <div className="md:col-span-2 flex justify-end">
                                    <button
                                      type="submit"
                                      className="btn btn-primary"
                                    >
                                      {rating
                                        ? "Aktualizuj ocenę"
                                        : "Zapisz ocenę"}
                                    </button>
                                  </div>
                                </form>

                                <div className="flex flex-col justify-between gap-3 border-t border-[#eceef2] bg-[#fafbfc] px-5 py-4 sm:flex-row sm:items-center">
                                  <div className="text-[11px] text-[#98a2b3]">
                                    {rating
                                      ? `Aktualna ocena: ${Number(
                                          rating.score,
                                        ).toFixed(
                                          1,
                                        )}/10`
                                      : "Brak zapisanej oceny."}
                                  </div>

                                  {rating ? (
                                    <form
                                      action={
                                        deleteOfferRating
                                      }
                                    >
                                      <input
                                        type="hidden"
                                        name="offerId"
                                        value={
                                          selectedOffer.id
                                        }
                                      />

                                      <input
                                        type="hidden"
                                        name="criterionId"
                                        value={
                                          criterion.id
                                        }
                                      />

                                      <ConfirmSubmitButton
                                        type="submit"
                                        className="text-sm font-semibold text-[#b42318]"
                                        message={`Usunąć ocenę kryterium „${criterion.name}”? Końcowa ocena oferty może stać się niekompletna.`}
                                      >
                                        Usuń ocenę
                                      </ConfirmSubmitButton>
                                    </form>
                                  ) : null}
                                </div>
                              </article>
                            );
                          },
                        )}

                        {criteria.length ===
                        0 ? (
                          <div className="rounded-[18px] border border-dashed border-[#d9dde5] bg-white p-10 text-center">
                            <div className="text-sm font-semibold text-[#344054]">
                              Najpierw dodaj
                              kryteria
                            </div>

                            <p className="mt-2 text-xs text-[#98a2b3]">
                              Oferta nie może
                              otrzymać wyniku
                              bez metodologii
                              kategorii.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </section>
                  </>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}