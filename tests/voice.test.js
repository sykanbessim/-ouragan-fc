(function(){
'use strict';
const status=[],heard=[],failures=[];let allowed=true;
const voice=new LydiaVoice({onText:t=>heard.push(t),onStatus:t=>status.push(t),onFailure:t=>failures.push(t),canListen:()=>allowed});
function assert(v,m){if(!v)throw Error(m);}
function check(name,fn){fn();TEST_REPORT.passed++;TEST_REPORT.checks.push(name);}
check('Micro coupé pendant Lydia ; anciens résultats ignorés',()=>{
voice.listen();const old=voice.recognition;const late=old.onresult;
voice.say('Bin 150');assert(old.aborted,'micro non arrêté');assert(voice.speaking,'Lydia non active');assert(!voice.recognition,'micro actif pendant Lydia');
late({resultIndex:0,results:[Object.assign([{transcript:'deux cinq'}],{isFinal:true})]});assert(!heard.length,'voix de Lydia acceptée');
speechSynthesis.last.onend();assert(!voice.speaking,'fin de Lydia ignorée');fakeTimers.splice(0).forEach(f=>f());assert(voice.recognition&&voice.acceptingResult,'écoute non reprise');voice.ignoreResultsUntil=0;
});
check('Seul un résultat final et ses alternatives sont transmis',()=>{const rec=voice.recognition;rec.onresult({resultIndex:0,results:[Object.assign([{transcript:'deux'},{transcript:'trois'}],{isFinal:false})]});assert(!heard.length,'intermédiaire accepté');rec.onresult({resultIndex:0,results:[Object.assign([{transcript:'deux cinq'},{transcript:'vingt cinq'}],{isFinal:true})]});assert(heard[0][0]==='deux cinq'&&heard[0][1]==='vingt cinq','alternatives finales absentes');});
check('Refus micro signalé sans boucle de permissions',()=>{voice.listen();const rec=voice.recognition;rec.onerror({error:'not-allowed'});assert(voice.blocked,'pas bloqué');assert(failures.length===1,'erreur absente');voice.listen();assert(!voice.recognition,'relance abusive');});
check('Pause/arrêt annule un callback de synthèse ancien',()=>{let completed=false;voice.say('Un Delta',()=>completed=true);const end=speechSynthesis.last.onend;voice.stop();end();assert(!completed,'callback ancien exécuté');});
check('Voix française féminine connue : chargement tardif et refus d’une voix masculine',()=>{const late=new LydiaVoice({onText(){},onStatus(){},onFailure(){},canListen:()=>false});assert(late.femaleVoice&&late.femaleVoice.name==='Amélie','Amélie non retenue');assert(late.chooseFemaleVoice([{name:'Thomas',lang:'fr-FR'}])===null,'voix masculine retenue');availableVoices=[];const delayed=new LydiaVoice({onText(){},onStatus(){},onFailure(){},canListen:()=>false});assert(delayed.femaleVoice===null,'voix chargée trop tôt');availableVoices=[{name:'Audrey',lang:'fr-FR'}];voiceListeners.slice().forEach(fn=>fn());assert(delayed.femaleVoice&&delayed.femaleVoice.name==='Audrey','voiceschanged tardif ignoré');});
})();
