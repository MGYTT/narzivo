import "server-only";

function normalizedAdminEmails() {
  return new Set(
    (
      process.env.ADMIN_EMAILS ??
      ""
    )
      .split(
        /[\s,;]+/,
      )
      .map(
        (email) =>
          email
            .trim()
            .toLowerCase(),
      )
      .filter(Boolean),
  );
}

export function isAllowedAdminEmail(
  email:
    | string
    | null
    | undefined,
) {
  if (!email) {
    return false;
  }

  return normalizedAdminEmails().has(
    email
      .trim()
      .toLowerCase(),
  );
}