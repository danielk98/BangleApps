var _ = "";
require("Font4x5").add(Graphics);
var Layout = require("Layout");

let bangleStatusColor = "#f00";
let eSenseStatusColor = "#f00";

/**
 * Switch the activity status colors
 */
function switchStatusColor()
{
  if (bangleAccelActive)
    bangleStatusColor = "#4f0"; //green
  else
    bangleStatusColor = "#f00"; //red
  if (eSenseListenerActive)
    eSenseStatusColor = "#4f0"; //green
  else
    eSenseStatusColor = "#f00"; //red
}

/** Draw the status badge for the Bangle
 * 
 * @param {Layout} l 
 */
function fillStatusCircleBangle(l)
{  
  g.setColor(bangleStatusColor);
  g.fillCircle(l.x, l.y, 4);
}

/** Draw the status badge for the eSense
 * 
 * @param {Layout} l 
 */
function fillStatusCircleEsense(l)
{
  g.setColor(eSenseStatusColor);
  g.fillCircle(l.x, l.y, 4);
}

function loadLayout() {
  // basic layout for the step count screen
  return new Layout( {
    type:"v", c: [
      {type:"h", c: [
        {type:"v", bgCol:"#444444", c:[
          {type:"h", c:[
            {type:"txt", font:"4x5:2", label:"BANGLE", fillx:3, filly:1, col:"#fff"},
            {type:"custom", render: fillStatusCircleBangle, fillx:1}
          ]},
          {type:"txt", font:"4x5:4", label: 0, fillx:1, filly:2, col:"#fff", id:'bangle'}
        ]},
        {type:"v",  bgCol:"#808080", c:[
          {type:"h", c:[
            {type:"txt", font:"4x5:2", label:"ESENSE", fillx:3, filly:1, col:"#fff"},
            {type:"custom", render: fillStatusCircleEsense, fillx:1}
          ]},
          {type:"txt", font:"4x5:4", label: 0, fillx:1, filly:2, col:"#fff", id:"esense"}
        ]},
      ]},
      {type:"v", bgCol:"#000", c:[
          {type:"txt", font:"4x5:2", label:"ACCURATE STEPS",  fillx:1, filly:1, col:"#fff"},
          {type:"txt", font:"4x5:4", label: 0,  fillx:1, filly:2, col:"#fff", id: "combined"}
        ]},
    ]
  });
}

/** @type {BluetoothRemoteGATTServer} */
let gatt;
/** @type {BluetoothRemoteGATTService} */
let service;


let startedAt = parseInt(Date.now());
let csv = false;
/** @type {StorageFile} */
let bangleCSV;
/** @type {StorageFile} */
let eSenseCSV;

let eSenseSteps = 0;
let bangleSteps = 0;
let combinedSteps = 0;
let eSenseLastTime = 0; // timestamp

let rssi;
let bangleAccelActive = false;
let eSenseListenerActive = false;


// Main menu
let mainmenu = {
  "" : {
    title: " - Main Menu - ",
    fontHeight: 20,
  },
  "Data Plotter": () => {
    drawAccelPlot();    
    setWatch(() => {
      g.clear();
      clearInterval();
      E.showMenu(mainmenu);
    }, BTN1, {repeat: false});
  },
  "Show Steps": () => {
    g.clear();
    switchStatusColor();
    let layout = loadLayout();
    updateSteps(layout);
    layout.render();
    setWatch(() => {
      clearInterval();
      E.showMenu(mainmenu);
    }, BTN1, {repeat: false});
    setInterval(() => {
      switchStatusColor();
      updateSteps(layout);
      layout.render();
    }, 1000);
  },
  "Bangle Config": () => {
    E.showMenu(bangleMenu);
  },
  "eSense Config" : () => {
    if (gatt && gatt.connected) {
      E.showMenu(eSenseMenu);
    }
    else {
      E.showPrompt("No eSense connected.\nTry to connect?")
        .then(v => {
          if (v) tryToConnectESense();
          else E.showMenu(mainmenu);
        });
    }
  },
  "Store Data": {
    value : csv,
    format : v => v ? "On" : "Off",
    onchange : v => {
      // open files for writing
      if (v) {
        let timestamp = parseInt(Date.now() / 1000)
        eSenseCSV = require("Storage").open("eSense_" + timestamp + ".csv", "a");
        bangleCSV = require("Storage").open("bangle_" + timestamp + ".csv", "a");
      }
      // the listener of bangle and eSense stores data in the files if true
      csv = v;
    }
  },
  /*
  "Exit" : () => {
    E.showMenu(() => {
      Bangle.stopAccel();
      E.showMenu();
      //Bangle.showLauncher();
    });
  },
  */
};

