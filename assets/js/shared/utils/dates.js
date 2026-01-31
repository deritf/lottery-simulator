// assets/js/shared/utils/dates.js

export function normalizeDrawDays(drawDays) {
  const mapStr = {
    sun: 0,
    sunday: 0,
    dom: 0,
    domingo: 0,
    mon: 1,
    monday: 1,
    lun: 1,
    lunes: 1,
    tue: 2,
    tuesday: 2,
    mar: 2,
    martes: 2,
    wed: 3,
    wednesday: 3,
    mie: 3,
    miércoles: 3,
    miercoles: 3,
    thu: 4,
    thursday: 4,
    jue: 4,
    jueves: 4,
    fri: 5,
    friday: 5,
    vie: 5,
    viernes: 5,
    sat: 6,
    saturday: 6,
    sab: 6,
    sábado: 6,
    sabado: 6,
  };

  const arr = Array.isArray(drawDays) ? drawDays : [];
  const nums = arr
    .map((d) => {
      if (typeof d === "number") return d;
      const key = String(d || "")
        .trim()
        .toLowerCase();
      return mapStr[key];
    })
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

  const uniq = Array.from(new Set(nums)).sort((a, b) => a - b);
  return uniq.length ? uniq : [2, 4];
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getNextDrawDate(prevDate, drawDays) {
  const allowed = normalizeDrawDays(drawDays);
  const prev = startOfDay(prevDate);

  for (let i = 1; i <= 14; i++) {
    const cand = addDays(prev, i);
    if (allowed.includes(cand.getDay())) return cand;
  }

  return addDays(prev, 7);
}

export function formatDateDMY(date) {
  if (!(date instanceof Date) || isNaN(date)) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getDayName(dayNumber, locale = "es-ES") {
  const names = {
    "es-ES": [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ],
    "en-GB": [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
  };
  return names[locale]?.[dayNumber] || names["es-ES"][dayNumber];
}
