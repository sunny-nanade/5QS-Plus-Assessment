export function applyProfile(config, profile) {
  function merge(target, source) {
    for (const [key, value] of Object.entries(source)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe profile key');
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        target[key] = merge(target[key] && typeof target[key] === 'object' ? target[key] : {}, value);
      } else target[key] = structuredClone(value);
    }
    return target;
  }
  return merge(structuredClone(config), profile);
}
