import Link from "next/link";

const productLinks = [
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
      "Porównywarka",
  },
  {
    href:
      "/metodologia",
    label:
      "Metodologia",
  },
] as const;

const transparencyLinks = [
  {
    href:
      "/jak-zarabiamy",
    label:
      "Jak zarabiamy",
  },
  {
    href:
      "/polityka-prywatnosci",
    label:
      "Polityka prywatności",
  },
  {
    href:
      "/regulamin",
    label:
      "Regulamin",
  },
] as const;

export function Footer() {
  const year =
    new Date()
      .getFullYear();

  return (
    <footer className="border-t border-[#eceef2] bg-white">
      <div className="container">
        <div className="grid gap-10 py-12 md:grid-cols-[1.4fr_.8fr_.8fr] md:py-16">
          <div className="max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5"
            >
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#101114] text-[13px] font-[800] text-white">
                N
              </span>

              <span className="text-[18px] font-[750] tracking-[-0.04em]">
                Narzivo
              </span>
            </Link>

            <p className="mt-5 text-sm leading-7 text-[#667085]">
              Porównywarka usług
              cyfrowych oparta na
              zweryfikowanych danych,
              transparentnej
              metodologii i
              jasno oznaczonej
              afiliacji.
            </p>

            <p className="mt-5 text-[11px] leading-5 text-[#98a2b3]">
              Ceny, warunki i
              dostępność mogą
              ulec zmianie.
              Przed zakupem zawsze
              sprawdź aktualne
              informacje na stronie
              dostawcy.
            </p>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#98a2b3]">
              Narzivo
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {productLinks.map(
                (item) => (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    className="text-sm font-medium text-[#475467] transition hover:text-[#5048d8]"
                  >
                    {
                      item.label
                    }
                  </Link>
                ),
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#98a2b3]">
              Transparentność
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {transparencyLinks.map(
                (item) => (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    className="text-sm font-medium text-[#475467] transition hover:text-[#5048d8]"
                  >
                    {
                      item.label
                    }
                  </Link>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-[#eceef2] py-6 text-[11px] leading-5 text-[#98a2b3] sm:flex-row sm:items-center">
          <span>
            © {year} Narzivo
          </span>

          <span>
            Dane · porównanie ·
            transparentność
          </span>
        </div>
      </div>
    </footer>
  );
}