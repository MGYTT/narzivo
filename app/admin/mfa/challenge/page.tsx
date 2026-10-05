import {
  redirect,
} from "next/navigation";

import {
  AdminMfaChallenge,
} from "@/components/AdminMfaChallenge";

import {
  getAdminMfaState,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

export default async function AdminMfaChallengePage() {
  const state =
    await getAdminMfaState();

  if (
    state.currentLevel ===
    "aal2"
  ) {
    redirect(
      "/admin",
    );
  }

  /*
   * aal1 -> aal1 oznacza,
   * że nie ma aktywnego
   * drugiego składnika.
   */
  if (
    state.nextLevel !==
    "aal2"
  ) {
    redirect(
      "/admin/mfa/setup",
    );
  }

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container flex min-h-screen items-center justify-center py-12">
        <AdminMfaChallenge
          email={
            state.claims.email ??
            null
          }
        />
      </div>
    </main>
  );
}