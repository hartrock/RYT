/*!
 *  Roll Your Tasks (RYT)
 *  - mobile task management in the browser for individuals and small groups.
 *  Copyright (C) 2010-2012  Stephan Rudlof
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var EvolGo = EvolGo || {};

//
// Raphael extensions
//

(function(Raphael, eg) {
// preconditions: needs existing Raphael()
if (Raphael === undefined || Raphael.fn === undefined) {
  alert("Raphael or Raphael.fn undefined");
};

var R_fn = Raphael.fn; // shortcut

// install: should be called directly after paper instantiation
R_fn.installExtensions = function () {
  // set():
  // - attr() may be called with []: n'th member of set() (sequenced 'set')
  //   gets attr(n'th arrElem) call then (seen in v1.3.2).
  //
  var aSet = this.set();
  var protoSet = aSet.constructor.prototype;
  //var anElem = this.rect(0,0,0,0);
  //var protoElem = anElem.constructor.prototype;
  protoSet.toString = function() { // for firebug
    return "Set";
  };
  protoSet.forEach = Array.prototype.forEach;
  // elem functions for set
  protoSet.addClassAttribute = function (name, noUpdate) {
    for (var i = 0; i < this.length; ++i) {
      this[i].addClassAttribute(name);
    }
  };
  protoSet.addClassAttributes = function (names) {
    for (var i = 0; i < this.length; ++i) {
      this[i].addClassAttributes(names);
    }
  };
  protoSet.removeClassAttribute = function (name, noUpdate) {
    for (var i = 0; i < this.length; ++i) {
      this[i].removeClassAttribute(name);
    }
  };
  protoSet.updateClassAttributes = function (name) {
    for (var i = 0; i < this.length; ++i) {
      this[i].updateClassAttributes();
    }
  };
  protoSet.center = Raphael.el.center;
  protoSet.moveTo = Raphael.el.moveTo;
  protoSet.moveToP = Raphael.el.moveToP;
  protoSet.origin = Raphael.el.origin;
  protoSet.center = Raphael.el.center;
  protoSet.corner = Raphael.el.corner;
  protoSet.topRight = Raphael.el.topRight;
  protoSet.bottomLeft = Raphael.el.bottomLeft;
  protoSet.bottomRight = Raphael.el.bottomRight;
  // borders
  protoSet.top = Raphael.el.top;
  protoSet.bottom = Raphael.el.bottom;
  protoSet.left = Raphael.el.left;
  protoSet.right = Raphael.el.right;
  //
  protoSet.extent = Raphael.el.extent;
  protoSet.egRect = Raphael.el.egRect;
  protoSet.moveCenterTo = Raphael.el.moveCenterTo;
  protoSet.moveCenterToP = Raphael.el.moveCenterToP;

  return this;
};


// fn funcs: origin(), center()
//

R_fn.originOfRect = function(r) {
  return new eg.Point(r.x, r.y);
};
R_fn.centerOfRect = function(r) {
  return new eg.Point(r.x + r.width/2, r.y + r.height/2);
};
R_fn.cornerOfRect = function (r) {
  return new eg.Point(r.x + r.width, r.y + r.height);
};
R_fn.topRightOfRect = function(r) {
  return new eg.Point(r.x + r.width, r.y);
};
R_fn.bottomLeftOfRect = function(r) {
  return new eg.Point(r.x, r.y + r.height);
};
// borders
R_fn.bottomOfRect = function (r) {
  return r.y + r.height;
};
R_fn.topOfRect = function (r) {
  return r.y;
};
R_fn.leftOfRect = function (r) {
  return r.x;
};
R_fn.rightOfRect = function (r) {
  return r.x + r.width;
};
//
R_fn.extentOfRect = function(r) {
  return new eg.Point(r.width, r.height);
};
R_fn.egRectOfRect = function (r) {
  return new eg.Rect(new eg.Point(r.x, r.y), new eg.Point(r.width, r.height));
};
//
R_fn.origin = function(e) {
  return this.originOfRect(e.getBBox());
};
R_fn.center = function(e) {
  return this.centerOfRect(e.getBBox());
};
R_fn.corner = function(e) {
  return this.cornerOfRect(e.getBBox());
};
R_fn.topRight = function(e) {
  return this.topRightOfRect(e.getBBox());
};
R_fn.bottomLeft = function(e) {
  return this.bottomLeftOfRect(e.getBBox());
};
R_fn.topLeft = R_fn.origin;
R_fn.bottomRight = R_fn.corner;
// borders
// Note: top, bottom are used by Raphael (but not left, right); use other names.
R_fn.egTop = function(e) {
  return this.topOfRect(e.getBBox());
};
R_fn.egBottom = function(e) {
  return this.bottomOfRect(e.getBBox());
};
R_fn.left = function(e) {
  return this.leftOfRect(e.getBBox());
};
R_fn.right = function(e) {
  return this.rightOfRect(e.getBBox());
};
//
R_fn.extent = function(e) {
  return this.extentOfRect(e.getBBox());
};
R_fn.egRect = function (e) {
  return this.egRectOfRect(e.getBBox());
};

// conversion
R_fn.rectFromEvolGoRect = function (rect) {
  return this.rect(rect.origin().x, rect.origin().y,
                   rect.extent().x, rect.extent().y);
};


// el funcs
//

// origin moveTo
Raphael.el.moveTo = function(x, y) {
  var o = this.origin();
  return this.translate(x - o.x, y - o.y);
};
// center moveTo
Raphael.el.moveCenterTo = function(x, y) {
  var c = this.center();
  return this.translate(x - c.x, y - c.y);
};
//
Raphael.el.origin = function() {
  return this.paper.origin(this);
};
Raphael.el.center = function() {
  return this.paper.center(this);
};
Raphael.el.corner = function() {
  return this.paper.corner(this);
};
Raphael.el.topRight = function() {
  return this.paper.topRight(this);
};
Raphael.el.bottomLeft = function() {
  return this.paper.bottomLeft(this);
};
Raphael.el.topLeft = Raphael.el.origin;
Raphael.el.bottomRight = Raphael.el.corner;
// borders
Raphael.el.top = function() {
  return this.paper.egTop(this);
};
Raphael.el.bottom = function() {
  return this.paper.egBottom(this);
};
Raphael.el.left = function() {
  return this.paper.left(this);
};
Raphael.el.right = function() {
  return this.paper.right(this);
};
//
Raphael.el.extent = function() {
  return this.paper.extent(this);
};
Raphael.el.egRect = function() {
  return this.paper.egRect(this);
};
Raphael.el.translateP = function(p) {
  return this.translate(p.x, p.y);
};
Raphael.el.moveToP = function(p) {
  return this.moveTo(p.x, p.y);
};
Raphael.el.moveCenterToP = function(p) {
  return this.moveCenterTo(p.x, p.y);
};

// node "class" attributes
Raphael.el.addClassAttribute = function(attrStr, noUpdate) {
  if (! this.classAttributes) {
    this.classAttributes = [];
  }
  if (eg.arrContains(this.classAttributes, attrStr)) {
    return; // nothing to do
  }
  this.classAttributes.push(attrStr);
  if (! noUpdate) {
    this.updateClassAttributes();
  }
};
Raphael.el.removeClassAttribute = function(attrStr, noUpdate) {
  if (! this.classAttributes
      || ! eg.arrContains(this.classAttributes, attrStr)) {
    return; // nothing to do
  }
  this.classAttributes.splice(this.classAttributes.indexOf(attrStr), 1);
  if (! noUpdate) {
    this.updateClassAttributes();
  }
};
Raphael.el.containsClassAttribute = function (attrStr) {
  return this.classAttributes && eg.arrContains(this.classAttributes, attrStr);
};
Raphael.el.addClassAttributes = function(attrStrArr) {
  for (var i = 0; i < attrStrArr.length; ++i) {
    this.addClassAttribute(attrStrArr[i], true); // No update before ..
  }
  this.updateClassAttributes(); // .. all have been added.
};
Raphael.el.updateClassAttributes = function (moreAttrsOrNil) {
  var attrs = moreAttrsOrNil ? moreAttrsOrNil : [];
  if (this.classAttributes) {
    attrs = this.classAttributes.concat(attrs);
  }
  eg.assert(this.node);
  this.node.setAttribute("class", attrs.join(" "));
};
// storage
Raphael.el.toJSON = function() {
  return {
  id: this.id,
  type: this.type,
  attrs: this.attrs
  };
};


R_fn.eg = {
  // arrow (additional shape, constructed with eg.Point() params)
  computeArrowPath: function(from, to, baseWidth) {
    var td = to.sub(from); // vec from base to tip
    var tdU = td.unit(); // 0-vector -> NaN-vector -> 0-vector
    var tdUOrtho = tdU.orthogonal();
    var dOrtho = tdUOrtho.mul(baseWidth/2);
    var base1 = from.add(dOrtho);
    var base2 = from.sub(dOrtho);
    var toFixed = to.toFixed(3);
    return "M"+toFixed+"L"+base1.toFixed(3)+" "+base2.toFixed(3)+" "+toFixed;
    // not faster (contrary to some - older - hints):
    //   return ["M",toFixed,"L",base1.toFixed(3)," ",base2.toFixed(3)," ",toFixed].join("");
  },
  arrow: function (from, to, baseWidth) {
    return this.path(this.eg.computeArrowPath(from,to,baseWidth));
  }
}; // R_fn.eg


//
// connectors
//
// Note: some code taken from Raphael graffle example.

// TODO:
// - remove mouse event funcs replacement semantics (avoid surprises if used with usual mechanisms
// - simplifiy remove()
// - check - by looong loop - that there is no mem leak
R_fn.Connector = function (obj1, obj2, line, bg, fromMarkerInfo, toMarkerInfo) {
  var r = obj1.paper; // use raphael instance
  this.type = "Connector";
  this.from = obj1;
  this.to = obj2;
  this.toMarkerInfo = toMarkerInfo; // needed by update()
  var pi = this.computePathInfo(toMarkerInfo);
  var color = typeof line == "string" ? line : "#000";
  var createdBg, createdLine, createdFromMarker, createdToMarker;
  var set = r.set();
  if (bg && bg.split) {
    createdBg = r.path(pi.linePath).attr({stroke: bg.split("|")[0], fill: "none", "stroke-width": bg.split("|")[1] || 3});
    createdBg.classAttributes = ["bg"];
    set.push(createdBg);
  }
  createdLine = r.path(pi.linePath).attr({stroke: color, fill: "none", "stroke-width": 2});
  createdLine.classAttributes = ["line"];
  set.push(createdLine);
  if (fromMarkerInfo) {
    createdFromMarker = r.circle(pi.x1, pi.y1, fromMarkerInfo.radius).attr({stroke: color, fill: "black"});
    createdFromMarker.classAttributes = ["from", "shape"];
    set.push(createdFromMarker);
  }
  if (toMarkerInfo) {
    //eg.log("toMarkerInfo");
    createdToMarker = r.path(pi.arrowPath).attr({stroke: color, fill: "black"});
    createdToMarker.length = toMarkerInfo.length; // Store arrow params ..
    createdToMarker.width = toMarkerInfo.width;   // .. for later reuse.
    createdToMarker.classAttributes = ["to", "shape"];
    set.push(createdToMarker);
  }
  this.bg = createdBg;
  this.line = createdLine;
  this.fromMarker = createdFromMarker;
  this.toMarker = createdToMarker;
  this.set = set;
  this.classAttributes = ["connector"];
  this.mouseover(this.mouseoverEH).mouseout(this.mouseoutEH);
  this.updateClassAttributes();
};
R_fn.Connector.prototype.mouseoverEH = function (e) {
  //eg.log("mouseoverEH, this: ", this);
  this.toFront();
  this.updateClassAttributes(["mouseover"]);
  //eg.preventDefault(e);
};
R_fn.Connector.prototype.mouseoutEH = function (e) {
  this.updateClassAttributes(["mouseoutEH"]);
  eg.preventDefault(e);
};
R_fn.Connector.prototype.computePathInfo = function(toMarkerInfo) {
  var bb1 = this.from.getBBox();
  var bb2 = this.to.getBBox();
  var p = [{x: bb1.x + bb1.width / 2, y: bb1.y - 1},
           {x: bb1.x + bb1.width / 2, y: bb1.y + bb1.height + 1},
           {x: bb1.x - 1, y: bb1.y + bb1.height / 2},
           {x: bb1.x + bb1.width + 1, y: bb1.y + bb1.height / 2},
           {x: bb2.x + bb2.width / 2, y: bb2.y - 1},
           {x: bb2.x + bb2.width / 2, y: bb2.y + bb2.height + 1},
           {x: bb2.x - 1, y: bb2.y + bb2.height / 2},
           {x: bb2.x + bb2.width + 1, y: bb2.y + bb2.height / 2}];
  var d = {}, dis = [];
  for (var i = 0; i < 4; i++) {
    for (var j = 4; j < 8; j++) {
      var dx = Math.abs(p[i].x - p[j].x),
      dy = Math.abs(p[i].y - p[j].y);
      if ((i == j - 4) || (((i != 3 && j != 6) || p[i].x < p[j].x) && ((i != 2 && j != 7) || p[i].x > p[j].x) && ((i != 0 && j != 5) || p[i].y > p[j].y) && ((i != 1 && j != 4) || p[i].y < p[j].y))) {
        dis.push(dx + dy);
        d[dis[dis.length - 1]] = [i, j];
      }
    }
  }
  if (dis.length == 0) {
    var res = [0, 4];
  } else {
    var res = d[Math.min.apply(Math, dis)];
  }
  var
  x1 = p[res[0]].x,
  y1 = p[res[0]].y,
  x4 = p[res[1]].x,
  y4 = p[res[1]].y,
  dx = Math.max(Math.abs(x1 - x4) / 2, 10),
  dy = Math.max(Math.abs(y1 - y4) / 2, 10),
  x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3),
  y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3),
  x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3),
  y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]].toFixed(3),
  linePath = ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3,
              x4.toFixed(3), y4.toFixed(3)].join(","),
  arrowPath = null;
  var fromPos = new eg.Point(x1,y1); // arrow straight along line between connection points
  var toPos = new eg.Point(x4,y4);
  if (toMarkerInfo) {
    var ftU = toPos.sub(fromPos).unit(); // unit vec fromPos -> toPos
    var base = toPos.sub(ftU.mul(toMarkerInfo.length));
    arrowPath = R_fn.eg.computeArrowPath(base, toPos, toMarkerInfo.width);
  }
  this.fromPos = fromPos;
  this.toPos = toPos;
  return { linePath: linePath, x1: x1, y1: y1, arrowPath: arrowPath };
};
R_fn.Connector.prototype.center = function() {
  return this.toPos.sub(this.toPos.sub(this.fromPos).mul(1/2));
};
R_fn.Connector.prototype.update = function() {
  var pi = this.computePathInfo(this.toMarkerInfo);
  this.bg && this.bg.attr({path: pi.linePath});
  this.line.attr({path: pi.linePath});
  this.fromMarker && this.fromMarker.attr({cx: pi.x1, cy: pi.y1});
  this.toMarker && this.toMarker.attr({path: pi.arrowPath});
};
R_fn.Connector.prototype.remove = function() {
  //TODO: probably too much: set inst vars to null && this.set.remove() should be sufficient: but how to prove this?
  this.currMouseover && this.set.unmouseover(this.currMouseover), this.currMouseover = null;
  this.currMouseout && this.set.unmouseout(this.currMouseout), this.currMouseout = null;
  this.currMousedown && this.set.unmousedown(this.currMousedown), this.currMousedown = null;
  this.currMouseup && this.set.unmouseup(this.currMouseup), this.currMouseup = null;
  this.set.remove();
  this.set = null;
  // this.from = null; this.to = null; // can hurt (in case of needed connected widgets sinfo after being removed)
};
R_fn.Connector.prototype.addClassAttribute = function(attrStr) {
  if (! this.classAttributes) {
    this.classAttributes = [];
  }
  if (! eg.arrContains(this.classAttributes, attrStr)) {
    this.classAttributes.push(attrStr);
    this.updateClassAttributes();
  }
};
R_fn.Connector.prototype.removeClassAttribute = function(attrStr) {
  if (! this.classAttributes) {
    return;
  }
  if (eg.arrContains(this.classAttributes, attrStr)) {
    this.classAttributes.splice(this.classAttributes.indexOf(attrStr));
    this.updateClassAttributes();
  }
};  
R_fn.Connector.prototype.updateClassAttributes = function(moreAttrsOrNil) {
  var attrs = moreAttrsOrNil ? moreAttrsOrNil : [];
  if (this.classAttributes) {
    attrs = attrs.concat(this.classAttributes);
  }
  this.set && this.set.forEach(function(e) { e.updateClassAttributes(attrs); });
};
//TODO: switch to jQuery event handling?
R_fn.Connector.prototype.mouseover = function(fun) {
  var newMouseover = eg.bindAsEventListener(fun, this);
  if (this.currMouseover) {
    this.set.unmouseover(this.currMouseover);
  }
  this.set.mouseover(newMouseover);
  this.currMouseover = newMouseover;
  return this;
};
R_fn.Connector.prototype.mouseout = function(fun) {
  var newMouseout = eg.bindAsEventListener(fun, this);
  if (this.currMouseout) {
    this.set.unmouseout(this.currMouseout);
  }
  this.set.mouseout(newMouseout);
  this.currMouseout = newMouseout;
  return this;
};
R_fn.Connector.prototype.mousedown = function(fun) {
  var newMousedown = eg.bindAsEventListener(fun, this);
  if (this.currMousedown) {
    this.set.unmousedown(this.currMousedown);
  }
  this.set.mousedown(newMousedown);
  this.currMousedown = newMousedown;
  return this;
};
R_fn.Connector.prototype.mouseup = function(fun) {
  var newMouseup = eg.bindAsEventListener(fun, this);
  if (this.currMouseup) {
    this.set.unmouseup(this.currMouseup);
  }
  this.set.mouseup(newMouseup);
  this.currMouseup = newMouseup;
  return this;
};
R_fn.Connector.prototype.toFront = function() {
  this.set.toFront();
};
R_fn.Connector.prototype.toString = function() {
  return "Connector";
};
R_fn.Connector.prototype.toJSON = function() {
  return {
    type: this.type,
    from: this.from,
    to: this.to
  };
};
R_fn.diamond = function (x, y, width, height) {
  var res = this.path('M' +(x+width/2)+' '+y
                      +'L'+(x+width)  +' '+(y+height/2)
                      +'L'+(x+width/2)+' '+(y+height)
                      +'L'+ x         +' '+(y+height/2)
                      +'L'+(x+width/2)+' '+y);
  res.rytType = 'diamond';
  return res;
};


// Raphael widgets
//

(function() {
  var ns = R_fn.eg; // set namespace
  // Widgets
  ns.createWidget = function (parentOrNil) {
    var widget = this.set();
    widget.paper = this; // raphael set does not have paper (only its elements)
    widget.parentWidget = parentOrNil;
    widget.toString = function () { return "Widget"; };
    widget.handleClick = function (handler) {
      this.click(handler);
    };
    widget._setPush = widget.push;
    widget.push = function (arg) {
      arg.addClassAttribute("widget");
      return widget._setPush(arg);
    }
    widget.getREvents = function () {
      return this[0].events // anchor
        || (this[0].getREvents && this[0].getREvents()) // go recursively
        || [];
    };
    return widget;
  };
})();

R_fn.eg.logMousedown = function (e) {
  eg.log("logMousedown()");
};
R_fn.eg.defaultMousedown = function (e) {
  this.addClassAttribute("mousedown");
  eg.stopPropagation(e);
  eg.preventDefault(e);
};
R_fn.eg.defaultMouseup = function (e) {
  this.removeClassAttribute("mousedown");
  eg.stopPropagation(e);
  eg.preventDefault(e);
};
R_fn.eg.defaultMousemove = function (e) {
  //eg.preventDefault(e);
};
R_fn.eg.defaultTextFieldAttributes = function () {
/*
caption
    The font used for captioned controls (e.g., buttons, drop-downs, etc.).
icon
    The font used to label icons.
menu
    The font used in menus (e.g., dropdown menus and menu lists).
message-box
    The font used in dialog boxes.
small-caption
    The font used for labeling small controls.
status-bar
    The font used in window status bars.
*/
  return {
    text: {
      //style="font-family: impact, georgia, times, serif; font-weight: normal; font-style: normal"
      //'font-family':"Arial",//'font-family':"monospace",//'font-family':"Courier New", 'font-weight':"lighter",
      'font-family':"Arial", 
      'font-size':14, 'text-anchor':"start", 'fill':"white", 'stroke':"white"
    },
    bg: {'fill':"black", 'stroke':"white"},
    borders: { left:5, right:5, top:2, bottom:2 }, // distance between text and border
    minDims: (new eg.Point(10,10)) // avoid invisible fields
  };
};
R_fn.eg.defaultRectCornerRadius = 10;
R_fn.eg.setDefaultRectCornerRadius = function (r) {
  R_fn.eg.defaultRectCornerRadius = r;
};

