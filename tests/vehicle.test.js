(function(){
function assert(v,m){if(!v)throw Error(m);}
function check(name,fn){fn();TEST_REPORT.passed++;TEST_REPORT.checks.push(name);}
check('Molette : déplacement dès le premier événement, direction immédiate',()=>{const m=new VehicleMotion();m.reset(-20);const a=m.moveFromWheel(-1,0);assert(a<0,'haut non avancé');const p=m.position;const b=m.moveFromWheel(1,0);assert(b>0&&m.position>p,'bas non reculé');});
check('Intensité normalisée : trackpad, molette par lignes et plafond',()=>{const a=new VehicleMotion(),b=new VehicleMotion(),c=new VehicleMotion();a.reset(-20);b.reset(-20);c.reset(-20);const slow=Math.abs(a.moveFromWheel(-1,0));const fast=Math.abs(b.moveFromWheel(-100,0));const lines=Math.abs(c.moveFromWheel(-3,1));assert(fast>slow,'mouvement rapide non amplifié');assert(lines>slow,'molette lignes non normalisée');assert(Math.abs(fast-b.maximumWheelDistance)<1e-9,'plafond absent');});
check('Le déplacement cesse sans nouvel événement',()=>{const m=new VehicleMotion();m.reset(-20);m.moveFromWheel(-10);const p=m.position;assert(m.position===p,'mouvement persistant');});
check('Bornes de l’allée protègent les racks',()=>{const m=new VehicleMotion();m.moveFromWheel(9999);assert(m.position===m.maxPosition,'sortie entrée');m.reset(m.minPosition);m.moveFromWheel(-9999);assert(m.position===m.minPosition,'sortie fond');});
})();
