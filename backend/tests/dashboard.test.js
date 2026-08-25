const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');
const Contact = require('../src/models/Contact');
const Opportunity = require('../src/models/Opportunity');
const Task = require('../src/models/Task');
const Interaction = require('../src/models/Interaction');

describe('Dashboard API', () => {
  let user1, user2, token1, token2;

  beforeEach(async () => {
    user1 = await User.create({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      password: 'password123',
      company: 'Acme Corp',
    });
    user2 = await User.create({
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@example.com',
      password: 'password123',
      company: 'Globex',
    });
    token1 = jwt.sign({ id: user1._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    token2 = jwt.sign({ id: user2._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  describe('GET /api/dashboard', () => {
    beforeEach(async () => {
      // Create data for user1
      await Lead.create([
        { name: 'Lead 1', email: 'lead1@example.com', status: 'New', value: 1000, ownerId: user1._id },
        { name: 'Lead 2', email: 'lead2@example.com', status: 'Qualified', value: 5000, ownerId: user1._id },
      ]);
      await Contact.create([
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', ownerId: user1._id },
      ]);
      await Opportunity.create([
        { title: 'Deal 1', company: 'TechCorp', value: 50000, stage: 'Lead', ownerId: user1._id },
        { title: 'Deal 2', company: 'OtherCo', value: 25000, stage: 'Closed Won', ownerId: user1._id },
        { title: 'Deal 3', company: 'LostCo', value: 10000, stage: 'Closed Lost', ownerId: user1._id },
      ]);
      await Task.create([
        { title: 'Task 1', status: 'Pending', dueDate: '2026-09-01T10:00:00.000Z', ownerId: user1._id },
        { title: 'Task 2', status: 'Completed', ownerId: user1._id },
      ]);
      await Interaction.create([
        { type: 'Call', subject: 'Intro call', date: '2026-08-01T10:00:00.000Z', ownerId: user1._id },
        { type: 'Email', subject: 'Follow-up', date: '2026-08-02T10:00:00.000Z', ownerId: user1._id },
      ]);

      // Create data for user2 (should not appear in user1's dashboard)
      await Lead.create({ name: 'Other Lead', email: 'other@example.com', ownerId: user2._id });
      await Opportunity.create({ title: 'Other Deal', company: 'Globex', value: 99999, stage: 'Lead', ownerId: user2._id });
    });

    it('should return dashboard KPIs for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpis.totalLeads).toBe(2);
      expect(res.body.data.kpis.totalContacts).toBe(1);
      expect(res.body.data.kpis.totalOpportunities).toBe(3);
      expect(res.body.data.kpis.totalTasks).toBe(2);
      expect(res.body.data.kpis.openTasks).toBe(1);
      expect(res.body.data.kpis.wonOpportunities).toBe(1);
      expect(res.body.data.kpis.lostOpportunities).toBe(1);
    });

    it('should calculate pipeline value correctly (excludes won/lost)', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kpis.pipelineValue).toBe(50000);
      expect(res.body.data.kpis.totalRevenue).toBe(25000);
    });

    it('should calculate conversion rate correctly', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      // 1 won / (1 won + 1 lost) = 50%
      expect(res.body.data.kpis.conversionRate).toBe(50);
    });

    it('should return chart data grouped by status/stage/type', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.charts.leadsByStatus).toHaveLength(2);
      expect(res.body.data.charts.opportunitiesByStage).toHaveLength(3);
      expect(res.body.data.charts.tasksByStatus).toHaveLength(2);
      expect(res.body.data.charts.interactionsByType).toHaveLength(2);
    });

    it('should return recent leads and upcoming tasks', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.recent.recentLeads).toHaveLength(2);
      expect(res.body.data.recent.upcomingTasks).toHaveLength(1);
    });

    it('should not include other users data in dashboard', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kpis.totalLeads).toBe(2);
      expect(res.body.data.kpis.totalOpportunities).toBe(3);
      expect(res.body.data.kpis.pipelineValue).toBe(50000);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/dashboard');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return zeros for empty dashboard', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kpis.totalLeads).toBe(1); // user2 has 1 lead
      expect(res.body.data.kpis.totalContacts).toBe(0);
      expect(res.body.data.kpis.pipelineValue).toBe(99999);
      expect(res.body.data.kpis.conversionRate).toBe(0);
    });
  });
});