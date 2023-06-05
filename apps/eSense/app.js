var gatt;
var service;

/* Create the file in append mode
columns (1-4): cmd, packetIndex, checksum, size
columns (5-6): gyro-x_msb, gyro-x_lsb
columns (7-8): gyro-y_msb, gyro-y_lsb
columns (9-10): gyro-z_msb, gyro-z_lsb
columns (11-12): accl-x_msb, accl-x_lsb
columns (13-14): accl-y_msb, accl-y_lsb
columns (15-16): accl-z_msb, accl-z_lsb
*/
var file = require("Storage").open("eSenseData.csv","a");

function connectToESense() {
    NRF.requestDevice({
      filters: [{
        namePrefix: 'eSense'
      }]
    }).then(function(device) {
      return device.gatt.connect();
    }).then(function(g) {
      console.log("Connected");
      gatt = g;
      return gatt.getPrimaryService(
        "0xFF06");
    }).then(function(s) {
      service = s;
      return service.getCharacteristic(
        "0xFF07");
    }).then(function(c) {
      return c.writeValue([83, 13, 2, 1, 10]);
    }).then(function() {
      return service.getCharacteristic("0xFF08");
    }).then(function(c) {
      counter = 0;
      c.on('characteristicvaluechanged', function(event) {
    //console.log("-> ",event.target.value);
        var csv = [].slice.call(event.target.value.buffer);
        console.log(csv);
        file.write(csv.join(",")+"\n");
        counter++;
    if (counter > 20){c.stopNotifications();}
  });
      return c.startNotifications();
    }).catch(function(){
      console.log("Notification Error");
    });
  }
  

function startUp(){
    connectToESense();
    g.drawString("Connected");
}

//Start the app
setWatch(() => {
    startUp();
  }, BTN1, {
    repeat: true
  });
