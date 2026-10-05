"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createSupabaseBrowserClient,
} from "@/lib/supabase-client";

function normalizeCode(
  value: string,
) {
  return value
    .replace(
      /\D/g,
      "",
    )
    .slice(
      0,
      8,
    );
}

export function AdminMfaChallenge({
  email,
}: {
  email:
    string | null;
}) {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () =>
        createSupabaseBrowserClient(),
      [],
    );

  const [
    code,
    setCode,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  async function verify(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      code.length < 6
    ) {
      setError(
        "Wpisz aktualny kod z aplikacji uwierzytelniającej.",
      );

      return;
    }

    setBusy(
      true,
    );

    setError(
      "",
    );

    try {
      const {
        data:
          factorsData,
        error:
          factorsError,
      } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) {
        throw factorsError;
      }

      const factor =
        factorsData.totp[0];

      if (!factor) {
        router.replace(
          "/admin/mfa/setup",
        );

        router.refresh();

        return;
      }

      const {
        data:
          challengeData,
        error:
          challengeError,
      } =
        await supabase.auth.mfa.challenge({
          factorId:
            factor.id,
        });

      if (
        challengeError ||
        !challengeData?.id
      ) {
        throw (
          challengeError ??
          new Error(
            "Nie udało się rozpocząć weryfikacji.",
          )
        );
      }

      const {
        error:
          verifyError,
      } =
        await supabase.auth.mfa.verify({
          factorId:
            factor.id,

          challengeId:
            challengeData.id,

          code,
        });

      if (verifyError) {
        throw verifyError;
      }

      router.replace(
        "/admin",
      );

      router.refresh();
    } catch (
      cause
    ) {
      console.error(
        cause,
      );

      setError(
        "Kod jest nieprawidłowy albo wygasł. Wpisz nowy kod z aplikacji.",
      );

      setCode(
        "",
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-[22px] border border-[#e7e9ee] bg-white shadow-[0_18px_60px_rgba(16,24,40,0.08)]">
        <div className="p-7">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-[#f2f1ff] text-[#5048d8]">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 10V8a5 5 0 0 1 10 0v2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </div>

          <div className="mt-6 text-center">
            <span className="eyebrow">
              Drugi składnik
            </span>

            <h1 className="mt-3 text-[28px] font-[720] tracking-[-0.045em]">
              Potwierdź logowanie
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#667085]">
              Otwórz aplikację
              uwierzytelniającą
              i wpisz aktualny
              kod dla Narzivo.
            </p>
          </div>

          {email ? (
            <div className="mt-5 rounded-[12px] bg-[#fafbfc] px-4 py-3 text-center text-xs text-[#667085]">
              {email}
            </div>
          ) : null}

          <form
            onSubmit={
              verify
            }
            className="mt-6"
          >
            <label>
              <span className="label">
                Kod uwierzytelniający
              </span>

              <input
                autoFocus
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={
                  code
                }
                onChange={(
                  event,
                ) =>
                  setCode(
                    normalizeCode(
                      event.target
                        .value,
                    ),
                  )
                }
                className="field mt-2 text-center text-[24px] font-[720] tracking-[0.2em]"
                placeholder="000000"
              />
            </label>

            {error ? (
              <div
                role="alert"
                className="mt-4 rounded-[12px] border border-[#fecdca] bg-[#fff1f0] px-4 py-3 text-xs leading-5 text-[#b42318]"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                busy ||
                code.length <
                  6
              }
              className="btn btn-primary mt-5 w-full disabled:opacity-50"
            >
              {busy
                ? "Sprawdzanie..."
                : "Wejdź do panelu"}

              {!busy ? (
                <span>
                  →
                </span>
              ) : null}
            </button>
          </form>
        </div>

        <div className="border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4 text-center text-[10px] leading-5 text-[#98a2b3]">
          Samo hasło nie daje
          dostępu do panelu Narzivo.
        </div>
      </div>
    </div>
  );
}