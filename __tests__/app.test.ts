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
});

describe('GET /get-blood/hospital/:hospital', () => {
  it('should retrieve blood records for a valid hospital', async () => {
    const response = await request(app).get(
      '/get-blood/hospital/Royal%20Infirmary'
    );
    expect(response.status).toBe(200);
    // console.log('response=>', response.body);
    expect(response.body[0].hospital).toBe('Royal Infirmary');
  });

  it('should return 400 if hospital record not found', async () => {
    const response = await request(app).get(
      '/get-blood/hospital/Nonexistent%20Hospital'
    );
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'hospital record not found' });
  });
});

describe('GET /get-blood/time/:time', () => {
  it('should return blood records for a valid time', async () => {
    const response = await request(app).get(
      '/get-blood/time/2022-09-28T12:14:19.000Z'
    );

    expect(response.status).toBe(200);
    expect(response.body[0]).toHaveProperty('date');
    expect(response.body.length).toBeGreaterThan(1);
    // Additional assertions for other properties of blood records can be added similarly
  });
});

describe('GET /info', () => {
  it('should return blood information with status 200', async () => {
    const response = await request(app).get('/info');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total_blood');
    expect(response.body.total_blood).toBeGreaterThanOrEqual(0); // Ensure total blood is non-negative
    expect(response.body).toHaveProperty('blood_per_type');
    expect(Object.keys(response.body.blood_per_type)).toHaveLength(8); // Ensure all blood types are present
  });
});
