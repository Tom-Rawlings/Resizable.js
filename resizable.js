const Resizable = {};
Resizable.activeContentWindows = [];
Resizable.activeResizers = [];
Resizable.currentResizer = null;

Resizable.Sides = {
  TOP: "TOP",
  BOTTOM: "BOTTOM",
  LEFT: "LEFT",
  RIGHT: "RIGHT"
};

Resizable.Classes = {
  WINDOW_TOP: "resizable-top",
  WINDOW_BOTTOM: "resizable-bottom",
  WINDOW_LEFT: "resizable-left",
  WINDOW_RIGHT: "resizable-right"
};


Resizable.initialise = function(parentId, initialSizes, resizerThickness){
  //Find left window
  Resizable.resizerThickness = resizerThickness ? resizerThickness : 4;
  Resizable.initialSizes = initialSizes;
  var parent = document.getElementById(parentId);
  var parentWindow = new Resizable.ContentWindow(null, parseInt(parent.style.width, 10), parseInt(parent.style.height, 10), parent);
  Resizable.activeContentWindows.push(parentWindow);
  Resizable.setupChildren(parentWindow);
};

Resizable.setupChildren = function(parentWindow){
  var childInfo = parentWindow.findChildWindowElements();
  if(childInfo.child1 == null){
    //No children found
    return;
  }
  var sizeFraction;
  sizeFraction = Resizable.initialSizes[childInfo.child1.id];
  if(sizeFraction == undefined)
    sizeFraction = 0.5;
  if(childInfo.isHorizontal){
    parentWindow.splitHorizontally(sizeFraction, childInfo.child1, childInfo.child2);
  }else{
    parentWindow.splitVertically(sizeFraction, childInfo.child1, childInfo.child2);
  }
  //Set up the children of the newly created windows
  var childWindow1 = Resizable.activeContentWindows[Resizable.activeContentWindows.length-2];
  var childWindow2 = Resizable.activeContentWindows[Resizable.activeContentWindows.length-1];
  Resizable.setupChildren(childWindow1);
  Resizable.setupChildren(childWindow2);

};

Resizable.ContentWindow = class{
  
  constructor(parent, width, height, div){
    this.parent = parent;
    this.width = width;
    this.height = height;
    this.sizeFractionOfParent = 0.5;

    if(div == null){
      this.divId = "contentWindow" + Resizable.activeContentWindows.length;

      var div = document.createElement('div');
      div.id = this.divId;
      div.classList.add('contentWindow');

      //Insert the div with correct ID into the parent window; or body if parent is null
      if(parent != null){
        parent.getDiv().appendChild(div);
      }else{
        document.body.insertAdjacentHTML('afterbegin', htmlToAdd);
      }
    }
    else{
      if(div.id == "")
        div.id = "contentWindow" + Resizable.activeContentWindows.length;
      this.divId = div.id;
      this.getDiv().classList.add("contentWindow");
    }

    this.children = [];
    this.isSplitHorizontally = false;
    this.isSplitVertically = false;
    this.childResizer = null;
    this.minWidth = 20;
    this.minHeight = 20;
    this.originalMinSize = 20;
    this.childResizerThickness = Resizable.resizerThickness;


    this.getDiv().style.position = "absolute";
    this.getDiv().style.overflow = "hidden";

    this.getDiv().style.width = Math.round(this.width)+"px";
    this.getDiv().style.height = Math.round(this.height)+"px";

    Resizable.activeContentWindows.push(this);
    this.calculateSizeFractionOfParent();

  }

  getDiv(){
    return document.getElementById(this.divId);
  }

  getDivId(){
    return this.divId;
  }

  findChildWindowElements(){
    //Cannot have more than two direct children
    var child1, child2, isHorizontal = false;
    //Find left child
    if(document.querySelectorAll(`#${this.divId} > .${Resizable.Classes.WINDOW_LEFT}`).length > 0){
      child1 = document.querySelectorAll(`#${this.divId} > .${Resizable.Classes.WINDOW_LEFT}`)[0];
      if(document.querySelectorAll(`#${this.divId} > .${Resizable.Classes.WINDOW_LEFT}`).length > 0){
        child2 = document.querySelectorAll(`#${this.divId} > .${Resizable.Classes.WINDOW_RIGHT}`)[0];
      }else{
        console.error(`${this.divId} has left child but not right`);
      }
      isHorizontal = true;
    }
    if(document.querySelectorAll(`#${this.divId} > .${Resizable.Classes.WINDOW_TOP}`).length > 0){
      if(child1 != undefined){
        console.error(`${this.divId} has both left and top children`);
        return;
      }else{
        child1 = document.querySelectorAll(`#${this.divId} > .${Resizable.Classes.WINDOW_TOP}`)[0];
        if(document.querySelectorAll(`#${this.divId} > .${Resizable.Classes.WINDOW_BOTTOM}`).length > 0){
          child2 = document.querySelectorAll(`#${this.divId} > .${Resizable.Classes.WINDOW_BOTTOM}`)[0];
        }else{
          console.error(`${this.divId} has top child but not bottom`);
        }
      }
      isHorizontal = false;
    }

    return {child1: child1, child2: child2, isHorizontal: isHorizontal};

  }

  resize(side, mousePos){

    if(this.parent == null){
      return;
    }

    switch(side){
      case Resizable.Sides.TOP:
        //Based on position of resizer line
        this.changeSize(this.parent.width, parseInt(this.parent.getDiv().style.height) - mousePos);
        this.getDiv().style.top = Math.round(mousePos) +"px";
        break;
      case Resizable.Sides.BOTTOM:
        this.changeSize(this.parent.width, mousePos - this.getDiv().getBoundingClientRect().top);
        break;
      case Resizable.Sides.LEFT:   
        //Based on position of resizer line
        this.changeSize(parseInt(this.parent.getDiv().style.width) - mousePos, this.parent.height);
        this.getDiv().style.left = Math.round(mousePos) +"px";
        break;
      case Resizable.Sides.RIGHT:
        this.changeSize(mousePos - this.getDiv().getBoundingClientRect().left, this.parent.height);
        break;
      default:
        console.error("Window.resize: incorrect side");

    }

    if(this.children.length > 0){
      this.childrenResize();
    }

    if(this.parent != null){
      this.calculateSizeFractionOfParent();
      this.getSibling().calculateSizeFractionOfParent();
      siblingWindowErrorCorrect(this);
    }

    this.repositionChildResizer();
    
    Resizable.windowResized();

  }

  calculateSizeFractionOfParent(){
    if(this.parent == null){
      this.sizeFractionOfParent = 1.0;
    }else{
      if(this.parent.isSplitHorizontally){
        this.sizeFractionOfParent = this.width / this.parent.width;

      }else if (this.parent.isSplitVertically){
        this.sizeFractionOfParent = this.height / this.parent.height;
      }
    }

  }

  getSibling(){
    if(this.parent == null)
      return null;
    if(this.parent.children[0] == this)
      return this.parent.children[1];
    else return this.parent.children[0];
  }

  childrenResize(){
    if(this.children.length == 0)
      return; //Content window has no children

    if(this.isSplitHorizontally){
      var height = this.height;
      this.children[0].changeSize(this.width * this.children[0].sizeFractionOfParent, height);
      this.children[1].changeSize(this.width * this.children[1].sizeFractionOfParent, height);
      this.children[1].getDiv().style.left = parseInt(this.children[0].getDiv().style.width) + this.childResizer.lineThickness + "px";
    }else if(this.isSplitVertically){
      this.children[0].changeSize(this.width,  this.height * this.children[0].sizeFractionOfParent);
      this.children[1].changeSize(this.width, this.height * this.children[1].sizeFractionOfParent);
      this.children[1].getDiv().style.top = parseInt(this.children[0].getDiv().style.height) + this.childResizer.lineThickness + "px";
    }

    this.children[0].childrenResize();
    this.children[1].childrenResize();

    this.repositionChildResizer();

  }

  toString(){
    return `divId = ${this.divId}, parent = ${this.parent.getDivId()}, width = ${this.width}, height = ${this.height}`;
  }

  changeSize(width, height){
    
    if(width < this.minWidth){
      width = this.minWidth;
    }
    if(height < this.minHeight)
      height = this.minHeight;


    if(this.parent != null){
      if(width > this.parent.width - this.getSibling().minWidth && this.parent.isSplitHorizontally){
        width = this.parent.width - this.getSibling().minWidth;
        this.parent.repositionChildResizer();
      }
      if(height > this.parent.height - this.getSibling().minHeight && this.parent.isSplitVertically){
        height = this.parent.height - this.getSibling().minHeight;
        this.parent.repositionChildResizer();
      }
    }

    if(this.parent == null){
      if(width > window.innerWidth)
        width = window.innerWidth;
      if(height > window.height)
        height = window.innerHeight;
    }else{
      if(width > this.parent.width){
        width = this.parent.width;
      }
      if(height > this.parent.height){
        height = this.parent.height;
      }
    }

    width = Math.round(width);
    height = Math.round(height);
    this.getDiv().style.width = width + "px";
    this.getDiv().style.height = height + "px";
    this.width = width;
    this.height = height;

  }

  repositionChildResizer(){
    if(this.childResizer != null)
      this.childResizer.reposition();
  }

  calculateMinWidthHeight(){

    if(this.children.length > 0){
      //Recursively call this on all descendants
      this.children[0].calculateMinWidthHeight();
      this.children[1].calculateMinWidthHeight();
      if(this.isSplitHorizontally){
        this.minWidth = this.children[0].minWidth + this.children[1].minWidth;
        if(this.children[0].minHeight > this.children[1].minHeight)
          this.minHeight = this.children[0].minHeight;
        else
          this.minHeight = this.children[1].minHeight;
      }else if(this.isSplitVertically){
        this.minHeight = this.children[0].minHeight + this.children[1].minHeight;
        if(this.children[0].minWidth > this.children[1].minWidth)
          this.minWidth = this.children[0].minWidth;
        else
          this.minWidth = this.children[1].minWidth;
      }
    }else{
      this.minWidth = this.originalMinSize;
      this.minHeight = this.originalMinSize;

    }

    this.minWidth = Math.round(this.minWidth);
    this.minHeight = Math.round(this.minHeight);

  }

  getTopLevelParent(){
    var parentToReturn = this;
    while(parentToReturn.parent != null){
      parentToReturn = parentToReturn.parent;
    }
    return parentToReturn;
  }

  splitHorizontally(leftWindowSizeFraction, leftDiv, rightDiv){

    this.isSplitHorizontally = true;

    var leftWidth = (this.width * leftWindowSizeFraction) - this.childResizerThickness/2;

    if(leftWidth != null && leftDiv != null){
      this.getDiv().appendChild(leftDiv);
    }
    if(rightDiv != null){
      this.getDiv().appendChild(rightDiv);
    }

    var w1 = new Resizable.ContentWindow(this, leftWidth, this.height, leftDiv);
    var w2 = new Resizable.ContentWindow(this, this.width - leftWidth - this.childResizerThickness/2, this.height, rightDiv);
    w2.getDiv().style.left = Math.round(leftWidth + this.childResizerThickness/2) + "px";

    this.childResizer = new Resizable.Resizer(this, w1, w2, true);
    this.childResizer.getDiv().style.left = Math.round(leftWidth - this.childResizerThickness/2) + "px";

    this.children.push(w1);
    this.children.push(w2);

    this.getTopLevelParent().calculateMinWidthHeight();

  }

  splitVertically(topWindowSizeFraction, topDiv, bottomDiv){

    this.isSplitVertically = true;

    var topHeight = (this.height * topWindowSizeFraction) - this.childResizerThickness/2;
    
    if(topDiv != null)
      this.getDiv().appendChild(topDiv);
    if(bottomDiv != null)
      this.getDiv().appendChild(bottomDiv);

    var w1 = new Resizable.ContentWindow(this, this.width, topHeight - this.childResizerThickness/2, topDiv);
    var w2 = new Resizable.ContentWindow(this, this.width, this.height - topHeight - this.childResizerThickness/2, bottomDiv);
    w2.getDiv().style.top = Math.round(topHeight + this.childResizerThickness/2)  + "px";

    this.childResizer = new Resizable.Resizer(this, w1, w2, false);
    this.childResizer.getDiv().style.top = Math.round(topHeight - this.childResizerThickness/2) + "px";

    this.children.push(w1);
    this.children.push(w2);

    this.getTopLevelParent().calculateMinWidthHeight();

  }

};

