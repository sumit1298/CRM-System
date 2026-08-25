import { useEffect, useState } from 'react';
import { contactsAPI, exportAPI } from '../services/api';
import Modal from '../components/Modal';
import { Plus, Search, Pencil, Trash2, Download } from 'lucide-react';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  jobTitle: '',
  notes: '',
  tags: '',
};

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, sortBy, sortOrder };
      if (search) params.search = search;

      const res = await contactsAPI.getAll(params);
      setContacts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [page, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchContacts();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setEditingContact(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (contact) => {
    setEditingContact(contact);
    setForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone || '',
      company: contact.company || '',
      jobTitle: contact.jobTitle || '',
      notes: contact.notes || '',
      tags: contact.tags ? contact.tags.join(', ') : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    };

    try {
      if (editingContact) {
        await contactsAPI.update(editingContact._id, payload);
      } else {
        await contactsAPI.create(payload);
      }
      setShowModal(false);
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await contactsAPI.delete(deleteId);
      setDeleteId(null);
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete contact');
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportAPI.contacts();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contacts.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export contacts');
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1 className="topbar-title">Contacts</h1>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} />
            Export
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Add Contact
          </button>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {/* Search */}
      <div className="card mb-24">
        <div className="flex gap-12">
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 40 }}
              placeholder="Search contacts by name, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-input"
            style={{ width: 150 }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Sort: Created</option>
            <option value="firstName">Sort: First Name</option>
            <option value="lastName">Sort: Last Name</option>
            <option value="company">Sort: Company</option>
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

      {/* Contacts Table */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No contacts found</div>
            <div className="empty-state-text">
              {search ? 'Try adjusting your search' : 'Start adding contacts to your CRM'}
            </div>
            {!search && (
              <button className="btn btn-primary" onClick={openCreate}>
                <Plus size={16} />
                Add Contact
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
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Job Title</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact._id}>
                  <td className="font-semibold">
                    {contact.firstName} {contact.lastName}
                  </td>
                  <td>{contact.email}</td>
                  <td>{contact.phone || '—'}</td>
                  <td>{contact.company || '—'}</td>
                  <td>{contact.jobTitle || '—'}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn-icon" onClick={() => openEdit(contact)} title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button className="btn-icon" onClick={() => setDeleteId(contact._id)} title="Delete" style={{ color: '#ef4444' }}>
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
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} contacts)
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
          title={editingContact ? 'Edit Contact' : 'Add New Contact'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" form="contact-form" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingContact ? 'Update Contact' : 'Create Contact'}
              </button>
            </>
          }
        >
          <form id="contact-form" onSubmit={handleSubmit}>
            <div className="flex gap-12">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
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
            <div className="form-group">
              <label className="form-label">Job Title</label>
              <input
                type="text"
                className="form-input"
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input
                type="text"
                className="form-input"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="VIP, Decision Maker, Partner"
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
          title="Delete Contact"
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
          <p>Are you sure you want to delete this contact? This action cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

export default Contacts;