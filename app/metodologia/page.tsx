import Link from "next/link";

import {
  prisma,
} from "@/lib/prisma";

export const revalidate =
  900;

function formatWeight(
  weight: number,
) {
  return weight.toLocaleString(
    "pl-PL",
    {
      maximumFractionDigits:
        1,
    },
  );
}

export default async function MethodologyPage() {
  const categories =
    await prisma.category.findMany({
      where: {
        isPublished:
          true,
      },

      include: {
        ratingCriteria: {
          where: {
            isPublished:
              true,
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
        },

        _count: {
          select: {
            offers: {
              where: {
                isPublished:
                  true,
              },
            },
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
    });

  const categoriesWithMethodology =
    categories.filter(
      (category) =>
        category
          .ratingCriteria
          .length > 0,
    );

  return (
    <main>
      {/* HERO */}

      <section className="relative overflow-hidden border-b border-[#eceef2] bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-300px] h-[580px] w-[760px] -translate-x-1/2 rounded-full bg-[#f0efff] blur-[120px]" />
        </div>

        <div className="container relative py-20 md:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <span className="eyebrow">
              Metodologia Narzivo
            </span>

            <h1 className="mt-6 text-[clamp(3rem,7vw,6.1rem)] font-[740] leading-[0.93] tracking-[-0.065em]">
              Ocena ma wynikać
              z zasad, które możesz
              sprawdzić.
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-[17px] leading-8 text-[#667085] md:text-[19px]">
              Każda kategoria może
              posiadać własny zestaw
              kryteriów i wag.
              Końcowy wynik oferty
              powstaje dopiero po
              uzupełnieniu wszystkich
              aktywnych kryteriów.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="#kryteria"
                className="btn btn-primary"
              >
                Zobacz kryteria
                <span>
                  ↓
                </span>
              </Link>

              <Link
                href="/jak-zarabiamy"
                className="btn btn-secondary"
              >
                Jak zarabia Narzivo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CORE RULES */}

      <section className="container page-section">
        <div className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-[20px] border border-[#e7e9ee] bg-white p-6">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#f2f1ff] text-[12px] font-[750] text-[#5048d8]">
              01
            </div>

            <h2 className="mt-6 text-[20px] font-[690] tracking-[-0.03em]">
              Kryteria zależą
              od kategorii
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#667085]">
              To, co ma znaczenie
              przy jednej klasie
              usług, nie musi mieć
              takiej samej wartości
              przy innej.
            </p>
          </article>

          <article className="rounded-[20px] border border-[#e7e9ee] bg-white p-6">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#f2f1ff] text-[12px] font-[750] text-[#5048d8]">
              02
            </div>

            <h2 className="mt-6 text-[20px] font-[690] tracking-[-0.03em]">
              Każde kryterium ma wagę
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#667085]">
              Wyższa waga oznacza
              większy udział danego
              kryterium w wyniku
              końcowym.
            </p>
          </article>

          <article className="rounded-[20px] border border-[#e7e9ee] bg-white p-6">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#f2f1ff] text-[12px] font-[750] text-[#5048d8]">
              03
            </div>

            <h2 className="mt-6 text-[20px] font-[690] tracking-[-0.03em]">
              Brak danych to brak wyniku
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#667085]">
              Nie uzupełniamy
              brakujących ocen
              automatycznie. Jeżeli
              oferta nie posiada
              kompletu aktywnych ocen,
              wynik końcowy pozostaje
              pusty.
            </p>
          </article>
        </div>
      </section>

      {/* FORMULA */}

      <section className="border-y border-[#eceef2] bg-[#fafbfc]">
        <div className="container page-section">
          <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div className="max-w-xl">
              <span className="eyebrow">
                Wynik końcowy
              </span>

              <h2 className="h2 mt-3">
                Średnia ważona,
                a nie ręczna nota.
              </h2>

              <p className="mt-5 text-sm leading-7 text-[#667085]">
                Redaktor ocenia
                konkretne kryteria
                w skali 0–10.
                Narzivo wylicza wynik
                końcowy na podstawie
                aktywnych wag.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#dedcff] bg-white p-6 md:p-8">
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#7771d7]">
                Uproszczony wzór
              </div>

              <div className="mt-6 overflow-x-auto">
                <div className="min-w-[460px] text-center">
                  <div className="text-[23px] font-[690] tracking-[-0.035em]">
                    Σ (ocena × waga)
                  </div>

                  <div className="mx-auto my-3 h-px max-w-[300px] bg-[#d8d5ff]" />

                  <div className="text-[23px] font-[690] tracking-[-0.035em]">
                    Σ wag aktywnych kryteriów
                  </div>
                </div>
              </div>

              <p className="mt-7 text-xs leading-6 text-[#667085]">
                Wagi nie muszą sumować
                się do 100. System
                normalizuje je względem
                ich łącznej wartości.
                Wynik jest prezentowany
                w skali 0–10.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE CRITERIA */}

      <section
        id="kryteria"
        className="container page-section scroll-mt-24"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="eyebrow">
              Aktualna metodologia
            </span>

            <h2 className="h2 mt-3">
              Kryteria używane
              obecnie w Narzivo.
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#667085]">
              Poniższe dane pochodzą
              bezpośrednio z aktywnej
              konfiguracji kategorii,
              a nie z przykładowego
              zestawu.
            </p>
          </div>

          <div className="text-xs text-[#98a2b3]">
            Kategorie z aktywną
            metodologią:{" "}
            <strong className="font-semibold text-[#344054]">
              {
                categoriesWithMethodology.length
              }
            </strong>
          </div>
        </div>

        {categoriesWithMethodology.length >
        0 ? (
          <div className="mt-10 space-y-6">
            {categoriesWithMethodology.map(
              (
                category,
              ) => {
                const totalWeight =
                  category.ratingCriteria.reduce(
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
                  <article
                    key={
                      category.id
                    }
                    className="overflow-hidden rounded-[22px] border border-[#e7e9ee] bg-white"
                  >
                    <div className="flex flex-col justify-between gap-5 border-b border-[#eceef2] p-6 md:flex-row md:items-end">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#635bff]">
                          Kategoria
                        </div>

                        <h3 className="mt-2 text-[26px] font-[710] tracking-[-0.04em]">
                          {
                            category.name
                          }
                        </h3>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                          {
                            category.description
                          }
                        </p>
                      </div>

                      <div className="flex gap-6 text-xs text-[#98a2b3]">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.06em]">
                            Kryteria
                          </div>

                          <div className="mt-1 text-base font-[680] text-[#344054]">
                            {
                              category
                                .ratingCriteria
                                .length
                            }
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase tracking-[0.06em]">
                            Oferty
                          </div>

                          <div className="mt-1 text-base font-[680] text-[#344054]">
                            {
                              category
                                ._count
                                .offers
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-[#eceef2]">
                      {category.ratingCriteria.map(
                        (
                          criterion,
                          index,
                        ) => {
                          const rawWeight =
                            Number(
                              criterion.weight,
                            );

                          const normalizedWeight =
                            totalWeight >
                            0
                              ? rawWeight /
                                totalWeight *
                                100
                              : 0;

                          return (
                            <div
                              key={
                                criterion.id
                              }
                              className="grid gap-5 p-6 md:grid-cols-[48px_minmax(0,1fr)_220px]"
                            >
                              <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#f8f8fa] text-[11px] font-bold text-[#98a2b3]">
                                {String(
                                  index +
                                    1,
                                ).padStart(
                                  2,
                                  "0",
                                )}
                              </div>

                              <div>
                                <div className="font-[680] text-[#101114]">
                                  {
                                    criterion.name
                                  }
                                </div>

                                {criterion.description ? (
                                  <p className="mt-2 max-w-2xl text-xs leading-6 text-[#667085]">
                                    {
                                      criterion.description
                                    }
                                  </p>
                                ) : null}
                              </div>

                              <div className="md:text-right">
                                <div className="flex items-center justify-between gap-3 md:justify-end">
                                  <span className="text-[10px] uppercase tracking-[0.06em] text-[#98a2b3]">
                                    udział
                                  </span>

                                  <span className="font-[680]">
                                    {formatWeight(
                                      normalizedWeight,
                                    )}
                                    %
                                  </span>
                                </div>

                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f0f1f3]">
                                  <div
                                    className="h-full rounded-full bg-[#635bff]"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        normalizedWeight,
                                      )}%`,
                                    }}
                                  />
                                </div>

                                <div className="mt-2 text-[10px] text-[#98a2b3]">
                                  waga bazowa:{" "}
                                  {formatWeight(
                                    rawWeight,
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <div className="mt-10 rounded-[22px] border border-dashed border-[#d9dde5] bg-[#fafbfc] p-10 text-center">
            <h3 className="text-xl font-[680]">
              Brak opublikowanej
              metodologii.
            </h3>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#667085]">
              Narzivo nie wyświetla
              przykładowych kryteriów.
              Ta sekcja pojawi się,
              gdy aktywna metodologia
              zostanie skonfigurowana
              w panelu administratora.
            </p>
          </div>
        )}
      </section>

      {/* ADVISOR */}

      <section className="border-y border-[#eceef2] bg-[#fafbfc]">
        <div className="container page-section">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div className="max-w-lg">
              <span className="eyebrow">
                Doradca Narzivo
              </span>

              <h2 className="h2 mt-3">
                Ocena produktu
                i dopasowanie to
                dwie różne rzeczy.
              </h2>

              <p className="mt-5 text-sm leading-7 text-[#667085]">
                Ocena Narzivo opisuje
                produkt według
                metodologii kategorii.
                Doradca dodatkowo
                analizuje kontekst
                konkretnego wyboru.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-[18px] border border-[#e7e9ee] bg-white p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#635bff]">
                  Jakość
                </div>

                <h3 className="mt-3 font-[680]">
                  Ocena Narzivo
                </h3>

                <p className="mt-2 text-xs leading-6 text-[#667085]">
                  Jeżeli produkt ma
                  kompletny wynik,
                  Doradca może
                  uwzględnić jego
                  ocenę.
                </p>
              </article>

              <article className="rounded-[18px] border border-[#e7e9ee] bg-white p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#635bff]">
                  Cena
                </div>

                <h3 className="mt-3 font-[680]">
                  Relacja do innych ofert
                </h3>

                <p className="mt-2 text-xs leading-6 text-[#667085]">
                  Cena jest analizowana
                  wyłącznie między
                  porównywalnymi
                  ofertami w tej samej
                  walucie.
                </p>
              </article>

              <article className="rounded-[18px] border border-[#e7e9ee] bg-white p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#635bff]">
                  Aktualność
                </div>

                <h3 className="mt-3 font-[680]">
                  Data weryfikacji
                </h3>

                <p className="mt-2 text-xs leading-6 text-[#667085]">
                  Nowsze dane mogą być
                  preferowane zależnie
                  od wybranego
                  priorytetu.
                </p>
              </article>

              <article className="rounded-[18px] border border-[#e7e9ee] bg-white p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#635bff]">
                  Dopasowanie
                </div>

                <h3 className="mt-3 font-[680]">
                  Potrzeba użytkownika
                </h3>

                <p className="mt-2 text-xs leading-6 text-[#667085]">
                  Doradca porównuje
                  opis potrzeby z
                  zastosowaniami
                  i danymi oferty.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* AFFILIATE SEPARATION */}

      <section className="container page-section">
        <div className="overflow-hidden rounded-[24px] border border-[#dedcff] bg-[#fafaff]">
          <div className="grid lg:grid-cols-[1fr_.8fr]">
            <div className="p-7 md:p-10">
              <span className="eyebrow">
                Niezależność
              </span>

              <h2 className="mt-4 text-[clamp(2rem,5vw,3.4rem)] font-[710] leading-[1] tracking-[-0.05em]">
                Prowizja nie jest
                zmienną w algorytmie.
              </h2>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#667085]">
                Link afiliacyjny może
                być sposobem
                monetyzacji Narzivo,
                ale jego obecność nie
                zmienia oceny
                redakcyjnej ani nie
                podnosi wyniku
                Doradcy.
              </p>
            </div>

            <div className="border-t border-[#e3e0ff] bg-white p-7 lg:border-l lg:border-t-0 md:p-10">
              <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#98a2b3]">
                Czytaj dalej
              </div>

              <p className="mt-4 text-sm leading-7 text-[#667085]">
                Osobno opisujemy,
                kiedy Narzivo może
                otrzymać prowizję
                i jak oznaczamy
                takie linki.
              </p>

              <Link
                href="/jak-zarabiamy"
                className="btn btn-secondary mt-6"
              >
                Jak zarabiamy
                <span>
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* DARK CTA */}

      <section className="bg-[#101114] text-white">
        <div className="container py-16 md:py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a9a5ff]">
                Sprawdź w praktyce
              </div>

              <h2 className="mt-4 text-[clamp(2rem,5vw,3.8rem)] font-[710] leading-[1] tracking-[-0.05em]">
                Metodologia ma pomagać
                podjąć decyzję,
                a nie ją ukrywać.
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dobierz"
                className="btn bg-white text-[#101114] hover:bg-[#f3f4f6]"
              >
                Uruchom Doradcę
                <span>
                  →
                </span>
              </Link>

              <Link
                href="/porownaj"
                className="btn border border-[#393b42] bg-[#1a1b1f] text-white hover:bg-[#222328]"
              >
                Porównaj oferty
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}