const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Opportunity = require('../src/models/Opportunity');

describe('Opportunities API', () => {
  let user1, user2, token1, token2;

  const oppData = {
    title: 'Enterprise Deal',
    company: 'TechCorp',
    value: 50000,
    stage: 'Lead',
    probability: 20,
    notes: 'High potential deal',
  };

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

  describe('POST /api/opportunities', () => {
    it('should create an opportunity', async () => {
      const res = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token1}`)
        .send(oppData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(oppData.title);
      expect(res.body.data.ownerId.toString()).toBe(user1._id.toString());
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/opportunities').send(oppData);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for missing title', async () => {
      const res = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token1}`)
        .send({ company: 'TestCo', value: 1000 });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for negative value', async () => {
      const res = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token1}`)
        .send({ ...oppData, value: -100 });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/opportunities', () => {
    beforeEach(async () => {
      await Opportunity.create([
        { ...oppData, ownerId: user1._id },
        { ...oppData, title: 'Second Deal', company: 'OtherCo', ownerId: user1._id },
        { ...oppData, title: 'Other User Deal', ownerId: user2._id },
      ]);
    });

    it('should return only opportunities owned by the authenticated user', async () => {
      const res = await request(app)
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should support search by title', async () => {
      const res = await request(app)
        .get('/api/opportunities?search=Second')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Second Deal');
    });

    it('should support filtering by stage', async () => {
      await Opportunity.create({ ...oppData, title: 'Won Deal', stage: 'Closed Won', ownerId: user1._id });

      const res = await request(app)
        .get('/api/opportunities?stage=Closed Won')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].stage).toBe('Closed Won');
    });
  });

  describe('GET /api/opportunities/board', () => {
    it('should return opportunities grouped by stage', async () => {
      await Opportunity.create([
        { ...oppData, title: 'Lead Deal', stage: 'Lead', ownerId: user1._id },
        { ...oppData, title: 'Qualified Deal', stage: 'Qualified', ownerId: user1._id },
        { ...oppData, title: 'Won Deal', stage: 'Closed Won', ownerId: user1._id },
      ]);

      const res = await request(app)
        .get('/api/opportunities/board')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(6); // 6 stages
      expect(res.body.data[0].stage).toBe('Lead');
      expect(res.body.data[0].opportunities).toHaveLength(1);
      expect(res.body.data[4].stage).toBe('Closed Won');
      expect(res.body.data[4].opportunities).toHaveLength(1);
    });
  });

  describe('GET /api/opportunities/:id', () => {
    it('should return an opportunity by id', async () => {
      const opp = await Opportunity.create({ ...oppData, ownerId: user1._id });

      const res = await request(app)
        .get(`/api/opportunities/${opp._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(oppData.title);
    });

    it('should return 404 for opportunity owned by another user', async () => {
      const opp = await Opportunity.create({ ...oppData, ownerId: user2._id });

      const res = await request(app)
        .get(`/api/opportunities/${opp._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid id format', async () => {
      const res = await request(app)
        .get('/api/opportunities/invalid-id')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/opportunities/:id', () => {
    it('should update an opportunity', async () => {
      const opp = await Opportunity.create({ ...oppData, ownerId: user1._id });

      const res = await request(app)
        .put(`/api/opportunities/${opp._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ value: 75000, stage: 'Qualified' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.value).toBe(75000);
      expect(res.body.data.stage).toBe('Qualified');
    });

    it('should return 404 when updating another users opportunity', async () => {
      const opp = await Opportunity.create({ ...oppData, ownerId: user2._id });

      const res = await request(app)
        .put(`/api/opportunities/${opp._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ value: 1000 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/opportunities/:id/stage', () => {
    it('should update stage and auto-update probability', async () => {
      const opp = await Opportunity.create({ ...oppData, ownerId: user1._id });

      const res = await request(app)
        .patch(`/api/opportunities/${opp._id}/stage`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ stage: 'Negotiation' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe('Negotiation');
      expect(res.body.data.probability).toBe(80);
    });

    it('should set probability to 100 for Closed Won', async () => {
      const opp = await Opportunity.create({ ...oppData, ownerId: user1._id });

      const res = await request(app)
        .patch(`/api/opportunities/${opp._id}/stage`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ stage: 'Closed Won' });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('Closed Won');
      expect(res.body.data.probability).toBe(100);
    });

    it('should return 422 for invalid stage', async () => {
      const opp = await Opportunity.create({ ...oppData, ownerId: user1._id });

      const res = await request(app)
        .patch(`/api/opportunities/${opp._id}/stage`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ stage: 'InvalidStage' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/opportunities/:id', () => {
    it('should delete an opportunity', async () => {
      const opp = await Opportunity.create({ ...oppData, ownerId: user1._id });

      const res = await request(app)
        .delete(`/api/opportunities/${opp._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await Opportunity.findById(opp._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 when deleting another users opportunity', async () => {
      const opp = await Opportunity.create({ ...oppData, ownerId: user2._id });

      const res = await request(app)
        .delete(`/api/opportunities/${opp._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});