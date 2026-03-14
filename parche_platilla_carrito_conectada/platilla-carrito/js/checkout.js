/**
 * checkout.js
 *
 * ✅ Muestra resumen del carrito
 * ✅ Valida formulario
 * ✅ Crea/obtiene cliente y hace POST a /api/pedidos
 * ✅ Redirige a thankyou.html
 */

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSelectedPaymentMethod() {
  const checked = document.querySelector('input[name="metodo-pago"]:checked');
  return checked ? checked.value : 'contra-entrega';
}

function computeCheckoutTotals() {
  const cart = readCart();
  const base = calculateSummary(cart);
  const metodo = getSelectedPaymentMethod();

  // +5% si es contra-entrega (según el texto del template)
  const recargoContraEntrega = metodo === 'contra-entrega' ? base.subtotal * 0.05 : 0;

  const aumento = base.domicilio + recargoContraEntrega;
  const total = Math.max(0, base.subtotal - base.descuento + aumento);

  return {
    ...base,
    metodo,
    recargoContraEntrega,
    aumento,
    total,
  };
}

function renderCheckoutSummary() {
  const cart = readCart();
  const detalle = document.getElementById('detalle-productos-checkout');
  const totalEl = document.getElementById('total-checkout');

  if (detalle) {
    detalle.innerHTML = '';
    if (cart.length === 0) {
      detalle.innerHTML = `<p class="lead color-black">Tu carrito está vacío</p>`;
    } else {
      detalle.innerHTML = cart
        .map((item) => {
          const lineTotal = Number(item.precio) * Number(item.cantidad);
          return `
            <div class="d-flex justify-content-between align-items-center mb-16">
              <p class="lead color-black">${escapeHtml(item.nombre)} x${Number(item.cantidad)}</p>
              <p class="lead">${formatCurrency(lineTotal)}</p>
            </div>
          `;
        })
        .join('');
    }
  }

  const totals = computeCheckoutTotals();
  if (totalEl) totalEl.textContent = formatCurrency(totals.total);
}

async function getOrCreateCliente(clientePayload) {
  try {
    const res = await apiFetch('/clientes', { method: 'POST', body: clientePayload });
    return Number(res.id);
  } catch (err) {
    if (err.status === 409) {
      // Ya existe: buscarlo por email
      const lista = await apiFetch('/clientes');
      const found = (lista || []).find(
        (c) => String(c.email || '').toLowerCase() === String(clientePayload.email || '').toLowerCase(),
      );
      if (found) return Number(found.id_cliente);
    }
    throw err;
  }
}

async function mapCartToPedidoProductos(cart) {
  // Preferimos usar el id del item (si el catálogo se cargó desde API, ya coincide)
  // Si por alguna razón el id no existe en BD, intentamos mapear por nombre.

  let productosDb = null;
  try {
    productosDb = await apiFetch('/productos');
  } catch {
    productosDb = null;
  }

  return cart.map((item) => {
    let id = Number(item.id);
    const precio = Number(item.precio);
    const cantidad = Number(item.cantidad);

    if (Array.isArray(productosDb)) {
      const matchById = productosDb.find((p) => Number(p.id) === id);
      const matchByName = productosDb.find(
        (p) => String(p.nombre || '').toLowerCase() === String(item.nombre || '').toLowerCase(),
      );
      const match = matchById || matchByName;
      if (match) id = Number(match.id);
    }

    return { id_producto: id, precio, cantidad };
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-checkout');
  if (!form) return;

  // Si el carrito está vacío, sugerir volver
  if (readCart().length === 0) {
    toast('Tu carrito está vacío');
  }

  renderCheckoutSummary();

  // Recalcular total si cambia el método de pago
  document.querySelectorAll('input[name="metodo-pago"]').forEach((r) => {
    r.addEventListener('change', renderCheckoutSummary);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cart = readCart();
    if (cart.length === 0) {
      toast('No hay productos en el carrito');
      return;
    }

    // IDs del template
    const fname = (document.getElementById('nombres-checkout')?.value || '').trim();
    const lname = (document.getElementById('apellidos-checkout')?.value || '').trim();
    const email = (document.getElementById('email-checkout')?.value || '').trim();
    const phone = (document.getElementById('celular-checkout')?.value || '').trim();
    const address = (document.getElementById('direccion-checkout')?.value || '').trim();
    const address2 = (document.getElementById('direccion2-checkout')?.value || '').trim();
    const note = (document.getElementById('notas-checkout')?.value || '').trim();

    if (!fname || !lname || !email || !phone || !address) {
      toast('Completa todos los campos requeridos');
      return;
    }
    if (!validarEmail(email)) {
      toast('Email inválido');
      return;
    }

    const totals = computeCheckoutTotals();

    const clientePayload = {
      nombre: fname,
      apellido: lname,
      email,
      celular: phone,
      direccion: address,
      direccion2: address2,
      descripcion: note,
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Procesando...';
    }

    try {
      const id_cliente = await getOrCreateCliente(clientePayload);

      const productosPedido = await mapCartToPedidoProductos(cart);

      // Validación extra: que haya ids válidos
      const invalid = productosPedido.find((p) => !p.id_producto || p.id_producto <= 0);
      if (invalid) {
        throw new Error('Hay productos que no existen en la base de datos. Carga el catálogo desde la API o crea esos productos en el Dashboard.');
      }

      const pedidoPayload = {
        id_cliente,
        descuento: totals.descuento,
        metodo_pago: totals.metodo,
        aumento: totals.aumento,
        productos: productosPedido,
      };

      const res = await apiFetch('/pedidos', { method: 'POST', body: pedidoPayload });

      const orderId = Number(res.id);
      const tiempoEntregaMin = 30 + Math.floor(Math.random() * 16); // 30-45

      localStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({
          id: orderId,
          total: totals.total,
          metodo_pago: totals.metodo,
          tiempoEntregaMin,
          fecha: new Date().toISOString(),
        }),
      );

      // Redirigir
      window.location.href = 'thankyou.html';
    } catch (err) {
      console.error(err);
      toast(err.message || 'Error procesando el pedido');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
      }
    }
  });
});
