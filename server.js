const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors');
const express = require('express');
const session = require('express-session');
const ExcelJS = require('exceljs');
const multer = require('multer');
const fs = require('fs');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const passport = require('passport');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis'); 
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');



const JWT_SECRET = process.env.JWT_SECRET ;

//main app creation in express
const app = express();
const PORT =3000;


const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const winston = require('winston');
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console()
    ]
});


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

  // Route for fetching data based on route parameters
app.get('/users/:id',(req,res)=>{
  try{
  db.query('SELECT * FROM ud where eid=?',[req.params.id],(err,rows)=>{
    if(err){
      logger.info(err)
    }
    else{
      res.json(rows);
      logger.info(`Fetched the eid: ${req.params.id}`);
    }
  });
}catch (error) {
    logger.error('Error in /ud/:id endpoint:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});




// Save day data
app.post('/save-day-data', (req, res) => {
  const { day, shift, notes, eid, month, year } = req.body;

  const query = 'INSERT INTO calendar (day, shift, notes, eid, month, year) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE shift = VALUES(shift), notes = VALUES(notes)';
  db.query(query, [day, shift, notes, eid, month, year], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to save data' });
      return;
    }
    res.status(200).json({ message: 'Data saved successfully' });
  });
});

// Save all data
app.post('/save-all-data', (req, res) => {
  const data = req.body;

  const values = data.map(item => [item.day, item.shift, item.notes, item.eid, item.month, item.year]);
  const query = 'INSERT INTO calendar (day, shift, notes, eid, month, year) VALUES ? ON DUPLICATE KEY UPDATE shift = VALUES(shift), notes = VALUES(notes)';

  db.query(query, [values], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to save data' });
      return;
    }
    res.status(200).json({ message: 'Data saved successfully' });
  });
});



app.get('/updateExcel/:eid/:year/:month', async (req, res) => {
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);
  const eid = req.params.eid;

  if (isNaN(year) || isNaN(month) || year < 1970 || month < 1 || month > 12) {
    return res.status(400).send('Invalid year or month');
  }

  const query =
    'SELECT day, shift, notes FROM calendar WHERE eid = ? AND year = ? AND month = ? ORDER BY day';

  db.query(query, [eid, year, month], async (err, results) => {
    if (err) {
      console.error('Error fetching data from the database:', err);
      return res.status(500).send('Server error');
    }

    const shiftData = results.reduce((acc, row) => {
      acc[row.day] = { shift: row.shift, notes: row.notes };
      return acc;
    }, {});

    try {
      const templatePath = path.join(__dirname, 'documents', 'Template.xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);
      const worksheet = workbook.getWorksheet(1);

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const monthCell = worksheet.getCell('D1');
      const yearCell = worksheet.getCell('E1');
     
      monthCell.value = monthNames[month - 1];
      yearCell.value = year;

      const columnsForDays = ['B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const startingRow = 13;
      const rowInterval = 3;
      const daysInMonth = new Date(year, month, 0).getDate();

      const firstDayOfMonth = new Date(year, month - 1, 1);
      const firstDayOfWeek = firstDayOfMonth.getDay();
      const mondayStartOffset = (firstDayOfWeek + 6) % 7;

      const cellMapping = {};

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = (date.getDay() + 6) % 7;
        const adjustedDayOfWeek = (dayOfWeek + mondayStartOffset) % 7;
        const column = columnsForDays[adjustedDayOfWeek];

        const weekNumber = Math.floor((day + mondayStartOffset - 1) / 7);
        const dateRow = startingRow + weekNumber * rowInterval;
        const dateCellAddress = `${column}${dateRow}`;
        const shiftCellAddress = `${column}${dateRow + 1}`;
        const notesCellAddress = `${column}${dateRow + 2}`;

        cellMapping[day] = {
          dateCell: worksheet.getCell(dateCellAddress),
          shiftCell: worksheet.getCell(shiftCellAddress),
          notesCell: worksheet.getCell(notesCellAddress)
        };
      }

      for (const day in shiftData) {
        if (cellMapping.hasOwnProperty(day)) {
          const { dateCell, shiftCell, notesCell } = cellMapping[day];
          shiftCell.value = shiftData[day].shift;
          notesCell.value = shiftData[day].notes;
        }
      }

      const outputPath = path.join(__dirname, 'downloads', `Updated_Timesheet_${month}_${year}_eid_${eid}.xlsx`);
      await workbook.xlsx.writeFile(outputPath);

      res.download(outputPath, `Updated_Timesheet_${month}_${year}_eid_${eid}.xlsx`, (err) => {
        if (err) {
          console.error('Error downloading the Excel file:', err);
          return res.status(500).send('Error downloading the Excel file');
        }
      });

    } catch (error) {
      console.error('Error updating the Excel file:', error);
      res.status(500).send('Error updating the Excel file');
    }
  });
});


