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
    ]);

  return (
    <main>
      {/* HERO */}

      <section className="relative overflow-hidden border-b border-[#eceef2] bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-260px] h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[#f3f1ff] blur-[100px]" />
        </div>

        <div className="container relative py-20 md:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <span className="eyebrow">
              Porównywarka usług
              cyfrowych
            </span>

            <h1 className="mt-6 text-[clamp(3rem,8vw,6.5rem)] font-[740] leading-[0.92] tracking-[-0.07em] text-[#101114]">
              Wybieraj usługi
              na podstawie danych,
              nie reklamy.
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-[17px] leading-8 text-[#667085] md:text-[19px]">
              Narzivo porównuje ceny,
              parametry, aktualność
              informacji i oceny
              redakcyjne według
              transparentnej
              metodologii.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dobierz"
                className="btn btn-primary"
              >
                Dobierz usługę
                <span>
                  →
                </span>
              </Link>

              <Link
                href="/porownaj"
                className="btn btn-secondary"
              >
                Porównaj oferty
              </Link>
            </div>

            <p className="mx-auto mt-5 max-w-xl text-[11px] leading-5 text-[#98a2b3]">
              Obecność programu
              partnerskiego nie jest
              składnikiem oceny ani
              rankingu Narzivo.
            </p>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}

      <section className="container page-section">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="eyebrow">
              Kategorie
            </span>

            <h2 className="h2 mt-3">
              Zacznij od rodzaju
              usługi.
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#667085]">
              Każdy segment może
              posiadać własną
              metodologię, kryteria
              i wagi oceny.
            </p>
          </div>

          <Link
            href="/dobierz"
            className="text-sm font-semibold text-[#5048d8]"
          >
            Nie wiesz co wybrać?
            Uruchom Doradcę →
          </Link>
        </div>

        {categories.length >
        0 ? (
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(
              (category) => (
                <Link
                  key={
                    category.id
                  }
                  href={`/kategorie/${category.slug}`}
                  className="group rounded-[18px] border border-[#e7e9ee] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#d8d4ff] hover:shadow-[0_12px_32px_rgba(16,24,40,0.06)]"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h3 className="text-[19px] font-[690] tracking-[-0.025em] text-[#101114] transition group-hover:text-[#5048d8]">
                        {
                          category.name
                        }
                      </h3>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#667085]">
                        {
                          category.description
                        }
                      </p>
                    </div>

                    <span className="text-lg text-[#b1b5be] transition group-hover:translate-x-1 group-hover:text-[#635bff]">
                      →
                    </span>
                  </div>

                  <div className="mt-6 border-t border-[#f0f1f3] pt-4 text-[11px] text-[#98a2b3]">
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
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className="mt-9 rounded-[18px] border border-dashed border-[#d9dde5] bg-[#fafbfc] p-10 text-center">
            <h3 className="font-[680]">
              Kategorie są
              przygotowywane.
            </h3>
          </div>
        )}
      </section>

      {/* OFFERS */}

      <section className="border-y border-[#eceef2] bg-[#fafbfc]">
        <div className="container page-section">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <span className="eyebrow">
                Aktualne oferty
              </span>

              <h2 className="h2 mt-3">
                Zweryfikowane
                propozycje Narzivo.
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#667085]">
                Pokazujemy wyłącznie
                oferty aktualnie
                dostępne, od
                opublikowanych
                dostawców i kategorii.
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
            <div className="grid-auto mt-9">
              {offers.map(
                (offer) => (
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
            <div className="mt-9 rounded-[20px] border border-dashed border-[#d9dde5] bg-white p-10 text-center">
              <h3 className="text-lg font-[680]">
                Katalog jest
                przygotowywany.
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#667085]">
                Nie publikujemy
                fikcyjnych ofert.
                Zweryfikowane produkty
                pojawią się tutaj po
                dodaniu rzeczywistych
                danych.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}

      <section className="container page-section">
        <div className="max-w-2xl">
          <span className="eyebrow">
            Jak działa Narzivo
          </span>

          <h2 className="h2 mt-3">
            Jeden proces.
            Jawne zasady.
          </h2>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          <article className="card p-6">
            <div className="text-[11px] font-bold text-[#635bff]">
              01
            </div>

            <h3 className="mt-5 text-lg font-[680]">
              Zbieramy dane
            </h3>

            <p className="mt-3 text-sm leading-6 text-[#667085]">
              Ceny, parametry
              i warunki zapisujemy
              ze wskazaniem
              oficjalnego źródła
              oraz daty
              weryfikacji.
            </p>
          </article>

          <article className="card p-6">
            <div className="text-[11px] font-bold text-[#635bff]">
              02
            </div>

            <h3 className="mt-5 text-lg font-[680]">
              Oceniamy
            </h3>

            <p className="mt-3 text-sm leading-6 text-[#667085]">
              Każda kategoria może
              mieć inne kryteria.
              Końcowy wynik jest
              średnią ważoną
              aktywnych ocen.
            </p>
          </article>

          <article className="card p-6">
            <div className="text-[11px] font-bold text-[#635bff]">
              03
            </div>

            <h3 className="mt-5 text-lg font-[680]">
              Ty porównujesz
            </h3>

            <p className="mt-3 text-sm leading-6 text-[#667085]">
              Doradca i
              Porównywarka pomagają
              zestawić produkty
              według Twojego
              zastosowania.
            </p>
          </article>
        </div>
      </section>

      {/* TRANSPARENCY */}

      <section className="border-t border-[#eceef2] bg-[#101114] text-white">
        <div className="container py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#a9a5ff]">
                Transparentność
              </div>

              <h2 className="mt-4 text-[clamp(2rem,5vw,3.6rem)] font-[710] leading-[1] tracking-[-0.05em]">
                Prowizja nie kupuje
                miejsca w rankingu.
              </h2>

              <p className="mt-5 text-sm leading-7 text-[#aeb4c0]">
                Narzivo może
                otrzymywać prowizję
                z części linków.
                System ocen,
                metodologia i
                Doradca działają
                niezależnie od
                wysokości prowizji.
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