/* Une seule porte de sortie vers SpeechSynthesis et un cycle Lydia → micro. */
(function (root) {
  'use strict';
  // Prénoms explicitement féminins des voix françaises Apple, Microsoft et systèmes courants.
  const femaleFrenchNames = ['amelie', 'aurelie', 'audrey', 'celine', 'julie', 'marie', 'virginie', 'lea', 'hortense', 'denise', 'charlotte', 'pauline', 'helene', 'sophie', 'veronique'];
  const plain = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  class LydiaVoice {
    constructor({ onText, onStatus, canListen, onFailure }) {
      Object.assign(this, { onText, onStatus, canListen, onFailure });
      this.Recognition = root.SpeechRecognition || root.webkitSpeechRecognition;
      this.GrammarList = root.SpeechGrammarList || root.webkitSpeechGrammarList;
      this.generation = 0; this.recognition = null; this.timer = null;
      this.blocked = false; this.speaking = false; this.femaleVoice = null;
      this.acceptingResult = false; this.ignoreResultsUntil = 0; this.speechId = 0; this.lastLydiaText = '';
      this.voiceReady = this.loadFemaleVoice();
    }
    get supported() { return !!this.Recognition && !!root.speechSynthesis; }
    chooseFemaleVoice(voices) {
      return voices.find(voice => /^fr(?:-|_)/i.test(voice.lang || '') && femaleFrenchNames.some(name => plain(voice.name).includes(name))) || null;
    }
    loadFemaleVoice() {
      if (!root.speechSynthesis) return Promise.resolve(null);
      return new Promise(resolve => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          const voice = this.chooseFemaleVoice(root.speechSynthesis.getVoices());
          if (!voice) return;
          settled = true; this.femaleVoice = voice;
          root.speechSynthesis.removeEventListener?.('voiceschanged', finish);
          resolve(voice);
        };
        root.speechSynthesis.addEventListener?.('voiceschanged', finish);
        finish();
        this.voiceTimer = setTimeout(() => {
          if (settled) return;
          settled = true;
          root.speechSynthesis.removeEventListener?.('voiceschanged', finish);
          resolve(null);
        }, 1800);
      });
    }
    stop() {
      this.generation++; clearTimeout(this.timer); this.timer = null;
      const rec = this.recognition; this.recognition = null;
      if (rec) { rec.onend = rec.onresult = rec.onerror = rec.onnomatch = null; try { rec.abort(); } catch (_) {} }
      this.speaking = false; this.acceptingResult = false; this.speechId++;
      if (root.speechSynthesis) root.speechSynthesis.cancel();
    }
    speakFemale(text, generation, speechId, done) {
      const utterance = new SpeechSynthesisUtterance(text);
      // 150 % de la cadence précédente (.85 × 1,5 = 1,275).
      utterance.lang = 'fr-FR'; utterance.rate = 1.275; utterance.pitch = 1;
      utterance.voice = this.femaleVoice;
      utterance.onend = () => {
        if (generation !== this.generation || speechId !== this.speechId) return;
        this.speaking = false; done();
        this.ignoreResultsUntil = 0;
        this.acceptingResult = true; this.listen();
      };
      utterance.onerror = event => {
        if (generation !== this.generation || speechId !== this.speechId || ['canceled', 'interrupted'].includes(event.error)) return;
        this.speaking = false; this.onFailure('La voix de Lydia n’a pas pu parler. Le texte reste affiché.');
      };
      root.speechSynthesis.speak(utterance);
    }
    say(text, done = () => {}) {
      // Chrome peut conserver la transcription de Lydia dans une écoute continue.
      // On ferme cette session avant sa phrase et on ouvre une session neuve pour le joueur.
      this.stop();
      const generation = this.generation, speechId = ++this.speechId;
      this.lastLydiaText = plain(text);
      if (!root.speechSynthesis) { this.onFailure('Synthèse vocale indisponible. Le texte de Lydia reste affiché.'); return; }
      this.speaking = true; this.acceptingResult = false; this.onStatus('Lydia prépare sa voix…');
      // Une voix peut arriver tardivement après voiceschanged : chaque phrase
      // retente alors la sélection explicite, sans jamais retomber sur la voix par défaut.
      const begin = voice => {
        if (generation !== this.generation) return;
        if (!voice) {
          this.speaking = false;
          this.onFailure('Aucune voix française féminine connue n’est disponible. Le texte de Lydia reste affiché ; aucune voix masculine ne sera utilisée.');
          done();
          this.acceptingResult = true; this.listen();
          return;
        }
        this.onStatus('Lydia parle…');
        this.speakFemale(text, generation, speechId, done);
      };
      if (this.femaleVoice) begin(this.femaleVoice);
      else this.loadFemaleVoice().then(begin);
    }
    listen() {
      if (!this.supported || this.blocked || this.speaking || this.recognition || !this.canListen()) return;
      const generation = this.generation;
      const rec = this.recognition = new this.Recognition();
      rec.lang = 'fr-FR'; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 3;
      // Dictionnaire restreint aux chiffres : il oriente les moteurs qui prennent
      // encore en charge SpeechGrammarList, sans bloquer les navigateurs qui l'ignorent.
      if (this.GrammarList) try {
        const grammar = '#JSGF V1.0; grammar detrompeur; public <chiffre> = zero | un | deux | trois | quatre | cinq | six | sept | huit | neuf; public <code> = <chiffre> <chiffre> | dix | onze | douze | treize | quatorze | quinze | seize | vingt | trente | quarante | cinquante | soixante | quatre vingt;';
        const grammars = new this.GrammarList(); grammars.addFromString(grammar, 1); rec.grammars = grammars;
      } catch (_) {}
      rec.onstart = () => { if (generation === this.generation && this.canListen()) this.onStatus('Écoute en cours — parle maintenant'); };
      rec.onresult = event => {
        if (generation !== this.generation || this.speaking || !this.canListen() || !this.acceptingResult || Date.now() < this.ignoreResultsUntil) return;
        const result = event.results[event.resultIndex];
        if (!result || !result.isFinal) return;
        const alternatives = [];
        for (let i = 0; i < result.length; i++) {
          const transcript = result[i].transcript, normalized = plain(transcript);
          // Lydia annonce toujours le BIN ; ne jamais confondre son annonce avec
          // le détrompeur du joueur, même si la transcription arrive en retard.
          if (normalized === this.lastLydiaText || normalized.startsWith('bin ')) continue;
          alternatives.push(transcript);
        }
        if (!alternatives.length) return;
        this.stop(); this.onText(alternatives);
      };
      rec.onnomatch = () => { if (generation === this.generation) this.onStatus('Aucune parole comprise. Réessaie.'); };
      rec.onerror = event => {
        if (generation !== this.generation || event.error === 'aborted') return;
        if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported'].includes(event.error)) {
          this.blocked = true; this.stop();
          const errors = { 'not-allowed': 'Micro refusé : autorise le microphone puis clique sur Réactiver le micro.', 'service-not-allowed': 'Reconnaissance vocale indisponible dans ce navigateur.', 'audio-capture': 'Aucun microphone disponible.', network: 'Service vocal inaccessible. Vérifie la connexion puis réactive le micro.', 'language-not-supported': 'Reconnaissance française indisponible.' };
          this.onFailure(errors[event.error]);
        } else this.onStatus('Écoute terminée sans réponse. Réessaie.');
      };
      rec.onend = () => {
        if (generation !== this.generation) return;
        this.recognition = null;
        this.acceptingResult = false;
        if (!this.blocked && this.canListen()) this.timer = setTimeout(() => this.listen(), 350);
      };
      try { rec.start(); } catch (error) { this.recognition = null; this.onFailure('Micro indisponible : ' + error.message); }
    }
  }
  root.LydiaVoice = LydiaVoice;
})(window);
