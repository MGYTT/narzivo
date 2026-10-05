import {
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status:
        "ok",

      service:
        "narzivo",

      timestamp:
        new Date()
          .toISOString(),
    },
    {
      status:
        200,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",

        "X-Robots-Tag":
          "noindex, nofollow, noarchive",
      },
    },
  );
}