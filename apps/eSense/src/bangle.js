// ############### Bangle.js Acclerometer ##############


/*
function saveBangleAccel(timestamp) {
  let data = Bangle.getAccel();
  console.log( "Bangle: " + "x: " + data.x + " y: " + data.y + " z:" + data.z);
  bangleAccel.write("" + data.x + "," + data.y + "," + data.z + "," + data.diff + "," + timestamp + "\n");
}
*/

function saveBangleAccel(timestamp) {
  let data = Bangle.getAccel();
  console.log( "Bangle: " + "x: " + data.x + " y: " + data.y + " z:" + data.z);
  bangleAccel.write("" + data.mag + "\n");
}

function pollAccelData(hz) {
  Bangle.setPollInterval((1000/hz));
  Bangle.on('accel', accelHandler);
}

/*
function saveBangleSteps(timestamp) {
  let steps = Bangle.getStepCount();
  console.log("Bangle-Step: " + steps);
  bangleAccel.write("" + steps + "," + timestamp + "\n");
}
*/

/*function startStepCounting() {
  Bangle.setStepCount(0);
  let stepCount = 0;
  console.log("Started stepcounter");
  Bangle.on('step', (steps) => {
    stepCount++;
    console.log(steps);
    timestamp = parseInt(Date.now());
    bangleAccel.write("" + steps + "," + stepCount + "," + timestamp + "\n");
  })
}
*/

/*
function accelConfig(hz,gs) {
  accelSampleRate(hz);
  accelSensitivity(gs);
}
*/

function accelSampleRate(hz) {
  let ki_hz = 0x00;
  switch (hz) {
    case 12.5: ki_hz = 0x00; break; // 12.5 Hz
    case 25: ki_hz = 0x01; break; // 25 Hz
    case 50: ki_hz = 0x02; break; // 50 Hz
    case 100: ki_hz = 0x03; break; // 100 Hz
  }
  Bangle.accelWr(0x18,0b01101100); // CNTL1off,lowp,4g,TDTE,noWakeup,noTilt
  Bangle.accelWr(0x1B, ki_hz | 0x40); // hz output frequency, ODR/2 filter // 00101000
  console.log("Set Sample Rate of Accel to: ", hz);
}

function accelSensitivity(gs) {
  let ki_gs = 0x00;
  switch (gs) {
    case 2: ki_gs = 0x00; break; // sensitivity = +/-2g //     0
    case 4: ki_gs = 0x08; break; // sensitivity = +/-4g //  1000
    case 8: ki_gs = 0x10; break; // sensitivity = +/-8g // 10000
  }
  //Bangle.accelWr(0x18,0b01101100); // CNTL1off,lowp,4g,TDTE,noWakeup,noTilt
  Bangle.accelWr(0x18,0b11100100|ki_gs); // CNTL1on,lowp,gs,TDTE,noWakeup,noTilt
  console.log("Set sensitivity of Accel to: ", gs);
}


/*
function startAccel() {
  let hz = sampleRate;
  let gs = 4;
  accelConfig(hz, gs);
  //Bangle.setPollInterval((1000/hz));
  //Bangle.on('accel', accelHandler);
}
*/

function stopAccel() {
  Bangle.accelWr(0x18, 0x0A) // deactivate accel
  Bangle.removeListener('accel');
}

/*
function accelHandler(data) {
  console.log( "Bangle: " + "x: " + data.x + " y: " + data.y + " z:" + data.z);
  bangleAccel.write("" + data.x + "," + data.y + "," + data.z + "\n");
  bangleDiff.write("" + data.diff + "\n");
}
*/

function accelHandler(data) {
  console.log( "Bangle: " + "x: " + data.x + " y: " + data.y + " z:" + data.z);
  let time = parseInt(Date.now()) - startedAtMS;
  bangleAccel.write("" + data.mag + "," + time + "\n");
}
