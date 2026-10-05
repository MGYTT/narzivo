import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { AdminNav } from "@/components/AdminNav";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

import {
  deleteAffiliateProgram,
  saveAffiliateProgram,
} from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  edit?: string;
  saved?: string;
  deleted?: string;
}>;

function dateInput(
  value:
    | Date
    | null
    | undefined,
) {
  if (!value) {
    return "";
  }

  return value
    .toISOString()
    .slice(0, 10);
}

function statusLabel(
  status:
    | "PENDING"
    | "ACTIVE"
    | "PAUSED"
    | "REJECTED",
) {
  switch (status) {
    case "ACTIVE":
      return "Aktywny";

    case "PAUSED":
      return "Wstrzymany";

    case "REJECTED":
      return "Odrzucony";

    default:
      return "Oczekuje";
  }
}

function StatusBadge({
  status,
}: {
  status:
    | "PENDING"
    | "ACTIVE"
    | "PAUSED"
    | "REJECTED";
}) {
  const classes =
    status === "ACTIVE"
      ? "bg-[#ecfdf3] text-[#087443]"
      : status === "REJECTED"
        ? "bg-[#fff1f0] text-[#b42318]"
        : status === "PAUSED"
          ? "bg-[#fffaeb] text-[#b54708]"
          : "bg-[#f2f4f7] text-[#667085]";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {statusLabel(
        status,
      )}
    </span>
  );
}

