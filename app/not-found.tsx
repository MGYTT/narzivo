import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-white">
      <section className="container flex min-h-[70vh] items-center py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-[#f2f1ff] text-lg font-[800] text-[#635bff]">
            404
          </div>

          <span className="eyebrow mt-7 inline-block">
            Nie znaleziono
          </span>

          <h1 className="mt-4 text-[clamp(2.5rem,6vw,4.8rem)] font-[730] leading-[0.98] tracking-[-0.055em]">
            Tej strony tutaj
            nie ma.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[16px] leading-7 text-[#667085]">
            Adres może być
            nieaktualny albo oferta
            mogła przestać być
            dostępna. Wróć do
            katalogu lub skorzystaj
            z Doradcy Narzivo.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="btn btn-secondary"
            >
              Strona główna
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
        </div>
      </section>
    </main>
  );
}