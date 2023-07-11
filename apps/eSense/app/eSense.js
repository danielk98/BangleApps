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
