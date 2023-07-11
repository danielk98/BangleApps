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
