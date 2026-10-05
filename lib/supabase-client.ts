"use client";

import {
  createBrowserClient,
} from "@supabase/ssr";

let browserClient:
  ReturnType<
    typeof createBrowserClient
  > | null = null;

export function createSupabaseBrowserClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error(
      "Brak NEXT_PUBLIC_SUPABASE_URL.",
    );
  }

  if (!publishableKey) {
    throw new Error(
      "Brak NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  if (!browserClient) {
    browserClient =
      createBrowserClient(
        url,
        publishableKey,
      );
  }

  return browserClient;
}