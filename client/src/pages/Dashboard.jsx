import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const data = await apiFetch('/dashboard/stats');
      setStats(data.data || data);
    } catch (err) {
      setError('No se pudieron cargar las estadisticas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" />Cargando dashboard...</div>;

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      {error && <div className="error-msg">{error}</div>}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Pacientes</h3>
          <span className="stat-number">{stats?.pacientes ?? stats?.totalPacientes ?? 0}</span>
        </div>
        <div className="stat-card">
          <h3>Estudiantes</h3>
          <span className="stat-number">{stats?.estudiantes ?? stats?.totalEstudiantes ?? 0}</span>
        </div>
        <div className="stat-card">
          <h3>Asignaciones</h3>
          <span className="stat-number">{stats?.asignaciones ?? stats?.totalAsignaciones ?? 0}</span>
        </div>
        <div className="stat-card">
          <h3>Score Promedio</h3>
          <span className="stat-number">{stats?.scorePromedio ? `${Math.round(stats.scorePromedio)}%` : 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}
