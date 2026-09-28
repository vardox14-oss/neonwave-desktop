// --- Décodeur SLObjPack ---
// Porté depuis Spicy Lyrics (GNU AGPL v3, © Spikerko).
// Source : https://github.com/spikerko/spicy-lyrics — src/utils/objpack.ts
// Décode le format compact [valuesList, opcodeStream] renvoyé par leur API.

const LIMITS = {
    depth: 512,
    objectKeys: 1 << 20,
    arrayLength: 1 << 20,
    valuesLength: 1 << 22,
    streamLength: 1 << 24,
    decodeOps: 1 << 24
};
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function unpack(packed) {
    const limits = LIMITS;

    if (!Array.isArray(packed) || packed.length !== 2) {
        throw new Error('SLObjPack unpack: Invalid payload structure');
    }
    const valuesList = packed[0];
    const stream = packed[1];
    if (!Array.isArray(valuesList) || !Array.isArray(stream)) {
        throw new Error('SLObjPack unpack: Invalid payload structure');
    }

    const streamLen = stream.length;
    const valuesLen = valuesList.length;
    let cursor = 0;

    const readStream = () => {
        if (cursor >= streamLen) throw new Error('SLObjPack unpack: Unexpected end of stream');
        return stream[cursor++];
    };

    const resolvePointer = (ptr) => {
        if (typeof ptr !== 'number' || !Number.isInteger(ptr) || ptr < 0 || ptr >= valuesLen) {
            throw new Error('SLObjPack unpack: Invalid value pointer ' + ptr);
        }
        return valuesList[ptr];
    };

    const readKey = () => {
        const key = resolvePointer(readStream());
        if (typeof key !== 'string') throw new Error('SLObjPack unpack: Keys must be strings');
        if (FORBIDDEN_KEYS.has(key)) throw new Error('SLObjPack unpack: Forbidden key: ' + key);
        return key;
    };

    const safeSet = (obj, key, value) => {
        Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
    };

    const validateCount = (n, max, label) => {
        if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > max) {
            throw new Error('SLObjPack unpack: Invalid ' + label + ' count: ' + n);
        }
    };

    const requireStream = (min, label) => {
        if (min > streamLen - cursor) throw new Error('SLObjPack unpack: ' + label + ' exceeds remaining stream');
    };

    const decode = (depth) => {
        if (depth > limits.depth) throw new Error('SLObjPack unpack: Max depth exceeded');
        const op = readStream();
        if (typeof op !== 'number' || !Number.isInteger(op)) throw new Error('SLObjPack unpack: Invalid opcode ' + op);
        if (op >= 0) return resolvePointer(op);

        switch (op) {
            case -1: {
                const numKeys = readStream();
                validateCount(numKeys, limits.objectKeys, 'object key');
                requireStream(numKeys * 2, 'object');
                const keys = new Array(numKeys);
                for (let i = 0; i < numKeys; i++) keys[i] = readKey();
                const obj = {};
                for (let i = 0; i < numKeys; i++) safeSet(obj, keys[i], decode(depth + 1));
                return obj;
            }
            case -2: {
                const numItems = readStream();
                validateCount(numItems, limits.arrayLength, 'array item');
                requireStream(numItems, 'array');
                const arr = new Array(numItems);
                for (let i = 0; i < numItems; i++) arr[i] = decode(depth + 1);
                return arr;
            }
            case -3: {
                const numItems = readStream();
                validateCount(numItems, limits.arrayLength, 'schema array item');
                const numKeys = readStream();
                validateCount(numKeys, limits.objectKeys, 'schema key');
                if (numItems * numKeys > limits.decodeOps) throw new Error('SLObjPack unpack: budget exceeded');
                requireStream(numKeys + numItems * numKeys, 'schema array');
                const keys = new Array(numKeys);
                for (let i = 0; i < numKeys; i++) keys[i] = readKey();
                const arr = new Array(numItems);
                for (let i = 0; i < numItems; i++) {
                    const obj = {};
                    for (let k = 0; k < numKeys; k++) safeSet(obj, keys[k], decode(depth + 1));
                    arr[i] = obj;
                }
                return arr;
            }
            case -4: return [];
            case -5: return [decode(depth + 1)];
            case -6: return {};
            default: throw new Error('SLObjPack unpack: Unknown opcode ' + op);
        }
    };

    const result = decode(0);
    if (cursor !== streamLen) throw new Error('SLObjPack unpack: Extra data after decoding');
    return result;
}

module.exports = { unpack };