app.get('/download-excel/:eid/:month/:year', async (req, res) => {
  const eid = req.params.eid;
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);

  // Fetch data from database
  db.query('SELECT * FROM ud WHERE eid = ?', [eid], async (error, results) => {
      if (error) {
          return res.status(500).send(error);
      }

      if (results.length > 0) {
          const data = results[0];

          // Load the existing Excel template
          const templatePath = path.join(__dirname, 'downloads', `Updated_Timesheet_${month}_${year}_eid_${eid}.xlsx`);
          // Update this path
          const workbook = new ExcelJS.Workbook();

          try {
              await workbook.xlsx.readFile(templatePath);
          } catch (err) {
              return res.status(500).send('Error reading Excel template');
          }

          const worksheet = workbook.getWorksheet(1); // Assuming the first worksheet

          // Update the necessary cells in column C
          worksheet.getCell('C3').value = data.ename; // Update cell references to match your data
          worksheet.getCell('C4').value = data.eid;
          worksheet.getCell('C5').value = data.client;
          worksheet.getCell('C8').value = data. working_hours;
          worksheet.getCell('C10').value = data.location;

          // Save the modified Excel file
          const outputPath = path.join(__dirname,'downloads', `Timesheet_${eid}.xlsx`);
          try {
              await workbook.xlsx.writeFile(outputPath);
          } catch (err) {
              return res.status(500).send('Error writing Excel file');
          }

          // Serve the file to the client
          res.download(outputPath, `Modified_Timesheet_${eid}.xlsx`, (err) => {
              if (err) {
                  console.error('Error downloading file:', err);
                  res.status(500).send('Error downloading file.');
              } else {
                  // Optionally, delete the file after download
                  fs.unlink(outputPath, (unlinkErr) => {
                      if (unlinkErr) {
                          console.error('Error deleting file:', unlinkErr);
                      }
                  });
              }
          });
      } else {
          res.status(404).send('No record found');
      }
  });
});

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validateMobileNumber = (mobileNo) => {
  const regex = /^\d{10}$/; 
  return regex.test(mobileNo);
};

// Multer storage configuration
const storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'C:\\Users\\likhi\\Desktop\\uploads'); // Adjust this path
  },
  filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload1 = multer({ storage: storage1 });

const router = express.Router();
app.use(express.urlencoded({ extended: true }));

