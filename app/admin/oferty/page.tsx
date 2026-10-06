import Link from "next/link";

import {
  requireAdmin,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  formatMoney,
  polishDate,
} from "@/lib/format";

import {
  formatWarsawDateTimeInput,
} from "@/lib/warsaw-datetime";

import {
  getOfferWindowStatus,
} from "@/lib/offer-validity";

import {
  getOfferReadinessByIds,
} from "@/lib/offer-readiness";

import {
  AdminNav,
} from "@/components/AdminNav";

import {
  ConfirmSubmitButton,
} from "@/components/ConfirmSubmitButton";

import {
  cloneOffer,
  deleteOffer,
  saveOffer,
} from "./actions";

export const dynamic =
  "force-dynamic";

type SearchParams =
  Promise<{
    edit?: string;
    saved?: string;
    deleted?: string;

    cloned?: string;
    rated?: string;

    publishBlocked?:
      string;

    readiness?:
      string;
  }>;

function decimalInput(
  value:
    unknown,
) {
  return value ===
      null ||
    value ===
      undefined
    ? ""
    : String(
        value,
      );
}

function jsonInput(
  value:
    unknown,
) {
  try {
    return JSON.stringify(
      value ?? {},
      null,
      2,
    );
  } catch {
    return "{}";
  }
}

