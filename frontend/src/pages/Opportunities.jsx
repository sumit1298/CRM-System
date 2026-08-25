import { useEffect, useState } from 'react';
import { opportunitiesAPI, exportAPI } from '../services/api';
import Modal from '../components/Modal';
import { Plus, Search, Pencil, Trash2, Download, LayoutGrid, List } from 'lucide-react';

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const emptyForm = {
  title: '',
  company: '',
  value: 0,
  stage: 'Lead',
  probability: 20,
  expectedCloseDate: '',
  notes: '',
};

function Opportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [board, setBoard] = useState([]);
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [dragOpp, setDragOpp] = useState(null);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, sortBy, sortOrder };
      if (search) params.search = search;
      if (stageFilter) params.stage = stageFilter;

      const res = await opportunitiesAPI.getAll(params);
      setOpportunities(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const res = await opportunitiesAPI.getBoard();
      setBoard(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'list') {
      fetchOpportunities();
    } else {
      fetchBoard();
    }
  }, [view, page, stageFilter, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      if (view === 'list') fetchOpportunities();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

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
      if (view === 'list') {
        fetchOpportunities();
      } else {
        fetchBoard();
      }
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
      if (view === 'list') {
        fetchOpportunities();
      } else {
        fetchBoard();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete opportunity');
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportAPI.opportunities();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'opportunities.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export opportunities');
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

  const getStageBadge = (stage) => {
    const map = {
      'Lead': 'blue',
      'Qualified': 'purple',
      'Proposal': 'yellow',
      'Negotiation': 'orange',
      'Closed Won': 'green',
      'Closed Lost': 'red',
    };
    return `badge badge-${map[stage] || 'gray'}`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value || 0);
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
        <h1 className="topbar-title">Opportunities</h1>
        <div className="topbar-actions">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              title="List View"
            >
              <List size={16} />
            </button>
            <button
              className={`view-toggle-btn ${view === 'board' ? 'active' : ''}`}
              onClick={() => setView('board')}
              title="Board View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} />
            Export
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Add Opportunity
          </button>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {view === 'list' ? (
        <>
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
                    placeholder="Search opportunities by title, company..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <select
                className="form-input"
                style={{ width: 180 }}
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <option value="">All Stages</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                className="form-input"
                style={{ width: 150 }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="createdAt">Sort: Created</option>
                <option value="title">Sort: Title</option>
                <option value="company">Sort: Company</option>
                <option value="value">Sort: Value</option>
                <option value="stage">Sort: Stage</option>
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

          {/* Opportunities Table */}
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🎯</div>
                <div className="empty-state-title">No opportunities found</div>
                <div className="empty-state-text">
                  {search || stageFilter ? 'Try adjusting your filters' : 'Start adding opportunities to track deals'}
                </div>
                {!search && !stageFilter && (
                  <button className="btn btn-primary" onClick={openCreate}>
                    <Plus size={16} />
                    Add Opportunity
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Company</th>
                    <th>Value</th>
                    <th>Stage</th>
                    <th>Probability</th>
                    <th>Close Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opp) => (
                    <tr key={opp._id}>
                      <td className="font-semibold">{opp.title}</td>
                      <td>{opp.company}</td>
                      <td className="font-semibold">{formatCurrency(opp.value)}</td>
                      <td>
                        <span className={getStageBadge(opp.stage)}>{opp.stage}</span>
                      </td>
                      <td>{opp.probability}%</td>
                      <td>{formatDate(opp.expectedCloseDate)}</td>
                      <td>
                        <div className="flex gap-8">
                          <button className="btn-icon" onClick={() => openEdit(opp)} title="Edit">
                            <Pencil size={16} />
                          </button>
                          <button className="btn-icon" onClick={() => setDeleteId(opp._id)} title="Delete" style={{ color: '#ef4444' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex-between mt-24">
              <div className="text-sm text-gray">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} opportunities)
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
        </>
      ) : (
        /* Kanban Board */
        loading ? (
          <div className="loading-spinner">
            <div className="spinner" />
          </div>
        ) : (
          <div className="kanban-board">
            {board.map((column) => (
              <div
                key={column.stage}
                className="kanban-column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(column.stage)}
              >
                <div className="kanban-column-header">
                  <span className={`badge ${getStageBadge(column.stage)}`}>{column.stage}</span>
                  <span className="kanban-count">{column.opportunities.length}</span>
                </div>
                <div className="kanban-column-body">
                  {column.opportunities.length === 0 ? (
                    <div className="kanban-empty">Drop here</div>
                  ) : (
                    column.opportunities.map((opp) => (
                      <div
                        key={opp._id}
                        className="kanban-card"
                        draggable
                        onDragStart={() => handleDragStart(opp)}
                      >
                        <div className="kanban-card-title">{opp.title}</div>
                        <div className="kanban-card-company">{opp.company}</div>
                        <div className="kanban-card-footer">
                          <span className="font-semibold">{formatCurrency(opp.value)}</span>
                          <span className="text-sm text-gray">{opp.probability}%</span>
                        </div>
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
        )
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
              <button className="btn btn-primary" form="opp-form" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingOpp ? 'Update Opportunity' : 'Create Opportunity'}
              </button>
            </>
          }
        >
          <form id="opp-form" onSubmit={handleSubmit}>
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

export default Opportunities;