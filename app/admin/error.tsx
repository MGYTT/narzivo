"use client";

import {
  useEffect,
} from "react";

export default function AdminError({
  error,
  reset,
}: {
  error:
    Error & {
      digest?: string;
    };

  reset:
    () => void;
}) {
  useEffect(() => {
    console.error(
      "Narzivo admin error:",
      error,
    );
  }, [
    error,
  ]);

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-xl rounded-[20px] border border-[#fecdca] bg-white p-8 text-center shadow-[0_10px_40px_rgba(16,24,40,0.06)]">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-[#fff1f0] font-bold text-[#b42318]">
            !
          </div>

          <h1 className="mt-6 text-[28px] font-[720] tracking-[-0.04em]">
            Błąd panelu
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#667085]">
            Nie udało się
            poprawnie wyświetlić
            tej części panelu.
            Spróbuj ponownie przed
            wykonywaniem kolejnych
            zmian.
          </p>

          <button
            type="button"
            onClick={() =>
              reset()
            }
            className="btn btn-primary mt-7"
          >
            Spróbuj ponownie
            <span>
              ↻
            </span>
          </button>

          {error.digest ? (
            <div className="mt-5 text-[10px] text-[#98a2b3]">
              Identyfikator błędu:{" "}
              {
                error.digest
              }
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}