import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

/** Compatibilidad con enlaces antiguos: Seguridad ahora vive en Autenticación. */
export const load: PageServerLoad = () => redirect(308, "/profile/account");
