import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadAssignments(); }, []);

  async function loadAssignments() {
    try {
      const data = await apiFetch('/asignaciones');
      setAssignments(data.data || data.rows || []);
    } catch (err) {
      setError('No se pudieron cargar las asignaciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" />Cargando asignaciones...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Asignaciones</h2>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Estudiante</th>
              <th>Fecha</th>
              <th>Score</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr><td colSpan={5} className="empty">No hay asignaciones</td></tr>
            ) : assignments.map(a => (
              <tr key={a.id}>
                <td>{a.paciente_nombre || a.nombre_paciente || '-'}</td>
                <td>{a.estudiante_nombre || a.nombre_estudiante || '-'}</td>
                <td>{a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString() : '-'}</td>
                <td>{a.score ? `${Math.round(a.score * 100) / 100}%` : '-'}</td>
                <td><span className={`badge badge-${a.status || a.estado || 'pendiente'}`}>{a.status || a.estado || 'pendiente'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
