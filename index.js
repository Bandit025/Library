var express = require('express');
var mqtt = require('mqtt');
var app = express();
var client = mqtt.connect('mqtt://172.16.8.26');
const mysql = require('mysql2');
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.send('<button onclick="location.href=\'/moveServo1\'">Move Servo 1</button><br><button onclick="location.href=\'/moveServo2\'">Move Servo 2</button>');
});

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'library_door'
});

connection.connect(error => {
  if (error) {
    console.error('Error connecting to the database:', error);
    return;
  }
  console.log('Connected to the database');
});

client.on('connect', function () {
  const topics = ['home/QR_in', 'home/sensor_in', 'home/sensor_out', 'home/QR_out'];
  topics.forEach(topic => {
    client.subscribe(topic, function (err) {
      if (err) {
        console.error(`Failed to subscribe to topic ${topic}:`, err);
      } else {
        console.log(`Subscribed to ${topic}`);
      }
    });
  });
});

client.on('message', function (topic, message) {
  const receivedMessage = message.toString();

  if (topic === 'home/QR_in') {
    handleQRIn(receivedMessage);
  } else if (topic === 'home/QR_out') {
    handleQROut(receivedMessage);
  } else if (topic === 'home/sensor_in') {
    handleSensorIn(receivedMessage);
  } else if (topic === 'home/sensor_out') {
    handleSensorOut(receivedMessage);
  }
});

