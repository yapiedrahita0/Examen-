/**
 * thankyou.js
 *
 * ✅ Muestra confirmación
 * ✅ Muestra ID del pedido generado
 * ✅ Limpia carrito
 */

function formatOrderNumber(id) {
  const n = Number(id);
  if (!n) return null;
  return `PED-${String(n).padStart(6, '0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
  // IDs del template
  const orderNumberEl = document.getElementById('numero-pedido-final');
  const deliveryEl = document.getElementById('tiempo-entrega');

  let last = null;
  try {
    last = JSON.parse(localStorage.getItem(LAST_ORDER_KEY) || 'null');
  } catch {
    last = null;
  }

  const shown = last?.id ? formatOrderNumber(last.id) : null;

  if (orderNumberEl) {
    orderNumberEl.textContent = shown ? `#${shown}` : `#PED-${Math.floor(Math.random() * 900000 + 100000)}`;
  }

  if (deliveryEl) {
    const mins = last?.tiempoEntregaMin ? Number(last.tiempoEntregaMin) : (30 + Math.floor(Math.random() * 16));
    deliveryEl.textContent = `${mins} minutos`;
  }

  // Limpiar carrito
  localStorage.removeItem(CART_KEY);

  // Opcional: limpiar el último pedido para que no se repita
  // localStorage.removeItem(LAST_ORDER_KEY);
});
