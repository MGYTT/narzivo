import "server-only";

import type {
  Prisma,
} from "@/generated/prisma/client";

type FeatureMap =
  Record<
    string,
    unknown
  >;

type Definition = {
  formName: string;
  key: string;
  aliases?: string[];
};

const DEFINITIONS:
  Definition[] = [
    {
      formName:
        "hosting_dysk",
      key:
        "dysk",
      aliases: [
        "dysk_bazowy",
      ],
    },

    {
      formName:
        "hosting_dysk_maksymalny",
      key:
        "dysk_maksymalny",
      aliases: [
        "maksymalny_dysk",
      ],
    },

    {
      formName:
        "hosting_technologia_dysku",
      key:
        "technologia_dysku",
    },

    {
      formName:
        "hosting_ram",
      key:
        "ram",
      aliases: [
        "ram_bazowy",
      ],
    },

    {
      formName:
        "hosting_ram_maksymalny",
      key:
        "ram_maksymalny",
    },

    {
      formName:
        "hosting_cpu",
      key:
        "cpu",
      aliases: [
        "cpu_bazowe",
        "cpu_gwarantowane",
      ],
    },

    {
      formName:
        "hosting_cpu_maksymalny",
      key:
        "cpu_maksymalny",
      aliases: [
        "cpu_maksymalne",
        "cpu_dynamiczne",
      ],
    },

    {
      formName:
        "hosting_transfer",
      key:
        "transfer",
    },

    {
      formName:
        "hosting_strony_www",
      key:
        "strony_www",
    },

    {
      formName:
        "hosting_konta_email",
      key:
        "konta_email",
    },

    {
      formName:
        "hosting_bazy_mysql",
      key:
        "bazy_mysql",
    },

    {
      formName:
        "hosting_konta_ftp",
      key:
        "konta_ftp",
    },

    {
      formName:
        "hosting_backup",
      key:
        "backup",
      aliases: [
        "backup_systemowy",
      ],
    },

    {
      formName:
        "hosting_php",
      key:
        "php",
    },

    {
      formName:
        "hosting_ssl",
      key:
        "ssl",
    },

    {
      formName:
        "hosting_ssh",
      key:
        "ssh",
    },

    {
      formName:
        "hosting_redis",
      key:
        "redis",
    },

    {
      formName:
        "hosting_http3",
      key:
        "http3",
    },

    {
      formName:
        "hosting_waf",
      key:
        "waf",
    },

    {
      formName:
        "hosting_antyddos",
      key:
        "antyddos",
      aliases: [
        "ochrona_ddos",
      ],
    },

    {
      formName:
        "hosting_migracja",
      key:
        "migracja",
    },

    {
      formName:
        "hosting_okres_testowy",
      key:
        "okres_testowy",
    },

    {
      formName:
        "hosting_lokalizacja",
      key:
        "lokalizacja",
    },

    {
      formName:
        "hosting_sla",
      key:
        "sla",
    },
  ];

function objectValue(
  value: unknown,
): FeatureMap {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return {
      ...(value as FeatureMap),
    };
  }

  return {};
}

function formString(
  formData: FormData,
  name: string,
) {
  return String(
    formData.get(
      name,
    ) ?? "",
  ).trim();
}

export function mergeHostingFeatures(
  original: unknown,
  formData: FormData,
): Prisma.InputJsonValue {
  const result =
    objectValue(
      original,
    );

  for (
    const definition of DEFINITIONS
  ) {
    const value =
      formString(
        formData,
        definition.formName,
      );

    /*
     * Puste pole nie niszczy
     * istniejącego parametru.
     *
     * Parametry można nadal
     * ręcznie usunąć w edytorze
     * JSON.
     */
    if (!value) {
      continue;
    }

    result[
      definition.key
    ] =
      value;

    /*
     * Gdy zapisujemy nowy,
     * kanoniczny klucz, usuwamy
     * jego stare aliasy.
     */
    for (
      const alias of
        definition.aliases ??
        []
    ) {
      delete result[
        alias
      ];
    }
  }

  return result as Prisma.InputJsonValue;
}

export function getHostingFeature(
  value: unknown,
  key: string,
) {
  const object =
    objectValue(
      value,
    );

  const definition =
    DEFINITIONS.find(
      (
        item,
      ) =>
        item.key ===
        key,
    );

  if (!definition) {
    const direct =
      object[key];

    return typeof direct ===
      "string"
      ? direct
      : "";
  }

  const keys = [
    definition.key,
    ...(definition.aliases ??
      []),
  ];

  for (
    const candidate of keys
  ) {
    const current =
      object[
        candidate
      ];

    if (
      typeof current ===
      "string" &&
      current.trim()
    ) {
      return current;
    }
  }

  return "";
}