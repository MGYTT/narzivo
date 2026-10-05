import "server-only";

import {
  redirect,
} from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabase";

import {
  isAllowedAdminEmail,
} from "@/lib/admin-policy";

export {
  isAllowedAdminEmail,
} from "@/lib/admin-policy";

export type AdminClaims = {
  sub?: string;
  email?: string;
  aal?: string;
  role?: string;
};

async function getAdminIdentity() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims
  ) {
    return null;
  }

  const claims =
    data.claims as
      AdminClaims;

  if (
    !isAllowedAdminEmail(
      claims.email,
    )
  ) {
    return null;
  }

  return {
    supabase,
    claims,
  };
}

export async function getAdminClaims() {
  const identity =
    await getAdminIdentity();

  return (
    identity?.claims ??
    null
  );
}

export async function isAdmin() {
  const identity =
    await getAdminIdentity();

  if (!identity) {
    return false;
  }

  const {
    data,
    error,
  } =
    await identity.supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if (error) {
    return false;
  }

  return (
    data.currentLevel ===
    "aal2"
  );
}

/*
 * Sprawdza prawidłową tożsamość
 * administratora, ale jeszcze nie
 * wymaga MFA.
 *
 * Używamy tego wyłącznie na stronach
 * konfiguracji/challenge MFA.
 */
export async function requireAdminIdentity() {
  const identity =
    await getAdminIdentity();

  if (!identity) {
    redirect(
      "/admin/login",
    );
  }

  return identity.claims;
}

export async function getAdminMfaState() {
  const identity =
    await getAdminIdentity();

  if (!identity) {
    redirect(
      "/admin/login",
    );
  }

  const {
    data,
    error,
  } =
    await identity.supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if (error) {
    throw new Error(
      "Nie udało się zweryfikować poziomu MFA administratora.",
    );
  }

  return {
    claims:
      identity.claims,

    currentLevel:
      data.currentLevel,

    nextLevel:
      data.nextLevel,

    currentAuthenticationMethods:
      data.currentAuthenticationMethods,
  };
}

/*
 * To jest funkcja używana przez
 * właściwy panel administratora.
 *
 * Samo hasło NIE wystarcza.
 */
export async function requireAdmin() {
  const state =
    await getAdminMfaState();

  if (
    state.currentLevel !==
    "aal2"
  ) {
    redirect(
      "/admin/mfa",
    );
  }

  return state.claims;
}