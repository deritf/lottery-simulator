// assets/js/shared/utils/random.js

export function rand() {
  return Math.random();
}

export function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function pickUniqueRandom(count, min, max) {
  const s = new Set();
  while (s.size < count) {
    s.add(randInt(min, max));
  }
  return Array.from(s).sort((a, b) => a - b);
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function randomChoice(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

export function randomBoolean(probability = 0.5) {
  return Math.random() < probability;
}

export function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function poisson(lambda) {
  const l = Number(lambda);
  if (!Number.isFinite(l) || l <= 0) return 0;

  if (l < 30) {
    const L = Math.exp(-l);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rand();
    } while (p > L);
    return k - 1;
  }

  const n = Math.round(l + Math.sqrt(l) * randn());
  return Math.max(0, n);
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
