import { permisosEfectivos } from "./permisos";

describe("permisosEfectivos", () => {
  const leer = { codigo: "agenda.read", fid_modulos: "agenda" };
  const editar = { codigo: "agenda.update", fid_modulos: "agenda" };
  const facturar = { codigo: "billing.create", fid_modulos: "billing" };

  it("combina rol y excepciones con denegación prioritaria y límite del plan", () => {
    const resultado = permisosEfectivos(
      [{ rol: { roles_permisos: [{ permiso: leer }, { permiso: editar }] } }],
      [
        { efecto: "denegar", permiso: editar },
        { efecto: "permitir", permiso: facturar },
      ],
      ["agenda"],
    );
    expect(resultado).toEqual([leer]);
  });

  it("permite una capacidad adicional cuando su módulo pertenece al plan", () => {
    expect(
      permisosEfectivos([], [{ efecto: "permitir", permiso: facturar }], ["billing"]),
    ).toEqual([facturar]);
  });
});