// fails for text "  " and longer (more than one space)
R_fn.eg.createTextFieldAtXY = function (x,y, textArg, attrsOrNil) {
  var rect_r = R_fn.eg.defaultRectCornerRadius;
  var attrs = this.eg.defaultTextFieldAttributes();
  if (attrsOrNil) {
    // overwrite default attributes by specific ones
    eg.copyProps(attrsOrNil.text, attrs.text);
    eg.copyProps(attrsOrNil.bg, attrs.bg);
    eg.copyProps(attrsOrNil.borders, attrs.borders);
    if (attrsOrNil.minDims) {
      attrs.minDims = attrsOrNil.minDims;
    }
    if (attrs.rectCornerRadius) {
      rect_r = rectCornerRadius;
    }
  }
  if (textArg && textArg !== " ") {
    var limit = 30;
    var text;
    if (textArg.length <= limit) {
      text = textArg;
    } else {
      text = eg.wordWrapIntoTwoLines(textArg, 10); // only try it after 10 chars
    }
    // does not work:
    // attrs.text.title = 'aTitle';
    var
    textShape = this.text(0, 0, text).attr(attrs.text),
    tBB = textShape.getBBox();
  }
  var dims =
    attrs.minDims
    .max(new eg.Point(tBB ? tBB.width+attrs.borders.left+attrs.borders.right : 0,
			  tBB ? tBB.height+attrs.borders.top+attrs.borders.bottom : 0)),
  bgShape = this.rect(x,y,dims.x,dims.y, rect_r).attr(attrs.bg),
  field = this.eg.createWidget();
  field.push(bgShape);
  field.bgShape = bgShape;
  bgShape.addClassAttribute("background");
  if (textShape) {
    textShape
      .moveCenterToP(bgShape.center()
                     .add(eg.Point.xy((attrs.borders.left-attrs.borders.right)/2,
                                      (attrs.borders.top-attrs.borders.bottom)/2)))
      .toFront();
    field.push(textShape);
    textShape.addClassAttribute("text");
  }
  // settings for all components
  field.addClassAttribute("textfield");
  return field;
};
R_fn.eg.createTextFieldAt = function (pos, text, attrsOrNil) {
  return this.eg.createTextFieldAtXY(pos.x,pos.y, text, attrsOrNil);
};
R_fn.eg.createTextField = function (text, attrsOrNil) {
  return this.eg.createTextFieldAtXY(0,0, text, attrsOrNil);
};

