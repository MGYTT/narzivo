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

type Enrollment = {
  factorId:
    string;

  qrCode:
    string;

  secret:
    string;
};

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

export function AdminMfaSetup({
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
    enrollment,
    setEnrollment,
  ] =
    useState<Enrollment | null>(
      null,
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

  const [
    copied,
    setCopied,
  ] =
    useState(false);

  async function beginEnrollment() {
    setBusy(
      true,
    );

    setError(
      "",
    );

    try {
      const {
        data,
        error:
          enrollError,
      } =
        await supabase.auth.mfa.enroll({
          factorType:
            "totp",

          friendlyName:
            "Narzivo Admin",
        });

      if (enrollError) {
        throw enrollError;
      }

      if (
        !data?.id ||
        !data.totp?.qr_code ||
        !data.totp?.secret
      ) {
        throw new Error(
          "Supabase nie zwrócił danych konfiguracji TOTP.",
        );
      }

      setEnrollment({
        factorId:
          data.id,

        qrCode:
          data.totp
            .qr_code,

        secret:
          data.totp
            .secret,
      });
    } catch (
      cause
    ) {
      console.error(
        cause,
      );

      setError(
        "Nie udało się rozpocząć konfiguracji MFA.",
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function verifyEnrollment(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!enrollment) {
      return;
    }

    if (
      code.length < 6
    ) {
      setError(
        "Wpisz kod z aplikacji uwierzytelniającej.",
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
          challengeData,
        error:
          challengeError,
      } =
        await supabase.auth.mfa.challenge({
          factorId:
            enrollment.factorId,
        });

      if (
        challengeError ||
        !challengeData?.id
      ) {
        throw (
          challengeError ??
          new Error(
            "Nie udało się utworzyć wyzwania MFA.",
          )
        );
      }

      const {
        error:
          verifyError,
      } =
        await supabase.auth.mfa.verify({
          factorId:
            enrollment.factorId,

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
        "Kod jest nieprawidłowy albo wygasł. Wpisz aktualny kod z aplikacji.",
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

  async function cancelEnrollment() {
    if (!enrollment) {
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
        error:
          unenrollError,
      } =
        await supabase.auth.mfa.unenroll({
          factorId:
            enrollment.factorId,
        });

      if (
        unenrollError
      ) {
        throw unenrollError;
      }

      setEnrollment(
        null,
      );

      setCode(
        "",
      );
    } catch (
      cause
    ) {
      console.error(
        cause,
      );

      setError(
        "Nie udało się anulować konfiguracji. Odśwież stronę i spróbuj ponownie.",
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function copySecret() {
    if (
      !enrollment
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        enrollment.secret,
      );

      setCopied(
        true,
      );

      window.setTimeout(
        () => {
          setCopied(
            false,
          );
        },
        1500,
      );
    } catch {
      setCopied(
        false,
      );
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-[22px] border border-[#e7e9ee] bg-white shadow-[0_18px_60px_rgba(16,24,40,0.08)]">
        <div className="border-b border-[#eceef2] p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[#f2f1ff] text-[#5048d8]">
              <svg
                width="21"
                height="21"
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

                <path
                  d="M12 14v2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#635bff]">
                Wymagane zabezpieczenie
              </div>

              <h1 className="mt-2 text-[27px] font-[720] tracking-[-0.04em]">
                Włącz uwierzytelnianie
                dwuskładnikowe
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#667085]">
                Panel administratora
                Narzivo wymaga kodu
                TOTP oprócz hasła.
              </p>
            </div>
          </div>

          {email ? (
            <div className="mt-5 rounded-[12px] bg-[#fafbfc] px-4 py-3 text-xs text-[#667085]">
              Konto administratora:{" "}
              <strong className="font-semibold text-[#344054]">
                {email}
              </strong>
            </div>
          ) : null}
        </div>

        {!enrollment ? (
          <div className="p-6 md:p-7">
            <div className="space-y-4 text-sm leading-7 text-[#667085]">
              <p>
                Użyj aplikacji
                obsługującej kody TOTP,
                np. menedżera haseł
                lub aplikacji
                uwierzytelniającej.
              </p>

              <p>
                Po konfiguracji samo
                poprawne hasło nie
                wystarczy do wejścia
                do panelu.
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-5 rounded-[12px] border border-[#fecdca] bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318]"
              >
                {error}
              </div>
            ) : null}

            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                beginEnrollment
              }
              className="btn btn-primary mt-7 w-full disabled:opacity-50"
            >
              {busy
                ? "Przygotowywanie..."
                : "Rozpocznij konfigurację"}

              {!busy ? (
                <span>
                  →
                </span>
              ) : null}
            </button>
          </div>
        ) : (
          <form
            onSubmit={
              verifyEnrollment
            }
            className="p-6 md:p-7"
          >
            <div className="grid gap-7 md:grid-cols-[190px_1fr]">
              <div>
                <div className="rounded-[16px] border border-[#e7e9ee] bg-white p-3">
                  <img
                    src={
                      enrollment.qrCode
                    }
                    alt="Kod QR konfiguracji MFA"
                    width={180}
                    height={180}
                    className="mx-auto aspect-square w-full"
                  />
                </div>

                <div className="mt-3 text-center text-[10px] leading-5 text-[#98a2b3]">
                  Zeskanuj QR
                  w aplikacji TOTP.
                </div>
              </div>

              <div>
                <div className="text-sm font-[680]">
                  1. Dodaj konto
                  do aplikacji
                </div>

                <p className="mt-2 text-xs leading-6 text-[#667085]">
                  Zeskanuj kod QR.
                  Jeśli nie możesz
                  go zeskanować,
                  wpisz klucz ręcznie.
                </p>

                <div className="mt-4 rounded-[12px] border border-[#e7e9ee] bg-[#fafbfc] p-3">
                  <div className="text-[9px] font-bold uppercase tracking-[0.06em] text-[#98a2b3]">
                    Klucz ręczny
                  </div>

                  <code className="mt-2 block break-all text-[12px] font-semibold text-[#344054]">
                    {
                      enrollment.secret
                    }
                  </code>

                  <button
                    type="button"
                    onClick={
                      copySecret
                    }
                    className="mt-3 text-[11px] font-semibold text-[#5048d8]"
                  >
                    {copied
                      ? "Skopiowano"
                      : "Kopiuj klucz"}
                  </button>
                </div>

                <label className="mt-6 block">
                  <span className="label">
                    2. Wpisz aktualny kod
                  </span>

                  <input
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
                    className="field mt-2 text-center text-[22px] font-[700] tracking-[0.18em]"
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
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-[#eceef2] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  cancelEnrollment
                }
                className="btn btn-secondary disabled:opacity-50"
              >
                Zacznij od nowa
              </button>

              <button
                type="submit"
                disabled={
                  busy ||
                  code.length <
                    6
                }
                className="btn btn-primary disabled:opacity-50"
              >
                {busy
                  ? "Weryfikacja..."
                  : "Włącz MFA"}

                {!busy ? (
                  <span>
                    →
                  </span>
                ) : null}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}