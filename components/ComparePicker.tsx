"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type PickerOffer = {
  id: string;
  name: string;

  provider: {
    name: string;
  };

  category: {
    id: string;
    name: string;
  };
};

type Props = {
  offers: PickerOffer[];
  initialSelected: string[];
};

const MAX_COMPARE =
  4;

export function ComparePicker({
  offers,
  initialSelected,
}: Props) {
  const router =
    useRouter();

  const [selected, setSelected] =
    useState<string[]>([
      initialSelected[0] ??
        "",
      initialSelected[1] ??
        "",
      initialSelected[2] ??
        "",
      initialSelected[3] ??
        "",
    ]);

  const offerMap =
    useMemo(
      () =>
        new Map(
          offers.map(
            (offer) => [
              offer.id,
              offer,
            ],
          ),
        ),
      [offers],
    );

  const selectedIds =
    useMemo(
      () =>
        selected.filter(
          Boolean,
        ),
      [selected],
    );

  const selectedCategoryId =
    useMemo(() => {
      for (
        const id of selected
      ) {
        if (!id) {
          continue;
        }

        const offer =
          offerMap.get(id);

        if (offer) {
          return offer
            .category.id;
        }
      }

      return null;
    }, [
      selected,
      offerMap,
    ]);

  const availableOffers =
    useMemo(() => {
      if (
        !selectedCategoryId
      ) {
        return offers;
      }

      return offers.filter(
        (offer) =>
          offer.category.id ===
          selectedCategoryId,
      );
    }, [
      offers,
      selectedCategoryId,
    ]);

  const selectedCategoryName =
    selectedCategoryId
      ? offers.find(
          (offer) =>
            offer.category.id ===
            selectedCategoryId,
        )?.category.name ??
        null
      : null;

  function updateSlot(
    index: number,
    value: string,
  ) {
    setSelected(
      (current) => {
        const next =
          [...current];

        next[index] =
          value;

        /*
         * Jeśli użytkownik zmienia
         * pierwszą ofertę na kategorię
         * inną niż pozostałe,
         * usuwamy niekompatybilne
         * pozycje.
         */
        if (value) {
          const chosen =
            offerMap.get(
              value,
            );

          if (chosen) {
            for (
              let i = 0;
              i <
              next.length;
              i++
            ) {
              const id =
                next[i];

              if (
                !id ||
                i === index
              ) {
                continue;
              }

              const other =
                offerMap.get(
                  id,
                );

              if (
                other &&
                other.category.id !==
                  chosen.category.id
              ) {
                next[i] =
                  "";
              }
            }
          }
        }

        return next;
      },
    );
  }

  function compare() {
    const unique =
      Array.from(
        new Set(
          selectedIds,
        ),
      );

    if (
      unique.length ===
      0
    ) {
      router.push(
        "/porownaj",
      );

      return;
    }

    router.push(
      `/porownaj?oferty=${encodeURIComponent(
        unique.join(","),
      )}`,
    );
  }

  function clear() {
    setSelected([
      "",
      "",
      "",
      "",
    ]);

    router.push(
      "/porownaj",
    );
  }

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#e7e9ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
      <div className="border-b border-[#eceef2] px-6 py-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-[680] tracking-[-0.02em]">
              Wybierz oferty
            </h2>

            <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
              Możesz zestawić
              maksymalnie{" "}
              {MAX_COMPARE}{" "}
              produkty z tej samej
              kategorii.
            </p>
          </div>

          {selectedCategoryName ? (
            <span className="rounded-full bg-[#f2f1ff] px-3 py-1.5 text-xs font-semibold text-[#5048d8]">
              {
                selectedCategoryName
              }
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length:
            MAX_COMPARE,
        }).map(
          (_, index) => (
            <label
              key={
                index
              }
            >
              <span className="label">
                Oferta{" "}
                {index +
                  1}
              </span>

              <select
                className="field"
                value={
                  selected[
                    index
                  ]
                }
                onChange={(
                  event,
                ) =>
                  updateSlot(
                    index,
                    event
                      .target
                      .value,
                  )
                }
              >
                <option value="">
                  —
                  wybierz —
                </option>

                {availableOffers.map(
                  (
                    offer,
                  ) => {
                    const duplicate =
                      selected.some(
                        (
                          id,
                          selectedIndex,
                        ) =>
                          selectedIndex !==
                            index &&
                          id ===
                            offer.id,
                      );

                    return (
                      <option
                        key={
                          offer.id
                        }
                        value={
                          offer.id
                        }
                        disabled={
                          duplicate
                        }
                      >
                        {
                          offer
                            .provider
                            .name
                        }{" "}
                        —{" "}
                        {
                          offer.name
                        }
                      </option>
                    );
                  },
                )}
              </select>
            </label>
          ),
        )}
      </div>

      <div className="flex flex-col justify-between gap-3 border-t border-[#eceef2] bg-[#fafbfc] px-6 py-4 sm:flex-row sm:items-center">
        <div className="text-xs text-[#98a2b3]">
          Wybrano:{" "}
          {
            new Set(
              selectedIds,
            ).size
          }
          /{MAX_COMPARE}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={
              clear
            }
            className="btn btn-secondary"
          >
            Wyczyść
          </button>

          <button
            type="button"
            onClick={
              compare
            }
            disabled={
              selectedIds.length ===
              0
            }
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Porównaj
            <span>
              →
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}