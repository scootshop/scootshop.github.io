# scripts/qa/variantes.ps1
#
# TODAS las comprobaciones del sistema de variantes, de una vez.
#
# Existe porque estas suites nacieron en carpetas temporales de una sesión y cada
# verificación posterior se hacía "a ojo". Lo que comprueba un guardián que nadie
# puede ejecutar es nada.
#
#   powershell -ExecutionPolicy Bypass -File scripts/qa/variantes.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/qa/variantes.ps1 -BaseUrl https://scootshop.co
#
# Marcador final: VARIANTES_OK / VARIANTES_KO.
param(
  [string]$BaseUrl = 'http://127.0.0.1:8000'
)

$ErrorActionPreference = 'Continue'
$qa = Split-Path -Parent $MyInvocation.MyCommand.Path
$raiz = Split-Path -Parent (Split-Path -Parent $qa)

# Datos y núcleo: no hace falta navegador y falla antes que nada si el catálogo miente.
$comprobaciones = @(
  @{ nombre = 'indice de atributos'; script = "$raiz\scripts\build-attributes-index.js"; args = @('--check') },
  @{ nombre = 'catalogo valido';     script = "$qa\catalogo.js";                        args = @() },
  @{ nombre = 'SQL de la API';       script = "$qa\api-sql.js";                         args = @() },
  @{ nombre = 'casos A-J';           script = "$qa\variantes-casos.js";                 args = @($BaseUrl) },
  @{ nombre = 'fichas multieje';     script = "$qa\variantes-multieje.js";              args = @($BaseUrl) },
  @{ nombre = 'flujo al carrito';    script = "$qa\variantes-flujo.js";                 args = @($BaseUrl) },
  @{ nombre = 'accesibilidad';       script = "$qa\variantes-a11y.js";                  args = @($BaseUrl) },
  @{ nombre = 'globalizacion';       script = "$qa\variantes-globalizacion.js";         args = @($BaseUrl) },
  @{ nombre = 'chips de resumen';    script = "$qa\variantes-chips.js";                 args = @($BaseUrl) },
  @{ nombre = 'readiness';           script = "$qa\variantes-ready.js";                 args = @($BaseUrl) }
)

$fallos = @()
foreach ($c in $comprobaciones) {
  Write-Host ''
  Write-Host ('== ' + $c.nombre + ' ==')
  & node $c.script @($c.args)
  if ($LASTEXITCODE -ne 0) { $fallos += $c.nombre }
}

Write-Host ''
if ($fallos.Count -gt 0) {
  Write-Host ('VARIANTES_KO  fallan: ' + ($fallos -join ', '))
  exit 1
}
Write-Host 'VARIANTES_OK'
exit 0
