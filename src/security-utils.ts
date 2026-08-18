// Centralized security & sanitization utilities
// Boundary-based sanitization for Home Assistant dashboard custom cards.

const colorCache = new Map<string, string>();

/**
 * Sanitizes CSS color strings by removing invalid characters and blocking dangerous/resource-loading functions.
 */
export function sanitizeColor(color: string): string {
  if (typeof color !== 'string' || !color || color.length > 100) return '';

  const cached = colorCache.get(color);
  if (cached !== undefined) {
    return cached;
  }

  // Allow alphanumeric, hex, and basic CSS color functions/characters, but block ; : and others
  const sanitized = color.replace(/[^a-zA-Z0-9#(), \-./]/g, '');

  // Block potential CSS function injections like url(), expression(), image(), canvas(), src(), etc.
  if (
    /\b(url|expression|image|image-set|element|paint|cross-fade|canvas|src)\s*\(/i.test(sanitized)
  ) {
    if (colorCache.size >= 500) {
      colorCache.clear();
    }
    colorCache.set(color, '');
    return '';
  }

  if (colorCache.size >= 500) {
    colorCache.clear();
  }
  colorCache.set(color, sanitized);
  return sanitized;
}

/**
 * Deep sanitizes configuration objects at boundaries (e.g. setConfig) to prevent prototype pollution,
 * unbounded memory allocations, circular references, and excessively long strings.
 */
export function sanitizeConfig<T>(obj: T, seen = new WeakSet<any>(), depth = 0): T {
  if (depth > 20) {
    throw new Error('Configuration depth limit exceeded');
  }
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return (obj.length > 1000 ? obj.slice(0, 1000) : obj) as any;
    }
    return obj;
  }
  if (seen.has(obj)) {
    return obj;
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    if (obj.length > 5000) {
      throw new Error('Configuration array size limit exceeded');
    }
    return obj.map((item) => sanitizeConfig(item, seen, depth + 1)) as any;
  }

  const keys = Object.keys(obj);
  if (keys.length > 5000) {
    throw new Error('Configuration object size limit exceeded');
  }

  const sanitized: any = {};
  for (const key of keys) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    sanitized[key] = sanitizeConfig((obj as any)[key], seen, depth + 1);
  }
  return sanitized;
}
