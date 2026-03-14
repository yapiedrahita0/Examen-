/**
 * app.js
 * Helpers reutilizables para consumir la API REST del examen.
 *
 * ✅ Base URL requerida: http://localhost:3000/api/
 * ✅ Usa fetch() + try/catch
 * ✅ Valida status HTTP
 * ✅ Muestra mensajes (alertas Bootstrap)
 */

// IMPORTANTE: si cambias el puerto del backend, actualiza este valor.
const API_BASE = "http://localhost:3000/api";

/**
 * Obtiene un parámetro de la URL.
 * @param {string} key
 * @returns {string|null}
 */
function getQueryParam(key) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(key);
  } catch {
    return null;
  }
}

/**
 * Formatea un número como moneda (COP por defecto).
 * @param {number|string} value
 */
function formatCurrency(value) {
  const n = Number(value ?? 0);
  // En Colombia lo más común es COP; si estás usando otra moneda, cambia el currency.
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(isNaN(n) ? 0 : n);
}

/**
 * Formatea fecha/hora desde MySQL TIMESTAMP.
 * @param {string} value
 */
function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("es-CO");
}

/**
 * Asegura un contenedor para alertas.
 * @returns {HTMLElement}
 */
function ensureAlertContainer() {
  let el = document.getElementById("alert-container");
  if (el) return el;

  el = document.createElement("div");
  el.id = "alert-container";
  el.className = "my-3";

  const target = document.querySelector(".container-fluid") || document.body;
  target.prepend(el);
  return el;
}

/**
 * Muestra una alerta Bootstrap.
 * @param {string} message
 * @param {'success'|'danger'|'warning'|'info'} type
 * @param {number} timeoutMs
 */
function showAlert(message, type = "success", timeoutMs = 4500) {
  const container = ensureAlertContainer();
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      <div>${message}</div>
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  `;
  const alertEl = wrapper.firstElementChild;
  container.appendChild(alertEl);

  if (timeoutMs && timeoutMs > 0) {
    window.setTimeout(() => {
      try {
        alertEl.classList.remove("show");
        alertEl.classList.add("hide");
        alertEl.remove();
      } catch {
        // ignore
      }
    }, timeoutMs);
  }
}

/**
 * Wrapper de fetch con manejo de errores.
 *
 * @param {string} endpoint Ej: '/productos' o '/productos/1'
 * @param {object} options
 * @returns {Promise<any>}
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

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    const e = new Error("No se pudo conectar con la API. Verifica que el backend esté corriendo en http://localhost:3000");
    e.cause = err;
    throw e;
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const msg =
      (data && typeof data === "object" && (data.message || data.error))
        ? (data.message || data.error)
        : `Error HTTP ${response.status}`;
    const e = new Error(msg);
    e.status = response.status;
    e.data = data;
    throw e;
  }

  return data;
}

/**
 * Confirmación simple.
 * @param {string} message
 */
function confirmAction(message) {
  return window.confirm(message);
}