/**
 * Handle eSense connection process
 */
function tryToConnectESense() {
  E.showMessage("Connecting...");
  connectToESense()
    .then((server) => {
      //console.log(server);
      gatt = server;
      console.log("Connected to eSense");
      // Listen on disconnection
      gatt.device.on('gattserverdisconnected', reason => {
        console.log("Disconnected due to: ", reason);
        eSenseListenerActive = false;
      });
      // periodically check rssi value
      rssi = gatt.rssi;
      setInterval(() => {
        checkRSSI();
      }, 3000)
      // Get primary BLE Service
      getBLEService(gatt)
        .then((s) => {
          service = s;
          console.log("Found primary service");
          //console.log(service);
          eSenseListenerActive = false;
          E.showMenu(eSenseMenu);
          setInterval(() => {
            if (gatt.connected) {
              console.log("Still connected: " + rssi);
            } else {
              console.log("Connection lost");
              clearInterval();
              E.showAlert("Disconnected!")
                .then(() => {
                  E.showMenu(mainmenu);
                });
              }
          }, 5000);
        })
        .catch((err) => {
          console.log("Error: " + err);
          if (gatt.connected) {
            gatt.disconnect()
              .then(() => console.log("Automatically Disconnected"))
              .catch(() => console.log("Failed to disconnect"));
          }
          E.showAlert("Connected, but failed to get the service")
            .then(() => {
              E.showMenu(mainmenu);
            });
        });
    })
    .catch((err) => {
      console.log("Error: " + err);
      E.showAlert("Failed to connect")
        .then(() => {
          E.showMenu(mainmenu);
        });
    });
}

/** Turn off the IMU Sensor an disconnect afterwards
 * 
 * @param {BluetoothRemoteGATTService} service 
 */
