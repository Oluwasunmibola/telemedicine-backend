const mysql = require('mysql2')

const database = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'telemedicine',
    port: 3306
});



// database.connect((err) => {
//     if(err){
//         console.log('Error connecting to database: ', err.stack)
//         return;
//     }
//     console.log('Successfully connected to database.');
// });

const promisePool = database.promise();
module.exports = promisePool;

