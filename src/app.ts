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

interface BloodTypeDistribution {
  [bloodType: string]: number;
}

interface BloodInfo {
  total_blood: number;
  blood_per_type: BloodTypeDistribution;
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
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah WHERE date >= $1`,
      [time]
    );
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
  //keeping this interface just for reference
  // interface BloodInfo {
  //   total_blood: number;
  //   blood_per_type: {
  //     'O Positive': number;
  //     'O Negative': number;
  //     'A Positive': number;
  //     'A Negative': number;
  //     'B Positive': number;
  //     'B Negative': number;
  //     'AB Positive': number;
  //     'AB Negative': number;
  //   };
  // }
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah`
    );
    const totalBlood = result.rows.length;
    const bloodTypeDistribution: BloodTypeDistribution = {};
    result.rows.forEach((record: any) => {
      bloodTypeDistribution[record.blood_type] =
        (bloodTypeDistribution[record.blood_type] || 0) + 1;
    });
    const bloodPerType: BloodTypeDistribution = {
      'O Positive': bloodTypeDistribution['O Positive'] || 0,
      'O Negative': bloodTypeDistribution['O Negative'] || 0,
      'A Positive': bloodTypeDistribution['A Positive'] || 0,
      'A Negative': bloodTypeDistribution['A Negative'] || 0,
      'B Positive': bloodTypeDistribution['B Positive'] || 0,
      'B Negative': bloodTypeDistribution['B Negative'] || 0,
      'AB Positive': bloodTypeDistribution['AB Positive'] || 0,
      'AB Negative': bloodTypeDistribution['AB Negative'] || 0,
    };
    const bloodInfo: BloodInfo = {
      total_blood: totalBlood,
      blood_per_type: bloodPerType,
    };
    res.status(200).json(bloodInfo);
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

//POST endpoint to update  a single field in an existing blood bank record
app.post('/update-blood', async (req: Request, res: Response) => {
  const id = parseInt(req.body.id);
  const bodyKeys = Object.keys(req.body);
  const fieldToUpdate = bodyKeys[1];
  const value = req.body[fieldToUpdate];

  //check if id is in req.body
  if (!id) {
    return res.status(400).json({ error: 'No Id was sent!' });
  }
  let client;
  try {
    client = await pool.connect();
    //check if id exists
    const recordExists = await client.query(
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah WHERE id = ${id}`
    );
    if (recordExists.rows.length === 0) {
      return res.status(400).json({ error: "id doesn't exist!" });
    }
    // Update the record in the database
    const result = await pool.query(
      `UPDATE bloodbankmanagementapi_sql_user_nasrullah SET ${fieldToUpdate} = $1 WHERE id = $2 RETURNING *`,
      [value, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Blood bank record not found.' });
    }

    return res.json(
      // message: 'Blood bank record updated successfully.',
      result.rows[0]
    );
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
