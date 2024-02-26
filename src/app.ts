import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import dotenv from 'dotenv';

dotenv.config();

interface bloodRecord {
  id: number;
  hospital: string;
  date: string;
  blood_type: string;
  expiry: string;
  location: string;
  donator: string;
}

// Parse connection string
const connectionString = process.env.DB_CONNECTION_STRING;
const config = parse(connectionString);

const pool = new Pool({
  ...config,
  port: parseInt(config.port as string), // Convert port to a number
  ssl: typeof config.ssl === 'string' ? true : config.ssl, // Set ssl to true if it's a string
});

const app = express();
app.use(express.json());

app.get('/', (_, res) => {
  res.status(200).send('Welcome to SkillReactor');
});

//Retrieve blood record by Id
app.get('/get-blood/id/:id', async (req: Request, res: Response) => {
  let client;
  try {
    const id = parseInt(req.params.id);
    client = await pool.connect();
    const result = await client.query(
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah WHERE id = ${id}`
    );

    //if id doesn't exist in db
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Blood record not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('Internal Server Error');
  } finally {
    if (client) {
      // Ensure the client is released back to the pool even if an error occurs
      client.release();
    }
  }
});

//Retrieve blood records by hospital
app.get(
  '/get-blood/hospital/:hospital',
  async (req: Request, res: Response) => {
    let client;
    try {
      const hospital = req.params.hospital;
      // console.log('hospital=>', hospital);
      client = await pool.connect();
      const result = await client.query(
        `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah WHERE hospital = $1`,
        [hospital]
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'hospital record not found' });
      }
      res.status(200).json(result.rows);
      // console.log('hospials=>', result.rows);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Internal Server Error');
    } finally {
      if (client) {
        // Ensure the client is released back to the pool even if an error occurs
        client.release();
      }
    }
  }
);
//Retrieve blood records by Time
app.get('/get-blood/time/:time', async (req: Request, res: Response) => {
  const time = req.params.time;
  // const date = new Date(time);
  // console.log('date===>', date);
  // console.log('time - >', time);
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah`
    );
    const bloodRecordsByTime = [];
    result.rows.forEach((record) => {
      console.log('date=>', record.date);
    });

    // if (result.rows.length === 0) {
    //   return res.status(400).json({ error: 'hospital record not found' });
    // }
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('Internal Server Error');
  } finally {
    if (client) {
      // Ensure the client is released back to the pool even if an error occurs
      client.release();
    }
  }
});

export default app;
