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

/* Create the file in append mode
columns (1-4): cmd, packetIndex, checksum, size
columns (5-6): gyro-x_msb, gyro-x_lsb
columns (7-8): gyro-y_msb, gyro-y_lsb
columns (9-10): gyro-z_msb, gyro-z_lsb
columns (11-12): accl-x_msb, accl-x_lsb
columns (13-14): accl-y_msb, accl-y_lsb
columns (15-16): accl-z_msb, accl-z_lsb
*/
var file = require("Storage").open("eSenseData.csv","a");

function connectToESense() {
  NRF.requestDevice({
    filters: [{
      namePrefix: 'eSense'
    }]
  }).then(function(device) {
    return device.gatt.connect();
  }).then(function(g) {
    console.log("Connected");
    gatt = g;
    return gatt.getPrimaryService("0xFF06");
  }).then(function(s) {
    service = s;
    return service.getCharacteristic("0xFF07");
  }).then(function(c) {
    return c.writeValue([83, 13, 2, 1, 10]);
  }).then(function() {
    return service.getCharacteristic("0xFF08");
  }).then(function(c) {
    counter = 0;
    c.on('characteristicvaluechanged', function(event) {
  //console.log("-> ",event.target.value);
      var csv = [].slice.call(event.target.value.buffer);
      console.log(csv);
      file.write(csv.join(",")+"\n");
      if (isStopped){c.stopNotifications();}
    });
    return c.startNotifications();
  }).catch(function(){
    console.log("Notification Error");
  });
}

function clearCsvFile(fileName){
  require("Storage").open(fileName, "w");
  console.log("Overwrite: " + fileName);
}

function combineBytes(msb, lsb) {
  let msblsb = msb << 8 | lsb;
  return msblsb;
}

function startUp(){
  connectToESense();
  g.drawString("Connected");
}

function readData(filename) {
  let data = require("Storage").read(filename, 0, -1);
  let lines = data.split("\n");

  // open files for write:
  let file_gyro_x = require("Storage").open("gyro_x.csv", "a");
  let file_gyro_y = require("Storage").open("gyro_y.csv", "a");
  let file_gyro_z = require("Storage").open("gyro_z.csv", "a");
  let file_accl_x = require("Storage").open("accl_x.csv", "a");
  let file_accl_y = require("Storage").open("accl_y.csv", "a");
  let file_accl_z = require("Storage").open("accl_z.csv", "a");

  for (let line of lines) {
    if (line.length === 0) {continue;}
    let line_d = line.split(",");
    let gyro_x = combineBytes(line_d[4], line_d[5]);
    file_gyro_x.write(gyro_x + "\n");
    let gyro_y = combineBytes(line_d[6], line_d[7]);
    file_gyro_y.write(gyro_y + "\n");
    let gyro_z = combineBytes(line_d[8], line_d[9]);
    file_gyro_z.write(gyro_z + "\n");

    let accl_x = combineBytes(line_d[10], line_d[11]);
    file_accl_x.write(accl_x + "\n");
    let accl_y = combineBytes(line_d[12], line_d[13]);
    file_accl_y.write(accl_y + "\n");
    let accl_z = combineBytes(line_d[14], line_d[15]);
    file_accl_z.write(accl_z + "\n");
  }
  console.log("completed!");
}

function cleanFiles() {
  require("Storage").open("gyro_x.csv", "r").erase();
  require("Storage").open("gyro_y.csv", "r").erase();
  require("Storage").open("gyro_z.csv", "r").erase();
  require("Storage").open("accl_x.csv", "r").erase();
  require("Storage").open("accl_y.csv", "r").erase();
  require("Storage").open("accl_z.csv", "r").erase();
}

//cleanFiles();
//readData("eSenseData10Hz.csv");

//Start the app by pressing BTN1
setWatch(() => {
  //On first button press, Bangle connects to eSense and starts sending data.
  if (!isStarted) {
    startUpAccel();
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

let f = require("Storage").open("bangle_accel.csv", "a");

function accelHandler(a) {
  console.log( "x:"+a.x+" y:"+a.y+" z:"+a.z ); // a.mag and a.diff not used
  f.write("" + a.x + "," + a.y + "," + a.z + "\n");
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
  let hz = 12.5;
  let gs = 8;
  accelConfig(hz, gs);
  Bangle.setPollInterval((1000/hz));
  Bangle.on('accel',accelHandler);
}

function stopAccel() {
  Bangle.off();
}
