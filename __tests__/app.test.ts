import request from 'supertest';

import app from '../src/app';

describe('Test app.ts', () => {
  test('Get response is correct', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('Welcome to SkillReactor');
  });
});

describe('GET /get-blood/id/:id', () => {
  it('should retrieve a valid blood record by ID', async () => {
    const response = await request(app).get('/get-blood/id/1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.id).toEqual(1);
  });

  it('should return 400 if blood record not found', async () => {
    const response = await request(app).get('/get-blood/id/999');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Blood record not found' });
  });

  it('should return 500 if server error occurs', async () => {
    // Spy on the route handler to replace it temporarily
    const originalHandler = jest.spyOn(app, 'get-blood/id/:id');
    originalHandler.mockImplementation(async () => {
      throw new Error('Server error');
    });

    const response = await request(app).get('/get-blood/id/1');
    expect(response.status).toBe(500);

    // Restore the original route handler
    originalHandler.mockRestore();
  });
});
