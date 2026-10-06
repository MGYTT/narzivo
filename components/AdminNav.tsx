"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  logoutAdmin,
} from "@/app/admin/actions";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const navigation:
  NavItem[] = [
    {
      href:
        "/admin",

      label:
        "Dashboard",

      description:
        "Podsumowanie",
    },

    {
      href:
        "/admin/kategorie",

      label:
        "Kategorie",

      description:
        "Struktura serwisu",
    },

    {
      href:
        "/admin/dostawcy",

      label:
        "Dostawcy",

      description:
        "Firmy i marki",
    },

    {
      href:
        "/admin/oferty",

      label:
        "Oferty",

      description:
        "Ceny i produkty",
    },

    {
      href:
        "/admin/oferty/import",

      label:
        "Import ofert",

      description:
        "Dodaj z URL",
    },

    {
      href:
        "/admin/oceny",

      label:
        "Oceny",

      description:
        "Metodologia i wyniki",
    },

    {
      href:
        "/admin/afiliacja",

      label:
        "Afiliacja",

      description:
        "Programy partnerskie",
    },

    {
      href:
        "/admin/analityka",

      label:
        "Analityka",

      description:
        "Kliknięcia i ruch",
    },
  ];

export function AdminNav() {
  const pathname =
    usePathname();

  function isActive(
    href: string,
  ) {
    if (
      href ===
      "/admin"
    ) {
      return (
        pathname ===
        "/admin"
      );
    }

    /*
     * Import jest podstroną
     * /admin/oferty, więc zwykłe
     * startsWith zaznaczałoby
     * dwie pozycje jednocześnie.
     */
    if (
      href ===
      "/admin/oferty"
    ) {
      return (
        pathname ===
        "/admin/oferty"
      );
    }

    return pathname.startsWith(
      href,
    );
  }

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="overflow-hidden rounded-[18px] border border-[#e7e9ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        <div className="border-b border-[#eceef2] p-4">
          <Link
            href="/admin"
            className="group flex items-center gap-3 rounded-[12px] p-1"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#111214] text-[14px] font-bold text-white transition-transform duration-200 group-hover:-rotate-3">
              N
            </span>

            <div className="min-w-0">
              <div className="truncate text-[15px] font-[720] tracking-[-0.025em] text-[#101114]">
                Narzivo
              </div>

              <div className="mt-0.5 text-[11px] text-[#98a2b3]">
                Panel administratora
              </div>
            </div>
          </Link>
        </div>

        <nav className="space-y-1 p-2">
          {navigation.map(
            (
              item,
            ) => {
              const active =
                isActive(
                  item.href,
                );

              return (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className={[
                    "group flex items-center gap-3 rounded-[11px] px-3 py-2.5 transition",

                    active
                      ? "bg-[#f2f1ff] text-[#4f46d8]"
                      : "text-[#475467] hover:bg-[#f7f7f8] hover:text-[#101114]",
                  ].join(
                    " ",
                  )}
                >
                  <span
                    className={[
                      "h-2 w-2 shrink-0 rounded-full transition",

                      active
                        ? "bg-[#635bff]"
                        : "bg-[#d0d5dd] group-hover:bg-[#98a2b3]",
                    ].join(
                      " ",
                    )}
                  />

                  <div className="min-w-0">
                    <div
                      className={[
                        "text-[13px]",

                        active
                          ? "font-[680]"
                          : "font-medium",
                      ].join(
                        " ",
                      )}
                    >
                      {
                        item.label
                      }
                    </div>

                    <div
                      className={[
                        "mt-0.5 truncate text-[10px]",

                        active
                          ? "text-[#7771d7]"
                          : "text-[#98a2b3]",
                      ].join(
                        " ",
                      )}
                    >
                      {
                        item.description
                      }
                    </div>
                  </div>
                </Link>
              );
            },
          )}
        </nav>

        <div className="border-t border-[#eceef2] p-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-[11px] px-3 py-2.5 text-[13px] font-medium text-[#475467] transition hover:bg-[#f7f7f8] hover:text-[#101114]"
          >
            <span>
              Otwórz Narzivo
            </span>

            <span className="text-[#98a2b3]">
              ↗
            </span>
          </Link>
        </div>

        <div className="border-t border-[#eceef2] p-2">
          <form
            action={
              logoutAdmin
            }
          >
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-[11px] px-3 py-2.5 text-left text-[13px] font-medium text-[#667085] transition hover:bg-[#fff5f4] hover:text-[#b42318]"
            >
              <span>
                Wyloguj się
              </span>

              <span>
                →
              </span>
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3 px-3 text-[10px] leading-4 text-[#98a2b3]">
        Oceny, ceny i publikacja mogą
        wpływać bezpośrednio na publiczną
        część Narzivo.
      </div>
    </aside>
  );
}