Resizable.parentResize = function(width, height){
  const parentWindow = Resizable.activeContentWindows[0];
  parentWindow.changeSize(width, height);
  parentWindow.repositionChildResizer();
  if (parentWindow.children.length > 0) {
    parentWindow.childrenResize();
  }

  if (parentWindow.parent != null) {
    parentWindow.calculateSizeFractionOfParent();
    parentWindow.getSibling().calculateSizeFractionOfParent();
    siblingWindowErrorCorrect(parentWindow);
  }

  parentWindow.repositionChildResizer();
  Resizable.windowResized();
}

function resizerMouseDown(e) {
  e.preventDefault();
  Resizable.resizingStarted();
  e.stopPropagation();
  Resizable.currentResizer = getResizerFromDiv(this.id);
  window.addEventListener('mousemove', Resizable.currentResizer.resize);
  window.addEventListener('mouseup', Resizable.currentResizer.cancelResize);
}

function resizerTouchStart(e) {
  Resizable.resizingStarted();
  Resizable.currentResizer = getResizerFromDiv(this.id);
  window.addEventListener('touchmove', Resizable.currentResizer.resize);
  window.addEventListener('touchend', Resizable.currentResizer.cancelResize);
}

function attachResizerEvents(){
  var elements = document.querySelectorAll('.resizer');
  if (elements) {
    elements.forEach(function(el){
      el.addEventListener('mousedown', resizerMouseDown);
      el.addEventListener('touchstart', resizerTouchStart);
    });
  }
}

