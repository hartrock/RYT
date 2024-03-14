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

var EvolGo = EvolGo || {}, RYT = RYT || {};

// FlowEditor
//

(function(eg, ryt) {
  function FlowEditor(raphaelPaper) {
    this.instanceCount = ++FlowEditor.instanceCount;
    this.r = raphaelPaper;
    var canvas = $(this.r.canvas).parent().get(0);
    this.canvas = canvas;
    // GUI state
    this.state = {
      mousedownPos: null, dragPos: null,
      isConnecting: false,
      selected: new eg.Set(), selectedConnections: new eg.Set(),
      connLeader: this.makeConnectionLeader(), connLeaderConns: [],
      marblesRollFlag: true // could be used
    };
    this.widgets = [];
    this.connections = [];
    this.animationCount = 0;
    this.animationTime = 1000;
    this.pushAnimationFactor = 1/4;

    // event handlers
    //
    // shape/widget
    var self = this;
    function addBlockedCheck(handler, skipAllPred, dbg) {
      return function(e) {
        //eg.log("addBlockedCheck:", e, dbg);
        if (skipAllPred && skipAllPred(e)) {
          eg.stopPropagationPreventDefault(e);
          return;
        }
        if (self.isBusy()) {
          ryt.app ? ryt.app.busyAlert() : alert("I'm busy...");
          eg.stopPropagationPreventDefault(e);
          return;
        }
        handler.call(this, e);
      };
    }
    this.widgetMousedown = addBlockedCheck(function (e) {
      e = e || window.event;
      eg.log("widgetMousedown", "e: ", e,
             "e.altKey: " +e.altKey,
             "e.metaKey: " +e.metaKey,
             "e.ctrlKey: " +e.ctrlKey);
      if (e.button === 2) {
        return; // context menu click
      }
      self.state.mousedownPos = self.canvasMousePos(e);
      var target = eg.targetWithPosition(e);
      if ((e.ctrlKey
           || (target.raphael
               && target.raphael.containsClassAttribute('connectArea')))
          && ! self.state.isConnecting) {
        self.addSelection(this); // this is widget here
        self.startConnect(e.shiftKey); // reversed with shift-key
      } else {
        if (e.metaKey) {
          self.switchSelection(this);
        } else if (e.shiftKey) {
          self.switchSelection(this);
        } else {
          if (! self.state.selected.contains(this)) {
            self.unselectAll();
            self.addSelection(this);
          }
        }
      }
      eg.stopPropagationPreventDefault(e); // avoid small rects during dragging
    }, function() { // If already dragging, just ignore redundant click ..
      return self.state.dragPos; // .. (may come after mouseup outside canvas).
    });
    this.sendWidgetsMovedAndPushCovered = function() {
      self.send({ event:"widgetsMoved", widgets: self.state.selected.asArray(), triggeredBy: self.toString() });
      var neededDims = self.r.neededViewDims(); // keep widgets in area visible
      var visibleAreaRect = eg.Rect.originExtent(eg.Point.zero(), neededDims);
      self.pushCoveredWidgets(self.state.selected, visibleAreaRect, {}, {});
      self.r.updateCanvasSize();
    };
    this.widgetMouseup = function (e) {
      e = e || window.event;
      //eg.log("widgetMouseup()", e);
      self.state.mousedownPos = null;
      if (self.state.isConnecting) {
        var source, target;
        if (self.state.isConnectingReversed) {
          source = this;
        } else {
          target = this;
        }
        var conns = self.state.connLeaderConns;
        var forConnLeaderConnsFN = function (conn) {
          if (self.state.isConnectingReversed) {
            target = conn.to;
          } else {
            source = conn.from;
          }
          //eg.log(source, target);
          if (source != target) {
            var connWithMeAndTarget
              = eg.arrDetect(self.connections, function(c) {
                return ( (c.from === source && c.to === target)
                         || (c.from === target && c.to === source) );
              });
            if (! connWithMeAndTarget) {
              self.createConnection(source, target, self.toString());
            }
          }
        }
        self.state.connLeaderConns.forEach(forConnLeaderConnsFN);
        this.removeClassAttribute("connover"); this.updateClassAttributes();
        self.endConnect();
      } else if (self.state.dragPos) {
        self.sendWidgetsMovedAndPushCovered();
        if (self.state.selected.size() === 1 && !(e.shiftKey || e.metaKey)) {
          self.unselectAll();
        }
        self.endDrag();
      } else {
        if (e.shiftKey) {
          // keep selected
        } else if (e.metaKey) { 
          // switch in mousedown
        } else {
          self.unselectAll();
        }
      }
      self.setKeyboardFocus(e);
      eg.stopPropagationPreventDefault(e); // no canvas mouseup after widgetMouseup
    }; // widgetMouseup()
    this.widgetMouseover = function (e) {
      this.toFront();
      if (self.state.isConnecting) {
        this.addClassAttribute("connover");
        this.updateClassAttributes();
      }
    };
    this.widgetMouseout = function (e) {
      if (self.state.isConnecting) {
        this.removeClassAttribute("connover");
        this.updateClassAttributes();
      }
    };
    this.widgetDblclick = function (e) {
      e = e || window.event;
      //eg.log("widgetDblclick(), e:", e);
      if (! e.shiftKey) { //!
        return;
      }
      //old: self.rollFor(this, false);
      eg.stopPropagationPreventDefault(e);
    };
    // connection
    this.connectionMousedown = addBlockedCheck(function(e) {
      e = e || window.event;
      if (e.button === 2) {
        return; // context menu click
      }
      self.state.mousedownPos = self.canvasMousePos(e);
      self.addSelectionConn(this);
      if (e.shiftKey) {
        return;
      }
      var dFrom = self.state.mousedownPos.sub(this.fromPos).abs();
      var dTo = self.state.mousedownPos.sub(this.toPos).abs();
      var reversed = dFrom < dTo;
      // break conns and add suited widget selections
      function fnConnAction (conn) {
        //eg.log(self.connections.indexOf(conn));
        self.addSelection((!reversed) ? conn.from : conn.to);
        self.deleteConnection(conn, self.toString());
      }
      self.state.selectedConnections.forEach(fnConnAction);
      self.state.selectedConnections = new eg.Set();
      self.startConnect(reversed);
      eg.stopPropagationPreventDefault(e);
    });

    // canvas event handlers
    // Notes:
    // - For browser compatibility <svg> node is not suited as event target; its parent is used instead.
    // - Var canvas here (being <body> or <div>) is parent of r.canvas (being Raphael's <svg> node).
    canvas.onmousedown = addBlockedCheck(function (e) {
      e = e || window.event;
      //eg.log("canvas "+canvas.id+" onmousedown(); e.clientX: ", e.clientX, ", e.clientY: ", e.clientY, ", e: ", e);
      if (e.button === 2) { // context menu click
        //eg.log(e);
        if (ryt.info.contextmenuEventWorkaround) {
          var ne = $.Event('contextmenu');
          ne.pageX = e.pageX;
          ne.pageY = e.pageY;
          $(canvas).trigger(ne);
        }
        return;
      }
      self.state.mousedownPos = self.canvasMousePos(e);
      if (e.ctrlKey
          && ! self.state.isConnecting) {
        self.startConnect(true);
      }
      eg.stopPropagationPreventDefault(e); // avoid marker rects
    });
    canvas.onmousemove = function (e) {
      // to be compatible with older browsers (FF 3.5.16)
      function isMovable(target) {
        // only for newer browsers:
        //   return $(target).closest(".widget").size();
        if (! target || target.tagName === "svg") {
          return false;
        }
        if (target.raphael) {
          return target.raphael.containsClassAttribute('movable');
        }
        return isMovable(target.parentNode);
      }
      //eg.log("onmousemove", e);
      if (self.animationCount) {
        return; // don't interact with animation
      }
      e = e || window.event;
      self.state.lastMoveEvent = e;
      if (! self.state.mousedownPos) { // no drag
        return;
      }
      if (! (self.state.dragPos || self.state.rectSelectPos)) { // start drag
        var target = eg.targetWithPosition(e);
        if (self.state.selected.size()
            && isMovable(target)) {
          self.state.dragPos = self.state.mousedownPos;
        } else {
          self.state.rectSelectPos = self.state.mousedownPos;
        }
      }
      var mousePos = self.canvasMousePos(e);
      if (self.state.dragPos) { // isDragging
        var translation = mousePos.sub(self.state.dragPos);
        function fnMoveWidget (s) {
          s.translate(translation.x,
                      translation.y);
        }
        self.state.selected.forEach(fnMoveWidget);
        self.updateConnections();
        if (self.state.isConnecting) {
          self.state.connLeaderConns.forEach(function(c){
            c.update();
          });
        }
        self.r.safari();
        self.state.dragPos = mousePos;
      } else {
        var origin = self.state.rectSelectPos;
        var width = Math.abs(mousePos.x - origin.x);
        var height = Math.abs(mousePos.y - origin.y);
        var x = Math.min(origin.x, mousePos.x);
        var y = Math.min(origin.y, mousePos.y);
        if (! self.state.rectSelect) {
          self.state.rectSelect =
            self.r.rect(x, y, width, height)
            .attr({'fill':"white", 'fill-opacity':0.2, 'stroke':"black"});
        } else {
          self.state.rectSelect.attr(
            {x: x, y: y, width: width, height: height});
        }
      }
    };
/* // for differentiating between canvases
      if (eg.targetWithPosition(e) !== self.r.canvas) { }
*/
    canvas.onmouseup = function (e) {
      e = e || window.event;
      //eg.log("canvas "+canvas.id+" onmouseup()"
      //       +", eg.targetWithPosition(e): ", eg.targetWithPosition(e));
      //eg.log("$(canvas).get(0)", $(canvas).get(0), "self.r.canvas: ", self.r.canvas);
      self.state.mousedownPos = null;
      self.endConnect();
      if (self.state.dragPos) { // widget(s) drag
        self.sendWidgetsMovedAndPushCovered();
        self.endDrag();
      } else if (self.state.rectSelectPos) {
        var selectRect = self.state.rectSelect.egRect();
        self.widgets.forEach(function(w) {
          var wRect = w.egRect();
          var is = wRect.intersection(selectRect);
          if (is) {
            self.switchSelection(w);
          }
        });
        self.state.rectSelect.remove();
        self.state.rectSelectPos = self.state.rectSelect = null;
      } else if (! e.shiftKey) { // mouseup not ending drag or rect select
        self.unselectAll();
      }
      //!!
      self.setKeyboardFocus(e);
      //eg.stopPropagation(e); // mouseup needed by jquery dialog
    };
    canvas.onmouseout = eg.makeEatThemEventHandler("canvas.onmouseout");

    this.mousePosIfNoLastMoveEvent = eg.Point.xy(100, 100);
    // Key presses arrive at other locations (not at canvas here nor Raphael's canvas (different entities)).
    function onkeydown(e) {
      e = e || window.event;
      var target = eg.targetWithPosition(e);
      eg.log("onkeydown:", e, "target:", target);
      if (target.nodeName !== 'TEXTAREA') { // Don't handle task dialog textareas here.
        if (e.keyCode === 46 || e.ctrlKey && e.keyCode === 88) { // del or cut (ctrl-x)
          self.deleteOrCut(e.keyCode === 88);
        }
        else if (e.ctrlKey) {
          switch (e.keyCode) {
          case 67: // 'c'
            if (e.altKey) {
              self.sendExportEvent();
            } else {
              self.sendCopyEvent();
            }
            break;
          case 69: // 'e': ctrl-E is occupied under FF Linux
            break;
          case 65: // 'a'
            self.selectAll();
            // Google Chrome: avoids selecting wrong (too many) elements
            eg.preventDefault(e);
            break;
          case 86: // 'v'
            if (e.altKey) {
              self.sendImportEvent();
            } else {
              if (e.shiftKey) {
                self.sendAliasEvent();
              } else {
                self.sendPasteEvent();
              }
            }
            break;
          case 73: // 'i': ctrl-i is occupied under FF Linux
            break;
          }
        }
      }
      eg.stopPropagation(e); // Not with PreventDefault(e): this blocks eg. ..
      // .. reload page (Ctrl-r) and ESC in dialog
    } // onkeydown()

    /* // adds multiple handlers, if called multiple
    $(canvas.parentNode).keydown(
      addBlockedCheck(onkeydown, function(){ return self.state.dragPos; }, "here 1")
    */
    // replaces old handler
    // old (kept until clear, that new version works reliably):
    //   canvas.parentNode.onkeydown
    canvas.onkeydown = addBlockedCheck(
      onkeydown,
      function(){ return self.state.dragPos; } // avoid busy alert, if pressing some key while dragging
    );

    // busyness
    //eg.log("[] before busyCount = 0:", this.busyCount);
    this.busyCount = 0;
  }; // FlowEditor()

  var protoFE = FlowEditor.prototype;
  FlowEditor.instanceCount = 0;
  protoFE.toString = function () {
    return "FlowEditor["+this.instanceCount+"]";
  };

  protoFE.deleteOrCut = function (cutFlag) {
    this.sendConnsWidgetsPosEvent(cutFlag ? 'justBeforeCut' : 'justBeforeDelete');
    if (this.state.selectedConnections.size()
        || this.state.selected.size()) {
      var self = this;
      this.channel.openBatch(this.toString());
      this.state.selectedConnections.forEach(function(w){
        self.deleteConnection(w, self.toString());
      });
      this.state.selected.forEach(function(w){
        self.deleteWidget(w, self.toString());
      });
      this.unselectAll();
      this.channel.closeBatch(this.toString());
    }
    this.sendWidgetsPosEvent(cutFlag ? 'justAfterCut' : 'justAfterDelete');
  }

  protoFE.sendPosEvent = function (name) {
    this.send({ event: name,
                pos: (this.canvasMousePos(this.state.lastMoveEvent)
                      || this.mousePosIfNoLastMoveEvent)
              });
  };
  protoFE.sendWidgetsPosEvent = function (name) {
    this.send({ event: name,
                widgets: this.state.selected.asArray(),
                pos: (this.canvasMousePos(this.state.lastMoveEvent)
                      || this.mousePosIfNoLastMoveEvent)
              });
  };
  protoFE.sendConnsWidgetsPosEvent = function (name) {
    this.send({ event: name,
                conns: this.state.selectedConnections.asArray(),
                widgets: this.state.selected.asArray(),
                pos: (this.canvasMousePos(this.state.lastMoveEvent)
                      || this.mousePosIfNoLastMoveEvent)
              });
  };
  protoFE.sendCopyEvent = function () {
    this.sendWidgetsPosEvent('copy');
  };
  protoFE.sendPasteEvent = function () {
    this.sendPosEvent('paste');
  };
  protoFE.sendAliasEvent = function () {
    this.sendPosEvent('alias');
  };
  protoFE.sendExportEvent = function () {
    this.sendWidgetsPosEvent('export');
  };
  protoFE.sendImportEvent = function () {
    this.sendPosEvent('import');
  };
  protoFE.canvasMousePos = function (e) {
    e = e || window.event;
    if (! e) {
      return eg.Point.zero;
    }
    var canvasOffset = $(this.canvas).offset();
    // pageX, pageY takes care of srcrolled canvas (in opposite to clientX,
    // clientY)
    var pos = eg.Point.xy(e.pageX - canvasOffset.left, e.pageY - canvasOffset.top);
    return pos;
  };
  protoFE.removeFromGUI = function () {
    document.onmousedown = null;
    document.onmousemove = null;
    document.onmouseup = null;
    document.onmouseout = null;
    document.onkeydown = null;
    var widgets = eg.$A(this.widgets), i;
    for (i = widgets.length; i--;) {
      this.deleteWidget(widgets[i]); // should indirectly remove conns
    }
  };
  // questioning from outside
  protoFE.isBusy = function () {
    return this.busyCount > 0 || this.state.dragPos;
  };

  protoFE.pushCoveredWidgets = function (fromWidgets, visibleAreaRect,
                                         fromTranslations, triggerWidgets) {
    var self = this;
    var callback;
    var border = 10;
    var toBeMoved = [];
    var translations = {};
    fromWidgets.forEach(function(fw){
      if (eg.arrContains(toBeMoved, fw)) {
        return; // compute covered widgets of it later (after being moved)
      }
      var fwRect = fw.egRect();
      var fwRectWithBorder = fwRect.withBorderAround(border);
      var fwTrans = fromTranslations[fw.data];
      self.widgets.forEach(function(w) {
        if (fw === w // no coverage with itself
            || w.data in triggerWidgets) /* already handled */ {
          return;
        }
        var wRect = w.egRect();
        var is = wRect.intersection(fwRectWithBorder);
        if (is && is.area() >= 0.01) { // due to inaccuracies given minArea
          triggerWidgets[fw.data] = fw.data; // use it only once for pushing
          var dir;
          // Move covered rect into its direction seen from covering one ..
          if (fwTrans) { // .. if covering widget has been translated, ..
            dir = fwTrans; // .. use dir of this translation, else ..
          } else {// .. compute by preferring vertical and horizontal movement.
            if (is.height() < fwRectWithBorder.height() / 2
                || is.width() > wRect.width() / 2) { // prefer vertical direction
              dir = (is.center().y <= fwRectWithBorder.center().y
                     ? eg.Point.xy(0,-1)
                     : eg.Point.xy(0,+1));
            } else if (is.width() <= fwRectWithBorder.width() / 2) {
              dir = (is.center().x <= fwRectWithBorder.center().x
                     ? eg.Point.xy(-1,0)
                     : eg.Point.xy(+1,0));
            } else {
              dir = wRect.center().sub(fwRectWithBorder.center());
            }
          }
          var trans = eg.rectBehindRectTranslation(fwRectWithBorder, wRect, dir);
          //eg.log("dir:", dir, "trans:", trans);
          if (w.data in translations) {
            if (trans.absSquared() > translations[w.data].absSquared()) {
              translations[w.data] = trans; // overwrite with larger translation
            }
          } else { // first trans
            translations[w.data] = trans;
            toBeMoved.push(w);
          }
        }
      });
    });
    if (toBeMoved.length) {
      toBeMoved.sort(function(w1, w2) { // (b - a) -> sort descending
        return (translations[w2.data].absSquared()
                - translations[w1.data].absSquared());
      });
      var widgetPosArr = [];
      toBeMoved.forEach(function(w) {
        widgetPosArr.push({widget: w, pos: w.origin().add(translations[w.data])});
      });
      // Channel batch is used for sending related changes alltogether. Moreover synchronizing with asynchronous
      // - state changing - animations is needed: realized by animation callbacks triggering next possible steps.
      var closeBatchFN = function(id) {
        //eg.log("[closeBatchFN " + id + "] ");
        self.channel.closeBatch(self.toString());
        //eg.log("[closeBatchFN " + id + "]");
        //eg.log("[1] before --busyCount:", self.busyCount);
        --self.busyCount;
      };
      var closeTopLevelBatchFN = function(id) {
        closeBatchFN(id); self.updateConnections();
      };
      //eg.log("[before openBatch()] toBeMoved.length: " + toBeMoved.length);
      //eg.log("[2] before ++busyCount:", self.busyCount);
      ++self.busyCount;
      this.channel.openBatch(this.toString());
      //eg.log("[after openBatch] openBatchCount: " + self.channel.openBatchCount(self.toString()));
      callback = function(id){
        //eg.log("[callback 1. " + id +"] channel.openBatchCount(): " + self.channel.openBatchCount(self.toString()));
        // opens nested batch, if needed
        self.pushCoveredWidgets(toBeMoved, visibleAreaRect,
                                translations, triggerWidgets);
        //eg.log("[callback 2. " + id +"] channel.openBatchCount(): " + self.channel.openBatchCount(self.toString()));
        if (self.channel.openBatchCount(self.toString()) === 1) { // top level close
          //eg.log("[callback 3. " + id + "] channel.openBatchCount(): "
          //       + self.channel.openBatchCount(self.toString()));
          self.moveWidgetsIntoVisibleArea(self.widgets, // check all widgets
                                          closeTopLevelBatchFN, // finally send batch by top level close
                                          visibleAreaRect);
        } else {
          //eg.log("[callback 4. (before closeBatchFN(123)" + id + "] channel.openBatchCount(): "
          //       + self.channel.openBatchCount(self.toString()));
          closeBatchFN(123); // close nested batch
          //eg.log("[callback 4. " + id + "] channel.openBatchCount(): " + self.channel.openBatchCount(self.toString()));
        }
      }; // callback()
      this.moveWidgets(widgetPosArr, this.toString(), {
        animationTime: this.animationTime * this.pushAnimationFactor,
        callback: callback });      
    }
  };
  protoFE.moveWidgetsIntoVisibleArea = function (widgets, callback,
                                                 visibleArea) {
    var cr = visibleArea;
    var widgetPosArr = [];
    widgets.forEach(function(tbm) {
      var wr = tbm.egRect();
      var trans = eg.Point.zero();
      var move = false;
      if (wr.left() < cr.left()) {
        trans = trans.add(eg.Point.xy(cr.left() - wr.left(), 0)); move = true;
      }
      if (wr.right() > cr.right()) {
        trans = trans.add(eg.Point.xy(cr.right() - wr.right(), 0)); move = true;
      }
      if (wr.top() < cr.top()) {
        trans = trans.add(eg.Point.xy(0, cr.top() - wr.top())); move = true;
      }
      if (wr.bottom() > cr.bottom()) {
        trans = trans.add(eg.Point.xy(0, cr.bottom() - wr.bottom())); move = true;
      }
      if (move) {
        widgetPosArr.push({widget: tbm, pos: wr.origin().add(trans) });
      }
    });
    if (! widgetPosArr.length) {
      callback(4712); // needed for closing top level batch
      return;
    }
    this.moveWidgets(widgetPosArr, this.toString(), {
      animationTime: this.animationTime * this.pushAnimationFactor,
      callback: callback });
  };
  protoFE.send = function (msg) {
    //eg.log(msg);
    return this.channel && this.channel.sendFrom(msg, this.toString());
  };
  protoFE.containsWidget = function (widget) {
    return this.widgets.indexOf(widget) !== -1;
  };
  protoFE.containsConnection = function (conn) {
    return this.connections.indexOf(conn) !== -1;
  };
  protoFE.addWidget = function (widget, sender) {
    eg.assert(! this.containsWidget(widget));
    this.setWidgetBehavior(widget);
    this.widgets.push(widget);
    this.send({ event: "widgetAdded", widget: widget, triggeredBy: sender});
  };
  protoFE.deleteConnection = function (conn, sender, indirectlyFlagOrNil) {
/*
    eg.log("deleteConnection():", conn.data, this.connections.indexOf(conn),
           indirectlyFlagOrNil);
*/
    this.connections.splice(this.connections.indexOf(conn), 1);
    conn.remove();
    this.send({ event: (indirectlyFlagOrNil
                        ? "connDeletedIndirectly"
                        : "connDeleted"),
                conn: conn,
                triggeredBy: sender});
  };
  protoFE.updateConnections = function (connectionsOrNull) { // null for all
    var conns = connectionsOrNull || this.connections;
    for (var i = conns.length; i--; /* dec in condition! */) { // interesting idiom!
      var conn = conns[i];
      eg.assert(conn.constructor === Raphael.fn.Connector);
      conn.update();
    }
  };
  protoFE.connectionsOf = function (widget) {
     return this.connections.filter(function(c) {
      return c.from === widget || c.to === widget;
    });
  };
  protoFE.updateConnectionsOf = function (widget) {
    this.updateConnections(this.connectionsOf(widget));
  };
  protoFE.deleteWidget = function (widget, sender) {
    var self = this;
    var connsOfWidget
      = this.connectionsOf(widget);
    connsOfWidget.forEach(function(conn) {
      self.deleteConnection(conn, sender, true);
    });
    this.widgets.splice(this.widgets.indexOf(widget), 1);
    widget.remove();
    if (widget.inAnimation) {
      widget.inAnimation = false;
      //eg.log("[a] before --animationCount:", this.animationCount);
      --this.animationCount; // after removal it has no chance to decrease animationCount itself
    }
    this.send({ event: "widgetDeleted", widget: widget, triggeredBy: sender });
  };
  protoFE.replaceWidget = function (oldWidget, newWidget) {
    eg.assert(this.containsWidget(oldWidget));
    eg.assert(! oldWidget.inAnimation);
    this.setWidgetBehavior(newWidget);
    var conns = this.connectionsOf(oldWidget);
    conns.forEach(function(conn, ix) {
      if (conn.from === oldWidget) {
        conn.from = newWidget;
      }
      if (conn.to === oldWidget) {
        conn.to = newWidget;
      }
    });
    this.widgets[this.widgets.indexOf(oldWidget)] = newWidget;
    var selected = this.state.selected;
    if (selected.contains(oldWidget)) {
      //selected._arr[selected._arr.indexOf(oldWidget)] = newWidget; // hack, but faster...
      selected.remove(oldWidget);
      this.addSelection(newWidget,
                        true); // omit animation
    }
    oldWidget.remove();
    this.updateConnections(conns);
    // no event!
  };
  protoFE.addConnection = function (conn) {
    eg.assert(this.containsWidget(conn.from) && this.containsWidget(conn.to));
    eg.assert(! this.containsConnection(conn));
    this.setConnectionBehavior(conn);
    this.connections.push(conn);
  };
  protoFE.createConnection = function (from, to, sender) {
    eg.assert(this.containsWidget(from) && this.containsWidget(to));
    var newConn
      = new this.r.Connector(from, to,
                             null, // "#888", // Line color made by css ..
                             null, //"#900|7",// .. same here for background.
                             { radius: 4 }, { width: 10, length: 15 });
    this.addConnection(newConn);
    this.send({ event: "connCreated", conn: newConn, triggeredBy: sender });
    return newConn; // allow adding data to it
  };
  protoFE.moveWidgets = function (widgetPosArr, sender, argObj) {
    var self = this;
    var i, e, w, pos, conns, offP;
    var animationTime = (argObj && eg.isNumber(argObj.animationTime)
                         ? argObj.animationTime
                         : this.animationTime);
    var doAnimation = animationTime > 0;
    var callbackFN = argObj && argObj.callback || null;
    var len = widgetPosArr.length;
    if (doAnimation && len && ! self.animationCount) {
      //eg.log("[3] before ++busyCount:", this.busyCount);
      ++this.busyCount; // increased before first, decreased after last anim
    }
    var widgetCallbackFN = function () { // widget to be bound below
      this.inAnimation = false;
      //eg.log("[b] before --animationCount:", self.animationCount);
      --self.animationCount;
      //eg.log("[stop] id: " + this.data + ", animationCount: " + self.animationCount);
      if (self.animationCount === 0) {
        //eg.log("[4] before --busyCount:", self.busyCount);
        --self.busyCount;
        if (callbackFN) {
          callbackFN(this.data); // has to call updateConnections() itself
        } else {
          self.updateConnections(); // conn update after last move
        }
      }
    };
    for (i = 0; i < len; ++i) {
      e = widgetPosArr[i];
      w = e.widget;
      pos = e.pos;
      conns = this.connectionsOf(w);
      if (doAnimation) {
        w.onAnimation(
          eg.bindThisNArgs(protoFE.updateConnections, this, conns)); // Current conns of current widget.
        if (! w.inAnimation) {
          w.inAnimation = true;
          //eg.log("[c] before ++animationCount:", self.animationCount);
          ++self.animationCount;
        }
        //eg.log("[start] id: " + w.data + ", animationCount: " + self.animationCount);
        offP = eg.Point.xy(pos.x, pos.y).sub(w.origin());
        w.stop();
        w.animate({translation:""+offP.x+","+offP.y}, animationTime, // this keeps text field offset ..
                  eg.bindThis(widgetCallbackFN, w));
      } else { // no animation
        w.moveToP(pos);
        this.updateConnections(conns);
      }
    }
    if (! doAnimation || ! widgetPosArr.length) {
      callbackFN && callbackFN(); // callback directly
    }
    this.send({ event: "widgetsMoved",
                widgets: widgetPosArr.map(function(e) { return e.widget; }),
                triggeredBy: sender });
  };
  protoFE.marblesRollFlag = function (bool) {
    this.state.marblesRollFlag = bool;
  };
  protoFE.makeConnectionLeader = function () {
    var cl = this.r.circle(0,0,10).attr({fill: "white", stroke: "black"});
    cl.node.style.cursor = "move";
    cl.hide();
    cl.toFront();
    return cl;
  };
  // keyboard focus for mouseup events
  protoFE.setKeyboardFocus = function (ev) {
    var inputDummy = $("#inputDummy_" + this.canvas.id);
    var focusNode = inputDummy[0];
    // timeout to avoid propagating dblclick from widget to canvas
    setTimeout(function(){
      inputDummy.css({top:ev.clientY, left:ev.clientX});
      focusNode.focus();
    }, 500);
  };
  protoFE.isSelected = function (target) {
    return this.state.selected.contains(target);
  };
  protoFE.addSelection = function (target, omitAnimOrNil) {
    target.animateSelectionFN
      ? target.animateSelectionFN(omitAnimOrNil)
      : target.animate({"fill-opacity": 1.0}, 500);
    this.state.selected.add(target);
  };
  protoFE.removeSelection = function (target, omitAnimOrNil) {
    target.animateUnselectionFN ? target.animateUnselectionFN(omitAnimOrNil) : target.animate({"fill-opacity": 0.5}, 500);
    this.state.selected.remove(target);
  };
  protoFE.switchSelection = function (target) {
    if (this.state.selected.contains(target)) {
      this.removeSelection(target);
    } else {
      this.addSelection(target);
    }
  };
  protoFE.selectAll = function () {
    this.widgets.forEach(function(e, key) {
      this.addSelection(e);
    }, this);
  };
  protoFE.addSelectionConn = function (conn) {
    conn.addClassAttribute("selected");
    this.state.selectedConnections.add(conn);
  };
  protoFE.removeSelectionConn = function (conn) {
    conn.removeClassAttribute("selected");
    this.state.selectedConnections.remove(conn);
  };
  protoFE.switchSelectionConn = function (conn) {
    if (this.state.selectedConnections.contains(conn)) {
      this.removeSelectionConn(conn);
    } else {
      this.addSelectionConn(conn);
    }
  };
  protoFE.unselectAll = function () {
    var self = this;
    this.state.selected.asArray().forEach(function(sel) { self.removeSelection(sel); } );
    this.state.selectedConnections.asArray().forEach(function(sel) { self.removeSelectionConn(sel); } );
  };
  protoFE.startConnect = function (reversedFlag) {
    this.channel.openBatch(this.toString());
    this.state.isConnecting = true;
    this.state.isConnectingReversed = !!reversedFlag;
    // connLeader positioning before creating connections!
    this.state.connLeader.moveCenterToP(this.state.mousedownPos);
    // create connections: connLeader <---> selected widgets
    var sels = this.state.selected.asArray(); // copy
    var self = this;
    function fnCreateConnLeaderConn (sel) {
      var from, to;
      if (reversedFlag) {
        from = self.state.connLeader;
        to = sel;
      } else {
        from = sel;
        to = self.state.connLeader;
      }
      var newConn = new self.r.Connector(from, to,
                                         "#fff", null,
                                         { radius: 4 }, { width: 10, length: 15 });
      newConn.addClassAttribute("connecting");
      self.state.connLeaderConns.push(newConn);
      self.removeSelection(sel);
    }
    sels.forEach(fnCreateConnLeaderConn);
    // connLeader dragging
    this.addSelection(this.state.connLeader, true); // no anim
    this.state.dragPos = this.state.mousedownPos;
  };
  protoFE.endConnect = function () {
    if (! this.state.isConnecting) {
      return;
    }
    function fnRemoveConn (conn) {
      conn.remove();
    };
    this.state.connLeaderConns.forEach(fnRemoveConn);
    this.state.connLeaderConns = [];
    this.state.isConnecting = false; this.state.isConnectingReversed = null;
    this.unselectAll(); // unselect connLeader
    this.endDrag();     // of connLeader
    //eg.log("endConnect(): this.channel.openCount:", this.channel.openCount);
    this.channel.closeBatch(this.toString());
  };
  protoFE.endDrag = function () {
    this.state.dragPos = null;
  };

  //
  // event handler settings
  //
  // Widget has to be event listener, because it is the proxy for its subwidgets
  // (e.g. stored as connection end).
  protoFE.setWidgetBehavior = function (widget) {
    var isSet = widget.type === 'set';
    widget.mousedown(isSet ? eg.bindAsEventListener(this.widgetMousedown, widget) : this.widgetMousedown);
    widget.mouseup(  isSet ? eg.bindAsEventListener(this.widgetMouseup, widget)   : this.widgetMouseup);
    widget.mouseover(isSet ? eg.bindAsEventListener(this.widgetMouseover, widget) : this.widgetMouseover);
    widget.mouseout( isSet ? eg.bindAsEventListener(this.widgetMouseout, widget)  : this.widgetMouseout);
    /*widget.dblclick( isSet ? eg.bindAsEventListener(this.widgetDblclick, widget)  : this.widgetDblclick);*/
    widget.addClassAttributes(["connectable", "movable"]);
    //widget.click(new eg.DebugEventHandler("widget.click"));
  };
  protoFE.setConnectionBehavior = function (conn) {
    conn.mousedown(this.connectionMousedown);
  };

  // marble animation
  //
  var marbleRadius = 20;
  protoFE.makeMarble = function (colorStr) {
    colorStr || (colorStr = "#fff");
    var marble = this.r.circle(-marbleRadius,-marbleRadius, marbleRadius)
      .attr({fill: "r(0.5, 0.5)" + colorStr + "-#000", 'stroke-width': 0});
    //var color = "black"; //Raphael.getColor();
    //marble.attr({ fill: color, stroke: color });
    marble.hide();
    return marble;
  };
  protoFE.roll = function (conn, reversedFlag) {
    var self = this;
    ++this.busyCount;
    var line = conn.line;
    var lineLength = line.getTotalLength();
    var marble, alongFunc, start;
    if (reversedFlag) {
      marble = self.makeMarble("#f00");
      alongFunc = marble.animateAlongBack;
      start = line.getPointAtLength(lineLength);
    } else {
      marble = self.makeMarble("#0f0");
      alongFunc = marble.animateAlong;
      start = line.getPointAtLength(0);
    }
    marble.moveTo(start.x - marbleRadius, start.y - marbleRadius);
    marble.toFront().show();
    alongFunc.call(marble,
                   line, lineLength / 200 * this.animationTime, false,
                   function(){
                     marble.remove();
                     --self.busyCount;
                   });
  };

  // spinner
  protoFE.animatePositionAt = function (pos, diminishingFlag) {
    if (! this.animationTime) {
      return;
    }
    var self = this;
    var spinner = this.r.eg.createSpinnerAtXY(pos.x, pos.y);
    // ms, steps, maxRadius, increaseFlag, text
    spinner.start(this.animationTime // give it a chance to finish ..
                  - this.animationTime/10, // .. before being removed.
                  10, // steps
                  30, // maxRadius
                  ! diminishingFlag, // increaseFlag
                  null, // no text
                  true); // do once
    setTimeout(function() {
      spinner.stop();
      spinner.remove();
    }, this.animationTime);
  };
  protoFE.animatePositionOfWidget = function (widget, diminishingFlag) {
    var pos = widget.center();
    this.animatePositionAt(pos, diminishingFlag);
  };
  protoFE.deleteAnimated = function (deleteFun, widget, from) {
    var self = this;
    if (! this.animationTime) {
      deleteFun.call(self, widget, from);
      return; // no need to start animation
    }
    var deletionTimeout = this.animationTime / 2;
    ++this.busyCount;
    this.animatePositionOfWidget(widget, true);
    setTimeout(function() {
      deleteFun.call(self, widget, from);
      --self.busyCount;
    }, deletionTimeout);
  };
  protoFE.deleteWidgetAnimated = function (widget, from) {
    this.deleteAnimated(this.deleteWidget, widget, from);
  };
  protoFE.deleteConnectionAnimated = function (widget, from) {
    this.deleteAnimated(this.deleteConnection, widget, from);
  };
  protoFE.addAnimated = function (addFun, widget, from) {
    this.animatePositionOfWidget(widget, false);
    addFun.call(this, widget, from);
  };
  protoFE.addWidgetAnimated = function (widget, from) {
    this.addAnimated(this.addWidget, widget, from);
  };

  // Export
  ryt.FlowEditor = FlowEditor;

}(EvolGo, RYT));
