export function sameStoredRecord(original: unknown, current: unknown): boolean | undefined {
  const checked = new WeakMap<object, object>();
  const reverse = new WeakMap<object, object>();
  let entriesLeft = 50_000;
  let bytesLeft = 8 * 1024 * 1024;

  function* ownKeys(value: object) {
    for (const key in value) if (Object.hasOwn(value, key)) yield key;
  }

  function sameText(left: string, right: string) {
    bytesLeft -= 2 * (left.length + right.length);
    if (bytesLeft < 0) throw new RangeError('Save comparison limit exceeded');
    return left === right;
  }

  function sameProperties(left: object, right: object) {
    const rightKeys = ownKeys(right);
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    for (const key of ownKeys(left)) {
      const next = rightKeys.next();
      if (next.done || !sameText(key, next.value) || !compare(a[key], b[key])) return false;
    }
    return rightKeys.next().done === true;
  }

  function compare(left: unknown, right: unknown): boolean {
    if (--entriesLeft < 0) throw new RangeError('Save comparison limit exceeded');
    if (typeof left === 'string' && typeof right === 'string') return sameText(left, right);
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return Object.is(left, right);
    const prototype = Object.getPrototypeOf(left) as object | null;
    if (prototype !== Object.getPrototypeOf(right)) return false;
    if (checked.has(left) || reverse.has(right)) return checked.get(left) === right && reverse.get(right) === left;
    checked.set(left, right);
    reverse.set(right, left);

    if (Array.isArray(left) && Array.isArray(right)) {
      return left.length === right.length && sameProperties(left, right);
    }
    if (left instanceof ArrayBuffer && right instanceof ArrayBuffer) {
      bytesLeft -= left.byteLength;
      if (left.byteLength !== right.byteLength) return false;
      if (bytesLeft < 0 || Reflect.get(left, 'resizable') || Reflect.get(right, 'resizable')) {
        throw new RangeError('Save buffer cannot be compared safely');
      }
      const rightBytes = new Uint8Array(right);
      return new Uint8Array(left).every((byte, index) => byte === rightBytes[index]);
    }
    if (ArrayBuffer.isView(left) && ArrayBuffer.isView(right)) {
      return left.byteOffset === right.byteOffset && left.byteLength === right.byteLength
        && compare(left.buffer, right.buffer);
    }
    if (left instanceof Date && right instanceof Date) return Object.is(left.getTime(), right.getTime());
    if (left instanceof RegExp && right instanceof RegExp) {
      return sameText(left.source, right.source) && left.flags === right.flags && left.lastIndex === right.lastIndex;
    }
    if (left instanceof Map && right instanceof Map) {
      if (left.size !== right.size) return false;
      if (left.size > entriesLeft) throw new RangeError('Save comparison limit exceeded');
      const rightEntries = right.entries();
      for (const [key, value] of left) {
        const entry = rightEntries.next().value;
        if (!entry || !compare(key, entry[0]) || !compare(value, entry[1])) return false;
      }
      return true;
    }
    if (left instanceof Set && right instanceof Set) {
      if (left.size !== right.size) return false;
      if (left.size > entriesLeft) throw new RangeError('Save comparison limit exceeded');
      const rightValues = right.values();
      for (const value of left) {
        if (!compare(value, rightValues.next().value)) return false;
      }
      return true;
    }
    // Opaque platform values cannot be compared faithfully inside this write transaction.
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Opaque save value');
    return sameProperties(left, right);
  }

  try {
    return compare(original, current);
  } catch {
    return undefined;
  }
}
