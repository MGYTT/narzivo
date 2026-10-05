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

  return (
    <main>
      <section className="border-b border-[#eceef2] bg-white">
        <div className="container py-14 md:py-20">
          <div className="max-w-3xl">
            <span className="eyebrow">
              Kategoria
            </span>

            <h1 className="mt-4 text-[clamp(2.8rem,6vw,5rem)] font-[730] leading-[0.98] tracking-[-0.06em]">
              {
                category.name
              }
            </h1>

            <p className="mt-6 max-w-2xl text-[17px] leading-8 text-[#667085]">
              {
                category.description
              }
            </p>
          </div>
        </div>
      </section>

      <section className="container page-section">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">
              Zweryfikowane oferty
            </span>

            <h2 className="h2 mt-3">
              Porównaj dostępne
              rozwiązania
            </h2>
          </div>

          <div className="text-xs text-[#98a2b3]">
            {
              offers.length
            }{" "}
            aktywnych ofert
          </div>
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
          <div className="mt-9 rounded-[20px] border border-dashed border-[#d9dde5] bg-[#fafbfc] p-10 text-center">
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
    </main>
  );
}