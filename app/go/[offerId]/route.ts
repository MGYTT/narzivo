import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  isOfferActiveAt,
} from "@/lib/offer-validity";

import {
  getClientIp,
  hashIp,
  hashUserAgent,
  sanitizeReferrer,
  shouldTrackClick,
} from "@/lib/tracking";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const TRACKING_WINDOW_MS =
  60 * 1000;

const MAX_TRACKED_CLICKS_PER_WINDOW =
  20;

function responseHeaders() {
  return {
    "Cache-Control":
      "private, no-store, max-age=0",

    "X-Robots-Tag":
      "noindex, nofollow, noarchive, nosnippet",
  };
}

function destinationUrl(
  value: string,
) {
  try {
    const url =
      new URL(
        value,
      );

    if (
      url.protocol !==
        "http:" &&
      url.protocol !==
        "https:"
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export async function GET(
  request:
    NextRequest,

  context: {
    params:
      Promise<{
        offerId: string;
      }>;
  },
) {
  const {
    offerId,
  } =
    await context.params;

  if (
    !offerId ||
    offerId.length >
      128
  ) {
    return new NextResponse(
      "Nie znaleziono oferty.",
      {
        status:
          404,

        headers:
          responseHeaders(),
      },
    );
  }

  const offer =
    await prisma.offer.findUnique({
      where: {
        id:
          offerId,
      },

      select: {
        id:
          true,

        affiliateUrl:
          true,

        sourceUrl:
          true,

        isPublished:
          true,

        validFrom:
          true,

        validTo:
          true,

        provider: {
          select: {
            isPublished:
              true,
          },
        },

        category: {
          select: {
            isPublished:
              true,
          },
        },
      },
    });

  if (
    !offer ||
    !offer.isPublished ||
    !offer.provider
      .isPublished ||
    !offer.category
      .isPublished ||
    !isOfferActiveAt(
      offer,
    )
  ) {
    return new NextResponse(
      "Oferta nie jest obecnie dostępna.",
      {
        status:
          404,

        headers:
          responseHeaders(),
      },
    );
  }

  const isAffiliate =
    Boolean(
      offer.affiliateUrl,
    );

  const destination =
    destinationUrl(
      offer.affiliateUrl ??
        offer.sourceUrl,
    );

  if (!destination) {
    return new NextResponse(
      "Nieprawidłowy adres docelowy.",
      {
        status:
          500,

        headers:
          responseHeaders(),
      },
    );
  }

  if (
    isAffiliate &&
    shouldTrackClick(
      request.headers,
    )
  ) {
    try {
      const now =
        new Date();

      const ipHash =
        hashIp(
          getClientIp(
            request.headers,
          ),
          now,
        );

      const userAgentHash =
        hashUserAgent(
          request.headers.get(
            "user-agent",
          ),
          now,
        );

      let limited =
        false;

      if (ipHash) {
        const recent =
          await prisma.affiliateClick.count({
            where: {
              ipHash,

              createdAt: {
                gte:
                  new Date(
                    now.getTime() -
                      TRACKING_WINDOW_MS,
                  ),
              },
            },
          });

        limited =
          recent >=
          MAX_TRACKED_CLICKS_PER_WINDOW;
      }

      if (!limited) {
        await prisma.affiliateClick.create({
          data: {
            offerId:
              offer.id,

            ipHash,

            userAgentHash,

            referrer:
              sanitizeReferrer(
                request.headers.get(
                  "referer",
                ),
              ),
          },
        });
      }
    } catch (
      error
    ) {
      console.error(
        "Błąd zapisu kliknięcia afiliacyjnego:",
        error,
      );
    }
  }

  return NextResponse.redirect(
    destination,
    {
      status:
        302,

      headers:
        responseHeaders(),
    },
  );
}