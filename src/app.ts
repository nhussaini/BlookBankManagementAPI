import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

//monogdb data Schema
const BloodSchema = new mongoose.Schema({
  // id: Number,
  hospital: String,
  date: String,
  blood_type: String,
  expiry: String,
  location: String,
  donator: String,
});

//mongodb data model
const BloodModel = mongoose.model(
  'bloods',
  BloodSchema,
  'bloodbankmanagementapi_mongo_user_nasrullah'
);

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

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

mongoose.connect(`${MONGODB_URI}`);
// Check MongoDB connection
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

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

//create emergency blood record
app.post('/emergency/create', async (req: Request, res: Response) => {
  const { location, type } = req.body;
  let client;
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');

    //validate if location or type is provided
    if (!location || !type) {
      return res
        .status(400)
        .json({ error: 'location or blood type not provided!' });
    }

    client = await pool.connect();
    // Retrieve the record with the closest expiry from the SQL blood database
    const result = await client.query(
      `SELECT * FROM bloodbankmanagementapi_sql_user_nasrullah WHERE location = $1 AND blood_type=$2 ORDER BY expiry ASC LIMIT 1`,
      [location, type]
    );
    const mappedRecord = {
      hospital: result.rows[0].hospital,
      date: new Date(result.rows[0].date).toISOString(), // Convert date to ISO 8601 format
      blood_type: type,
      expiry: new Date(result.rows[0].expiry).toISOString(), // Convert expiry date to ISO 8601 format
      location: location,
      donator: result.rows[0].donator,
    };
    // create a new emergency record
    const newEmergency = new BloodModel(mappedRecord);
    const savedEmergencyBlood = await newEmergency.save();
    // Return the new MongoDB object ID as a string
    const emergencyBloodId = savedEmergencyBlood._id.toString();

    // Delete the closest expiry record from the SQL blood database
    const deletedRecord = await client.query(
      `DELETE FROM bloodbankmanagementapi_sql_user_nasrullah WHERE id = $1 RETURNING *`,
      [result.rows[0].id]
    );
    console.log('Deleted Record=>', deletedRecord.rows);
    return res.status(200).send(emergencyBloodId);
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

app.get('/emergency/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const emergencyRecord = await BloodModel.findById(id);
    console.log('emergency record is=>', emergencyRecord);
    if (!emergencyRecord) {
      return res.status(400).json({ error: 'Emergency record not found' });
    }
    res.status(200).json(emergencyRecord);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

//Remove emergency from MongoDB upon Completion
app.post('/emergency/complete', async (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ msg: 'No Id was provided!' });
  }
  try {
    const removedRecord = await BloodModel.findByIdAndDelete(id);
    res
      .status(200)
      .json({ msg: 'record successfully deleted!', record: removedRecord });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

//Remove emergency from MongoDB upon cancellation and add it to postgres
app.post('/emergency/cancel', async (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ msg: 'No Id was provided!' });
  }
  let client;
  try {
    const removedRecord = await BloodModel.findByIdAndDelete(id);
    client = await pool.connect();
    const idToInsert = Math.floor(Math.random() * 80) + 21;
    const { hospital, date, blood_type, expiry, location, donator } =
      removedRecord;

    const result = await client.query(
      `INSERT INTO bloodbankmanagementapi_sql_user_nasrullah (id,hospital, date,blood_type,expiry,location, donator) VALUES ($1, $2, $3, $4,$5, $6,$7) RETURNING *`,
      [idToInsert, hospital, date, blood_type, expiry, location, donator]
    );
    const insertedId = result.rows[0].id;

    return res.status(200).send(insertedId.toString());
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Internal Server Error');
  } finally {
    if (client) {
      // Ensure the client is released back to the pool even if an error occurs
      client.release();
    }
  }
});

export default app;
