const express = require('express');
const maraidb = require('mariadb');
const moment = require('moment');
const bodyParser = require('body-parser');

const db_login = require('./database_login.json');

var pool = maraidb.createPool({
  host: db_login.host,
  user: db_login.user,
  password: db_login.password,
  database: db_login.database,
  connectionLimit: 20
});

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
const port = 3000;

function checkCode(code) {
  return new Promise((res, rej) => {
    pool.getConnection()
    .then(conn => {
        conn.query(`select start_time,end_time,number_people from accesscode where code = ${code}`)
        .then((rows) => {
            if (rows[0].number_people <= 0 ||
                (rows[0].start_time >= Date.now() &&
                rows[0].end_time <= Date.now())) {
                res(false);
            } else {
                console.log(Date.now());
                return conn.query(`update accesscode set number_people = ${rows[0].number_people - 1} where code = ${code}`)
                
            }
            conn.end();
        })
        .then(rows => {
            res(true);
        })
        .catch(err => res(false)) // if an error, just say the code is not valid
    })
    .catch(err => res(false));
  })

  // First, check for number of tries remaining
  // SELECT numTriesRemaining FROM accessCodes WHERE accessCode = code
  // if (result = 0 || result ISNULL) {
  // Either prompt that access code is invalid or simply guide them
  // to the form without access code
  // }

  // At this point, we know that the access code exists
  // Now, check that access code has not been expired
  // SELECT expirationDate FROM accessCodes WHERE accessCode = code
  // if (currDate > result) {
  // Access code has expired. Decide whether to tell them
  // code is expired or to simply guide to form without access code
  // }

  // If it gets to this point, access code is valid and can be used
  // So, we need to update the database to record this use of the access code
  // UPDATE accessCodes SET numTriesRemaining -= 1 WHERE accessCode = code

  // Prompt them to fill out the survey.
}

// Generate a unique code
function createCode() {}

// pool.getConnection()
// .then(conn => {
//     // console.log('Connection:', conn);
//     conn.query(`INSERT INTO accesscode value(12, 12, 12, ${(new
//     Date()).getTime()}, ${(new Date()).getTime()}, 1)`) .then(completion => {
//         console.log('Success:', completion);
//     })
//     .catch(err => console.log(err));
// })
// .catch(err => console.log(err));

// pool.getConnection()
// .then(conn => {
//     // console.log('Connection:', conn);
//     conn.query(`INSERT INTO accesscode value(12, 12, 12,
//     ${(moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'))},
//     ${moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')}, 1)`)
//     .then(completion => {
//         console.log('Success:', completion);
//     })
//     .catch(err => console.log(err));
// })
// .catch(err => console.log(err));


function createCode() {
  return String(Math.random());
}

app.post('/api/checkAccessCodeValidity', (req, response) => {
  checkCode(req.body.accessCode)
      .then(isValid => {
        console.log(isValid);
        response.json({isValid: isValid})
      })
      .catch(err => {
          response.status(500);
        console.log(err);
      });
});

app.post('/api/createevent', (req, res) => {
  console.log('Creating event..');
  var e = req.body;
  var eventAccessCode = createCode();

  console.log(e);

  pool.getConnection()
      .then(conn => {
            conn.query(
                    'INSERT INTO accesscode value (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                    null, eventAccessCode, e.userId, e.startDate, e.endDate, e.numPeople,
                    e.numPeople, e.name, e.type
                    ])
                .then(result => {
                    console.log('result:', result);
                    res.json({accessCode: eventAccessCode});
                    conn.end();
                })
                .catch(err => console.log(err))
        })
      .catch(err => console.log(err));
});

app.post('/api/submitform',(req, res) => {
    var d = req.body;

    var queryParams = [null, d.identification, 
        d.ageRange, d.gender, 
        d.country, d.language, 
        d.employmentStatus, d.discipline, 
        d.accessCode || '', d.valid || 'false', 
        d.sensitivity, d.selfCensoredFrequency,
        d.othersCensoredFrequency, d.advisedFrequency,
        d.primarySourceConsequences, d.experienceRelatiation,
        d.awareOthersRetaliation, d.chanceOfSelfSensor,
    ];

    pool.getConnection()
    .then(conn => {
        conn.query('INSERT into users value (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', queryParams)
        .then(() => {
            res.json({ success: true });
            conn.end();
        })
        .catch(err => {
            console.log(err);
            res.status(500)
        })
    })
    .catch(err => {
        console.log(err);
        res.status(500)
    })
})

// Data Analytics
app.get('/api/getunvalidated', (req, res) => {
    pool.getConnection()
    .then(conn => {
        conn.query("SELECT count(user_id), country from users where code_flag = 'false' group by country")
        .then(rows => {
            res.json({data: rows});
        })

        conn.end();
    })
});

app.get('/api/getvalidated', (req, res) => {
    pool.getConnection()
    .then(conn => {
        conn.query("SELECT count(user_id), country from users where code_flag = 'true' group by country")
        conn.end();
    })
});

app.get('/api/latestresponses', (req, res) => {
    // Query
    pool.getConnection()
    .then(conn => {
        conn.query('SELECT * FROM users ORDER BY user_id DESC LIMIT 5')
        .then(rows => {
            res.json({ data: rows });
            conn.end();
        })
        .catch(err => {
            res.status(500);
            console.log("ERROR getting latest responses:", err);
            conn.end();
        });
    })
});

app.get('/api/demographicsdata', (req, res) => {
    pool.getConnection()
    .then(conn => {
        conn.query("SELECT count(user_id), gender from users group by gender")
        .then(rows => {
            res.json({ data: rows });
            conn.end();
        })
    })
});

app.get('/api/geteventsdata', (req, res) => {
    pool.getConnection()
    .then(conn => {
        conn.query('SELECT * from accesscode')
        .then(rows => {
            res.json({ data: rows });
            conn.end();
        })
        .catch(err => res.status(500));
    })
    .catch(err => res.status(500));
});

app.use(express.static('FrontEnd'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))