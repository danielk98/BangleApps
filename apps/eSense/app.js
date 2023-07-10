/** @type {BluetoothRemoteGATTServer} */
let gatt;
/** @type {BluetoothRemoteGATTService} */
let service;

/** @type {StorageFile} */
let bangleAccel;
/** @type {StorageFile} */
let eSenseAccel;
/** @type {StorageFile} */
let eSenseGyros;

let startedAt;

let isStopped = false; //true when button is pressed a 2nd time, stops datatransmission

let sampleRate = 25;
let counter = 0;

//NRF.setTxPower(4);
//NRF.setConnectionInterval({minInterval: 20, maxInterval: 100});
//NRF.setAdvertising({}, {interval: 20});

/* eSense sensor data
columns (0-3): cmd, packetIndex, checksum, size
columns (4-5): gyro-x_msb, gyro-x_lsb
columns (6-7): gyro-y_msb, gyro-y_lsb
columns (8-9): gyro-z_msb, gyro-z_lsb
columns (10-11): accl-x_msb, accl-x_lsb
columns (12-13): accl-y_msb, accl-y_lsb
columns (14-15): accl-z_msb, accl-z_lsb
*/

/**
 * @returns {Promise<BluetoothRemoteGATTServer>}
 */
function connectToESense() {
  return NRF.requestDevice({
    filters: [{
      namePrefix: 'eSense'
    }]
  })
  .then((device) => {
    return device.gatt.connect({minInterval:20, maxInterval:40});
  });
}

/**
 * @param {BluetoothRemoteGATTServer} server 
 */
function bondWithESense(server) {
  return server.startBonding()
    .then(() => {
      console.log("bonded: ", server.getSecurityStatus());
    });
}

/**
 * @param {BluetoothRemoteGATTServer} server 
 * @returns {Promise<BluetoothRemoteGATTService>}
 */
function getBLEService(server) {
  return server.getPrimaryService("0xFF06");
}

/**
 * @param {BluetoothRemoteGATTService} service 
 * @param {number} sampleRate 
 * @returns {Promise<void>}
 */
function setSensorConfig(service, sampleRate) {
  // IMU sensor config characterisic
  return service
    .getCharacteristic("0xFF07")
    .then((c) => {
      // Activate IMU sensor and set sampling rate
      let checkSum = sampleRate + 2 + 1;
      let setting = [83, checkSum, 2, 1, sampleRate];
      return c.writeValue(setting);
    });
}

/**
 * @param {BluetoothRemoteGATTService} service 
 * @returns {Promise<void>}
 */
function getBatteryStatus(service) {
  // Batter characterisic
  return service
    .getCharacteristic("0xFF0A")
    .then(
      /**
       * @param {BluetoothRemoteGATTCharacteristic} c 
       * @returns {DataView}
       */
      (c) => { return c.readValue(); }
    );
}

/**
 * @param {BluetoothRemoteGATTService} service 
 * @returns {Promise<void>}
 */
function turnOffSensor(service) {
  // IMU sensor config characterisic
  return service
    .getCharacteristic("0xFF07")
    .then((c) => {
      // Deactivate IMU sensor
      let checkSum = 0 + 2 + 0;
      let setting = [83, checkSum, 2, 0, 0];
      return c.writeValue(setting);
    });
}

/**
 * @param {BluetoothRemoteGATTService} service 
 * @returns {Promise<void>}
 */
function setConnectionInterval(service) {
  return service
    .getCharacteristic("0xFF07")
    .then((c) => {
      let adv_min = 625 / 0.625; //32
      let adv_max = 750 / 0.625; //80
      let conn_min = 90 / 1.25; //480
      let conn_max = 110 / 1.25; //800
      let adv_min_msb = getMSB(adv_min);    // 00
      let adv_min_lsb = getLSB(adv_min);    // 00100000 (32)
      let adv_max_msb = getMSB(adv_max);    // 00
      let adv_max_lsb = getLSB(adv_max);    // 01000000 (64)
      let conn_min_msb = getMSB(conn_min);  // 01       (1)
      let conn_min_lsb = getLSB(conn_min);  // 11100000 (224)
      let conn_max_msb = getMSB(conn_max);  // 11       (3)
      let conn_max_lsb = getLSB(conn_max);  // 00100000 (32)

      console.log(adv_min_lsb, adv_max_lsb);

      let checkSumAll = 8 + adv_min_msb + adv_min_lsb + adv_max_msb + adv_max_lsb
        + conn_min_msb + conn_min_lsb + conn_max_msb + conn_max_lsb;
      console.log(checkSumAll); // 460
      let checkSum = getLSB(checkSumAll);
      console.log(checkSum); // 01 11001100
      let setting = [87, checkSum, 8, adv_min_msb, adv_min_lsb, adv_max_msb, adv_max_lsb,
         conn_min_msb, conn_min_lsb, conn_max_msb, conn_max_lsb];
      console.log(setting);
      return c.writeValue(setting);
    });
}

