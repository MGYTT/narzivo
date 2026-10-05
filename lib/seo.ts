export function seoDescription(
  value: string,
  maxLength = 160,
) {
  const normalized =
    value
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  if (
    normalized.length <=
    maxLength
  ) {
    return normalized;
  }

  return `${normalized
    .slice(
      0,
      maxLength - 1,
    )
    .trimEnd()}…`;
}

export function safeJsonLd(
  value: unknown,
) {
  return JSON.stringify(
    value,
  ).replace(
    /</g,
    "\\u003c",
  );
}