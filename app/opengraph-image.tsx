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

export default function OpenGraphImage() {
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

          position:
            "relative",

          overflow:
            "hidden",

          background:
            "#ffffff",

          color:
            "#101114",

          padding:
            "70px",
        }}
      >
        <div
          style={{
            position:
              "absolute",

            display:
              "flex",

            width:
              "620px",

            height:
              "620px",

            borderRadius:
              "999px",

            background:
              "#efedff",

            top:
              "-360px",

            right:
              "-80px",
          }}
        />

        <div
          style={{
            position:
              "absolute",

            display:
              "flex",

            width:
              "340px",

            height:
              "340px",

            borderRadius:
              "999px",

            background:
              "#f7f6ff",

            bottom:
              "-220px",

            left:
              "340px",
          }}
        />

        <div
          style={{
            position:
              "relative",

            display:
              "flex",

            flexDirection:
              "column",

            justifyContent:
              "space-between",

            width:
              "100%",

            height:
              "100%",
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
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                width:
                  "64px",

                height:
                  "64px",

                borderRadius:
                  "18px",

                background:
                  "#101114",

                color:
                  "#ffffff",

                fontSize:
                  "35px",

                fontWeight:
                  800,
              }}
            >
              N
            </div>

            <div
              style={{
                display:
                  "flex",

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
                  "#635bff",

                fontSize:
                  "22px",

                fontWeight:
                  700,

                letterSpacing:
                  "0.06em",

                textTransform:
                  "uppercase",
              }}
            >
              Porównywarka usług cyfrowych
            </div>

            <div
              style={{
                display:
                  "flex",

                marginTop:
                  "24px",

                fontSize:
                  "72px",

                lineHeight:
                  0.98,

                fontWeight:
                  760,

                letterSpacing:
                  "-0.055em",
              }}
            >
              Wybieraj na podstawie danych, nie reklamy.
            </div>
          </div>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              borderTop:
                "1px solid #e7e9ee",

              paddingTop:
                "28px",

              color:
                "#667085",

              fontSize:
                "20px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
              }}
            >
              Ceny · parametry · metodologia
            </div>

            <div
              style={{
                display:
                  "flex",

                fontWeight:
                  700,

                color:
                  "#101114",
              }}
            >
              narzivo.pl
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}