// /data/products.js
// Catalogo global enriquecido para hosting estatico.
(function () {
  var dgtTooltipText = 'Este distintivo indica que el modelo esta homologado y certificado por la DGT, de acuerdo con la normativa vigente aplicable a vehiculos de movilidad personal.';

  var categoryDefinitions = [
    {
      key: 'electric-scooters',
      label: 'Patinetes eléctricos',
      menuOrder: 1,
      homeOrder: 1,
      showInMenu: true,
      showOnHome: true,
      showHeaderOnHome: false,
      homeTitle: 'Patinetes eléctricos',
      homeDescription: 'Catalogo principal de movilidad eléctrica de SCOOT SHOP.'
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
      label: 'Repuestos',
      menuOrder: 4,
      homeOrder: 4,
      showInMenu: true,
      showOnHome: false,
      showHeaderOnHome: true,
      homeTitle: 'Repuestos',
      homeDescription: 'Base preparada para futuros recambios y piezas compatibles.'
    }
    ,{
      key: 'electric-motorcycles',
      label: 'Motos eléctricas',
      menuOrder: 5,
      homeOrder: 5,
      showInMenu: true,
      showOnHome: true,
      showHeaderOnHome: false,
      homeTitle: 'Motos eléctricas',
      homeDescription: 'Motos eléctricas infantiles de motocross y aventura.'
    }
    ,{
      key: 'electric-bikes',
      label: 'Bicicletas eléctricas',
      menuOrder: 6,
      homeOrder: 6,
      showInMenu: true,
      showOnHome: true,
      showHeaderOnHome: false,
    }
    ,{
      key: 'accessories',
      label: 'Accesorios',
      menuOrder: 7,
      homeOrder: 7,
      showInMenu: true,
      showOnHome: true,
      showHeaderOnHome: false,
      homeTitle: 'Accesorios',
      homeDescription: 'Bolsas, soportes, pegatinas y luces para complementar tu patinete o bici.'
    }
  ];

  var seriesDefinitions = [
    {
      key: 'k',
      label: 'Serie K',
      categoryKey: 'electric-scooters',
      menuOrder: 1,
      homeOrder: 1,
      homeSectionId: 'series-k',
      listingSectionId: 'comprar',
      homeTitle: 'Serie K',
      homeDescription: 'Modelos KuKirin para trayectos mixtos y uso diario potente. Primer modelo: G2 PRO.',
      homeAriaLabel: 'Lista de productos Series K'
    },
    {
      key: 'n',
      label: 'Serie N',
      categoryKey: 'electric-scooters',
      menuOrder: 2,
      homeOrder: 2,
      homeSectionId: 'series-n',
      homeTitle: 'Series N',
      homeDescription: 'La familia N combina chasis solido, electronica fiable y modelos urbanos y potentes como N7PRO, VS6, E8 y Bongo V70 Connected.',
      homeAriaLabel: 'Lista de productos Series N'
    },
    {
      key: 'gt',
      label: 'Serie GT',
      categoryKey: 'electric-scooters',
      menuOrder: 3,
      homeOrder: 3,
      homeSectionId: 'series-g',
      homeTitle: 'Series GT',
      homeDescription: 'Urbanos, super potentes y suspensión a otro nivel. Modelos: G2, T10, T10 DUAL, TF3, T30 y GT9.',
      homeAriaLabel: 'Lista de productos Series GT'
    },
    {
      key: 'ix',
      label: 'Serie IX',
      categoryKey: 'electric-scooters',
      menuOrder: 4,
      homeOrder: 4,
      homeSectionId: 'series-ix',
      homeTitle: 'Serie IX',
      homeDescription: 'Modelos: IX3, W9 e IX8.',
      homeAriaLabel: 'Lista de productos Serie IX'
    }
    ,{
      key: 'acc',
      label: 'Accesorios',
      categoryKey: 'accessories',
      menuOrder: 1,
      homeOrder: 1,
      homeSectionId: 'series-accessories',
      listingSectionId: 'comprar',
      homeTitle: 'Accesorios',
      homeDescription: 'Selección de bolsas, soportes, pegatinas y luces para tu patinete o bicicleta.',
      homeAriaLabel: 'Lista de accesorios'
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
      homeDescription: 'Bicicletas eléctricas de alta calidad, con componentes premium y diseño moderno.',
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
      homeDescription: 'Motos eléctricas infantiles de motocross con motor potente, Bluetooth y luces LED.',
      homeAriaLabel: 'Lista de motos eléctricas'
    }
  ];

  var products = [
    {
      id: 'k-g2-pro',
      sku: 'G2PRO',
      name: 'KUKIRIN G2 PRO',
      menuLabel: 'KUKIRIN G2 PRO',
      badgeText: 'G2 PRO',
      brand: 'KUKIRIN',
      series: 'k',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '550 €',
      compareAtPriceText: '660 €',
      stock: 'in_stock',
      paypalId: 'S5A5HD7BQ4XSA',
      href: '/patinetes/series-k/g2-pro/',
      image: '/patinetes/series-k/g2-pro/img/1.webp',
      alt: 'Patinete eléctrico KUKIRIN G2 PRO',
      specs: ['600 W', 'Hasta 58 km', '48 V 15 Ah'],
      homeOrder: 1,
      homeTitle: 'KUKIRIN G2 PRO — Homologado por la DGT',
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
        { src: '/patinetes/series-k/g2-pro/img/8.webp', alt: 'KUKIRIN G2 PRO vista 8' },
        { src: '/patinetes/series-k/g2-pro/img/9.webp', alt: 'KUKIRIN G2 PRO vista 9' }
      ]
    },
    {
      id: 'k-g2',
      sku: 'KG2',
      name: 'KUKIRIN G2',
      menuLabel: 'KUKIRIN G2',
      badgeText: 'G2',
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
      homeTitle: 'KUKIRIN G2 — 800 W todoterreno',
      homeAriaLabel: 'KUKIRIN G2 — 800 W, 45 km/h y hasta 55 km',
      priceAriaLabel: 'Estado KUKIRIN G2',
      gallery: [
        { src: '/patinetes/series-k/g2/img/1.webp', alt: 'KUKIRIN G2 vista 1' },
        { src: '/patinetes/series-k/g2/img/2.webp', alt: 'KUKIRIN G2 vista 2' },
        { src: '/patinetes/series-k/g2/img/3.webp', alt: 'KUKIRIN G2 vista 3' },
        { src: '/patinetes/series-k/g2/img/4.webp', alt: 'KUKIRIN G2 vista 4' },
        { src: '/patinetes/series-k/g2/img/5.webp', alt: 'KUKIRIN G2 vista 5' },
        { src: '/patinetes/series-k/g2/img/6.webp', alt: 'KUKIRIN G2 vista 6' },
        { src: '/patinetes/series-k/g2/img/7.webp', alt: 'KUKIRIN G2 vista 7' }
      ]
    },
    {
      id: 'n7',
      sku: 'N7PRO',
      name: 'N7PRO',
      menuLabel: 'N7PRO',
      badgeText: 'N7PRO',
      brand: 'TODIMART',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '1 €',
      compareAtPriceText: '220,50 €',
      stock: 'in_stock',
      paypalId: 'PSFEEEULL7H5Y',
      href: '/patinetes/series-n/n7/',
      image: '/patinetes/series-n/n7/img/1.webp',
      alt: 'Patinete eléctrico N7PRO',
      specs: ['350 W', '25-30 km', '8.5" honeycomb'],
      homeOrder: 1,
      homeTitle: 'N7PRO — Patinete eléctrico urbano',
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
      sku: 'S4',
      name: 'ZWheel MASCOOTER S4',
      menuLabel: 'S4',
      badgeText: 'S4',
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
      homeTitle: 'MASCOOTER S4 — Homologado por la DGT',
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
      sku: 'S3',
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
      homeTitle: 'S3-11 — 6000W dual motor',
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
      homeTitle: 'VS6 — Patinete eléctrico (Serie N)',
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
      sku: 'V70',
      name: 'Cecotec Bongo V70 Connected',
      menuLabel: 'Bongo V70',
      badgeText: 'V70 CONNECTED',
      brand: 'CECOTEC',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '620 €',
      compareAtPriceText: '805 €',
      stock: 'in_stock',
      href: '/patinetes/series-n/v70-connected/',
      image: '/patinetes/series-n/v70-connected/img/2.png',
      alt: 'Patinete electrico Cecotec Bongo V70 Connected',
      specs: ['1500 W max.', 'Hasta 70 km', '48 V 15 Ah'],
      homeOrder: 5,
      homeTitle: 'Bongo V70 Connected — Homologado DGT',
      homeAriaLabel: 'Cecotec Bongo V70 Connected — 1500 W maximos y hasta 70 km',
      priceAriaLabel: 'Precio Bongo V70 Connected',
      dgtCertified: true,
      dgtTooltipText: dgtTooltipText,
      gallery: [
        { src: '/patinetes/series-n/v70-connected/img/2.png', alt: 'Bongo V70 Connected vista principal' },
        { src: '/patinetes/series-n/v70-connected/img/1.jpg', alt: 'Bongo V70 Connected vista 1' },
        { src: '/patinetes/series-n/v70-connected/img/3.png', alt: 'Bongo V70 Connected vista 3' },
        { src: '/patinetes/series-n/v70-connected/img/4.png', alt: 'Bongo V70 Connected vista 4' },
        { src: '/patinetes/series-n/v70-connected/img/5.jpg', alt: 'Bongo V70 Connected vista 5' },
        { src: '/patinetes/series-n/v70-connected/img/6.jpg', alt: 'Bongo V70 Connected vista 6' }
      ]
    },
    {
      id: 'e8',
      sku: 'E8',
      name: 'TODIMART-SEEMAR E8',
      menuLabel: 'E8',
      badgeText: 'E8',
      brand: 'TODIMART - SEEMAR',
      series: 'n',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '399 €',
      compareAtPriceText: '500 €',
      stock: 'in_stock',
      paypalId: 'WYSPHQTDE9Z6Y',
      href: '/patinetes/series-n/e8/',
      image: '/patinetes/series-n/e8/img/1.webp',
      alt: 'Patinete eléctrico TODIMART-SEEMAR E8',
      specs: ['800 W', 'Hasta 60 km', '48 V 13 Ah'],
      homeOrder: 5,
      homeTitle: 'E8 — Patinete eléctrico (Serie N)',
      homeAriaLabel: 'E8 — Serie N',
      priceAriaLabel: 'Precio E8',
      gallery: [
        { src: '/patinetes/series-n/e8/img/1.webp', alt: 'E8 vista 1' },
        { src: '/patinetes/series-n/e8/img/2.webp', alt: 'E8 vista 2' },
        { src: '/patinetes/series-n/e8/img/3.webp', alt: 'E8 vista 3' },
        { src: '/patinetes/series-n/e8/img/4.webp', alt: 'E8 vista 4' },
        { src: '/patinetes/series-n/e8/img/5.webp', alt: 'E8 vista 5' },
        { src: '/patinetes/series-n/e8/img/6.webp', alt: 'E8 vista 6' },
        { src: '/patinetes/series-n/e8/img/7.webp', alt: 'E8 vista 7' },
        { src: '/patinetes/series-n/e8/img/8.webp', alt: 'E8 vista 8' },
        { src: '/patinetes/series-n/e8/img/9.webp', alt: 'E8 vista 9' },
        { src: '/patinetes/series-n/e8/img/10.webp', alt: 'E8 vista 10' },
        { src: '/patinetes/series-n/e8/img/11.webp', alt: 'E8 vista 11' },
        { src: '/patinetes/series-n/e8/img/12.webp', alt: 'E8 vista 12' }
      ]
    },
    {
      id: 'd6',
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
      homeTitle: 'D6 — Patinete eléctrico (Serie N)',
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
      homeTitle: 'D20 — Cecotec Bongo D20E Connected (Serie N)',
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
      sku: 'IES1',
      name: 'iENYRID iE-S1',
      menuLabel: 'iE-S1',
      badgeText: 'iE-S1',
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
      homeTitle: 'iE-S1 — iENYRID iE-S1 (Serie N)',
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
      homeTitle: 'G2 — Patinete eléctrico de alta potencia',
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
      homeTitle: 'T10 — Patinete eléctrico Ultra',
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
      id: 't10-dual',
      sku: 'T10DUAL',
      name: 'JOYOR T10 DUAL',
      menuLabel: 'T10 DUAL',
      badgeText: 'T10 DUAL',
      brand: 'JOYOR',
      series: 'gt',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '799 €',
      compareAtPriceText: '860 €',
      stock: 'in_stock',
      href: '/patinetes/series-gt/t10-dual/',
      image: '/patinetes/series-gt/t10-dual/img/1.webp',
      alt: 'Patinete eléctrico JOYOR T10 DUAL',
      specs: ['2×1000 W', 'Hasta 75 km', '60V 18Ah'],
      homeOrder: 3,
      homeTitle: 'JOYOR T10 DUAL — Doble motor todoterreno',
      homeAriaLabel: 'JOYOR T10 DUAL — 2×1000 W, 60 km/h y hasta 75 km',
      priceAriaLabel: 'Precio JOYOR T10 DUAL',
      gallery: [
        { src: '/patinetes/series-gt/t10-dual/img/1.webp', alt: 'JOYOR T10 DUAL vista 1' },
        { src: '/patinetes/series-gt/t10-dual/img/2.webp', alt: 'JOYOR T10 DUAL vista 2' },
        { src: '/patinetes/series-gt/t10-dual/img/3.webp', alt: 'JOYOR T10 DUAL vista lateral' },
        { src: '/patinetes/series-gt/t10-dual/img/4.webp', alt: 'JOYOR T10 DUAL vista trasera' },
        { src: '/patinetes/series-gt/t10-dual/img/5.webp', alt: 'JOYOR T10 DUAL motor delantero' },
        { src: '/patinetes/series-gt/t10-dual/img/6.webp', alt: 'JOYOR T10 DUAL motor trasero' },
        { src: '/patinetes/series-gt/t10-dual/img/7.webp', alt: 'JOYOR T10 DUAL en uso' }
      ]
    },
    {
      id: 'tf3',
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
      homeTitle: 'TF3 — Patinete eléctrico Top',
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
      sku: 'T30',
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
      homeTitle: 'T30 — Patinete eléctrico Essential',
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
      sku: 'GT9',
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
      homeTitle: 'FENGQS GT9 — Patinete eléctrico',
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
      sku: 'IX3',
      name: 'iScooter IX3',
      menuLabel: 'IX3',
      badgeText: 'IX3',
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
      homeTitle: 'IX3 — Patinete eléctrico Serie IX',
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
      homeTitle: 'W9 — Patinete eléctrico Serie IX',
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
      name: 'Bolsa de almacenamiento para scooter y bicicleta',
      menuLabel: 'Bolsa de almacenamiento',
      badgeText: 'BOLSA',
      brand: 'ROCKBROS',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '8 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/bolsa-almacenamiento/',
      image: '/img/accessories/storage-bag.jpg',
      alt: 'Bolsa de almacenamiento impermeable para patinete o bicicleta',
      specs: ['Impermeable', '25 × 12 × 10 cm', 'Para patinete y bici'],
      homeOrder: 1,
      homeTitle: 'Bolsa de almacenamiento impermeable',
      homeAriaLabel: 'Bolsa de almacenamiento para patinete o bicicleta',
      priceAriaLabel: 'Precio bolsa de almacenamiento',
      gallery: [
        { src: '/img/accessories/storage-bag.jpg', alt: 'Bolsa de almacenamiento impermeable' },
        { src: '/img/accessories/storage-bag-2.jpg', alt: 'Bolsa de almacenamiento montada en el manillar' },
        { src: '/img/accessories/storage-bag-3.jpg', alt: 'Bolsa de almacenamiento – interior' },
        { src: '/img/accessories/storage-bag-4.jpg', alt: 'Bolsa de almacenamiento – vista lateral' }
      ]
    }
    ,{
      id: 'acc-phone-holder',
      sku: 'ACC-HOLDER',
      name: 'Soporte móvil antivibración para patinete',
      menuLabel: 'Soporte móvil',
      badgeText: 'SOPORTE',
      brand: 'MOGGAM',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '7,40 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/soporte-movil/',
      image: '/img/accessories/phone-holder-2.jpg',
      alt: 'Soporte móvil antivibración para patinete eléctrico',
      specs: ['Antivibración', 'Giro 360°', '5,4–7,2”'],
      homeOrder: 2,
      homeTitle: 'Soporte móvil antivibración para patinete',
      homeAriaLabel: 'Soporte móvil antivibración para patinete',
      priceAriaLabel: 'Precio soporte móvil',
      gallery: [
        { src: '/img/accessories/phone-holder-2.jpg', alt: 'Soporte móvil antivibración – vista principal' },
        { src: '/img/accessories/phone-holder-3.jpg', alt: 'Soporte móvil antivibración – contenido del pack' },
        { src: '/img/accessories/phone-holder-4.jpg', alt: 'Soporte móvil antivibración – vista lateral' }
      ]
    }
    ,{
      id: 'acc-the-beast-stickers',
      sku: 'ACC-BEAST',
      name: 'Pegatinas THE BEAST',
      menuLabel: 'Pegatina THE BEAST',
      badgeText: 'THE BEAST',
      brand: 'TWOWHEEL ODYSSEY',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '4,50 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/pegatina-the-beast/',
      image: '/img/accessories/the-beast-2.jpg',
      alt: 'Pegatinas THE BEAST impermeables de vinilo',
      specs: ['2 uds.', 'PVC impermeable', '18 × 3,3 cm'],
      homeOrder: 3,
      homeTitle: 'Pegatinas decorativas THE BEAST',
      homeAriaLabel: 'Pegatinas THE BEAST para casco o patinete',
      priceAriaLabel: 'Precio pegatinas THE BEAST',
      gallery: [
        { src: '/img/accessories/the-beast-2.jpg', alt: 'Pegatinas THE BEAST – pack' },
        { src: '/img/accessories/the-beast.jpg', alt: 'Pegatinas THE BEAST – ejemplo de uso' },
        { src: '/img/accessories/the-beast-3.jpg', alt: 'Pegatinas THE BEAST – detalle' },
        { src: '/img/accessories/the-beast-4.jpg', alt: 'Pegatinas THE BEAST – aplicación' }
      ]
    }
    ,{
      id: 'acc-reflective-stickers',
      sku: 'ACC-REFLECT',
      name: 'Pegatinas reflectantes de seguridad',
      menuLabel: 'Pegatinas reflectantes',
      badgeText: 'REFLECT',
      brand: 'UNIVERSAL',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '6,50 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/pegatinas-reflectantes/',
      image: '/img/accessories/reflective-stickers.jpg',
      alt: 'Pegatinas reflectantes para patinete eléctrico o bicicleta',
      specs: ['Efecto fluorescente', 'Para Xiaomi/Ninebot', 'Mayor visibilidad'],
      homeOrder: 4,
      homeTitle: 'Pegatinas reflectantes para patinete',
      homeAriaLabel: 'Pegatinas reflectantes de seguridad',
      priceAriaLabel: 'Precio pegatinas reflectantes',
      gallery: [
        { src: '/img/accessories/reflective-stickers.jpg', alt: 'Pegatinas reflectantes para patinete' },
        { src: '/img/accessories/reflective-stickers-2.jpg', alt: 'Pegatinas reflectantes – detalle' },
        { src: '/img/accessories/reflective-stickers-3.jpg', alt: 'Pegatinas reflectantes – aplicación' },
        { src: '/img/accessories/reflective-stickers-4.jpg', alt: 'Pegatinas reflectantes – pack' }
      ]
    }
    ,{
      id: 'acc-rgb-lights',
      sku: 'ACC-RGB',
      name: 'Luces estroboscópicas LED RGB para patinete y bicicleta',
      menuLabel: 'Luces LED RGB',
      badgeText: 'LED RGB',
      brand: 'UNIVERSAL',
      series: 'acc',
      productType: 'accessory',
      catalogType: 'accessory',
      categoryKey: 'accessories',
      priceText: '6 €',
      compareAtPriceText: '',
      stock: 'in_stock',
      href: '/accesorios/luces-led-rgb/',
      image: '/img/accessories/led-rgb-1.jpg',
      alt: 'Luces LED RGB para patinete o bicicleta',
      specs: ['Mando RF', 'Recarga USB', 'Kit 4 luces'],
      homeOrder: 5,
      homeTitle: 'Luces LED RGB estroboscópicas',
      homeAriaLabel: 'Luces LED RGB para patinete y bicicleta',
      priceAriaLabel: 'Precio luces LED RGB',
      gallery: [
        { src: '/img/accessories/led-rgb-1.jpg', alt: 'Luces LED RGB para patinete o bicicleta' },
        { src: '/img/accessories/led-rgb-2.jpg', alt: 'Luces LED RGB – detalle' },
        { src: '/img/accessories/led-rgb-3.jpg', alt: 'Luces LED RGB – montadas' }
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
      homeTitle: 'G73 — Bicicleta eléctrica urbana',
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
      badgeText: 'GT900',
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
      homeTitle: 'Aairsk GT900 — Bicicleta eléctrica de montaña',
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
      badgeText: 'EV12M PRO',
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
      homeTitle: 'EVERCROSS EV12M PRO — Moto eléctrica infantil',
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
      badgeText: 'EV05M',
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
      homeTitle: 'EVERCROSS EV05M — Moto eléctrica infantil',
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
      homeTitle: 'CHALLENGER12 — Moto eléctrica infantil',
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
      sku: 'IX8',
      name: 'iScooter IX8',
      menuLabel: 'IX8',
      badgeText: 'IX8',
      brand: 'ISCOOTER',
      series: 'ix',
      productType: 'electric-scooter',
      catalogType: 'vehicle',
      categoryKey: 'electric-scooters',
      priceText: '700 €',
      compareAtPriceText: '770 €',
      stock: 'in_stock',
      href: '/patinetes/series-ix/ix8/',
      image: '/patinetes/series-ix/ix8/img/1.jpg',
      alt: 'Patinete electrico iScooter IX8 todoterreno',
      specs: ['2400 W', '65-70 km', '48 V 20 Ah'],
      homeOrder: 3,
      homeTitle: 'IX8 - Patinete electrico dual motor',
      homeAriaLabel: 'IX8 - 2400 W y hasta 70 km',
      priceAriaLabel: 'Precio IX8',
      gallery: [
        { src: '/patinetes/series-ix/ix8/img/1.jpg', alt: 'IX8 vista 1' },
        { src: '/patinetes/series-ix/ix8/img/2.jpg', alt: 'IX8 vista 2' },
        { src: '/patinetes/series-ix/ix8/img/3.jpg', alt: 'IX8 vista 3' },
        { src: '/patinetes/series-ix/ix8/img/4.jpg', alt: 'IX8 vista 4' },
        { src: '/patinetes/series-ix/ix8/img/5.jpg', alt: 'IX8 vista 5' },
        { src: '/patinetes/series-ix/ix8/img/6.jpg', alt: 'IX8 vista 6' }
      ]
    }];

  function cloneGallery(gallery) {
    return Array.isArray(gallery) ? gallery.map(function (media) {
      return Object.assign({}, media);
    }) : [];
  }

  function cloneProducts() {
    return products.map(function (product) {
      var copy = Object.assign({}, product);
      copy.gallery = cloneGallery(product.gallery);
      return copy;
    });
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

  window.SCOOTSHOP_CATEGORIES = cloneCategoryDefinitions();
  window.SCOOTSHOP_SERIES = cloneSeriesDefinitions();
  window.SCOOTSHOP_PRODUCTS = cloneProducts();
  window.SCOOTSHOP_CATALOG = {
    categories: cloneCategoryDefinitions(),
    series: cloneSeriesDefinitions(),
    products: cloneProducts()
  };
  window.SCOOTSHOP_getMenuCategories = getMenuCategories;
  window.SCOOTSHOP_getMenuSeries = getMenuSeries;
  window.SCOOTSHOP_getHomeCategories = getHomeCategories;
  window.SCOOTSHOP_getHomeSeries = getHomeSeries;
  window.SCOOTSHOP_getCategoryProducts = getCategoryProducts;
  window.SCOOTSHOP_getCategorySeries = getCategorySeries;
  window.SCOOTSHOP_getSeriesProducts = getSeriesProducts;
})();

