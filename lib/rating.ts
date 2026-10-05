import { prisma } from "@/lib/prisma";

export type OfferScoreState = {
  score: number | null;

  complete: boolean;

  criteriaCount: number;

  ratedCount: number;

  missingCount: number;

  totalWeight: number;
};

export async function getOfferScoreState(
  offerId: string,
): Promise<OfferScoreState> {
  const offer =
    await prisma.offer.findUnique({
      where: {
        id: offerId,
      },

      select: {
        id: true,
        categoryId: true,

        ratings: {
          select: {
            criterionId: true,
            score: true,
          },
        },
      },
    });

  if (!offer) {
    return {
      score: null,
      complete: false,
      criteriaCount: 0,
      ratedCount: 0,
      missingCount: 0,
      totalWeight: 0,
    };
  }

  const criteria =
    await prisma.ratingCriterion.findMany({
      where: {
        categoryId:
          offer.categoryId,

        isPublished:
          true,
      },

      select: {
        id: true,
        weight: true,
      },

      orderBy: {
        sortOrder: "asc",
      },
    });

  if (
    criteria.length === 0
  ) {
    return {
      score: null,
      complete: false,
      criteriaCount: 0,
      ratedCount: 0,
      missingCount: 0,
      totalWeight: 0,
    };
  }

  const ratings =
    new Map(
      offer.ratings.map(
        (rating) => [
          rating.criterionId,
          Number(
            rating.score,
          ),
        ],
      ),
    );

  let totalWeight =
    0;

  let weightedScore =
    0;

  let ratedCount =
    0;

  for (
    const criterion of criteria
  ) {
    const weight =
      Number(
        criterion.weight,
      );

    totalWeight +=
      weight;

    const score =
      ratings.get(
        criterion.id,
      );

    if (
      score ===
      undefined
    ) {
      continue;
    }

    ratedCount += 1;

    weightedScore +=
      score *
      weight;
  }

  const missingCount =
    criteria.length -
    ratedCount;

  const complete =
    missingCount === 0 &&
    totalWeight > 0;

  if (!complete) {
    return {
      score: null,
      complete: false,
      criteriaCount:
        criteria.length,
      ratedCount,
      missingCount,
      totalWeight,
    };
  }

  const rawScore =
    weightedScore /
    totalWeight;

  const score =
    Math.round(
      rawScore * 10,
    ) / 10;

  return {
    score,
    complete: true,
    criteriaCount:
      criteria.length,
    ratedCount,
    missingCount: 0,
    totalWeight,
  };
}

export async function recomputeOfferScore(
  offerId: string,
) {
  const state =
    await getOfferScoreState(
      offerId,
    );

  await prisma.offer.update({
    where: {
      id: offerId,
    },

    data: {
      editorScore:
        state.complete
          ? state.score
          : null,
    },
  });

  return state;
}

export async function recomputeCategoryScores(
  categoryId: string,
) {
  const offers =
    await prisma.offer.findMany({
      where: {
        categoryId,
      },

      select: {
        id: true,
      },
    });

  for (
    const offer of offers
  ) {
    await recomputeOfferScore(
      offer.id,
    );
  }
}