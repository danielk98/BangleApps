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
      setSensorListener(service, dataCb)
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

function dataCb(data) {
  console.log("Data received");
}

