const Sides = {
  TOP: "TOP",
  BOTTOM: "BOTTOM",
  LEFT: "LEFT",
  RIGHT: "RIGHT"
}

var Resizable = {};
var activeContentWindows = [];
class ContentWindow{
  
  constructor(parent, width, height, div){
    this.parent = parent;
    this.width = width;
    this.height = height;
    this.sizeFractionOfParent = 0.5;

    if(div == null){
      this.divId = "contentWindow" + activeContentWindows.length;

      var htmlToAdd = `<div id="${this.divId}" class="contentWindow"></div>`;

      //Insert the div with correct ID into the parent window; or body if parent is null
      if(parent != null){
        var htmlToAdd = parent.getDiv().html() + htmlToAdd;
        parent.getDiv().html(htmlToAdd);
      }else{
        document.body.insertAdjacentHTML('afterbegin', htmlToAdd);
      }
    }
    else{
      if(div.id == "")
        div.id = "contentWindow" + activeContentWindows.length;
      this.divId = div.id;
      this.getDiv().addClass("contentWindow");
    }

    this.children = new Array();
    this.isSplitHorizontally = false;
    this.isSplitVertically = false;
    this.childResizer = null;
    this.minWidth = 20;
    this.minHeight = 20;
    this.originalMinSize = 20;
    this.childResizerThickness = 4;

    var style = {
      "position": "absolute",
      "overflow": "hidden"
    }

    this.getDiv().css(style);

    this.getDiv().css("width", this.width+"px");
    this.getDiv().css("height", this.height+"px");

    activeContentWindows.push(this);
    this.calculateSizeFractionOfParent();

  }

  getDiv(){
    return $(`#${this.divId}`);
  }

  getDivId(){
    return this.divId;
  }

  resize(side, mousePos){
    //Direction is where to resize from
    /*/
    console.groupCollapsed(`Resizing ${this.getDivId()}`);
      console.group(`Before`);
        console.log(`mousePos = ${mousePos}`);
        console.log(`this.css.left = ${this.getDiv().css("left")}`);
        console.log(`this.css.top = ${this.getDiv().css("top")}`);
        console.log(`width = ${this.width}`);
        console.log(`height = ${this.height}`);
      console.groupEnd("Before");
    //*/
    if(this.parent == null){
      return;
    }

    switch(side){
      case Sides.TOP:
        //Based on position of resizer line
        this.changeSize(this.parent.width, this.parent.getDiv().height() - mousePos);
        this.getDiv().css("top",  mousePos +"px");
        break;
      case Sides.BOTTOM:
        this.changeSize(this.parent.width, mousePos - this.getDiv()[0].getBoundingClientRect().top);
        break;
      case Sides.LEFT:   
        //Based on position of resizer line
        this.changeSize(removePixelUnits(this.parent.getDiv().css("width")) - mousePos, this.parent.height);
        this.getDiv().css("left", mousePos +"px");
        break;
      case Sides.RIGHT:
        this.changeSize(mousePos - this.getDiv()[0].getBoundingClientRect().left, this.parent.height);
        break;
      default:
        console.error("Window.resize: incorrect side");

    }
    /*/
      console.group("After");
        console.log(`this.css.left = ${this.getDiv().css("left")}`);
        console.log(`this.css.top = ${this.getDiv().css("top")}`);
        console.log(`width = ${this.width}`);
        console.log(`height = ${this.height}`);
      console.groupEnd("After");
    console.groupEnd(`Resizing ${this.getDivId()}`);
    //*/

    if(this.children.length > 0){
      this.childrenResize();
    }

    if(this.parent != null){
      this.calculateSizeFractionOfParent();
      this.getSibling().calculateSizeFractionOfParent();
      siblingWindowErrorCorrect(this);
    }

    this.repositionChildResizer();
    
    windowResized();

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
      if(this.parent != null)
        this.parent.height;
      this.children[0].changeSize(this.width * this.children[0].sizeFractionOfParent, height);
      this.children[1].changeSize(this.width * this.children[1].sizeFractionOfParent, height);
      this.children[1].getDiv().css("left", this.children[0].getDiv().width() + this.childResizer.lineThickness);
    }else if(this.isSplitVertically){
      this.children[0].changeSize(this.width,  this.height * this.children[0].sizeFractionOfParent);
      this.children[1].changeSize(this.width, this.height * this.children[1].sizeFractionOfParent);
      this.children[1].getDiv().css("top", this.children[0].getDiv().height() + this.childResizer.lineThickness);
    }


    this.children[0].childrenResize();
    this.children[1].childrenResize();

