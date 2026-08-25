import { useEffect, useState } from 'react';
import { analyticsAPI, dashboardAPI } from '../services/api';
import {
  Users,
  UserCircle,
  Target,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Percent,
  Award,
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
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

function Analytics() {
  const [data, setData] = useState(null);
  const [analystData, setAnalystData] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, analyticsRes] = await Promise.all([
          dashboardAPI.get(),
          analyticsAPI.get({ from: from || undefined, to: to || undefined }),
        ]);
        setData(dashboardRes.data.data);
        setAnalystData(analyticsRes.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [from, to]);

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

  const { kpis, charts } = data;
  const { forecast, sourceFunnel, winLoss, dataQuality, trend } = analystData;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const leadsData = charts.leadsByStatus.map((item) => ({
    name: item._id,
    value: item.count,
  }));

  const oppsData = charts.opportunitiesByStage.map((item) => ({
    name: item._id,
    count: item.count,
    value: item.value,
  }));

  const tasksData = charts.tasksByStatus.map((item) => ({
    name: item._id,
    count: item.count,
  }));

  const interactionsData = charts.interactionsByType.map((item) => ({
    name: item._id,
    value: item.count,
  }));

  const kpiCards = [
    { label: 'Total Leads', value: kpis.totalLeads, icon: Users, color: 'blue' },
    { label: 'Contacts', value: kpis.totalContacts, icon: UserCircle, color: 'green' },
    { label: 'Opportunities', value: kpis.totalOpportunities, icon: Target, color: 'purple' },
    { label: 'Total Tasks', value: kpis.totalTasks, icon: CheckSquare, color: 'yellow' },
    { label: 'Pipeline Value', value: formatCurrency(kpis.pipelineValue), icon: DollarSign, color: 'green' },
    { label: 'Avg Deal Value', value: formatCurrency(kpis.avgDealValue), icon: TrendingUp, color: 'blue' },
    { label: 'Total Revenue', value: formatCurrency(kpis.totalRevenue), icon: Award, color: 'purple' },
    { label: 'Conversion Rate', value: `${kpis.conversionRate}%`, icon: Percent, color: 'orange' },
  ];

  return (
    <div>
      <div className="topbar">
        <h1 className="topbar-title">Analytics</h1>
        <div className="topbar-actions">
          <label className="text-sm">From <input className="form-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="text-sm">To <input className="form-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div><div className="kpi-value">{formatCurrency(forecast.pipelineValue)}</div><div className="kpi-label">Open Pipeline</div></div></div>
        <div className="kpi-card"><div><div className="kpi-value">{formatCurrency(forecast.weightedValue)}</div><div className="kpi-label">Weighted Forecast</div></div></div>
        <div className="kpi-card"><div><div className="kpi-value">{trend.reduce((sum, item) => sum + item.leads, 0)}</div><div className="kpi-label">Leads In Range</div></div></div>
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

      {/* Charts Row 1 */}
      <div className="chart-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Leads by Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={leadsData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
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
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={oppsData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="value" name="Value ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="chart-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tasks by Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={tasksData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Interactions by Type</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={interactionsData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {interactionsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline Value by Stage */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Pipeline Value by Stage</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={oppsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="value" name="Value ($)" stroke="#6366f1" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Lead Volume Trend</h3></div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="leads" name="Leads" stroke="#10b981" strokeWidth={2} />
            <Line type="monotone" dataKey="value" name="Lead value ($)" stroke="#f59e0b" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-grid">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Funnel by Lead Source</h3></div>
          <div className="table-container" style={{ boxShadow: 'none' }}>
            <table className="table"><thead><tr><th>Source</th><th>Leads</th><th>Qualified</th><th>Won</th><th>Win rate</th></tr></thead>
              <tbody>{sourceFunnel.map((item) => <tr key={item._id || 'Unknown'}><td>{item._id || 'Unknown'}</td><td>{item.total}</td><td>{item.qualified}</td><td>{item.won}</td><td>{item.total ? `${Math.round((item.won / item.total) * 100)}%` : '0%'}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Win/Loss Cycle Analysis</h3></div>
          <p>Won: {winLoss.won.deals} deals, average {Math.round(winLoss.won.averageDays || 0)} days</p>
          <p>Lost: {winLoss.lost.deals} deals, average {Math.round(winLoss.lost.averageDays || 0)} days</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Data Quality Checks</h3></div>
        <div className="table-container" style={{ boxShadow: 'none' }}>
          <table className="table"><tbody>
            <tr><td>Duplicate lead emails</td><td>{dataQuality.duplicateLeadEmails}</td></tr>
            <tr><td>Duplicate contact emails</td><td>{dataQuality.duplicateContactEmails}</td></tr>
            <tr><td>Leads missing company or phone</td><td>{dataQuality.leadsMissingCompanyOrPhone}</td></tr>
            <tr><td>Closed opportunities missing close date</td><td>{dataQuality.closedOpportunitiesMissingClosedAt}</td></tr>
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

export default Analytics;