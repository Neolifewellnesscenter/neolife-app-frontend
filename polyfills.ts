// polyfills.ts

if (typeof globalThis.DOMException === "undefined") {
  class DOMExceptionPolyfill extends Error {
    readonly code: number;

    constructor(message = "", name = "Error") {
      super(message);
      this.name = name;
      this.code = name === "AbortError" ? 20 : 0;
    }
  }

  globalThis.DOMException =
    DOMExceptionPolyfill as typeof DOMException;
}