const handleQRIn = async (studentId) => {
  const uid = "gate";
  const secret = "x00irMSat$lP";

  const getLibraryDataAPI = async (id) => {
    // Dynamically import the ES Module
    const { OTP } = await import('rutsotp');
    const otp = await OTP(secret);
    const response = await fetch(`https://api.rmutsv.ac.th/library/getdata/${id}/${uid}/${otp}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  try {
    const data = await getLibraryDataAPI(studentId);
    const checkSql = "SELECT * FROM library WHERE bib = ?";
    connection.query(checkSql, [studentId], async function (err, result) {
      if (err) throw err;

      if (result.length > 0) {
        console.log("คุณอยู่ในห้องสมุด");
        client.publish('home/door', '0');
      } else {
        if (!data || !data.firstname || !data.lastname || !data.faccode || !data.facname || !data.depcode || !data.depname || !data.seccode || !data.secname || !data.email) {
          console.log("ไม่พบข้อมูล");
          return;
        }

        console.log("status:    " + data.status);
        console.log("type:      " + data.type);
        console.log("ชื่อ:        " + data.firstname);
        console.log("สกุล:       " + data.lastname);
        console.log("รหัสคณะ:    " + data.faccode);
        console.log("ชื่อคณะ:     " + data.facname);
        console.log("รหัสสาขา:   " + data.depcode);
        console.log("ชื่อสาขา:    " + data.depname);
        console.log("รหัสหลักสูตร: " + data.seccode);
        console.log("ชื่อหลักสูตร:  " + data.secname);
        console.log("email:     " + data.email);

        client.publish('home/door', '90');

        let dataSaved = false;

        client.on('message', (topic, message) => {
          if (topic === 'home/sensor_in' && message.toString() === '0' && !dataSaved) {
            const sql = "INSERT INTO walk_in (bib, fname, lname, faculty_name, branch_name, course_name) VALUES ?";
            const values = [
              [studentId, data.firstname, data.lastname, data.facname, data.depname, data.secname]
            ];
            connection.query(sql, [values], function (err, result) {
              if (err) throw err;
              console.log("บันทึกข้อมูล walk_in");

              const sql2 = "INSERT INTO library (bib, fname, lname, faculty_name, branch_name, course_name) VALUES ?";
              const values2 = [
                [studentId, data.firstname, data.lastname, data.facname, data.depname, data.secname]
              ];
              connection.query(sql2, [values2], function (err, result) {
                if (err) throw err;
                console.log("บันทึกข้อมูล library");
                dataSaved = true;
              });
            });
            client.publish('home/door', '0');
          }
        });

        setTimeout(() => {
          client.publish('home/door', '0');
        }, 10000);
      }
    });
  } catch (e) {
    console.log(e);
  }
};

const handleQROut = async (studentIdOut) => {
  const uid = "gate";
  const secret = "x00irMSat$lP";

  const getLibraryDataAPI = async (id) => {
    // Dynamically import the ES Module
    const { OTP } = await import('rutsotp');
    const otp = await OTP(secret);
    const response = await fetch(`https://api.rmutsv.ac.th/library/getdata/${id}/${uid}/${otp}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  try {
    const data = await getLibraryDataAPI(studentIdOut);
    const checkSql = "SELECT * FROM library WHERE bib = ?";
    connection.query(checkSql, [studentIdOut], async function (err, result) {
      if (err) throw err;

      if (result.length === 0) {
        console.log("คุณอยู่นอกห้องสมุด");
        client.publish('home/door', '0');
      } else {
        if (!data || !data.firstname || !data.lastname || !data.faccode || !data.facname || !data.depcode || !data.depname || !data.seccode || !data.secname || !data.email) {
          console.log("ไม่พบข้อมูล");
          return;
        }

        console.log("status:    " + data.status);
        console.log("type:      " + data.type);
        console.log("ชื่อ:        " + data.firstname);
        console.log("สกุล:       " + data.lastname);
        console.log("รหัสคณะ:    " + data.faccode);
        console.log("ชื่อคณะ:     " + data.facname);
        console.log("รหัสสาขา:   " + data.depcode);
        console.log("ชื่อสาขา:    " + data.depname);
        console.log("รหัสหลักสูตร: " + data.seccode);
        console.log("ชื่อหลักสูตร:  " + data.secname);
        console.log("email:     " + data.email);

        client.publish('home/door', '90');
        let dataSaved = false;

        client.on('message', (topic, message) => {
          if (topic === 'home/sensor_out' && message.toString() === '0' && !dataSaved) {
            const sql = "INSERT INTO walk_out (bib, fname, lname, faculty_name, branch_name, course_name) VALUES ?";
            const values = [
              [studentIdOut, data.firstname, data.lastname, data.facname, data.depname, data.secname]
            ];
            connection.query(sql, [values], function (err, result) {
              if (err) throw err;
              console.log("บันทึกข้อมูล walk_out");
            });

            const sql2 = "DELETE FROM library WHERE bib = ?";
            connection.query(sql2, [studentIdOut], function (err, result) {
              if (err) throw err;
              console.log("นำข้อมูล library ออก");
              dataSaved = true;
            });

            client.publish('home/door', '0');
          }
        });

        setTimeout(() => {
          client.publish('home/door', '0');
        }, 10000);
      }
    });
  } catch (e) {
    console.log(e);
  }
};

const handleSensorIn = (sensorValue) => {
  // ไม่แสดงค่าใน console.log
};

const handleSensorOut = (sensorValue) => {
  // ไม่แสดงค่าใน console.log
};

client.on('error', function (error) {
  console.error('Failed to connect to MQTT broker:', error);
});

app.get('/moveServo1', function (req, res) {
  client.publish('home/door', '0');
  res.redirect('/');
});

app.get('/moveServo2', function (req, res) {
  client.publish('home/door', '90');
  res.redirect('/');
});

app.get('/api/library-count', (req, res) => {
  connection.query('SELECT COUNT(*) AS count FROM library', (error, results) => {
    if (error) throw error;
    res.json(results[0]);
  });
});

app.get('/api/library-count-day', (req, res) => {
  connection.query('SELECT COUNT(*) AS unique_count FROM ( SELECT fname, lname FROM walk_in WHERE DATE(create_at) = CURDATE() GROUP BY fname, lname) AS unique_walk_ins;', (error, results) => {
    if (error) throw error;
    res.json(results[0]);
  });
});

app.get('/data', (req, res) => {
  connection.query('SELECT * FROM library;', (err, results) => {
    if (err) {
      console.error('Error fetching data from the database:', err);
      res.status(500).send('Error fetching data from the database.');
      return;
    }
    res.json(results);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'search.html'));
});

app.post('/search', (req, res) => {
  const date = req.body.date;
  const sql = 'SELECT * FROM walk_in WHERE DATE(create_at) = ? ORDER BY create_at ASC';
  
  connection.query(sql, [date], (error, results) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).send('Server error');
      return;
    }
    res.json(results);
  });
});

app.post('/search/walk_out', (req, res) => {
  const dateSearchValue = req.body.date;
  const query = `
      SELECT * 
      FROM walk_out 
      WHERE DATE(create_at) = ? 
      ORDER BY create_at ASC
  `;
  connection.query(query, [dateSearchValue], (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(results);
  });
});

app.post('/search/walk_in-select', (req, res) => {
  const dateSearchValue = req.body.date;
  const query = `
      SELECT COUNT(*) AS unique_count FROM (
          SELECT fname, lname 
          FROM walk_in 
          WHERE DATE(create_at) = ? 
          GROUP BY fname, lname
      ) AS unique_walk_ins;
  `;
  connection.query(query, [dateSearchValue], (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(results);
  });
});

app.listen(3000, function () {
  console.log('Server is listening on port 3000');
});
