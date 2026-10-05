import {
  redirect,
} from "next/navigation";

import Link from "next/link";

import {
  isAdmin,
} from "@/lib/auth";

import {
  loginAdmin,
} from "../actions";

export const dynamic =
  "force-dynamic";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  if (
    await isAdmin()
  ) {
    redirect("/admin");
  }

  const query =
    await searchParams;

  const error =
    query.error;

  const errorMessage =
    error ===
    "credentials"
      ? "Nieprawidłowy e-mail lub hasło."
      : error ===
          "forbidden"
        ? "To konto nie ma dostępu do panelu Narzivo."
        : error ===
            "missing"
          ? "Podaj e-mail i hasło."
          : null;

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#fafbfc]">
      <div className="container flex min-h-[calc(100vh-72px)] items-center justify-center py-12">
        <div className="w-full max-w-[440px]">
          <div className="mb-7 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-[#111214] text-sm font-bold text-white">
                N
              </span>

              <span className="text-xl font-[720] tracking-[-0.035em]">
                Narzivo
              </span>
            </Link>

            <h1 className="mt-8 text-[30px] font-[720] tracking-[-0.04em] text-[#101114]">
              Panel administratora
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#667085]">
              Zaloguj się kontem
              administratora Narzivo.
            </p>
          </div>

          <form
            action={
              loginAdmin
            }
            className="card p-6 sm:p-7"
          >
            {errorMessage ? (
              <div className="mb-5 rounded-[12px] border border-[#fecdca] bg-[#fff6f5] px-4 py-3 text-sm text-[#b42318]">
                {errorMessage}
              </div>
            ) : null}

            <label className="block">
              <span className="label">
                E-mail
              </span>

              <input
                className="field"
                type="email"
                name="email"
                required
                autoComplete="username"
                placeholder="admin@narzivo.pl"
              />
            </label>

            <label className="mt-5 block">
              <span className="label">
                Hasło
              </span>

              <input
                className="field"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
              />
            </label>

            <button className="btn btn-primary mt-6 w-full">
              Zaloguj się
              <span>→</span>
            </button>

            <p className="mt-5 text-center text-[11px] leading-5 text-[#98a2b3]">
              Sesja i dane
              uwierzytelniające są
              obsługiwane przez
              Supabase Auth.
            </p>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-[#667085] hover:text-[#101114]"
            >
              ← Wróć do Narzivo
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}