// assets/js/shared/utils/i18n-path.js

export function getByPath(obj, path) {
  if (!obj || !path) return null;

  return String(path)
    .split(".")
    .reduce((acc, k) => (acc && acc[k] != null ? acc[k] : null), obj);
}
