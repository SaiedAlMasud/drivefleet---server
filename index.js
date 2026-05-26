const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId  } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;
const dotenv = require('dotenv');
dotenv.config();
console.log(__dirname);


const uri = `mongodb+srv://drivefleet:Drivefleet12345@cluster0.pktpfdw.mongodb.net/?appName=Cluster0`;

console.log("Connecting to MongoDB...");
console.log("Username:", process.env.USERNAME);
console.log("Password:", process.env.PASSWORD);
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("drivefleet");
    const carsCollection = db.collection("cars");

    app.get('/cars', async(req, res)=>{
      const cars = await carsCollection.find().toArray();
      res.send(cars);
    });

    app.get('/cars/:id',async (req,res)=>{
      const{id} = req.params;
      const car = await carsCollection.findOne({_id: new ObjectId(id)});
      res.send(car);
    });


    //console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }
  finally{
    
  }
}
run().catch(console.dir);
app.use(cors());


app.listen(port, () => {
  console.log('Server is running on http://localhost:' + port);
});