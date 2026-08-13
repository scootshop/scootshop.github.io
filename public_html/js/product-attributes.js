/* /js/product-attributes.js — NÚCLEO DE ATRIBUTOS. Fuente única de verdad.
 *
 * QUÉ RESUELVE
 * ------------
 * Hasta agosto de 2026 la identidad de un eje de variantes no vivía en los datos:
 * vivía en una CLASE CSS escrita a mano en el HTML de cada ficha. El catálogo solo
 * conocía un eje —`colorVariants`— y quien quisiera otra cosa lo disfrazaba.
 *
 * El KUKIRIN G2 PRO fue el caso que lo destapó. Sus dos versiones (VMP y Normal) son
 * un eje de MODELO, pero se declaraban así:
 *
 *     class="color-variant size-variant"     ← opción de color vestida de píldora
 *     <span class="color-variants-label">MODELOS:</span>
 *
 * La ficha se veía bien porque el rótulo y la clase extra estaban puestos a mano allí.
 * El Home no: descubría los ejes parseando el HTML de la ficha, veía `.variant-option`
 * y pintaba círculos de color. Mismo producto, dos lecturas distintas.
 *
 * CÓMO SE RESUELVE
 * ----------------
 * El producto declara sus atributos, y de ahí sale TODO: qué eje es, cómo se llama,
 * qué opciones tiene y cómo se representa. Ningún componente vuelve a deducirlo.
 *
 *     attributes: [
 *       { key: 'model', label: 'Modelo', type: 'pill', options: [...] },
 *       { key: 'color', label: 'Color',  type: 'swatch', options: [...] },
 *       { key: 'size',  label: 'Medida', type: 'pill', options: [...] }
 *     ]
 *
 *   · key    identidad estable. Viaja al carrito y al pedido. No cambiar nunca.
 *   · label  lo que lee el cliente. Si falta, sale de ETIQUETAS por el key.
 *   · type   cómo se pinta: 'swatch' (círculo) o 'pill' (botón con nombre).
 *   · options cada opción con SU key estable y sus imágenes por identificador.
 *
 * Lo consumen Home, ficha, ACC POP, carrito y lo que venga: un producto nuevo con
 * Modelo + Color + Medida funciona sin tocar un solo componente.
 *
 * COMPATIBILIDAD
 * --------------
 * Ya no hay puente: `colorVariants` no existe en el catálogo y `desdeLegacy()` se
 * borró en agosto de 2026. Lo único que queda mirando al pasado es la LECTURA de
 * líneas antiguas —pedidos y carritos guardados cuando el único eje era el color—,
 * que resuelve `rescatarEjeLegacy()` contra los ejes reales del producto.
 */
