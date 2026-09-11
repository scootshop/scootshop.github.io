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

Cubre (revisado el 11 sep 2026):
- B1 (tarifa y comision) — HOY SE OMITE: `order_pricing_preview` responde
  `503 feature_disabled` con `DISCOUNTS_ENABLED=false`, que es el valor por defecto
- B2 (pedido): que `orders_create` sigue retirada (410), que sin direccion no se crea
  pedido y que reanudar uno inexistente no inventa otro
- B3 (aliases de estado)
- E2E minimo en `pedido`: lo cubre `scripts/qa/pedido-e2e.js`, aparte

SOLO CORRE EN LOCAL: crea pedidos, asi que se niega a apuntar a otra cosa que no sea
127.0.0.1 o localhost.

Resultado esperado, y son CUATRO:
- `GATE_B_OK`       todo lo que se podia comprobar, comprobado y correcto
- `GATE_B_KO`       algo del flujo de compra falla (salida 1)
- `GATE_B_PARCIAL`  hay comprobaciones que NO se han podido ejecutar (salida 2)
- `GATE_B_OMITIDO`  no hay entorno local en absoluto (salida 2)

Una omitida NO es un aprobado. Sin el entorno levantado y sin claves de pasarela, la
mayor parte de B1 y B2 se omite, y eso es justo lo que el marcador dice.

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
