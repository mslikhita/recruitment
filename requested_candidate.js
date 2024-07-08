const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

// Create Express application
const app = express();
const port = 3003;
app.use(cors());

// MySQL Connection
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

// Middleware
app.use(bodyParser.json());

// Routes

// Get all requested candidates
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
  const { type_of_interview, mode_of_interview, stage_of_interview, scheduled_interview_timing } = req.body;

  // Check if compulsory fields are provided
  if (!type_of_interview || !mode_of_interview || !stage_of_interview || !scheduled_interview_timing) {
    return res.status(400).json({ error: 'Mandatory fields (type_of_interview, mode_of_interview, stage_of_interview, scheduled_interview_timing) are required.' });
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
      res.status(500).json({ error: 'Failed to update requested candidate.' });
    } else {
      res.json({ message: 'Requested candidate updated successfully.' });
    }
  });
});

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

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


