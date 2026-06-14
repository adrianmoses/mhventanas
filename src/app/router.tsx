import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen.js";

/**
 * Router factory consumed by TanStack Start's client and server entries.
 * Must be named `getRouter` (the Start plugin resolves this export).
 */
export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}
