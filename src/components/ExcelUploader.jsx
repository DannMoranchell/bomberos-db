import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabase';
import { validarEstructuraArchivo, mapearEmergencia } from '../utils/csvMapper';
import './ExcelUploader.css';

const ExcelUploader = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMensaje(null);
      leerArchivo(selectedFile);
    }
  };

  const leerArchivo = (archivo) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      
      const validacion = validarEstructuraArchivo(jsonData);
      if (!validacion.valido) {
        setMensaje({ tipo: 'error', texto: validacion.mensaje });
        setPreviewData([]);
        return;
      }

      // Mostrar preview de los primeros 5 registros mapeados
      const preview = jsonData.slice(0, 5).map(mapearEmergencia);
      setPreviewData(preview);
      setMensaje({ tipo: 'info', texto: `Se encontraron ${jsonData.length} registros. Vista previa de los primeros 5.` });
      
      // Guardar datos completos para subir después
      window.datosACargar = jsonData;
    };
    reader.readAsArrayBuffer(archivo);
  };

  const subirDatos = async () => {
    if (!window.datosACargar || window.datosACargar.length === 0) {
      setMensaje({ tipo: 'error', texto: 'No hay datos para subir' });
      return;
    }

    setCargando(true);
    setProgreso(0);
    
    const datos = window.datosACargar;
    const batchSize = 100;
    let exitosos = 0;
    let fallidos = 0;
    const errores = [];

    for (let i = 0; i < datos.length; i += batchSize) {
      const lote = datos.slice(i, i + batchSize);
      const emergenciasMapeadas = lote.map(mapearEmergencia);
      
      const { data: result, error } = await supabase
        .from('emergencias')
        .insert(emergenciasMapeadas)
        .select();

      if (error) {
        fallidos += lote.length;
        errores.push({ lote: i / batchSize + 1, error: error.message });
      } else {
        exitosos += result.length;
      }

      const progresoActual = ((i + batchSize) / datos.length) * 100;
      setProgreso(Math.min(progresoActual, 100));
    }

    setCargando(false);
    
    const mensajeTexto = `Carga completada: ${exitosos} registros exitosos, ${fallidos} fallidos.`;
    if (errores.length > 0) {
      console.error('Errores en la carga:', errores);
    }
    
    setMensaje({ 
      tipo: fallidos === 0 ? 'exito' : 'advertencia', 
      texto: mensajeTexto 
    });
    
    if (onUploadComplete) {
      onUploadComplete();
    }
    
    // Limpiar
    setFile(null);
    setPreviewData([]);
    window.datosACargar = null;
    setTimeout(() => setProgreso(0), 3000);
  };

  return (
    <div className="uploader-container">
      <h2>Cargar Datos Históricos</h2>
      
      <div className="file-input-area">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          disabled={cargando}
          id="file-input"
        />
        <label htmlFor="file-input" className="file-label">
          📁 Seleccionar Archivo
        </label>
        {file && <span className="file-name">{file.name}</span>}
      </div>

      {mensaje && (
        <div className={`message message-${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      {previewData.length > 0 && (
        <div className="preview-section">
          <h3>Vista Previa de Datos Mapeados</h3>
          <div className="preview-table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Ubicación</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.fecha_emergencia}</td>
                    <td>{item.tipo_emergencia}</td>
                    <td>{item.ubicacion}</td>
                    <td>{item.descripcion.substring(0, 50)}...</td>
                    <td>{item.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button 
            onClick={subirDatos} 
            disabled={cargando}
            className="btn-subir"
          >
            {cargando ? `Subiendo... ${Math.round(progreso)}%` : '📤 Subir a la Base de Datos'}
          </button>
          
          {cargando && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progreso}%` }}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExcelUploader;