// Original transformable boxes by Simon Sarris
// https://github.com/simonsarris/Canvas-tutorials/blob/master/boxes2.js

// Modified to give image mapping percentages by David Larson
// https://github.com/DLar/Canvas-tutorials/blob/master/boxes2.js

// holds all our boxes
var boxes = [];

// New, holds the 8 tiny boxes that will be our selection handles
// the selection handles will be in this order:
// 0  1  2
// 3     4
// 5  6  7
var selectionHandles = [];

// Array for box and table colors
var colors = [
'rgba(61,113,208,0.5)',
'rgba(149,41,125,0.5)',
'rgba(242,10,21,0.5)',
'rgba(247,173,15,0.5)',
'rgba(248,250,85,0.5)',
'rgba(46,208,65,0.5)'
];

var info;
var preDel = 0;

// Hold image information
var IMG;
var MAXWIDTH = 1200;

// Hold canvas information
var canvas;
var ctx;
var WIDTH;
var HEIGHT;
var INTERVAL = 20; // how often, in milliseconds, we check to see if a redraw is needed

var isDrag = false;
var isResizeDrag = false;
var expectResize = -1; // New, will save the # of the selection handle if the mouse is over one.
var mx, my; // mouse coordinates

// when set to true, the canvas will redraw everything
var canvasValid = false;

// The node (if any) being selected.
// If in the future we want to select multiple objects, this will get turned into an array
var mySel = null;

// The selection width and size.
var mySelWidth = 1;
var mySelBoxSize = 6;

// we use a fake canvas to draw individual shapes for selection testing
var ghostcanvas;
var gctx; // fake canvas context

// since we can drag from anywhere in a node
// instead of just its x/y corner, we need to save
// the offset of the mouse when we start dragging.
var offsetx, offsety;

// Padding and border style widths for mouse offsets
var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;

// Box object to hold data
function Box() {
  this.x = 0;
  this.y = 0;
  this.w = 1; // default width and height?
  this.h = 1;
  this.fill = 'black';
}

// New methods on the Box class
Box.prototype = {
  // we used to have a solo draw function
  // but now each box is responsible for its own drawing
  // mainDraw() will call this with the normal canvas
  // myDown will call this with the ghost canvas with 'black'
  draw: function(context) {
      if (context === gctx) {
        context.fillStyle = 'black'; // always want black for the ghost canvas
      } else {
        context.fillStyle = this.fill;
      }
      
      // We can skip the drawing of elements that have moved off the screen:
      if (this.x > WIDTH || this.y > HEIGHT) { return; }
      if (this.x + this.w < 0 || this.y + this.h < 0) { return; }
      
      context.fillRect(this.x,this.y,this.w,this.h);
      
      // draw selection
      // this is a stroke along the box and also 8 new selection handles
    if (mySel === this) {
      context.strokeStyle = 'black';
      context.lineWidth = mySelWidth;
      
      if (mySelWidth % 2 === 0) {
        context.strokeRect(this.x,this.y,this.w,this.h);
      }
      else {
        context.strokeRect(this.x-0.5,this.y-0.5,this.w+1,this.h+1);
      }
      
      // draw the boxes
      
      var half = mySelBoxSize / 2;
      
      // 0  1  2
      // 3     4
      // 5  6  7
      
      // top left, middle, right
      selectionHandles[0].x = this.x-half;
      selectionHandles[0].y = this.y-half;
      
      selectionHandles[1].x = this.x+this.w/2-half;
      selectionHandles[1].y = this.y-half;
      
      selectionHandles[2].x = this.x+this.w-half;
      selectionHandles[2].y = this.y-half;
      
      //middle left
      selectionHandles[3].x = this.x-half;
      selectionHandles[3].y = this.y+this.h/2-half;
      
      //middle right
      selectionHandles[4].x = this.x+this.w-half;
      selectionHandles[4].y = this.y+this.h/2-half;
      
      //bottom left, middle, right
      selectionHandles[6].x = this.x+this.w/2-half;
      selectionHandles[6].y = this.y+this.h-half;
      
      selectionHandles[5].x = this.x-half;
      selectionHandles[5].y = this.y+this.h-half;
      
      selectionHandles[7].x = this.x+this.w-half;
      selectionHandles[7].y = this.y+this.h-half;
      
      context.fillStyle = 'black';
      for (var i = 0; i < 8; i ++) {
        var cur = selectionHandles[i];
        context.fillRect(cur.x, cur.y, mySelBoxSize, mySelBoxSize);
      }
    }
    
  } // end draw

};

