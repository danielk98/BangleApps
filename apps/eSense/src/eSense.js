// ###### eSense functionality ######

/**
 * Connects to a reachable eSense
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

/**
 * 
 * @param {BluetoothRemoteGATTServer} server 
 */
/*
function checkRSSI() {
  NRF.setScan(function(d) {
    console.log(d.rssi);
    rssiVal = d.rssi;
  }, { filters: [{ namePrefix: "eSense" }] });
}
*/

/**
 * Tries to bond/pair with the connected device
 * 
 * @param {BluetoothRemoteGATTServer} server 
 * @returns {Promise<void>}
 */
function bondWithESense(server) {
  return server.startBonding()
    .then(() => {
      console.log("bonded: ", server.getSecurityStatus());
    });
}

/** 
 * Gets the BLE GATT Service from the eSense
 * 
 * @param {BluetoothRemoteGATTServer} server 
 * @returns {Promise<BluetoothRemoteGATTService>}
 */
function getBLEService(server) {
  return server.getPrimaryService(0xFF06);
}

/**
 * Activate the IMU sensor of the eSense and set its sampling rate
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

/**
 * Deactivate the IMU sensor of the eSense
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

/**
 * @param {BluetoothRemoteGATTService} service 
 * @param {Function} callback
 * @returns {Promise<void>}
 */
function setSensorListener(service, callback) {
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
          //console.log("eSense: " + data);
          let timestamp = parseInt(Date.now());
          let time = timestamp-startedAtMS;
          // call callback function
          // save Data to files
          saveAccelData(data, time);
          //saveGyrosData(data, time);
          // read Bangle Accel
          //saveBangleAccel(time);
          if (isStopped) {
            c.stopNotifications();
          }
        });
        return c.startNotifications();
      }
    );
}

/**
 * Get the Battery Status from the eSense
 * 
 * @param {BluetoothRemoteGATTService} service 
 * @returns {Promise<DataView>}
 */
/*
function getBatteryStatus(service) {
  // Batter characterisic
  return service
    .getCharacteristic("0xFF0A")
    .then(c => { return c.readValue(); });
}
*/


/**
 * Get currently active Connection and Advertising Interval
 * 
 * @param {BluetoothRemoteGATTService} service 
 * @returns {Promise<void>}
 */
function getFactoryOffset(service) {
  return service
    .getCharacteristic("0xFF0D")
    .then(c => { return c.readValue(); });
}

/**
 * Get currently active Connection and Advertising Interval
 * 
 * @param {BluetoothRemoteGATTService} service 
 * @returns {Promise<void>}
 */
function getConnectionInterval(service) {
  // IMU sensor config characterisic
  return service
    .getCharacteristic("0xFF0B")
    .then(c => { return c.readValue(); });
}

/**
 * Set the Connection and Advertising Interval of the eSense
 * 
 * @param {BluetoothRemoteGATTService} service 
 * @returns {Promise<void>}
 */
function setConnectionInterval(service) {
  return service
    .getCharacteristic("0xFF07")
    .then((c) => {
      let adv_min = 625 / 0.625; // Default: 625
      let adv_max = 750 / 0.625; // Default: 750
      let conn_min = 90 / 1.25; // Default: 90
      let conn_max = 110 / 1.25; // Default: 110
      let adv_min_msb = getMSB(adv_min);
      let adv_min_lsb = getLSB(adv_min);
      let adv_max_msb = getMSB(adv_max);
      let adv_max_lsb = getLSB(adv_max);
      let conn_min_msb = getMSB(conn_min);
      let conn_min_lsb = getLSB(conn_min);
      let conn_max_msb = getMSB(conn_max);
      let conn_max_lsb = getLSB(conn_max);
      let checkSumAll = 8 + adv_min_msb + adv_min_lsb + adv_max_msb + adv_max_lsb
        + conn_min_msb + conn_min_lsb + conn_max_msb + conn_max_lsb;
      let checkSum = getLSB(checkSumAll);
      let setting = [87, checkSum, 8, adv_min_msb, adv_min_lsb, adv_max_msb, adv_max_lsb,
          conn_min_msb, conn_min_lsb, conn_max_msb, conn_max_lsb];
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
  // let lsb2 = value & 0b11111111;
  // console.log("And: " + lsb2);
  // let lsb3 = (value >>> 0).toString(2);
  // console.log("Shift: " + lsb3);
  return lsb1;
}
