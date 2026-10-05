import "server-only";

import {
  createClient,
} from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env
      .SUPABASE_SECRET_KEY;

  if (!url) {
    throw new Error(
      "Brak NEXT_PUBLIC_SUPABASE_URL.",
    );
  }

  if (!secret) {
    throw new Error(
      "Brak SUPABASE_SECRET_KEY.",
    );
  }

  return createClient(
    url,
    secret,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,

        detectSessionInUrl:
          false,
      },
    },
  );
}