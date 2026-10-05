import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Brak DATABASE_URL. Uzupełnij plik .env przed uruchomieniem db:seed."
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const categories = [
  [
    "Domeny",
    "domeny",
    "Rejestracja, odnowienia i transfer domen.",
    "◉",
    10,
  ],
  [
    "Hosting WWW",
    "hosting",
    "Hosting stron, WordPressa i sklepów internetowych.",
    "▣",
    20,
  ],
  [
    "VPS",
    "vps",
    "Wirtualne serwery prywatne do aplikacji, stron i usług.",
    "◇",
    30,
  ],
  [
    "Cloud",
    "cloud",
    "Usługi chmurowe, storage i infrastruktura skalowalna.",
    "☁",
    40,
  ],
  [
    "Poczta firmowa",
    "poczta-firmowa",
    "Skrzynki e-mail i pakiety pocztowe dla firm.",
    "✉",
    50,
  ],
  [
    "VPN i bezpieczeństwo",
    "bezpieczenstwo",
    "VPN, ochrona kont i narzędzia bezpieczeństwa.",
    "⌾",
    60,
  ],
  [
    "Strony i e-commerce",
    "strony-ecommerce",
    "Kreatory stron, sklepy i narzędzia sprzedażowe.",
    "◆",
    70,
  ],
  [
    "Marketing i SEO",
    "marketing-seo",
    "SEO, analityka, mailing i automatyzacje marketingowe.",
    "↗",
    80,
  ],
  [
    "AI i automatyzacje",
    "ai-automatyzacje",
    "Narzędzia AI i automatyzacje dla pracy oraz biznesu.",
    "✦",
    90,
  ],
  [
    "Narzędzia dla firm",
    "narzedzia-dla-firm",
    "CRM, faktury, księgowość i narzędzia operacyjne.",
    "▤",
    100,
  ],
] as const;

async function main() {
  for (const [name, slug, description, icon, sortOrder] of categories) {
    await prisma.category.upsert({
      where: {
        slug,
      },

      update: {
        name,
        description,
        icon,
        sortOrder,
        isPublished: true,
      },

      create: {
        name,
        slug,
        description,
        icon,
        sortOrder,
        isPublished: true,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error("Błąd seedowania bazy danych:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });