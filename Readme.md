# Resizable.js

A JavaScript library allowing the creation of resizable html divs.
[Try the live demo!](http://tomrawlings.online/resizable/demo)

![Resizable Example Gif](http://tomrawlings.online/resizable/resizable.gif)

## Setup
Link to both resizable.js and resizable-style.css within the webpage and call:
 ``Resizable.initialise(parentId, sizes, resizerThickness)``
Where "parentId" is the element ID of the parent \<div> containing your resizable windows and "sizes" is an object literal containing the size values for how much space a child window will initally occupy within its parent (i.e. how far along the resizer line will appear). An empty object ``{}``will cause it to default to equal sizes. The third argument "resizerThickness" allows you to specify how thick the dividing lines will be. This is optional and will default to 4px.

Example:
```js
sizes = {
	"leftChildId": 0.75
}
```
The above sizing will cause the left child to start at 75% of its parent's width with the right window filling the remaining 25%.

The layout of the resizable windows will be determined by the structure of your HTML and the CSS classes given to the nested \<div> elements.

The recognised CSS classes are:
```css
"resizable-top"
"resizable-bottom"
"resizable-left"
"resizable-right"
```
A parent \<div> must be created with a unique ID. To split this parent with a horizontal resizer line, it must contain exactly two child \<div> elements with classes of "resizable-top" and "resizable-bottom" respectively. To split the parent with a vertical line, it must contain exactly two child \<div> elements with classes of "resizable-left" and "resizable-right" respectively. Any of these child \<div> elements can be further split by including two more children within them. Further nesting of \<div> elements allows for complex resizable layouts to be created. 

To hopefully better demonstrate the correct way to create a layout, the HTML code for the demo page is included below:

```html
<div  id="main">
  <div  class="resizable-left"  id="win1">
    <div  class="resizable-top"  id="win3">
      <div  class="resizable-left"  id="win5">
      </div>
      <div  class="resizable-right"  id="win6">
      </div>
    </div>
    <div  class="resizable-bottom"  id="win4">
    </div>
  </div>
  <div  class="resizable-right"  id="win2">
    <div  class="resizable-top"  id="win7">
      <div  class="resizable-left"  id="win9">
      </div>
      <div  class="resizable-right"  id="win10">
        <div  class="resizable-top"  id="win11">
          <div  class="resizable-left"  id="win13">
          </div>
          <div  class="resizable-right"  id="win14">
          </div>
        </div>
        <div  class="resizable-bottom"  id="win12">
        </div>
      </div>
    </div>
    <div  class="resizable-bottom"  id="win8">
    </div>
  </div>
</div>
```
It is important to never mix top/bottom and left/right CSS classes within direct children of an element.

The diagram below shows the div ID's of the windows in the demo. They are numbered in the order they're created by the instantiation function. These IDs are for illustrative purposes only, you do not need to give individual IDs to the \<div> elements in your page, 
![Window ID Diagram](http://tomrawlings.online/resizable/window-diagram.png)
