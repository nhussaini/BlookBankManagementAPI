import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import cors from 'cors';
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

// Enable CORS for all origins and methods
app.use(cors());

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
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
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

//Insret new blood donation
app.post('/donate', async (req: Request, res: Response) => {
  const { hospital, type, location, donator } = req.body;
  // Generate a random number greater than 20
  const id = Math.floor(Math.random() * 80) + 21;
  //current date
  const currentDate = new Date();
  //expiry date
  // Add 22 years to today's date
  const futureDate = new Date(
    currentDate.getFullYear() + 22,
    currentDate.getMonth(),
    currentDate.getDate()
  );
  // Format the future date as a string
  const formattedFutureDate = futureDate.toISOString();

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `INSERT INTO bloodbankmanagementapi_sql_user_nasrullah (id,hospital, date,blood_type,expiry,location, donator) VALUES ($1, $2, $3, $4,$5, $6,$7) RETURNING *`,
      [id, hospital, currentDate, type, formattedFutureDate, location, donator]
    );
    const insertedId = result.rows[0].id;

    res.status(200).send(insertedId.toString());
  } catch (err) {
    res.status(500).send('Internal Server Error');
  } finally {
    if (client) {
      // Ensure the client is released back to the pool even if an error occurs
      client.release();
    }
  }
});

//Delete a single Record
app.post('/delete-blood', async (req: Request, res: Response) => {
  // console.log('reached delete route');
  const id = parseInt(req.body.id);
  let client;
  //check if id is in req.body
  if (!id) {
    return res.status(400).json({ error: 'No Id was sent!' });
  }

  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');

    client = await pool.connect();
    //check if id exists
    const recordExists = await client.query(
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah WHERE id = ${id}`
    );
    if (recordExists.rows.length === 0) {
      return res.status(400).json({ error: "id doesn't exist!" });
    }

    const result = await client.query(
      `DELETE FROM bloodbankmanagementapi_sql_user_nasrullah WHERE id = $1 RETURNING *`,
      [id]
    );
    res.json({
      message: 'Blood record deleted successfully.',
      record: result.rows[0],
    });
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

//Delete expired Records
app.post('/clean-blood', async (req: Request, res: Response) => {
  let client;
  try {
    const expiryDate = req.body.expiry;
    console.log('req.body=>', req.body.expiry);
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');

    client = await pool.connect();

    const result = await client.query(
      `DELETE FROM bloodbankmanagementapi_sql_user_nasrullah WHERE date < $1 RETURNING *`,
      [expiryDate]
    );
    res.json({
      message: 'Expired record(s) deleted successfully.',
      record: result.rows,
    });
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
