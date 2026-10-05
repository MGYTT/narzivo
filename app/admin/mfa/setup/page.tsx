import {
  redirect,
} from "next/navigation";

import {
  AdminMfaSetup,
} from "@/components/AdminMfaSetup";

import {
  getAdminMfaState,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

export default async function AdminMfaSetupPage() {
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
   * aal1 -> aal2 oznacza,
   * że użytkownik ma już
   * aktywny czynnik MFA.
   */
  if (
    state.nextLevel ===
    "aal2"
  ) {
    redirect(
      "/admin/mfa/challenge",
    );
  }

  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container flex min-h-screen items-center justify-center py-12">
        <AdminMfaSetup
          email={
            state.claims.email ??
            null
          }
        />
      </div>
    </main>
  );
}