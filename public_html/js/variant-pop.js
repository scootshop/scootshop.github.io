/* variant-pop.js — Burbuja para elegir variante (modelo / medida / color)
   ══════════════════════════════════════════════════════════════════════════════
   UN SOLO cuadro de variantes para todo el sitio. Lo abre cualquier boton que lleve
   `data-open-variants="<href de la ficha>"`, venga de donde venga:

     · la caja "Anade algo mas" de las fichas  (lo pinta product-enhancements.js)
     · las tarjetas del home                   (lo pinta index.js)
     · las de "Tambien te puede interesar", que son las mismas del home

   Antes el home tenia lo suyo aparte: una paleta `.color-pop` que solo sabia de
   COLORES. Con eso, un producto con modelo o medida —los manillares— no se podia
   anadir bien desde una tarjeta, porque faltaban ejes que preguntar. Al unificarlo,
   cualquier producto se configura igual esté donde esté, y un cambio de diseno o de
   comportamiento vale para los tres sitios a la vez.

   DE DONDE SALEN LAS OPCIONES: se descarga la ficha del producto y se leen sus
   propios selectores. Es a proposito. El catalogo NO tiene los ejes de medida ni de
   modelo —en products.js solo estan las claves ya combinadas con la medida por
   defecto (LUNJE: `rojo-780`)— y las reglas de que combina con que viven en el
   script de cada ficha. Copiarlas aqui seria una segunda verdad que se desincroniza
   al primer cambio; leyendo la ficha, lo que se ofrece aqui es exactamente lo que
   ofrece ella.

   COMO SE COMPONE LA CLAVE: la misma regla que aplican las cuatro fichas de dos
   ejes: primer eje (acabado si lo hay, si no modelo) + '-' + medida, y la etiqueta
   con ' · ' en medio. UNO y KOCEVLO hacen `modelo-medida`; LUNJE y WAKE,
   `base-medida`; NANLIO y WAKE DOWNHILL no tienen ejes extra y usan su clave de
   color tal cual.

   El boton de anadir que se dispara NO lleva `data-product-cart-btn`: ese atributo
   significa "este boton manda sobre el selector de color de la FICHA" y aqui haria
   que el accesorio se anadiera con el color elegido para el patinete.
   ══════════════════════════════════════════════════════════════════════════════ */
