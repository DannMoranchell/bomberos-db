import { parse } from 'date-fns';

// Función para parsear fecha DD-MM-YY a YYYY-MM-DD
const parseFecha = (fechaStr) => {
  if (!fechaStr) return null;
  try {
    // Intenta parsear DD-MM-YY
    const parsedDate = parse(fechaStr, 'dd-MM-yy', new Date());
    if (isNaN(parsedDate.getTime())) {
      // Si falla, intenta con otros formatos comunes
      const altDate = parse(fechaStr, 'dd/MM/yy', new Date());
      if (!isNaN(altDate.getTime())) {
        return altDate.toISOString().split('T')[0];
      }
      return null;
    }
    return parsedDate.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error parseando fecha:', fechaStr, error);
    return null;
  }
};

// Función para construir ubicación
const construirUbicacion = (sitio, via, colonia, alcaldia) => {
  const partes = [sitio, via, colonia, alcaldia].filter(parte => parte && parte.trim() !== '');
  return partes.join(' - ') || 'Ubicación no especificada';
};

// Función principal de mapeo
export const mapearEmergencia = (fila) => {
  // Extraer campos según la estructura del CSV
  const fecha = fila.Fecha || fila.fecha || '';
  const servicio = fila.Servicio || fila.servicio || fila.tipo || '';
  
  const sitio = fila.Sitio || fila.sitio || '';
  const via = fila.Vía || fila.via || fila.Via || '';
  const colonia = fila.Colonia || fila.colonia || '';
  const alcaldia = fila.Alcaldía || fila.alcaldia || fila.Alcaldia || '';
  const observaciones = fila.Observaciones || fila.observaciones || '';
  const derivadoDe = fila['Derivado de Se_Quemaba'] || fila.derivado || '';

  const fechaEmergencia = parseFecha(fecha);
  
  // Si no hay fecha válida, usar fecha actual
  const fechaFinal = fechaEmergencia || new Date().toISOString().split('T')[0];

  const ubicacion = construirUbicacion(sitio, via, colonia, alcaldia);
  
  // Construir descripción
  let descripcion = observaciones;
  if (!descripcion || descripcion.trim() === '') {
    descripcion = derivadoDe || `Emergencia tipo ${servicio}`;
  }

  // Normalizar tipo de emergencia
  let tipoNormalizado = (servicio || '').toLowerCase();
  const tiposValidos = ['incendio', 'rescate', 'accidente', 'emergencia médica', 'fuga de gas', 'inundación'];
  
  if (!tiposValidos.includes(tipoNormalizado) && tipoNormalizado) {
    // Intentar mapear términos comunes
    if (tipoNormalizado.includes('incendio')) tipoNormalizado = 'incendio';
    else if (tipoNormalizado.includes('rescate')) tipoNormalizado = 'rescate';
    else if (tipoNormalizado.includes('accidente')) tipoNormalizado = 'accidente';
    else if (tipoNormalizado.includes('médica') || tipoNormalizado.includes('medica')) tipoNormalizado = 'emergencia médica';
    else if (tipoNormalizado.includes('gas')) tipoNormalizado = 'fuga de gas';
    else if (tipoNormalizado.includes('inundación') || tipoNormalizado.includes('inundacion')) tipoNormalizado = 'inundación';
  }

  return {
    fecha_emergencia: fechaFinal,
    tipo_emergencia: tipoNormalizado || 'otros',
    ubicacion: ubicacion,
    descripcion: descripcion,
    estado: 'finalizada', // Por defecto para datos históricos
    datos_raw: fila // Guardar datos originales
  };
};

// Validar estructura del archivo
export const validarEstructuraArchivo = (data) => {
  if (!data || data.length === 0) {
    return { valido: false, mensaje: 'El archivo está vacío' };
  }

  const primeraFila = data[0];
  const columnasRequeridas = ['Fecha', 'Servicio'];
  const columnasPresentes = Object.keys(primeraFila);
  
  const columnasFaltantes = columnasRequeridas.filter(col => 
    !columnasPresentes.includes(col) && 
    !columnasPresentes.includes(col.toLowerCase())
  );

  if (columnasFaltantes.length > 0) {
    return { 
      valido: false, 
      mensaje: `Faltan columnas requeridas: ${columnasFaltantes.join(', ')}` 
    };
  }

  return { valido: true, mensaje: 'Estructura válida' };
};

// Procesar datos en lotes
export const procesarEnLotes = async (datos, batchSize = 100, callback) => {
  const resultados = {
    exitosos: 0,
    fallidos: 0,
    errores: []
  };

  for (let i = 0; i < datos.length; i += batchSize) {
    const lote = datos.slice(i, i + batchSize);
    lote.map(mapearEmergencia);
    
    if (callback) {
      callback({
        progreso: Math.min((i + batchSize) / datos.length * 100, 100),
        procesados: Math.min(i + batchSize, datos.length),
        total: datos.length
      });
    }

   
  }
  
  return resultados;
};