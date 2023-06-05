var gatt; 
var service;
var Layout = require("Layout");

function connectToESense() {
    NRF.requestDevice({
      filters: [{
        name: 'eSense-0770'
      }]
    }).then(function(device) {
      return device.gatt.connect();
    }).then(function(g) {
      console.log("Connected");
      gatt = g;
      return gatt.getPrimaryService(
        "0xFF06");
    }).then(function(service) {
      s = service;
      return service.getCharacteristic(
        "0xFF07");
    }).then(function(c) {
      return c.writeValue([83, 33, 2, 1, 30]);
    }).then(function() {
      return s.getCharacteristic("0xFF08");
    }).then(function(s) {
      return s.readValue();
    }).then(function(dataview){
      console.log(dataview.buffer);
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

