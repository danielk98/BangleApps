const num = 50;
let file1 = "Bangle.csv";
let file2 = "eSense.csv";

const dHeight = g.getHeight();
const dWidth = g.getWidth();
const axisMargin = 10;

function initData(filename, num) {
  let plotData = new Float32Array(num);
  for (let i = 0; i < num; i++) {
    plotData[i] = readLine(filename);
  }
  return plotData;
}

let offset = {};
offset[file1] = 0;
offset[file2] = 0;
function readLine(filename) {
  let data = require("Storage").read(filename, offset[filename], 40);
  let lines = data.split('\n');
  offset[filename] += lines[0].length + 1;
  let value = lines[0].split(',')[0];
  return value;
}

let plotData = {};
plotData[file1] = initData(file1, num);
plotData[file2] = initData(file2, num);

function drawAccelPlot() {
  g.setBgColor("#a6a6a6");
  g.setColor("#000000");
  g.clear();
  // first graph
  const box1 = { x1: 0, x2: dWidth, y1: 0, y2: dHeight/2 };
  const from1 = 1;
  const to1 = 4;
  let xGap1 = Math.round((box1.x2 - box1.x1 - axisMargin*2) / num);
  let yGap1 = Math.round((box1.y2 - box1.y1 - axisMargin*2) / (to1-from1))
  drawGround(file1, box1, from1, to1);
  drawPlot(box1, xGap1, yGap1, file1, from1);
  //second graph
  const box2 = { x1: 0, x2: dWidth, y1: dHeight/2 + 1, y2: dHeight };
  const from2 = 6;
  const to2 = 14;
  let xGap2 = Math.round((box2.x2 - box2.x1 - axisMargin*2) / num);
  let yGap2 = Math.round((box2.y2 - box2.y1 - axisMargin*2) / (to2-from2))
  drawGround(file2, box2, from2, to2);
  drawPlot(box2, xGap2, yGap2, file2, from2);
  setInterval(() => {
    redrawPlot(box1, xGap1, yGap1, file1, from1);
    redrawPlot(box2, xGap2, yGap2, file2, from2);
  }, 100);
}

function drawGround(name, box, from, to) {
  g.setFontAlign(0, 0);
  g.setFont("Vector", 10);
  // vertical axis
  g.drawLine(box.x1 + axisMargin, box.y1 + axisMargin/2, box.x1 + axisMargin, box.y2 - axisMargin/2);
  // horizantal axis
  g.drawLine(box.x1 + axisMargin/2, box.y2-axisMargin, box.x2-axisMargin/2, box.y2-axisMargin);
  //g.drawString("t", box.x2 - (axisMargin/2 - 2), box.y2 - (axisMargin/2 - 2), false);
  let valNum = to - from ;
  let yGap = Math.round((box.y2 - box.y1 - axisMargin*2) / valNum);
  for (let i = from; i <= to; i++) {
    // skala
    g.drawString("-", box.x1 + axisMargin-2, (box.y2 - axisMargin) - ((i-from) * yGap), false);
    g.drawString(i, box.x1 + axisMargin/2, (box.y2 - axisMargin) - ((i-from) * yGap), false);
  }
  g.setFontAlign(-1, 0);
  g.setColor("#000000");
  g.drawString(name, box.x1 + axisMargin*2, box.y1 + axisMargin/2, true);
}

function drawPlot(box, xGap, yGap, filename, from) {
  // plot color
  g.setColor("#d10404");
  let x1 = box.x1 + axisMargin + 1;
  let normedData = plotData[filename][0]/evalData[filename].normalizer;
  let y1 = (box.y2 - axisMargin) - Math.round((normedData-from) * yGap);
  for (let i=1; i < plotData[filename].length; i++) {
    let x2 = (box.x1 + axisMargin + 1) + i*xGap;
    normedData = plotData[filename][i]/evalData[filename].normalizer;
    let y2 = (box.y2 - axisMargin) - Math.round((normedData - from) * yGap);
    g.drawLine(x1, y1, x2, y2);
    x1 = x2;
    y1 = y2;
  }
  // info text: actual value
  g.setFontAlign(1, 0);
  g.setColor("#000000");
  let step = "STEPS: " + evalData[filename].steps;
  g.clearRect(box.x2-axisMargin-50, box.y1, box.x2-axisMargin, box.y1 + 10);
  g.drawString(step, box.x2 - axisMargin, box.y1 + axisMargin/2, true);
}

function redrawPlot(box, xGap, yGap, filename, from) {
  g.setBgColor("#a6a6a6");
  g.setColor("#000000");
  g.clearRect(box.x1 + axisMargin + 1, box.y1 + axisMargin + 1, box.x2, box.y2 - axisMargin - 1);
  nom(filename);
  drawPlot(box, xGap, yGap, filename, from);
}

const slidingWindow = 3;
let evalData = {};
evalData[file1] = {
  steps: 0,
  lowThreshold: 1.99,
  mainThreshold: 2.25,
  peakDetected: false,
  normalizer: 1
};
evalData[file2] = {
  steps: 0,
  lowThreshold: 8,
  mainThreshold: 9,
  peakDetected: false,
  normalizer: 1000
};

function nom(filename) {
  let read = readLine(filename);
  if (read != "") {
    plotData[filename] = plotData[filename].slice(1, num);
    plotData[filename].push(Number(read));
  } else {
    console.log("Reached EOF, starting from Begin...");
    offset[filename] = 0;
  }
  let eval = evalData[filename];
  let avg = plotData[filename].slice(-slidingWindow).reduce((val1, val2) => val1+val2) / slidingWindow;
  let normalized = avg / eval.normalizer;
  if (!eval.peakDetected && normalized >= eval.mainThreshold) {
    console.log(filename, 'peak reached');
    eval.peakDetected = true;
  }
  else if (eval.peakDetected && normalized <= eval.lowThreshold) {
    eval.steps++;
    eval.peakDetected = false;
    console.log(filename, 'full step');
  }
}
