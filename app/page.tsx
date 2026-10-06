import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  prisma,
} from "@/lib/prisma";

import {
  activeOfferWindowWhere,
  publicOfferWhere,
} from "@/lib/offer-validity";

import {
  OfferCard,
} from "@/components/OfferCard";

export const revalidate =
  900;

export const metadata:
  Metadata = {
  title:
    "Porównywarka usług cyfrowych",

  description:
    "Porównuj hosting, VPS, domeny, chmurę i inne usługi cyfrowe na podstawie zweryfikowanych danych, cen i transparentnej metodologii Narzivo.",

  alternates: {
    canonical:
      "/",
  },

  openGraph: {
    title:
      "Narzivo — porównywarka usług cyfrowych",

    description:
      "Zweryfikowane dane, transparentne oceny i porównanie usług cyfrowych.",

    url:
      "/",

    siteName:
      "Narzivo",

    locale:
      "pl_PL",

    type:
      "website",
  },
};

export default async function HomePage() {
  const now =
    new Date();

  const [
    categories,
    offers,
    offerCount,
    providerRows,
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

        take:
          12,
      }),

      prisma.offer.findMany({
        where:
          publicOfferWhere(
            now,
          ),

        include: {
          provider:
            true,

          category:
            true,
        },

        orderBy: [
          {
            isFeatured:
              "desc",
          },

          {
            editorScore:
              "desc",
          },

          {
            lastVerifiedAt:
              "desc",
          },
        ],

        take:
          6,
      }),

      prisma.offer.count({
        where:
          publicOfferWhere(
            now,
          ),
      }),

      prisma.offer.findMany({
        where:
          publicOfferWhere(
            now,
          ),

        select: {
          providerId:
            true,
        },

        distinct: [
          "providerId",
        ],
      }),
    ]);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[#eceef2] bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[12%] top-[-280px] h-[620px] w-[620px] rounded-full bg-[#eeecff] blur-[120px]" />

          <div className="absolute right-[-160px] top-[100px] h-[420px] w-[420px] rounded-full bg-[#f5f4ff] blur-[110px]" />

          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,24,40,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(16,24,40,0.018)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        </div>

        <div className="container relative py-16 md:py-24 lg:py-28">
          <div className="grid gap-14 lg:grid-cols-[1.18fr_.82fr] lg:items-center">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dedcff] bg-white/80 px-3 py-1.5 text-[11px] font-[650] text-[#5048d8] shadow-[0_1px_2px_rgba(16,24,40,0.03)] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />

                Zweryfikowane dane
                i jawne zasady
              </div>

              <h1 className="mt-7 max-w-[850px] text-[clamp(3.4rem,8vw,7rem)] font-[760] leading-[0.88] tracking-[-0.075em] text-[#101114]">
                Wybieraj na
                podstawie danych.
                <span className="text-[#635bff]">
                  {" "}
                  Nie reklamy.
                </span>
              </h1>

              <p className="mt-8 max-w-2xl text-[17px] leading-8 text-[#667085] md:text-[19px]">
                Narzivo porównuje
                ceny, parametry,
                jakość i aktualność
                usług cyfrowych.
                Każda ocena wynika
                z jawnej metodologii.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dobierz"
                  className="btn btn-primary min-w-[170px]"
                >
                  Dobierz usługę
                  <span>
                    →
                  </span>
                </Link>

                <Link
                  href="/porownaj"
                  className="btn btn-secondary min-w-[160px]"
                >
                  Porównaj oferty
                </Link>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-[11px] text-[#667085]">
                <span className="inline-flex items-center gap-2">
                  <span className="text-[#12b76a]">
                    ✓
                  </span>

                  Oficjalne źródła
                </span>

                <span className="inline-flex items-center gap-2">
                  <span className="text-[#12b76a]">
                    ✓
                  </span>

                  Data weryfikacji
                </span>

                <span className="inline-flex items-center gap-2">
                  <span className="text-[#12b76a]">
                    ✓
                  </span>

                  Afiliacja bez wpływu
                  na ranking
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-[#f0eeff] blur-[70px]" />

              <div className="relative overflow-hidden rounded-[24px] border border-[#e4e2ef] bg-white shadow-[0_30px_90px_rgba(16,24,40,0.10)]">
                <div className="border-b border-[#eceef2] px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                        Narzivo
                      </div>

                      <div className="mt-1 text-[17px] font-[700] tracking-[-0.025em]">
                        Lepsza decyzja
                        zakupowa
                      </div>
                    </div>

                    <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#101114] text-sm font-[800] text-white">
                      N
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#f2f1ff] text-[12px] font-bold text-[#635bff]">
                        01
                      </div>

                      <div>
                        <div className="text-sm font-[680]">
                          Zbieramy fakty
                        </div>

                        <p className="mt-1 text-[12px] leading-5 text-[#667085]">
                          Cena, parametry,
                          warunki i źródło.
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-[#f0f1f3]" />

                    <div className="flex gap-4">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#f2f1ff] text-[12px] font-bold text-[#635bff]">
                        02
                      </div>

                      <div>
                        <div className="text-sm font-[680]">
                          Liczymy ocenę
                        </div>

                        <p className="mt-1 text-[12px] leading-5 text-[#667085]">
                          Różne kategorie
                          mają własne
                          kryteria i wagi.
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-[#f0f1f3]" />

                    <div className="flex gap-4">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#ecfdf3] text-[12px] font-bold text-[#12b76a]">
                        ✓
                      </div>

                      <div>
                        <div className="text-sm font-[680]">
                          Ty podejmujesz
                          decyzję
                        </div>

                        <p className="mt-1 text-[12px] leading-5 text-[#667085]">
                          Bez płatnego
                          miejsca w
                          rankingu.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-3 overflow-hidden rounded-[14px] border border-[#eceef2] bg-[#fafbfc]">
                    <div className="p-4 text-center">
                      <div className="text-[22px] font-[740] tracking-[-0.04em]">
                        {
                          offerCount
                        }
                      </div>

                      <div className="mt-1 text-[9px] uppercase tracking-[0.06em] text-[#98a2b3]">
                        Ofert
                      </div>
                    </div>

                    <div className="border-x border-[#eceef2] p-4 text-center">
                      <div className="text-[22px] font-[740] tracking-[-0.04em]">
                        {
                          categories.length
                        }
                      </div>

                      <div className="mt-1 text-[9px] uppercase tracking-[0.06em] text-[#98a2b3]">
                        Kategorii
                      </div>
                    </div>

                    <div className="p-4 text-center">
                      <div className="text-[22px] font-[740] tracking-[-0.04em]">
                        {
                          providerRows.length
                        }
                      </div>

                      <div className="mt-1 text-[9px] uppercase tracking-[0.06em] text-[#98a2b3]">
                        Dostawców
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4 text-[10px] leading-5 text-[#98a2b3]">
                  Obecność programu
                  partnerskiego nie
                  wpływa na ocenę ani
                  pozycję oferty.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container page-section">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="eyebrow">
              Kategorie
            </span>

            <h2 className="h2 mt-3">
              Co chcesz
              porównać?
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#667085]">
              Wybierz rodzaj usługi.
              Każda kategoria ma
              własne kryteria i
              metodologię oceny.
            </p>
          </div>

          <Link
            href="/dobierz"
            className="text-sm font-semibold text-[#5048d8] transition hover:text-[#3029b8]"
          >
            Nie wiesz co wybrać?
            Uruchom Doradcę →
          </Link>
        </div>

        {categories.length >
        0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(
              (
                category,
              ) => (
                <Link
                  key={
                    category.id
                  }
                  href={`/kategorie/${category.slug}`}
                  className="group relative min-h-[225px] overflow-hidden rounded-[22px] border border-[#e7e9ee] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition duration-200 hover:-translate-y-1 hover:border-[#d8d4ff] hover:shadow-[0_16px_45px_rgba(16,24,40,0.07)]"
                >
                  <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[#f5f4ff] transition duration-300 group-hover:scale-125 group-hover:bg-[#efedff]" />

                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-5">
                      <div className="grid h-11 w-11 place-items-center rounded-[13px] border border-[#e2e0ff] bg-[#f5f4ff] text-xl">
                        {category.icon ??
                          "↗"}
                      </div>

                      <span className="text-lg text-[#b1b5be] transition group-hover:translate-x-1 group-hover:text-[#635bff]">
                        →
                      </span>
                    </div>

                    <h3 className="mt-7 text-[20px] font-[710] tracking-[-0.03em] text-[#101114] transition group-hover:text-[#5048d8]">
                      {
                        category.name
                      }
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#667085]">
                      {
                        category.description
                      }
                    </p>

                    <div className="mt-auto pt-6 text-[11px] font-medium text-[#98a2b3]">
                      {
                        category
                          ._count
                          .offers
                      }{" "}
                      {category._count.offers ===
                      1
                        ? "aktywna oferta"
                        : "aktywnych ofert"}
                    </div>
                  </div>
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className="mt-10 rounded-[22px] border border-dashed border-[#d9dde5] bg-[#fafbfc] p-10 text-center">
            Kategorie są
            przygotowywane.
          </div>
        )}
      </section>

      <section className="border-y border-[#eceef2] bg-[#fafbfc]">
        <div className="container page-section">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <span className="eyebrow">
                Ranking
              </span>

              <h2 className="h2 mt-3">
                Najwyżej ocenione
                oferty.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-[#667085]">
                Ocena wynika z danych
                i kryteriów właściwych
                dla danej kategorii.
              </p>
            </div>

            <Link
              href="/porownaj"
              className="text-sm font-semibold text-[#5048d8]"
            >
              Otwórz porównywarkę →
            </Link>
          </div>

          {offers.length >
          0 ? (
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {offers.map(
                (
                  offer,
                ) => (
                  <OfferCard
                    key={
                      offer.id
                    }
                    offer={
                      offer
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <div className="mt-10 rounded-[22px] border border-dashed border-[#d9dde5] bg-white p-10 text-center">
              Brak opublikowanych
              ofert.
            </div>
          )}
        </div>
      </section>

      <section className="container page-section">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <span className="eyebrow">
              Jak działa Narzivo
            </span>

            <h2 className="h2 mt-3">
              Mniej marketingu.
              Więcej konkretów.
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-[#667085]">
              Nie tworzymy jednego
              uniwersalnego rankingu
              dla wszystkiego.
              Każda kategoria jest
              oceniana według
              parametrów istotnych
              właśnie dla niej.
            </p>

            <Link
              href="/metodologia"
              className="mt-6 inline-flex text-sm font-semibold text-[#5048d8]"
            >
              Zobacz metodologię →
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[20px] border border-[#e7e9ee] bg-white p-6">
              <div className="text-[11px] font-bold text-[#635bff]">
                01
              </div>

              <h3 className="mt-5 text-lg font-[690]">
                Dane
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#667085]">
                Korzystamy z
                oficjalnych źródeł
                i zapisujemy datę
                weryfikacji.
              </p>
            </article>

            <article className="rounded-[20px] border border-[#e7e9ee] bg-white p-6">
              <div className="text-[11px] font-bold text-[#635bff]">
                02
              </div>

              <h3 className="mt-5 text-lg font-[690]">
                Ocena
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#667085]">
                Kryteria mają jawne
                wagi, a wynik jest
                liczony według
                metodologii.
              </p>
            </article>

            <article className="rounded-[20px] border border-[#e7e9ee] bg-white p-6">
              <div className="text-[11px] font-bold text-[#635bff]">
                03
              </div>

              <h3 className="mt-5 text-lg font-[690]">
                Decyzja
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#667085]">
                Porównujesz koszt,
                możliwości i
                ograniczenia przed
                przejściem do
                dostawcy.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-[#eceef2] bg-[#101114] text-white">
        <div className="container py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#a9a5ff]">
                Transparentność
              </div>

              <h2 className="mt-4 text-[clamp(2.2rem,5vw,3.8rem)] font-[720] leading-[0.98] tracking-[-0.055em]">
                Prowizja nie kupuje
                miejsca w rankingu.
              </h2>

              <p className="mt-5 text-sm leading-7 text-[#aeb4c0]">
                Narzivo może
                otrzymywać prowizję
                z części linków.
                Nie wpływa ona na
                ocenę produktu,
                metodologię ani
                kolejność ofert.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <Link
                href="/metodologia"
                className="btn bg-white text-[#101114] hover:bg-[#f3f4f6]"
              >
                Zobacz metodologię
                <span>
                  →
                </span>
              </Link>

              <Link
                href="/jak-zarabiamy"
                className="text-sm font-semibold text-[#cbc9ff]"
              >
                Jak zarabia Narzivo →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}