(function variantPop() {
  'use strict';
  // Lo cargan DOS sitios (index.js y product-enhancements.js) y en las fichas
  // coinciden los dos: sin esto se montarian dos burbujas y dos juegos de listeners.
  if (window.__ssVariantPop) return;
  window.__ssVariantPop = true;


  var GAP = 12;    // separación con el botón
  var BORDE = 10;  // margen mínimo con el borde de la ventana

  var ESPERA_CIERRE = 1000;  // lo que se queda el acuse antes de cerrar la burbuja

  var pop = null;
  var abridor = null;
  var cache = {};   // href -> ejes ya leídos (una descarga por accesorio y visita)
  var estado = null;
  /* Ya se ha añadido y la burbuja se está cerrando. Bloquea cualquier clic
     posterior sobre las opciones: sin esto, tocar otro color durante el segundo
     que dura el acuse metería una SEGUNDA línea en el carrito. */
  var anadido = false;
  var cierreProgramado = 0;

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function productoPorHref(href) {
    var lista = window.SCOOTSHOP_PRODUCTS;
    if (!Array.isArray(lista)) return null;
    var ruta = String(href || '');
    for (var i = 0; i < lista.length; i++) {
      if (lista[i] && lista[i].href === ruta) return lista[i];
    }
    return null;
  }

  /* Los ejes de un producto: del CATALOGO y de ningun otro sitio.
     Aqui vivia un lector del HTML de la ficha —se descargaba la pagina entera y se
     parseaba con DOMParser— porque los ejes de un accesorio solo existian escritos en
     su ficha. Ya no: los 12 productos con variantes los declaran en `attributes`, asi
     que ese lector (142 lineas), su `completarDesdeCatalogo` y la peticion de red se
     han borrado. Un producto nuevo funciona aqui sin ficha que parsear. */
  function pedirEjes(href, producto) {
    if (cache[href]) return Promise.resolve(cache[href]);
    var prod = producto || productoPorHref(href);
    cache[href] = (window.SS_ATTRS && prod) ? window.SS_ATTRS.ejes(prod) : [];
    return Promise.resolve(cache[href]);
  }

  /* ── Estado elegido ──────────────────────────────────────────────────────
     `estado.seleccion` es un objeto {claveDeEje: opción}. No hay campos fijos para
     modelo/medida/color: el número de ejes lo pone el producto. */
  function ejeDe(key) {
    if (!estado) return null;
    for (var i = 0; i < estado.ejes.length; i++) if (estado.ejes[i].key === key) return estado.ejes[i];
    return null;
  }

  /* Disponibilidad: la decide el núcleo a partir de `allows`, en los dos sentidos.
     Aquí no hay ninguna regla escrita sobre modelos, medidas ni colores. */
  function opcionDisponible(eje, opcion) {
    if (window.SS_ATTRS) return window.SS_ATTRS.disponible(eje, opcion, estado.seleccion);
    return !opcion.disabled;
  }

  /* Qué falta por elegir. La burbuja abre EN BLANCO —sin medida, modelo ni color
     marcados— para que nadie añada una combinación que no ha mirado, y el botón va
     diciendo qué queda. Se devuelve la etiqueta del eje tal y como la llama su
     ficha ("acabado" en el NANLIO, "medida" en el LUNJE), no un texto inventado. */
  function falta() {
    for (var i = 0; i < estado.ejes.length; i++) {
      var e = estado.ejes[i];
      if (e.options.length && !estado.seleccion[e.key]) return e.label || e.key;
    }
    return '';
  }

  /* Lo elegido, para el carrito. `attrs` son los atributos CON NOMBRE —lo que de
     verdad describe la línea— y `key`/`label` la forma plana que el carrito usa
     todavía para identificarla. La composición ocurre AQUÍ y en ningún otro sitio. */
  function elegido() {
    var partesKey = [];
    var partesLabel = [];
    var attrs = {};
    estado.ejes.forEach(function (e) {
      var op = estado.seleccion[e.key];
      if (!op) return;
      attrs[e.key] = op.key;
      partesKey.push(op.key);
      if (op.label) partesLabel.push(op.label);
    });
    if (!partesKey.length) return null;
    return { key: partesKey.join('-'), label: partesLabel.join(' · '), attrs: attrs };
  }

  /* `alt` permite preguntar "¿qué foto SALDRÍA con esta opción?" sin tocar lo elegido:
     es lo que usa la vista previa al pasar el ratón. Sin él responde por el estado.
     Recorre los ejes en orden y se queda con la primera foto que encuentre: primero
     la del acabado EN esa medida (imagesBy), si la ficha las tiene separadas. */
  /* La foto de lo elegido —o de lo que se está señalando— la resuelve el NÚCLEO.
     Aquí vivía una copia de esa lógica: recorría los ejes, miraba `imagesBy`, luego
     `images`, y construía a mano `{href}/img/{n}.webp`. La ficha tenía otra copia con
     criterios distintos, así que la misma opción podía dar dos fotos según quién
     preguntara. Ahora la convención existe en un solo sitio. */
  function fotoElegida(alt) {
    var seleccion = {};
    for (var k in estado.seleccion) {
      if (Object.prototype.hasOwnProperty.call(estado.seleccion, k)) seleccion[k] = estado.seleccion[k];
    }
    if (alt && alt.eje) seleccion[alt.eje] = alt.opcion;
    if (window.SS_ATTRS && typeof window.SS_ATTRS.fotoDe === 'function') {
      return window.SS_ATTRS.fotoDe(estado.producto, seleccion) || (estado.producto.image || '');
    }
    return estado.producto.image || '';
  }

  /* ── Carriles: mismo gesto que el selector de color de la ficha ─────────── */
  function sincronizarCarril(rail) {
    var max = rail.scrollWidth - rail.clientWidth;
    var deslizable = max > 2;
    rail.classList.toggle('is-rail', deslizable);
    rail.classList.toggle('is-rail-start', deslizable && rail.scrollLeft <= 2);
    rail.classList.toggle('is-rail-end', deslizable && rail.scrollLeft >= max - 2);
  }

  /* ── Pintado ───────────────────────────────────────────────────────────── */
  /* Las TRES filas llevan su valor en la cabecera, al lado de la etiqueta. Hubo una
     versión sin él en las de píldoras —la marcada ya dice el valor con todas sus
     letras—, pero leer "MODELO Rise elevador · MEDIDA 720 mm · COLOR Azul" de un
     vistazo, en el mismo sitio y con el mismo formato, es lo que hace que se entienda
     qué se está configurando sin recorrer los tres carriles.
     El hueco se pinta siempre (aunque esté vacío) para que refrescar() solo tenga que
     escribir dentro, sin tocar la estructura. */
  function fila(claseRail, etiqueta, valor, contenido) {
    return '<div class="acc-pop-row">' +
      '<div class="acc-pop-row-head">' +
        '<span class="acc-pop-row-label">' + esc(etiqueta) + '</span>' +
        (valor === null ? '' : '<span class="acc-pop-row-value">' + esc(valor) + '</span>') +
      '</div>' +
      '<div class="acc-pop-rail ' + claseRail + '">' + contenido + '</div>' +
    '</div>';
  }

  function pintar() {
    var ejes = estado.ejes;
    /* Sin nombre ni precio: los tiene delante, en la fila desde la que ha abierto
       esto, y la burbuja sale pegada a ella. Repetirlos solo estiraba el cuadro. */
    var html = '';

    /* UN solo bucle para N ejes. Antes eran tres bloques calcados, uno por cubo fijo
       (modelos / medidas / colores), y añadir un eje nuevo obligaba a escribir un
       cuarto. Ahora el número de ejes, su rótulo y su representación los pone el
       producto: aquí no hay ni una regla sobre color, modelo ni medida. */
    ejes.forEach(function (eje) {
      if (!eje.options.length) return;
      var elegidaAqui = estado.seleccion[eje.key];
      var esSwatch = eje.type === 'swatch';

      html += fila(
        'acc-pop-' + eje.key,
        eje.label,
        elegidaAqui ? elegidaAqui.label : '',
        eje.options.map(function (op, i) {
          var fuera = !opcionDisponible(eje, op);
          var activa = elegidaAqui === op ? ' is-active' : '';
          var comun = ' data-eje="' + esc(eje.key) + '" data-idx="' + i + '"' + (fuera ? ' disabled' : '');
          if (esSwatch) {
            /* El nombre va en title y aria-label, no solo en el color: una opción no
               puede identificarse ÚNICAMENTE por su color (accesibilidad, punto 23). */
            return '<button type="button" class="variant-option variant-option--swatch' + activa + '"' + comun +
              ' title="' + esc(op.label) + '" aria-label="' + esc(op.label) + '"' +
              ' style="--variant-swatch:' + esc(op.swatch || '#cbd5e1') + '">' + esc(op.label) + '</button>';
          }
          return '<button type="button" class="variant-option variant-option--pill' + activa + '"' + comun + '>' +
            esc(op.label) + '</button>';
        }).join('')
      );
    });

    /* NO hay botón de confirmar: la línea entra en el carrito en cuanto no falta
       ningún eje por elegir (ver anadirAhora). Lo que queda aquí es el guía, que
       es TEXTO y no un botón —no hay nada que pulsar, y parecerlo sería mentir—:
       mientras falta algo dice qué falta, y al completarse pasa a ser el acuse.
       En minúsculas: la ficha escribe la etiqueta en mayúsculas ("MEDIDA") y el
       CSS ya pone el texto en versales; así el lector de pantalla no deletrea. */
    var pendiente = falta();
    html += '<p class="acc-pop-guia' + (anadido ? ' is-ok' : '') + '" role="status">' +
      (anadido ? 'Añadido' : 'Elige ' + esc(pendiente.toLowerCase())) +
    '</p>';

    pop.classList.toggle('is-anadido', anadido);
    pop.innerHTML = html;

    var rails = pop.querySelectorAll('.acc-pop-rail');
    for (var i = 0; i < rails.length; i++) {
      (function (rail) {
        // Si la fila cabe entera, sus píldoras se reparten el ancho y no queda
        // hueco muerto a la derecha. Se mide ANTES de estirar; estirar no puede
        // hacer que desborde, así que la medida sigue siendo válida.
        if (rail.scrollWidth <= rail.clientWidth + 1) rail.classList.add('is-fit');
        sincronizarCarril(rail);
        rail.addEventListener('scroll', function () { sincronizarCarril(rail); }, { passive: true });
      })(rails[i]);
    }
  }

  /* ── Refresco EN SITIO ────────────────────────────────────────────────────
     Elegir una opción NO vuelve a construir el HTML: solo se tocan las clases y los
     textos. Es lo que permite que el borde se DESRODEE en la que se deselecciona:
     esa animación es una `transition`, y una transición necesita un valor anterior
     del que partir. Repintando, las píldoras nacían de cero y el trazo simplemente
     aparecía a medias, sin recorrido — se veía rodear al elegir, pero nunca
     desrodear al soltar.

     De paso se arregla solo lo que antes había que compensar a mano: los carriles ya
     no vuelven al principio (no se recrean), así que no hay que guardarles y
     devolverles el scroll. */
  /* Escribe (o borra) el valor de la cabecera de una fila, buscándola por su carril. */
  function escribirValor(claseRail, elegida) {
    var rail = pop.querySelector('.' + claseRail);
    var filaEl = rail && rail.closest('.acc-pop-row');
    var hueco = filaEl && filaEl.querySelector('.acc-pop-row-value');
    if (hueco) hueco.textContent = elegida ? elegida.label : '';
  }

  function refrescar() {
    /* Mismo bucle único que en pintar(): un eje más en el catálogo no obliga a tocar
       nada aquí. Los botones se localizan por el carril del eje, que lleva su clave. */
    estado.ejes.forEach(function (eje) {
      var elegidaAqui = estado.seleccion[eje.key];
      var botones = pop.querySelectorAll('.acc-pop-' + eje.key + ' .variant-option--pill, .acc-pop-' + eje.key + ' .variant-option--swatch');
      for (var i = 0; i < botones.length; i++) {
        var op = eje.options[i];
        if (!op) continue;
        botones[i].classList.toggle('is-active', elegidaAqui === op);
        botones[i].disabled = !opcionDisponible(eje, op);
      }
      /* El valor de la cabecera se busca POR SU CARRIL y no con un querySelector
         suelto: hay un `.acc-pop-row-value` por eje y coger "el primero" escribiría
         el color encima del modelo. */
      escribirValor('acc-pop-' + eje.key, elegidaAqui);
    });

    var guia = pop.querySelector('.acc-pop-guia');
    if (guia) {
      var pendiente = falta();
      guia.classList.toggle('is-ok', anadido);
      guia.textContent = anadido ? 'Añadido' : 'Elige ' + pendiente.toLowerCase();
    }

    /* Marca del acuse en la raíz: el CSS la usa para poner en verde el trazo de lo
       elegido y para apagar la animación de relleno, que en ese momento se leería
       como "elige otra vez" en vez de como una confirmación. */
    pop.classList.toggle('is-anadido', anadido);
  }

  /* ── Colocación: debajo → izquierda → derecha, como la burbuja del home ── */
  /* Tamaño del cuadro la última vez que se colocó. Lo usa recolocarSiCrece(): tras un
     repintado NO se recoloca por sistema. */
  var tamanoColocado = { w: 0, h: 0 };

  function colocar(boton) {
    var b = boton.getBoundingClientRect();
    pop.classList.remove('pos-bottom', 'pos-left', 'pos-right');
    pop.style.left = '0px';
    pop.style.top = '0px';
    pop.classList.add('is-visible');
    var caja = pop.getBoundingClientRect();
    tamanoColocado = { w: caja.width, h: caja.height };
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var pos = 'pos-bottom';
    var left = b.left + (b.width / 2) - (caja.width / 2);
    var top = b.bottom + GAP;

    if (top + caja.height > vh - BORDE) {
      // No cabe debajo: al lado. La caja de compatibles está pegada al borde
      // derecho del panel, así que se prueba primero la izquierda.
      var izq = b.left - GAP - caja.width;
      if (izq >= BORDE) { pos = 'pos-left'; left = izq; }
      else { pos = 'pos-right'; left = b.right + GAP; }
      top = b.top + (b.height / 2) - (caja.height / 2);
    }

    /* Los topes no son solo la ventana: también el recuadro de "Añade algo más".
       Solo se aplica si el recuadro es más ancho que ella; si no, mandaría un
       límite imposible.

       Por la IZQUIERDA es una pared. Por la DERECHA no: la burbuja puede asomar
       hasta DESBORDE px por fuera de la tarjeta. Encajada dentro del recuadro se
       leía como un cuadro metido a presión en la columna; asomando se lee como lo
       que es, una nube que se despliega desde la flecha. No es barra libre —el
       tope de la ventana sigue mandando— y por eso no hace falta un punto de corte
       para el móvil: allí el recuadro ya llega casi al borde de la pantalla, el
       `vw - BORDE` se impone y el asomo se queda en nada él solo. */
    var DESBORDE = 130;
    var limIzq = BORDE;
    var limDer = vw - BORDE;
    var bloque = boton.closest('.compat-box');
    if (bloque) {
      var rb = bloque.getBoundingClientRect();
      if (rb.width >= caja.width) {
        limIzq = Math.max(limIzq, rb.left);
        limDer = Math.min(limDer, rb.right + DESBORDE);
      }
    }

    left = Math.max(limIzq, Math.min(left, limDer - caja.width));
    top = Math.max(BORDE, Math.min(top, vh - caja.height - BORDE));

    /* La flecha manda. Si tras encajar el cuadro el botón queda fuera del tramo por
       el que la flecha puede asomar —los cantos no valen: ahí está la esquina
       redondeada— se corre el cuadro lo justo para que el botón caiga dentro de ese
       tramo. Sin esto, en móvil la flecha se quedaba clavada en su tope y apuntaba
       a un palmo del botón. Si ni así llega (botón fuera del recuadro), se queda
       donde estaba: es preferible una flecha corta que un cuadro descolocado. */
    var MARGEN_FLECHA = 28;
    if (pos === 'pos-bottom') {
      var centroBoton = b.left + (b.width / 2);
      var minLeft = centroBoton - (caja.width - MARGEN_FLECHA);
      var maxLeft = centroBoton - MARGEN_FLECHA;
      var ajustado = Math.max(minLeft, Math.min(maxLeft, left));
      if (ajustado >= limIzq && ajustado + caja.width <= limDer) left = ajustado;
    }

    pop.classList.add(pos);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';

    /* La flecha va donde cae el botón, pero NUNCA sobre las esquinas: el cuadro
       tiene 18px de radio y la flecha mide 14 (unos 10 de media diagonal), así que
       plantada a menos de 28px del canto se queda encima de la curva, donde ya no
       hay borde recto al que pegarse, y se ve como un triángulo suelto flotando
       fuera de la caja. El ajuste de arriba ya ha corrido el cuadro para que el
       botón caiga dentro de ese tramo, así que este tope casi nunca recorta. */
    var centro, limite;
    if (pos === 'pos-bottom') {
      centro = b.left + (b.width / 2) - left;
      limite = caja.width - MARGEN_FLECHA;
      pop.style.setProperty('--pop-arrow-left', Math.max(MARGEN_FLECHA, Math.min(limite, centro)) + 'px');
    } else {
      centro = b.top + (b.height / 2) - top;
      limite = caja.height - MARGEN_FLECHA;
      pop.style.setProperty('--pop-arrow-top', Math.max(MARGEN_FLECHA, Math.min(limite, centro)) + 'px');
    }
  }

  /* Recolocar SOLO si el cuadro ha cambiado de tamaño (al pasar del esqueleto
     "Cargando opciones…" al contenido real). Elegir una opción repinta la burbuja
     pero no la agranda, así que ahí no hay nada que recolocar.

     Antes se recolocaba tras cada repintado y el cuadro daba un salto de unos píxeles
     en la PRIMERA elección, por un motivo poco evidente: la burbuja se ancla al botón
     que la abrió, ese botón vive dentro de la tarjeta del home y la tarjeta CRECE ~9px
     al pasarle el ratón por encima. Cuando el puntero entra en la burbuja —que vive en
     <body>, fuera de la tarjeta— la tarjeta pierde el :hover y se encoge, así que el
     ancla se movía justo entre abrir el cuadro y el primer clic. Del segundo en
     adelante ya no volvía a pasar, de ahí que solo se notara una vez. */
  function recolocarSiCrece(boton) {
    if (!pop || !boton) return;
    var r = pop.getBoundingClientRect();
    if (Math.abs(r.width - tamanoColocado.w) < 1 &&
        Math.abs(r.height - tamanoColocado.h) < 1) return;
    colocar(boton);
  }

  /* ── Vista previa del acabado, DONDE se abrió el cuadro ──────────────────
     La foto de la variante elegida se enseña fuera de la burbuja, en lo que ya está
     en pantalla junto a ella: así el aviso no cuesta ni un píxel de alto —meter una
     segunda foto dentro del cuadro sí lo haría crecer—. Hay dos casos:

       · abierta desde la caja "Añade algo más" → la miniatura de esa fila
       · abierta desde una tarjeta (home o "También te puede interesar") → la foto
         de portada, con el mismo fundido que usaba la paleta antigua al pasar el
         ratón por un color. El montaje de esas capas es del home, así que se pide
         por su API en vez de replicarlo aquí.

     Se deshace al cerrar: mientras la fila siga diciendo "Color: por elegir",
     dejarla con la foto de un acabado concreto se contradice con su propio chip. */
  var fotoFila = null;
  var tarjetaPrevia = null;

  function apiHome() {
    var api = window.SCOOTSHOP_HOME_CARD_API;
    return (api && typeof api.previewColor === 'function') ? api : null;
  }

  /* `fotoAlt` la pasa la vista previa del ratón para enseñar un acabado por el que
     solo se está pasando por encima. Sin ella se enseña lo que esté elegido. */
  function previsualizarEnFila(fotoAlt) {
    if (!abridor || !estado) return;

    var tarjeta = abridor.closest('.card');
    if (tarjeta) {
      var api = apiHome();
      var foto = fotoAlt || fotoElegida();
      if (api && foto) {
        tarjetaPrevia = tarjeta;
        api.previewColor(tarjeta, foto);
      }
      return;
    }

    var celda = abridor.closest('.compat-row');
    var img = celda && celda.querySelector('.order-summary__product-image');
    if (!img) return;
    if (!fotoFila || fotoFila.img !== img) fotoFila = { img: img, src: img.getAttribute('src') };
    var url = fotoAlt || fotoElegida();
    if (!url || url === img.getAttribute('src')) return;
    /* Se precarga antes de tocar el src. El índice de la variante puede apuntar a
       una foto que no exista en esa ficha, y cambiarlo a pelo dejaría la fila con
       la imagen rota; así, si no carga, simplemente no se cambia nada. */
    var previa = new Image();
    previa.onload = function () {
      if (fotoFila && fotoFila.img === img) img.setAttribute('src', url);
    };
    previa.src = url;
  }

  function restaurarFotoFila() {
    if (tarjetaPrevia) {
      var api = apiHome();
      if (api && typeof api.clearPreview === 'function') api.clearPreview(tarjetaPrevia);
      tarjetaPrevia = null;
    }
    if (!fotoFila) return;
    if (fotoFila.src) fotoFila.img.setAttribute('src', fotoFila.src);
    fotoFila = null;
  }

  /* ── Vista previa AL PASAR EL RATÓN por un acabado ───────────────────────
     La foto de fuera va siguiendo al acabado que se está señalando, sin elegir nada:
     es como se recorrían los colores en la paleta antigua, y la maquinaria (las capas
     del home, la miniatura de la fila) ya estaba montada — solo le faltaba este
     disparador, porque previsualizarEnFila() únicamente se llamaba desde el clic.

     Solo con ratón de verdad: en táctil el navegador sintetiza un "mouseover" al tocar
     y la foto se quedaría en el acabado rozado, que es justo el fallo que acabamos de
     quitar de las tarjetas del home.

     Va por delegación en `mouseover`, que SÍ burbujea (mouseenter no), así que un solo
     listener cubre los tres carriles y sobrevive a los repintados de refrescar(). */
  var PUNTERO_FINO = !!(window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  function previsualizarLoElegido() {
    // Sin nada elegido no hay foto que enseñar: se quita la capa y vuelve la portada.
    // ¿Hay algo elegido en algún eje? Si no, no hay foto que enseñar.
    var hayAlgo = false;
    if (estado) for (var k in estado.seleccion) { if (estado.seleccion[k]) { hayAlgo = true; break; } }
    if (hayAlgo) previsualizarEnFila();
    else restaurarFotoFila();
  }

  function alSenalar(ev) {
    // Ya añadido, el cuadro solo enseña el acuse: no se toca la foto de fuera.
    if (!PUNTERO_FINO || anadido || !estado || !abridor) return;
    var opcion = ev.target.closest('[data-eje]');
    // Fuera de una opción (o sobre una apagada) se vuelve a lo elegido, para que el
    // hueco entre carriles no deje colgada la foto del último acabado señalado.
    if (!opcion || opcion.disabled) { previsualizarLoElegido(); return; }

    var ejeKey = opcion.getAttribute('data-eje');
    var eje = ejeDe(ejeKey);
    if (!eje) return;
    var op = eje.options[parseInt(opcion.getAttribute('data-idx'), 10)];
    if (!op) return;

    /* Genérico: se pregunta qué foto saldría con ESA opción puesta en SU eje. Si la
       opción no aporta foto (una medida, normalmente, porque la elige el acabado),
       fotoElegida devuelve la de lo ya elegido y no cambia nada. Antes esto tenía
       escrito a mano "si es medida no hagas nada" y dos ramas para modelo y color. */
    previsualizarEnFila(fotoElegida({ eje: ejeKey, opcion: op }));
  }

  /* ── Alta en el carrito, sin botón ───────────────────────────────────────
     Se pulsa POR CÓDIGO un disparador con los mismos data-* que llevaba el botón
     de añadir, en vez de llamar a SS_CART.add() a pelo: así el alta pasa por
     exactamente la misma ruta que el resto del sitio (misma clave `sku|color`,
     mismo saneado del importe, mismo sonido, mismo contador de la cabecera) y no
     hay una segunda versión del alta que mantener. El disparador vive dentro de
     .acc-pop el tiempo del clic —que se reparte entero de forma síncrona— para
     que el guardián de "clic fuera" lo vea como propio y no cierre el cuadro. */
  function anadirAhora() {
    if (!estado) return;
    var producto = estado.producto;
    var combinacion = elegido();
    var disparador = document.createElement('button');
    disparador.type = 'button';
    disparador.hidden = true;
    disparador.setAttribute('data-add-to-cart', 'true');
    disparador.setAttribute('data-sku', producto.sku || '');
    disparador.setAttribute('data-name', producto.name || '');
    disparador.setAttribute('data-price', producto.priceText || '');
    disparador.setAttribute('data-url', producto.href || '');
    disparador.setAttribute('data-image', fotoElegida());
    disparador.setAttribute('data-stock', producto.stock || 'in_stock');
    disparador.setAttribute('data-color', combinacion ? combinacion.key : '');
    disparador.setAttribute('data-color-label', combinacion ? combinacion.label : '');
    /* Los atributos CON NOMBRE, además de la clave plana. La clave sigue ahí porque
       es la que identifica la línea en el carrito y en los pedidos ya guardados; esto
       es lo que de verdad dice QUÉ es cada trozo ({"model":"vmp","size":"720"}) y lo
       que permitirá, en la etapa del carrito, dejar de descomponer cadenas. */
    if (combinacion && combinacion.attrs) {
      disparador.setAttribute('data-attrs', JSON.stringify(combinacion.attrs));
    }
    pop.appendChild(disparador);
    disparador.click();
    disparador.remove();

    cierreProgramado = setTimeout(cerrar, ESPERA_CIERRE);
  }

  function cerrar() {
    if (!pop) return;
    if (cierreProgramado) { clearTimeout(cierreProgramado); cierreProgramado = 0; }
    anadido = false;
    restaurarFotoFila();
    pop.classList.remove('is-visible', 'pos-bottom', 'pos-left', 'pos-right', 'is-anadido');
    if (abridor) abridor.setAttribute('aria-expanded', 'false');
    abridor = null;
    estado = null;
  }

  function crearPop() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.className = 'acc-pop';
    pop.setAttribute('role', 'dialog');
    /* Declarado NO modal, que es lo que de verdad es: al abrirlo el foco se queda
       en la flecha, no se lleva dentro, y el resto de la página sigue siendo
       navegable. Un `dialog` a secas se anuncia como modal y el lector de pantalla
       promete un foco atrapado que aquí no existe. */
    pop.setAttribute('aria-modal', 'false');
    pop.setAttribute('aria-label', 'Elegir variante del accesorio');
    document.body.appendChild(pop);

    /* La rueda dentro de la burbuja NUNCA llega a la página. Sobre una fila la
       desliza en horizontal; sobre cualquier otro sitio se traga y ya está.
       Antes, al acabarse los colores el gesto seguía su camino, la página bajaba
       y —como la burbuja se cierra cuando la página se mueve— el cuadro
       desaparecía en mitad de la elección. Mientras está abierta, la rueda es
       suya: se cierra con Escape, con un clic fuera o al añadir.
       passive:false es obligatorio para poder cortar el gesto. */
    pop.addEventListener('wheel', function (ev) {
      var rail = ev.target.closest('.acc-pop-rail');
      if (rail) {
        var max = rail.scrollWidth - rail.clientWidth;
        if (max > 1) {
          var unidad = ev.deltaMode === 1 ? 16 : (ev.deltaMode === 2 ? rail.clientWidth : 1);
          var dx = ev.deltaX * unidad;
          var dy = ev.deltaY * unidad;
          var delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
          rail.scrollLeft = Math.max(0, Math.min(max, rail.scrollLeft + delta));
        }
      }
      ev.preventDefault();
    }, { passive: false });

    pop.addEventListener('mouseover', alSenalar);
    // Al salir de la burbuja entera vuelve lo elegido. mouseleave no burbujea, así que
    // solo salta cuando el ratón abandona el cuadro de verdad, no al cruzar de un
    // swatch a otro por dentro.
    pop.addEventListener('mouseleave', function () {
      if (!PUNTERO_FINO || anadido || !estado) return;
      previsualizarLoElegido();
    });

    pop.addEventListener('click', function (ev) {
      // Ya añadido: el cuadro solo está enseñando el acuse antes de cerrarse y no
      // acepta más cambios. Incluye el clic sintético del propio disparador.
      if (anadido) return;
      var opcion = ev.target.closest('[data-eje]');
      if (opcion && !opcion.disabled && estado) {
        /* IMPRESCINDIBLE. Elegir una opción repinta la burbuja entera, así que
           para cuando el clic llega al listener de "clic fuera" de document el
           botón pulsado YA no está en el árbol: su closest('.acc-pop') da null,
           el guardián lo toma por un clic de fuera y cerraba la burbuja al primer
           cambio de medida. */
        ev.stopPropagation();
        var ejeKey = opcion.getAttribute('data-eje');
        var eje = ejeDe(ejeKey);
        if (!eje) return;
        var elegida = eje.options[parseInt(opcion.getAttribute('data-idx'), 10)];
        if (!elegida) return;

        estado.seleccion[ejeKey] = elegida;

        /* Si este cambio invalida lo ya elegido en CUALQUIER otro eje, se BORRA en vez
           de cambiarlo por algo parecido: el guía vuelve a "Elige medida" y lo decide
           el cliente. Cambiárselo por detrás es justo lo que se quería evitar al
           quitar la preselección —y con el alta automática, además metería en el
           carrito algo que nadie ha elegido.
           Genérico para N ejes: antes esto eran dos ramas escritas a mano que solo
           sabían mirar de modelo→medida y de medida→color. */
        estado.ejes.forEach(function (otro) {
          if (otro.key === ejeKey) return;
          var yaElegida = estado.seleccion[otro.key];
          if (yaElegida && !opcionDisponible(otro, yaElegida)) delete estado.seleccion[otro.key];
        });
        /* Se decide ANTES de pintar. Al revés se colaría un repintado con todo
           elegido y el guía todavía en "Elige " a medias, visible una décima. */
        anadido = !falta();
        refrescar();
        previsualizarEnFila();
        if (abridor) recolocarSiCrece(abridor);
        if (anadido) anadirAhora();
        return;
      }
    });

    document.addEventListener('click', function (ev) {
      if (!pop.classList.contains('is-visible')) return;
      if (ev.target.closest('.acc-pop')) return;
      if (ev.target.closest('[data-open-variants]')) return;
      /* Con la burbuja abierta, el primer clic fuera SOLO la cierra. Hay que decirlo
         explícitamente desde que la fila entera es un enlace (el ::after estirado de
         .compat-name): sin esto, tocar al lado para descartar el cuadro te llevaba a
         la ficha del accesorio que hubiera debajo, que en el móvil es justo donde cae
         el dedo. Solo se le corta el paso a los ENLACES: a los botones no, para no
         tragarse un "añadir" de otra fila. */
      if (ev.target.closest('a')) ev.preventDefault();
      cerrar();
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') cerrar(); });
    window.addEventListener('scroll', cerrar, { passive: true });
    window.addEventListener('resize', cerrar);
    return pop;
  }

  function abrir(boton) {
    var href = boton.getAttribute('data-open-variants');
    var producto = productoPorHref(href);
    if (!producto) { window.location.href = href; return; }

    crearPop();
    if (abridor === boton && pop.classList.contains('is-visible')) { cerrar(); return; }

    /* Abrir OTRA fila durante el segundo que dura el acuse: hay que soltar el
       cierre programado —cerraría el cuadro recién abierto— y quitar el bloqueo,
       o el cuadro nuevo nacería sordo a los clics. */
    if (cierreProgramado) { clearTimeout(cierreProgramado); cierreProgramado = 0; }
    anadido = false;
    restaurarFotoFila();

    abridor = boton;
    boton.setAttribute('aria-expanded', 'true');
    /* Esqueleto mientras se lee la ficha. Con ratón casi nunca se ve (la descarga
       se adelanta al apuntar), pero con el dedo no hay "apuntar" y el toque es el
       primer aviso: sin esto el cuadro aparecería vacío un instante. */
    pop.innerHTML = '<p class="acc-pop-cargando">Cargando opciones…</p>';
    colocar(boton);

    pedirEjes(href, producto).then(function (ejes) {
      // Mientras se descargaba, el cliente puede haber cerrado o abierto otra.
      if (abridor !== boton) return;
      // Producto sin ejes: no se enseña un cuadro vacío, se va a su ficha (CASO E).
      var conOpciones = ejes.filter(function (e) { return e.options.length; });
      if (!conOpciones.length) {
        window.location.href = href;
        return;
      }
      /* Selección VACÍA: la burbuja abre en blanco y es el cliente quien elige. Antes
         venía con la variante por defecto de la ficha ya marcada y se podía añadir
         sin haber mirado nada. */
      estado = { producto: producto, ejes: conOpciones, seleccion: {} };
      pintar();
      colocar(boton);
    }).catch(function () {
      // Sin red o ficha ilegible: se va a la ficha, que es lo que hacía antes.
      window.location.href = href;
    });
  }

  document.addEventListener('click', function (ev) {
    var boton = ev.target.closest('[data-open-variants]');
    if (!boton) return;
    ev.preventDefault();
    abrir(boton);
  });

  // Adelantar la descarga: con ratón al apuntar, con el dedo al posarlo (el clic
  // llega ~100 ms después de touchstart, así que la ficha ya viene en camino).
  function adelantar(ev) {
    var boton = ev.target.closest('[data-open-variants]');
    if (!boton) return;
    var href = boton.getAttribute('data-open-variants');
    if (href && !cache[href]) pedirEjes(href).catch(function () {});
  }
  document.addEventListener('mouseover', adelantar);
  document.addEventListener('touchstart', adelantar, { passive: true });

})();
