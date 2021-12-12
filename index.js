// ------------------------------------------- //
// getting required files                      //
// setup of the required files and the project //
// ------------------------------------------- //

const express = require('express'); // require express
const bodyParser = require('body-parser'); // require body-parser
const { MongoClient } = require('mongodb'); // require mongodb
const ObjectId = require("mongodb").ObjectId; // require mogodb subcategory to read mongo special ObjectIds
const cors = require("cors"); // require cors so the frontend won't have problems with this policy

require('dotenv').config(); // via dotenv I can create the env file (not published btw) which I use for credentials and url

const client = new MongoClient(process.env.FINAL_URL); // setup mongo client
const app = express(); // setup const express
const port = process.env.PORT; // setup const port

app.use(express.static('public')); // create connection to public folder
app.use(bodyParser.json()); // JSON stringifier
app.use(cors()); // setup cors policy


// --------------------- //
// setting up the routes //
// --------------------- //

// Root route
app.get('/', (req, res) => { // If you don't type a route the root will redirect you to the info page
    res.status(300).redirect('/info.html'); // The redirection route
});

// limited time only, you shouldn't be able to get all peoples liked games this easy
// Return all likes and shelfs
app.get('/userData', async (req, res) =>{

    try{
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Select the right data
        const alldata = await colli.find({}).toArray(); // Retrieve all data no query

        // Send back the data
        res.status(200).send(alldata); // Send back the data with the response

    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});

// ----------------- //
// setup like routes //
// ----------------- //

// /likes?userId=?
app.get('/likes', async (req, res) => { // Get all liked games of a certain user
    try{
        // Database
        await client.connect(); //connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Select the right data
        const query = { userId: req.query.userId, liked: true }; // Query to look for all items liked by this user
        const likedgames = await colli.find(query).toArray(); // Retrieve data filtered by query

        // Send back the data
        if(likedgames){ // if not empty
            res.status(200).send(likedgames); // Send back the data with the response
            return; // Return
        }else{
            res.status(400).send('Boardgame could not be found with id: ' + req.query.userId); // If empty send error
        }
      
    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});

// GET /like
app.get('/like', async (req, res) => { // Check if a game is put in database before
    // Validation
    if(!req.body.userId || !req.body.gameId){ // Checks if the required userId and gameId are send
        res.status(400).send('Bad request: Missing userId, gameId'); // Sends back error if they are not send
        return; // return
    }

    try{
        // Database
        await client.connect(); //connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Select the right data
        const query = { userId: req.body.userId, gameId: req.body.gameId }; // Query to look if game is put in database before
        const exist = await colli.find(query).toArray(); // Retrieve data filtered by query

        // Send back the data
        if(exist){ // if not empty
            res.status(200).send(exist); // Send back the data with the response
            return; // Return
        }else{
            res.status(400).send('Boardgame could not be found with id: ' + req.query.userId); // If empty send error
        }
      
    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});

// POST /like
app.post('/like', async (req, res) => { // Save a boardgame if not already in likesAndSaves 
    // Validation
    if(!req.body.userId || !req.body.gameId){ // Checks if the required userId and gameId are send
        res.status(400).send('Bad request: Missing userId, gameId'); // Sends back error if they are not send
        return; // return
    }

    try{
        // Database
        await client.connect(); //connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Validation for double boardgames
        const exist = await colli.findOne({ userId: req.body.userId, gameId: req.body.gameId }); // Find if game exists
        if(exist){ // Checks existance
            res.status(400).send('Bad request: boardgame already exists with gameId ' + req.body.gameId); // Error message if the game already exists for user
            return; // Return
        } 

        // Create the new boardgame object
        let likeBoardgame = {
            userId: req.body.userId, // Using userId
            gameId: req.body.gameId, // Using gameId
            liked: true, // Set state to liked
            shelf: false // we create for the like at the moment so shelf keeps on false
        }

        // Insert into the database
        await colli.insertOne(likeBoardgame);

        // Send back successmessage
        res.status(201).send(`Boardgame succesfully saved with id ${req.body.gameId}`); // The succes message
        return; // Return

    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});

// PUT /like
app.put("/like", async (req, res) => { // Change the liked state of a game for the user
    // Validation
    if(!req.body.userId || !req.body.gameId){ // Checks if the required userId and gameId are send
        res.status(400).send('Bad request: Missing userId, gameId'); // Sends back error if they are not send
        return; // return
    }

    try {
        // Database
        await client.connect(); //connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Get data of currrent selected game and if it exists
        const current = Object(await colli.findOne({ userId: req.body.userId, gameId: req.body.gameId })); // Find current status of game
        if(current){ // Checks existance
            res.status(400).send('Bad request: No boardgame is found to change'); // Error message if there is no object to change
            return; // Return
        }

        // Change data
        const query = { _id: ObjectId(current._id) }; // Id of the object that needs to be changed
        const liked = { $set: {liked: !current.liked} }; // Only change the liked status of the object
        const options = { upsert: false }; // If it doesn't exist don't create it, it will only have the liked status and noting else
        await colli.updateOne(query, liked, options);// Updating the challenge

        // Send back success message
        res.status(201).send(`Challenge with id "${req.body.gameId}" successfully updated.`); // The succes message

    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});


// -------------- //
// Listen to port //
// -------------- //

// Listen to port
app.listen(port, () => { // Check when port opens
    console.log(`API is running at http://localhost:${port}`); // console log if API starts running
});