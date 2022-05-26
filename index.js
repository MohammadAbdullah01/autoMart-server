const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken');

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(express.json())
app.use(cors())


app.get('/', (req, res) => {
    res.send('Hello World!')
})
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gyzdq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "unauthorized" })
    }
    const token = authHeader.split(" ")[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "forbidden" })
        }
        req.decoded = decoded;
        next()
    });
}



async function run() {
    try {
        await client.connect();
        const partsCollection = client.db("autoMart").collection("parts");
        const ordersCollection = client.db("autoMart").collection("orders");
        const usersCollection = client.db("autoMart").collection("users");
        const reviewsCollection = client.db("autoMart").collection("reviews");
        const paymentCollection = client.db("autoMart").collection("payments");

        //middleware for verifying current user admin or not
        const checkAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterInfo = await usersCollection.findOne({ user: requester });
            const isAdmin = requesterInfo?.role === "admin"
            if (isAdmin) {
                next()
            }
            else {
                return res.send({ message: "failed" })
            }
        }

        //return only FALSE || TRUE current user admin or not
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ user: email })
            const isAdmin = user.role === "admin"
            res.send({ admin: isAdmin })
        })

        //payment system
        app.post("/create-payment-intent", verifyJwt, async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        });


        app.patch('/booking/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                    status: "pending"
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await ordersCollection.updateOne(filter, updatedDoc);
            res.send(updatedBooking);
        })



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
        //get specific order with id
        app.get('/order/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.findOne(query);
            res.send(result)
        })

        //post order
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const orderComplete = await ordersCollection.insertOne(order)
            res.send(orderComplete)
        })

        //get all orders
        app.get('/orders', async (req, res) => {
            const result = await ordersCollection.find().toArray()
            res.send(result)
        })

        //get only now users orders;

        app.get('/orders/:email', verifyJwt, async (req, res) => {
            const tokenEmail = req.decoded;
            const email = req.params.email;
            if (tokenEmail.email === email) {
                const query = { email: email }
                const result = await ordersCollection.find(query).toArray()
                return res.send(result)
            }
            else {
                return res.status(403).send({ message: "forbidden" })
            }

        })

        //delte one order with id
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(query);
            res.send(result)
        })

        app.put('/ship/:id', async (req, res) => {
            const status = req.body;
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: status.status
                }
            }
            const updateOrders = await ordersCollection.updateOne(filter, updateDoc, options)
            res.send({ m: "success" })
        })
        app.delete('/ship/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query)
            res.send(result)

        })

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { user: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    user: email
                }
            }
            const updateUser = await usersCollection.updateOne(filter, updateDoc, options)
            var token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN);
            res.send({ accessToken: token })
        })

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review)
            res.send(result)
        })
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { user: email }
            const result = await usersCollection.findOne(query)
            res.send(result)
        })

        app.put('/updateuser/:user', async (req, res) => {
            const user = req.params.user;
            const updatedUser = req.body;
            console.log(user, updatedUser);
            const filter = { user: user };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updatedUser.name,
                    address: updatedUser.address,
                    phone: updatedUser.phone,
                    linkedin: updatedUser.linkedin,
                    education: updatedUser.education
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })
        app.get('/reviews', async (req, res) => {
            const query = {}
            const result = await reviewsCollection.find(query).toArray()
            res.send(result)
        })

        //get all user
        app.get('/users', verifyJwt, async (req, res) => {
            const query = {}
            const cursor = usersCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        //make a user admin
        app.put('/user/admin/:user', verifyJwt, checkAdmin, async (req, res) => {
            const user = req.params.user;
            const filter = { user: user };
            const updateDoc = {
                $set: { role: "admin" },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            return res.send(result)

        })
        //create one product
        app.post('/parts', async (req, res) => {
            const part = req.body;
            const result = partsCollection.insertOne(part)
            res.send(result)
        })

        //delete one product
        app.delete('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partsCollection.deleteOne(query)
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