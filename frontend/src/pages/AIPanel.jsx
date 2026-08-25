import { useEffect, useState } from 'react';
import { aiAPI, leadsAPI, opportunitiesAPI } from '../services/api';
import {
  Sparkles,
  FileText,
  Mail,
  Lightbulb,
  Activity,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

function AIPanel() {
  const [leads, setLeads] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [selectedOpp, setSelectedOpp] = useState('');
  const [pipelineHealth, setPipelineHealth] = useState('');
  const [leadSummary, setLeadSummary] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [riskScore, setRiskScore] = useState(null);
  const [emailContext, setEmailContext] = useState('');
  const [loading, setLoading] = useState({
    pipeline: false,
    summary: false,
    email: false,
    nextAction: false,
    risk: false,
  });
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const fetchData = async () => {
    try {
      const [leadsRes, oppsRes] = await Promise.all([
        leadsAPI.getAll({ limit: 100 }),
        opportunitiesAPI.getAll({ limit: 100 }),
      ]);
      setLeads(leadsRes.data.data);
      setOpportunities(oppsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePipelineHealth = async () => {
    setLoading({ ...loading, pipeline: true });
    setError('');
    try {
      const res = await aiAPI.pipelineHealth();
      setPipelineHealth(res.data.data.analysis);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze pipeline');
    } finally {
      setLoading({ ...loading, pipeline: false });
    }
  };

  const handleLeadSummary = async () => {
    if (!selectedLead) return;
    setLoading({ ...loading, summary: true });
    setError('');
    try {
      const res = await aiAPI.leadSummary(selectedLead);
      setLeadSummary(res.data.data.summary);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setLoading({ ...loading, summary: false });
    }
  };

  const handleEmailDraft = async () => {
    if (!selectedLead) return;
    setLoading({ ...loading, email: true });
    setError('');
    try {
      const res = await aiAPI.emailDraft(selectedLead, emailContext);
      setEmailDraft(res.data.data.email);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate email');
    } finally {
      setLoading({ ...loading, email: false });
    }
  };

  const handleNextAction = async () => {
    if (!selectedLead) return;
    setLoading({ ...loading, nextAction: true });
    setError('');
    try {
      const res = await aiAPI.nextAction(selectedLead);
      setNextAction(res.data.data.suggestion);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to suggest next action');
    } finally {
      setLoading({ ...loading, nextAction: false });
    }
  };

  const handleRiskScore = async () => {
    if (!selectedOpp) return;
    setLoading({ ...loading, risk: true });
    setError('');
    try {
      const res = await aiAPI.riskScore(selectedOpp);
      setRiskScore(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to calculate risk');
    } finally {
      setLoading({ ...loading, risk: false });
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const getRiskColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };

  const renderTextBlock = (title, content, loadingKey, onCopy, copyKey) => (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {content && (
          <button className="btn-icon" onClick={() => onCopy(content, copyKey)} title="Copy">
            {copied === copyKey ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
          </button>
        )}
      </div>
      {loading[loadingKey] ? (
        <div className="loading-spinner" style={{ padding: '20px 0' }}>
          <div className="spinner" />
        </div>
      ) : content ? (
        <div className="ai-result-text">{content}</div>
      ) : (
        <div className="empty-state" style={{ padding: '20px' }}>
          <div className="empty-state-icon">✨</div>
          <div className="empty-state-text">Click generate to get AI insights</div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="topbar">
        <h1 className="topbar-title">AI Assistant</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={handlePipelineHealth} disabled={loading.pipeline}>
            <RefreshCw size={16} />
            {loading.pipeline ? 'Analyzing...' : 'Analyze Pipeline'}
          </button>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {/* Pipeline Health */}
      <div className="card mb-24">
        <div className="card-header">
          <h3 className="card-title">
            <Activity size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Pipeline Health Analysis
          </h3>
        </div>
        {loading.pipeline ? (
          <div className="loading-spinner" style={{ padding: '20px 0' }}>
            <div className="spinner" />
          </div>
        ) : pipelineHealth ? (
          <div className="ai-result-text">{pipelineHealth}</div>
        ) : (
          <div className="empty-state" style={{ padding: '20px' }}>
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">
              Get an AI-powered assessment of your sales pipeline health, strengths, risks, and recommendations
            </div>
          </div>
        )}
      </div>

      {/* Lead AI Tools */}
      <div className="card mb-24">
        <div className="card-header">
          <h3 className="card-title">
            <Sparkles size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Lead Intelligence
          </h3>
        </div>
        <div className="flex gap-12 mb-24">
          <select
            className="form-input"
            style={{ flex: 1 }}
            value={selectedLead}
            onChange={(e) => {
              setSelectedLead(e.target.value);
              setLeadSummary('');
              setEmailDraft('');
              setNextAction('');
            }}
          >
            <option value="">Select a lead...</option>
            {leads.map((lead) => (
              <option key={lead._id} value={lead._id}>
                {lead.name} {lead.company ? `- ${lead.company}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="ai-tools-grid">
          <div className="ai-tool-card">
            <div className="ai-tool-header">
              <FileText size={18} />
              <span>Lead Summary</span>
            </div>
            <p className="text-sm text-gray mb-12">Generate a professional summary with talking points and recommended next steps.</p>
            <button className="btn btn-primary btn-sm" onClick={handleLeadSummary} disabled={!selectedLead || loading.summary}>
              {loading.summary ? 'Generating...' : 'Generate Summary'}
            </button>
            {leadSummary && (
              <div className="ai-result-text mt-12">{leadSummary}</div>
            )}
          </div>

          <div className="ai-tool-card">
            <div className="ai-tool-header">
              <Mail size={18} />
              <span>Follow-up Email</span>
            </div>
            <p className="text-sm text-gray mb-12">Generate a professional follow-up email for this lead.</p>
            <input
              type="text"
              className="form-input mb-12"
              placeholder="Context (e.g., following up on demo)"
              value={emailContext}
              onChange={(e) => setEmailContext(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={handleEmailDraft} disabled={!selectedLead || loading.email}>
              {loading.email ? 'Generating...' : 'Generate Email'}
            </button>
            {emailDraft && (
              <div className="ai-result-text mt-12">{emailDraft}</div>
            )}
          </div>

          <div className="ai-tool-card">
            <div className="ai-tool-header">
              <Lightbulb size={18} />
              <span>Next Best Action</span>
            </div>
            <p className="text-sm text-gray mb-12">Get AI-suggested next action based on interaction history.</p>
            <button className="btn btn-primary btn-sm" onClick={handleNextAction} disabled={!selectedLead || loading.nextAction}>
              {loading.nextAction ? 'Suggesting...' : 'Suggest Action'}
            </button>
            {nextAction && (
              <div className="ai-result-text mt-12">{nextAction}</div>
            )}
          </div>
        </div>
      </div>

      {/* Opportunity Risk */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Activity size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Deal Risk Assessment
          </h3>
        </div>
        <div className="flex gap-12 mb-24">
          <select
            className="form-input"
            style={{ flex: 1 }}
            value={selectedOpp}
            onChange={(e) => {
              setSelectedOpp(e.target.value);
              setRiskScore(null);
            }}
          >
            <option value="">Select an opportunity...</option>
            {opportunities.map((opp) => (
              <option key={opp._id} value={opp._id}>
                {opp.title} - {opp.company} (${opp.value})
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleRiskScore} disabled={!selectedOpp || loading.risk}>
            {loading.risk ? 'Calculating...' : 'Calculate Risk'}
          </button>
        </div>

        {riskScore && (
          <div className="risk-result">
            <div className="risk-score-container">
              <div
                className="risk-score-circle"
                style={{
                  background: `conic-gradient(${getRiskColor(riskScore.riskScore)} ${riskScore.riskScore * 3.6}deg, #e2e8f0 0deg)`,
                }}
              >
                <div className="risk-score-inner">
                  <div className="risk-score-value" style={{ color: getRiskColor(riskScore.riskScore) }}>
                    {riskScore.riskScore}
                  </div>
                  <div className="risk-score-label">Risk Score</div>
                </div>
              </div>
            </div>
            <div className="risk-details">
              <div className="risk-reason">
                <strong>Reason:</strong> {riskScore.reason}
              </div>
              <div className="risk-recommendation">
                <strong>Recommendation:</strong> {riskScore.recommendation}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIPanel;