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
  "Show Steps": () => {
    g.clear();
    switchStatusColor();
    updateSteps();
    layout.render();
    setWatch(() => {
      clearInterval();
      E.showMenu(mainmenu);
    }, BTN1, {repeat: false});
    setInterval(() => {
      switchStatusColor();
      updateSteps();
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
                  activeMenu = mainmenu;
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
function updateSteps() {
  layout.bangle.label = bangleSteps;
  layout.esense.label = eSenseSteps;
  layout.combined.label = combinedSteps;
}


E.showMenu(mainmenu);
