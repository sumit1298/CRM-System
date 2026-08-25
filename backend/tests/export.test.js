const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');
const Contact = require('../src/models/Contact');
const Opportunity = require('../src/models/Opportunity');
const Task = require('../src/models/Task');
const Interaction = require('../src/models/Interaction');

describe('Export API', () => {
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

  describe('GET /api/export/leads', () => {
    beforeEach(async () => {
      await Lead.create([
        { name: 'Jane Smith', email: 'jane@example.com', phone: '555-1234', company: 'TechCorp', source: 'Website', status: 'New', priority: 'High', value: 5000, notes: 'Interested', ownerId: user1._id },
        { name: 'Other User Lead', email: 'other@example.com', ownerId: user2._id },
      ]);
    });

    it('should export leads as CSV', async () => {
      const res = await request(app)
        .get('/api/export/leads')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('leads.csv');
      expect(res.text).toContain('name,email,phone,company,source,status,priority,value,notes,createdAt');
      expect(res.text).toContain('Jane Smith');
      expect(res.text).not.toContain('Other User Lead');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/export/leads');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/export/contacts', () => {
    beforeEach(async () => {
      await Contact.create([
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '555-1234', company: 'TechCorp', ownerId: user1._id },
        { firstName: 'Other', lastName: 'User', email: 'other@example.com', ownerId: user2._id },
      ]);
    });

    it('should export contacts as CSV', async () => {
      const res = await request(app)
        .get('/api/export/contacts')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('contacts.csv');
      expect(res.text).toContain('firstName,lastName,email,phone,company,jobTitle,leadId,createdAt');
      expect(res.text).toContain('Jane');
      expect(res.text).not.toContain('Other');
    });
  });

  describe('GET /api/export/opportunities', () => {
    beforeEach(async () => {
      await Opportunity.create([
        { title: 'Deal 1', company: 'TechCorp', value: 50000, stage: 'Lead', ownerId: user1._id },
        { title: 'Other Deal', company: 'Globex', value: 99999, stage: 'Lead', ownerId: user2._id },
      ]);
    });

    it('should export opportunities as CSV', async () => {
      const res = await request(app)
        .get('/api/export/opportunities')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('opportunities.csv');
      expect(res.text).toContain('title,company,value,stage,probability,expectedCloseDate,notes,createdAt');
      expect(res.text).toContain('Deal 1');
      expect(res.text).not.toContain('Other Deal');
    });
  });

  describe('GET /api/export/tasks', () => {
    beforeEach(async () => {
      await Task.create([
        { title: 'Task 1', description: 'Do something', priority: 'High', status: 'Pending', ownerId: user1._id },
        { title: 'Other Task', ownerId: user2._id },
      ]);
    });

    it('should export tasks as CSV', async () => {
      const res = await request(app)
        .get('/api/export/tasks')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('tasks.csv');
      expect(res.text).toContain('title,description,dueDate,priority,status,leadId,contactId,createdAt');
      expect(res.text).toContain('Task 1');
      expect(res.text).not.toContain('Other Task');
    });
  });

  describe('GET /api/export/interactions', () => {
    beforeEach(async () => {
      await Interaction.create([
        { type: 'Call', subject: 'Intro call', description: 'Had a good call', date: '2026-08-01T10:00:00.000Z', ownerId: user1._id },
        { type: 'Email', subject: 'Other Interaction', ownerId: user2._id },
      ]);
    });

    it('should export interactions as CSV', async () => {
      const res = await request(app)
        .get('/api/export/interactions')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('interactions.csv');
      expect(res.text).toContain('type,subject,description,date,leadId,contactId,createdAt');
      expect(res.text).toContain('Intro call');
      expect(res.text).not.toContain('Other Interaction');
    });
  });
});