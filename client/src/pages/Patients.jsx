import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/Toast';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: '', telefono: '', ciudad: '', edad: '',
    tipo_tratamiento: '', descripcion_caso: '', urgencia: 'media',
  });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => { loadPatients(); }, []);

  async function loadPatients() {
    try {
      setError('');
      const data = await apiFetch('/pacientes');
      setPatients(data.data || data.rows || []);
    } catch (err) {
      setError('No se pudieron cargar los pacientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/pacientes', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          edad: form.edad ? parseInt(form.edad) : null,
        }),
      });
      toast.success('Paciente creado exitosamente');
      setShowForm(false);
      setForm({ nombre_completo: '', telefono: '', ciudad: '', edad: '', tipo_tratamiento: '', descripcion_caso: '', urgencia: 'media' });
      await loadPatients();
    } catch (err) {
      toast.error('Error al crear paciente: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" />Cargando pacientes...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Pacientes</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo Paciente'}
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
              <label>Telefono *</label>
              <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Ciudad *</label>
              <input value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Edad</label>
              <input type="number" value={form.edad} onChange={e => setForm({ ...form, edad: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tipo de tratamiento</label>
              <select value={form.tipo_tratamiento} onChange={e => setForm({ ...form, tipo_tratamiento: e.target.value })}>
                <option value="">Seleccionar...</option>
                <option value="ortodoncia">Ortodoncia</option>
                <option value="endodoncia">Endodoncia</option>
                <option value="periodoncia">Periodoncia</option>
                <option value="cirugia_oral">Cirugia Oral</option>
                <option value="operatoria">Operatoria</option>
                <option value="protesis">Protesis</option>
                <option value="odontopediatria">Odontopediatria</option>
              </select>
            </div>
            <div className="form-group">
              <label>Urgencia</label>
              <select value={form.urgencia} onChange={e => setForm({ ...form, urgencia: e.target.value })}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>
          <div className="form-group full-width">
            <label>Descripcion del caso</label>
            <textarea value={form.descripcion_caso} onChange={e => setForm({ ...form, descripcion_caso: e.target.value })} rows={3} />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar Paciente'}
          </button>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Telefono</th>
              <th>Ciudad</th>
              <th>Tratamiento</th>
              <th>Urgencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay pacientes registrados</td></tr>
            ) : patients.map(p => (
              <tr key={p.id}>
                <td>{p.nombre_completo || p.nombre}</td>
                <td>{p.telefono}</td>
                <td>{p.ciudad}</td>
                <td>{p.tipo_tratamiento || p.tipo_tratamiento_inferido || '-'}</td>
                <td><span className={`badge badge-${p.urgencia || p.prioridad}`}>{p.urgencia || p.prioridad || '-'}</span></td>
                <td><span className={`badge badge-${p.status || p.estado || (p.activo ? 'activo' : 'inactivo')}`}>{p.status || p.estado || (p.activo !== false ? 'activo' : 'inactivo')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
