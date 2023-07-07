let bangleStatus = false; //TODO: true when Bangle step detection is active
let eSenseStatus = false; //TODO: true when eSense step detection is active
let bangleStatusColor;
let eSenseStatusColor;

require("Font4x5").add(Graphics);

function switchStatusColor()
{
  if (bangleStatus)
    bangleStatusColor = "#4f0"; //green
  else if (!bangleStatus)
    bangleStatusColor = "#f00"; //red
  if (eSenseStatus)
    eSenseStatusColor = "#4f0"; //green
  else if (!eSenseStatus)
    eSenseStatusColor = "#f00"; //red
}

function fillStatusCircleBangle(l)
{  
  g.setColor("#4f0"); // TODO set to bangleStatusColor
  g.fillCircle(l.x, l.y, 4);
}

function fillStatusCircleEsense(l)
{  
  g.setColor("#f00"); //TODO set to eSenseStatusColor
  g.fillCircle(l.x, l.y, 4);
}
  
var Layout = require("Layout");
var layout = new Layout( {
  type:"v", c: [
    {type:"h", c: [
      {type:"v", bgCol:"#444444", c:[
        {type:"h", c:[
          {type:"txt", font:"4x5:2", label:"BANGLE", fillx:3, filly:1, col:"#fff"},
          {type:"custom", render:fillStatusCircleBangle, fillx:1}
        ]},
        {type:"txt", font:"4x5:4", label:"1223", fillx:1, filly:2, col:"#fff"} //TODO BangleSteps
      ]},
      {type:"v",  bgCol:"#808080", c:[
        {type:"h", c:[
          {type:"txt", font:"4x5:2", label:"ESENSE", fillx:3, filly:1, col:"#fff"},
          {type:"custom", render:fillStatusCircleEsense, fillx:1}
        ]},
        {type:"txt", font:"4x5:4", label:"1200", fillx:1, filly:2, col:"#fff"} //TODO eSenseSteps
      ]},
    ]},
    {type:"v", bgCol:"#000", c:[
        {type:"txt", font:"4x5:2", label:"ACCURATE STEPS",  fillx:1, filly:1, col:"#fff"},
        {type:"txt", font:"4x5:4", label:"1200",  fillx:1, filly:2, col:"#fff"} //TODO Accurate Steps
      ]},
  ]
});
g.clear();
layout.render();
