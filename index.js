const express = require('express');
const app = express();
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const sessions = require('express-session');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const PORT = 4000;

let connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'login-api'
});

connection.connect();

const oneDay = 1000 * 60 * 60 * 24;

app.use(cors());

app.use(
    sessions({
        secret: 'PrZgiqnpdLHjHpkMJfZLAbjklDoubQzo',
        saveUninitialized: true,
        cookie: { maxAge: oneDay },
        resave: false
    })
);

app.use(cookieParser());

app.get('/', (req, res) => {
    connection.query(
        `SELECT * FROM sessions WHERE sessionid = '${req.cookies.session}'`,
        (error, results, fields) => {
            if (typeof results[0] != 'undefined') {
                connection.query(
                    `SELECT * FROM users WHERE id = '${results[0].userid}'`,
                    (error, results, fields) => {
                        if (results[0].id) {
                            res.send('Logged in');
                        } else {
                            res.send('Not logged in');
                        }
                    }
                );
            } else {
                res.send('Not logged in');
            }
        }
    );
});

app.post('/register', (req, res) => {
    const username = req.header('username');
    const password = req.header('password');
    const email = req.header('email');

    bcrypt.hash(password, 10, function (err, hash) {
        connection.query(
            `INSERT INTO users (id, username, password, email) VALUES (NULL, '${username}', '${hash}', '${email}')`,
            function (error, results, fields) {
                if (error) throw error;

                res.send('Account created');
            }
        );
    });
});

app.post('/login', (req, res) => {
    const username = req.header('username').toLowerCase();
    const password = req.header('password');
    const email = req.header('email');

    connection.query(
        `SELECT * FROM users WHERE LOWER(username) = '${username}'`,
        (error, results, fields) => {
            bcrypt
                .compare(password, results[0].password)
                .then(() => {
                    let uuid = uuidv4().replaceAll('-', '');

                    connection.query(
                        `INSERT INTO sessions (sessionid, userid) VALUES ('${uuid}', '${results[0].id}')`
                    );

                    res.cookie('session', uuid, {
                        maxAge: oneDay,
                        httpOnly: true,
                        sameSite: 'strict'
                    }).send('User logged in');
                })
                .catch((error) => console.log(error));
        }
    );
});

app.get('/logout', (req, res) => {
    connection.query(
        `DELETE FROM sessions WHERE sessionid = '${req.cookies.session}'`,
        (error, results, fields) => {
            res.redirect('/');
        }
    );
});

app.listen(PORT, () => {
    console.log(`API is running on port ${PORT}`);
});
