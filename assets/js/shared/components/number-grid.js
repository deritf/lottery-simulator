// assets/js/shared/components/number-grid.js

/**
 * Componente genérico de grid de números
 * Reutilizable para cualquier sorteo
 */

export function createNumberGrid(config) {
  const {
    min,
    max,
    columns,
    pad = 2,
    className = "number-btn",
    onSelect,
    container,
  } = config;

  if (!container) {
    console.error("createNumberGrid: container es obligatorio");
    return null;
  }

  if (columns) {
    container.style.setProperty("--grid-cols", String(columns));
  }

  container.innerHTML = "";

  const fragment = document.createDocumentFragment();
  for (let n = min; n <= max; n++) {
    const btn = createNumberButton(n, pad, className);
    fragment.appendChild(btn);
  }

  container.appendChild(fragment);

  if (onSelect) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(`button.${className}`);
      if (!btn) return;
      const number = Number(btn.dataset.number);
      onSelect(number);
    });
  }

  return container;
}

function createNumberButton(value, pad, className) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.dataset.number = String(value);
  btn.textContent = padNumber(value, pad);
  return btn;
}

function padNumber(n, width) {
  const s = String(n);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

/**
 * Actualiza el estado seleccionado de los botones
 */
export function updateGridSelection(container, selectedSet) {
  const buttons = container.querySelectorAll("button[data-number]");
  buttons.forEach((btn) => {
    const num = Number(btn.dataset.number);

    const isSelected =
      selectedSet instanceof Set ? selectedSet.has(num) : selectedSet === num;

    btn.classList.toggle("is-selected", isSelected);
    btn.classList.toggle("is-active", isSelected);
  });
}
