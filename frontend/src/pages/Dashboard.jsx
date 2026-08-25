import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import {
  Users,
  UserCircle,
  Target,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await dashboardAPI.get();
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return <div className="auth-error">{error}</div>;
  }

  const { kpis, charts, recent } = data;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const kpiCards = [
    { label: 'Total Leads', value: kpis.totalLeads, icon: Users, color: 'blue' },
    { label: 'Contacts', value: kpis.totalContacts, icon: UserCircle, color: 'green' },
    { label: 'Opportunities', value: kpis.totalOpportunities, icon: Target, color: 'purple' },
    { label: 'Open Tasks', value: kpis.openTasks, icon: CheckSquare, color: 'yellow' },
    { label: 'Pipeline Value', value: formatCurrency(kpis.pipelineValue), icon: DollarSign, color: 'green' },
    { label: 'Revenue', value: formatCurrency(kpis.totalRevenue), icon: TrendingUp, color: 'blue' },
  ];

  const leadsData = charts.leadsByStatus.map((item) => ({
    name: item._id,
    value: item.count,
  }));

  const oppsData = charts.opportunitiesByStage.map((item) => ({
    name: item._id,
    value: item.count,
  }));

  const tasksData = charts.tasksByStatus.map((item) => ({
    name: item._id,
    count: item.count,
  }));

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="topbar">
        <h1 className="topbar-title">Dashboard</h1>
        <div className="topbar-actions">
          <Link to="/ai" className="btn btn-primary">
            <Sparkles size={16} />
            AI Assistant
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className={`kpi-icon ${kpi.color}`}>
              <kpi.icon size={24} />
            </div>
            <div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Leads by Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={leadsData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {leadsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Opportunities by Stage</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={oppsData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="chart-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Leads</h3>
            <Link to="/leads" className="text-sm text-primary font-semibold">
              View all
            </Link>
          </div>
          {recent.recentLeads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No leads yet</div>
              <div className="empty-state-text">Start adding leads to see them here</div>
              <Link to="/leads" className="btn btn-primary btn-sm">
                Add Lead
              </Link>
            </div>
          ) : (
            <div className="table-container" style={{ boxShadow: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.recentLeads.map((lead) => (
                    <tr key={lead._id}>
                      <td className="font-semibold">{lead.name}</td>
                      <td>{lead.company}</td>
                      <td>
                        <span className={`badge badge-${lead.status === 'New' ? 'blue' : lead.status === 'Contacted' ? 'yellow' : lead.status === 'Qualified' ? 'green' : 'gray'}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td>{formatDate(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Upcoming Tasks</h3>
            <Link to="/tasks" className="text-sm text-primary font-semibold">
              View all
            </Link>
          </div>
          {recent.upcomingTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">All caught up!</div>
              <div className="empty-state-text">No upcoming tasks</div>
            </div>
          ) : (
            <div className="table-container" style={{ boxShadow: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.upcomingTasks.map((task) => (
                    <tr key={task._id}>
                      <td className="font-semibold">{task.title}</td>
                      <td>{formatDate(task.dueDate)}</td>
                      <td>
                        <span className={`badge badge-${task.priority === 'High' ? 'red' : task.priority === 'Medium' ? 'yellow' : 'green'}`}>
                          {task.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;