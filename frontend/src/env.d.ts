/// <reference types="vite/client" />
import "vue-router";

declare global {
  const __APP_VERSION__: string;
}

declare module "vue-router" {
  interface RouteMeta {
    titel: string;
  }
}
