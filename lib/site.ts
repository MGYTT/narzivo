const FALLBACK_SITE_URL =
  "http://localhost:3000";

export const SITE_NAME =
  "Narzivo";

export const SITE_TAGLINE =
  "Porównywarka usług cyfrowych";

export const SITE_DESCRIPTION =
  "Porównuj hosting, VPS, domeny, chmurę i inne usługi cyfrowe na podstawie zweryfikowanych danych, cen i transparentnej metodologii Narzivo.";

export function getSiteUrl() {
  const configured =
    process.env
      .NEXT_PUBLIC_SITE_URL
      ?.trim();

  if (!configured) {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      throw new Error(
        "Brak NEXT_PUBLIC_SITE_URL w środowisku produkcyjnym.",
      );
    }

    return new URL(
      FALLBACK_SITE_URL,
    );
  }

  const normalized =
    configured.endsWith("/")
      ? configured
      : `${configured}/`;

  return new URL(
    normalized,
  );
}

export function absoluteUrl(
  path = "/",
) {
  return new URL(
    path,
    getSiteUrl(),
  ).toString();
}

/*
 * Zachowujemy również ten eksport
 * dla kompatybilności z pozostałymi
 * plikami projektu.
 */
export const site = {
  name:
    SITE_NAME,

  tagline:
    SITE_TAGLINE,

  description:
    SITE_DESCRIPTION,

  url:
    getSiteUrl()
      .toString()
      .replace(
        /\/$/,
        "",
      ),
} as const;