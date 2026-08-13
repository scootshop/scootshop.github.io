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
      key: 'n',
      label: 'Serie N',
      categoryKey: 'electric-scooters',
      menuOrder: 2,
      homeOrder: 2,
      homeSectionId: 'series-n',
      homeTitle: 'Series N',
      homeDescription: 'Serie versátil con enfoque en estabilidad, autonomía y uso cotidiano.',
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
      homeDescription: 'Gama de alto rendimiento para quienes buscan potencia y control.',
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
      homeDescription: 'Línea práctica y eficiente para ciudad y trayectos habituales.',
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
      homeDescription: 'Complementos clave para mejorar comodidad, seguridad y funcionalidad.',
      homeAriaLabel: 'Lista de accesorios'
    }
    ,{
      key: 'acc-limit',
      label: 'Limitadores',
      categoryKey: 'accessories',
      menuOrder: 2,
      homeOrder: 2,
      homeSectionId: 'series-limitadores',
      homeTitle: 'Limitadores',
      homeDescription: 'Mandos para alternar entre el modo homologado de 25 km/h y el modo libre de uso privado.',
      homeAriaLabel: 'Lista de limitadores y deslimitadores'
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
              range: [13, 16]
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
              range: [23, 23]
            },
            {
              key: 'amarillo',
              label: 'Amarillo',
              swatch: '#f0c000',
              range: [24, 24]
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
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/23.webp', alt: 'Ecoxtrem M41 Armored Dual vista 23' },
        { src: '/patinetes/ecoxtrem/m41-armored-dual/img/24.webp', alt: 'Ecoxtrem M41 Armored Dual vista 24' }
      ]
    },
    {
      id: 'ecoxtrem-m41-armored-one',
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
            { key: 'naranja', label: 'Naranja', swatch: '#ea580c', range: [1, 5], default: true },
            { key: 'azul-oscuro', label: 'Azul oscuro', swatch: '#0b1b3a', range: [6, 9] },
            { key: 'blanco', label: 'Blanco', swatch: '#f8fafc', range: [10, 15] },
            { key: 'rojo-rosa', label: 'Rojo rosa', swatch: '#f43f5e', range: [16, 16] },
            { key: 'verde-militar', label: 'Verde militar', swatch: '#4b5320', range: [17, 17] }
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
          label: 'Modelo',
          type: 'pill',
          options: [
            {
              key: 'vmp',
              label: 'G2 PRO VMP',
              images: [1, 2, 3, 4, 5, 6, 7],
              default: true,
              dgt: true,
              desc: '<strong>KUKIRIN G2 PRO</strong> en versión VMP: homologado por la DGT y limitado a 25 km/h. Motor brushless de 600 W, batería de 48 V 15 Ah y hasta 65 km de autonomía.'
            },
            {
              key: 'normal',
              label: 'G2 PRO Normal',
              images: [8, 9, 10, 11, 12],
              dgt: false,
              desc: '<strong>KUKIRIN G2 PRO</strong> en versión Normal: deslimitado, con motor brushless de 600 W, batería de 48 V 15 Ah, punta de 45 km/h y hasta 65 km de autonomía. <strong>Sin homologación DGT</strong>: solo para circuito o recinto privado.'
            }
          ]
        }
      ]
    },
    {
      id: 'k-g2',
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
      id: 't10-dual',
      sku: 'T10DUAL',
      name: 'JOYOR T10 DUAL',
      menuLabel: 'T10 DUAL',
      badgeText: 'JOYOR T10 DUAL',
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
      homeTitle: 'JOYOR T10 DUAL',
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
      accessoryCategory: 'bags',
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
              default: true
            },
            {
              key: 'negro-rojo',
              label: 'Negro y rojo',
              swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#a8362f 50%)'
            },
            {
              key: 'negro-morado',
              label: 'Negro y morado',
              swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#7b2f8e 50%)'
            },
            {
              key: 'negro-verde',
              label: 'Negro y verde',
              swatch: 'linear-gradient(135deg,#1a1a1a 0 50%,#a5b938 50%)'
            },
            {
              key: 'rojo',
              label: 'Rojo',
              swatch: '#b02a22'
            },
            {
              key: 'dorado',
              label: 'Dorado',
              swatch: '#c9a92c'
            },
            {
              key: 'azul',
              label: 'Azul',
              swatch: '#1987c0'
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
        { src: '/accesorios/manillar-wake-downhill/img/1.webp', alt: 'Manillar WAKE Downhill de aluminio en sus siete colores' },
        { src: '/accesorios/manillar-wake-downhill/img/2.webp', alt: 'Manillar WAKE Downhill – medidas: 780 mm de largo, 55 mm de alza, abrazadera 31,8 mm y puños 22,2 mm' },
        { src: '/accesorios/manillar-wake-downhill/img/3.webp', alt: 'Manillar WAKE Downhill – los siete colores disponibles' },
        { src: '/accesorios/manillar-wake-downhill/img/4.webp', alt: 'Manillar WAKE Downhill montado en una bicicleta' },
        { src: '/accesorios/manillar-wake-downhill/img/5.webp', alt: 'Manillar WAKE Downhill – acabado granallado y anodizado' },
        { src: '/accesorios/manillar-wake-downhill/img/6.webp', alt: 'Manillar WAKE Downhill – detalle del logo y del grabado' },
        { src: '/accesorios/manillar-wake-downhill/img/7.webp', alt: 'Manillar WAKE Downhill en negro y blanco' },
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
            {
              key: 'tornasol-negro',
              label: 'Tornasol negro · alza 25 mm',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#111111 50%)',
              default: true
            },
            {
              key: 'tornasol-blanco',
              label: 'Tornasol blanco · alza 25 mm',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 28%,#06b6d4 50%,#f8fafc 50%)'
            },
            {
              key: 'tornasol-freedom',
              label: 'Tornasol Freedom · alza 25 mm',
              swatch: 'linear-gradient(135deg,#a855f7 0%,#3b82f6 38%,#06b6d4 68%,#22c55e 100%)'
            },
            {
              key: 'tornasol-024-negro',
              label: 'Tornasol 024 negro · alza 50 mm',
              swatch: 'linear-gradient(135deg,#22c55e 0%,#0ea5e9 28%,#7c3aed 50%,#111111 50%)'
            },
            {
              key: 'tornasol-024-blanco',
              label: 'Tornasol 024 blanco · alza 50 mm',
              swatch: 'linear-gradient(135deg,#22c55e 0%,#0ea5e9 28%,#7c3aed 50%,#f8fafc 50%)'
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
        { src: '/accesorios/manillar-nanlio/img/1.webp', alt: 'Manillar NANLIO tornasol de 780 mm en sus distintos acabados' },
        { src: '/accesorios/manillar-nanlio/img/2.webp', alt: 'Manillar NANLIO – medidas: 780 mm, alza 25 mm, abrazadera 31,8 mm y 399 g' },
        { src: '/accesorios/manillar-nanlio/img/3.webp', alt: 'Manillar NANLIO – los cinco acabados alineados' },
        { src: '/accesorios/manillar-nanlio/img/4.webp', alt: 'Manillar NANLIO 024 – la versión de alza 50 mm' },
        { src: '/accesorios/manillar-nanlio/img/5.webp', alt: 'Manillar NANLIO tornasol negro, alza 25 mm' },
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
      sku: 'IX8',
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

  function cloneProducts() {
    return products.map(function (product) {
      var copy = Object.assign({}, product);
      copy.gallery = cloneGallery(product.gallery);
      if (Array.isArray(product.attributes)) copy.attributes = cloneAttributes(product.attributes);
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
  var accessoryCategoryDefinitions = [
    { key: 'handlebars', label: 'Manillares', order: 1 },
    { key: 'limiters',   label: 'Mandos limitadores', order: 2 },
    { key: 'bags',       label: 'Bolsas y transporte', order: 3 },
    { key: 'lighting',   label: 'Iluminación', order: 4 },
    { key: 'mounts',     label: 'Soportes', order: 5 },
    { key: 'stickers',   label: 'Pegatinas', order: 6 }
  ];

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
    var universales = [];
    for (var u = 0; u < todos.length; u++) {
      var acc = todos[u];
      if (!Array.isArray(acc.fitsCategories)) continue;
      if (acc.fitsCategories.indexOf(origen.categoryKey) !== -1) universales.push(acc.sku);
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
  window.SCOOTSHOP_getMenuCategories = getMenuCategories;
  window.SCOOTSHOP_getMenuSeries = getMenuSeries;
  window.SCOOTSHOP_getHomeCategories = getHomeCategories;
  window.SCOOTSHOP_getHomeSeries = getHomeSeries;
  window.SCOOTSHOP_getCategoryProducts = getCategoryProducts;
  window.SCOOTSHOP_getCategorySeries = getCategorySeries;
  window.SCOOTSHOP_getSeriesProducts = getSeriesProducts;
  window.SCOOTSHOP_getCompatibleAccessories = getCompatibleAccessories;
  window.SCOOTSHOP_getAccessoryCategories = getAccessoryCategories;
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

