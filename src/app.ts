import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import dotenv from 'dotenv';

dotenv.config();

interface BloodRecord {
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
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah`
    );
    const bloodRecordsByTime: BloodRecord[] = [];
    result.rows.forEach((record: BloodRecord) => {
      const recordDate = new Date(record.date);
      const hour = recordDate.getUTCHours();
      const minute = recordDate.getUTCMinutes();
      const second = recordDate.getUTCSeconds();
      const recordTime = `${hour}:${minute}:${second}`;
      console.log('recordTime->', recordTime);
      if (recordTime === time) {
        bloodRecordsByTime.push(record);
      }
    });
    res.status(200).json(bloodRecordsByTime);
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

//Retrieve blood records by blood type
app.get('/get-blood/type/:type', async (req: Request, res: Response) => {
  const bloodType = req.params.type;
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah WHERE blood_type = $1`,
      [bloodType]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'hospital record not found' });
    }
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

//Retrieve blood records by blood type
app.get('/get-blood/type/:type', async (req: Request, res: Response) => {
  const bloodType = req.params.type;
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah WHERE blood_type = $1`,
      [bloodType]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'hospital record not found' });
    }
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

//to get aggregated information
app.get('/info', async (req: Request, res: Response) => {
  interface BloodInfo {
    total_blood: number;
    blood_per_type: {
      'O Positive': number;
      'O Negative': number;
      'A Positive': number;
      'A Negative': number;
      'B Positive': number;
      'B Negative': number;
      'AB Positive': number;
      'AB Negative': number;
    };
  }
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah`
    );
    const totalBlood = result.rows.length;
    const bloodPerType: BloodInfo['blood_per_type'] = {
      'O Positive': 0,
      'O Negative': 0,
      'A Positive': 0,
      'A Negative': 0,
      'B Positive': 0,
      'B Negative': 0,
      'AB Positive': 0,
      'AB Negative': 0,
    };
    const bloodTypeDistribution = result.rows.reduce((acc, record) => {
      acc[record.blood_type] = (acc[record.blood_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.keys(bloodPerType).forEach(
      (bloodType: keyof typeof bloodPerType) => {
        // if (bloodType in bloodPerType) {
        bloodPerType[bloodType] = bloodTypeDistribution[bloodType] || 0;
        // }
      }
    );
    res
      .status(200)
      .json({ total_blood: totalBlood, blood_per_type: bloodPerType });
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
