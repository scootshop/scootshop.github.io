/* address-fields.js — campos de Contacto + Dirección compartidos entre
   el checkout y /cuenta. Una sola fuente de provincias, validación de CP,
   prefijo telefónico, placeholders y autocompletado CP→ciudad/provincia.
   Los helpers operan sobre un "root" (un formulario) buscando los campos
   por su atributo data-addr, así pueden convivir varios formularios. */
(function () {
  'use strict';

  function txt(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var COUNTRIES = ['España', 'Portugal', 'Francia', 'Italia', 'Alemania'];

  var PROVINCES = {
    'España': [
      'A Coruña', 'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Barcelona', 'Burgos',
      'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca', 'Girona', 'Granada',
      'Guadalajara', 'Gipuzkoa', 'Huelva', 'Huesca', 'Jaén', 'La Rioja', 'León', 'Lleida',
      'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia', 'Pontevedra', 'Salamanca',
      'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya',
      'Zamora', 'Zaragoza'
    ],
    'Portugal': [
      'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Leiria',
      'Lisboa', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu'
    ],
    'Francia': [
      'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire',
      'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine',
      'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'
    ],
    'Italia': [
      'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli Venezia Giulia',
      'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia',
      'Toscana', 'Trentino-Alto Adige', 'Umbria', 'Valle d\'Aosta', 'Veneto'
    ],
    'Alemania': [
      'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen',
      'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz',
      'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
    ]
  };

  var POSTAL = {
    'España':   { apiCode: 'es', digits: 5, inputmode: 'numeric', maxlength: '5', placeholder: '28001',    hyphen: false },
    'Portugal': { apiCode: 'pt', digits: 4, inputmode: 'text',    maxlength: '8', placeholder: '1000-001', hyphen: true },
    'Francia':  { apiCode: 'fr', digits: 5, inputmode: 'numeric', maxlength: '5', placeholder: '75001',    hyphen: false },
    'Italia':   { apiCode: 'it', digits: 5, inputmode: 'numeric', maxlength: '5', placeholder: '00100',    hyphen: false },
    'Alemania': { apiCode: 'de', digits: 5, inputmode: 'numeric', maxlength: '5', placeholder: '10115',    hyphen: false }
  };

  var PREFIX = { 'España': '+34', 'Portugal': '+351', 'Francia': '+33', 'Italia': '+39', 'Alemania': '+49' };

  var PLACEHOLDERS = {
    'España':   { city: 'Madrid', address: 'Calle Gran Vía 1',  phone: '600 000 000' },
    'Portugal': { city: 'Lisboa', address: 'Rua Augusta 1',     phone: '912 345 678' },
    'Francia':  { city: 'Paris',  address: '12 Rue de Rivoli',  phone: '06 12 34 56 78' },
    'Italia':   { city: 'Roma',   address: 'Via del Corso 1',   phone: '312 345 6789' },
    'Alemania': { city: 'Berlin', address: 'Friedrichstraße 1', phone: '170 123 4567' }
  };

  var SPAIN_POSTAL_MAP = {
    '01': 'Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila', '06': 'Badajoz', '08': 'Barcelona', '09': 'Burgos',
    '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña', '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara',
    '20': 'Gipuzkoa', '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida', '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga',
    '30': 'Murcia', '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '36': 'Pontevedra', '37': 'Salamanca', '39': 'Cantabria',
    '40': 'Segovia', '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel', '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Vizcaya', '49': 'Zamora',
    '50': 'Zaragoza'
  };

  var API_STATE_ALIASES = {
    'Francia': {
      'Alsace': 'Grand Est', 'Champagne-Ardenne': 'Grand Est', 'Lorraine': 'Grand Est',
      'Aquitaine': 'Nouvelle-Aquitaine', 'Limousin': 'Nouvelle-Aquitaine', 'Poitou-Charentes': 'Nouvelle-Aquitaine',
      'Auvergne': 'Auvergne-Rhône-Alpes', 'Rhône-Alpes': 'Auvergne-Rhône-Alpes',
      'Bourgogne': 'Bourgogne-Franche-Comté', 'Franche-Comté': 'Bourgogne-Franche-Comté',
      'Basse-Normandie': 'Normandie', 'Haute-Normandie': 'Normandie',
      'Languedoc-Roussillon': 'Occitanie', 'Midi-Pyrénées': 'Occitanie',
      'Nord-Pas-de-Calais': 'Hauts-de-France', 'Picardie': 'Hauts-de-France',
      'Centre': 'Centre-Val de Loire'
    }
  };

  var postalCache = Object.create(null);
  var postalToken = 0;

  // ── Helpers de datos ───────────────────────────────────────────
  function postalConfig(country) { return POSTAL[country] || null; }

  function cleanPostal(value, country) {
    var cfg = postalConfig(country);
    if (!cfg) return String(value || '').trim();
    if (cfg.hyphen) {
      var d = String(value || '').replace(/[^\d-]/g, '').replace(/-/g, '');
      if (d.length > 4) return d.slice(0, 4) + '-' + d.slice(4, 7);
      return d.slice(0, 4);
    }
    return String(value || '').replace(/\D+/g, '').slice(0, cfg.digits);
  }

  function isPostalReady(value, country) {
    var cfg = postalConfig(country);
    if (!cfg) return value.length >= 3;
    if (cfg.hyphen) return /^\d{4}(-\d{3})?$/.test(value) && value.length >= 4;
    return value.replace(/\D/g, '').length === cfg.digits;
  }

  function spainProvinceFromPostal(postal) {
    var clean = String(postal || '').replace(/\D+/g, '').slice(0, 5);
    if (clean.length < 2) return '';
    return SPAIN_POSTAL_MAP[clean.slice(0, 2)] || '';
  }

  function resolveApiState(apiState, country) {
    if (!apiState) return '';
    var aliases = API_STATE_ALIASES[country];
    if (aliases && aliases[apiState]) return aliases[apiState];
    return apiState;
  }

  function matchProvince(value, country) {
    var list = PROVINCES[country];
    if (!list || !value) return '';
    var lower = value.toLowerCase();
    for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === lower) return list[i];
    for (var j = 0; j < list.length; j++) {
      if (list[j].toLowerCase().indexOf(lower) !== -1 || lower.indexOf(list[j].toLowerCase()) !== -1) return list[j];
    }
    return '';
  }

  function formatPhone(value) {
    var digits = String(value || '').replace(/\D+/g, '');
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  }

  // ── Constructores de markup (mismas clases/estructura que el checkout) ──
  function countryOptions(selected) {
    return COUNTRIES.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === selected ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
  }

  function provinceOptions(country, selected) {
    var list = PROVINCES[country] || [];
    var sel = txt(selected);
    return '<option value="">Selecciona provincia / región</option>' + list.map(function (name) {
      return '<option value="' + esc(name) + '"' + (name === sel ? ' selected' : '') + '>' + esc(name) + '</option>';
    }).join('');
  }

  function contactFieldsHtml(o) {
    o = o || {};
    var v = o.values || {};
    var p = o.idPrefix || 'addr';
    var emailAttr = o.emailDisabled ? ' disabled' : '';
    return [
      '<div class="form-grid">',
      '  <div class="field field--full">',
      '    <label for="' + p + '_fullName">Nombre y apellidos *</label>',
      '    <input id="' + p + '_fullName" data-addr="fullName" type="text" autocomplete="name" placeholder="Nombre completo" maxlength="190" value="' + esc(v.fullName || '') + '" required>',
      '  </div>',
      '  <div class="field">',
      '    <label for="' + p + '_email">Correo electrónico *</label>',
      '    <input id="' + p + '_email" data-addr="email" type="email" autocomplete="email" placeholder="tu@email.com" maxlength="190" value="' + esc(v.email || '') + '"' + emailAttr + ' required>',
      '  </div>',
      '  <div class="field">',
      '    <label for="' + p + '_phone">Teléfono *</label>',
      '    <div class="phone-group">',
      '      <input id="' + p + '_phonePrefix" data-addr="phonePrefix" type="tel" class="phone-prefix" value="' + esc(v.phonePrefix || '+34') + '" maxlength="5" autocomplete="tel-country-code" aria-label="Prefijo telefónico">',
      '      <input id="' + p + '_phone" data-addr="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="600 000 000" maxlength="19" value="' + esc(v.phone || '') + '" required>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function addressFieldsHtml(o) {
    o = o || {};
    var v = o.values || {};
    var p = o.idPrefix || 'addr';
    var country = v.country || 'España';
    return [
      '<div class="form-grid">',
      '  <div class="field">',
      '    <label for="' + p + '_country">País *</label>',
      '    <select id="' + p + '_country" data-addr="country" autocomplete="country-name" required>' + countryOptions(country) + '</select>',
      '  </div>',
      '  <div class="field field--full">',
      '    <label for="' + p + '_address">Dirección *</label>',
      '    <input id="' + p + '_address" data-addr="address" type="text" autocomplete="address-line1" placeholder="Calle, número y edificio" maxlength="255" value="' + esc(v.address || '') + '" required>',
      '  </div>',
      '  <div class="field field--full">',
      '    <label for="' + p + '_address2">Piso, puerta o referencia <span class="opt">(opcional)</span></label>',
      '    <input id="' + p + '_address2" data-addr="address2" type="text" autocomplete="address-line2" placeholder="Ej: 2ºB, escalera derecha…" maxlength="255" value="' + esc(v.address2 || '') + '">',
      '  </div>',
      '  <div class="field">',
      '    <label for="' + p + '_postal">Código postal *</label>',
      '    <input id="' + p + '_postal" data-addr="postal" type="text" autocomplete="postal-code" inputmode="numeric" placeholder="28001" maxlength="16" value="' + esc(v.postal || '') + '" required>',
      '  </div>',
      '  <div class="field">',
      '    <label for="' + p + '_city">Ciudad *</label>',
      '    <input id="' + p + '_city" data-addr="city" type="text" autocomplete="address-level2" placeholder="Madrid" maxlength="100" value="' + esc(v.city || '') + '" required>',
      '  </div>',
      '  <div class="field field--province">',
      '    <label for="' + p + '_province">Provincia *</label>',
      '    <select id="' + p + '_province" data-addr="province" autocomplete="address-level1" required></select>',
      '    <input id="' + p + '_provinceCustom" data-addr="provinceCustom" type="text" autocomplete="address-level1" placeholder="Escribe tu provincia o región" maxlength="100" hidden>',
      '  </div>',
      '</div>'
    ].join('');
  }

  // ── Helpers de DOM (sobre un root con campos data-addr) ─────────
  function role(root, r) { return root ? root.querySelector('[data-addr="' + r + '"]') : null; }
  function currentCountry(root) { var c = role(root, 'country'); return (c && txt(c.value)) || 'España'; }

  function syncProvince(root, selectedValue) {
    var sel = role(root, 'province');
    var custom = role(root, 'provinceCustom');
    if (!sel) return;
    var country = currentCountry(root);
    var list = PROVINCES[country];
    var current = txt(selectedValue);
    if (list) {
      sel.innerHTML = provinceOptions(country, (current && list.indexOf(current) !== -1) ? current : '');
      sel.hidden = false; sel.disabled = false; sel.required = true;
      if (custom) { custom.hidden = true; custom.disabled = true; custom.required = false; custom.value = ''; }
    } else {
      sel.hidden = true; sel.disabled = true; sel.required = false;
      if (custom) { custom.hidden = false; custom.disabled = false; custom.required = true; if (current) custom.value = current; }
    }
  }

  function syncPostal(root) {
    var f = role(root, 'postal');
    if (!f) return;
    var cfg = postalConfig(currentCountry(root));
    if (cfg) {
      f.value = cleanPostal(f.value, currentCountry(root));
      f.setAttribute('inputmode', cfg.inputmode);
      f.setAttribute('maxlength', cfg.maxlength);
      f.setAttribute('placeholder', cfg.placeholder);
      if (!cfg.hyphen) f.setAttribute('pattern', '[0-9]{' + cfg.digits + '}'); else f.removeAttribute('pattern');
    } else {
      f.setAttribute('inputmode', 'text'); f.removeAttribute('pattern'); f.removeAttribute('maxlength');
      f.setAttribute('placeholder', 'Código postal');
    }
  }

  function syncPrefix(root) {
    var f = role(root, 'phonePrefix');
    if (!f) return;
    var prefix = PREFIX[currentCountry(root)] || '+34';
    var was = f.getAttribute('data-auto-prefix');
    var cur = txt(f.value);
    if (!cur || cur === was) { f.value = prefix; f.setAttribute('data-auto-prefix', prefix); }
  }

  function syncPlaceholders(root) {
    var ph = PLACEHOLDERS[currentCountry(root)] || { city: 'Ciudad', address: 'Calle, número y edificio', phone: '600 000 000' };
    var city = role(root, 'city'); if (city) city.setAttribute('placeholder', ph.city);
    var addr = role(root, 'address'); if (addr) addr.setAttribute('placeholder', ph.address);
    var phone = role(root, 'phone'); if (phone) phone.setAttribute('placeholder', ph.phone);
  }

  function setCity(root, value) {
    var f = role(root, 'city');
    if (f && !txt(f.value)) { f.value = txt(value); }
  }

  function autofillFromPostal(root, postal) {
    var country = currentCountry(root);
    var cfg = postalConfig(country);
    if (!cfg) return Promise.resolve();
    var clean = cleanPostal(postal, country);
    if (!isPostalReady(clean, country)) return Promise.resolve();

    var fromPrefix = '';
    if (country === 'España') {
      fromPrefix = spainProvinceFromPostal(clean);
      if (fromPrefix) syncProvince(root, fromPrefix);
    }
    var key = country + ':' + clean;
    if (postalCache[key]) {
      if (postalCache[key].city) setCity(root, postalCache[key].city);
      if (postalCache[key].province) syncProvince(root, postalCache[key].province);
      return Promise.resolve(postalCache[key]);
    }
    var code = cfg.hyphen ? clean : clean.replace(/\D/g, '');
    var url = 'https://api.zippopotam.us/' + cfg.apiCode + '/' + encodeURIComponent(code);
    var token = ++postalToken;
    return fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('postal'); return r.json(); })
      .then(function (data) {
        var place = data && data.places && data.places[0] ? data.places[0] : null;
        var city = place ? txt(place['place name']) : '';
        var matched = matchProvince(resolveApiState(place ? txt(place['state']) : '', country), country) || fromPrefix;
        postalCache[key] = { city: city, province: matched };
        if (token !== postalToken) return postalCache[key];
        if (city) setCity(root, city);
        if (matched) syncProvince(root, matched);
        return postalCache[key];
      })
      .catch(function () { postalCache[key] = { city: '', province: fromPrefix }; return postalCache[key]; });
  }

  // Cablea un formulario de dirección (país/CP/prefijo/autocompletado).
  function bindAddressForm(root, values) {
    if (!root) return;
    var v = values || {};
    syncPostal(root);
    syncPlaceholders(root);
    syncPrefix(root);
    syncProvince(root, v.province || '');
    var country = role(root, 'country');
    if (country) {
      country.addEventListener('change', function () {
        syncPostal(root); syncProvince(root, ''); syncPlaceholders(root); syncPrefix(root);
      });
    }
    var postal = role(root, 'postal');
    if (postal) {
      postal.addEventListener('input', function () {
        postal.value = cleanPostal(postal.value, currentCountry(root));
        autofillFromPostal(root, postal.value);
      });
      postal.addEventListener('blur', function () { autofillFromPostal(root, postal.value); });
      // Si ya viene con valor (edición), autocompletar lo que falte.
      if (txt(postal.value) && (!v.city || !v.province)) autofillFromPostal(root, postal.value);
    }
    var phone = role(root, 'phone');
    if (phone && txt(phone.value)) phone.value = formatPhone(phone.value);
  }

  function readContact(root) {
    return {
      fullName: txt(role(root, 'fullName') && role(root, 'fullName').value),
      email: txt(role(root, 'email') && role(root, 'email').value),
      phonePrefix: txt(role(root, 'phonePrefix') && role(root, 'phonePrefix').value),
      phone: txt(role(root, 'phone') && role(root, 'phone').value)
    };
  }

  function readAddress(root) {
    var prov = role(root, 'province');
    var custom = role(root, 'provinceCustom');
    var province = (prov && !prov.hidden) ? txt(prov.value) : (custom ? txt(custom.value) : '');
    return {
      country: currentCountry(root),
      address: txt(role(root, 'address') && role(root, 'address').value),
      address2: txt(role(root, 'address2') && role(root, 'address2').value),
      postal: txt(role(root, 'postal') && role(root, 'postal').value),
      city: txt(role(root, 'city') && role(root, 'city').value),
      province: province
    };
  }

  window.SS_ADDR = {
    COUNTRIES: COUNTRIES, PROVINCES: PROVINCES, POSTAL: POSTAL, PREFIX: PREFIX,
    PLACEHOLDERS: PLACEHOLDERS, SPAIN_POSTAL_MAP: SPAIN_POSTAL_MAP, API_STATE_ALIASES: API_STATE_ALIASES,
    contactFieldsHtml: contactFieldsHtml, addressFieldsHtml: addressFieldsHtml,
    provinceOptions: provinceOptions, countryOptions: countryOptions,
    bindAddressForm: bindAddressForm, syncProvince: syncProvince, syncPostal: syncPostal,
    syncPrefix: syncPrefix, syncPlaceholders: syncPlaceholders, autofillFromPostal: autofillFromPostal,
    readContact: readContact, readAddress: readAddress,
    formatPhone: formatPhone, cleanPostal: cleanPostal, spainProvinceFromPostal: spainProvinceFromPostal
  };
})();
