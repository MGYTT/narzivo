import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { AdminNav } from "@/components/AdminNav";

import {
  ConfirmSubmitButton,
} from "@/components/ConfirmSubmitButton";

import {
  deleteProvider,
  removeProviderLogo,
  saveProvider,
  uploadProviderLogo,
} from "../actions";

export const dynamic =
  "force-dynamic";

type SearchParams =
  Promise<{
    edit?: string;
    saved?: string;
    deleted?: string;
    error?: string;
    logo?: string;
    logoRemoved?: string;
    logoError?: string;
  }>;

function ProviderLogo({
  name,
  logoUrl,
  size = "normal",
}: {
  name: string;
  logoUrl:
    | string
    | null;
  size?:
    | "normal"
    | "large";
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) =>
        part.charAt(0),
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const sizing =
    size === "large"
      ? "h-24 w-24 rounded-[20px]"
      : "h-11 w-11 rounded-[12px]";

  return (
    <div
      className={[
        "grid shrink-0 place-items-center overflow-hidden",
        "border border-[#e7e9ee] bg-white",
        sizing,
      ].join(" ")}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`Logo ${name}`}
          className="h-full w-full object-contain p-2"
        />
      ) : (
        <span
          className={
            size === "large"
              ? "text-xl font-[750] text-[#475467]"
              : "text-xs font-[750] text-[#475467]"
          }
        >
          {initials}
        </span>
      )}
    </div>
  );
}

