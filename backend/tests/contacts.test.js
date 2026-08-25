const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Contact = require('../src/models/Contact');

describe('Contacts API', () => {
  let user1, user2, token1, token2;

  const contactData = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '555-1234',
    company: 'TechCorp',
    jobTitle: 'CTO',
    notes: 'Key decision maker',
    tags: ['vip', 'technical'],
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

  describe('POST /api/contacts', () => {
    it('should create a contact', async () => {
      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${token1}`)
        .send(contactData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe(contactData.firstName);
      expect(res.body.data.ownerId.toString()).toBe(user1._id.toString());
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/contacts').send(contactData);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for missing firstName', async () => {
      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${token1}`)
        .send({ lastName: 'Smith', email: 'test@example.com' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid email', async () => {
      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${token1}`)
        .send({ ...contactData, email: 'not-an-email' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/contacts', () => {
    beforeEach(async () => {
      await Contact.create([
        { ...contactData, ownerId: user1._id },
        { ...contactData, firstName: 'John', email: 'john@example.com', ownerId: user1._id },
        { ...contactData, firstName: 'Other', email: 'other@example.com', ownerId: user2._id },
      ]);
    });

    it('should return only contacts owned by the authenticated user', async () => {
      const res = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should support search by firstName', async () => {
      const res = await request(app)
        .get('/api/contacts?search=John')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].firstName).toBe('John');
    });

    it('should support search by company', async () => {
      const res = await request(app)
        .get('/api/contacts?search=TechCorp')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/contacts?page=1&limit=1')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should return a contact by id', async () => {
      const contact = await Contact.create({ ...contactData, ownerId: user1._id });

      const res = await request(app)
        .get(`/api/contacts/${contact._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe(contactData.firstName);
    });

    it('should return 404 for contact owned by another user', async () => {
      const contact = await Contact.create({ ...contactData, ownerId: user2._id });

      const res = await request(app)
        .get(`/api/contacts/${contact._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent contact', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/contacts/${fakeId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid contact id format', async () => {
      const res = await request(app)
        .get('/api/contacts/invalid-id')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/contacts/:id', () => {
    it('should update a contact', async () => {
      const contact = await Contact.create({ ...contactData, ownerId: user1._id });

      const res = await request(app)
        .put(`/api/contacts/${contact._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ jobTitle: 'CEO', company: 'NewCorp' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobTitle).toBe('CEO');
      expect(res.body.data.company).toBe('NewCorp');
    });

    it('should return 404 when updating another users contact', async () => {
      const contact = await Contact.create({ ...contactData, ownerId: user2._id });

      const res = await request(app)
        .put(`/api/contacts/${contact._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ jobTitle: 'CEO' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should delete a contact', async () => {
      const contact = await Contact.create({ ...contactData, ownerId: user1._id });

      const res = await request(app)
        .delete(`/api/contacts/${contact._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await Contact.findById(contact._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 when deleting another users contact', async () => {
      const contact = await Contact.create({ ...contactData, ownerId: user2._id });

      const res = await request(app)
        .delete(`/api/contacts/${contact._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});