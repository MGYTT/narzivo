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
  importOfferFromUrl,
} from "./actions";

export const dynamic =
  "force-dynamic";

export default async function OfferImportPage() {
  await requireAdmin();

  const [
    categories,
    providers,
  ] =
    await Promise.all([
      prisma.category.findMany({
        where: {
          isPublished:
            true,
        },

        orderBy: {
          sortOrder:
            "asc",
        },
      }),

      prisma.provider.findMany({
        where: {
          isPublished:
            true,
        },

        select: {
          id:
            true,

          name:
            true,

          websiteUrl:
            true,

          affiliatePrograms: {
            where: {
              status:
                "ACTIVE",
            },

            select: {
              id:
                true,
            },

            take:
              1,
          },
        },

        orderBy: {
          name:
            "asc",
        },
      }),
    ]);

  const hosting =
    categories.find(
      (
        category,
      ) =>
        category.slug ===
        "hosting-www",
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
                  Import oferty z URL
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
                  Wklej oficjalną stronę
                  produktu. Narzivo
                  rozpozna dostawcę,
                  pobierze dostępne dane
                  i utworzy bezpieczny
                  szkic do weryfikacji.
                </p>
              </div>

              <Link
                href="/admin/oferty"
                className="btn btn-secondary"
              >
                Wszystkie oferty
              </Link>
            </div>

            <section className="mt-7 grid gap-4 md:grid-cols-3">
              <div className="card p-5">
                <div className="text-xs text-[#98a2b3]">
                  Dostawcy
                </div>

                <div className="mt-3 text-[30px] font-[720]">
                  {
                    providers.length
                  }
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs text-[#98a2b3]">
                  Kategorie
                </div>

                <div className="mt-3 text-[30px] font-[720]">
                  {
                    categories.length
                  }
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs text-[#98a2b3]">
                  Aktywne afiliacje
                </div>

                <div className="mt-3 text-[30px] font-[720]">
                  {
                    providers.filter(
                      (
                        provider,
                      ) =>
                        provider
                          .affiliatePrograms
                          .length >
                        0,
                    ).length
                  }
                </div>
              </div>
            </section>

            <form
              action={
                importOfferFromUrl
              }
              className="mt-6 overflow-hidden rounded-[18px] border border-[#d9d6fe] bg-white"
            >
              <div className="border-b border-[#eceef2] bg-[#faf9ff] px-6 py-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#635bff]">
                  Nowy import
                </div>

                <h2 className="mt-2 text-lg font-[680]">
                  Oficjalne źródło
                </h2>
              </div>

              <div className="grid gap-5 p-6">
                <label>
                  <span className="label">
                    URL produktu *
                  </span>

                  <input
                    name="sourceUrl"
                    type="url"
                    required
                    className="field"
                    placeholder="https://..."
                  />

                  <span className="mt-2 block text-[11px] leading-5 text-[#98a2b3]">
                    URL musi należeć do
                    dostawcy istniejącego
                    już w Narzivo.
                  </span>
                </label>

                <label>
                  <span className="label">
                    Nazwa pakietu /
                    wariantu
                  </span>

                  <input
                    name="variantName"
                    className="field"
                    placeholder="np. nazwa konkretnego planu"
                  />

                  <span className="mt-2 block text-[11px] leading-5 text-[#98a2b3]">
                    Zalecane, gdy jedna
                    strona zawiera kilka
                    pakietów. Dzięki temu
                    importer wybierze
                    właściwą kolumnę
                    tabeli i fragment
                    strony.
                  </span>
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
                      hosting?.id ??
                      categories[0]?.id ??
                      ""
                    }
                  >
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
              </div>

              <div className="flex justify-end border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4">
                <button
                  type="submit"
                  disabled={
                    categories.length ===
                      0 ||
                    providers.length ===
                      0
                  }
                  className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Pobierz i utwórz
                  szkic

                  <span>
                    →
                  </span>
                </button>
              </div>
            </form>

            <section className="mt-6 rounded-[18px] border border-[#e7e9ee] bg-white p-6">
              <h2 className="text-sm font-[680]">
                Co importer robi
                automatycznie?
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  "Rozpoznaje dostawcę po domenie",
                  "Blokuje obce domeny i niebezpieczne przekierowania",
                  "Pobiera tytuł i opis",
                  "Analizuje JSON-LD",
                  "Analizuje tabele wariantów",
                  "Próbuje znaleźć cenę pierwszego roku",
                  "Próbuje znaleźć cenę odnowienia",
                  "Wykrywa parametry hostingu",
                  "Generuje link afiliacyjny",
                  "Tworzy szkic, nigdy publikację",
                  "Uruchamia automatyczny scoring",
                  "Zapisuje pierwszą historię ceny",
                ].map(
                  (
                    item,
                  ) => (
                    <div
                      key={
                        item
                      }
                      className="rounded-[12px] border border-[#eceef2] bg-[#fafbfc] px-4 py-3 text-xs text-[#475467]"
                    >
                      ✓ {item}
                    </div>
                  ),
                )}
              </div>
            </section>

            <section className="mt-6 rounded-[18px] border border-[#fedf89] bg-[#fffcf5] p-6">
              <div className="text-sm font-semibold text-[#93370d]">
                Zasada bezpieczeństwa
              </div>

              <p className="mt-2 max-w-3xl text-xs leading-6 text-[#b54708]">
                Importowane dane są
                zawsze szkicem. Cena,
                promocja i parametry
                techniczne mogą zmieniać
                się na stronach
                dostawców, dlatego
                publikacja nadal wymaga
                pełnej gotowości oferty.
                Importer nie wymyśla
                brakujących danych.
              </p>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}