function clearResizerEvents() {
  var elements = document.querySelectorAll('.resizer');
  if (elements) {
    elements.forEach(function(el){
      el.removeEventListener('mousedown', resizerMouseDown);
      el.removeEventListener('touchstart', resizerTouchStart);
    });
  }
}

function getResizerFromDiv(divId){
  for(var i = 0; i < Resizable.activeResizers.length; i++){
    if(Resizable.activeResizers[i].getDivId() == divId){
      return Resizable.activeResizers[i];
    }
  }
  console.error("getResizerFromDiv failed to find resizer");
  return null;
}

function siblingWindowErrorCorrect(child){
  child.getSibling().sizeFractionOfParent = 1 - child.sizeFractionOfParent;
}


Resizable.windowResized = function(){
  //Code to run when any window is resized should be placed here.
};

Resizable.resizingEnded = function() {
  //Runs whenever a resizer is clicked
}

Resizable.resizingStarted = function() {
  //Runs on the next 'mouseup' or 'touchend' events after a resizer is clicked
}
















Resizable.Resizer = class{
  constructor(parent, window1, window2, isHorizontal){
    this.parent = parent;
    this.isHorizontal = isHorizontal;
    if(this.isHorizontal){
      this.leftWindow = window1;
      this.rightWindow = window2;
    }else{
      //Vertical Resizer
      this.topWindow = window1;
      this.bottomWindow = window2;
    }

    this.divId = `resizer${Resizable.activeResizers.length}`;

    var div = document.createElement('div');
    div.id = this.divId;
    div.classList.add('resizer');
    parent.getDiv().appendChild(div);

    if(this.isHorizontal){
      this.getDiv().classList.add("horizontalResizer");
      this.getDiv().style.cursor ="ew-resize";
    }else{
      this.getDiv().classList.add("verticalResizer");
      this.getDiv().style.cursor = "ns-resize";
    }

    this.getDiv().style.position = "absolute";

    //this.lineThickness = 4;
    this.lineThickness = Resizable.resizerThickness;
    if(isHorizontal){
      this.getDiv().style.width = Math.round(this.lineThickness) + "px";
      this.getDiv().style.height = this.parent.height + "px";
    }else{
      this.getDiv().style.width = this.parent.width + "px";
      this.getDiv().style.height = this.lineThickness + "px";
    }

    this.reposition();


    Resizable.activeResizers.push(this);
    clearResizerEvents();
    attachResizerEvents();

  }

  getDiv(){
    return document.getElementById(this.divId);
  }

  getDivId(){
    return this.divId;
  }

  reposition(){

    if(this.isHorizontal){
      this.getDiv().style.left = this.leftWindow.getDiv().style.width;
      this.getDiv().style.height = this.parent.getDiv().style.height;
    }else{
      this.getDiv().style.top = this.topWindow.getDiv().style.height;
      this.getDiv().style.width = this.parent.getDiv().style.width;
    }

  }


  resize(e){
    

    var inputX = e.pageX;
    var inputY = e.pageY;
    if(inputX == undefined){
      inputX = e.changedTouches[0].pageX;
    }
    if(inputY == undefined){
      inputY = e.changedTouches[0].pageY;
    }else{
      e.preventDefault();
    }

    //Find the current resizer being clicked
    if(Resizable.currentResizer == null){
      for(var i = 0; i < Resizable.activeResizers.length; i++){
        if(Resizable.activeResizers[i].getDiv() == e.target){
          Resizable.currentResizer = Resizable.activeResizers[i];
        }
      }
    }

    if(Resizable.currentResizer.isHorizontal){
      //Change size of left window
      Resizable.currentResizer.leftWindow.resize(Resizable.Sides.RIGHT, inputX);
      //Change the size of the right window
      Resizable.currentResizer.getDiv().style.left = Resizable.currentResizer.leftWindow.getDiv().style.width;
      Resizable.currentResizer.rightWindow.resize(Resizable.Sides.LEFT, parseInt(Resizable.currentResizer.getDiv().style.left));
    }else{
      //Change size of the top window
      Resizable.currentResizer.topWindow.resize(Resizable.Sides.BOTTOM, inputY);
      //Change size of the bottom window and move resizer
      Resizable.currentResizer.getDiv().style.top = Resizable.currentResizer.topWindow.getDiv().style.height;
      Resizable.currentResizer.bottomWindow.resize(Resizable.Sides.TOP, parseInt(Resizable.currentResizer.getDiv().style.top));
    }

  }

  delete(){
    for(var i = 0; i < Resizable.activeResizers.length; i++){
      if(Resizable.activeResizers[i] == this)
        Resizable.activeResizers.splice(i,1);
    }
    this.getDiv().parentNode.removeChild(this.getDiv());
  }

  cancelResize(e){
    window.removeEventListener("mousemove", Resizable.currentResizer.resize);
    window.removeEventListener("mouseup", Resizable.currentResizer.cancelResize);

    window.removeEventListener("touchmove", Resizable.currentResizer.resize);
    window.removeEventListener("touchend", Resizable.currentResizer.cancelResize);
    Resizable.currentResizer = null;
    Resizable.resizingEnded();
  }

};
