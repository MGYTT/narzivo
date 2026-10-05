import {
  ImageResponse,
} from "next/og";

export const size = {
  width:
    180,

  height:
    180,
};

export const contentType =
  "image/png";

export default function AppleIcon() {
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

          alignItems:
            "center",

          justifyContent:
            "center",

          background:
            "#101114",

          borderRadius:
            "38px",
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
              "126px",

            height:
              "126px",

            borderRadius:
              "31px",

            background:
              "#635bff",

            color:
              "#ffffff",

            fontSize:
              "86px",

            fontWeight:
              800,

            letterSpacing:
              "-0.1em",

            paddingRight:
              "8px",
          }}
        >
          N
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}