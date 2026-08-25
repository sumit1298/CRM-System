const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');

describe('Leads API', () => {
  let user1, user2, token1, token2;

  const leadData = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '555-1234',
    company: 'TechCorp',
    source: 'Website',
    status: 'New',
    priority: 'High',
    value: 5000,
    notes: 'Interested in enterprise plan',
    tags: ['hot', 'enterprise'],
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

  describe('POST /api/leads', () => {
    it('should create a lead', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${token1}`)
        .send(leadData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(leadData.name);
      expect(res.body.data.ownerId.toString()).toBe(user1._id.toString());
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/leads').send(leadData);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for missing name', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid email', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: 'Test Lead', email: 'not-an-email' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/leads', () => {
    beforeEach(async () => {
      await Lead.create([
        { ...leadData, ownerId: user1._id },
        { ...leadData, name: 'Second Lead', email: 'second@example.com', ownerId: user1._id },
        { ...leadData, name: 'Other User Lead', email: 'other@example.com', ownerId: user2._id },
      ]);
    });

    it('should return only leads owned by the authenticated user', async () => {
      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should support search by name', async () => {
      const res = await request(app)
        .get('/api/leads?search=Second')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Second Lead');
    });

    it('should support filtering by status', async () => {
      await Lead.create({ ...leadData, name: 'Won Lead', email: 'won@example.com', status: 'Won', ownerId: user1._id });

      const res = await request(app)
        .get('/api/leads?status=Won')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('Won');
    });

    it('should support sorting by value ascending', async () => {
      await Lead.create({ ...leadData, name: 'Low Value', email: 'low@example.com', value: 100, ownerId: user1._id });
      await Lead.create({ ...leadData, name: 'High Value', email: 'high@example.com', value: 10000, ownerId: user1._id });

      const res = await request(app)
        .get('/api/leads?sortBy=value&sortOrder=asc')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].value).toBe(100);
      expect(res.body.data[res.body.data.length - 1].value).toBe(10000);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/leads?page=1&limit=1')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/leads/:id', () => {
    it('should return a lead by id', async () => {
      const lead = await Lead.create({ ...leadData, ownerId: user1._id });

      const res = await request(app)
        .get(`/api/leads/${lead._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(leadData.name);
    });

    it('should return 404 for lead owned by another user', async () => {
      const lead = await Lead.create({ ...leadData, ownerId: user2._id });

      const res = await request(app)
        .get(`/api/leads/${lead._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent lead', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/leads/${fakeId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid lead id format', async () => {
      const res = await request(app)
        .get('/api/leads/invalid-id')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/leads/:id', () => {
    it('should update a lead', async () => {
      const lead = await Lead.create({ ...leadData, ownerId: user1._id });

      const res = await request(app)
        .put(`/api/leads/${lead._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'Qualified', value: 10000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Qualified');
      expect(res.body.data.value).toBe(10000);
    });

    it('should return 404 when updating another users lead', async () => {
      const lead = await Lead.create({ ...leadData, ownerId: user2._id });

      const res = await request(app)
        .put(`/api/leads/${lead._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'Won' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid status value', async () => {
      const lead = await Lead.create({ ...leadData, ownerId: user1._id });

      const res = await request(app)
        .put(`/api/leads/${lead._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'InvalidStatus' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/leads/:id', () => {
    it('should delete a lead', async () => {
      const lead = await Lead.create({ ...leadData, ownerId: user1._id });

      const res = await request(app)
        .delete(`/api/leads/${lead._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await Lead.findById(lead._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 when deleting another users lead', async () => {
      const lead = await Lead.create({ ...leadData, ownerId: user2._id });

      const res = await request(app)
        .delete(`/api/leads/${lead._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});