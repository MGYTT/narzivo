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
  bulkImportOffers,
} from "./actions";

export const dynamic =
  "force-dynamic";

type SearchParams =
  Promise<{
    created?: string;
    skipped?: string;
    failed?: string;
  }>;

export default async function BulkImportPage({
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
      where: {
        isPublished:
          true,
      },

      orderBy: {
        sortOrder:
          "asc",
      },
    });

  const hosting =
    categories.find(
      (
        item,
      ) =>
        item.slug ===
        "hosting-www",
    );

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AdminNav />

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="eyebrow">
                  Automatyzacja
                </span>

                <h1 className="mt-3 text-[34px] font-[720] tracking-[-0.045em]">
                  Import masowy
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
                  Jeden URL może
                  utworzyć wiele
                  niezależnych szkiców
                  ofert.
                </p>
              </div>

              <Link
                href="/admin/oferty/import"
                className="btn btn-secondary"
              >
                Import pojedynczy
              </Link>
            </div>

            {query.created !==
            undefined ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087443]">
                Utworzono:{" "}
                <strong>
                  {
                    query.created
                  }
                </strong>
                . Pominięto duplikaty:{" "}
                <strong>
                  {
                    query.skipped
                  }
                </strong>
                . Błędy:{" "}
                <strong>
                  {
                    query.failed
                  }
                </strong>
                .
              </div>
            ) : null}

            <form
              action={
                bulkImportOffers
              }
              className="card mt-7 overflow-hidden"
            >
              <div className="border-b border-[#eceef2] px-6 py-5">
                <h2 className="text-lg font-[680]">
                  Wiele pakietów z
                  jednej strony
                </h2>
              </div>

              <div className="grid gap-5 p-6">
                <label>
                  <span className="label">
                    Oficjalny URL *
                  </span>

                  <input
                    name="sourceUrl"
                    type="url"
                    required
                    className="field"
                    placeholder="https://..."
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

                <label>
                  <span className="label">
                    Pakiety — jeden na
                    linię *
                  </span>

                  <textarea
                    name="variants"
                    required
                    className="field min-h-64 resize-y"
                    placeholder={`Hosting Orange
Hosting Kiwi
Hosting Mango
Hosting Apple`}
                  />

                  <span className="mt-2 block text-[11px] leading-5 text-[#98a2b3]">
                    Maksymalnie 12
                    wariantów w jednym
                    imporcie. Istniejące
                    oferty zostaną
                    automatycznie
                    pominięte.
                  </span>
                </label>
              </div>

              <div className="flex justify-end border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Importuj pakiety
                  <span>
                    →
                  </span>
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}