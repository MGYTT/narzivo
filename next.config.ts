import type {
  NextConfig,
} from "next";

const isDev =
  process.env.NODE_ENV ===
  "development";

function getSupabaseOrigins() {
  const raw =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL
      ?.trim();

  if (!raw) {
    return {
      http: "",
      ws: "",
    };
  }

  try {
    const url =
      new URL(raw);

    const wsProtocol =
      url.protocol ===
      "https:"
        ? "wss:"
        : "ws:";

    return {
      http:
        url.origin,

      ws:
        `${wsProtocol}//${url.host}`,
    };
  } catch {
    return {
      http: "",
      ws: "",
    };
  }
}

const supabase =
  getSupabaseOrigins();

const connectSources = [
  "'self'",

  supabase.http,
  supabase.ws,

  ...(isDev
    ? [
        "ws:",
        "http:",
        "https:",
      ]
    : []),
]
  .filter(Boolean)
  .join(" ");

const imageSources = [
  "'self'",
  "data:",
  "blob:",
  supabase.http,
]
  .filter(Boolean)
  .join(" ");

const csp = [
  "default-src 'self'",

  `script-src 'self' 'unsafe-inline'${
    isDev
      ? " 'unsafe-eval'"
      : ""
  }`,

  "script-src-attr 'none'",

  "style-src 'self' 'unsafe-inline'",

  `img-src ${imageSources}`,

  "font-src 'self' data:",

  `connect-src ${connectSources}`,

  "media-src 'self'",

  "worker-src 'self' blob:",

  "manifest-src 'self'",

  "object-src 'none'",

  "base-uri 'self'",

  "form-action 'self'",

  "frame-ancestors 'none'",

  "frame-src 'none'",

  ...(isDev
    ? []
    : [
        "upgrade-insecure-requests",
      ]),
]
  .map(
    (directive) =>
      `${directive};`,
  )
  .join(" ");

const securityHeaders = [
  {
    key:
      "Content-Security-Policy",

    value:
      csp,
  },

  {
    key:
      "X-Content-Type-Options",

    value:
      "nosniff",
  },

  {
    key:
      "X-Frame-Options",

    value:
      "DENY",
  },

  {
    key:
      "Referrer-Policy",

    value:
      "strict-origin-when-cross-origin",
  },

  {
    key:
      "Permissions-Policy",

    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "serial=()",
      "browsing-topics=()",
    ].join(", "),
  },

  {
    key:
      "Cross-Origin-Opener-Policy",

    value:
      "same-origin-allow-popups",
  },

  {
    key:
      "Cross-Origin-Resource-Policy",

    value:
      "same-origin",
  },

  {
    key:
      "Origin-Agent-Cluster",

    value:
      "?1",
  },

  ...(!isDev
    ? [
        {
          key:
            "Strict-Transport-Security",

          value:
            "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig:
  NextConfig = {
  poweredByHeader:
    false,

  productionBrowserSourceMaps:
    false,

  /*
   * Pozwala na testowanie
   * developmentu z urządzenia
   * dostępnego przez LAN.
   *
   * Next.js oczekuje samego
   * hostname — bez protokołu
   * i bez portu.
   */
  allowedDevOrigins: [
    "192.168.1.27",
  ],

  experimental: {
    serverActions: {
      bodySizeLimit:
        "3mb",
    },
  },

  async headers() {
    return [
      {
        source:
          "/:path*",

        headers:
          securityHeaders,
      },

      {
        source:
          "/admin/:path*",

        headers: [
          {
            key:
              "Cache-Control",

            value:
              "private, no-store, max-age=0",
          },

          {
            key:
              "X-Robots-Tag",

            value:
              "noindex, nofollow, noarchive, nosnippet",
          },
        ],
      },

      {
        source:
          "/go/:path*",

        headers: [
          {
            key:
              "Cache-Control",

            value:
              "private, no-store, max-age=0",
          },

          {
            key:
              "X-Robots-Tag",

            value:
              "noindex, nofollow, noarchive, nosnippet",
          },
        ],
      },
    ];
  },
};

export default nextConfig;