import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  publicOfferWhere,
} from "@/lib/offer-validity";

import {
  polishDate,
} from "@/lib/format";

import {
  OfferCard,
} from "@/components/OfferCard";

export const revalidate =
  900;

export default async function CategoryPage({
  params,
}: {
  params:
    Promise<{
      slug: string;
    }>;
}) {
  const {
    slug,
  } =
    await params;

  const now =
    new Date();

  const category =
    await prisma.category.findUnique({
      where: {
        slug,
      },

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
    });

  if (
    !category ||
    !category.isPublished
  ) {
    notFound();
  }

  const offers =
    await prisma.offer.findMany({
      where: {
        categoryId:
          category.id,

        ...publicOfferWhere(
          now,
        ),
      },

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
          priceAmount:
            "asc",
        },

        {
          name:
            "asc",
        },
      ],
    });

  const providers =
    new Set(
      offers.map(
        (
          offer,
        ) =>
          offer.providerId,
      ),
    );

  const scores =
    offers
      .map(
        (
          offer,
        ) =>
          offer.editorScore ===
            null
            ? null
            : Number(
                offer.editorScore,
              ),
      )
      .filter(
        (
          score,
        ): score is number =>
          score !==
          null &&
          Number.isFinite(
            score,
          ),
      );

  const topScore =
    scores.length >
    0
      ? Math.max(
          ...scores,
        )
      : null;

  const newestVerification =
    offers.length >
    0
      ? new Date(
          Math.max(
            ...offers.map(
              (
                offer,
              ) =>
                offer.lastVerifiedAt.getTime(),
            ),
          ),
        )
      : null;

  const totalWeight =
    category.ratingCriteria.reduce(
      (
        sum,
        criterion,
      ) =>
        sum +
        Number(
          criterion.weight,
        ),
      0,
    );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[#eceef2] bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-340px] h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-[#f0eeff] blur-[120px]" />

          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,24,40,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(16,24,40,0.018)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        </div>

        <div className="container relative py-12 md:py-20">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#98a2b3]">
            <Link
              href="/"
              className="transition hover:text-[#5048d8]"
            >
              Narzivo
            </Link>

            <span>
              /
            </span>

            <span>
              Kategorie
            </span>

            <span>
              /
            </span>

            <span className="font-semibold text-[#475467]">
              {
                category.name
              }
            </span>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                {category.icon ? (
                  <span className="grid h-11 w-11 place-items-center rounded-[13px] border border-[#dedcff] bg-[#f5f4ff] text-xl">
                    {
                      category.icon
                    }
                  </span>
                ) : null}

                <span className="eyebrow">
                  Ranking kategorii
                </span>
              </div>

              <h1 className="mt-5 text-[clamp(3rem,7vw,5.6rem)] font-[750] leading-[0.94] tracking-[-0.065em] text-[#101114]">
                {
                  category.name
                }
              </h1>

              <p className="mt-6 max-w-2xl text-[16px] leading-8 text-[#667085] md:text-[18px]">
                {
                  category.description
                }
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/porownaj"
                  className="btn btn-primary"
                >
                  Porównaj oferty
                  <span>
                    →
                  </span>
                </Link>

                <Link
                  href="/dobierz"
                  className="btn btn-secondary"
                >
                  Pomóż mi wybrać
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 overflow-hidden rounded-[20px] border border-[#e7e9ee] bg-white shadow-[0_18px_55px_rgba(16,24,40,0.06)]">
              <div className="border-b border-r border-[#eceef2] p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Oferty
                </div>

                <div className="mt-2 text-[28px] font-[750] tracking-[-0.04em]">
                  {
                    offers.length
                  }
                </div>
              </div>

              <div className="border-b border-[#eceef2] p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Dostawcy
                </div>

                <div className="mt-2 text-[28px] font-[750] tracking-[-0.04em]">
                  {
                    providers.size
                  }
                </div>
              </div>

              <div className="border-r border-[#eceef2] p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Najwyższa ocena
                </div>

                <div className="mt-2 text-[28px] font-[750] tracking-[-0.04em] text-[#5048d8]">
                  {topScore !==
                  null
                    ? `${topScore.toFixed(
                        1,
                      )}/10`
                    : "—"}
                </div>
              </div>

              <div className="p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Kryteria
                </div>

                <div className="mt-2 text-[28px] font-[750] tracking-[-0.04em]">
                  {
                    category
                      .ratingCriteria
                      .length
                  }
                </div>

                <div className="mt-1 text-[10px] text-[#98a2b3]">
                  waga{" "}
                  {
                    totalWeight
                  }
                </div>
              </div>
            </div>
          </div>

          {newestVerification ? (
            <div className="mt-9 flex items-center gap-2 text-[11px] text-[#98a2b3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />

              <span>
                Najnowsza weryfikacja
                danych:{" "}
                {polishDate(
                  newestVerification,
                )}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {category.ratingCriteria.length >
      0 ? (
        <section className="border-b border-[#eceef2] bg-[#fafbfc]">
          <div className="container py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[11px] font-[700] uppercase tracking-[0.08em] text-[#98a2b3]">
                  Jak oceniamy tę kategorię
                </div>

                <p className="mt-1 text-[12px] text-[#667085]">
                  Wynik końcowy jest
                  średnią ważoną
                  aktywnych kryteriów.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {category.ratingCriteria.map(
                  (
                    criterion,
                  ) => (
                    <span
                      key={
                        criterion.id
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-[#e3e1ff] bg-white px-3 py-1.5 text-[11px] text-[#475467]"
                    >
                      <span>
                        {
                          criterion.name
                        }
                      </span>

                      <strong className="text-[#5048d8]">
                        {Number(
                          criterion.weight,
                        )}
                        %
                      </strong>
                    </span>
                  ),
                )}

                <Link
                  href="/metodologia"
                  className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#5048d8] transition hover:bg-[#f2f1ff]"
                >
                  Metodologia →
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="container page-section">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="eyebrow">
              Ranking Narzivo
            </span>

            <h2 className="h2 mt-3">
              Najlepiej ocenione
              rozwiązania.
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#667085]">
              Kolejność wynika z
              oceny redakcyjnej.
              Prowizja afiliacyjna
              nie jest składnikiem
              rankingu.
            </p>
          </div>

          <div className="rounded-full border border-[#e7e9ee] bg-[#fafbfc] px-4 py-2 text-[11px] font-medium text-[#667085]">
            {
              offers.length
            }{" "}
            {offers.length ===
            1
              ? "aktywna oferta"
              : "aktywnych ofert"}
          </div>
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
          <div className="mt-10 rounded-[22px] border border-dashed border-[#d9dde5] bg-[#fafbfc] p-10 text-center">
            <h2 className="text-xl font-[680]">
              Brak aktywnych ofert
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#667085]">
              Nie pokazujemy ofert
              przed rozpoczęciem
              ważności ani po jej
              zakończeniu.
            </p>
          </div>
        )}
      </section>

      <section className="border-t border-[#eceef2] bg-[#101114] text-white">
        <div className="container py-12 md:py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#aaa6ff]">
                Nie wiesz, którą
                ofertę wybrać?
              </div>

              <h2 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-[720] leading-[1] tracking-[-0.05em]">
                Porównaj parametry,
                nie tylko cenę.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-[#aeb4c0]">
                Doradca Narzivo może
                pomóc zawęzić wybór
                na podstawie budżetu,
                jakości i aktualności
                danych.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/porownaj"
                className="btn bg-white text-[#101114] hover:bg-[#f3f4f6]"
              >
                Porównaj
              </Link>

              <Link
                href="/dobierz"
                className="btn border border-[#34353a] bg-[#1a1b1e] text-white hover:bg-[#242529]"
              >
                Uruchom Doradcę
                <span>
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}