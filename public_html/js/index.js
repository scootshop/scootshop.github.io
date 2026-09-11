(() => {
  'use strict';

  const $all = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const esc = (value) => String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const normalizePath = (link) => {
    const raw = String(link || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.origin);
      let path = url.pathname || '';
      if (!path.endsWith('/')) path += '/';
      return path;
    } catch (_) {
      return raw.endsWith('/') ? raw : raw + '/';
    }
  };

  const getCatalogProducts = () => Array.isArray(window.SCOOTSHOP_PRODUCTS) ? window.SCOOTSHOP_PRODUCTS.slice() : [];

  const getHomeSeries = () => {
    if (typeof window.SCOOTSHOP_getHomeSeries === 'function') return window.SCOOTSHOP_getHomeSeries();

    const seen = new Map();
    getCatalogProducts().forEach((product) => {
      if (!product || !product.series || seen.has(product.series)) return;
      seen.set(product.series, {
        key: product.series,
        label: 'Serie ' + String(product.series).toUpperCase(),
        homeTitle: 'Serie ' + String(product.series).toUpperCase(),
        homeDescription: '',
        homeSectionId: 'series-' + product.series,
        listingSectionId: 'products-' + product.series,
        homeAriaLabel: 'Lista de productos ' + String(product.series).toUpperCase(),
        homeOrder: seen.size + 1
      });
    });
    return Array.from(seen.values());
  };

  const getSeriesProducts = (seriesKey) => {
    if (typeof window.SCOOTSHOP_getSeriesProducts === 'function') return window.SCOOTSHOP_getSeriesProducts(seriesKey);

    return getCatalogProducts()
      .filter((product) => String(product.series || '').toLowerCase() === String(seriesKey || '').toLowerCase())
      .sort((left, right) => Number(left.homeOrder || 0) - Number(right.homeOrder || 0));
  };

  const getHomeCategories = () => {
    if (typeof window.SCOOTSHOP_getHomeCategories === 'function') return window.SCOOTSHOP_getHomeCategories();

    return [{
      key: 'default',
      label: 'Productos',
      showHeaderOnHome: false,
      series: getHomeSeries().map((series) => ({
        ...series,
        products: getSeriesProducts(series.key).filter((product) => product.showOnHome !== false)
      }))
    }];
  };

  /* UNA PAGINA DE CATEGORIA (/patinetes, /accesorios, /repuestos) declara la suya
     en el root del catalogo. La portada NO la declara, y entonces esto devuelve ''
     y todo se comporta como siempre: las cinco categorias, sus pildoras y su spy.

     Se pregunta una vez y se guarda: el atributo no cambia en toda la vida de la
     pagina, y esto se lee desde `normalizeHomeCategoryKey`, que corre en cada
     fotograma de scroll. */
  let claveDeLaPagina;
  const categoriaUnica = () => {
    if (claveDeLaPagina === undefined) {
      const root = document.querySelector('#comprar[data-home-catalog-root]');
      claveDeLaPagina = root ? (root.getAttribute('data-solo-categoria') || '').trim() : '';
    }
    return claveDeLaPagina;
  };

  const HOME_CATEGORY_FILTERS = [
    { key: 'electric-scooters', label: 'Patinetes' },
    { key: 'electric-motorcycles', label: 'Motos' },
    { key: 'electric-bikes', label: 'Bicicletas' },
    {
      key: 'accessories',
      label: 'Accesorios',
      emptyTitle: 'Accesorios',
      emptyDescription: 'Estamos preparando cascos, candados, soportes y accesorios para incorporarlos a la home.'
    },
    {
      key: 'spare-parts',
      label: 'Repuestos',
      emptyTitle: 'Repuestos',
      emptyDescription: 'Estamos preparando recambios y piezas de desgaste para incorporarlos a la home.'
    }
  ];

  /* OJO: esta lista es una SEGUNDA declaración de las categorías —la primera está
     en data/products.js— y manda sobre el filtro: `normalizeHomeCategoryKey` manda
     al patinete cualquier clave que no aparezca aquí. Una categoría nueva que se
     añada solo al catálogo se verá en el menú y en la parrilla, pero su chip no
     hará nada. Es lo que pasó al abrir Repuestos. */

  const DEFAULT_HOME_CATEGORY_KEY = 'electric-scooters';

  const normalizeHomeCategoryKey = (categoryKey) => {
    /* En /patinetes la respuesta es siempre «patinetes», venga de donde venga la
       pregunta: no hay pildoras que pulsar ni categoria guardada que recuperar. */
    const unica = categoriaUnica();
    if (unica) return unica;
    const raw = String(categoryKey || '').trim();
    return HOME_CATEGORY_FILTERS.some((item) => item.key === raw) ? raw : DEFAULT_HOME_CATEGORY_KEY;
  };

  let activeHomeCategoryKey = (() => {
    try {
      return normalizeHomeCategoryKey(sessionStorage.getItem('ss_homeCategory'));
    } catch (_) {
      return DEFAULT_HOME_CATEGORY_KEY;
    }
  })();

  const getHomeCategoryMeta = (categoryKey) => {
    const normalized = normalizeHomeCategoryKey(categoryKey);
    return HOME_CATEGORY_FILTERS.find((item) => item.key === normalized) || HOME_CATEGORY_FILTERS[0];
  };

  const getOrderedHomeCategories = (categoryKey = activeHomeCategoryKey) => {
    const todas = getHomeCategories().slice()
      .sort((left, right) => Number(left.homeOrder || 0) - Number(right.homeOrder || 0));
    /* Aqui es donde una pagina de categoria deja de pagar por las demas: la
       portada pintaba las cinco a la vez —82 tarjetas y 21 000 px— porque las
       pildoras solo llevaban el scroll de una a otra, no cambiaban lo pintado. */
    const unica = categoriaUnica();
    return unica ? todas.filter((c) => c.key === unica) : todas;
  };

  const getHomeCategorySectionId = (categoryKey) => 'home-category-' + normalizeHomeCategoryKey(categoryKey);

  // Sobre la parrilla ya solo hay un elemento pegajoso: la cabecera del catálogo
  // (título + filtro de categoría). La tira de categorías y el raíl de series que
  // se sumaban aquí se eliminaron de la portada.
  /* Se guarda: leer `offsetHeight` obliga al navegador a recalcular la maquetacion,
     y esto se pide en cada evento de scroll. Las dos alturas solo cambian si cambia
     el ancho de la ventana, asi que ahi es donde se tira el numero guardado. */
  let altoPegajoso = 0;

  /* El re-anclaje del hash, publicado por boot() cuando la URL trae uno. */
  let reanclarHash = null;

  const getHomeStickyOffset = () => {
    if (altoPegajoso) return altoPegajoso;
    const header = document.getElementById('siteHeader');
    const catalogHead = document.querySelector('.home-catalog-head');
    altoPegajoso = (header ? header.offsetHeight : 72)
      + (catalogHead ? catalogHead.offsetHeight : 0)
      + 8;
    return altoPegajoso;
  };

  window.addEventListener('resize', () => { altoPegajoso = 0; }, { passive: true });

  const getCategorySectionElement = (categoryKey) => {
    const normalized = normalizeHomeCategoryKey(categoryKey);
    return document.getElementById(getHomeCategorySectionId(normalized));
  };

  const ensureHomeCategoryChipVisible = (categoryKey, behavior = 'auto') => {
    const nav = document.querySelector('[data-home-category-nav]');
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    const chip = nav.querySelector('[data-home-category="' + normalizeHomeCategoryKey(categoryKey) + '"]');
    if (!chip) return;
    const left = chip.offsetLeft - (nav.clientWidth / 2) + (chip.clientWidth / 2);
    nav.scrollTo({ left: Math.max(0, left), behavior });
  };

  const setActiveHomeCategory = (categoryKey, options = {}) => {
    const normalized = normalizeHomeCategoryKey(categoryKey);
    const {
      persist = true,
      chipBehavior = 'smooth'
    } = options;

    activeHomeCategoryKey = normalized;
    syncHomeCategoryButtons();
    ensureHomeCategoryChipVisible(normalized, chipBehavior);

    if (persist) {
      try {
        sessionStorage.setItem('ss_homeCategory', activeHomeCategoryKey);
      } catch (_) {
      }
    }

  };

  const resolveHomeCategoryKeyFromViewport = () => {
    const sections = $all('.home-category-section[data-home-category-section]');
    if (!sections.length) return '';

    const stickyLine = getHomeStickyOffset() + 6;
    let bestAbove = null;
    let nearestBelow = null;

    sections.forEach((section) => {
      const key = section.getAttribute('data-home-category-section') || '';
      if (!key) return;
      const rect = section.getBoundingClientRect();
      const item = { key, top: rect.top };

      if (rect.top <= stickyLine) {
        if (!bestAbove || item.top > bestAbove.top) bestAbove = item;
      } else if (!nearestBelow || item.top < nearestBelow.top) {
        nearestBelow = item;
      }
    });

    return (bestAbove && bestAbove.key) || (nearestBelow && nearestBelow.key) || '';
  };

  const syncHomeCategoryFromViewport = () => {
    if (homeCategoryPendingKey) {
      const timedOut = Date.now() >= homeCategoryPendingDeadline;
      if (!timedOut) {
        if (activeHomeCategoryKey !== homeCategoryPendingKey) {
          activeHomeCategoryKey = homeCategoryPendingKey;
          syncHomeCategoryButtons();
          ensureHomeCategoryChipVisible(homeCategoryPendingKey, 'auto');
        }
        return;
      }
      clearHomeCategoryPending();
    }

    const nextKey = resolveHomeCategoryKeyFromViewport();
    if (!nextKey) return;
    setActiveHomeCategory(nextKey, { persist: true, chipBehavior: 'auto' });
  };

  const scheduleHomeCategoryViewportSync = () => {
    if (homeCategoryScrollTick) return;
    homeCategoryScrollTick = window.requestAnimationFrame(() => {
      homeCategoryScrollTick = 0;
      syncHomeCategoryFromViewport();
    });
  };

  /* Cuántos productos hay en cada categoría, leído del catálogo. Lo que se
     conduce se cuenta en modelos y lo que se le pone encima, en productos —
     el mismo criterio que la ficha de serie y la tarjeta de categoría.

     SE GUARDA EL RESULTADO, y no es una optimización de manual: este número lo
     pide `syncHomeCategoryButtons`, que corre en CADA evento de scroll, y
     calcularlo obliga a `getHomeCategories()` + `getSeriesProducts()`, que por
     dentro CLONAN EL CATÁLOGO ENTERO —87 productos con sus galerías y sus ejes—.
     Medido con el procesador frenado seis veces, que es lo que se parece a un
     móvil: recorrer la portada gastaba 5 segundos de CPU dentro de products.js y
     la página iba a 3,8 fps. Los recuentos no cambian al desplazarse; solo cuando
     cambia el catálogo, y de eso avisa `ss:catalogo-pintado`. */
  const cuentasEnCache = new Map();

  const cuentaDeCategoria = (categoryKey) => {
    if (cuentasEnCache.has(categoryKey)) return cuentasEnCache.get(categoryKey);
    const cat = getHomeCategories().find((c) => c.key === categoryKey);
    let total = 0;
    if (cat) {
      total = (cat.series || []).reduce((n, serie) => {
        const productos = Array.isArray(serie.products)
          ? serie.products
          : getSeriesProducts(serie.key).filter((p) => p.showOnHome !== false);
        return n + productos.length;
      }, 0);
    }
    cuentasEnCache.set(categoryKey, total);
    return total;
  };

  /* Se tiran cuando el catálogo cambia: un precio editado desde el panel, un alta o
     una baja repintan la parrilla y avisan por aquí. */
  document.addEventListener('ss:catalogo-pintado', () => cuentasEnCache.clear());

  const esPiezaCategoria = (categoryKey) => categoryKey === 'accessories' || categoryKey === 'spare-parts';

  const unidadDe = (categoryKey, n) => esPiezaCategoria(categoryKey)
    ? (n === 1 ? 'producto' : 'productos')
    : (n === 1 ? 'modelo' : 'modelos');

  /* Las píldoras y las tarjetas de categoría están escritas a mano en el HTML,
     así que un `showOnHome: false` en el catálogo no las apaga solo. Se quitan
     aquí, leyendo el catálogo, para que el flag siga siendo el ÚNICO interruptor:
     volver a poner una categoría es cambiar `false` por `true` en
     data/products.js, sin tocar marcado.
     Se quitan del DOM en vez de esconderse con CSS porque `.cat-grid` reparte el
     ancho con `:first-child` y `:nth-child`, y esos selectores cuentan la
     posición aunque el elemento esté oculto: con `display:none` la rejilla
     quedaba con un hueco. */
  const podarCategoriasOcultas = () => {
    const vivas = new Set(getHomeCategories().map((c) => c.key));
    if (!vivas.size) return;

    $all('[data-home-category]').forEach((boton) => {
      if (!vivas.has(boton.getAttribute('data-home-category'))) boton.remove();
    });
    $all('[data-cat-link]').forEach((tarjeta) => {
      if (!vivas.has(tarjeta.getAttribute('data-cat-link'))) tarjeta.remove();
    });

    /* Si la que estaba elegida era una de las que se van, se cae a la primera
       que quede: si no, la portada arrancaría con una pestaña que ya no existe. */
    if (!vivas.has(normalizeHomeCategoryKey(activeHomeCategoryKey))) {
      activeHomeCategoryKey = getHomeCategories()[0].key;
      try { sessionStorage.setItem('ss_homeCategory', activeHomeCategoryKey); } catch (_) {}
    }
  };

  let ultimaCategoriaPintada = null;

  const syncHomeCategoryButtons = () => {
    const normalized = normalizeHomeCategoryKey(activeHomeCategoryKey);
    /* Si la categoría activa es la misma que la última vez, no hay nada que
       reescribir. Esto corre en cada fotograma de scroll. */
    if (ultimaCategoriaPintada === normalized) return;
    ultimaCategoriaPintada = normalized;
    $all('[data-home-category]').forEach((button) => {
      const key = button.getAttribute('data-home-category');
      const isActive = key === normalized;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

      /* La pildora dice el NOMBRE y nada mas. El numero salia aqui, pero se repetia
         a dos dedos: el rotulo de la derecha ya cuenta lo que se esta viendo
         («59 modelos»), y las tarjetas de categoria lo dicen otra vez mas arriba.
         Se limpia el que hubiera pintado una version anterior. */
      const badge = button.querySelector('.chip-count');
      if (badge) badge.remove();
    });

    const total = document.querySelector('[data-home-catalog-total]');
    if (total) {
      const todos = cuentaDeCategoria(normalized);
      const visibles = cuentaVisibleDe(normalized);
      total.textContent = !todos
        ? ''
        : (visibles === todos
            ? todos + ' ' + unidadDe(normalized, todos)
            : visibles + ' de ' + todos + ' ' + unidadDe(normalized, todos));
    }
  };

  /* En móvil la tira desborda y hay que decirlo. El degradado del borde derecho
     lo pone el CSS; aquí solo se apaga al llegar al final, para no dejar la
     última píldora medio desvanecida cuando ya no hay nada más. */
  const marcarFinDeTira = () => {
    const nav = document.querySelector('[data-home-category-nav]');
    if (!nav) return;
    const alFinal = nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 2;
    nav.classList.toggle('esta-al-final', alFinal);
  };

  const setYear = () => {
    const yearEl = document.getElementById('y');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  };

  const setVh = () => {
    document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
  };

  const runIdle = (callback) => {
    if (typeof window.requestIdleCallback === 'function') {
      return window.requestIdleCallback(callback, { timeout: 900 });
    }
    return window.setTimeout(callback, 1);
  };

  // Las imágenes de producto se sirven `immutable, max-age=1 año`, así que sin
  // ?v= una foto reemplazada NUNCA llega al visitante que ya la tenía cacheada.
  // Pasó de verdad: al cambiar 23.webp (era el logo de Ecoxtrem) por el patinete
  // verde, la ficha se actualizó —sus URLs sí llevan versión— pero la tarjeta del
  // home y el carrito seguían mostrando el logo. Todo lo que salga de aquí lleva
  // versión.
  const assetVer = () => {
    if (window.ASSET_VER) return String(window.ASSET_VER).trim();
    const meta = document.querySelector('meta[name="asset-version"]');
    return meta ? String(meta.getAttribute('content') || '1').trim() : '1';
  };

  const withVer = (url) => {
    const raw = String(url || '').trim();
    if (!raw || /^(https?:)?\/\//.test(raw) || raw.indexOf('?') !== -1) return raw;
    return raw + '?v=' + encodeURIComponent(assetVer());
  };

  // Anchos de .card-shot en cada punto de corte de .grid, para que el navegador
  // elija la variante justa en vez de traerse el original de 1200-1500 px:
  //  ≤640px  → 2 columnas, tarjeta ≈ 46vw (≈173px en un móvil de 390px)
  //  ≤980px  → 2 columnas anchas
  //  ≤1199px → 3 columnas
  //  resto   → 4 columnas en un contenedor de 1340px ⇒ ≈310px fijos
  const CARD_SHOT_SIZES = '(max-width:640px) 46vw, (max-width:980px) 47vw, (max-width:1199px) 31vw, 320px';

  // Las variantes las genera scripts/build-card-shots.py con esta convención.
  const cardShotSrcset = (src) => {
    const clean = String(src || '').split('?')[0];
    const dot = clean.lastIndexOf('.');
    if (dot < 1) return '';
    const base = clean.slice(0, dot);
    // El escalón de 600 existe por medición: sin él, un móvil DPR3 (174css × 3
    // = 522px) saltaba al de 800 y se traía un 54 % más de píxeles del necesario.
    // SIN versión: las fotos no van con la versión global (se sirven immutable y
    // re-versionarlas las rebajaba enteras en cada despliegue). Ver la regla completa
    // en scripts/qa/check-image-cache.ps1.
    return base + '-400.webp 400w, '
         + base + '-600.webp 600w, '
         + base + '-800.webp 800w';
  };

  // Foto única de la tarjeta. Antes esto pintaba TODA la galería como
  // diapositivas de un carrusel arrastrable; se eliminó porque chocaba con la
  // segunda vista al pasar el ratón (data-hover-image), que es la que manda.
  /* LA SEGUNDA VISTA DEL RATÓN: la primera foto de la galeria que NO sea la portada.
     Era `gallery[1]` a secas, con el comentario "los 34 productos tienen gallery[1] y
     en todos difiere de la foto de portada". Con 88 dejo de ser verdad: en 7 —cubre
     cables, puños jaspeados, WAKE Downhill, NANLIO, los dos protectores y la potencia
     LUNJE— la portada ES la gallery[1], así que al pasar el ratón se enseñaba la MISMA
     foto que ya se estaba viendo y parecía que la tarjeta no hacía nada.
     Vive aquí, en un solo sitio, porque lo necesitan el marcado (data-hover-image) y
     el manejador del hover; tenerlo dos veces es como se rompió. Se comparan las rutas
     sin `?v=` y sin el sufijo de medida (`-400`), porque la tarjeta pinta la portada en
     su versión pequeña. */
  const mismaFoto = (a, b) => {
    const base = (s) => String(s || '').split('?')[0].replace(/-\d+(\.webp)$/i, '$1');
    return !!a && !!b && base(a) === base(b);
  };
  const fotoDeHover = (product) => (product && (product.gallery || [])
    .map((g) => g && g.src)
    .find((src) => src && !mismaFoto(src, product.image))) || '';

  const buildCardShotMarkup = (product, productIndex) => {
    /* La tarjeta usa la PORTADA declarada (`image`), no `gallery[0]`. No son lo mismo
       desde que la ficha abre con la foto del color por defecto: `gallery[0]` es esa
       foto —un solo color— y la tarjeta debe seguir enseñando el muestrario, que es
       lo que cuenta que hay donde elegir. `gallery[0]` queda de reserva por si algún
       producto no declarase portada. */
    const lead = product.image
      ? { src: product.image, alt: product.alt || product.name }
      : ((Array.isArray(product.gallery) && product.gallery.length)
        ? product.gallery[0]
        : { src: product.image, alt: product.alt || product.name });
    const isHeroCard = productIndex === 0;
    const loading = isHeroCard ? 'eager' : 'lazy';
    /* PRIORIDAD BAJA para las demás. `loading="lazy"` no basta en un carril
       horizontal: el navegador considera "cerca del viewport" todo lo que cabe a unos
       miles de píxeles a la derecha, así que en el home se bajaban ~20 fotos de
       tarjeta a la vez y competían por el ancho de banda con la imagen de portada, que
       es la que decide el LCP. Con `low` siguen bajándose —el carril se puede arrastrar
       en cualquier momento— pero DETRÁS de lo que el cliente está mirando. */
    const fetchpriority = isHeroCard ? ' fetchpriority="high"' : ' fetchpriority="low"';
    const srcset = cardShotSrcset(lead.src);
    const responsive = srcset
      ? ' srcset="' + esc(srcset) + '" sizes="' + CARD_SHOT_SIZES + '"'
      : '';
    return '<img class="card-shot" src="' + esc(lead.src) + '"' + responsive + ' alt="' + esc(lead.alt || product.alt || product.name) + '" loading="' + loading + '"' + fetchpriority + ' decoding="async" />';
  };

  // Red de seguridad del srcset: si a un producto nuevo le faltan las variantes
  // (p. ej. se creó con el scaffold y no se ejecutó build-card-shots.py), el
  // navegador NO cae solo al src — dejaría la foto rota. Aquí se detecta el
  // fallo, se quita el srcset y se recupera el original. Va en captura porque
  // el evento `error` de <img> no burbujea.
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (!img || img.tagName !== 'IMG' || !img.classList.contains('card-shot')) return;
    if (!img.hasAttribute('srcset')) return;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
  }, true);

  const buildPriceRowMarkup = (product) => {
    const now = esc(product.priceText || '');
    const was = esc(product.compareAtPriceText || '');

    /* Aqui se calculaba el PORCENTAJE ROJO (-13%). Retirado del sitio entero el
       27 de agosto de 2026: el precio tachado ya dice que hay rebaja, y la
       pastilla roja competia con el precio dentro de una tarjeta pequena. Lo
       unico que sobrevive es `.price-values`, que agrupa precio y tachado. */

    // Always wrap price content in .price-values so discount badge renders correctly
    const priceValuesMarkup = '<div class="price-values"><div class="price-now">' + now + '</div>' + (was ? '<div class="price-was">' + was + '</div>' : '') + '</div>';

    return '<div class="price-row" aria-label="' + esc(product.priceAriaLabel || ('Precio ' + (product.menuLabel || product.name || 'producto'))) + '">' + priceValuesMarkup + '</div>';
  };

  /* LA ETIQUETA DGT. El logotipo oficial en negro sobre placa blanca, en un
     WebP de 2,6 KB — el sello azul de antes era un SVG trazado de 236 KB. Va DENTRO de .card-media, pegada al canto derecho de
     la foto, y es UNA sola — antes se pintaban dos por tarjeta (`--price` en
     la fila del precio para escritorio, `--info` en la cabecera para movil)
     porque el sitio cambiaba con el ancho, y el CSS escondia la que sobrase.
     El texto de la nube sigue viajando en data-tooltip-text: lo lee
     initDgtTooltips(), que mide el boton y no sabe nada de donde esta. */
  const buildDgtTagMarkup = (product) => {
    if (!product.dgtCertified) return '';
    return '<div class="dgt-tooltip dgt-tooltip--tab" data-dgt-tooltip><button class="dgt-tooltip-toggle" type="button" aria-label="Informacion sobre homologacion DGT" aria-expanded="false" data-tooltip-text="' + esc(product.dgtTooltipText || '') + '"><span class="dgt-tag"><img class="dgt-tag-logo" src="/img/marcas/dgt.webp" alt="DGT" width="163" height="64" decoding="async"></span></button></div>';
  };

  // Datos comunes que cart-runtime necesita en cualquier botón de añadir.
  const buildCartDataAttrs = (product, image) => {
    return ' data-sku="' + esc(product.sku || '') + '"'
      + ' data-name="' + esc(product.menuLabel || product.name || 'Producto') + '"'
      + ' data-price="' + esc(product.priceText || '') + '"'
      + ' data-url="' + esc(product.href || '') + '"'
      + ' data-image="' + esc(image || product.image || '') + '"'
      + ' data-stock="in_stock"';
  };

  // Imagen de la variante: colorVariants trae range:[desde,hasta] con los
  // índices de sus fotos, así que la primera del color es {href}/img/{desde}.webp.
  // Es el mismo criterio que usa la ficha para la imagen del carrito.
  /* La foto de una opción: sus imágenes son identificadores explícitos en el catálogo
     (`images: [1,2]`), no un tramo que haya que interpretar aquí. */
  const variantImage = (product, variant) => {
    const first = (variant && Array.isArray(variant.images) && variant.images.length)
      ? variant.images[0]
      : (Array.isArray(variant && variant.range) ? Number(variant.range[0]) : 0);
    const href = String(product.href || '').replace(/\/+$/, '');
    if (!href || !first) return product.image || '';
    return /^\d+$/.test(String(first)) ? (href + '/img/' + first + '.webp') : String(first);
  };

  const buildAddToCartButtonMarkup = (product) => {
    const stock = String(product.stock || 'in_stock').toLowerCase();
    const name = esc(product.menuLabel || product.name || 'producto');

    /* AGOTADO SE DIBUJA, no se calla. Antes esto devolvía '' y la tarjeta se quedaba con
       la fila de botones vacía: el producto parecía a medio pintar y era la única de la
       parrilla más baja que las demás. Ahora lleva el MISMO botón inerte de la ficha
       (`.btn-main.is-disabled`): gris #e5e7eb, texto #9ca3af, icono de bolsa y sin
       sombra. La geometría sigue siendo la de la tarjeta (46px, .79rem), no la del panel
       de la ficha (54px, .86rem), para que case con los botones de al lado.

       Lleva `pointer-events:none` como en la ficha, y eso aquí hace un trabajo extra: el
       clic ATRAVIESA el botón hasta el <article>, así que pulsar sobre "Agotado" lleva a
       la ficha, que es donde está el RESERVAR de WhatsApp. Con `disabled` a secas el
       navegador ni siquiera reparte el evento y la tarjeta se quedaba muerta.

       Solo `out_of_stock`. Un estado de reserva (que hoy no usa ningún producto) seguiría
       sin botón: en la tarjeta no hay WhatsApp al lado, así que un "Reservar" inerte sería
       un callejón sin salida. */
    if (stock === 'out_of_stock') {
      return '<button class="btn-cart btn-cart--agotado" type="button" disabled aria-disabled="true"'
        + ' aria-label="' + name + ' agotado">Agotado</button>';
    }
    if (stock !== 'in_stock') return '';

    /* ¿HAY ALGO QUE PREGUNTAR? Lo dicen los ejes declarados por el producto, no una
       lista de colores. Antes esto miraba `colorVariants`, y por eso el manillar UNO y
       el KOCEVLO —dos ejes, modelo y medida, y un solo acabado— caían en "añadir
       directo" y entraban al pedido sin decir qué modelo ni qué medida.
       Un producto con tres ejes que no existan hoy funciona igual sin tocar esto.

       Una opción agotada se cae de la elección del home para que no se pueda pedir; en
       la ficha sí sigue visible pero deshabilitada, porque ahí interesa que el cliente
       vea que existe y está agotada. Qué cuenta como agotada lo decide el núcleo. */
    const ejes = (window.SS_ATTRS ? window.SS_ATTRS.ejes(product) : [])
      .map((eje) => ({ eje, options: eje.options.filter((o) => o && o.key && !o.disabled) }))
      .filter((x) => x.options.length);

    const opcionesTotales = ejes.reduce((n, x) => n + x.options.length, 0);
    const tieneEjes = ejes.length > 1 || opcionesTotales > 1
      || (typeof product.variantHint === 'string' && !!product.variantHint);
    const variants = ejes.length === 1 ? ejes[0].options : [];

    // Sin nada que elegir: se añade directo y el pedido queda sin variante ("Único").
    if (!tieneEjes && !variants.length) {
      return '<button class="btn-cart" type="button" data-add-to-cart data-added-label="Añadido"' + buildCartDataAttrs(product) + ' aria-label="Añadir al carrito ' + name + '"><i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Añadir</button>';
    }

    /* Una sola opción y ningún otro eje: es LA variante del producto, no hay nada que
       elegir. Entra al carrito con su atributo nombrado ({ color:'negro' },
       { model:'vmp' }… lo que declare el producto), no solo con la clave suelta: eso es
       lo que permite que el pedido diga después "Modelo: …" y no "Color: …". */
    if (!tieneEjes && variants.length === 1) {
      const only = variants[0];
      const eje = ejes[0].eje;
      const attrs = esc(JSON.stringify({ [eje.key]: only.key }));
      return '<button class="btn-cart" type="button" data-add-to-cart data-added-label="Añadido"' + buildCartDataAttrs(product, variantImage(product, only)) + ' data-color="' + esc(only.key) + '" data-color-label="' + esc(only.label || only.key) + '" data-attrs="' + attrs + '" aria-label="Añadir al carrito ' + name + '"><i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Añadir</button>';
    }

    /* Hay algo que elegir: el botón abre la MISMA burbuja que la caja "Añade algo más"
       de las fichas (js/variant-pop.js), que pregunta TODOS los ejes del producto —los
       colores del catálogo y, además, el modelo y la medida que solo conoce la ficha.

       Antes aquí se pintaba una paleta de colores propia (`.card-colors` +
       `.color-pop`) y cada círculo era el que añadía. Se quedó corta: solo sabía de
       color, así que un producto con modelo o medida —los manillares— se añadía
       desde el home sin esos ejes, o no se podía añadir en condiciones. La burbuja
       compartida los lee de la ficha del propio producto, así que cubre cualquier
       combinación presente y futura sin tocar el home.

       El href es lo único que necesita: de ahí saca la ficha y, de ella, los ejes.

       El botón NO dice "Añadir" ni lleva el carrito: pulsarlo no añade nada, abre la
       burbuja para elegir. Dice lo que hace —"Elegir opción"— con la misma flecha del
       "Continuar a pago" del checkout, que avanza al pasar el ratón. Los productos sin
       nada que elegir (los dos casos de arriba) SÍ añaden de un clic y conservan el
       carrito y su "Añadir": el botón y el gesto tienen que seguir contándose igual. */
    return '<button class="btn-cart btn-cart--elegir" type="button" data-open-variants="' + esc(product.href || '') + '"'
      + ' aria-expanded="false" aria-haspopup="dialog"'
      + ' aria-label="Elegir opciones de ' + name + '">Elegir opción'
      + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>'
      + '</button>';
  };

  /* La burbuja de variantes vive en su propio archivo, compartido con las fichas.
     Se pide en cuanto hay una tarjeta que la pueda abrir. Doble red: el módulo se
     protege con window.__ssVariantPop (en las fichas lo carga también
     product-enhancements.js) y aquí se evita el segundo <script>. */
  /* La burbuja se pide cuando el hilo está LIBRE, no en cuanto aparece una tarjeta que
     podría abrirla. Medido en móvil con red lenta: empezaba a los 2,5 s y terminaba a
     los 3,6 s, justo mientras se descargaban las fotos que el cliente está mirando.
     Nadie puede pulsar "Añadir" en ese hueco —la página aún se está pintando— así que
     esperar a un momento ocioso no cambia nada de lo que se ve ni de lo que se puede
     hacer; solo deja de competir por el ancho de banda. El respaldo con temporizador
     es para Safari, que no tiene requestIdleCallback. */
  const ensureVariantPop = () => {
    if (document.querySelector('script[data-variant-pop]')) return;
    const pedir = () => {
      if (document.querySelector('script[data-variant-pop]')) return;
      const s = document.createElement('script');
      s.src = withVer('/js/variant-pop.js');
      s.defer = true;
      s.setAttribute('data-variant-pop', 'true');
      document.head.appendChild(s);
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(pedir, { timeout: 3000 });
    else setTimeout(pedir, 1200);
  };

  /* ===== Previsualización de la foto sobre la tarjeta =====
     Nació para la paleta de colores del home —al pasar por un color aparecía su
     foto— y sigue viva para el hover de la tarjeta, que enseña la segunda vista del
     producto. La paleta ya no existe: la sustituyó la burbuja compartida
     (js/variant-pop.js), que pregunta todos los ejes y no solo el color.

     Se usa una capa encima del carrusel en lugar de moverlo, así no se altera su
     estado ni la diapositiva actual.
     Disolución + escala: la foto entra fundiéndose sobre la anterior mientras pasa
     de un 103,5 % a su tamaño natural. Al ser el mismo patinete en la misma pose, se
     percibe como si se tiñera en el sitio, y el leve movimiento disimula cualquier
     desalineación entre tomas. Duración y curva las define el CSS
     (.card-color-preview); aquí solo se cruzan las capas.

     Solo con ratón de verdad. En táctil no hay hover: el navegador sintetiza un
     "mouseenter" al tocar y la foto se quedaría cambiada hasta tocar fuera. */
  const CAN_HOVER = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  const ensurePreviewLayers = (media) => {
    const layers = Array.prototype.slice.call(media.querySelectorAll('[data-color-preview]'));
    while (layers.length < 2) {
      const img = document.createElement('img');
      img.className = 'card-color-preview';
      img.setAttribute('data-color-preview', '');
      img.setAttribute('alt', '');
      img.setAttribute('aria-hidden', 'true');
      img.setAttribute('decoding', 'async');
      media.appendChild(img);
      layers.push(img);
    }
    return layers;
  };

  /* Contador por tarjeta que invalida los revelados EN VUELO.

     El revelado no es inmediato: espera al onload de la segunda foto y además a dos
     frames. Ese hueco puede terminar mucho después de que el ratón se haya ido, y
     entonces encendía la capa cuando ya no había nadie encima. Rozando una tarjeta y
     saliendo, el ocultar no encontraba todavía nada puesto (no hacía nada) y el onload
     posterior dejaba la segunda foto fija PARA SIEMPRE, porque solo se apaga al salir
     y ya se había salido.

     Cada intento de mostrar coge un número, y ocultar quema el vigente. El revelado
     solo se aplica si el suyo sigue siendo el bueno. */
  const nextPreviewToken = (media) => {
    media.ssPreviewToken = (media.ssPreviewToken || 0) + 1;
    return media.ssPreviewToken;
  };

  const showColorPreview = (card, src) => {
    if (!card || !src) return;
    const media = card.querySelector('.card-media');
    if (!media) return;

    const layers = ensurePreviewLayers(media);
    const active = layers.filter((l) => l.classList.contains('is-on'))[0] || null;
    // Ya se está mostrando ese color: no repetimos la animación.
    if (active && active.getAttribute('src') === src) return;

    const next = layers.filter((l) => l !== active)[0] || layers[0];
    const token = nextPreviewToken(media);
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      // Doble rAF: el navegador necesita registrar el estado inicial (opacidad
      // 0 y escala ampliada) antes de animar. Sin esto el cambio sería seco.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        // El ratón pudo irse mientras cargaba la foto, o entre estos dos frames.
        if (media.ssPreviewToken !== token) return;
        next.classList.add('is-on');
        if (active && active !== next) active.classList.remove('is-on');
      }));
    };

    next.classList.remove('is-on');
    // Un onload viejo de esta misma capa quedaría colgado apuntando a otra foto.
    next.onload = null;
    if (next.getAttribute('src') === src && next.complete) { reveal(); return; }
    // La segunda vista no está en el documento: esperamos a tenerla cargada
    // para no fundir sobre un hueco en blanco.
    next.onload = reveal;
    next.setAttribute('src', src);
    if (next.complete) reveal();
  };

  const hideColorPreview = (card) => {
    if (!card) return;
    // Quema el número vigente: si hay una foto aún cargando, su revelado llegará
    // cuando el ratón ya no esté y se descartará solo.
    const media = card.querySelector('.card-media');
    if (media) nextPreviewToken(media);
    const layers = card.querySelectorAll('[data-color-preview]');
    for (let i = 0; i < layers.length; i++) layers[i].classList.remove('is-on');
  };

  const buildCardMarkup = (product, productIndex) => {
    /* `has-dgt` se uso hasta agosto de 2026 para reservarle hueco al sello
       redondo en la fila del precio y en el titulo. La etiqueta va sobre la
       foto y no le quita sitio a nadie, asi que la clase se quedo sin una sola
       regla y se fue con ella. */
    const cardClassName = 'card';
    const cardAttrs = [
      'class="' + cardClassName + '"',
      'id="p-' + esc(product.id) + '"',
      'tabindex="0"',
      'data-name="' + esc(product.name || '') + '"',
      'data-sku="' + esc(product.sku || '') + '"',
      'data-was="' + esc(product.compareAtPriceText || '') + '"',
      'data-now="' + esc(product.priceText || '') + '"',
      'data-stock="' + esc(product.stock || 'in_stock') + '"',
      'data-link="' + esc(product.href || '') + '"',
      'aria-label="' + esc(product.homeAriaLabel || product.name || 'Producto') + '"'
    ];
    // Segunda vista del producto: se funde encima al pasar el ratón por la
    // tarjeta (mismo efecto que al pasar por un color). Ver `fotoDeHover`: NO puede
    // ser gallery[1] a secas, hay portadas que son justo esa.
    const hoverShot = fotoDeHover(product);
    if (hoverShot) {
      cardAttrs.push('data-hover-image="' + esc(hoverShot) + '"');
    }
    return '<article ' + cardAttrs.join(' ') + '><div class="card-media">' + buildCardShotMarkup(product, productIndex) + buildDgtTagMarkup(product) + '</div><div class="card-info"><span class="chip-name">' + esc(product.badgeText || product.menuLabel || product.name || '') + '</span><div class="card-body"><div class="card-brand">' + esc(product.brand || '') + '</div><div class="title">' + esc(product.homeTitle || product.name || '') + '</div></div></div><div class="card-bottom">' + buildPriceRowMarkup(product) + '<div class="btn-row"><a class="btn-primary" href="' + esc(product.href || '#') + '" data-buy-button>VISTA</a>' + buildAddToCartButtonMarkup(product) + '</div></div></article>';
  };

  const buildHomeEmptyStateMarkup = (categoryKey) => {
    const meta = getHomeCategoryMeta(categoryKey);
    if (!meta || normalizeHomeCategoryKey(categoryKey) === DEFAULT_HOME_CATEGORY_KEY) return '';
    return '<section class="container catalog-empty-state" aria-label="' + esc(meta.emptyTitle || meta.label || '') + '"><h2>' + esc((meta.emptyTitle || meta.label || '') + ' · Próximamente') + '</h2><p>' + esc(meta.emptyDescription || 'Estamos preparando esta categoría para mostrarla en la home.') + '</p></section>';
  };

  // ===== Brand logos and series visual identity =====
  const SERIES_VISUALS = {
    ecoxtrem: { logo: '/img/marcas/ecoxtrem-logo.webp', logoMaxW: 168, logoW: 168, logoH: 42, alt: 'Ecoxtrem Urban Mobility', accent: '#0b3b8c' },
    k:        { logo: '/img/marcas/kukirin-logo.webp',  logoMaxW: 132, logoW: 132, logoH: 44, alt: 'KuKirin', accent: '#ff8c51', rielLogo: '/img/marcas/kukirin-wordmark.webp', rielW: 500, rielH: 89 },
    /* `accent` ya no lo consume nadie: lo usaba la ficha de serie, que se
       eliminó. Se conserva por si vuelve a hacer falta. ROVORON no lo trae. */
    rovoron:  { logo: '/img/marcas/rovoron-logo.webp', logoMaxW: 200, logoW: 500, logoH: 102, alt: 'ROVORON' },
    /* DUALTRON. La placa no se ve hasta que la marca tenga su primer producto
       (buildMarcasRielMarkup descarta las series con cero), pero el visual va
       declarado ya para que ese dia no haya que tocar nada. El logotipo es un
       wordmark muy apaisado (10,45:1): en la placa lo limita `max-width:226px`
       con `object-fit:contain`, asi que no se deforma. Su rojo da igual — el
       riel lo convierte en silueta con brightness(0). */
    dualtron: { logo: '/img/marcas/dualtron-logo-v2.webp', logoMaxW: 226, logoW: 500, logoH: 149, alt: 'DUALTRON' },
    /* JOYOR. Su logotipo lo publican BLANCO sobre transparencia —está hecho para
       cabecera oscura— y solo a 350 px. Da igual para las dos plazas donde se
       usa: el riel lo pinta en silueta blanca y la píldora de la ficha en negro,
       y ninguno de los dos filtros mira el color de origen. */
    joyor:    { logo: '/img/marcas/joyor-logo.webp', logoMaxW: 210, logoW: 346, logoH: 77, alt: 'JOYOR' },
    n:        { accent: '#5b6472' },
    gt:       { accent: '#1f7a4d' },
    ix:       { accent: '#7c3aed' },
    b:        { accent: '#16a34a' },
    motos:    { accent: '#0ea5e9' },
    acc:      { accent: '#f59e0b' },
    'acc-limit': { accent: '#dc2626' }
  };

  const getSeriesVisual = (seriesKey) => SERIES_VISUALS[String(seriesKey || '').toLowerCase()] || null;

  /* La ficha de serie se eliminó: repetía el logo y el recuento que la placa del
     riel ya pone 40 px más arriba, y su barra vertical de color era hermana de
     las líneas que se quitaron de las placas. Lo único suyo —la descripción de
     la marca— pasó a una línea bajo el riel, que aparece al elegirla.

     Queda un ANCLAJE vacío porque el menú PRODUCTOS enlaza a `/#ecoxtrem`,
     `/#series-k`… (js/products-menu.js). Sin él esos enlaces caerían al tope de
     la home. No pinta nada: solo marca el sitio. */
  const buildSeriesAnclaMarkup = (series) => {
    const sectionId = esc(series.homeSectionId || ('series-' + series.key));
    return '<div class="serie-ancla" id="' + sectionId + '" aria-hidden="true"></div>';
  };

  /* Riel de marcas de una categoría.
     Va DENTRO de la sección de categoría, no en la barra pegajosa: así siempre
     corresponde a lo que hay debajo y el cromo fijo no crece. FILTRA: deja la
     serie elegida y esconde las demás; «Todos» las devuelve.
     Con una sola serie no se pinta: un riel de un elemento no es un riel. */
  const buildMarcasRielMarkup = (category) => {
    const series = (category.series || []).map((serie) => {
      const productos = Array.isArray(serie.products)
        ? serie.products
        : getSeriesProducts(serie.key).filter((p) => p.showOnHome !== false);
      return { serie, n: productos.length };
    }).filter((item) => item.n > 0);

    if (series.length < 2) return '';

    const esPieza = category.key === 'accessories' || category.key === 'spare-parts';
    const rotulo = esPieza ? 'Familia' : 'Marca';

    const total = series.reduce((n, item) => n + item.n, 0);
    const unidadTotal = esPieza
      ? (total === 1 ? 'producto' : 'productos')
      : (total === 1 ? 'modelo' : 'modelos');

    /* «Todos» va PRIMERO y nace activo: el riel filtra, así que hace falta una
       forma de deshacer.

       Lleva descripción como cualquier marca, pero la suya es la de la CATEGORÍA
       —`homeDescription`—, porque eso es lo que se está viendo cuando no hay
       filtro. SIN `data-marca-nombre` a propósito: la línea quedaría
       «**Patinetes eléctricos.** …» justo debajo de «Todo el catálogo» y de la
       píldora «Patinetes», diciendo lo mismo tres veces. */
    /* «Todos» NO lleva descripcion a proposito: la linea de debajo esta para contar
       algo de la marca elegida, y con «Todos» puesto —que es el estado de partida—
       solo repetia lo que ya dicen el titular y la pildora de categoria. Sin el
       atributo, la logica de mas abajo esconde la linea ella sola. */
    const todos = '<button class="home-marca home-marca--todos esta-activa" type="button" data-home-marca="" aria-pressed="true">'
      + '<span class="home-marca-int">'
        + '<span class="home-marca-nom">Todos</span>'
        + '<span class="home-marca-kpi">' + total + ' ' + unidadTotal + '</span>'
      + '</span>'
    + '</button>';

    const tarjetas = series.map(({ serie, n }) => {
      const visual = getSeriesVisual(serie.key);
      const destino = serie.homeSectionId || ('series-' + serie.key);
      const unidad = esPieza
        ? (n === 1 ? 'producto' : 'productos')
        : (n === 1 ? 'modelo' : 'modelos');
      /* En la placa manda el ANCHO, así que si la marca tiene una versión
         apaisada del logo se usa esa: el bloqueo vertical de KuKirin (león
         encima del nombre) gastaba todo el alto en el dibujo. */
      const logoRiel = visual && (visual.rielLogo || visual.logo);
      const nombre = logoRiel
        ? '<img class="home-marca-logo" src="' + esc(logoRiel) + '" alt="' + esc(visual.alt || serie.label || '') + '" loading="lazy" decoding="async" width="' + esc(String(visual.rielW || visual.logoW || 132)) + '" height="' + esc(String(visual.rielH || visual.logoH || 32)) + '" />'
        : '<span class="home-marca-nom">' + esc(serie.homeTitle || serie.label || '') + '</span>';
      const desc = serie.homeDescription || '';
      return '<button class="home-marca" type="button" data-home-marca="' + esc(destino) + '" aria-pressed="false"'
        + ' data-marca-nombre="' + esc(serie.homeTitle || serie.label || '') + '"'
        + (desc ? ' data-marca-desc="' + esc(desc) + '"' : '') + '>'
        + '<span class="home-marca-int">'
          + nombre
          + '<span class="home-marca-kpi">' + n + ' ' + unidad + '</span>'
        + '</span>'
      + '</button>';
    }).join('');

    /* Sin rótulo visible: encima ya está «Todo el catálogo» y un «MARCA» en
       mono a 10 px hacía un tercer nivel de titular. Las placas se explican
       solas, y el nombre del grupo sigue en el aria-label.
       La línea de descripción nace vacía: solo dice algo al elegir una marca.
       Es lo ÚNICO que aportaba la ficha de serie que se eliminó. */
    /* El riel va FUERA de `.container`, a sangre: el corte de las placas tiene
       que ocurrir en el borde de la pantalla, que es donde el ojo espera que las
       cosas se acaben. Dentro del contenedor cortaba a 22 px del filo y se leía
       como un fallo de pintado. Su relleno lateral replica el del contenedor,
       así que la primera placa sigue alineada con «Todo el catálogo».
       La descripción sí se queda dentro: es texto y tiene que alinear. */
    return '<div class="home-marcas">'
      + '<div class="home-marcas-riel esta-al-inicio" role="group" aria-label="Filtrar por ' + rotulo.toLowerCase() + '">' + todos + tarjetas + '</div>'
      + '<div class="container"><p class="home-marcas-desc" data-home-marcas-desc hidden></p></div>'
    + '</div>';
  };

  /* Firma corta y estable del marcado. No es criptografía: solo tiene que cambiar
     cuando cambie una coma, para saber si lo que ya hay pintado en el HTML es
     EXACTAMENTE lo que este código pintaría. */
  const firmaDeMarcado = (html) => {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < html.length; i++) {
      const c = html.charCodeAt(i);
      h1 = ((h1 ^ c) * 16777619) >>> 0;
      h2 = ((h2 + c) * 31 + (h2 >>> 7)) >>> 0;
    }
    return h1.toString(36) + '-' + h2.toString(36) + '-' + html.length.toString(36);
  };

  /* El marcado del catálogo, como TEXTO. Está separado del pintado porque hay dos
     consumidores: este archivo, que lo mete en el DOM, y scripts/build-home-catalog.js,
     que lo guarda dentro de index.html para que la parrilla exista desde el primer
     pintado. Un solo generador, dos destinos — el mismo patrón que attributes-index. */
  const buildHomeCatalogMarkup = (categoryKey) => {
    const clave = normalizeHomeCategoryKey(categoryKey);
    const orderedCategories = getOrderedHomeCategories(clave);
    const hasSelectedCategory = orderedCategories.some((category) => category.key === clave);
    const leadingMarkup = hasSelectedCategory ? '' : buildHomeEmptyStateMarkup(clave);
    return { clave, orderedCategories, html: leadingMarkup + marcadoDeCategorias(orderedCategories) };
  };

  const marcadoDeCategorias = (orderedCategories) => {
    return orderedCategories.map((category) => {
      const categoryHeader = category.showHeaderOnHome
        ? '<section class="catalog-category"><div class="container"><h2>' + esc(category.homeTitle || category.label || '') + '</h2>' + (category.homeDescription ? '<p>' + esc(category.homeDescription) + '</p>' : '') + '</div></section>'
        : '';

      const seriesMarkup = (category.series || []).map((series) => {
        const products = Array.isArray(series.products)
          ? series.products
          : getSeriesProducts(series.key).filter((product) => product.showOnHome !== false);
        if (!products.length) return '';
        const listingId = series.listingSectionId ? ' id="' + esc(series.listingSectionId) + '"' : '';
        const heroMarkup = buildSeriesAnclaMarkup(series);

        /* RÓTULO DEL TRAMO: de quién es lo que viene a continuación.
           Es EXACTAMENTE la misma pieza que la línea del riel al elegir una marca
           —«**KuKirin.** Rendimiento sólido…» y la raya debajo—, con el mismo texto
           (`homeDescription`), el mismo tamaño y el mismo gris. Se trae aquí para
           que también se lea recorriendo el catálogo entero sin filtrar.

           El texto va ENCIMA de la raya, como en el riel: primero se dice de quién
           es el tramo y la raya lo cierra contra las tarjetas.

           Dos elementos y no uno: la raya cuelga del <div>, que ocupa todo el
           ancho, y la medida de lectura (68ch) va en el <p> de dentro. Con la raya
           en el mismo elemento que el `max-width`, la línea se quedaba corta.

           Un <div>, NO un <header>: en `css/main.css` el selector de elemento
           `header{ position:fixed }` es la cabecera del sitio, así que cualquier
           <header> del documento se convierte en una barra fija arriba del todo
           —los once rótulos acabaron apilados en y=0 sobre el menú. */
        const nombreTramo = series.homeTitle || series.label || '';
        const descTramo = series.homeDescription || '';
        const rotuloTramo = nombreTramo
          ? '<div class="series-rotulo">'
              + '<p class="series-rotulo-txt"><b>' + esc(nombreTramo) + '.</b>'
                + (descTramo ? ' ' + esc(descTramo) : '')
              + '</p>'
            + '</div>'
          : '';

        return heroMarkup
          + '<section' + listingId + ' class="container series-products" aria-label="' + esc(series.homeAriaLabel || ('Lista de productos ' + (series.label || ''))) + '" data-series-products="' + esc(series.homeSectionId || ('series-' + series.key)) + '">'
            + rotuloTramo
            + '<div class="grid">'
              + products.map((product, idx) => buildCardMarkup(product, idx)).join('')
            + '</div>'
          + '</section>';
      }).join('');

      const categorySectionId = getHomeCategorySectionId(category.key);
      const categoryFallback = !seriesMarkup
        ? '<section class="container catalog-empty-state" aria-label="' + esc(category.homeTitle || category.label || '') + '"><h2>' + esc((category.homeTitle || category.label || '') + ' · Próximamente') + '</h2><p>Estamos preparando esta categoría para mostrarla en la home.</p></section>'
        : '';

      return '<section class="home-category-section" id="' + esc(categorySectionId) + '" data-home-category-section="' + esc(category.key) + '">'
        + categoryHeader
        + buildMarcasRielMarkup(category)
        + seriesMarkup
        + categoryFallback
      + '</section>';
    }).join('');
  };

  const renderHomeCatalog = (categoryKey = activeHomeCategoryKey) => {
    /* Anclado a #comprar y no a `[data-home-catalog-root]` a secas: ese atributo es
       el CONTRATO DE ESTILO de la tarjeta y ahora lo llevan también los destacados y
       los resultados por intención, que van ANTES en el documento. Con el selector
       genérico, querySelector devolvía el primero y el catálogo entero se pintaba
       dentro del carril de destacados. */
    const root = document.querySelector('#comprar[data-home-catalog-root]');
    if (!root) return;

    activeHomeCategoryKey = normalizeHomeCategoryKey(categoryKey);
    syncHomeCategoryButtons();

    const { orderedCategories, html } = buildHomeCatalogMarkup(activeHomeCategoryKey);
    const firma = firmaDeMarcado(html);

    /* Si la parrilla YA viene en el HTML y es exactamente esta, no se toca. Reescribir
       `innerHTML` con lo mismo no sería inocuo: el navegador tira las <img> y las vuelve
       a pedir (es justo lo que vigila scripts/qa/check-image-dupes.js), y de paso
       destruiría el elemento al que la vuelta atrás se está anclando.
       La firma cambia si cambia un precio en el panel, y entonces sí se repinta. */
    if (root.getAttribute('data-home-catalog-firma') === firma && root.firstElementChild) {
      root.classList.add('is-hydrated');
      return;
    }

    root.innerHTML = html;
    root.setAttribute('data-home-catalog-firma', firma);
    root.classList.add('is-hydrated');

    /* Estado inicial del desvanecido: un riel que quepa entero no debe salir
       difuminado. Se mide después de pintar, cuando ya hay anchos de verdad. */
    requestAnimationFrame(revisarRieles);

    /* Y el estado inicial del FILTRO. `aplicarFiltroDeMarca` solo corría al
       pulsar, así que en la primera carga la línea de descripción se quedaba
       oculta y «Todos» —que ahora también tiene algo que contar— no decía nada
       hasta que elegías una marca y volvías. Llamarlo con lo que ya hay puesto
       es idempotente: marca activo lo que ya estaba activo y no mueve el scroll
       (eso vive en el manejador del clic, no aquí). */
    $all('.home-category-section', root).forEach((seccion) => {
      aplicarFiltroDeMarca(seccion, seccion.dataset.marcaActiva || '');
    });

    colocarBarraTrasElRiel(root);
    colocarFiltrosConLaMarca(root);
  };

  /* El boton de filtros va en la FILA DEL TEXTO que hay bajo el riel, a su derecha.
     Cual es ese texto depende de lo que este elegido, y por eso hay que recolocarlo
     en cada cambio de marca:
       - con una marca puesta, la descripcion de la marca (`.home-marcas-desc`);
       - con «Todos», esa descripcion esta oculta y el primer texto que aparece es
         el rotulo del primer tramo de la parrilla («Ecoxtrem. Movilidad urbana…»).
     Se MUEVE el boton, no se pinta otro: es el mismo elemento con sus manejadores
     y su `aria-controls`, y duplicarlo daria dos botones para un solo panel. */
  const colocarFiltrosConLaMarca = (root) => {
    if (!root || !root.dataset.soloCategoria) return;
    const boton = document.querySelector('.filtros-btn');
    if (!boton) return;

    const marcas = root.querySelector('.home-marcas');
    const desc = marcas ? marcas.querySelector('.home-marcas-desc') : null;
    let caja = null;
    if (desc && !desc.hidden) caja = desc.parentElement;
    else {
      /* El primer tramo que SE ESTE VIENDO: ni escondido por la marca elegida
         (`.esta-oculta`) ni vaciado por el filtro (`.filtro-vacio`). */
      const tramo = [...root.querySelectorAll('[data-series-products]')]
        .find((sec) => !sec.classList.contains('esta-oculta')
                    && !sec.classList.contains('filtro-vacio')
                    && sec.querySelector('.series-rotulo'));
      caja = tramo ? tramo.querySelector('.series-rotulo') : null;
    }
    const barra = document.querySelector('.home-catalog-head');

    /* Sin riel y sin rotulos —/repuestos, una sola marca— no hay donde ponerlo:
       se queda en su barra, que es justo para lo que existe. La barra nace oculta
       (CSS), asi que hay que ENSEÑARLA. */
    if (!caja) {
      /* Se lo lleva de vuelta a la barra: si se queda en el rotulo escondido, el
         boton se va con el aunque la barra este a la vista. */
      const hueco = barra && barra.querySelector('.home-catalog-barra');
      if (hueco && boton.parentElement !== hueco) hueco.appendChild(boton);
      if (barra && !barra.classList.contains('hace-falta')) {
        barra.classList.add('hace-falta');
        /* Acaba de aparecer cromo fijo: el alto que `getHomeStickyOffset()` tiene
           guardado ya no vale, y de ese numero dependen las anclas de serie. */
        altoPegajoso = 0;
      }
      return;
    }

    if (boton.parentElement !== caja) {
      caja.appendChild(boton);
      /* El destino del ancla puede haberse movido: este boton mide 42 px y acaba
         de entrar en un rotulo que esta POR ENCIMA de el. */
      if (reanclarHash) reanclarHash();
    }
    caja.classList.add('lleva-filtros');
  };

  /* En una pagina de categoria, la barra de filtros va DESPUES del riel de marcas:
     primero se enseña entre que se elige y luego se ofrece afinar. En el HTML esta
     antes porque el riel no existe hasta que el catalogo se pinta —lo genera este
     mismo archivo, dentro de #comprar—, asi que se recoloca aqui, una vez.

     Se MUEVE el nodo en lugar de pintarlo en otro sitio a proposito: el riel
     tiene que seguir colgando de `.home-category-section`, que es donde
     `aplicarFiltroDeMarca` busca sus placas y su linea de descripcion.

     En la portada no se hace nada: alli conviven varias categorias y la barra
     lleva las pildoras que las gobiernan a todas. */
  const colocarBarraTrasElRiel = (root) => {
    if (!root || !root.dataset.soloCategoria) return;
    const barra = document.querySelector('.home-catalog-head');
    const riel = root.querySelector('.home-marcas');
    if (!barra || !riel) return;
    if (barra.previousElementSibling === riel) return;   // ya esta puesta
    riel.parentNode.insertBefore(barra, riel.nextSibling);
  };

  // El raíl de series (scrollspy, sticky-top, anclas y su IntersectionObserver:
  // ~240 líneas) se ha eliminado con la zona que lo contenía. Las series viven
  // ahora en el menú PRODUCTOS y en /patinetes; en la portada las sustituye el
  // bloque "¿Cuál es para ti?", que pregunta por uso y no por nombre de serie.
  let homeCategoryObserver = null;
  let homeCategoryScrollBound = false;
  let homeCategoryScrollTick = 0;
  let homeCategoryPendingKey = '';
  let homeCategoryPendingDeadline = 0;

  const getPreferredScrollBehavior = () => {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
    } catch (_) {
      return 'smooth';
    }
  };

  const clearHomeCategoryPending = () => {
    homeCategoryPendingKey = '';
    homeCategoryPendingDeadline = 0;
  };

  const initHomeCategoryNav = () => {
    /* PRIMERO el riel de marcas: es todo delegado en el documento y no necesita
       la barra de pildoras. Estaba al final de esta funcion, detras del `return`
       de abajo, asi que en una pagina de categoria —que no tiene pildoras— elegir
       una marca dejaba de hacer nada. */
    initMarcasRiel();

    const nav = document.querySelector('[data-home-category-nav]');
    if (!nav) return;

    if (nav.dataset.bound !== 'true') {
      nav.addEventListener('click', (event) => {
        const button = event.target.closest('[data-home-category]');
        if (!button) return;
        const nextKey = normalizeHomeCategoryKey(button.getAttribute('data-home-category'));
        const targetSection = getCategorySectionElement(nextKey);
        if (!targetSection) return;

        event.preventDefault();

        // Update category state IMMEDIATELY
        activeHomeCategoryKey = nextKey;
        syncHomeCategoryButtons();
        ensureHomeCategoryChipVisible(nextKey, 'auto');

        try {
          sessionStorage.setItem('ss_homeCategory', activeHomeCategoryKey);
        } catch (_) {}

        // Force instant scroll by temporarily disabling CSS scroll-behavior
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlScrollBehavior = html.style.scrollBehavior;
        const prevBodyScrollBehavior = body.style.scrollBehavior;

        html.style.scrollBehavior = 'auto';
        body.style.scrollBehavior = 'auto';

        const top = targetSection.getBoundingClientRect().top + window.scrollY - getHomeStickyOffset();
        window.scrollTo(0, top);

        html.style.scrollBehavior = prevHtmlScrollBehavior;
        body.style.scrollBehavior = prevBodyScrollBehavior;

        // Set lock ONLY to prevent observer from overwriting during stabilization
        clearHomeCategoryPending();
        homeCategoryPendingKey = nextKey;
        homeCategoryPendingDeadline = Date.now() + 400;
      });
      nav.dataset.bound = 'true';
    }

    if (nav.dataset.finBound !== 'true') {
      nav.addEventListener('scroll', marcarFinDeTira, { passive: true });
      nav.dataset.finBound = 'true';
    }

    if (!homeCategoryScrollBound) {
      window.addEventListener('scroll', scheduleHomeCategoryViewportSync, { passive: true });
      window.addEventListener('resize', scheduleHomeCategoryViewportSync, { passive: true });
      window.addEventListener('resize', marcarFinDeTira, { passive: true });
      homeCategoryScrollBound = true;
    }

    syncHomeCategoryButtons();
    ensureHomeCategoryChipVisible(activeHomeCategoryKey, 'auto');
    scheduleHomeCategoryViewportSync();
    marcarFinDeTira();
  };

  /* El riel de marcas FILTRA la categoría: deja la serie elegida y esconde las
     demás. «Todos» las devuelve.

     Se OCULTA, no se repinta. Reescribir el marcado tiraría las <img> y el
     navegador las volvería a pedir —es justo lo que vigila
     scripts/qa/check-image-dupes.js— y además destruiría el elemento al que se
     ancla la vuelta atrás.

     Cada serie son DOS hermanos: la ficha (`#<id>`) y su parrilla
     (`[data-series-products="<id>"]`), y comparten el mismo identificador. */
  const aplicarFiltroDeMarca = (seccion, destino) => {
    if (!seccion) return;
    seccion.dataset.marcaActiva = destino || '';

    $all('.series.series-hero[id]', seccion).forEach((hero) => {
      hero.classList.toggle('esta-oculta', !!destino && hero.id !== destino);
    });
    $all('[data-series-products]', seccion).forEach((lista) => {
      const clave = lista.getAttribute('data-series-products');
      lista.classList.toggle('esta-oculta', !!destino && clave !== destino);
    });

    let elegido = null;
    $all('[data-home-marca]', seccion).forEach((boton) => {
      const activo = (boton.getAttribute('data-home-marca') || '') === (destino || '');
      boton.classList.toggle('esta-activa', activo);
      boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
      // Sin `&& destino`: «Todos» también es una elección, y también tiene algo
      // que contar. Antes se excluía y su línea no se leía nunca.
      if (activo) elegido = boton;
    });

    /* La descripción de lo elegido: de la marca, o de la categoría entera cuando
       está puesto «Todos». Vive aquí porque es de lo ELEGIDO, no de cada tramo.
       Si una categoría no declara `homeDescription`, la línea se esconde y no
       pasa nada. */
    const linea = seccion.querySelector('[data-home-marcas-desc]');
    if (linea) {
      const texto = elegido ? (elegido.getAttribute('data-marca-desc') || '') : '';
      const nombre = elegido ? (elegido.getAttribute('data-marca-nombre') || '') : '';
      /* El bloque entero se marca, no solo el párrafo: la línea que lo cierra
         cuelga del contenedor y sin esto se quedaba dibujada sobre una caja
         vacía. */
      const bloque = linea.closest('.home-marcas');
      if (texto) {
        linea.innerHTML = (nombre ? '<b>' + esc(nombre) + '.</b> ' : '') + esc(texto);
        linea.hidden = false;
        if (bloque) bloque.classList.add('tiene-desc');
      } else {
        linea.textContent = '';
        linea.hidden = true;
        if (bloque) bloque.classList.remove('tiene-desc');
      }
    }

    syncHomeCategoryButtons();

    /* El boton de filtros vive en la fila del texto de aqui abajo, y ese texto
       acaba de cambiar: con una marca es su descripcion, con «Todos» el rotulo
       del primer tramo. */
    const raiz = document.querySelector('#comprar[data-home-catalog-root]');
    if (raiz && raiz.dataset.soloCategoria) colocarFiltrosConLaMarca(raiz);
  };

  /* Cuántos productos se están viendo ahora mismo en una categoría: si hay una
     marca elegida, es la suya. Lo usa el total del titular para no mentir. */
  const cuentaVisibleDe = (categoryKey) => {
    const seccion = getCategorySectionElement(categoryKey);
    const destino = seccion && seccion.dataset.marcaActiva;
    if (!seccion || !destino) return cuentaDeCategoria(categoryKey);
    const lista = seccion.querySelector('[data-series-products="' + destino + '"]');
    return lista ? lista.querySelectorAll('.card').length : cuentaDeCategoria(categoryKey);
  };

  /* Apaga el desvanecido del riel cuando ya no queda nada a la derecha. Recibe
     el riel porque hay UNO POR CATEGORÍA, no uno solo como la tira de arriba. */
  const marcarFinDeRiel = (riel) => {
    if (!riel) return;
    /* El difuminado de cada lado se apaga cuando por ahí ya no queda nada:
       dejar medio difuminada la última placa cuando no hay más parece un fallo
       de pintado, y difuminar la primera al principio del recorrido, también. */
    riel.classList.toggle('esta-al-final', riel.scrollLeft + riel.clientWidth >= riel.scrollWidth - 2);
    riel.classList.toggle('esta-al-inicio', riel.scrollLeft <= 2);
  };

  /* La rueda vertical mueve el riel de lado mientras el puntero esté encima.
     Dos condiciones para no secuestrar el scroll de la página:
     - si el gesto ya es horizontal (trackpad), no se toca: el navegador lo hace
       mejor y con inercia;
     - si el riel ya está en un extremo, se DEJA PASAR. Sin eso, el puntero
       sobre las placas convierte la tira en una trampa y no puedes seguir
       bajando por la página. */
  const engancharRueda = (riel) => {
    if (!riel || riel.dataset.ruedaBound === 'true') return;
    riel.dataset.ruedaBound = 'true';

    /* Con el imán puesto, empujar `scrollLeft` píxel a píxel pelea con el
       enganche: el riel se arrastra y luego da un tirón para encajar. Así que
       la rueda avanza UNA PLACA por gesto, con un plazo entre pasos para que un
       solo golpe de rueda —que dispara muchos eventos— no cruce media tira. */
    let ultimoPaso = 0;
    riel.addEventListener('wheel', (event) => {
      const dy = event.deltaY;
      if (!dy || Math.abs(event.deltaX) > Math.abs(dy)) return;

      const margen = riel.scrollWidth - riel.clientWidth;
      if (margen <= 0) return;
      if (dy < 0 && riel.scrollLeft <= 0) return;
      if (dy > 0 && riel.scrollLeft >= margen - 1) return;

      event.preventDefault();

      const ahora = Date.now();
      if (ahora - ultimoPaso < 320) return;
      ultimoPaso = ahora;

      const placa = riel.querySelector('.home-marca');
      const paso = placa ? placa.getBoundingClientRect().width + 8 : 200;
      riel.scrollBy({ left: dy > 0 ? paso : -paso, behavior: 'smooth' });
    }, { passive: false });
  };

  const revisarRieles = () => $all('.home-marcas-riel').forEach((riel) => {
    marcarFinDeRiel(riel);
    engancharRueda(riel);
  });

  const initMarcasRiel = () => {
    if (document.documentElement.dataset.marcasBound === 'true') return;
    document.documentElement.dataset.marcasBound = 'true';

    /* `scroll` no burbujea, pero SÍ se captura: con un solo oyente en captura
       valen todos los rieles, incluidos los que aparezcan al repintar la
       parrilla. Enganchar uno por riel obligaría a re-enganchar en cada
       repintado, que es de donde salen las escuchas duplicadas. */
    document.addEventListener('scroll', (event) => {
      const riel = event.target;
      if (riel && riel.classList && riel.classList.contains('home-marcas-riel')) marcarFinDeRiel(riel);
    }, true);

    window.addEventListener('resize', revisarRieles, { passive: true });

    /* Delegado en el documento: la parrilla se repinta entera cuando cambia un
       precio, y volver a enganchar botón por botón sería otra fuente de
       escuchas duplicadas. */
    document.addEventListener('click', (event) => {
      const boton = event.target.closest('[data-home-marca]');
      if (!boton) return;
      const seccion = boton.closest('.home-category-section');
      if (!seccion) return;

      event.preventDefault();
      const destino = boton.getAttribute('data-home-marca') || '';
      aplicarFiltroDeMarca(seccion, (seccion.dataset.marcaActiva === destino) ? '' : destino);

      /* Deja el riel justo bajo la barra: al filtrar cambia el alto de todo lo
         que hay debajo y quedarse a media altura desorienta. Es un scroll
         deliberado por clic, como el de las píldoras — no una restauración,
         que de eso manda scroll-memoria.js. */
      const riel = seccion.querySelector('.home-marcas');
      if (riel) {
        const top = riel.getBoundingClientRect().top + window.scrollY - getHomeStickyOffset();
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    });
  };

  const initHomeCategorySpy = () => {
    if (homeCategoryObserver) {
      try { homeCategoryObserver.disconnect(); } catch (_) {}
      homeCategoryObserver = null;
    }

    const sections = $all('.home-category-section[data-home-category-section]');
    if (!sections.length) return;

    syncHomeCategoryFromViewport();

    if ('IntersectionObserver' in window) {
      homeCategoryObserver = new IntersectionObserver(() => {
        scheduleHomeCategoryViewportSync();
      }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });

      sections.forEach((section) => homeCategoryObserver.observe(section));
    }
  };

  /* =========================================================================
     PORTADA — héroe, categorías, selección e intención
     Todo lo de aquí se pinta DESPUÉS del primer pintado y nunca cambia la
     altura de nada que ya estuviera en pantalla: el HTML estático trae la
     forma final y estas funciones solo rellenan números o secciones que ya
     tienen su hueco reservado. Es la regla que evitó el salto de la ficha.
     ========================================================================= */

  const productosVisiblesDe = (categoryKey) => getCatalogProducts()
    .filter((product) => product
      && product.showOnHome !== false
      && String(product.categoryKey || '') === categoryKey);

  /* Los recuentos de las tarjetas de categoría salen del catálogo, no del HTML:
     así el número que promete la portada es siempre el que se encuentra al pulsar. */
  const syncCategoryCards = () => {
    $all('[data-cat-count]').forEach((el) => {
      const key = el.getAttribute('data-cat-count') || '';
      const total = productosVisiblesDe(key).length;
      if (!total) return;
      // Un recambio no es un «modelo»: accesorios y repuestos se cuentan en
      // productos, y todo lo que se conduce, en modelos.
      const noun = (key === 'accessories' || key === 'spare-parts')
        ? (total === 1 ? 'producto' : 'productos')
        : (total === 1 ? 'modelo' : 'modelos');
      el.textContent = total + ' ' + noun;
    });

  };

  /* Una tarjeta de categoría hace lo mismo que su pestaña del filtro: elegir la
     categoría y llevar a la parrilla. No duplica estado — reutiliza el mismo. */
  const irAlCatalogo = (categoryKey) => {
    activeHomeCategoryKey = normalizeHomeCategoryKey(categoryKey);
    syncHomeCategoryButtons();
    try {
      sessionStorage.setItem('ss_homeCategory', activeHomeCategoryKey);
    } catch (_) {}

    renderHomeCatalog(activeHomeCategoryKey);

    /* Al TRAMO de esa categoria, no al principio del catalogo. La parrilla es una
       sola lista con una seccion por categoria —no se filtra, se recorre—, asi que
       llevar siempre al borde de la zona dejaba al visitante en los patinetes
       hubiera pulsado lo que hubiera pulsado. Medido en produccion: pulsando
       «Accesorios» acababa en 2765 px y los accesorios empiezan en 12118.
       El respaldo es el borde de la zona, para una categoria que aun no tenga
       tramo pintado. */
    const destino = getCategorySectionElement(activeHomeCategoryKey)
      || document.querySelector('.home-catalog-zone');
    if (destino) {
      const top = destino.getBoundingClientRect().top + window.scrollY - getHomeStickyOffset();
      window.scrollTo({ top: Math.max(0, top), behavior: getPreferredScrollBehavior() });
    }

    // Candado corto para que el scrollspy no reescriba la categoría recién elegida
    // mientras la página se está estabilizando.
    clearHomeCategoryPending();
    homeCategoryPendingKey = activeHomeCategoryKey;
    homeCategoryPendingDeadline = Date.now() + 900;
  };

  const initCategoryCards = () => {
    $all('[data-cat-link]').forEach((card) => {
      if (card.dataset.bound === 'true') return;
      card.dataset.bound = 'true';

      /* Si la tarjeta apunta a una PAGINA (/patinetes/), no se toca: que navegue
         el navegador. Asi se puede abrir en otra pestaña, copiar la direccion y
         —lo que importa— Google la sigue.
         El manejador solo hace falta cuando el destino es un ancla de esta misma
         pagina, que es lo que eran las cinco tarjetas cuando las cinco categorias
         convivian aqui. */
      const destino = card.getAttribute('href') || '';
      if (destino && destino.charAt(0) !== '#') return;

      card.addEventListener('click', (event) => {
        event.preventDefault();
        irAlCatalogo(card.getAttribute('data-cat-link'));
      });
    });
  };

  /* Las tarjetas se piden al MISMO generador que la parrilla. Dos avisos:
     - el índice empieza en 1 a propósito: el 0 marca la foto como eager+high y
       le disputaría el ancho de banda al héroe, que es el LCP;
     - hay que renombrar los `id`, porque buildCardMarkup los deriva del producto
       y el mismo producto va a salir también en la parrilla. Dos elementos con
       el mismo id romperían el anclaje de la vuelta atrás. */
  const pintarTarjetasEn = (contenedor, productos, prefijo) => {
    /* `data-home-catalog-root` NO es "la parrilla": es el contrato de estilo de la
       tarjeta de producto. El diseño vigente vive en main.css bajo ese prefijo y sin
       él la tarjeta cae al diseño base, que es el viejo. product-enhancements.js hace
       exactamente esto para "También te puede interesar". Se pone AQUÍ, en la única
       puerta por la que se pintan tarjetas fuera de la parrilla, para que ninguna
       sección futura pueda olvidarlo. */
    contenedor.setAttribute('data-home-catalog-root', '');

    contenedor.innerHTML = productos.map((product, idx) => buildCardMarkup(product, idx + 1)).join('');
    contenedor.querySelectorAll('[id]').forEach((el) => {
      el.id = prefijo + el.id;
    });
    initCards();
    initDgtTooltips();
  };

  /* =========================================================================
     ESCAPARATE DE LA PORTADA — «Los mas vendidos»

     Ocho tarjetas donde antes iban 82. La portada pintaba las tres categorias
     enteras en el mismo documento (22 342 px de pagina, 3,1 MB de fotos) porque
     las pildoras de categoria solo llevaban el scroll de una a otra: no cambiaban
     lo pintado. Cada categoria tiene ya su pagina, y aqui queda la muestra.

     Se declaran SKUs y nada mas: el nombre, la foto, el precio y el boton salen
     del catalogo en tiempo real —el mismo buildCardMarkup que la parrilla—, asi
     que un cambio de precio desde el panel llega solo y una baja no deja un hueco
     roto, solo una tarjeta menos.

     El criterio de la lista es comercial y se toca a mano: LOS QUE MAS SE VENDEN,
     dichos uno a uno. No se deduce de nada —el sitio no lleva la cuenta de ventas—
     asi que esta lista es la unica fuente y hay que revisarla cuando cambie lo que
     sale por la puerta. Si un SKU desaparece del catalogo se cae solo; por debajo
     de cuatro no se enseña la seccion, que media docena de huecos venden peor que
     nada.
     ========================================================================= */
  const DESTACADOS_HOME = [
    'M41DUAL',      // M41 ARMORED DUAL (LR)
    'M41TANK',      // M41 Tank Ultimate 1000W
    'BISONGT',      // Bison GT Carbon Design
    'M41ONE',       // M41 ARMORED ONE PRO
    'R7',           // ROVORON R7
    'ECXDEID',      // Ecoxtrem Deimos Dual
    'M41TANKDUAL',  // M41 TANK DUAL
    'R7PRO',        // ROVORON R7 PRO
  ];

  const initEscaparate = () => {
    const seccion = document.querySelector('[data-escaparate]');
    const caja = document.querySelector('[data-escaparate-grid]');
    if (!seccion || !caja) return;

    const porSku = new Map();
    getCatalogProducts().forEach((prod) => {
      if (prod && prod.showOnHome !== false) porSku.set(String(prod.sku || prod.id || ''), prod);
    });

    const elegidos = DESTACADOS_HOME.map((sku) => porSku.get(sku)).filter(Boolean);
    if (elegidos.length < 4) return;

    /* Prefijo obligatorio en los `id`: buildCardMarkup los deriva del producto y
       estos ocho salen tambien en /patinetes. Dos elementos con el mismo id
       romperian el anclaje de la vuelta atras. */
    pintarTarjetasEn(caja, elegidos, 'dest-');

    /* El recuento lo escribe el catalogo, no el HTML: un numero a mano en la
       plantilla envejece el dia que se da de alta un patinete. */
    const total = cuentaDeCategoria('electric-scooters');
    const cuantos = seccion.querySelector('[data-escaparate-cuantos]');
    if (cuantos && total) {
      cuantos.textContent = 'Tenemos ' + total + ' ' + unidadDe('electric-scooters', total) + '.';
    }
    const cta = seccion.querySelector('[data-escaparate-cta]');
    if (cta && total) cta.textContent = 'Ver los ' + total + ' patinetes';

    seccion.hidden = false;
  };

  /* =========================================================================
     SOMOS SCOOT SHOP — el recuento de modelos
     Es el unico dato del bloque que cambia solo, asi que lo escribe el catalogo
     y no la plantilla: un numero a mano envejece el dia que se da de alta un
     patinete, y ahi nadie se acuerda de venir a corregirlo.
     Su fila nace `hidden`: sin catalogo no se enseña un dato a medias.
     ========================================================================= */
  const initAbout = () => {
    const fila = document.querySelector('[data-about-fila-modelos]');
    const valor = document.querySelector('[data-about-modelos]');
    if (!fila || !valor) return;

    const total = cuentaDeCategoria('electric-scooters');
    if (!total) return;

    valor.textContent = total + ' ' + unidadDe('electric-scooters', total);
    fila.hidden = false;
  };

  /* =========================================================================
     PACK DE LA SEMANA
     Se declara QUÉ entra y CON QUÉ VARIANTE; el resto —nombre, foto, precio—
     sale del catálogo en tiempo real, así que un cambio de precio en el panel
     llega solo. `opciones` es obligatorio en todo producto con ejes: añadir un
     manillar sin decir color deja un pedido que nadie sabe servir.
     ========================================================================= */
  /* =========================================================================
     LA OFERTA DE LA SEMANA

     Se declara QUE entra, CON QUE VARIANTE, CUANTAS unidades y a QUE PRECIO
     dentro del pack. El nombre, la foto y el precio suelto salen del catalogo
     en vivo, asi que un cambio en el panel llega solo.

     EL PACK SE DECLARA EN EL CATALOGO, no aqui. `data/products.js` lo
     publica en `SCOOTSHOP_PACKS` y de ahi lo lee tambien el backend (por
     `data/attributes-index.json`), que es quien COBRA. Asi el precio del
     pack es real, no un adorno: la portada enseña lo que la caja va a
     cobrar porque las dos leen lo mismo.

     Antes la rebaja la hacia un codigo de descuento —el backend tarifa con
     el precio de catalogo y descarta el del navegador—, y habia que sondear
     que el cupon existiera antes de atreverse a enseñar la oferta. Ya no:
     si el pack esta declarado, el precio es ese.
     ========================================================================= */
  /* El pack, tal y como lo declara el catalogo. */
  const packDelCatalogo = () => {
    const packs = (typeof window.SCOOTSHOP_getPacks === 'function')
      ? window.SCOOTSHOP_getPacks()
      : (window.SCOOTSHOP_PACKS || []);
    return packs && packs.length ? packs[0] : null;
  };

  /* Los enteros SIN decimales, como el catálogo y como el resto de pantallas:
     «45 €» y no «45,00 €». Los que tienen céntimos los conservan («32,99 €»). */
  const dinero = (valor) => (Number.isInteger(valor)
    ? valor.toLocaleString('es-ES')
    : valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' €';

  const aNumero = (texto) => {
    const limpio = String(texto || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
    const n = parseFloat(limpio);
    return Number.isFinite(n) ? n : 0;
  };

  /* Resuelve el pack contra el catálogo. Devuelve null si falta cualquier pieza:
     más vale no enseñar la oferta que enseñarla incompleta o a un precio que no es. */
  /* Las lineas del pack las construye el CATALOGO (`SCOOTSHOP_lineasDePack`).
     Esta funcion vivia aqui entera, con su lectura de ejes, su foto por color y
     su base 1; el dia que el cajon del carrito necesito lo mismo para reponer un
     pack a medias, se subio a donde vive el pack. Aqui solo se pide. */
  const resolverPack = () => {
    const pack = packDelCatalogo();
    if (!pack) return null;
    if (typeof window.SCOOTSHOP_lineasDePack !== 'function') return null;
    const lineas = window.SCOOTSHOP_lineasDePack(pack.id);
    return (lineas && lineas.length) ? lineas : null;
  };

  /* Cuenta atrás semanal: termina el domingo a las 23:59:59 y, al pasar, salta
     sola al domingo siguiente. Sin fecha que mantener a mano en el HTML. */
  const finDeSemanaOferta = (desde) => {
    const fin = new Date(desde);
    fin.setHours(23, 59, 59, 999);
    fin.setDate(fin.getDate() + ((7 - fin.getDay()) % 7));
    if (fin.getTime() <= desde.getTime()) fin.setDate(fin.getDate() + 7);
    return fin;
  };

  const initOfertaSemanal = () => {
    const caja = document.querySelector('[data-combo]');
    const bandera = document.querySelector('[data-oferta-flag]');
    const reloj = document.querySelector('[data-oferta-reloj]');
    if (!caja) return;

    const lineas = resolverPack();
    if (!lineas || !lineas.length) return;

    /* Tres cifras, todas POR CANTIDAD —tres cubre cables son tres precios—: lo que
       suman sueltos, lo que suman dentro del pack, y el tachado del catalogo.
       La rebaja es la diferencia entre las dos primeras, y es EXACTAMENTE lo que
       tiene que valer el codigo de descuento. */
    const suelto = lineas.reduce((t, l) => t + l.suelto, 0);
    const enPack = lineas.reduce((t, l) => t + l.enPack, 0);
    const rebaja = Math.round((suelto - enPack) * 100) / 100;
    /* La referencia de cada linea —lo que se tacha— la calcula el CATALOGO y viaja
       en la propia linea, para que la portada, el cajon, /checkout y /pago tachen
       todos la misma cifra. Ver `referenciaDeLinea` en data/products.js. */
    const referencia = (l) => l.referencia || Math.max(l.antes * l.qty, l.suelto);
    const tachadoCatalogo = lineas.reduce((t, l) => t + referencia(l), 0);

    /* La oferta esta VIVA por definicion: el precio del pack lo declara el
       catalogo y lo cobra el backend leyendo ese mismo dato. Aqui hubo una
       bandera que arrancaba apagada y la encendia una sonda al backend, porque
       la rebaja dependia de que existiera un cupon. */

    const tituloEl = caja.querySelector('[data-combo-titulo]');
    const tituloPack = (packDelCatalogo() || {}).titulo;
    if (tituloEl && tituloPack) tituloEl.textContent = tituloPack;

    /* Las tarjetas del pack son las MISMAS del catálogo, con dos diferencias:
       sin botón de añadir —al pack se entra por la casilla, no producto a
       producto— y con el `id` prefijado, porque buildCardMarkup lo deriva del
       producto y el mismo patinete sale también en la parrilla de abajo. */
    const rail = caja.querySelector('[data-home-featured]');
    if (rail) {
      /* Con la foto del COLOR elegido, no la de portada. Se le pasa una copia del
         producto con `image` cambiada en vez de reescribir el `src` despues de
         pintar: reescribirlo dejaria al navegador bajando primero el muestrario y
         luego la buena — dos descargas para una tarjeta. */
      pintarTarjetasEn(rail, lineas.map((l) => Object.assign({}, l.producto, { image: l.image })), 'pack-');
      rail.querySelectorAll('.btn-cart').forEach((boton) => boton.remove());

      /* CUANTAS UNIDADES van de cada uno. La tarjeta del catalogo enseña el
         precio de UNA, y en un pack que lleva tres cubre cables eso es enseñar
         5 € cuando el pack cobra 15: la suma de abajo no cuadraba con lo que se
         leia arriba. Se marca solo cuando hay mas de una — poner «x1» en las
         otras cuatro seria ruido. */
      rail.querySelectorAll(':scope > .card').forEach((tarjeta, i) => {
        const linea = lineas[i];
        if (!linea) return;

        if (linea.qty > 1) {
          const marca = document.createElement('span');
          marca.className = 'pack-unidades';
          marca.textContent = '\u00d7' + linea.qty;
          marca.setAttribute('aria-label', linea.qty + ' unidades');
          const donde = tarjeta.querySelector('.card-media') || tarjeta;
          donde.appendChild(marca);
        }

        /* El precio de cada articulo dentro del pack lo pone `pintarPrecios()`,
           que corre al montar y otra vez si el backend confirma el codigo. */
      });
    }

    const antesEl = caja.querySelector('[data-combo-antes]');
    const ahorroEl = caja.querySelector('[data-combo-ahorro]');
    const ahoraEl = caja.querySelector('[data-combo-ahora]');

    /* Repinta SOLO las cifras. Nunca vuelve a montar el carril: reescribir su
       `innerHTML` tiraria las <img> y las volveria a pedir, que es justo lo que
       vigila scripts/qa/check-image-dupes.js. */
    const pintarPrecios = () => {
      /* El tachado grande suma las REFERENCIAS, no los precios sueltos: asi la
         rebaja que ya trae un articulo de por si —el patinete, 789,99 tachado—
         entra en la cuenta de la oferta en vez de perderse. */
      const ahora = enPack;
      const antes = Math.max(tachadoCatalogo, suelto);
      const ahorro = antes - ahora;
      if (ahoraEl) ahoraEl.textContent = dinero(ahora);
      if (ahorro > 0.5) {
        antesEl.textContent = dinero(antes);
        antesEl.hidden = false;
        ahorroEl.textContent = 'Ahorras ' + dinero(ahorro);
        ahorroEl.hidden = false;
      } else {
        antesEl.hidden = true;
        ahorroEl.hidden = true;
      }

      /* Y el precio de cada articulo dentro del pack. Se reescribe `.price-values`
         —lo que agrupa precio y tachado— conservando sus clases, para que la
         tipografia siga siendo la de la tarjeta del catalogo. */
      if (!rail) return;
      rail.querySelectorAll(':scope > .card').forEach((tarjeta, i) => {
        const linea = lineas[i];
        const cajaPrecio = linea && tarjeta.querySelector('.price-values');
        if (!cajaPrecio) return;
        const ref = referencia(linea);
        const tachado = '<div class="price-was">' + dinero(ref) + '</div>';
        if (linea.enPack <= 0) {
          cajaPrecio.innerHTML = '<div class="price-now pack-gratis">Gratis</div>' + tachado;
        } else if (linea.enPack < ref - 0.005) {
          cajaPrecio.innerHTML = '<div class="price-now">' + dinero(linea.enPack) + '</div>' + tachado;
        } else {
          cajaPrecio.innerHTML = '<div class="price-now">' + dinero(linea.enPack) + '</div>';
        }
      });
    };

    pintarPrecios();
    caja.hidden = false;

    /* Aqui vivia `comprobarCodigo()`: una llamada a `order_pricing_preview`
       para comprobar que el cupon del pack existia antes de atreverse a
       enseñar el precio de oferta. Ya no hace falta preguntar nada: el pack
       esta en el catalogo y el backend lo cobra leyendo el mismo dato. */
    /* ----- el boton: mete el pack y se va derecho a pagar -----

       Era una casilla que anadia al marcar, retiraba al desmarcar y abria el
       cajon del carrito. Se ha ido por dos motivos:

       - El cajon era un clic de mas. Lo unico que aportaba —ver el pack linea a
         linea con los precios sueltos tachados— lo ensena /checkout una pantalla
         despues, y ahi ademas con el total real al lado (#ckPackRow).
       - Su estado NO se restauraba. Al volver a la portada salia desmarcada con
         las cinco lineas aun en el carrito, y volver a marcarla SUMABA cantidades
         (`add()` hace `found.qty + qty`), asi que salia un pack doble con el
         descuento aplicado una sola vez. Hoy eso ya no puede pasar: el pack es
         una CANTIDAD FIJA y se fuerza con `setQty` despues de anadir.

       No es un <a>: hay que escribir el carrito y la llave del descuento ANTES de
       navegar, y eso no se puede colgar de un enlace sin carreras. */
    const boton = caja.querySelector('[data-combo-quiero]');
    const estado = caja.querySelector('[data-combo-estado]');
    const cart = () => window.SS_CART;

    const decir = (texto) => { if (estado) estado.textContent = texto || ''; };

    boton.addEventListener('click', () => {
      const api = cart();
      if (!api) {
        decir('El carrito aún se está cargando. Inténtalo otra vez en un segundo.');
        return;
      }

      let puestos = 0;
      lineas.forEach((l) => {
        if (!api.add(l, l.qty)) return;
        puestos += 1;
        /* El pack es una cantidad fija, no un incremento: si la linea ya estaba
           (el cliente pulso, volvio atras y pulsa otra vez) `add()` acaba de
           sumarla. Se deja en lo que el pack declara. */
        const fila = (api.read() || []).find(
          (x) => x.sku === l.sku && (x.color || '') === (l.color || ''));
        if (fila && fila.qty !== l.qty) api.setQty(fila.key, l.qty);
      });

      if (!puestos) {
        decir('No se ha podido añadir el pack.');
        return;
      }

      /* AQUI NO SE GUARDA NADA. Antes se dejaba en `ss_checkout_discount` el
         codigo del cupon, su importe y el precio de cada articulo dentro del
         pack, y el cajon, /checkout y /pago lo leian de ahi. Era una segunda
         verdad viviendo en el almacenamiento del navegador: si se perdia —y se
         perdia, /pago la borraba antes de leerla— el cliente pagaba el precio
         suelto. Ahora el pack es dato del catalogo y se resuelve en cada
         pantalla con `SCOOTSHOP_resolverPacks()`, contra las lineas que haya. */
      decir('Vamos al pago…');
      window.location.href = '/checkout?cart=1';
    });
    // ----- cuenta atrás -----
    if (!reloj || !bandera) return;
    bandera.hidden = false;

    let fin = finDeSemanaOferta(new Date());
    const pintarReloj = () => {
      const ahoraMs = Date.now();
      if (ahoraMs >= fin.getTime()) fin = finDeSemanaOferta(new Date());
      let resto = Math.max(0, Math.floor((fin.getTime() - ahoraMs) / 1000));
      const dias = Math.floor(resto / 86400); resto -= dias * 86400;
      const hh = Math.floor(resto / 3600); resto -= hh * 3600;
      const mm = Math.floor(resto / 60);
      const ss = resto - mm * 60;
      const dd = (n) => String(n).padStart(2, '0');
      const cifra = reloj.querySelector('.oferta-flag-cifra') || reloj;
      cifra.textContent = (dias > 0 ? dias + 'd ' : '') + dd(hh) + ':' + dd(mm) + ':' + dd(ss);

      /* ULTIMO DIA. Se mide sobre los segundos que quedan de VERDAD, no sobre
         `dias`: a las 23:59:59 del sabado `dias` ya vale 0 y la cuenta sigue
         teniendo casi un dia por delante. El umbral son 24 h justas. */
      const quedan = Math.max(0, Math.floor((fin.getTime() - ahoraMs) / 1000));
      reloj.classList.toggle('es-ultimo-dia', quedan > 0 && quedan <= 86400);
    };
    pintarReloj();
    window.setInterval(pintarReloj, 1000);
  };

  /* ¿CUÁL ES PARA TI? — sustituye al raíl de series.
     Los cuatro grupos se resuelven LEYENDO el catálogo (specs, precio y sello
     DGT), no una tabla escrita a mano: un patinete nuevo entra en su grupo solo,
     y si un día no hay ninguno que cumpla, el grupo desaparece en vez de mentir. */
  const mayorNumeroDe = (texto) => {
    const found = String(texto || '').match(/\d+(?:[.,]\d+)?/g);
    if (!found) return 0;
    return found.reduce((max, raw) => Math.max(max, parseFloat(raw.replace(',', '.')) || 0), 0);
  };


  // El panel de Productos (escritorio y móvil) lo pinta js/products-menu.js, que
  // es su único dueño: el mismo markup para las dos superficies. index-head.js lo
  // carga antes que este fichero. No reimplantes el render aquí — la copia
  // paralela que había es justo lo que hacía que escritorio y móvil divergieran.
  const renderSharedProductMenus = (root = document) => {
    const api = window.SS_PRODUCT_MENUS;
    return !!(api && api.render(root));
  };

  const initDesktopProductsMenu = () => {
    const api = window.SS_PRODUCT_MENUS;
    if (api) api.initDesktop();
  };



  const initCardReveal = () => {
    const cards = [];
    // Escalonar por COLUMNA real de cada grid (responsive), no por índice global:
    // así el orden de aparición sigue las filas y no se ve desordenado.
    $all('.grid').forEach((grid) => {
      const gridCards = Array.prototype.slice.call(grid.querySelectorAll(':scope > .card'));
      if (!gridCards.length) return;
      let cols = 1;
      try {
        const tpl = getComputedStyle(grid).gridTemplateColumns;
        cols = Math.max(1, (tpl || '').split(' ').filter(Boolean).length);
      } catch (_) {}
      gridCards.forEach((card, i) => {
        card.classList.add('reveal-ready');
        card.style.setProperty('--reveal-delay', `${(i % cols) * 45}ms`);
        cards.push(card);
      });
    });
    if (!cards.length) return;
    const finishReveal = (card) => {
      card.classList.remove('reveal-ready', 'reveal-visible');
      card.style.removeProperty('--reveal-delay');
      card.style.removeProperty('will-change');
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      cards.forEach((card) => finishReveal(card));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        // Promover a capa de composición SOLO durante la animación → sin
        // repintar la sombra en cada frame (elimina el jank de bajos FPS).
        card.style.willChange = 'transform, opacity';
        card.classList.add('reveal-visible');
        const onRevealEnd = (ev) => {
          if (ev.propertyName !== 'opacity' && ev.propertyName !== 'transform') return;
          finishReveal(card);
        };
        card.addEventListener('transitionend', onRevealEnd, { once:true });
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -5% 0px'
    });
    cards.forEach((card) => observer.observe(card));
  };

  // La marca del titular de bienvenida se descubre CON EL SCROLL: este trozo mide
  // donde esta y escribe el avance (0 a 1) en unas variables; el dibujo lo hace el
  // CSS. Asi la animacion va y VIENE, que es lo que no se puede con una de las de
  // disparar y olvidar.
  //
  // El avance NO se aplica tal cual: se PERSIGUE. Cada fotograma se acerca un
  // 13% a donde deberia estar, asi que la marca llega un poco despues que el dedo
  // y frena sola al final. Pegada al scroll se veia seca —las letras aparecian y
  // desaparecian a tirones, al ritmo de los saltos de la rueda—; con la
  // persecucion, el mismo recorrido se siente continuo.
  //
  // Mismo trato que el resto: el estado lo enciende este JS y no el CSS, para que
  // sin JS la marca se vea entera, y quien pide menos movimiento no lo tiene.
  const initMarcaScroll = () => {
    const nom = document.querySelector('.bienve-marca-nom');
    if (!nom) return;
    // El estado vive en el TITULAR y no en el <span> de la marca: auth-ui.js
    // reconstruye el contenido del titular con innerHTML (guarda y repone el
    // saludo de invitado), asi que el span y las dos <img> se recrean.
    const titular = nom.closest('[data-bienve-titulo]');
    if (!titular) return;
    if (!nom.querySelector('.bienve-marca')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    titular.classList.add('marca-scroll');

    // Recorta a [0,1] el tramo [a,b] de un avance: cada pieza usa el suyo, y por
    // eso SHOP va por detras de SCOOT y los destellos por detras de las dos.
    const tramo = (v, a, b) => {
      const x = (v - a) / (b - a);
      return x < 0 ? 0 : x > 1 ? 1 : x;
    };
    // Frena al llegar, en vez de plantarse: es la diferencia entre descubrirse y
    // que te corten el papel de encima.
    const suave = (x) => 1 - Math.pow(1 - x, 2.4);
    // Sube y baja: 0 en los extremos, 1 en el centro. Encender el brillo de golpe
    // —que es lo que hacia un 0 o 1 seco— se ve como un parpadeo, aunque la banda
    // todavia no haya entrado en la letra.
    // El exponente aplana los extremos: con la campana pelada, el brillo pasaba
    // de 0 a 0,29 en un solo fotograma al entrar en su tramo.
    // Sube y baja: el brillo entra, pasa y se va. El 0,86 del final es el TECHO de
    // opacidad, y no es estetica sino medida: la pendiente maxima de una campana
    // asi ronda pi, y con el destello estirado a 800 px de scroll un fotograma de
    // scroll rapido movia la opacidad 0,26 de golpe — justo lo que vigila
    // scripts/qa (parpadeo). Bajando el techo baja la pendiente en la misma
    // proporcion, y de paso un brillo que dura tanto agradece no llegar al blanco
    // del todo.
    const campana = (x) => (x <= 0 || x >= 1) ? 0 : Math.pow(Math.sin(Math.PI * x), 1.7) * 0.86;

    const medir = () => {
      // La marca se busca EN CADA MEDIDA y no se guarda: auth-ui.js rehace el
      // contenido del titular con innerHTML, y el <span> de entonces se queda
      // fuera del documento. Un elemento huerfano mide 0 por todos lados, asi que
      // el avance salia siempre 1 y la marca se quedaba puesta —medido en
      // produccion, donde ese repintado llega antes que en local—.
      const marca = titular.querySelector('.bienve-marca-nom') || titular;
      const r = marca.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const y = window.scrollY || window.pageYOffset || 0;
      // El recorrido NO empieza cuando la marca asoma, sino cuando ya ha subido
      // hasta el 76% de la pantalla, y acaba con ella al 6%.
      //
      // Ese 76% es el RETARDO, y hace falta porque la bienvenida esta pegada a la
      // portada: con la pagina arriba del todo la marca ya cae a 867 px en una
      // ventana de 900 —o sea, ya asoma sin haber tocado nada—. Arrancando al
      // asomar, cuarenta pixeles de scroll bastaban para que se moviera todo.
      // Asi hay ~180 px de margen antes de que empiece nada.
      //
      // Y no se puede retrasar mucho mas: la seccion sale por arriba sobre los
      // 870 px de scroll, asi que retardo y duracion se reparten ese hueco. Con
      // 180 de retardo quedan ~630 px de recorrido, que es lo que dura la
      // secuencia entera.
      const suelo = r.top + y;                 // donde vive la marca en el documento
      const yFin = suelo - vh * 0.06;          // scroll con la marca ya arriba
      const yIni = Math.max(0, suelo - vh * 0.76);
      const p = (y - yIni) / Math.max(1, yFin - yIni);
      return p < 0 ? 0 : p > 1 ? 1 : p;
    };

    const aplicar = (p) => {
      // Las letras se descubren en la PRIMERA MITAD del recorrido; la segunda es
      // para el brillo. Antes el revelado se comia casi todo (hasta 0,96) y no
      // dejaba sitio.
      // El revelado no arranca en 0 sino un poco despues: la bienvenida esta
      // pegada a la portada y con la pagina arriba del todo la marca ya asoma por
      // el borde (medido: 916 px con una ventana de 900), asi que el recorrido
      // nace comprimido. Sin ese margen de entrada, bajar cuatro dedos ya la
      // descubria un 23%.
      // El texto va POR DELANTE de la marca: primero se lee «Bienvenido a» y
      // despues aparece el nombre.
      // --p no lo usa el CSS: es el avance en crudo, publicado para poder mirarlo
      // desde fuera (lo leen las pruebas de scratchpad). Cuesta una propiedad.
      titular.style.setProperty('--p', p.toFixed(4));
      titular.style.setProperty('--t1', suave(tramo(p, 0, 0.6)).toFixed(4));
      const m1 = suave(tramo(p, 0.08, 0.72));
      const m2 = suave(tramo(p, 0.14, 0.82));
      titular.style.setProperty('--m1', m1.toFixed(4));
      titular.style.setProperty('--m2', m2.toFixed(4));
      // El destello: donde esta la banda de luz y CUANTO se ve. La opacidad la
      // calcula el JS y no el CSS porque hace falta una campana (sube y baja), y
      // en CSS eso pide `abs()`, que no esta en todas partes.
      // Y hay una razon mas fuerte: con el brillo encendido de serie, el primer
      // fotograma —antes de que cargue la mascara del logotipo— enseñaba el
      // degradado como un RECTANGULO blanco sobre el fondo. Ese era el parpadeo.
      // Naciendo en 0, no hay nada que enseñar hasta que toca.
      // El brillo se lleva DOS TERCIOS del recorrido (antes poco mas de un tercio)
      // y acompaña hasta el final. Sumado al recorrido nuevo, cruzar las letras
      // cuesta ahora ~500 px de scroll en vez de ~145: tres veces y media mas
      // despacio.
      const d1 = tramo(p, 0.24, 1);
      const d2 = tramo(p, 0.32, 1);
      titular.style.setProperty('--d1', d1.toFixed(4));
      titular.style.setProperty('--d2', d2.toFixed(4));
      titular.style.setProperty('--o1', campana(d1).toFixed(4));
      titular.style.setProperty('--o2', campana(d2).toFixed(4));
    };

    let objetivo = medir();
    let actual = objetivo;
    let corriendo = false;
    aplicar(actual);

    // Fotogramas que se siguen mirando DESPUES de llegar al objetivo. No es
    // paranoia: el navegador reajusta la posicion el solo cuando el contenido de
    // arriba cambia de alto (scroll anchoring) y eso NO dispara evento de scroll,
    // asi que el bucle convergia a un objetivo viejo y se paraba ahi — medido: el
    // avance se quedaba en 0,0487 cuando la posicion real daba 0,019, y el titular
    // aparecia medio puesto con la pagina arriba del todo.
    let gracia = 0;

    const bucle = () => {
      // Se remide EN CADA fotograma, no solo cuando llega un evento.
      objetivo = medir();
      const d = objetivo - actual;
      if (Math.abs(d) < 0.0015) {
        actual = objetivo;
        if (gracia > 0) { gracia--; requestAnimationFrame(bucle); }
        else corriendo = false;
      } else {
        gracia = 5;
        actual += d * 0.13;
        requestAnimationFrame(bucle);
      }
      aplicar(actual);
    };

    const alMover = () => {
      objetivo = medir();
      gracia = 5;
      if (corriendo) return;
      corriendo = true;
      requestAnimationFrame(bucle);
    };

    window.addEventListener('scroll', alMover, { passive:true });
    window.addEventListener('resize', alMover, { passive:true });

    // Y cuando cambia el ALTO de la pagina sin que nadie toque el scroll: una foto
    // que termina de cargar y empuja la seccion, la parrilla del catalogo que se
    // pinta, el menu que se despliega. Eso mueve la marca de sitio sin disparar
    // scroll ni resize, y sin esto el ultimo repintado se quedaba con una posicion
    // que ya no era — medido: el avance decia 0,053 cuando la posicion real daba
    // 0,019, y el titular se veia medio puesto con la pagina arriba del todo.
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(alMover);
      ro.observe(document.body);
    }
  };

  // FUNCIONAMIENTO: cada tarjeton abre su recuadro sobre la portada.
  const initFunciona = () => {
    const zona = document.querySelector('.funciona');
    if (!zona) return;
    const botones = [...zona.querySelectorAll('.funciona-card')];
    if (!botones.length) return;

    botones.forEach((btn) => {
      const dlg = document.getElementById(btn.getAttribute('aria-controls'));
      // Sin `showModal` no se toca nada: el boton se queda inerte y la portada
      // sigue entera, que es mejor que abrir un recuadro que no sabe cerrarse.
      if (!dlg || typeof dlg.showModal !== 'function') return;

      btn.addEventListener('click', () => {
        dlg.showModal();
        // El cuerpo arranca arriba: al reabrir, el recuadro recordaria donde se
        // quedo el anterior.
        const cuerpo = dlg.querySelector('.fx-modal-cuerpo');
        if (cuerpo) cuerpo.scrollTop = 0;
      });

      // Cerrar: la cruz, y pulsar FUERA de la caja. Lo de fuera se decide por
      // COORDENADAS y no por `ev.target === dlg`, que es el truco de manual: el
      // recuadro ocupa toda la caja del dialogo, asi que el golpe en el fondo no
      // llegaba nunca con el dialogo como destino y no cerraba —medido—.
      dlg.addEventListener('click', (ev) => {
        if (ev.target.closest && ev.target.closest('[data-fx-cerrar]')) { dlg.close(); return; }
        const caja = dlg.querySelector('.fx-modal-caja');
        if (!caja) return;
        const r = caja.getBoundingClientRect();
        const dentro = ev.clientX >= r.left && ev.clientX <= r.right
                    && ev.clientY >= r.top  && ev.clientY <= r.bottom;
        // Un clic con teclado (Enter sobre el boton) llega con coordenadas 0,0 y
        // no es un clic fuera: se deja pasar.
        if (!dentro && (ev.clientX || ev.clientY)) dlg.close();
      });

      // Al cerrar, el foco vuelve al tarjeton desde el que se abrio.
      dlg.addEventListener('close', () => { btn.focus(); });
    });
  };

  /* FILTROS DEL CATALOGO. Un solo boton abre un recuadro con todo lo que se puede
     afinar; al aplicar, las tarjetas que no encajan se OCULTAN, no se repintan.
     Esa diferencia importa: reescribir la parrilla tira las <img> y el navegador
     las vuelve a pedir —es justo lo que vigila scripts/qa/check-image-dupes.js— y
     ademas destruiria el elemento al que la vuelta atras se ancla.
     Los numeros de cada patinete los deja `scripts/build-filtros.js` en el
     catalogo (campo `filtros`); aqui solo se comparan. */
  const initFiltros = () => {
    const panel = document.getElementById('filtrosPanel');
    const abrir = document.querySelector('[data-filtros-abrir]');
    if (!panel || !abrir || typeof panel.showModal !== 'function') return;

    const form = panel.querySelector('form');
    const cuenta = panel.querySelector('[data-filtros-cuenta]');
    const resumen = panel.querySelector('[data-filtros-resumen]');
    const chivato = document.querySelector('[data-filtros-activos]');

    /* Sobre QUE se esta filtrando: la categoria activa y, si la hay, la marca. */
    const ambito = () => {
      /* De quien es el panel. En una PAGINA DE CATEGORIA lo dice el root y no hay
         pildoras que consultar; en la portada, la pildora activa.
         Alli las categorias conviven en el mismo documento y las pildoras solo
         llevan el scroll de una a otra, asi que el filtro se ciñe a SU seccion:
         sin esto, filtrar en Accesorios recortaba tambien los patinetes. */
      const chipActivo = document.querySelector('.home-category-chip.is-active');
      const clave = categoriaUnica()
        || (chipActivo ? (chipActivo.getAttribute('data-home-category') || '') : '');
      const seccion = (clave && document.querySelector('[data-home-category-section="' + clave + '"]'))
        || document.querySelector('.home-category-section');
      const marca = seccion ? (seccion.dataset.marcaActiva || '') : '';
      const placa = marca
        ? document.querySelector('.home-marca.esta-activa:not(.home-marca--todos)')
        : null;
      return {
        categoria: clave,
        seccion,
        marca,
        nombreMarca: placa ? (placa.getAttribute('data-marca-nombre') || '').trim() : '',
        esPieza: esPiezaCategoria(clave),
        /* El nombre para el rotulo sale de la pildora activa y, si no la hay,
           del que la propia pagina escribe en su barra. */
        nombreCat: chipActivo
          ? (chipActivo.textContent || '').trim().split('\n')[0].trim()
          : ((document.querySelector('[data-catalogo-nombre]') || {}).textContent || '').trim(),
      };
    };

    /* Los mandos que se enseñan dependen de lo que se este mirando: a un accesorio
       no se le pregunta por motores ni por homologacion. */
    const prepararGrupos = () => {
      const a = ambito();
      panel.querySelectorAll('[data-para]').forEach((g) => {
        const para = g.getAttribute('data-para');
        const vale = para === 'todo'
          || (para === 'patinetes' && !a.esPieza)
          || (para === 'piezas' && a.esPieza);
        g.hidden = !vale;
        /* Lo que se esconde deja de filtrar: si no, un filtro puesto en patinetes
           seguiria recortando la lista de accesorios sin que se vea por que. */
        if (!vale) {
          g.querySelectorAll('input[type=radio]').forEach((r, i) => { r.checked = i === 0; });
          g.querySelectorAll('input[type=number], input[type=range]').forEach((r) => {
            r.value = r.type === 'range' ? r.min || 0 : '';
            r.dispatchEvent(new Event('input', { bubbles: true }));
          });
        }
      });
      if (a.esPieza) pintarFamilias();
    };

    /* Las familias que DE VERDAD tienen productos a la vista, con su recuento. */
    const pintarFamilias = () => {
      const caja = panel.querySelector('[data-familias]');
      if (!caja) return;
      const etiquetas = {};
      try {
        (window.SCOOTSHOP_getAccessoryCategories() || []).forEach((f) => { etiquetas[f.key] = f.label; });
      } catch (_) {}
      const cuenta = new Map();
      tarjetas().forEach((c) => {
        const p = datosDe(c);
        const k = (p && p.accessoryCategory) || '';
        if (k) cuenta.set(k, (cuenta.get(k) || 0) + 1);
      });
      const antes = String(new FormData(form).get('familia') || '');
      const partes = ['<label class="filtros-op"><input type="radio" name="familia" value=""'
        + (antes ? '' : ' checked') + '><span>Todos</span></label>'];
      [...cuenta.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
        partes.push('<label class="filtros-op"><input type="radio" name="familia" value="' + k + '"'
          + (antes === k ? ' checked' : '') + '><span>' + (etiquetas[k] || k) + ' <i>' + n + '</i></span></label>');
      });
      caja.innerHTML = partes.join('');
    };

    /* Lo que hay puesto ahora mismo. Los vacios se quedan en null y no filtran:
       asi «sin tocar nada» es «todo el catalogo» sin ningun caso especial. */
    const leer = () => {
      const d = new FormData(form);
      const n = (k) => {
        const v = String(d.get(k) || '').trim();
        if (!v) return null;
        const x = Number(v);
        return Number.isFinite(x) && x > 0 ? x : null;
      };
      return {
        dgt: String(d.get('dgt') || ''),
        familia: String(d.get('familia') || ''),
        motores: String(d.get('motores') || ''),
        frenos: String(d.get('frenos') || ''),
        precioMin: n('precioMin'),
        precioMax: n('precioMax'),
        km: n('km'),
        kmh: n('kmh'),
      };
    };

    const cuantosPuestos = (f) =>
      (f.dgt ? 1 : 0) + (f.familia ? 1 : 0) + (f.motores ? 1 : 0)
      + (f.precioMin || f.precioMax ? 1 : 0)
      + (f.frenos ? 1 : 0) + (f.km ? 1 : 0) + (f.kmh ? 1 : 0);

    /* El precio se lee del DOM y no del catalogo: el panel puede haberlo cambiado
       (product-overrides) y lo que vale es lo que el visitante ve en la tarjeta. */
    const precioDeTarjeta = (card) => {
      const el = card.querySelector('.price, [data-price], .card-price');
      const txt = (el ? el.textContent : card.textContent) || '';
      const m = txt.replace(/\./g, '').match(/(\d+(?:,\d+)?)\s*€/);
      return m ? parseFloat(m[1].replace(',', '.')) : null;
    };

    const datosDe = (card) => {
      const sku = card.getAttribute('data-sku') || '';
      const lista = window.SCOOTSHOP_PRODUCTS || [];
      for (let i = 0; i < lista.length; i++) {
        if (lista[i].sku === sku) return lista[i];
      }
      return null;
    };

    const pasa = (card, f) => {
      const p = datosDe(card);
      // Sin datos de filtro (accesorios, repuestos) solo se mira el precio: lo
      // demas no le aplica y esconderlo por eso seria mentir.
      const d = (p && p.filtros) || null;
      const precio = precioDeTarjeta(card);
      if (f.precioMin !== null && (precio === null || precio < f.precioMin)) return false;
      if (f.precioMax !== null && (precio === null || precio > f.precioMax)) return false;
      if (f.familia && String((p && p.accessoryCategory) || '') !== f.familia) return false;
      if (!d) return !(f.dgt || f.motores || f.frenos || f.km || f.kmh);
      if (f.dgt === 'si' && !d.dgt) return false;
      if (f.dgt === 'no' && d.dgt) return false;
      if (f.motores && Number(d.motores) !== Number(f.motores)) return false;
      /* FRENOS. Un patinete SIN dato no pasa ningun filtro de frenos, igual que
         uno sin autonomia no pasa el de autonomia: es la regla de toda esta
         caja. Hoy son 16 de 50 fichas las que no declaran el tipo — ver el
         recuento que imprime scripts/build-filtros.js. */
      if (f.frenos && String(d.frenos || '') !== f.frenos) return false;
      if (f.km !== null && !(d.km >= f.km)) return false;
      if (f.kmh !== null && !(d.kmh >= f.kmh)) return false;
      return true;
    };

    /* Solo las que SE ESTAN VIENDO. Al elegir una marca, las series de las demas se
       esconden con `display:none` pero siguen en el arbol; contarlas hacia que el
       boton prometiera «Ver 82 patinetes» estando en Ecoxtrem, y que los filtros
       trabajaran sobre productos que el visitante no tiene delante. */
    const tarjetas = () => {
      const raiz = ambito().seccion || document.getElementById('comprar');
      if (!raiz) return [];
      return [...raiz.querySelectorAll('.card[data-sku]')].filter((c) => !c.closest('.esta-oculta'));
    };

    /* Cuenta sin tocar el DOM: es lo que necesita el boton «Ver N patinetes»
       mientras el visitante mueve los mandos. */
    const contar = (f) => tarjetas().filter((c) => pasa(c, f)).length;

    const aplicar = () => {
      const f = leer();
      let vistos = 0;
      tarjetas().forEach((card) => {
        const ok = pasa(card, f);
        card.classList.toggle('filtro-fuera', !ok);
        if (ok) vistos++;
      });

      /* Una serie entera oculta deja su rotulo y su raya flotando sobre nada. */
      document.querySelectorAll('#comprar .series, #comprar [data-series-products]').forEach((sec) => {
        const hay = sec.querySelectorAll('.card[data-sku]:not(.filtro-fuera)').length;
        sec.classList.toggle('filtro-vacio', !hay);
      });

      const n = cuantosPuestos(f);
      if (chivato) {
        chivato.textContent = String(n);
        chivato.hidden = n === 0;
      }
      if (abrir) abrir.classList.toggle('tiene-filtros', n > 0);

      const zona = document.querySelector('[data-home-catalog-total]');
      if (zona && n > 0) zona.textContent = vistos + (vistos === 1 ? ' modelo' : ' modelos');

      /* Recolocar el boton: el tramo donde estaba puede acabar de quedarse vacio
         —y con el `display:none` se iria de la pantalla—. Si no queda ningun
         tramo a la vista, `colocarFiltrosConLaMarca` lo devuelve a su barra, que
         es justo cuando mas falta hace: con cero resultados hay que poder soltar
         los filtros. */
      const raizCat = document.querySelector('#comprar[data-home-catalog-root]');
      if (raizCat && raizCat.dataset.soloCategoria) colocarFiltrosConLaMarca(raizCat);

      let vacio = document.querySelector('[data-filtros-vacio]');
      if (!vacio) {
        vacio = document.createElement('p');
        vacio.className = 'filtros-vacio';
        vacio.setAttribute('data-filtros-vacio', '');
        const raiz = document.getElementById('comprar');
        if (raiz) raiz.appendChild(vacio);
      }
      if (vacio) {
        vacio.textContent = 'Ningún modelo encaja con esos filtros. Prueba a soltar alguno.';
        vacio.hidden = vistos > 0;
      }
      return vistos;
    };

    const refrescarCuenta = () => {
      const f = leer();
      const n = contar(f);
      if (cuenta) cuenta.textContent = String(n);
      /* La palabra del boton va con lo que se esta mirando: en accesorios decia
         «Ver 22 patinetes». */
      const unidad = panel.querySelector('[data-filtros-unidad]');
      if (unidad) {
        const a = ambito();
        unidad.textContent = a.esPieza
          ? (n === 1 ? 'producto' : 'productos')
          : (n === 1 ? 'patinete' : 'patinetes');
      }
      if (resumen) {
        /* El rotulo dice SOBRE QUE se filtra y, si hay filtros, cuantos. Antes solo
           decia una cosa u otra, y con una marca elegida el panel parecia estar
           trabajando sobre el catalogo entero. */
        const a = ambito();
        const puestos = cuantosPuestos(f);
        const donde = a.nombreMarca || a.nombreCat || 'Todo el catálogo';
        resumen.textContent = puestos === 0
          ? donde
          : donde + ' · ' + puestos + (puestos === 1 ? ' filtro' : ' filtros');
      }
      // El eco de cada deslizador, para saber donde se ha dejado
      panel.querySelectorAll('[data-filtros-eco]').forEach((eco) => {
        const k = eco.getAttribute('data-filtros-eco');
        const input = form.querySelector('[name="' + k + '"]');
        if (!input) return;
        const v = Number(input.value) || 0;
        const u = k === 'w' ? ' W' : (k === 'km' ? ' km' : ' km/h');
        eco.textContent = 'desde ' + v + u;
      });
    };

    form.addEventListener('input', refrescarCuenta);
    form.addEventListener('change', refrescarCuenta);

    /* La hoja entra desde abajo y se va por abajo. `showModal()` la pinta ya puesta,
       asi que el estado de partida se pone ANTES y se quita al fotograma siguiente:
       sin ese respiro el navegador no ve dos valores distintos y no anima nada. */
    const menosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    abrir.addEventListener('click', () => {
      prepararGrupos();
      refrescarCuenta();
      panel.classList.add('esta-entrando');
      panel.showModal();
      document.documentElement.style.overflow = 'hidden';
      /* Arriba del todo, y DESPUES de abrirlo: cerrado no esta maquetado —no tiene
         alto— y ponerle el desplazamiento a 0 no hace nada. El panel es el mismo
         elemento cada vez y se quedaba donde lo dejaste, asi que pulsabas «Filtros»
         y aparecia por la mitad, con la primera pregunta ya fuera de vista. */
      const lista = panel.querySelector('.filtros-cuerpo');
      if (lista) lista.scrollTop = 0;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        panel.classList.remove('esta-entrando');
      }));
    });

    let saliendo = false;
    const cerrar = () => {
      if (!panel.open || saliendo) return;
      if (menosMovimiento()) {
        panel.close();
        document.documentElement.style.overflow = '';
        return;
      }
      saliendo = true;
      panel.style.removeProperty('--hoja-y');
      panel.classList.remove('se-arrastra');
      panel.classList.add('esta-saliendo');
      /* Se cierra cuando acaba de bajar, con un plazo de seguridad por si la
         transicion no llega a dispararse (pestaña de fondo, por ejemplo). */
      let hecho = false;
      const alAcabar = (ev) => {
        if (ev.propertyName === 'transform') fin();
      };
      const fin = () => {
        if (hecho) return;
        hecho = true;
        saliendo = false;
        /* Se QUITA a mano, y no basta con `{ once: true }`: si la hoja ya estaba
           abajo no hay transicion que termine, el listener se queda vivo y salta en
           el PROXIMO arrastre — cerrando la hoja a mitad de gesto. Medido: al
           reabrir y tirar de la barra, se iba sola. */
        panel.removeEventListener('transitionend', alAcabar);
        panel.classList.remove('esta-saliendo');
        panel.close();
        document.documentElement.style.overflow = '';
      };
      panel.addEventListener('transitionend', alAcabar);
      setTimeout(fin, 460);
    };

    /* COGER Y BAJAR. Dos reglas, y la segunda es la que hace que se sienta bien:
       - el gesto solo arrastra la hoja si el contenido esta arriba del todo; si no,
         lo que se mueve es el contenido, como en las hojas del movil;
       - se suelta y decide por DISTANCIA o por VELOCIDAD: un golpe corto y rapido
         cierra igual que un arrastre largo y lento. */
    (() => {
      const asa = panel.querySelector('[data-filtros-asa]');
      const cuerpo = panel.querySelector('.filtros-cuerpo');
      if (!asa) return;
      let y0 = 0, t0 = 0, dy = 0, cogido = false, desdeLaLista = false;

      const mueve = (ev) => {
        if (!cogido) return;
        /* Tirando DESDE LA LISTA, en cuanto el dedo va hacia arriba se suelta el
           gesto: ahi el cliente quiere seguir leyendo, no cerrar. Del asa no, que
           esa se estira un poco y vuelve. */
        if (desdeLaLista && ev.clientY - y0 < -6) { cancela(); return; }
        /* Se reclama el gesto: sin esto el navegador decide a mitad que era un
           desplazamiento, manda `pointercancel` y se lleva el resto de los
           movimientos — medido, llegaba 1 de cada 10 y la hoja no se movia. */
        if (ev.cancelable) ev.preventDefault();
        dy = ev.clientY - y0;
        /* Hacia arriba casi no cede: la hoja ya esta arriba del todo y estirarla no
           lleva a ningun sitio. */
        const v = dy < 0 ? dy / 6 : dy;
        panel.style.setProperty('--hoja-y', v.toFixed(1) + 'px');
      };

      const soltarEscuchas = () => {
        window.removeEventListener('pointermove', mueve);
        window.removeEventListener('pointerup', suelta);
        window.removeEventListener('pointercancel', cancela);
      };

      /* Cancelar NO es soltar: si el sistema se lleva el puntero (una llamada, un
         gesto del navegador), la hoja vuelve a su sitio y no se cierra. */
      const cancela = () => {
        if (!cogido) return;
        cogido = false;
        soltarEscuchas();
        panel.classList.remove('se-arrastra');
        panel.style.removeProperty('--hoja-y');
      };

      const suelta = () => {
        if (!cogido) return;
        cogido = false;
        soltarEscuchas();
        panel.classList.remove('se-arrastra');
        const ms = Math.max(1, performance.now() - t0);
        const vel = dy / ms;                       // px por milisegundo
        const alto = panel.getBoundingClientRect().height || 1;
        panel.style.removeProperty('--hoja-y');
        /* Cierra por DISTANCIA (un arrastre largo) o por VELOCIDAD (un golpe seco),
           pero el golpe tambien tiene que recorrer algo: sin ese minimo de 40 px,
           un temblor de 10 px en 7 ms sale a 1,4 px/ms y cerraba la hoja sin que
           nadie hubiera querido cerrarla. */
        if (dy > Math.min(140, alto * 0.28) || (vel > 0.55 && dy > 40)) cerrar();
      };

      /* Solo se arrastra cuando el panel es una hoja, o sea en movil: en escritorio
         es un cajon lateral y no se coge con el raton. El ancho se pregunta en cada
         gesto porque la ventana puede cambiar de tamaño con el panel abierto. */
      const esHoja = () => window.matchMedia('(max-width: 759.98px)').matches;

      const desde = (ev) => {
        if (saliendo || menosMovimiento() || !esHoja()) return;
        if (ev.button !== undefined && ev.button !== 0) return;
        /* La barra lleva dentro la equis: si el gesto empieza ahi no se arrastra
           nada, o se come el clic del boton. */
        if (ev.target.closest && ev.target.closest('button, a, input, select')) return;

        /* Del ASA se tira siempre: es el mango de la hoja y no le importa por donde
           vaya la lista. Aqui salia con `cuerpo.scrollTop > 0`, asi que despues de
           bajar a ver los filtros el mango dejaba de responder.
           Desde la LISTA solo se arrastra si esta arriba del todo —la regla de
           iOS—: a medio bajar, tirar hacia abajo es seguir leyendo. */
        desdeLaLista = !(ev.target.closest && ev.target.closest('.filtros-barra'));
        if (desdeLaLista && cuerpo && cuerpo.scrollTop > 0) return;
        /* Se corta aqui el arrastre NATIVO del navegador. Al tirar con el raton por
           encima del titulo de la barra, el navegador cree que se esta arrastrando
           texto, se queda el gesto y manda `pointercancel` — medido: llegaba tras
           el primer movimiento y la hoja no se movia. */
        if (ev.cancelable) ev.preventDefault();
        cogido = true;
        y0 = ev.clientY;
        t0 = performance.now();
        dy = 0;
        panel.classList.add('se-arrastra');
        /* En la VENTANA y no en la barra, y sin `setPointerCapture`: con la captura,
           el segundo arrastre de la sesion se quedaba sin recibir los `pointermove`
           —el pointerdown llegaba con todo en orden y la hoja no se movia— y el
           gesto quedaba muerto hasta recargar la pagina. Escuchando en la ventana el
           dedo puede salirse de la barra, que es justo lo que hace al bajar. */
        /* `passive:false` porque el movimiento llama a `preventDefault`. */
        window.addEventListener('pointermove', mueve, { passive: false });
        window.addEventListener('pointerup', suelta);
        window.addEventListener('pointercancel', cancela);
      };

      /* En el PANEL y no solo en el asa: ahora el gesto tambien puede empezar en la
         lista. `desde()` decide si procede segun donde haya empezado. */
      panel.addEventListener('pointerdown', desde);
    })();

    panel.querySelector('[data-filtros-cerrar]').addEventListener('click', cerrar);
    panel.addEventListener('close', () => { document.documentElement.style.overflow = ''; });
    panel.addEventListener('click', (ev) => { if (ev.target === panel) cerrar(); });

    panel.querySelector('[data-filtros-ver]').addEventListener('click', () => {
      aplicar();
      cerrar();
    });

    panel.querySelector('[data-filtros-limpiar]').addEventListener('click', () => {
      form.reset();
      refrescarCuenta();
      aplicar();
    });

    /* Cambiar de categoria repinta la parrilla y con ella se van las clases: hay
       que volver a pasar el filtro sobre las tarjetas nuevas. */
    document.addEventListener('ss:catalogo-pintado', () => { if (cuantosPuestos(leer())) aplicar(); });

    refrescarCuenta();
  };

  const initHeroCarousel = () => {
    const root = document.querySelector('[data-hero-carousel]');
    if (!root || root.dataset.bound === 'true') return;

    const viewport = root.querySelector('[data-hero-viewport]');
    const track = root.querySelector('[data-hero-track]');
    const prev = root.querySelector('[data-hero-prev]');
    const next = root.querySelector('[data-hero-next]');
    const dotsWrap = root.querySelector('[data-hero-dots]');
    if (!viewport || !track) return;

    /* Solo las diapositivas VISIBLES: si alguna estuviera oculta por CSS, el
       carrusel se pararía en un hueco en blanco y sobraría un punto. */
    const slides = Array.from(track.querySelectorAll('.hero-slide'))
      .filter((slide) => slide.offsetParent !== null || slide.getClientRects().length > 0);
    if (!slides.length) return;

    /* RAÍL CONTINUO. En escritorio la portada activa va centrada y las vecinas
       asoman por los lados; sin clones, la primera y la última dejarían un hueco
       blanco. Se clonan DOS por lado porque en un monitor ancho asoma más de una
       vecina. Los clones son la MISMA URL (ni una descarga extra) y no cuentan
       para nada: ni índice, ni puntos, ni foco. */
    const CLONES_LADO = slides.length > 1 ? Math.min(2, slides.length) : 0;
    const clonesAntes = [];
    const clonesDespues = [];

    const clonarSlide = (slide) => {
      const copia = slide.cloneNode(true);
      copia.classList.remove('is-active');
      copia.dataset.heroClone = 'true';
      copia.setAttribute('aria-hidden', 'true');
      copia.setAttribute('tabindex', '-1');
      const img = copia.querySelector('img');
      if (img) {
        img.setAttribute('loading', 'lazy');
        img.removeAttribute('fetchpriority');
      }
      return copia;
    };

    for (let i = 0; i < CLONES_LADO; i += 1) {
      const antes = clonarSlide(slides[slides.length - CLONES_LADO + i]);
      track.insertBefore(antes, slides[0]);
      clonesAntes.push(antes);
      const despues = clonarSlide(slides[i]);
      track.appendChild(despues);
      clonesDespues.push(despues);
    }

    let active = 0;
    let timer = 0;
    let warmupTimer = 0;
    let pauseAuto = false;
    let hoverPause = false;
    let focusPause = false;
    let pointerPause = false;
    // El hero mide ~150px en móvil: en cuanto se baja un poco queda fuera de
    // pantalla, pero el autoplay seguía cambiando de portada cada 3 s durante
    // toda la sesión, animando transforms que nadie ve. Ya se pausaba con la
    // pestaña oculta, con el ratón encima y con el foco, pero no al salir del
    // viewport.
    let offscreenPause = false;
    /* 3 s valían para una franja de 150 px que se leía de un vistazo. El héroe de
       ahora trae titular, specs, precio y botón: cambiarlo cada 3 s es quitarle al
       cliente lo que está leyendo. El HTML declara el suyo con data-autoplay-ms. */
    const autoplayMs = Number(root.dataset.autoplayMs) || 3000;

    const clampIndex = (idx) => {
      const len = slides.length;
      return ((idx % len) + len) % len;
    };

    const getImageForSlide = (idx) => {
      const slide = slides[clampIndex(idx)];
      return slide ? slide.querySelector('img') : null;
    };

    const applyHeightFromActive = () => {
      /* El héroe de la portada ya NO es una imagen a sangre: es una composición
         (foto + texto) cuya altura reserva el CSS. Medirla por el ratio de la foto
         la aplastaría al cuadrado de la imagen y taparía el texto. El marcador
         data-auto-height="off" lo declara en el HTML. */
      if (viewport.dataset.autoHeight === 'off') return;

      const image = getImageForSlide(active);
      const width = viewport.clientWidth;
      if (!image || !width) return;

      const setFrom = (w, h) => {
        if (!w || !h) return;
        const nextHeight = Math.max(130, Math.round((width * h) / w));
        viewport.style.height = nextHeight + 'px';
      };

      if (image.naturalWidth && image.naturalHeight) {
        setFrom(image.naturalWidth, image.naturalHeight);
      } else {
        const onLoad = () => {
          setFrom(image.naturalWidth, image.naturalHeight);
          image.removeEventListener('load', onLoad);
        };
        image.addEventListener('load', onLoad);
      }
    };

    let dots = [];
    let dotTargets = [];
    // Un punto por portada: la cantidad de puntos siempre coincide con el nº de imágenes.
    const getDotTargets = () => slides.map((_, idx) => idx);

    const buildDots = () => {
      if (!dotsWrap) return;
      /* Con una sola portada visible el punto no informa de nada (en móvil pasa
         mientras falte arte vertical de las demás). Se esconde en vez de pintar
         un indicador que no indica. */
      dotsWrap.hidden = slides.length < 2;
      dotTargets = getDotTargets();
      dotsWrap.innerHTML = '';
      dots = dotTargets.map((targetIdx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'hero-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Ir a portada ' + (targetIdx + 1));
        dot.addEventListener('click', () => goTo(targetIdx, true));
        dotsWrap.appendChild(dot);
        return dot;
      });
    };

    const updateDots = () => {
      if (!dotsWrap) return;
      const nextTargets = getDotTargets();
      const targetChanged = nextTargets.length !== dotTargets.length || nextTargets.some((value, idx) => value !== dotTargets[idx]);
      if (targetChanged || dots.length !== nextTargets.length) buildDots();
      dots.forEach((dot, idx) => {
        const isActive = dotTargets[idx] === active;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    };

    /* El raíl se coloca en PÍXELES, midiendo el hueco real de la diapositiva:
       con el asomo de escritorio ya no mide el ancho del viewport, así que el
       -100 % por índice de antes ya no vale. En móvil da exactamente lo mismo
       (la diapositiva ocupa el viewport entero), y así hay una sola fórmula. */
    const centrarEn = (elemento) => {
      if (!elemento) return 0;
      return Math.round(viewport.clientWidth / 2 - (elemento.offsetLeft + elemento.offsetWidth / 2));
    };

    const aplicarX = (x, animar) => {
      if (animar === false) track.style.transition = 'none';
      track.style.transform = 'translateX(' + x + 'px)';
      if (animar === false) {
        void track.offsetWidth;          // fuerza el reflujo antes de devolver la animación
        track.style.transition = '';
      }
    };

    /* Marca por GEOMETRÍA, no por índice: en escritorio las vecinas que asoman
       están a la vista y son enlaces de verdad, así que no pueden ir con
       aria-hidden ni fuera del tabulador. En móvil solo hay una a la vista y el
       resultado es el de siempre. */
    /* HIDRATADO DE LAS CREATIVIDADES

       De la tercera en adelante, la foto de cada diapositiva vive en
       `data-src`/`data-srcset` y no en `src`. Las ocho pesaban 547 KB y se
       bajaban todas al abrir la portada para enseñar una: el rail es
       horizontal, las ocho estan a la misma altura y `loading="lazy"` las
       daba por proximas a la vista, que es justo lo que son.

       Se hidrata POR GEOMETRIA y sobre todos los hijos del rail, clones
       incluidos: un clon se copia con su `data-src` puesto, asi que sabe
       hidratarse solo cuando le toca — sin esto, en escritorio los clones de
       las ultimas, que son los que asoman por la izquierda al abrir, saldrian
       en blanco.

       El margen es un ancho de ventana por cada lado: la siguiente ya esta
       pedida cuando el cliente pulsa, asi que el cambio se ve instantaneo. Y
       como el paso automatico va recorriendolas, acaban cargadas todas... pero
       de una en una y con la pagina ya pintada, que es cuando sobra red. */
    const hidratar = (slide) => {
      const img = slide && slide.querySelector ? slide.querySelector('img[data-src]') : null;
      if (!img) return;
      const ss = img.getAttribute('data-srcset');
      if (ss) img.setAttribute('srcset', ss);
      img.setAttribute('src', img.getAttribute('data-src'));
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
    };

    const hidratarLoVisible = (x) => {
      const ancho = viewport.clientWidth;
      /* Medio ancho de ventana. Con uno entero, en escritorio —donde caben tres
         diapositivas a la vez— el margen alcanzaba a tres mas por cada lado y se
         pedian las ocho al abrir. Con medio se piden las que se ven y la de al
         lado, que es la unica que puede aparecer al pulsar una vez. */
      const margen = ancho * 0.5;
      const hijos = track.children;
      for (let i = 0; i < hijos.length; i += 1) {
        const el = hijos[i];
        const izquierda = el.offsetLeft + x;
        if ((izquierda + el.offsetWidth) > -margen && izquierda < (ancho + margen)) hidratar(el);
      }
    };

    const marcarVisibles = (x) => {
      hidratarLoVisible(x);
      const ancho = viewport.clientWidth;
      slides.forEach((slide, i) => {
        const izquierda = slide.offsetLeft + x;
        const aLaVista = (izquierda + slide.offsetWidth) > 1 && izquierda < (ancho - 1);
        slide.classList.toggle('is-active', i === active);
        slide.setAttribute('aria-hidden', aLaVista ? 'false' : 'true');
        slide.setAttribute('tabindex', aLaVista ? '0' : '-1');
      });
    };

    let saltoPendiente = false;
    let saltoTimer = 0;

    const rematarSalto = () => {
      if (!saltoPendiente) return;
      saltoPendiente = false;
      if (saltoTimer) {
        window.clearTimeout(saltoTimer);
        saltoTimer = 0;
      }
      aplicarX(centrarEn(slides[active]), false);
    };

    // El transitionend es el disparador normal; el temporizador es el seguro por
    // si la transición no llega a emitirlo (pestaña oculta, motion reducido…).
    track.addEventListener('transitionend', (event) => {
      if (event.target === track && event.propertyName === 'transform') rematarSalto();
    });

    const goTo = (idx, fromUser = false) => {
      const total = slides.length;
      // Solo el paso de uno que da la vuelta (del último al primero y al revés)
      // viaja por el clon; un salto de punto a punto se anima por el raíl.
      const daLaVuelta = CLONES_LADO > 0 && (idx === total || idx === -1);
      active = clampIndex(idx);

      const xReal = centrarEn(slides[active]);
      marcarVisibles(xReal);
      updateDots();
      applyHeightFromActive();

      if (daLaVuelta) {
        saltoPendiente = true;
        if (saltoTimer) window.clearTimeout(saltoTimer);
        saltoTimer = window.setTimeout(rematarSalto, 720);
        aplicarX(centrarEn(idx === total ? clonesDespues[0] : clonesAntes[clonesAntes.length - 1]), true);
      } else {
        saltoPendiente = false;
        aplicarX(xReal, true);
      }

      if (fromUser) restartAutoplay();
    };

    const recolocar = () => {
      saltoPendiente = false;
      const x = centrarEn(slides[active]);
      marcarVisibles(x);
      aplicarX(x, false);
    };

    const stopAutoplay = () => {
      if (warmupTimer) {
        window.clearTimeout(warmupTimer);
        warmupTimer = 0;
      }
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    };

    const startAutoplay = () => {
      stopAutoplay();
      if (slides.length <= 1 || pauseAuto) return;
      timer = window.setInterval(() => {
        goTo(active + 1);
      }, autoplayMs);
    };

    const restartAutoplay = () => {
      startAutoplay();
    };

    const syncAutoplayPause = () => {
      pauseAuto = hoverPause || focusPause || pointerPause || offscreenPause;
      if (pauseAuto) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    };

    if (dotsWrap) buildDots();

    if (prev) prev.addEventListener('click', () => goTo(active - 1, true));
    if (next) next.addEventListener('click', () => goTo(active + 1, true));

    let pointerStartX = 0;
    let pointerCurrentX = 0;
    let pointerStartTime = 0;
    let pointerActive = false;
    const swipeThreshold = () => Math.max(44, viewport.clientWidth * 0.1);

    /* EL PUNTERO SE CAPTURA TARDE, cuando ya hay arrastre de verdad — nunca en
       el `pointerdown`.

       Capturarlo al pulsar rompía el clic: con la captura puesta en el
       .hero-viewport, el `click` que viene después se dispara sobre ESE
       elemento y no sobre la <a> de la portada, así que el navegador no seguía
       el href y pulsar una portada NO HACÍA NADA. Medido: el destino del clic
       era `DIV.hero-viewport` y nadie llamaba a preventDefault; simplemente el
       enlace no se enteraba.

       Con la captura diferida, un clic limpio no captura nada y el enlace
       funciona; en cuanto el dedo o el ratón se mueven más de 8 px se captura y
       el arrastre sigue comportándose igual, incluso si el puntero se sale del
       carrusel. */
    let pointerCaptured = false;
    const CAPTURE_UMBRAL = 8;

    viewport.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      pointerActive = true;
      pointerCaptured = false;
      pointerPause = true;
      syncAutoplayPause();
      pointerStartX = event.clientX;
      pointerCurrentX = event.clientX;
      pointerStartTime = performance.now();
    });

    viewport.addEventListener('pointermove', (event) => {
      if (!pointerActive) return;
      pointerCurrentX = event.clientX;
      if (!pointerCaptured && Math.abs(pointerCurrentX - pointerStartX) > CAPTURE_UMBRAL) {
        pointerCaptured = true;
        try { viewport.setPointerCapture(event.pointerId); } catch (_) {}
      }
    });

    const finishSwipe = (event) => {
      if (!pointerActive) return;
      pointerActive = false;
      pointerPause = false;
      syncAutoplayPause();
      if (pointerCaptured) {
        pointerCaptured = false;
        try { viewport.releasePointerCapture(event.pointerId); } catch (_) {}
      }
      const dx = pointerCurrentX - pointerStartX;
      const dt = performance.now() - pointerStartTime;
      const shouldSwipe = Math.abs(dx) > swipeThreshold() || (Math.abs(dx) > 26 && dt < 220);
      if (!shouldSwipe) return;
      goTo(active + (dx < 0 ? 1 : -1), true);
    };

    viewport.addEventListener('pointerup', finishSwipe);
    viewport.addEventListener('pointercancel', finishSwipe);

    root.addEventListener('mouseenter', () => {
      hoverPause = true;
      syncAutoplayPause();
    });
    root.addEventListener('mouseleave', () => {
      hoverPause = false;
      syncAutoplayPause();
    });
    root.addEventListener('focusin', () => {
      focusPause = true;
      syncAutoplayPause();
    });
    root.addEventListener('focusout', () => {
      focusPause = false;
      syncAutoplayPause();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoplay();
      } else if (!pauseAuto) {
        startAutoplay();
      }
    });

    // Detiene el autoplay mientras el hero no esté a la vista. Mismo patrón de
    // IntersectionObserver que ya usan el rail de series y las categorías.
    // Sin soporte, se queda como estaba (siempre activo).
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          offscreenPause = !entry.isIntersecting;
          syncAutoplayPause();
        });
      }, { threshold: 0 }).observe(root);
    }

    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(active - 1, true);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(active + 1, true);
      }
    });

    let lastWheelAt = 0;
    root.addEventListener('wheel', (event) => {
      const now = Date.now();
      if (now - lastWheelAt < 320) return;

      const primaryDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(primaryDelta) < 18) return;

      event.preventDefault();
      lastWheelAt = now;
      goTo(active + (primaryDelta > 0 ? 1 : -1), true);
    }, { passive: false });

    /* Al cambiar de ancho hay que recolocar el raíl: la posición está en píxeles
       y el ancho del cartel depende de la altura de la banda (43 vw). Se agrupa
       en un rAF para no medir en cada tic del arrastre del ratón. */
    let resizeRaf = 0;
    const onResize = () => {
      applyHeightFromActive();
      if (typeof window.requestAnimationFrame !== 'function') {
        recolocar();
        return;
      }
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        recolocar();
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    window.addEventListener('load', onResize, { once: true });

    goTo(0);
    // La colocación inicial no se anima: si no, la portada entraría deslizándose
    // desde el borde izquierdo en cada carga.
    recolocar();
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => applyHeightFromActive());
      });
    }
    window.setTimeout(() => applyHeightFromActive(), 380);
    startAutoplay();
    root.dataset.bound = 'true';
  };

  const initDgtTooltips = () => {
    const toggles = $all('.dgt-tooltip-toggle');
    if (!toggles.length) return;

    if (!document.body.__scootshopDgtTooltipApi) {
      let floating = document.querySelector('.dgt-floating-tooltip');
      if (!floating) {
        floating = document.createElement('div');
        floating.className = 'dgt-floating-tooltip';
        floating.setAttribute('role', 'tooltip');
        document.body.appendChild(floating);
      }

      let activeToggle = null;
      const isMobileView = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;

      const placeTooltip = (toggle) => {
        const rect = toggle.getBoundingClientRect();
        const mobileView = isMobileView();
        const maxWidth = Math.min(mobileView ? 230 : 280, window.innerWidth - 20);
        floating.style.maxWidth = maxWidth + 'px';
        floating.style.left = '0px';
        floating.style.top = '0px';
        floating.classList.add('is-visible');
        const tooltipRect = floating.getBoundingClientRect();
        /* LA NUBE SE CENTRA EN EL SELLO, tambien en escritorio.

           Antes se alineaba por su borde DERECHO con el del sello, y como el sello vive
           pegado al canto derecho de la tarjeta, la nube caia siempre entera dentro de
           su tarjeta: parecia un cajon de la tarjeta y no una capa flotando sobre la
           pagina. Centrada, asoma por encima de la tarjeta de al lado, que es lo que la
           hace leerse como lo que es. Los topes de abajo la siguen metiendo dentro de
           la ventana, asi que en la ultima columna se ajusta sola. */
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.bottom + (mobileView ? 8 : 10);
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;
        if (top + tooltipRect.height > window.innerHeight - 10) {
          top = rect.top - tooltipRect.height - 10;
          floating.classList.add('is-above');
        } else {
          floating.classList.remove('is-above');
        }
        if (top < 10) top = 10;
        floating.style.left = left + 'px';
        floating.style.top = top + 'px';
        let arrowLeft = rect.left + (rect.width / 2) - left;
        const minArrow = 20;
        const maxArrow = tooltipRect.width - 20;
        if (arrowLeft < minArrow) arrowLeft = minArrow;
        if (arrowLeft > maxArrow) arrowLeft = maxArrow;
        floating.style.setProperty('--dgt-arrow-left', arrowLeft + 'px');
      };

      const showTooltip = (toggle) => {
        activeToggle = toggle;
        toggles.forEach((item) => {
          item.setAttribute('aria-expanded', item === toggle ? 'true' : 'false');
        });
        floating.textContent = toggle.getAttribute('data-tooltip-text') || '';
        placeTooltip(toggle);
      };

      const hideTooltip = () => {
        activeToggle = null;
        toggles.forEach((item) => item.setAttribute('aria-expanded', 'false'));
        floating.classList.remove('is-visible', 'is-above');
      };

      document.addEventListener('mousemove', (event) => {
        if (!activeToggle || isMobileView()) return;
        const overToggle = toggles.some((toggle) => toggle.contains(event.target));
        const overTooltip = floating.contains(event.target);
        if (!overToggle && !overTooltip) hideTooltip();
      });
      document.addEventListener('click', (event) => {
        const clickedToggle = toggles.some((toggle) => toggle.contains(event.target));
        const clickedTooltip = floating.contains(event.target);
        if (!clickedToggle && !clickedTooltip) hideTooltip();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') hideTooltip();
      });
      window.addEventListener('resize', () => {
        if (activeToggle) placeTooltip(activeToggle);
      });
      window.addEventListener('scroll', () => {
        if (activeToggle) hideTooltip();
      }, { passive:true });

      document.body.__scootshopDgtTooltipApi = {
        isMobileView,
        showTooltip,
        hideTooltip,
        isActiveToggle: (toggle) => activeToggle === toggle
      };
    }

    const api = document.body.__scootshopDgtTooltipApi;

    toggles.forEach((toggle) => {
      if (toggle.dataset.dgtTooltipBound === 'true') return;
      toggle.addEventListener('mouseenter', () => {
        if (api.isMobileView()) return;
        api.showTooltip(toggle);
      });
      toggle.addEventListener('focus', () => {
        if (api.isMobileView()) return;
        api.showTooltip(toggle);
      });
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (api.isActiveToggle(toggle) && api.isMobileView()) {
          api.hideTooltip();
          return;
        }
        api.showTooltip(toggle);
      });
      toggle.dataset.dgtTooltipBound = 'true';
    });
  };

  const initCards = () => {
    const normalizeLink = (link) => {
      let out = (link || '').trim();
      if (!out) return '';
      if (!out.startsWith('http') && !out.startsWith('/') && !out.startsWith('#')) out = '/' + out;
      return out;
    };

    const productMap = new Map(
      getCatalogProducts()
        .filter((product) => product && product.href)
        .map((product) => [normalizePath(product.href), product])
    );

    $all('.card').forEach((card) => {
      const getCardLink = () => {
        let link = normalizeLink(card.dataset.link);
        if (!link) {
          const a = card.querySelector('a.btn-primary[href]');
          link = normalizeLink(a ? a.getAttribute('href') : '');
        }
        return link;
      };

      const link = getCardLink();
      const product = productMap.get(normalizePath(link));

      if (product) {
        if (product.name) card.dataset.name = product.name;
        if (product.sku) card.dataset.sku = product.sku;
        if (product.brand) {
          const brandEl = card.querySelector('.card-brand');
          if (brandEl) brandEl.textContent = product.brand;
        }
        if (product.homeTitle) {
          const titleEl = card.querySelector('.title');
          if (titleEl) titleEl.textContent = product.homeTitle;
        }
        if (product.badgeText) {
          const chipEl = card.querySelector('.chip-name');
          if (chipEl) chipEl.textContent = product.badgeText;
        }
        if (product.href) card.dataset.productUrl = product.href;
        if (product.image) card.dataset.image = product.image;
        if (product.priceText) {
          card.dataset.now = product.priceText;
          const priceNow = card.querySelector('.price-now');
          if (priceNow) priceNow.textContent = product.priceText;
        }
        if (product.compareAtPriceText) {
          card.dataset.was = product.compareAtPriceText;
          const priceWas = card.querySelector('.price-was');
          if (priceWas) priceWas.textContent = product.compareAtPriceText;
        }
      }

      /* El botón de añadir con variantes NO se enlaza aquí: lo escucha por
         delegación js/variant-pop.js, el mismo módulo que atiende la caja "Añade
         algo más" de las fichas. Aquí solo hay que asegurarse de que el archivo
         esté pedido. */
      if (card.querySelector('[data-open-variants]')) ensureVariantPop();

      // Hover sobre la tarjeta: la segunda vista del producto entra con un
      // fundido + escala. Se superpone en una capa aparte, sin tocar la foto de
      // portada que hay debajo.
      const hoverImage = card.dataset.hoverImage || fotoDeHover(product) || '';
      if (hoverImage && CAN_HOVER) {
        /* Si la burbuja de variantes está abierta desde ESTA tarjeta manda ella: la
           foto del acabado que se está mirando no debe quedar tapada por la vista
           alternativa. Se mira por el aria-expanded del propio botón, que es lo que
           deja puesto el módulo, en vez de por una variable suya: así el home no
           depende de sus interioridades. */
        const bubbleOwnsCard = () => !!card.querySelector('[data-open-variants][aria-expanded="true"]');
        // Retardo de intención: al recorrer la parrilla se rozan muchas tarjetas
        // de paso. Sin esperar, cada una descargaría su segunda foto (~62 KB de
        // media; 2 MB si se pasan las 34). 110 ms distinguen "pasar de largo" de
        // "pararse a mirar" y no se notan al hacer hover a propósito.
        let hoverTimer = 0;
        card.addEventListener('mouseenter', () => {
          if (bubbleOwnsCard()) return;
          hoverTimer = window.setTimeout(() => {
            hoverTimer = 0;
            showColorPreview(card, hoverImage);
          }, 110);
        });
        card.addEventListener('mouseleave', () => {
          if (hoverTimer) { window.clearTimeout(hoverTimer); hoverTimer = 0; }
          if (bubbleOwnsCard()) return;
          hideColorPreview(card);
        });
      }

      if (link) {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.dgt-tooltip')) return;
          if (e.target.closest('[data-add-to-cart]')) return;
          // Sin esto, abrir el cuadro de opciones navegaría a la ficha del producto.
          if (e.target.closest('[data-open-variants]')) return;
          window.location.href = link;
        });
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.location.href = link;
          }
        });
      }

      $all('[data-buy-button]', card).forEach((el) => {
        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('keydown', (e) => e.stopPropagation());
      });
    });
  };

  // API compartida para reutilizar el mismo render/hidratación de tarjetas fuera de Home.
  window.SCOOTSHOP_HOME_CARD_API = {
    buildCardMarkup: (product, productIndex) => buildCardMarkup(product, Number(productIndex) || 0),
    /* Lo usa scripts/build-home-catalog.js para hornear la parrilla dentro de
       index.html: pide el marcado y su firma al MISMO código que lo pinta, así no hay
       dos generadores de la misma verdad que puedan separarse. */
    catalogoHorneable: (categoryKey) => {
      const { clave, html } = buildHomeCatalogMarkup(categoryKey);
      return { clave, html, firma: firmaDeMarcado(html) };
    },
    hydrate: () => {
      initCards();
      initDgtTooltips();
    },
    /* Las usa js/variant-pop.js: al elegir un acabado en la burbuja abierta desde una
       tarjeta, se enseña la foto de ese acabado sobre la portada, que es lo que hacía
       la paleta antigua al pasar el ratón por un color. Se exponen desde aquí porque
       el fundido son dos capas propias del home (.card-color-preview) y su montaje no
       tiene por qué salir de este archivo. */
    previewColor: (card, src) => showColorPreview(card, src),
    clearPreview: (card) => hideColorPreview(card)
  };

  const updateHomeStructuredData = () => {
    const orderedProducts = getOrderedHomeCategories()
      .flatMap((category) => (category.series || []).flatMap((series) => getSeriesProducts(series.key)));
    if (!orderedProducts.length) return;
    const desiredUrls = orderedProducts.map((product) => 'https://scootshop.co' + normalizePath(product.href));
    $all('script[type="application/ld+json"]').forEach((block) => {
      const raw = block.textContent || '';
      if (!raw.trim()) return;
      try {
        const data = JSON.parse(raw);
        const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
        let changed = false;
        graph.forEach((item) => {
          if (!item || item['@type'] !== 'ItemList' || item['@id'] !== 'https://scootshop.co/#products') return;
          const currentElements = Array.isArray(item.itemListElement) ? item.itemListElement : [];
          const currentUrls = currentElements.map((entry) => entry && entry.url).filter(Boolean);
          const isSame = currentUrls.length === desiredUrls.length && currentUrls.every((url, idx) => url === desiredUrls[idx]);
          if (isSame) return;

          item.itemListElement = desiredUrls.map((url, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: url
          }));
          changed = true;
        });
        if (changed) block.textContent = JSON.stringify(data, null, 2);
      } catch (_) {
      }
    });
  };

  const boot = () => {
    /* index.js pinta las PARRILLAS DE CATALOGO: la de la portada y las de las
       paginas de categoria (/patinetes, /accesorios, /repuestos). También se carga
       en las fichas de producto, pero SOLO para exponer SCOOTSHOP_HOME_CARD_API
       (las tarjetas de "También te puede interesar"), que ya se define a nivel de
       módulo. En las fichas, la cabecera, el footer, los menús y el resto de la UI
       común los inicializa global-assets-app.js, así que correr boot() ahí sería
       redundante — y era lo que restauraba el scroll de la home provocando el salto.

       La pregunta es «¿tengo una parrilla que pintar?», y se hace por el root del
       catálogo. Antes se preguntaba por [data-hero-carousel], que era otra forma de
       decir «¿soy index.html?»: valía mientras la portada fuese la única página con
       catálogo, y dejó de valer el dia que dejó de serlo — /patinetes cargaba sus
       diez scripts y se quedaba con el hueco vacío.

       Dos marcadores porque son dos trabajos distintos, y desde que la portada
       dejo de traer el catalogo ya no coinciden en la misma pagina:
       [data-hero-carousel] es la portada (su carrusel, la bienvenida, las
       categorias, la oferta y el escaparate) y #comprar es una parrilla de
       catalogo (las tres paginas de categoria).

       `#comprar` y no `[data-home-catalog-root]` a secas: ese atributo es el
       contrato de estilo de la tarjeta y lo llevan también el escaparate y los
       relacionados de las fichas, que no deben arrancar nada de esto. */
    if (!document.querySelector('[data-hero-carousel], #comprar[data-home-catalog-root]')) return;

    /* Antes que nada: quitar de la vista las categorías apagadas en el catálogo.
       Si se hace después, la píldora muerta llega a pintarse. */
    podarCategoriasOcultas();

    initHomeCategoryNav();
    renderHomeCatalog(activeHomeCategoryKey);

    // Salto de scroll instantáneo (sin animación) respetando la cabecera fija. El
    // <html> ya no usa scroll-behavior:smooth global, pero forzamos behavior:'instant'
    // para que el reposicionado al restaurar nunca se anime (defensivo, clave en iOS).
    const jumpInstant = (targetY) => {
      const y = Math.max(0, targetY);
      // behavior:'instant' fuerza salto sin animación aunque hubiera scroll-behavior
      // smooth (clave en iOS, donde alternar el estilo no siempre lo suprimía).
      try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); }
      catch (_) { window.scrollTo(0, y); }
    };

    // ¿Llegamos con un ancla? (p. ej. /#faq al pulsar el menú desde /cuenta)
    let hashTarget = null;
    const rawHash = (window.location.hash || '').slice(1);
    if (rawHash) {
      let hashId = rawHash;
      try { hashId = decodeURIComponent(rawHash); } catch (_) {}
      hashTarget = document.getElementById(hashId);
    }

    /* El ancla de la URL sí es cosa de esta página: se calcula tras pintar el
       catálogo, porque antes el destino no existe. Volver atrás NO se toca aquí
       —de eso se ocupa js/scroll-memoria.js, el único dueño del scroll, que además
       sabe distinguir una vuelta de una visita nueva.

       Dos cosas que se hacían mal y ahora se ven, porque el menú de Productos
       empezó a usar este camino de verdad (`/patinetes/#series-joyor`):

       - Se restaba SOLO el alto de la cabecera. Debajo hay otra barra pegajosa
         —la del catálogo, 60 px—, así que el rótulo del tramo quedaba tapado por
         ella. Se resta `getHomeStickyOffset()`, que es la suma de las dos y es lo
         que usan las píldoras y el riel para lo mismo.

       - Se saltaba UNA vez. Lo que hay por encima del destino sigue creciendo un
         rato (el riel de marcas se pinta, las fotos entran, la cabecera de
         categoría asienta), así que el sitio bueno cambia bajo los pies: medido
         en /patinetes/#ecoxtrem, el primer tramo acababa 95 px por debajo. Se
         vuelve a anclar mientras dure el plazo, como hace scroll-memoria, y por
         la misma razón: parar en cuanto la altura parece quieta es pararse
         demasiado pronto. */
    if (hashTarget) {
      const anclar = () => {
        jumpInstant(hashTarget.getBoundingClientRect().top + window.scrollY - getHomeStickyOffset());
      };
      /* Se publica para que lo pueda pedir quien cambie alturas por encima del
         destino —hoy, el traslado del boton de filtros al rotulo del tramo. */
      reanclarHash = anclar;
      anclar();

      /* Si el cliente ya ha tocado la página, se suelta: seguir mandando el
         scroll sería pelearse con él. */
      let tocado = false;
      ['wheel', 'touchstart', 'keydown'].forEach((ev) => {
        window.addEventListener(ev, () => { tocado = true; }, { once: true, passive: true });
      });

      const hasta = Date.now() + 900;
      requestAnimationFrame(function reanclar() {
        if (tocado) return;
        anclar();
        if (Date.now() < hasta) requestAnimationFrame(reanclar);
      });
    }

    // Al volver, las tarjetas no se presentan con su animación de entrada: el cliente
    // ya las había visto. Lo decide el arranque en línea del <head>.
    const isBack = !!(window.SS_SCROLL && window.SS_SCROLL.volviendo);

    renderSharedProductMenus();
    initDesktopProductsMenu();
    setYear();
    setVh();
    window.addEventListener('resize', setVh, { passive:true });
    window.addEventListener('orientationchange', setVh, { passive:true });

    const hydrateAfterPaint = () => {
      initHeroCarousel();
      initCards();
      // Recuentos de las tarjetas de categoría: sustitución de texto sobre un
      // hueco que ya existe, así que no mueve la maquetación.
      syncCategoryCards();
      initCategoryCards();
      /* Aqui y no en runIdle: es lo primero que se ve al bajar de las categorias,
         y sus fotos van `loading=lazy`, asi que no le disputan el ancho de banda
         a la portada, que es el LCP. */
      initEscaparate();
      runIdle(() => {
        initAbout();
        updateHomeStructuredData();
        if (!isBack) initCardReveal();
        initMarcaScroll();   // sigue al scroll: tambien al volver atras
        initFunciona();
        initFiltros();
        initDgtTooltips();
        initHomeCategorySpy();
        // En tiempo de inactividad: sus fotos van lazy y no compiten con el LCP.
        initOfertaSemanal();
      });
    };

    // requestAnimationFrame may be heavily throttled on inactive tabs.
    // Keep a short timeout fallback so the hero remains interactive quickly.
    let didHydrate = false;
    const runHydrate = () => {
      if (didHydrate) return;
      didHydrate = true;
      hydrateAfterPaint();
    };

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(runHydrate);
      window.setTimeout(runHydrate, 140);
    } else {
      window.setTimeout(runHydrate, 0);
    }
  };

  const ensureProductsThenBoot = () => {
    let booted = false;
    const startBoot = () => {
      if (booted) return;
      booted = true;
      try { boot(); } catch (e) { console.error('boot error', e); }
    };

    if (Array.isArray(window.SCOOTSHOP_PRODUCTS)) {
      // data already available
      return startBoot();
    }

    // Try to find the products script tag and wait for its load event
    const prodScript = Array.from(document.scripts || []).find(s => s && s.src && s.src.indexOf('/data/products.js') !== -1);
    if (prodScript) {
      // If already loaded according to readyState
      if (prodScript.readyState === 'complete' || prodScript.readyState === 'loaded') return startBoot();
      prodScript.addEventListener('load', startBoot, { once: true });
      // If it errors or never loads, fallback to start after short timeout
      prodScript.addEventListener('error', () => setTimeout(startBoot, 200), { once:true });
      // Also poll briefly in case products are injected by other code
      let checks = 0;
      const poll = setInterval(() => {
        if (Array.isArray(window.SCOOTSHOP_PRODUCTS) || checks++ > 50) {
          clearInterval(poll);
          startBoot();
        }
      }, 100);
      return;
    }

    // No script tag found — poll for products for a short period then boot anyway
    let tries = 0;
    const timer = setInterval(() => {
      if (Array.isArray(window.SCOOTSHOP_PRODUCTS) || tries++ > 50) {
        clearInterval(timer);
        startBoot();
      }
    }, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureProductsThenBoot, { once: true });
  } else {
    ensureProductsThenBoot();
  }
})();

