require("Font4x5").add(Graphics);
var Layout = require("Layout");

let bangleStatusColor = "#f00";
let eSenseStatusColor = "#f00";

/**
 * Switch the activity status colors
 */
function switchStatusColor()
{
  if (bangleAccelActive)
    bangleStatusColor = "#4f0"; //green
  else
    bangleStatusColor = "#f00"; //red
  if (eSenseListenerActive)
    eSenseStatusColor = "#4f0"; //green
  else
    eSenseStatusColor = "#f00"; //red
}

/** Draw the status badge for the Bangle
 * 
 * @param {Layout} l 
 */
function fillStatusCircleBangle(l)
{  
  g.setColor(bangleStatusColor);
  g.fillCircle(l.x, l.y, 4);
}

/** Draw the status badge for the eSense
 * 
 * @param {Layout} l 
 */
function fillStatusCircleEsense(l)
{
  g.setColor(eSenseStatusColor);
  g.fillCircle(l.x, l.y, 4);
}

function loadLayout() {
  // basic layout for the step count screen
  return new Layout( {
    type:"v", c: [
      {type:"h", c: [
        {type:"v", bgCol:"#444444", c:[
          {type:"h", c:[
            {type:"txt", font:"4x5:2", label:"BANGLE", fillx:3, filly:1, col:"#fff"},
            {type:"custom", render: fillStatusCircleBangle, fillx:1}
          ]},
          {type:"txt", font:"4x5:4", label: 0, fillx:1, filly:2, col:"#fff", id:'bangle'}
        ]},
        {type:"v",  bgCol:"#808080", c:[
          {type:"h", c:[
            {type:"txt", font:"4x5:2", label:"ESENSE", fillx:3, filly:1, col:"#fff"},
            {type:"custom", render: fillStatusCircleEsense, fillx:1}
          ]},
          {type:"txt", font:"4x5:4", label: 0, fillx:1, filly:2, col:"#fff", id:"esense"}
        ]},
      ]},
      {type:"v", bgCol:"#000", c:[
          {type:"txt", font:"4x5:2", label:"ACCURATE STEPS",  fillx:1, filly:1, col:"#fff"},
          {type:"txt", font:"4x5:4", label: 0,  fillx:1, filly:2, col:"#fff", id: "combined"}
        ]},
    ]
  });
}
