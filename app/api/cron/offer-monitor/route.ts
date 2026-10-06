import {
  scanOffersForChanges,
} from "@/lib/offer-monitor";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

export async function GET(
  request: Request,
) {
  const secret =
    process.env
      .CRON_SECRET;

  if (!secret) {
    return Response.json(
      {
        ok:
          false,

        error:
          "CRON_SECRET is not configured.",
      },
      {
        status:
          503,
      },
    );
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    authorization !==
    `Bearer ${secret}`
  ) {
    return Response.json(
      {
        ok:
          false,
      },
      {
        status:
          401,
      },
    );
  }

  const result =
    await scanOffersForChanges(
      10,
    );

  return Response.json({
    ok:
      true,

    ...result,
  });
}