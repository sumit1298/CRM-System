const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');

describe('AI indexing API', () => {
  it('should index a user CRM dataset for retrieval', async () => {
    const user = await User.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.ai@example.com',
      password: 'password123',
      company: 'Acme',
    });

    await Lead.create({
      name: 'Acme Prospect',
      email: 'prospect@acme.com',
      company: 'Acme',
      status: 'Qualified',
      value: 12000,
      ownerId: user._id,
      notes: 'Customer wants the enterprise plan and needs onboarding support.',
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const res = await request(app)
      .post('/api/ai/index')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.indexed).toBeGreaterThanOrEqual(1);
    expect(res.body.data.status).toBe('ok');
  });
});
