// /data/products.js
// Catalogo global enriquecido para hosting estatico.
(function () {
  var dgtTooltipText = 'Este distintivo indica que el modelo está homologado y certificado por la DGT, de acuerdo con la normativa vigente aplicable a vehículos de movilidad personal.';

  var categoryDefinitions = [
    {
      key: 'electric-scooters',
      /* Su pagina propia. Sin esto, quien quiera enlazar la categoria
         tiene que adivinar la ruta a partir de la clave. */
      pageUrl: '/patinetes/',
      label: 'Patinetes eléctricos',
      menuOrder: 1,
      homeOrder: 1,
      showInMenu: true,
      showOnHome: true,
      showHeaderOnHome: false,
      homeTitle: 'Patinetes eléctricos',
      homeDescription: 'Todas las marcas que trabajamos, del urbano homologado al de doble motor para fuera del asfalto.'
    },
    {
      key: 'electric-skates',
      label: 'Patines eléctricos',
      menuOrder: 2,
      homeOrder: 2,
      showInMenu: true,
      showOnHome: true,
      showHeaderOnHome: true,
      homeTitle: 'Patines eléctricos',
      homeDescription: 'Espacio reservado para futuros modelos de patines eléctricos.'
    },
    {
      key: 'spare-parts',
      /* Su pagina propia. Sin esto, quien quiera enlazar la categoria
         tiene que adivinar la ruta a partir de la clave. */
      pageUrl: '/repuestos/',
      label: 'Repuestos',
      /* DETRÁS de accesorios (7) a propósito: primero lo que se conduce, luego lo
         que se le añade, y al final lo que se le repone. El 4 que tenía venía de
         cuando la categoría estaba vacía y no se veía en ningún sitio. */
      menuOrder: 8,
      homeOrder: 8,
      showInMenu: true,
      showOnHome: true,
      /* Sin cabecera de categoría: la serie que hay dentro también se llama
         «Repuestos» y el título salía dos veces seguidas. Accesorios y patinetes
         hacen lo mismo — manda el rótulo de la serie. */
      showHeaderOnHome: false,
      homeTitle: 'Repuestos',
      homeDescription: 'Recambios y piezas de desgaste para los modelos que vendemos.'
    }
    ,{
      /* OCULTAS desde el 25 ago 2026: no se venden. Los productos siguen en el
         catálogo y sus fichas siguen VIVAS, indexadas y comprables — esto solo
         las saca de la portada y del menú. Para volver a enseñarlas basta con
         poner los dos flags a true: la portada y el menú los leen de aquí y no
         hay marcado que tocar. */
      key: 'electric-motorcycles',
      label: 'Motos eléctricas',
      menuOrder: 5,
      homeOrder: 5,
      showInMenu: false,
      showOnHome: false,
      showHeaderOnHome: false,
      homeTitle: 'Motos eléctricas',
      homeDescription: 'Motos eléctricas infantiles de motocross y aventura.'
    }
    ,{
      key: 'electric-bikes',
      label: 'Bicicletas eléctricas',
      menuOrder: 6,
      homeOrder: 6,
      showInMenu: false,
      showOnHome: false,
      showHeaderOnHome: false,
    }
    ,{
      key: 'accessories',
      /* Su pagina propia. Sin esto, quien quiera enlazar la categoria
         tiene que adivinar la ruta a partir de la clave. */
      pageUrl: '/accesorios/',
      label: 'Accesorios',
      menuOrder: 7,
      homeOrder: 7,
      showInMenu: true,
      showOnHome: true,
      showHeaderOnHome: false,
      homeTitle: 'Accesorios',
      homeDescription: 'Manillares, protectores, mandos limitadores y todo lo que se le pone a un patinete.'
    }
  ];

  var seriesDefinitions = [
    {
      key: 'ecoxtrem',
      label: 'Ecoxtrem',
      categoryKey: 'electric-scooters',
      menuOrder: 0,
      homeOrder: 0,
      homeSectionId: 'ecoxtrem',
      listingSectionId: 'comprar',
      homeTitle: 'Ecoxtrem',
      homeDescription: 'Movilidad urbana equilibrada, cómoda y preparada para el día a día.',
      homeAriaLabel: 'Lista de productos Ecoxtrem'
    },
    {
      key: 'k',
      label: 'KuKirin',
      categoryKey: 'electric-scooters',
      menuOrder: 1,
      homeOrder: 1,
      homeSectionId: 'series-k',
      listingSectionId: 'comprar',
      homeTitle: 'KuKirin',
      homeDescription: 'Rendimiento sólido para desplazamientos diarios y recorridos mixtos.',
      homeAriaLabel: 'Lista de productos Series K'
    },
    {
      key: 'rovoron',
      label: 'ROVORON',
      categoryKey: 'electric-scooters',
      menuOrder: 2,
      homeOrder: 2,
      homeSectionId: 'series-rovoron',
      listingSectionId: 'comprar',
      homeTitle: 'ROVORON',
      homeDescription: 'Chasis tubular y suspensión de recorrido largo para quien pisa fuera del asfalto.',
      homeAriaLabel: 'Lista de productos ROVORON'
    },
    {
      /* DUALTRON, alta el 27 de agosto de 2026. Todavía SIN PRODUCTOS, y por eso
         no se ve: `buildMarcasRielMarkup()` descarta las series con cero
         (`filter(item => item.n > 0)`), así que la placa aparecerá sola el día
         que se dé de alta el primer Dualtron. No hay que tocar nada más. */
      key: 'dualtron',
      label: 'DUALTRON',
      categoryKey: 'electric-scooters',
      menuOrder: 3,
      homeOrder: 3,
      homeSectionId: 'series-dualtron',
      listingSectionId: 'comprar',
      homeTitle: 'DUALTRON',
      homeDescription: 'La referencia en alto rendimiento: doble motor, suspensión de cartucho y frenos hidráulicos.',
      homeAriaLabel: 'Lista de productos DUALTRON'
    },
    {
      /* JOYOR, alta el 28 de agosto de 2026. Su primer producto no es nuevo: el
         T10 DUAL llevaba desde siempre en la «Serie GT» —nombre de almacén—
         aunque su marca ya decía JOYOR. Se movió aquí, PERO CONSERVA SU URL
         (`/patinetes/series-gt/t10-dual/`): cambiarla rompería los enlaces que
         ya estén fuera. La carpeta no tiene que coincidir con la serie. */
      key: 'joyor',
      label: 'JOYOR',
      categoryKey: 'electric-scooters',
      menuOrder: 4,
      homeOrder: 4,
      homeSectionId: 'series-joyor',
      listingSectionId: 'comprar',
      homeTitle: 'JOYOR',
      homeDescription: 'De la ciudad al todoterreno, con homologación DGT en casi toda la gama.',
      homeAriaLabel: 'Lista de productos JOYOR'
    },
    {
      /* Las series de patinete iban 0,1,2,2,3,4: ROVORON y Serie N compartían el
         2 desde el alta de ROVORON, y con dos claves iguales el orden lo decidía
         la posición en el array, no el número. Renumeradas 0..6 al entrar
         DUALTRON. */
      key: 'n',
      label: 'Serie N',
      categoryKey: 'electric-scooters',
      menuOrder: 5,
      homeOrder: 5,
      homeSectionId: 'series-n',
      homeTitle: 'Series N',
      homeDescription: 'Serie versátil con enfoque en estabilidad, autonomía y uso cotidiano.',
      homeAriaLabel: 'Lista de productos Series N'
    },
    {
      key: 'gt',
      label: 'Serie GT',
      categoryKey: 'electric-scooters',
      menuOrder: 6,
      homeOrder: 6,
      homeSectionId: 'series-g',
      homeTitle: 'Series GT',
      homeDescription: 'Gama de alto rendimiento para quienes buscan potencia y control.',
      homeAriaLabel: 'Lista de productos Series GT'
    },
    {
      key: 'ix',
      label: 'Serie IX',
      categoryKey: 'electric-scooters',
      menuOrder: 7,
      homeOrder: 7,
      homeSectionId: 'series-ix',
      homeTitle: 'Serie IX',
      homeDescription: 'Línea práctica y eficiente para ciudad y trayectos habituales.',
      homeAriaLabel: 'Lista de productos Serie IX'
    }
    /* Las series de «Accesorios» no se escriben aquí: se GENERAN de la tabla de
       familias (`accessoryCategoryDefinitions`) y se añaden a esta lista más
       abajo. Ver el comentario de esa tabla. */
    ,{
      /* Repuestos. Una sola serie para toda la categoría: cuando haya piezas de
         familias distintas (frenos, cámaras, pastillas) se parte como se partió
         `acc` en `acc` + `acc-limit`. */
      key: 'rep',
      label: 'Repuestos',
      categoryKey: 'spare-parts',
      menuOrder: 1,
      homeOrder: 1,
      homeSectionId: 'series-repuestos',
      listingSectionId: 'comprar',
      homeTitle: 'Repuestos',
      homeDescription: 'Piezas de desgaste y recambios para los modelos que vendemos.',
      homeAriaLabel: 'Lista de repuestos'
    }
    ,{
      key: 'b',
      label: 'Bicicletas — Serie B',
      categoryKey: 'electric-bikes',
      menuOrder: 1,
      homeOrder: 1,
      homeSectionId: 'series-b',
      listingSectionId: 'comprar',
      homeTitle: 'Bicicletas — Serie B',
      homeDescription: 'Bicicletas eléctricas orientadas a confort, eficiencia y uso urbano.',
      homeAriaLabel: 'Lista de bicicletas eléctricas'
    }
    ,{
      key: 'motos',
      label: 'Motos eléctricas',
      categoryKey: 'electric-motorcycles',
      menuOrder: 1,
      homeOrder: 1,
      homeSectionId: 'series-motos',
      listingSectionId: 'comprar',
      homeTitle: 'Motos eléctricas',
      homeDescription: 'Motos eléctricas infantiles pensadas para diversión segura y progresiva.',
      homeAriaLabel: 'Lista de motos eléctricas'
    }
  ];

  var products = [
    {
      id: 'ecoxtrem-m41-tank-ultimate-1000w',
      filtros: { dgt: true, motores: 1, w: 1000, km: 50, kmh: 55, frenos: 'mecanicos' },
      sku: 'M41TANK',
      name: 'M41 Tank Ultimate 1000W',
      menuLabel: 'M41 Tank Ultimate',
      badgeText: 'Ecoxtrem M41 Tank Ultimate 1000W',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '535 €',
      compareAtPriceText: '620 €',
      stock: 'in_stock',
      paypalId: 'M41TANKULTIMATE1K',
      href: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/',
      image: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/1.webp',
      alt: 'Patinete eléctrico Ecoxtrem M41 Tank Ultimate 1000W',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              key: 'negro',
              label: 'Negro',
              swatch: '#111111',
              range: [1, 3],
              default: true
            },
            {
              key: 'verde',
              label: 'Verde - Fluor',
              swatch: '#d9ff43',
              range: [4, 6]
            },
            {
              key: 'rojo',
              label: 'Rojo',
              swatch: '#c91f2c',
              range: [7, 9]
            },
            {
              key: 'azul',
              label: 'Azul',
              swatch: '#1d4ed8',
              range: [10, 13]
            },
            {
              key: 'verde-negro',
              label: 'Verde y Negro',
              swatch: 'linear-gradient(135deg, #d9ff43 50%, #111111 50%)',
              range: [14, 17]
            }
                      ]
        }
      ],
      specs: ['1000 W', 'Homologado DGT', '50 km'],
      compatibleSkus: ['ACC-LIMIT-M41', 'ACC-BAR-WAKE', 'ACC-BAR-WAKE-DH', 'ACC-BAR-UNO', 'ACC-BAR-NANLIO', 'ACC-BAR-KOCEVLO', 'ACC-BAR-LUNJE'],
      homeOrder: 1,
      homeTitle: 'Ecoxtrem M41 Tank Ultimate 1000W',
      homeAriaLabel: 'Ecoxtrem M41 — Tank Ultimate 1000W',
      priceAriaLabel: 'Precio M41 — Tank Ultimate',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/1.webp', alt: 'Ecoxtrem M41 Tank Ultimate 1000W' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/2.webp', alt: 'Ecoxtrem M41 Tank vista 2' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/3.webp', alt: 'Ecoxtrem M41 Tank vista 3' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/4.webp', alt: 'Ecoxtrem M41 Tank vista 4' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/5.webp', alt: 'Ecoxtrem M41 Tank vista 5' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/6.webp', alt: 'Ecoxtrem M41 Tank vista 6' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/7.webp', alt: 'Ecoxtrem M41 Tank vista 7' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/8.webp', alt: 'Ecoxtrem M41 Tank vista 8' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/9.webp', alt: 'Ecoxtrem M41 Tank vista 9' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/10.webp', alt: 'Ecoxtrem M41 Tank azul vista 10' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/11.webp', alt: 'Ecoxtrem M41 Tank azul vista 11' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/12.webp', alt: 'Ecoxtrem M41 Tank azul vista 12' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/13.webp', alt: 'Ecoxtrem M41 Tank azul vista 13' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/14.webp', alt: 'Ecoxtrem M41 Tank verde y negro vista 14' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/15.webp', alt: 'Ecoxtrem M41 Tank verde y negro vista 15' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/16.webp', alt: 'Ecoxtrem M41 Tank verde y negro vista 16' },
        { src: '/patinetes/ecoxtrem/m41-tank-ultimate-1000w/img/17.webp', alt: 'Ecoxtrem M41 Tank verde y negro vista 17' }
      ]
    },
    {
      id: 'ecoxtrem-bison-gt-carbon-design',
      filtros: { dgt: true, motores: 1, w: 800, km: 50, kmh: 47, frenos: 'mecanicos' },
      sku: 'BISONGT',
      name: 'Bison GT Carbon Design',
      menuLabel: 'Bison GT Carbon',
      badgeText: 'Ecoxtrem Bison GT Carbon Design',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '470 €',
      compareAtPriceText: '560 €',
      stock: 'in_stock',
      paypalId: 'BISONGTCARBONDESIGN',
      href: '/patinetes/ecoxtrem/bison-gt-carbon-design/',
      image: '/patinetes/ecoxtrem/bison-gt-carbon-design/img/1.webp',
      alt: 'Patinete eléctrico Ecoxtrem Bison GT Carbon Design',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              key: 'rojo-negro',
              label: 'Rojo/Negro',
              swatch: 'linear-gradient(135deg, #c91f2c 50%, #111111 50%)',
              range: [1, 3],
              default: true
            },
            {
              key: 'gris',
              label: 'Gris',
              swatch: '#8c9099',
              range: [4, 6]
            },
            {
              key: 'negro',
              label: 'Negro',
              swatch: '#111111',
              range: [7, 9]
            }
                      ]
        }
      ],
      specs: ['800 W', 'Homologado DGT', '40-50 km'],
      homeOrder: 2,
      homeTitle: 'Ecoxtrem Bison GT Carbon Design',
      homeAriaLabel: 'Ecoxtrem Bison — GT Carbon Design',
      priceAriaLabel: 'Precio Bison — GT Carbon',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/ecoxtrem/bison-gt-carbon-design/img/1.webp', alt: 'Ecoxtrem Bison GT Carbon Design vista 1' },
        { src: '/patinetes/ecoxtrem/bison-gt-carbon-design/img/2.webp', alt: 'Ecoxtrem Bison GT Carbon Design vista 2' },
        { src: '/patinetes/ecoxtrem/bison-gt-carbon-design/img/3.webp', alt: 'Ecoxtrem Bison GT Carbon Design vista 3' },
        { src: '/patinetes/ecoxtrem/bison-gt-carbon-design/img/4.webp', alt: 'Ecoxtrem Bison GT Carbon Design vista 4' },
        { src: '/patinetes/ecoxtrem/bison-gt-carbon-design/img/5.webp', alt: 'Ecoxtrem Bison GT Carbon Design vista 5' },
        { src: '/patinetes/ecoxtrem/bison-gt-carbon-design/img/6.webp', alt: 'Ecoxtrem Bison GT Carbon Design vista 6' },
        { src: '/patinetes/ecoxtrem/bison-gt-carbon-design/img/7.webp', alt: 'Ecoxtrem Bison GT Carbon Design vista 7' },
        { src: '/patinetes/ecoxtrem/bison-gt-carbon-design/img/8.webp', alt: 'Ecoxtrem Bison GT Carbon Design vista 8' },
        { src: '/patinetes/ecoxtrem/bison-gt-carbon-design/img/9.webp', alt: 'Ecoxtrem Bison GT Carbon Design vista 9' }
      ]
    },
    {
      id: 'ecoxtrem-m41-armored-dual',
      filtros: { dgt: true, motores: 2, w: 2000, km: 90, kmh: 83, frenos: 'hidraulicos' },
      sku: 'M41DUAL',
      name: 'M41 ARMORED DUAL (LR)',
      menuLabel: 'M41 Armored Dual (LR)',
      badgeText: 'Ecoxtrem M41 Armored Dual (LR)',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '785 €',
      compareAtPriceText: '899 €',
      stock: 'in_stock',
      paypalId: 'M41ARMOREDDUAL',
      href: '/patinetes/ecoxtrem/m41-armored-dual/',
      image: '/patinetes/ecoxtrem/m41-armored-dual/img/8.webp',
      alt: 'Patinete eléctrico Ecoxtrem M41 ARMORED DUAL (LR)',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              key: 'blanco',
              label: 'BLANCO',
              swatch: '#f8fafc',
              range: [1, 4],
              // Sin stock (2026-07-31): js/index.js lo excluye de la paleta del home y en la
              // ficha su botón va deshabilitado en el markup estático.
              available: false
            },
            {
              key: 'gris-amarillo',
              label: 'Gris y Amarillo',
              swatch: 'linear-gradient(135deg, #8c9099 50%, #eab308 50%)',
              range: [8, 12],
              default: true
            },
            {
              key: 'azul',
              label: 'Azul',
              swatch: '#0a1f66',
              range: [13, 16],
              // Sin stock (2026-08-24): mismo trato que BLANCO — fuera de la paleta del home
              // y con el botón deshabilitado en el markup estático de la ficha.
              available: false
            },
            {
              key: 'granate',
              label: 'Granate',
              swatch: '#7f1d1d',
              range: [17, 21]
            },
            {
              key: 'verde',
              label: 'Verde',
              swatch: '#7cb518',
              range: [23, 24]
            },
            {
              key: 'amarillo',
              label: 'Amarillo',
              swatch: '#f0c000',
              range: [25, 25]
            }
                      ]
        }
      ],
      specs: ['2 x 1000 W', '60 V 24 Ah', '80-90 km'],
      compatibleSkus: ['ACC-LIMIT-M41-AD', 'ACC-BAR-WAKE', 'ACC-BAR-WAKE-DH', 'ACC-BAR-UNO', 'ACC-BAR-NANLIO', 'ACC-BAR-KOCEVLO', 'ACC-BAR-LUNJE'],
      homeOrder: 3,
      homeTitle: 'Ecoxtrem M41 Armored Dual (LR)',
      homeAriaLabel: 'Ecoxtrem M41 — Armored Dual (LR)',
      priceAriaLabel: 'Precio M41 — Armored Dual (LR)',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/1.webp', alt: 'Ecoxtrem M41 Armored Dual vista 1' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/2.webp', alt: 'Ecoxtrem M41 Armored Dual vista 2' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/3.webp', alt: 'Ecoxtrem M41 Armored Dual vista 3' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/4.webp', alt: 'Ecoxtrem M41 Armored Dual vista 4' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/5.webp', alt: 'Ecoxtrem M41 Armored Dual vista 5' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/6.webp', alt: 'Ecoxtrem M41 Armored Dual vista 6' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/7.webp', alt: 'Ecoxtrem M41 Armored Dual vista 7' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/8.webp', alt: 'Ecoxtrem M41 Armored Dual vista 8' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/9.webp', alt: 'Ecoxtrem M41 Armored Dual vista 9' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/10.webp', alt: 'Ecoxtrem M41 Armored Dual vista 10' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/11.webp', alt: 'Ecoxtrem M41 Armored Dual vista 11' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/12.webp', alt: 'Ecoxtrem M41 Armored Dual vista 12' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/13.webp', alt: 'Ecoxtrem M41 Armored Dual vista 13' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/14.webp', alt: 'Ecoxtrem M41 Armored Dual vista 14' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/15.webp', alt: 'Ecoxtrem M41 Armored Dual vista 15' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/16.webp', alt: 'Ecoxtrem M41 Armored Dual vista 16' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/17.webp', alt: 'Ecoxtrem M41 Armored Dual vista 17' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/18.webp', alt: 'Ecoxtrem M41 Armored Dual vista 18' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/19.webp', alt: 'Ecoxtrem M41 Armored Dual vista 19' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/20.webp', alt: 'Ecoxtrem M41 Armored Dual vista 20' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/21.webp', alt: 'Ecoxtrem M41 Armored Dual vista 21' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/22.webp', alt: 'Ecoxtrem M41 Armored Dual vista 22' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/25.webp', alt: 'Ecoxtrem M41 Armored Dual en verde, vista 3/4' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/23.webp', alt: 'Ecoxtrem M41 Armored Dual vista 23' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/24.webp', alt: 'Ecoxtrem M41 Armored Dual vista 24' }
      ]
    },
    {
      id: 'ecoxtrem-m41-armored-one',
      filtros: { dgt: true, motores: 1, w: 1000, km: 65, kmh: 60, frenos: 'hidraulicos' },
      sku: 'M41ONE',
      name: 'M41 ARMORED ONE PRO',
      menuLabel: 'M41 Armored One Pro',
      badgeText: 'Ecoxtrem M41 Armored One Pro',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '639 €',
      compareAtPriceText: '759 €',
      stock: 'in_stock',
      href: '/patinetes/ecoxtrem/m41-armored-one/',
      image: '/patinetes/ecoxtrem/m41-armored-one/img/1.webp',
      alt: 'Patinete eléctrico Ecoxtrem M41 ARMORED ONE PRO',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'naranja', label: 'Naranja', swatch: '#ea580c', range: [1, 6], default: true },
            { key: 'azul-oscuro', label: 'Azul oscuro', swatch: '#0b1b3a', range: [7, 10] },
            { key: 'blanco', label: 'Blanco', swatch: '#f8fafc', range: [11, 16] },
            { key: 'rojo-rosa', label: 'Rojo rosa', swatch: '#f43f5e', range: [17, 17] },
            { key: 'verde-militar', label: 'Verde militar', swatch: '#4b5320', range: [18, 18] }
                      ]
        }
      ],
      specs: ['1000 W', '52 V 20 Ah', 'Hasta 65 km'],
      compatibleSkus: ['ACC-LIMIT-M41-AO', 'ACC-BAR-WAKE', 'ACC-BAR-WAKE-DH', 'ACC-BAR-UNO', 'ACC-BAR-NANLIO', 'ACC-BAR-KOCEVLO', 'ACC-BAR-LUNJE'],
      homeOrder: 4,
      homeTitle: 'Ecoxtrem M41 Armored One Pro',
      homeAriaLabel: 'Ecoxtrem M41 — Armored One Pro',
      priceAriaLabel: 'Precio M41 — Armored One Pro',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/1.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 1' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/18.webp', alt: 'Ecoxtrem M41 Armored One Pro en naranja, vista lateral' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/2.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 2' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/3.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 3' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/4.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 4' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/5.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 5' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/6.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 6' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/7.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 7' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/8.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 8' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/9.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 9' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/10.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 10' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/11.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 11' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/12.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 12' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/13.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 13' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/14.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 14' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/15.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 15' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/16.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 16' },
        { src: '/patinetes/ecoxtrem/m41-armored-one/img/17.webp', alt: 'Ecoxtrem M41 Armored One Pro vista 17' }
      ]
    },
    {
      id: 'ecoxtrem-m41-tank-dual',
      filtros: { dgt: true, motores: 2, w: 2000, km: 70, kmh: 70, frenos: 'hidraulicos' },
      sku: 'M41TANKDUAL',
      name: 'M41 TANK DUAL',
      menuLabel: 'M41 Tank Dual',
      badgeText: 'Ecoxtrem M41 Tank Dual',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '725 €',
      compareAtPriceText: '849 €',
      stock: 'in_stock',
      href: '/patinetes/ecoxtrem/m41-tank-dual/',
      image: '/patinetes/ecoxtrem/m41-tank-dual/img/1.webp',
      alt: 'Patinete eléctrico Ecoxtrem M41 TANK DUAL',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'gris-amarillo', label: 'Gris y Amarillo', swatch: 'linear-gradient(135deg, #8c9099 50%, #eab308 50%)', range: [1, 4], default: true },
            { key: 'gris-rojo', label: 'Gris y Rojo', swatch: 'linear-gradient(135deg, #8c9099 50%, #dc2626 50%)', range: [5, 8] },
            { key: 'gris-azul', label: 'Gris y Azul', swatch: 'linear-gradient(135deg, #8c9099 50%, #1d4ed8 50%)', range: [9, 9] },
            { key: 'gris-verde', label: 'Gris y Verde', swatch: 'linear-gradient(135deg, #8c9099 50%, #16a34a 50%)', range: [10, 10] }
                      ]
        }
      ],
      specs: ['2 x 1000 W', '52 V 20 Ah', '65-70 km'],
      compatibleSkus: ['ACC-LIMIT-M41-TD', 'ACC-BAR-WAKE', 'ACC-BAR-WAKE-DH', 'ACC-BAR-UNO', 'ACC-BAR-NANLIO', 'ACC-BAR-KOCEVLO', 'ACC-BAR-LUNJE'],
      homeOrder: 5,
      homeTitle: 'Ecoxtrem M41 Tank Dual',
      homeAriaLabel: 'Ecoxtrem M41 — Tank Dual',
      priceAriaLabel: 'Precio M41 — Tank Dual',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/ecoxtrem/m41-tank-dual/img/1.webp', alt: 'Ecoxtrem M41 Tank Dual vista 1' },
        { src: '/patinetes/ecoxtrem/m41-tank-dual/img/2.webp', alt: 'Ecoxtrem M41 Tank Dual vista 2' },
        { src: '/patinetes/ecoxtrem/m41-tank-dual/img/3.webp', alt: 'Ecoxtrem M41 Tank Dual vista 3' },
        { src: '/patinetes/ecoxtrem/m41-tank-dual/img/4.webp', alt: 'Ecoxtrem M41 Tank Dual vista 4' },
        { src: '/patinetes/ecoxtrem/m41-tank-dual/img/5.webp', alt: 'Ecoxtrem M41 Tank Dual vista 5' },
        { src: '/patinetes/ecoxtrem/m41-tank-dual/img/6.webp', alt: 'Ecoxtrem M41 Tank Dual vista 6' },
        { src: '/patinetes/ecoxtrem/m41-tank-dual/img/7.webp', alt: 'Ecoxtrem M41 Tank Dual vista 7' },
        { src: '/patinetes/ecoxtrem/m41-tank-dual/img/8.webp', alt: 'Ecoxtrem M41 Tank Dual vista 8' },
        { src: '/patinetes/ecoxtrem/m41-tank-dual/img/9.webp', alt: 'Ecoxtrem M41 Tank Dual vista 9' },
        { src: '/patinetes/ecoxtrem/m41-tank-dual/img/10.webp', alt: 'Ecoxtrem M41 Tank Dual vista 10' }
      ]
    },
    {
      id: 'k-g2-pro',
      filtros: { dgt: true, motores: 1, w: 600, km: 58, kmh: 45, frenos: 'mecanicos' },
      sku: 'G2PRO',
      name: 'KUKIRIN G2 PRO',
      menuLabel: 'KUKIRIN G2 PRO',
      badgeText: 'KUKIRIN G2 PRO',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '515 €',
      compareAtPriceText: '660 €',
      stock: 'in_stock',
      paypalId: 'S5A5HD7BQ4XSA',
      href: '/patinetes/series-k/g2-pro/',
      image: '/patinetes/series-k/g2-pro/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN G2 PRO',
      specs: ['600 W', 'Hasta 58 km', '48 V 15 Ah'],
      homeOrder: 1,
      homeTitle: 'KUKIRIN G2 PRO',
      homeAriaLabel: 'KUKIRIN G2 PRO — 600 W, 45 km/h y hasta 58 km',
      priceAriaLabel: 'Estado KUKIRIN G2 PRO',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/series-k/g2-pro/img/1.webp', alt: 'KUKIRIN G2 PRO vista 1' },
        { src: '/patinetes/series-k/g2-pro/img/2.webp', alt: 'KUKIRIN G2 PRO vista 2' },
        { src: '/patinetes/series-k/g2-pro/img/3.webp', alt: 'KUKIRIN G2 PRO vista 3' },
        { src: '/patinetes/series-k/g2-pro/img/4.webp', alt: 'KUKIRIN G2 PRO vista 4' },
        { src: '/patinetes/series-k/g2-pro/img/5.webp', alt: 'KUKIRIN G2 PRO vista 5' },
        { src: '/patinetes/series-k/g2-pro/img/6.webp', alt: 'KUKIRIN G2 PRO vista 6' },
        { src: '/patinetes/series-k/g2-pro/img/7.webp', alt: 'KUKIRIN G2 PRO vista 7' },
        { src: '/patinetes/series-k/g2-pro/img/8.webp', alt: 'KUKIRIN G2 PRO (Normal) con asiento vista 8' },
        { src: '/patinetes/series-k/g2-pro/img/9.webp', alt: 'KUKIRIN G2 PRO (Normal) con asiento vista 9' },
        { src: '/patinetes/series-k/g2-pro/img/10.webp', alt: 'KUKIRIN G2 PRO (Normal) con asiento vista 10' },
        { src: '/patinetes/series-k/g2-pro/img/11.webp', alt: 'KUKIRIN G2 PRO (Normal) con asiento vista 11' },
        { src: '/patinetes/series-k/g2-pro/img/12.webp', alt: 'KUKIRIN G2 PRO (Normal) con asiento vista 12' }
      ],
      /* Eje de MODELO, declarado como tal. Esto es lo único que hace falta para que
         Home, ficha, ACC POP y carrito lo traten como modelo: el rótulo, el tipo de
         selector y las fotos salen de aquí.

         Antes eran `colorVariants` con el comentario "dos configuraciones bajo el
         formato de color", y la ficha las disfrazaba a mano de píldora con una clase
         CSS extra. El Home no podía saberlo y las pintaba como círculos de color.
         Ver js/product-attributes.js. */
      attributes: [
        {
          key: 'model',
          label: 'Versión',
          type: 'pill',
          options: [
            {
              key: 'vmp',
              label: 'G2 PRO DGT',
              accentColors: ['#111315', '#EE7B25'],
              images: [1, 2, 3, 4, 5, 6, 7],
              default: true,
              dgt: true,
              desc: '<strong>KUKIRIN G2 PRO</strong> en versión DGT: homologado por la DGT y limitado a 25 km/h. Motor brushless de 600 W, batería de 48 V 15 Ah y hasta 65 km de autonomía.'
            },
            {
              key: 'normal',
              label: 'G2 PRO NORMAL',
              accentColors: ['#111315', '#EE7B25'],
              images: [8, 9, 10, 11, 12],
              dgt: false,
              desc: '<strong>KUKIRIN G2 PRO</strong> en versión NORMAL: deslimitado, con motor brushless de 600 W, batería de 48 V 15 Ah, punta de 45 km/h y hasta 65 km de autonomía. <strong>Sin homologación DGT</strong>: solo para circuito o recinto privado.'
            }
          ]
        }
      ]
    },
    {
      id: 'k-g2',
      filtros: { dgt: false, motores: 1, w: 800, km: 55, kmh: 45, frenos: 'mecanicos' },
      sku: 'KG2',
      name: 'KUKIRIN G2',
      menuLabel: 'KUKIRIN G2',
      badgeText: 'KUKIRIN G2',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '489 €',
      compareAtPriceText: '535 €',
      stock: 'in_stock',
      href: '/patinetes/series-k/g2/',
      image: '/patinetes/series-k/g2/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN G2',
      specs: ['800 W', 'Hasta 55 km', '48 V 15 Ah'],
      homeOrder: 2,
      homeTitle: 'KUKIRIN G2',
      homeAriaLabel: 'KUKIRIN G2 — 800 W, 45 km/h y hasta 55 km',
      priceAriaLabel: 'Estado KUKIRIN G2',
      /* El sello es el de la opción POR DEFECTO, que es la VMP. Al elegir "Normal" lo
         retira `applyVariantContent()` leyendo el `dgt:false` de abajo. */
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/series-k/g2/img/1.webp', alt: 'KUKIRIN G2 vista 1' },
        { src: '/patinetes/series-k/g2/img/2.webp', alt: 'KUKIRIN G2 vista 2' },
        { src: '/patinetes/series-k/g2/img/3.webp', alt: 'KUKIRIN G2 vista 3' },
        { src: '/patinetes/series-k/g2/img/4.webp', alt: 'KUKIRIN G2 vista 4' },
        { src: '/patinetes/series-k/g2/img/5.webp', alt: 'KUKIRIN G2 vista 5' },
        { src: '/patinetes/series-k/g2/img/6.webp', alt: 'KUKIRIN G2 vista 6' },
        { src: '/patinetes/series-k/g2/img/7.webp', alt: 'KUKIRIN G2 vista 7' }
      ],
      /* Mismo eje de MODELO que el KUKIRIN G2 PRO: VMP homologado vs Normal
         deslimitado. Lo que cambia respecto al PRO son las FOTOS: allí la versión
         Normal lleva asiento y tiene su propio reportaje (8-12), y aquí las dos
         versiones son el mismo patinete —lo que cambia es el firmware—, así que
         comparten las siete. Compartir foto en un eje `pill` es legítimo y
         `scripts/qa/fotos-por-variante.js` solo exige que la mueva un eje `swatch`. */
      attributes: [
        {
          key: 'model',
          label: 'Versión',
          type: 'pill',
          options: [
            {
              key: 'vmp',
              label: 'G2 DGT',
              accentColors: ['#111315', '#E5751E'],
              images: [1, 2, 3, 4, 5, 6, 7],
              default: true,
              dgt: true,
              desc: '<strong>KUKIRIN G2</strong> en versión DGT: homologado por la DGT y limitado a 25 km/h. Motor brushless de 800 W, batería de 48 V 15 Ah y hasta 55 km de autonomía.'
            },
            {
              key: 'normal',
              label: 'G2 NORMAL',
              accentColors: ['#111315', '#E5751E'],
              images: [1, 2, 3, 4, 5, 6, 7],
              dgt: false,
              desc: '<strong>KUKIRIN G2</strong> en versión NORMAL: deslimitado, con motor brushless de 800 W, batería de 48 V 15 Ah, punta de 45 km/h y hasta 55 km de autonomía. <strong>Sin homologación DGT</strong>: solo para circuito o recinto privado.'
            }
          ]
        }
      ]
    },
    {
      id: 'n7',
      filtros: { dgt: true, motores: 1, w: 350, km: 30, kmh: 30, frenos: null },
      sku: 'N7PRO',
      name: 'N7PRO',
      menuLabel: 'N7PRO',
      badgeText: 'N7PRO',
      brand: 'TODIMART',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '185 €',
      compareAtPriceText: '220,50 €',
      stock: 'in_stock',
      paypalId: 'PSFEEEULL7H5Y',
      href: '/patinetes/series-n/n7/',
      image: '/patinetes/series-n/n7/img/1.webp',
      alt: 'Patinete eléctrico N7PRO',
      specs: ['350 W', '25-30 km', '8.5" honeycomb'],
      compatibleSkus: ['ACC-REFLECT'],
      homeOrder: 1,
      homeTitle: 'N7PRO',
      homeAriaLabel: 'N7PRO — Patinete eléctrico urbano',
      priceAriaLabel: 'Precio N7PRO',
      gallery: [
        { src: '/patinetes/series-n/n7/img/1.webp', alt: 'N7PRO vista 1' },
        { src: '/patinetes/series-n/n7/img/2.webp', alt: 'N7PRO vista 2' },
        { src: '/patinetes/series-n/n7/img/3.webp', alt: 'N7PRO vista 3' },
        { src: '/patinetes/series-n/n7/img/4.webp', alt: 'N7PRO vista 4' },
        { src: '/patinetes/series-n/n7/img/5.webp', alt: 'N7PRO vista 5' },
        { src: '/patinetes/series-n/n7/img/6.webp', alt: 'N7PRO vista 6' }
      ]
    },
    {
      id: 's4',
      filtros: { dgt: true, motores: 1, w: 300, km: 25, kmh: 25, frenos: 'mecanicos' },
      sku: 'S4',
      name: 'ZWheel MASCOOTER S4',
      menuLabel: 'S4',
      badgeText: 'ZWheel MASCOOTER S4',
      brand: 'MASCOOTER',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '380 €',
      compareAtPriceText: '475 €',
      stock: 'in_stock',
      paypalId: '3HAMJE5SBQPTG',
      href: '/patinetes/series-n/s4/',
      image: '/patinetes/series-n/s4/img/1.webp',
      alt: 'Patinete eléctrico ZWheel MASCOOTER S4',
      specs: ['300 W (600 W max.)', 'Hasta 25 km', '10" tubeless'],
      homeOrder: 2,
      homeTitle: 'ZWheel MASCOOTER S4',
      homeAriaLabel: 'ZWheel MASCOOTER S4 — Homologado DGT',
      priceAriaLabel: 'Precio S4',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/series-n/s4/img/1.webp', alt: 'S4 vista 1' },
        { src: '/patinetes/series-n/s4/img/5.webp', alt: 'S4 plegado' },
        { src: '/patinetes/series-n/s4/img/2.webp', alt: 'S4 freno trasero y amortiguacion' },
        { src: '/patinetes/series-n/s4/img/3.webp', alt: 'S4 rueda delantera y suspensión' },
        { src: '/patinetes/series-n/s4/img/4.webp', alt: 'S4 manillar y display' }
      ]
    },
    {
      id: 's3',
      filtros: { dgt: false, motores: 2, w: 6000, km: 120, kmh: 85, frenos: 'hidraulicos' },
      sku: 'S3',
      // 6000 W dual motor — lo dicen sus propios specs
      motores: 2,
      name: 'S3-11',
      menuLabel: 'S3',
      badgeText: 'S3-11',
      brand: 'BOYUEDA',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '1070 €',
      compareAtPriceText: '1200 €',
      stock: 'in_stock',
      paypalId: 'S74CJ4PM3GYJ',
      href: '/patinetes/series-n/s3/',
      image: '/patinetes/series-n/s3/img/1.webp',
      alt: 'Patinete eléctrico S3-11',
      specs: ['6000 W dual motor', '100-120 km', '11" off-road tubeless'],
      homeOrder: 3,
      homeTitle: 'S3-11',
      homeAriaLabel: 'S3-11 — Dual motor en stock',
      priceAriaLabel: 'Estado S3',
      gallery: [
        { src: '/patinetes/series-n/s3/img/1.webp', alt: 'S3-11 vista 1' },
        { src: '/patinetes/series-n/s3/img/2.webp', alt: 'S3-11 vista 2' },
        { src: '/patinetes/series-n/s3/img/3.webp', alt: 'S3-11 vista 3' },
        { src: '/patinetes/series-n/s3/img/4.webp', alt: 'S3-11 vista 4' },
        { src: '/patinetes/series-n/s3/img/5.webp', alt: 'S3-11 vista 5' },
        { src: '/patinetes/series-n/s3/img/6.webp', alt: 'S3-11 vista 6' },
        { src: '/patinetes/series-n/s3/img/7.webp', alt: 'S3-11 vista 7' },
        { src: '/patinetes/series-n/s3/img/8.webp', alt: 'S3-11 vista 8' },
        { src: '/patinetes/series-n/s3/img/9.webp', alt: 'S3-11 vista 9' }
      ]
    },
    {
      id: 'vs6',
      filtros: { dgt: false, motores: 1, w: 1000, km: 65, kmh: 60, frenos: 'mecanicos' },
      sku: 'VS6',
      name: 'VS6',
      menuLabel: 'VS6',
      badgeText: 'VS6',
      brand: 'VIPCOO',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '550 €',
      compareAtPriceText: '675 €',
      stock: 'in_stock',
      paypalId: 'CFMATL34TKXNQ',
      href: '/patinetes/series-n/vs6/',
      image: '/patinetes/series-n/vs6/img/1.webp',
      alt: 'Patinete eléctrico VS6',
      specs: ['1000 W', 'Hasta 65 km', '48 V 18,2 Ah'],
      homeOrder: 4,
      homeTitle: 'VS6',
      homeAriaLabel: 'VS6 — Serie N',
      priceAriaLabel: 'Precio VS6',
      gallery: [
        { src: '/patinetes/series-n/vs6/img/1.webp', alt: 'VS6 vista 1' },
        { src: '/patinetes/series-n/vs6/img/2.webp', alt: 'VS6 vista 2' },
        { src: '/patinetes/series-n/vs6/img/3.webp', alt: 'VS6 vista 3' },
        { src: '/patinetes/series-n/vs6/img/4.webp', alt: 'VS6 vista 4' },
        { src: '/patinetes/series-n/vs6/img/5.webp', alt: 'VS6 vista 5' },
        { src: '/patinetes/series-n/vs6/img/6.webp', alt: 'VS6 vista 6' }
      ]
    },
    {
      id: 'v70-connected',
      filtros: { dgt: true, motores: 1, w: 1500, km: 70, kmh: 25, frenos: 'mecanicos' },
      sku: 'V70',
      name: 'Cecotec Bongo V70 Connected',
      menuLabel: 'Bongo V70',
      badgeText: 'Cecotec Bongo V70 Connected',
      brand: 'CECOTEC',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '620 €',
      compareAtPriceText: '805 €',
      stock: 'in_stock',
      href: '/patinetes/series-n/v70-connected/',
      image: '/patinetes/series-n/v70-connected/img/2.webp',
      alt: 'Patinete electrico Cecotec Bongo V70 Connected',
      specs: ['1500 W max.', 'Hasta 70 km', '48 V 15 Ah'],
      homeOrder: 5,
      homeTitle: 'Cecotec Bongo V70 Connected',
      homeAriaLabel: 'Cecotec Bongo V70 Connected — 1500 W maximos y hasta 70 km',
      priceAriaLabel: 'Precio Bongo V70 Connected',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/series-n/v70-connected/img/2.webp', alt: 'Bongo V70 Connected vista principal' },
        { src: '/patinetes/series-n/v70-connected/img/1.webp', alt: 'Bongo V70 Connected vista 1' },
        { src: '/patinetes/series-n/v70-connected/img/3.webp', alt: 'Bongo V70 Connected vista 3' },
        { src: '/patinetes/series-n/v70-connected/img/4.webp', alt: 'Bongo V70 Connected vista 4' },
        { src: '/patinetes/series-n/v70-connected/img/5.webp', alt: 'Bongo V70 Connected vista 5' },
        { src: '/patinetes/series-n/v70-connected/img/6.webp', alt: 'Bongo V70 Connected vista 6' }
      ]
    },
    {
      id: 'd6',
      filtros: { dgt: false, motores: 1, w: 800, km: 45, kmh: 45, frenos: null },
      sku: 'D6',
      name: 'D6',
      menuLabel: 'D6',
      badgeText: 'D6',
      brand: 'TODIMART',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '375 €',
      compareAtPriceText: '450 €',
      stock: 'in_stock',
      href: '/patinetes/series-n/d6/',
      image: '/patinetes/series-n/d6/img/1.webp',
      alt: 'Patinete eléctrico D6',
      specs: ['800 W', 'Hasta 45 km', '48 V 13 Ah'],
      homeOrder: 6,
      homeTitle: 'D6',
      homeAriaLabel: 'D6 — Serie N',
      priceAriaLabel: 'Precio D6',
      gallery: [
        { src: '/patinetes/series-n/d6/img/1.webp', alt: 'D6 vista 1' },
        { src: '/patinetes/series-n/d6/img/2.webp', alt: 'D6 vista 2' },
        { src: '/patinetes/series-n/d6/img/3.webp', alt: 'D6 vista 3' },
        { src: '/patinetes/series-n/d6/img/4.webp', alt: 'D6 vista 4' },
        { src: '/patinetes/series-n/d6/img/5.webp', alt: 'D6 vista 5' },
        { src: '/patinetes/series-n/d6/img/6.webp', alt: 'D6 vista 6' },
        { src: '/patinetes/series-n/d6/img/7.webp', alt: 'D6 vista 7' },
        { src: '/patinetes/series-n/d6/img/8.webp', alt: 'D6 vista 8' },
        { src: '/patinetes/series-n/d6/img/9.webp', alt: 'D6 vista 9' }
      ]
    },
    {
      id: 'd20',
      filtros: { dgt: false, motores: 1, w: 250, km: 20, kmh: 20, frenos: null },
      sku: 'D20',
      name: 'D20',
      menuLabel: 'D20',
      badgeText: 'D20',
      brand: 'Cecotec',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '265 €',
      compareAtPriceText: '320 €',
      stock: 'in_stock',
      href: '/patinetes/series-n/d20/',
      image: '/patinetes/series-n/d20/img/1.webp',
      alt: 'Patinete eléctrico Cecotec Bongo D20E Connected',
      specs: ['250 W (500 W max)', 'Hasta 20 km', '36 V 5,2 Ah'],
      homeOrder: 7,
      homeTitle: 'D20',
      homeAriaLabel: 'D20 — Serie N',
      priceAriaLabel: 'Precio D20',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/series-n/d20/img/1.webp', alt: 'D20 vista 1' },
        { src: '/patinetes/series-n/d20/img/2.webp', alt: 'D20 vista 2' },
        { src: '/patinetes/series-n/d20/img/3.webp', alt: 'D20 vista 3' },
        { src: '/patinetes/series-n/d20/img/4.webp', alt: 'D20 vista 4' },
        { src: '/patinetes/series-n/d20/img/5.webp', alt: 'D20 vista 5' }
      ]
    },
    {
      id: 'ie-s1',
      filtros: { dgt: false, motores: 1, w: 800, km: 40, kmh: 45, frenos: 'mecanicos' },
      sku: 'IES1',
      name: 'iENYRID iE-S1',
      menuLabel: 'iE-S1',
      badgeText: 'iENYRID iE-S1',
      brand: 'iENYRID',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '435 €',
      compareAtPriceText: '500 €',
      stock: 'in_stock',
      href: '/patinetes/series-n/ie-s1/',
      image: '/patinetes/series-n/ie-s1/img/1.webp',
      alt: 'Patinete eléctrico iENYRID iE-S1',
      specs: ['800 W', 'Hasta 40 km', '48 V 15 Ah'],
      homeOrder: 8,
      homeTitle: 'iENYRID iE-S1',
      homeAriaLabel: 'iE-S1 — Serie N',
      priceAriaLabel: 'Precio iE-S1',
      gallery: [
        { src: '/patinetes/series-n/ie-s1/img/1.webp', alt: 'iE-S1 vista 1' },
        { src: '/patinetes/series-n/ie-s1/img/2.webp', alt: 'iE-S1 vista 2' },
        { src: '/patinetes/series-n/ie-s1/img/3.webp', alt: 'iE-S1 vista 3' },
        { src: '/patinetes/series-n/ie-s1/img/4.webp', alt: 'iE-S1 vista 4' },
        { src: '/patinetes/series-n/ie-s1/img/5.webp', alt: 'iE-S1 vista 5' },
        { src: '/patinetes/series-n/ie-s1/img/6.webp', alt: 'iE-S1 vista 6' },
        { src: '/patinetes/series-n/ie-s1/img/7.webp', alt: 'iE-S1 vista 7' }
      ]
    },
    {
      id: 'g2',
      filtros: { dgt: true, motores: 1, w: 500, km: 45, kmh: 45, frenos: 'mecanicos' },
      sku: 'G2',
      name: 'G2',
      menuLabel: 'G2',
      badgeText: 'G2',
      brand: 'TODIMART',
      series: 'gt',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '380 €',
      compareAtPriceText: '435 €',
      stock: 'in_stock',
      paypalId: '7AFW42AS3FC8Q',
      href: '/patinetes/series-gt/g2/',
      image: '/patinetes/series-gt/g2/img/1.webp',
      alt: 'Patinete eléctrico G2',
      specs: ['500 W', 'Hasta 45 km', '48 V 10.4 Ah'],
      homeOrder: 1,
      homeTitle: 'G2',
      homeAriaLabel: 'G2 — Patinete eléctrico de alta potencia',
      priceAriaLabel: 'Precio G2',
      gallery: [
        { src: '/patinetes/series-gt/g2/img/1.webp', alt: 'G2 vista 1' },
        { src: '/patinetes/series-gt/g2/img/2.webp', alt: 'G2 vista 2' },
        { src: '/patinetes/series-gt/g2/img/3.webp', alt: 'G2 vista 3' },
        { src: '/patinetes/series-gt/g2/img/4.webp', alt: 'G2 vista 4' }
      ]
    },
    {
      id: 't10',
      filtros: { dgt: true, motores: 1, w: 1000, km: 60, kmh: 60, frenos: 'mecanicos' },
      sku: 'T10',
      name: 'T10',
      menuLabel: 'T10',
      badgeText: 'T10',
      brand: 'OOTD',
      series: 'gt',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '450 €',
      compareAtPriceText: '599 €',
      stock: 'in_stock',
      paypalId: 'WE5GUHM4PSVYQ',
      href: '/patinetes/series-gt/t10/',
      image: '/patinetes/series-gt/t10/img/1.webp',
      alt: 'Patinete eléctrico T10',
      specs: ['1000 W', '55-60 km', '48 V 13 Ah'],
      homeOrder: 2,
      homeTitle: 'T10',
      homeAriaLabel: 'T10 — Patinete eléctrico Ultra',
      priceAriaLabel: 'Precio T10',
      gallery: [
        { src: '/patinetes/series-gt/t10/img/1.webp', alt: 'T10 vista 1' },
        { src: '/patinetes/series-gt/t10/img/2.webp', alt: 'T10 vista 2' },
        { src: '/patinetes/series-gt/t10/img/3.webp', alt: 'T10 vista 3' },
        { src: '/patinetes/series-gt/t10/img/4.webp', alt: 'T10 vista 4' },
        { src: '/patinetes/series-gt/t10/img/5.webp', alt: 'T10 vista 5' },
        { src: '/patinetes/series-gt/t10/img/6.webp', alt: 'T10 vista 6' },
        { src: '/patinetes/series-gt/t10/img/7.webp', alt: 'T10 vista 7' },
        { src: '/patinetes/series-gt/t10/img/8.webp', alt: 'T10 vista 8' },
        { src: '/patinetes/series-gt/t10/img/9.webp', alt: 'T10 vista 9' }
      ]
    },
    {
      id: 'tf3',
      filtros: { dgt: true, motores: 1, w: 1000, km: 45, kmh: 45, frenos: 'mecanicos' },
      sku: 'TF3',
      name: 'TF3',
      menuLabel: 'TF3',
      badgeText: 'TF3',
      brand: 'TOFUN',
      series: 'gt',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '399 €',
      compareAtPriceText: '499 €',
      stock: 'in_stock',
      paypalId: 'JAEYYZG6XE7HQ',
      href: '/patinetes/series-gt/tf3/',
      image: '/patinetes/series-gt/tf3/img/1.webp',
      alt: 'Patinete eléctrico TF3',
      specs: ['1000 W', '40-45 km', '48 V 13 Ah'],
      homeOrder: 4,
      homeTitle: 'TF3',
      homeAriaLabel: 'TF3 — Patinete eléctrico Top',
      priceAriaLabel: 'Precio TF3',
      gallery: [
        { src: '/patinetes/series-gt/tf3/img/1.webp', alt: 'TF3 vista 1' },
        { src: '/patinetes/series-gt/tf3/img/2.webp', alt: 'TF3 vista 2' },
        { src: '/patinetes/series-gt/tf3/img/3.webp', alt: 'TF3 vista 3' },
        { src: '/patinetes/series-gt/tf3/img/4.webp', alt: 'TF3 vista 4' }
      ]
    },
    {
      id: 't30',
      filtros: { dgt: true, motores: 2, w: 3200, km: 100, kmh: 70, frenos: 'mecanicos' },
      sku: 'T30',
      // 3200 W repartidos en dos motores
      motores: 2,
      name: 'T30',
      menuLabel: 'T30',
      badgeText: 'T30',
      brand: 'OOTD',
      series: 'gt',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '1199 €',
      compareAtPriceText: '1499 €',
      stock: 'in_stock',
      paypalId: 'J3VG9GQ3QU6A6',
      href: '/patinetes/series-gt/t30/',
      image: '/patinetes/series-gt/t30/img/1.webp',
      alt: 'Patinete eléctrico T30',
      specs: ['3200 W', '90-100 km', '60 V 31.2 Ah'],
      homeOrder: 5,
      homeTitle: 'T30',
      homeAriaLabel: 'T30 — Patinete eléctrico Essential',
      priceAriaLabel: 'Precio T30',
      gallery: [
        { src: '/patinetes/series-gt/t30/img/1.webp', alt: 'T30 vista 1' },
        { src: '/patinetes/series-gt/t30/img/2.webp', alt: 'T30 vista 2' },
        { src: '/patinetes/series-gt/t30/img/3.webp', alt: 'T30 vista 3' },
        { src: '/patinetes/series-gt/t30/img/4.webp', alt: 'T30 vista 4' }
      ]
    },
    {
      id: 'gt9',
      filtros: { dgt: true, motores: 2, w: 7000, km: 110, kmh: 90, frenos: 'mecanicos' },
      sku: 'GT9',
      // 7000 W repartidos en dos motores
      motores: 2,
      name: 'GT9',
      menuLabel: 'GT9',
      badgeText: 'GT9',
      brand: 'FENGQS',
      series: 'gt',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '1250 €',
      compareAtPriceText: '1499 €',
      stock: 'out_of_stock',
      paypalId: 'UHDJDYA8P24KL',
      href: '/patinetes/series-gt/gt9/',
      image: '/patinetes/series-gt/gt9/img/1.webp',
      alt: 'Patinete eléctrico GT9',
      specs: ['7000 W', '95-110 km', '12"'],
      homeOrder: 6,
      homeTitle: 'GT9',
      homeAriaLabel: 'GT9 — Patinete eléctrico',
      priceAriaLabel: 'Precio GT9',
      gallery: [
        { src: '/patinetes/series-gt/gt9/img/1.webp', alt: 'GT9 vista 1' },
        { src: '/patinetes/series-gt/gt9/img/2.webp', alt: 'GT9 vista 2' },
        { src: '/patinetes/series-gt/gt9/img/3.webp', alt: 'GT9 vista 3' },
        { src: '/patinetes/series-gt/gt9/img/4.webp', alt: 'GT9 vista 4' }
      ]
    },
    {
      id: 'ix3',
      filtros: { dgt: false, motores: 1, w: 800, km: 45, kmh: 40, frenos: 'mecanicos' },
      sku: 'IX3',
      name: 'iScooter IX3',
      menuLabel: 'IX3',
      badgeText: 'iScooter IX3',
      brand: 'ISCOOTER',
      series: 'ix',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '380 €',
      compareAtPriceText: '435 €',
      stock: 'in_stock',
      paypalId: 'HVUTLMHPTLT9Y',
      href: '/patinetes/series-ix/ix3/',
      image: '/patinetes/series-ix/ix3/img/1.webp',
      alt: 'Patinete eléctrico iScooter IX3',
      specs: ['800 W', '40-45 km', '48 V 10 Ah'],
      homeOrder: 1,
      homeTitle: 'iScooter IX3',
      homeAriaLabel: 'IX3 — Patinete eléctrico Serie IX',
      priceAriaLabel: 'Precio IX3',
      gallery: [
        { src: '/patinetes/series-ix/ix3/img/1.webp', alt: 'IX3 vista 1' },
        { src: '/patinetes/series-ix/ix3/img/2.webp', alt: 'IX3 vista 2' },
        { src: '/patinetes/series-ix/ix3/img/3.webp', alt: 'IX3 vista 3' },
        { src: '/patinetes/series-ix/ix3/img/4.webp', alt: 'IX3 vista 4' },
        { src: '/patinetes/series-ix/ix3/img/5.webp', alt: 'IX3 vista 5' },
        { src: '/patinetes/series-ix/ix3/img/6.webp', alt: 'IX3 vista 6' }
      ]
    },
    {
      id: 'w9',
      filtros: { dgt: true, motores: 1, w: 1000, km: 50, kmh: 50, frenos: 'mecanicos' },
      sku: 'W9',
      name: 'W9',
      menuLabel: 'W9',
      badgeText: 'W9',
      brand: 'ISCOOTER',
      series: 'ix',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '399 €',
      compareAtPriceText: '450 €',
      stock: 'in_stock',
      paypalId: '3JT9QGYWBE496',
      href: '/patinetes/series-ix/w9/',
      image: '/patinetes/series-ix/w9/img/1.webp',
      alt: 'Patinete eléctrico W9',
      specs: ['1000 W', '45-50 km', '48 V 14 Ah'],
      homeOrder: 2,
      homeTitle: 'W9',
      homeAriaLabel: 'W9 — Patinete eléctrico Serie IX',
      priceAriaLabel: 'Precio W9',
      gallery: [
        { src: '/patinetes/series-ix/w9/img/1.webp', alt: 'W9 vista 1' },
        { src: '/patinetes/series-ix/w9/img/2.webp', alt: 'W9 vista 2' },
        { src: '/patinetes/series-ix/w9/img/3.webp', alt: 'W9 vista 3' },
        { src: '/patinetes/series-ix/w9/img/4.webp', alt: 'W9 vista 4' }
      ]
    }
    ,{
      id: 'acc-storage-bag',
      sku: 'ACC-BAG',
      name: 'Bolsa de almacenamiento',
      menuLabel: 'Bolsa de almacenamiento',
      badgeText: 'Bolsa de almacenamiento',
      brand: 'ROCKBROS',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'mounts',
      /* DONDE ENCAJA. Lo declara el accesorio, no una tabla central: al añadir uno
         nuevo no hay que acordarse de editar ninguna lista en el codigo. Vale para
         cualquier categoria del catalogo presente o futura. */
      fitsCategories: ['electric-scooters', 'electric-bikes'],
      priceText: '8 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/bolsa-almacenamiento/',
      image: '/accesorios/bolsa-almacenamiento/img/1.webp',
      alt: 'Bolsa de almacenamiento impermeable para patinete o bicicleta',
      specs: ['Impermeable', '25 × 12 × 10 cm', 'Para patinete y bici'],
      homeOrder: 1,
      homeTitle: 'Bolsa de almacenamiento',
      homeAriaLabel: 'Bolsa de almacenamiento para patinete o bicicleta',
      priceAriaLabel: 'Precio bolsa de almacenamiento',
      gallery: [
        { src: '/accesorios/bolsa-almacenamiento/img/1.webp', alt: 'Bolsa de almacenamiento impermeable' },
        { src: '/accesorios/bolsa-almacenamiento/img/2.webp', alt: 'Bolsa de almacenamiento con sus correas y montada en el patinete' },
        { src: '/accesorios/bolsa-almacenamiento/img/3.webp', alt: 'Bolsa de almacenamiento montada en el manillar del patinete' },
        { src: '/accesorios/bolsa-almacenamiento/img/4.webp', alt: 'Bolsa de almacenamiento – vista en ángulo con las correas' }
      ]
    }
    ,{
      id: 'acc-cable-wrap',
      sku: 'ACC-CABLE',
      name: 'Cubre cables en espiral 1 m',
      menuLabel: 'Cubre cables espiral',
      badgeText: 'Cubre cables en espiral',
      brand: 'UNIVERSAL',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'protection',
      /* Vale para TODO lo que tenga cables: patinetes, bicis y motos. */
      fitsCategories: ['electric-scooters', 'electric-bikes', 'electric-motorcycles'],
      priceText: '5 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      /* SIN rotationGroup a propósito: es tarjeta FIJA en "Añade algo más", justo
         debajo de la bolsa. Solo hay un cubre cables y sirve para todos los modelos,
         así que no hay alternativa con la que turnarse — rotar solo serviría para
         esconderlo la mitad del tiempo. Su sitio en la caja lo da su POSICIÓN en este
         fichero (getCompatibleAccessories recorre el catálogo en orden), no
         `homeOrder`: por eso este bloque va pegado al de la bolsa. */
      href: '/accesorios/cubre-cables-espiral/',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              /* Abre con la 1 —la foto de los cinco colores que pinta el HTML
                 estático— y su foto limpia es la 4. */
              key: 'negro',
              label: 'Negro',
              swatch: '#1a1a1a',
              images: [1],
              default: true
            },
            { key: 'blanco',   label: 'Blanco',   swatch: '#f1f3f5', images: [5] },
            { key: 'azul',     label: 'Azul',     swatch: '#1c9ad6', images: [6] },
            { key: 'rojo',     label: 'Rojo',     swatch: '#d81f26', images: [7] },
            { key: 'amarillo', label: 'Amarillo', swatch: '#f2c400', images: [8] }
          ]
        }
      ],
      image: '/accesorios/cubre-cables-espiral/img/1.webp',
      alt: 'Cubre cables en espiral para patinete eléctrico en cinco colores',
      specs: ['1 metro', 'Espiral flexible', '5 colores'],
      homeOrder: 15,
      homeTitle: 'Cubre cables en espiral 1 m',
      homeAriaLabel: 'Cubre cables en espiral de 1 metro para patinete eléctrico',
      priceAriaLabel: 'Precio cubre cables en espiral',
      gallery: [
        { src: '/accesorios/cubre-cables-espiral/img/4.webp', alt: 'Cubre cables en espiral en negro' },
        { src: '/accesorios/cubre-cables-espiral/img/1.webp', alt: 'Cubre cables en espiral en sus cinco colores' },
        { src: '/accesorios/cubre-cables-espiral/img/2.webp', alt: 'Cubre cables en espiral montado en la horquilla del patinete' },
        { src: '/accesorios/cubre-cables-espiral/img/3.webp', alt: 'Cubre cables en espiral – cuatro zonas del patinete donde se puede montar' },
        { src: '/accesorios/cubre-cables-espiral/img/5.webp', alt: 'Cubre cables en espiral en blanco' },
        { src: '/accesorios/cubre-cables-espiral/img/6.webp', alt: 'Cubre cables en espiral en azul' },
        { src: '/accesorios/cubre-cables-espiral/img/7.webp', alt: 'Cubre cables en espiral en rojo' },
        { src: '/accesorios/cubre-cables-espiral/img/8.webp', alt: 'Cubre cables en espiral en amarillo' }
      ]
      // El anuncio de origen lista SEIS variantes de color, pero dos son el mismo
      // blanco (el vendedor lo duplicó): los colores reales son cinco, los de la foto
      // de portada.
    }
    ,{
      id: 'acc-grips-npy',
      sku: 'ACC-GRIPS',
      name: 'Puños ergonómicos con cierre de aluminio',
      menuLabel: 'Puños ergonómicos',
      badgeText: 'Puños ergonómicos',
      brand: 'NPY',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'handlebars',
      fitsCategories: ['electric-scooters', 'electric-bikes'],
      priceText: '12 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      /* Familia propia: los puños se relevan ENTRE PUÑOS, no con los manillares.
         Son tres modelos que compiten entre sí —eliges uno— mientras que un manillar
         y unos puños se compran juntos. */
      rotationGroup: 'punos',
      href: '/accesorios/punos-ergonomicos/',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              /* La foto limpia del negro ES la portada, así que aquí no hace falta la
                 pareja [1, n] de otros productos. */
              key: 'negro',
              label: 'Negro',
              swatch: '#1a1a1a',
              images: [1],
              default: true
            },
            { key: 'azul',     label: 'Azul',     swatch: '#1848a8', images: [3] },
            { key: 'rojo',     label: 'Rojo',     swatch: '#c01818', images: [4] },
            { key: 'naranja',  label: 'Naranja',  swatch: '#f06018', images: [5] },
            { key: 'turquesa', label: 'Turquesa', swatch: '#00d8d8', images: [6] },
            { key: 'morado',   label: 'Morado',   swatch: '#783090', images: [7] },
            { key: 'marron',   label: 'Marrón',   swatch: '#783018', images: [8] }
          ]
        }
      ],
      image: '/accesorios/punos-ergonomicos/img/1.webp',
      alt: 'Puños ergonómicos de goma con cierre de aluminio para patinete y bicicleta',
      specs: ['Pareja (2 uds.)', 'Cierre de aluminio', '13 cm · Ø 2,2 cm'],
      homeOrder: 16,
      homeTitle: 'Puños ergonómicos con cierre de aluminio',
      homeAriaLabel: 'Puños ergonómicos con cierre de aluminio para patinete y bicicleta',
      priceAriaLabel: 'Precio puños ergonómicos',
      gallery: [
        { src: '/accesorios/punos-ergonomicos/img/1.webp', alt: 'Puños ergonómicos en negro' },
        { src: '/accesorios/punos-ergonomicos/img/2.webp', alt: 'Puños ergonómicos en varios colores' },
        { src: '/accesorios/punos-ergonomicos/img/3.webp', alt: 'Puños ergonómicos en azul' },
        { src: '/accesorios/punos-ergonomicos/img/4.webp', alt: 'Puños ergonómicos en rojo' },
        { src: '/accesorios/punos-ergonomicos/img/5.webp', alt: 'Puños ergonómicos en naranja' },
        { src: '/accesorios/punos-ergonomicos/img/6.webp', alt: 'Puños ergonómicos en turquesa' },
        { src: '/accesorios/punos-ergonomicos/img/7.webp', alt: 'Puños ergonómicos en morado' },
        { src: '/accesorios/punos-ergonomicos/img/8.webp', alt: 'Puños ergonómicos en marrón' }
      ]
      // Los nombres de color del anuncio están CRUZADOS (dice "BLANCO" para el naranja,
      // "Verde limón" para el marrón...). Los siete se identificaron por el color
      // dominante de cada foto y comprobando las dudosas a ojo: el que el fabricante
      // llama "Verde" es turquesa.
    }
    ,{
      id: 'acc-grips-deemount',
      sku: 'ACC-GRIPS-D',
      name: 'Puños jaspeados con cierre de aluminio',
      menuLabel: 'Puños jaspeados',
      badgeText: 'Puños jaspeados',
      brand: 'DEEMOUNT',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'handlebars',
      fitsCategories: ['electric-scooters', 'electric-bikes'],
      priceText: '8,90 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      rotationGroup: 'punos',
      href: '/accesorios/punos-deemount/',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              /* Abre con la 1 —los seis acabados, que es lo que pinta el HTML
                 estático— y su foto limpia es la 7. */
              key: 'negro',
              label: 'Negro',
              swatch: '#1a1a1a',
              images: [1],
              default: true
            },
            /* Los jaspeados son mitad negro y mitad color: swatch a 135deg, la regla
               global del sitio para cualquier bicolor. */
            { key: 'negro-rojo',     label: 'Negro y rojo',     swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#c62020 50%)', images: [3] },
            { key: 'negro-azul',     label: 'Negro y azul',     swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#1878c8 50%)', images: [4] },
            { key: 'negro-turquesa', label: 'Negro y turquesa', swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#20b0a8 50%)', images: [5] },
            { key: 'negro-morado',   label: 'Negro y morado',   swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#a02888 50%)', images: [6] },
            { key: 'azul',           label: 'Azul',             swatch: '#1c9ad6', images: [7] }
          ]
        }
      ],
      image: '/accesorios/punos-deemount/img/1.webp',
      alt: 'Puños jaspeados con cierre de aluminio para patinete y bicicleta',
      specs: ['Pareja (2 uds.)', 'Cierre de aluminio', '13 cm · 6 acabados'],
      homeOrder: 17,
      homeTitle: 'Puños jaspeados con cierre de aluminio',
      homeAriaLabel: 'Puños jaspeados con cierre de aluminio para patinete y bicicleta',
      priceAriaLabel: 'Precio puños jaspeados',
      gallery: [
        { src: '/accesorios/punos-deemount/img/7.webp', alt: 'Puños jaspeados en negro' },
        { src: '/accesorios/punos-deemount/img/1.webp', alt: 'Puños jaspeados en sus seis acabados' },
        { src: '/accesorios/punos-deemount/img/2.webp', alt: 'Puños jaspeados en negro y rojo' },
        { src: '/accesorios/punos-deemount/img/3.webp', alt: 'Puños jaspeados en negro y azul' },
        { src: '/accesorios/punos-deemount/img/4.webp', alt: 'Puños jaspeados en negro y turquesa' },
        { src: '/accesorios/punos-deemount/img/5.webp', alt: 'Puños jaspeados en negro y morado' },
        { src: '/accesorios/punos-deemount/img/6.webp', alt: 'Puños jaspeados en azul' }
      ]
      // Aquí el nombre EN INGLÉS del anuncio (Black Red, Pure Blue…) sí era fiable y el
      // traducido no; se comprobó contra la foto de conjunto.
    }
    ,{
      id: 'acc-grips-motsuv',
      sku: 'ACC-GRIPS-M',
      name: 'Puños ergonómicos camuflaje',
      menuLabel: 'Puños camuflaje',
      badgeText: 'Puños camuflaje',
      brand: 'MOTSUV',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'handlebars',
      fitsCategories: ['electric-scooters', 'electric-bikes'],
      priceText: '13,90 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      rotationGroup: 'punos',
      href: '/accesorios/punos-motsuv/',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'rojo',     label: 'Rojo',     swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#cc1818 50%)', images: [1], default: true },
            { key: 'amarillo', label: 'Amarillo', swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#d4d418 50%)', images: [2] },
            { key: 'verde',    label: 'Verde',    swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#28b428 50%)', images: [3] },
            { key: 'azul',     label: 'Azul',     swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#1878d8 50%)', images: [4] }
          ]
        }
      ],
      image: '/accesorios/punos-motsuv/img/1.webp',
      alt: 'Puños ergonómicos camuflaje con cierre de aluminio para patinete y bicicleta',
      specs: ['Pareja (2 uds.)', 'Apoyo para la palma', '13 cm · 4 colores'],
      homeOrder: 18,
      homeTitle: 'Puños ergonómicos camuflaje',
      homeAriaLabel: 'Puños ergonómicos camuflaje para patinete y bicicleta',
      priceAriaLabel: 'Precio puños camuflaje',
      gallery: [
        { src: '/accesorios/punos-motsuv/img/1.webp', alt: 'Puños ergonómicos camuflaje en rojo' },
        { src: '/accesorios/punos-motsuv/img/2.webp', alt: 'Puños ergonómicos camuflaje en amarillo' },
        { src: '/accesorios/punos-motsuv/img/3.webp', alt: 'Puños ergonómicos camuflaje en verde' },
        { src: '/accesorios/punos-motsuv/img/4.webp', alt: 'Puños ergonómicos camuflaje en azul' }
      ]
      // El camuflaje es siempre color + negro, de ahí el swatch a medias. Las fotos del
      // anuncio traían "Camouflage Paw Cover" en un bloque a la izquierda: se recortó.
    }
    ,{
      id: 'acc-phone-holder',
      sku: 'ACC-HOLDER',
      name: 'Soporte móvil antivibración para patinete',
      menuLabel: 'Soporte móvil',
      badgeText: 'Soporte móvil antivibración para patinete',
      brand: 'MOGGAM',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'mounts',
      priceText: '7,40 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/soporte-movil/',
      image: '/accesorios/soporte-movil/img/2.webp',
      alt: 'Soporte móvil antivibración para patinete eléctrico',
      specs: ['Antivibración', 'Giro 360°', '5,4–7,2”'],
      homeOrder: 2,
      homeTitle: 'Soporte móvil antivibración para patinete',
      homeAriaLabel: 'Soporte móvil antivibración para patinete',
      priceAriaLabel: 'Precio soporte móvil',
      gallery: [
        { src: '/accesorios/soporte-movil/img/2.webp', alt: 'Soporte móvil antivibración – vista principal' },
        { src: '/accesorios/soporte-movil/img/3.webp', alt: 'Soporte móvil antivibración – contenido del pack' },
        { src: '/accesorios/soporte-movil/img/4.webp', alt: 'Soporte móvil antivibración – vista lateral' }
      ]
    }
    ,{
      id: 'acc-the-beast-stickers',
      sku: 'ACC-BEAST',
      name: 'Pegatinas THE BEAST',
      menuLabel: 'Pegatina THE BEAST',
      badgeText: 'Pegatinas THE BEAST',
      brand: 'TWOWHEEL ODYSSEY',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'stickers',
      priceText: '4,50 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/pegatina-the-beast/',
      image: '/accesorios/pegatina-the-beast/img/2.webp',
      alt: 'Pegatinas THE BEAST impermeables de vinilo',
      specs: ['2 uds.', 'PVC impermeable', '18 × 3,3 cm'],
      homeOrder: 3,
      homeTitle: 'Pegatinas THE BEAST',
      homeAriaLabel: 'Pegatinas THE BEAST para casco o patinete',
      priceAriaLabel: 'Precio pegatinas THE BEAST',
      gallery: [
        { src: '/accesorios/pegatina-the-beast/img/2.webp', alt: 'Pegatinas THE BEAST – pack' },
        { src: '/accesorios/pegatina-the-beast/img/1.webp', alt: 'Pegatinas THE BEAST – ejemplo de uso' },
        { src: '/accesorios/pegatina-the-beast/img/3.webp', alt: 'Pegatinas THE BEAST – detalle' },
        { src: '/accesorios/pegatina-the-beast/img/4.webp', alt: 'Pegatinas THE BEAST – aplicación' }
      ]
    }
    ,{
      id: 'acc-reflective-stickers',
      sku: 'ACC-REFLECT',
      name: 'Pegatinas reflectantes',
      menuLabel: 'Pegatinas reflectantes',
      badgeText: 'Pegatinas reflectantes',
      brand: 'UNIVERSAL',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'stickers',
      priceText: '6,50 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/pegatinas-reflectantes/',
      image: '/accesorios/pegatinas-reflectantes/img/1.webp',
      alt: 'Pegatinas reflectantes para patinete eléctrico o bicicleta',
      specs: ['Efecto fluorescente', 'Para Xiaomi/Ninebot', 'Mayor visibilidad'],
      homeOrder: 4,
      homeTitle: 'Pegatinas reflectantes',
      homeAriaLabel: 'Pegatinas reflectantes',
      priceAriaLabel: 'Precio pegatinas reflectantes',
      gallery: [
        { src: '/accesorios/pegatinas-reflectantes/img/1.webp', alt: 'Pegatinas reflectantes para patinete' },
        { src: '/accesorios/pegatinas-reflectantes/img/2.webp', alt: 'Pegatinas reflectantes – detalle' },
        { src: '/accesorios/pegatinas-reflectantes/img/3.webp', alt: 'Pegatinas reflectantes – aplicación' },
        { src: '/accesorios/pegatinas-reflectantes/img/4.webp', alt: 'Pegatinas reflectantes – pack' }
      ]
    }
    ,{
      id: 'acc-rgb-lights',
      sku: 'ACC-RGB',
      name: 'Luces estroboscópicas LED RGB para patinete y bicicleta',
      menuLabel: 'Luces LED RGB',
      badgeText: 'Luces LED RGB estroboscópicas',
      brand: 'UNIVERSAL',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'lighting',
      priceText: '6 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/luces-led-rgb/',
      image: '/accesorios/luces-led-rgb/img/1.webp',
      alt: 'Luces LED RGB para patinete o bicicleta',
      specs: ['Mando RF', 'Recarga USB', 'Kit 4 luces'],
      homeOrder: 5,
      homeTitle: 'Luces LED RGB estroboscópicas',
      homeAriaLabel: 'Luces LED RGB para patinete y bicicleta',
      priceAriaLabel: 'Precio luces LED RGB',
      gallery: [
        { src: '/accesorios/luces-led-rgb/img/1.webp', alt: 'Luces LED RGB para patinete o bicicleta' },
        { src: '/accesorios/luces-led-rgb/img/2.webp', alt: 'Luces LED RGB – detalle' },
        { src: '/accesorios/luces-led-rgb/img/3.webp', alt: 'Luces LED RGB – montadas' }
      ]
    }
    ,{
      id: 'acc-handlebar-wake',
      sku: 'ACC-BAR-WAKE',
      name: 'Manillar WAKE 720mm/780mm',
      menuLabel: 'Manillar WAKE 720/780',
      badgeText: 'Manillar WAKE 720mm/780mm',
      brand: 'WAKE',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '39,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      variantHint: 'color y medida',
      rotationGroup: 'manillar',
      href: '/accesorios/manillar-wake/',
      accessoryCategory: 'handlebars',
            /* Orden en que se combinan las claves para la IDENTIDAD de la linea de
         carrito ("negro-780"). Estaba escrito en el script de la ficha; vive aqui
         para no partir en dos los carritos y pedidos ya guardados. Se borra cuando
         la identidad pase a ser `attrs`. */
      legacyKeyAxes: ['color', 'size'],
attributes: [
        {
          key: 'size',
          label: 'Medida',
          type: 'pill',
          options: [
            {
              key: '720',
              label: '720 mm'
            },
            {
              key: '780',
              default: true,
              label: '780 mm'
            }
          ]
        },
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              key: 'negro',
              label: 'Negro',
              swatch: '#111111',
              imagesBy: {
                '720': 12,
                '780': 6
              },
              default: true
            },
            {
              key: 'rojo',
              label: 'Rojo',
              swatch: '#b93f3a',
              imagesBy: {
                '720': 13,
                '780': 7
              }
            },
            {
              key: 'azul',
              label: 'Azul',
              swatch: '#2f93b8',
              imagesBy: {
                '720': 14,
                '780': 8
              }
            },
            {
              key: 'morado',
              label: 'Morado',
              swatch: '#ab5fac',
              imagesBy: {
                '720': 15,
                '780': 9
              }
            },
            {
              key: 'dorado',
              label: 'Dorado',
              swatch: '#c49a2e',
              imagesBy: {
                '720': 16,
                '780': 10
              }
            },
            {
              key: 'verde',
              label: 'Verde',
              swatch: '#a8a544',
              imagesBy: {
                '720': 17,
                '780': 11
              }
            }
          ]
        }
      ],
      image: '/accesorios/manillar-wake/img/1.webp',
      alt: 'Manillar elevador WAKE de aluminio 6061 para Ecoxtrem M41',
      specs: ['Ø 31,8 mm', 'Aluminio 6061 · 330 g', '720/780 mm'],
      homeOrder: 6,
      homeTitle: 'Manillar WAKE 720mm/780mm',
      homeAriaLabel: 'Manillar WAKE 720mm/780mm para Ecoxtrem M41',
      priceAriaLabel: 'Precio manillar WAKE 720mm/780mm',
      gallery: [
        { src: '/accesorios/manillar-wake/img/1.webp', alt: 'Manillar elevador WAKE de aluminio en sus colores, en 720 y 780 mm' },
        { src: '/accesorios/manillar-wake/img/2.webp', alt: 'Manillar WAKE – medidas: 720 mm (330 g) y 780 mm (365 g), abrazadera 31,8 mm y puños 22,2 mm' },
        { src: '/accesorios/manillar-wake/img/3.webp', alt: 'Manillar WAKE – ficha del fabricante: aluminio 6061, ángulos 6° y 3°, rise 25 mm' },
        { src: '/accesorios/manillar-wake/img/4.webp', alt: 'Manillar WAKE – acabado granallado y anodizado' },
        { src: '/accesorios/manillar-wake/img/5.webp', alt: 'Manillar WAKE – detalle del tubo de aluminio en dorado, azul y rojo' },
        { src: '/accesorios/manillar-wake/img/6.webp', alt: 'Manillar WAKE 780 mm en negro' },
        { src: '/accesorios/manillar-wake/img/7.webp', alt: 'Manillar WAKE 780 mm en rojo' },
        { src: '/accesorios/manillar-wake/img/8.webp', alt: 'Manillar WAKE 780 mm en azul' },
        { src: '/accesorios/manillar-wake/img/9.webp', alt: 'Manillar WAKE 780 mm en morado' },
        { src: '/accesorios/manillar-wake/img/10.webp', alt: 'Manillar WAKE 780 mm en dorado' },
        { src: '/accesorios/manillar-wake/img/11.webp', alt: 'Manillar WAKE 780 mm en verde' },
        { src: '/accesorios/manillar-wake/img/12.webp', alt: 'Manillar WAKE 720 mm en negro' },
        { src: '/accesorios/manillar-wake/img/13.webp', alt: 'Manillar WAKE 720 mm en rojo' },
        { src: '/accesorios/manillar-wake/img/14.webp', alt: 'Manillar WAKE 720 mm en azul' },
        { src: '/accesorios/manillar-wake/img/15.webp', alt: 'Manillar WAKE 720 mm en morado' },
        { src: '/accesorios/manillar-wake/img/16.webp', alt: 'Manillar WAKE 720 mm en dorado' },
        { src: '/accesorios/manillar-wake/img/17.webp', alt: 'Manillar WAKE 720 mm en verde' }
      ],
      // El manillar tiene DOS ejes (color y longitud) pero el carrito solo admite uno,
      // así que la medida viaja combinada dentro de la clave de color. Aquí quedan las
      // claves de la medida por defecto (780 mm); el script de la ficha las recombina
      // al cambiar de medida.
      //
      // `images` (lista explícita de índices) en vez de `range`: WAKE publica una foto
      // limpia de cada color EN CADA MEDIDA, con el tamaño rotulado encima
      // ("720mm handlebar black"). 6-11 son las de 780 mm y 12-17 las de 720 mm, en el
      // mismo orden de color; 1-5 son las de marketing y sirven para las dos.
      // Lo de aquí es el estado inicial (780 mm): el script de la ficha reescribe
      // `images` al cambiar de medida y esconde las miniaturas de la otra.
      // Negro es la excepción a propósito: abre con la 1 porque es la que ya pinta el
      // HTML estático, y arrancar con otra provocaría un cambio de foto visible al
      // hidratar (product-enhancements.js llama a renderGalleryForVariant con la
      // variante por defecto en la carga inicial).
    }
    ,{
      id: 'acc-handlebar-wake-dh',
      sku: 'ACC-BAR-WAKE-DH',
      name: 'Manillar WAKE Downhill 780mm',
      menuLabel: 'Manillar WAKE Downhill',
      badgeText: 'Manillar WAKE Downhill 780mm',
      brand: 'WAKE',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '42,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      rotationGroup: 'manillar',
      href: '/accesorios/manillar-wake-downhill/',
      accessoryCategory: 'handlebars',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              key: 'negro-blanco',
              label: 'Negro y blanco',
              swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#e9edf0 50%)',
              /* Su foto limpia es la 7, pero ABRE con la 1 porque es la que pinta el
                 HTML estático de la ficha: arrancar con otra provoca un cambio de foto
                 visible en cuanto hidrata. La primera de la lista es la que manda. */
              images: [1],
              default: true
            },
            {
              key: 'negro-rojo',
              label: 'Negro y rojo',
              swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#a8362f 50%)',
              images: [8]
            },
            {
              key: 'negro-morado',
              label: 'Negro y morado',
              swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#7b2f8e 50%)',
              images: [9]
            },
            {
              key: 'negro-verde',
              label: 'Negro y verde',
              swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#a5b938 50%)',
              images: [10]
            },
            {
              key: 'rojo',
              label: 'Rojo',
              swatch: '#b02a22',
              images: [11]
            },
            {
              key: 'dorado',
              label: 'Dorado',
              swatch: '#c9a92c',
              images: [12]
            },
            {
              key: 'azul',
              label: 'Azul',
              swatch: '#1987c0',
              images: [13]
            }
                ]
        }
      ],
      image: '/accesorios/manillar-wake-downhill/img/1.webp',
      alt: 'Manillar de descenso WAKE de aluminio 6061 para Ecoxtrem M41',
      specs: ['Ø 31,8 mm', 'Aluminio 6061 · alza 55 mm', '780 mm'],
      homeOrder: 7,
      homeTitle: 'Manillar WAKE Downhill 780mm',
      homeAriaLabel: 'Manillar WAKE Downhill 780mm para Ecoxtrem M41',
      priceAriaLabel: 'Precio manillar WAKE Downhill 780mm',
      gallery: [
        { src: '/accesorios/manillar-wake-downhill/img/7.webp', alt: 'Manillar WAKE Downhill en negro y blanco' },
        { src: '/accesorios/manillar-wake-downhill/img/1.webp', alt: 'Manillar WAKE Downhill de aluminio en sus siete colores' },
        { src: '/accesorios/manillar-wake-downhill/img/2.webp', alt: 'Manillar WAKE Downhill – medidas: 780 mm de largo, 55 mm de alza, abrazadera 31,8 mm y puños 22,2 mm' },
        { src: '/accesorios/manillar-wake-downhill/img/3.webp', alt: 'Manillar WAKE Downhill – los siete colores disponibles' },
        { src: '/accesorios/manillar-wake-downhill/img/4.webp', alt: 'Manillar WAKE Downhill montado en una bicicleta' },
        { src: '/accesorios/manillar-wake-downhill/img/5.webp', alt: 'Manillar WAKE Downhill – acabado granallado y anodizado' },
        { src: '/accesorios/manillar-wake-downhill/img/6.webp', alt: 'Manillar WAKE Downhill – detalle del logo y del grabado' },
        { src: '/accesorios/manillar-wake-downhill/img/8.webp', alt: 'Manillar WAKE Downhill en negro y rojo' },
        { src: '/accesorios/manillar-wake-downhill/img/9.webp', alt: 'Manillar WAKE Downhill en negro y morado' },
        { src: '/accesorios/manillar-wake-downhill/img/10.webp', alt: 'Manillar WAKE Downhill en negro y verde' },
        { src: '/accesorios/manillar-wake-downhill/img/11.webp', alt: 'Manillar WAKE Downhill en rojo' },
        { src: '/accesorios/manillar-wake-downhill/img/12.webp', alt: 'Manillar WAKE Downhill en dorado' },
        { src: '/accesorios/manillar-wake-downhill/img/13.webp', alt: 'Manillar WAKE Downhill en azul' }
      ],
      // Una sola medida (780 mm), así que el eje de variante es solo el color y las
      // claves NO van combinadas: aquí no hace falta el script de medidas del
      // WAKE 720/780. `images` da a cada color su foto limpia (7-13) y detrás
      // las de marketing. Negro y blanco es la excepción a propósito: abre con la 1
      // porque es la que ya pinta el HTML estático, y arrancar con otra provocaría un
      // cambio de foto visible al hidratar.
    }
    ,{
      id: 'acc-handlebar-uno',
      sku: 'ACC-BAR-UNO',
      name: 'Manillar UNO 640-800mm',
      menuLabel: 'Manillar UNO 640-800',
      badgeText: 'Manillar UNO 640-800mm',
      brand: 'UNO',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '39,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      // Dos ejes (modelo y medida) y ningun color: el selector de circulos no aplica,
      // asi que esta entrada NO lleva colorVariants y el script de la ficha es el unico
      // que construye la clave de variante. `variantHint` es lo que hace que en
      // "Anade algo mas" se enlace a la ficha en vez de anadirse de un clic.
      variantHint: 'modelo y medida',
      rotationGroup: 'manillar',
      href: '/accesorios/manillar-uno/',
      accessoryCategory: 'handlebars',
            /* Orden en que se combinan las claves para la IDENTIDAD de la linea de
         carrito ("negro-780"). Estaba escrito en el script de la ficha; vive aqui
         para no partir en dos los carritos y pedidos ya guardados. Se borra cuando
         la identidad pase a ser `attrs`. */
      legacyKeyAxes: ['model', 'size'],
attributes: [
        {
          key: 'model',
          label: 'Modelo',
          type: 'pill',
          options: [
            {
              key: 'rb12',
              label: 'RB12 elevador',
              allows: {
                size: [
                  '640',
                  '680',
                  '720',
                  '740',
                  '760',
                  '780',
                  '800'
                ]
              },
              images: [
                2
              ],
              default: true
            },
            {
              key: 'fb12',
              label: 'FB12 plano',
              allows: {
                size: [
                  '640',
                  '680',
                  '720'
                ]
              },
              images: [
                3
              ]
            }
          ]
        },
        {
          key: 'size',
          label: 'Medida',
          type: 'pill',
          options: [
            {
              key: '640',
              label: '640 mm',
              shortLabel: '640'
            },
            {
              key: '680',
              label: '680 mm',
              shortLabel: '680'
            },
            {
              key: '720',
              default: true,
              label: '720 mm',
              shortLabel: '720'
            },
            {
              key: '740',
              label: '740 mm',
              shortLabel: '740'
            },
            {
              key: '760',
              label: '760 mm',
              shortLabel: '760'
            },
            {
              key: '780',
              label: '780 mm',
              shortLabel: '780'
            },
            {
              key: '800',
              label: '800 mm',
              shortLabel: '800'
            }
          ]
        }
      ],
      image: '/accesorios/manillar-uno/img/1.webp',
      alt: 'Manillar UNO de aluminio pulido para Ecoxtrem M41',
      specs: ['Ø 31,8 mm', 'Aluminio pulido', '640–800 mm'],
      homeOrder: 8,
      homeTitle: 'Manillar UNO 640-800mm',
      homeAriaLabel: 'Manillar UNO 640-800mm para Ecoxtrem M41',
      priceAriaLabel: 'Precio manillar UNO 640-800mm',
      gallery: [
        { src: '/accesorios/manillar-uno/img/1.webp', alt: 'Manillar UNO de aluminio pulido, versión plana y elevadora, de 640 a 800 mm' },
        { src: '/accesorios/manillar-uno/img/2.webp', alt: 'Manillar UNO RB12 elevador' },
        { src: '/accesorios/manillar-uno/img/3.webp', alt: 'Manillar UNO FB12 plano' },
        { src: '/accesorios/manillar-uno/img/4.webp', alt: 'Manillar UNO RB12 – varias medidas del modelo elevador' },
        { src: '/accesorios/manillar-uno/img/5.webp', alt: 'Manillar UNO FB12 – varias medidas del modelo plano' },
        { src: '/accesorios/manillar-uno/img/6.webp', alt: 'Manillar UNO – vista frontal y detalle de la abrazadera de 31,8 mm' },
        { src: '/accesorios/manillar-uno/img/7.webp', alt: 'Manillar UNO – detalle de la abrazadera y el grabado' },
        { src: '/accesorios/manillar-uno/img/8.webp', alt: 'Manillar UNO montado en una bicicleta' },
        { src: '/accesorios/manillar-uno/img/9.webp', alt: 'Manillar UNO – detalle del acabado pulido' }
      ]
    }
    ,{
      id: 'acc-handlebar-nanlio',
      sku: 'ACC-BAR-NANLIO',
      name: 'Manillar NANLIO Tornasol 780mm',
      menuLabel: 'Manillar NANLIO Tornasol',
      badgeText: 'Manillar NANLIO Tornasol 780mm',
      brand: 'NANLIO',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '44,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      variantHint: 'acabado',
      rotationGroup: 'manillar',
      href: '/accesorios/manillar-nanlio/',
      accessoryCategory: 'handlebars',
      attributes: [
        {
          key: 'color',
          label: 'Acabado',
          type: 'swatch',
          options: [
            /* Cada acabado dice qué foto le toca (5-9 son las limpias, una por
               acabado). Sin esto el selector no cambiaba ni la foto NI el rótulo: la
               función que aplica la variante se iba de vacío al no encontrar imagen.
               El de por defecto abre con la 1, que es la que trae el HTML estático. */
            {
              key: 'tornasol-negro',
              label: 'Tornasol negro · alza 25 mm',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#111111 50%)',
              images: [1],
              default: true
            },
            {
              key: 'tornasol-blanco',
              label: 'Tornasol blanco · alza 25 mm',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#f8fafc 50%)',
              images: [6]
            },
            {
              key: 'tornasol-freedom',
              label: 'Tornasol Freedom · alza 25 mm',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 38%,#06b6d4 68%,#22c55e 100%)',
              images: [7]
            },
            {
              key: 'tornasol-024-negro',
              label: 'Tornasol 024 negro · alza 50 mm',
              swatch: 'linear-gradient(135deg,#22c55e 0%,#0ea5e9 28%,#7c3aed 50%,#111111 50%)',
              images: [8]
            },
            {
              key: 'tornasol-024-blanco',
              label: 'Tornasol 024 blanco · alza 50 mm',
              swatch: 'linear-gradient(135deg,#22c55e 0%,#0ea5e9 28%,#7c3aed 50%,#f8fafc 50%)',
              images: [9]
            }
          ]
        }
      ],
      image: '/accesorios/manillar-nanlio/img/1.webp',
      alt: 'Manillar NANLIO tornasol de aluminio 6061 para Ecoxtrem M41',
      specs: ['Ø 31,8 mm', 'Aluminio 6061 · tornasol', '780 mm'],
      homeOrder: 9,
      homeTitle: 'Manillar NANLIO Tornasol 780mm',
      homeAriaLabel: 'Manillar NANLIO Tornasol 780mm para Ecoxtrem M41',
      priceAriaLabel: 'Precio manillar NANLIO Tornasol 780mm',
      gallery: [
        { src: '/accesorios/manillar-nanlio/img/5.webp', alt: 'Manillar NANLIO tornasol negro, alza 25 mm' },
        { src: '/accesorios/manillar-nanlio/img/1.webp', alt: 'Manillar NANLIO tornasol de 780 mm en sus distintos acabados' },
        { src: '/accesorios/manillar-nanlio/img/2.webp', alt: 'Manillar NANLIO – medidas: 780 mm, alza 25 mm, abrazadera 31,8 mm y 399 g' },
        { src: '/accesorios/manillar-nanlio/img/3.webp', alt: 'Manillar NANLIO – los cinco acabados alineados' },
        { src: '/accesorios/manillar-nanlio/img/4.webp', alt: 'Manillar NANLIO 024 – la versión de alza 50 mm' },
        { src: '/accesorios/manillar-nanlio/img/6.webp', alt: 'Manillar NANLIO tornasol blanco, alza 25 mm' },
        { src: '/accesorios/manillar-nanlio/img/7.webp', alt: 'Manillar NANLIO tornasol Freedom, alza 25 mm' },
        { src: '/accesorios/manillar-nanlio/img/8.webp', alt: 'Manillar NANLIO tornasol 024 negro, alza 50 mm' },
        { src: '/accesorios/manillar-nanlio/img/9.webp', alt: 'Manillar NANLIO tornasol 024 blanco, alza 50 mm' },
        { src: '/accesorios/manillar-nanlio/img/10.webp', alt: 'Manillar NANLIO – detalle del acabado tornasol' },
        { src: '/accesorios/manillar-nanlio/img/11.webp', alt: 'Manillar NANLIO – detalle del grabado' }
      ],
      // Un solo eje (el acabado): los cinco son de 780 mm. Pero el ALZA cambia con el
      // acabado (25 mm los tres primeros, 50 mm los dos "024"), asi que cada variante
      // trae su propio `desc` y product-enhancements.js reescribe la descripcion al
      // elegir, igual que el KUKIRIN G2 PRO con VMP/Normal. Los dos textos miden lo
      // mismo a proposito para que el cambio no de un salto.
      // `images`: cada acabado abre con su foto (5-9) y detras van las de marketing.
      // El negro es la excepcion a proposito: abre con la 1 porque es la que ya pinta
      // el HTML estatico, y arrancar con otra provocaria un cambio visible al hidratar.
    }
    ,{
      id: 'acc-handlebar-kocevlo',
      sku: 'ACC-BAR-KOCEVLO',
      name: 'Manillar KOCEVLO Carbono 680-760mm',
      menuLabel: 'Manillar KOCEVLO Carbono',
      badgeText: 'Manillar KOCEVLO Carbono 680-760mm',
      brand: 'KOCEVLO',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '44,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      // Dos ejes (modelo y medida) y un solo acabado: sin colorVariants, igual que el
      // manillar UNO. `variantHint` es lo que hace que en "Anade algo mas" se enlace a
      // la ficha en vez de anadirse de un clic sin decir cual.
      variantHint: 'modelo y medida',
      rotationGroup: 'manillar',
      href: '/accesorios/manillar-kocevlo/',
      accessoryCategory: 'handlebars',
            /* Orden en que se combinan las claves para la IDENTIDAD de la linea de
         carrito ("negro-780"). Estaba escrito en el script de la ficha; vive aqui
         para no partir en dos los carritos y pedidos ya guardados. Se borra cuando
         la identidad pase a ser `attrs`. */
      legacyKeyAxes: ['model', 'size'],
attributes: [
        {
          key: 'model',
          label: 'Modelo',
          type: 'pill',
          options: [
            {
              key: 'rise',
              label: 'Rise elevador',
              allows: {
                size: [
                  '680',
                  '700',
                  '720',
                  '740',
                  '760'
                ]
              },
              images: [
                2
              ],
              default: true
            },
            {
              key: 'flat',
              label: 'Flat plano',
              allows: {
                size: [
                  '680',
                  '700',
                  '720',
                  '740',
                  '760'
                ]
              },
              images: [
                3
              ]
            }
          ]
        },
        {
          key: 'size',
          label: 'Medida',
          type: 'pill',
          options: [
            {
              key: '680',
              label: '680 mm',
              shortLabel: '680'
            },
            {
              key: '700',
              label: '700 mm',
              shortLabel: '700'
            },
            {
              key: '720',
              default: true,
              label: '720 mm',
              shortLabel: '720'
            },
            {
              key: '740',
              label: '740 mm',
              shortLabel: '740'
            },
            {
              key: '760',
              label: '760 mm',
              shortLabel: '760'
            }
          ]
        }
      ],
      image: '/accesorios/manillar-kocevlo/img/1.webp',
      alt: 'Manillar KOCEVLO de fibra de carbono 3K para Ecoxtrem M41',
      specs: ['Ø 31,8 mm', 'Carbono 3K mate', '680–760 mm'],
      homeOrder: 10,
      homeTitle: 'Manillar KOCEVLO Carbono 680-760mm',
      homeAriaLabel: 'Manillar KOCEVLO Carbono 680-760mm para Ecoxtrem M41',
      priceAriaLabel: 'Precio manillar KOCEVLO Carbono 680-760mm',
      gallery: [
        { src: '/accesorios/manillar-kocevlo/img/1.webp', alt: 'Manillar KOCEVLO de carbono 3K, versión plana y elevadora, de 680 a 760 mm' },
        { src: '/accesorios/manillar-kocevlo/img/2.webp', alt: 'Manillar KOCEVLO Rise – la versión elevadora' },
        { src: '/accesorios/manillar-kocevlo/img/3.webp', alt: 'Manillar KOCEVLO Flat – la versión plana' },
        { src: '/accesorios/manillar-kocevlo/img/4.webp', alt: 'Manillar KOCEVLO – las dos versiones juntas' },
        { src: '/accesorios/manillar-kocevlo/img/5.webp', alt: 'Manillar KOCEVLO – abrazadera de 31,8 mm con el par de apriete de 5 N·m grabado' },
        { src: '/accesorios/manillar-kocevlo/img/6.webp', alt: 'Manillar KOCEVLO – tejido de carbono 3K' },
        { src: '/accesorios/manillar-kocevlo/img/7.webp', alt: 'Manillar KOCEVLO – detalle del logotipo' },
        { src: '/accesorios/manillar-kocevlo/img/8.webp', alt: 'Manillar KOCEVLO – detalle de las dos versiones' }
      ]
    }
    ,{
      id: 'acc-handlebar-lunje',
      sku: 'ACC-BAR-LUNJE',
      name: 'Manillar LUNJE 720mm/780mm',
      menuLabel: 'Manillar LUNJE 720/780',
      badgeText: 'Manillar LUNJE 720mm/780mm',
      brand: 'LUNJE',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '42,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      variantHint: 'acabado y medida',
      rotationGroup: 'manillar',
      href: '/accesorios/manillar-lunje/',
      accessoryCategory: 'handlebars',
            /* Orden en que se combinan las claves para la IDENTIDAD de la linea de
         carrito ("negro-780"). Estaba escrito en el script de la ficha; vive aqui
         para no partir en dos los carritos y pedidos ya guardados. Se borra cuando
         la identidad pase a ser `attrs`. */
      legacyKeyAxes: ['color', 'size'],
attributes: [
        {
          key: 'size',
          label: 'Medida',
          type: 'pill',
          options: [
            {
              key: '720',
              label: '720 mm'
            },
            {
              key: '780',
              default: true,
              label: '780 mm'
            }
          ]
        },
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              key: 'negro-blanco',
              label: 'Negro y blanco',
              swatch: 'linear-gradient(135deg,#141414 50%,#f1f5f9 50%)',
              images: [
                8
              ],
              allows: {
                size: [
                  '720',
                  '780'
                ]
              },
              default: true
            },
            {
              key: 'negro-rosa',
              label: 'Negro y rosa',
              swatch: 'linear-gradient(135deg,#141414 50%,#ec2f8a 50%)',
              images: [
                9
              ],
              allows: {
                size: [
                  '720',
                  '780'
                ]
              }
            },
            {
              key: 'negro-amarillo',
              label: 'Negro y amarillo',
              swatch: 'linear-gradient(135deg,#141414 50%,#d3e021 50%)',
              images: [
                10
              ],
              allows: {
                size: [
                  '720',
                  '780'
                ]
              }
            },
            {
              key: 'rojo',
              label: 'Rojo',
              swatch: '#c2352c',
              images: [
                11
              ],
              allows: {
                size: [
                  '720',
                  '780'
                ]
              }
            },
            {
              key: 'azul',
              label: 'Azul',
              swatch: '#2a7fb8',
              images: [
                12
              ],
              allows: {
                size: [
                  '720',
                  '780'
                ]
              }
            },
            {
              key: 'morado',
              label: 'Morado',
              swatch: '#8e44ad',
              images: [
                13
              ],
              allows: {
                size: [
                  '720',
                  '780'
                ]
              }
            },
            {
              key: 'dorado',
              label: 'Dorado',
              swatch: '#c8952c',
              images: [
                14
              ],
              allows: {
                size: [
                  '720',
                  '780'
                ]
              }
            },
            {
              key: 'tornasol-blanco',
              label: 'Tornasol blanco',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#f8fafc 50%)',
              images: [
                15
              ],
              allows: {
                size: [
                  '780'
                ]
              }
            },
            {
              key: 'tornasol-rosa',
              label: 'Tornasol rosa',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#ec2f8a 50%)',
              images: [
                16
              ],
              allows: {
                size: [
                  '720',
                  '780'
                ]
              }
            },
            {
              key: 'tornasol-amarillo',
              label: 'Tornasol amarillo',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#e8d21f 50%)',
              images: [
                17
              ],
              allows: {
                size: [
                  '720',
                  '780'
                ]
              }
            }
          ]
        }
      ],
      image: '/accesorios/manillar-lunje/img/1.webp',
      alt: 'Manillar LUNJE de aluminio 6061 para Ecoxtrem M41',
      specs: ['Ø 31,8 mm', 'Aluminio 6061 · alza 35 mm', '720/780 mm'],
      homeOrder: 11,
      homeTitle: 'Manillar LUNJE 720mm/780mm',
      homeAriaLabel: 'Manillar LUNJE 720mm/780mm para Ecoxtrem M41',
      priceAriaLabel: 'Precio manillar LUNJE 720mm/780mm',
      gallery: [
        { src: '/accesorios/manillar-lunje/img/1.webp', alt: 'Manillar LUNJE de aluminio 6061 en sus acabados, montado y en detalle' },
        { src: '/accesorios/manillar-lunje/img/2.webp', alt: 'Manillar LUNJE – medidas: 720 y 780 mm, alza 35 mm, abrazadera 31,8 mm y puños 22,2 mm' },
        { src: '/accesorios/manillar-lunje/img/3.webp', alt: 'Manillar LUNJE – cinco acabados sobre roca' },
        { src: '/accesorios/manillar-lunje/img/4.webp', alt: 'Manillar LUNJE montado en una bicicleta de montaña' },
        { src: '/accesorios/manillar-lunje/img/5.webp', alt: 'Manillar LUNJE – informe de ensayo SGS según ISO 4210-2:2023' },
        { src: '/accesorios/manillar-lunje/img/6.webp', alt: 'Manillar LUNJE – dos vistas del acabado azul' },
        { src: '/accesorios/manillar-lunje/img/7.webp', alt: 'Manillar LUNJE – detalle de los puños de 22,2 mm' },
        { src: '/accesorios/manillar-lunje/img/8.webp', alt: 'Manillar LUNJE en negro y blanco' },
        { src: '/accesorios/manillar-lunje/img/9.webp', alt: 'Manillar LUNJE en negro y rosa' },
        { src: '/accesorios/manillar-lunje/img/10.webp', alt: 'Manillar LUNJE en negro y amarillo' },
        { src: '/accesorios/manillar-lunje/img/11.webp', alt: 'Manillar LUNJE en rojo' },
        { src: '/accesorios/manillar-lunje/img/12.webp', alt: 'Manillar LUNJE en azul' },
        { src: '/accesorios/manillar-lunje/img/13.webp', alt: 'Manillar LUNJE en morado' },
        { src: '/accesorios/manillar-lunje/img/14.webp', alt: 'Manillar LUNJE en dorado' },
        { src: '/accesorios/manillar-lunje/img/15.webp', alt: 'Manillar LUNJE en tornasol blanco' },
        { src: '/accesorios/manillar-lunje/img/16.webp', alt: 'Manillar LUNJE en tornasol rosa' },
        { src: '/accesorios/manillar-lunje/img/17.webp', alt: 'Manillar LUNJE en tornasol amarillo' }
      ],
      // Dos ejes (acabado y medida) con la medida combinada en la clave de color, igual
      // que el WAKE 720/780. La diferencia: aqui la foto depende SOLO del acabado (es la
      // misma barra en 720 y en 780), y el tornasol blanco unicamente se fabrica en 780,
      // asi que el script de la ficha lo apaga al elegir 720.
    }
    ,{
      /* Primera POTENCIA del catálogo, y por tanto el primer producto de la familia
         `stems`, que estaba declarada y vacía. No va en `handlebars`: la potencia no es
         el manillar, es lo que lo sujeta a la horquilla, y la ficha del manillar LUNJE ya
         remite a ella ("cualquier potencia con abrazadera de 31,8 mm"). */
      id: 'acc-stem-lunje',
      sku: 'ACC-STEM-LUNJE',
      name: 'Potencia/Vástago LUNJE 35 mm',
      menuLabel: 'Potencia/Vástago LUNJE',
      badgeText: 'Potencia/Vástago LUNJE 35 mm',
      brand: 'LUNJE',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '23,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      rotationGroup: 'potencia',
      href: '/accesorios/potencia-lunje/',
      accessoryCategory: 'stems',
      fitsCategories: ['electric-scooters'],
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            /* La galería ABRE con el montaje de la gama (posición 1), que es también la
               foto de la tarjeta. El acabado por defecto apunta a la 2 —su foto limpia—
               y es la que pinta el HTML estático de la ficha: al hidratar,
               renderGalleryForVariant reimpone esa misma, así que no hay salto. Los colores salen de mirar las fotos: el JSON del fabricante
               los tiene mal rellenados (a "B-Black" le pone nombre "BLANCO" y #FFFFFF). */
            { key: 'negro',          label: 'Negro',            swatch: '#151515', images: [2], default: true },
            { key: 'azul',           label: 'Azul',             swatch: '#2f8fc4', images: [3] },
            { key: 'rojo',           label: 'Rojo',             swatch: '#b53232', images: [4] },
            { key: 'naranja',        label: 'Naranja',          swatch: '#cf5220', images: [5] },
            { key: 'morado',         label: 'Morado',           swatch: '#7a3a7a', images: [6] },
            { key: 'plata',          label: 'Plata',            swatch: '#c4c7cb', images: [7] },
            { key: 'titanio',        label: 'Titanio',          swatch: '#9a9a94', images: [8] },
            { key: 'tornasol',       label: 'Tornasol',         swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 38%,#06b6d4 68%,#22c55e 100%)', images: [9] },
            { key: 'negro-turquesa', label: 'Negro y turquesa', swatch: 'linear-gradient(135deg,#151515 0 50%,#3f9fb4 50%)', images: [10] },
            { key: 'negro-rojo',     label: 'Negro y rojo',     swatch: 'linear-gradient(135deg,#151515 0 50%,#b03636 50%)', images: [11] },
            { key: 'negro-titanio',  label: 'Negro y titanio',  swatch: 'linear-gradient(135deg,#151515 0 50%,#8e8f96 50%)', images: [12] },
            { key: 'morado-plata',   label: 'Morado y plata',   swatch: 'linear-gradient(135deg,#7a3a7a 0 50%,#c4c7cb 50%)', images: [13] },
            { key: 'rosa-dorado',    label: 'Rosa y dorado',    swatch: 'linear-gradient(135deg,#d99a3f 0%,#e2477e 60%)', images: [14] }
          ]
        }
      ],
      image: '/accesorios/potencia-lunje/img/16.webp',
      alt: 'Potencia o vástago LUNJE de aluminio CNC de 35 mm para Ecoxtrem M41',
      specs: ['Ø 31,8 mm', 'Horquilla Ø 28,6 mm', '35 mm · 118 g'],
      homeOrder: 19,
      homeTitle: 'Potencia/Vástago LUNJE 35 mm',
      homeAriaLabel: 'Potencia/Vástago LUNJE 35 mm para Ecoxtrem M41',
      priceAriaLabel: 'Precio potencia/vástago LUNJE 35 mm',
      gallery: [
        { src: '/accesorios/potencia-lunje/img/16.webp', alt: 'Potencia o vástago LUNJE en varios de sus acabados' },
        { src: '/accesorios/potencia-lunje/img/1.webp', alt: 'Potencia LUNJE 35 mm en negro' },
        { src: '/accesorios/potencia-lunje/img/2.webp', alt: 'Potencia LUNJE 35 mm en azul' },
        { src: '/accesorios/potencia-lunje/img/3.webp', alt: 'Potencia LUNJE 35 mm en rojo' },
        { src: '/accesorios/potencia-lunje/img/4.webp', alt: 'Potencia LUNJE 35 mm en naranja' },
        { src: '/accesorios/potencia-lunje/img/5.webp', alt: 'Potencia LUNJE 35 mm en morado' },
        { src: '/accesorios/potencia-lunje/img/6.webp', alt: 'Potencia LUNJE 35 mm en plata' },
        { src: '/accesorios/potencia-lunje/img/7.webp', alt: 'Potencia LUNJE 35 mm en titanio' },
        { src: '/accesorios/potencia-lunje/img/8.webp', alt: 'Potencia LUNJE 35 mm en tornasol' },
        { src: '/accesorios/potencia-lunje/img/9.webp', alt: 'Potencia LUNJE 35 mm en negro y turquesa' },
        { src: '/accesorios/potencia-lunje/img/10.webp', alt: 'Potencia LUNJE 35 mm en negro y rojo' },
        { src: '/accesorios/potencia-lunje/img/11.webp', alt: 'Potencia LUNJE 35 mm en negro y titanio' },
        { src: '/accesorios/potencia-lunje/img/12.webp', alt: 'Potencia LUNJE 35 mm en morado y plata' },
        { src: '/accesorios/potencia-lunje/img/13.webp', alt: 'Potencia LUNJE 35 mm en rosa y dorado' },
        { src: '/accesorios/potencia-lunje/img/14.webp', alt: 'Potencia LUNJE montada en un manillar de 31,8 mm' }
      ]
    }
    ,{
      id: 'acc-crash-protectors',
      sku: 'ACC-CRASH',
      name: 'Protectores anticaídas de aluminio y carbono',
      menuLabel: 'Protectores anticaídas',
      badgeText: 'Protectores anticaídas',
      brand: 'UNIVERSAL',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'protection',
      fitsCategories: ['electric-scooters'],
      /* El D6 y el N7 Pro se quedan fuera a propósito: no tienen dónde anclarlos. */
      excludeSkus: ['D6', 'N7PRO'],
      priceText: '8,90 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      rotationGroup: 'protector',
      href: '/accesorios/protectores-anticaidas/',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              key: 'negro',
              label: 'Negro',
              swatch: '#1a1a1a',
              /* Su foto limpia es la 6, pero ABRE con la 1 porque es la que pinta el
                 HTML estático de la ficha: arrancar con otra provoca un cambio de foto
                 visible en cuanto hidrata. La primera de la lista es la que manda. */
              images: [1],
              default: true
            },
            { key: 'dorado',  label: 'Dorado',  swatch: '#c9a92c', images: [7] },
            { key: 'azul',    label: 'Azul',    swatch: '#1653b8', images: [8] },
            { key: 'rojo',    label: 'Rojo',    swatch: '#b02a22', images: [9] },
            { key: 'naranja', label: 'Naranja', swatch: '#d8641b', images: [10] }
          ]
        }
      ],
      image: '/accesorios/protectores-anticaidas/img/1.webp',
      alt: 'Protectores anticaídas de aluminio y carbono para patinete eléctrico',
      specs: ['Pareja (2 uds.)', 'Aluminio CNC · carbono', 'Taladro 14 mm'],
      homeOrder: 12,
      homeTitle: 'Protectores anticaídas de aluminio y carbono',
      homeAriaLabel: 'Protectores anticaídas de aluminio y carbono para patinete eléctrico',
      priceAriaLabel: 'Precio protectores anticaídas',
      gallery: [
        { src: '/accesorios/protectores-anticaidas/img/6.webp', alt: 'Protectores anticaídas en negro' },
        { src: '/accesorios/protectores-anticaidas/img/1.webp', alt: 'Protectores anticaídas en sus cinco colores' },
        { src: '/accesorios/protectores-anticaidas/img/2.webp', alt: 'Protector anticaídas montado en la horquilla' },
        { src: '/accesorios/protectores-anticaidas/img/3.webp', alt: 'Protectores anticaídas – medidas: 48 mm de alto, 49 mm de ancho, 35 mm de diámetro interior y taladro de 14 mm' },
        { src: '/accesorios/protectores-anticaidas/img/4.webp', alt: 'Protectores anticaídas – los cinco colores y uno montado en dorado' },
        { src: '/accesorios/protectores-anticaidas/img/5.webp', alt: 'Protectores anticaídas – detalle del anodizado en rojo y naranja' },
        { src: '/accesorios/protectores-anticaidas/img/7.webp', alt: 'Protectores anticaídas en dorado' },
        { src: '/accesorios/protectores-anticaidas/img/8.webp', alt: 'Protectores anticaídas en azul' },
        { src: '/accesorios/protectores-anticaidas/img/9.webp', alt: 'Protectores anticaídas en rojo' },
        { src: '/accesorios/protectores-anticaidas/img/10.webp', alt: 'Protectores anticaídas en naranja' }
      ]
      // Un solo eje (color), así que la clave de carrito NO va combinada y no hace falta
      // `legacyKeyAxes`. `images` da a cada color su foto limpia (6-10) y delante las de
      // marketing; el negro abre con la 1 por lo dicho arriba.
    }
    ,{
      id: 'acc-crash-protectors-tornasol',
      sku: 'ACC-CRASH-T',
      name: 'Protectores anticaídas tornasol Ø60 mm',
      menuLabel: 'Protectores tornasol',
      badgeText: 'Protectores anticaídas tornasol',
      brand: 'UNIVERSAL',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'protection',
      /* Mismo taladro de 14 mm que el ACC-CRASH, así que mismo recorte: el D6 y el
         N7 Pro no tienen dónde anclarlos. */
      fitsCategories: ['electric-scooters'],
      excludeSkus: ['D6', 'N7PRO'],
      priceText: '13,90 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      /* Los dos protectores se relevan ENTRE ELLOS en la caja de compatibles, igual
         que los manillares entre manillares: son la misma familia y ocupan un hueco. */
      rotationGroup: 'protector',
      href: '/accesorios/protectores-anticaidas-tornasol/',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              /* El aro exterior es tornasol en LOS CINCO; lo que cambia es la copa
                 interior. Por eso cada swatch es mitad tornasol y mitad color, con el
                 mismo 135deg que usan los manillares NANLIO y LUNJE.
                 El negro abre con la 1 —la que pinta el HTML estático— y su foto
                 limpia es la 6. */
              key: 'negro',
              label: 'Negro',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#111111 50%)',
              images: [1],
              default: true
            },
            {
              key: 'dorado',
              label: 'Dorado',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#d4a017 50%)',
              images: [7]
            },
            {
              key: 'azul',
              label: 'Azul',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#1653b8 50%)',
              images: [8]
            },
            {
              key: 'rojo',
              label: 'Rojo',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#c01f1f 50%)',
              images: [9]
            },
            {
              key: 'plata',
              label: 'Plata',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#c8cdd2 50%)',
              images: [10]
            }
          ]
        }
      ],
      image: '/accesorios/protectores-anticaidas-tornasol/img/1.webp',
      alt: 'Protectores anticaídas tornasol de aluminio para patinete eléctrico',
      specs: ['Pareja (2 uds.)', 'Aluminio · aro tornasol', 'Ø 60 mm · taladro 14 mm'],
      homeOrder: 13,
      homeTitle: 'Protectores anticaídas tornasol Ø60 mm',
      homeAriaLabel: 'Protectores anticaídas tornasol de aluminio para patinete eléctrico',
      priceAriaLabel: 'Precio protectores anticaídas tornasol',
      gallery: [
        { src: '/accesorios/protectores-anticaidas-tornasol/img/6.webp', alt: 'Protectores anticaídas tornasol con copa negra' },
        { src: '/accesorios/protectores-anticaidas-tornasol/img/1.webp', alt: 'Protectores anticaídas tornasol en sus cinco colores' },
        { src: '/accesorios/protectores-anticaidas-tornasol/img/2.webp', alt: 'Protectores anticaídas tornasol – las cinco parejas y el detalle del anodizado' },
        { src: '/accesorios/protectores-anticaidas-tornasol/img/3.webp', alt: 'Protectores anticaídas tornasol – medidas: 60 mm de diámetro, 35 mm de alto, copa de 30 mm y taladro de 14 mm' },
        { src: '/accesorios/protectores-anticaidas-tornasol/img/4.webp', alt: 'Protector anticaídas tornasol montado en el eje de la rueda' },
        { src: '/accesorios/protectores-anticaidas-tornasol/img/5.webp', alt: 'Protectores anticaídas tornasol – detalle del aluminio mecanizado' },
        { src: '/accesorios/protectores-anticaidas-tornasol/img/7.webp', alt: 'Protectores anticaídas tornasol con copa dorada' },
        { src: '/accesorios/protectores-anticaidas-tornasol/img/8.webp', alt: 'Protectores anticaídas tornasol con copa azul' },
        { src: '/accesorios/protectores-anticaidas-tornasol/img/9.webp', alt: 'Protectores anticaídas tornasol con copa roja' },
        { src: '/accesorios/protectores-anticaidas-tornasol/img/10.webp', alt: 'Protectores anticaídas tornasol con copa plateada' }
      ]
      // Hermano del ACC-CRASH: mismo taladro (14 mm) y misma función, pero este monta en
      // el EJE de la rueda, es más ancho (Ø60 frente a 49 mm) y el aro es tornasol en vez
      // de carbono. Las dos fichas se enlazan entre sí en su `mini-note`.
    }
    ,{
      id: 'acc-crash-protectors-cilindricos',
      sku: 'ACC-CRASH-C',
      name: 'Protectores anticaídas cilíndricos Ø39 mm',
      menuLabel: 'Protectores cilíndricos',
      badgeText: 'Protectores anticaídas cilíndricos',
      brand: 'UNIVERSAL',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'protection',
      fitsCategories: ['electric-scooters'],
      excludeSkus: ['D6', 'N7PRO'],
      priceText: '10,50 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      /* Tercero de la familia: los protectores se relevan entre ellos en la caja de
         compatibles y ocupan UN hueco, no tres. */
      rotationGroup: 'protector',
      href: '/accesorios/protectores-anticaidas-cilindricos/',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            {
              /* El negro abre con la 1, que es la foto que pinta el HTML estático: su
                 foto limpia y la de portada son la misma, así que aquí no hace falta
                 la pareja [1, n] de los otros dos protectores. */
              key: 'negro',
              label: 'Negro',
              swatch: '#1a1a1a',
              images: [1],
              default: true
            },
            { key: 'azul',    label: 'Azul',    swatch: '#1653b8', images: [4] },
            { key: 'rojo',    label: 'Rojo',    swatch: '#b02a22', images: [5] },
            { key: 'naranja', label: 'Naranja', swatch: '#d8641b', images: [6] },
            { key: 'dorado',  label: 'Dorado',  swatch: '#c9a92c', images: [7] },
            { key: 'plata',   label: 'Plata',   swatch: '#c8cdd2', images: [8] },
            { key: 'morado',  label: 'Morado',  swatch: '#7b2f8e', images: [9] }
          ]
        }
      ],
      image: '/accesorios/protectores-anticaidas-cilindricos/img/1.webp',
      alt: 'Protectores anticaídas cilíndricos de aluminio para patinete eléctrico',
      specs: ['Pareja (2 uds.)', 'Aluminio · 7 colores', 'Ø 39 × 47 mm'],
      homeOrder: 14,
      homeTitle: 'Protectores anticaídas cilíndricos Ø39 mm',
      homeAriaLabel: 'Protectores anticaídas cilíndricos de aluminio para patinete eléctrico',
      priceAriaLabel: 'Precio protectores anticaídas cilíndricos',
      gallery: [
        { src: '/accesorios/protectores-anticaidas-cilindricos/img/1.webp', alt: 'Protectores anticaídas cilíndricos en negro' },
        { src: '/accesorios/protectores-anticaidas-cilindricos/img/2.webp', alt: 'Protectores anticaídas cilíndricos – medidas: 39 mm de diámetro exterior, 29 mm interior y 47 mm de largo' },
        { src: '/accesorios/protectores-anticaidas-cilindricos/img/3.webp', alt: 'Protectores anticaídas cilíndricos en sus siete colores' },
        { src: '/accesorios/protectores-anticaidas-cilindricos/img/4.webp', alt: 'Protectores anticaídas cilíndricos en azul' },
        { src: '/accesorios/protectores-anticaidas-cilindricos/img/5.webp', alt: 'Protectores anticaídas cilíndricos en rojo' },
        { src: '/accesorios/protectores-anticaidas-cilindricos/img/6.webp', alt: 'Protectores anticaídas cilíndricos en naranja' },
        { src: '/accesorios/protectores-anticaidas-cilindricos/img/7.webp', alt: 'Protectores anticaídas cilíndricos en dorado' },
        { src: '/accesorios/protectores-anticaidas-cilindricos/img/8.webp', alt: 'Protectores anticaídas cilíndricos en plata' },
        { src: '/accesorios/protectores-anticaidas-cilindricos/img/9.webp', alt: 'Protectores anticaídas cilíndricos en morado' }
      ]
      // Tercero de la familia 'protector'. El fabricante lo anuncia para Zero y Kugoo
      // (KUKIRIN), pero se ofrece en todos los patinetes salvo D6 y N7 Pro por decisión
      // comercial: la copa interior es de Ø29 mm y hay que mirar el anclaje, avisado en
      // la nota de la ficha.
    }
    ,{
      id: 'acc-speed-limiter-m41',
      sku: 'ACC-LIMIT-M41',
      name: 'Mando limitador — M41 Tank',
      menuLabel: 'Mando limitador — M41 Tank',
      badgeText: 'Mando limitador — M41 Tank',
      brand: 'ECOXTREM',
      series: 'acc-limit',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'limiters',
      priceText: '58,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/mando-limitador-m41-tank/',
      image: '/accesorios/mando-limitador-m41-tank/img/1.webp',
      alt: 'Mando limitador — M41 Tank para Ecoxtrem M41 Tank Ultimate 1000W',
      specs: ['25 ↔ 55 km/h', 'Mando llavero RF', 'Plug & play'],
      homeOrder: 1,
      homeTitle: 'Mando limitador — M41 Tank',
      homeAriaLabel: 'Mando limitador — M41 Tank',
      priceAriaLabel: 'Precio Mando limitador — M41 Tank',
      gallery: [
        { src: '/accesorios/mando-limitador-m41-tank/img/1.webp', alt: 'Mando limitador — M41 Tank' },
        { src: '/img/limitadores/conjunto.webp', alt: 'Mando limitador — M41 Tank – cableado con conectores estancos' },
        { src: '/img/limitadores/mando-4-vistas.webp', alt: 'Mando limitador — M41 Tank – mando llavero en cuatro vistas' },
        { src: '/img/limitadores/conjunto-blanco.webp', alt: 'Mando limitador — M41 Tank – conjunto completo sobre fondo blanco' }
      ]
    }
    ,{
      id: 'acc-speed-limiter-m41-tank-dual',
      sku: 'ACC-LIMIT-M41-TD',
      name: 'Mando limitador — M41 Tank Dual',
      menuLabel: 'Mando limitador — M41 Tank Dual',
      badgeText: 'Mando limitador — M41 Tank Dual',
      brand: 'ECOXTREM',
      series: 'acc-limit',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'limiters',
      priceText: '58,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/mando-limitador-m41-tank-dual/',
      image: '/accesorios/mando-limitador-m41-tank-dual/img/1.webp',
      alt: 'Mando limitador — M41 Tank Dual para Ecoxtrem M41 Tank Dual',
      specs: ['25 ↔ 70 km/h', 'Mando llavero RF', 'Plug & play'],
      homeOrder: 2,
      homeTitle: 'Mando limitador — M41 Tank Dual',
      homeAriaLabel: 'Mando limitador — M41 Tank Dual',
      priceAriaLabel: 'Precio Mando limitador — M41 Tank Dual',
      gallery: [
        { src: '/accesorios/mando-limitador-m41-tank-dual/img/1.webp', alt: 'Mando limitador — M41 Tank Dual' },
        { src: '/img/limitadores/conjunto.webp', alt: 'Mando limitador — M41 Tank Dual – cableado con conectores estancos' },
        { src: '/img/limitadores/mando-4-vistas.webp', alt: 'Mando limitador — M41 Tank Dual – mando llavero en cuatro vistas' },
        { src: '/img/limitadores/conjunto-blanco.webp', alt: 'Mando limitador — M41 Tank Dual – conjunto completo sobre fondo blanco' }
      ]
    }
    ,{
      id: 'acc-speed-limiter-m41-armored-one',
      sku: 'ACC-LIMIT-M41-AO',
      name: 'Mando limitador — M41 Armored One',
      menuLabel: 'Mando limitador — M41 Armored One',
      badgeText: 'Mando limitador — M41 Armored One',
      brand: 'ECOXTREM',
      series: 'acc-limit',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'limiters',
      priceText: '58,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/mando-limitador-m41-armored-one/',
      image: '/accesorios/mando-limitador-m41-armored-one/img/1.webp',
      alt: 'Mando limitador — M41 Armored One para Ecoxtrem M41 Armored One Pro',
      specs: ['25 ↔ 60 km/h', 'Mando llavero RF', 'Plug & play'],
      homeOrder: 3,
      homeTitle: 'Mando limitador — M41 Armored One',
      homeAriaLabel: 'Mando limitador — M41 Armored One',
      priceAriaLabel: 'Precio Mando limitador — M41 Armored One',
      gallery: [
        { src: '/accesorios/mando-limitador-m41-armored-one/img/1.webp', alt: 'Mando limitador — M41 Armored One' },
        { src: '/img/limitadores/conjunto.webp', alt: 'Mando limitador — M41 Armored One – cableado con conectores estancos' },
        { src: '/img/limitadores/mando-4-vistas.webp', alt: 'Mando limitador — M41 Armored One – mando llavero en cuatro vistas' },
        { src: '/img/limitadores/conjunto-blanco.webp', alt: 'Mando limitador — M41 Armored One – conjunto completo sobre fondo blanco' }
      ]
    }
    ,{
      id: 'acc-speed-limiter-m41-armored-dual',
      sku: 'ACC-LIMIT-M41-AD',
      name: 'Mando limitador — M41 Armored Dual',
      menuLabel: 'Mando limitador — M41 Armored Dual',
      badgeText: 'Mando limitador — M41 Armored Dual',
      brand: 'ECOXTREM',
      series: 'acc-limit',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      accessoryCategory: 'limiters',
      priceText: '58,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/mando-limitador-m41-armored-dual/',
      image: '/accesorios/mando-limitador-m41-armored-dual/img/1.webp',
      alt: 'Mando limitador — M41 Armored Dual para Ecoxtrem M41 Armored Dual (LR)',
      specs: ['25 ↔ 83 km/h', 'Mando llavero RF', 'Plug & play'],
      homeOrder: 4,
      homeTitle: 'Mando limitador — M41 Armored Dual',
      homeAriaLabel: 'Mando limitador — M41 Armored Dual',
      priceAriaLabel: 'Precio Mando limitador — M41 Armored Dual',
      gallery: [
        { src: '/accesorios/mando-limitador-m41-armored-dual/img/1.webp', alt: 'Mando limitador — M41 Armored Dual' },
        { src: '/img/limitadores/conjunto.webp', alt: 'Mando limitador — M41 Armored Dual – cableado con conectores estancos' },
        { src: '/img/limitadores/mando-4-vistas.webp', alt: 'Mando limitador — M41 Armored Dual – mando llavero en cuatro vistas' },
        { src: '/img/limitadores/conjunto-blanco.webp', alt: 'Mando limitador — M41 Armored Dual – conjunto completo sobre fondo blanco' }
      ]
    }
    ,{
      id: 'b-g73',
      sku: 'G73',
      name: 'G73',
      menuLabel: 'G73',
      badgeText: 'G73',
      brand: 'SCOOTBIKE',
      series: 'b',
      productType: 'electric-bike',
      catalogType: 'vehicle',
      categoryKey: 'electric-bikes',
      priceText: '590 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      paypalId: '',
      href: '/bicicletas/g73/',
      image: '/bicicletas/g73/img/1.webp',
      alt: 'Bicicleta eléctrica G73',
      specs: ['250 W', '48 V 13 Ah', 'Autonomía 45–55 km', 'Frenos delanteros y traseros', '26" ruedas', 'Velocidad máxima 30 km/h'],
      homeOrder: 1,
      homeTitle: 'G73',
      homeAriaLabel: 'G73 — Bicicleta eléctrica urbana',
      priceAriaLabel: 'Precio G73',
      gallery: [
        { src: '/bicicletas/g73/img/1.webp', alt: 'G73 vista 1' },
        { src: '/bicicletas/g73/img/2.webp', alt: 'G73 vista 2' },
        { src: '/bicicletas/g73/img/3.webp', alt: 'G73 vista 3' },
        { src: '/bicicletas/g73/img/4.webp', alt: 'G73 vista 4' },
        { src: '/bicicletas/g73/img/5.webp', alt: 'G73 vista 5' }
      ]
    }
    ,{
      id: 'b-gt900',
      sku: 'GT900',
      name: 'Aairsk GT900',
      menuLabel: 'Aairsk GT900',
      badgeText: 'Aairsk GT900',
      brand: 'Aairsk',
      series: 'b',
      productType: 'electric-bike',
      catalogType: 'vehicle',
      categoryKey: 'electric-bikes',
      priceText: '700 €',
      compareAtPriceText: '840 €',
      stock: 'in_stock',
      paypalId: '',
      href: '/bicicletas/gt900/',
      image: '/bicicletas/gt900/img/7.webp',
      alt: 'Bicicleta eléctrica de montaña Aairsk GT900',
      specs: ['250 W', 'Hasta 65 km', '36V', 'Shimano 7 vel.', 'Frenos de disco', '26"'],
      homeOrder: 2,
      homeTitle: 'Aairsk GT900',
      homeAriaLabel: 'Aairsk GT900 — Bicicleta eléctrica de montaña',
      priceAriaLabel: 'Precio Aairsk GT900',
      gallery: [
        { src: '/bicicletas/gt900/img/7.webp', alt: 'Aairsk GT900 vista 7' },
        { src: '/bicicletas/gt900/img/1.webp', alt: 'Aairsk GT900 vista 1' },
        { src: '/bicicletas/gt900/img/2.webp', alt: 'Aairsk GT900 vista 2' },
        { src: '/bicicletas/gt900/img/3.webp', alt: 'Aairsk GT900 vista 3' },
        { src: '/bicicletas/gt900/img/4.webp', alt: 'Aairsk GT900 vista 4' },
        { src: '/bicicletas/gt900/img/5.webp', alt: 'Aairsk GT900 vista 5' },
        { src: '/bicicletas/gt900/img/6.webp', alt: 'Aairsk GT900 vista 6' },
        { src: '/bicicletas/gt900/img/8.webp', alt: 'Aairsk GT900 vista 8' },
        { src: '/bicicletas/gt900/img/9.webp', alt: 'Aairsk GT900 vista 9' }
      ]
    }
    ,{
      id: 'motos-ev12m-pro',
      sku: 'EV12MPRO',
      name: 'EVERCROSS EV12M PRO',
      menuLabel: 'EVERCROSS EV12M PRO',
      badgeText: 'EVERCROSS EV12M PRO',
      brand: 'EVERCROSS',
      series: 'motos',
      productType: 'electric-motorcycle',
      catalogType: 'vehicle',
      categoryKey: 'electric-motorcycles',
      priceText: '349 €',
      compareAtPriceText: '420 €',
      stock: 'in_stock',
      href: '/motos/ev12m-pro/',
      image: '/motos/ev12m-pro/img/1.webp',
      alt: 'Moto eléctrica infantil EVERCROSS EV12M PRO',
      specs: ['300 W', 'Hasta 15 km', '36 V 4 Ah'],
      homeOrder: 1,
      homeTitle: 'EVERCROSS EV12M PRO',
      homeAriaLabel: 'EVERCROSS EV12M PRO — 300 W, 25 km/h y hasta 15 km',
      priceAriaLabel: 'Estado EVERCROSS EV12M PRO',
      gallery: [
        { src: '/motos/ev12m-pro/img/1.webp', alt: 'EVERCROSS EV12M PRO vista 1' },
        { src: '/motos/ev12m-pro/img/2.webp', alt: 'EVERCROSS EV12M PRO vista 2' },
        { src: '/motos/ev12m-pro/img/3.webp', alt: 'EVERCROSS EV12M PRO vista 3' },
        { src: '/motos/ev12m-pro/img/4.webp', alt: 'EVERCROSS EV12M PRO vista 4' },
        { src: '/motos/ev12m-pro/img/5.webp', alt: 'EVERCROSS EV12M PRO vista 5' },
        { src: '/motos/ev12m-pro/img/6.webp', alt: 'EVERCROSS EV12M PRO vista 6' },
        { src: '/motos/ev12m-pro/img/7.webp', alt: 'EVERCROSS EV12M PRO vista 7' },
        { src: '/motos/ev12m-pro/img/8.webp', alt: 'EVERCROSS EV12M PRO vista 8' },
        { src: '/motos/ev12m-pro/img/9.webp', alt: 'EVERCROSS EV12M PRO vista 9' }
      ]
    }
    ,{
      id: 'motos-ev05m',
      sku: 'EV05M',
      name: 'EVERCROSS EV05M',
      menuLabel: 'EVERCROSS EV05M',
      badgeText: 'EVERCROSS EV05M',
      brand: 'EVERCROSS',
      series: 'motos',
      productType: 'electric-motorcycle',
      catalogType: 'vehicle',
      categoryKey: 'electric-motorcycles',
      priceText: '245 €',
      compareAtPriceText: '280 €',
      stock: 'in_stock',
      href: '/motos/ev05m/',
      image: '/motos/ev05m/img/1.webp',
      alt: 'Moto eléctrica infantil EVERCROSS EV05M',
      specs: ['150 W', 'Hasta 10 km', '14.4 V 5.2 Ah'],
      homeOrder: 2,
      homeTitle: 'EVERCROSS EV05M',
      homeAriaLabel: 'EVERCROSS EV05M — 150 W, 16 km/h y hasta 10 km',
      priceAriaLabel: 'Estado EVERCROSS EV05M',
      gallery: [
        { src: '/motos/ev05m/img/1.webp', alt: 'EVERCROSS EV05M vista 1' },
        { src: '/motos/ev05m/img/2.webp', alt: 'EVERCROSS EV05M vista 2' },
        { src: '/motos/ev05m/img/3.webp', alt: 'EVERCROSS EV05M vista 3' },
        { src: '/motos/ev05m/img/4.webp', alt: 'EVERCROSS EV05M vista 4' },
        { src: '/motos/ev05m/img/5.webp', alt: 'EVERCROSS EV05M vista 5' },
        { src: '/motos/ev05m/img/6.webp', alt: 'EVERCROSS EV05M vista 6' },
        { src: '/motos/ev05m/img/7.webp', alt: 'EVERCROSS EV05M vista 7' },
        { src: '/motos/ev05m/img/8.webp', alt: 'EVERCROSS EV05M vista 8' },
        { src: '/motos/ev05m/img/9.webp', alt: 'EVERCROSS EV05M vista 9' }
      ]
    }
    ,{
      id: 'motos-challenger12',
      sku: 'CHALLENGER12',
      name: 'CHALLENGER12',
      menuLabel: 'CHALLENGER12',
      badgeText: 'CHALLENGER12',
      brand: 'CHALLENGER',
      series: 'motos',
      productType: 'electric-motorcycle',
      catalogType: 'vehicle',
      categoryKey: 'electric-motorcycles',
      priceText: '299 €',
      compareAtPriceText: '365 €',
      stock: 'in_stock',
      href: '/motos/challenger12/',
      image: '/motos/challenger12/img/1.webp',
      alt: 'Moto eléctrica infantil CHALLENGER12',
      specs: ['160 W', 'Hasta 15 km', '24 V 5.2 Ah'],
      homeOrder: 3,
      homeTitle: 'CHALLENGER12',
      homeAriaLabel: 'CHALLENGER12 — 160 W, 20 km/h y hasta 15 km',
      priceAriaLabel: 'Estado CHALLENGER12',
      gallery: [
        { src: '/motos/challenger12/img/1.webp', alt: 'CHALLENGER12 vista 1' },
        { src: '/motos/challenger12/img/2.webp', alt: 'CHALLENGER12 vista 2' },
        { src: '/motos/challenger12/img/3.webp', alt: 'CHALLENGER12 vista 3' },
        { src: '/motos/challenger12/img/4.webp', alt: 'CHALLENGER12 vista 4' },
        { src: '/motos/challenger12/img/5.webp', alt: 'CHALLENGER12 vista 5' },
        { src: '/motos/challenger12/img/6.webp', alt: 'CHALLENGER12 vista 6' },
        { src: '/motos/challenger12/img/7.webp', alt: 'CHALLENGER12 vista 7' },
        { src: '/motos/challenger12/img/8.webp', alt: 'CHALLENGER12 vista 8' },
        { src: '/motos/challenger12/img/9.webp', alt: 'CHALLENGER12 vista 9' }
      ]
    }
  ,
    {
      id: 'ix8',
      filtros: { dgt: false, motores: 2, w: 2400, km: 70, kmh: 60, frenos: 'hidraulicos' },
      sku: 'IX8',
      // 2400 W repartidos en dos motores
      motores: 2,
      name: 'iScooter IX8',
      menuLabel: 'IX8',
      badgeText: 'iScooter IX8',
      brand: 'ISCOOTER',
      series: 'ix',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '700 €',
      compareAtPriceText: '770 €',
      stock: 'in_stock',
      href: '/patinetes/series-ix/ix8/',
      image: '/patinetes/series-ix/ix8/img/1.webp',
      alt: 'Patinete electrico iScooter IX8 todoterreno',
      specs: ['2400 W', '65-70 km', '48 V 20 Ah'],
      homeOrder: 3,
      homeTitle: 'iScooter IX8',
      homeAriaLabel: 'IX8 - 2400 W y hasta 70 km',
      priceAriaLabel: 'Precio IX8',
      gallery: [
        { src: '/patinetes/series-ix/ix8/img/1.webp', alt: 'IX8 vista 1' },
        { src: '/patinetes/series-ix/ix8/img/2.webp', alt: 'IX8 vista 2' },
        { src: '/patinetes/series-ix/ix8/img/3.webp', alt: 'IX8 vista 3' },
        { src: '/patinetes/series-ix/ix8/img/4.webp', alt: 'IX8 vista 4' },
        { src: '/patinetes/series-ix/ix8/img/5.webp', alt: 'IX8 vista 5' },
        { src: '/patinetes/series-ix/ix8/img/6.webp', alt: 'IX8 vista 6' }
      ]
    }
  ,
    /* ── REPUESTOS ──────────────────────────────────────────────────────────────
       Primera pieza de la categoría: la rueda de 11 pulgadas del M41 Armored Dual.
       El marcaje MÉTRICO del flanco no se declara en ningún sitio a propósito. En la
       foto del proveedor solo se lee «…2.75-6.5» y los dígitos de la pulgada no son
       legibles; como 2.75-6.5 (≈70 mm) NO es 90/65-6.5 (90 mm), publicar una de las
       dos habría sido inventarse la medida de un recambio. Se dice lo comprobado:
       11 pulgadas, tubeless y goma Chaoyang.
       `compatibleSkus` va SOLO al Armored Dual a propósito — el Armored One
       calza lo mismo (11 pulgadas tubeless), pero eso se decide, no se deduce. */
    {
      id: 'rep-neumatico-11-offroad',
      sku: 'REP-NEU11OFF',
      name: 'Neumático 11 pulgadas off-road (par)',
      menuLabel: 'Neumático 11 pulgadas',
      badgeText: 'Neumático 11 pulgadas off-road',
      brand: 'CHAOYANG',
      series: 'rep',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'spare-parts',
      accessoryCategory: 'tyres',
      compatibleSkus: ['M41DUAL'],
      priceText: '56,99 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/repuestos/neumatico-11-offroad/',
      image: '/repuestos/neumatico-11-offroad/img/1.webp',
      alt: 'Neumático off-road tubeless de 11 pulgadas para patinete eléctrico',
      specs: ['11 pulgadas', 'Tubeless, sin cámara', 'Par de 2 unidades'],
      homeOrder: 1,
      homeTitle: 'Neumático 11 pulgadas off-road',
      homeAriaLabel: 'Neumático off-road de 11 pulgadas, par de 2 unidades',
      priceAriaLabel: 'Precio neumático 11 pulgadas off-road',
      gallery: [
        { src: '/repuestos/neumatico-11-offroad/img/1.webp', alt: 'Par de neumáticos off-road Chaoyang para patinete eléctrico' },
        { src: '/repuestos/neumatico-11-offroad/img/2.webp', alt: 'Neumático off-road — dibujo de tacos visto de frente' },
        { src: '/repuestos/neumatico-11-offroad/img/3.webp', alt: 'Neumático off-road Chaoyang — vista de perfil' }
      ]
    },
    {
      id: 'r7',
      filtros: { dgt: true, motores: 2, w: 1800, km: 90, kmh: 65, frenos: null },
      sku: 'R7',
      name: 'ROVORON R7',
      menuLabel: 'ROVORON R7',
      badgeText: 'ROVORON R7',
      brand: 'ROVORON',
      series: 'rovoron',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '998,50 €',
      compareAtPriceText: '1150 €',
      stock: 'in_stock',
      href: '/patinetes/rovoron/r7/',
      image: '/patinetes/rovoron/r7/img/1-v2.webp',
      alt: 'Patinete eléctrico ROVORON R7',
      specs: ['2 x 900 W (3000 W pico)', 'Más de 90 km', '60 V 28,6 Ah'],
      homeOrder: 0,
      homeTitle: 'ROVORON R7',
      homeAriaLabel: 'ROVORON R7 — 2 x 900 W, más de 90 km y 11 pulgadas',
      priceAriaLabel: 'Estado ROVORON R7',
      dgtCertified: true,
      dgtTooltipText: 'Este distintivo indica que el modelo está homologado y certificado por la DGT, de acuerdo con la normativa vigente aplicable a vehículos de movilidad personal.',
      /* DOS ejes. La VERSIÓN no declara fotos a propósito: las imágenes son las
         mismas homologada o no, y `imagenesDe()` recorre los ejes en orden y cae
         al color, que sí las trae. El sello DGT lo mueve `dgt` de cada opción,
         igual que en el KUKIRIN G2 PRO. */
      legacyKeyAxes: ['color', 'model'],
      attributes: [
        {
          key: 'model',
          label: 'Versión',
          type: 'pill',
          options: [
            {
              key: 'dgt',
              label: 'R7 DGT',
              default: true,
              dgt: true,
              desc: '<strong>ROVORON R7</strong> en versión homologada: certificada por la DGT y limitada a 25 km/h. Doble motor de 900 W (3000 W de pico), batería de 60 V 28,6 Ah y más de 90 km de autonomía.'
            },
            {
              key: 'libre',
              label: 'R7 NORMAL',
              dgt: false,
              desc: '<strong>ROVORON R7</strong> en versión libre: doble motor de 900 W (3000 W de pico), batería de 60 V 28,6 Ah, más de 90 km de autonomía y punta de 65 km/h. <strong>Sin homologación DGT</strong>: solo para circuito o recinto privado.'
            }
          ]
        },
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'negro', label: 'Negro', swatch: '#151515', default: true, images: [1, 2, 3, 4, 5, 6, 14] },
            { key: 'rojo',  label: 'Rojo',  swatch: '#bb1b1e', images: [7, 8, 9, 10, 14] },
            { key: 'azul',  label: 'Azul',  swatch: '#1d4aba', images: [11, 12, 13, 14] }
          ]
        }
      ],
      gallery: [
        { src: '/patinetes/rovoron/r7/img/1-v2.webp', alt: 'ROVORON R7 vista 1' },
        { src: '/patinetes/rovoron/r7/img/2.webp', alt: 'ROVORON R7 vista 2' },
        { src: '/patinetes/rovoron/r7/img/3.webp', alt: 'ROVORON R7 vista 3' },
        { src: '/patinetes/rovoron/r7/img/4.webp', alt: 'ROVORON R7 vista 4' },
        { src: '/patinetes/rovoron/r7/img/5.webp', alt: 'ROVORON R7 vista 5' },
        { src: '/patinetes/rovoron/r7/img/6.webp', alt: 'ROVORON R7 vista 6' },
        { src: '/patinetes/rovoron/r7/img/7.webp', alt: 'ROVORON R7 vista 7' },
        { src: '/patinetes/rovoron/r7/img/8.webp', alt: 'ROVORON R7 vista 8' },
        { src: '/patinetes/rovoron/r7/img/9.webp', alt: 'ROVORON R7 vista 9' },
        { src: '/patinetes/rovoron/r7/img/10.webp', alt: 'ROVORON R7 vista 10' },
        { src: '/patinetes/rovoron/r7/img/11.webp', alt: 'ROVORON R7 vista 11' },
        { src: '/patinetes/rovoron/r7/img/12.webp', alt: 'ROVORON R7 vista 12' },
        { src: '/patinetes/rovoron/r7/img/13.webp', alt: 'ROVORON R7 vista 13' },
        { src: '/patinetes/rovoron/r7/img/14.webp', alt: 'ROVORON R7 vista 14' }
      ]
    },
    {
      id: 'r7-pro',
      filtros: { dgt: true, motores: 2, w: 1800, km: 125, kmh: 70, frenos: 'hidraulicos' },
      sku: 'R7PRO',
      name: 'ROVORON R7 PRO',
      menuLabel: 'ROVORON R7 PRO',
      badgeText: 'ROVORON R7 PRO',
      brand: 'ROVORON',
      series: 'rovoron',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '1299,50 €',
      stock: 'in_stock',
      href: '/patinetes/rovoron/r7-pro/',
      image: '/patinetes/rovoron/r7-pro/img/1.webp',
      alt: 'Patinete eléctrico ROVORON R7 PRO',
      specs: ['2 x 900 W (3000 W pico)', 'Hasta 125 km', 'Frenos hidráulicos'],
      homeOrder: 1,
      homeTitle: 'ROVORON R7 PRO',
      homeAriaLabel: 'ROVORON R7 PRO — 2 x 900 W, hasta 125 km y frenos hidráulicos',
      priceAriaLabel: 'Estado ROVORON R7 PRO',
      dgtCertified: true,
      dgtTooltipText: 'Este distintivo indica que el modelo está homologado y certificado por la DGT, de acuerdo con la normativa vigente aplicable a vehículos de movilidad personal.',
      /* Mismos dos ejes que el R7. Las fotos empezaron siendo las del R7 —es el
         mismo patinete— pero desde que el PRO tiene PORTADA PROPIA (la del
         rótulo 60V 42Ah) tiene carpeta propia: media galería prestada y media
         suya era imposible de mantener. */
      legacyKeyAxes: ['color', 'model'],
      attributes: [
        {
          key: 'model',
          label: 'Versión',
          type: 'pill',
          options: [
            {
              key: 'dgt',
              label: 'R7 PRO DGT',
              default: true,
              dgt: true,
              desc: '<strong>ROVORON R7 PRO</strong> en versión homologada: certificada por la DGT y limitada a 25 km/h. Doble motor de 900 W (3000 W de pico), batería de 60 V 42,4 Ah con celdas Samsung, frenos hidráulicos y hasta 125 km de autonomía.'
            },
            {
              key: 'libre',
              label: 'R7 PRO NORMAL',
              dgt: false,
              desc: '<strong>ROVORON R7 PRO</strong> en versión libre: doble motor de 900 W (3000 W de pico), batería de 60 V 42,4 Ah con celdas Samsung, frenos hidráulicos, hasta 125 km de autonomía y punta de 70 km/h. <strong>Sin homologación DGT</strong>: solo para circuito o recinto privado.'
            }
          ]
        },
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'negro', label: 'Negro', swatch: '#151515', default: true, images: [1, 2, 3, 4, 5, 6, 14] },
            { key: 'rojo',  label: 'Rojo',  swatch: '#bb1b1e', images: [7, 8, 9, 10, 14] },
            { key: 'azul',  label: 'Azul',  swatch: '#1d4aba', images: [11, 12, 13, 14] }
          ]
        }
      ],
      gallery: [
        { src: '/patinetes/rovoron/r7-pro/img/1.webp', alt: 'ROVORON R7 PRO vista 1' },
        { src: '/patinetes/rovoron/r7-pro/img/2.webp', alt: 'ROVORON R7 PRO vista 2' },
        { src: '/patinetes/rovoron/r7-pro/img/3.webp', alt: 'ROVORON R7 PRO vista 3' },
        { src: '/patinetes/rovoron/r7-pro/img/4.webp', alt: 'ROVORON R7 PRO vista 4' },
        { src: '/patinetes/rovoron/r7-pro/img/5.webp', alt: 'ROVORON R7 PRO vista 5' },
        { src: '/patinetes/rovoron/r7-pro/img/6.webp', alt: 'ROVORON R7 PRO vista 6' },
        { src: '/patinetes/rovoron/r7-pro/img/7.webp', alt: 'ROVORON R7 PRO vista 7' },
        { src: '/patinetes/rovoron/r7-pro/img/8.webp', alt: 'ROVORON R7 PRO vista 8' },
        { src: '/patinetes/rovoron/r7-pro/img/9.webp', alt: 'ROVORON R7 PRO vista 9' },
        { src: '/patinetes/rovoron/r7-pro/img/10.webp', alt: 'ROVORON R7 PRO vista 10' },
        { src: '/patinetes/rovoron/r7-pro/img/11.webp', alt: 'ROVORON R7 PRO vista 11' },
        { src: '/patinetes/rovoron/r7-pro/img/12.webp', alt: 'ROVORON R7 PRO vista 12' },
        { src: '/patinetes/rovoron/r7-pro/img/13.webp', alt: 'ROVORON R7 PRO vista 13' },
        { src: '/patinetes/rovoron/r7-pro/img/14.webp', alt: 'ROVORON R7 PRO vista 14' }
      ]
    },
    {
      /* ROVORON S7 — alta 27 ago 2026. Ficha técnica contrastada en tres fuentes
         (Minimotors como importador oficial, Rovoron Europe y Solorueda): doble
         motor de 2500 W con pico de 11.500 W, batería 84 V 37,1 Ah de celdas
         Samsung 21700, hasta 140 km, frenos hidráulicos de 4 pistones con ABS/EBS,
         suspensión de cartucho ajustable delante y detrás, 11" tubeless, pantalla
         EY4 con Bluetooth, 49,5 kg y 120 kg de carga máxima.

         PUNTA EN PRIVADO: **más de 135 km/h**, confirmado por el usuario y por la
         propia creatividad de ROVORON. Minimotors publica 100 km/h, así que si
         alguien va a "corregirlo" a esa cifra: no, es deliberado. La mitigación
         legal es la de siempre —«Sin homologación DGT: solo para circuito o
         recinto privado»—, la misma que llevan los mandos limitadores.

         UN SOLO EJE, el de versión, como el KUKIRIN G2 PRO. Sus opciones no
         declaran `images` porque las dos versiones son el mismo patinete —lo que
         cambia es el firmware— y compartir foto en un eje `pill` es legítimo:
         `scripts/qa/fotos-por-variante.js` solo exige que la mueva un eje
         `swatch`. Si las fotos que lleguen muestran colores distintos, esto pasa a
         DOS ejes como el R7 y entonces hace falta `legacyKeyAxes`.

         La GALERÍA la completa `scripts/completar-fotos.py` con las fotos que haya
         en la carpeta.

         `accentColors` pinta la LÍNEA de arriba del panel de la ficha: mitad
         izquierda el primer color, mitad derecha el segundo. Aquí, el negro de la
         tienda y el **aqua real del patinete (#1FACB2)**, medido sobre los 6 464
         píxeles turquesa de las siete fotos — no elegido a ojo. Sin este campo un
         eje de píldoras no aporta color y la línea cae al rojo de `--primary`,
         que no tiene nada que ver con el producto. */
      id: 's7',
      filtros: { dgt: true, motores: 2, w: 5000, km: 140, kmh: 135, frenos: 'hidraulicos' },
      sku: 'S7',
      name: 'ROVORON S7',
      menuLabel: 'ROVORON S7',
      badgeText: 'ROVORON S7',
      brand: 'ROVORON',
      series: 'rovoron',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '2370 €',
      compareAtPriceText: '2499 €',
      stock: 'in_stock',
      href: '/patinetes/rovoron/s7/',
      image: '/patinetes/rovoron/s7/img/1.webp',
      alt: 'Patinete eléctrico ROVORON S7',
      specs: ['2 x 2500 W (11.500 W pico)', 'Hasta 140 km', '84 V 37,1 Ah Samsung'],
      homeOrder: 2,
      homeTitle: 'ROVORON S7',
      homeAriaLabel: 'ROVORON S7 — 2 x 2500 W, hasta 140 km y 11 pulgadas',
      priceAriaLabel: 'Estado ROVORON S7',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      attributes: [
        {
          key: 'model',
          label: 'Versión',
          type: 'pill',
          options: [
            {
              key: 'dgt',
              label: 'S7 DGT',
              default: true,
              dgt: true,
              accentColors: ['#111315', '#1FACB2'],
              desc: '<strong>ROVORON S7</strong> en versión homologada: certificada por la DGT y limitada a 25 km/h. Doble motor de 2500 W (11.500 W de pico), batería de 84 V 37,1 Ah con celdas Samsung 21700 y hasta 140 km de autonomía.'
            },
            {
              key: 'libre',
              label: 'S7 NORMAL',
              dgt: false,
              accentColors: ['#111315', '#1FACB2'],
              desc: '<strong>ROVORON S7</strong> en versión libre: doble motor de 2500 W (11.500 W de pico), batería de 84 V 37,1 Ah con celdas Samsung 21700, hasta 140 km de autonomía y punta de más de 135 km/h. <strong>Sin homologación DGT</strong>: solo para circuito o recinto privado.'
            }
          ]
        }
      ],
      gallery: [
        { src: '/patinetes/rovoron/s7/img/1.webp', alt: 'ROVORON S7 vista 1' },
        { src: '/patinetes/rovoron/s7/img/2.webp', alt: 'ROVORON S7 vista 2' },
        { src: '/patinetes/rovoron/s7/img/3.webp', alt: 'ROVORON S7 vista 3' },
        { src: '/patinetes/rovoron/s7/img/4.webp', alt: 'ROVORON S7 vista 4' },
        { src: '/patinetes/rovoron/s7/img/5.webp', alt: 'ROVORON S7 vista 5' },
        { src: '/patinetes/rovoron/s7/img/6.webp', alt: 'ROVORON S7 vista 6' },
        { src: '/patinetes/rovoron/s7/img/7.webp', alt: 'ROVORON S7 vista 7' }
      ]
    },
    {
      id: 'thunder-3',
      filtros: { dgt: true, motores: 2, w: 5000, km: 125, kmh: 100, frenos: 'hidraulicos' },
      sku: 'DTT3',
      name: 'DUALTRON THUNDER 3',
      menuLabel: 'DUALTRON THUNDER 3',
      badgeText: 'DUALTRON THUNDER 3',
      brand: 'DUALTRON',
      series: 'dualtron',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '3399 €',
      compareAtPriceText: '3599 €',
      stock: 'in_stock',
      href: '/patinetes/dualtron/thunder-3/',
      image: '/patinetes/dualtron/thunder-3/img/1.webp',
      alt: 'Patinete eléctrico DUALTRON THUNDER 3',
      specs: ['2 x 2500 W (5000 W)', 'Hasta 125 km', '72 V 40 Ah'],
      homeOrder: 999,
      homeTitle: 'DUALTRON THUNDER 3 - Patinete eléctrico (DUALTRON)',
      homeAriaLabel: 'DUALTRON THUNDER 3 - DUALTRON',
      priceAriaLabel: 'Precio DUALTRON THUNDER 3',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      /* Linea de acento del panel, medida sobre la foto del producto. */
      accentColors: ['#111315', '#307A94'],
      /* Linea de acento del panel: negro a la izquierda y el color del
         patinete a la derecha (azul del chasis, percentil 75). Medido sobre su
         propia portada, no elegido a ojo. */
      accentColors: ['#111315', '#4D8BA3'],
      gallery: [
        { src: '/patinetes/dualtron/thunder-3/img/1.webp', alt: 'ROVORON S7 vista 1' },
        { src: '/patinetes/dualtron/thunder-3/img/2.webp', alt: 'ROVORON S7 vista 2' },
        { src: '/patinetes/dualtron/thunder-3/img/3.webp', alt: 'ROVORON S7 vista 3' },
        { src: '/patinetes/dualtron/thunder-3/img/4.webp', alt: 'ROVORON S7 vista 4' },
        { src: '/patinetes/dualtron/thunder-3/img/5.webp', alt: 'ROVORON S7 vista 5' }
      ]
    },
    {
      id: 'deimos-single',
      filtros: { dgt: true, motores: 1, w: 500, km: 40, kmh: 45, frenos: 'mecanicos' },
      sku: 'ECXDEIS',
      name: 'Ecoxtrem Deimos Single',
      menuLabel: 'Ecoxtrem Deimos Single',
      badgeText: 'Ecoxtrem Deimos Single',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '479 €',
      compareAtPriceText: '599 €',
      stock: 'in_stock',
      href: '/patinetes/ecoxtrem/deimos-single/',
      image: '/patinetes/ecoxtrem/deimos-single/img/1.webp',
      alt: 'Patinete eléctrico Ecoxtrem Deimos Single',
      specs: ['500 W trasero (1000 W pico)', 'Hasta 40 km', '48 V 15 Ah'],
      homeOrder: 999,
      homeTitle: 'Ecoxtrem Deimos Single - Patinete eléctrico (Ecoxtrem)',
      homeAriaLabel: 'Ecoxtrem Deimos Single - Ecoxtrem',
      priceAriaLabel: 'Precio Ecoxtrem Deimos Single',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      /* Linea de acento del panel, medida sobre la foto del producto. */
      accentColors: ['#111315', '#521F2F'],
      /* Linea de acento del panel: negro a la izquierda y el color del
         patinete a la derecha (naranja de la portada). Medido sobre su
         propia portada, no elegido a ojo. */
      accentColors: ['#111315', '#F36D17'],
      gallery: [
        { src: '/patinetes/ecoxtrem/deimos-single/img/1.webp', alt: 'DUALTRON THUNDER 3 vista 1' },
        { src: '/patinetes/ecoxtrem/deimos-single/img/2.webp', alt: 'DUALTRON THUNDER 3 vista 2' },
        { src: '/patinetes/ecoxtrem/deimos-single/img/3.webp', alt: 'DUALTRON THUNDER 3 vista 3' },
        { src: '/patinetes/ecoxtrem/deimos-single/img/4.webp', alt: 'DUALTRON THUNDER 3 vista 4' },
        { src: '/patinetes/ecoxtrem/deimos-single/img/5.webp', alt: 'DUALTRON THUNDER 3 vista 5' },
        { src: '/patinetes/ecoxtrem/deimos-single/img/6.webp', alt: 'DUALTRON THUNDER 3 vista 6' }
      ]
    },
    {
      id: 'deimos-dual',
      filtros: { dgt: true, motores: 2, w: 1000, km: 60, kmh: 45, frenos: 'mecanicos' },
      sku: 'ECXDEID',
      name: 'Ecoxtrem Deimos Dual',
      menuLabel: 'Ecoxtrem Deimos Dual',
      badgeText: 'Ecoxtrem Deimos Dual',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '625 €',
      compareAtPriceText: '649 €',
      stock: 'in_stock',
      href: '/patinetes/ecoxtrem/deimos-dual/',
      image: '/patinetes/ecoxtrem/deimos-dual/img/1.webp',
      alt: 'Patinete eléctrico Ecoxtrem Deimos Dual',
      specs: ['2 x 500 W (2000 W pico)', 'Hasta 60 km', '48 V 20 Ah'],
      homeOrder: 999,
      homeTitle: 'Ecoxtrem Deimos Dual - Patinete eléctrico (Ecoxtrem)',
      homeAriaLabel: 'Ecoxtrem Deimos Dual - Ecoxtrem',
      priceAriaLabel: 'Precio Ecoxtrem Deimos Dual',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      /* Linea de acento del panel: negro a la izquierda y el color del
         patinete a la derecha (amarillo de la portada, oscurecido para que se lea). Medido sobre su
         propia portada, no elegido a ojo. */
      accentColors: ['#111315', '#C8A500'],
            /* CUATRO COLORES, cada uno con su foto de estudio de la tienda oficial de
         Ecoxtrem (son las variaciones de su WooCommerce, no fotos recoloreadas).
         `images` apunta a una sola foto por color porque eso es lo que hay
         publicado; negro-rojo es la portada, así que abre con la 1 y se cumple
         la regla anti-FOUC. Los `swatch` están MEDIDOS sobre cada foto. */
      legacyKeyAxes: ['color'],
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'negro-rojo',  label: 'Negro y rojo', swatch: '#C3292D', default: true, images: [1] },
            { key: 'naranja',     label: 'Naranja',      swatch: '#F1710F', images: [2] },
            { key: 'amarillo',    label: 'Amarillo',     swatch: '#EFD115', images: [3] },
            { key: 'gris-verde',  label: 'Gris y verde', swatch: '#9FA817', images: [4] }
          ]
        }
      ],
