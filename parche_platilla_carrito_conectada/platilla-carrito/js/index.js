/**
 * index.js
 *
 * ✅ Carga catálogo (preferiblemente desde API)
 * ✅ Agrega productos al carrito (localStorage)
 * ✅ Corrige que algunos productos del template no tengan .btn-product
 */

function addCardToCart(card) {
  if (!card) return;

  const id = Number(card.dataset.id);
  const nombre = card.dataset.name;
  const precio = Number(card.dataset.price);
  const imagen = card.dataset.image;

  if (!id || !nombre || !precio) {
    toast('Producto inválido.');
    return;
  }

  addToCart({ id, nombre, precio, cantidad: 1, imagen });
  toast(`Agregado: ${nombre}`);
}

function renderCatalogFromApi(productos) {
  const burgerSection = document.querySelector('#burger');
  if (!burgerSection) return;

  // Mantener el título, limpiar solo las filas de productos
  burgerSection.querySelectorAll('.row').forEach((r) => r.remove());

  let currentRow = null;
  productos.forEach((p, idx) => {
    if (idx % 4 === 0) {
      currentRow = document.createElement('div');
      currentRow.className = 'row';
      currentRow.style.marginTop = '30px';
      burgerSection.appendChild(currentRow);
    }

    const col = document.createElement('div');
    col.className = 'col-md-3 py-3 py-md-0';

    const img = p.imagen ? p.imagen : './images/burger.png';

    col.innerHTML = `
      <div class="card producto" data-id="${Number(p.id)}" data-price="${Number(p.precio)}" data-name="${escapeHtml(p.nombre)}" data-image="${escapeHtml(img)}">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(p.nombre)}">
        <div class="card-body">
          <h3>${escapeHtml(p.nombre)}</h3>
          <p>${escapeHtml(p.descripcion || '')}</p>
          <h5>${formatCurrency(p.precio)} <span class="btn-product"><i class="fa-solid fa-basket-shopping"></i></span></h5>
        </div>
      </div>
    `;

    currentRow.appendChild(col);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Ir al carrito al hacer click en el icono (en el template cambia entre páginas)
  const cartIcon = document.querySelector('.carrito') || document.querySelector('.fa-cart-shopping');
  if (cartIcon) {
    cartIcon.style.cursor = 'pointer';
    cartIcon.addEventListener('click', () => (window.location.href = 'cart.html'));
  }

  // Botones "Order Now" del template: hacer scroll al catálogo
  document.querySelectorAll('#btn button, #btnorder, button#rn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const firstProduct = document.querySelector('.card.producto');
      if (firstProduct) {
        firstProduct.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Snapshot de productos estáticos para poder removerlos si la API carga (evita IDs que no existan en BD)
  const staticProductColumns = Array.from(document.querySelectorAll('.card.producto')).map((c) => c.closest('.col-md-3'));

  // Intentar cargar productos desde la API
  try {
    const productos = await apiFetch('/productos');
    if (Array.isArray(productos) && productos.length > 0) {
      renderCatalogFromApi(productos);

      // Remover los productos estáticos del template (para que todo coincida con la BD)
      staticProductColumns.forEach((col) => col && col.remove());
    }
  } catch (err) {
    // Si falla, dejamos el HTML estático
    console.warn('No se pudo cargar catálogo desde API. Se usará el HTML estático.', err);
  }

  // Activar "Agregar al carrito" por delegación (funciona con .btn-product y con el ícono)
  document.body.addEventListener('click', (e) => {
    const hit = e.target.closest('.btn-product') || e.target.closest('.fa-basket-shopping');
    if (!hit) return;
    const card = e.target.closest('.card.producto');
    if (!card) return;
    addCardToCart(card);
  });
});
