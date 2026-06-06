const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const dotenv = require('dotenv');
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

app.use(cors());
app.use(express.json());

// ============ CAR ROUTES ============

// Get all cars
app.get('/cars', async (req, res) => {
  if (!carsCollection) {
    return res.status(500).json({ error: "Database not connected yet" });
  }
  const cars = await carsCollection.find().toArray();
  res.json(cars);
});

// Get car by ID
app.get('/cars/:id', async (req, res) => {
  const { id } = req.params; 
  const car = await carsCollection.findOne({ _id: new ObjectId(id) }); 
  res.json(car);
});



// ============ BOOKING ROUTES ============

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    if (!bookingsCollection) {
      return res.status(500).json({ error: "Database not connected yet" });
    }
    
    const bookingData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await bookingsCollection.insertOne(bookingData);
    
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