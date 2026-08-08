-- `preferencias.usuario.actualizada` continúa como acción de auditoría técnica.
-- Nunca volverá a ser un evento funcional visible, por eso se eliminan sus filas
-- históricas del historial y después el maestro inactivo que las sostenía.
DELETE FROM eventos.eventos AS evento
USING eventos.eventos_maestro AS maestro
WHERE evento.fid_eventos_maestro = maestro.id_eventos_maestro
  AND maestro.codigo = 'preferencias.usuario.actualizada';

DELETE FROM eventos.eventos_maestro
WHERE codigo = 'preferencias.usuario.actualizada';
