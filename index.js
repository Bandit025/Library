var express = require('express');
var mqtt = require('mqtt');
var app = express();

var client = mqtt.connect('mqtt://172.16.8.26');
app.use(express.json());
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.send('<button onclick="location.href=\'/moveServo1\'">Move Servo 1</button><br><button onclick="location.href=\'/moveServo2\'">Move Servo 2</button>');
});

const mysql = require('mysql2');

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

client.on('message', function (topic, message) {
  var sensorValue = message.toString();

  if (topic === 'home/sensor_in') {
    var sensorInValue = sensorValue;
    // console.log('Sensor value from home/sensor_in: ', sensorInValue);
  } else if (topic === 'home/sensor_out') {
    var sensorOutValue = sensorValue;
    // console.log('Sensor value from home/sensor_out: ', sensorOutValue);
  }
});

client.on('connect', function () {
  client.subscribe('home/QR_in', function (err) {
    if (!err) {
      console.log('Subscribed to home/QR_in');
    }
  });
  client.subscribe('home/sensor_in', function (err) {
    if (err) {
      console.error('Failed to subscribe to topic:', err);
    }
  });
  client.subscribe('home/sensor_out', function (err) {
    if (err) {
      console.error('Failed to subscribe to topic:', err);
    }
  });
});

client.on('message', function (topic, message) {
  const receivedTopic = topic;
  const receivedMessage = message.toString();

  if (receivedTopic === 'home/QR_in') {
    const studentId = receivedMessage;

    const uid = "gate";
    const secret = "x00irMSat$lP";
    const otpsize = 32;

    const getTimex = () => {
      const timenow = new Date();
      var [date, month, year] = [timenow.getDate(), timenow.getMonth() + 1, timenow.getFullYear()];
      var [hour, minute, second] = [timenow.getHours(), timenow.getMinutes(), timenow.getSeconds()];
      if (month < 10) {
        month = "0" + month;
      }
      if (date < 10) {
        date = "0" + date;
      }
      if (hour < 10) {
        hour = "0" + hour;
      }
      if (minute < 10) {
        minute = "0" + minute;
      }
      if (second < 10) {
        second = "0" + second;
      }
      return year + "-" + month + "-" + date + "T" + hour + ":" + minute + ":" + second;
    }

    const OTP = (secret, size) => {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha512', getTimex());
      return hmac.update(secret).digest('hex').slice(0, size * 2);
    }

    const getLibraryDataAPI = async (id) => {
      const data = await fetch("https://api.rmutsv.ac.th/library/getdata/" + id + "/" + uid + "/" + OTP(secret, otpsize));
      return await data.json();
    }

    (async () => {
      try {
        const data = await getLibraryDataAPI(studentId);
        const checkSql = "SELECT * FROM library WHERE bib = ?";
        connection.query(checkSql, [studentId], async function (err, result) {
          if (err) throw err;

          // If studentId exists, stop the servo motor
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

            client.publish('home/door', '90'); // Change this to the desired angle

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

                    // หยุดการทำงานทันทีหลังจากการ insert ข้อมูลสำเร็จ
                    return; // หรือใช้ process.exit() ถ้าต้องการหยุดโปรเซสทั้งหมด
                  });
                });
                client.publish('home/door', '0');
              }
            });

            setTimeout(() => {
              client.publish('home/door', '0'); // Rotate back to 0 degrees after 10 seconds
            }, 10000);
          }
        });
      } catch (e) {
        console.log(e);
      }
    })();
  }
});


// ......ทางออก.................ทางออก...............ทางออก.............................

 
client.on('connect', function () {
  client.subscribe('home/QR_out', function (err) {
    if (!err) {
      console.log('Subscribed to home/QR_out');
    }
  });
  client.subscribe('home/sensor_in', function (err) {
    if (!err) {
      // Subscribed to home/sensor_in
    }
  });
  client.subscribe('home/sensor_out', function (err) {
    if (!err) {
      // Subscribed to home/sensor_out
    }
  });
});