// POST Method
app.post('/candidate', upload1.single('resume'), (req, res) => {
  const { candidate_name, candidate_email, mobile_no, experience, job_portal, refered_by } = req.body;

  const resumePath = req.file.path;

  // MySQL insert query
  const sql = `
      INSERT INTO candidate (candidate_name, candidate_email, mobile_no, resume, experience, job_portal, refered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [candidate_name, candidate_email, mobile_no, resumePath, experience, job_portal, refered_by];

  db.query(sql, values, (error, results) => {
      if (error) {
          console.error('Error adding candidate:', error);
          return res.status(500).json({ error: 'An error occurred. Please try again later.' });
      }
      console.log('Candidate added successfully.');
      res.status(200).json({ message: 'Candidate added successfully.' });
  });
});

// GET all candidates
router.get('/candidates', (req, res) => {
  const sql = 'SELECT * FROM candidate';

  db.query(sql, (error, results) => {
      if (error) {
          console.error('Error retrieving candidates:', error);
          return res.status(500).json({ error: 'An error occurred. Please try again later.' });
      }
      res.status(200).json(results);
  });
});

// GET candidate by id
router.get('/candidates/:candidate_id', (req, res) => {
  const candidateId = req.params.candidate_id;
  const sql = 'SELECT * FROM candidate WHERE candidate_id = ?';

  db.query(sql, [candidateId], (error, results) => {
      if (error) {
          console.error('Error retrieving candidate by ID:', error);
          return res.status(500).json({ error: 'An error occurred. Please try again later.' });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'Candidate not found.' });
      }

      const candidate = results[0];
      res.status(200).json(candidate);
  });
});

// GET candidate resume by id
router.get('/candidates/:candidate_id/resume', (req, res) => {
  const candidateId = req.params.candidate_id;
  const sql = 'SELECT resume FROM candidate WHERE candidate_id = ?';

  db.query(sql, [candidateId], (error, results) => {
      if (error) {
          console.error('Error retrieving resume data:', error);
          return res.status(500).json({ error: 'An error occurred. Please try again later.' });
      }

      if (results.length === 0 || !results[0].resume) {
          return res.status(404).json({ error: 'Resume not found for this candidate.' });
      }

      const resumePath = results[0].resume;

      // Read the file and send it as a response
      fs.readFile(resumePath, (err, data) => {
          if (err) {
              console.error('Error reading resume file:', err);
              return res.status(500).json({ error: 'An error occurred while reading the resume file.' });
          }

          res.setHeader('Content-Type', 'application/pdf'); // Adjust the content type according to your file type
          res.status(200).send(data);
      });
  });
});

// PUT Method
router.put('/candidate/:candidate_id', (req, res) => {
  const candidateId = req.params.candidate_id;
  const { candidate_name, candidate_email, mobile_no, experience, job_portal, refered_by } = req.body;

  try {
      if (!candidate_name || !candidate_email || !mobile_no || !experience || !job_portal) {
          throw new Error('All fields are required');
      }
      if (!validateEmail(candidate_email)) {
          throw new Error('Invalid email format');
      }
      if (!validateMobileNumber(mobile_no)) {
          throw new Error('Invalid mobile number format');
      }
      if (experience < 0 || experience > 20) {
          throw new Error('Experience should be between 0 and 20 years');
      }

      const sql = `
          UPDATE candidate
          SET candidate_name = ?, candidate_email = ?, mobile_no = ?, experience = ?, job_portal = ?, refered_by = ?
          WHERE candidate_id = ?
      `;
      const values = [candidate_name, candidate_email, mobile_no, experience, job_portal, refered_by, candidateId];

      db.query(sql, values, (error, results) => {
          if (error) {
              console.error('Error updating candidate:', error);
              return res.status(500).json({ error: 'An error occurred. Please try again later.' });
          }

          if (results.affectedRows === 0) {
              return res.status(404).json({ error: 'Candidate not found.' });
          }

          console.log('Candidate updated successfully.');
          res.status(200).json({ message: 'Candidate updated successfully.' });
      });
  } catch (error) {
      console.error('Error updating candidate:', error);
      res.status(500).json({ error: error.message || 'An error occurred. Please try again later.' });
  }
});

// DELETE Method
router.delete('/candidate/:candidate_id', (req, res) => {
  const candidateId = req.params.candidate_id;

  const sql = 'DELETE FROM candidate WHERE candidate_id = ?'; 
  db.query(sql, [candidateId], (error, results) => {
      if (error) {
          console.error('Error deleting candidate:', error);
          return res.status(500).json({ error: 'An error occurred. Please try again later.' });
      }

      if (results.affectedRows === 0) {
          return res.status(404).json({ error: 'Candidate not found.' });
      }

      console.log('Candidate deleted successfully.');
      res.status(200).json({ message: 'Candidate deleted successfully.' });
  });
});

app.use('/', router);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'C:\\Users\\likhi\\Desktop\\jd'); // Adjust this path as needed
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: "newjobrequesttest@gmail.com",
      pass: "jkuggsvbnmjwqxiu",
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB file size limit
  }
}).single('job_description_file');

// Route to handle POST requests for adding a new request
app.post('/requests', (req, res) => {
  upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
          // Multer error
          console.error('Multer error:', err);
          return res.status(400).json({ error: 'File upload error' });
      } else if (err) {
          // Other errors
          console.error('Error uploading file:', err);
          return res.status(500).json({ error: 'An error occurred while uploading file' });
      }

      const { eid, recruiter_email, designation, skills, experience, job_description_text } = req.body;
      let job_description_file = null; // Initialize job_description_file as null

      // Check if file was uploaded
      if (req.file) {
          job_description_file = req.file.path; // Access the uploaded file's path
      }

      // Insert new request into the database
      const sql = 'INSERT INTO request (eid, recruiter_email, designation, job_description_text, job_description_file, skills, experience) VALUES (?, ?, ?, ?, ?, ?, ?)';
      const values = [eid, recruiter_email, designation, job_description_text, job_description_file, skills, experience];

      db.query(sql, values, (err, result) => {
          if (err) {
              console.error('Error adding request:', err);
              return res.status(500).json({ error: 'An error occurred while adding request' });
          }
          console.log('Request added successfully');
          // Send JSON response
          res.status(200).json({ message: 'Request added successfully' });

          // Send email notification
          const mailContent = {
              from: 'newjobrequesttest@gmail.com',
              to: recruiter_email,
              subject: "New Job Request",
              text: `A new job request has been submitted with the following details:\n
              Designation: ${designation}\n
              Skills: ${skills}\n
              Experience: ${experience}\n
              Job Description: ${job_description_text}`
          };

          transporter.sendMail(mailContent, (err, info) => {
              if (err) {
                  console.log('Error sending email:', err);
                  return res.status(500).json({ message: 'Error sending email' });
              }
              console.log('Email sent:', info.response);
              // Send JSON response
              res.status(200).json({ message: 'Request submitted successfully and email sent' });
          });
      });
  });
});

app.get('/requests', (req, res) => {
  const sql = `
        SELECT r.*, u.ename 
        FROM request r 
        JOIN ud u ON r.eid = u.eid
    `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching requests:', err);
      return res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
    console.log('Requests fetched successfully');
    res.status(200).json(results);
  });
});

app.get('/requests/:id', (req, res) => {
  const requestId = req.params.id;
  const sql = 'SELECT * FROM request WHERE request_id = ?';
  db.query(sql, [requestId], (err, result) => {
    if (err) {
      console.error(`Error fetching request with ID ${requestId}:`, err);
      return res.status(500).json({ error: `An error occurred while fetching request with ID ${requestId}` });
    }
    if (result.length === 0) {
      return res.status(404).json({ error: `Request with ID ${requestId} not found` });
    }
    console.log(`Request with ID ${requestId} fetched successfully`);
    res.status(200).json(result[0]);
  });
});

app.put('/requests/:id/status', (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body;

  const sql = 'UPDATE request SET status = ? WHERE request_id = ?';
  db.query(sql, [status, requestId], (err, result) => {
      if (err) {
          console.error(`Error updating status for request with ID ${requestId}:`, err);
          return res.status(500).json({ error: 'An error occurred while updating the request status' });
      }
      console.log(`Status for request with ID ${requestId} updated successfully`);
      res.status(200).json({ message: 'Status updated successfully' });
  });
});
app.delete('/requests/:id', (req, res) => {
  const requestId = req.params.id;
  const sql = 'DELETE FROM request WHERE request_id = ?';
  db.query(sql, [requestId], (err, result) => {
    if (err) {
      console.error(`Error deleting request with ID ${requestId}:`, err);
      return res.status(500).json({ error: `An error occurred while deleting request with ID ${requestId}` });
    }
    console.log(`Request with ID ${requestId} deleted successfully`);
    res.status(200).json({ message: `Request with ID ${requestId} deleted successfully` });
  });
});

app.get('/requested_candidates', (req, res) => {
  const sql = `
      SELECT rc.requested_candidate_id, rc.request_id, rc.candidate_id,
           rc.type_of_interview, rc.mode_of_interview, rc.stage_of_interview, rc.scheduled_interview_timing,
           c.candidate_name, c.candidate_email,
           u.ename AS interviewer_name
    FROM requested_candidate rc
    INNER JOIN candidate c ON rc.candidate_id = c.candidate_id
    INNER JOIN request r ON rc.request_id = r.request_id
    INNER JOIN ud u ON r.eid = u.eid
`;
  db.query(sql, (error, results) => {
    if (error) {
      console.error('Error fetching requested candidates:', error);
      res.status(500).json({ error: 'Failed to fetch requested candidates.' });
    } else {
      res.json(results);  // Return results containing all selected fields including interviewer_name
    }
  });
});

app.get('/requested_candidates/feedback', (req, res) => {
  const sql = `
    SELECT 
      rc.requested_candidate_id, 
      rc.request_id, 
      rc.candidate_id,
      rc.scheduled_interview_timing, 
      rc.type_of_interview, 
      rc.mode_of_interview, 
      rc.stage_of_interview, 
      rc.feedback, 
      rc.score, 
      rc.status,
      c.candidate_name, 
      c.candidate_email,
      u.ename AS interviewer_name
    FROM requested_candidate rc
    INNER JOIN candidate c ON rc.candidate_id = c.candidate_id
    INNER JOIN request r ON rc.request_id = r.request_id
    INNER JOIN ud u ON r.eid = u.eid
  `;
  db.query(sql, (error, results) => {
    if (error) {
      console.error('Error fetching requested candidates:', error);
      res.status(500).json({ error: 'Failed to fetch requested candidates.' });
    } else {
      res.json(results);
    }
  });
});


app.get('/requested_candidates', (req, res) => {
  const sql = `
    SELECT DISTINCT type_of_interview, mode_of_interview, stage_of_interview, scheduled_interview_timing
    FROM requested_candidate
  `;
  
  db.query(sql, (error, results) => {
    if (error) {
      console.error('Error fetching distinct dropdown values:', error);
      res.status(500).json({ error: 'Failed to fetch dropdown values.' });
    } else {
      const dropdownValues = {
        type_of_interview: results.map(result => result.type_of_interview),
        mode_of_interview: results.map(result => result.mode_of_interview),
        stage_of_interview: results.map(result => result.stage_of_interview),
        scheduled_interview_timing: results.map(result => result.scheduled_interview_timing)
      };
      res.json(dropdownValues);
    }
  });
});

// Route to update requested candidate details
app.put('/requested_candidates/:id', (req, res) => {
  const requestedCandidateId = req.params.id;
  const { type_of_interview, mode_of_interview, stage_of_interview, interviewer_name, scheduled_interview_timing, additionalDetails } = req.body;

  // Check if compulsory fields are provided
  if (!type_of_interview || !mode_of_interview || !stage_of_interview || !scheduled_interview_timing || !interviewer_name) {
    return res.status(400).json({ error: 'Mandatory fields (type_of_interview, mode_of_interview, stage_of_interview, scheduled_interview_timing, interviewer_name) are required.' });
  }

  const sql = `
    UPDATE requested_candidate
    SET type_of_interview = ?, mode_of_interview = ?, stage_of_interview = ?, scheduled_interview_timing = ?
    WHERE requested_candidate_id = ?
  `;
  const values = [type_of_interview, mode_of_interview, stage_of_interview, scheduled_interview_timing, requestedCandidateId];

  db.query(sql, values, (error, results) => {
    if (error) {
      console.error('Error updating requested candidate:', error);
      return res.status(500).json({ error: 'Failed to update requested candidate.' });
    }

    // Fetch candidate details to get candidate_email, mode_of_interview, type_of_interview
    const fetchCandidateDetailsQuery = `
      SELECT c.candidate_email, rc.scheduled_interview_timing, rc.mode_of_interview, rc.type_of_interview
      FROM candidate c
      INNER JOIN requested_candidate rc ON c.candidate_id = rc.candidate_id
      WHERE rc.requested_candidate_id = ?
    `;
    db.query(fetchCandidateDetailsQuery, [requestedCandidateId], (err, candidateResult) => {
      if (err) {
        console.error('Error fetching candidate details:', err);
        return res.status(500).json({ error: 'Failed to fetch candidate details.' });
      }

      if (candidateResult.length === 0) {
        return res.status(404).json({ error: 'Candidate not found.' });
      }

      const { candidate_email, scheduled_interview_timing, mode_of_interview, type_of_interview } = candidateResult[0];

      const fetchInterviewerDetailsQuery = `
        SELECT username AS interviewer_email
        FROM ud
        WHERE ename = ?
      `;
      
      db.query(fetchInterviewerDetailsQuery, [interviewer_name], (err, interviewerResult) => {
        if (err) {
          console.error('Error fetching interviewer details:', err);
          return res.status(500).json({ error: 'Failed to fetch interviewer details.' });
        }

        if (interviewerResult.length === 0) {
          return res.status(404).json({ error: 'Interviewer not found.' });
        }

        const interviewerEmail = interviewerResult[0].interviewer_email; // Use interviewer_email here

        // Send email notifications to candidate and interviewer simultaneously
        sendEmail(candidate_email, interviewerEmail, scheduled_interview_timing, mode_of_interview, type_of_interview, additionalDetails)
          .then(() => {
            // Respond with success message
            res.json({ message: 'Requested candidate updated successfully.' });
          })
          .catch((error) => {
            console.error('Failed to send emails:', error);
            res.status(500).json({ error: 'Failed to send email notifications.' });
          });
      });
    });
  });
});

function sendEmail(candidateEmail, interviewerEmail, scheduledInterviewTiming, modeOfInterview, typeOfInterview, additional_info, meetingLink) {
  return new Promise((resolve, reject) => {
    // Fetch sender's email (assuming it's stored in 'ud' table)
    const fetchSenderEmailQuery = `
      SELECT username AS senderEmail
      FROM ud
      WHERE role = 'recruiter' -- Adjust as per your application logic
      LIMIT 1
    `;

    // Fetch candidate details to get candidate_name
    const fetchCandidateDetailsQuery = `
      SELECT candidate_name
      FROM candidate
      WHERE candidate_email = ?
    `;

    // Fetch interviewer details to get interviewer_name
    const fetchInterviewerDetailsQuery = `
      SELECT ename AS interviewer_name
      FROM ud
      WHERE username = ?
    `;

    // Fetch candidate's resume
    const fetchCandidateResumeQuery = `
      SELECT resume
      FROM candidate
      WHERE candidate_email = ?
    `;

    // Execute queries sequentially
    db.query(fetchSenderEmailQuery, (err, senderEmailResult) => {
      if (err) {
        console.error('Error fetching sender email:', err);
        reject(err); // Reject promise on error
        return;
      }

      // Extract sender's email from the query result
      const senderEmail = senderEmailResult[0].senderEmail;

      // Fetch candidate details
      db.query(fetchCandidateDetailsQuery, [candidateEmail], (err, candidateResult) => {
        if (err) {
          console.error('Error fetching candidate details:', err);
          reject(err); // Reject promise on error
          return;
        }

        if (candidateResult.length === 0) {
          reject(new Error('Candidate not found.'));
          return;
        }

        const candidateName = candidateResult[0].candidate_name;

        // Fetch interviewer details
        db.query(fetchInterviewerDetailsQuery, [interviewerEmail], (err, interviewerResult) => {
          if (err) {
            console.error('Error fetching interviewer details:', err);
            reject(err); // Reject promise on error
            return;
          }

          if (interviewerResult.length === 0) {
            reject(new Error('Interviewer not found.'));
            return;
          }

          const interviewerName = interviewerResult[0].interviewer_name;

          // Fetch candidate's resume
          db.query(fetchCandidateResumeQuery, [candidateEmail], (err, resumeResult) => {
            if (err) {
              console.error('Error fetching candidate resume:', err);
              reject(err); // Reject promise on error
              return;
            }

            // Prepare variables for resume attachment
            let resumeAttachment = null;
            let resumeFileName = '';

            // If resume found, prepare attachment
            if (resumeResult && resumeResult.length > 0) {
              const resume = resumeResult[0].resume;
              // Assuming 'resume' field contains base64 encoded resume data
              resumeAttachment = {
                filename: `resume.${resume}`, // Adjust filename as per your application logic
                content: Buffer.from(resume, 'base64'),
              };
              resumeFileName = `resume.${resume}`; // Adjust filename as per your application logic
            }

            // Initialize Nodemailer transporter using SMTP or other service
            let transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: 'newjobrequesttest@gmail.com', // Your email address
                pass: 'hjtyghzwngmvmwpq' // Your email password
              }
            });

            // Determine interview detail label and value based on typeOfInterview
            let interviewDetailLabel = '';
            let interviewDetailValue = '';

            if (typeOfInterview === 'Face to Face') {
              interviewDetailLabel = 'Location';
              interviewDetailValue = additional_info || ''; // Only assign additional_info if available
            } else if (typeOfInterview === 'Video Interview') {
              interviewDetailLabel = 'Meeting Link';
              interviewDetailValue = meetingLink || ''; // Only assign meetingLink if available
            }

            // Email options for candidate
            let mailOptionsCandidate = {
              from: 'newjobrequesttest@gmail.com',
              to: candidateEmail,
              subject: 'Interview Scheduled',
              text: `Dear ${candidateName},

I hope this message finds you well.

I am writing to inform you that an interview has been scheduled with the following details:

Date and Time: ${scheduledInterviewTiming}
Mode: ${modeOfInterview}
Type: ${typeOfInterview}
${interviewDetailLabel ? `${interviewDetailLabel}: ${interviewDetailValue}\n` : ''}

Please confirm your availability for this interview. If you are unable to attend at this time, please let us know so we can arrange an alternative.

If you have any questions or need further information, please feel free to contact me at [Your Contact Information].

Best regards,
Samartha InfoSolutions Pvt Ltd.
`,
              attachments: [
                resumeAttachment // Attach candidate's resume if available
              ]
            };

            // Email options for interviewer
            let mailOptionsInterviewer = {
              from: 'newjobrequesttest@gmail.com',
              to: interviewerEmail,
              subject: 'Interview Scheduled',
              text: `Dear ${interviewerName},

I hope this message finds you well.

I have scheduled an interview for the candidate ${candidateName}. The details are as follows:

Date and Time: ${scheduledInterviewTiming}
Mode: ${modeOfInterview}
Type: ${typeOfInterview}
${interviewDetailLabel ? `${interviewDetailLabel}: ${interviewDetailValue}\n` : ''}

If you have any specific instructions or questions regarding the interview, please let me know.

Thank you for your cooperation.

Best regards,
Samartha InfoSolutions Pvt Ltd.
`,
              attachments: [
                resumeAttachment // Attach candidate's resume if available
              ]
            };

            // Sending emails in parallel
            Promise.all([
              transporter.sendMail(mailOptionsCandidate),
              transporter.sendMail(mailOptionsInterviewer)
            ])
            .then(() => {
              console.log('Emails sent successfully.');
              resolve(); // Resolve promise when emails are sent successfully
            })
            .catch((error) => {
              console.error('Failed to send emails:', error);
              reject(error); // Reject promise if there is an error sending emails
            });
          });
        });
      });
    });
  });
}

// Route to update feedback score and status of requested candidate
app.put('/requested_candidates/:id/feedback', (req, res) => {
  const requestedCandidateId = req.params.id;
  const { feedback ,score, status } = req.body;

  // Check if compulsory fields are provided
  if (feedback === undefined ||score === undefined || status === undefined) {
    return res.status(400).json({ error: 'Mandatory fields (feedback,score, status) are required.' });
  }

  const sql = `
      UPDATE requested_candidate
      SET feedback = ? ,score = ?, status = ?
      WHERE requested_candidate_id = ?
  `;
  const values = [feedback,score, status, requestedCandidateId];

  db.query(sql, values, (error, results) => {
    if (error) {
      console.error('Error updating feedback score and status:', error);
      res.status(500).json({ error: 'Failed to update feedback score and status.' });
    } else {
      res.json({ message: 'Feedback score and status updated successfully.' });
    }
  });
});

// Route to create a new requested candidate
app.post('/requested_candidates', (req, res) => {
  const { request_id, candidate_id } = req.body;

  const sql = `
      INSERT INTO requested_candidate (request_id, candidate_id)
      VALUES (?, ?)
  `;
  const values = [request_id, candidate_id];

  db.query(sql, values, (error, results) => {
    if (error) {
      console.error('Error inserting requested candidate:', error);
      res.status(500).json({ error: 'Failed to create requested candidate.' });
    } else {
      res.status(201).json({ message: 'Requested candidate created successfully.' });
    }
  });
});


  
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
  
