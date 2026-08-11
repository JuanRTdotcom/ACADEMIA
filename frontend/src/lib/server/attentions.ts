import { fail, redirect, type RequestEvent } from "@sveltejs/kit";
import { tienePermiso } from "$lib/permissions-client";
import { companyMessage, companyRequest, formText, UUID } from "./companies";
import { parseUserContext } from "./user-context";

export async function attentionPermission(
  event: RequestEvent,
  permission: string,
) {
  const response = await companyRequest(event, "/auth/me");
  return (
    response.ok &&
    tienePermiso(parseUserContext(await response.json()).permisos, permission)
  );
}

export async function attentionRequest(event: RequestEvent, path: string) {
  const response = await companyRequest(event, path);
  if (!response.ok)
    throw {
      status: response.status,
      message: await companyMessage(response, "attentions.loadError"),
    };
  return response.json();
}

export async function createAttentionVaccine(event: RequestEvent) {
  if (!(await attentionPermission(event, "administrator.vaccines.create")))
    return fail(403, { vaccineMessage: "vaccines.permissionDenied" });
  const nombre = formText(await event.request.formData(), "nombre");
  if (nombre.length < 2 || nombre.length > 120)
    return fail(400, { vaccineMessage: "vaccines.invalidData" });
  const response = await companyRequest(event, "/company/vaccines", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
  if (!response.ok)
    return fail(response.status, {
      vaccineMessage: await companyMessage(response, "vaccines.saveError"),
    });
  return {
    vaccineMessage: "vaccines.createdInline",
    vaccine: (await response.json()) as { id_vacunas: string; nombre: string },
  };
}

export async function createAttentionConsultationReason(event: RequestEvent) {
  if (
    !(await attentionPermission(
      event,
      "administrator.consultation_reasons.create",
    ))
  )
    return fail(403, { reasonMessage: "consultationReasons.permissionDenied" });
  const form = await event.request.formData();
  const nombre = formText(form, "nombre");
  const descripcion = formText(form, "descripcion");
  if (nombre.length < 2 || nombre.length > 120 || descripcion.length > 500)
    return fail(400, { reasonMessage: "consultationReasons.invalidData" });
  const response = await companyRequest(
    event,
    "/company/consultation-reasons",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre, descripcion }),
    },
  );
  if (!response.ok)
    return fail(response.status, {
      reasonMessage: await companyMessage(
        response,
        "consultationReasons.saveError",
      ),
    });
  return {
    reasonMessage: "consultationReasons.createdInline",
    consultationReason: (await response.json()) as {
      id_motivos_consulta: string;
      nombre: string;
      descripcion: string | null;
    },
  };
}

export async function createAttentionHospitalizationType(event: RequestEvent) {
  if (
    !(await attentionPermission(
      event,
      "administrator.hospitalization_types.create",
    ))
  )
    return fail(403, {
      hospitalizationTypeMessage: "hospitalizationTypes.permissionDenied",
    });
  const nombre = formText(await event.request.formData(), "nombre");
  if (nombre.length < 2 || nombre.length > 120)
    return fail(400, {
      hospitalizationTypeMessage: "hospitalizationTypes.invalidData",
    });
  const response = await companyRequest(
    event,
    "/company/hospitalization-types",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre }),
    },
  );
  if (!response.ok)
    return fail(response.status, {
      hospitalizationTypeMessage: await companyMessage(
        response,
        "hospitalizationTypes.saveError",
      ),
    });
  return {
    hospitalizationTypeMessage: "hospitalizationTypes.createdInline",
    hospitalizationType: (await response.json()) as {
      id_tipos_hospitalizacion: string;
      nombre: string;
    },
  };
}

export async function createAttentionProcedure(event: RequestEvent) {
  if (!(await attentionPermission(event, "administrator.procedures.create")))
    return fail(403, { procedureMessage: "procedures.permissionDenied" });
  const form = await event.request.formData();
  const nombre = formText(form, "nombre");
  const descripcion_guia = formText(form, "descripcion_guia");
  if (
    nombre.length < 2 ||
    nombre.length > 160 ||
    descripcion_guia.length < 5 ||
    descripcion_guia.length > 1000
  )
    return fail(400, { procedureMessage: "procedures.invalidData" });
  const response = await companyRequest(event, "/company/procedures", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre, descripcion_guia }),
  });
  if (!response.ok)
    return fail(response.status, {
      procedureMessage: await companyMessage(response, "procedures.saveError"),
    });
  return {
    procedureMessage: "procedures.createdInline",
    procedure: (await response.json()) as {
      id_procedimientos_veterinarios: string;
      nombre: string;
      descripcion_guia: string;
    },
  };
}

