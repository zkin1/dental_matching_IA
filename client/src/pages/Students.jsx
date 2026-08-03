import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/Toast';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: '', email: '', telefono: '', semestre: '',
    especialidades: [], carnet: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const specialties = [
    'ortodoncia', 'endodoncia', 'periodoncia', 'cirugia_oral',
    'operatoria', 'protesis', 'odontopediatria',
  ];

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    try {
      setError('');
      const data = await apiFetch('/estudiantes');
      setStudents(data.data || data.rows || []);
    } catch (err) {
      setError('No se pudieron cargar los estudiantes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleSpecialty(sp) {
    setForm(prev => ({
      ...prev,
      especialidades: prev.especialidades.includes(sp)
        ? prev.especialidades.filter(s => s !== sp)
        : [...prev.especialidades, sp],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/estudiantes', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          semestre: form.semestre ? parseInt(form.semestre) : null,
        }),
      });
      toast.success('Estudiante creado exitosamente');
      setShowForm(false);
      setForm({ nombre_completo: '', email: '', telefono: '', semestre: '', especialidades: [], carnet: '' });
      await loadStudents();
    } catch (err) {
      toast.error('Error al crear estudiante: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" />Cargando estudiantes...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Estudiantes</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo Estudiante'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {showForm && (
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre completo *</label>
              <input value={form.nombre_completo} onChange={e => setForm({ ...form, nombre_completo: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Telefono</label>
              <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Carnet</label>
              <input value={form.carnet} onChange={e => setForm({ ...form, carnet: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Semestre</label>
              <input type="number" min="1" max="12" value={form.semestre} onChange={e => setForm({ ...form, semestre: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Especialidades</label>
            <div className="checkbox-grid">
              {specialties.map(sp => (
                <label key={sp} className="checkbox-label">
                  <input type="checkbox" checked={form.especialidades.includes(sp)} onChange={() => toggleSpecialty(sp)} />
                  {sp.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar Estudiante'}
          </button>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Semestre</th>
              <th>Especialidades</th>
              <th>Casos</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay estudiantes registrados</td></tr>
            ) : students.map(s => (
              <tr key={s.id}>
                <td>{s.nombre_completo || s.nombre}</td>
                <td>{s.email}</td>
                <td>{s.semestre}</td>
                <td>
                  {(Array.isArray(s.especialidades) ? s.especialidades : []).map(sp => (
                    <span key={typeof sp === 'string' ? sp : sp.nombre} className="badge">{typeof sp === 'string' ? sp : sp.nombre}</span>
                  ))}
                </td>
                <td>{s.casos_completados ?? 0}</td>
                <td><span className={`badge badge-${s.status || s.estado || 'activo'}`}>{s.status || s.estado || 'activo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