R_fn.eg.createButtonFrom = function (widget) {
  widget.addClassAttribute("button");
  //widget.mousedown(eg.bindAsEventListener(R_fn.eg.logMousedown,     widget));
  widget.mousedown(eg.bindAsEventListener(R_fn.eg.defaultMousedown, widget));
  widget.mouseup  (eg.bindAsEventListener(R_fn.eg.defaultMouseup,   widget));
  widget.mouseout (eg.bindAsEventListener(R_fn.eg.defaultMouseup,   widget));
  return widget;
};
R_fn.eg.createTextButtonAtXY = function (x,y, text, attrsOrNil) {
  var textField = this.eg.createTextFieldAtXY(x,y, text, attrsOrNil);
  return this.eg.createButtonFrom(textField);
};
R_fn.eg.createTextButtonAt = function (pos, text, attrsOrNil) {
  return this.eg.createTextButtonAtXY(pos.x, pos.y, text, attrsOrNil);
};
R_fn.eg.createTextButton = function (text, attrsOrNil) {
  return this.eg.createTextButtonAtXY(0, 0, text, attrsOrNil);
};
/*
R_fn.eg.createOnOffButtonFrom.clickHandler = function () {
  this.toggle();
};
*/
R_fn.eg.createOnOffButtonFrom = function (offButton, onButton,
					  alignmentFlag) {
  var fneg = R_fn.eg;
  var onOffButton = this.eg.createWidget();
  onOffButton.offButton = offButton;
  onOffButton.onButton = onButton;
  onOffButton.push(offButton);
  onOffButton.push(onButton);
  onOffButton.addClassAttribute("onOffButton");
  offButton.addClassAttribute("off");
  onButton.addClassAttribute("on");
  // alignment
  if (alignmentFlag) { // take offButton origin as origin of composite
    onButton.moveCenterToP(offButton.center());
    onOffButton.moveToP(offButton.origin());
  }
  // state
  onOffButton.state = { onFlag: false, enabled: true };
  onOffButton.isOn = function () { return this.state.onFlag; };
  onOffButton.isOff = function () { return ! this.state.onFlag; };
  onOffButton.setOn = function () {
    this.offButton.hide();
    this.onButton.show();
    this.state.onFlag = true;
  };
  onOffButton.setOff = function () {
    this.onButton.hide();
    this.offButton.show();
    this.state.onFlag = false;
  };
  onOffButton.toggle = function () {
    this.state.onFlag ? this.setOff() : this.setOn();
    //eg.log("this.state.onFlag: ", this.state.onFlag);
  };
  onOffButton.enable = function () {
    onOffButton.state.enabled = true;
  };
  onOffButton.disable = function () {
    onOffButton.state.enabled = false;
  };
  onOffButton.setOff();//TODO refactor state
  onOffButton.enable();//TODO refactor state
  // events
  onOffButton.click(eg.bindAsEventListener((function() {
    if (this.state.enabled) {
      this.toggle();
    }
  }), onOffButton));
  onOffButton.mousedown(eg.bindAsEventListener(fneg.defaultMousedown, onOffButton));
  onOffButton.mouseup  (eg.bindAsEventListener(fneg.defaultMouseup,   onOffButton));
  onOffButton.mouseout (eg.bindAsEventListener(fneg.defaultMouseup,   onOffButton));
  //onOffButton.mousemove(fneg.defaultMousemove.bindAsEventListener(onOffButton));
  return onOffButton;
};