function turnOffAndDisconnect(service) {
  eSenseListenerActive = false;
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

/**
 * Disconnect from eSense
 */
function disconnectESense() {
  if (gatt && gatt.connected) {
    gatt.disconnect()
      .then(() => console.log("Disconnected"))
      .catch(() => console.warn("Disconnect failed"));
  }
  E.showMenu(mainmenu);
}

/**
 * Update the step values of the stepCountScreen
 */
function updateSteps(layout) {
  layout.bangle.label = bangleSteps;
  layout.esense.label = eSenseSteps;
  layout.combined.label = combinedSteps;
}

// check if running on emulator or Bangle
let emulator = false;
try {
  NRF.setScan(() => {});
}
catch(e) {
  emulator = true;
}
// remove Data Plotter if running on Bangle
if (emulator) {
  console.log("Runs in Emulator.");
  delete mainmenu["eSense Config"];
  delete mainmenu["Bangle Config"];
  delete mainmenu["Store Data"];
}
else {
  console.log("Runs on Bangle.");
  delete mainmenu["Data Plotter"];
}

E.showMenu(mainmenu);

let bangleAccelSampleRate = 25;
let bangleAccelSensitivity = 4;

// Bangle.js Accelerator Configuration menu
const bangleMenu = {
  "" : {
    title : " - Bangle Menu - ",
    fontHeight: 20,
    back: () => {
      E.showMenu(mainmenu);
    }
  },
  "Acclerometer": {
    value : bangleAccelActive,
    format : v => v ? "On" : "Off",
    onchange : v => {
      bangleAccelActive = v;
      if (bangleAccelActive) {
        startAccel(bangleAccelSampleRate, bangleAccelSensitivity);
        console.log("Started Bangle Accelerometer")
      } else {
        stopAccel();
        console.log("Stopped Bangle Accelerometer")
      }
    }
  },
  "Sample Rate" : { 
    value: bangleAccelSampleRate,
    min: 12.5, max: 50, step: 12.5,
    onchange : (v) => {
      if (v == 37.5) {
        bangleAccelSampleRate = bangleAccelSampleRate > 37.5 ? 25 : 50;
      } else {
        bangleAccelSampleRate = v;
      }
      console.log("Set Sample Rate of Accelerator: " + bangleAccelSampleRate);
      setAccelSampleRate(bangleAccelSampleRate);
    }
  },
  "Sensitivity": {
    value: bangleAccelSensitivity,
    min: 2, max: 8,step: 2,
    onchange : (v) => {
      if (v == 6) {
        bangleAccelSensitivity = bangleAccelSensitivity > 6 ? 4 : 8;
      } else {
        bangleAccelSensitivity = v;
      }
      console.log("Set Sensitivity of Accelerator: " + bangleAccelSensitivity);
      setAccelSensitivity(bangleAccelSensitivity);
    }
  },
}

let eSenseSampleRate = 25;

// ESense Menu
const eSenseMenu = {
  "" : {
    title : " - eSense Menu - ",
    fontHeight: 20,
    back: () => {
      E.showMenu(mainmenu);
    }
  },
  "Listener": {
    value : eSenseListenerActive,
    format : v => v ? "On" : "Off",
    onchange : v => {
      eSenseListenerActive = v;
      if (eSenseListenerActive) {
        startListener(
          () => {
            E.showAlert(() => {
              E.showMenu(eSenseMenu);
            })
          }
        );
      }
      // value change triggers listener to stop on next packet
    }
  },
  "Sample Rate" : {
    value: eSenseSampleRate,
    min: 12.5, max: 50,step: 12.5,
    onchange : (v) => {
      eSenseSampleRate = v;
      setSensorConfig(service, v)
        .then(() => {
          console.log("Set sampling rate: ", v);
        })
        .catch((err) => {
          console.log(err);
        });
    }
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
        }, 2000)
      })
      .catch((err) => {
        console.log(err);
        E.showAlert("No battery found")
          .then(() => E.showMenu(eSenseMenu));
      });
  },
  "Disconnect" : () => {
    E.showMessage("Disconnecting...");
    turnOffAndDisconnect(service);
  },
};

/** Activeate the listener for the eSense IMU sensor
 * 
 * @param {Function} errorCallback 
 */
function startListener(errorCallback) {
  E.showMessage("Starting Listener...");
  // setting of sampleRate starts the sensor
  setSensorConfig(service, eSenseSampleRate)
    .then(() => {
      // sets the event listener
      setSensorListener(service, eSenseStepDetection)
        .then(() => {
          console.log("Started listener");
          E.showMenu(eSenseMenu);
        })
        .catch((err) => {
          console.log(err);
          errorCallback();
        })
    })
    .catch(err => {
      console.log(err);
      errorCallback()
    });
}

/** Trigger the step detection method for the received data
 * 
 * @param {*} data 
 */
function eSenseStepDetection(data) {
  let mag = getMagnitude(data);
  if (calculateSteps(mag, eSenseDetectionSet)) {
    eSenseSteps++;
    eSenseLastTime = parseInt(Date.now());
  }
  if (csv) {
    let time = parseInt(Date.now()) - startedAt;
    eSenseCSV.write("" + mag + "," + time + "\n");
  }
}

// ############### Bangle.js Acclerometer ##############

/** Start the accelerometer and the data polling
 * 
 * @param {number} sampleRate 
 * @param {number} sensitivity 
 */
