import { json, type RequestHandler } from "@sveltejs/kit";
import { companyMessage, companyRequest, UUID } from "$lib/server/companies";

const TYPES = new Set([
  "escudo",
  "escudo_oscuro",
  "imagotipo",
  "imagotipo_oscuro",
  "portada",
  "login_escudo",
  "login_escudo_oscuro",
]);
const MAX_BYTES = 3 * 1024 * 1024;

function validFile(type: string, file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return type === "portada"
    ? file.type === "image/jpeg" && [".jpg", ".jpeg"].includes(extension)
    : file.type === "image/png" && extension === ".png";
}

export const POST: RequestHandler = async (event) => {
  const type = event.params.type ?? "";
  if (!TYPES.has(type))
    return json({ message: "companies.media.invalidRequest" }, { status: 400 });
  const input = await event.request.formData();
  const file = input.get("image");
  if (
    !(file instanceof File) ||
    file.size <= 0 ||
    file.size > MAX_BYTES ||
    !validFile(type, file)
  ) {
    const formatMessage = (type.startsWith("escudo") || type.startsWith("login_escudo"))
      ? "companies.media.invalidShieldFile"
      : type.startsWith("imagotipo")
        ? "companies.media.invalidLogotypeFile"
        : "companies.media.invalidFile";
    return json(
      {
        message:
          file instanceof File && file.size > MAX_BYTES
            ? "companies.media.tooLarge"
            : formatMessage,
      },
      { status: 400 },
    );
  }
  const body = new FormData();
  body.set("image", file, file.name);
  const response = await companyRequest(
    event,
    `/company/current/media/${type}`,
    { method: "POST", body },
  );
  if (!response.ok)
    return json(
      { message: await companyMessage(response, "companies.media.saveError") },
      { status: response.status },
    );
  return json(await response.json());
};

export const DELETE: RequestHandler = async (event) => {
  const type = event.params.type ?? "";
  if (!TYPES.has(type))
    return json({ message: "companies.media.invalidRequest" }, { status: 400 });
  const coverId = event.url.searchParams.get("coverId") ?? "";
  if (type === "portada" && !UUID.test(coverId))
    return json({ message: "companies.media.invalidRequest" }, { status: 400 });
  const query =
    type === "portada" ? `?coverId=${encodeURIComponent(coverId)}` : "";
  const response = await companyRequest(
    event,
    `/company/current/media/${type}${query}`,
    { method: "DELETE" },
  );
  if (!response.ok)
    return json(
      {
        message: await companyMessage(response, "companies.media.deleteError"),
      },
      { status: response.status },
    );
  return json(await response.json());
};
