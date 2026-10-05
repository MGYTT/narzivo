const TIME_ZONE =
  "Europe/Warsaw";

const INPUT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function getOffsetMinutes(
  date: Date,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          TIME_ZONE,

        timeZoneName:
          "shortOffset",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hourCycle:
          "h23",
      },
    ).formatToParts(
      date,
    );

  const zone =
    parts.find(
      (part) =>
        part.type ===
        "timeZoneName",
    )?.value;

  if (
    !zone ||
    zone === "GMT"
  ) {
    return 0;
  }

  const match =
    zone.match(
      /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/,
    );

  if (!match) {
    throw new Error(
      "Nie udało się ustalić strefy czasowej Europe/Warsaw.",
    );
  }

  const sign =
    match[1] === "+"
      ? 1
      : -1;

  const hours =
    Number(
      match[2],
    );

  const minutes =
    Number(
      match[3] ??
        "0",
    );

  return (
    sign *
    (
      hours *
        60 +
      minutes
    )
  );
}

export function formatWarsawDateTimeInput(
  value:
    | Date
    | null
    | undefined,
) {
  if (!value) {
    return "";
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          TIME_ZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hourCycle:
          "h23",
      },
    ).formatToParts(
      value,
    );

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ],
      ),
    );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function parseWarsawDateTimeInput(
  value: string,
) {
  const match =
    value.match(
      INPUT_PATTERN,
    );

  if (!match) {
    throw new Error(
      "Nieprawidłowa data i godzina.",
    );
  }

  const [
    ,
    yearRaw,
    monthRaw,
    dayRaw,
    hourRaw,
    minuteRaw,
  ] =
    match;

  const year =
    Number(
      yearRaw,
    );

  const month =
    Number(
      monthRaw,
    );

  const day =
    Number(
      dayRaw,
    );

  const hour =
    Number(
      hourRaw,
    );

  const minute =
    Number(
      minuteRaw,
    );

  const localAsUtc =
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
    );

  /*
   * Pierwsze przybliżenie,
   * potem druga iteracja uwzględnia
   * zmianę CET/CEST.
   */
  let candidate =
    new Date(
      localAsUtc,
    );

  let offset =
    getOffsetMinutes(
      candidate,
    );

  candidate =
    new Date(
      localAsUtc -
        offset *
          60_000,
    );

  offset =
    getOffsetMinutes(
      candidate,
    );

  const result =
    new Date(
      localAsUtc -
        offset *
          60_000,
    );

  /*
   * Chroni również przed
   * nieistniejącymi godzinami
   * podczas zmiany czasu.
   */
  if (
    formatWarsawDateTimeInput(
      result,
    ) !== value
  ) {
    throw new Error(
      "Ta godzina nie istnieje albo jest niejednoznaczna w strefie Europe/Warsaw.",
    );
  }

  return result;
}