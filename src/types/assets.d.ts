// The Cloudflare Vite plugin turns a `.wasm` import into a precompiled module.
declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}

// Vite's `?inline` suffix returns the file as a base64 data URL.
declare module "*?inline" {
  const dataUrl: string;
  export default dataUrl;
}
