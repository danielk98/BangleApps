/**
 * @type {BluetoothRemoteGATTServer}
 */
var gatt;

/**
 * @type {BluetoothRemoteGATTService}
 */
var service;

let isStarted = false; //tracks first button press and switches button function
let isStopped = false; //true when button is pressed a 2nd time, stops datatransmission


const sampleRate = 25;

/* eSense sensor data
columns (0-3): cmd, packetIndex, checksum, size
columns (4-5): gyro-x_msb, gyro-x_lsb
columns (6-7): gyro-y_msb, gyro-y_lsb
columns (8-9): gyro-z_msb, gyro-z_lsb
columns (10-11): accl-x_msb, accl-x_lsb
columns (12-13): accl-y_msb, accl-y_lsb
columns (14-15): accl-z_msb, accl-z_lsb
*/

function cleanFiles() {
  require("Storage").open("eSenseGyros.csv", "r").erase();
  require("Storage").open("eSenseGyrosMag.csv", "r").erase();
  require("Storage").open("eSenseAccel.csv", "r").erase();
  require("Storage").open("eSenseAccelMag.csv", "r").erase();
  require("Storage").open("bangleAccel.csv", "r").erase();
  require("Storage").open("bangleAccelMag.csv", "r").erase();
}

// Create/Open the file in append mode
//let eSenseData = require("Storage").open("eSenseData.csv","a");
let eSenseGyros = require("Storage").open("eSenseGyros.csv","a");
let eSenseGyrosMag = require("Storage").open("eSenseGyrosMag.csv","a");
let eSenseAccel = require("Storage").open("eSenseAccel.csv","a");
let eSenseAccelMag = require("Storage").open("eSenseAccelMag.csv","a");
let bangleAccel = require("Storage").open("bangleAccel.csv", "a");
let bangleAccelMagnitude = require("Storage").open("bangleAccelMag.csv", "a");

function connectToESense() {
  NRF.requestDevice({
    filters: [{
      namePrefix: 'eSense'
    }]
  }).then(function(device) {
    return device.gatt.connect();
  }).then(function(g) {
    console.log("Connected to eSense");
    gatt = g;
    // Get general eSense BLE service
    return gatt.getPrimaryService("0xFF06");
  }).then(function(s) {
    console.log("Found primary service");
    service = s;
    // IMU sensor config characterisic
    return service.getCharacteristic("0xFF07");
  }).then(function(c) {
    console.log("Found config character");
    // Activate IMU sensor and set sampling rate
    return c.writeValue([83, 28, 2, 1, 25]);
  }).then(function() {
    console.log("Set sampling rate");
    // Characteristic to receive sensor data
    return service.getCharacteristic("0xFF08");
  }).then(function(c) {
    console.log("Found sensor character");
    // Set listener for eSense notifications
    counter = 0;
    // start Bangle Acclerometer
    startUpAccel();
    console.log("Starting Listener for IMU sensor data");
    c.on('characteristicvaluechanged', function(event) {
      let data = [].slice.call(event.target.value.buffer);
      console.log("eSense: " + data);
      //eSenseData.write(data.join(",")+"\n");
      let accl_x = combineBytes(data[10], data[11]);
      let accl_y = combineBytes(data[12], data[13]);
      let accl_z = combineBytes(data[14], data[15]);
      eSenseAccel.write("" + accl_x + "," + accl_y + "," + accl_z + "\n");
      saveSensorDataMagnitude(eSenseAccelMag, accl_x, accl_y, accl_z);
      let gyro_x = combineBytes(data[4], data[5]);
      let gyro_y = combineBytes(data[6], data[7]);
      let gyro_z = combineBytes(data[8], data[9]);
      eSenseGyros.write("" + gyro_x + "," + gyro_y + "," + gyro_z + "\n");
      saveSensorDataMagnitude(eSenseGyrosMag, gyro_x, gyro_y, gyro_z);
      if (isStopped){c.stopNotifications();}
    });
    return c.startNotifications();
  }).catch(function(){
    console.log("Notification Error");
  });
}

function saveSensorDataMagnitude(file, x, y, z) {
  let val = x*x + y*y + z*z;
  let magnitude = Math.sqrt(val);
  file.write(magnitude + "\n");
  return magnitude;
}

/**
 * Calculate value from most significant and least significant byte
 * @param {number} msb 
 * @param {number} lsb 
 * @returns {number}
 */
function combineBytes(msb, lsb) {
  let msblsb = msb << 8 | lsb;
  return msblsb;
}

//Start the app by pressing BTN1
setWatch(() => {
  //On first button press, Bangle connects to eSense and starts sending data.
  if (!isStarted) {
    //cleanFiles();
    connectToESense();
    isStarted = true;
    console.log("BTN 1 pressed: Start up");
  }
  //On second button press, the data transmission is stopped. 
  else {
    isStopped = true;
    stopAccel();
    console.log("BTN 1 pressed again: Stop notifications");
  }
}, BTN1, {
  repeat: true
});

function accelHandler(value) {
  console.log( "Bangle: " + "x: " + value.x + " y: " + value.y + " z:" + value.z + " Mag: " + value.mag + " Diff: " + value.diff);
  bangleAccel.write("" + value.x + "," + value.y + "," + value.z + "\n");
  bangleAccelMagnitude.write(value.mag + "\n");
}

function accelConfig(hz,gs) {
  switch (hz) { case 12.5: KI_HZ = 0x00; break; // 12.5 Hz
    case 25: KI_HZ = 0x01; break; // 25 Hz
    case 50: KI_HZ = 0x02; break; // 50 Hz
    case 100: KI_HZ = 0x03; break; // 100 Hz
  }
    switch (gs) { case 2: KI_GS = 0x00; break; // sensitivity = +/-2g
    case 4: KI_GS = 0x08; break; // sensitivity = +/-4g
    case 8: KI_GS = 0x10; break; // sensitivity = +/-8g
  }
  Bangle.accelWr(0x18,0b01101100); // CNTL1off,lowp,4g,TDTE,noWakeup,noTilt
  Bangle.accelWr(0x1B,hz | 0x40); // hz output frequency, ODR/2 filter
  Bangle.accelWr(0x18,0b11100100|gs); // CNTL1on,lowp,gs,TDTE,noWakeup,noTilt
}


function startUpAccel() {
  let hz = 50;
  let gs = 2;
  accelConfig(hz, gs);
  Bangle.setPollInterval((1000/hz));
  Bangle.on('accel',accelHandler);
}

function stopAccel() {
  Bangle.on('accel', () => {});
  Bangle.softOff();
}
