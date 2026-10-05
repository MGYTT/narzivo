import {
  redirect,
} from "next/navigation";

import {
  getAdminMfaState,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

export default async function AdminMfaPage() {
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

  if (
    state.nextLevel ===
    "aal2"
  ) {
    redirect(
      "/admin/mfa/challenge",
    );
  }

  redirect(
    "/admin/mfa/setup",
  );
}