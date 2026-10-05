"use client";

import Link from "next/link";

import {
  useEffect,
} from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error:
    Error & {
      digest?:
        string;
    };

  reset:
    () => void;
}) {
  useEffect(() => {
    console.error(
      "Narzivo page error:",
      error,
    );
  }, [
    error,
  ]);

  return (
    <main className="bg-white">
      <section className="container flex min-h-[70vh] items-center py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-[#fff1f0] text-xl font-bold text-[#b42318]">
            !
          </div>

          <span className="eyebrow mt-7 inline-block">
            Błąd aplikacji
          </span>

          <h1 className="mt-4 text-[clamp(2.4rem,6vw,4.5rem)] font-[730] leading-[1] tracking-[-0.055em]">
            Nie udało się
            załadować tej strony.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[16px] leading-7 text-[#667085]">
            Dane nie zostały
            zmienione przez samo
            wystąpienie tego błędu.
            Możesz spróbować
            ponownie albo wrócić
            do strony głównej.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                reset()
              }
              className="btn btn-primary"
            >
              Spróbuj ponownie
              <span>
                ↻
              </span>
            </button>

            <Link
              href="/"
              className="btn btn-secondary"
            >
              Strona główna
            </Link>
          </div>

          {error.digest ? (
            <p className="mt-8 text-[10px] text-[#b0b5bf]">
              Identyfikator błędu:{" "}
              {
                error.digest
              }
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}