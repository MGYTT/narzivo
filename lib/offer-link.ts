type OfferLinkInput = {
  id: string;

  affiliateUrl:
    | string
    | null;

  sourceUrl: string;
};

export function getOfferOutboundLink(
  offer: OfferLinkInput,
) {
  const isAffiliate =
    Boolean(
      offer.affiliateUrl,
    );

  if (isAffiliate) {
    return {
      href:
        `/go/${offer.id}`,

      isAffiliate:
        true,

      rel:
        "sponsored nofollow noopener noreferrer",

      label:
        "Sprawdź ofertę",

      disclosure:
        "Materiał reklamowy · link afiliacyjny",
    } as const;
  }

  return {
    href:
      offer.sourceUrl,

    isAffiliate:
      false,

    rel:
      "noopener noreferrer",

    label:
      "Strona dostawcy",

    disclosure:
      "Link do oficjalnej strony dostawcy",
  } as const;
}