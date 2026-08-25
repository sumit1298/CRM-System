import { useEffect, useState } from 'react';
import { opportunitiesAPI } from '../services/api';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import Modal from '../components/Modal';

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const STAGE_COLORS = {
  'Lead': '#3b82f6',
  'Qualified': '#8b5cf6',
  'Proposal': '#f59e0b',
  'Negotiation': '#f97316',
  'Closed Won': '#10b981',
  'Closed Lost': '#ef4444',
};

const emptyForm = {
  title: '',
  company: '',
  value: 0,
  stage: 'Lead',
  probability: 20,
  expectedCloseDate: '',
  notes: '',
};

function Pipeline() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragOpp, setDragOpp] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const res = await opportunitiesAPI.getBoard();
      setBoard(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const openCreate = () => {
    setEditingOpp(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (opp) => {
    setEditingOpp(opp);
    setForm({
      title: opp.title,
      company: opp.company,
      value: opp.value,
      stage: opp.stage,
      probability: opp.probability,
      expectedCloseDate: opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '',
      notes: opp.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      value: Number(form.value) || 0,
      probability: Number(form.probability) || 0,
      expectedCloseDate: form.expectedCloseDate || null,
    };

    try {
      if (editingOpp) {
        await opportunitiesAPI.update(editingOpp._id, payload);
      } else {
        await opportunitiesAPI.create(payload);
      }
      setShowModal(false);
      fetchBoard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save opportunity');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await opportunitiesAPI.delete(deleteId);
      setDeleteId(null);
      fetchBoard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete opportunity');
    }
  };

  const handleDragStart = (opp) => {
    setDragOpp(opp);
  };

  const handleDrop = async (stage) => {
    if (!dragOpp) return;
    if (dragOpp.stage === stage) {
      setDragOpp(null);
      return;
    }

    try {
      await opportunitiesAPI.updateStage(dragOpp._id, stage);
      setDragOpp(null);
      fetchBoard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update stage');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const totalPipelineValue = board
    .filter((col) => col.stage !== 'Closed Won' && col.stage !== 'Closed Lost')
    .reduce((sum, col) => sum + col.opportunities.reduce((s, opp) => s + (opp.value || 0), 0), 0);

  const totalWonValue = board
    .filter((col) => col.stage === 'Closed Won')
    .reduce((sum, col) => sum + col.opportunities.reduce((s, opp) => s + (opp.value || 0), 0), 0);

  return (
    <div>
      <div className="topbar">
        <h1 className="topbar-title">Sales Pipeline</h1>
        <div className="topbar-actions">
          <div className="kpi-card" style={{ padding: '10px 16px', margin: 0 }}>
            <div className="kpi-icon green" style={{ width: 36, height: 36, fontSize: 16 }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(totalPipelineValue)}</div>
              <div className="kpi-label">Open Pipeline</div>
            </div>
          </div>
          <div className="kpi-card" style={{ padding: '10px 16px', margin: 0 }}>
            <div className="kpi-icon blue" style={{ width: 36, height: 36, fontSize: 16 }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(totalWonValue)}</div>
              <div className="kpi-label">Closed Won</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Add Opportunity
          </button>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : (
        <div className="pipeline-container">
          {board.map((column) => (
            <div
              key={column.stage}
              className="pipeline-column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(column.stage)}
            >
              <div className="pipeline-column-header">
                <div className="pipeline-column-title">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: STAGE_COLORS[column.stage] || '#94a3b8',
                      display: 'inline-block',
                    }}
                  />
                  {column.stage}
                </div>
                <span className="pipeline-column-count">{column.opportunities.length}</span>
              </div>
              <div className="kanban-column-body">
                {column.opportunities.length === 0 ? (
                  <div className="kanban-empty">Drop here</div>
                ) : (
                  column.opportunities.map((opp) => (
                    <div
                      key={opp._id}
                      className={`pipeline-card ${dragOpp?._id === opp._id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(opp)}
                    >
                      <div className="pipeline-card-title">{opp.title}</div>
                      <div className="pipeline-card-company">{opp.company}</div>
                      <div className="pipeline-card-value">{formatCurrency(opp.value)}</div>
                      <div className="pipeline-card-probability">Probability: {opp.probability}%</div>
                      <div className="kanban-card-actions">
                        <button className="btn-icon" onClick={() => openEdit(opp)} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="btn-icon" onClick={() => setDeleteId(opp._id)} title="Delete" style={{ color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal
          title={editingOpp ? 'Edit Opportunity' : 'Add New Opportunity'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" form="pipeline-form" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingOpp ? 'Update Opportunity' : 'Create Opportunity'}
              </button>
            </>
          }
        >
          <form id="pipeline-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Company *</label>
              <input
                type="text"
                className="form-input"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-12">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Value ($) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  min="0"
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Probability (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.probability}
                  onChange={(e) => setForm({ ...form, probability: e.target.value })}
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div className="flex gap-12">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Stage</label>
                <select
                  className="form-input"
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Expected Close Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.expectedCloseDate}
                  onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal
          title="Delete Opportunity"
          onClose={() => setDeleteId(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </>
          }
        >
          <p>Are you sure you want to delete this opportunity? This action cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

export default Pipeline;