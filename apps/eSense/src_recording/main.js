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

let bangleDiff;

let activeMenu;

let startedAtMS;
let startedAt;

let rssi;
let rssiVal = 0;

let isStopped = false; //true when button is pressed a 2nd time, stops datatransmission

let sensitivity = 4;
let sampleRateAccel = 50;
let sampleRateESense = 25;
let counter = 0;

//console.log(NRF.getSecurityStatus());

let highRSSI = 0;

/*
function setNRFConfig(val) {
  console.log("Setting TxPowerto: " + val);
  NRF.setTxPower(val);
  NRF.setConnectionInterval('auto');
  //NRF.setConnectionInterval({minInterval: 10, maxInterval: 50});
  //NRF.setAdvertising({}, {interval: 50});
}
*/

let nrf = true;

// First menu
const mainmenu = {
  "" : {
    title: " - Main Menu - ",
    fontHeight: 30
  },
  /*
  "NRF": {
    value : nrf,
    format : v => v ? "On" : "Off",
    onchange : v => {
      nrf = v;
      if (nrf) {
        NRF.wake();
      } else {
        NRF.sleep();
      }
    }
  },
  */
  /*
  "Set NRF Power": {
    value: 0,
    min:-20, max:4,step:4,
    onchange : (v) => {
      try {setNRFConfig(v)}
      catch (err) {console.log(err)}
    }
  },
  */
 /*
  "Start/Stop RSSI": () => {
    if (!rssi) {
      checkRSSI();
      rssi = true;
    } else {
      NRF.setScan();
      rssi = false;
      E.showMessage("Counted: " + highRSSI);
      setTimeout(() => {
        E.showMenu(mainmenu);
        highRSSI = 0;
      }, 1000);
    }
  },
  */
  "Connect to eSense" : () => {
    //NRF.setConnectionInterval('auto');
    E.showMessage("Connecting...");
    connectToESense()
      .then((server) => {
        gatt = server;
        //gatt.device.on('gattserverdisconnected', function(reason) {
        //  console.log("Disconnected due to: ", reason);
        //});
        console.log("Connected to eSense");
        //console.log(gatt);
        //console.log("Status", gatt.getSecurityStatus());
        //checkRSSI();
        getBLEService(gatt)
          .then((s) => {
            service = s;
            console.log("Found primary service");
            //console.log(service);
            isStopped = false;
            activeMenu=eSenseMenu;
            E.showMenu(eSenseMenu);
            setInterval(() => {
              if (gatt.connected) {
                console.log("Still connected: " + rssiVal);
              } else {
                console.log("Connection lost");
                clearInterval();
                E.showAlert("Disconnected!")
                  .then(() => {
                    activeMenu = mainmenu;
                    E.showMenu(mainmenu);
                  });
                }
            }, 2000);
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
              activeMenu = mainmenu;
              E.showMenu(mainmenu);
            });
          });
      })
      .catch((err) => {
        console.log("Error: " + err);
        console.log("Failed to connect");
        E.showAlert("Failed to connect")
          .then(() => {
            activeMenu = mainmenu;
            E.showMenu(mainmenu);
          });
      }, 2000);
  },
  "Bangle Accel": () => {
    E.showMenu(bangleMenu);
  },
  "Exit" : () => {
    E.showMenu(mainmenu);
  },
};

// Submenu
const eSenseMenu = {
  "" : {
    title : " - eSense connected - ",
    fontHeight: 30,
  },
  "Sample Rate" : {
    value: sampleRateESense,
    min: 10,max: 100,step: 5,
    onchange : (v) => {
      setSensorConfig(service, v)
        .then(() => {
          sampleRateESense = v;
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
    isStopped = false;
    startedAt = parseInt(Date.now() / 1000);
    bangleAccel = require("Storage").open("bangleAccel_" + startedAt + ".csv", "a");
    //eSenseGyros = require("Storage").open("eSenseGyros_" + startedAt + ".csv", "a");
    eSenseAccel = require("Storage").open("eSenseAccel_" + startedAt + ".csv", "a");
    setSensorConfig(service, sampleRateESense)
      .then(() => {
        setSensorListener(service)
          .then(() => {
            console.log("Started listener");
            E.showMessage("Listener started");
            //start Bangle Acclerometer
            //startAccel();
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
      //saveMagnitudes();
      E.showMenu(eSenseMenu);
    }, 2000);
  },
  /*
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
  */
  "Show FactoryOffset" : () => {
    E.showMessage("Waiting...");
    getFactoryOffset(service)
      .then((d) => {
        let acc_x = combineBytes(d.buffer[10], d.buffer[11]);
        let acc_y = combineBytes(d.buffer[12], d.buffer[13]);
        let acc_z = combineBytes(d.buffer[14], d.buffer[15]);
        
        console.log("Offsets: " + acc_x + " (x), " + acc_y + " (y), "+ acc_z + " (z)");
        E.showMessage("Offsets: \n" + acc_x + " (x)\n" + acc_y + " (y)\n"+ acc_z + " (z)");
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
  "Calc Magnitudes": () => {
    saveMagnitudes(startedAt);
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
  "Bangle Accel": () => {
    E.showMenu(bangleMenu);
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
  activeMenu=mainmenu;
  E.showMenu(mainmenu);
}


const bangleMenu = {
  "" : {
    title : " - Bangle Accelerator - ",
    fontHeight: 30,
  },
  "Sample Rate" : { 
    value: sampleRateAccel,
    min: 12.5, max: 100,step: 12.5,
    onchange : (v) => {
      if (v == 37.5) {
        sampleRateAccel = sampleRateAccel > 37.5 ? 25 : 50;
      } else if (v == 62.5) {
        sampleRateAccel = 100;
      } else if (v == 87.5) {
        sampleRateAccel = 50;
      } else {
        sampleRateAccel = v;
      }
      accelSampleRate(sampleRateAccel);
    }
  },
  "Sensitivity": {
    value: sensitivity,
    min: 2, max: 8,step: 2,
    onchange : (v) => {
      if (v == 6) {
        sensitivity = sensitivity > 6 ? 4 : 8;
      } else {
        sensitivity = v;
      }
      accelSensitivity(sensitivity);
    }
  },
  "Start Accel": () => {
    //Bangle.setStepCount(0);
    //setInterval(() => {
    //  let steps = Bangle.getStepCount();
    //  console.log(steps);
    //}, 1000);
    startedAtMS = parseInt(Date.now());
    startedAt = parseInt(startedAtMS / 1000);
    bangleAccel = require("Storage").open("bangleAccel_" + startedAt + ".csv", "a");
    //bangleDiff = require("Storage").open("bangleAcDiff_" + startedAt + ".csv", "a");
    // setInterval(() => {
    //   let time = parseInt(Date.now() / 1000) - startedAt;
    //   saveBangleAccel(time);
    // }, 1000/sampleRateAccel)
    console.log(sampleRateAccel);
    pollAccelData(sampleRateAccel);
  },
  "Stop Accel": () => {
    console.log("Stopped Accel");
    stopAccel();
    //saveMagnitude("bangleAccel_" + startedAt + ".csv", "bangleAcMag_" + startedAt + ".csv");
    //clearInterval();
  },
  "Exit" : () => {
    E.showMenu(activeMenu);
  },
}

activeMenu = mainmenu;
E.showMenu(mainmenu);