(() => {
  window.addEventListener('unhandledrejection', function (ev) {
    try {
      const reason = ev && ev.reason;
      const msg = typeof reason === 'string' ? reason : (reason && (reason.message || (reason.toString && reason.toString()))) || '';
      if (typeof msg === 'string' && msg.includes('A listener indicated an asynchronous response by returning true')) {
        if (typeof ev.preventDefault === 'function') ev.preventDefault();
      }
    } catch (e) {
      // noop
    }
  });
})();

/* Prerender de páginas de contenido al pasar el ratón / tocar un enlace
   (Speculation Rules, Chrome) → navegación hacia adelante casi instantánea.
   Mejora progresiva: los navegadores sin soporte lo ignoran. Se excluyen
   pago/cuenta/admin/api para no ejecutar páginas sensibles por adelantado. */
(() => {
  try {
    if (document.getElementById('ss-speculationrules')) return;
    if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules'))) return;
    const rules = {
      prerender: [{
        where: { and: [
          { href_matches: '/*' },
          { not: { href_matches: '/checkout*' } },
          { not: { href_matches: '/pago*' } },
          { not: { href_matches: '/cuenta*' } },
          { not: { href_matches: '/admin*' } },
          { not: { href_matches: '/api*' } },
          { not: { selector_matches: '[rel~="nofollow"]' } },
          { not: { selector_matches: '[target="_blank"]' } }
        ] },
        eagerness: 'moderate'
      }]
    };
    const s = document.createElement('script');
    s.type = 'speculationrules';
    s.id = 'ss-speculationrules';
    s.textContent = JSON.stringify(rules);
    (document.head || document.documentElement).appendChild(s);
  } catch (_) {}
})();
