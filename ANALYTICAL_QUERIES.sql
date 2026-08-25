-- Portable SQL companion for the CRM exports.
-- Use the equivalent MongoDB report endpoint in production.

-- 1. Lead-source funnel
SELECT
  source,
  COUNT(*) AS total_leads,
  SUM(CASE WHEN status IN ('Qualified', 'Proposal', 'Negotiation', 'Won') THEN 1 ELSE 0 END) AS qualified_leads,
  SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END) AS won_leads,
  ROUND(100.0 * SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS win_rate_pct
FROM leads
GROUP BY source
ORDER BY total_leads DESC;

-- 2. Weighted open-pipeline forecast
SELECT
  SUM(value) AS open_pipeline,
  SUM(value * probability / 100.0) AS weighted_forecast
FROM opportunities
WHERE stage NOT IN ('Closed Won', 'Closed Lost');

-- 3. Monthly lead trend
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS leads,
  SUM(value) AS lead_value
FROM leads
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- 4. Sales-cycle and win/loss analysis
SELECT
  stage AS outcome,
  COUNT(*) AS deals,
  AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400.0) AS average_cycle_days
FROM opportunities
WHERE stage IN ('Closed Won', 'Closed Lost')
  AND closed_at IS NOT NULL
GROUP BY stage;