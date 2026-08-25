const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');
const Opportunity = require('../src/models/Opportunity');

describe('Analyst Analytics API', () => {
  let user, token;

  beforeEach(async () => {
    user = await User.create({
      firstName: 'Analyst',
      lastName: 'User',
      email: 'analyst@example.com',
      password: 'password123',
      company: 'Acme Corp',
    });
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  it('returns source funnel, weighted forecast, and cycle metrics', async () => {
    await Lead.create([
      { name: 'Won Lead', email: 'won@example.com', source: 'Referral', status: 'Won', ownerId: user._id, createdAt: '2026-08-10' },
      { name: 'Open Lead', email: 'open@example.com', source: 'Referral', status: 'Qualified', ownerId: user._id, createdAt: '2026-08-11' },
    ]);
    await Opportunity.create({
      title: 'Open Deal', company: 'Acme', value: 10000, probability: 50, stage: 'Proposal', ownerId: user._id,
    });

    const response = await request(app)
      .get('/api/analytics?from=2026-08-01&to=2026-08-31')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.sourceFunnel[0]).toMatchObject({ _id: 'Referral', total: 2, qualified: 2, won: 1 });
    expect(response.body.data.forecast).toMatchObject({ pipelineValue: 10000, weightedValue: 5000 });
    expect(response.body.data.trend).toHaveLength(1);
  });

  it('does not expose another user data', async () => {
    const otherUser = await User.create({
      firstName: 'Other', lastName: 'User', email: 'other@example.com', password: 'password123', company: 'Other Corp',
    });
    await Lead.create({ name: 'Other Lead', email: 'other-lead@example.com', source: 'Website', ownerId: otherUser._id });

    const response = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.sourceFunnel).toHaveLength(0);
    expect(response.body.data.trend).toHaveLength(0);
  });
});