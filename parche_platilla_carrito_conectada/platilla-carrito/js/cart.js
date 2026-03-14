/**
 * cart.js
 *
 * ✅ Renderiza carrito desde localStorage
 * ✅ Permite modificar cantidades y eliminar
 * ✅ Calcula totales (subtotal, domicilio, descuento, total)
 */

function renderCartTable() {
  const tbody = document.getElementById('carrito-items');
  if (!tbody) return;

  const cart = readCart();
  tbody.innerHTML = '';

  if (cart.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding: 20px;">Tu carrito está vacío</td>
      </tr>
    `;
    updateSummary();
    return;
  }

  tbody.innerHTML = cart
    .map((item) => {
      const subtotal = Number(item.precio) * Number(item.cantidad);
      const img = item.imagen ? item.imagen : './images/burger.png';
      return `
        <tr data-id="${Number(item.id)}">
          <td class="product-block">
            <a href="#" class="remove-from-cart-btn" title="Eliminar"><i class="fa-solid fa-x"></i></a>
            <img src="${escapeHtml(img)}" alt="${escapeHtml(item.nombre)}">
            <a href="#" class="h6">${escapeHtml(item.nombre)}</a>
          </td>
          <td>
            <p class="lead color-black">${formatCurrency(item.precio)}</p>
          </td>
          <td>
            <div class="quantity quantity-wrap">
              <div class="decrement"><i class="fa-solid fa-minus"></i></div>
              <input type="text" name="quantity" value="${Number(item.cantidad)}" maxlength="2" size="1" class="number" />
              <div class="increment"><i class="fa-solid fa-plus"></i></div>
            </div>
          </td>
          <td>
            <h6 class="item-subtotal">${formatCurrency(subtotal)}</h6>
          </td>
        </tr>
      `;
    })
    .join('');

  updateSummary();
}

function updateSummary() {
  const { subtotal, domicilio, descuento, total } = calculateSummary(readCart());

  const elSubtotal = document.getElementById('subtotal-resumen');
  const elDomicilio = document.getElementById('domicilio-resumen');
  const elDescuento = document.getElementById('descuento-resumen');
  const elTotal = document.getElementById('total-resumen');

  if (elSubtotal) elSubtotal.textContent = formatCurrency(subtotal);
  if (elDomicilio) elDomicilio.textContent = formatCurrency(domicilio);
  if (elDescuento) elDescuento.textContent = formatCurrency(descuento);
  if (elTotal) elTotal.textContent = formatCurrency(total);
}

function bindCartEvents() {
  const tbody = document.getElementById('carrito-items');
  if (!tbody) return;

  // Delegación de eventos
  tbody.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    const id = Number(row.dataset.id);

    if (e.target.closest('.increment')) {
      const cart = readCart();
      const item = cart.find((p) => Number(p.id) === id);
      if (!item) return;
      setCartQuantity(id, Number(item.cantidad || 1) + 1);
      renderCartTable();
    }

    if (e.target.closest('.decrement')) {
      const cart = readCart();
      const item = cart.find((p) => Number(p.id) === id);
      if (!item) return;
      setCartQuantity(id, Math.max(1, Number(item.cantidad || 1) - 1));
      renderCartTable();
    }

    if (e.target.closest('.remove-from-cart-btn')) {
      e.preventDefault();
      removeFromCart(id);
      toast('Producto eliminado');
      renderCartTable();
    }
  });

  // Cambio manual de cantidad
  tbody.addEventListener('change', (e) => {
    const input = e.target.closest('input.number');
    if (!input) return;
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    const id = Number(row.dataset.id);
    const qty = Number(input.value || 1);
    setCartQuantity(id, qty);
    renderCartTable();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderCartTable();
  bindCartEvents();
});
