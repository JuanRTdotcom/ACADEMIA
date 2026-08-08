import { getId, getInstallations } from "firebase/installations";
import { PUBLIC_APP_VERSION } from "$env/static/public";
import { getFirebaseApp } from "$lib/firebase";

type TipoDispositivo = "escritorio" | "movil" | "tableta" | "desconocido";
type UserAgentData = {
  mobile: boolean;
  platform: string;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
};

function detectarTipo(
  userAgent: string,
  datos?: UserAgentData,
): TipoDispositivo {
  if (/ipad|tablet/i.test(userAgent)) return "tableta";
  if (datos?.mobile || /android|iphone|mobile/i.test(userAgent)) return "movil";
  return userAgent ? "escritorio" : "desconocido";
}

function detectarVersionSo(
  userAgent: string,
  plataforma?: string,
  versionPlataforma?: string,
): string | undefined {
  if (plataforma) {
    return [plataforma, versionPlataforma].filter(Boolean).join(" ");
  }
  const patrones: Array<[RegExp, string]> = [
    [/Windows NT ([\d.]+)/i, "Windows"],
    [/Android ([\d.]+)/i, "Android"],
    [/(?:iPhone )?OS ([\d_]+)/i, "iOS"],
    [/Mac OS X ([\d_]+)/i, "macOS"],
  ];
  for (const [patron, nombre] of patrones) {
    const resultado = userAgent.match(patron);
    if (resultado) return `${nombre} ${resultado[1].replaceAll("_", ".")}`;
  }
  return undefined;
}

/** Registra FID y metadatos sin tocar API de notificaciones. */
export async function registrarCliente(): Promise<void> {
  try {
    const app = getFirebaseApp();
    const firebase_id_instalacion = await getId(getInstallations(app));
    const userAgent = navigator.userAgent;
    const datosUa = (navigator as Navigator & { userAgentData?: UserAgentData })
      .userAgentData;
    const altaEntropia: Record<string, unknown> = datosUa?.getHighEntropyValues
      ? await datosUa
          .getHighEntropyValues(["model", "platformVersion"])
          .catch(() => ({}))
      : {};
    const modeloCrudo = altaEntropia["model"];
    const versionCruda = altaEntropia["platformVersion"];
    const modelo =
      typeof modeloCrudo === "string" && modeloCrudo.trim()
        ? modeloCrudo.trim()
        : undefined;
    const version_so = detectarVersionSo(
      userAgent,
      datosUa?.platform,
      typeof versionCruda === "string" ? versionCruda : undefined,
    );

    const response = await fetch("/client/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firebase_id_instalacion,
        tipo_dispositivo: detectarTipo(userAgent, datosUa),
        modelo,
        version_so,
        version_app: PUBLIC_APP_VERSION,
      }),
    });
    if (!response.ok) {
      console.error("No se pudo registrar la información del cliente");
    }
  } catch (error) {
    console.error("No se pudo obtener Firebase Installation ID", error);
  }
}
