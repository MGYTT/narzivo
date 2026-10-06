"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  requireAdmin,
} from "@/lib/auth";

import {
  approveOfferChange,
  rejectOfferChange,
  scanOffersForChanges,
} from "@/lib/offer-monitor";

function stringValue(
  value:
    FormDataEntryValue
    | null,
) {
  return String(
    value ?? "",
  ).trim();
}

function revalidate() {
  revalidatePath(
    "/",
  );

  revalidatePath(
    "/admin",
  );

  revalidatePath(
    "/admin/oferty",
  );

  revalidatePath(
    "/admin/oceny",
  );

  revalidatePath(
    "/admin/zmiany",
  );

  revalidatePath(
    "/kategorie/[slug]",
    "page",
  );

  revalidatePath(
    "/uslugi/[slug]",
    "page",
  );
}

export async function scanOffersNow() {
  await requireAdmin();

  const result =
    await scanOffersForChanges(
      20,
    );

  revalidate();

  const params =
    new URLSearchParams({
      scanned:
        String(
          result.checked,
        ),

      changed:
        String(
          result.changed,
        ),

      unchanged:
        String(
          result.unchanged,
        ),

      failed:
        String(
          result.failed,
        ),
    });

  redirect(
    `/admin/zmiany?${params.toString()}`,
  );
}

export async function approveChange(
  formData:
    FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get(
        "id",
      ),
    );

  if (!id) {
    redirect(
      "/admin/zmiany",
    );
  }

  await approveOfferChange(
    id,
  );

  revalidate();

  redirect(
    "/admin/zmiany?approved=1",
  );
}

export async function rejectChange(
  formData:
    FormData,
) {
  await requireAdmin();

  const id =
    stringValue(
      formData.get(
        "id",
      ),
    );

  if (!id) {
    redirect(
      "/admin/zmiany",
    );
  }

  await rejectOfferChange(
    id,
  );

  revalidate();

  redirect(
    "/admin/zmiany?rejected=1",
  );
}