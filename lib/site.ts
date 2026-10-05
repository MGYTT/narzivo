const FALLBACK_SITE_URL =
  "http://localhost:3000";

export const SITE_NAME =
  "Narzivo";

export const SITE_TAGLINE =
  "Porównywarka usług cyfrowych";

export const SITE_DESCRIPTION =
  "Porównuj usługi cyfrowe na podstawie cen, parametrów, zweryfikowanych danych i transparentnej metodologii.";

function normalizeSiteUrl(
  value: string,
) {
  const trimmed =
    value
      .trim()
      .replace(
        /\/+$/,
        "",
      );

  if (
    trimmed.startsWith(
      "http://",
    ) ||
    trimmed.startsWith(
      "https://",
    )
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isLocalHostname(
  hostname: string,
) {
  const normalized =
    hostname
      .trim()
      .toLowerCase();

  return (
    normalized ===
      "localhost" ||
    normalized ===
      "127.0.0.1" ||
    normalized ===
      "::1" ||
    normalized.endsWith(
      ".local",
    )
  );
}

export function getSiteUrl() {
  const configuredUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL
      ?.trim();

  const vercelProductionUrl =
    process.env
      .VERCEL_PROJECT_PRODUCTION_URL
      ?.trim() ||
    process.env
      .NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      ?.trim();

  const rawUrl =
    configuredUrl ||
    vercelProductionUrl ||
    FALLBACK_SITE_URL;

  const normalized =
    normalizeSiteUrl(
      rawUrl,
    );

  let url: URL;

  try {
    url =
      new URL(
        normalized,
      );
  } catch {
    throw new Error(
      "Adres strony ma nieprawidłowy format.",
    );
  }

  const local =
    isLocalHostname(
      url.hostname,
    );

  if (
    process.env.NODE_ENV ===
      "production" &&
    !local &&
    url.protocol !==
      "https:"
  ) {
    throw new Error(
      "Publiczny adres strony produkcyjnej musi używać HTTPS.",
    );
  }

  return url;
}

export function absoluteUrl(
  path = "/",
) {
  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  return new URL(
    normalizedPath,
    getSiteUrl(),
  ).toString();
}

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