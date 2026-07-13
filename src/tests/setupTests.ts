// require() em vez de import: imports ES são hoisteados pelo transform e
// rodariam antes destes polyfills, quebrando a ordem de inicialização do jsdom.
const {
  TextDecoder: NodeTextDecoder,
  TextEncoder: NodeTextEncoder,
} = require('node:util');
const { deserialize, serialize } = require('node:v8');

if (typeof globalThis.TextEncoder !== 'function') {
  globalThis.TextEncoder = NodeTextEncoder;
}
if (typeof globalThis.TextDecoder !== 'function') {
  globalThis.TextDecoder = NodeTextDecoder;
}
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(value: T): T =>
    deserialize(serialize(value));
}
if (typeof globalThis.fetch !== 'function') {
  require('whatwg-fetch');
}

import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
