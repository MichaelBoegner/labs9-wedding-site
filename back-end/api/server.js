const express = require('express');
const cors = require('cors');
const server = express();
const knex = require('knex');
const KnexConfig = require('../knexfile');
const db = knex(KnexConfig.development);
const faker = require('faker');
const passport = require('passport');
const cookieSession = require('cookie-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const keys = require('../config/keys');
const stripe = require("stripe")("sk_test_4eC39HqLyjWDarjtT1zdp7dc");

require('dotenv').config();

//const sendSMS = require('./send_sms');



// restrict cors access to our netlify
const corsOptions = {
    origin: ["http://localhost:3000","https://www.vbeloved.com"]
  };

server.use(express.json());
server.use(cors(corsOptions));
//server.use('/sms', sendSMS); //endpoint to send a text message


//COOKIES
server.use(cookieSession({
    maxAge: '1hr',
    secret: 'hello.dello'
}))

//--BEGIN::PASSPORT DECLARATIONS

//PASSPORT INITIALIZATION
server.use(passport.initialize())
server.use(passport.session())

//SERIALIZE&DESERIALIZE USER
passport.serializeUser((userID, done)=>{ //this will take a user object from the database. 
    console.log("SERIALIZE-USER:", userID)
    done(null, userID) //this should grab one piece of unique data from the user obj to be encrypted and add it to a cookie. 
});

passport.deserializeUser((id, done)=>{
    console.log('DESERIALIZE-ID:',id)
    done(null, id)
});


//GOOGLE PASSPORT STRATEGY

passport.use(new GoogleStrategy({
    callbackURL: 'https://vbeloved.now.sh/google/redirect',
    clientID: `${keys.google.clientId}`,
    clientSecret: keys.google.clientSecret,
    scope: ['profile']
},
(accessToken, refreshToken, profile, done)=>{
    console.log('PROFILE-STRATEGY:', profile)
    db('oauth_ids').where({oauth_id: profile.id }).first()
.then(user => { 
    if(user){ console.log('find user success')
        done(null, user)
    }
    else{
        console.log('User Not In DB')
        done(null, profile)
        /* db('user').insert({first_name: profile.name.givenName, last_name: profile.name.familyName})
        .then(newUser =>{ console.log('add new user success', newUser)
            done(null, newUser )
        }).catch(err => console.log('insertUserError', err))   */
    }
}).catch(err => { console.log('find user error', err)})
                    
}
))

//GOOGLE AUTHENTICATE
server.get('/signin/google', passport.authenticate('google', {scope: ['profile']}))

server.get('/google/redirect', passport.authenticate('google'), (req, res) => {
    
    console.log('REDIRECT SUCCESS-REQCOOKIES:', req.cookies);
    console.log('REDIRECT SUCCESS-PASSPORTREQ:', req._passport.session.user);
    
    
            res.cookie('userID', req._passport.session.user.id);  
    res.redirect('http://localhost:3000/vb/dashboard');
  
})
//--- END:PASSPORT DECLARATIONS

const generateToken = (user) =>{
    const payload = {
            email: user.email
        }
    const options = {
        expiresIn: '20m'
    }
    
    return jwt.sign(payload, jwtSecret, options)

}


//REGULAR ENDPOINTS BEGINNING

server.get('/', (req, res)=>{
    console.log('Root hit.')
    res.json(`Server root.`)
})

server.post('/signin/google', async (req, res)=>{
 
    let {first_name, last_name, p_firstname, p_lastname, event_date, event_address} = req.body;

    try{
            //design template must be added later
            const wedding_id = await db.table('weddings').insert({event_date, event_address}); 
                console.log('weddingID:', wedding_id) 
            
            /* const user1 = await db.table('user').insert({first_name, last_name, wedding_id}) //email must be added in OAuth
            const user2 = await db.table('user').insert({first_name: p_firstname, last_name: p_lastname, wedding_id})
                console.log('user1:', user1)
            
            const coupleID1 = await db.table('couples').insert({user_id: user1, dashboard_access: true})
            const coupleID2 = await db.table('couples').insert({user_id: user2, dashboard_access: true})
                console.log('coupleID:', coupleID1) */

            res.status(200).json({id: wedding_id})

    }
    catch(err){
            res.status(500).json(err)
    } 


    
    
})

server.post('/loaduser',  async (req,res) =>{
    let {first_name, last_name, p_firstname, p_lastname, event_date, event_address, oauth_id, wedding_id} = req.body;
    
    try{
        const userExists = await db.table('oauth_ids').where({oauth_id}).first()
        const allusers = await db.table('user');
        console.log("allusers:",allusers)
        if(!userExists){ 
            console.log('NOUSER')
            const user1 = await db('user').insert({first_name, last_name, wedding_id}) //email must be added in OAuth
            const user2 = await db('user').insert({first_name: p_firstname, last_name: p_lastname, wedding_id})
            console.log('user',user1,user2)
            const oauth = await db('oauth_ids').insert({oauth_id, user_id: user1[0]})        
                
            const coupleID1 = await db('couples').insert({user_id: user1[0], dashboard_access: true})
            const coupleID2 = await db('couples').insert({user_id: user2[0], dashboard_access: true})
            console.log('C',coupleID1,coupleID2)
            let couple = await db('user').join('couples', {'users.id': 'couples.user_id'}).where({wedding_id});
            let guests = await db('user').where({wedding_id, guest: true});
            console.log('CG',couple,guests)
            res.status(200).json({
                couple,
                guests
            })

        }

        else {
            console.log('else')
            let couple = await db('user').join('couples', {'users.id': 'couples.user_id'}).where({wedding_id});
            let guests = await db('user').where({wedding_id, guest: true});
           /*  let attending = await db('user').join('answers', {'users.id': 'answers.guest_id'}).where({wedding_id, guest: true, attending});
            let notAttending = 
            let maybe = */ 
            console.log('CG',couple,guests)
            res.status(200).json({
                couple,
                guests
            })
        }
            
    }
    catch(err){
        console.log(err)
        res.json(err)
    }
  
})


//RETURNS ALL USER DATA IN THE DATABASE
server.get('/users', async (req, res) => {

    try {

        const users = await db('user');
        if (users) {
            res.status(200).json(users)
        }

    }

    catch (err) {
        res.status(500).json({ message: 'An error occured while retrieving the data.', err })
    }
});


//TAKES ENTERED USER INFORMATION AND SAVES THEM TO DATABASE; CURRENT ONLY ACCEPTS OBJECTS FORMATTED AS FOLLOWS: {firstname: 'data', lastname: 'data'}

server.post('/registration', async (req,res)=>{
    const {
        firstname, lastname,      // add to user and couples
        p_firstName, p_lastName,  // add to user and couples
        event_date, event_address  // add to weddings
        } = req.body;
    
    try {
        const weddingID = await db.table('weddings').insert({event_date, event_address})
        const userID1 = await db.table('user').insert({firstname, lastname })
    } 
    
    catch (err) {
        
    }

    db.table('user').insert(newUser).then(user => {
        res.status(200).json({ message: 'User Successfully Registered' })
    }).catch(err => {
        res.status(500).json({ message: "An error occured while processing data." })
    })

})


//A FUNCTION TO POPULATE THE DATABASE WITH COUPLES DUMMY DATA
server.get('/dummydata', async (req, res) => {
    let userData = {
        firstname: faker.name.firstName(), 
        lastname: faker.name.lastName(),
        p_firstname: faker.name.firstName(), 
        p_lastname: faker.name.lastName(),
        email: faker.internet.email(),
        address: `${faker.address.streetAddress()}, ${faker.address.city()}, ${faker.address.stateAbbr()} ${faker.address.zipCode()}`
    }   
    let wedding = {
        event_date: faker.date.future(),
        event_location: `${faker.address.streetAddress()}, ${faker.address.city()}, ${faker.address.stateAbbr()} ${faker.address.zipCode()}`,
        design_template: Math.floor(Math.random() * 4)
    }
    
    

    try {
        const wedding_id = await db.table('weddings').insert({event_date: faker.date.future(),
        event_address: `${faker.address.streetAddress()}, ${faker.address.city()}, ${faker.address.stateAbbr()} ${faker.address.zipCode()}`,
        design_template: Math.floor(Math.random() * 4)});
            console.log('weddingID:', wedding_id)
        
        const user1 = await db.table('user').insert({first_name: userData.firstname, last_name: userData.lastname, email: userData.email, wedding_id: wedding_id[0]})
        const user2 = await db.table('user').insert({first_name: userData.p_firstname, last_name: userData.p_lastname, wedding_id: wedding_id[0]})
            console.log('user1:', user1)
        
        const coupleID1 = await db.table('couples').insert({user_id: user1[0], dashboard_access: true})
        const coupleID2 = await db.table('couples').insert({user_id: user2[0], dashboard_access: true})
            console.log('coupleID:', coupleID1)
        
        if(wedding_id && user1 && coupleID1){
            res.status(200).json({wedding_id, coupleID1, coupleID2})
        }

    }

    catch(err){
            console.log(err)
        res.status(500).json({message: 'An error occured while retrieving the data.'})
    }
});

server.get('/dummyguests', async (req,res)=>{
    let userData = {
        first_name: faker.name.firstName(), 
        last_name: faker.name.lastName(),
        email: faker.internet.email(),
        address: `${faker.address.streetAddress()}, ${faker.address.city()}, ${faker.address.stateAbbr()} ${faker.address.zipCode()}`,
        wedding_id: Math.floor(Math.random() * 8)
    }

    let attendArr = ['Not Attending', 'Attending', 'TBD']

    try {
        let wedding_id = Math.ceil(Math.random() * 7)
        let attendIndex = Math.floor(Math.random() * 3)
        let coupleIndex = Math.floor(Math.random() * 2)
        
        let userID = await db.table('user').insert({
        first_name: faker.name.firstName(), 
        last_name: faker.name.lastName(),
        email: faker.internet.email(),
        address: `${faker.address.streetAddress()}, ${faker.address.city()}, ${faker.address.stateAbbr()} ${faker.address.zipCode()}`,

        wedding_id: wedding_id,
        guest: true
    }) 
        console.log('userID:', userID)

        let couple = await db.table('user').join('couples', {'users.id': 'couples.user_id'}).where({wedding_id})
        console.log('couple', couple, wedding_id)
        
        let related_spouse = couple[coupleIndex].first_name
        console.log('relatedspouse:', related_spouse)
        console.log('attendingArray:', attendArr[attendIndex], attendIndex)
        let guestID = await db.table('guests').insert({
            user_id: userID[0],
            attending: attendArr[attendIndex],
            related_spouse: related_spouse
        })
        console.log('guestID:', guestID)

        let guests = await db.table('user').join('guests', {'users.id': 'guests.user_id'}).where({wedding_id: 3})

        res.status(200).json(guests)
    } 
    
    catch (err) {
        console.log(err)
       res.status(500).json({message: 'An error occured while retrieving the data.'})
    
    } 

})


//A FUNCTION TO RETRIEVE GUESTS 
server.get('/guests', (req, res) => {

    db('user')
    .where({guest: true})
    .then(user => {
        res.status(200).json(user);
    })
    .catch(err => {
        res.status(500).json({error:'database cannot retrieve information'});
    })
});
// A FUNCTION TO DELETE USERS FROM THE USER TABLE
server.delete('/users/:id', (req,res) => {
    const {id} = req.params;
    db('user')
    .where({id})
    .del()
    .then(note => {
        res.status(200).json(note);
    })
    .catch(err => {
        res.status(500).json({error:'database cannot delete information'});
    })
})

server.get('/createcouple', (req, res)=>{
    
})

//A FUNCTION TO POST QUESTIONS::LINE 360
server.post('/questions', (req, res)=>{
    let { questions } = req.body;

    questions.forEach(qData => {
        db.table('questions').where({question: qData.question, wedding_id: qData.wedding_id})
        .then(res => {
            console.log("DBQuery",res)
            if(!res.length){console.log('NoRes')
                db.table('questions').insert(qData).then(res =>console.log(res)).catch(err => console.log(err))
            }
            else {
                console.log('ResExists')
            }

        })
        .catch(err=>{console.log(err)})
    })
    
    res.status(200).json({message: 'Data Posted Successfully.'})


})


//A FUNCTION TO RETRIEVE QUESTIONS OF A USER::LINE 384
server.get('/:id/allquestions', (req,res)=>{
    let { id } = req.params;

    db.table('questions').where({wedding_id: id}).then(response => res.json(response)).catch(err =>{
        res.json(err)
    })
})

//A FUNCTION TO DELETE QUESTIONS OF A USER::LINE 393
server.delete('/:questionID/deletequestion', async (req, res) => {
    let { questionID } = req.params;
    console.log('qID', questionID)
    
    try{
        let deletedQ = await db('questions').where({id: questionID}).del()
        console.log(deletedQ)
        
        res.status(200).json({message: 'Deleted Successfully.'})

    }

    catch(err){console.log(err)
        res.status(500).json({message: 'Server Error.'})
    }

    
})

stripe.charges.retrieve("ch_1DswKX2eZvKYlo2CYqqd3tgH", {
    api_key: "sk_test_4eC39HqLyjWDarjtT1zdp7dc"
  });

module.exports = server; 