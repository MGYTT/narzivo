"use client";

import {
  useEffect,
} from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error:
    Error & {
      digest?: string;
    };

  reset:
    () => void;
}) {
  useEffect(() => {
    console.error(
      "Narzivo global error:",
      error,
    );
  }, [
    error,
  ]);

  return (
    <html lang="pl">
      <body
        style={{
          margin: 0,
          fontFamily:
            "Arial, sans-serif",
          background:
            "#ffffff",
          color:
            "#101114",
        }}
      >
        <main
          style={{
            minHeight:
              "100vh",
            display:
              "grid",
            placeItems:
              "center",
            padding:
              "32px",
          }}
        >
          <div
            style={{
              width:
                "100%",
              maxWidth:
                "560px",
              textAlign:
                "center",
            }}
          >
            <div
              style={{
                width:
                  "56px",
                height:
                  "56px",
                margin:
                  "0 auto",
                borderRadius:
                  "16px",
                display:
                  "grid",
                placeItems:
                  "center",
                background:
                  "#fff1f0",
                color:
                  "#b42318",
                fontWeight:
                  800,
              }}
            >
              !
            </div>

            <h1
              style={{
                margin:
                  "28px 0 0",
                fontSize:
                  "clamp(36px, 7vw, 64px)",
                lineHeight:
                  1,
                letterSpacing:
                  "-0.05em",
              }}
            >
              Narzivo napotkało
              błąd.
            </h1>

            <p
              style={{
                margin:
                  "24px auto 0",
                maxWidth:
                  "480px",
                lineHeight:
                  1.7,
                color:
                  "#667085",
              }}
            >
              Nie udało się
              poprawnie załadować
              aplikacji. Spróbuj
              ponownie.
            </p>

            <button
              type="button"
              onClick={() =>
                reset()
              }
              style={{
                marginTop:
                  "28px",
                border:
                  0,
                borderRadius:
                  "10px",
                padding:
                  "12px 18px",
                background:
                  "#635bff",
                color:
                  "#ffffff",
                fontWeight:
                  700,
                cursor:
                  "pointer",
              }}
            >
              Spróbuj ponownie
            </button>

            {error.digest ? (
              <div
                style={{
                  marginTop:
                    "20px",
                  fontSize:
                    "11px",
                  color:
                    "#98a2b3",
                }}
              >
                Identyfikator błędu:{" "}
                {
                  error.digest
                }
              </div>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}