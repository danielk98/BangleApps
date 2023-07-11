## Bangle.js step detection combined with eSense data
The application in the concatenated form runs only on the Bangle.js 2 (high memory usage).
Eitherway the BLE of the Bangle.js 2 guarantees a much more robust connection than the Bangle.js 1.

### Components
The app provides follwing components:
- Displaying the detected steps from the Bangle.js, the eSense and the combined steps (only counted if the data of both devices imply a step in the same time frame)
- Basic config of Bangle.js Acceleration sensor (turn on/off, sample rate, sensitivity)
- BLE Connection to an eSense and basic configuration of the eSense's IMU sensor (turn on/off, sample rate, battery info)
- Storing data additionally to live evaluation of steps in a csv

For running in the Emulator:
- Live-Plot the data points of two given csv files simulataneously to compare their charts (the files have to be uploaded in the emulator)

### Generate the combined app file 
Concatenation of the source code into one file is done with gulp task runner (especially helpfull in the development process)

- "gulp" -> Generate default app.js containing everything to run in
- "gulp plotter" -> generate a version that includes the data plotter to run even in the Bangle.js 1 emulator