client.on('message', function (topic, message) {
  const receivedTopic = topic;
  const receivedMessage = message.toString();

  if (receivedTopic === 'home/QR_out') {
    const studentIdOut = receivedMessage;
    console.log(`Student ID Out: ${studentIdOut}`); // Log the received studentIdOut

    const uid = "gate";
    const secret = "x00irMSat$lP";
    const otpsize = 32;

    const getTimex = () => {
      const timenow = new Date();
      var [date, month, year] = [timenow.getDate(), timenow.getMonth() + 1, timenow.getFullYear()];
      var [hour, minute, second] = [timenow.getHours(), timenow.getMinutes(), timenow.getSeconds()];
      if (month < 10) {
        month = "0" + month;
      }
      if (date < 10) {
        date = "0" + date;
      }
      if (hour < 10) {
        hour = "0" + hour;
      }
      if (minute < 10) {
        minute = "0" + minute;
      }
      if (second < 10) {
        second = "0" + second;
      }
      return year + "-" + month + "-" + date + "T" + hour + ":" + minute + ":" + second;
    }

    const OTP = (secret, size) => {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha512', getTimex());
      return hmac.update(secret).digest('hex').slice(0, size * 2);
    }

    const getStudentDataAPI = async (id) => {
      const data = await fetch("https://api.rmutsv.ac.th/library/getdata/" + id + "/" + uid + "/" + OTP(secret, otpsize));
      return await data.json();
    }

    (async () => {
      try {
        const data = await getStudentDataAPI(studentIdOut);
        const checkSql = "SELECT * FROM library WHERE bib = ?";
        connection.query(checkSql, [studentIdOut], async function (err, result) {
          if (err) throw err;

          // If studentId exists, stop the servo motor
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

            // Open the door
            client.publish('home/door', '90'); // Change this to the desired angle
            let dataSaved = false;

            client.on('message', (topic, message) => {
              if (topic === 'home/sensor_out' && message.toString() === '0' && !dataSaved) {
                const sql = "INSERT INTO walk_out (bib,fname, lname,  faculty_name,  branch_name,  course_name) VALUES ?";
                const values = [
                  [studentIdOut, data.firstname, data.lastname, data.facname, data.depname, data.secname]
                ];
                connection.query(sql, [values], function (err, result) {
                  if (err) throw err;
                  console.log("บันทึกข้อมูล walk_out");
                });

                const sql2 = "DELETE FROM library WHERE bib = ?";
                const values2 = [studentIdOut];
                connection.query(sql2, [values2], function (err, result) {
                  if (err) throw err;
                  console.log("นำข้อมูล library ออก");
                  dataSaved = true;
                });

                client.publish('home/door', '0');
              }
            });

            setTimeout(() => {
              client.publish('home/door', '0'); // Rotate back to 0 degrees after 10 seconds
            }, 10000);
          }
        });
      } catch (e) {
        console.log(e);
      }
    })();
  }
});


client.on('error', function (error) {
  console.error('Failed to connect to MQTT broker:', error);
});

app.get('/moveServo1', function (req, res) {
  client.publish('home/door', '0');
  res.redirect('/');
});

app.get('/moveServo2', function (req, res) {
  client.publish('home/door', '90')
  res.redirect('/');
});


client.on('connect', function () {
  console.log('Connected to MQTT broker');
});


app.get('/api/library-count', (req, res) => {
  connection.query('SELECT COUNT(*) AS count FROM library', (error, results, fields) => {
    if (error) throw error;
    res.json(results[0]);
  });
});

app.get('/api/library-count-day', (req, res) => {
  connection.query('SELECT COUNT(*) AS unique_count FROM ( SELECT fname, lname FROM walk_in WHERE DATE(create_at) = CURDATE() GROUP BY fname, lname) AS unique_walk_ins;', (error, results, fields) => {
    if (error) throw error;
    res.json(results[0]);
  });
});

//แสดงจำนวนคนในห้องสมุด
app.get('/data', (req, res) => {
  connection.query('SELECT * FROM library ;', (err, results, fields) => {
    if (err) {
      console.error('Error fetching data from the database:', err);
      res.status(500).send('Error fetching data from the database.');
      return;
    }
    res.json(results);
  });
});


// รับข้อมูลจาก search 


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
    res.json(results); // ตรวจสอบว่าผลลัพธ์เป็นอาร์เรย์
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
    res.json(results); // ตรวจสอบว่าผลลัพธ์เป็นอาร์เรย์
  });
});


app.listen(3000, function () {
  console.log('Server is listening on port 3000');
}); 