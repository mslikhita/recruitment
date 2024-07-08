const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const app = express();
const port = 3001;

// MySQL database connection configuration
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'recruitment'
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  console.log('Connected to the MySQL database');
});

app.use(bodyParser.json());
app.use(cors());

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



// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});