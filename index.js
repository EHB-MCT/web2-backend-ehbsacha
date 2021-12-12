// ------------------------------------------- //
// getting required files                      //
// setup of the required files and the project //
// ------------------------------------------- //

const express = require('express'); // require express
const bodyParser = require('body-parser'); // require body-parser
const { MongoClient } = require('mongodb'); // require mongodb
const ObjectId = require('mongodb').ObjectId; // require mogodb subcategory to read mongo special ObjectIds
const cors = require('cors'); // require cors so the frontend won't have problems with this policy
const passwordHash = require('password-hash'); // require password-hash to hash passwords

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
app.get('/allLikesAndShelfs', async (req, res) =>{
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

// Deleting a likeAndShelf
app.delete('/delete', async (req, res) => { // Delete a likesAndShelf item
    try {
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Get data of currrent selected game
        const current = Object(await colli.findOne({ userId: req.body.userId, gameId: req.body.gameId })); // Find current status of game

        // delete data
        const query = { _id: ObjectId(current._id) }; // Id of the object that needs to be changed
        const result = await colli.deleteOne(query); // Deleting the challenge
        if (result.deletedCount === 1) { // Check if something got removed
            res.status(200).send(`Game with id ${req.body.gameId} successfully deleted.`); // The succes message
        } else {
            res.status(404).send(`No documents matched the query. Deleted 0 documents.`); // The fail message
        }

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
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Select the right data
        const query = { userId: req.body.userId, liked: true }; // Query to look for all items liked by the user
        const likedgames = await colli.find(query).toArray(); // Retrieve data filtered by query

        // Send back the data
        if(likedgames){ // if not empty
            res.status(200).send(likedgames); // Send back the data with the response
            return; // Return
        }else{
            res.status(400).send('Boardgame could not be found with id: ' + req.body.userId); // If empty send error
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
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Select the right data
        const query = { userId: req.body.userId, gameId: req.body.gameId }; // Query to look if game is put in database before
        const exist = await colli.find(query).toArray(); // Retrieve data filtered by query

        // Send back the data
        if(exist){ // if not empty
            res.status(200).send(exist); // Send back the data with the response
            return; // Return
        }else{
            res.status(400).send('Boardgame could not be found with id: ' + req.body.userId); // If empty send error
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
        await client.connect(); // Connect to the db 
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
app.put('/like', async (req, res) => { // Change the liked state of a game for the user
    // Validation
    if(!req.body.userId || !req.body.gameId){ // Checks if the required userId and gameId are send
        res.status(400).send('Bad request: Missing userId, gameId'); // Sends back error if they are not send
        return; // return
    }

    try {
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Get data of currrent selected game
        const current = Object(await colli.findOne({ userId: req.body.userId, gameId: req.body.gameId })); // Find current status of game

        // Change data
        const query = { _id: ObjectId(current._id) }; // Id of the object that needs to be changed
        const liked = { $set: {liked: !current.liked} }; // Only change the liked status of the object
        const options = { upsert: false }; // If it doesn't exist don't create it, it will only have the liked status and noting else
        await colli.updateOne(query, liked, options);// Updating the challenge

        // Send back success message
        res.status(201).send(`Liked status of game with id ${req.body.gameId} successfully updated.`); // The succes message

    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});


// ------------------ //
// setup shelf routes //
// ------------------ //

// /shelved?userId=?
app.get('/shelved', async (req, res) => { // Get all shelved games of a certain user
    try{
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Select the right data
        const query = { userId: req.body.userId, shelf: true }; // Query to look for all items shelved by the user
        const shelvedgames = await colli.find(query).toArray(); // Retrieve data filtered by query

        // Send back the data
        if(shelvedgames){ // if not empty
            res.status(200).send(shelvedgames); // Send back the data with the response
            return; // Return
        }else{
            res.status(400).send('Boardgame could not be found with id: ' + req.body.userId); // If empty send error
        }
      
    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});

// GET /shelf
app.get('/shelf', async (req, res) => { // Check if a game is put in database before
    // Validation
    if(!req.body.userId || !req.body.gameId){ // Checks if the required userId and gameId are send
        res.status(400).send('Bad request: Missing userId, gameId'); // Sends back error if they are not send
        return; // return
    }

    try{
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Select the right data
        const query = { userId: req.body.userId, gameId: req.body.gameId }; // Query to look if game is put in database before
        const exist = await colli.find(query).toArray(); // Retrieve data filtered by query

        // Send back the data
        if(exist){ // if not empty
            res.status(200).send(exist); // Send back the data with the response
            return; // Return
        }else{
            res.status(400).send('Boardgame could not be found with id: ' + req.body.userId); // If empty send error
        }
      
    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});

// POST /shelf
app.post('/shelf', async (req, res) => { // Save a boardgame if not already in likesAndSaves 
    // Validation
    if(!req.body.userId || !req.body.gameId){ // Checks if the required userId and gameId are send
        res.status(400).send('Bad request: Missing userId, gameId'); // Sends back error if they are not send
        return; // return
    }

    try{
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Validation for double boardgames
        const exist = await colli.findOne({ userId: req.body.userId, gameId: req.body.gameId }); // Find if game exists
        if(exist){ // Checks existance
            res.status(400).send('Bad request: boardgame already exists with gameId ' + req.body.gameId); // Error message if the game already exists for user
            return; // Return
        } 

        // Create the new boardgame object
        let shelfBoardgame = {
            userId: req.body.userId, // Using userId
            gameId: req.body.gameId, // Using gameId
            liked: false, // we create for the shelf at the moment so liked keeps on false
            shelf: true // Set state to liked
        }

        // Insert into the database
        await colli.insertOne(shelfBoardgame);

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

// PUT /shelf
app.put('/shelf', async (req, res) => { // Change the shelved state of a game for the user
    // Validation
    if(!req.body.userId || !req.body.gameId){ // Checks if the required userId and gameId are send
        res.status(400).send('Bad request: Missing userId, gameId'); // Sends back error if they are not send
        return; // return
    }

    try {
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('likesAndShelf'); // Create connection route / Select collection

        // Get data of currrent selected game and if it exists
        const current = Object(await colli.findOne({ userId: req.body.userId, gameId: req.body.gameId })); // Find current status of game

        // Change data
        const query = { _id: ObjectId(current._id) }; // Id of the object that needs to be changed
        const liked = { $set: {shelf: !current.shelf} }; // Only change the shelved status of the object
        const options = { upsert: false }; // If it doesn't exist don't create it, it will only have the shelved status and noting else
        await colli.updateOne(query, liked, options);// Updating the challenge

        // Send back success message
        res.status(201).send(`shelved status of game with id ${req.body.gameId} successfully updated.`); // The succes message

    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});


// ----------------- //
// Setup user routes //
// ----------------- //

// limited time only, you shouldn't be able to get all users data this easy
// /allUsers
app.get('/allUsers', async (req, res) =>{
    try{
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('users'); // Create connection route / Select collection

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

// POST /user
app.post('/user', async (req, res) => { // Save user if not already in users 
    // Validation
    if(!req.body.name || !req.body.password || !req.body.email){ // Checks if the required name, password and email are send
        res.status(400).send('Bad request: Missing name, password, email'); // Sends back error if they are not send
        return; // return
    }

    try{
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('users'); // Create connection route / Select collection

        // Validation for double usernames
        const exist = await colli.findOne({ name: req.body.name}); // Find if username already exists
        if(exist){ // Checks existance
            res.status(400).send(`Bad request: The name > ${req.body.name} < is already taken`); // Error message if username is already taken
            return; // Return
        } 

        // Create the new user object
        let newUser = {
            name: req.body.name, // Using name
            password: passwordHash.generate(req.body.password), // Using password
            email: req.body.email // Using email
        }

        // Insert into the database
        await colli.insertOne(newUser);

        // Send back successmessage
        res.status(201).send(`User succesfully saved with name ${req.body.name}`); // The succes message
        return; // Return

    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});

// GET /user
app.get('/user', async (req, res) => { // Check if a game is put in database before
    // Validation
    if(!req.body.name || !req.body.password){ // Checks if the required name and password are send
        res.status(400).send('Bad request: Missing name, password'); // Sends back error if they are not send
        return; // return
    }

    try{
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('users'); // Create connection route / Select collection

        // Get data of selected name
        const compare = Object(await colli.findOne({ name: req.body.name})); // Find current status of profile for hashCheck
        var checkHash = passwordHash.verify(req.body.password, compare.password); // Do the hashCheck
        if(checkHash == true){
            // Select the user data of this profile
            const query = { name: req.body.name}; // Query to look if game is put in database before
            const correct = await colli.find(query).toArray(); // Retrieve data filtered by query

            // Send back the data
            if(correct){ // if not empty
                res.status(200).send(correct); // Send back the data with the response
                return; // Return
            }else{
                res.status(400).send('User could not be found with name: ' + req.body.name); // If empty send error
            }
        }else{
            res.status(400).send(`Password doesn't match user with username ${req.body.name}`); // If empty send error
        }
        
      
    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});

// PUT /user/name
app.put('/user/name', async (req, res) => { // Change the name of a user
    // Validation
    if(!req.body.name || !req.body.password || !req.body.newName){ // Checks if the required name, password and newName are send
        res.status(400).send('Bad request: Missing name, password, newName'); // Sends back error if they are not send
        return; // return
    }

    try {
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('users'); // Create connection route / Select collection

        // Validation for double usernames
        const exist = await colli.findOne({ name: req.body.newName}); // Find if username already exists
        if(exist){ // Checks existance
            res.status(400).send('Bad request: The name > ' + req.body.newName + ' < is already taken'); // Error message if username is already taken
            return; // Return
        }

        // redo a login before being able to edit a profile
        // Get data of selected name
        const compare = Object(await colli.findOne({ name: req.body.name})); // Find current status of profile
        var checkHash = passwordHash.verify(req.body.password, compare.password); // Do the hashCheck
        if(checkHash == true){ // If hash comes out succesfully change password
            // Change data
            const query = { _id: ObjectId(compare._id) }; // Id of the object that needs to be changed
            const changeName = { $set: {name: req.body.newName} }; // Only change the name of the object
            const options = { upsert: false }; // If it doesn't exist don't create it, it will only have a name
            await colli.updateOne(query, changeName, options);// Updating the challenge
            
            // Send back success message
            res.status(201).send(`Username has succesfully updated from ${req.body.name} to ${req.body.newName}`); // The succes message
        }else{
            res.status(400).send(`Password doesn't match user with username ${req.body.name}`); // If empty send error
        }

    }catch(error){ // A error catch
        console.log(error); // Log the error
        res.status(500).send({ error: 'Something went wrong!', value: error }); // Send back that there has been an error

    }finally { // At the end
        await client.close(); // close the database connection
    }
});

// PUT /user/password
app.put('/user/password', async (req, res) => { // Change the name of a user
    // Validation
    if(!req.body.name || !req.body.password || !req.body.newPassword){ // Checks if the required name, password and newPassword are send
        res.status(400).send('Bad request: Missing name, password, newPassword'); // Sends back error if they are not send
        return; // return
    }

    try {
        // Database
        await client.connect(); // Connect to the db 
        const colli = client.db('gameheaven').collection('users'); // Create connection route / Select collection

        // redo a login before being able to edit a profile
        // Get data of selected name
        const compare = Object(await colli.findOne({ name: req.body.name})); // Find current status of profile
        var checkHash = passwordHash.verify(req.body.password, compare.password); // Do the hashCheck
        if(checkHash == true){ // If hash comes out succesfully change password
            // Change data
            const query = { _id: ObjectId(compare._id) }; // Id of the object that needs to be changed
            const changeName = { $set: {password: passwordHash.generate(req.body.newPassword)} }; // Only change the name of the object
            const options = { upsert: false }; // If it doesn't exist don't create it, it will only have a name
            await colli.updateOne(query, changeName, options);// Updating the challenge
            
            // Send back success message
            res.status(201).send(`Password has succesfully been updated`); // The succes message
        }else{
            res.status(400).send(`Password doesn't match user with username ${req.body.name}`); // If empty send error
        }

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