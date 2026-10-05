import type {
  MetadataRoute,
} from "next";

export default function manifest():
  MetadataRoute.Manifest {
  return {
    name:
      "Narzivo — porównywarka usług cyfrowych",

    short_name:
      "Narzivo",

    description:
      "Porównuj usługi cyfrowe na podstawie zweryfikowanych danych, cen i transparentnej metodologii.",

    start_url:
      "/",

    scope:
      "/",

    display:
      "standalone",

    background_color:
      "#ffffff",

    theme_color:
      "#635bff",

    lang:
      "pl",

    categories: [
      "business",
      "productivity",
      "utilities",
    ],

    icons: [
      {
        src:
          "/icon",

        sizes:
          "512x512",

        type:
          "image/png",
      },

      {
        src:
          "/apple-icon",

        sizes:
          "180x180",

        type:
          "image/png",
      },
    ],
  };
}