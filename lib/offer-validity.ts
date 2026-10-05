import type {
  Prisma,
} from "@/generated/prisma/client";

export type OfferWindow = {
  validFrom:
    | Date
    | null;

  validTo:
    | Date
    | null;
};

export type OfferWindowStatus =
  | "ACTIVE"
  | "UPCOMING"
  | "EXPIRED";

export function activeOfferWindowWhere(
  now = new Date(),
): Prisma.OfferWhereInput {
  return {
    AND: [
      {
        OR: [
          {
            validFrom:
              null,
          },

          {
            validFrom: {
              lte:
                now,
            },
          },
        ],
      },

      {
        OR: [
          {
            validTo:
              null,
          },

          {
            validTo: {
              gte:
                now,
            },
          },
        ],
      },
    ],
  };
}

export function publicOfferWhere(
  now = new Date(),
): Prisma.OfferWhereInput {
  return {
    isPublished:
      true,

    provider: {
      isPublished:
        true,
    },

    category: {
      isPublished:
        true,
    },

    ...activeOfferWindowWhere(
      now,
    ),
  };
}

export function isOfferActiveAt(
  offer: OfferWindow,
  now = new Date(),
) {
  if (
    offer.validFrom &&
    offer.validFrom >
      now
  ) {
    return false;
  }

  if (
    offer.validTo &&
    offer.validTo <
      now
  ) {
    return false;
  }

  return true;
}

export function isPublicOfferAt(
  offer: OfferWindow & {
    isPublished: boolean;

    provider: {
      isPublished:
        boolean;
    };

    category: {
      isPublished:
        boolean;
    };
  },
  now = new Date(),
) {
  return (
    offer.isPublished &&
    offer.provider
      .isPublished &&
    offer.category
      .isPublished &&
    isOfferActiveAt(
      offer,
      now,
    )
  );
}

export function getOfferWindowStatus(
  offer: OfferWindow,
  now = new Date(),
): OfferWindowStatus {
  if (
    offer.validFrom &&
    offer.validFrom >
      now
  ) {
    return "UPCOMING";
  }

  if (
    offer.validTo &&
    offer.validTo <
      now
  ) {
    return "EXPIRED";
  }

  return "ACTIVE";
}