//Initialize a new Box, add it, and invalidate the canvas
function addRect(x, y, w, h, fill) {
  if (info) {
    addTable(fill); // Add a new table for each box created
  }
  
  var rect = new Box();
  rect.x = x;
  rect.y = y;
  rect.w = w;
  rect.h = h;
  rect.fill = fill;
  boxes.push(rect);
  mySel = rect;
  preDel++;
  canvasValid = false;
}

// initialize our canvas, add a ghost canvas, set draw loop
// then add everything we want to intially exist on the canvas
function init() {
  if (IMG.width > MAXWIDTH) {
    WIDTH = MAXWIDTH;
    HEIGHT = Math.round(IMG.height * MAXWIDTH / IMG.width);
  }
  else {
    WIDTH = IMG.width;
    HEIGHT = IMG.height;
  }
  canvas.setAttribute( 'width', WIDTH );
  canvas.setAttribute( 'height', HEIGHT );
  canvas.setAttribute('tabindex','0');
  canvasValid = false;
  
  ctx = canvas.getContext('2d');
  ghostcanvas = document.createElement('canvas');
  ghostcanvas.height = HEIGHT;
  ghostcanvas.width = WIDTH;
  gctx = ghostcanvas.getContext('2d');
  
  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.onselectstart = function () { return false; };
  
  // fixes mouse co-ordinate problems when there's a border or padding
  // see getMouse for more detail
  if (document.defaultView && document.defaultView.getComputedStyle) {
    stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null).paddingLeft, 10)     || 0;
    stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null).paddingTop, 10)      || 0;
    styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null).borderLeftWidth, 10) || 0;
    styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null).borderTopWidth, 10)  || 0;
  }
  
  // make mainDraw() fire every INTERVAL milliseconds
  setInterval(mainDraw, INTERVAL);
  
  // set our events. Up and down are for dragging,
  // double click is for making new boxes
  canvas.onmousedown = myDown;
  canvas.onmouseup = myUp;
  canvas.ondblclick = myDblClick;
  canvas.onmousemove = myMove;
  canvas.onkeydown = myKeyDown;
  canvas.onblur = myBlur;
  document.onmouseup = myUp;
  document.onmousemove = myMove;
  
  // set up the selection handle boxes
  for (var i = 0; i < 8; i ++) {
    var rect = new Box();
    selectionHandles.push(rect);
  }
  
  // add custom initialization here:
  info = document.getElementById('info');
}

//wipes the canvas context
function clear(c) {
  c.clearRect(0, 0, WIDTH, HEIGHT);
}

// Main draw loop.
// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
function mainDraw() {
  if (canvasValid === false) {
    clear(ctx);
    
    // Add stuff you want drawn in the background all the time here
    ctx.drawImage(IMG, 0, 0, WIDTH, HEIGHT);
  
    // draw all boxes
    var l = boxes.length;
    for (var i = 0; i < l; i++) {
      boxes[i].draw(ctx); // we used to call drawshape, but now each box draws itself
      
      // Update table information
      if (info) {
          updateTable(i);
      }
    }
    
    // Add stuff you want drawn on top all the time here
    
    canvasValid = true;
  }
}

