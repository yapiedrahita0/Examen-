/**
 * tienda-core.js
 *
 * ✅ Manejo del carrito con localStorage
 * ✅ Utilidades (moneda, alertas)
 * ✅ Wrapper fetch() para consumir la API REST (http://localhost:3000/api)
 */

// Requerimiento del examen
const API_BASE = "http://localhost:3000/api";

// Requerimiento del examen
const CART_KEY = "carrito";
const LAST_ORDER_KEY = "ultimoPedido";

function escapeHtml(text) {
  const str = String(text ?? "");
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(isNaN(n) ? 0 : n);
}

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCounter();
  renderMiniCart();
}

function getCartCount(cart = readCart()) {
  return cart.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
}

function updateCartCounter() {
  const count = getCartCount();
  document.querySelectorAll(".contar-pro").forEach((el) => {
    el.textContent = String(count);
  });
}

/**
 * Agrega un producto al carrito. Si ya existe, incrementa la cantidad.
 * @param {{id:number, nombre:string, precio:number, cantidad:number, imagen:string}} item
 */
function addToCart(item) {
  const cart = readCart();
  const id = Number(item.id);
  const qty = Number(item.cantidad || 1);

  const existing = cart.find((p) => Number(p.id) === id);
  if (existing) {
    existing.cantidad = Number(existing.cantidad || 0) + qty;
  } else {
    cart.push({
      id,
      nombre: String(item.nombre || ""),
      precio: Number(item.precio || 0),
      cantidad: qty,
      imagen: String(item.imagen || ""),
    });
  }

  saveCart(cart);
}

function removeFromCart(id) {
  const cart = readCart().filter((p) => Number(p.id) !== Number(id));
  saveCart(cart);
}

function setCartQuantity(id, cantidad) {
  const qty = Math.max(1, Number(cantidad || 1));
  const cart = readCart();
  const item = cart.find((p) => Number(p.id) === Number(id));
  if (!item) return;
  item.cantidad = qty;
  saveCart(cart);
}

/**
 * Reglas simples de negocio para el examen.
 * Puedes ajustar estos valores si tu profesor definió otras reglas.
 */
function calculateSummary(cart = readCart()) {
  const subtotal = cart.reduce((acc, item) => acc + Number(item.precio) * Number(item.cantidad), 0);

  // Domicilio fijo si hay productos
  const domicilio = subtotal > 0 ? 5000 : 0;

  // Descuento simple: 10% si supera 80.000 COP
  const descuento = subtotal >= 80000 ? subtotal * 0.1 : 0;

  const total = Math.max(0, subtotal - descuento + domicilio);
  return { subtotal, domicilio, descuento, total };
}

/**
 * Mini-cart (navbar) si existe la tabla .list-cart
 */
function renderMiniCart() {
  const tbody = document.querySelector(".list-cart tbody");
  if (!tbody) return;

  const cart = readCart();
  tbody.innerHTML = "";

  if (cart.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td class="text-center" style="padding:8px;" colspan="4">Carrito vacío</td>
      </tr>
    `;
    return;
  }

  // Mostrar máximo 3 items
  const preview = cart.slice(0, 3);
  tbody.innerHTML = preview
    .map((item, idx) => {
      const img = item.imagen ? item.imagen : './images/burger.png';
      return `
        <tr>
          <th scope="row">${idx + 1}</th>
          <td><img src="${escapeHtml(img)}" alt="${escapeHtml(item.nombre)}" style="width:36px; height:36px; object-fit:cover; border-radius:8px;"></td>
          <td>${escapeHtml(item.nombre)} x${Number(item.cantidad)}</td>
          <td>${formatCurrency(Number(item.precio) * Number(item.cantidad))}</td>
        </tr>
      `;
    })
    .join("");

  if (cart.length > 3) {
    tbody.innerHTML += `
      <tr>
        <td style="padding:6px;" class="text-center text-muted" colspan="4">+${cart.length - 3} más...</td>
      </tr>
    `;
  }
}

/**
 * Notificación simple (sin librerías)
 */
function toast(message) {
  const el = document.createElement("div");
  el.textContent = message;
  el.style.position = "fixed";
  el.style.bottom = "18px";
  el.style.right = "18px";
  el.style.padding = "10px 14px";
  el.style.background = "rgba(0,0,0,0.85)";
  el.style.color = "white";
  el.style.borderRadius = "10px";
  el.style.zIndex = "9999";
  el.style.fontSize = "14px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/**
 * Wrapper fetch con manejo de errores de red + status HTTP.
 * @param {string} endpoint Ej: '/productos'
 * @param {object} options
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

  const fetchOptions = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };
  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch (err) {
    const e = new Error(
      "No se pudo conectar con la API. Verifica que el backend esté corriendo en http://localhost:3000",
    );
    e.cause = err;
    throw e;
  }

  const contentType = res.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const msg =
      data && typeof data === "object" && (data.message || data.error)
        ? data.message || data.error
        : `Error HTTP ${res.status}`;
    const e = new Error(msg);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

// Inicializaciones comunes
document.addEventListener("DOMContentLoaded", () => {
  updateCartCounter();
  renderMiniCart();
});