function getMSB(value) {
  return (value >> 8) & 0xFF;
}

function getLSB(value) {
  console.log(value);
  let lsb1 = value % 256;
  console.log("Mod: " + lsb1);
  let lsb2 = value & 0b11111111;
  console.log("And: " + lsb2);
  let lsb3 = (value >>> 0).toString(2);
  console.log("Shift: " + lsb1);
  return lsb1;
}

/**
 * @param {BluetoothRemoteGATTService} service 
 * @returns {Promise<void>}
 */
function getConnectionInterval(service) {
  // IMU sensor config characterisic
  return service
    .getCharacteristic("0xFF0B")
    .then(
      /**
       * @param {BluetoothRemoteGATTCharacteristic} c 
       * @returns {DataView}
       */
      (c) => { return c.readValue(); }
    );
}

/**
 * @param {BluetoothRemoteGATTService} service 
 * @returns {Promise<void>}
 */
function setSensorListener(service) {
  // Characteristic to receive sensor data
  return service
    .getCharacteristic("0xFF08")
    .then(
      /** 
       * @param {BluetoothRemoteGATTCharacteristic} c 
       * @returns {Promise<void>}
       */
      function (c) {
        // Set listener for eSense notifications
        c.on('characteristicvaluechanged', function(event) {
          let data = [].slice.call(event.target.value.buffer);
          counter++;
          console.log("eSense: " + data);
          let timestamp = parseInt(Date.now());
          // save Data to files
          saveAccelData(data, timestamp);
          saveGyrosData(data, timestamp);
          // read Bangle Accel
          saveBangleAccel(timestamp);
          if (isStopped) {
            c.stopNotifications();
          }
        });
        return c.startNotifications();
      }
    );
}

// First menu
const mainmenu = {
  "" : {
    title: " - Main Menu - ",
    fontHeight: 20
  },
  "Connect to eSense" : () => {
    E.showMessage("Connecting...");
    connectToESense()
      .then((server) => {
        gatt = server;
        console.log("Connected to eSense");
        getBLEService(gatt)
          .then((s) => {
            service = s;
            console.log("Found primary service");
            isStopped = false;
            E.showMenu(eSenseMenu);
            setInterval(() => {
              if (gatt.connected) {
                console.log("Still connected");
              } else {
                console.log("Connection lost");
                clearInterval();
                E.showAlert("Disconnected!")
                  .then(() => {
                    E.showMenu(mainmenu);
                  });
              }
            }, 3000)
          })
          .catch((err) => {
            console.log("Error: " + err);
            console.log("Failed to get the service")
            if (gatt.connected) {
              gatt.disconnect()
                .then(() => console.log("Automatically Disconnected"))
                .catch(() => console.log("Failed to disconnect"));
            }
            E.showAlert("Connected, but failed to get the service").then(() => {
              E.showMenu(mainmenu);
            });
          });
      })
      .catch((err) => {
        console.log("Error: " + err);
        console.log("Failed to connect");
        E.showAlert("Failed to connect")
          .then(() => {
            E.showMenu(mainmenu);
          });
      });
  },
  "Exit" : () => { E.showMenu(mainmenu); },
};

