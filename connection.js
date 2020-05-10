var mysql = require('mysql');

var dbConfig = {
  host: 'host',
  user: 'user',
  password: 'password',
  database: 'database'
};

var connection = mysql.createConnection(dbConfig);

module.exports = connection;