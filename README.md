# Seguranza — Fase A

Plataforma de custodia neutral de garantías de arriendo (Chile). Fase A: demo
funcional en modo simulado — sin plata real, sin custodio real, sin firma
electrónica real. El esquema, el ledger contable y las políticas de
seguridad están construidos igual de en serio que si fueran producción.

## Stack

- Next.js (App Router) + shadcn/ui
- Supabase (Postgres + Auth + RLS + Storage)
- Migraciones SQL versionadas en `supabase/migrations/` — nunca aplicadas por dashboard

## Principio rector

Seguranza es un libro mayor, no un banco. La plata nunca vive en esta
infraestructura; la base de datos guarda el **registro** de lo que el
custodio (por ahora simulado) tiene. Ver `ledger_entries` — asientos de
doble entrada, insert-only, inmutables.

## Setup local

```bash
npm install
cp .env.example .env.local   # completar con las credenciales del proyecto Supabase

npx supabase start           # levanta Postgres + Auth + Storage locales (requiere Docker)
npx supabase db reset        # aplica todas las migraciones desde cero

npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). El login local no
requiere confirmación de email (`auth.email.enable_confirmations = false`
en `supabase/config.toml`), así que registrarse y entrar es inmediato.

## Tests de RLS (pgTAP)

```bash
npx supabase test db
```

Corre automáticamente en CI (`.github/workflows/db-tests.yml`) contra
cualquier PR que toque `supabase/**`. **Pendiente**: configurar esta
verificación como *required check* en la protección de la rama `main` en
GitHub (Settings → Branches) — no se puede hacer desde este repo, requiere
acceso de administrador en `segur01/Seguranza01`.

## Adaptadores externos (aislados, reemplazables)

Todo lo que en Fase A es un mock vive en un módulo aislado con una interfaz
clara, para que reemplazarlo por el proveedor real no toque el resto del
sistema:

| Concepto | Adaptador TS | Fuente de verdad real (usada por la app) |
|---|---|---|
| Valor UF | `src/lib/adapters/uf-rate/` | `get_uf_rate()` en Postgres (única fuente que se congela en `contracts.uf_rate_at_signing`) |
| Firma electrónica | `src/lib/adapters/signature/` | `sign_contract()` en Postgres |
| Screening arrendatario (Equifax/SII) | `src/lib/adapters/screening/` | — (sin integración real todavía) |

## Operaciones sensibles

Las siguientes operaciones **solo** existen como funciones de Postgres
`SECURITY DEFINER` (nunca un `UPDATE`/`INSERT` directo desde el cliente),
cada una escribe su `ledger_entry` y su `audit_log` en la misma transacción:

- `pay_guarantee(guarantee_id, actor_user_id)`
- `accept_proposal(proposal_id, actor_user_id)`
- `sign_contract(contract_id, actor_user_id)`
- `update_repair_price(repair_reference_id, unit_price)`

## No implementado todavía (fast-follow)

Custodio real, firma real, integración real a Equifax/SII, Salud de la
Propiedad, Mantenciones.
