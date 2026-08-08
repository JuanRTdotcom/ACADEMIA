// Arquitectura SSR dinámica: ninguna página se genera como HTML estático.
// CSR se mantiene únicamente para hidratar las interacciones de Svelte.
export const ssr = true;
export const csr = true;
export const prerender = false;
