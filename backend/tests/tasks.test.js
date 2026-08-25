const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Task = require('../src/models/Task');

describe('Tasks API', () => {
  let user1, user2, token1, token2;

  const taskData = {
    title: 'Follow up with client',
    description: 'Call to discuss proposal',
    dueDate: '2026-09-01T10:00:00.000Z',
    priority: 'High',
    status: 'Pending',
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

  describe('POST /api/tasks', () => {
    it('should create a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send(taskData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(taskData.title);
      expect(res.body.data.ownerId.toString()).toBe(user1._id.toString());
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/tasks').send(taskData);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for missing title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ description: 'No title here' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid priority', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ ...taskData, priority: 'Urgent' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid status', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ ...taskData, status: 'Done' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      await Task.create([
        { ...taskData, ownerId: user1._id },
        { ...taskData, title: 'Send invoice', priority: 'Low', ownerId: user1._id },
        { ...taskData, title: 'Other user task', ownerId: user2._id },
      ]);
    });

    it('should return only tasks owned by the authenticated user', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should support search by title', async () => {
      const res = await request(app)
        .get('/api/tasks?search=invoice')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Send invoice');
    });

    it('should support filtering by status', async () => {
      await Task.create({ ...taskData, title: 'Completed task', status: 'Completed', ownerId: user1._id });

      const res = await request(app)
        .get('/api/tasks?status=Completed')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('Completed');
    });

    it('should support filtering by priority', async () => {
      const res = await request(app)
        .get('/api/tasks?priority=Low')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].priority).toBe('Low');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/tasks?page=1&limit=1')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return a task by id', async () => {
      const task = await Task.create({ ...taskData, ownerId: user1._id });

      const res = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(taskData.title);
    });

    it('should return 404 for task owned by another user', async () => {
      const task = await Task.create({ ...taskData, ownerId: user2._id });

      const res = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid task id format', async () => {
      const res = await request(app)
        .get('/api/tasks/invalid-id')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update a task', async () => {
      const task = await Task.create({ ...taskData, ownerId: user1._id });

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'In Progress', priority: 'Critical' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('In Progress');
      expect(res.body.data.priority).toBe('Critical');
    });

    it('should return 404 when updating another users task', async () => {
      const task = await Task.create({ ...taskData, ownerId: user2._id });

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'Completed' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task', async () => {
      const task = await Task.create({ ...taskData, ownerId: user1._id });

      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await Task.findById(task._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 when deleting another users task', async () => {
      const task = await Task.create({ ...taskData, ownerId: user2._id });

      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});