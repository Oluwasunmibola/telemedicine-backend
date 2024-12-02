const mysql = require('mysql2')

const database = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Sunmi2n6nf728%!',
    database: 'telemedicine'
})

const sqlCommands = [
    `
    CREATE TABLE IF NOT EXISTS Patients(
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone_number VARCHAR(15) NOT NULL,
        date_of_birth DATE NOT NULL,
        gender ENUM('Male', 'Female', 'Other'),
        address TEXT NOT NULL

    );`,

    `
    CREATE TABLE IF NOT EXISTS Doctors(
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        specialization VARCHAR(255) NOT NULL,
        phone_number VARCHAR(15) NOT NULL,
        schedule TEXT
    );
    `,

    `
    CREATE TABLE IF NOT EXISTS Appointments(
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT,
        doctor_id INT,
        appointment_date DATE,
        appointment_time TIME,
        status ENUM('pending', 'confirmed', 'cancelled'),
        FOREIGN KEY (patient_id) REFERENCES Patients(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES Doctors(id) ON DELETE CASCADE
    );
    `,

    `
    CREATE TABLE IF NOT EXISTS Admin(
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        password_hash VARCHAR(255),
        role ENUM('SuperAdmin', 'Moderator')
    );
    `,

    `
    INSERT INTO Patients (first_name, last_name, email, password_hash, phone_number, date_of_birth, gender, address)
    VALUES 
    ('John', 'Doe', 'john.doe@example.com', 'hashed_password1', '1234567890', '1990-01-15', 'Male', '123 Main St, City'),
    ('Jane', 'Smith', 'jane.smith@example.com', 'hashed_password2', '0987654321', '1985-07-22', 'Female', '456 Oak St, City')
    ON DUPLICATE KEY UPDATE id=id;
    `,

    `
    INSERT INTO Doctors (first_name, last_name, specialization, email, phone_number, schedule)
    VALUES 
    ('Alice', 'Johnson', 'Cardiology', 'alice.johnson@clinic.com', '1112223333', 'Mon-Fri: 9:00-17:00'),
    ('Bob', 'Williams', 'Dermatology', 'bob.williams@clinic.com', '4445556666', 'Tue-Thu: 10:00-15:00')
    ON DUPLICATE KEY UPDATE id=id;
    `,

    `
    INSERT INTO Appointments (patient_id, doctor_id, appointment_date, appointment_time, status)
    VALUES 
    (1, 1, '2024-11-27', '10:30:00', 'confirmed'),
    (2, 2, '2024-11-28', '14:00:00', 'pending')
    ON DUPLICATE KEY UPDATE id=id;
    `, 

    `
    INSERT INTO Admin (username, password_hash, role)
    VALUES 
    ('admin1', 'hashed_password3', 'SuperAdmin'),
    ('moderator1', 'hashed_password4', 'Moderator')
    ON DUPLICATE KEY UPDATE id=id;
    `
    
];
   

database.connect((err) => {
    if(err){
        console.log('Error connecting to database: ', err.stack)
        return;
    }
    console.log('Successfully connected to database.');
    sqlCommands.forEach((command) => {
        database.query(command, (err, results) => {
            if(err){
                console.log('Error executing SQL command: ', err.stack);
                return;
            }
            console.log('SQL command executed ssuccessfully.');
        });
    });

    database.end(() => {
        console.log('Database connection closed.');
    });
});