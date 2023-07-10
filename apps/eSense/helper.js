
// split collected eSense data in single files (per sensor and axis)
function readData(filename) {
    let data = require("Storage").read(filename, 0, -1);
    let lines = data.split("\n");

    // open files for write:
    let file_gyro_x = require("Storage").open("gyro_x.csv", "a");
    let file_gyro_y = require("Storage").open("gyro_y.csv", "a");
    let file_gyro_z = require("Storage").open("gyro_z.csv", "a");
    let file_accl_x = require("Storage").open("accl_x.csv", "a");
    let file_accl_y = require("Storage").open("accl_y.csv", "a");
    let file_accl_z = require("Storage").open("accl_z.csv", "a");

    for (let line of lines) {
        if (line.length === 0) {continue;}
        let line_d = line.split(",");
        let gyro_x = combineBytes(line_d[4], line_d[5]);
        file_gyro_x.write(gyro_x + "\n");
        let gyro_y = combineBytes(line_d[6], line_d[7]);
        file_gyro_y.write(gyro_y + "\n");
        let gyro_z = combineBytes(line_d[8], line_d[9]);
        file_gyro_z.write(gyro_z + "\n");

        let accl_x = combineBytes(line_d[10], line_d[11]);
        file_accl_x.write(accl_x + "\n");
        let accl_y = combineBytes(line_d[12], line_d[13]);
        file_accl_y.write(accl_y + "\n");
        let accl_z = combineBytes(line_d[14], line_d[15]);
        file_accl_z.write(accl_z + "\n");
    }
    console.log("completed!");
}

// remove splitted files
function cleanFiles() {
    require("Storage").open("gyro_x.csv", "r").erase();
    require("Storage").open("gyro_y.csv", "r").erase();
    require("Storage").open("gyro_z.csv", "r").erase();
    require("Storage").open("accl_x.csv", "r").erase();
    require("Storage").open("accl_y.csv", "r").erase();
    require("Storage").open("accl_z.csv", "r").erase();
}


// read from large file and write a part of it to another file
function smallify() {
    let data = require("Storage").open("bangleAccel.csv", "r");
    let data_mag = require("Storage").open("bangleAccelMag.csv", "r");
    var l = data_mag.readLine();
    let i =1;
    while (l!==undefined && i<=800) {
      console.log(i, l);
      bangleAccelMagnitude.write(l);
      l = data_mag.readLine();
      i++;
    }
  }
  

//cleanFiles();
//readData("eSenseData10Hz.csv");