function startAccel(sampleRate, sensitivity) {
  setAccelSensitivity(sensitivity, true);
  pollAccelData(sampleRate);
}

/**
 * Deactivate Acclerometer and remove event listener
 */
function stopAccel() {
  Bangle.accelWr(0x18, 0x0A) // deactivate accel
  Bangle.removeListener('accel');
}

/** Set the sample rate of the accelerometer
 * 
 * @param {number} hz 
 */
function setAccelSampleRate(hz) {
  let ki_hz = 0x00;
  switch (hz) {
    case 12.5: ki_hz = 0x00; break; // 12.5 Hz
    case 25: ki_hz = 0x01; break; // 25 Hz
    case 50: ki_hz = 0x02; break; // 50 Hz
    case 100: ki_hz = 0x03; break; // 100 Hz
  }
  Bangle.accelWr(0x18,0b01101100); // CNTL1off,lowp,4g,TDTE,noWakeup,noTilt
  Bangle.accelWr(0x1B, ki_hz | 0x40); // hz output frequency, ODR/2 filter // 00101000
  //console.log("Set Sample Rate of Accel to: ", hz);
}

/** Set the sensitivity of the accelerometer
 * 
 * @param {number} gs 
 * @param {number} activate 
 */
function setAccelSensitivity(gs, activate) {
  let ki_gs = 0x00;
  switch (gs) {
    case 2: ki_gs = 0x00; break; // sensitivity = +/-2g //     0
    case 4: ki_gs = 0x08; break; // sensitivity = +/-4g //  1000
    case 8: ki_gs = 0x10; break; // sensitivity = +/-8g // 10000
  }
  const setting = activate ? 0b11100100 : 0b01100100;
  Bangle.accelWr(0x18, setting | ki_gs); // CNTL1on/off,lowp,gs,TDTE,noWakeup,noTilt
  //console.log("Set sensitivity of Accel to: ", gs);
}

/** Set poll interval and accel event listener
 * 
 * @param {number} hz 
 */
function pollAccelData(hz) {
  Bangle.setPollInterval((1000/hz));
  Bangle.on('accel', accelHandler);
}

/** Handler for accel event
 * 
 * @param {AccelData} data 
 */
function accelHandler(data) {
  //console.log("Bangle: " + "x: " + data.x + " y: " + data.y + " z:" + data.z);
  bangleStepDetection(data.mag);
}

/** Trigger the step detection method for the acceleration data
 * 
 * @param {number} magnitude 
 */
function bangleStepDetection(magnitude) {
  if (calculateSteps(magnitude, bangleDetectionSet)) {
    bangleSteps++;
    console.log(bangleSteps);
    const timestamp = parseInt(Date.now());
    setTimeout(() => {
      if (Math.abs(timestamp - eSenseLastTime) < 600) {
        combinedSteps++;
        console.log("accuarate step", combinedSteps);
      }
    }, 500) // wait for 500 miliseconds to check if the esense detected a step as well
  }
  if (csv) {
    let time = parseInt(Date.now()) - startedAt;
    bangleCSV.write("" + magnitude + "," + time + "\n");
  }
}

// ###### eSense functionality ######

/** Check for RSSI signal strenght of eSense gadgets. Writes to global "rssi"-variable.
 * 
 * @param {BluetoothRemoteGATTServer} server 
 */
function checkRSSI() {
  NRF.setScan(d => {
    rssi = d.rssi;
  }, { filters: [{ namePrefix: "eSense" }] });
}

/** Connects to a reachable eSense
 * 
 * @returns {Promise<BluetoothRemoteGATTServer>}
 */
function connectToESense() {
  return NRF.requestDevice({
    filters: [{
      namePrefix: 'eSense'
    }]
  })
  .then((device) => {
    console.log(device.gatt);
    return device.gatt.connect({minInterval: 40, maxInterval: 80});
  });
}

