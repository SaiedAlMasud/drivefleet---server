const express = require('express');

const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const dotenv = require('dotenv');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();

const uri = `mongodb+srv://drivefleet:Drivefleet12345@cluster0.pktpfdw.mongodb.net/?appName=Cluster0`;

console.log("Connecting to MongoDB...");

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
)

const varifyToken = async (req, res, next) => {
  const header = req?.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log("Token payload:", payload); // Debug log
    next();
  }
  catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
}

let carsCollection;
let bookingsCollection;

async function connectDB() {
  await client.connect();
  const db = client.db("drivefleet");
  carsCollection = db.collection("cars");
  bookingsCollection = db.collection("bookings");
  console.log("✅ MongoDB connected successfully!");

  const carCount = await carsCollection.countDocuments();
  console.log(`✅ Found ${carCount} cars in database`);

  const bookingCount = await bookingsCollection.countDocuments();
  console.log(`✅ Found ${bookingCount} bookings in database`);
}

connectDB().catch(console.error);

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());


// ============ CAR ROUTES ============

// Get all cars with search and filter (combined into one endpoint)
app.get('/cars', async (req, res) => {
  try {
    if (!carsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }

    const { search, type } = req.query;
    let query = {};

    // Search by car name using $regex (case-insensitive)
    if (search && search.trim() !== '') {
      query.carName = { $regex: search, $options: 'i' };
    }

    // Filter by car type
    if (type && type !== 'All Types') {
      query.carType = type;
    }

    console.log('Search query:', { search, type }); // Debug log
    console.log('MongoDB query:', query); // Debug log

    const cars = await carsCollection.find(query).toArray();
    res.json(cars);
  } catch (error) {
    console.error('Error fetching cars:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get car by ID
app.get('/cars/:id', async (req, res) => {
  const { id } = req.params;
  const car = await carsCollection.findOne({ _id: new ObjectId(id) });
  res.json(car);
});

// Add a new car
app.post('/cars',varifyToken, async (req, res) => {
  try {
    if (!carsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }

    const carData = req.body;
    const result = await carsCollection.insertOne(carData);

    res.status(201).json({
      message: 'Car added successfully',
      carId: result.insertedId
    });
  } catch (error) {
    console.error('Error adding car:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get cars by owner ID (my added cars)
app.get('/cars/my-cars/:userId',varifyToken, async (req, res) => {
  if (!carsCollection) {
    return res.status(500).json({ error: "Database not connected yet" });
  }
  const { userId } = req.params;
  const cars = await carsCollection.find({ 'owner.id': userId }).toArray();
  res.json(cars);
});

// Delete a car
app.delete('/cars/:id',varifyToken, async (req, res) => {
  try {
    if (!carsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }
    const { id } = req.params;
    const result = await carsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a car
app.put('/cars/:id', varifyToken, async (req, res) => {
  try {
    if (!carsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }
    const { id } = req.params;
    const updateData = req.body;
    const result = await carsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.json({ message: 'Car updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ BOOKING ROUTES ============

// Create a new booking
app.post('/api/bookings', varifyToken, async (req, res) => {
  try {
    if (!bookingsCollection || !carsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }

    const bookingData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await bookingsCollection.insertOne(bookingData);

    if (bookingData.carId) {
      await carsCollection.updateOne(
        { _id: new ObjectId(bookingData.carId) },
        { $inc: { bookingCount: 1 } }
      );
    }

    res.status(201).json({
      message: 'Booking created successfully',
      bookingId: result.insertedId
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user's bookings
app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    if (!bookingsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }

    const { userId } = req.params;
    const bookings = await bookingsCollection
      .find({ userId: userId })
      .sort({ bookingDate: -1 })
      .toArray();
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all bookings (admin)
app.get('/api/bookings', async (req, res) => {
  try {
    if (!bookingsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }

    const bookings = await bookingsCollection
      .find()
      .sort({ bookingDate: -1 })
      .toArray();
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single booking by ID
app.get('/api/bookings/:id', async (req, res) => {
  try {
    if (!bookingsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }

    const { id } = req.params;
    const booking = await bookingsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update booking status
app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    if (!bookingsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ message: 'Booking status updated' });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: error.message });
  }
});

// Cancel booking (delete)
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    if (!bookingsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }

    const { id } = req.params;
    const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});