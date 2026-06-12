# Iteracion 2C - Operacion local segura

## Arranque local

Comando:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local-start.ps1
```

Valida y/o levanta:
- MariaDB local en 3307
- API PHP en 8083
- Healthcheck DB y API
- Variables minimas en `.env.local`

Resultado esperado:
- `LOCAL_START_OK`

## Smoke Gate B

Comando:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/gate-b-smoke.ps1
```

Cubre:
- B1 (simples/carrito con y sin QA10, y comision)
- B2 (resume, reintento/idempotencia, bloqueo pagado)
- B3 (aliases de estado)
- E2E minimo en `pedido`

Resultado esperado:
- `GATE_B_OK`
- o `GATE_B_KO`

## Smoke web (sitemap + rutas criticas)

Comando:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/qa/smoke-web.ps1
```

Opcional (incluye endpoints API):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/qa/smoke-web.ps1 -IncludeApiRoutes
```

Cubre:
- Todas las URLs de `sitemap.xml`
- Rutas criticas del flujo (`/`, `cuenta`, `checkout`, `pago`, `pedido`, `admin`)
- Assets criticos (`asset-version`, `index-head`, `index.js`, `products.js`)

Resultado esperado:
- `SMOKE_WEB_OK`

## QA aislado

Archivos QA movidos a:
- `scripts/qa/gateB_runtime_legacy.ps1`
- `scripts/qa/seed_alias_orders.sql`
- `scripts/qa/mariadb-local.cnf`

Estos archivos no forman parte de rutas publicas web ni del deploy de produccion.
