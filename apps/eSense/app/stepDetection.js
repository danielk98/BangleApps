// number of data points to look at when checking the threshold
const slidingWindowSize = 3;
// Bangle Threshold setting
let bangleDetectionSet = {
  name: "Bangle.js",
  slidingWindow: [],
  basement: 2, // variable
  mainThreshold: 2.25, // higher than basement (1 + 0.3)
  lowThreshold: 2, // lower than basement (1 - 0.1)
  peakDetected: false
}

// eSense Threshold setting 
let eSenseDetectionSet = {
  name: "eSense",
  slidingWindow: [],
  basement: 8250,
  mainThreshold: 9000, // higher than basement (1250)
  lowThreshold: 8000, // lower than basement (-250)
  peakDetected: false
}

/** Evalutation if the threshold is reached with the incoming value
 * 
 * @param {number} value 
 * @param {Object} detectionSet 
 * @returns 
 */
function calculateSteps(value, detectionSet) {
  // remove first element if window is full
  if (detectionSet.slidingWindow.length == slidingWindowSize) {
    detectionSet.slidingWindow.shift();
  }
  detectionSet.slidingWindow.push(value);
  
  const window = detectionSet.slidingWindow;
  const avg = window.reduce((val1, val2) => val1+val2) / window.length;
  if (!detectionSet.peakDetected && avg >= detectionSet.mainThreshold) {
      console.log(detectionSet.name + ': peak reached');
      detectionSet.peakDetected = true;
  }
  else if (detectionSet.peakDetected && avg <= detectionSet.lowThreshold) {
      detectionSet.peakDetected = false;
      console.log(detectionSet.name + ': full step');
      return true; // step detected
  }
}

