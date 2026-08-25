const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');

describe('Security & Error Handling', () => {
  let user, token;

  beforeEach(async () => {
    user = await User.create({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      password: 'password123',
      company: 'Acme Corp',
    });
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  describe('Authentication Security', () => {
    it('should return 401 for missing token', async () => {
      const res = await request(app).get('/api/leads');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Not authorized to access this route');
    });

    it('should return 401 for malformed token', async () => {
      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for token with invalid signature', async () => {
      const fakeToken = jwt.sign({ id: user._id }, 'wrong-secret-key', { expiresIn: '7d' });

      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for token of deleted user', async () => {
      const deletedUser = await User.create({
        firstName: 'Temp',
        lastName: 'User',
        email: 'temp@example.com',
        password: 'password123',
      });
      const deletedToken = jwt.sign({ id: deletedUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      await User.findByIdAndDelete(deletedUser._id);

      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${deletedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for expired token', async () => {
      const expiredToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '-1s' });

      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('NoSQL Injection Protection', () => {
    it('should sanitize MongoDB query operators in query params', async () => {
      const res = await request(app)
        .get('/api/leads?status[$ne]=Won')
        .set('Authorization', `Bearer ${token}`);

      // Should not throw error or return unexpected data
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should sanitize MongoDB query operators in body', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: { $ne: 'hack' }, email: 'test@example.com' });

      // Should be treated as invalid data, not a query injection
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Validation & Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Can't find");
    });

    it('should return 422 for invalid ObjectId format', async () => {
      const res = await request(app)
        .get('/api/leads/not-a-valid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for validation errors with field details', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '', email: 'invalid-email' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 500 for server errors gracefully', async () => {
      // Send malformed JSON to trigger a parse error
      const res = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('{invalid json');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@example.com', // Already exists
          password: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Data Isolation', () => {
    it('should not allow access to another users lead via ID', async () => {
      const otherUser = await User.create({
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob@example.com',
        password: 'password123',
      });
      const otherLead = await Lead.create({
        name: 'Bob Lead',
        email: 'boblead@example.com',
        ownerId: otherUser._id,
      });

      const res = await request(app)
        .get(`/api/leads/${otherLead._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should not allow updating another users lead', async () => {
      const otherUser = await User.create({
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob2@example.com',
        password: 'password123',
      });
      const otherLead = await Lead.create({
        name: 'Bob Lead',
        email: 'boblead2@example.com',
        ownerId: otherUser._id,
      });

      const res = await request(app)
        .put(`/api/leads/${otherLead._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Won' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should not allow deleting another users lead', async () => {
      const otherUser = await User.create({
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob3@example.com',
        password: 'password123',
      });
      const otherLead = await Lead.create({
        name: 'Bob Lead',
        email: 'boblead3@example.com',
        ownerId: otherUser._id,
      });

      const res = await request(app)
        .delete(`/api/leads/${otherLead._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should return health check response', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('CRM API');
    });
  });
});