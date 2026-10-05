import {
  ImageResponse,
} from "next/og";

export const alt =
  "Narzivo — porównywarka usług cyfrowych";

export const size = {
  width:
    1200,

  height:
    630,
};

export const contentType =
  "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width:
            "100%",

          height:
            "100%",

          display:
            "flex",

          flexDirection:
            "column",

          justifyContent:
            "space-between",

          background:
            "#101114",

          color:
            "#ffffff",

          padding:
            "72px",
        }}
      >
        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "18px",
          }}
        >
          <div
            style={{
              width:
                "64px",

              height:
                "64px",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              background:
                "#635bff",

              borderRadius:
                "18px",

              fontSize:
                "34px",

              fontWeight:
                800,
            }}
          >
            N
          </div>

          <div
            style={{
              fontSize:
                "32px",

              fontWeight:
                750,

              letterSpacing:
                "-0.04em",
            }}
          >
            Narzivo
          </div>
        </div>

        <div
          style={{
            display:
              "flex",

            flexDirection:
              "column",

            maxWidth:
              "940px",
          }}
        >
          <div
            style={{
              display:
                "flex",

              color:
                "#aaa6ff",

              fontSize:
                "21px",

              fontWeight:
                700,

              textTransform:
                "uppercase",

              letterSpacing:
                "0.07em",
            }}
          >
            Transparentne porównanie
          </div>

          <div
            style={{
              display:
                "flex",

              marginTop:
                "24px",

              fontSize:
                "74px",

              fontWeight:
                760,

              lineHeight:
                0.98,

              letterSpacing:
                "-0.055em",
            }}
          >
            Usługi cyfrowe.
            Zweryfikowane dane.
          </div>
        </div>

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            borderTop:
              "1px solid #303239",

            paddingTop:
              "28px",

            fontSize:
              "19px",

            color:
              "#aeb4c0",
          }}
        >
          <div
            style={{
              display:
                "flex",
            }}
          >
            Oceny niezależne od prowizji afiliacyjnej
          </div>

          <div
            style={{
              display:
                "flex",

              color:
                "#ffffff",

              fontWeight:
                700,
            }}
          >
            narzivo.pl
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}