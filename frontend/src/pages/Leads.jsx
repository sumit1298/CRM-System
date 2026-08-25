import { useEffect, useState } from 'react';
import { leadsAPI, exportAPI } from '../services/api';
import Modal from '../components/Modal';
import { Plus, Search, Pencil, Trash2, Download, X } from 'lucide-react';

const STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const SOURCES = ['Website', 'Referral', 'Social Media', 'Email Campaign', 'Cold Call', 'Event', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: 'Website',
  status: 'New',
  priority: 'Medium',
  value: 0,
  assignedTo: '',
  notes: '',
  tags: '',
};

function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, sortBy, sortOrder };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const res = await leadsAPI.getAll(params);
      setLeads(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter, priorityFilter, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLeads();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setEditingLead(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      company: lead.company || '',
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      value: lead.value || 0,
      assignedTo: lead.assignedTo || '',
      notes: lead.notes || '',
      tags: lead.tags ? lead.tags.join(', ') : '',
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
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    };

    try {
      if (editingLead) {
        await leadsAPI.update(editingLead._id, payload);
      } else {
        await leadsAPI.create(payload);
      }
      setShowModal(false);
      fetchLeads();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await leadsAPI.delete(deleteId);
      setDeleteId(null);
      fetchLeads();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete lead');
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportAPI.leads();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'leads.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export leads');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      New: 'blue',
      Contacted: 'yellow',
      Qualified: 'green',
      Proposal: 'purple',
      Negotiation: 'yellow',
      Won: 'green',
      Lost: 'red',
    };
    return `badge badge-${map[status] || 'gray'}`;
  };

  const getPriorityBadge = (priority) => {
    const map = {
      Low: 'green',
      Medium: 'yellow',
      High: 'red',
      Critical: 'red',
    };
    return `badge badge-${map[priority] || 'gray'}`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div>
      <div className="topbar">
        <h1 className="topbar-title">Leads</h1>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} />
            Export
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Add Lead
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
                placeholder="Search leads by name, email, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <select
            className="form-input"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="form-input"
            style={{ width: 160 }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            className="form-input"
            style={{ width: 150 }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Sort: Created</option>
            <option value="name">Sort: Name</option>
            <option value="value">Sort: Value</option>
            <option value="status">Sort: Status</option>
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

      {/* Leads Table */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : leads.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No leads found</div>
            <div className="empty-state-text">
              {search || statusFilter || priorityFilter
                ? 'Try adjusting your filters'
                : 'Start adding leads to grow your pipeline'}
            </div>
            {!search && !statusFilter && !priorityFilter && (
              <button className="btn btn-primary" onClick={openCreate}>
                <Plus size={16} />
                Add Lead
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Value</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead._id}>
                  <td className="font-semibold">{lead.name}</td>
                  <td>{lead.company || '—'}</td>
                  <td>{lead.email}</td>
                  <td>
                    <span className={getStatusBadge(lead.status)}>{lead.status}</span>
                  </td>
                  <td>
                    <span className={getPriorityBadge(lead.priority)}>{lead.priority}</span>
                  </td>
                  <td className="font-semibold">{formatCurrency(lead.value)}</td>
                  <td>{lead.source}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn-icon" onClick={() => openEdit(lead)} title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button className="btn-icon" onClick={() => setDeleteId(lead._id)} title="Delete" style={{ color: '#ef4444' }}>
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
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} leads)
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
          title={editingLead ? 'Edit Lead' : 'Add New Lead'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" form="lead-form" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingLead ? 'Update Lead' : 'Create Lead'}
              </button>
            </>
          }
        >
          <form id="lead-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-12">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Company</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-12">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Source</label>
                <select
                  className="form-input"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-12">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Priority</label>
                <select
                  className="form-input"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Value ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  min="0"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <input
                type="text"
                className="form-input"
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input
                type="text"
                className="form-input"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="VIP, Enterprise, Hot"
              />
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
          title="Delete Lead"
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
          <p>Are you sure you want to delete this lead? This action cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

export default Leads;