// for connectors.js
R_fn.eg.createOnOffTextButtonAt = function (pos, textOff, textOn, textAttributesOff, textAttributesOn,
                                            bgAttributesOff, bgAttributesOn,
                                            minDimensions) {
  // this is needed to ensure same size of both text buttons
  var textFieldOff = this.eg.createTextFieldAt(eg.Point.zero, textOff, textAttributesOff, bgAttributesOff, minDimensions);
  var textFieldOn = this.eg.createTextFieldAt(eg.Point.zero, textOn, textAttributesOn, bgAttributesOn, minDimensions);
  var dimsToFitBoth = textFieldOff.extent().max(textFieldOn.extent());
  textFieldOff.remove();
  textFieldOn.remove();
  var offButton = this.eg.createTextButtonAt(pos, textOff, textAttributesOff, bgAttributesOff, dimsToFitBoth);
  var onButton = this.eg.createTextButtonAt(pos, textOn, textAttributesOn, bgAttributesOn, dimsToFitBoth);
  return this.eg.createOnOffButtonFrom(offButton, onButton, true);
};
// textOn === "" -> same as textOff; textOn === " " -> only bg; text === "  " (only spaces and more than 1) -> fail!
R_fn.eg.createOnOffTextButton = function (textOff, textOn, textAttributesOff, textAttributesOn,
                                          bgAttributesOff, bgAttributesOn,
                                          minDimensions) {
  var textOnInner = textOn || textOff;
  return this.eg.createOnOffTextButtonAt(eg.Point.zero, textOff, textOnInner, textAttributesOff, textAttributesOn,
                                         bgAttributesOff, bgAttributesOn, minDimensions);
};
// state is null if no radio button is on: check for null to get 0 index (trap: boolean logic is the same for 0 and null!)
R_fn.eg.createRadioButtons = function (onOffButtons, onIndexOrNil) {
  var radioButtons = this.eg.createWidget();
  radioButtons.state = typeof onIndexOrNil === 'number' ? onIndexOrNil : null;
  function switchButtonHandler (e) {
    if (this.isOn()) {
      this.disable();
      for (var i = 0; i < radioButtons.length; ++i) {
        var b = radioButtons[i];
        if (b === this) {
          radioButtons.state = i;
        } else {
          b.setOff();
          b.enable();
        }
      }
    }
  }
  for (var i = 0; i < onOffButtons.length; ++i) {
    var button = onOffButtons[i];
    if (onIndexOrNil === i) {
      button.setOn();
      button.disable();
    } else {
      button.setOff();
      button.enable();
    }
    button.click(eg.bindAsEventListener(switchButtonHandler, button));
    radioButtons.push(button);
  }
  return radioButtons;
};
R_fn.eg.defaultMilestonesWidgetAttributes = function () {
  return {
    bg: {'fill':"black", 'stroke':"black"},
    begin: {'fill':"grey", 'stroke':"grey"},
    end: {'fill':"grey", 'stroke':"grey"},
    milestone: {'fill':"violet"},
    marker: {'fill':"grey"}
  };
};
R_fn.eg.createMilestonesWidget = function (pos, width, milestoneExtent, attributes) {
  var self = this;
  var attrs = attributes || this.eg.defaultMilestonesWidgetAttributes();
  var innerWidth = width - milestoneExtent.x, height = milestoneExtent.y;
  var innerOff = milestoneExtent.x/2;
  var bgShape = this.rect(pos.x, pos.y, width, height).attr(attrs.bg);
  var beginShape = this.rect(pos.x, pos.y, innerOff, height).attr(attrs.begin);
  var endShape = this.rect(pos.x+width - innerOff, pos.y, innerOff, height).attr(attrs.end);
  var widget = this.eg.createWidget();
  widget.push(bgShape); widget.bgShape = bgShape;
  widget.push(beginShape); widget.beginShape = beginShape;
  widget.push(endShape); widget.endShape = endShape;
  widget.milestones = [ ];
  widget.markers = [ ];
  widget._update = function () {
    beginShape.toFront(); // is there a rel variant (only in front inside widget)?
    endShape.toFront();
    this.markers.forEach(function(m) { m.toFront(); });
  };
  widget._posFromLocFraction = function (locFraction) {
    var bbox = this.getBBox();
    var innerX = bbox.x + innerOff;
    var x = innerX + innerWidth * locFraction;
    return { x:x, y: bbox.y };
  }
  widget.createMilestone = function (locFraction) { // 0 <= locFraction <= 1
    var pos = this._posFromLocFraction(locFraction);
    var milestone = self.diamond(pos.x - innerOff, pos.y, milestoneExtent.x, milestoneExtent.y).attr(attrs.milestone);
    this.milestones.push(milestone);
    this._update();//TODO
    return milestone;
  };
  widget.createMarker = function (locFraction) { // 0 <= locFraction <= 1
    var pos = this._posFromLocFraction(locFraction);
    //eg.log("pos 1: ",pos);
    var marker = self.circle(pos.x, pos.y + milestoneExtent.y/2, milestoneExtent.x/2, milestoneExtent.y/2).attr(attrs.marker);
    this.markers.push(marker);
    this._update();//TODO
    return marker;
  };
  widget.moveMilestoneTo = function (ix, locFraction) {
    var pos = this._posFromLocFraction(locFraction);
    var milestone = this.milestones[ix].moveTo(pos.x - innerOff, pos.y);
    this._update(); //TODO: check if needed (timeout?)
  };
  widget.moveMarkerTo = function (ix, locFraction) {
    if (locFraction < 0) throw "debugger";
    var pos = this._posFromLocFraction(locFraction);
    //eg.log("pos 2: ",pos, "locFraction: ", locFraction);
    var marker = this.markers[ix].moveTo(pos.x - milestoneExtent.x/2, pos.y);
    this._update(); //TODO: check if needed (timeout?)
  };
  widget.removeMilestones = function () {
    this.milestones.forEach(function(m) {
      m.remove();
    });
    this.milestones = [];
  }
  return widget;
};


