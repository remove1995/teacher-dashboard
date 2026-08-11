# Teacher Dashboard

Foundation for a responsive teacher-management application built with Next.js, TypeScript, Prisma, PostgreSQL, and Vitest.

## Local setup

1. Install a current Node.js LTS release and PostgreSQL.
2. Copy `.env.example` to `.env` and update `DATABASE_URL`.
3. Run `npm install`.
4. Run `npx prisma migrate dev`.
5. Run `npm run prisma:seed`.
6. Run `npm run dev`.

Validation commands:

```sh
npm run prisma:generate
npm run typecheck
npm test
npm run build
```

See `ARCHITECTURE.md` for model decisions and invariants. The current UI is intentionally a responsive application shell with route placeholders, not the full product.