gallery: [
        { src: '/patinetes/ecoxtrem/deimos-dual/img/1.webp', alt: 'Ecoxtrem Deimos Dual vista 1' },
        { src: '/patinetes/ecoxtrem/deimos-dual/img/2.webp', alt: 'Ecoxtrem Deimos Dual vista 2' },
        { src: '/patinetes/ecoxtrem/deimos-dual/img/3.webp', alt: 'Ecoxtrem Deimos Dual vista 3' },
        { src: '/patinetes/ecoxtrem/deimos-dual/img/4.webp', alt: 'Ecoxtrem Deimos Dual vista 4' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde la ficha oficial de ecoxtrem.com. Colores, fotos
         y datos técnicos son los suyos; los HEX de los círculos NO: los de su
         tienda son de una paleta genérica (marcaban «Turquesa #008080» un
         patinete azul cielo), así que cada uno está MEDIDO sobre la foto del
         propio color. Las fotos van agrupadas por color y cada opción declara
         las suyas, así que mover un círculo cambia la foto. */
      id: 'ecoxtrem-bison',
      filtros: { dgt: true, motores: 1, w: 800, km: 40, kmh: 25, frenos: null },
      sku: 'ECXBISON',
      name: 'Ecoxtrem Bison',
      menuLabel: 'Ecoxtrem Bison',
      badgeText: 'Ecoxtrem Bison',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '449 €',
      stock: 'in_stock',
      href: '/patinetes/ecoxtrem/bison/',
      image: '/patinetes/ecoxtrem/bison/img/3.webp',
      alt: 'Patinete eléctrico Ecoxtrem Bison',
      specs: ['800 W', 'Hasta 40 km', '48 V 13 Ah'],
      homeOrder: 6,
      homeTitle: 'Ecoxtrem Bison',
      homeAriaLabel: 'Ecoxtrem Bison — 800 W, hasta 40 km y 10 pulgadas',
      priceAriaLabel: 'Estado Ecoxtrem Bison',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'verde', label: 'Verde', swatch: '#86D146', default: true, images: [3, 1, 2, 4] },
            { key: 'negro', label: 'Negro', swatch: '#151515', images: [5, 6] },
            { key: 'rojo', label: 'Rojo', swatch: '#D5483C', images: [7, 8] },
            { key: 'azul', label: 'Azul', swatch: '#064D95', images: [9, 10] },
            { key: 'amarillo', label: 'Amarillo', swatch: '#DEC318', images: [11, 12] },
            { key: 'turquesa', label: 'Turquesa', swatch: '#39B4A7', images: [13, 14] },
            { key: 'lila', label: 'Lila', swatch: '#7B62A1', images: [15, 16] },
            { key: 'marfil', label: 'Blanco marfil', swatch: '#E8DCC0', images: [17, 18] },
            { key: 'negro-rojo', label: 'Negro y rojo', swatch: 'linear-gradient(135deg, #151515 50%, #C72817 50%)', images: [19, 20] }
          ]
        }
      ],
      gallery: [
        { src: '/patinetes/ecoxtrem/bison/img/1.webp', alt: 'Ecoxtrem Bison vista 1' },
        { src: '/patinetes/ecoxtrem/bison/img/2.webp', alt: 'Ecoxtrem Bison vista 2' },
        { src: '/patinetes/ecoxtrem/bison/img/3.webp', alt: 'Ecoxtrem Bison vista 3' },
        { src: '/patinetes/ecoxtrem/bison/img/4.webp', alt: 'Ecoxtrem Bison vista 4' },
        { src: '/patinetes/ecoxtrem/bison/img/5.webp', alt: 'Ecoxtrem Bison vista 5' },
        { src: '/patinetes/ecoxtrem/bison/img/6.webp', alt: 'Ecoxtrem Bison vista 6' },
        { src: '/patinetes/ecoxtrem/bison/img/7.webp', alt: 'Ecoxtrem Bison vista 7' },
        { src: '/patinetes/ecoxtrem/bison/img/8.webp', alt: 'Ecoxtrem Bison vista 8' },
        { src: '/patinetes/ecoxtrem/bison/img/9.webp', alt: 'Ecoxtrem Bison vista 9' },
        { src: '/patinetes/ecoxtrem/bison/img/10.webp', alt: 'Ecoxtrem Bison vista 10' },
        { src: '/patinetes/ecoxtrem/bison/img/11.webp', alt: 'Ecoxtrem Bison vista 11' },
        { src: '/patinetes/ecoxtrem/bison/img/12.webp', alt: 'Ecoxtrem Bison vista 12' },
        { src: '/patinetes/ecoxtrem/bison/img/13.webp', alt: 'Ecoxtrem Bison vista 13' },
        { src: '/patinetes/ecoxtrem/bison/img/14.webp', alt: 'Ecoxtrem Bison vista 14' },
        { src: '/patinetes/ecoxtrem/bison/img/15.webp', alt: 'Ecoxtrem Bison vista 15' },
        { src: '/patinetes/ecoxtrem/bison/img/16.webp', alt: 'Ecoxtrem Bison vista 16' },
        { src: '/patinetes/ecoxtrem/bison/img/17.webp', alt: 'Ecoxtrem Bison vista 17' },
        { src: '/patinetes/ecoxtrem/bison/img/18.webp', alt: 'Ecoxtrem Bison vista 18' },
        { src: '/patinetes/ecoxtrem/bison/img/19.webp', alt: 'Ecoxtrem Bison vista 19' },
        { src: '/patinetes/ecoxtrem/bison/img/20.webp', alt: 'Ecoxtrem Bison vista 20' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde la ficha oficial de ecoxtrem.com. Colores, fotos
         y datos técnicos son los suyos; los HEX de los círculos NO: los de su
         tienda son de una paleta genérica (marcaban «Turquesa #008080» un
         patinete azul cielo), así que cada uno está MEDIDO sobre la foto del
         propio color. Las fotos van agrupadas por color y cada opción declara
         las suyas, así que mover un círculo cambia la foto. */
      id: 'ecoxtrem-vortex',
      filtros: { dgt: true, motores: 1, w: 1000, km: 40, kmh: 50, frenos: 'mecanicos' },
      sku: 'ECXVORTEX',
      name: 'ETRIC Vortex',
      menuLabel: 'ETRIC Vortex',
      badgeText: 'ETRIC Vortex',
      brand: 'ETRIC',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '745 €',
      stock: 'in_stock',
      href: '/patinetes/ecoxtrem/vortex/',
      image: '/patinetes/ecoxtrem/vortex/img/1.webp',
      alt: 'Patinete eléctrico ETRIC Vortex',
      specs: ['1000 W', 'Hasta 40 km', '48 V 15 Ah'],
      homeOrder: 7,
      homeTitle: 'ETRIC Vortex',
      homeAriaLabel: 'ETRIC Vortex — 1000 W, hasta 40 km y suspensión completa',
      priceAriaLabel: 'Estado ETRIC Vortex',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'gris', label: 'Gris', swatch: '#5A6B70', default: true, images: [1, 2] },
            { key: 'negro', label: 'Negro', swatch: '#151515', images: [3, 4] },
            { key: 'azul', label: 'Azul', swatch: '#0634C5', images: [5] },
            { key: 'amarillo', label: 'Amarillo', swatch: '#D5A625', images: [6] },
            { key: 'plata', label: 'Plata', swatch: '#C4C7CB', images: [7, 8] },
            { key: 'turquesa', label: 'Turquesa', swatch: '#7AC6DB', images: [9, 10] },
            { key: 'marfil', label: 'Blanco marfil', swatch: '#E4D9C3', images: [11, 12] }
          ]
        }
      ],
      gallery: [
        { src: '/patinetes/ecoxtrem/vortex/img/1.webp', alt: 'ETRIC Vortex vista 1' },
        { src: '/patinetes/ecoxtrem/vortex/img/2.webp', alt: 'ETRIC Vortex vista 2' },
        { src: '/patinetes/ecoxtrem/vortex/img/3.webp', alt: 'ETRIC Vortex vista 3' },
        { src: '/patinetes/ecoxtrem/vortex/img/4.webp', alt: 'ETRIC Vortex vista 4' },
        { src: '/patinetes/ecoxtrem/vortex/img/5.webp', alt: 'ETRIC Vortex vista 5' },
        { src: '/patinetes/ecoxtrem/vortex/img/6.webp', alt: 'ETRIC Vortex vista 6' },
        { src: '/patinetes/ecoxtrem/vortex/img/7.webp', alt: 'ETRIC Vortex vista 7' },
        { src: '/patinetes/ecoxtrem/vortex/img/8.webp', alt: 'ETRIC Vortex vista 8' },
        { src: '/patinetes/ecoxtrem/vortex/img/9.webp', alt: 'ETRIC Vortex vista 9' },
        { src: '/patinetes/ecoxtrem/vortex/img/10.webp', alt: 'ETRIC Vortex vista 10' },
        { src: '/patinetes/ecoxtrem/vortex/img/11.webp', alt: 'ETRIC Vortex vista 11' },
        { src: '/patinetes/ecoxtrem/vortex/img/12.webp', alt: 'ETRIC Vortex vista 12' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde la ficha oficial de ecoxtrem.com. Colores, fotos
         y datos técnicos son los suyos; los HEX de los círculos NO: los de su
         tienda son de una paleta genérica (marcaban «Turquesa #008080» un
         patinete azul cielo), así que cada uno está MEDIDO sobre la foto del
         propio color. Las fotos van agrupadas por color y cada opción declara
         las suyas, así que mover un círculo cambia la foto. */
      id: 'ecoxtrem-xanzer',
      filtros: { dgt: true, motores: 2, w: 1000, km: 55, kmh: 70, frenos: 'mecanicos' },
      sku: 'ECXXANZER',
      name: 'Ecoxtrem M41 Tank Xanzer',
      menuLabel: 'Ecoxtrem M41 Tank Xanzer',
      badgeText: 'Ecoxtrem M41 Tank Xanzer',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '1103,08 €',
      stock: 'in_stock',
      href: '/patinetes/ecoxtrem/xanzer/',
      image: '/patinetes/ecoxtrem/xanzer/img/1.webp',
      alt: 'Patinete eléctrico Ecoxtrem M41 Tank Xanzer',
      specs: ['2 x 500 W (1600 W pico)', 'Hasta 55 km', '52 V 20 Ah'],
      homeOrder: 8,
      homeTitle: 'Ecoxtrem M41 Tank Xanzer',
      homeAriaLabel: 'Ecoxtrem M41 Tank Xanzer — 2 x 500 W, hasta 55 km y doble suspensión',
      priceAriaLabel: 'Estado Ecoxtrem M41 Tank Xanzer',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'negro', label: 'Negro', swatch: '#151515', default: true, images: [1, 2] }
          ]
        }
      ],
      gallery: [
        { src: '/patinetes/ecoxtrem/xanzer/img/1.webp', alt: 'Ecoxtrem M41 Tank Xanzer vista 1' },
        { src: '/patinetes/ecoxtrem/xanzer/img/2.webp', alt: 'Ecoxtrem M41 Tank Xanzer vista 2' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde la ficha oficial de ecoxtrem.com. Colores, fotos
         y datos técnicos son los suyos; los HEX de los círculos NO: los de su
         tienda son de una paleta genérica (marcaban «Turquesa #008080» un
         patinete azul cielo), así que cada uno está MEDIDO sobre la foto del
         propio color. Las fotos van agrupadas por color y cada opción declara
         las suyas, así que mover un círculo cambia la foto. */
      id: 'ecoxtrem-linear',
      filtros: { dgt: true, motores: 1, w: 350, km: 25, kmh: 25, frenos: null },
      sku: 'ECXLINEAR',
      name: 'Ecoxtrem Linear',
      menuLabel: 'Ecoxtrem Linear',
      badgeText: 'Ecoxtrem Linear',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '265 €',
      stock: 'in_stock',
      href: '/patinetes/ecoxtrem/linear/',
      image: '/patinetes/ecoxtrem/linear/img/1.webp',
      alt: 'Patinete eléctrico Ecoxtrem Linear',
      specs: ['350 W brushless', 'Hasta 25 km', '36 V 7,8 Ah'],
      homeOrder: 9,
      homeTitle: 'Ecoxtrem Linear',
      homeAriaLabel: 'Ecoxtrem Linear — 350 W, hasta 25 km y 18 kg',
      priceAriaLabel: 'Estado Ecoxtrem Linear',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'negro', label: 'Negro', swatch: '#151515', default: true, images: [1, 2] },
            { key: 'camel', label: 'Camel', swatch: '#CCA578', images: [3, 4] },
            { key: 'lima', label: 'Lima', swatch: '#C4D644', images: [5, 6] }
          ]
        }
      ],
      gallery: [
        { src: '/patinetes/ecoxtrem/linear/img/1.webp', alt: 'Ecoxtrem Linear vista 1' },
        { src: '/patinetes/ecoxtrem/linear/img/2.webp', alt: 'Ecoxtrem Linear vista 2' },
        { src: '/patinetes/ecoxtrem/linear/img/3.webp', alt: 'Ecoxtrem Linear vista 3' },
        { src: '/patinetes/ecoxtrem/linear/img/4.webp', alt: 'Ecoxtrem Linear vista 4' },
        { src: '/patinetes/ecoxtrem/linear/img/5.webp', alt: 'Ecoxtrem Linear vista 5' },
        { src: '/patinetes/ecoxtrem/linear/img/6.webp', alt: 'Ecoxtrem Linear vista 6' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde la ficha oficial de ecoxtrem.com. Colores, fotos
         y datos técnicos son los suyos; los HEX de los círculos NO: los de su
         tienda son de una paleta genérica (marcaban «Turquesa #008080» un
         patinete azul cielo), así que cada uno está MEDIDO sobre la foto del
         propio color. Las fotos van agrupadas por color y cada opción declara
         las suyas, así que mover un círculo cambia la foto. */
      id: 'ecoxtrem-delta',
      filtros: { dgt: false, motores: 2, w: 4000, km: 70, kmh: 80, frenos: 'mecanicos' },
      sku: 'ECXDELTA',
      name: 'Ecoxtrem Delta 4000W',
      menuLabel: 'Ecoxtrem Delta 4000W',
      badgeText: 'Ecoxtrem Delta 4000W',
      brand: 'Ecoxtrem',
      series: 'ecoxtrem',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '2340 €',
      stock: 'in_stock',
      href: '/patinetes/ecoxtrem/delta/',
      image: '/patinetes/ecoxtrem/delta/img/1.webp',
      alt: 'Patinete eléctrico Ecoxtrem Delta 4000W',
      specs: ['4000 W (2 x 2000 W)', 'Hasta 70 km', '60 V 28 Ah'],
      homeOrder: 10,
      homeTitle: 'Ecoxtrem Delta 4000W',
      homeAriaLabel: 'Ecoxtrem Delta 4000W — 4000 W, hasta 70 km y neumáticos de 8 pulgadas',
      priceAriaLabel: 'Estado Ecoxtrem Delta 4000W',
      attributes: [
        {
          key: 'color',
          label: 'Color',
          type: 'swatch',
          options: [
            { key: 'naranja', label: 'Naranja', swatch: '#EB7D39', default: true, images: [1, 2] },
            { key: 'azul', label: 'Azul', swatch: '#2F70E2', images: [3, 4] },
            { key: 'amarillo', label: 'Amarillo', swatch: '#E6D03A', images: [5, 6] }
          ]
        }
      ],
      gallery: [
        { src: '/patinetes/ecoxtrem/delta/img/1.webp', alt: 'Ecoxtrem Delta 4000W vista 1' },
        { src: '/patinetes/ecoxtrem/delta/img/2.webp', alt: 'Ecoxtrem Delta 4000W vista 2' },
        { src: '/patinetes/ecoxtrem/delta/img/3.webp', alt: 'Ecoxtrem Delta 4000W vista 3' },
        { src: '/patinetes/ecoxtrem/delta/img/4.webp', alt: 'Ecoxtrem Delta 4000W vista 4' },
        { src: '/patinetes/ecoxtrem/delta/img/5.webp', alt: 'Ecoxtrem Delta 4000W vista 5' },
        { src: '/patinetes/ecoxtrem/delta/img/6.webp', alt: 'Ecoxtrem Delta 4000W vista 6' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde kukirin.es, el distribuidor oficial. Sus fichas
         son productos SIMPLES: no tienen variantes de color, así que este
         producto no declara `attributes` y su ficha va sin selector.
         SIN sello DGT: ninguno de los doce declara homologación en su web. */
      id: 'k-m4-max',
      filtros: { dgt: true, motores: 1, w: 800, km: 64, kmh: 45, frenos: null },
      sku: 'KM4MAX',
      name: 'KUKIRIN M4 Max',
      menuLabel: 'KUKIRIN M4 Max',
      badgeText: 'KUKIRIN M4 Max',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '427 €',
      stock: 'in_stock',
      href: '/patinetes/series-k/m4-max/',
      image: '/patinetes/series-k/m4-max/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN M4 Max',
      specs: ['800 W (1000 W pico)', 'Hasta 64 km', '48 V 18,2 Ah'],
      homeOrder: 4,
      homeTitle: 'KUKIRIN M4 Max',
      homeAriaLabel: 'KUKIRIN M4 Max — 800 W (1000 W pico), Hasta 64 km, 48 V 18,2 Ah',
      priceAriaLabel: 'Estado KUKIRIN M4 Max',
      gallery: [
        { src: '/patinetes/series-k/m4-max/img/1.webp', alt: 'KUKIRIN M4 Max vista 1' },
        { src: '/patinetes/series-k/m4-max/img/2.webp', alt: 'KUKIRIN M4 Max vista 2' },
        { src: '/patinetes/series-k/m4-max/img/3.webp', alt: 'KUKIRIN M4 Max vista 3' },
        { src: '/patinetes/series-k/m4-max/img/4.webp', alt: 'KUKIRIN M4 Max vista 4' },
        { src: '/patinetes/series-k/m4-max/img/5.webp', alt: 'KUKIRIN M4 Max vista 5' },
        { src: '/patinetes/series-k/m4-max/img/6.webp', alt: 'KUKIRIN M4 Max vista 6' },
        { src: '/patinetes/series-k/m4-max/img/7.webp', alt: 'KUKIRIN M4 Max vista 7' },
        { src: '/patinetes/series-k/m4-max/img/8.webp', alt: 'KUKIRIN M4 Max vista 8' },
        { src: '/patinetes/series-k/m4-max/img/9.webp', alt: 'KUKIRIN M4 Max vista 9' },
        { src: '/patinetes/series-k/m4-max/img/10.webp', alt: 'KUKIRIN M4 Max vista 10' },
        { src: '/patinetes/series-k/m4-max/img/11.webp', alt: 'KUKIRIN M4 Max vista 11' },
        { src: '/patinetes/series-k/m4-max/img/12.webp', alt: 'KUKIRIN M4 Max vista 12' },
        { src: '/patinetes/series-k/m4-max/img/13.webp', alt: 'KUKIRIN M4 Max vista 13' },
        { src: '/patinetes/series-k/m4-max/img/14.webp', alt: 'KUKIRIN M4 Max vista 14' },
        { src: '/patinetes/series-k/m4-max/img/15.webp', alt: 'KUKIRIN M4 Max vista 15' },
        { src: '/patinetes/series-k/m4-max/img/16.webp', alt: 'KUKIRIN M4 Max vista 16' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde kukirin.es, el distribuidor oficial. Sus fichas
         son productos SIMPLES: no tienen variantes de color, así que este
         producto no declara `attributes` y su ficha va sin selector.
         SIN sello DGT: ninguno de los doce declara homologación en su web. */
      id: 'k-t3',
      filtros: { dgt: true, motores: 1, w: 800, km: 58, kmh: 45, frenos: 'mecanicos' },
      sku: 'KT3',
      name: 'KUKIRIN T3',
      menuLabel: 'KUKIRIN T3',
      badgeText: 'KUKIRIN T3',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '516 €',
      stock: 'in_stock',
      href: '/patinetes/series-k/t3/',
      image: '/patinetes/series-k/t3/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN T3',
      specs: ['800 W (1000 W pico)', 'Hasta 58 km', '48 V 15,6 Ah'],
      homeOrder: 5,
      homeTitle: 'KUKIRIN T3',
      homeAriaLabel: 'KUKIRIN T3 — 800 W (1000 W pico), Hasta 58 km, 48 V 15,6 Ah',
      priceAriaLabel: 'Estado KUKIRIN T3',
      gallery: [
        { src: '/patinetes/series-k/t3/img/1.webp', alt: 'KUKIRIN T3 vista 1' },
        { src: '/patinetes/series-k/t3/img/2.webp', alt: 'KUKIRIN T3 vista 2' },
        { src: '/patinetes/series-k/t3/img/3.webp', alt: 'KUKIRIN T3 vista 3' },
        { src: '/patinetes/series-k/t3/img/4.webp', alt: 'KUKIRIN T3 vista 4' },
        { src: '/patinetes/series-k/t3/img/5.webp', alt: 'KUKIRIN T3 vista 5' },
        { src: '/patinetes/series-k/t3/img/6.webp', alt: 'KUKIRIN T3 vista 6' },
        { src: '/patinetes/series-k/t3/img/7.webp', alt: 'KUKIRIN T3 vista 7' },
        { src: '/patinetes/series-k/t3/img/8.webp', alt: 'KUKIRIN T3 vista 8' },
        { src: '/patinetes/series-k/t3/img/9.webp', alt: 'KUKIRIN T3 vista 9' },
        { src: '/patinetes/series-k/t3/img/10.webp', alt: 'KUKIRIN T3 vista 10' },
        { src: '/patinetes/series-k/t3/img/11.webp', alt: 'KUKIRIN T3 vista 11' },
        { src: '/patinetes/series-k/t3/img/12.webp', alt: 'KUKIRIN T3 vista 12' },
        { src: '/patinetes/series-k/t3/img/13.webp', alt: 'KUKIRIN T3 vista 13' },
        { src: '/patinetes/series-k/t3/img/14.webp', alt: 'KUKIRIN T3 vista 14' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde kukirin.es, el distribuidor oficial. Sus fichas
         son productos SIMPLES: no tienen variantes de color, así que este
         producto no declara `attributes` y su ficha va sin selector.
         SIN sello DGT: ninguno de los doce declara homologación en su web. */
      id: 'k-a1',
      filtros: { dgt: true, motores: 1, w: 800, km: 45, kmh: 45, frenos: 'mecanicos' },
      sku: 'KA1',
      name: 'KUKIRIN A1',
      menuLabel: 'KUKIRIN A1',
      badgeText: 'KUKIRIN A1',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '427 €',
      stock: 'in_stock',
      href: '/patinetes/series-k/a1/',
      image: '/patinetes/series-k/a1/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN A1',
      specs: ['800 W', 'Hasta 45 km', '48 V 13 Ah'],
      homeOrder: 6,
      homeTitle: 'KUKIRIN A1',
      homeAriaLabel: 'KUKIRIN A1 — 800 W, Hasta 45 km, 48 V 13 Ah',
      priceAriaLabel: 'Estado KUKIRIN A1',
      gallery: [
        { src: '/patinetes/series-k/a1/img/1.webp', alt: 'KUKIRIN A1 vista 1' },
        { src: '/patinetes/series-k/a1/img/2.webp', alt: 'KUKIRIN A1 vista 2' },
        { src: '/patinetes/series-k/a1/img/3.webp', alt: 'KUKIRIN A1 vista 3' },
        { src: '/patinetes/series-k/a1/img/4.webp', alt: 'KUKIRIN A1 vista 4' },
        { src: '/patinetes/series-k/a1/img/5.webp', alt: 'KUKIRIN A1 vista 5' },
        { src: '/patinetes/series-k/a1/img/6.webp', alt: 'KUKIRIN A1 vista 6' },
        { src: '/patinetes/series-k/a1/img/7.webp', alt: 'KUKIRIN A1 vista 7' },
        { src: '/patinetes/series-k/a1/img/8.webp', alt: 'KUKIRIN A1 vista 8' },
        { src: '/patinetes/series-k/a1/img/9.webp', alt: 'KUKIRIN A1 vista 9' },
        { src: '/patinetes/series-k/a1/img/10.webp', alt: 'KUKIRIN A1 vista 10' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde kukirin.es, el distribuidor oficial. Sus fichas
         son productos SIMPLES: no tienen variantes de color, así que este
         producto no declara `attributes` y su ficha va sin selector.
         SIN sello DGT: ninguno de los doce declara homologación en su web. */
      id: 'k-g2-max',
      filtros: { dgt: true, motores: 1, w: 1000, km: 80, kmh: 55, frenos: null },
      sku: 'KG2MAX',
      name: 'KUKIRIN G2 Max',
      menuLabel: 'KUKIRIN G2 Max',
      badgeText: 'KUKIRIN G2 Max',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '677 €',
      stock: 'in_stock',
      href: '/patinetes/series-k/g2-max/',
      image: '/patinetes/series-k/g2-max/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN G2 Max',
      specs: ['1000 W (1200 W pico)', 'Hasta 80 km', '48 V 20 Ah'],
      homeOrder: 10,
      homeTitle: 'KUKIRIN G2 Max',
      homeAriaLabel: 'KUKIRIN G2 Max — 1000 W (1200 W pico), Hasta 80 km, 48 V 20 Ah',
      priceAriaLabel: 'Estado KUKIRIN G2 Max',
      gallery: [
        { src: '/patinetes/series-k/g2-max/img/1.webp', alt: 'KUKIRIN G2 Max vista 1' },
        { src: '/patinetes/series-k/g2-max/img/2.webp', alt: 'KUKIRIN G2 Max vista 2' },
        { src: '/patinetes/series-k/g2-max/img/3.webp', alt: 'KUKIRIN G2 Max vista 3' },
        { src: '/patinetes/series-k/g2-max/img/4.webp', alt: 'KUKIRIN G2 Max vista 4' },
        { src: '/patinetes/series-k/g2-max/img/5.webp', alt: 'KUKIRIN G2 Max vista 5' },
        { src: '/patinetes/series-k/g2-max/img/6.webp', alt: 'KUKIRIN G2 Max vista 6' },
        { src: '/patinetes/series-k/g2-max/img/7.webp', alt: 'KUKIRIN G2 Max vista 7' },
        { src: '/patinetes/series-k/g2-max/img/8.webp', alt: 'KUKIRIN G2 Max vista 8' },
        { src: '/patinetes/series-k/g2-max/img/9.webp', alt: 'KUKIRIN G2 Max vista 9' },
        { src: '/patinetes/series-k/g2-max/img/10.webp', alt: 'KUKIRIN G2 Max vista 10' },
        { src: '/patinetes/series-k/g2-max/img/11.webp', alt: 'KUKIRIN G2 Max vista 11' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde kukirin.es, el distribuidor oficial. Sus fichas
         son productos SIMPLES: no tienen variantes de color, así que este
         producto no declara `attributes` y su ficha va sin selector.
         SIN sello DGT: ninguno de los doce declara homologación en su web. */
      id: 'k-c1-pro',
      filtros: { dgt: true, motores: 1, w: 500, km: 100, kmh: 45, frenos: null },
      sku: 'KC1PRO',
      name: 'KUKIRIN C1 Pro',
      menuLabel: 'KUKIRIN C1 Pro',
      badgeText: 'KUKIRIN C1 Pro',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '567 €',
      stock: 'in_stock',
      href: '/patinetes/series-k/c1-pro/',
      image: '/patinetes/series-k/c1-pro/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN C1 Pro',
      specs: ['500 W', 'Hasta 100 km', '48 V 25 Ah'],
      homeOrder: 11,
      homeTitle: 'KUKIRIN C1 Pro',
      homeAriaLabel: 'KUKIRIN C1 Pro — 500 W, Hasta 100 km, 48 V 25 Ah',
      priceAriaLabel: 'Estado KUKIRIN C1 Pro',
      gallery: [
        { src: '/patinetes/series-k/c1-pro/img/1.webp', alt: 'KUKIRIN C1 Pro vista 1' },
        { src: '/patinetes/series-k/c1-pro/img/2.webp', alt: 'KUKIRIN C1 Pro vista 2' },
        { src: '/patinetes/series-k/c1-pro/img/3.webp', alt: 'KUKIRIN C1 Pro vista 3' },
        { src: '/patinetes/series-k/c1-pro/img/4.webp', alt: 'KUKIRIN C1 Pro vista 4' },
        { src: '/patinetes/series-k/c1-pro/img/5.webp', alt: 'KUKIRIN C1 Pro vista 5' },
        { src: '/patinetes/series-k/c1-pro/img/6.webp', alt: 'KUKIRIN C1 Pro vista 6' },
        { src: '/patinetes/series-k/c1-pro/img/7.webp', alt: 'KUKIRIN C1 Pro vista 7' },
        { src: '/patinetes/series-k/c1-pro/img/8.webp', alt: 'KUKIRIN C1 Pro vista 8' },
        { src: '/patinetes/series-k/c1-pro/img/9.webp', alt: 'KUKIRIN C1 Pro vista 9' },
        { src: '/patinetes/series-k/c1-pro/img/10.webp', alt: 'KUKIRIN C1 Pro vista 10' },
        { src: '/patinetes/series-k/c1-pro/img/11.webp', alt: 'KUKIRIN C1 Pro vista 11' },
        { src: '/patinetes/series-k/c1-pro/img/12.webp', alt: 'KUKIRIN C1 Pro vista 12' },
        { src: '/patinetes/series-k/c1-pro/img/13.webp', alt: 'KUKIRIN C1 Pro vista 13' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde kukirin.es, el distribuidor oficial. Sus fichas
         son productos SIMPLES: no tienen variantes de color, así que este
         producto no declara `attributes` y su ficha va sin selector.
         SIN sello DGT: ninguno de los doce declara homologación en su web. */
      id: 'k-g3-pro',
      filtros: { dgt: true, motores: 2, w: 2400, km: 80, kmh: 65, frenos: null },
      sku: 'KG3PRO',
      name: 'KUKIRIN G3 Pro',
      menuLabel: 'KUKIRIN G3 Pro',
      badgeText: 'KUKIRIN G3 Pro',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '1197 €',
      stock: 'in_stock',
      href: '/patinetes/series-k/g3-pro/',
      image: '/patinetes/series-k/g3-pro/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN G3 Pro',
      specs: ['2 x 1200 W', 'Hasta 80 km', '52 V 23,2 Ah'],
      homeOrder: 12,
      homeTitle: 'KUKIRIN G3 Pro',
      homeAriaLabel: 'KUKIRIN G3 Pro — 2 x 1200 W, Hasta 80 km, 52 V 23,2 Ah',
      priceAriaLabel: 'Estado KUKIRIN G3 Pro',
      gallery: [
        { src: '/patinetes/series-k/g3-pro/img/1.webp', alt: 'KUKIRIN G3 Pro vista 1' },
        { src: '/patinetes/series-k/g3-pro/img/2.webp', alt: 'KUKIRIN G3 Pro vista 2' },
        { src: '/patinetes/series-k/g3-pro/img/3.webp', alt: 'KUKIRIN G3 Pro vista 3' },
        { src: '/patinetes/series-k/g3-pro/img/4.webp', alt: 'KUKIRIN G3 Pro vista 4' },
        { src: '/patinetes/series-k/g3-pro/img/5.webp', alt: 'KUKIRIN G3 Pro vista 5' },
        { src: '/patinetes/series-k/g3-pro/img/6.webp', alt: 'KUKIRIN G3 Pro vista 6' },
        { src: '/patinetes/series-k/g3-pro/img/7.webp', alt: 'KUKIRIN G3 Pro vista 7' },
        { src: '/patinetes/series-k/g3-pro/img/8.webp', alt: 'KUKIRIN G3 Pro vista 8' },
        { src: '/patinetes/series-k/g3-pro/img/9.webp', alt: 'KUKIRIN G3 Pro vista 9' },
        { src: '/patinetes/series-k/g3-pro/img/10.webp', alt: 'KUKIRIN G3 Pro vista 10' },
        { src: '/patinetes/series-k/g3-pro/img/11.webp', alt: 'KUKIRIN G3 Pro vista 11' },
        { src: '/patinetes/series-k/g3-pro/img/12.webp', alt: 'KUKIRIN G3 Pro vista 12' },
        { src: '/patinetes/series-k/g3-pro/img/13.webp', alt: 'KUKIRIN G3 Pro vista 13' },
        { src: '/patinetes/series-k/g3-pro/img/14.webp', alt: 'KUKIRIN G3 Pro vista 14' },
        { src: '/patinetes/series-k/g3-pro/img/15.webp', alt: 'KUKIRIN G3 Pro vista 15' },
        { src: '/patinetes/series-k/g3-pro/img/16.webp', alt: 'KUKIRIN G3 Pro vista 16' },
        { src: '/patinetes/series-k/g3-pro/img/17.webp', alt: 'KUKIRIN G3 Pro vista 17' },
        { src: '/patinetes/series-k/g3-pro/img/18.webp', alt: 'KUKIRIN G3 Pro vista 18' },
        { src: '/patinetes/series-k/g3-pro/img/19.webp', alt: 'KUKIRIN G3 Pro vista 19' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde kukirin.es, el distribuidor oficial. Sus fichas
         son productos SIMPLES: no tienen variantes de color, así que este
         producto no declara `attributes` y su ficha va sin selector.
         SIN sello DGT: ninguno de los doce declara homologación en su web. */
      id: 'k-c1',
      filtros: { dgt: true, motores: 1, w: 350, km: 40, kmh: 25, frenos: null },
      sku: 'KC1',
      name: 'KUKIRIN C1',
      menuLabel: 'KUKIRIN C1',
      badgeText: 'KUKIRIN C1',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '527 €',
      stock: 'in_stock',
      href: '/patinetes/series-k/c1/',
      image: '/patinetes/series-k/c1/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN C1',
      specs: ['350 W', 'Hasta 40 km', '48 V 15 Ah'],
      homeOrder: 13,
      homeTitle: 'KUKIRIN C1',
      homeAriaLabel: 'KUKIRIN C1 — 350 W, Hasta 40 km, 48 V 15 Ah',
      priceAriaLabel: 'Estado KUKIRIN C1',
      gallery: [
        { src: '/patinetes/series-k/c1/img/1.webp', alt: 'KUKIRIN C1 vista 1' },
        { src: '/patinetes/series-k/c1/img/2.webp', alt: 'KUKIRIN C1 vista 2' },
        { src: '/patinetes/series-k/c1/img/3.webp', alt: 'KUKIRIN C1 vista 3' },
        { src: '/patinetes/series-k/c1/img/4.webp', alt: 'KUKIRIN C1 vista 4' },
        { src: '/patinetes/series-k/c1/img/5.webp', alt: 'KUKIRIN C1 vista 5' },
        { src: '/patinetes/series-k/c1/img/6.webp', alt: 'KUKIRIN C1 vista 6' },
        { src: '/patinetes/series-k/c1/img/7.webp', alt: 'KUKIRIN C1 vista 7' },
        { src: '/patinetes/series-k/c1/img/8.webp', alt: 'KUKIRIN C1 vista 8' },
        { src: '/patinetes/series-k/c1/img/9.webp', alt: 'KUKIRIN C1 vista 9' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde kukirin.es, el distribuidor oficial. Sus fichas
         son productos SIMPLES: no tienen variantes de color, así que este
         producto no declara `attributes` y su ficha va sin selector.
         SIN sello DGT: ninguno de los doce declara homologación en su web. */
      id: 'k-m5-pro',
      filtros: { dgt: true, motores: 1, w: 1000, km: 70, kmh: 50, frenos: null },
      sku: 'KM5PRO',
      name: 'KUKIRIN M5 Pro',
      menuLabel: 'KUKIRIN M5 Pro',
      badgeText: 'KUKIRIN M5 Pro',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '827 €',
      stock: 'in_stock',
      href: '/patinetes/series-k/m5-pro/',
      image: '/patinetes/series-k/m5-pro/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN M5 Pro',
      specs: ['1000 W', 'Hasta 70 km', '48 V 20 Ah'],
      homeOrder: 14,
      homeTitle: 'KUKIRIN M5 Pro',
      homeAriaLabel: 'KUKIRIN M5 Pro — 1000 W, Hasta 70 km, 48 V 20 Ah',
      priceAriaLabel: 'Estado KUKIRIN M5 Pro',
      gallery: [
        { src: '/patinetes/series-k/m5-pro/img/1.webp', alt: 'KUKIRIN M5 Pro vista 1' },
        { src: '/patinetes/series-k/m5-pro/img/2.webp', alt: 'KUKIRIN M5 Pro vista 2' },
        { src: '/patinetes/series-k/m5-pro/img/3.webp', alt: 'KUKIRIN M5 Pro vista 3' },
        { src: '/patinetes/series-k/m5-pro/img/4.webp', alt: 'KUKIRIN M5 Pro vista 4' },
        { src: '/patinetes/series-k/m5-pro/img/5.webp', alt: 'KUKIRIN M5 Pro vista 5' },
        { src: '/patinetes/series-k/m5-pro/img/6.webp', alt: 'KUKIRIN M5 Pro vista 6' },
        { src: '/patinetes/series-k/m5-pro/img/7.webp', alt: 'KUKIRIN M5 Pro vista 7' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde joyorscooter.com (Shopify). Producto SIMPLE: una
         sola variante, sin colores, así que no declara `attributes` y su ficha
         va sin selector. Los datos técnicos salen del TÍTULO de origen —que en
         su tienda es una ficha en miniatura— y del bloque de especificaciones
         de la página; el cuerpo es prosa comercial y no es fiable para cifras. */
      id: 'joyor-t6d',
      filtros: { dgt: true, motores: 1, w: 500, km: 55, kmh: 25, frenos: null },
      sku: 'JT6D',
      name: 'JOYOR T6D',
      menuLabel: 'JOYOR T6D',
      badgeText: 'JOYOR T6D',
      brand: 'JOYOR',
      series: 'joyor',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '657 €',
      stock: 'in_stock',
      href: '/patinetes/joyor/t6d/',
      image: '/patinetes/joyor/t6d/img/1.webp',
      alt: 'Patinete eléctrico JOYOR T6D',
      specs: ['500 W', 'Hasta 55 km', '48 V 18 Ah'],
      homeOrder: 2,
      homeTitle: 'JOYOR T6D',
      homeAriaLabel: 'JOYOR T6D — 500 W, Hasta 55 km, 48 V 18 Ah',
      priceAriaLabel: 'Estado JOYOR T6D',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/joyor/t6d/img/1.webp', alt: 'JOYOR T6D vista 1' },
        { src: '/patinetes/joyor/t6d/img/2.webp', alt: 'JOYOR T6D vista 2' },
        { src: '/patinetes/joyor/t6d/img/3.webp', alt: 'JOYOR T6D vista 3' },
        { src: '/patinetes/joyor/t6d/img/4.webp', alt: 'JOYOR T6D vista 4' },
        { src: '/patinetes/joyor/t6d/img/5.webp', alt: 'JOYOR T6D vista 5' },
        { src: '/patinetes/joyor/t6d/img/6.webp', alt: 'JOYOR T6D vista 6' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde joyorscooter.com (Shopify). Producto SIMPLE: una
         sola variante, sin colores, así que no declara `attributes` y su ficha
         va sin selector. Los datos técnicos salen del TÍTULO de origen —que en
         su tienda es una ficha en miniatura— y del bloque de especificaciones
         de la página; el cuerpo es prosa comercial y no es fiable para cifras. */
      id: 'joyor-litego',
      filtros: { dgt: true, motores: 1, w: 650, km: 45, kmh: 25, frenos: 'mecanicos' },
      sku: 'JLITEGO',
      name: 'JOYOR LiteGo',
      menuLabel: 'JOYOR LiteGo',
      badgeText: 'JOYOR LiteGo',
      brand: 'JOYOR',
      series: 'joyor',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '427 €',
      stock: 'in_stock',
      href: '/patinetes/joyor/litego/',
      image: '/patinetes/joyor/litego/img/1.webp',
      alt: 'Patinete eléctrico JOYOR LiteGo',
      specs: ['650 W', 'Hasta 45 km', '36 V 13 Ah'],
      homeOrder: 5,
      homeTitle: 'JOYOR LiteGo',
      homeAriaLabel: 'JOYOR LiteGo — 650 W, Hasta 45 km, 36 V 13 Ah',
      priceAriaLabel: 'Estado JOYOR LiteGo',
      gallery: [
        { src: '/patinetes/joyor/litego/img/1.webp', alt: 'JOYOR LiteGo vista 1' },
        { src: '/patinetes/joyor/litego/img/2.webp', alt: 'JOYOR LiteGo vista 2' },
        { src: '/patinetes/joyor/litego/img/3.webp', alt: 'JOYOR LiteGo vista 3' },
        { src: '/patinetes/joyor/litego/img/4.webp', alt: 'JOYOR LiteGo vista 4' },
        { src: '/patinetes/joyor/litego/img/5.webp', alt: 'JOYOR LiteGo vista 5' },
        { src: '/patinetes/joyor/litego/img/6.webp', alt: 'JOYOR LiteGo vista 6' },
        { src: '/patinetes/joyor/litego/img/7.webp', alt: 'JOYOR LiteGo vista 7' },
        { src: '/patinetes/joyor/litego/img/8.webp', alt: 'JOYOR LiteGo vista 8' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde joyorscooter.com (Shopify). Producto SIMPLE: una
         sola variante, sin colores, así que no declara `attributes` y su ficha
         va sin selector. Los datos técnicos salen del TÍTULO de origen —que en
         su tienda es una ficha en miniatura— y del bloque de especificaciones
         de la página; el cuerpo es prosa comercial y no es fiable para cifras. */
      id: 'joyor-y10-dgt',
      filtros: { dgt: true, motores: 1, w: 800, km: 100, kmh: 25, frenos: 'mecanicos' },
      sku: 'JY10DGT',
      name: 'JOYOR Y10 DGT',
      menuLabel: 'JOYOR Y10 DGT',
      badgeText: 'JOYOR Y10 DGT',
      brand: 'JOYOR',
      series: 'joyor',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '627 €',
      stock: 'in_stock',
      href: '/patinetes/joyor/y10-dgt/',
      image: '/patinetes/joyor/y10-dgt/img/1.webp',
      alt: 'Patinete eléctrico JOYOR Y10 DGT',
      specs: ['800 W', 'Hasta 100 km', '48 V 26 Ah'],
      homeOrder: 6,
      homeTitle: 'JOYOR Y10 DGT',
      homeAriaLabel: 'JOYOR Y10 DGT — 800 W, Hasta 100 km, 48 V 26 Ah',
      priceAriaLabel: 'Estado JOYOR Y10 DGT',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/joyor/y10-dgt/img/1.webp', alt: 'JOYOR Y10 DGT vista 1' },
        { src: '/patinetes/joyor/y10-dgt/img/2.webp', alt: 'JOYOR Y10 DGT vista 2' },
        { src: '/patinetes/joyor/y10-dgt/img/3.webp', alt: 'JOYOR Y10 DGT vista 3' },
        { src: '/patinetes/joyor/y10-dgt/img/4.webp', alt: 'JOYOR Y10 DGT vista 4' },
        { src: '/patinetes/joyor/y10-dgt/img/5.webp', alt: 'JOYOR Y10 DGT vista 5' },
        { src: '/patinetes/joyor/y10-dgt/img/6.webp', alt: 'JOYOR Y10 DGT vista 6' },
        { src: '/patinetes/joyor/y10-dgt/img/7.webp', alt: 'JOYOR Y10 DGT vista 7' },
        { src: '/patinetes/joyor/y10-dgt/img/8.webp', alt: 'JOYOR Y10 DGT vista 8' },
        { src: '/patinetes/joyor/y10-dgt/img/9.webp', alt: 'JOYOR Y10 DGT vista 9' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde joyorscooter.com (Shopify). Producto SIMPLE: una
         sola variante, sin colores, así que no declara `attributes` y su ficha
         va sin selector. Los datos técnicos salen del TÍTULO de origen —que en
         su tienda es una ficha en miniatura— y del bloque de especificaciones
         de la página; el cuerpo es prosa comercial y no es fiable para cifras. */
      id: 'joyor-c10-dgt',
      filtros: { dgt: false, motores: 1, w: 500, km: 40, kmh: null, frenos: null },
      sku: 'JC10DGT',
      name: 'JOYOR C10 DGT',
      menuLabel: 'JOYOR C10 DGT',
      badgeText: 'JOYOR C10 DGT',
      brand: 'JOYOR',
      series: 'joyor',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '577 €',
      stock: 'in_stock',
      href: '/patinetes/joyor/c10-dgt/',
      image: '/patinetes/joyor/c10-dgt/img/1.webp',
      alt: 'Patinete eléctrico JOYOR C10 DGT',
      specs: ['500 W', 'Hasta 40 km', '48 V 10,4 Ah'],
      homeOrder: 7,
      homeTitle: 'JOYOR C10 DGT',
      homeAriaLabel: 'JOYOR C10 DGT — 500 W, Hasta 40 km, 48 V 10,4 Ah',
      priceAriaLabel: 'Estado JOYOR C10 DGT',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/joyor/c10-dgt/img/1.webp', alt: 'JOYOR C10 DGT vista 1' },
        { src: '/patinetes/joyor/c10-dgt/img/2.webp', alt: 'JOYOR C10 DGT vista 2' },
        { src: '/patinetes/joyor/c10-dgt/img/3.webp', alt: 'JOYOR C10 DGT vista 3' },
        { src: '/patinetes/joyor/c10-dgt/img/4.webp', alt: 'JOYOR C10 DGT vista 4' },
        { src: '/patinetes/joyor/c10-dgt/img/5.webp', alt: 'JOYOR C10 DGT vista 5' },
        { src: '/patinetes/joyor/c10-dgt/img/6.webp', alt: 'JOYOR C10 DGT vista 6' },
        { src: '/patinetes/joyor/c10-dgt/img/7.webp', alt: 'JOYOR C10 DGT vista 7' },
        { src: '/patinetes/joyor/c10-dgt/img/8.webp', alt: 'JOYOR C10 DGT vista 8' },
        { src: '/patinetes/joyor/c10-dgt/img/9.webp', alt: 'JOYOR C10 DGT vista 9' },
        { src: '/patinetes/joyor/c10-dgt/img/10.webp', alt: 'JOYOR C10 DGT vista 10' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde joyorscooter.com (Shopify). Producto SIMPLE: una
         sola variante, sin colores, así que no declara `attributes` y su ficha
         va sin selector. Los datos técnicos salen del TÍTULO de origen —que en
         su tienda es una ficha en miniatura— y del bloque de especificaciones
         de la página; el cuerpo es prosa comercial y no es fiable para cifras. */
      id: 'joyor-s5-z',
      filtros: { dgt: true, motores: 1, w: 800, km: 45, kmh: 25, frenos: 'mecanicos' },
      sku: 'JS5Z',
      name: 'JOYOR S5-Z',
      menuLabel: 'JOYOR S5-Z',
      badgeText: 'JOYOR S5-Z',
      brand: 'JOYOR',
      series: 'joyor',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '547 €',
      stock: 'in_stock',
      href: '/patinetes/joyor/s5-z/',
      image: '/patinetes/joyor/s5-z/img/1.webp',
      alt: 'Patinete eléctrico JOYOR S5-Z',
      specs: ['800 W', 'Hasta 45 km', '48 V 13 Ah'],
      homeOrder: 10,
      homeTitle: 'JOYOR S5-Z',
      homeAriaLabel: 'JOYOR S5-Z — 800 W, Hasta 45 km, 48 V 13 Ah',
      priceAriaLabel: 'Estado JOYOR S5-Z',
      gallery: [
        { src: '/patinetes/joyor/s5-z/img/1.webp', alt: 'JOYOR S5-Z vista 1' },
        { src: '/patinetes/joyor/s5-z/img/2.webp', alt: 'JOYOR S5-Z vista 2' },
        { src: '/patinetes/joyor/s5-z/img/3.webp', alt: 'JOYOR S5-Z vista 3' },
        { src: '/patinetes/joyor/s5-z/img/4.webp', alt: 'JOYOR S5-Z vista 4' },
        { src: '/patinetes/joyor/s5-z/img/5.webp', alt: 'JOYOR S5-Z vista 5' },
        { src: '/patinetes/joyor/s5-z/img/6.webp', alt: 'JOYOR S5-Z vista 6' },
        { src: '/patinetes/joyor/s5-z/img/7.webp', alt: 'JOYOR S5-Z vista 7' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde joyorscooter.com (Shopify). Producto SIMPLE: una
         sola variante, sin colores, así que no declara `attributes` y su ficha
         va sin selector. Los datos técnicos salen del TÍTULO de origen —que en
         su tienda es una ficha en miniatura— y del bloque de especificaciones
         de la página; el cuerpo es prosa comercial y no es fiable para cifras. */
      id: 'joyor-g5',
      filtros: { dgt: true, motores: 1, w: 750, km: 55, kmh: 25, frenos: 'mecanicos' },
      sku: 'JG5',
      name: 'JOYOR G5',
      menuLabel: 'JOYOR G5',
      badgeText: 'JOYOR G5',
      brand: 'JOYOR',
      series: 'joyor',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '407 €',
      stock: 'in_stock',
      href: '/patinetes/joyor/g5/',
      image: '/patinetes/joyor/g5/img/1.webp',
      alt: 'Patinete eléctrico JOYOR G5',
      specs: ['750 W', 'Hasta 55 km', '48 V 13 Ah'],
      homeOrder: 16,
      homeTitle: 'JOYOR G5',
      homeAriaLabel: 'JOYOR G5 — 750 W, Hasta 55 km, 48 V 13 Ah',
      priceAriaLabel: 'Estado JOYOR G5',
      gallery: [
        { src: '/patinetes/joyor/g5/img/1.webp', alt: 'JOYOR G5 vista 1' },
        { src: '/patinetes/joyor/g5/img/2.webp', alt: 'JOYOR G5 vista 2' },
        { src: '/patinetes/joyor/g5/img/3.webp', alt: 'JOYOR G5 vista 3' },
        { src: '/patinetes/joyor/g5/img/4.webp', alt: 'JOYOR G5 vista 4' },
        { src: '/patinetes/joyor/g5/img/5.webp', alt: 'JOYOR G5 vista 5' },
        { src: '/patinetes/joyor/g5/img/6.webp', alt: 'JOYOR G5 vista 6' },
        { src: '/patinetes/joyor/g5/img/7.webp', alt: 'JOYOR G5 vista 7' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde joyorscooter.com (Shopify). Producto SIMPLE: una
         sola variante, sin colores, así que no declara `attributes` y su ficha
         va sin selector. Los datos técnicos salen del TÍTULO de origen —que en
         su tienda es una ficha en miniatura— y del bloque de especificaciones
         de la página; el cuerpo es prosa comercial y no es fiable para cifras. */
      id: 'joyor-y6-s',
      filtros: { dgt: true, motores: 1, w: 500, km: 60, kmh: 45, frenos: null },
      sku: 'JY6S',
      name: 'JOYOR Y6-S',
      menuLabel: 'JOYOR Y6-S',
      badgeText: 'JOYOR Y6-S',
      brand: 'JOYOR',
      series: 'joyor',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '547 €',
      stock: 'in_stock',
      href: '/patinetes/joyor/y6-s/',
      image: '/patinetes/joyor/y6-s/img/1.webp',
      alt: 'Patinete eléctrico JOYOR Y6-S',
      specs: ['500 W', 'Hasta 60 km', 'Punta 45 km/h'],
      homeOrder: 20,
      homeTitle: 'JOYOR Y6-S',
      homeAriaLabel: 'JOYOR Y6-S — 500 W, Hasta 60 km, Punta 45 km/h',
      priceAriaLabel: 'Estado JOYOR Y6-S',
      gallery: [
        { src: '/patinetes/joyor/y6-s/img/1.webp', alt: 'JOYOR Y6-S vista 1' },
        { src: '/patinetes/joyor/y6-s/img/2.webp', alt: 'JOYOR Y6-S vista 2' },
        { src: '/patinetes/joyor/y6-s/img/3.webp', alt: 'JOYOR Y6-S vista 3' },
        { src: '/patinetes/joyor/y6-s/img/4.webp', alt: 'JOYOR Y6-S vista 4' },
        { src: '/patinetes/joyor/y6-s/img/5.webp', alt: 'JOYOR Y6-S vista 5' },
        { src: '/patinetes/joyor/y6-s/img/6.webp', alt: 'JOYOR Y6-S vista 6' }
      ]
    },
    {
      /* Alta 28 ago 2026 desde joyorscooter.com (Shopify). Producto SIMPLE: una
         sola variante, sin colores, así que no declara `attributes` y su ficha
         va sin selector. Los datos técnicos salen del TÍTULO de origen —que en
         su tienda es una ficha en miniatura— y del bloque de especificaciones
         de la página; el cuerpo es prosa comercial y no es fiable para cifras. */
      id: 'joyor-f5',
      filtros: { dgt: true, motores: 1, w: 500, km: 38, kmh: 25, frenos: null },
      sku: 'JF5',
      name: 'JOYOR F5',
      menuLabel: 'JOYOR F5',
      badgeText: 'JOYOR F5',
      brand: 'JOYOR',
      series: 'joyor',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '367 €',
      stock: 'in_stock',
      href: '/patinetes/joyor/f5/',
      image: '/patinetes/joyor/f5/img/1.webp',
      alt: 'Patinete eléctrico JOYOR F5',
      specs: ['500 W', 'Hasta 38 km', '48 V 10,4 Ah'],
      homeOrder: 24,
      homeTitle: 'JOYOR F5',
      homeAriaLabel: 'JOYOR F5 — 500 W, Hasta 38 km, 48 V 10,4 Ah',
      priceAriaLabel: 'Estado JOYOR F5',
      gallery: [
        { src: '/patinetes/joyor/f5/img/1.webp', alt: 'JOYOR F5 vista 1' },
        { src: '/patinetes/joyor/f5/img/2.webp', alt: 'JOYOR F5 vista 2' },
        { src: '/patinetes/joyor/f5/img/3.webp', alt: 'JOYOR F5 vista 3' },
        { src: '/patinetes/joyor/f5/img/4.webp', alt: 'JOYOR F5 vista 4' },
        { src: '/patinetes/joyor/f5/img/5.webp', alt: 'JOYOR F5 vista 5' },
        { src: '/patinetes/joyor/f5/img/6.webp', alt: 'JOYOR F5 vista 6' }
      ]
    }];

  function cloneGallery(gallery) {
    return Array.isArray(gallery) ? gallery.map(function (media) {
      return Object.assign({}, media);
    }) : [];
  }

  function cloneAttributes(attrs) {
    return (attrs || []).map(function (eje) {
      var copia = Object.assign({}, eje);
      copia.options = (eje.options || []).map(function (op) {
        var o = Object.assign({}, op);
        if (Array.isArray(op.images)) o.images = op.images.slice();
        if (op.allows) o.allows = Object.assign({}, op.allows);
        if (op.imagesBy) o.imagesBy = Object.assign({}, op.imagesBy);
        return o;
      });
      return copia;
    });
  }

  /* ── LA CAPA OPERATIVA ────────────────────────────────────────────────────────
     Este fichero es la ESTRUCTURA del catálogo y lo escribe una persona. El precio,
     el precio tachado y el stock los cambia el panel a diario, y para eso está
     `data/product-overrides.js`, que el panel genera entero y este fichero aplica
     aquí, en el ÚNICO sitio por el que pasan todas las copias del catálogo.

     Antes el panel reescribía ESTE fichero con expresiones regulares. Ahora no lo
     toca, así que ninguna operación de tienda puede romper el catálogo. Si los
     overrides no llegan o llegan rotos, se ven los precios de aquí: viejos quizá,
     pero la tienda vende igual. */
  function overridesActuales() {
    var o = window.SCOOTSHOP_OVERRIDES;
    if (!o || typeof o !== 'object') return { porId: {}, ocultos: [], extras: [] };
    return {
      porId: (o.porId && typeof o.porId === 'object') ? o.porId : {},
      ocultos: Array.isArray(o.ocultos) ? o.ocultos : [],
      extras: Array.isArray(o.extras) ? o.extras : []
    };
  }

  /* Solo se aceptan los campos OPERATIVOS. Que el panel pudiera sobrescribir `href`,
     `attributes` o la galería sería volver al problema de dos escritores sobre la
     misma verdad, con el añadido de que este no se vería en el repositorio. */
  var CAMPOS_OPERATIVOS = ['priceText', 'compareAtPriceText', 'stock'];

  function aplicarOverride(copy, cambios) {
    if (!cambios || typeof cambios !== 'object') return copy;
    CAMPOS_OPERATIVOS.forEach(function (campo) {
      var valor = cambios[campo];
      if (typeof valor === 'string') copy[campo] = valor;
    });
    return copy;
  }

  function cloneProducts() {
    var over = overridesActuales();
    var ocultos = {};
    over.ocultos.forEach(function (id) { ocultos[String(id)] = true; });

    var salida = products
      .filter(function (product) { return !ocultos[String(product.id)]; })
      .map(function (product) {
        var copy = Object.assign({}, product);
        copy.gallery = cloneGallery(product.gallery);
        if (Array.isArray(product.attributes)) copy.attributes = cloneAttributes(product.attributes);
        /* La serie de un accesorio ES su familia. Se DERIVA en vez de declararse
           dos veces: `accessoryCategory` es lo único que escribe una persona —y lo
           único que el validador exige— y de ahí sale tanto la sección de la
           portada como la fila del menú. Declarar las dos cosas por producto era
           pedir que un día no coincidieran. */
        /* OJO al `categoryKey`: el neumático de repuesto es `catalogType:'accessory'`
           y declara la familia `tyres`, pero vive en la categoría «Repuestos». Sin
           esta condición se mudaba a «Accesorios» y dejaba Repuestos VACÍA, que es
           tanto como borrar la categoría: `getHomeCategories` descarta las que se
           quedan sin series. */
        if (copy.catalogType === 'accessory'
            && copy.categoryKey === 'accessories'
            && copy.accessoryCategory) {
          copy.series = copy.accessoryCategory;
        }
        return aplicarOverride(copy, over.porId[String(product.id)]);
      });

    /* Productos dados de alta desde el panel. Viven en los overrides y no en este
       fichero a propósito: el panel no puede escribir aquí. Cuando uno de ellos se
       redacta en condiciones —fotos, ejes, textos— se mueve a mano a `products` y se
       quita de los extras. */
    over.extras.forEach(function (extra) {
      if (!extra || typeof extra !== 'object' || !extra.id) return;
      if (ocultos[String(extra.id)]) return;
      if (salida.some(function (p) { return String(p.id) === String(extra.id); })) return;
      var copy = Object.assign({}, extra);
      copy.gallery = cloneGallery(extra.gallery);
      if (Array.isArray(extra.attributes)) copy.attributes = cloneAttributes(extra.attributes);
      salida.push(copy);
    });

    return salida;
  }

  function cloneSeriesDefinitions() {
    return seriesDefinitions.map(function (series) {
      return Object.assign({}, series);
    });
  }

  function cloneCategoryDefinitions() {
    return categoryDefinitions.map(function (category) {
      return Object.assign({}, category);
    });
  }

  function getCategoryDefinitionMap() {
    var map = {};
    categoryDefinitions.forEach(function (category) {
      map[category.key] = category;
    });
    return map;
  }

  function getSeriesDefinitionMap() {
    var map = {};
    seriesDefinitions.forEach(function (series) {
      map[series.key] = series;
    });
    return map;
  }

  function getCategoryProducts(categoryKey) {
    return cloneProducts()
      .filter(function (product) {
        return (product.categoryKey || 'electric-scooters') === categoryKey;
      })
      .sort(function (left, right) {
        var leftSeries = String(left.series || '');
        var rightSeries = String(right.series || '');
        if (leftSeries !== rightSeries) return leftSeries.localeCompare(rightSeries);
        return Number(left.homeOrder || 0) - Number(right.homeOrder || 0);
      });
  }

  /* Accesorios declarados como compatibles con un producto. La relacion vive
     SOLO en el vehiculo (compatibleSkus); la inversa se deriva aqui para no
     tener dos verdades que se desincronicen. Devuelve el producto entero, en
     el orden en que estan declarados, y descarta el SKU que no exista o este
     agotado: la ficha nunca debe ofrecer algo que no se puede comprar. */
  /* Accesorios que se ofrecen en TODA una categoria sin declararlos uno a uno
     en cada entrada del catalogo. La clave es el categoryKey del producto, asi
     que un accesorio puede valer para patinetes y no para motos o bicis.
     Anadir uno nuevo es anadir su SKU a la categoria que toque. */
  /* CATEGORÍAS DE ACCESORIO — declaradas, no deducidas del nombre ni del SKU.
     Un accesorio dice a qué familia pertenece (`accessoryCategory`) y aquí está qué
     significa cada familia. Sirve para agrupar, filtrar y para que un casco o una
     mochila entren sin que nadie programe nada: se añade la familia aquí y el
     producto la declara. El validador exige que la que declare exista. */
  /* Esta tabla es AHORA el eje de agrupación de los accesorios: la portada pinta
     una sección por familia, el riel una placa por familia y el menú una fila por
     familia, todo generado de aquí (ver `accessorySeriesDefinitions`). Antes los
     22 accesorios caían en dos cajones —«Accesorios» y «Limitadores»— y el de
     Accesorios mezclaba manillares, puños, luces, pegatinas y protectores en una
     parrilla de 18 tarjetas sin ningún corte.

     `homeDescription` hace falta porque cada sección lleva su rótulo
     («**Manillares.** …»), igual que las marcas de patinetes.

     UNA FAMILIA SIN PRODUCTOS NO SE VE: `getHomeCategories` descarta las series
     vacías. Por eso las que aún no tienen nada pueden declararse ya, y dar de alta
     el primer casco es solo ponerle `accessoryCategory: 'helmets'`. */
  var accessoryCategoryDefinitions = [
    { key: 'handlebars', label: 'Manillares', order: 1,
      homeDescription: 'Manillares completos y puños: lo que se toca al conducir.' },
    { key: 'protection', label: 'Protectores anticaída', order: 2,
      homeDescription: 'Piezas que se llevan el golpe para que no se lo lleve el patinete.' },
    { key: 'limiters',   label: 'Mandos limitadores', order: 3,
      homeDescription: 'Mandos para alternar entre el modo homologado de 25 km/h y el modo libre de uso privado.' },
    { key: 'stems',      label: 'Potencia para manillar', order: 4,
      homeDescription: 'Potencias para cambiar la altura y el ángulo del manillar.' },
    { key: 'helmets',    label: 'Cascos', order: 5,
      homeDescription: 'Cascos para ciudad y para ir deprisa.' },
    { key: 'lighting',   label: 'Iluminación', order: 6,
      homeDescription: 'Luces para ver de noche y, sobre todo, para que te vean.' },
    /* Soportes y bolsas iban en dos familias con UN producto cada una, y en la
       parrilla salían como dos tarjetas medio vacías. Se fusionaron el 9 sep 2026.
       La clave sigue siendo `mounts` a propósito: no se ve en ninguna parte (solo
       genera el ancla `familia-mounts`, que nadie enlaza) y renombrarla obligaría a
       tocar también el fixture de scripts/qa/catalogo-overrides.js. El hueco que deja
       el 8 en el orden no molesta: la tabla se ordena, no se indexa. */
    { key: 'mounts',     label: 'Bolsas y soportes', order: 7,
      homeDescription: 'Soportes de móvil y bolsas para llevar el candado, el cargador y lo que haga falta.' },
    { key: 'stickers',   label: 'Pegatinas', order: 9,
      homeDescription: 'Pegatinas y reflectantes para personalizar y para verse mejor.' },
    { key: 'vinyls',     label: 'Vinilos', order: 10,
      homeDescription: 'Vinilos de cubierta y chasis para cambiarle la cara al patinete.' },
    { key: 'tyres',      label: 'Neumáticos', order: 11,
      homeDescription: 'Cubiertas y cámaras de repuesto.' }
  ];

  /* Las series de la categoría «Accesorios» SE GENERAN de la tabla de familias, no
     se escriben a mano: así no puede haber una familia sin sección ni una sección
     sin familia. Todo lo que consume series —portada, riel y menú— sale de
     `seriesDefinitions`, así que con esto los tres se dividen a la vez. */
  var accessorySeriesDefinitions = accessoryCategoryDefinitions.map(function (fam) {
    return {
      key: fam.key,
      label: fam.label,
      categoryKey: 'accessories',
      menuOrder: fam.order,
      homeOrder: fam.order,
      homeSectionId: 'familia-' + fam.key,
      homeTitle: fam.label,
      homeDescription: fam.homeDescription || '',
      homeAriaLabel: 'Lista de ' + fam.label.toLowerCase()
    };
  });

  /* Se añaden aquí y no arriba porque `seriesDefinitions` se declara antes que la
     tabla de familias. Todo lo que las lee son funciones que corren después. */
  seriesDefinitions = seriesDefinitions.concat(accessorySeriesDefinitions);

  function getAccessoryCategories() {
    return accessoryCategoryDefinitions
      .slice()
      .sort(function (a, b) { return (a.order || 99) - (b.order || 99); })
      .map(function (c) { return Object.assign({}, c); });
  }

  function getCompatibleAccessories(sku) {
    var todos = cloneProducts();
    var origen = null;
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].sku === sku) { origen = todos[i]; break; }
    }
    if (!origen) return [];

    var porSku = {};
    for (var j = 0; j < todos.length; j++) porSku[todos[j].sku] = todos[j];

    /* Primero los declarados por el producto (el limitador de SU modelo, lo mas
       relevante) y despues los universales. */
    /* Universales: los accesorios que declaran encajar en la CATEGORIA de este
       producto. Antes esto era una tabla escrita a mano aqui —categoria -> lista de
       SKU— y cada accesorio nuevo obligaba a editarla; ahora lo dice el propio
       accesorio con `fitsCategories`. Misma respuesta, sin lista que mantener. */
    /* `excludeSkus` es el recorte fino de `fitsCategories`: "encajo en todos los
       patinetes MENOS en estos". Sin él, la única forma de dejar fuera dos modelos
       era renunciar a `fitsCategories` y escribir `compatibleSkus` a mano en los
       otros 27 patinetes — es decir, volver a la tabla central que se eliminó, y
       con el mismo defecto: cada patinete nuevo naceria mal salvo que alguien se
       acordase de tocarla. Aquí la excepción la declara quien la conoce (el
       accesorio) y un patinete nuevo entra solo. */
    var universales = [];
    for (var u = 0; u < todos.length; u++) {
      var acc = todos[u];
      if (!Array.isArray(acc.fitsCategories)) continue;
      if (acc.fitsCategories.indexOf(origen.categoryKey) === -1) continue;
      if (Array.isArray(acc.excludeSkus) && acc.excludeSkus.indexOf(origen.sku) !== -1) continue;
      universales.push(acc.sku);
    }
    var pedidos = (Array.isArray(origen.compatibleSkus) ? origen.compatibleSkus : [])
      .concat(universales);

    var salida = [];
    var vistos = {};
    for (var k = 0; k < pedidos.length; k++) {
      var candidatoSku = pedidos[k];
      /* Nunca ofrecerse a si mismo: en la ficha de la bolsa, la bolsa no sale. */
      if (candidatoSku === sku || vistos[candidatoSku]) continue;
      var candidato = porSku[candidatoSku];
      if (!candidato || candidato.stock === 'out_of_stock') continue;
      vistos[candidatoSku] = true;
      salida.push(candidato);
    }
    return salida;
  }

  function getSeriesProducts(seriesKey) {
    return cloneProducts()
      .filter(function (product) { return product.series === seriesKey; })
      .sort(function (left, right) {
        return Number(left.homeOrder || 0) - Number(right.homeOrder || 0);
      });
  }

  function getCategorySeries(categoryKey) {
    return cloneSeriesDefinitions()
      .filter(function (series) {
        return (series.categoryKey || 'electric-scooters') === categoryKey;
      })
      .sort(function (left, right) {
        return Number(left.menuOrder || 0) - Number(right.menuOrder || 0);
      })
      .map(function (series) {
        var items = getSeriesProducts(series.key)
          .filter(function (product) { return product.showInMenu !== false; });

        return Object.assign({}, series, {
          items: items
        });
      })
      .filter(function (series) { return Array.isArray(series.items) && series.items.length; });
  }

  function getMenuCategories() {
    var categoryMap = getCategoryDefinitionMap();

    return cloneCategoryDefinitions()
      .filter(function (category) { return category.showInMenu !== false; })
      .sort(function (left, right) {
        return Number(left.menuOrder || 0) - Number(right.menuOrder || 0);
      })
      .map(function (category) {
        return {
          key: category.key,
          label: (categoryMap[category.key] && categoryMap[category.key].label) || category.label,
          series: getCategorySeries(category.key).map(function (series) {
            return {
              key: series.key,
              label: series.label,
              // Destino de la serie en la portada. El menú móvil enlaza aquí en
              // vez de desplegar los modelos; el mismo id que usa la home para
              // pintar <section id="..."> y el raíl de series.
              homeSectionId: series.homeSectionId || ('series-' + series.key),
              items: series.items.map(function (product) {
                return {
                  label: product.menuLabel || product.name,
                  href: product.href
                };
              })
            };
          })
        };
      })
      .filter(function (category) { return Array.isArray(category.series) && category.series.length; });
  }

  function getMenuSeries() {
    return getMenuCategories()
      .flatMap(function (category) { return category.series; });
  }

  function getHomeCategories() {
    return cloneCategoryDefinitions()
      .filter(function (category) { return category.showOnHome !== false; })
      .sort(function (left, right) {
        return Number(left.homeOrder || 0) - Number(right.homeOrder || 0);
      })
      .map(function (category) {
        return Object.assign({}, category, {
          series: cloneSeriesDefinitions()
            .filter(function (series) {
              return (series.categoryKey || 'electric-scooters') === category.key && series.showOnHome !== false;
            })
            .sort(function (left, right) {
              return Number(left.homeOrder || 0) - Number(right.homeOrder || 0);
            })
            .map(function (series) {
              return Object.assign({}, series, {
                products: getSeriesProducts(series.key).filter(function (product) {
                  return product.showOnHome !== false;
                })
              });
            })
            .filter(function (series) { return Array.isArray(series.products) && series.products.length; })
        });
      })
      .filter(function (category) { return Array.isArray(category.series) && category.series.length; });
  }

  function getHomeSeries() {
    return getHomeCategories()
      .flatMap(function (category) { return category.series; });
  }

  function compactKey(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function toVariantIndexes(variant, total) {
    var indexes = [];
    if (!variant || !Number.isFinite(total) || total <= 0) return indexes;

    if (Array.isArray(variant.images) && variant.images.length) {
      variant.images.forEach(function (raw) {
        var parsed = typeof raw === 'number' ? raw : parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= total) indexes.push(parsed);
      });
      return indexes;
    }

    var start = null;
    var end = null;
    if (Array.isArray(variant.range) && variant.range.length >= 2) {
      start = parseInt(variant.range[0], 10);
      end = parseInt(variant.range[1], 10);
    } else if (variant.from !== undefined || variant.to !== undefined) {
      start = parseInt(variant.from, 10);
      end = parseInt(variant.to, 10);
    } else if (variant.start !== undefined || variant.end !== undefined) {
      start = parseInt(variant.start, 10);
      end = parseInt(variant.end, 10);
    }

    if (!Number.isFinite(start) || !Number.isFinite(end)) return indexes;
    if (start > end) {
      var swap = start;
      start = end;
      end = swap;
    }

    for (var i = start; i <= end; i++) {
      if (i >= 1 && i <= total) indexes.push(i);
    }

    return indexes;
  }

  /* Validacion del catalogo: se comprueban los EJES declarados, sean del tipo que
     sean. Antes esto solo miraba `colorVariants`, asi que un producto que se eligiera
     por modelo o por medida no se validaba en absoluto: podia tener dos opciones con
     la misma clave —lo que funde dos lineas distintas en el carrito— sin que saltara
     nada. Se exige lo mismo que exige el nucleo: clave unica por eje, imagenes que
     existan en la galeria y una sola opcion por defecto. */
  function validateCatalogColors(productsList) {
    var warnings = [];
    var errors = [];
    var list = Array.isArray(productsList) ? productsList : [];

    list.forEach(function (product) {
      var productId = product.id || product.sku || product.name || 'producto-sin-id';
      var gallery = Array.isArray(product.gallery) ? product.gallery : [];
      var ejes = Array.isArray(product.attributes) ? product.attributes : [];
      if (!ejes.length) return;

      if (!gallery.length) {
        errors.push('[' + productId + '] Declara atributos pero no tiene gallery.');
        return;
      }

      ejes.forEach(function (eje) {
        var ejeId = (eje && eje.key) || 'eje-sin-key';
        var opciones = (eje && Array.isArray(eje.options)) ? eje.options : [];
        if (!opciones.length) {
          errors.push('[' + productId + '/' + ejeId + '] Eje sin opciones.');
          return;
        }

        var defaultCount = opciones.filter(function (op) {
          return op && (op.default === true || op.defaultColor === true);
        }).length;
        if (defaultCount === 0) {
          warnings.push('[' + productId + '/' + ejeId + '] Sin opcion por defecto. Se usara la primera.');
        } else if (defaultCount > 1) {
          warnings.push('[' + productId + '/' + ejeId + '] Tiene ' + defaultCount + ' opciones por defecto.');
        }

        var seenKeys = Object.create(null);
        opciones.forEach(function (op) {
          var label = (op && (op.label || op.name || op.key)) || 'opcion-sin-nombre';
          var key = compactKey(op && op.key);

          if (!key) {
            errors.push('[' + productId + '/' + ejeId + '] Opcion "' + label + '" sin key.');
          } else if (seenKeys[key]) {
            errors.push('[' + productId + '/' + ejeId + '] key duplicada: "' + key + '".');
          } else {
            seenKeys[key] = true;
          }

          /* Las imagenes son indices de la galeria. Un eje puede no tener foto propia
             —la medida de un manillar no cambia la foto— y eso NO es un error. */
          var indexes = toVariantIndexes(op, gallery.length);
          indexes.forEach(function (idx) {
            var media = gallery[idx - 1];
            if (!media || !media.src) {
              errors.push('[' + productId + '/' + ejeId + '] "' + label + '" referencia indice ' + idx + ' sin src valido.');
            }
          });

          if (op && op.imagesBy) {
            for (var comb in op.imagesBy) {
              if (!Object.prototype.hasOwnProperty.call(op.imagesBy, comb)) continue;
              var idxComb = parseInt(op.imagesBy[comb], 10);
              if (!(idxComb >= 1 && idxComb <= gallery.length)) {
                errors.push('[' + productId + '/' + ejeId + '] "' + label + '" imagesBy[' + comb + '] fuera de galeria.');
              }
            }
          }
        });
      });
    });

    /* Estructura de accesorios: familia declarada y existente, y compatibilidad que
       apunta a algo real. Sin esto, un accesorio nuevo podía entrar al catálogo sin
       decir qué es ni dónde encaja y nadie se enteraba hasta verlo mal en una ficha. */
    var familias = {};
    accessoryCategoryDefinitions.forEach(function (c) { familias[c.key] = true; });
    var porSkuVal = {};
    list.forEach(function (p) { porSkuVal[p.sku] = true; });

    list.forEach(function (p) {
      var id = p.id || p.sku || 'producto-sin-id';
      if (p.catalogType === 'accessory') {
        if (!p.accessoryCategory) {
          errors.push('[' + id + '] Accesorio sin accessoryCategory.');
        } else if (!familias[p.accessoryCategory]) {
          errors.push('[' + id + '] accessoryCategory desconocida: "' + p.accessoryCategory + '".');
        }
      }
      (Array.isArray(p.compatibleSkus) ? p.compatibleSkus : []).forEach(function (sk) {
        if (!porSkuVal[sk]) errors.push('[' + id + '] compatibleSkus apunta a un SKU que no existe: "' + sk + '".');
      });
      (Array.isArray(p.fitsCategories) ? p.fitsCategories : []).forEach(function (ck) {
        var existe = categoryDefinitions.some(function (c) { return c.key === ck; });
        if (!existe) errors.push('[' + id + '] fitsCategories apunta a una categoría que no existe: "' + ck + '".');
      });
      (Array.isArray(p.excludeSkus) ? p.excludeSkus : []).forEach(function (sk) {
        if (!porSkuVal[sk]) errors.push('[' + id + '] excludeSkus apunta a un SKU que no existe: "' + sk + '".');
      });
      /* Una exclusión sin `fitsCategories` no excluye nada —solo recorta la lista de
         universales— y se quedaría ahí callada dando una falsa sensación de control. */
      if (Array.isArray(p.excludeSkus) && p.excludeSkus.length && !Array.isArray(p.fitsCategories)) {
        errors.push('[' + id + '] excludeSkus sin fitsCategories: no excluye nada.');
      }
    });

    return {
      checkedProducts: list.length,
      warnings: warnings,
      errors: errors,
      ok: errors.length === 0
    };
  }

  window.SCOOTSHOP_CATEGORIES = cloneCategoryDefinitions();
  window.SCOOTSHOP_SERIES = cloneSeriesDefinitions();
  window.SCOOTSHOP_PRODUCTS = cloneProducts();
  window.SCOOTSHOP_CATALOG = {
    categories: cloneCategoryDefinitions(),
    series: cloneSeriesDefinitions(),
    products: cloneProducts()
  };
  /* La direccion de la pagina de una categoria, o '' si no tiene (motos y
     bicicletas estan apagadas y no se les ha hecho ninguna). Quien enlace una
     categoria pregunta aqui: es el unico sitio donde esta escrito. */
  window.SCOOTSHOP_getCategoryUrl = function (key) {
    var cat = (categoryDefinitions || []).filter(function (c) { return c && c.key === key; })[0];
    return (cat && cat.pageUrl) || '';
  };

  window.SCOOTSHOP_getMenuCategories = getMenuCategories;
  window.SCOOTSHOP_getMenuSeries = getMenuSeries;
  window.SCOOTSHOP_getHomeCategories = getHomeCategories;
  window.SCOOTSHOP_getHomeSeries = getHomeSeries;
  window.SCOOTSHOP_getCategoryProducts = getCategoryProducts;
  window.SCOOTSHOP_getCategorySeries = getCategorySeries;
  window.SCOOTSHOP_getSeriesProducts = getSeriesProducts;
  window.SCOOTSHOP_getCompatibleAccessories = getCompatibleAccessories;
  window.SCOOTSHOP_getAccessoryCategories = getAccessoryCategories;

  /* ---------------------------------------------------------------------
     LA FOTO PEQUEÑA

     Una miniatura de 56 px estaba bajando la foto original: medido en la ficha
     del M41 Armored Dual, las nueve de «Añade algo más» pesaban 620 KB para
     verse a 56x56 — la mayor, 107 KB por 3 136 pixeles de pantalla.

     Cada portada del catálogo tiene su juego de medidas (`1-400.webp`,
     `-600`, `-800`, `-1000`) que genera el mismo script que las optimiza, y la
     de 400 basta de sobra: son 12-20 KB y siguen siendo 3,5 veces lo que se ve
     en una pantalla del doble de densidad.

     Vive AQUÍ y no en cada consumidor porque quien sabe cómo se llaman las
     fotos de un producto es el catálogo. Comprobado sobre los 87 productos: las
     87 portadas tienen su `-400`, así que la sustitución nunca deja un hueco.
     Si alguna vez se da de alta un producto sin generar las medidas, esto
     apuntaría a un fichero que no está — por eso lo vigila
     `node scripts/qa/fotos-mini.js`.
     --------------------------------------------------------------------- */
  function miniatura(src) {
    if (typeof src !== 'string' || !src) return src;
    /* Solo las portadas de producto, que son las que tienen medidas. Una ruta
       que ya trae medida (`-400`) o que no acaba en `.webp` se deja igual. */
    if (!/^\/.+\/img\/[^/]+\.webp$/i.test(src)) return src;
    if (/-\d{3,4}\.webp$/i.test(src)) return src;
    return src.replace(/\.webp$/i, '-400.webp');
  }

  /* ---------------------------------------------------------------------
     LOS PACKS

     Un pack es un conjunto de articulos que, comprados JUNTOS, valen otra
     cosa. Vive aqui y no en `js/index.js` porque el precio de un pack tiene
     que ser real, y real quiere decir que lo cobre el backend: `api/index.php`
     lo lee de `data/attributes-index.json`, que genera
     `node scripts/build-attributes-index.js` ejecutando ESTE fichero. Un solo
     sitio donde esta escrito, y la caja y el escaparate leen de el.

     Antes la rebaja la hacia un CODIGO DE DESCUENTO (`PACKTANKDUAL`), porque
     el backend tarifa con el precio de catalogo y descarta el que manda el
     navegador. Funcionaba, pero convertia una oferta en un cupon: el resumen
     del pedido enseñaba «Descuento -36,99 EUR» en vez de lo que el cliente vio
     en la portada —la bolsa GRATIS, el manillar a 32,99—, y bastaba que el
     codigo no validara para que el total saltara al precio suelto.

     Reglas:
     - `precioPack` es POR UNIDAD; `precioPackTotal`, por el lote entero. Los
       cubre cables son «3 por 10 EUR», no «a 3,33»: quien compre uno suelto
       paga 5. Por eso el importe se resuelve por LINEA y nunca dividiendo.
     - El pack se aplica solo si estan TODOS sus articulos con su cantidad. Lo
       que sobre de una linea se cobra al precio de siempre.
     - Un articulo puede valer 0 dentro del pack (de regalo). Como precio de
       CATALOGO el 0 esta prohibido —«nunca precio 0 silencioso»—, pero dentro
       de un pack es un importe de linea, no un precio de producto.
     --------------------------------------------------------------------- */
  var PACKS = [
    {
      id: 'pack-tank-dual',
      titulo: 'M41 Tank Dual + manillar + extras',
      articulos: [
        /* El Tank Dual no tiene un amarillo a secas: sus colores son
           gris-amarillo, gris-rojo, gris-azul y gris-verde. El amarillo es este. */
        { sku: 'M41TANKDUAL', opciones: { color: 'gris-amarillo' } },

        /* DORADO. Este manillar no se hace en amarillo, y el dorado (#c9a92c) es
           el que hace juego con el amarillo del patinete. */
        { sku: 'ACC-BAR-WAKE-DH', opciones: { color: 'dorado' }, precioPack: 32.99 },

        /* El mando del TANK DUAL, que es el patinete del pack: cada modelo lleva
           el suyo y no son intercambiables. */
        { sku: 'ACC-LIMIT-M41-TD', opciones: {}, precioPack: 45 },

        { sku: 'ACC-CABLE', opciones: { color: 'amarillo' }, cantidad: 3, precioPackTotal: 10 },

        /* De regalo. */
        { sku: 'ACC-BAG', opciones: {}, precioPack: 0 }
      ]
    }
  ];

  function clonarPacks() {
    return PACKS.map(function (pack) {
      return {
        id: pack.id,
        titulo: pack.titulo,
        articulos: pack.articulos.map(function (a) {
          return {
            sku: a.sku,
            opciones: Object.assign({}, a.opciones || {}),
            cantidad: Math.max(1, parseInt(a.cantidad, 10) || 1),
            precioPack: a.precioPack,
            precioPackTotal: a.precioPackTotal
          };
        })
      };
    });
  }

  /* LA REFERENCIA DE UNA LINEA: lo que se tacha al lado del precio de pack.

     Es lo MAS ALTO entre el precio tachado que ya anuncia el catalogo y lo que
     la linea costaria suelta hoy. El patinete del pack es el caso que lo pide:
     dentro del pack vale lo mismo que suelto (725 €), asi que comparandolo
     consigo mismo no aportaba nada — y su ficha anuncia 789,99 tachado. Ese
     descuento tambien es descuento.

     Vive aqui porque lo usan CUATRO pantallas — la oferta de la portada, el
     cajon del carrito, /checkout y /pago — y las cuatro tienen que tachar la
     misma cifra. */
  function referenciaDeLinea(tachadoUnidad, sueltoLinea, cantidad) {
    var comparado = Number(tachadoUnidad) * Math.max(1, parseInt(cantidad, 10) || 1);
    if (!isFinite(comparado) || comparado <= sueltoLinea) return sueltoLinea;
    return +comparado.toFixed(2);
  }

  /* Lo que un articulo cuesta DENTRO del pack, por la linea entera. */
  function importePackDeArticulo(articulo) {
    var cantidad = Math.max(1, parseInt(articulo.cantidad, 10) || 1);
    if (articulo.precioPackTotal !== undefined) return Number(articulo.precioPackTotal);
    if (articulo.precioPack !== undefined) return Number(articulo.precioPack) * cantidad;
    return null;   // sin declarar: en el pack vale lo que vale
  }

  function numeroDePrecio(texto) {
    var limpio = String(texto == null ? '' : texto)
      .replace(/[^0-9,.-]/g, '').replace(/\.(?=[0-9]{3}\b)/g, '').replace(',', '.');
    var n = parseFloat(limpio);
    return isFinite(n) ? n : 0;
  }

  /* ---------------------------------------------------------------------
     RESOLVER UN CARRITO CONTRA LOS PACKS

     Le das las lineas del carrito ({sku, qty, price}) y te dice, por linea, lo
     que cuesta con los packs puestos y lo que costaria suelta. Lo usan el cajon
     del carrito, /checkout y /pago, y la MISMA regla la aplica el backend en
     `resolve_order_pricing()`. Si alguna vez discrepan, discrepa la pantalla:
     quien cobra es el backend.

     Devuelve siempre algo util, incluso sin packs: `lineas` en el mismo orden
     que entraron, con `importe` (lo que se cobra) e `importeSuelto` (lo que se
     tacha, 0 si no hay nada que tachar).
     --------------------------------------------------------------------- */
  function resolverPacks(items) {
    var lista = Array.isArray(items) ? items : [];
    var precios = {};
    var tachados = {};
    (window.SCOOTSHOP_PRODUCTS || []).forEach(function (p) {
      var sku = String((p && p.sku) || '').toUpperCase();
      if (!sku) return;
      precios[sku] = numeroDePrecio(p.priceText);
      tachados[sku] = numeroDePrecio(p.compareAtPriceText);
    });

    var sueltoDe = function (item) {
      var qty = Math.max(1, parseInt(item && item.qty, 10) || 1);
      var unidad = precios[String((item && item.sku) || '').toUpperCase()];
      if (!(unidad > 0)) unidad = numeroDePrecio(item && item.price);
      return +(unidad * qty).toFixed(2);
    };

    var salida = {
      packs: [],
      subtotal: 0,
      subtotalSuelto: 0,
      lineas: lista.map(function (item) {
        return { importe: sueltoDe(item), importeSuelto: 0, enPack: false };
      })
    };

    /* Cuantas unidades hay de cada SKU, sumando lineas: el mismo SKU puede venir
       en dos lineas (dos colores) y el pack no distingue. */
    var hay = {};
    lista.forEach(function (item) {
      var sku = String((item && item.sku) || '').toUpperCase();
      if (!sku) return;
      hay[sku] = (hay[sku] || 0) + Math.max(1, parseInt(item && item.qty, 10) || 1);
    });

    /* Unidades que cada pack completo se lleva, y por que importe. */
    var cubre = {};
    PACKS.forEach(function (pack) {
      var completo = pack.articulos.every(function (a) {
        var n = Math.max(1, parseInt(a.cantidad, 10) || 1);
        return (hay[String(a.sku).toUpperCase()] || 0) >= n;
      });
      if (!completo) return;
      salida.packs.push({ id: pack.id, titulo: pack.titulo });
      pack.articulos.forEach(function (a) {
        var sku = String(a.sku).toUpperCase();
        var n = Math.max(1, parseInt(a.cantidad, 10) || 1);
        var imp = importePackDeArticulo(a);
        /* Sin precio declarado, dentro del pack vale lo de siempre. Se registra
           igual para que la linea sepa que PERTENECE al pack: el patinete no
           cambia de precio y aun asi es la pieza principal de la oferta. */
        if (imp === null) imp = (precios[sku] || 0) * n;
        if (!isFinite(imp) || imp < 0) return;
        if (!cubre[sku]) cubre[sku] = { unidades: 0, importe: 0 };
        cubre[sku].unidades += n;
        cubre[sku].importe += imp;
      });
    });

    lista.forEach(function (item, i) {
      var sku = String((item && item.sku) || '').toUpperCase();
      var qty = Math.max(1, parseInt(item && item.qty, 10) || 1);
      var suelto = sueltoDe(item);
      var linea = salida.lineas[i];
      var c = cubre[sku];
      if (c && c.unidades > 0) {
        var cubiertas = Math.min(qty, c.unidades);
        var porUnidadPack = c.importe / c.unidades;
        /* Lo que cubre el pack va a su importe; lo que sobre de la linea, al
           precio de siempre. */
        var importe = +(porUnidadPack * cubiertas + (suelto / qty) * (qty - cubiertas)).toFixed(2);
        c.importe -= porUnidadPack * cubiertas;
        c.unidades -= cubiertas;
        /* Se tacha la REFERENCIA, no el precio suelto: para el patinete del pack
           son cosas distintas (725 suelto, 789,99 tachado en su ficha) y la
           portada ya cuenta el segundo. */
        var refe = referenciaDeLinea(tachados[sku], suelto, qty);
        linea.importe = importe;
        linea.enPack = true;
        linea.referencia = refe;
        linea.importeSuelto = (importe < refe - 0.005) ? refe : 0;
      }
      salida.subtotal += linea.importe;
      /* El total tachado suma la referencia SOLO de las lineas del pack. Una linea
         de fuera con su propia rebaja no infla lo que ahorra el pack. */
      salida.subtotalSuelto += linea.enPack ? (linea.referencia || suelto) : suelto;
    });

    salida.subtotal = +salida.subtotal.toFixed(2);
    salida.subtotalSuelto = +salida.subtotalSuelto.toFixed(2);
    return salida;
  }

  /* ---------------------------------------------------------------------
     LAS LINEAS DE CARRITO DE UN PACK

     Devuelve, para cada articulo del pack, la linea lista para meter en el
     carrito: nombre, precio, foto DEL COLOR elegido, atributos con nombre y
     cantidad. Vive aqui y no en quien lo pinta porque quien sabe como se
     llaman y como se ven las variantes de un producto es el catalogo.

     Estaba en `js/index.js` (la portada) hasta que el cajon del carrito
     necesito lo mismo para reponer lo que falta de un pack a medias. Dos
     copias de esta regla era justo lo que no podia pasar.

     Devuelve `null` si algo no cuadra —producto que no esta, agotado, sin
     precio o un eje sin opcion valida—: mas vale no ofrecer el pack que
     ofrecerlo incompleto o a un precio que no es.
     --------------------------------------------------------------------- */
  function lineasDePack(idPack) {
    var pack = null;
    for (var i = 0; i < PACKS.length; i++) {
      if (!idPack || PACKS[i].id === idPack) { pack = PACKS[i]; break; }
    }
    if (!pack) return null;

    var porSku = {};
    (window.SCOOTSHOP_PRODUCTS || []).forEach(function (p) {
      var sku = String((p && p.sku) || '').toUpperCase();
      if (sku) porSku[sku] = p;
    });

    var lineas = [];
    for (var a = 0; a < pack.articulos.length; a++) {
      var articulo = pack.articulos[a];
      var producto = porSku[String(articulo.sku).toUpperCase()];
      if (!producto || producto.stock === 'out_of_stock') return null;

      var precio = numeroDePrecio(producto.priceText);
      if (!(precio > 0)) return null;

      var cantidad = Math.max(1, parseInt(articulo.cantidad, 10) || 1);
      var enPackLinea = importePackDeArticulo(articulo);
      if (enPackLinea === null || !isFinite(enPackLinea)) enPackLinea = precio * cantidad;

      /* Cada eje declarado por el catalogo tiene que tener opcion elegida. */
      var ejes = Array.isArray(producto.attributes) ? producto.attributes : [];
      var attrs = {};
      var etiquetas = [];
      var claveColor = '';
      var etiquetaColor = '';
      var foto = producto.image;

      for (var e = 0; e < ejes.length; e++) {
        var eje = ejes[e];
        var pedida = articulo.opciones ? articulo.opciones[eje.key] : '';
        var opciones = Array.isArray(eje.options) ? eje.options : [];
        var opcion = null;
        for (var o = 0; o < opciones.length; o++) {
          if (opciones[o].key === pedida) { opcion = opciones[o]; break; }
        }
        if (!opcion) {
          for (var d = 0; d < opciones.length; d++) {
            if (opciones[d].default) { opcion = opciones[d]; break; }
          }
        }
        if (!opcion) opcion = opciones[0];
        if (!opcion) return null;

        attrs[eje.key] = opcion.key;
        etiquetas.push(opcion.label || opcion.key);
        if (!claveColor) {
          claveColor = opcion.key;
          etiquetaColor = opcion.label || opcion.key;
        }

        /* LA FOTO DEL COLOR ELEGIDO. `photo` es la via corta —una URL suelta— y
           `images` la que usa el catalogo de verdad: indices dentro de la
           galeria del producto, EN BASE 1. Leerlos en base 0 desplaza todos los
           colores una posicion: el manillar dorado salia azul. */
        if (opcion.photo) {
          foto = opcion.photo;
        } else if (Array.isArray(opcion.images) && opcion.images.length) {
          var galeria = Array.isArray(producto.gallery) ? producto.gallery : [];
          var elegida = galeria[opcion.images[0] - 1];
          var src = elegida && (elegida.src || elegida);
          if (src) foto = src;
        }
      }

      lineas.push({
        producto: producto,
        sku: producto.sku,
        name: producto.name,
        price: precio,
        antes: numeroDePrecio(producto.compareAtPriceText) || precio,
        url: producto.href,
        image: foto,
        color: claveColor,
        colorLabel: etiquetaColor,
        attrs: attrs,
        variante: etiquetas.join(' · '),
        qty: cantidad,
        suelto: precio * cantidad,
        referencia: referenciaDeLinea(numeroDePrecio(producto.compareAtPriceText),
                                      precio * cantidad, cantidad),
        enPack: enPackLinea,
        stock: producto.stock || 'in_stock'
      });
    }
    return lineas;
  }

  window.SCOOTSHOP_lineasDePack = lineasDePack;
  window.SCOOTSHOP_PACKS = clonarPacks();
  window.SCOOTSHOP_getPacks = clonarPacks;
  window.SCOOTSHOP_resolverPacks = resolverPacks;

  window.SCOOTSHOP_miniatura = miniatura;

  /* EL RESPALDO DE LA FOTO PEQUEÑA

     `miniatura()` es una regla de NOMBRE y no puede preguntar al disco. Si algún
     día falta una medida, el navegador deja un hueco roto — y ya pasó: las fotos
     de COLOR no tenían medida pequeña (solo las portadas), así que el carrito
     enseñaba el hueco en el manillar dorado y en los cubre cables amarillos.

     Un solo oyente lo cose para todo el sitio. Va en CAPTURA porque el evento
     `error` de una <img> NO burbujea: enganchado en `document` sin `true` no se
     entera de nada. Y se marca la imagen para no entrar en bucle si la grande
     tampoco está.

     Las medidas que faltaban ya están generadas
     (`python scripts/completar-fotos-variante.py`, con su `--check` de guardián);
     esto es el cinturón, no el tirante. */
  if (typeof document !== 'undefined' && !window.__ssRespaldoMini) {
    window.__ssRespaldoMini = true;
    document.addEventListener('error', function (ev) {
      var img = ev && ev.target;
      if (!img || img.tagName !== 'IMG' || img.dataset.ssRespaldo === '1') return;
      var m = String(img.getAttribute('src') || '').match(/^(.*)-400\.webp(\?.*)?$/);
      if (!m) return;
      img.dataset.ssRespaldo = '1';
      img.src = m[1] + '.webp' + (m[2] || '');
    }, true);
  }
  window.SCOOTSHOP_validateCatalogColors = function () {
    var report = validateCatalogColors(window.SCOOTSHOP_PRODUCTS || []);
    return report;
  };

  if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(location.hostname || '')) {
    try {
      var report = validateCatalogColors(window.SCOOTSHOP_PRODUCTS || []);
      if (!report.ok) {
        console.warn('[SCOOTSHOP] Catalogo con errores de color:', report.errors);
      } else if (report.warnings.length) {
        console.warn('[SCOOTSHOP] Catalogo con avisos de color:', report.warnings);
      }
    } catch (_) {}
  }
})();






