const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors')
require('dotenv').config()

app.use(express.json())
app.use(cors())


app.get('/', (req, res) => {
    res.send('Hello World!')
})
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gyzdq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });





// Replace the uri string with your MongoDB deployment's connection string.


async function run() {
    try {
        await client.connect();
        const partsCollection = client.db("autoMart").collection("parts");
        const ordersCollection = client.db("autoMart").collection("orders");

        //get all parts 
        app.get('/parts', async (req, res) => {
            const query = {}
            const cursor = partsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)

        })

        //get specific part with id
        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await partsCollection.findOne(query);
            res.send(result)
        })

        //post order
        app.post('/orders', async (req, res) => {
            const order = req.body;
            // const id = order.orderedId;
            // const orderedQuantity = order.quantity;
            // const orderedProduct = await partsCollection.findOne({ _id: ObjectId(id) })
            // const filter = { _id: ObjectId(id) }
            // const newQuantity = parseInt(orderedProduct.available) - parseInt(orderedQuantity)
            // console.log(newQuantity);
            // const options = { upsert: true }
            // const updateDoc = {
            //     $set: {
            //         available: newQuantity
            //     }
            // };
            // const result = await ordersCollection.updateOne(filter, updateDoc, options)
            const orderComplete = await ordersCollection.insertOne(order)
            res.send(orderComplete)
        })
        app.get('/orders', async (req, res) => {
            const result = await ordersCollection.find({}).toArray()
            res.send(result)
        })
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})