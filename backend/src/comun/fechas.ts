/**
 * Convierte un string de fecha pura "YYYY-MM-DD" a un objeto Date interpretándolo
 * en la zona horaria indicada (ej. "America/Lima"), de modo que al guardarse en la
 * base de datos se registre con el desplazamiento UTC real correcto.
 */
export function parseDateInTimezone(dateString: string | null | undefined, timezoneName: string): Date | null {
  if (!dateString) return null;
  
  // Si ya tiene formato ISO de fecha completa con offset, simplemente parseamos
  if (dateString.includes('T')) {
    return new Date(dateString);
  }

  // Si es solo "YYYY-MM-DD"
  try {
    // Usamos el API de internacionalización para obtener el offset local o formatear de forma segura
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneName,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Creamos una fecha temporal y buscamos la diferencia horaria
    const tempDate = new Date(`${dateString}T00:00:00Z`);
    const parts = formatter.formatToParts(tempDate);
    
    const partVal = (type: Intl.DateTimeFormatPartTypes) => 
      parts.find(p => p.type === type)?.value ?? '';

    const year = parseInt(partVal('year'));
    const month = parseInt(partVal('month'));
    const day = parseInt(partVal('day'));
    const hour = parseInt(partVal('hour'));
    const minute = parseInt(partVal('minute'));
    const second = parseInt(partVal('second'));

    // Construimos la fecha interpretada en UTC de lo que el formateador devolvió
    const utcRepresentation = Date.UTC(year, month - 1, day, hour, minute, second);
    const diff = tempDate.getTime() - utcRepresentation;

    // Retornamos la fecha con la corrección del desfase horario aplicada
    return new Date(tempDate.getTime() + diff);
  } catch {
    // Si falla el formateador para la zona horaria provista, caemos en el comportamiento estándar
    return new Date(dateString);
  }
}
