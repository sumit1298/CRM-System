import { useEffect, useState } from 'react';
import { interactionsAPI, exportAPI } from '../services/api';
import Modal from '../components/Modal';
import { Plus, Search, Pencil, Trash2, Download, Phone, Mail, Calendar, FileText } from 'lucide-react';

const TYPES = ['Call', 'Email', 'Meeting', 'Note'];

const emptyForm = {
  type: 'Call',
  subject: '',
  description: '',
  date: '',
};

function Interactions() {
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, sortBy, sortOrder };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;

      const res = await interactionsAPI.getAll(params);
      setInteractions(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load interactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteractions();
  }, [page, typeFilter, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchInteractions();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setEditingInteraction(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (interaction) => {
    setEditingInteraction(interaction);
    setForm({
      type: interaction.type,
      subject: interaction.subject,
      description: interaction.description || '',
      date: interaction.date ? interaction.date.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      date: form.date || null,
    };

    try {
      if (editingInteraction) {
        await interactionsAPI.update(editingInteraction._id, payload);
      } else {
        await interactionsAPI.create(payload);
      }
      setShowModal(false);
      fetchInteractions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save interaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await interactionsAPI.delete(deleteId);
      setDeleteId(null);
      fetchInteractions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete interaction');
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportAPI.interactions();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'interactions.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export interactions');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Call':
        return <Phone size={16} />;
      case 'Email':
        return <Mail size={16} />;
      case 'Meeting':
        return <Calendar size={16} />;
      case 'Note':
        return <FileText size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getTypeBadge = (type) => {
    const map = {
      'Call': 'blue',
      'Email': 'purple',
      'Meeting': 'green',
      'Note': 'yellow',
    };
    return `badge badge-${map[type] || 'gray'}`;
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div>
      <div className="topbar">
        <h1 className="topbar-title">Interactions</h1>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} />
            Export
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Add Interaction
          </button>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {/* Filters */}
      <div className="card mb-24">
        <div className="flex gap-12">
          <div style={{ flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 40 }}
                placeholder="Search interactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <select
            className="form-input"
            style={{ width: 150 }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            className="form-input"
            style={{ width: 150 }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Sort: Created</option>
            <option value="subject">Sort: Subject</option>
            <option value="type">Sort: Type</option>
            <option value="date">Sort: Date</option>
          </select>
          <select
            className="form-input"
            style={{ width: 120 }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Interactions List */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : interactions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">No interactions found</div>
            <div className="empty-state-text">
              {search || typeFilter ? 'Try adjusting your filters' : 'Start logging your interactions'}
            </div>
            {!search && !typeFilter && (
              <button className="btn btn-primary" onClick={openCreate}>
                <Plus size={16} />
                Add Interaction
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="interaction-list">
          {interactions.map((interaction) => (
            <div key={interaction._id} className="card interaction-item">
              <div className="interaction-icon">
                {getTypeIcon(interaction.type)}
              </div>
              <div className="interaction-content">
                <div className="flex-between">
                  <div className="flex gap-8 align-center">
                    <span className={getTypeBadge(interaction.type)}>{interaction.type}</span>
                    <span className="font-semibold">{interaction.subject}</span>
                  </div>
                  <div className="flex gap-8">
                    <button className="btn-icon" onClick={() => openEdit(interaction)} title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button className="btn-icon" onClick={() => setDeleteId(interaction._id)} title="Delete" style={{ color: '#ef4444' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {interaction.description && (
                  <div className="text-sm text-gray mt-8">{interaction.description}</div>
                )}
                <div className="text-sm text-gray mt-8">
                  {formatDate(interaction.date)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex-between mt-24">
          <div className="text-sm text-gray">
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} interactions)
          </div>
          <div className="flex gap-8">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal
          title={editingInteraction ? 'Edit Interaction' : 'Add New Interaction'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" form="interaction-form" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingInteraction ? 'Update Interaction' : 'Create Interaction'}
              </button>
            </>
          }
        >
          <form id="interaction-form" onSubmit={handleSubmit}>
            <div className="flex gap-12">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Type *</label>
                <select
                  className="form-input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input
                type="text"
                className="form-input"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal
          title="Delete Interaction"
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
          <p>Are you sure you want to delete this interaction? This action cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

export default Interactions;