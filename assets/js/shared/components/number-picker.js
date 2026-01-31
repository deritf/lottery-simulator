// assets/js/shared/components/number-picker.js

/**
 * Componente para seleccionar un único número
 * Útil para reintegro, clave, etc.
 */

export function createNumberPicker(config) {
  const {
    min,
    max,
    pad = 1,
    className = "picker-btn",
    container,
    onSelect,
  } = config;

  if (!container) {
    console.error("createNumberPicker: container es obligatorio");
    return null;
  }

  container.innerHTML = "";

  const fragment = document.createDocumentFragment();
  for (let n = min; n <= max; n++) {
    const btn = createPickerButton(n, pad, className);
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

function createPickerButton(value, pad, className) {
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

export function updatePickerSelection(container, selectedValue) {
  const buttons = container.querySelectorAll("button[data-number]");
  buttons.forEach((btn) => {
    const num = Number(btn.dataset.number);
    const isSel = num === selectedValue;

    btn.classList.toggle("is-selected", isSel);
    btn.classList.toggle("is-active", isSel);
  });
}
