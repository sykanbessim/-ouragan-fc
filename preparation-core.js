/* Logique indépendante du navigateur : emplacements, parole et validation. */
(function (root) {
  'use strict';
  const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
  const DIGITS = ['zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  // Erreurs françaises courantes des moteurs vocaux, limitées au contexte numérique.
  const DIGIT_ALIASES = Object.freeze({ une: 'un', hein: 'un', ans: 'un', de: 'deux', sain: 'cinq', saint: 'cinq', cette: 'sept', oui: 'huit', neuve: 'neuf' });
  const COMPOUND_DIGIT_ALIASES = Object.freeze({ catin: ['quatre', 'un'], catherine: ['quatre', 'un'], kitkat: ['quatre', 'quatre'], kitcat: ['quatre', 'quatre'], kisskat: ['quatre', 'quatre'], kisscat: ['quatre', 'quatre'], kiskat: ['quatre', 'quatre'], kiscat: ['quatre', 'quatre'] });
  const UNITS = { zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16 };
  const TENS = { vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
  const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-'’.,;:!?]/g, ' ').trim().replace(/\s+/g, ' ');
  function codeFromWords(tokens) {
    if (!tokens.length) return null;
    const smallNumber = parts => {
      if (parts.length === 1 && Object.hasOwn(UNITS, parts[0])) return UNITS[parts[0]];
      if (parts.length === 2 && parts[0] === 'dix' && Object.hasOwn(UNITS, parts[1]) && UNITS[parts[1]] < 10) return 10 + UNITS[parts[1]];
      return null;
    };
    if (tokens.length === 1 && /^\d{1,2}$/.test(tokens[0])) return Number(tokens[0]);
    if (tokens.length === 2 && tokens.every(token => /^\d$/.test(token))) return Number(tokens.join(''));
    if (tokens.length === 2 && tokens.every(t => Object.hasOwn(UNITS, t) && UNITS[t] < 10)) return UNITS[tokens[0]] * 10 + UNITS[tokens[1]];
    if (tokens.length === 1 && Object.hasOwn(UNITS, tokens[0])) return UNITS[tokens[0]];
    // 70 à 79 : « soixante-douze », « soixante et onze », etc.
    if (tokens[0] === 'soixante') {
      const rest = tokens.slice(1); if (rest[0] === 'et') rest.shift();
      const suffix = smallNumber(rest); if (suffix !== null) return 60 + suffix;
    }
    // 80 à 99 : « quatre-vingt-un », « quatre-vingt-dix-neuf », etc.
    if (tokens[0] === 'quatre' && tokens[1] === 'vingt') {
      const rest = tokens.slice(2); if (!rest.length) return 80;
      if (rest[0] === 'et') rest.shift();
      const suffix = smallNumber(rest); if (suffix !== null) return 80 + suffix;
    }
    if (tokens[0] === 'dix' && tokens.length === 2 && Object.hasOwn(UNITS, tokens[1]) && UNITS[tokens[1]] < 10) return 10 + UNITS[tokens[1]];
    if (tokens[0] === 'dix' && tokens[1] === 'sept' && tokens.length === 2) return 17;
    const base = TENS[tokens[0]];
    if (base !== undefined) {
      if (tokens.length === 1) return base;
      if (tokens.length === 2 && tokens[1] === 'et') return null;
      const unitIndex = tokens[1] === 'et' ? 2 : 1;
      if (tokens.length === unitIndex + 1 && Object.hasOwn(UNITS, tokens[unitIndex]) && UNITS[tokens[unitIndex]] < 10) return base + UNITS[tokens[unitIndex]];
    }
    if (tokens[0] === 'soixante' && tokens[1] === 'dix') {
      if (tokens.length === 2) return 70;
      if (tokens.length === 3 && Object.hasOwn(UNITS, tokens[2]) && UNITS[tokens[2]] < 10) return 70 + UNITS[tokens[2]];
    }
    if (tokens[0] === 'quatre' && tokens[1] === 'vingt') {
      if (tokens.length === 2) return 80;
      if (tokens.length === 3 && Object.hasOwn(UNITS, tokens[2]) && UNITS[tokens[2]] < 10) return 80 + UNITS[tokens[2]];
    }
    return null;
  }
  function digits(text) {
    let normalized = normalize(text).replace(/\b(?:kit|kiss|kis) (?:kat|cat)\b/g, 'quatre quatre');
    let tokens = normalized.split(' ').filter(Boolean).flatMap(token => {
      if (COMPOUND_DIGIT_ALIASES[token]) return COMPOUND_DIGIT_ALIASES[token];
      if (/^\d$/.test(token)) return DIGITS[Number(token)];
      return DIGIT_ALIASES[token] || token;
    });
    while (tokens[0] === 'numero' || tokens[0] === 'detrompeur' || tokens[0] === 'code') tokens.shift();
    const value = codeFromWords(tokens);
    // Un détrompeur est toujours lu avec ses deux chiffres : « zéro, cinq ».
    if (value !== null && value < 10 && tokens.length !== 2) return null;
    return value === null || value < 0 || value > 99 ? null : String(value).padStart(2, '0');
  }
  function phonetic(text) {
    return normalize(text).replace(/qu/g, 'k').replace(/c(?=[aou])/g, 'k').replace(/ph/g, 'f').replace(/[^a-z]/g, '').replace(/h/g, '');
  }
  function distance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i++) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const saved = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = saved; } }
    return row[b.length];
  }
  // Dernier recours pour les transcriptions phonétiques inconnues : « catine »
  // peut être rapproché de « quatre, un », uniquement pour le code attendu.
  function guessDigits(text, expected) {
    if (!/^\d{2}$/.test(expected || '')) return null;
    const heard = phonetic(text), spoken = phonetic(DIGITS[Number(expected[0])] + DIGITS[Number(expected[1])]);
    if (!heard || !spoken) return null;
    return distance(heard, spoken) <= Math.max(3, Math.floor(spoken.length * .6)) ? expected : null;
  }
  function candidateValue(input, parser) {
    const values = [...new Set((Array.isArray(input) ? input : [input]).map(parser).filter(v => v !== null && v !== -1))];
    return values.length === 1 ? values[0] : null;
  }
  function destination(text) {
    const match = /^(?:un|1) (alpha|bravo|charlie|delta)$/.exec(normalize(text));
    return match ? NAMES.findIndex(n => n.toLowerCase() === match[1]) : -1;
  }
  function locations(rng = Math.random) {
    const list = [];
    const previous = { left: null, right: null };
    for (let id = 1; id <= 200; id++) {
      const side = id % 2 ? 'left' : 'right';
      // Choisir dans les possibilités évite une boucle infinie même avec un RNG de test constant.
      const options = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'))
        .filter(code => code !== previous[side] && Number(code) !== id);
      const code = options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
      const index = Math.floor((id - 1) / 2);
      list.push({ id, number: String(id), code, side, bay: Math.floor(index / 3), slot: index % 3 });
      previous[side] = code;
    }
    return list;
  }
  class Session {
    constructor(rng = Math.random) { this.rng = rng; this.phase = 'idle'; this.score = 0; this.errors = 0; this.paused = false; this.orderId = 0; this.bins = []; }
    prepareAisle() {
      this.aislePickLimit = 10 + Math.floor(this.rng() * 41);
      const candidates = Array.from({ length: 200 }, (_, index) => index + 1);
      const selected = [];
      for (let i = 0; i < this.aislePickLimit; i++) selected.push(candidates.splice(Math.floor(this.rng() * candidates.length), 1)[0]);
      this.aisleBinOrder = selected.sort((a, b) => a - b);
      this.picksInAisle = 0;
    }
    start(test = false) {
      this.test = test; this.bins = locations(this.rng); this.score = this.errors = 0; this.paused = false;
      this.aisle = 1; this.prepareAisle();
      if (test) { // Code connu, tout en maintenant l'invariant des voisins.
        this.bins[149].code = '25';
        for (const id of [148, 152]) if (this.bins[id - 1].code === '25') {
          const excluded = [this.bins[id - 3].code, this.bins[id + 1].code];
          this.bins[id - 1].code = Array.from({length:100}, (_,i)=>String(i).padStart(2,'0')).find(c=>!excluded.includes(c));
        }
      }
      return this.next();
    }
    next() {
      this.orderId++;
      let newAisle = false;
      if (this.test) this.bin = this.bins[149];
      else {
        if (this.picksInAisle >= this.aisleBinOrder.length) {
          this.aisle++; this.prepareAisle(); newAisle = true;
        }
        this.bin = this.bins[this.aisleBinOrder[this.picksInAisle] - 1]; this.picksInAisle++;
      }
      this.target = this.test ? 3 : Math.floor(this.rng() * 4);
      this.phase = 'code'; this.partial = ''; this.codeOK = false;
      const say = newAisle ? 'Couloir ' + this.aisle + '. Bin ' + this.bin.number : 'Bin ' + this.bin.number;
      return { ok: true, say, event: 'order', newAisle, aisle: this.aisle, picksInAisle: this.picksInAisle, aislePickLimit: this.aislePickLimit };
    }
    fail(say) { this.errors++; return { ok: false, say, event: 'error' }; }
    retry(say) { return { ok: false, say, event: 'retry' }; }
    hear(text) {
      if (this.paused || !['code', 'destination'].includes(this.phase)) return { ignored: true };
      if (this.phase === 'code') {
        const values = [...new Set((Array.isArray(text) ? text : [text]).map(value => digits(value) || guessDigits(value, this.bin.code)).filter(value => value !== null))];
        // Chrome peut proposer plusieurs transcriptions pour la même réponse.
        // L'une d'elles suffit si elle correspond exactement au code du BIN courant.
        const value = values.length === 1 ? values[0] : (values.includes(this.bin.code) ? this.bin.code : null);
        if (value === null) return this.retry('Répète le détrompeur, chiffre par chiffre.');
        const correct = value === this.bin.code;
        if (!correct) return this.retry('Répète le détrompeur, chiffre par chiffre.');
        this.codeOK = true; this.phase = 'roll';
        return { ok: true, say: 'Un ' + NAMES[this.target], event: 'code' };
      }
    }
    deposit(index) {
      if (this.paused || this.phase !== 'roll' || !this.codeOK) return { ignored: true };
      if (index !== this.target) return this.fail('Erreur de dépôt. Il faut le roll ' + NAMES[this.target]);
      this.score++; this.phase = 'complete';
      return { ok: true, event: 'complete' };
    }
  }
  root.Preparation = { NAMES, DIGITS, normalize, digits, guessDigits, destination, locations, Session };
})(typeof globalThis !== 'undefined' ? globalThis : this);
