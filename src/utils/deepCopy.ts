/** Clone arrays, plain objects and dates, preserving cycles and shared references. */
export const deepCopy = (value: any, seen = new WeakMap<object, any>()): any => {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Date) return new Date(value.getTime());
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
  const result = Array.isArray(value) ? new Array(value.length) : Object.create(prototype);
  seen.set(value, result);
  for (const key of Object.keys(value)) {
    Object.defineProperty(result, key, {
      value: deepCopy(value[key], seen), enumerable: true, writable: true, configurable: true,
    });
  }
  return result;
};
