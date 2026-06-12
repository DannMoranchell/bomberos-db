import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import './EmergenciasList.css';

const EmergenciasList = () => {
  const [emergencias, setEmergencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todas');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [accionEnProceso, setAccionEnProceso] = useState(false);

  const fetchEmergencias = async () => {
    setLoading(true);
    
    let query = supabase
      .from('emergencias')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (searchTerm) {
      query = query.or(`tipo_emergencia.ilike.%${searchTerm}%,ubicacion.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%`);
    }

    if (estadoFilter !== 'todas') {
      query = query.eq('estado', estadoFilter);
    }

    if (fechaInicio) {
      query = query.gte('fecha_emergencia', fechaInicio);
    }

    if (fechaFin) {
      query = query.lte('fecha_emergencia', fechaFin);
    }

    // Paginación
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    query = query.range(from, to).order('fecha_emergencia', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching emergencias:', error);
      alert('Error al cargar los datos');
    } else {
      setEmergencias(data || []);
      setTotalCount(count || 0);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchEmergencias();
  }, [searchTerm, estadoFilter, fechaInicio, fechaFin, currentPage, itemsPerPage]);

  const handleCambiarEstado = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'en curso' ? 'finalizada' : 'en curso';
    const confirmar = window.confirm(`¿Cambiar estado a "${nuevoEstado}"?`);
    
    if (!confirmar) return;
    
    setAccionEnProceso(true);
    const { error } = await supabase
      .from('emergencias')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      alert('Error al actualizar el estado');
    } else {
      fetchEmergencias();
    }
    setAccionEnProceso(false);
  };

  const handleEliminar = async (id) => {
    const confirmar = window.confirm('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.');
    
    if (!confirmar) return;
    
    setAccionEnProceso(true);
    const { error } = await supabase
      .from('emergencias')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al eliminar el registro');
    } else {
      fetchEmergencias();
    }
    setAccionEnProceso(false);
  };

  const exportarAExcel = () => {
    const dataToExport = emergencias.map(emp => ({
      Fecha: emp.fecha_emergencia,
      Tipo: emp.tipo_emergencia,
      Ubicación: emp.ubicacion,
      Descripción: emp.descripcion,
      Estado: emp.estado
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Emergencias');
    XLSX.writeFile(wb, `emergencias_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const limpiarFiltros = () => {
    setSearchTerm('');
    setEstadoFilter('todas');
    setFechaInicio('');
    setFechaFin('');
    setCurrentPage(1);
  };

  return (
    <div className="emergencias-container">
      <div className="header-actions">
        <h2>Gestión de Emergencias</h2>
        <button onClick={exportarAExcel} className="btn-exportar">
          📊 Exportar a Excel
        </button>
      </div>

      <div className="filtros-container">
        <div className="filtro-grupo">
          <input
            type="text"
            placeholder="🔍 Buscar por tipo, ubicación o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-busqueda"
          />
        </div>

        <div className="filtro-grupo">
          <select 
            value={estadoFilter} 
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="select-estado"
          >
            <option value="todas">Todos los estados</option>
            <option value="en curso">En curso</option>
            <option value="finalizada">Finalizada</option>
          </select>
        </div>

        <div className="filtro-grupo">
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            placeholder="Fecha inicio"
            className="input-fecha"
          />
          <span>a</span>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            placeholder="Fecha fin"
            className="input-fecha"
          />
        </div>

        <button onClick={limpiarFiltros} className="btn-limpiar">
          🧹 Limpiar filtros
        </button>
      </div>

      <div className="tabla-container">
        {loading ? (
          <div className="loading">Cargando datos...</div>
        ) : (
          <>
            <div className="info-paginacion">
              Mostrando {emergencias.length} de {totalCount} registros
              <div className="items-por-pagina">
                <label>Mostrar: </label>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <table className="emergencias-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Ubicación</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {emergencias.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="sin-datos">No se encontraron registros</td>
                  </tr>
                ) : (
                  emergencias.map((emergencia) => (
                    <tr key={emergencia.id}>
                      <td>{emergencia.fecha_emergencia}</td>
                      <td>
                        <span className={`tipo-badge tipo-${emergencia.tipo_emergencia.replace(/ /g, '-')}`}>
                          {emergencia.tipo_emergencia}
                        </span>
                      </td>
                      <td>{emergencia.ubicacion}</td>
                      <td className="descripcion-cell">{emergencia.descripcion}</td>
                      <td>
                        <span className={`estado-badge estado-${emergencia.estado.replace(/ /g, '-')}`}>
                          {emergencia.estado}
                        </span>
                      </td>
                      <td className="acciones-cell">
                        <button
                          onClick={() => handleCambiarEstado(emergencia.id, emergencia.estado)}
                          className="btn-estado"
                          disabled={accionEnProceso}
                          title={emergencia.estado === 'en curso' ? 'Marcar como finalizada' : 'Reabrir emergencia'}
                        >
                          {emergencia.estado === 'en curso' ? '✓ Finalizar' : '↺ Reabrir'}
                        </button>
                        <button
                          onClick={() => handleEliminar(emergencia.id)}
                          className="btn-eliminar"
                          disabled={accionEnProceso}
                          title="Eliminar registro"
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="paginacion">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-pagina"
                >
                  ← Anterior
                </button>
                <span className="pagina-info">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-pagina"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmergenciasList;