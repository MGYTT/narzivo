# Narzivo

Produkcyjny fundament serwisu afiliacyjno-porównawczego dla domen, hostingu, VPS, cloud i narzędzi cyfrowych.

## Zasada danych

Projekt **nie zawiera fikcyjnych ofert, providerów, cen ani linków afiliacyjnych**. Seed tworzy wyłącznie docelową taksonomię kategorii. Prawdziwe oferty wprowadza administrator dopiero po ich zweryfikowaniu i uzyskaniu właściwego linku partnerskiego.

## Stack

- Next.js 16.3.8 / React 19
- TypeScript
- Tailwind CSS 4.3
- PostgreSQL
- Prisma ORM 7.10 z `@prisma/adapter-pg`
- własna, podpisana sesja administratora (HttpOnly / SameSite=Strict)
- server-side affiliate redirect + prywatnościowe hashowanie IP/User-Agent

## Uruchomienie

1. `cp .env.example .env`
2. Uzupełnij `DATABASE_URL`, sekrety i dane operatora.
3. Wygeneruj hash hasła: `npm run admin:hash -- 'BARDZO_DŁUGIE_HASŁO'`
4. Wklej wynik do `ADMIN_PASSWORD_HASH`.
5. `npm install`
6. `npm run db:migrate -- --name init`
7. `npm run db:seed`
8. `npm run dev`

Panel: `/admin`

## Produkcyjne wdrożenie

- Wymagany PostgreSQL z TLS.
- W CI/CD: `npm ci`, `npm run db:deploy`, `npm run build`.
- Ustaw `NEXT_PUBLIC_SITE_URL` na właściwą domenę.
- Uzupełnij dane prawne operatora i zweryfikuj politykę prywatności/regulamin z prawnikiem zgodnie z realnym modelem działalności.
- Dodawaj wyłącznie faktyczne linki afiliacyjne z zaakceptowanych programów.
- Nie publikuj oferty bez źródła i daty weryfikacji.

## Co już działa

- strona główna i kategorie,
- szczegóły ofert,
- doradca filtrowania,
- porównanie ofert,
- transparentne oznaczenia afiliacyjne,
- redirect `/go/[offerId]` z pomiarem kliknięć,
- historia zmian ceny,
- sitemap/robots,
- metodologia i disclosure,
- panel administratora do dodawania kategorii, dostawców i ofert,
- zabezpieczona sesja administratora,
- security headers.

## Następne kroki przed publikacją

1. domena i DNS,
2. produkcyjna baza PostgreSQL,
3. konta afiliacyjne i zaakceptowane programy,
4. prawdziwe linki afiliacyjne i zweryfikowane warunki,
5. dane prawne operatora,
6. monitoring błędów / uptime i backup bazy.
