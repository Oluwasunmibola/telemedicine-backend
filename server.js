const express = require('express')
const database = require('./database_conn')
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const port = 3000;
app.use(express.json());

const isAuthenticated = (req, res, next) => {
    if (req.session.patientId){
        return next();
    }
    res.status(401).json({error: 'Unauthorized! Please log in.'})
}

const isAdmin = async (req, res, next) => {
    if(!req.session || !req.session.userId) {
        return res.status(401).json({error: 'User not authenticated.'});
    }

    try{
        const [rows] = await database.query(`SELECT role from Admin WHERE id = ?`, [req.session.userId]);

        if(rows.length === 0){
            return res.status(403).json({error: 'Admin role not found.'});
        }

        const {role} = rows[0];

        if(role !== 'SuperAdmin' && role !== 'Moderator') {
            return res.status(403).json({error: 'Access denied. Admin only.'});
        }

        next();
    } catch  (err){
        res.status(500).json({error: 'Failed to verify admin role.'});
    }
}

app.get('/', (req, res) => {
    res.send("Welcome to the Telemedicine backend");
});

// Patient Registeration
app.post('/patient/register', async (req, res) => {
    const {first_name, last_name, email, password, phone_number, date_of_birth, gender, address } = req.body;
    try{
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [result] = await database.query(
            `INSERT INTO PATIENTS (first_name, last_name, email, password_hash, phone_number, date_of_birth, gender, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, email, hashedPassword, phone_number, date_of_birth, gender, address]
        );

        res.status(201).json({
            message: 'Patient registered successfully',
            patient_id: result.insertId
        })
    } catch (err){
        console.error('Error during registeration: ', err);
        res.status(500).json({
            error: 'Registeration failed!'
        });
    }
});

// Admin get patient
// pending check to ensure role is admin
app.get('/admin/patient', isAuthenticated, isAdmin, async (req, res) => {
    const { search, gender} = req.query
    let query = `SELECT id, first_name, last_name, email, phone_number, gender FROM Patients where 1=1`;
    const params = [];

    if (search){
        query += " AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (gender){
        query += " AND gender = ?";
        params.push(gender);
    }

    try{
        const [rows] = await database.query(query, params);
        res.status(200).json(rows);
    } catch (err){
        res.status(500).json({error: 'Failed to fetch patients.'});
    }
});

// Update patient profile
app.put('/patient/profile', isAuthenticated, async (req, res) => {
    const { first_name, last_name, email, phone_number, date_of_birth, gender, address} = req.body;
    try{
        await database.query(`UPDATE Patients SET first_name=?, last_name=?, phone_number=?, date_of_birth=?, gender=?, address=?, WHERE id=?`,
            [first_name, last_name, phone_number, date_of_birth, gender, address, req.user.id]
        );
        res.status(200).json({message: 'Patient profile updated successfully'});
    } catch (err){
        res.status(500).json({error: 'Failed to update profile.'});
    }
});

// Delete patient profile
app.delete('/patient/delete', isAuthenticated, async (req, res) => {
    try{
        await database.query(`DELETE FROM Patients WHERE id=?`, [req.session.patienId]);
        req.session.destroy();
        res.status(200).json({message: 'Patient deleted successfully'});
    } catch (err){
        res.status(500).json({error: 'Failed to delete patient.'});
    }
});

// Patient Login
app.post('/patient/login', async (req, res) => {
    const {email, password} = req.body
    try{
        const [rows] = await database.query(
            `SELECT * FROM Patients WHERE email = ?`, [email]
        );

        if (rows.length === 0){
            return res.status(401).json({error: 'Invalid email or password'});
        }

        const patient = rows[0];

        const match = await bcrypt.compare(password, patient.password_hash);
        if(!match){
            return res.status(401).json({error: 'Invalid email or password'});
        }

        req.session.patienId = patient.id;
        res.status(200).json({message: 'Login successful!', patientId: patient.id});
    } catch (err) {
        console.error('Error during login: ', err);
        return res.status(500).json({error: 'Login failed!'});
    }
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err){
            console.error('Error during logout: ', err);
            return res.status(500).json({error: 'Logout failed!'})
        }
        res.clearCookie('connect.sid');
        res.status(200).json({message: 'Logged out successfully!'});
    });
});


// Admin create a doctor
app.post('/admin/create-doctor', isAuthenticated, isAdmin, async (req, res) => {
    const {first_name, last_name, email,specialization, phone_number, schedule} = req.body;
    try{
        const [result] = await database.query(`INSERT INTO Doctors (first_name, last_name, email, specialization, phone_number, schedule) VALUES (?, ?, ?, ?, ?, ?)`, 
            [first_name, last_name, email, specialization, phone_number, schedule]);

        res.status(201).json({message: 'Doctor created successfully!', doctorId: result.insertId});
    } catch (err){
        console.error('Error during creating doctor: ', err);
        res.status(500).json({error: 'Failed to create doctor!'});
    }
});

//Get all doctors
app.get('/doctors', async (req, res) => {
    try{
        const [rows] = await database.query(`SELECT id, first_name, last_name, email, specialization, schedule FROM Doctors`);
        res.status(201).json(rows)
    } catch(err){
        res.status(500).json({error: 'Failed to fetch doctors.'});
    }
});

//Update doctors information
app.put('/admin/doctors/:id', isAuthenticated, isAdmin, async (req, res) => {
    const {first_name, last_name, email, specialization, phone_number, schedule} = req.body;
    const { id } = req.params.id;

    try{
        await database.query(`UPDATE Doctors SET first_name = ?, last_name = ?, email = ?, specialization = ?, phone_number = ?, schedule = ?`, 
            [first_name, last_name, email, specialization, phone_number, schedule, id]
        );

        res.status(200).json({message: 'Doctor profile updated successfully!'});
    } catch (err){
        res.status(500).json({error: 'Failed to update doctor profile!'});
    }
})

app.delete('/admin/doctors/:id', isAuthenticated, isAdmin, async (req, res) => {
    const { id } = req.params.id;
    try{
        await database.query(`DELETE FROM Doctors WHERE id = ?`, [id]);
        res.status(200).json({message: 'Doctor deleted successfully!'});
    } catch (err){
        res.status(500).json({error: 'Failed to delete doctor!'});
    }
});

// Appointment booking
app.post('/appointments', isAuthenticated, async (req, res) => {
    const { doctor_id, appointment_date, appointment_time } = req.body;
    try{
        await database.query(`INSERT INTO Appointments (patient_id, doctor_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, 'pending')`, 
            [req.session.patienId, doctor_id, appointment_date, appointment_time]);
        res.status(201).json({message: 'Appointment booked successfully!'});
    } catch (err){
        res.status(500).json({error: 'Failed to book appointment!'});
    }
});

//View appointments
app.get('/appointments', isAuthenticated, async (req, res) => {
    try{
        const [rows] = await database.query(
            `SELECT Appointments.id, Doctors.first_name AS doctor_name, appointment_date, appointment_time, status
             FROM Appointments JOIN Doctors ON Appointments.doctor_id = Doctors.id WHERE Appointments.patient_id = ?
            `, [req.session.patientId]
        );
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({error: 'Failed to fetch appointments!'});
    }
})

// Update appointment
app.put('/appointments/:id', isAuthenticated, async (req, res) => {
    const { appointment_date, appointment_time} = req.body;
    const { id } = req.params;
    try{
        await database.query(`UPDATE Appointments SET appointment_date =?, appointment_time = ? where id = ? AND patient_id = ?`,
            [appointment_date, appointment_time, id, req.session.patientId]
        );
        res.status(200).json({message: 'Appointment updated successfully!'});
    } catch (err){
        res.status(500).json({error: 'Failed to update appointment!'});
    }
})

// Delete appointment
app.delete('/appointments/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(
            `UPDATE Appointments SET status = 'cancelled' WHERE id = ? AND patient_id = ?`,
            [id, req.session.patientId]
        );
        res.status(200).json({ message: 'Appointment canceled successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel appointment.' });
    }
});


app.get('/patient/profile', isAuthenticated, async (req, res) => {
    try{
        const [rows] = await database.query(`SELECT first_name, last_name, phone_number, date_of_birth, gender, address FROM Patients WHERE id = ?`, [req.session.patientId]);
        if (rows.length === 0){
            return res.status(404).json({error: 'Profile not found!'});
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Error during profile retrieval: ', err);
        return res.status(500).json({error: 'Failed to retrieve profile!'});
    }
});


app.put('/profile', isAuthenticated, async (req, res) => {
    const {first_name, last_name, phone_number, date_of_birth, gender, address} = req.body;
    try{
        await database.query(`UPDATE Patients SET first_name = ?, last_name = ?, phone_number = ?, date_of_birth = ?, gender = ?, address = ?`,
            [first_name, last_name, phone_number, date_of_birth, gender, address]);
        res.status(200).json({message: 'Profile updated successfully!'});
    } catch (err) {
        console.error('Error during profile update: ', err);
        res.status(500).json({error: 'Failed to update profile'});
    }
});



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});