// Happens when the mouse is moving inside the canvas
function myMove(e){
  if (isDrag) {
    getMouse(e);
    
    var x = mx - offsetx;
    var y = my - offsety;
    
    if (x < 0) {
      mySel.x = 0;
    }
    else if (x + mySel.w > WIDTH) {
      mySel.x = WIDTH - mySel.w; 
    }
    else {
      mySel.x = x;
    }
    
    if (y < 0) {
      mySel.y = 0;
    }
    else if (y + mySel.h > HEIGHT) {
      mySel.y = HEIGHT - mySel.h; 
    }
    else {
      mySel.y = y;
    }
    
    // something is changing position so we better invalidate the canvas!
    canvasValid = false;
    document.body.style.cursor='move';
  } else if (isResizeDrag) {
    // time ro resize!
    var oldx = mySel.x;
    var oldy = mySel.y;
    
    if (mx < 0) {
      mx = 0;
    }
    if (mx > WIDTH) {
      mx = WIDTH;
    }
    if (my < 0) {
      my = 0;
    }
    if (my > HEIGHT) {
      my = HEIGHT;
    }
    
    // 0  1  2
    // 3     4
    // 5  6  7
    switch (expectResize) {
      case 0:
        if (my > oldy + mySel.h - 2*mySelBoxSize) {
          my = oldy + mySel.h - 2*mySelBoxSize;
        }
        if (mx > oldx + mySel.w - 2*mySelBoxSize) {
          mx = oldx + mySel.w - 2*mySelBoxSize;
        }
        mySel.x = mx;
        mySel.y = my;
        mySel.w += oldx - mx;
        mySel.h += oldy - my;
        break;
      case 1:
        if (my > oldy + mySel.h - 2*mySelBoxSize) {
          my = oldy + mySel.h - 2*mySelBoxSize;
        }
        mySel.y = my;
        mySel.h += oldy - my;
        break;
      case 2:
        if (my > oldy + mySel.h - 2*mySelBoxSize) {
          my = oldy + mySel.h - 2*mySelBoxSize;
        }
        if (mx < oldx + 2*mySelBoxSize) {
          mx = oldx + 2*mySelBoxSize;
        }
        mySel.y = my;
        mySel.w = mx - oldx;
        mySel.h += oldy - my;
        break;
      case 3:
        if (mx > oldx + mySel.w - 2*mySelBoxSize) {
          mx = oldx + mySel.w - 2*mySelBoxSize;
        }
        mySel.x = mx;
        mySel.w += oldx - mx;
        break;
      case 4:
        if (mx < oldx + 2*mySelBoxSize) {
          mx = oldx + 2*mySelBoxSize;
        }
        mySel.w = mx - oldx;
        break;
      case 5:
        if (mx > oldx + mySel.w - 2*mySelBoxSize) {
          mx = oldx + mySel.w - 2*mySelBoxSize;
        }
        if (my < oldy + 2*mySelBoxSize) {
          my = oldy + 2*mySelBoxSize;
        }
        mySel.x = mx;
        mySel.w += oldx - mx;
        mySel.h = my - oldy;
        break;
      case 6:
        if (my < oldy + 2*mySelBoxSize) {
          my = oldy + 2*mySelBoxSize;
        }
        mySel.h = my - oldy;
        break;
      case 7:
        if (mx < oldx + 2*mySelBoxSize) {
          mx = oldx + 2*mySelBoxSize;
        }
        if (my < oldy + 2*mySelBoxSize) {
          my = oldy + 2*mySelBoxSize;
        }
        mySel.w = mx - oldx;
        mySel.h = my - oldy;
        break;
    }
    
    canvasValid = false;
  }
  
  getMouse(e);
  // if there's a selection see if we grabbed one of the selection handles
  if (mySel !== null && !isResizeDrag && !isDrag) {
    checkResize();
  }
}

// Happens when the mouse is clicked in the canvas
function myDown(e){
  document.onselectstart = function() { return false; };
  getMouse(e);
  
  //we are over a selection box
  if (expectResize !== -1) {
    isResizeDrag = true;
    return;
  }
  
  clear(gctx);
  var l = boxes.length;
  for (var i = l-1; i >= 0; i--) {
    // draw shape onto ghost context
    boxes[i].draw(gctx);
    
    // get image data at the mouse x,y pixel
    var imageData = gctx.getImageData(mx, my, 1, 1);
    
    // if the mouse pixel exists, select and break
    if (imageData.data[3] > 0 && e.button === 0) {
      mySel = boxes[i];
      offsetx = mx - mySel.x;
      offsety = my - mySel.y;
      mySel.x = mx - offsetx;
      mySel.y = my - offsety;
      isDrag = true;
      
      canvasValid = false;
      clear(gctx);
      return;
    }
    
  }
  // havent returned means we have selected nothing
  mySel = null;
  // clear the ghost canvas for next time
  clear(gctx);
  // invalidate because we might need the selection border to disappear
  canvasValid = false;
}

