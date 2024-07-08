const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3005;
app.use(cors());
app.use(express.json());

// MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'recruitment'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Helper functions
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const validateMobileNumber = (mobileNo) => {
    const regex = /^\d{10}$/; 
    return regex.test(mobileNo);
};

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'C:\\Users\\likhi\\Desktop\\uploads'); // Adjust this path
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const router = express.Router();
app.use(express.urlencoded({ extended: true }));

// POST Method
app.post('/candidate', upload.single('resume'), (req, res) => {
    const { candidate_name, candidate_email, mobile_no, experience, job_portal, refered_by } = req.body;

    const resumePath = req.file.path;

    // MySQL insert query
    const sql = `
        INSERT INTO candidate (candidate_name, candidate_email, mobile_no, resume, experience, job_portal, refered_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [candidate_name, candidate_email, mobile_no, resumePath, experience, job_portal, refered_by];

    connection.query(sql, values, (error, results) => {
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

    connection.query(sql, (error, results) => {
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

    connection.query(sql, [candidateId], (error, results) => {
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

    connection.query(sql, [candidateId], (error, results) => {
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

        connection.query(sql, values, (error, results) => {
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
    connection.query(sql, [candidateId], (error, results) => {
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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});