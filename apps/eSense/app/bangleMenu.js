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