(function () {
  'use strict';

  if (window.SS_ATTRS) return;

  /* Rótulo por defecto de cada eje conocido. Es el fallback del punto 18: si un
     atributo no trae `label`, se deriva de su TIPO — nunca se asume "Color" solo
     porque el producto tenga variantes, que es justo el fallo que originó esto. */
  var ETIQUETAS = {
    color: 'Color',
    model: 'Modelo',
    size: 'Medida',
    version: 'Versión',
    power: 'Potencia',
    range: 'Autonomía',
    capacity: 'Capacidad',
    material: 'Material'
  };

  /* Representación por defecto. Solo el color se lee como muestra de color; todo lo
     demás necesita su NOMBRE escrito, porque un círculo azul no dice "VMP". */
  var REPRESENTACION = { color: 'swatch' };
  var TIPOS = { swatch: 1, pill: 1 };

  function texto(v) { return v === null || v === undefined ? '' : String(v); }

  /* Deriva un rótulo legible de una clave, para ejes que nadie declaró:
     "battery_capacity" / "battery-capacity" → "Battery capacity". No traduce —no se
     inventa un idioma para algo que nunca se declaró— pero evita enseñar la clave
     cruda. Si el catálogo trae `label`, manda el catálogo. */
  function etiquetaDerivada(clave) {
    var t = texto(clave).replace(/[_-]+/g, ' ').trim();
    if (!t) return 'Opción';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function etiquetaDe(eje) {
    if (eje.label) return texto(eje.label);
    if (ETIQUETAS[eje.key]) return ETIQUETAS[eje.key];
    return etiquetaDerivada(eje.key);
  }

  function tipoDe(eje) {
    if (eje.type && TIPOS[eje.type]) return eje.type;
    return REPRESENTACION[eje.key] || 'pill';
  }

  /* Normaliza UNA opción. `images` es la forma buena de asociar fotos (punto 9): una
     lista de índices o rutas explícitas por opción. `range: [a, b]` se sigue
     aceptando —es lo que usa el catálogo hoy— y se expande aquí, en un solo sitio,
     para que ningún componente vuelva a razonar con tramos ni posiciones. */
  function normalizarOpcion(op, indice) {
    var imagenes = [];
    if (Array.isArray(op.images)) {
      imagenes = op.images.slice();
    } else if (Array.isArray(op.range) && op.range.length === 2) {
      for (var i = op.range[0]; i <= op.range[1]; i++) imagenes.push(i);
    }
    return {
      key: texto(op.key || op.value || indice),
      label: texto(op.label || op.key || ''),
      /* Etiqueta CORTA para el control, cuando la larga no cabe o repite la unidad
         que ya está en la cabecera del eje ("MEDIDA: 720 mm" + píldoras 640/680/720).
         Es presentación declarada, no una regla escondida en el HTML de una ficha:
         el texto largo se sigue usando en carrito, checkout y pedido. */
      shortLabel: texto(op.shortLabel || op.labelCorta || ''),
      swatch: texto(op.swatch || ''),
      images: imagenes,
      // Fotos por combinación con otro eje: { '720': 3, '780': 9 }. Es lo que permite
      // que un mismo acabado tenga foto distinta en cada medida.
      imagesBy: (op.imagesBy && typeof op.imagesBy === 'object') ? op.imagesBy : null,
      default: op.default === true || op.defaultColor === true,
      // `available:false` es como el catálogo marcaba lo agotado antes de que existiera
      // este núcleo. Se entiende aquí, en el único sitio que lee opciones, para que
      // ningún consumidor tenga que conocer las dos formas de decir lo mismo.
      disabled: op.disabled === true || op.agotado === true || op.available === false,
      // Solo lo usan quienes lo entienden (la ficha reescribe descripción y badge).
      desc: texto(op.desc || ''),
      dgt: op.dgt,
      // Restringe qué opciones de OTRO eje quedan disponibles con esta elegida.
      allows: (op.allows && typeof op.allows === 'object') ? op.allows : null,
      sku: texto(op.sku || ''),
      priceText: texto(op.priceText || '')
    };
  }

  function normalizarEje(eje, indice) {
    var opciones = Array.isArray(eje.options) ? eje.options : [];
    return {
      key: texto(eje.key || indice),
      label: etiquetaDe(eje),
      type: tipoDe(eje),
      options: opciones.map(normalizarOpcion)
    };
  }

  /* LA función. Todo componente que necesite saber qué variantes tiene un producto
     pasa por aquí y por ningún otro sitio.

     Aquí vivía `desdeLegacy()`, que traducía el `colorVariants` del modelo viejo a un
     eje de color. Se ha borrado: los 12 productos con variantes declaran `attributes`,
     así que ya no queda un solo sitio en el sistema donde una variante SIGNIFIQUE color
     por el mero hecho de existir. */
  function ejes(producto) {
    if (!producto) return [];
    if (!Array.isArray(producto.attributes)) return [];
    return producto.attributes.map(normalizarEje);
  }

  function eje(producto, key) {
    var todos = ejes(producto);
    for (var i = 0; i < todos.length; i++) if (todos[i].key === key) return todos[i];
    return null;
  }

  /* Opción por defecto de un eje: la marcada, o la primera que no esté agotada. */
  function porDefecto(eje) {
    if (!eje || !eje.options.length) return null;
    for (var i = 0; i < eje.options.length; i++) if (eje.options[i].default && !eje.options[i].disabled) return eje.options[i];
    for (var j = 0; j < eje.options.length; j++) if (!eje.options[j].disabled) return eje.options[j];
    return eje.options[0];
  }

  /* ¿Está disponible esta opción dado lo ya elegido en otros ejes? Lo decide el dato
     (`allows`), no una tabla escrita en el JS de cada página.
     La comprobación es SIMÉTRICA a propósito, porque las dos direcciones existen de
     verdad en el catálogo: un modelo puede limitar qué medidas admite (el FB12 no se
     fabrica de 740 a 800) y un acabado puede existir solo en ciertas medidas (el
     tornasol blanco, solo en 780). Mirar en un solo sentido dejaba pasar la mitad. */
  function disponible(eje, opcion, seleccion) {
    if (opcion.disabled) return false;
    if (!seleccion) return true;

    // 1) Lo ya elegido en otro eje, ¿admite esta opción?
    for (var k in seleccion) {
      if (!Object.prototype.hasOwnProperty.call(seleccion, k) || k === eje.key) continue;
      var otra = seleccion[k];
      if (!otra || !otra.allows) continue;
      var permitidas = otra.allows[eje.key];
      if (Array.isArray(permitidas) && permitidas.indexOf(opcion.key) === -1) return false;
    }

    // 2) Esta opción, ¿admite lo ya elegido en los demás ejes?
    if (opcion.allows) {
      for (var propio in opcion.allows) {
        if (!Object.prototype.hasOwnProperty.call(opcion.allows, propio) || propio === eje.key) continue;
        var elegida = seleccion[propio];
        var lista = opcion.allows[propio];
        if (elegida && Array.isArray(lista) && lista.indexOf(elegida.key) === -1) return false;
      }
    }
    return true;
  }

  /* ── Carrito ────────────────────────────────────────────────────────────────
     El carrito guarda los atributos CON NOMBRE: { model: 'vmp', size: '720' }. Antes
     los concatenaba en una sola cadena (`base-medida`) y había que descomponerla por
     posición para saber qué era cada trozo. La clave plana se sigue generando aquí
     —una sola vez, y solo para identificar la línea— pero ya no es la que lleva el
     significado: para eso está `attrs`. */
  function seleccionAObjeto(seleccion) {
    var out = {};
    for (var k in seleccion) {
      if (Object.prototype.hasOwnProperty.call(seleccion, k) && seleccion[k]) out[k] = seleccion[k].key;
    }
    return out;
  }

  function claveDe(producto, seleccion) {
    var partes = [];
    ejes(producto).forEach(function (e) {
      var op = seleccion[e.key];
      if (op) partes.push(op.key);
    });
    return partes.join('-');
  }

  function etiquetaDeSeleccion(producto, seleccion) {
    var partes = [];
    ejes(producto).forEach(function (e) {
      var op = seleccion[e.key];
      if (op && op.label) partes.push(op.label);
    });
    return partes.join(' · ');
  }

  /* Imágenes de la selección: identificadores explícitos, nunca images[0]/images[1].
     Si la opción tiene fotos por combinación (`imagesBy`), mandan esas.

     La comparación de la clave del OTRO eje es laxa (minúsculas) porque `imagesBy` se
     escribe a mano en el catálogo: `{ '720': 3 }` frente a una opción `720`, o
     `{ 'Negro': 2 }` frente a `negro`. Antes cada consumidor lo resolvía a su manera y
     el que no bajaba a minúsculas se quedaba sin foto por combinación. */
  function imagenesDe(producto, seleccion) {
    var todos = ejes(producto);
    for (var i = 0; i < todos.length; i++) {
      var op = seleccion[todos[i].key];
      if (!op) continue;
      if (op.imagesBy) {
        var porClave = {};
        for (var k in op.imagesBy) {
          if (Object.prototype.hasOwnProperty.call(op.imagesBy, k)) porClave[texto(k).toLowerCase()] = op.imagesBy[k];
        }
        for (var j = 0; j < todos.length; j++) {
          if (todos[j].key === todos[i].key) continue;
          var otra = seleccion[todos[j].key];
          var clave = otra ? texto(otra.key).toLowerCase() : '';
          if (clave && porClave[clave] !== undefined) return [].concat(porClave[clave]);
        }
      }
      if (op.images && op.images.length) return op.images.slice();
    }
    return [];
  }

  /* ── DE IDENTIFICADOR A FOTO ──────────────────────────────────────────────────
     El catálogo asocia fotos por IDENTIFICADOR (`images: [3, 4]`, `imagesBy`), nunca
     por posición. Convertir ese identificador en una URL es lo único que faltaba por
     centralizar: lo hacían por su cuenta la ficha y la burbuja, cada una con su copia
     de la convención `{href}/img/{n}.webp` y con criterios distintos para `imagesBy`.

     Un número es un índice de la galería del producto; cualquier otra cosa se toma
     como ruta ya escrita, para que un producto pueda dar rutas explícitas sin que
     nadie tenga que cambiar código. Sin selección resoluble, la foto del producto. */
  function fotoDe(producto, seleccion) {
    if (!producto) return '';
    var ids = imagenesDe(producto, seleccion || {});
    var id = ids.length ? ids[0] : '';
    if (id === '' || id === null || id === undefined) return texto(producto.image);

    var comoTexto = texto(id);
    if (!/^\d+$/.test(comoTexto)) return comoTexto;

    // Índice: si el producto declara galería, manda ella (respeta rutas propias).
    var galeria = Array.isArray(producto.gallery) ? producto.gallery : [];
    var pos = parseInt(comoTexto, 10);
    if (galeria.length) {
      var media = galeria[pos - 1];
      if (media && media.src) return texto(media.src);
      return texto(producto.image);
    }
    var base = texto(producto.href).replace(/\/+$/, '');
    return base ? (base + '/img/' + pos + '.webp') : texto(producto.image);
  }

  /* ── PRESENTACIÓN DE UNA LÍNEA ───────────────────────────────────────────────
     La ÚNICA forma de escribir las variantes de una línea de carrito o de pedido.
     Antes cada consumidor lo improvisaba y todos escribían "Color:" pasara lo que
     pasara — daba igual que el eje fuese un modelo o una medida.

     Resuelve, en este orden y sin listas de ejes escritas a mano:
       · clave interna del eje  → su etiqueta, del catálogo (o de ETIQUETAS)
       · valor interno          → la etiqueta de esa opción, del catálogo
       · formato nuevo (attrs)  y  formato viejo (color/colorLabel)

     RESPALDO HISTÓRICO, importante: un pedido de hace meses puede referirse a una
     opción que ya no está en el catálogo —se retiró un color, se renombró un modelo—.
     En ese caso NO se pierde nada: se usa la etiqueta que quedó guardada en la propia
     línea y, si tampoco la hay, el valor. Un pedido antiguo nunca se queda en blanco
     porque el catálogo de hoy haya cambiado. */
  function comparable(v) { return texto(v).toLowerCase().replace(/[^a-z0-9]/g, ''); }

  /* RESCATE DE LÍNEA LEGACY. Una línea vieja guardó el VALOR de la variante, pero no
     a qué eje pertenecía: todo se llamaba "color". Cuando el producto no tiene eje de
     color —el G2 PRO se elige por MODELO— ese valor se busca entre las opciones de
     sus ejes de verdad, por clave o por etiqueta: en el carrito viaja la clave
     ('vmp') y en los enlaces de compra la etiqueta ('G2 PRO VMP').

     Esto es lo que permite leer bien lo que ya está escrito y no se puede reescribir:
     pedidos de antes de `attrs`, y enlaces `/checkout?color=…` que siguen vivos en
     pestañas y en el historial. Si el valor no casa con ninguna opción no se toca
     nada y se sigue leyendo como color, exactamente igual que antes. */
  function rescatarEjeLegacy(losEjes, valor) {
    if (!losEjes.length || !valor) return null;
    for (var i = 0; i < losEjes.length; i++) if (losEjes[i].key === 'color') return null;
    var buscado = comparable(valor);
    if (!buscado) return null;
    for (var j = 0; j < losEjes.length; j++) {
      var opciones = losEjes[j].options;
      for (var k = 0; k < opciones.length; k++) {
        if (comparable(opciones[k].key) === buscado || comparable(opciones[k].label) === buscado) {
          return { eje: losEjes[j], opcion: opciones[k] };
        }
      }
    }
    return null;
  }

  function describir(linea, producto) {
    if (!linea) return [];
    // Formato nuevo si lo hay; si no, el viejo, donde el eje único era el color.
    var attrs = linea.attrs;
    var esLegacy = false;
    if (!attrs || !Object.keys(attrs).length) {
      if (!linea.color && !linea.colorLabel) return [];
      attrs = { color: linea.color || linea.colorLabel };
      esLegacy = true;
    }

    var losEjes = producto ? ejes(producto) : [];

    /* ORDEN DE LECTURA: el que declara el catálogo, no el orden en que se escribieron
       los atributos. Un manillar lo eligen dos manos distintas —el selector de color lo
       pinta este núcleo y la medida la gobierna el script de la ficha—, así que quien
       escribiera primero decidía si la línea decía "Color: … · Medida: …" o al revés,
       y el mismo producto salía de dos formas según con qué eje hubieras jugado antes.
       Los atributos que no correspondan a ningún eje conocido van detrás, en su orden. */
    var claves = [];
    for (var e = 0; e < losEjes.length; e++) {
      if (Object.prototype.hasOwnProperty.call(attrs, losEjes[e].key)) claves.push(losEjes[e].key);
    }
    for (var otra in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, otra)) continue;
      if (claves.indexOf(otra) === -1) claves.push(otra);
    }

    var out = [];
    for (var ic = 0; ic < claves.length; ic++) {
      var k = claves[ic];
      var valor = texto(attrs[k]);
      if (!valor) continue;

      var elEje = null;
      for (var i = 0; i < losEjes.length; i++) if (losEjes[i].key === k) elEje = losEjes[i];

      var opcion = null;
      if (elEje) {
        for (var j = 0; j < elEje.options.length; j++) {
          if (elEje.options[j].key === valor) opcion = elEje.options[j];
        }
      }

      if (!elEje && esLegacy) {
        var rescate = rescatarEjeLegacy(losEjes, valor) ||
          rescatarEjeLegacy(losEjes, linea.colorLabel);
        if (rescate) { elEje = rescate.eje; opcion = rescate.opcion; }
      }

      out.push({
        key: elEje ? elEje.key : k,
        label: elEje ? elEje.label : (ETIQUETAS[k] || etiquetaDerivada(k)),
        value: opcion ? opcion.key : valor,
        // El respaldo: catálogo → etiqueta guardada en la línea → valor crudo.
        valueLabel: (opcion && opcion.label) ||
          (k === 'color' && linea.colorLabel ? linea.colorLabel : '') || valor
      });
    }
    return out;
  }

  /* "Modelo: VMP · Medida: 720 mm". Un solo sitio decide el formato, así que
     cambiarlo se nota a la vez en carrito, checkout, /pago y resumen del pedido.

     UN PEDIDO ES UN DOCUMENTO HISTÓRICO. Si la línea trae `variant_text`, manda ese
     texto: es lo que el cliente vio y aceptó al comprar. El catálogo de hoy puede
     haber renombrado la opción o retirado el eje, y aun así el pedido debe seguir
     diciendo lo que decía. Lo escribe este mismo núcleo en el momento de la compra
     —no lo redacta ni el checkout ni el backend—, así que no hay dos formatos. */
  function describirTexto(linea, producto) {
    var guardado = linea && (linea.variant_text || linea.variantText);
    if (typeof guardado === 'string' && guardado.trim()) return guardado.trim();
    return describir(linea, producto).map(function (a) {
      return a.label + ': ' + a.valueLabel;
    }).join(' · ');
  }

  /* Aviso de "ya estoy". Las fichas enlazan product-enhancements.js con una etiqueta
     ESTÁTICA, mientras que a este núcleo lo añade global-assets.js de forma diferida:
     medido, el orden real es global-assets → products → product-enhancements →
     product-attributes. O sea que la ficha corre ANTES de que exista SS_ATTRS y, sin
     este aviso, se quedaba sin construir su selector. Quien dependa del núcleo escucha
     el evento en vez de dar por hecho que ya está cargado. */
  /* ── READINESS: una sola primitiva ───────────────────────────────────────────
     `SS_ATTRS.ready` es una promesa que se cumple cuando de verdad se puede resolver
     un producto: núcleo cargado Y catálogo disponible. Regla: ningún consumidor pinta
     datos que dependan del catálogo antes de que esto se cumpla.

     Existe porque "estar cargado" y "poder resolver" NO son lo mismo. Medido en
     producción: el núcleo se anunciaba a los 456 ms y el catálogo aparecía a los 463.
     El carrito repintaba en ese hueco y escribía la clave cruda ("Modelo: vmp") en
     lugar de la etiqueta. Se corrigió también la causa —el orden de inserción de los
     scripts—, pero la promesa es la garantía: aunque el orden vuelva a torcerse, nadie
     pinta antes de tiempo. Sustituye a los repintados a ojo y a los setTimeout.

     Hubo además un evento `ss:attrs` para avisar de "ya estoy". Se ha eliminado: era
     una segunda puerta que obligaba a cada consumidor a escribir el mismo baile —"si
     existe uso la promesa, si no escucho el evento y entonces uso la promesa"— copiado
     en cuatro sitios. Ahora la promesa la publica el cargador ANTES de pedir nada, así
     que siempre está: una sola puerta y ningún evento. */
  /* La promesa la publica el CARGADOR (js/global-assets.js, js/index-head.js) antes de
     pedir un solo script, para que exista desde el instante cero incluso para el código
     que corre antes que este núcleo. Aquí solo se adopta y se cumple. Si esta página no
     pasó por el cargador, se crea aquí y `SS_ATTRS.ready` sigue siendo la misma cosa. */
  var resolverReady = window.__ssResolverReady || null;
  var ready = window.SS_READY || null;
  if (!ready && typeof Promise === 'function') {
    ready = new Promise(function (res) { resolverReady = res; });
    window.SS_READY = ready;
  }

  function hayCatalogo() {
    var lista = window.SCOOTSHOP_PRODUCTS ||
      (window.SCOOTSHOP_CATALOG && window.SCOOTSHOP_CATALOG.products);
    return !!(lista && lista.length);
  }

  function anunciar() {
    var terminado = false;
    var listo = function () {
      if (terminado) return;
      terminado = true;
      if (resolverReady) resolverReady(window.SS_ATTRS);
    };
    if (hayCatalogo()) { listo(); return; }

    /* ¿ESTA PÁGINA ESPERA CATÁLOGO? Nunca se decide en un INSTANTE concreto.
       Si `products.js` ya está en el documento, es conocimiento explícito de que el
       catálogo va a llegar y se espera SIN tope: los dos únicos finales son que
       aparezca o que su descarga falle. Antes había un tope de intentos y confundía
       dos estados que no tienen nada que ver:
         · "va lento"        → transitorio: hay que seguir esperando
         · "no hay catálogo" → definitivo: se puede resolver ya

       Pero mirar la etiqueta UNA vez, al arrancar, era la misma equivocación con otro
       disfraz. Medido en /checkout: el núcleo se monta a los 67 ms y la etiqueta la
       inserta global-assets-app.js a los ~78 ms, así que a los 67 ms "no hay etiqueta"
       significaba "todavía no", no "esta página no tiene catálogo". `ready` se cumplía
       con 0 productos y el resumen se quedaba con "Modelo: vmp" —la clave cruda— para
       siempre, porque el repintado ya había pasado.

       Lo definitivo es un HITO del documento, no un cronómetro ni el estado del DOM en
       un momento cualquiera: solo cuando el documento ha TERMINADO de cargar y sigue
       sin catálogo se puede afirmar que esta página no lo usa.

       `load` sirve para esto porque no se cumple hasta que todos los scripts
       pendientes —incluidos los que inserta el propio JS— han ejecutado o fallado.
       Medido con el catálogo retrasado 2,5 s: load a 2866 ms, catálogo a 2876 ms,
       `ready` a 2876 ms con 44 productos. No hace falta escuchar la etiqueta, y es
       mejor no hacerlo: como se descubre sondeando, su `error` podía haber ocurrido
       antes de encontrarla y la escucha no saltaba nunca. Medido con el catálogo
       abortado: `ready` no se cumplía JAMÁS y el cajón se quedaba sin repintar. */
    var documentoListo = false;
    var marcarDocumento = function () {
      // Un turno de cortesía: lo que se esté ejecutando en este mismo turno todavía
      // puede dejar el catálogo puesto.
      setTimeout(function () { documentoListo = true; }, 0);
    };
    if (document.readyState === 'complete') marcarDocumento();
    else window.addEventListener('load', marcarDocumento, { once: true });

    var esperar = function () {
      if (terminado) return;
      if (hayCatalogo() || documentoListo) { listo(); return; }
      (window.requestAnimationFrame || window.setTimeout)(esperar, 16);
    };
    esperar();
  }

  /* ── LA SELECCIÓN VIAJA AL CARRITO ───────────────────────────────────────────
     `data-attrs` en el botón de añadir es lo que convierte una elección en atributos
     con nombre dentro de la línea ({ model:'vmp', size:'720' }). Lo escribe SOLO esta
     función: cada eje de la ficha lo actualiza por su cuenta —el selector de color lo
     pinta este núcleo, las secciones de modelo/medida las gobierna todavía el script
     de la ficha— y si cada uno serializara su propio JSON, el último en escribir
     borraría al anterior y la línea entraría al pedido con medio eje.
     Por eso MEZCLA en vez de sustituir, y por eso el formato lo conoce un solo sitio. */
  function marcarSeleccion(el, parcial) {
    if (!el || !parcial) return;
    var actual = {};
    try {
      var crudo = el.getAttribute('data-attrs');
      if (crudo) {
        var leido = JSON.parse(crudo);
        if (leido && typeof leido === 'object') actual = leido;
      }
    } catch (_) {}
    for (var k in parcial) {
      if (!Object.prototype.hasOwnProperty.call(parcial, k)) continue;
      var valor = texto(parcial[k]);
      if (valor) actual[k] = valor; else delete actual[k];
    }
    try { el.setAttribute('data-attrs', JSON.stringify(actual)); } catch (_) {}
  }

  window.SS_ATTRS = {
    ejes: ejes,
    eje: eje,
    porDefecto: porDefecto,
    disponible: disponible,
    claveDe: claveDe,
    etiquetaDe: etiquetaDeSeleccion,
    imagenesDe: imagenesDe,
    // La foto de una selección, ya como URL. Única convención del sistema.
    fotoDe: fotoDe,
    atributosDe: seleccionAObjeto,
    // Presentación: la única puerta para escribir las variantes de una línea.
    describir: describir,
    describirTexto: describirTexto,
    // La única puerta para llevar una elección al carrito.
    marcarSeleccion: marcarSeleccion,
    // La puerta única de inicialización: núcleo + catálogo resoluble.
    ready: ready,
    ETIQUETAS: ETIQUETAS
  };

  anunciar();
})();
