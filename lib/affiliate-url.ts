import "server-only";

type Input = {
  providerSlug: string;
  accountReference:
    | string
    | null
    | undefined;
  sourceUrl: string;
};

export function generateAffiliateUrl({
  providerSlug,
  accountReference,
  sourceUrl,
}: Input) {
  const reference =
    accountReference?.trim();

  if (!reference) {
    return null;
  }

  switch (providerSlug) {
    case "dhosting-pl":
      return `https://dhosting.pl?pp=${encodeURIComponent(
        reference,
      )}`;

    case "nazwa-pl":
      return `https://www.nazwa.pl/pp/${encodeURIComponent(
        reference,
      )}`;

    case "lh-pl": {
      try {
        const url =
          new URL(
            sourceUrl,
          );

        const hostname =
          url.hostname
            .toLowerCase()
            .replace(
              /^www\./,
              "",
            );

        /*
         * LH.pl obsługuje deep-link
         * przez parametr ref.
         *
         * Zachowujemy ścieżkę produktu:
         * /hosting
         * /domeny
         * /certyfikaty-ssl
         * /cloud-server
         * itd.
         */
        if (
          hostname ===
          "lh.pl"
        ) {
          url.searchParams.set(
            "ref",
            reference,
          );

          return url.toString();
        }
      } catch {
        // fallback poniżej
      }

      return `https://www.lh.pl?ref=${encodeURIComponent(
        reference,
      )}`;
    }

    default:
      /*
       * Dla nieznanego dostawcy
       * niczego nie wymyślamy.
       */
      return null;
  }
}