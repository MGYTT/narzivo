const required = [
  "NEXT_PUBLIC_SITE_URL",
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "ADMIN_EMAILS",
  "CLICK_HASH_SECRET",
];

const errors = [];
const warnings = [];

function value(name) {
  return String(
    process.env[name] ??
      "",
  ).trim();
}

function requiredValue(name) {
  const result =
    value(name);

  if (!result) {
    errors.push(
      `Brak ${name}.`,
    );
  }

  return result;
}

function validUrl(
  name,
  raw,
  protocols,
) {
  if (!raw) {
    return null;
  }

  try {
    const parsed =
      new URL(raw);

    if (
      protocols &&
      !protocols.includes(
        parsed.protocol,
      )
    ) {
      errors.push(
        `${name} używa niedozwolonego protokołu ${parsed.protocol}.`,
      );
    }

    return parsed;
  } catch {
    errors.push(
      `${name} nie jest prawidłowym URL.`,
    );

    return null;
  }
}

for (
  const name of required
) {
  requiredValue(
    name,
  );
}

const siteUrl =
  validUrl(
    "NEXT_PUBLIC_SITE_URL",
    value(
      "NEXT_PUBLIC_SITE_URL",
    ),
    [
      "https:",
    ],
  );

if (
  siteUrl &&
  (
    siteUrl.hostname ===
      "localhost" ||
    siteUrl.hostname ===
      "127.0.0.1" ||
    siteUrl.hostname.endsWith(
      ".local",
    )
  )
) {
  errors.push(
    "NEXT_PUBLIC_SITE_URL wskazuje na adres lokalny.",
  );
}

if (
  siteUrl &&
  siteUrl.pathname !==
    "/"
) {
  warnings.push(
    "NEXT_PUBLIC_SITE_URL zawiera ścieżkę. Zalecany jest sam origin, np. https://narzivo.pl.",
  );
}

validUrl(
  "NEXT_PUBLIC_SUPABASE_URL",
  value(
    "NEXT_PUBLIC_SUPABASE_URL",
  ),
  [
    "https:",
  ],
);

validUrl(
  "DATABASE_URL",
  value(
    "DATABASE_URL",
  ),
  [
    "postgres:",
    "postgresql:",
  ],
);

validUrl(
  "DIRECT_URL",
  value(
    "DIRECT_URL",
  ),
  [
    "postgres:",
    "postgresql:",
  ],
);

const publishableKey =
  value(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );

const secretKey =
  value(
    "SUPABASE_SECRET_KEY",
  );

if (
  publishableKey &&
  secretKey &&
  publishableKey ===
    secretKey
) {
  errors.push(
    "SUPABASE_SECRET_KEY i NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY mają tę samą wartość.",
  );
}

if (
  process.env
    .NEXT_PUBLIC_SUPABASE_SECRET_KEY
) {
  errors.push(
    "Wykryto NEXT_PUBLIC_SUPABASE_SECRET_KEY. Sekret Supabase nigdy nie może być publiczny.",
  );
}

if (
  process.env
    .NEXT_PUBLIC_CLICK_HASH_SECRET
) {
  errors.push(
    "Wykryto NEXT_PUBLIC_CLICK_HASH_SECRET. CLICK_HASH_SECRET musi pozostać wyłącznie po stronie serwera.",
  );
}

const clickSecret =
  value(
    "CLICK_HASH_SECRET",
  );

if (
  clickSecret &&
  clickSecret.length <
    32
) {
  errors.push(
    "CLICK_HASH_SECRET jest zbyt krótki. Użyj przynajmniej 32 znaków losowej wartości.",
  );
}

const adminEmails =
  value(
    "ADMIN_EMAILS",
  )
    .split(
      /[\s,;]+/,
    )
    .map(
      (item) =>
        item.trim(),
    )
    .filter(Boolean);

if (
  adminEmails.length ===
    0
) {
  errors.push(
    "ADMIN_EMAILS nie zawiera żadnego administratora.",
  );
}

for (
  const email of adminEmails
) {
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    errors.push(
      `ADMIN_EMAILS zawiera nieprawidłowy adres: ${email}`,
    );
  }
}

const poolMax =
  value(
    "DB_POOL_MAX",
  );

if (poolMax) {
  const parsed =
    Number(
      poolMax,
    );

  if (
    !Number.isInteger(
      parsed,
    ) ||
    parsed < 1 ||
    parsed > 50
  ) {
    errors.push(
      "DB_POOL_MAX musi być liczbą całkowitą od 1 do 50.",
    );
  }
} else {
  warnings.push(
    "DB_POOL_MAX nie jest ustawione. Aplikacja użyje wartości domyślnej.",
  );
}

console.log(
  "",
);

console.log(
  "Narzivo — production environment check",
);

console.log(
  "======================================",
);

if (
  warnings.length >
  0
) {
  console.log(
    "",
  );

  console.log(
    "OSTRZEŻENIA:",
  );

  for (
    const warning of warnings
  ) {
    console.log(
      `- ${warning}`,
    );
  }
}

if (
  errors.length >
  0
) {
  console.log(
    "",
  );

  console.error(
    "BŁĘDY:",
  );

  for (
    const error of errors
  ) {
    console.error(
      `- ${error}`,
    );
  }

  console.log(
    "",
  );

  console.error(
    `Kontrola zakończona niepowodzeniem: ${errors.length} błędów.`,
  );

  process.exit(
    1,
  );
}

console.log(
  "",
);

console.log(
  "✓ Wszystkie wymagane zmienne produkcyjne przeszły kontrolę.",
);

console.log(
  "✓ Sekrety nie zostały wypisane do konsoli.",
);

console.log(
  "",
);