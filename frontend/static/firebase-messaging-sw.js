// Service worker de Firebase Cloud Messaging: recibe notificaciones cuando la
// pestaña está en segundo plano o cerrada. Vive en la raíz (/firebase-messaging-sw.js).
// Usa el SDK "compat" por importScripts (los service workers no usan módulos ES).
// La config es pública (identifica el proyecto), no es secreta.
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyBsC3-HlnqSmgrXXeI-Cuo8S5E29GsiTdI",
  authDomain: "sumaq-system-notify.firebaseapp.com",
  projectId: "sumaq-system-notify",
  messagingSenderId: "202177830935",
  appId: "1:202177830935:web:ea51c4e812aeae1781fc52",
});

const messaging = firebase.messaging();

// Notificación recibida con la app en segundo plano → se muestra al usuario.
messaging.onBackgroundMessage((payload) => {
  const titulo = payload.notification?.title ?? "Sumaq System";
  self.registration.showNotification(titulo, {
    body: payload.notification?.body ?? "",
    icon: "/favicon.png",
    data: payload.data,
  });
});
