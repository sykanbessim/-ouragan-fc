(() => {
  const shop = document.getElementById('boutique');
  const names = { shirt: 'Tee-shirt Ouragan FC', flag: 'Drapeau Ouragan FC', perfume: 'Parfum Ouragan', cap: 'Casquette Ouragan FC', scarf: 'Écharpe Ouragan FC', mug: 'Mug Ouragan FC' };
  let cart = [];
  try {
    const saved = JSON.parse(localStorage.getItem('ouragan-cart') || '[]');
    if (Array.isArray(saved)) cart = saved.filter(item => item && Object.hasOwn(names, item.id) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 && (item.id === 'shirt' ? ['S', 'M', 'L', 'XL', 'XXL'].includes(item.size) : item.size === ''));
  } catch (_) {}
  const label = item => names[item.id] + (item.size ? ` — taille ${item.size}` : '');
  const status = document.getElementById('cart-status');
  function render() {
    const items = document.getElementById('cart-items');
    items.replaceChildren();
    if (!cart.length) items.textContent = 'Votre panier est vide. Choisissez un article ci-dessus.';
    cart.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'cart-row';
      const title = document.createElement('span');
      title.textContent = label(item);
      row.append(title);
      const controls = document.createElement('div');
      function button(text, accessible, action) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = text; b.setAttribute('aria-label', accessible + ' : ' + label(item));
        b.onclick = action; controls.append(b);
      }
      button('−', 'Diminuer la quantité', () => { if (--item.quantity === 0) cart.splice(index, 1); render(); });
      const quantity = document.createElement('span'); quantity.textContent = item.quantity; controls.append(quantity);
      button('+', 'Augmenter la quantité', () => { item.quantity = Math.min(99, item.quantity + 1); render(); });
      button('Retirer', 'Retirer du panier', () => { cart.splice(index, 1); render(); status.textContent = 'Article retiré du panier.'; });
      row.append(controls); items.append(row);
    });
    document.getElementById('cart-count').textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-reserve').disabled = !cart.length;
    try { localStorage.setItem('ouragan-cart', JSON.stringify(cart)); } catch (_) {}
  }
  document.querySelectorAll('#shop-open, #bottom-shop-open').forEach(button => button.addEventListener('click', event => {
    event.preventDefault(); shop.showModal(); document.body.classList.add('shop-is-open');
    if (button.id === 'bottom-shop-open') document.getElementById('shop-cart').scrollIntoView({ block: 'start' });
  }));
  document.getElementById('shop-close').onclick = () => shop.close();
  shop.addEventListener('close', () => document.body.classList.remove('shop-is-open'));
  shop.querySelector('.shop-cart-link').onclick = event => { event.preventDefault(); document.getElementById('shop-cart').scrollIntoView({ block: 'start' }); };
  shop.querySelectorAll('[data-add]').forEach(button => button.onclick = () => {
    const id = button.dataset.add;
    const size = id === 'shirt' ? document.getElementById('shirt-size').value : '';
    const existing = cart.find(item => item.id === id && item.size === size);
    if (existing && existing.quantity >= 99) { status.textContent = 'Quantité maximale atteinte (99).'; return; }
    if (existing) existing.quantity++; else cart.push({ id, size, quantity: 1 });
    render(); status.textContent = label({ id, size }) + ' ajouté au panier.';
  });
  document.getElementById('cart-reserve').onclick = () => {
    if (!cart.length) return;
    const body = 'Bonjour,\n\nJe souhaite réserver les articles suivants :\n' + cart.map(item => `• ${label(item)} × ${item.quantity}`).join('\n') + '\n\nMerci de me confirmer les prix, les disponibilités et les modalités de retrait.\n\nMon nom :\nMon téléphone :';
    location.href = 'mailto:contact@ouraganfc.com?subject=' + encodeURIComponent('Demande de réservation — Boutique Ouragan FC') + '&body=' + encodeURIComponent(body);
    status.textContent = 'Demande préparée : envoyez le message depuis votre messagerie pour contacter le club.';
  };
  render();
})();