    this.repositionChildResizer();

  }

  toString(){
    return `divId = ${this.divId}, parent = ${this.parent.getDivId()}, width = ${this.width}, height = ${this.height}`;
  }

  changeSize(width, height){

    /*/
    console.groupCollapsed("changeSize");
      console.log(`width = ${width}`);
      if(this.parent != null){
        console.log(`parent.width = ${this.parent.width}`);
        console.log(`sibling.minWidth = ${this.getSibling().minWidth}`);
        console.log(`this.parent.width - this.minWidth = ${this.parent.width - this.getSibling().minWidth}`);
      }
    console.groupEnd("changeSize");
    //*/
    if(this.parent == null){
      //return;
    }

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
      if(width > ($(window).width()))
        width = $(window).width();
      if(height > ($(window).height()))
        height = $(window).height();
    }else{
      if(width > this.parent.width){
        width = this.parent.width;
        //console.log(`special width applied\nwidth = ${width}, this.parent.width = ${this.parent.width}, this.minWidth = ${this.minWidth}`);
      }
      if(height > this.parent.height){
        height = this.parent.height;
        //console.log(`special height applied`);
      }
    }

    this.getDiv().css("width", width);
    this.getDiv().css("height", height);
    this.width = width;
    this.height = height;

  }

  makeFullscreen(){
    windowToFullScreen(this)
  }

  debugInfo(){
    var groupName = this.divId;
    console.group(groupName);
    //console.log(this.toString());
    if(this.parent != null)console.log(`parent = ${this.parent.getDivId()}`);
    console.group("div info");
      console.log(`div width = ${this.getDiv().css("width")}`);
      console.log(`div height = ${this.getDiv().css("height")}`);
      console.log(`div left = ${this.getDiv().css("left")}`);
      console.log(`div top = ${this.getDiv().css("top")}`);
    console.groupEnd("div info");
    console.log(`sizeFractionOfParent = ${this.sizeFractionOfParent}`);
    console.log(`isSplitHorizontally = ${this.isSplitHorizontally}`);
    console.log(`isSplitVertically = ${this.isSplitVertically}`);
    console.log(`minWidth = ${this.minWidth}`);
    console.log(`minHeight = ${this.minHeight}`);
    if(this.children.length == 0)
      console.log(`children = None`);
    else
      console.log(`children = ${this.children[0].getDivId()} , ${this.children[1].getDivId()}`);
    console.groupEnd(groupName);
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

    if(leftWidth != null)
      this.getDiv().append($(leftDiv).detach());
    if(rightDiv != null)
      this.getDiv().append($(rightDiv).detach());

    var w1 = new ContentWindow(this, leftWidth, this.height, leftDiv);
    var w2 = new ContentWindow(this, this.width - leftWidth - this.childResizerThickness/2, this.height, rightDiv);
    w2.getDiv().css("left", leftWidth + this.childResizerThickness/2);

    this.childResizer = new Resizer(this, w1, w2, true);
    this.childResizer.getDiv().css("left", leftWidth - this.childResizerThickness/2);

    this.children.push(w1);
    this.children.push(w2);

    this.getTopLevelParent().calculateMinWidthHeight();

  }

  splitVertically(topWindowSizeFraction, topDiv, bottomDiv){

    this.isSplitVertically = true;

    var topHeight = (this.height * topWindowSizeFraction) - this.childResizerThickness/2;
    
    if(topDiv != null)
      this.getDiv().append($(topDiv).detach());
    if(bottomDiv != null)
      this.getDiv().append($(bottomDiv).detach());

    var w1 = new ContentWindow(this, this.width, topHeight - this.childResizerThickness/2, topDiv);
    var w2 = new ContentWindow(this, this.width, this.height - topHeight - this.childResizerThickness/2, bottomDiv);
    w2.getDiv().css("top", topHeight + this.childResizerThickness/2);

    this.childResizer = new Resizer(this, w1, w2, false);
    this.childResizer.getDiv().css("top", topHeight - this.childResizerThickness/2);

    this.children.push(w1);
    this.children.push(w2);

    this.getTopLevelParent().calculateMinWidthHeight();

  }

}

var currentResizer = null;


function attachResizerEvents(){
  var element = document.querySelectorAll('.resizer')
  if (element) {
    element.forEach(function(el){
      el.addEventListener('mousedown', function(e) {
        currentResizer = getResizerFromDiv(el.id);
        window.addEventListener('mousemove', currentResizer.resize);
        window.addEventListener('mouseup', currentResizer.cancelResize);
      });
    });
  }
}

function getResizerFromDiv(divId){
  for(var i = 0; i < activeResizers.length; i++){
    if(activeResizers[i].getDivId() == divId){
      return activeResizers[i];
    }
  }
  console.error("getResizerFromDiv failed to find resizer");
  return null;
}

function removePixelUnits(pixelString){
  return pixelString.substring(0, pixelString.length-2) - 0;
}

function siblingWindowErrorCorrect(child){
  //Make sure child sizes never exceed 100% of parent
  var siblingSizeFractionOfParent = child.getSibling().sizeFractionOfParent;
  while(child.sizeFractionOfParent + siblingSizeFractionOfParent > 1.01){
    child.sizeFractionOfParent -= 0.01;
  }
  while(child.sizeFractionOfParent + siblingSizeFractionOfParent < 0.99){
    child.sizeFractionOfParent += 0.01;
  }
}