// Submenu
const eSenseMenu = {
  "" : {
    title : " - eSense connected - ",
    fontHeight: 20,
  },
  "Sample Rate" : { 
    value: sampleRate,
    min:10,max:50,step:5,
    onchange : (v) => {
      setSensorConfig(service, v)
        .then(() => {
          sampleRate = v;
          console.log("Set sampling rate: ", v);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  },
  "Start Listener" : () => {
    // Create files to save data
    E.showMessage("Starting Listener...");
    startedAt = parseInt(Date.now() / 1000);
    bangleAccel = require("Storage").open("bangleAccel_" + startedAt + ".csv", "a");
    eSenseGyros = require("Storage").open("eSenseGyros_" + startedAt + ".csv", "a");
    eSenseAccel = require("Storage").open("eSenseAccel_" + startedAt + ".csv", "a");
    setSensorConfig(service, sampleRate)
      .then(() => {
        setSensorListener(service)
          .then(() => {
            console.log("Started listener");
            E.showMessage("Listener started");
            //start Bangle Acclerometer
            startAccel();
            setWatch(() => {
              eSenseMenu["Stop Listener"].call()
            }, BTN1, {repeat: false});
            setInterval(() => E.showMessage("Sample Count: " + counter), 3000)
          })
          .catch((err) => {
            console.log(err);
          })
      })
      .catch(err => {
        console.log(err);
      });
  },
  "Stop Listener" : () => {
    // Stop Bangle Accel
    stopAccel();
    isStopped = true;
    clearInterval();

    setTimeout(() => {
      console.log("Stopped Listener");
      E.showMessage("Stopped Listener");
      eSenseAccel = undefined;
      eSenseGyros = undefined;
      bangleAccel = undefined;
    }, 1000)
    
    // save Magnitudes
    setTimeout(() => {
      saveMagnitudes();
      E.showMenu(eSenseMenu);
    }, 2000);
  },
  "Show Battery" : () => {
    E.showMessage("Waiting...");
    getBatteryStatus(service)
      .then((d) => {
        const maxVoltage = 4.2;
        let voltage = (d.buffer[3] * 256 + d.buffer[4]) / 1000;
        let percentage = parseInt((voltage / maxVoltage) * 100);
        console.log("Battery: " + voltage + "V");
        E.showMessage("Battery Status is: " + percentage + "%");
        setTimeout(() => {
          E.showMenu(eSenseMenu);
        }, 1000)
      })
      .catch((err) => {
        console.log(err);
        E.showAlert("No battery found")
          .then(() => E.showMenu(eSenseMenu));
      });
  },
  "Get Intervals" : () => {
    E.showMessage("Waiting...");
    getConnectionInterval(service)
      .then((d) => {
        console.log(d.buffer);
        let advertising_min = (d.buffer[3] * 256 + d.buffer[4]) * 0.625;
        let advertising_max = (d.buffer[5] * 256 + d.buffer[6]) * 0.625;
        let connection_min = (d.buffer[7] * 256 + d.buffer[8]) * 1.25;
        let connection_max = (d.buffer[9] * 256 + d.buffer[10]) * 1.25;
        console.log("Advertising: " + advertising_min + "ms - " + advertising_max + "ms");
        console.log("Connection: " + connection_min + "ms - " + connection_max + "ms");
        E.showMessage(
          "Advertising: " + advertising_min + "ms - " + advertising_max + "ms\n" + 
          "Connection: " + connection_min + "ms - " + connection_max + "ms"
        );
        setTimeout(() => {
          E.showMenu(eSenseMenu);
        }, 2000)
      })
      .catch((err) => {
        console.log(err);
        E.showAlert("No Intervals found")
          .then(() => E.showMenu(eSenseMenu));
      });
  },
  "Set Conn Interval" : () => { 
    E.showMessage("Waiting...");
    setConnectionInterval(service)
      .then(() => {
        console.log("Set connection Interval");
        E.showMessage("Connection Interval set");
        setTimeout(() => {
          E.showMenu(eSenseMenu);
        }, 1500);
      })
      .catch((err) => {
        console.log(err);
      })
  },
  "Remove last recording" : () => {
    console.log("Removing files written at: " + startedAt);
    cleanFiles(startedAt);
  },
  "Disconnect" : () => {
    isStopped = true;
    setTimeout(() => {
      console.log("Stopped Listener");
      turnOffAndDisconnect(service);
    }, 1000);
  },
};


function turnOffAndDisconnect(service) {
  turnOffSensor(service)
    .then(() => {
      console.log("Turned off sensor");
      disconnectESense();
    })
    .catch((err) => {
      console.log(err);
      disconnectESense();
    });
}

function disconnectESense() {
  if (gatt.connected) {
    gatt.disconnect()
      .then(() => console.log("Disconnected"))
      .catch(() => console.warn("Disconnect failed"));
  }
  // Display
  clearInterval();
  E.showMenu(mainmenu);
}

E.showMenu(mainmenu);

function cleanFiles(startedAt) {
  require("Storage").open("eSenseGyros_" + startedAt + ".csv", "r").erase();
  require("Storage").open("eSenseAccel_" + startedAt + ".csv", "r").erase();
  require("Storage").open("bangleAccel_" + startedAt + ".csv", "r").erase();
  require("Storage").open("eSenseGyMag_" + startedAt + ".csv", "r").erase();
  require("Storage").open("eSenseAcMag_" + startedAt + ".csv", "r").erase();
  require("Storage").open("bangleAcMag_" + startedAt + ".csv", "r").erase();
}


// ############### eSense Data Helper ###############

function saveAccelData(data, timestamp) {
  let accl_x = combineBytes(data[10], data[11]);
  let accl_y = combineBytes(data[12], data[13]);
  let accl_z = combineBytes(data[14], data[15]);
  eSenseAccel.write("" + accl_x + "," + accl_y + "," + accl_z + "," + timestamp + "\n");
}

function saveGyrosData(data, timestamp) {
  let gyro_x = combineBytes(data[4], data[5]);
  let gyro_y = combineBytes(data[6], data[7]);
  let gyro_z = combineBytes(data[8], data[9]);
  eSenseGyros.write("" + gyro_x + "," + gyro_y + "," + gyro_z + "," + timestamp + "\n");
}


function saveMagnitudes() {
  // Open files with sensor data in READ mode
  // create new files to save the magnitudes to
  setTimeout(() => {
      saveMagnitude("bangleAccel_" + startedAt + ".csv", "bangleAcMag_" + startedAt + ".csv");
  }, 1000)
  setTimeout(() => {
      saveMagnitude("eSenseGyros_" + startedAt + ".csv", "eSenseGyMag_" + startedAt + ".csv");
  }, 1000)
  setTimeout(() => {
      saveMagnitude("eSenseAccel_" + startedAt + ".csv", "eSenseAcMag_" + startedAt + ".csv");
  }, 1000)
  // startedAt = undefined;
}

function saveMagnitude(filename, magFilename) {
  let file = require("Storage").open(filename, "r");
  let magFile = require("Storage").open(magFilename, "a");
  extractMagnitude(file, magFile);
}


/** Read the data from one file and write their magnitude in the other
 * 
 * @param {StorageFile} file 
 * @param {StorageFile} magFile 
 */
function extractMagnitude(file, magFile) {
  let line = file.readLine();
  while (line !== undefined) {
    let data = line.split(",");
    let magnitude = calculateMagnitude(data[0], data[1], data[2]);
    magFile.write(magnitude + "\n");
    line = file.readLine();
  }
}

/** Calculate Magnitude from x, y and z value
 * 
 * @param {number} x 
 * @param {number} y 
 * @param {number} z
 * @returns {number}
 */
function calculateMagnitude(x, y, z) {
  let val = x*x + y*y + z*z;
  let magnitude = Math.sqrt(val);
  return magnitude;
}

/** Calculate value from most significant and least significant byte
 * 
 * @param {number} msb 
 * @param {number} lsb 
 * @returns {number}
 */
function combineBytes(msb, lsb) {
  let msblsb = msb << 8 | lsb;
  return msblsb;
}

// ############### Bangle.js Acclerometer ##############

function saveBangleAccel(timestamp) {
  let data = Bangle.getAccel();
  console.log( "Bangle: " + "x: " + data.x + " y: " + data.y + " z:" + data.z);
  bangleAccel.write("" + data.x + "," + data.y + "," + data.z + "," + timestamp + "\n");
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

function startAccel() {
  let hz = sampleRate;
  let gs = 4;
  accelConfig(hz, gs);
  //Bangle.setPollInterval((1000/hz));
  //Bangle.on('accel', accelHandler);
}

function stopAccel() {
  Bangle.accelWr(0x18, 0x0A) // deactivate accel
  //Bangle.softOff(); // reset()
  // no good solution found
}

function accelHandler(value) {
  console.log( "Bangle: " + "x: " + value.x + " y: " + value.y + " z:" + value.z + " Mag: " + value.mag + " Diff: " + value.diff);
  //bangleAccel.write("" + value.x + "," + value.y + "," + value.z + "\n");
  //bangleAcMag.write(value.mag + "\n");
}

function startBuiltInStepCounter() {  
  Bangle.on('step', (up) => {
    console.log(up);
  })
}
