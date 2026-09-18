(() => {
  const form = document.getElementById('match-ticket-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    if (!name) { document.getElementById('ticket-name').focus(); return; }
    const body = `Bonjour,\n\nJe souhaite demander ${data.get('quantity')} place(s) pour Ouragan FC — CNFF, annoncé le 21 août 2026 à 10h00 au Stade municipal — Ouragan.\n\nNom : ${name}\n\nMerci de confirmer la date du match, les disponibilités, les tarifs et les modalités de retrait des billets.`;
    location.href = 'mailto:contact@ouraganfc.com?subject=' + encodeURIComponent('Demande de billets — Ouragan FC / CNFF') + '&body=' + encodeURIComponent(body);
    document.getElementById('ticket-status').textContent = 'Demande préparée. Envoyez le message depuis votre messagerie pour contacter le club.';
  });
})();