function StatusBadge({
  status,
}: {
  status:
    ReturnType<
      typeof getOfferWindowStatus
    >;
}) {
  if (
    status ===
    "UPCOMING"
  ) {
    return (
      <span className="rounded-full bg-[#eff8ff] px-2.5 py-1 text-xs font-semibold text-[#175cd3]">
        Przyszła
      </span>
    );
  }

  if (
    status ===
    "EXPIRED"
  ) {
    return (
      <span className="rounded-full bg-[#fff1f0] px-2.5 py-1 text-xs font-semibold text-[#b42318]">
        Wygasła
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-semibold text-[#087443]">
      Aktywna
    </span>
  );
}

function ReadinessBadge({
  score,
}: {
  score:
    number;
}) {
  if (
    score === 100
  ) {
    return (
      <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-semibold text-[#087443]">
        100% · Gotowa
      </span>
    );
  }

  if (
    score >= 70
  ) {
    return (
      <span className="rounded-full bg-[#fffaeb] px-2.5 py-1 text-xs font-semibold text-[#b54708]">
        {score}%
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#fef3f2] px-2.5 py-1 text-xs font-semibold text-[#b42318]">
      {score}%
    </span>
  );
}

export default async function OffersAdminPage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  await requireAdmin();

  const query =
    await searchParams;

  const now =
    new Date();

  const [
    offers,
    categories,
    providers,
    editing,
  ] =
    await Promise.all([
      prisma.offer.findMany({
        include: {
          provider:
            true,

          category:
            true,

          _count: {
            select: {
              clicks:
                true,

              ratings:
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
        orderBy: {
          sortOrder:
            "asc",
        },
      }),

      prisma.provider.findMany({
        orderBy: {
          name:
            "asc",
        },
      }),

      query.edit
        ? prisma.offer.findUnique({
            where: {
              id:
                query.edit,
            },
          })
        : null,
    ]);

  const readinessMap =
    await getOfferReadinessByIds(
      offers.map(
        (
          offer,
        ) =>
          offer.id,
      ),
    );

  const editingReadiness =
    editing
      ? readinessMap.get(
          editing.id,
        ) ??
        null
      : null;

  const hasSetup =
    categories.length >
      0 &&
    providers.length >
      0;

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AdminNav />

          <section className="min-w-0">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <span className="eyebrow">
                  Katalog
                </span>

                <h1 className="mt-3 text-[32px] font-[720] tracking-[-0.04em]">
                  Oferty
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                  Dodawanie, klonowanie,
                  automatyczna ocena,
                  kontrola kompletności
                  i publikacja ofert.
                </p>
              </div>

              {editing ? (
                <Link
                  href="/admin/oferty"
                  className="btn btn-secondary"
                >
                  + Nowa oferta
                </Link>
              ) : null}
            </div>

            {query.saved ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#087443]">
                Oferta została
                zapisana.

                {query.rated
                  ? " Ocena została automatycznie przeliczona."
                  : ""}
              </div>
            ) : null}

            {query.cloned ? (
              <div className="mt-6 rounded-[12px] border border-[#d9d6fe] bg-[#f4f3ff] px-4 py-3 text-sm font-medium text-[#5048d8]">
                Utworzono kopię
                roboczą oferty.
                Zmień nazwę, slug,
                ceny i parametry,
                a następnie zapisz.
              </div>
            ) : null}

            {query.deleted ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#087443]">
                Oferta została
                usunięta.
              </div>
            ) : null}

            {query.publishBlocked ? (
              <div className="mt-6 rounded-[12px] border border-[#fedf89] bg-[#fffaeb] px-4 py-3 text-sm leading-6 text-[#b54708]">
                Oferta została
                zapisana jako szkic,
                ale publikacja została
                zablokowana, ponieważ
                gotowość wynosi{" "}
                <strong>
                  {query.readiness ??
                    "0"}
                  %
                </strong>
                . Uzupełnij brakujące
                elementy do 100%.
              </div>
            ) : null}

            {editing &&
            editingReadiness ? (
              <section className="mt-7 overflow-hidden rounded-[18px] border border-[#e7e9ee] bg-white">
                <div className="grid md:grid-cols-[220px_1fr]">
                  <div className="border-b border-[#eceef2] bg-[#fafbfc] p-6 md:border-b-0 md:border-r">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                      Gotowość oferty
                    </div>

                    <div className="mt-3 text-[46px] font-[740] leading-none tracking-[-0.055em]">
                      {
                        editingReadiness.score
                      }
                      <span className="ml-1 text-lg font-medium text-[#98a2b3]">
                        %
                      </span>
                    </div>

                    <div className="mt-4">
                      <ReadinessBadge
                        score={
                          editingReadiness.score
                        }
                      />
                    </div>

                    <div className="mt-4 text-xs leading-5 text-[#667085]">
                      Afiliacja:{" "}
                      <strong>
                        {editingReadiness.affiliateActive
                          ? "aktywna"
                          : "brak"}
                      </strong>
                    </div>

                    <p className="mt-3 text-[11px] leading-5 text-[#98a2b3]">
                      Brak afiliacji nie
                      obniża gotowości i
                      nie wpływa na
                      ranking.
                    </p>
                  </div>

                  <div className="grid gap-3 p-6 sm:grid-cols-2">
                    {editingReadiness.checks.map(
                      (
                        check,
                      ) => (
                        <div
                          key={
                            check.key
                          }
                          className={[
                            "rounded-[12px] border p-4",
                            check.passed
                              ? "border-[#d1fadf] bg-[#f6fef9]"
                              : "border-[#fedf89] bg-[#fffcf5]",
                          ].join(
                            " ",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold text-[#344054]">
                              {check.passed
                                ? "✓ "
                                : "○ "}

                              {
                                check.label
                              }
                            </div>

                            <span className="text-[10px] font-semibold text-[#98a2b3]">
                              {
                                check.weight
                              }
                              %
                            </span>
                          </div>

                          <p className="mt-2 text-[11px] leading-5 text-[#667085]">
                            {
                              check.detail
                            }
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            <form
              key={
                editing?.id ??
                "new-offer"
              }
              action={
                saveOffer
              }
              className="card mt-7 overflow-hidden"
            >
              <input
                type="hidden"
                name="id"
                value={
                  editing?.id ??
                  ""
                }
              />

              <div className="flex items-center justify-between border-b border-[#eceef2] px-6 py-5">
                <div>
                  <h2 className="text-lg font-[680]">
                    {editing
                      ? "Edytuj ofertę"
                      : "Nowa oferta"}
                  </h2>

                  {editing ? (
                    <p className="mt-1 text-xs text-[#98a2b3]">
                      Po zapisie ocena
                      zostanie
                      przeliczona
                      automatycznie.
                    </p>
                  ) : null}
                </div>

                {editing ? (
                  <form
                    action={
                      cloneOffer
                    }
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={
                        editing.id
                      }
                    />

                    <button
                      type="submit"
                      className="btn btn-secondary"
                    >
                      Klonuj ofertę
                    </button>
                  </form>
                ) : null}
              </div>

              <div className="grid gap-5 border-b border-[#eceef2] p-6 md:grid-cols-2">
                <label>
                  <span className="label">
                    Nazwa *
                  </span>

                  <input
                    name="name"
                    required
                    className="field"
                    defaultValue={
                      editing?.name ??
                      ""
                    }
                  />
                </label>

                <label>
                  <span className="label">
                    Slug
                  </span>

                  <input
                    name="slug"
                    className="field"
                    defaultValue={
                      editing?.slug ??
                      ""
                    }
                  />
                </label>

                <label>
                  <span className="label">
                    Kategoria *
                  </span>

                  <select
                    name="categoryId"
                    required
                    className="field"
                    defaultValue={
                      editing?.categoryId ??
                      ""
                    }
                  >
                    <option value="">
                      Wybierz
                    </option>

                    {categories.map(
                      (
                        category,
                      ) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  <span className="label">
                    Dostawca *
                  </span>

                  <select
                    name="providerId"
                    required
                    className="field"
                    defaultValue={
                      editing?.providerId ??
                      ""
                    }
                  >
                    <option value="">
                      Wybierz
                    </option>

                    {providers.map(
                      (
                        provider,
                      ) => (
                        <option
                          key={
                            provider.id
                          }
                          value={
                            provider.id
                          }
                        >
                          {
                            provider.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="md:col-span-2">
                  <span className="label">
                    Krótki opis *
                  </span>

                  <input
                    name="summary"
                    required
                    className="field"
                    defaultValue={
                      editing?.summary ??
                      ""
                    }
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="label">
                    Pełny opis *
                  </span>

                  <textarea
                    name="description"
                    required
                    className="field min-h-40 resize-y"
                    defaultValue={
                      editing?.description ??
                      ""
                    }
                  />
                </label>
              </div>

              <section className="border-b border-[#eceef2] p-6">
                <div className="mb-5 text-sm font-[680]">
                  Cena
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <label>
                    <span className="label">
                      Cena
                    </span>

                    <input
                      name="priceAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="field"
                      defaultValue={decimalInput(
                        editing?.priceAmount,
                      )}
                    />
                  </label>

                  <label>
                    <span className="label">
                      Cena regularna
                    </span>

                    <input
                      name="regularPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      className="field"
                      defaultValue={decimalInput(
                        editing?.regularPrice,
                      )}
                    />
                  </label>

                  <label>
                    <span className="label">
                      Waluta
                    </span>

                    <input
                      name="currency"
                      maxLength={3}
                      required
                      className="field"
                      defaultValue={
                        editing?.currency ??
                        "PLN"
                      }
                    />
                  </label>

                  <label>
                    <span className="label">
                      Okres
                    </span>

                    <select
                      name="billingPeriod"
                      className="field"
                      defaultValue={
                        editing?.billingPeriod ??
                        "MONTH"
                      }
                    >
                      <option value="MONTH">
                        Miesiąc
                      </option>

                      <option value="YEAR">
                        Rok
                      </option>

                      <option value="ONE_TIME">
                        Jednorazowo
                      </option>

                      <option value="CUSTOM">
                        Inny
                      </option>
                    </select>
                  </label>

                  <label className="md:col-span-2">
                    <span className="label">
                      Etykieta okresu
                    </span>

                    <input
                      name="billingLabel"
                      className="field"
                      defaultValue={
                        editing?.billingLabel ??
                        ""
                      }
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="label">
                      Kod promocyjny
                    </span>

                    <input
                      name="promoCode"
                      className="field"
                      defaultValue={
                        editing?.promoCode ??
                        ""
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="border-b border-[#eceef2] p-6">
                <div>
                  <div className="text-sm font-[680]">
                    Okres ważności
                  </div>

                  <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
                    Puste pola oznaczają
                    brak ograniczenia.
                    Czas interpretujemy
                    jako Europe/Warsaw.
                  </p>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <label>
                    <span className="label">
                      Aktywna od
                    </span>

                    <input
                      name="validFrom"
                      type="datetime-local"
                      className="field"
                      defaultValue={formatWarsawDateTimeInput(
                        editing?.validFrom,
                      )}
                    />
                  </label>

                  <label>
                    <span className="label">
                      Aktywna do
                    </span>

                    <input
                      name="validTo"
                      type="datetime-local"
                      className="field"
                      defaultValue={formatWarsawDateTimeInput(
                        editing?.validTo,
                      )}
                    />
                  </label>
                </div>

                {editing ? (
                  <div className="mt-5 rounded-[14px] border border-[#e7e9ee] bg-[#fafbfc] p-4">
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[#98a2b3]">
                      Aktualny stan
                    </div>

                    <div className="mt-2">
                      <StatusBadge
                        status={getOfferWindowStatus(
                          editing,
                          now,
                        )}
                      />
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="border-b border-[#eceef2] p-6">
                <div className="mb-5 text-sm font-[680]">
                  Źródła i afiliacja
                </div>

                <div className="grid gap-5">
                  <label>
                    <span className="label">
                      Oficjalne źródło *
                    </span>

                    <input
                      name="sourceUrl"
                      type="url"
                      required
                      className="field"
                      placeholder="https://..."
                      defaultValue={
                        editing?.sourceUrl ??
                        ""
                      }
                    />
                  </label>

                  <label>
                    <span className="label">
                      Link afiliacyjny
                    </span>

                    <input
                      name="affiliateUrl"
                      type="url"
                      className="field"
                      placeholder="Opcjonalny"
                      defaultValue={
                        editing?.affiliateUrl ??
                        ""
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="border-b border-[#eceef2] p-6">
                <label>
                  <span className="label">
                    Parametry JSON
                  </span>

                  <textarea
                    name="features"
                    spellCheck={false}
                    className="field min-h-60 resize-y font-mono text-[13px]"
                    defaultValue={jsonInput(
                      editing?.features,
                    )}
                  />
                </label>

                <p className="mt-2 text-[11px] leading-5 text-[#98a2b3]">
                  Podczas edycji pusty
                  JSON nie usunie
                  istniejących
                  parametrów.
                </p>
              </section>

              <section className="grid gap-5 border-b border-[#eceef2] p-6 lg:grid-cols-3">
                <label>
                  <span className="label">
                    Zastosowania
                  </span>

                  <textarea
                    name="useCases"
                    className="field min-h-40 resize-y"
                    defaultValue={
                      editing?.useCases.join(
                        "\n",
                      ) ??
                      ""
                    }
                  />
                </label>

                <label>
                  <span className="label">
                    Plusy
                  </span>

                  <textarea
                    name="pros"
                    className="field min-h-40 resize-y"
                    defaultValue={
                      editing?.pros.join(
                        "\n",
                      ) ??
                      ""
                    }
                  />
                </label>

                <label>
                  <span className="label">
                    Minusy
                  </span>

                  <textarea
                    name="cons"
                    className="field min-h-40 resize-y"
                    defaultValue={
                      editing?.cons.join(
                        "\n",
                      ) ??
                      ""
                    }
                  />
                </label>
              </section>

              <section className="border-b border-[#eceef2] p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label>
                    <span className="label">
                      Ostatnia weryfikacja *
                    </span>

                    <input
                      name="lastVerifiedAt"
                      type="datetime-local"
                      required
                      className="field"
                      defaultValue={formatWarsawDateTimeInput(
                        editing?.lastVerifiedAt ??
                          new Date(),
                      )}
                    />
                  </label>

                  <div>
                    <span className="label">
                      Ocena Narzivo
                    </span>

                    <div className="field flex items-center bg-[#fafbfc]">
                      {editing?.editorScore
                        ? `${Number(
                            editing.editorScore,
                          ).toFixed(
                            1,
                          )}/10`
                        : "Zostanie policzona automatycznie"}
                    </div>
                  </div>

                  <label className="md:col-span-2">
                    <span className="label">
                      Notatka
                      metodologiczna
                    </span>

                    <textarea
                      name="methodologyNotes"
                      className="field min-h-28 resize-y"
                      defaultValue={
                        editing?.methodologyNotes ??
                        ""
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex gap-3 rounded-[14px] border border-[#e7e9ee] bg-[#fafbfc] p-4">
                    <input
                      name="isFeatured"
                      type="checkbox"
                      defaultChecked={
                        editing?.isFeatured ??
                        false
                      }
                    />

                    <span className="text-sm font-semibold">
                      Wyróżniona
                    </span>
                  </label>

                  <label className="flex gap-3 rounded-[14px] border border-[#e7e9ee] bg-[#fafbfc] p-4">
                    <input
                      name="isPublished"
                      type="checkbox"
                      defaultChecked={
                        editing?.isPublished ??
                        false
                      }
                    />

                    <div>
                      <div className="text-sm font-semibold">
                        Opublikowana
                      </div>

                      <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
                        Publikacja nastąpi
                        tylko przy 100%
                        gotowości.
                      </p>
                    </div>
                  </label>
                </div>
              </section>

              <div className="flex justify-end gap-2 border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4">
                {editing ? (
                  <Link
                    href="/admin/oferty"
                    className="btn btn-secondary"
                  >
                    Anuluj
                  </Link>
                ) : null}

                <button
                  disabled={
                    !hasSetup
                  }
                  type="submit"
                  className="btn btn-primary disabled:opacity-40"
                >
                  {editing
                    ? "Zapisz zmiany"
                    : "Dodaj ofertę"}

                  <span>
                    →
                  </span>
                </button>
              </div>
            </form>

            <section className="mt-10">
              <div className="mb-5">
                <h2 className="text-xl font-[680]">
                  Wszystkie oferty
                </h2>

                <p className="mt-1 text-xs text-[#98a2b3]">
                  {
                    offers.length
                  }{" "}
                  ofert
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
                        Cena
                      </th>

                      <th>
                        Gotowość
                      </th>

                      <th>
                        Okres
                      </th>

                      <th>
                        Publikacja
                      </th>

                      <th>
                        Afiliacja
                      </th>

                      <th>
                        Weryfikacja
                      </th>

                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {offers.map(
                      (
                        offer,
                      ) => {
                        const windowStatus =
                          getOfferWindowStatus(
                            offer,
                            now,
                          );

                        const readiness =
                          readinessMap.get(
                            offer.id,
                          );

                        return (
                          <tr
                            key={
                              offer.id
                            }
                          >
                            <td>
                              <div className="font-semibold">
                                {
                                  offer.name
                                }
                              </div>

                              <div className="mt-1 text-xs text-[#98a2b3]">
                                {
                                  offer.provider.name
                                }{" "}
                                ·{" "}
                                {
                                  offer.category.name
                                }
                              </div>

                              {offer.editorScore ? (
                                <div className="mt-1 text-[10px] font-semibold text-[#635bff]">
                                  {Number(
                                    offer.editorScore,
                                  ).toFixed(
                                    1,
                                  )}
                                  /10
                                </div>
                              ) : null}
                            </td>

                            <td>
                              {formatMoney(
                                offer.priceAmount,
                                offer.currency,
                              ) ??
                                "—"}
                            </td>

                            <td>
                              {readiness ? (
                                <ReadinessBadge
                                  score={
                                    readiness.score
                                  }
                                />
                              ) : (
                                "—"
                              )}
                            </td>

                            <td>
                              <StatusBadge
                                status={
                                  windowStatus
                                }
                              />

                              {offer.validTo ? (
                                <div className="mt-2 text-[10px] text-[#98a2b3]">
                                  do{" "}
                                  {polishDate(
                                    offer.validTo,
                                  )}
                                </div>
                              ) : null}
                            </td>

                            <td>
                              {offer.isPublished ? (
                                <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-semibold text-[#087443]">
                                  Tak
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#667085]">
                                  Nie
                                </span>
                              )}
                            </td>

                            <td>
                              {offer.affiliateUrl
                                ? "Aktywna"
                                : "Brak"}
                            </td>

                            <td>
                              {polishDate(
                                offer.lastVerifiedAt,
                              )}
                            </td>

                            <td>
                              <div className="flex items-center justify-end gap-4 whitespace-nowrap">
                                <Link
                                  href={`/admin/oferty?edit=${offer.id}`}
                                  className="text-sm font-semibold text-[#5048d8]"
                                >
                                  Edytuj
                                </Link>

                                <form
                                  action={
                                    cloneOffer
                                  }
                                >
                                  <input
                                    type="hidden"
                                    name="id"
                                    value={
                                      offer.id
                                    }
                                  />

                                  <button
                                    type="submit"
                                    className="text-sm font-semibold text-[#475467]"
                                  >
                                    Klonuj
                                  </button>
                                </form>

                                <form
                                  action={
                                    deleteOffer
                                  }
                                >
                                  <input
                                    type="hidden"
                                    name="id"
                                    value={
                                      offer.id
                                    }
                                  />

                                  <ConfirmSubmitButton
                                    type="submit"
                                    className="text-sm font-semibold text-[#b42318]"
                                    message={`Usunąć ofertę „${offer.name}”?`}
                                  >
                                    Usuń
                                  </ConfirmSubmitButton>
                                </form>
                              </div>
                            </td>
                          </tr>
                        );
                      },
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