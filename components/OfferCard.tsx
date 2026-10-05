import Link from "next/link";

import {
  formatMoney,
  periodLabel,
  polishDate,
} from "@/lib/format";

import {
  getOfferOutboundLink,
} from "@/lib/offer-link";

import {
  isOfferActiveAt,
} from "@/lib/offer-validity";

type OfferCardOffer = {
  id: string;
  slug: string;
  name: string;
  summary: string;

  priceAmount:
    unknown;

  regularPrice:
    unknown;

  currency: string;
  billingPeriod: string;

  billingLabel:
    | string
    | null;

  editorScore:
    unknown;

  affiliateUrl:
    | string
    | null;

  sourceUrl: string;

  validFrom?:
    | Date
    | null;

  validTo?:
    | Date
    | null;

  lastVerifiedAt:
    Date;

  provider: {
    name: string;

    logoUrl:
      | string
      | null;
  };

  category: {
    name: string;
    slug: string;
  };
};

export function OfferCard({
  offer,
}: {
  offer:
    OfferCardOffer;
}) {
  if (
    !isOfferActiveAt({
      validFrom:
        offer.validFrom ??
        null,

      validTo:
        offer.validTo ??
        null,
    })
  ) {
    return null;
  }

  const price =
    formatMoney(
      offer.priceAmount,
      offer.currency,
    );

  const regularPrice =
    formatMoney(
      offer.regularPrice,
      offer.currency,
    );

  const score =
    offer.editorScore !==
      null &&
    offer.editorScore !==
      undefined
      ? Number(
          offer.editorScore,
        )
      : null;

  const outbound =
    getOfferOutboundLink(
      offer,
    );

  const initials =
    offer.provider.name
      .split(/\s+/)
      .filter(Boolean)
      .map(
        (part) =>
          part.charAt(0),
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <article className="group flex min-h-full flex-col overflow-hidden rounded-[18px] border border-[#e7e9ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(16,24,40,0.08)]">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[12px] border border-[#e7e9ee] bg-white">
              {offer.provider.logoUrl ? (
                <img
                  src={
                    offer.provider.logoUrl
                  }
                  alt={`Logo ${offer.provider.name}`}
                  loading="lazy"
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <span className="text-xs font-bold text-[#475467]">
                  {initials}
                </span>
              )}
            </div>

            <div>
              <div className="text-[13px] font-semibold text-[#344054]">
                {
                  offer.provider.name
                }
              </div>

              <Link
                href={`/kategorie/${offer.category.slug}`}
                className="mt-1 block text-[11px] text-[#98a2b3]"
              >
                {
                  offer.category.name
                }
              </Link>
            </div>
          </div>

          {score !==
          null ? (
            <span className="rounded-full bg-[#f2f1ff] px-2.5 py-1 text-[11px] font-bold text-[#5048d8]">
              {score.toFixed(
                1,
              )}
              /10
            </span>
          ) : null}
        </div>

        <Link
          href={`/uslugi/${offer.slug}`}
          className="mt-6"
        >
          <h3 className="text-[20px] font-[700] tracking-[-0.028em] group-hover:text-[#5048d8]">
            {offer.name}
          </h3>
        </Link>

        <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-[#667085]">
          {
            offer.summary
          }
        </p>

        <div className="mt-6 border-t border-[#edf0f3] pt-5">
          {regularPrice ? (
            <div className="text-[11px] text-[#98a2b3] line-through">
              {
                regularPrice
              }
            </div>
          ) : null}

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[27px] font-[730] tracking-[-0.04em]">
              {price ??
                "Cena indywidualna"}
            </span>

            <span className="text-[11px] text-[#98a2b3]">
              {periodLabel(
                offer.billingPeriod,
                offer.billingLabel,
              )}
            </span>
          </div>

          <div className="mt-3 text-[10px] text-[#98a2b3]">
            Zweryfikowano{" "}
            {polishDate(
              offer.lastVerifiedAt,
            )}
          </div>
        </div>

        <div className="mt-auto pt-6">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/uslugi/${offer.slug}`}
              className="btn btn-secondary"
            >
              Szczegóły
            </Link>

            <a
              href={
                outbound.href
              }
              target="_blank"
              rel={
                outbound.rel
              }
              className="btn btn-primary"
            >
              {
                outbound.label
              }

              <span>
                ↗
              </span>
            </a>
          </div>

          <Link
            href={`/porownaj?oferty=${offer.id}`}
            className="mt-2 flex w-full justify-center rounded-[10px] px-4 py-2.5 text-[12px] font-semibold text-[#5048d8] hover:bg-[#f5f4ff]"
          >
            + Dodaj do porównania
          </Link>
        </div>
      </div>

      <div className="border-t border-[#f0f1f3] bg-[#fafbfc] px-5 py-3 text-[9px] text-[#98a2b3]">
        {
          outbound.disclosure
        }
      </div>
    </article>
  );
}