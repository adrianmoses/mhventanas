import { redirect } from "@tanstack/react-router";
import { getOwnerStatus } from "./auth.js";

/**
 * `beforeLoad` for the owner-only form routes: send visitors to the login page,
 * then back here. UX only — the write server functions enforce auth themselves.
 */
export async function requireOwnerRoute({ location }: { location: { href: string } }) {
  if (!(await getOwnerStatus())) {
    throw redirect({ to: "/cuaderno/entrar", search: { next: location.href } });
  }
}
