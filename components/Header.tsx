"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

const navigation = [
  {
    href:
      "/dobierz",
    label:
      "Doradca",
  },
  {
    href:
      "/porownaj",
    label:
      "Porównaj",
  },
  {
    href:
      "/metodologia",
    label:
      "Metodologia",
  },
  {
    href:
      "/jak-zarabiamy",
    label:
      "Jak zarabiamy",
  },
] as const;

function isActiveRoute(
  pathname: string,
  href: string,
) {
  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`,
    )
  );
}

export function Header() {
  const pathname =
    usePathname();

  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);

  useEffect(() => {
    setMenuOpen(
      false,
    );
  }, [
    pathname,
  ]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previous =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setMenuOpen(
          false,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previous;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    menuOpen,
  ]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#eceef2] bg-white/90 backdrop-blur-xl">
        <div className="container">
          <div className="flex h-[68px] items-center justify-between gap-5">
            <Link
              href="/"
              aria-label="Narzivo — strona główna"
              className="group inline-flex items-center gap-2.5 rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bff] focus-visible:ring-offset-2"
            >
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#101114] text-[13px] font-[800] tracking-[-0.04em] text-white transition group-hover:bg-[#635bff]">
                N
              </span>

              <span className="text-[18px] font-[750] tracking-[-0.04em] text-[#101114]">
                Narzivo
              </span>
            </Link>

            <nav
              aria-label="Główna nawigacja"
              className="hidden items-center gap-1 lg:flex"
            >
              {navigation.map(
                (item) => {
                  const active =
                    isActiveRoute(
                      pathname,
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
                      aria-current={
                        active
                          ? "page"
                          : undefined
                      }
                      className={[
                        "rounded-[9px] px-3.5 py-2 text-[13px] font-[600] transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bff] focus-visible:ring-offset-2",
                        active
                          ? "bg-[#f5f4ff] text-[#5048d8]"
                          : "text-[#475467] hover:bg-[#f8f9fb] hover:text-[#101114]",
                      ].join(
                        " ",
                      )}
                    >
                      {
                        item.label
                      }
                    </Link>
                  );
                },
              )}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href="/porownaj"
                className="btn btn-secondary"
              >
                Porównaj
              </Link>

              <Link
                href="/dobierz"
                className="btn btn-primary"
              >
                Dobierz usługę
                <span>
                  →
                </span>
              </Link>
            </div>

            <button
              type="button"
              aria-label={
                menuOpen
                  ? "Zamknij menu"
                  : "Otwórz menu"
              }
              aria-expanded={
                menuOpen
              }
              aria-controls="mobile-navigation"
              onClick={() =>
                setMenuOpen(
                  (
                    current,
                  ) =>
                    !current,
                )
              }
              className="grid h-10 w-10 place-items-center rounded-[10px] border border-[#e7e9ee] bg-white text-[#101114] transition hover:bg-[#f8f9fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bff] focus-visible:ring-offset-2 lg:hidden"
            >
              {menuOpen ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 7H20M4 12H20M4 17H20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          id="mobile-navigation"
          className="fixed inset-0 z-40 bg-white lg:hidden"
        >
          <div className="container flex min-h-full flex-col pb-8 pt-[92px]">
            <nav
              aria-label="Mobilna nawigacja"
              className="flex flex-col"
            >
              {navigation.map(
                (item) => {
                  const active =
                    isActiveRoute(
                      pathname,
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
                      aria-current={
                        active
                          ? "page"
                          : undefined
                      }
                      className={[
                        "flex items-center justify-between border-b border-[#eceef2] py-5 text-[21px] font-[680] tracking-[-0.03em]",
                        active
                          ? "text-[#5048d8]"
                          : "text-[#101114]",
                      ].join(
                        " ",
                      )}
                    >
                      <span>
                        {
                          item.label
                        }
                      </span>

                      <span className="text-[#98a2b3]">
                        →
                      </span>
                    </Link>
                  );
                },
              )}
            </nav>

            <div className="mt-auto pt-10">
              <Link
                href="/dobierz"
                className="btn btn-primary w-full"
              >
                Uruchom Doradcę
                <span>
                  →
                </span>
              </Link>

              <p className="mt-4 text-center text-[11px] leading-5 text-[#98a2b3]">
                Oceny i rankingi
                Narzivo nie zależą
                od wysokości
                prowizji
                afiliacyjnej.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}