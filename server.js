const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors');
const express = require('express');
const session = require('express-session');
const ExcelJS = require('exceljs');
const fs = require('fs');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const passport = require('passport');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis'); 
const GoogleStrategy = require('passport-google-oauth20').Strategy;



const JWT_SECRET = process.env.JWT_SECRET ;

//main app creation in express
const app = express();
const PORT =3000;


const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);


// Middleware
// Serve static files from the 'public' directory
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'adithya',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(cors()); 

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'recruitment'
  });
  
  db.connect((err) => {
    if (err) {
      throw err;
    }
    console.log('MySQL Connected...');
  });

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new GoogleStrategy({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL: REDIRECT_URI
},
(accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));


// Route to initiate Google OAuth
app.get('/auth/google', (req, res) => {
  const email = req.query.email;
  if (email.endsWith('@samarthainfo.com')) {
      const authorizeUrl = oAuth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: ['profile', 'email'],
          state: email
      });
      res.redirect(authorizeUrl);
  } /*
  else {
      res.status(400).send('Invalid email domain.');
  }
      */
});

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), async (req, res) => {
    console.log(req.user);
    const user = req.user;
    const email = user.emails && user.emails[0] && user.emails[0].value;
    console.log('Authenticated email:', email);
  
    if (!email) {
      return res.status(400).send('Email not found');
    }
  
    // Fetch user details including role from the database
    const fetchUserQuery = 'SELECT eid, role FROM ud WHERE username = ?';
    db.query(fetchUserQuery, [email], (fetchErr, results) => {
      if (fetchErr) {
        console.error('Error fetching user details:', fetchErr);
        return res.status(500).send('Internal Server Error');
      }
  
      if (results.length === 0) {
        console.error('User not found for email:', email);
        return res.status(404).send('User not found');
      }
  
      const { eid, role } = results[0];
      console.log('Fetched role:', role);
  
      // Determine dashboard based on role
      let dashboardPage;
      if (role === 'recruiter') {
        dashboardPage = 'recruiter_dashboard.html';
      } else if (role === 'requester') {
        dashboardPage = 'requester_dashboard.html';
      } else {
        console.error('Unknown role:', role);
        return res.status(403).send('Unauthorized');
      }
  
      // Generate JWT token with email and eid
      const token = jwt.sign({ email, eid }, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log('Generated token:', token);
  
      // Update token and expiry in the database
      const now = new Date();
      const expiry = Math.floor((now.getTime() + 60 * 60 * 1000) / 1000);
      const updateTokenQuery = 'UPDATE ud SET token = ?, expiry = ? WHERE username = ?';
      db.query(updateTokenQuery, [token, expiry, email], (updateErr, result) => {
        if (updateErr) {
          console.error('Error updating token:', updateErr);
          return res.status(500).send('Internal Server Error');
        }
  
        // Redirect to the appropriate dashboard with the token and eid in query parameters
        res.redirect(`/${dashboardPage}?token=${token}&eid=${eid}`);
      });
    });
  });
  

app.get('/dashboard', verifyToken, (req, res) => {
  jwt.verify(req.token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
          res.sendStatus(403);
      } else {
          const email = decoded.email;
          const getEidQuery = 'SELECT eid FROM ud WHERE username = ?';
          db.query(getEidQuery, [email], (err, results) => {
              if (err || results.length === 0) {
                  console.error('Error fetching eid:', err || 'No EID found for the user');
                  return res.status(500).send('Internal Server Error');
              }

              const eid = results[0].eid;
              console.log('EID for user', email, 'is:', eid); // Print eid to console

              // Respond with a success message or any other appropriate response
              res.send('EID fetched successfully. Check console for details.');
          });
      }
  });
});

// Protected route example using JWT for authorization
app.get('/protected', verifyToken, (req, res) => {
  // Verify JWT token
  jwt.verify(req.token, process.env.JWT_SECRET, (err, authData) => {
      if (err) {
          res.sendStatus(403);
      } else {
          res.json({
              message: 'Access granted',
              authData
          });
      }
  });
});

function verifyToken(req, res, next) {
  const token = req.query.token || req.headers['authorization'];

  if (token) {
      req.token = token;
      next();
  } else {
      res.sendStatus(403); // Forbidden
  }
}


// Register endpoint
app.post('/register', (req, res) => {
    const { eid, email, employeeName, client, location } = req.body;
  
    // Check if eid or email already exists
    const checkSql = 'SELECT * FROM ud WHERE eid = ? OR username = ?';
    db.query(checkSql, [eid, email], (checkErr, checkResult) => {
        if (checkErr) {
            console.error('Database error:', checkErr);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
  
        const errors = [];
        if (checkResult.length > 0) {
            const existingEid = checkResult.some(row => row.eid === eid);
            const existingEmail = checkResult.some(row => row.username === email);
  
            if (existingEid) {
                errors.push({ field: 'eid', message: 'EID already registered' });
            }
            if (existingEmail) {
                errors.push({ field: 'email', message: 'Email already registered' });
            }
  
            if (errors.length > 0) {
                return res.json({ success: false, errors: errors });
            }
        }
  
        // Proceed with insertion if not found
        const insertSql = 'INSERT INTO ud (eid, username, ename, client, loc, wh, role) VALUES (?, ?, ?, ?, ?, 9,"requester")';
        db.query(insertSql, [eid, email, employeeName, client, location], (insertErr, insertResult) => {
            if (insertErr) {
                console.error('Database error:', insertErr);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            res.json({ success: true, message: 'Registration successful' });
        });
    });
  });
  
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
  