export async function createAttentionLaboratoryTest(event: RequestEvent) {
  if (
    !(await attentionPermission(event, "administrator.laboratory_tests.create"))
  )
    return fail(403, {
      laboratoryTestMessage: "laboratoryTests.permissionDenied",
    });
  const form = await event.request.formData();
  const nombre = formText(form, "nombre");
  const fid_categorias_pruebas_laboratorio = formText(
    form,
    "fid_categorias_pruebas_laboratorio",
  );
  if (
    nombre.length < 2 ||
    nombre.length > 220 ||
    !UUID.test(fid_categorias_pruebas_laboratorio)
  )
    return fail(400, { laboratoryTestMessage: "laboratoryTests.invalidData" });
  const response = await companyRequest(event, "/company/laboratory-tests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre, fid_categorias_pruebas_laboratorio }),
  });
  if (!response.ok)
    return fail(response.status, {
      laboratoryTestMessage: await companyMessage(
        response,
        "laboratoryTests.saveError",
      ),
    });
  return {
    laboratoryTestMessage: "laboratoryTests.createdInline",
    laboratoryTest: await response.json(),
  };
}

function recordPayload(form: FormData) {
  const type = formText(form, "fid_tipos_registro_atencion");
  let detail: unknown;
  try {
    detail = JSON.parse(formText(form, "detalle"));
  } catch {
    return null;
  }
  if (
    !UUID.test(type) ||
    !detail ||
    typeof detail !== "object" ||
    Array.isArray(detail)
  )
    return null;
  return {
    fid_tipos_registro_atencion: type,
    detalle: detail as Record<string, unknown>,
  };
}

function recordForm(form: FormData, record: ReturnType<typeof recordPayload>) {
  if (!record) return null;
  const body = new FormData();
  body.set("fid_tipos_registro_atencion", record.fid_tipos_registro_atencion);
  body.set("detalle", JSON.stringify(record.detalle));
  const files = form
    .getAll("adjuntos")
    .filter((item): item is File => item instanceof File && item.size > 0);
  for (const file of files) body.append("adjuntos", file, file.name);
  return body;
}

export async function createAttention(event: RequestEvent) {
  if (!(await attentionPermission(event, "clinic.attentions.create")))
    return fail(403, { attentionMessage: "attentions.permissionDenied" });
  const form = await event.request.formData();
  const pet = formText(form, "fid_mascotas");
  const registro = recordPayload(form);
  const body = recordForm(form, registro);
  if (!UUID.test(pet) || !registro || !body)
    return fail(400, { attentionMessage: "attentions.invalidData" });
  body.delete("fid_tipos_registro_atencion");
  body.delete("detalle");
  body.set("fid_mascotas", pet);
  body.set("registro", JSON.stringify(registro));
  const response = await companyRequest(event, "/clinic/attentions", {
    method: "POST",
    body,
  });
  if (!response.ok)
    return fail(response.status, {
      attentionMessage: await companyMessage(response, "attentions.saveError"),
    });
  const result = (await response.json()) as { id_atenciones: string };
  redirect(303, `/clinic/attentions/${result.id_atenciones}`);
}

export async function addAttentionRecord(event: RequestEvent, id: string) {
  if (
    !UUID.test(id) ||
    !(await attentionPermission(event, "clinic.attentions.update"))
  )
    return fail(403, { attentionMessage: "attentions.permissionDenied" });
  const form = await event.request.formData();
  const registro = recordPayload(form);
  const body = recordForm(form, registro);
  if (!registro || !body)
    return fail(400, { attentionMessage: "attentions.invalidData" });
  const response = await companyRequest(
    event,
    `/clinic/attentions/${id}/records`,
    {
      method: "POST",
      body,
    },
  );
  if (!response.ok)
    return fail(response.status, {
      attentionMessage: await companyMessage(response, "attentions.saveError"),
    });
  return { attentionMessage: "attentions.recordSaved" };
}

