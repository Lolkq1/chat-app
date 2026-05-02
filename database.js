const mysql = require('mysql2/promise')

    const conn = mysql.createConnection({
    user: process.env.USER,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: 3306
    })  
    module.exports = conn
