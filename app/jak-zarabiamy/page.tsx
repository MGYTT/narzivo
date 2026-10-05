import Link from "next/link";

export const revalidate =
  3600;

const principles = [
  {
    number: "01",
    title:
      "Prowizja nie ustala rankingu",
    description:
      "Informacja o programie afiliacyjnym nie jest składnikiem oceny Narzivo, wyniku Doradcy ani porównania produktów.",
  },
  {
    number: "02",
    title:
      "Link reklamowy jest oznaczony",
    description:
      "Jeżeli korzystamy z linku partnerskiego, użytkownik widzi jasne oznaczenie „Materiał reklamowy · link afiliacyjny”.",
  },
  {
    number: "03",
    title:
      "Brak afiliacji nie usuwa oferty",
    description:
      "Zweryfikowana usługa może być publikowana również bez programu partnerskiego. Wtedy kierujemy bezpośrednio do oficjalnej strony dostawcy.",
  },
] as const;

const flow = [
  {
    step: "1",
    title:
      "Porównujesz usługę",
    description:
      "Korzystasz z rankingu, Doradcy, porównywarki albo strony konkretnej oferty.",
  },
  {
    step: "2",
    title:
      "Wybierasz przejście do dostawcy",
    description:
      "Jeżeli oferta posiada aktywną afiliację, przycisk jest odpowiednio oznaczony. W przeciwnym przypadku prowadzi zwykłym linkiem do oficjalnego źródła.",
  },
  {
    step: "3",
    title:
      "Program partnerski może naliczyć prowizję",
    description:
      "Jeżeli warunki konkretnego programu zostaną spełnione, Narzivo może otrzymać wynagrodzenie od partnera.",
  },
] as const;