export default async function ProvidersAdminPage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  await requireAdmin();

  const query =
    await searchParams;

  const [
    providers,
    editing,
  ] =
    await Promise.all([
      prisma.provider.findMany({
        include: {
          _count: {
            select: {
              offers: true,

              affiliatePrograms:
                true,
            },
          },
        },

        orderBy: {
          name: "asc",
        },
      }),

      query.edit
        ? prisma.provider.findUnique({
            where: {
              id:
                query.edit,
            },

            include: {
              _count: {
                select: {
                  offers:
                    true,

                  affiliatePrograms:
                    true,
                },
              },
            },
          })
        : null,
    ]);

  const logoErrorMessage =
    query.logoError ===
    "size"
      ? "Plik jest większy niż 2 MB."
      : query.logoError ===
          "type"
        ? "Obsługiwane formaty to PNG, JPEG i WebP."
        : query.logoError ===
            "missing"
          ? "Wybierz plik z logo."
          : query.logoError ===
              "upload"
            ? "Nie udało się przesłać logo do Supabase Storage."
            : null;

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AdminNav />

          <section className="min-w-0">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <span className="eyebrow">
                  Partnerzy
                </span>

                <h1 className="mt-3 text-[32px] font-[720] tracking-[-0.04em]">
                  Dostawcy
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                  Zarządzaj firmami
                  i markami, których
                  usługi pojawiają
                  się w Narzivo.
                </p>
              </div>

              {editing ? (
                <Link
                  href="/admin/dostawcy"
                  className="btn btn-secondary"
                >
                  + Nowy dostawca
                </Link>
              ) : null}
            </div>

            {query.saved ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#087443]">
                Dostawca został zapisany.
              </div>
            ) : null}

            {query.deleted ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#087443]">
                Dostawca został usunięty.
              </div>
            ) : null}

            {query.error ===
            "used" ? (
              <div className="mt-6 rounded-[12px] border border-[#fecdca] bg-[#fff6f5] px-4 py-3 text-sm text-[#b42318]">
                Nie można usunąć
                dostawcy, który
                posiada oferty lub
                programy partnerskie.
              </div>
            ) : null}

            <form
              action={saveProvider}
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
                  <h2 className="text-lg font-[680] tracking-[-0.02em]">
                    {editing
                      ? "Edytuj dostawcę"
                      : "Nowy dostawca"}
                  </h2>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Podstawowe
                    informacje o
                    firmie.
                  </p>
                </div>

                {editing ? (
                  <span className="rounded-full bg-[#f2f1ff] px-3 py-1.5 text-xs font-semibold text-[#5048d8]">
                    Edycja
                  </span>
                ) : null}
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">
                <label>
                  <span className="label">
                    Nazwa *
                  </span>

                  <input
                    name="name"
                    className="field"
                    required
                    autoComplete="off"
                    placeholder="np. Hetzner"
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
                    autoComplete="off"
                    placeholder="hetzner"
                    defaultValue={
                      editing?.slug ??
                      ""
                    }
                  />

                  <span className="mt-2 block text-[11px] leading-5 text-[#98a2b3]">
                    Jeśli zostawisz
                    puste, zostanie
                    utworzony z nazwy.
                  </span>
                </label>

                <label>
                  <span className="label">
                    Oficjalna strona WWW *
                  </span>

                  <input
                    name="websiteUrl"
                    type="url"
                    className="field"
                    required
                    placeholder="https://..."
                    defaultValue={
                      editing?.websiteUrl ??
                      ""
                    }
                  />
                </label>

                <label>
                  <span className="label">
                    Kod kraju
                  </span>

                  <input
                    name="countryCode"
                    className="field"
                    maxLength={2}
                    autoComplete="off"
                    placeholder="DE"
                    defaultValue={
                      editing?.countryCode ??
                      ""
                    }
                  />

                  <span className="mt-2 block text-[11px] text-[#98a2b3]">
                    Dwuliterowy kod,
                    np. PL, DE, US.
                  </span>
                </label>

                <label className="md:col-span-2">
                  <span className="label">
                    Opis *
                  </span>

                  <textarea
                    name="description"
                    className="field min-h-36 resize-y"
                    required
                    placeholder="Rzeczowy opis dostawcy..."
                    defaultValue={
                      editing?.description ??
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
                      editing?.isPublished ??
                      false
                    }
                  />

                  <div>
                    <div className="text-sm font-semibold text-[#101114]">
                      Dostawca
                      opublikowany
                    </div>

                    <div className="mt-1 text-xs leading-5 text-[#98a2b3]">
                      Dopiero
                      opublikowany
                      dostawca może
                      występować przy
                      publicznych
                      ofertach.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex flex-col justify-end gap-2 border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4 sm:flex-row">
                {editing ? (
                  <Link
                    href="/admin/dostawcy"
                    className="btn btn-secondary"
                  >
                    Anuluj
                  </Link>
                ) : null}

                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editing
                    ? "Zapisz zmiany"
                    : "Dodaj dostawcę"}

                  <span>
                    →
                  </span>
                </button>
              </div>
            </form>

            {editing ? (
              <section className="card mt-6 overflow-hidden">
                <div className="border-b border-[#eceef2] px-6 py-5">
                  <h2 className="text-lg font-[680] tracking-[-0.02em]">
                    Logo dostawcy
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
                    Logo jest
                    przechowywane w
                    Supabase Storage.
                    Obsługiwane formaty:
                    PNG, JPEG i WebP.
                    Maksymalnie 2 MB.
                  </p>
                </div>

                <div className="p-6">
                  {query.logo ? (
                    <div className="mb-5 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087443]">
                      Nowe logo
                      zostało zapisane.
                    </div>
                  ) : null}

                  {query.logoRemoved ? (
                    <div className="mb-5 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087443]">
                      Logo zostało
                      usunięte.
                    </div>
                  ) : null}

                  {logoErrorMessage ? (
                    <div className="mb-5 rounded-[12px] border border-[#fecdca] bg-[#fff6f5] px-4 py-3 text-sm text-[#b42318]">
                      {
                        logoErrorMessage
                      }
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <ProviderLogo
                      name={
                        editing.name
                      }
                      logoUrl={
                        editing.logoUrl
                      }
                      size="large"
                    />

                    <div className="min-w-0 flex-1">
                      <form
                        action={
                          uploadProviderLogo
                        }
                        className="flex flex-col gap-3 xl:flex-row"
                      >
                        <input
                          type="hidden"
                          name="providerId"
                          value={
                            editing.id
                          }
                        />

                        <input
                          name="logo"
                          type="file"
                          required
                          accept="image/png,image/jpeg,image/webp"
                          className="field h-auto min-w-0 flex-1 py-2"
                        />

                        <button
                          type="submit"
                          className="btn btn-primary shrink-0"
                        >
                          Prześlij logo
                        </button>
                      </form>

                      {editing.logoUrl ? (
                        <div className="mt-4 flex flex-wrap items-center gap-4">
                          <a
                            href={
                              editing.logoUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-[#5048d8]"
                          >
                            Otwórz logo ↗
                          </a>

                          <form
                            action={
                              removeProviderLogo
                            }
                          >
                            <input
                              type="hidden"
                              name="providerId"
                              value={
                                editing.id
                              }
                            />

                            <ConfirmSubmitButton
                              className="text-sm font-semibold text-[#b42318]"
                              message="Czy na pewno usunąć obecne logo dostawcy?"
                            >
                              Usuń logo
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-[#98a2b3]">
                          Dostawca nie
                          ma jeszcze
                          własnego logo.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <div className="mt-5 rounded-[14px] border border-dashed border-[#d9dde5] bg-white px-5 py-4 text-xs leading-5 text-[#667085]">
                Najpierw zapisz
                dostawcę. Po
                utworzeniu rekordu
                pojawi się możliwość
                przesłania logo.
              </div>
            )}

            <section className="mt-10">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-xl font-[680] tracking-[-0.025em]">
                    Lista dostawców
                  </h2>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Łącznie:{" "}
                    {
                      providers.length
                    }
                  </p>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Dostawca
                      </th>

                      <th>
                        Kraj
                      </th>

                      <th>
                        Oferty
                      </th>

                      <th>
                        Programy
                      </th>

                      <th>
                        Status
                      </th>

                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {providers.map(
                      (
                        provider,
                      ) => {
                        const canDelete =
                          provider
                            ._count
                            .offers ===
                            0 &&
                          provider
                            ._count
                            .affiliatePrograms ===
                            0;

                        return (
                          <tr
                            key={
                              provider.id
                            }
                          >
                            <td>
                              <div className="flex min-w-[220px] items-center gap-3">
                                <ProviderLogo
                                  name={
                                    provider.name
                                  }
                                  logoUrl={
                                    provider.logoUrl
                                  }
                                />

                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-[#101114]">
                                    {
                                      provider.name
                                    }
                                  </div>

                                  <a
                                    href={
                                      provider.websiteUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 block max-w-[250px] truncate text-xs text-[#98a2b3] hover:text-[#5048d8]"
                                  >
                                    {
                                      provider.websiteUrl
                                    }
                                  </a>
                                </div>
                              </div>
                            </td>

                            <td>
                              {provider.countryCode ??
                                "—"}
                            </td>

                            <td>
                              {
                                provider
                                  ._count
                                  .offers
                              }
                            </td>

                            <td>
                              {
                                provider
                                  ._count
                                  .affiliatePrograms
                              }
                            </td>

                            <td>
                              {provider.isPublished ? (
                                <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-xs font-semibold text-[#087443]">
                                  Publiczny
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#667085]">
                                  Ukryty
                                </span>
                              )}
                            </td>

                            <td>
                              <div className="flex items-center justify-end gap-4 whitespace-nowrap">
                                <Link
                                  href={`/admin/dostawcy?edit=${provider.id}`}
                                  className="text-sm font-semibold text-[#5048d8]"
                                >
                                  Edytuj
                                </Link>

                                {canDelete ? (
                                  <form
                                    action={
                                      deleteProvider
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="id"
                                      value={
                                        provider.id
                                      }
                                    />

                                    <ConfirmSubmitButton
                                      className="text-sm font-semibold text-[#b42318]"
                                      message={`Czy na pewno usunąć dostawcę „${provider.name}”?`}
                                    >
                                      Usuń
                                    </ConfirmSubmitButton>
                                  </form>
                                ) : (
                                  <span
                                    className="cursor-help text-xs text-[#c3c8d0]"
                                    title="Dostawca posiada powiązane dane i nie może zostać usunięty."
                                  >
                                    Używany
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}

                    {providers.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={
                            6
                          }
                        >
                          <div className="py-8 text-center">
                            <div className="text-sm font-semibold text-[#344054]">
                              Brak dostawców
                            </div>

                            <div className="mt-2 text-xs text-[#98a2b3]">
                              Dodaj
                              pierwszego
                              dostawcę
                              powyżej.
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
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