/** Gets the BLE GATT Service from the eSense
 * 
 * @param {BluetoothRemoteGATTServer} server 
 * @returns {Promise<BluetoothRemoteGATTService>}
 */
function getBLEService(server) {
  return server.getPrimaryService(0xFF06);
}

/** Activate the IMU sensor of the eSense and set its sampling rate
 * 
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
      let checkSum = 2 + 1 + sampleRate;
      let setting = [83, checkSum, 2, 1, sampleRate];
      return c.writeValue(setting);
    });
}

/** Deactivate the IMU sensor of the eSense
 * 
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


/** Set a notifcation listener on the eSense IMU sensor data
 * 
 * @param {BluetoothRemoteGATTService} service 
 * @param {Function} dataCallback
 * @returns {Promise<void>}
 */
function setSensorListener(service, dataCallback) {
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
          if (!eSenseListenerActive) {
            c.stopNotifications();
          }
          //console.log(event);
          const data = [].slice.call(event.target.value.buffer);
          //console.log("eSense: " , data);
          // call callback function
          dataCallback(data);
        });
        return c.startNotifications();
      }
    );
}

/** Get the Battery Status from the eSense
 * 
 * @param {BluetoothRemoteGATTService} service 
 * @returns {Promise<DataView>}
 */
function getBatteryStatus(service) {
  // Batter characterisic
  return service
    .getCharacteristic("0xFF0A")
    .then(c => { return c.readValue(); });
}

// ############### eSense Data Helper ###############

/** Extract magnitude from given eSense data set
 * 
 * @param {*} data 
 * @returns number
 */
function getMagnitude(data) {
  // get real value from xyz-axis (0-65535)
  let accl_x = combineBytes(data[10], data[11]);
  let accl_y = combineBytes(data[12], data[13]);
  let accl_z = combineBytes(data[14], data[15]);
  // equivalent values in range -32767 to 32767 (65000 == -536) (signed 16bit values)
  let new_accl_x = accl_x > 32768 ? accl_x - 65536 : accl_x;
  let new_accl_y = accl_y > 32768 ? accl_y - 65536 : accl_y;
  let new_accl_z = accl_z > 32768 ? accl_z - 65536 : accl_z;
  //let new_accl_x_bit = ((accl_x & 0x80) ? ~accl_x : accl_x) * (-1);
  let accl_mag = calculateMagnitude(new_accl_x, new_accl_y, new_accl_z);
  return accl_mag;
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

// number of data points to look at when checking the threshold
const slidingWindowSize = 3;
// Bangle Threshold setting
let bangleDetectionSet = {
  name: "Bangle.js",
  slidingWindow: [],
  basement: 1, // variable
  mainThreshold: 1.25, // higher than basement (1 + 0.3)
  lowThreshold: 0.99, // lower than basement (1 - 0.1)
  peakDetected: false
}

// eSense Threshold setting 
let eSenseDetectionSet = {
  name: "eSense",
  slidingWindow: [],
  basement: 8250,
  mainThreshold: 9000, // higher than basement (1250)
  lowThreshold: 8000, // lower than basement (-250)
  peakDetected: false
}

/** Evalutation if the threshold is reached with the incoming value
 * 
 * @param {number} value 
 * @param {Object} detectionSet 
 * @returns 
 */
function calculateSteps(value, detectionSet) {
  // remove first element if window is full
  if (detectionSet.slidingWindow.length == slidingWindowSize) {
    detectionSet.slidingWindow.shift();
  }
  detectionSet.slidingWindow.push(value);
  
  const window = detectionSet.slidingWindow;
  const avg = window.reduce((val1, val2) => val1+val2) / window.length;
  if (!detectionSet.peakDetected && avg >= detectionSet.mainThreshold) {
      console.log(detectionSet.name + ': peak reached');
      detectionSet.peakDetected = true;
  }
  else if (detectionSet.peakDetected && avg <= detectionSet.lowThreshold) {
      detectionSet.peakDetected = false;
      console.log(detectionSet.name + ': full step');
      return true; // step detected
  }
}

