function cleanFiles(startedAt) {
  require("Storage").open("eSenseGyros_" + startedAt + ".csv", "r").erase();
  require("Storage").open("eSenseAccel_" + startedAt + ".csv", "r").erase();
  require("Storage").open("bangleAccel_" + startedAt + ".csv", "r").erase();
  require("Storage").open("eSenseGyMag_" + startedAt + ".csv", "r").erase();
  require("Storage").open("eSenseAcMag_" + startedAt + ".csv", "r").erase();
  require("Storage").open("bangleAcMag_" + startedAt + ".csv", "r").erase();
}

// ############### eSense Data Helper ###############

let packetIndex = 0;

function saveAccelData(data, timestamp) {
  let accl_x = combineBytes(data[10], data[11]);
  let accl_y = combineBytes(data[12], data[13]);
  let accl_z = combineBytes(data[14], data[15]);
  let new_accl_x = accl_x > 32768 ? accl_x - 65536 : accl_x;
  let new_accl_y = accl_y > 32768 ? accl_y - 65536 : accl_y;
  let new_accl_z = accl_z > 32768 ? accl_z - 65536 : accl_z;
  //let new_accl_x_bit = ((accl_x & 0x80) ? ~accl_x : accl_x) * (-1);
  let accl_mag = calculateMagnitude(new_accl_x, new_accl_y, new_accl_z);
  //eSenseAccel.write("" + new_accl_x + "," + new_accl_y + "," + new_accl_z + "," + accl_mag + "\n");// + timestamp + "\n");
  eSenseAccel.write("" + accl_mag + "," + timestamp + "\n");
  //let mag = calculateMagnitude(accl_x, accl_y, accl_z);
  //eSenseAccel.write("" + mag + "," + data[1] + "\n");
}

function saveGyrosData(data, timestamp) {
  let gyro_x = combineBytes(data[4], data[5]);
  let gyro_y = combineBytes(data[6], data[7]);
  let gyro_z = combineBytes(data[8], data[9]);
  eSenseGyros.write("" + gyro_x + "," + gyro_y + "," + gyro_z + "," + timestamp + "\n");
}


function saveMagnitudes(startedAt) {
  // Open files with sensor data in READ mode
  // create new files to save the magnitudes to
  setTimeout(() => {
      saveMagnitude("bangleAccel_" + startedAt + ".csv", "bangleAcMag_" + startedAt + ".csv");
  }, 1000)
  /*
  setTimeout(() => {
      saveMagnitude("eSenseGyros_" + startedAt + ".csv", "eSenseGyMag_" + startedAt + ".csv");
  }, 2000)
  */
  setTimeout(() => {
      saveMagnitude("eSenseAccel_" + startedAt + ".csv", "eSenseAcMag_" + startedAt + ".csv");
  }, 3000)
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
