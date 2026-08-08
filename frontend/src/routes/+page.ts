import { redirect } from "@sveltejs/kit";

export const load = () => {
  // Landing → login (UI-only prototype)
  redirect(307, "/login");
};