function myUp(){
  document.onselectstart = function() { return true; };
  
  isDrag = false;
  isResizeDrag = false;
  expectResize = -1;
  
  // if there's a selection see if we are still over one of the selection handles
  if (mySel !== null) {
    checkResize();
  }
}

// adds a new node
function myDblClick(e) {
  getMouse(e);
  // for this method width and height determine the starting X and Y, too.
  // so I left them as vars in case someone wanted to make them args for something and copy this code
  var width = 24;
  var height = 24;
  
  if (width > WIDTH) {
    width = WIDTH;
  }
  if (height > HEIGHT) {
    height = HEIGHT;
  }
  
  var x;
  var y;
  
  if (mx - (width / 2) < 0) {
    x = 0;
  }
  else if (mx + (width / 2) > WIDTH) {
    x = WIDTH - width; 
  }
  else {
    x = mx - (width / 2);
  }
  
  if (my - (height / 2) < 0) {
    y = 0;
  }
  else if (my + (height / 2) > HEIGHT) {
    y = HEIGHT - height; 
  }
  else {
    y = my - (height / 2);
  }
  
  addRect(x, y, width, height, colors[preDel % colors.length]);
}

function myKeyDown(e) {
  e.preventDefault();
  
  if (mySel !== null) {
    if (e.shiftKey && e.keyCode === 37) {  /* Shift+Left arrow was pressed */
      mySel.x = ((mySel.x - 5) < 0) ? 0 : mySel.x - 5;
    }
    else if (e.shiftKey && e.keyCode === 38) {  /* Shift+Up arrow was pressed */
      mySel.y = ((mySel.y - 5) < 0) ? 0 : mySel.y - 5;
    }
    else if (e.shiftKey && e.keyCode === 39) {  /* Shift+Right arrow was pressed */
      mySel.x = ((mySel.x + mySel.w + 5) > WIDTH) ? WIDTH - mySel.w : mySel.x + 5;
    }
    else if (e.shiftKey && e.keyCode === 40) {  /* Shift+Down arrow was pressed */
      mySel.y = ((mySel.y + mySel.h + 5) > HEIGHT) ? HEIGHT - mySel.h : mySel.y + 5;
    }
    else if (e.keyCode === 37) {  /* Left arrow was pressed */
      mySel.x = ((mySel.x - 1) < 0) ? 0 : mySel.x - 1;
    }
    else if (e.keyCode === 38) {  /* Up arrow was pressed */
      mySel.y = ((mySel.y - 1) < 0) ? 0 : mySel.y - 1;
    }
    else if (e.keyCode === 39) {  /* Right arrow was pressed */
      mySel.x = ((mySel.x + mySel.w + 1) > WIDTH) ? WIDTH - mySel.w : mySel.x + 1;
    }
    else if (e.keyCode === 40) {  /* Down arrow was pressed */
      mySel.y = ((mySel.y + mySel.h + 1) > HEIGHT) ? HEIGHT - mySel.h : mySel.y + 1;
    }
    else if (e.keyCode === 68) {  /* D key was pressed */
      var x = (mySel.x + mySel.w + 5 > WIDTH) ? WIDTH - mySel.w : mySel.x + 5;
      var y = (mySel.y + mySel.h + 5 > HEIGHT) ? HEIGHT - mySel.h : mySel.y + 5;
      addRect(x, y, mySel.w, mySel.h, colors[preDel % colors.length]);
    }
    else if (e.keyCode === 8 || e.keyCode === 46) {  /* Backspace or Delete was pressed */
      var l = boxes.length;
      for (var i = 0; i < l; i++) {
        if (mySel === boxes[i]) {
          boxes.splice(i, 1);
          l--;
          info.removeChild( info.lastChild );
          canvasValid = false;
        }
        if (i !== l) {
          info.childNodes[i].setAttribute( 'style', 'background-color: ' + boxes[i].fill );
        }
      }
    }
    else {
      return;
    }
    
    canvasValid = false;
  }
}