var currentFullScreenWindow = null;
var savedHtml = "";
function windowToFullScreen(contentWindow){
  currentFullScreenWindow = contentWindow;
  /*
  $("#fullScreen").html(contentWindow.getDiv().html());
  contentWindow.getDiv().html("");
  currentFullScreenWindow = contentWindow;
  $("#fullScreen").css("display", "initial");
  */
  savedHtml = activeContentWindows[0].getDiv().html();
  activeContentWindows[0].getDiv().html(contentWindow.getDiv().html());
  activeContentWindows[0].getDiv().css("background-color", contentWindow.getDiv().css("background-color"));
  
}

function closeFullScreen(){
  activeContentWindows[0].getDiv().html(savedHtml);
  attachResizerEvents();
}

function getContentWindowFromDiv(div){
  for(var i = 0; i < activeContentWindows.length; i++){
    if(activeContentWindows[i].getDivId() == div[0].id){
      return activeContentWindows[i];
    }
  }
  console.error("getContentWindowFromDiv failed to find ContentWindow");
  return null;
}

function resizeToFillWindow(){
  activeContentWindows[0].changeSize($(window).width(), $(window).height());
  activeContentWindows[0].childrenResize();
  windowResized();
}

function windowResized(){
  //Code to run when any window is resized should be placed here.
}
















var activeResizers = new Array();
class Resizer{
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

    this.divId = `resizer${activeResizers.length}`;

    parent.getDiv().html(parent.getDiv().html() + 
      `<div id="${this.divId}" class="resizer"></div>`);
    if(this.isHorizontal){
      this.getDiv().addClass("horizontalResizer");
      this.getDiv().css("cursor", "ew-resize");
    }else{
      this.getDiv().addClass("verticalResizer");
      this.getDiv().css("cursor", "ns-resize");
    }

    var style = {
      "position": "absolute",
    }
    this.getDiv().css(style);

    this.lineThickness = 4;
    if(isHorizontal){
      this.getDiv().css("width", this.lineThickness);
      this.getDiv().css("height", this.parent.height);
    }else{
      this.getDiv().css("width", this.parent.width);
      this.getDiv().css("height", this.lineThickness);
    }

    this.reposition();


    activeResizers.push(this);
    attachResizerEvents();

  }

  getDiv(){
    return $(`#${this.divId}`);
  }

  getDivId(){
    return this.divId;
  }

  reposition(){

    if(this.isHorizontal){
      this.getDiv().css("left", this.leftWindow.getDiv().css("width"));
      this.getDiv().css("height", this.parent.getDiv().css("height"));
    }else{
      this.getDiv().css("top", this.topWindow.getDiv().css("height"));
      this.getDiv().css("width", this.parent.getDiv().css("width"));
    }

  }


  resize(e){
    e.preventDefault();

    //Find the current resizer being clicked
    if(currentResizer == null){
      for(var i = 0; i < activeResizers.length; i++){
        if(activeResizers[i].getDiv() == e.target){
          currentResizer = activeResizers[i];
        }
      }
    }

    if(currentResizer.isHorizontal){
      //Change size of left window
      currentResizer.leftWindow.resize(Sides.RIGHT, e.pageX);
      
      //Change the size of the right window
      
      currentResizer.getDiv().css("left", currentResizer.leftWindow.getDiv().css("width"));
      currentResizer.rightWindow.resize(Sides.LEFT, removePixelUnits(currentResizer.getDiv().css("left")));
      //currentResizer.getDiv().css("left", e.pageX);
    }else{
      //Change size of the top window
      currentResizer.topWindow.resize(Sides.BOTTOM, e.pageY);

      //Change size of the bottom window and move resizer
      currentResizer.getDiv().css("top", currentResizer.topWindow.getDiv().css("height"));
      currentResizer.bottomWindow.resize(Sides.TOP, removePixelUnits(currentResizer.getDiv().css("top")));
    }


  }

  delete(){
    for(var i = 0; i < activeResizers.length; i++){
      if(activeResizers[i] == this)
        activeResizers.splice(i,1);
    }
    this.getDiv()[0].parentNode.removeChild(this.getDiv()[0]);
  }

  cancelResize(e){
    window.removeEventListener("mousemove", currentResizer.resize);
    window.removeEventListener("mouseup", currentResizer.cancelResize);
    currentResizer = null;
  }

  debugInfo(){
    var groupName = `${this.divId}`;
    console.group(groupName);
    console.log(`divId = ${this.divId}`);
    console.log(`width = ${this.getDiv().css("width")}`);
    console.log(`height = ${this.getDiv().css("height")}`);
    console.log(`left = ${this.getDiv().css("left")}`);
    console.log(`top = ${this.getDiv().css("top")}`);
    
    if(this.isHorizontal){
      console.log("HORIZONTAL RESIZER");
      console.log(`leftWindow = ${leftWindow.getDivId()}`);
      console.log(`rightWindow = ${rightWindow.getDivId()}`);
    }else{
      console.log("VERTICAL RESIZER");
      console.log(`topWindow = ${topWindow.getDivId()}`);
      console.log(`bottomWindow = ${bottomWindow.getDivId()}`);
    }
    console.log("activeResizers = " + activeResizers.length);

    console.groupEnd(groupName);
  }

}