export default function HowWeEarnPage() {
  return (
    <main>
      {/* HERO */}

      <section className="relative overflow-hidden border-b border-[#eceef2] bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-[-220px] h-[480px] w-[480px] rounded-full bg-[#f1efff] blur-[110px]" />

          <div className="absolute right-[4%] top-[80px] h-[320px] w-[320px] rounded-full bg-[#f7f6ff] blur-[100px]" />
        </div>

        <div className="container relative py-20 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] lg:items-end">
            <div className="max-w-4xl">
              <span className="eyebrow">
                Transparentność
              </span>

              <h1 className="mt-5 text-[clamp(3rem,7vw,6.2rem)] font-[740] leading-[0.93] tracking-[-0.065em] text-[#101114]">
                Jak zarabia
                Narzivo.
              </h1>

              <p className="mt-7 max-w-2xl text-[17px] leading-8 text-[#667085] md:text-[19px]">
                Narzivo może
                otrzymywać prowizję
                z części linków do
                dostawców. Chcemy,
                żeby sposób
                monetyzacji był
                widoczny i oddzielony
                od systemu ocen.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/metodologia"
                  className="btn btn-primary"
                >
                  Zobacz metodologię
                  <span>
                    →
                  </span>
                </Link>

                <Link
                  href="/dobierz"
                  className="btn btn-secondary"
                >
                  Uruchom Doradcę
                </Link>
              </div>
            </div>

            <div className="rounded-[22px] border border-[#dedcff] bg-[#fafaff] p-6 md:p-7">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#635bff]">
                Najważniejsza zasada
              </div>

              <p className="mt-4 text-[24px] font-[690] leading-[1.3] tracking-[-0.035em] text-[#101114]">
                Prowizja partnerska
                nie jest kryterium
                jakości produktu.
              </p>

              <p className="mt-4 text-sm leading-7 text-[#667085]">
                Oferta bez linku
                afiliacyjnego może
                znaleźć się w Narzivo,
                jeżeli spełnia zasady
                publikacji i posiada
                zweryfikowane dane.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}

      <section className="container page-section">
        <div className="max-w-2xl">
          <span className="eyebrow">
            Zasady
          </span>

          <h2 className="h2 mt-3">
            Monetyzacja ma być
            oddzielona od oceny.
          </h2>

          <p className="mt-4 text-sm leading-7 text-[#667085]">
            Te reguły obowiązują
            niezależnie od
            dostawcy, kategorii
            czy wysokości
            potencjalnej prowizji.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {principles.map(
            (
              principle,
            ) => (
              <article
                key={
                  principle.number
                }
                className="rounded-[20px] border border-[#e7e9ee] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.02)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#635bff]">
                    {
                      principle.number
                    }
                  </span>

                  <span className="h-2 w-2 rounded-full bg-[#635bff]" />
                </div>

                <h3 className="mt-8 text-[20px] font-[690] tracking-[-0.03em]">
                  {
                    principle.title
                  }
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#667085]">
                  {
                    principle.description
                  }
                </p>
              </article>
            ),
          )}
        </div>
      </section>

      {/* FLOW */}

      <section className="border-y border-[#eceef2] bg-[#fafbfc]">
        <div className="container page-section">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
            <div className="max-w-md">
              <span className="eyebrow">
                Jak to działa
              </span>

              <h2 className="h2 mt-3">
                Od porównania
                do prowizji.
              </h2>

              <p className="mt-5 text-sm leading-7 text-[#667085]">
                Samo wyświetlenie
                produktu nie oznacza,
                że Narzivo otrzymuje
                wynagrodzenie.
              </p>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-[#e7e9ee] bg-white">
              {flow.map(
                (
                  item,
                  index,
                ) => (
                  <article
                    key={
                      item.step
                    }
                    className={[
                      "grid gap-5 p-6 md:grid-cols-[64px_1fr]",
                      index <
                      flow.length -
                        1
                        ? "border-b border-[#eceef2]"
                        : "",
                    ].join(
                      " ",
                    )}
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#f2f1ff] text-sm font-[750] text-[#5048d8]">
                      {
                        item.step
                      }
                    </div>

                    <div>
                      <h3 className="text-[18px] font-[680] tracking-[-0.025em]">
                        {
                          item.title
                        }
                      </h3>

                      <p className="mt-2 text-sm leading-7 text-[#667085]">
                        {
                          item.description
                        }
                      </p>
                    </div>
                  </article>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TWO LINK TYPES */}

      <section className="container page-section">
        <div className="max-w-2xl">
          <span className="eyebrow">
            Dwa rodzaje przejść
          </span>

          <h2 className="h2 mt-3">
            Zawsze wiesz,
            jaki link otwierasz.
          </h2>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-2">
          <article className="overflow-hidden rounded-[20px] border border-[#dedcff] bg-[#fafaff]">
            <div className="p-7">
              <span className="inline-flex rounded-full bg-[#eceaff] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#5048d8]">
                Afiliacja
              </span>

              <h3 className="mt-5 text-[24px] font-[700] tracking-[-0.035em]">
                Link partnerski
              </h3>

              <p className="mt-4 text-sm leading-7 text-[#667085]">
                Przejście może
                wygenerować prowizję
                dla Narzivo zgodnie
                z zasadami programu
                partnerskiego.
              </p>
            </div>

            <div className="border-t border-[#e4e1ff] bg-white px-7 py-4 text-[11px] font-medium text-[#667085]">
              Materiał reklamowy ·
              link afiliacyjny
            </div>
          </article>

          <article className="overflow-hidden rounded-[20px] border border-[#e7e9ee] bg-white">
            <div className="p-7">
              <span className="inline-flex rounded-full bg-[#f2f4f7] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#667085]">
                Bez afiliacji
              </span>

              <h3 className="mt-5 text-[24px] font-[700] tracking-[-0.035em]">
                Link bezpośredni
              </h3>

              <p className="mt-4 text-sm leading-7 text-[#667085]">
                Jeżeli Narzivo nie
                posiada aktywnego
                linku partnerskiego,
                kierujemy do
                oficjalnej strony
                dostawcy.
              </p>
            </div>

            <div className="border-t border-[#eceef2] bg-[#fafbfc] px-7 py-4 text-[11px] font-medium text-[#667085]">
              Link do oficjalnej
              strony dostawcy
            </div>
          </article>
        </div>
      </section>

      {/* WHAT DOES NOT CHANGE */}

      <section className="border-y border-[#eceef2] bg-[#fafbfc]">
        <div className="container py-14 md:py-18">
          <div className="grid gap-7 md:grid-cols-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#98a2b3]">
                Ranking
              </div>

              <div className="mt-2 text-[17px] font-[670]">
                Prowizja nie jest
                wagą rankingu.
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#98a2b3]">
                Ocena
              </div>

              <div className="mt-2 text-[17px] font-[670]">
                Wynik wynika
                z kryteriów
                kategorii.
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#98a2b3]">
                Doradca
              </div>

              <div className="mt-2 text-[17px] font-[670]">
                Afiliacja nie jest
                sygnałem dopasowania.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DARK CTA */}

      <section className="bg-[#101114] text-white">
        <div className="container py-16 md:py-20">
          <div className="grid gap-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a9a5ff]">
                Sprawdź zasady ocen
              </div>

              <h2 className="mt-4 text-[clamp(2rem,5vw,3.8rem)] font-[710] leading-[1] tracking-[-0.05em]">
                Monetyzacja to jedno.
                Metodologia to drugie.
              </h2>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#aeb4c0]">
                Na osobnej stronie
                pokazujemy sposób
                wyliczania ocen,
                znaczenie wag oraz
                zasady działania
                Doradcy Narzivo.
              </p>
            </div>

            <Link
              href="/metodologia"
              className="btn bg-white text-[#101114] hover:bg-[#f3f4f6]"
            >
              Metodologia
              <span>
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}