export default async function AffiliateAdminPage({
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
    programs,
    editing,
  ] =
    await Promise.all([
      prisma.provider.findMany({
        orderBy: {
          name: "asc",
        },
      }),

      prisma.affiliateProgram.findMany({
        include: {
          provider: true,
        },

        orderBy: [
          {
            status:
              "asc",
          },

          {
            provider: {
              name:
                "asc",
            },
          },
        ],
      }),

      query.edit
        ? prisma.affiliateProgram.findUnique({
            where: {
              id:
                query.edit,
            },

            include: {
              provider:
                true,
            },
          })
        : null,
    ]);

  const activeCount =
    programs.filter(
      (program) =>
        program.status ===
        "ACTIVE",
    ).length;

  const pendingCount =
    programs.filter(
      (program) =>
        program.status ===
        "PENDING",
    ).length;

  const pausedCount =
    programs.filter(
      (program) =>
        program.status ===
        "PAUSED",
    ).length;

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AdminNav />

          <section className="min-w-0">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <span className="eyebrow">
                  Monetyzacja
                </span>

                <h1 className="mt-3 text-[32px] font-[720] tracking-[-0.04em]">
                  Programy afiliacyjne
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                  Kontroluj status
                  współpracy,
                  warunki prowizji,
                  długość cookie i
                  źródła regulaminów
                  partnerskich.
                </p>
              </div>

              {editing ? (
                <Link
                  href="/admin/afiliacja"
                  className="btn btn-secondary"
                >
                  + Nowy program
                </Link>
              ) : null}
            </div>

            {query.saved ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#087443]">
                Program afiliacyjny
                został zapisany.
              </div>
            ) : null}

            {query.deleted ? (
              <div className="mt-6 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#087443]">
                Program afiliacyjny
                został usunięty.
              </div>
            ) : null}

            {/* METRYKI */}

            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="card p-5">
                <div className="text-xs font-medium text-[#98a2b3]">
                  Wszystkie
                </div>

                <div className="mt-3 text-[32px] font-[720] tracking-[-0.04em]">
                  {programs.length}
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs font-medium text-[#98a2b3]">
                  Aktywne
                </div>

                <div className="mt-3 text-[32px] font-[720] tracking-[-0.04em] text-[#087443]">
                  {activeCount}
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs font-medium text-[#98a2b3]">
                  Oczekujące
                </div>

                <div className="mt-3 text-[32px] font-[720] tracking-[-0.04em]">
                  {pendingCount}
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs font-medium text-[#98a2b3]">
                  Wstrzymane
                </div>

                <div className="mt-3 text-[32px] font-[720] tracking-[-0.04em]">
                  {pausedCount}
                </div>
              </div>
            </div>

            {providers.length ===
            0 ? (
              <div className="mt-7 rounded-[16px] border border-[#fedf89] bg-[#fffaeb] p-5">
                <div className="text-sm font-semibold text-[#93370d]">
                  Brak dostawców
                </div>

                <p className="mt-2 text-sm leading-6 text-[#b54708]">
                  Najpierw dodaj
                  dostawcę, aby
                  przypisać do niego
                  program afiliacyjny.
                </p>

                <Link
                  href="/admin/dostawcy"
                  className="btn btn-secondary mt-4"
                >
                  Przejdź do dostawców
                </Link>
              </div>
            ) : null}

            {/* FORMULARZ */}

            <form
              action={
                saveAffiliateProgram
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
                  <h2 className="text-lg font-[680] tracking-[-0.02em]">
                    {editing
                      ? "Edytuj program"
                      : "Nowy program afiliacyjny"}
                  </h2>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Dane wewnętrzne
                    dotyczące
                    współpracy
                    partnerskiej.
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
                    Dostawca *
                  </span>

                  <select
                    name="providerId"
                    className="field"
                    required
                    defaultValue={
                      editing?.providerId ??
                      ""
                    }
                  >
                    <option value="">
                      Wybierz dostawcę
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

                <label>
                  <span className="label">
                    Status
                  </span>

                  <select
                    name="status"
                    className="field"
                    defaultValue={
                      editing?.status ??
                      "PENDING"
                    }
                  >
                    <option value="PENDING">
                      Oczekuje
                    </option>

                    <option value="ACTIVE">
                      Aktywny
                    </option>

                    <option value="PAUSED">
                      Wstrzymany
                    </option>

                    <option value="REJECTED">
                      Odrzucony
                    </option>
                  </select>
                </label>

                <label>
                  <span className="label">
                    Sieć partnerska *
                  </span>

                  <input
                    name="network"
                    required
                    className="field"
                    placeholder="np. Awin, Impact, PartnerStack, Direct"
                    defaultValue={
                      editing?.network ??
                      ""
                    }
                  />
                </label>

                <label>
                  <span className="label">
                    Nazwa programu *
                  </span>

                  <input
                    name="programName"
                    required
                    className="field"
                    placeholder="Nazwa programu partnerskiego"
                    defaultValue={
                      editing?.programName ??
                      ""
                    }
                  />
                </label>

                <label>
                  <span className="label">
                    Cookie window
                  </span>

                  <div className="relative">
                    <input
                      name="cookieDays"
                      type="number"
                      min="0"
                      step="1"
                      className="field pr-16"
                      placeholder="30"
                      defaultValue={
                        editing?.cookieDays ??
                        ""
                      }
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#98a2b3]">
                      dni
                    </span>
                  </div>
                </label>

                <label>
                  <span className="label">
                    Ostatnia
                    weryfikacja
                  </span>

                  <input
                    name="lastVerifiedAt"
                    type="date"
                    className="field"
                    defaultValue={dateInput(
                      editing?.lastVerifiedAt,
                    )}
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="label">
                    Regulamin programu
                  </span>

                  <input
                    name="termsUrl"
                    type="url"
                    className="field"
                    placeholder="https://..."
                    defaultValue={
                      editing?.termsUrl ??
                      ""
                    }
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="label">
                    Warunki prowizji
                  </span>

                  <textarea
                    name="commissionNote"
                    className="field min-h-32 resize-y"
                    placeholder="np. 30% pierwszej płatności, 20% recurring..."
                    defaultValue={
                      editing?.commissionNote ??
                      ""
                    }
                  />

                  <span className="mt-2 block text-[11px] leading-5 text-[#98a2b3]">
                    To pole służy
                    jako informacja
                    wewnętrzna i nie
                    powinno wpływać
                    na ocenę ani
                    ranking oferty.
                  </span>
                </label>

                <label className="md:col-span-2">
                  <span className="label">
                    Referencja konta
                  </span>

                  <input
                    name="accountReference"
                    className="field"
                    placeholder="np. ID programu lub wewnętrzna nazwa konta"
                    defaultValue={
                      editing?.accountReference ??
                      ""
                    }
                  />

                  <span className="mt-2 block text-[11px] leading-5 text-[#98a2b3]">
                    Nie zapisuj tutaj
                    haseł, kluczy API
                    ani innych
                    sekretów.
                  </span>
                </label>
              </div>

              <div className="flex flex-col justify-end gap-2 border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4 sm:flex-row">
                {editing ? (
                  <Link
                    href="/admin/afiliacja"
                    className="btn btn-secondary"
                  >
                    Anuluj
                  </Link>
                ) : null}

                <button
                  type="submit"
                  disabled={
                    providers.length ===
                    0
                  }
                  className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {editing
                    ? "Zapisz zmiany"
                    : "Dodaj program"}

                  <span>
                    →
                  </span>
                </button>
              </div>
            </form>

            {/* LISTA PROGRAMÓW */}

            <section className="mt-10">
              <div className="mb-5">
                <h2 className="text-xl font-[680] tracking-[-0.025em]">
                  Wszystkie programy
                </h2>

                <p className="mt-1 text-xs text-[#98a2b3]">
                  Łącznie:{" "}
                  {programs.length}
                </p>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Dostawca
                      </th>

                      <th>
                        Program
                      </th>

                      <th>
                        Sieć
                      </th>

                      <th>
                        Cookie
                      </th>

                      <th>
                        Prowizja
                      </th>

                      <th>
                        Weryfikacja
                      </th>

                      <th>
                        Status
                      </th>

                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {programs.map(
                      (
                        program,
                      ) => (
                        <tr
                          key={
                            program.id
                          }
                        >
                          <td>
                            <div className="min-w-[150px] font-semibold text-[#101114]">
                              {
                                program
                                  .provider
                                  .name
                              }
                            </div>
                          </td>

                          <td>
                            <div className="min-w-[180px]">
                              <div className="font-semibold text-[#344054]">
                                {
                                  program.programName
                                }
                              </div>

                              {program.accountReference ? (
                                <div className="mt-1 text-[10px] text-[#98a2b3]">
                                  Ref:{" "}
                                  {
                                    program.accountReference
                                  }
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td>
                            {
                              program.network
                            }
                          </td>

                          <td>
                            {program.cookieDays !==
                            null
                              ? `${program.cookieDays} dni`
                              : "—"}
                          </td>

                          <td>
                            <div className="max-w-[220px] text-xs leading-5">
                              {program.commissionNote ??
                                "—"}
                            </div>
                          </td>

                          <td>
                            <div className="whitespace-nowrap">
                              {program.lastVerifiedAt
                                ? program.lastVerifiedAt.toLocaleDateString(
                                    "pl-PL",
                                  )
                                : "—"}
                            </div>

                            {program.termsUrl ? (
                              <a
                                href={
                                  program.termsUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-[10px] font-semibold text-[#5048d8]"
                              >
                                Regulamin ↗
                              </a>
                            ) : null}
                          </td>

                          <td>
                            <StatusBadge
                              status={
                                program.status
                              }
                            />
                          </td>

                          <td>
                            <div className="flex items-center justify-end gap-4 whitespace-nowrap">
                              <Link
                                href={`/admin/afiliacja?edit=${program.id}`}
                                className="text-sm font-semibold text-[#5048d8]"
                              >
                                Edytuj
                              </Link>

                              <form
                                action={
                                  deleteAffiliateProgram
                                }
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={
                                    program.id
                                  }
                                />

                                <ConfirmSubmitButton
                                  className="text-sm font-semibold text-[#b42318]"
                                  message={`Czy na pewno usunąć program afiliacyjny „${program.programName}”?`}
                                >
                                  Usuń
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}

                    {programs.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={
                            8
                          }
                        >
                          <div className="py-10 text-center">
                            <div className="text-sm font-semibold text-[#344054]">
                              Brak programów
                              afiliacyjnych
                            </div>

                            <div className="mt-2 text-xs text-[#98a2b3]">
                              Dodaj program
                              dopiero po
                              faktycznym
                              zgłoszeniu lub
                              akceptacji przez
                              partnera.
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 rounded-[16px] border border-[#e7e9ee] bg-white p-5">
              <div className="text-sm font-semibold text-[#101114]">
                Zasada Narzivo
              </div>

              <p className="mt-2 max-w-3xl text-xs leading-6 text-[#667085]">
                Wysokość prowizji
                partnerskiej nie
                powinna automatycznie
                wpływać na miejsce
                produktu w rankingu.
                Ocena produktu i
                relacja afiliacyjna
                pozostają osobnymi
                elementami systemu.
              </p>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}