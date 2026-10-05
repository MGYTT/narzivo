import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error(
      "Brak NEXT_PUBLIC_SUPABASE_URL w .env",
    );
  }

  if (!key) {
    throw new Error(
      "Brak NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY w .env",
    );
  }

  return {
    url,
    key,
  };
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const { url, key } =
    getSupabaseConfig();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options,
                );
              },
            );
          } catch {
            /*
             * Server Components nie mogą
             * bezpośrednio zapisywać cookies.
             * Odświeżaniem sesji zajmuje się proxy.ts.
             */
          }
        },
      },
    },
  );
}