function myBlur() {
  document.body.style.cursor='auto';
  // havent returned means we have selected nothing
  mySel = null;
  // invalidate because we might need the selection border to disappear
  canvasValid = false;
}

function checkResize() {
  for (var i = 0; i < 8; i++) {
    // 0  1  2
    // 3     4
    // 5  6  7
    
    var cur = selectionHandles[i];
    
    // we dont need to use the ghost context because
    // selection handles will always be rectangles
    if (mx >= cur.x && mx <= cur.x + mySelBoxSize &&
        my >= cur.y && my <= cur.y + mySelBoxSize) {
      // we found one!
      expectResize = i;
      
      switch (i) {
        case 0:
          document.body.style.cursor='nw-resize';
          break;
        case 1:
          document.body.style.cursor='n-resize';
          break;
        case 2:
          document.body.style.cursor='ne-resize';
          break;
        case 3:
          document.body.style.cursor='w-resize';
          break;
        case 4:
          document.body.style.cursor='e-resize';
          break;
        case 5:
          document.body.style.cursor='sw-resize';
          break;
        case 6:
          document.body.style.cursor='s-resize';
          break;
        case 7:
          document.body.style.cursor='se-resize';
          break;
      }
      return;
    }
      
  }
  // not over a selection box, return to normal
  isResizeDrag = false;
  expectResize = -1;
  document.body.style.cursor='auto';
}

// Sets mx,my to the mouse position relative to the canvas
// unfortunately this can be tricky, we have to worry about padding and borders
function getMouse(e) {
  var element = canvas, offsetX = 0, offsetY = 0;

  if (element.offsetParent) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  offsetX += stylePaddingLeft;
  offsetY += stylePaddingTop;

  offsetX += styleBorderLeft;
  offsetY += styleBorderTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
}

function addTable(color) {
  var l = boxes.length; //Length of boxes before new one is added (l-1)
  
  var row = document.createElement('tr');
  row.setAttribute( 'style', 'background-color: ' + color );
  row.innerHTML = '<td id="top' + l + '"></td><td id="left' + l + '"></td><td id="width' + l + '"></td><td id="height' + l + '"></td>';
  info.appendChild(row);
}

function updateTable(index) {
  var cellRef = document.getElementById('top' + index);
  cellRef.innerHTML = (Math.round(boxes[index].y / HEIGHT * 1000) / 10);
  cellRef = document.getElementById('left' + index);
  cellRef.innerHTML = (Math.round(boxes[index].x / WIDTH * 1000) / 10);
  cellRef = document.getElementById('height' + index);
  cellRef.innerHTML = (Math.round(boxes[index].h / HEIGHT * 1000) / 10);
  cellRef = document.getElementById('width' + index);
  cellRef.innerHTML = (Math.round(boxes[index].w / WIDTH * 1000) / 10);
}

function readFile(file) {
  if(!file.type.match(/image.*/)) {
    alert("This file is not an image");
    return;
  }
  
  var reader = new FileReader();
  
  reader.onload = function(e) {
    IMG = new Image();
    
    IMG.onload = function() {
      init();
    };
    
    IMG.src = e.target.result;
  };
  
  reader.readAsDataURL(file);
}

window.onload = function() {
  canvas = document.getElementById('canvas2');
  var file = document.getElementById('file');
  var url = document.getElementById('url');
  file.onchange = function() {
    readFile(file.files[0]);
  };
  url.onblur = function(e) {
	IMG = new Image();
	
	IMG.onload = function() {
      init();
    };
	
	IMG.src = e.target.value;
  };
  canvas.ondragover = function(e) {
    e.preventDefault();
  };
  canvas.ondrop = function(e) {
    e.preventDefault(); 
    readFile(e.dataTransfer.files[0]);
  };
  canvas.onmousedown = function() {
    return false;
  };
  canvas.ondblclick = function() {
    file.click();
  };
};