// layout
//

// args may contain the following objects:
//   rect: eg.Rect -> area to layout widgets into (paper dimensions)
//   direction: "down" | "right" -> main direction (down)
//   offsets: eg.Point -> offset between widgets (eg.Point.zero())
R_fn.eg.layoutWidgets  = function (widgets, args) {
  var offsets = args.offsets ? args.offsets : eg.Point.zero();
  canvasBBox = this.canvas.getBBox();
  var limit = eg.Point.xy(canvasBBox.width, canvasBBox.height);
  var borderRect = args.rect
    ? args.rect
    : new eg.Rect(eg.Point.zero(), limit);
  var pos, maxInLine;
  pos = maxInLine = borderRect.origin();
  var nextPosAfterFn, lineOff, lineSwitchOff, lineSwitchFn;
  if (args && args.direction === "right") {
    nextPosAfterFn = function (widget) { return widget.topRight(); };
    lineOff = eg.Point.xy(offsets.x, 0);
    lineSwitchOff = eg.Point.xy(0, offsets.y);
    lineSwitchFn = function (maxInLine) {
      return eg.Point.xy(borderRect.origin().x, maxInLine.y + offsets.y);
    };
  } else {
    nextPosAfterFn = function (widget) { return widget.bottomLeft(); };
    lineOff = eg.Point.xy(0, offsets.y);
    lineSwitchOff = eg.Point.xy(offsets.x, 0);
    lineSwitchFn = function (maxInLine) {
      return eg.Point.xy(maxInLine.x + offsets.x, borderRect.origin().y);
    };
  }
  for (var i = 0; i < widgets.length; ++i) {
    var w = widgets[i];
    w.moveToP(pos);
    // compute if there should be a line (col or row) change
    if (notTheFirst) { // no line switch for very first widget not fitting
      if (! borderRect.containsPoint(nextPosAfterFn(w))) {
        pos = lineSwitchFn(maxInLine);
        maxInLine = eg.Point.zero();
        w.moveToP(pos);
      }
    } else {
      var notTheFirst = true;
    }
    maxInLine = maxInLine.max(w.corner());
    pos = nextPosAfterFn(w).add(lineOff); // pos to be tried for next widget
  }
};

