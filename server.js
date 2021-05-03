const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});
const sqlite3 = require('sqlite3').verbose();

var mqtt = require('mqtt')
var client  = mqtt.connect('mqtt://192.168.0.3')
let workout = null;

let db = new sqlite3.Database('./db/exercise.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the exercise database.');
});

db.run(`CREATE TABLE IF NOT EXISTS HeartRate(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workoutId INTEGER,
        heartRate INTEGER,
        timestamp DATETIME,
        person INTEGER
        )
`)

db.run(`CREATE TABLE IF NOT EXISTS Speed(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workoutId INTEGER,
        speed FLOAT,
        timestamp DATETIME,
        person INTEGER
        )
`)

db.run(`CREATE TABLE IF NOT EXISTS workouts(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        startTime DATETIME,
        endTime DATETIME,
        person INTEGER
        )
`)

db.run(`INSERT INTO workouts(startTime, person) VALUES (?,?)`, [new Date(), 0], function(err) {
    if (err) {
        return console.log(err.message);
    }
    // get the last insert id
    workout = this.lastID;
})

client.on('connect', function () {
    client.subscribe('bike/#')
})

client.on('message', function (topic, message) {
        // message is Buffer
        console.log("received message")
        console.log(message.toString(), topic)
        if (topic === "bike/heartRate") {
            let heartRate = JSON.parse(message.toString())
            console.log(heartRate)
            io.emit('hb', heartRate['heartRate'])
            db.run(`INSERT INTO HeartRate(workoutId, heartRate, timestamp, person) VALUES (?,?,?,?)`,
                [workout, heartRate['heartRate'], new Date(), 0]), function (err) {
                if (err) {
                    return console.log(err.message);
                }
                // get the last insert id
                console.log(this.changes)
            }
        } else {
            if(topic == "bike/speed") {
                let speed = JSON.parse(message.toString())
                console.log(speed)
                io.emit('speed', speed['rpm'])
            }
        }
    }
)


io.on('connection', (socket) => {
    console.log('a user connected');
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});