export async function changeAttentionStatus(
  event: RequestEvent,
  routeId?: string,
) {
  const form = await event.request.formData();
  const id = routeId ?? formText(form, "id_atenciones");
  const status = formText(form, "fid_parametros_estado");
  if (
    !UUID.test(id) ||
    !UUID.test(status) ||
    !(await attentionPermission(event, "clinic.attentions.update"))
  )
    return fail(403, { attentionMessage: "attentions.permissionDenied" });
  const response = await companyRequest(
    event,
    `/clinic/attentions/${id}/status`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fid_parametros_estado: status }),
    },
  );
  if (!response.ok)
    return fail(response.status, {
      attentionMessage: await companyMessage(response, "attentions.saveError"),
    });
  return { attentionMessage: "attentions.statusSaved" };
}

export async function removeAttentionRecord(event: RequestEvent, id: string) {
  const record = formText(
    await event.request.formData(),
    "id_registros_atencion",
  );
  if (
    !UUID.test(id) ||
    !UUID.test(record) ||
    !(await attentionPermission(event, "clinic.attentions.update"))
  )
    return fail(403, { attentionMessage: "attentions.permissionDenied" });
  const response = await companyRequest(
    event,
    `/clinic/attentions/${id}/records/${record}`,
    { method: "DELETE" },
  );
  if (!response.ok)
    return fail(response.status, {
      attentionMessage: await companyMessage(
        response,
        "attentions.deleteError",
      ),
    });
  return { attentionMessage: "attentions.recordDeleted" };
}

export async function removeAttention(event: RequestEvent) {
  const id = formText(await event.request.formData(), "id_atenciones");
  if (
    !UUID.test(id) ||
    !(await attentionPermission(event, "clinic.attentions.delete"))
  )
    return fail(403, { attentionMessage: "attentions.permissionDenied" });
  const response = await companyRequest(event, `/clinic/attentions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok)
    return fail(response.status, {
      attentionMessage: await companyMessage(
        response,
        "attentions.deleteError",
      ),
    });
  return { attentionMessage: "attentions.deleted" };
}

export async function createMinimalOwner(event: RequestEvent) {
  if (!(await attentionPermission(event, "clinic.owners.create")))
    return fail(403, { attentionMessage: "attentions.permissionDenied" });
  const form = await event.request.formData();
  const body = {
    fid_parametros_tipo_documento: formText(
      form,
      "fid_parametros_tipo_documento",
    ),
    numero_documento: formText(form, "numero_documento"),
    nombre_completo: formText(form, "nombre_completo"),
    celular: "",
    celular_verificado: false,
    sin_correo: true,
    correo: "",
    correo_verificado: false,
    telefono_fijo: "",
    direccion: "",
    fid_admin_level_0: "",
    fid_admin_level_3: "",
    contacto_alternativo_nombre: "",
    contacto_alternativo_telefono: "",
    fid_parametros_como_conocio: "",
    como_conocio_otro: "",
  };
  if (
    !UUID.test(body.fid_parametros_tipo_documento) ||
    body.numero_documento.length < 3 ||
    body.nombre_completo.length < 2
  )
    return fail(400, { attentionMessage: "attentions.invalidData" });
  const response = await companyRequest(event, "/clinic/owners", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    return fail(response.status, {
      attentionMessage: await companyMessage(
        response,
        "attentions.ownerSaveError",
      ),
    });
  return {
    attentionMessage: "attentions.ownerSaved",
    createdOwner: await response.json(),
  };
}

export async function createMinimalPet(event: RequestEvent) {
  if (!(await attentionPermission(event, "clinic.pets.create")))
    return fail(403, { attentionMessage: "attentions.permissionDenied" });
  const source = await event.request.formData();
  const owner = formText(source, "fid_propietarios");
  const name = formText(source, "nombre");
  const species = formText(source, "fid_especies_animales");
  const gender = formText(source, "fid_parametros_genero");
  if (!UUID.test(owner) || !UUID.test(species) || !UUID.test(gender) || !name)
    return fail(400, { attentionMessage: "attentions.invalidData" });
  const body = new FormData();
  body.set("fid_propietarios", owner);
  body.set("sin_propietario", "false");
  body.set("nombre", name);
  body.set("fid_especies_animales", species);
  body.set("fid_parametros_genero", gender);
  body.set("eliminar_foto", "false");
  const response = await companyRequest(event, "/clinic/pets", {
    method: "POST",
    body,
  });
  if (!response.ok)
    return fail(response.status, {
      attentionMessage: await companyMessage(
        response,
        "attentions.petSaveError",
      ),
    });
  return {
    attentionMessage: "attentions.petSaved",
    createdPet: await response.json(),
  };
}