// canvas resize
R_fn.neededViewDims = function () {
  // fallback for getBBox() returning null (FF 3.5): may be larger than bbox
  var box = this.canvas.getBBox()
    || this.canvas.getBoundingClientRect();
  var neededWidth = box.width + (box.x !== undefined ? box.x : box.left);
  var neededHeight = box.height + (box.y !== undefined ? box.y : box.top);
  return eg.Point.xy(neededWidth, neededHeight);
};
R_fn.currentViewDims = function () {
  var parentNode = this.canvas.parentNode;
  return eg.Point.xy(parentNode.clientWidth, parentNode.clientHeight);
};
R_fn.updateCanvasSize = function () { // set to at least dims of ..
  var currentDims = this.currentViewDims(); // .. div around
  var neededDims = this.neededViewDims();
  var newDims = currentDims.max(neededDims);
  this.setSize(newDims.x, newDims.y);
};


// spinner

R_fn.eg.createSpinnerAtXY = function(x, y, minRadius) {
  minRadius = minRadius || 0;
  var r = this;
  var spinner = this.circle(x, y, minRadius)
    .attr({fill: "#fa0", opacity: 0.5});
  spinner.toBack();
  var timeout;
  var text;
  spinner.animate = function(ms, steps, maxRadius, increaseFlag, once) {
    var rStep = (maxRadius - minRadius) / steps;
    var msStep = ms / steps;
    var fun = function(i){
      var rem = i % steps;
      var radius = ((increaseFlag ? rem + 1 : steps - rem) * rStep
                    + minRadius);
      //eg.log(radius, timeout);
      spinner.attr({ r: radius } );
      if (++i === steps && once) {
        return;
      }
      timeout = setTimeout(function(){ fun(i); },
                           msStep);
    };
    fun(0);
  };
  spinner.start = function(ms, steps, maxRadius, increaseFlag, textOrNil, once) {
    text = textOrNil && r.eg.createTextFieldAt(
      eg.Point.xy(x, y), textOrNil, {
        bg: {'fill':"black", 'stroke':"black"}
      }
    );
    if (! timeout) {
      spinner.animate(ms, steps, maxRadius, increaseFlag, once);
    }
  };
  spinner.stop = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    text && (text.remove(), text = null);
  };
  return spinner;
};


}(Raphael, EvolGo)); // (function(Raphael, eg)
