import { normalizarPermisosPorModulo } from "./permisos-usuario";

describe("normalizarPermisosPorModulo", () => {
  it("activa el modulo padre con todos sus descendientes", () => {
    const resultado = normalizarPermisosPorModulo([
      {
        id_modulos: "veterinaria",
        fid_modulos_padre: null,
        acceso_usuario_obligatorio: false,
        permisos: [{ id_permisos: "general", pertenece_al_rol: true }],
      },
      {
        id_modulos: "agenda",
        fid_modulos_padre: "veterinaria",
        acceso_usuario_obligatorio: false,
        permisos: [{ id_permisos: "agenda-editar", pertenece_al_rol: false }],
      },
    ], ["general"]);

    expect(resultado).toEqual(["general", "agenda-editar"]);
  });
});
