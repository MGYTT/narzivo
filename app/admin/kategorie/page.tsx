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
  deleteCategory,
  saveCategory,
} from "../actions";

export const dynamic =
  "force-dynamic";

export default async function CategoriesAdmin({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  await requireAdmin();

  const query =
    await searchParams;

  const [
    rows,
    editing,
  ] =
    await Promise.all([
      prisma.category.findMany({
        include: {
          _count: {
            select: {
              offers: true,
            },
          },
        },

        orderBy: {
          sortOrder:
            "asc",
        },
      }),

      query.edit
        ? prisma.category.findUnique({
            where: {
              id:
                query.edit,
            },
          })
        : null,
    ]);

  return (
    <main className="bg-[#fafbfc]">
      <div className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AdminNav />

          <section>
            <div className="flex items-end justify-between">
              <div>
                <span className="eyebrow">
                  Struktura
                </span>

                <h1 className="mt-3 text-[32px] font-[720] tracking-[-0.04em]">
                  Kategorie
                </h1>

                <p className="mt-2 text-sm text-[#667085]">
                  Zarządzaj
                  głównymi działami
                  porównywarki.
                </p>
              </div>
            </div>

            {query.saved ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087443]">
                Zmiany zapisane.
              </div>
            ) : null}

            {query.deleted ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087443]">
                Kategoria
                usunięta.
              </div>
            ) : null}

            {query.error ===
            "used" ? (
              <div className="mt-6 rounded-[12px] border border-[#fecdca] bg-[#fff6f5] px-4 py-3 text-sm text-[#b42318]">
                Nie można
                usunąć kategorii,
                która posiada
                oferty.
              </div>
            ) : null}

            <form
              action={
                saveCategory
              }
              className="card mt-7 p-6"
            >
              <input
                type="hidden"
                name="id"
                value={
                  editing?.id ??
                  ""
                }
              />

              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-[680]">
                  {editing
                    ? "Edytuj kategorię"
                    : "Nowa kategoria"}
                </h2>

                {editing ? (
                  <Link
                    href="/admin/kategorie"
                    className="text-sm font-medium text-[#667085]"
                  >
                    Anuluj
                  </Link>
                ) : null}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <span className="label">
                    Nazwa
                  </span>

                  <input
                    name="name"
                    className="field"
                    required
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
                    required
                    pattern="[a-z0-9-]+"
                    defaultValue={
                      editing?.slug ??
                      ""
                    }
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="label">
                    Opis
                  </span>

                  <textarea
                    name="description"
                    className="field min-h-28"
                    required
                    defaultValue={
                      editing?.description ??
                      ""
                    }
                  />
                </label>

                <label>
                  <span className="label">
                    Ikona / znak
                  </span>

                  <input
                    name="icon"
                    className="field"
                    defaultValue={
                      editing?.icon ??
                      ""
                    }
                  />
                </label>

                <label>
                  <span className="label">
                    Kolejność
                  </span>

                  <input
                    name="sortOrder"
                    type="number"
                    className="field"
                    defaultValue={
                      editing?.sortOrder ??
                      0
                    }
                  />
                </label>

                <label className="flex items-center gap-3 rounded-[12px] border border-[#e7e9ee] px-4 py-3">
                  <input
                    type="checkbox"
                    name="isPublished"
                    defaultChecked={
                      editing
                        ? editing.isPublished
                        : true
                    }
                  />

                  <span className="text-sm font-medium">
                    Opublikowana
                  </span>
                </label>

                <button className="btn btn-primary md:col-span-2">
                  {editing
                    ? "Zapisz zmiany"
                    : "Dodaj kategorię"}
                </button>
              </div>
            </form>

            <div className="table-wrap mt-7">
              <table>
                <thead>
                  <tr>
                    <th>Nazwa</th>
                    <th>Slug</th>
                    <th>
                      Oferty
                    </th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {rows.map(
                    (category) => (
                      <tr
                        key={
                          category.id
                        }
                      >
                        <td>
                          <strong className="font-semibold text-[#101114]">
                            {
                              category.name
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            category.slug
                          }
                        </td>

                        <td>
                          {
                            category
                              ._count
                              .offers
                          }
                        </td>

                        <td>
                          {category.isPublished
                            ? "Opublikowana"
                            : "Ukryta"}
                        </td>

                        <td>
                          <div className="flex items-center gap-4">
                            <Link
                              href={`/admin/kategorie?edit=${category.id}`}
                              className="font-semibold text-[#5048d8]"
                            >
                              Edytuj
                            </Link>

                            {category
                              ._count
                              .offers ===
                            0 ? (
                              <form
                                action={
                                  deleteCategory
                                }
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={
                                    category.id
                                  }
                                />

                                <button className="text-sm font-semibold text-[#b42318]">
                                  Usuń
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}