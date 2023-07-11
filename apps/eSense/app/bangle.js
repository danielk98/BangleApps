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
  console.log("Bangle: " + "x: " + data.x + " y: " + data.y + " z:" + data.z);
}
