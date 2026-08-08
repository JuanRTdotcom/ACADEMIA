import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { PUBLIC_FIREBASE_VAPID_KEY } from "$env/static/public";
import { getFirebaseApp } from "$lib/firebase";

/**
 * Activa push solo cuando una acción futura y explícita del usuario la invoque.
 * Registrar cliente/FID nunca pasa por aquí.
 */
export async function activarNotificacionesPush(): Promise<void> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("Notification" in window) ||
    !PUBLIC_FIREBASE_VAPID_KEY
  ) {
    return;
  }

  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return;

    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    // El service worker debe estar registrado para recibir en segundo plano.
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );

    const token = await getToken(messaging, {
      vapidKey: PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return;

    // Envía el token al backend a través del proxy SvelteKit (server-side).
    await fetch("/push/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });

    // Notificación recibida con la pestaña en primer plano.
    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification ?? {};
      if (title) new Notification(title, { body: body ?? "" });
    });
  } catch {
    // Push es un extra: si algo falla, no rompe la app.
  }
}
