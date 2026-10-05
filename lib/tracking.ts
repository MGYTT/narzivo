import "server-only";

import {
  createHmac,
} from "node:crypto";

import {
  getSiteUrl,
} from "@/lib/site";

const MAX_RAW_IP_LENGTH =
  128;

const MAX_USER_AGENT_LENGTH =
  500;

const MAX_REFERRER_LENGTH =
  300;

function getTrackingSecret() {
  const secret =
    process.env
      .CLICK_HASH_SECRET
      ?.trim();

  if (secret) {
    return secret;
  }

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    throw new Error(
      "Brak CLICK_HASH_SECRET w środowisku produkcyjnym.",
    );
  }

  /*
   * Wyłącznie development.
   * Na produkcji brak sekretu
   * zawsze powoduje błąd.
   */
  return "narzivo-development-click-hash-secret";
}

function dateBucket(
  now = new Date(),
) {
  return now
    .toISOString()
    .slice(
      0,
      10,
    );
}

function dailyKey(
  now = new Date(),
) {
  return createHmac(
    "sha256",
    getTrackingSecret(),
  )
    .update(
      `narzivo-clicks:${dateBucket(
        now,
      )}`,
    )
    .digest();
}

function fingerprint(
  namespace: string,
  value:
    | string
    | null,
  now = new Date(),
) {
  if (!value) {
    return null;
  }

  return createHmac(
    "sha256",
    dailyKey(now),
  )
    .update(
      `${namespace}:${value}`,
    )
    .digest(
      "hex",
    );
}

/*
 * Hash zmienia się każdego dnia.
 *
 * Dzięki temu nie tworzymy
 * długoterminowego identyfikatora IP
 * użytkownika, a nadal możemy
 * ograniczać flood w krótkim oknie.
 */
export function hashIp(
  ip:
    | string
    | null,
  now = new Date(),
) {
  return fingerprint(
    "ip",
    ip,
    now,
  );
}

export function hashUserAgent(
  userAgent:
    | string
    | null,
  now = new Date(),
) {
  const normalized =
    userAgent
      ?.trim()
      .slice(
        0,
        MAX_USER_AGENT_LENGTH,
      ) ||
    null;

  return fingerprint(
    "ua",
    normalized,
    now,
  );
}

export function getClientIp(
  headers: Headers,
) {
  const forwarded =
    headers.get(
      "x-forwarded-for",
    );

  if (forwarded) {
    const first =
      forwarded
        .split(",")[0]
        ?.trim();

    if (first) {
      return first.slice(
        0,
        MAX_RAW_IP_LENGTH,
      );
    }
  }

  const realIp =
    headers
      .get(
        "x-real-ip",
      )
      ?.trim();

  if (realIp) {
    return realIp.slice(
      0,
      MAX_RAW_IP_LENGTH,
    );
  }

  return null;
}

export function sanitizeReferrer(
  raw:
    | string
    | null,
) {
  if (!raw) {
    return null;
  }

  try {
    const url =
      new URL(raw);

    const site =
      getSiteUrl();

    /*
     * Dla wejść wewnętrznych zapisujemy
     * sam pathname, bez parametrów
     * zapytania i fragmentów.
     *
     * Dzięki temu można rozróżnić np.
     * /dobierz i /porownaj, ale nie
     * przechowujemy potencjalnie
     * wrażliwych query params.
     */
    if (
      url.host ===
      site.host
    ) {
      return url.pathname
        .slice(
          0,
          MAX_REFERRER_LENGTH,
        );
    }

    /*
     * Dla źródeł zewnętrznych
     * zachowujemy wyłącznie hostname.
     */
    return url.hostname
      .replace(
        /^www\./,
        "",
      )
      .slice(
        0,
        MAX_REFERRER_LENGTH,
      );
  } catch {
    return null;
  }
}

export function isLikelyBot(
  userAgent:
    | string
    | null,
) {
  if (!userAgent) {
    return false;
  }

  return /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headlesschrome|lighthouse|pagespeed|pingdom|uptimerobot/i.test(
    userAgent,
  );
}

export function hasPrivacyOptOut(
  headers: Headers,
) {
  const gpc =
    headers.get(
      "sec-gpc",
    );

  const dnt =
    headers.get(
      "dnt",
    );

  return (
    gpc === "1" ||
    dnt === "1"
  );
}

export function shouldTrackClick(
  headers: Headers,
) {
  if (
    hasPrivacyOptOut(
      headers,
    )
  ) {
    return false;
  }

  if (
    isLikelyBot(
      headers.get(
        "user-agent",
      ),
    )
  ) {
    return false;
  }

  return true;
}