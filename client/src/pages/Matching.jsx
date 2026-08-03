import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/Toast';

export default function Matching() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  async function executeMatching() {
    if (!confirm('Esto ejecutara el algoritmo de matching y creara nuevas asignaciones. Continuar?')) return;

    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/matching/auto', { method: 'POST' });
      setResults(data);
      const matched = data.matched ?? data.data?.matched ?? 0;
      toast.success(`Matching completado: ${matched} asignaciones creadas`);
    } catch (err) {
      setError(err.message);
      toast.error('Error ejecutando matching: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Matching</h2>
        <button className="btn-primary" onClick={executeMatching} disabled={loading}>
          {loading ? 'Ejecutando...' : 'Ejecutar Matching'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {results && (
        <div className="matching-results">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Procesados</h3>
              <span className="stat-number">{results.processed ?? results.data?.processed ?? 0}</span>
            </div>
            <div className="stat-card">
              <h3>Emparejados</h3>
              <span className="stat-number">{results.matched ?? results.data?.matched ?? 0}</span>
            </div>
            <div className="stat-card">
              <h3>Score Promedio</h3>
              <span className="stat-number">
                {results.averageScore ?? results.data?.averageScore
                  ? `${Math.round((results.averageScore ?? results.data?.averageScore) * 100) / 100}%`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {(results.results || results.data?.results || []).length > 0 && (
            <div className="table-container">
              <h3>Resultados del Matching</h3>
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Estudiante</th>
                    <th>Score</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(results.results || results.data?.results || []).map((r, i) => (
                    <tr key={i}>
                      <td>{r.paciente || r.patient_name || '-'}</td>
                      <td>{r.estudiante || r.student_name || '-'}</td>
                      <td>{r.score ? `${Math.round(r.score * 100) / 100}%` : '-'}</td>
                      <td><span className="badge badge-success">{r.status || 'asignado'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="empty-state">
          <p>Presiona "Ejecutar Matching" para emparejar pacientes con estudiantes disponibles.</p>
          <p>El algoritmo considera: horario (30%), tratamiento (25%), carga (20%), urgencia (15%), dolor (5%), experiencia (5%)</p>
        </div>
      )}
    </div>
  );
}
