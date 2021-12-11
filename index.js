const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const ObjectId = require("mongodb").ObjectId;
const { ObjectID } = require('bson');
// Load in the .env file
require('dotenv').config();


//Create the mongo client to use
const client = new MongoClient(process.env.FINAL_URL);

const app = express();
const port = process.env.PORT;

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


//Root route
app.get('/', (req, res) => {
    res.status(300).redirect('/info.html');
});

// limited time only, you shouldn't be able to get all peoples liked games this easy
// Return all likes and shelfs
app.get('/userData', async (req, res) =>{

    try{
        //connect to the db
        await client.connect();

        //retrieve the boardgame collection data
        const colli = client.db('gameheaven').collection('likesAndShelf');
        const alldata = await colli.find({}).toArray();

        //Send back the data with the response
        res.status(200).send(alldata);
    }catch(error){
        console.log(error);
        res.status(500).send({
            error: 'Something went wrong!',
            value: error
        });
    }finally {
        await client.close();
    }
});

// Get all liked games of a certain user
// /likes?userId=?
app.get('/likes', async (req, res) => {
    //id is located in the query: req.query.id
    try{
        //connect to the db 
        await client.connect();

        //retrieve the boardgame collection data
        const colli = client.db('gameheaven').collection('likesAndShelf');

        //only look for a bg with this ID
        const query = { userId: req.query.userId, liked: true };

        const bg = await colli.find(query).toArray();

        if(bg){
            //Send back the file
            res.status(200).send(bg);
            return;
        }else{
            res.status(400).send('Boardgame could not be found with id: ' + req.query.userId);
        }
      
    }catch(error){
        console.log(error);
        res.status(500).send({
            error: 'Something went wrong',
            value: error
        });
    }finally {
        await client.close();
    }
});

// check if a game is liked by the user
// /likes/boardgame
app.get('/likes/boardgame', async (req, res) => {
    //id is located in the query: req.query.userId
    if(!req.body.userId || !req.body.gameId){
        res.status(400).send('Bad request: userId, gameId');
        return;
    }
    try{
        //connect to the db 
        await client.connect();

        //retrieve the boardgame collection data
        const colli = client.db('gameheaven').collection('likesAndShelf');

        // look for game by id and if it is of the user
        const query = { userId: req.body.userId, gameId: req.body.gameId };

        const bg = await colli.find(query).toArray();

        if(bg){
            //Send back the file
            res.status(200).send(bg);
            return;
        }else{
            res.status(400).send('Boardgame is not previous liked or shelved with by user');
        }
      
    }catch(error){
        console.log(error);
        res.status(500).send({
            error: 'Something went wrong',
            value: error
        });
    }finally {
        await client.close();
    }
}); // Only working on postman if I send raw JSON

// save a boardgame if not already in likesAndSaves 
app.post('/like', async (req, res) => {

    if(!req.body.userId || !req.body.gameId){
        res.status(400).send('Bad request: userId, gameId');
        return;
    }

    try{
        //connect to the db
        await client.connect();

        //retrieve the boardgame collection data
        const colli = client.db('gameheaven').collection('likesAndShelf');

        // Validation for double boardgames
        const bg = await colli.findOne({ userId: req.body.userId, gameId: req.body.gameId });
        if(bg){
            res.status(400).send('Bad request: boardgame already exists with gameId ' + req.body.gameId);
            return;
        } 
        // Create the new boardgame object
        let likeBoardgame = {
            userId: req.body.userId,
            gameId: req.body.gameId,
            liked: true,
            shelf: false
        }
        
        // Insert into the database
        let insertResult = await colli.insertOne(likeBoardgame);

        //Send back successmessage
        res.status(201).send(`Boardgame succesfully saved with id ${req.body.gameId}`);
        return;
    }catch(error){
        console.log(error);
        res.status(500).send({
            error: 'Something went wrong',
            value: error
        });
    }finally {
        await client.close();
    }
});

// /like change values
app.put("/like", async (req, res) => {
// Validation
    if (
        !req.body.userId ||
        !req.body.gameId
        ) {
        res
            .status(400)
            .send("Bad request: userId, gameId");
        return;
        }
        try {
        // Connect to the database
        await client.connect();

        // Retrieve the challenges collection data
        const colli = client.db("gameheaven").collection("likesAndShelf");

        // Get data of currrent selected game
        const current = Object(await colli.findOne({ userId: req.body.userId, gameId: req.body.gameId }));
        // const current = Object(currentValues);

        // Create a query for a challenge to update
        const query = { _id: ObjectId(current._id) };

        // This option instructs the method to create a document if no documents match the filter
        const options = { upsert: false };

        // Create a document that sets the plot of the movie
        const updatelike = {
            $set: {liked: !current.liked}            
        };

        // Updating the challenge

        const result = await colli.updateOne(query, updatelike, options);

        // Send back success message
        res
            .status(201)
            .send(`Challenge with id "${req.body.gameId}" successfully updated.`);
    } catch (error) {
        console.log(error);
        res.status(500).send({
            error: "something went wrong",
            value: error,
    });
    } finally {
    await client.close();
    }
});

app.listen(port, () => {
    console.log(`API is running at http://localhost:${port}`);
});