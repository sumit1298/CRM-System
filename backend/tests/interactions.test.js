const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Interaction = require('../src/models/Interaction');

describe('Interactions API', () => {
  let user1, user2, token1, token2;

  const interactionData = {
    type: 'Call',
    subject: 'Intro call with client',
    description: 'Discussed project requirements',
    date: '2026-08-01T10:00:00.000Z',
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

  describe('POST /api/interactions', () => {
    it('should create an interaction', async () => {
      const res = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${token1}`)
        .send(interactionData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe(interactionData.type);
      expect(res.body.data.subject).toBe(interactionData.subject);
      expect(res.body.data.ownerId.toString()).toBe(user1._id.toString());
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/interactions').send(interactionData);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for missing type', async () => {
      const res = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${token1}`)
        .send({ subject: 'No type' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid type', async () => {
      const res = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${token1}`)
        .send({ ...interactionData, type: 'Chat' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for missing subject', async () => {
      const res = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${token1}`)
        .send({ type: 'Email' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/interactions', () => {
    beforeEach(async () => {
      await Interaction.create([
        { ...interactionData, ownerId: user1._id },
        { ...interactionData, type: 'Email', subject: 'Follow-up email', ownerId: user1._id },
        { ...interactionData, subject: 'Other user interaction', ownerId: user2._id },
      ]);
    });

    it('should return only interactions owned by the authenticated user', async () => {
      const res = await request(app)
        .get('/api/interactions')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should support search by subject', async () => {
      const res = await request(app)
        .get('/api/interactions?search=Follow-up')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].subject).toBe('Follow-up email');
    });

    it('should support filtering by type', async () => {
      const res = await request(app)
        .get('/api/interactions?type=Email')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('Email');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/interactions?page=1&limit=1')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/interactions/:id', () => {
    it('should return an interaction by id', async () => {
      const interaction = await Interaction.create({ ...interactionData, ownerId: user1._id });

      const res = await request(app)
        .get(`/api/interactions/${interaction._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subject).toBe(interactionData.subject);
    });

    it('should return 404 for interaction owned by another user', async () => {
      const interaction = await Interaction.create({ ...interactionData, ownerId: user2._id });

      const res = await request(app)
        .get(`/api/interactions/${interaction._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent interaction', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/interactions/${fakeId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid interaction id format', async () => {
      const res = await request(app)
        .get('/api/interactions/invalid-id')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/interactions/:id', () => {
    it('should update an interaction', async () => {
      const interaction = await Interaction.create({ ...interactionData, ownerId: user1._id });

      const res = await request(app)
        .put(`/api/interactions/${interaction._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ type: 'Meeting', subject: 'Updated subject' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('Meeting');
      expect(res.body.data.subject).toBe('Updated subject');
    });

    it('should return 404 when updating another users interaction', async () => {
      const interaction = await Interaction.create({ ...interactionData, ownerId: user2._id });

      const res = await request(app)
        .put(`/api/interactions/${interaction._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ subject: 'Hacked' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/interactions/:id', () => {
    it('should delete an interaction', async () => {
      const interaction = await Interaction.create({ ...interactionData, ownerId: user1._id });

      const res = await request(app)
        .delete(`/api/interactions/${interaction._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await Interaction.findById(interaction._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 when deleting another users interaction', async () => {
      const interaction = await Interaction.create({ ...interactionData, ownerId: user2._id });

      const res = await request(app)
        .delete(`/api/interactions/${interaction._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});