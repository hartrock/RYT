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

// top level namespace objects: ensure their existence
var EvolGo = EvolGo || {}, RYT = RYT || {};

(function(eg, ryt) { // namespace args at end, exports before them

// generic
function _receiveFrom(msg, from, doLogging, doAssertHandler) {
  var handlerName = 'handle_' + msg.event;
  var handlerFun = this[handlerName];
  if (doLogging) {
    eg.log(this + " receiveFrom(): msg:", msg);
    if (! handlerFun) {
      eg.log("--> no handler: " + handlerName);
    }
  }
  doAssertHandler && eg.assert(handlerFun);
  handlerFun && handlerFun.call(this, msg, from);
}
function receiveFrom(msg, from) {
  return _receiveFrom.call(this, msg, from);
}
function receiveFromWithLogging(msg, from) {
  return _receiveFrom.call(this, msg, from, true);
}
function receiveFromWithAssert(msg, from) {
  return _receiveFrom.call(this, msg, from, false, true);
}
function receiveFromWithLoggingNAssert(msg, from) {
  return _receiveFrom.call(this, msg, from, true, true);
}


function FlowEditorObserver(app) {
  this.app = app; // for logger
  this.model = app.model; // 
  this.corresponding_moId = null; // to be set by wiring
  this.flowId = null;             // ""
}
var protoFEO = FlowEditorObserver.prototype;
protoFEO.toString = function() {
  return this.id || "FlowEditorObserver";
};
protoFEO.receiveFrom = function (msg, from) {
  //eg.log("" + this + " receiveFrom() triggeredBy " + msg.triggeredBy);
  if (msg.triggeredBy === this.corresponding_moId) {
    // action already performed in model
    /*
    eg.log(this + " receiveFrom() triggeredBy " + msg.triggeredBy
           + ": ignored (model action already performed).");
    */
    return;
  }
  receiveFromWithAssert.call(this, msg, from);
};
protoFEO.receiveBatchFrom = function (batch, from) {
  //eg.log("batch: " + batch + ", from: " + from);
  var i, len;
  eg.assert(from);
  if (! batch.length) { // happens for creating second conn in reversed ..
    return;             // .. direction for two widgets.
  }
  this.model.openBatch("receiveBatchFrom", this.toString());
  for (i = 0, len = batch.length; i < len; ++i) {
    this.receiveFrom(batch[i], from);
  }
  this.model.closeBatch("receiveBatchFrom", this.toString());
};
protoFEO.handle_connCreated = function (msg) {
  var conn = msg.conn;
  var connId = this.model.createConn(conn.from.data, conn.to.data,
                                     this.toString());
  conn.data = connId;
};
protoFEO.handle_connDeleted = function (msg) {
  var connId = msg.conn.data;
  this.model.deleteConn(connId, this.toString());
};
protoFEO.handle_connDeletedIndirectly = function (msg) {
  //eg.log("connDeletedIndirectly");
  var connId = msg.conn.data;
  var conn = this.model.getObject(connId);
  if (this.model.commonParentsCount(conn.key_1, conn.key_2) <= 1) {
    this.model.deleteConn(connId, this.toString());
  }
};
protoFEO.handle_widgetDeleted = function (msg) {
  var widgetId = msg.widget.data;
  var obj = this.model.getObject(widgetId);
  if (obj.type === 'task') {
    this.model.deleteTask(widgetId, this.flowId, this.toString());
  } else if (obj.type === 'comment') {
    this.model.deleteComment(widgetId, this.flowId, this.toString());
  } else {
    eg.assert(false, "should not be reached");
  }
};
protoFEO.handle_widgetsMoved = function (msg) {
  var widgets = msg.widgets;
  var id2position = { };
  var i, len;
  for (i = widgets.length; i--;) {
    widget = widgets[i];
    id2position[widget.data] = widget.origin();
  }
  this.model.changePositions(id2position, this.flowId, this.toString());
};
protoFEO.selectIDs = function (ids, quietFlag) {
  var numCopied = this.model.selectIn(ids, this.flowId, this.toString());
  if (! quietFlag) {
    if (ids.length) {
      this.app.logger.info( numCopied + " elements copied." );
    } else {
      this.app.logger.warn( "Nothing to copy!" );
    }
  }
};
protoFEO.select = function (msg, quietFlag) {
  // msg.pos contains last clicked point (unused here)
  var ids = msg.widgets.map(function(w) {
    return w.data;
  });
  this.selectIDs(ids, quietFlag);
};
protoFEO.handle_copy = function (msg) {
  this.select(msg);
};
protoFEO.h_justBeforeDeleteOrCut = function (msg, cutFlag) {
  if (cutFlag) {
    this.select(msg, true);
  }
  this.numElemsDeleted = msg.widgets.length;
  this.numConnsDeleted = msg.conns.length;
};
protoFEO.h_justAfterDeleteOrCut = function (msg, cutFlag) {
  if (this.numElemsDeleted) {
    this.app.logger.info(this.numElemsDeleted + " element(s) " + (cutFlag ? "cutted" : "deleted") + ".");
  } else {
    if (this.numConnsDeleted) {
      this.app.logger.info(this.numConnsDeleted + " connection(s) deleted.");
    } else {
      this.app.logger.warn("Nothing to " + (cutFlag ? "cut" : "delete") + ".");
    }
  }
};
protoFEO.handle_justBeforeCut = function (msg) {
  this.h_justBeforeDeleteOrCut(msg, true);
};
protoFEO.handle_justAfterCut = function (msg) {
  this.h_justAfterDeleteOrCut(msg, true);
};
protoFEO.handle_justBeforeDelete = function (msg) {
  this.h_justBeforeDeleteOrCut(msg, false);
};
protoFEO.handle_justAfterDelete = function (msg) {
  this.h_justAfterDeleteOrCut(msg, false);
};

/*
// Could be start for moving more of model logic from FlowEditor to here
// and/or Model (more like classical MVCs).
// But why this effort? Moreover this is an example of how to couple
// evolutionary and more loosely.
protoFEO.handle_deleteOrCut = function (msg) {
  if (msg.cutFlag) {
    this.select(msg, true);
  }
  this.numElemsDeleted = msg.widgets.length;
  ...
};
*/

protoFEO.handle_paste = function (msg) {
  var numPasted = this.model.pasteInto(this.flowId, msg.pos, this.toString());
  if (numPasted) {
    this.app.logger.info(numPasted + " elements pasted.");
  } else {
    this.app.logger.warn("Nothing to paste.");
  }
};
protoFEO.handle_alias = function (msg) {
  var info = { };
  var res = this.model.aliasInto(this.flowId, msg.pos, info, this.toString());
  if (res === null) {
    var commandIgnoredStr = "\n-> Command ignored.";
    if (info.alreadyInTarget.length) {
      this.app.logger.problem(
        "Cannot create alias: element(s) " + info.alreadyInTarget + " already in target." + commandIgnoredStr
      );
    }
    if (info.wouldGenerateCycle.length) {
      this.app.logger.problem(
        "Cannot create alias for element(s) " + info.wouldGenerateCycle + ": this would generate cycle(s)." + commandIgnoredStr
      );
    }
    return;
  }
  if (res === 0) {
    this.app.logger.warn("Nothing to alias.");
    return;
  }
  this.app.logger.info(res + " element(s) aliased.");
};
protoFEO.handle_export = function (msg) {
  this.select(msg, true);
  var res = this.app.model.exportToStore();
  if (! res) {
    this.app.logger.warn("Nothing to export.");
    return;
  }
  this.app.logger.info(
    res.numAllElements + " elements ("
      + res.numTopLevelElements + " top level elements) and "
      + res.numRelations + " relations exported."
  );
};
protoFEO.handle_import = function (msg) {
  var res = this.app.model.importFromStore();
  if (! res) {
    this.app.logger.warn("Nothing to import.");
    return;
  }
  this.app.logger.info(
    res.numAllElements + " elements ("
      + res.numTopLevelElements + " top level elements) and "
      + res.numRelations + " relations imported."
  );
  var info = {};
  this.app.model.aliasInto(this.flowId, msg.pos, info, this.toString());
};


function MO_ElementDialog() {
  this._proto = MO_ElementDialog.prototype;
}
var protoMO_ED = MO_ElementDialog.prototype;
protoMO_ED.init = function (app, elementDialog, parentId, elementId) {
  this.app = app;
  this.model = app.model;
  this.elementDialog = elementDialog;
  this.parentId = parentId;
  this.elementId = elementId;
};
protoMO_ED.toString = function() {
  return "MO_ElementDialog";
};
// could be put into 'trans_apply_begin'
/*1.1
protoMO_ED.receiveBatchFrom = function (batch, from) {
  //eg.log(this.toString() + ": batch: " + batch + ", from: " + from);
  if (! this.model.getObject(this.elementId)) {
    // avoid reading props of deleted (for update) and close not yet created
    // element (its parent may have been destroyed, which would make creating it impossible)
    this.elementDialog.forcedClose();
    return;
  }
  var i, len;
  for (i = 0, len = batch.length; i < len; ++i) {
    this.receiveFrom(batch[i], from);
  }
};
*/
protoMO_ED.isObjectEvent = function (msg) {
  return msg.event in { 'created':'created', 'changed':'changed', 'deleted':'deleted' };
};
protoMO_ED.getObjectFromObjectEvent = function (msg) {
  return (msg.event === 'created'
          ? msg.newProps
          : (msg.event === 'deleted'
             ? msg.oldProps
             : (msg.event === 'changed'
                ? msg.objProps
                : null)));
};
protoMO_ED.receiveFrom = function(msg, from) {
  //eg.log("" + this + " receiveFrom() triggeredBy " + msg.triggeredBy + ", event: " + msg.event);
  if (! (msg.event === 'deleted' || msg.event === 'changed') ) {
    return;
  }
  if (! ( (msg.id === this.parentId && msg.event === 'deleted')
          || msg.id === this.elementId) ) {
    return; // not responsible
  }
  receiveFromWithAssert.call(this, msg, from);
};
protoMO_ED.handle_deleted = function (msg) {
  // usually forcedClose() will be called in receiveBatchFrom() above, but cannot hurt here
  this.elementDialog.forcedClose();
};

function MO_TaskDialog(app, taskDialog, parentId, taskId) {
  this._proto = MO_TaskDialog.prototype;
  this.init(app, taskDialog, parentId, taskId); // uses parent init()
}
// prototype chain
var protoMO_TD = MO_TaskDialog.prototype = new MO_ElementDialog();
protoMO_TD.constructor = MO_TaskDialog;
//
protoMO_TD.toString = function() {
  return "MO_TaskDialog";
};
protoMO_TD.receiveFrom = function(msg, from) {
  //eg.log("" + this + " receiveFrom() triggeredBy " + msg.triggeredBy + ", event: " + msg.event);
  if (! this.isObjectEvent(msg)) {
    return;
  }
  var obj = this.getObjectFromObjectEvent(msg);
  var id = msg.id;
  var type = obj.type;
  if (type === 'parentChild') {
    if (obj.key_1 === this.elementId) {
      this.updateFinishedButtons();
      this.updateMoreButtons();
    }
    return;
  } else if (type === 'conn_fromTo') {
    if (obj.key_1 === this.elementId) {
      this.elementDialog.updatePrioButtons();
      return;
    }
  } else if (msg.event === 'changed' && id !== this.elementId) {
    if (this.model.elemHasParent(id, this.elementId)) {
      this.handle_changedChild(msg);
      return;
    }
    if ("prio" in msg.newProps
        && id in (this.model.fromTo[this.elementId] || {})) {
      this.elementDialog.updatePrioButtons();
      return;
    }
    if ("finished" in msg.newProps
        && id in (this.model.toFrom[this.elementId] || {})) {
      this.updateFinishedButtons();
    }
  }
  // if not handled here, try super
  this._proto._proto.receiveFrom.call(this, msg, from);
};
protoMO_TD.handle_changed = function (msg) {
  var attrs = msg.newProps;
  attrs.name && this.elementDialog.find("#name").val(attrs.name);
  attrs.description && this.elementDialog.find("#description").val(attrs.description);
  if ('subtaskFinishPropagation' in attrs || 'logic' in attrs) {
    this.updateMoreButtons();
  }
  if ('finished' in attrs
      || 'subtaskFinishPropagation' in attrs //???
      || 'logic' in attrs) {
    this.updateFinishedButtons();
    this.updateMoreButtons();
  }
  if (attrs.hasOwnProperty("prio")) {
    var search;
    switch(attrs.prio) {
    case 2: search = "prio_veryhigh";
      break;
    case 1: search = "prio_high";
      break;
    case 0: search = "prio_normal";
      break;
    case -1: search = "prio_low";
      break;
    case -2: search = "prio_verylow";
      break;
    case undefined:
    case null: // possible, if there are - to be deleted - props from actionS
      search = "prio_na";
      break;
    default:
      eg.warn("Should not happen.");
      break;
    }
    var rb = this.elementDialog.find("#"+search);
    rb.attr("checked","checked");
  }
};
protoMO_TD.updateFinishedButtons = function () {
  var elementObj = this.model.getObject(this.elementId);
  this.elementDialog.updateFinishedButtons(
    elementObj.finished,
    this.model.canBeFinished(this.elementId),
    elementObj.subtaskFinishPropagation
  );
};
protoMO_TD.updateMoreButtons = function () {
  var elementObj = this.model.getObject(this.elementId);
  this.elementDialog.updateExtras(elementObj);
};

protoMO_TD.handle_changedChild = function (msg) {
  var props = msg.newProps;
  if (props.hasOwnProperty("finished")) {
    this.updateFinishedButtons();
    this.updateMoreButtons();
  }
};
function MO_CommentDialog(app, commentDialog, parentId, commentId) {
  this._proto = MO_CommentDialog.prototype;
  this.init(app, commentDialog, parentId, commentId); // uses parent init()
}
// prototype chain
var protoMO_CD = MO_CommentDialog.prototype = new MO_ElementDialog();
protoMO_CD.constructor = MO_CommentDialog;
//
protoMO_CD.toString = function() {
  return "MO_CommentDialog";
};
protoMO_CD.handle_changed = function (msg) {
  var attrs = msg.newProps;
  attrs.text && this.elementDialog.find("#text").val(attrs.text);
};

function MO_FlowEditor(app, flowEditor, parentId) {
  this.app = app;
  this.model = app.model;
  this.flowEditor = flowEditor;
  this.parentId = parentId;
  this.corresponding_feoId = null; // to be set by wiring
  this.initFromModel();
}
var protoMO_FE = MO_FlowEditor.prototype;
protoMO_FE.toString = function() {
  return this.id || "MO_FlowEditor";
};
protoMO_FE.receiveFrom = receiveFrom;
/*
protoMO_FE.handle_trans_open = function (msg, from) {};
protoMO_FE.handle_trans_close = function (msg, from) {};
protoMO_FE.handle_trans_apply_begin = function (msg, from) {};
protoMO_FE.handle_trans_apply_end = function (msg, from) {};
*/
/*&&& probably obsolete
protoMO_FE.handle_id2obj_handler = function (id2obj, handler,
                                             triggeredBy) {
  eg.forEach(id2obj, function(props, id) {
    handler.call(this, id, props, triggeredBy);
  }, this);
};
*/

function elementWidgetOndblclick(app) {
  return function (e) {
    e = e || window.event;
    RYT.info.dblclickTime = +new Date();
    if (e.shiftKey) {
      return;
    }
    app.openElementDialog(this.data, this.parentId);
    eg.stopPropagation(e); // don't reach canvas with dblclick
  }
};

protoMO_FE.createTaskWidget = function (taskObj, parent, argObj) {
  var r = this.flowEditor.r;
  var id = taskObj.id;
  var attrsForTaskBg = ryt.info.attrsForTaskBg();
  var taskWidget = r.eg.createTextField(
    this.app.aliasChildInfoStr(taskObj) + eg.strAscii2Unicode(taskObj.name),
    { borders: { right:10 },
      text:ryt.info.attrsForTaskText(), bg:attrsForTaskBg
    }
  );
  var radius = 4, circleV = eg.Point.xy(-1,-1).centerOfTouchingCircle(radius);
  var pos = taskWidget.bottomRight().add(circleV);
  var connectArea = r.circle(pos.x, pos.y, radius)
    .attr(ryt.info.attrsForTaskConnectArea());
  taskWidget.push(connectArea);
  taskWidget.animateSelectionFN = function (omitAnimOrNil) {
    var attr = {"fill-opacity": attrsForTaskBg["fill-opacity"] * 2};
    if (omitAnimOrNil) {
      taskWidget.bgShape.attr(attr);
    } else {
      taskWidget.bgShape.animate(attr, 500); // don't set in stylesheet!
    }
  };
  taskWidget.animateUnselectionFN = function (omitAnimOrNil) {
    var attr = {"fill-opacity": attrsForTaskBg["fill-opacity"]};
    if (omitAnimOrNil) {
      taskWidget.bgShape.attr(attr);
    } else {
      taskWidget.bgShape.animate(attr, 500); // don't set in stylesheet!
    }
  };
  taskWidget.dblclick(eg.bindAsEventListener(elementWidgetOndblclick(this.app), taskWidget));
  connectArea.addClassAttribute('connectArea');
  taskWidget.addClassAttribute('task');
  taskWidget.data = id; // for getting task in model via widget
  taskWidget.parentId = parent;
  var callback = this.app.elementObjInfoStrCB(taskObj, parent);
  var funs = ryt.createInfoHoverFuns(callback, this.app);
  taskWidget.hover(funs[0], funs[1]);

  // FPP widget
  var si = this.app.subelemsInfo(taskObj);
  if (! (eg.isNil(taskObj.prio) && eg.isNil(taskObj.finished) && ! si.taskHasFinishedCount)) {
  var radius = 10;
  var radiusPoint = eg.Point.xy(radius, radius);
  var posCircle = taskWidget.bottomLeft().sub(eg.Point.xy(0, taskWidget.extent().y/2)).sub(eg.Point.xy(radius, 0));
  var bgCircle = r.circle(posCircle.x, posCircle.y, radius).attr(
    {"fill":"black", "fill-opacity": 0.25, "stroke-width":0.1}
  );
  bgCircle.addClassAttributes(["FPP","finishedBg"]);
  taskWidget.push(bgCircle);
  var bgCircleLeft = posCircle.sub(eg.Point.xy(radius, 0));
  var bgCircleRight = posCircle.add(eg.Point.xy(radius, 0));
  var bgCircleTop = posCircle.sub(eg.Point.xy(0, radius));
  var bgCircleBottom = posCircle.add(eg.Point.xy(0, radius));
  if (! eg.isNil(taskObj.prio)) {
    var upTop, upLeft, upRight, downBottom, downLeft, downRight;
    var triaLeftSmallest, triaRightSmallest, upTopSmallest, downBottomSmallest;
    triaLeftSmallest = posCircle.sub(eg.Point.xy(5,0));
    triaRightSmallest = posCircle.add(eg.Point.xy(5,0));
    downBottomSmallest = posCircle.add(eg.Point.xy(0,5));
    upTopSmallest = posCircle.sub(eg.Point.xy(0,5));
    switch (taskObj.prio) {
    case -1:
      downBottom = bgCircleBottom;
      downLeft = bgCircleLeft;
      downRight = bgCircleRight;
      break;
/*
    case undefined:
      downBottom = bgCircleBottom;
      downLeft = bgCircleLeft.add(eg.Point.xy(5,0));
      downRight = bgCircleRight.sub(eg.Point.xy(5,0));
      break;
*/
    case 0:
      break;
/*
    case undefined:
      upTop = bgCircleTop;
      upLeft = bgCircleLeft.add(eg.Point.xy(5,0));
      upRight = bgCircleRight.sub(eg.Point.xy(5,0));
      break;
*/
    case 1:
      upTop = bgCircleTop;
      upLeft = bgCircleLeft;
      upRight = bgCircleRight;
      break;
    default:
      eg.warn("Should not happen.");
      break;
    }
    if (upTop) {
      upTria = r.path(upTop.to_M() + upLeft.to_L() + upRight.to_L() + upTop.to_L())
        .attr({fill:"red", "fill-opacity": 1});
      taskWidget.push(upTria);
    }
    if (downBottom) {
      var downTria = r.path(downBottom.to_M() + downLeft.to_L() + downRight.to_L() + downBottom.to_L())
        .attr({fill:"blue", "fill-opacity": 1});
      taskWidget.push(downTria);
    }
    var maxPrio = 1, minPrio = -1;
    var upClickFunc = eg.bindThis(function(e) {
      this.model.change(id, { prio: Math.min(taskObj.prio + 1, maxPrio) }, "GUI");
    }, this);
    var downClickFunc = eg.bindThis(function(e) {
      this.model.change(id, { prio: Math.max(taskObj.prio - 1, minPrio) }, "GUI");
    }, this);
    var upTriggerTop = bgCircleTop.sub(eg.Point.xy(0,5));
    var upTrigger = r.path(
      upTriggerTop.to_M()
        + bgCircleTop.sub(eg.Point.xy(5, 0)).to_L()
        + bgCircleTop.add(eg.Point.xy(5, 0)).to_L()
        + upTriggerTop.to_L())
      .attr({fill:"red", "fill-opacity": 1, "cursor":"pointer"});
    taskWidget.push(upTrigger);
    upTrigger.click(upClickFunc);
    var followerMaxPrio = this.model.followerMaxPrioOrNull(id);
    if (followerMaxPrio === null || followerMaxPrio < taskObj.prio) {
      var downTriggerBottom = bgCircleBottom.add(eg.Point.xy(0,5));
      var downTrigger = r.path(
        downTriggerBottom.to_M()
          + bgCircleBottom.sub(eg.Point.xy(5, 0)).to_L()
          + bgCircleBottom.add(eg.Point.xy(5, 0)).to_L()
          + downTriggerBottom.to_L())
        .attr({fill:"blue", "fill-opacity": 1, "cursor":"pointer"});
      taskWidget.push(downTrigger);
      downTrigger.click(downClickFunc);
    }
  }
  var fgCircle, crosslines, crosslinesSubelems;
    function distanceFinished(si) {
      if (! si.taskHasFinishedCount) {
        return 0; // finishable after each logic
      }
      switch (taskObj.logic) {
      case undefined:
      case 'and':
        return si.taskHasFinishedCount - si.taskFinishedCount;
        break;
      case 'or':
        return si.taskFinishedCount > 0 ? 0 : 1;
        break;
      case 'nand':
        return si.taskFinishedCount < si.taskHasFinishedCount ? 0 : 1;
        break;
      case 'nor':
        return si.taskFinishedCount === 0
          ? 0
          : (si.taskFinishedCount);
        break;
      case 'xor': // some finished, some unfinished
        return (si.taskFinishedCount > 0 // or
                && si.taskFinishedCount < si.taskHasFinishedCount // nand
                ? 0
                : 1);
        break;
      default:
        throw "elem logic '" + elem.logic + "' unknown";
        break;
      }
    }
    function percentageFinished(distance, finishableCount) {
      if (! finishableCount) {
        return 1;
      }
      return (finishableCount - distance) / finishableCount;
    }
    function percentageFinishedSI(si) {
      return percentageFinished(
        distanceFinished(si),
        si.taskHasFinishedCount
      );
    }
  var fractionFinished = percentageFinishedSI(si);
  if (fractionFinished) {
    var fractionArea = Math.PI * radius * radius * fractionFinished;
    var fractionRadius =
      fractionFinished * radius * 0.9
      + radius * 0.1; // increases small sizes
    //var fractionRadius = fractionFinished * radius;
    //var fractionRadius = Math.sqrt(fractionArea / Math.PI);
    fgCircle = r.circle(
      //posCircle.x, posCircle.y, fractionRadius).attr(
      posCircle.x, posCircle.y, fractionRadius).attr(
        {"fill":"white", "fill-opacity": 0.25, "stroke-width":0.0}
      );
    fgCircle.addClassAttributes(["FPP", "finishedFg"]);
    taskWidget.push(fgCircle);
  }
  var rOff = 4; // radius of dot
  if (si.taskHasFinishedCount) {
    if (eg.isNil(taskObj.finished)) {
      crosslinesSubelems = r.path(
        bgCircleLeft.to_M()
          + bgCircleRight.to_L()
          + bgCircleTop.to_M()
          + bgCircleBottom.to_L()
      ).attr({"stroke-dasharray":"-"});
    } else {
      crosslinesSubelems = r.path(
        bgCircleLeft.to_M()
          + posCircle.sub(eg.Point.xy(rOff,0)).to_L()
          + posCircle.add(eg.Point.xy(rOff,0)).to_M()
          + bgCircleRight.to_L()
          + bgCircleTop.to_M()
          + posCircle.sub(eg.Point.xy(0, rOff)).to_L()
          + posCircle.add(eg.Point.xy(0, rOff)).to_M()
          + bgCircleBottom.to_L()
      ).attr({"stroke-dasharray":"-"});
    }
    crosslinesSubelems.addClassAttributes(["crosslines", "subelems"]);
    taskWidget.push(crosslinesSubelems);
  }
  if (! eg.isNil(taskObj.finished)) {
    var dot = null;
    if (taskObj.finished) {
      var bbox = bgCircle.getBBox();
        crosslines = r.path(bgCircle.topLeft().to_M()
          + bgCircle.bottomRight().to_L()
          + bgCircle.topRight().to_M()
          + bgCircle.bottomLeft().to_L()
      );
      // .attr({"title":"done"}); -> gives extra node with toFront() problems
      crosslines.addClassAttributes(["crosslines", "done"]);
      taskWidget.push(crosslines);
    } else {
      var blockedByPreds = this.model.hasUnfinishedPreds(id);
      var attrs, classes;
      if (fractionFinished === 1) {
        attrs = { "fill": blockedByPreds ? "red" : "white",
                  "stroke-width":0.0 };
        classes = ["FPP", "finishedDot"];
      } else {
        attrs = { "stroke":"#222",
                  "stroke-width":1 };
        classes = ["FPP", "finishedDot", "disabled"];
      }
      dot = r.circle(posCircle.x, posCircle.y, rOff).attr(attrs);
      dot.addClassAttributes(classes);
      taskWidget.push(dot);
    }
    if (fractionFinished === 1) { // can be changed
      var clickFunc = eg.bindThis(function(e) {
        if (taskObj.subtaskFinishPropagation) {
          return; // will be made automatically
        }
        if (taskObj.finished
            || ! taskObj.finished && ! this.model.hasUnfinishedPreds(id)) {
          this.model.change(id, {
            finished: ! taskObj.finished
          }, "GUI");
        }
      }, this);
      dot && dot.click(clickFunc);
      fgCircle && fgCircle.click(clickFunc);
      crosslinesSubelems && crosslinesSubelems.click(clickFunc);
      crosslines && crosslines.click(clickFunc);
    }
  }
  } // FPP widget
  taskWidget.moveToP(this.model.positionOfChildInParent(id, parent));
  return taskWidget;
};
protoMO_FE.createCommentWidget = function (commentObj, parent) {
  var attrsForCommentBg = ryt.info.attrsForCommentBg();
  var commentWidget = this.flowEditor.r.eg.createTextFieldAt(
    this.model.positionOfChildInParent(commentObj.id, parent),
    this.app.aliasChildInfoStr(commentObj)
      + this.app.computeCommentTitle(commentObj),
    { text: ryt.info.attrsForCommentText(), bg: attrsForCommentBg }
  );
  commentWidget.animateSelectionFN = function (omitAnimOrNil) {
    var attr = {"fill-opacity": attrsForCommentBg["fill-opacity"] * 2};
    if (omitAnimOrNil) {
      commentWidget.bgShape.attr(attr);
    } else {
      commentWidget.bgShape.animate(attr, 500);
    }
  };
  commentWidget.animateUnselectionFN = function (omitAnimOrNil) {
    var attr = {"fill-opacity": attrsForCommentBg["fill-opacity"]};
    if (omitAnimOrNil) {
      commentWidget.bgShape.attr(attr);
    } else {
      commentWidget.bgShape.animate(attr, 500);
    }
  };
  commentWidget.dblclick(eg.bindAsEventListener(elementWidgetOndblclick(this.app), commentWidget));
  commentWidget.addClassAttribute('comment');
  commentWidget.data = commentObj.id; // for getting comment in model via widget
  commentWidget.parentId = parent;
  var funs = ryt.createInfoHoverFuns(
    this.app.elementObjInfoStrCB(commentObj, parent), this.app
  );
  commentWidget.hover(funs[0], funs[1]);
  //commentWidget.mouseup(function(e) { eg.log("commentWidget.mouseup", e); });
  //commentWidget.click(function(e) { eg.log("commentWidget.click", e); });
  return commentWidget;
};
protoMO_FE.createTask = function (taskObj) {
  //OLDthis.flowEditor.addWidget(this.createTaskWidget(task), this.toString());
  var widget = this.createTaskWidget(taskObj, this.parentId);
  this.flowEditor.addWidget(widget, this.toString());
  return widget;
};
protoMO_FE.createComment = function (commentObj) {
  var widget = this.createCommentWidget(commentObj, this.parentId);
  this.flowEditor.addWidget(widget, this.toString());
  return widget;
};

// These funcs are needed to ensure, that referenced elems/conns
// - exist, and
// - not being created twice
// in FE; independently from seq of their creation.
// E.g. in case of aliasing two connected elems, we have to look for an existing
// conn between them. But it can only be created in FE with second elem
// already there - in FE, in Model all is finished -, which in spite of its
// creation for to be created conn follows as parentChild event, when again we
// have to look for this connection already there...
// There may be other means, but these are very robust at least.
protoMO_FE.getWidget = function (id) {
  return eg.arrDetect(this.flowEditor.widgets, function(w) {
    return w.data === id;
  });
};
protoMO_FE.getOrCreateWidget = function (id) {
  var widget = this.getWidget(id);
  if (! widget) {
    widget = this.createElem(id);
  }
  return widget;
};
protoMO_FE.getConn = function (id) {
  return eg.arrDetect(this.flowEditor.connections, function(c) {
    return c.data === id;
  });
};
protoMO_FE.getOrCreateConn = function (id) {
  var conn = this.getConn(id);
  if (! conn) {
    conn = this.createConn(id);
  }
  return conn;
};
protoMO_FE.updateConnWidgetObj = function (widget, obj) {
  var to = this.model.getObject(obj.key_2);
  if (to.type !== 'task') {
    return; // no triggering via comments
  }
  var from = this.model.getObject(obj.key_1);
  if (from.finished !== undefined) {
    if (from.finished) {
      widget.removeClassAttribute("cold");
      widget.addClassAttribute("hot");
    } else {
      widget.removeClassAttribute("hot");
      widget.addClassAttribute("cold");
    }
  } else {
    widget.removeClassAttribute("cold");
    widget.removeClassAttribute("hot");
  }
};
protoMO_FE.updateConn = function (id) {
  return this.updateConnObj(this.model.getObject(id));
};
protoMO_FE.createConn = function (id) {
  var conn = this.model.getObject(id);
  var fromTask = this.getOrCreateWidget(conn.key_1);
  var toTask = this.getOrCreateWidget(conn.key_2);
  var feConn = this.flowEditor.createConnection(fromTask, toTask,
                                                this.toString());
  feConn.data = conn.id;
  return feConn;
};
protoMO_FE.createElem = function (id) {
  var obj = this.model.getObject(id);
  var elemWidget;
  switch (obj.type) {
  case 'comment': elemWidget = this.createComment(obj);
    break;
  case 'task': elemWidget = this.createTask(obj);
    break;
  default: eg.assert(false, "should not be reached");
    break;
  }
  return elemWidget;
};
protoMO_FE.handle_pasted = function (msg) {
  var self = this;
  if (msg.into !== this.parentId) {
    return;
  }
  this.flowEditor.unselectAll();
  this.flowEditor.widgets.forEach(function(w) {
    if (eg.arrContains(msg.elems, w.data)) {
      self.flowEditor.addSelection(w);
    }
  });
};
protoMO_FE.handle_aliased = protoMO_FE.handle_pasted;

protoMO_FE.handle_created = function (msg) {
  var obj = msg.newProps;
  if (obj._relation === 'conn_fromTo') {
    var fromIsChild = this.model.elemHasParent(obj.key_1, this.parentId);
    var toIsChild = this.model.elemHasParent(obj.key_2, this.parentId);
    if (fromIsChild && toIsChild) {
      var connWidget;
      if (msg.triggeredBy !== this.corresponding_feoId) {
        connWidget = this.getOrCreateConn(obj.id);
        this.flowEditor.animatePositionOfWidget(connWidget);
      } else { // manipulated manually
        connWidget = this.getConn(obj.id);
      }
      this.updateConnWidgetObj(connWidget, obj);
      var from = this.model.getObject(obj.key_1);
      var to = this.model.getObject(obj.key_2);
      if (from.finished && to.finished === false) {
        this.flowEditor.roll(connWidget,
                             false, // recursivelyFlag
                             false); // reversedFlag
      }
    }
    fromIsChild && this.handle_changedChild(obj.key_1);
    toIsChild && this.handle_changedChild(obj.key_2);
  } else if (obj._relation === 'parentChild') {
    if (obj.key_1 === this.parentId) {
      var widget = this.getOrCreateWidget(obj.key_2);
      this.flowEditor.animatePositionOfWidget(widget);
      var conns = this.model.filterConnsConnecting(obj.key_2);
      eg.forEach(conns, function (conn, connId) {
        if (this.model.isConnInParent(conn, this.parentId)) {
          this.updateConnWidgetObj(this.getOrCreateConn(connId), conn);
        }
      }, this);
    } else if (obj.key_1 !== this.model.copyStoreID
               && this.model.elemHasParent(obj.key_2, this.parentId)) {
      this.handle_changedChild(obj.key_2);
    }
    eg.forEach(
      this.parentsOfObjChildsHere(this.model.getObject(obj.key_2)),
      function(val, id) {
        this.handle_changedChild(id);
      }, this);
  } else {
    // do nothing
  }
};
protoMO_FE.deleteWidget = function (id) {
  var widget = this.getWidget(id);
  eg.assert(widget);
  this.flowEditor.deleteWidgetAnimated(widget, this.toString());
};
protoMO_FE.handle_deleted = function (msg) {
  var oldProps = msg.oldProps;
  var id = oldProps.id;
  if (oldProps._relation === 'conn_fromTo') {
    var fromIsChild = this.model.elemHasParent(oldProps.key_1, this.parentId);
    var toIsChild = this.model.elemHasParent(oldProps.key_2, this.parentId);
    fromIsChild && this.handle_changedChild(oldProps.key_1);
    toIsChild && this.handle_changedChild(oldProps.key_2);
    if (msg.triggeredBy !== this.corresponding_feoId
        && fromIsChild && toIsChild) {
      // if to or from are absent, it will be deleted indirectly in FE
      var feConn = eg.arrDetect(this.flowEditor.connections, function(c) {
        return c.data === id;
      });
      eg.assert(feConn);
      this.flowEditor.deleteConnectionAnimated(feConn, this.toString());
    }
  } else if (oldProps._relation === 'parentChild') {
    if (msg.triggeredBy !== this.corresponding_feoId) {
      if (oldProps.key_1 === this.parentId) {
        this.deleteWidget(oldProps.key_2);
      } else {
        if (this.model.elemHasParent(oldProps.key_1, this.parentId)) {
          this.handle_changedChild(oldProps.key_1);
        }
        if (this.model.elemHasParent(oldProps.key_2, this.parentId)) {
          this.handle_changedChild(oldProps.key_2);
        }
      }
    }
  } else {
    // flow elem widget deletion triggered by deletion of parentChild relation
  }
};
protoMO_FE.handle_changedChildObj = function(obj) {
  //eg.log("MO_FlowEditor.prototype.handle_changedChildObj()");
  var self = this;
  var oldWidget = this.getWidget(obj.id);
  var conns = oldWidget && this.flowEditor.connectionsOf(oldWidget);
  var newWidget;
  switch (obj.type) {
  case 'comment':
    newWidget = this.createCommentWidget(obj, this.parentId);
    break;
  case 'task':
    newWidget = this.createTaskWidget(obj, this.parentId);
    break;
  default: eg.assert(false, "should not be reached");
    break;
  }
  if (oldWidget) {
    this.flowEditor.replaceWidget(oldWidget, newWidget);
  } else {
    this.flowEditor.addWidgetAnimated(newWidget, this.toString());
  }
};
protoMO_FE.handle_changedChild = function (id) {
  return this.handle_changedChildObj(this.model.getObject(id));
};
protoMO_FE.handle_changedParentChildRelation = function (relObj) {
  //eg.log("MO_FlowEditor.proto.handle_changedParentChildRelation()");
  var movedWidget = this.getWidget(relObj.key_2);
  var widgetPosArr = [ { widget:movedWidget, pos:relObj.val_2 } ];
  this.flowEditor.moveWidgets(widgetPosArr, this.toString(),
                              { animationTime:this.flowEditor.animationTime });
};
protoMO_FE.responsibleForChildObj = function (obj) {
  return this.model.elemHasParent(obj.id, this.parentId);
};
protoMO_FE.responsibleForChild = function (id) {
  return this.model.elemHasParent(id, this.parentId);
};
protoMO_FE.parentsOfObjChildsHere = function (obj) {
  eg.assert(obj);
  return this.model.parentsOfNChildsOf(obj.id, this.parentId);
};
protoMO_FE.handle_updateElem = function (msg) {
  //eg.log("protoMO_FE.handle_updateElem");
  //eg.log(msg);
  if (this.responsibleForChild(msg.elem)) {
    this.handle_changedChild(msg.elem); // treat it as changed for rerendering
  }
}
protoMO_FE.handle_changed = function (msg) {
  eg.log("MO_FlowEditor.prototype.handle_changed()");
  eg.log(this);
  eg.log(msg);
  var obj = msg.objProps;
  if (obj._relation === 'parentChild') {
    if (msg.triggeredBy !== this.corresponding_feoId
        && obj.key_1 === this.parentId) {
      this.handle_changedParentChildRelation(obj);
      return;
    }
  }
  if (this.responsibleForChildObj(obj)) {
    this.handle_changedChildObj(obj);
    /*
    // prio by propagatePrio in model
    if (false && "prio" in msg.newProps) {
      var elementsConnectedToFrom = eg.filter(
        this.model.reachablesByRelToFromId(obj.id), function(val, elem) {
          return this.model.elemHasParent(elem, this.parentId);
        }, this);
      eg.forEach(elementsConnectedToFrom, function(val, elem) {
        this.handle_changedChild(elem);
      }, this);
    }
    */
    if ("finished" in msg.newProps) {
      eg.forEach(this.model.reachablesByRelFromToId(obj.id),
		 function(val, elem) {
		   this.model.send({event:'updateElem',
				    elem:elem,
				    reason:'predecessor finished prop changed',
				    predecessor:obj.id, // opt possibility
				    triggeredBy:this});
		 }, this);
      var connsTo = this.model.filterConnsConnectingTo(obj.id);
      var connsFrom = this.model.filterConnsConnectingFrom(obj.id);
      eg.forEach(connsFrom, function(connObj, id) {
        if (this.model.elemHasParent(connObj.key_2, this.parentId)) {
          this.updateConnWidgetObj(this.getConn(id), connObj);
          if (msg.newProps.finished !== undefined
              && this.model.getObject(connObj.key_2).finished !== undefined) {
            var connWidget = this.getConn(id);
            this.flowEditor.roll(connWidget,
                                 false, // recursivelyFlag
                                 ! msg.newProps.finished); // reversedFlag
          }
        }
      }, this);
    }
  }
  if (msg.newProps.hasOwnProperty("finished")) { // msg.newProps always defined here
    eg.forEach(this.parentsOfObjChildsHere(obj), function(val, id) {
      this.handle_changedChild(id);
    }, this);
  }
  // no changed conn_fromTo relations
};
protoMO_FE.fillFlowEditorForParent = function (parent) {
  var objects = this.model.filterObjectsWithParent(parent);
  var conns = this.model.filterConnectionsConnectingObjectsWithParent(parent);
  for (var childId in objects) {
    this.createElem(childId);
  }
  eg.forEach(conns, function(connObj, id) {
    var connWidget = this.createConn(id);
    this.updateConnWidgetObj(connWidget, connObj);
  }, this);
};
protoMO_FE.initFromModel = function () {
  this.fillFlowEditorForParent(this.parentId);
};
protoMO_FE.handle_undo = function (msg) {
  // do nothing
};
protoMO_FE.handle_redo = function (msg) {
  // do nothing
};

// m1.2 clean
function MO_MilestonesWidget(app, milestonesWidget) {
  this.app = app;
  this.model = app.model;
  this.mw = milestonesWidget;
  this.initFromModel();
};
var protoMO_MW = MO_MilestonesWidget.prototype;
protoMO_MW.toString = function() {
  return "MO_MilestonesWidget";
};
protoMO_MW.receiveFrom = receiveFrom;
protoMO_MW.handle_contentAdded = function (msg) {
  this.appendStackNUpdate(msg.oldLength, msg.length, msg.index);
};
protoMO_MW.handle_contentChanged = function (msg) {
  this.mw.removeMilestones();
  this.appendStackNUpdate(0, msg.length, msg.index);
};
protoMO_MW.handle_indexChanged = function (msg) {
  this.updateMilestoneWidgetMarker(msg.length, msg.index);
  if (this.checkForSnapshotMarker()) {
    return; // end handled there, cannot be at begin
  }
  if (msg.index < msg.oldIndex) { // undo
    if (this.model.atBegin()) {
      this.app.logger.info("Begin reached.");
    }
  } else { // redo
    eg.assert(msg.index > msg.oldIndex);
    if (this.model.atEnd()) {
      this.app.logger.info("End reached.");
    }
  }
};
protoMO_MW.checkForSnapshotMarker = function () {
  if (this.model.justAfterSnapshotMarker()) {
    this.app.logger.info(
      "Snapshot #"
        + this.model.numOfCurrentSnapshotMarker()
        + (this.model.atEnd() ? " (at end)" : "")
        + " reached."
    );
    return true;
  }
  return false;
};
protoMO_MW.updateMilestoneWidgetMarker = function (len, ix) {
  this.mw.moveMarkerTo(
    0, ix / Math.max(len, 1)
  );
};
protoMO_MW.updateMilestoneWidget = function (len, ix) {
  var i, msIx;
  for (i = 0, msIx = 0;
       i < len;
       ++i) {
    if (this.model.actionIsSnapshotMarkerAt(i)) {
      this.mw.moveMilestoneTo(msIx, (i+1)/len);
      ++msIx;
    }
  }
  this.updateMilestoneWidgetMarker(len, ix);
};
protoMO_MW.appendStackNUpdate = function (oldLen, newLen, index) {
  var app = this.app;
  function milestoneInfoStrCB() {
    return 'snapshot' // snapshot marker
      + " #" + app.model.numOfSnapshotMarker(this.id)
      + "\n" + app.creationNModificationInfoString(this, true);
  }
  for (var i = oldLen; i < newLen; ++i) {
    if (this.model.actionIsSnapshotMarkerAt(i)) {
      var markerObj = this.model.markerObjectAt(i);
      var milestoneShape = this.mw.createMilestone(0);
      var cb = eg.bindThis(milestoneInfoStrCB, markerObj);
      cb.type = 'marker';
      var funs = ryt.createInfoHoverFuns(
        cb, this.app
      );
      milestoneShape.hover(funs[0], funs[1]);
    }
  }
  this.updateMilestoneWidget(newLen, index);
};
protoMO_MW.initFromModel = function () {
  this.mw.createMarker(0);
  var length = this.model.objectStore.len_actionS();
  var index = this.model.objectStore.pos_actionS();
  this.appendStackNUpdate(0, length, index);
};

//m1.2 clean
function MO_App(app) {
  this.app = app;
  this.model = app.model;
};
var protoMO_App = MO_App.prototype;
protoMO_App.toString = function() {
  return "MO_App";
};
protoMO_App.receiveFrom = function(msg, from) {
  if (msg.event === 'contentAdded' || msg.event === 'contentChanged') {
    this.app.handleDirtyness(true);
  }
};

function MO_Visualizer(app) {
  this.app = app;
  this.model = app.model;
  this.doLogging = false;
}
var protoMO_V = MO_Visualizer.prototype;
protoMO_V.toString = function() {
  return "MO_Visualizer";
};
protoMO_V.init = function () {
  this.elemsChanged = [];
  this.elemsChangedOrDeleted = [];
  this.elem2oldProps = {};
  this.elem2newProps = {};
  this.elem2objProps = {};

  this.flowsAffected = {};
  this.flow2elemsNew = {};
  this.flow2elemsDel = {};
  this.flow2elemsChanged = {};
  this.flow2elemsConnNew = {};
  this.flow2elemsConnDel = {};
  this.flow2elemsMoved = {};
};
protoMO_V.analyze = function () {
  eg.copyProps(this.flow2elemsNew, this.flowsAffected);
  eg.copyProps(this.flow2elemsDel, this.flowsAffected);
  eg.copyProps(this.flow2elemsChanged, this.flowsAffected);
  eg.copyProps(this.flow2elemsConnNew, this.flowsAffected);
  eg.copyProps(this.flow2elemsConnDel, this.flowsAffected);
  eg.copyProps(this.flow2elemsMoved, this.flowsAffected);

  if (this.doLogging) {
    eg.log('elemsChanged:', this.elemsChanged,
           'elemsChangedOrDeleted:', this.elemsChangedOrDeleted);

    eg.log('flow2elemsNew:', this.flow2elemsNew,
           'flow2elemsDel:', this.flow2elemsDel);
    eg.log('flow2elemsChanged:', this.flow2elemsChanged);

    eg.log('flow2elemsConnNew:', this.flow2elemsConnNew,
           'flow2elemsConnDel:', this.flow2elemsConnDel,
           'flow2elemsMoved:', this.flow2elemsMoved);
    eg.log('flowsAffected:', this.flowsAffected);
  }
};
protoMO_V.initAndHandle = function (msg) {
  this.init();
  var trans = msg.transaction;
  var created = trans.created;
  var deleted = trans.deleted;
  var changed = trans.changed;
  // no ordered sequences!
  eg.forEach(deleted.id2old, function(oldProps, id) {
    this._handle_deleted(id, oldProps);
  }, this);
  eg.forEach(created.id2new, function(newProps, id) {
    this._handle_created(id, newProps);
  }, this);
  eg.forEach(changed.id2new, function(newProps, id) {
    this._handle_changed(id, changed.id2old[id], newProps, changed.id2obj[id]);
  }, this);
};
protoMO_V.receiveFrom = function (msg, from) {
  if (msg.triggeredBy !== 'undo' && msg.triggeredBy !== 'redo') {
    return; // be inactive outside undo/redo
  }
  receiveFrom.call(this, msg, from);
};
protoMO_V.handle_trans_apply_begin = function (msg, from) {
  // compute transaction properties related to *old* model!
  this.initAndHandle(msg);
  this.triggerWindowsBeforeTransaction();
};
protoMO_V.handle_trans_apply_end = function (msg, from) {
  this.triggerWindowsAfterTransaction();
};
/*
// possibly not needed
protoMO_V.removeChildsOf = function (parent) {
  this.elemsChanged = eg.filter(this.elemsChanged, function(elemObj, elem) {
    var elemIsChild = this.app.model.elemHasParentRecursive(elem, parent);
    if (elemIsChild) {
      eg.log("child removed...");
      delete this.elem2oldProps[elem];
      delete this.elem2newProps[elem];
    }
    return elemIsChild;
  }, this);
};
*/
protoMO_V._handle_created = function (id, newProps) {
  var obj = newProps;
  if (obj._relation === 'parentChild') {
    var elems = this.flow2elemsNew[obj.key_1] || [];
    elems.push(obj.key_2);
    this.flow2elemsNew[obj.key_1] = elems;
  } else if (obj._relation === 'conn_fromTo') {
    var parents  = this.model.parentsWithChildRelObj(obj);
    for (var parent in parents) {
      var elems = this.flow2elemsConnNew[parent] || [];
      elems.push(obj.key_1, obj.key_2);
      this.flow2elemsConnNew[parent] = elems;
    }
  } else if (obj.type === 'task' || obj.type === 'comment') {
/*
    this.elemsCreated.push(id);
    this.elem2newProps[id] = newProps;
*/
  }
};
protoMO_V._handle_deleted = function (id, oldProps) {
  if (oldProps._relation === 'parentChild') {
    var elems = this.flow2elemsDel[oldProps.key_1] || [];
    elems.push(oldProps.key_2);
    this.flow2elemsDel[oldProps.key_1] = elems;
  } else if (oldProps._relation === 'conn_fromTo') {
    var parents = this.model.parentsWithChildRelObj(oldProps);
    for (var parent in parents) {
      var elems = this.flow2elemsConnDel[parent] || [];
      elems.push(oldProps.key_1, oldProps.key_2);
      this.flow2elemsConnDel[parent] = elems;
    }
  } else if (oldProps.type === 'task' || oldProps.type === 'comment') {
    // needed for deleting wins of deleted elems
    this.elemsChangedOrDeleted.push(id);
/*
    this.elemsDeleted.push(id);
    this.elem2oldProps[id] = oldProps;
*/
  }
};
protoMO_V._handle_changed = function (id, oldProps, newProps, objProps) {
  if (objProps.type === 'task' || objProps.type === 'comment') {
    this.elemsChanged.push(id);
    this.elemsChangedOrDeleted.push(id);
    this.elem2objProps[id] = objProps;
    this.elem2oldProps[id] = oldProps;
    this.elem2newProps[id] = newProps;
    for (var parent in this.model.child2Parents[id]) {
      var elems = this.flow2elemsChanged[parent] || [];
      elems.push(id);
      this.flow2elemsChanged[parent] = elems;
    }
  } else if (objProps.type === 'parentChild' && newProps.val_2) {
    var flow = objProps.key_1;
    var elems = this.flow2elemsMoved[flow] || [];
    elems.push(objProps.key_2); // moved child
    this.flow2elemsMoved[flow] = elems;
  }
};
// If changes are visible in flow, we don't have to show diff view.
protoMO_V.changesVisibleInFlows = function (props) {
  return (
    ! ('text' in props)
      && ! ('description' in props)
    // 'finished' should be visible
    // 'prio' should be visible
      && ! ('logic' in props)
      && ! ('subtaskFinishPropagation' in props)
  );
};
protoMO_V.triggerWindowsBeforeTransaction = function () {
  // delete outdated diff wins
  this.elemsChangedOrDeleted.forEach(function(elem) {
    if (elem in this.app.elem2diffDia) {
      this.app.elem2diffDia[elem].dialog('close');
    }
  }, this);
  this.analyze();
  if (! eg.hasProps(this.flowsAffected)) {
    return;
  }
  if (this.model.rootID in this.flowsAffected) {
    var self = this;
    var useOpacity = true;
    /* trick to make dialogs and info wins temporarily invisible */
    if (useOpacity) {
      //var hoverInfoOpacity = $(".showHoverInfo").css('opacity');
      //$(".showHoverInfo").css('opacity', 0.05);
      $(".ui-dialog").css('opacity', 0.05);
      $(".showDiff").css('opacity', 0.05);
    } else {
      //$(".showHoverInfo").css('visibility', 'hidden');
      $(".ui-dialog").css('visibility', 'hidden');
      $(".showDiff").css('visibility', 'hidden');
    }
    var laterAction = function(){
      if (self.doLogging) {
        eg.log("in lastActionCB(), self.app.animationTime: ", self.app.animationTime);
      }
      setTimeout(function() {
        if (self.doLogging) {
          eg.log("show dialog again...");
        }
        if (useOpacity) {
          //$(".showHoverInfo").css('opacity', hoverInfoOpacity);
          $(".ui-dialog").css('opacity', 1);
          $(".showDiff").css('opacity', 1);
        } else {
          //$(".showHoverInfo").css('visibility', '');
          $(".ui-dialog").css('visibility', '');
          $(".showDiff").css('visibility', '');
        }
      }, self.app.animationTime);
      // would work with stylesheet, but is more indirect:
      //   dia.dialog('disable');
      // does not work with Raphael:
      //   $('.ui-dialog').css('display', 'none');
      // makes problems with changed elements (changed content warning):
      //   dia.dialog('close');
    };
    laterAction();
    return;
  }
  // search flow nearest to root
  var flowsArr = eg.keys(this.flowsAffected);
  var self = this;
  flowsArr.sort(function(flow_a, flow_b) {
    var dist_a, dist_b;
    dist_a = self.model.distanceToRoot(flow_a);
    if (! dist_a) {
      return 1; // b lower
    }
    dist_b = self.model.distanceToRoot(flow_b);
    if (! dist_b) {
      return -1; // a lower
    }
    // both have some distance to root
    if (dist_a === dist_b) {
      // sort youngest (higher) times lower ix (descending)
      return self.model.elementSortAfterTimeFunc(flow_a, flow_b);
    }
    return dist_a - dist_b; // ascending
  });
  var nearestFlow = flowsArr[0];
  if (this.model.distanceToRoot(nearestFlow) === null) {
    return;
  }
  var dia;
  if (dia = this.app.elem2dialog[nearestFlow]) {
    dia.dialog( "moveToTop" );
  } else {
    var taskObj = this.model.getObject(nearestFlow);
    this.app.openElementDialog(nearestFlow, null, { pos: ryt.info.undoRedo.openFlowWinPosition, position: 'left' });
  }
}; // triggerWindowsBeforeTransaction()
protoMO_V.triggerWindowsAfterTransaction = function () {
  this.elemsChanged.forEach(function(elem) {
    var objProps = this.elem2objProps[elem];
    var oldProps = this.elem2oldProps[elem];
    var newProps = this.elem2newProps[elem];
    if (! this.changesVisibleInFlows(newProps)) {
      var oldObj = eg.cloneProps(objProps);// .. modifying clone of objProps ..
      eg.modifyProps(oldProps, oldObj);   // .. props by old props.
      var diffWin = ryt.showDiff(
        elem, objProps,
        objProps, oldObj,
        { pos: ryt.info.undoRedo.openDiffWinPosition, position: 'right' }
      );
    }
  }, this);
}; // triggerWindowsAfterTransaction()


function App() {
  this.createInputDummy("rootNode");
  this.r = Raphael("rootNode", "100%", "100%").installExtensions();
  this.r.eg.setDefaultRectCornerRadius(ryt.info.prefs.rectCornerRadius);
  this.flowEditors = new eg.Set();
  this.naviState = null;
  this.timeouts = { busyTimeout: 100 };
  this.setAnimationTime(1000); // also sets repeatTimeout
  this.openDialogs = new eg.Set();
  this.openHoverInfos = new eg.Set();
  this.elem2diffDia = {};
  this.elem2dialogs = { };
  this.elem2dialog = { };
  this.selectedStore = { }; // here for sharing between models
  this.createMainButtons();
  this.createActionButtons();
}
App.animationTime2repeatTimeout_factor = 2;
var protoApp = App.prototype;
protoApp.toString = function () {
  return "App";
};
protoApp.registerDialog = function (elementIdOrNil, dia) {
  this.openDialogs.add(dia);
  if (elementIdOrNil) {
    var diasForElem = this.elem2dialogs[elementIdOrNil] || new eg.OSet();
    diasForElem.add(dia);
    this.elem2dialogs[elementIdOrNil] = diasForElem;
    this.elem2dialog[elementIdOrNil] = dia; // use last registered one
  }
};
protoApp.unregisterDialog = function (elementIdOrNil, dia) {
  this.openDialogs.remove(dia);
  if (elementIdOrNil) {
    var diasForElem = this.elem2dialogs[elementIdOrNil];
    diasForElem.remove(dia);
    if (diasForElem.size()) {
      this.elem2dialog[elementIdOrNil] = diasForElem.last();
    } else {
      delete this.elem2dialog[elementIdOrNil];
    }
  }
};
protoApp.registerHoverInfo = function (hi) {
  this.openHoverInfos.add(hi);
};
protoApp.unregisterHoverInfo = function (hi) {
  this.openHoverInfos.remove(hi);
};
protoApp.removeHoverInfos = function () {
  // removes elems, so use asArray()...
  this.openHoverInfos.asArray().forEach(function(hi, ix) {
    hi.stayFlag = false;
    hi.timeoutFunc();
  });
};
protoApp.registerDiff = function (element, dia) {
  eg.assert(! (element in this.elem2diffDia));
  this.elem2diffDia[element] = dia;
};
protoApp.unregisterDiff = function (element) {
  eg.assert(element in this.elem2diffDia);
  delete this.elem2diffDia[element];
};
protoApp.isBusy = function () {
  return this.flowEditors.some(function(fe) { return fe.localIsBusy(); })
    || this.forcedBusy;
};
  // Alternative *could* be to store this state at document event handler: but
  // refactoring event handlers according to this, does not feel attractive...
  // (currently this is only used for not showing disturbing element info).
  protoApp.isMouseDown = function () {
    return this.flowEditors.some(function(fe) { return fe.state.mousedownPos; })
  };
protoApp.updateTimes = function () {
  this.timeouts.repeatTimeout =
    this.animationTime * App.animationTime2repeatTimeout_factor;
  var self = this;
  this.flowEditors.forEach(function(fe){
    fe.animationTime = self.animationTime;
  });
};
protoApp.setAnimationTime = function (newTime) {
  this.animationTime = newTime;
  this.updateTimes();
};
protoApp.getAnimationTime = function () {
  return this.animationTime;
};
protoApp.wire = function (flowEditor, flowId, mo_FlowEditor, feo_Model) {
  //eg.log("flowId: ", flowId);
  var self = this;
  flowEditor.localIsBusy = flowEditor.isBusy;
  flowEditor.isBusy = function() { return self.isBusy(); };
  this.flowEditors.add(flowEditor);
  flowEditor.animationTime = this.animationTime;
  flowEditor.canvas.ondblclick = this.createCanvasOndblclick(flowEditor, flowId);

  this.popupMenuForFlowEditor(flowEditor, flowId);

  ++this.wire.wireCount;
  mo_FlowEditor.id = 'mo_FlowEditor['+flowId+']'+ '_'+ this.wire.wireCount;
  feo_Model.id = 'feo_Model['+flowId+']'+ '_'+ this.wire.wireCount;
  feo_Model.flowId = flowId;
  mo_FlowEditor.corresponding_feoId = feo_Model.id;
  feo_Model.corresponding_moId = mo_FlowEditor.id;
  this.model.channel.addListener(mo_FlowEditor);
  eg.assert(! flowEditor.channel);
  flowEditor.channel = new eg.BatchChannel();
  flowEditor.channel.addListener(feo_Model);
};
protoApp.wire.wireCount = 0; // for having unique ids
protoApp.createCanvasOndblclick = function (flowEditor, parentId) {
  var self = this;
  return function(e) {
    //eg.log("canvasOndblclick() " + parentId);
    if (self.inModalDialog) {
      return;
    }
    e = e || window.event;
    var pos = flowEditor.canvasMousePos(e);
    //eg.log("keyCode", e.keyCode);
    if (e.shiftKey) { // ctrl key works with Linux, but at Mac it's context menu
      self.openCommentDialog(
        null,
        function(data) {
          //eg.log(data);
          self.model.createComment(parentId, pos, data.text, 'canvas');
        },
        parentId);
    } else {
      var actionFunc = function(data, closeFromRetFlag) { // named for reuse
        self.model.createTask(parentId, pos,
                              data.name, data.description, data.finished,
                              data.prio,
                              data.logic, data.subtaskFinishPropagation,
                              'canvas');
        if (closeFromRetFlag && ryt.info.prefs.fastInputFlag) {
          pos = pos.add(eg.Point.xy(0, 25));
          self.openTaskDialog(null, actionFunc, parentId);
        }
      };
      self.openTaskDialog(
        null, // no task props for dialog so far
        actionFunc,
        parentId
      );
    }
    eg.stopPropagation(e); // cannot hurt
    eg.preventDefault(e);
  };
};
protoApp.wireModelObserver = function (observer) {
  this.model.channel.addListener(observer);
};
protoApp.unwireModelObserver = function (observer) {
  this.model.channel.removeListener(observer);
};
protoApp.wireModelActionSObserver = function (observer) {
  this.model.actionSChannel.addListener(observer);
};
protoApp.unwireModelActionSObserver = function (observer) {
  this.model.actionSChannel.removeListener(observer);
};

// task dialog
//
protoApp.initialTaskName = "a task";
protoApp.taskDialogHelpText = function (showExpertInfo) {
  var basicHelp = ""
    +"Basic\n"
    +"-----\n"
  //+"Inputs:\n"
    +"*name*\n"
    +"- becomes directly visible title of task widget/link.\n"
    +"*description*\n"
    +"- becomes visible by hovering over task widget/link.\n"
    +"\n"
    +"*finished*\n"
    +"- marks a task - together with all of its subtasks - as being finished.\n"
    +"***n/a*** (non applicable)\n"
    +"- if finishing does not apply.\n"
    +"*prio*\n"
    +"- priorities can be set here: they propagate to predecessor tasks.\n"
    +"\n"
    +"Subelements\n"
    +"-----------\n"
    +"A canvas for creating subelements (tasks or comments) of a task becomes visible !after! a task has been created by double-clicking it for editing. Then creation of (sub-)elements is possible as usual (by double-clicking onto canvas).\n"
    +"\n"
  ;
  var moreHint = ""
    +"Advanced\n"
    +"--------\n"
    +"In expert mode (settable in preferences) there is more help about advanced features."
  ;
  var moreHelp = ""
    +"Advanced\n"
    +"--------\n"
    +"After pressing the *More* button - or if set before - there is access to subtask finishing logics.\n"
    +"***subtask finish propagation***\n"
    +"- if set to\n"
    +"  - off (default), finishing state of subtasks computed after *logic* allows to !manually! finishing this task;\n"
    +"  - on, finishing state of subtasks computed after *logic* !automatically! finishes this task.\n"
    +"*logic*\n"
    +"- says, how subtasks have to be finished or not, to treat them all together as finished.\n"
    +" There are\n"
    +"  - *and* (default): all subtasks have to be finished,\n"
    +"  - *or*           : any one has to be finished,\n"
    +"  - *xor*          : a combination of *or* and *nand*,\n"
    +"  - *nand*         : not all have to be finished,\n"
    +"  - *nor*          : none has to be finished.\n"
    +"Note: if there are no - or only ***n/a*** subtasks - each of these logics evaluates to true (being finished)."
  ;
  return basicHelp + (showExpertInfo ? moreHelp : moreHint);
};
protoApp.openTaskDialog = function (argObjOrNil, callbackOK, parentId, taskIdOrNil, diaArgObjOrNil) {
  var topOff = 50;
  var argObj = argObjOrNil || {};
  var diaArgObj = diaArgObjOrNil || { };
  var dims = eg.Point.xy(600,200);
  var dialogTitle = (argObjOrNil && 'Edit Task') || 'Create Task';
  var name = argObj.name || this.initialTaskName;
  var description = argObj.description || "";
  var finished = argObjOrNil ? argObj.finished : false; // may be undefined, default false
  var finishedAllowed = taskIdOrNil
    ? this.model.canBeFinished(taskIdOrNil)
    : true;
  var finishingAutomated = argObj.subtaskFinishPropagation; // may be nil
  var prio = argObj.prio;
  var model = this.model;
  var diaCount = ++this.openTaskDialog.diaCount;
  var taskDialogId = "task-dialog_" + diaCount;
  var canvasId = "canvas_" + diaCount;
  var nameForPrios = "prio_" + diaCount;
  var nameForFinished = "finished_" + diaCount;
  var colspan = 'colspan="9"';
  var justBeenCreated = ! taskIdOrNil;
  var $dia = $(
    '<div id="' + taskDialogId +'" title="'+dialogTitle+'">'

    //+'<form enctype="utf-8">'
      +'<form id="task-form" action="">'

      +'<table border="0" id="mainTableBody" style="width:100%;">'

      +'<tr>'
      + '<td style="text-align:center;">name</td>'
      + '<td '+colspan+'>'
      +  '<textarea name="name" id="name" rows="1" '
    //+     'tabindex=1 '
      +     'style="width:100%;" cols="240">' // cols too low, does not maximize text ..
    //+    name                               // .. field for large task dia.
      +  '</textarea>'
      + '</td>'
      +'</tr>'

      +'<tr>'
      + '<td style="text-align:center;">description</td>'
      + '<td '+colspan+'>'
      +  '<textarea name="description" id="description" '
      +     'rows="' + (justBeenCreated || description ? 3 : 1) +'" '
    //+     'tabindex=2 '
      +     'style="width:100%; font-family:Courier;">'
    //+    description
      +  '</textarea>'
      + '</td>'
      +'</tr>'

      +'<tr id ="finishedButtonsWrapper">'
      +'</tr>'

      +'<tr id="trPrioSection">'
      + '<td style="text-align:center;">prio</td>'
      + '<td>'
      +  '<table>'
      +   '<tr id ="prioButtonsWrapper">'
      +   '</tr>'
      +  '</table>'
      + '</td>'

      +'<td id="actionButtonsWrapper" rowspan="1">'
      +'</td>'

      +'</tr>'

      +'</table>'

      +'</form>' // task-form

      +'<div id="'+canvasId+'" class="canvas" '
      +'tabindex=-1 '
      +'style="width:100%; '
      +'"></div>'

      +'</div>'
  );
  $dia.find("#name").val(name);
  $dia.find("#description").val(description);

  $dia.showMoreButton
    = ! argObj.logic
    && ! argObj.subtaskFinishPropagation
    && ryt.info.inExpertMode();
  $dia.moreFlag = argObj.logic || argObj.subtaskFinishPropagation;

  insertActionButtons();

  $dia.updatePrioButtons = function () {
    // remove existing prio buttons
    var wrapper = this.find('#prioButtonsWrapper');
    var contents = wrapper.contents(); // children() is not enough
    contents.remove();
    var followerMaxPrio = model.followerMaxPrioOrNull(taskIdOrNil);
    var prioButtons = $(
      ''
        +'<td>'
        + '<input type="radio" id="prio_na" name="'+nameForPrios+'" value="nil"'
        +   (prio === undefined ? ' checked' : '')
        + '>'
        + 'n/a\u00A0\u00A0\u00A0'
        +'</td>'
        +'<td id="prioLabels">' // prioButtons[1]
        + (followerMaxPrio === null || followerMaxPrio <= 1
           ? ('<input type="radio" id="prio_high" name="'+nameForPrios+'" value="1"'
              + (prio === 1 ? ' checked' : '')
              +'/ >high<br>')
           :'')
        + (followerMaxPrio === null || followerMaxPrio <= 0
           ? ('<input type="radio" id="prio_normal" name="'+nameForPrios+'" value="0"'
              + (prio === 0 ? ' checked' : '')
              +'/ >normal<br>')
           :'')
        + (followerMaxPrio === null || followerMaxPrio <= -1
           ? ('<input type="radio" id="prio_low" name="'+nameForPrios+'" value="-1"'
              + (prio === -1 ? ' checked' : '')
              +'/ >low')
           :'')
        +'</td>'
    );
    function setNAForPrioButtons(naFlag) {
      var prioLabelArea = $(prioButtons[1]);//wrapper.find("#prioLabels");
      var ttt = $(prioButtons[1]);
      if (naFlag) {
        prioLabelArea.css("color", "#777");
      } else {
        prioLabelArea.css("color", "");
      }
    }
    var prioInputButtons = prioButtons.find(
      "input:radio[name='"+nameForPrios+"']"
    );
    prioInputButtons.change(function(e) {
      setNAForPrioButtons(e.target.value === 'nil');
    });
    setNAForPrioButtons(prio === undefined);
    wrapper.prepend(prioButtons);
  };
  $dia.updatePrioButtons();

  function insertActionButtons() {
   var actionButtonsStr = ''
      +'<div class="ui-dialog-buttonset">'
    ;
    if ($dia.showMoreButton) {
      actionButtonsStr +=
      ''
      // Shamelessly reuse jquery-ui dialog buttons... They look nice!
        +'<button id="'+taskDialogId+'_button_0" type="button" '
      //+  'tabindex=3 '
        +  'class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">'
        +  '<span class="ui-button-text">More</span>'
        +'</button>'
        + eg.strMultiplied('\u00A0', 4)
      ;
    }
    actionButtonsStr +=
    ''
      +'<button id="'+taskDialogId+'_button_1" type="button" '
    //+  'tabindex=3 '
      +  'class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">'
      +  '<span class="ui-button-text">OK</span>'
      +'</button>'
      +'<button id="'+taskDialogId+'_button_2" type="button" '
    //+  'tabindex=4 '
      +  'class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">'
      +  '<span class="ui-button-text">Cancel</span>'
      +'</button>'
      +'<button id="'+taskDialogId+'_button_3" type="button" '
    //+  'tabindex=5 '
      +  'class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">'
      +  '<span class="ui-button-text">?</span>'
      +'</button>'
      +'</div>' // ui-dialog-buttonset
    ;
    var actionButtons = $(actionButtonsStr);
    var dialogButtonsWrapper = $dia.find("#actionButtonsWrapper");
    dialogButtonsWrapper.prepend(actionButtons);
    var diaButtons = $dia.find(".ui-button");
    diaButtons
      .css("margin-right","7px")
      .hover(function() {
        $(this).addClass('ui-state-hover');
      }, function() {
        $(this).removeClass('ui-state-hover');
      })
      .focus(function() {
        $(this).addClass('ui-state-focus');
      })
      .focusout(function() {
        $(this).removeClass('ui-state-focus');
      });
    if ($dia.showMoreButton) {
      $(diaButtons[0]).click(function() {
        if (! $dia.moreFlag) {
          $dia.moreFlag = true;
          $dia.updateExtras(argObj);
          $(diaButtons[0]).attr('disabled', true);
          $(diaButtons[0]).addClass('ui-state-disabled');
        }
      });
    }
    var buttonOKOff = $dia.showMoreButton ? 1 : 0;
    $(diaButtons[buttonOKOff + 0]).click(function() {
      $dia.closeFromOK = true;
      $dia.dialog('close');
    });
    $(diaButtons[buttonOKOff + 1]).click(function() {
      $dia.dialog('close');
    });
    $(diaButtons[buttonOKOff + 2]).click(function() {
      ryt.helpDialog(dialogTitle,
                     self.taskDialogHelpText($dia.moreFlag
                                             || $dia.showMoreButton
                                            )
                    );
    });
  } // insertActionButtons()

  function insertExtras(argObj) {
    var defaults = { subtaskFinishPropagation:false, logic:"and" };
    var props = { subtaskFinishPropagation: argObj.subtaskFinishPropagation,
                  logic: argObj.logic };
    var appendNode = $dia.find(("#mainTableBody"));
    var sg = ryt.createSelectHTMLGenerator(props, defaults);
    $dia.sg = sg; // keep for prop extraction later
    sg.addSelectionData("subtaskFinishPropagation",
                        [false, true], ["off", "on"]);
    sg.addSelectionData("logic",
                        ['and', 'or', 'xor', 'nand', 'nor'],
                        ["and (all)", "or (any)", "xor (or and nand)", "nand (not all)", "nor (none)"]);
    var moreStr = ''
      +'<tr id="finishingExtras" style="text-align:center;">'
      +  '<td colspan="10">'
      +    '<table width="100%">'
      +      '<tr>'
      +        '<td>'
      +          "subtask finish propagation&nbsp;&nbsp;"//<br />"
      +           sg.createSelectHTMLIdent("subtaskFinishPropagation")
      +        '</td>'
      +        '<td>'
      +          "logic&nbsp;&nbsp;"//<br />"
      +          sg.createSelectHTMLIdent("logic")
      +        '</td>'
      +      '</tr>'
      +    '</table>'
      +  '</td>'
      +'</tr>'
    ;
    appendNode && appendNode.append($(moreStr));
    var logicSelectArea = appendNode.find("#logic");
    var subtaskFinishPropagationArea = appendNode.find("#subtaskFinishPropagation");
    var changeFun = function(){
      var extraProps = extractExtraProps();
      var canBeFinished = model.canBeFinishedFromChildsAfterLogic(
        model.parent2Childs[taskIdOrNil], extraProps.logic
      );
      $dia.updateFinishedButtons(
        extraProps.subtaskFinishPropagation
          ? canBeFinished
          : (canBeFinished ? $dia.finished : false),
        canBeFinished,
        extraProps.subtaskFinishPropagation
      );
    };
    logicSelectArea.change(changeFun);
    subtaskFinishPropagationArea.change(changeFun);
  } // insertExtras()

  function updateExtras(argObj) {
    $dia.moreFlag = $dia.moreFlag
      || (argObj
          && (argObj.logic || argObj.subtaskFinishPropagation));
    var finishingExtrasSearch = $dia.find("#finishingExtras");
    if (! finishingExtrasSearch.length) {
      if ($dia.moreFlag) {
        insertExtras(argObj);
      } else {
        // nothing to do
      }
    } else { // update brute force by recreation
      finishingExtrasSearch.remove();
      if ($dia.moreFlag) {
        insertExtras(argObj);
      }
    }
  } // updateExtras()
  $dia.updateExtras = updateExtras;

  function extractExtraProps() {
    var form = $dia.find("#task-form")[0];
    return $dia.sg.getPropsFromForm(form);
  }

  $dia.updateFinishedButtons = function (finished, finishedAllowed, finishingAutomated) {
    this.finished = finished;
    // remove existing finished buttons
    var wrapper = this.find('#finishedButtonsWrapper');
    var contents = wrapper.contents(); // children() is not enough
    contents.remove();
    // make new finished buttons

    var finishedButtonsStr =
      ''
      +'<td colspan="3" id="finishedTD">'
      +  '<input type="checkbox" id="finished" name="'+nameForFinished+'_1"'
      +     (finished === true ? ' checked' : '')
      +  '/ >'
      +  '<span class="finishedLabel">finished'
      +     (finishedAllowed ? '' : '\u00A0(blocked)')
      +     (finishingAutomated ? '\u00A0(auto)' : '')
      +     '\u00A0\u00A0'
      +  '</span>'
      +  '<input type="checkbox" id="finished_NA" name="'+nameForFinished+'_2"'
      +     (finished === undefined ? ' checked' : '')
      +  '/ >'
      +  '<span class="naLabel">'
      +     'n/a'
      +  '<span>'
      +'</td>'
    ;

    var finishedButtons = $(finishedButtonsStr);
    wrapper.prepend(finishedButtons);

    function setNAAttributes() {
      var finishedLabel = $dia.find(".finishedLabel");
      if ($dia.finished === undefined) {
        finishedNAButton.attr('checked', true);
        finishedLabel.css("color", "#777");
        //finishedButton.css("background-color", "#333");
      } else {
        finishedNAButton.attr('checked', false);
        finishedLabel.css("color", "");
        //finishedButton.css("background-color", "");
      }
    }
    // toggle logic needs extra var, since checked is always on ..
    // .. when triggering click event.
    var finishedButton = $dia.find('#finished');
    var finishedNAButton = $dia.find('#finished_NA');
    finishedButton.click(function() {
      if ($dia.finished === undefined) {
        $dia.finished = finishedAllowed;
        setNAAttributes();
      }
      else {
        if (! finishedAllowed) {
          $dia.finished = false;
        } else {
          if (! finishingAutomated) {
            $dia.finished = ! $dia.finished;
          }
        }
      }
      finishedButton.attr('checked', $dia.finished);
    });
    finishedNAButton.click(function() {
      if ($dia.finished === undefined) {
        $dia.finished = finishedAllowed;
        finishedButton.attr('checked', $dia.finished);
        finishedButton.focus();
      } else {
        $dia.finished = undefined;
      }
      setNAAttributes();
    });
    setNAAttributes();
  }; // updateFinishedButtons()

  // avoid creating new task dialogs with dblclick (is there a better way (probably in document ev handler?)?)
  $dia.dblclick(eg.eatThemEventHandler);
  $dia.keydown(eg.stopPropagation); // avoid flow elem ops (copy/alias/paste)
  var flowEditorNObservers = null;
  var mo_TaskDialog = new MO_TaskDialog(this, $dia, parentId, taskIdOrNil);
  this.wireModelObserver(mo_TaskDialog);
  var self = this;
  var r = null; // subcanvas
  var originalHeight = null; // for resizing
  var originalHeightCanvasDiv = null; // for resizing
  $dia.extractProps = function() {
    var nameArea = $dia.find("#name");
    var descriptionArea = $dia.find("#description");
    var prioArea = $dia.find("input:radio:checked[name='"+nameForPrios+"']");
    var prioStr = prioArea.val();
    var prio = prioStr === "nil" ? undefined : parseInt(prioStr);
    if (prio !== undefined && taskIdOrNil) {
      var followerMaxPrio = self.model.followerMaxPrioOrNull(taskIdOrNil);
      if (followerMaxPrio !== null && prio < followerMaxPrio) {
        prio = Math.max(prio, followerMaxPrio);
      }
    }

    var moreProps = { };
    if ($dia.moreFlag) {
      var form = $dia.find("#task-form")[0];
      moreProps = $dia.sg.getPropsFromForm(form);
    }

    $dia.props = {
      name:nameArea.val(), description:descriptionArea.val(),
      finished:$dia.finished,
      prio:prio,
      logic: moreProps.logic === 'and' ? undefined : moreProps.logic,
      subtaskFinishPropagation: (moreProps.subtaskFinishPropagation
                                 ? true : undefined)
    };
    //eg.log($dia.props);
  };
  $dia.updateFinishedButtons(finished, finishedAllowed, finishingAutomated);
  $dia.updateExtras(argObj);
  $dia.dialog({
    position: diaArgObj.pos ? [diaArgObj.pos.x, diaArgObj.pos.y] : diaArgObj.position ? [diaArgObj.position, topOff] : 'center',
    autoOpen: true, modal: false,
    //show: 'scale',
    //hide: 'scale',
    width: dims.x + 100,
    beforeClose: self.createElemDialogBeforeCloseFunc($dia, dialogTitle, taskIdOrNil),
    close: function(event, ui) {
      self.unwireModelObserver(mo_TaskDialog);
      if (flowEditorNObservers) {
        self.unwireModelObserver(flowEditorNObservers.mo_flowEditor);
        self.flowEditors.remove(flowEditorNObservers.flowEditor);
        var cm = $("#" + flowEditorNObservers.flowEditor.contextMenuID);
        cm.remove();
      }
      $dia.remove();
      self.unregisterDialog(taskIdOrNil, $dia);
      if ($dia.closeFromOK || $dia.closeFromRet) {
        if (callbackOK) {
          if ($dia.closeFromRet) {
            // for safety: not seen a NL so far, but it could be there
            $dia.props.name = eg.withoutTrailingNL($dia.props.name);
          }
          callbackOK($dia.props, $dia.closeFromRet);
        }
      } else {
        self.logger.info("'"+dialogTitle + "' cancelled.");
      }
    },
    open: function() {
      setTimeout(function(){
        var nameArea = $dia.find("#name");
        if (self.initialTaskName.length && nameArea.val() === self.initialTaskName) {
          nameArea.select();//probably more portable than going into nameArea[0]
        }
        nameArea.focus();
        /* // behavior here could be controlled by some pref
        if (taskIdOrNil) {
          var descriptionArea = $dia.find("#description");
          descriptionArea.focus();
        }
        */
        // show:'scale' effect makes problems:
        // self.setCanvasSizeFor(r);
      }, 500);

    },
    // compute dia height once, after it has been opened
    resizeStart: function (event, ui) {
      if (r && ! originalHeight) {
        originalHeight = parseFloat($dia.css('height'));
        originalHeightCanvasDiv
          = parseFloat($dia.find("#"+canvasId).css('height'));
      }
    },
    resizeStop: function(event, ui) { // size of canvas oriented at dia size
      if (! r) { return; }
      var diaHeight = parseFloat($dia.css('height'));
      var newHeightDiv = Math.max(originalHeightCanvasDiv + diaHeight - originalHeight, 0);
      $dia.find("#"+canvasId).css('height', newHeightDiv);
      self.setCanvasSizeFor(r);
      return;
    }
  });
  if (! taskIdOrNil) { // pos of creation dialog different from edit one
    var off = eg.Point.xy(40, 40);
    var centerPos = $dia.parent().position(); // center pos of dialog
    $dia.dialog( "option", "position", [centerPos.left + off.x, centerPos.top + off.y]);
  }

  $dia.forcedClose = self.createElemDialogForcedCloseFunc($dia);
  this.registerDialog(taskIdOrNil, $dia);
  // don't know, why this is needed here, but not in comment dialog...
  var diaCloseOnKeydownFunc = function (e) {
    if (e.keyCode === 27) {
      $dia.dialog('close');
    }
  };
  $dia.find("textarea").keydown(diaCloseOnKeydownFunc);
  $dia.find("#"+canvasId).keydown(diaCloseOnKeydownFunc);

  var diaRetInNameFieldFunc = function (e) {
    if (e.keyCode === 13 && ! e.shiftKey) {
      $dia.closeFromRet = true;
      $dia.dialog('close');
      eg.stopPropagationPreventDefault(e);
    }
  };
  if (true) {//ryt.info.prefs.fastInputFlag) {
    $dia.find("textarea#name").keydown(diaRetInNameFieldFunc);
  };

  // trying to stop propagation for $dia.parent() or similar has failed.
  /* $dia.parent().keydown(eg.stopPropagationPreventDefault); // avoid flow elem ops (copy/alias/paste)
  *//*
  $(".ui-dialog").first().keydown(function(event){
    eg.log("hier");
    event.stopPropagation();
    event.preventDefault();
    event.cancelBubble = true;
    return false;
    // do something
  });
  */
  if (taskIdOrNil) {
    this.createInputDummy(canvasId);
    r = Raphael(canvasId, dims.x, dims.y).installExtensions();
    r.canvas.canvasId = "sub";
    flowEditorNObservers = this.createFlowEditorNObservers(r, taskIdOrNil);
  }
}; // protoApp.openTaskDialog()
protoApp.openTaskDialog.diaCount = 0;

protoApp.unsavedChangesPropsCheck = function (idOrNil, props, topic, yesCB) {
  if (! idOrNil && ( ( 'name' in props // task
                       && (props.name && props.name !== this.initialTaskName
                           || props.description/* something typed in */)
                     )
                     || ('text' in props // comment
                         && props.text)
                     || ('finished' in props && props.finished !== false)
                     || props.prio !== undefined
                     || props.logic !== undefined
                     || props.subtaskFinishPropagation !== undefined
                   )
      || idOrNil && this.model.elemWouldChangeBy(idOrNil, props)) {
    ryt.confirmDialog({
      topic: topic,
      text: "There are unsaved things. Really close edit dialog?",
      yesButtonText: "Yes", noButtonText: "No",
      yesCallback: yesCB
    });
  } else {
    yesCB();
  }
};
protoApp.busyAlert = function () {
  ryt.info.sounds.mm && ryt.info.sounds.mm.play();
  alert("I'm busy...");
};
protoApp.createElemDialogBeforeCloseFunc = function (dia, diaTitle, idOrNil) {
  var prefix = "Close \'" + diaTitle + "'?";
  var self = this;
  var check = false;
  return function() {
    if (dia.forcedCloseFlag) {
      return true;
    }
    if (self.isBusy()) {
      self.busyAlert();
      return false;
    }
    if (check) {
      return true;
    }
    dia.extractProps();
    if (dia.closeFromOK || dia.closeFromRet) {
      return true;
    }
    self.unsavedChangesPropsCheck(
      idOrNil, dia.props, prefix,
      function(){
        check = true;
        dia.dialog('close'); // really close now
      }
    );
    return false; // don't close before check
  }
};
protoApp.createElemDialogForcedCloseFunc = function (dia) {
  return function() {
    dia.forcedCloseFlag = true;
    dia.dialog('close');
  };
};
protoApp.openCommentDialog = function (argObj, callbackOK, parentId, commentIdOrNil, diaArgObjOrNil) {
  var diaArgObj = diaArgObjOrNil || { };
  var dialogTitle = (argObj && 'Edit Comment') || 'Create Comment';
  var text = (argObj && argObj.text) || "";
  var diaCount = ++this.openCommentDialog.diaCount;
  var $dia = $(
    '<div id="comment-dialog'+diaCount+'" title="'+dialogTitle+'"'
      +'style="overflow:hidden;" '
      +'>'

    //+'<form accept-charset="utf-8">'

      +'<textarea '
      +   'name="text" id="text" rows="10" '
      +   'style="width:100%; height:100%; font-family:Courier;" '
      +'>'
    //+ text
      +'</textarea>'

    //+'</form>'

      +'</div>'
  );
  $dia.find("#text").val(text);
  $dia.closeFromOK = false;
  // avoid creating new task dialogs with dblclick (is there a better way (probably in document ev handler?)?)
  $dia.dblclick(eg.eatThemEventHandler);
  var self = this;
  var mo_CommentDialog = new MO_CommentDialog(this, $dia, parentId, commentIdOrNil);
  this.wireModelObserver(mo_CommentDialog);
  // used by beforeClose()
  $dia.extractProps = function () {
    var textArea = $dia.find("#text");
    $dia.props = { text:textArea.val() };
  };
  var helpText = ''
    +"Basic\n"
    +"-----\n"
    +"A *comment* is the working horse for text input of every kind.\n"
    +"\n"
    +"Its lines are treated differently:\n"
    +"- only its *first* line becomes the directly visible title of comment widget/link, but\n"
    +"- *all* lines become visible by hovering over comment widget/link.\n"
    +"Markup\n"
    +"------\n"
    +"Markup may be used: for more info about please see "
    + ryt.info.rytURL_project("[info]") + "'[info] project' ."
  ;
  $dia.dialog({
    position: diaArgObj.pos ? [diaArgObj.pos.x, diaArgObj.pos.y] : 'center',
    autoOpen: true, modal: false, show: 'scale', hide: 'scale', width: 800,
    open: function(){
      var textArea = $dia.find("#text");
      setTimeout(function() {
        textArea.focus();
      }, 500);
    },
    close: function(event, ui) {
      self.unwireModelObserver(mo_CommentDialog);
      self.unregisterDialog(commentIdOrNil, $dia);
      $dia.closeFromOK || self.logger.info("'"+dialogTitle + "' cancelled.");
      $dia.closeFromOK && callbackOK && callbackOK($dia.props);
    },
    beforeClose: self.createElemDialogBeforeCloseFunc($dia, dialogTitle, commentIdOrNil),
    buttons: { 
      "OK": function() {
        $dia.closeFromOK = true;
        $dia.dialog('close');
      }, 
      "Cancel": function() {
        $dia.dialog('close');
      }, 
      "?": function() {
        ryt.helpDialog(dialogTitle, helpText);
      }
    }
  });
  $dia.forcedClose = self.createElemDialogForcedCloseFunc($dia);
  this.registerDialog(commentIdOrNil, $dia);
//this.openDialogs.add($dia);
  $dia.parent().keydown(eg.stopPropagation); // avoid flow elem ops (copy/alias/paste)
}; // protoApp.openCommentDialog()
protoApp.openCommentDialog.diaCount = 0;

protoApp.blockedCheck = function () {
  var self = this;
  if (self.isBusy()) {
    self.busyAlert();
    return true;
  }
  return false;
};
//TODO: improve parent logic (not only here)
// refac: parentOrNil without nil -> difficult, because we create button before having model...
protoApp.createEntriesForPopupMenu = function (parentOrNil) {
  var self = this;
  var firstPos = eg.Point.xy(25, 50);
  var off = eg.Point.xy(0, 25);
  function moveElementsAndDo(doFunc, data) {
    var parent = parentOrNil || self.model.rootID;
    var elems = self.model.filterElemsWithParent(parent);
    var id2positions = { };
    var parent2Childs = self.model.parent2Childs[parent];
    for (var key in elems) {
      var childPos = parent2Childs[key];
      id2positions[key] = (childPos.x === firstPos.x // only move elems not manually placed
                           ? off.add(childPos) // add() seq matters
                           : childPos);
    }
    if (eg.hasProps(id2positions)) {
      self.model.openBatch("createCreateButton..", "user input");
      self.model.changePositions(id2positions, parent, 'create button');
    }
    doFunc(parent, firstPos, data);
    if (eg.hasProps(id2positions)) {
      self.model.closeBatch("..createCreateButton", "user input");
    }
  };
  var entries = [
    { //key:'task <span style="float:right;">(double-click)</span>',
      key:'task (double-click)',
      val:function() {
        if (self.blockedCheck()) {
          return;
        }
        var parent = parentOrNil || self.model.rootID;
        self.openTaskDialog(
          null, // no task props for dialog so far
          function(data) {
            moveElementsAndDo(function(parent, pos, data) {
              self.model.createTask(
                parent, pos,
                data.name, data.description, data.finished, data.prio,
                data.logic, data.subtaskFinishPropagation,
                'canvas');
            }, data);
          },
          parent)
      }
    },
    { //key:'comment <span style="float:right;">(shift-double-click)</span>',
      key:'comment (shift-double-click)',
      val:function() {
        if (self.blockedCheck()) {
          return;
        }
        var parent = parentOrNil || self.model.rootID;
        self.openCommentDialog(
          null, // no comment props for dialog so far
          function(data) {
            moveElementsAndDo(function(parent, pos, data) {
              self.model.createComment(parent, pos, data.text, 'canvas');
            }, data);
          },
          parent
        );
      }
    }
  ];
  return entries;
};
protoApp.createCreateButton = function (r, pos, parentOrNil) {
  var self = this;
  var createButton = r.eg.createTextButtonAt(pos, "Create..");
  var entries = this.createEntriesForPopupMenu(parentOrNil);
  this.popupMenuForWidget(entries, "create element", createButton);
  return createButton;
};

  protoApp.openElementDialog = function (elementId, parentIdOrNil, diaArgObjOrNil) {
    var self = this;
    var element = this.model.getObject(elementId);
    if (! element) {
      return; // silently ignore removed elements
    }
    this.removeHoverInfos();
    var parentId = parentIdOrNil || this.model.someParent(elementId);
    var modelAtDialogStart = this.model;
    var dialogSel = element.type === 'task'
      ? 'openTaskDialog'
      : (element.type === 'comment'
         ? 'openCommentDialog'
         : null);
    if (dialogSel === null) {
      this.logger.error("unknown element type");
      return;
    }
    var changedElement = this[dialogSel](
      element, // argObj
      function(data) {
        eg.assert(modelAtDialogStart === self.model);// model should be the same
        if (self.model.elemWouldChangeBy(elementId, data)) {
          self.model.change(elementId, data, "userInput");
        }
      },
      parentId,
      elementId,
      diaArgObjOrNil
    );
  };

protoApp.infoFromUID = function (uid) {
  return (uid
          ? (RYT.info.preferInitials
             ? uid
             : this.model.getUserName(uid) + " (" + uid + ")")
          : "??");
};
protoApp.creationNModificationInfoString = function (flowElem, withoutBorderOrNil) {
  var text = "";
  if (flowElem.lastModificationTime) {
    text = ""
      + (flowElem.modificationCount ? flowElem.modificationCount + "." : "last")
      +" modified: " + eg.localDateTimeString(flowElem.lastModificationTime)
      +" by: " + this.infoFromUID(flowElem.lastModifiedBy)
      +", "
    ; // lastModified may not be there
  }
  text += ("created: " + eg.localDateTimeString(flowElem.creationTime)
           + " by: " + this.infoFromUID(flowElem.createdBy));
  if (ryt.info.develMode || ryt.info.prefs.showElementIDsFlag) {
    text += "; id: " + flowElem.id;
  }
  if (withoutBorderOrNil) {
    return text;
  }
  var line = "|----|";
  return line + '\n' + text + "\n" + line;
};
  protoApp.showElementClickHelpStr = "doubleclick for edit";
  protoApp.spanStyleFor = function (elemType) {
   return ''
      +'style="'
      +  'background-color:' + ryt.info.color2HTMLColor(ryt.info.prefs[elemType+'Color']) + '; '
      +  'color:' + ryt.info.color2HTMLColor(ryt.info.prefs[elemType+'FontColor']) + '; '
      +'" ';
  };
  protoApp.elementLinkSpanStr = function (obj, text) {
    return '<span id="' + obj.id + '" '
      +'class="' + obj.type + ' elementLink" '
      + this.spanStyleFor(obj.type)
      + (ryt.info.showDoubleclickForEditHelp()
         ? 'title="' + this.showElementClickHelpStr + '" '
         : '')
      +'>'
      + '\u00A0' + this.aliasChildInfoStr(obj) + eg.str2HTMLBasic(text) + '\u00A0'
      + '</span>';
  };
  protoApp.nameForElementLink = function (obj) {
    return (obj
            ? (obj.type == 'task'
               ? obj.name
               : (obj.type == 'comment'
                  ? this.computeCommentTitle(obj)
                  : obj.type)
              )
            : "unknown element"
           );
  };
  protoApp.elementLinkStrHTML = function (id) {
    var elemObj = this.model.getObject(id);
    if (! elemObj) {
      return "{[rendering error] unknown element: cannot generate link!}";
    }
    var text = this.nameForElementLink(elemObj);
    return this.elementLinkSpanStr(elemObj, text);
  };
  protoApp.subelementLinkStr = function (obj, text) {
    return '@@@' + this.elementLinkSpanStr(obj, text) + '@@@';
  };
  protoApp.elementLinkStr = function (obj, textPre, textInLink, textPost) {
    return '@@@<h3>'
      + eg.str2HTMLBasic(textPre)
      + this.elementLinkSpanStr(obj, textInLink)
      + eg.str2HTMLBasic(textPost)
      + '</h3>@@@';
  };
  protoApp.preTaskNameStr = function (taskObj) {
    return "("
      + ('finished' in taskObj ? (taskObj.finished ? "X" : " ") : "-")
      + ")";
  };
  protoApp.postTaskNameStr = function (taskObj) {
    var res = "";
    if ('prio' in taskObj || 'logic' in taskObj || 'subtaskFinishPropagation' in taskObj) {
      res = "|";
    }
    if (taskObj.prio !== undefined) {
      res += "prio: " + this.prio2str[taskObj.prio] + "|"
    }
    if (taskObj.subtaskFinishPropagation) {
      res += "auto|";
    }
    if (taskObj.logic) {
      res += taskObj.logic + "|";
    }
    return res;
  };
protoApp.taskInfoStrShort = function (taskObj) {
  return ""
    + this.preTaskNameStr(taskObj)
    + this.subelementLinkStr(taskObj, taskObj.name)
    + this.postTaskNameStr(taskObj)
    + this.subelemsInfoStrShort(taskObj);
};
  protoApp.computeCommentTitle = function (commentObj) {
    var firstLine = eg.strAscii2Unicode(eg.firstLine(commentObj.text));
    var hint = " Hint: please give some ordinary text there.";
    var title = firstLine.match(eg.rawTextSplitRE)
      ? "Raw text separator in first comment line!" + hint
      : (firstLine.match(eg.embeddedHTMLSplitRE)
         ? "Embedded HTML separator in first comment line!" + hint
         : firstLine + (commentObj.text.indexOf("\n") !== -1 ? " ..." : "")
        );
    return title;
  };
protoApp.commentInfoStrShort = function (commentObj) {
  return this.subelementLinkStr(commentObj,
                                this.computeCommentTitle(commentObj));
};
protoApp.subelemsInfo = function (taskObj) {
  var childs = this.model.parent2Childs[taskObj.id];
  var elemCount = 0, taskCount = 0, taskHasFinishedCount = 0, taskFinishedCount = 0;
  eg.forEach(childs, function (val, child) {
    var childObj = this.model.getObject(child);
    ++elemCount;
    if (childObj.type === 'task') {
      ++taskCount;
      if (childObj.finished !== undefined) {
        ++taskHasFinishedCount;
        if (childObj.finished) {
          ++taskFinishedCount;
        }
      }
    }
  }, this);
  return  { elemCount:elemCount, taskCount:taskCount,
            taskHasFinishedCount:taskHasFinishedCount,
            taskFinishedCount:taskFinishedCount };
};
protoApp.subelemsInfoStrShort = function (taskObj) {
  var si = this.subelemsInfo(taskObj);
  if (! si.elemCount) {
    return "";
  }
  return "(" + si.taskFinishedCount + "/" + si.taskHasFinishedCount + " finished|" + si.taskCount + " tasks|"
    + (si.elemCount - si.taskCount) + " comments)";
};
protoApp.elemInfoStrShort = function (elemObj) {
  return elemObj.type === 'task'
    ? this.taskInfoStrShort(elemObj)
    : (elemObj.type === 'comment'
       ? this.commentInfoStrShort(elemObj)
       : (elemObj.type === 'root'
          ? "[" + elemObj.name + "]"
          : "??"));
};

  protoApp.relationIndentStr = "\t\t";
  //
  protoApp.h_parentsInfoStr = function (childObj, currParentObj, prefix, showCurrentParentFlag, parentsSortFunc) {
    var self = this;
    var parents = this.model.child2Parents[childObj.id];
    var parentKeys = eg.keys(parents);
    if (parentsSortFunc) {
      parentKeys.sort(parentsSortFunc);
    }
    var currParentId = currParentObj && currParentObj.id;
    var str = "";
    var addedCount = 0;
    function addToStr(parentId) {
      str += (addedCount++ ? "\n" : "")
        + prefix + self.relationIndentStr
        + "@@@&uarr;@@@ " + self.elemInfoStrShort(self.model.getObject(parentId));
    }
    // add curr parent first, if is given and wished
    if (currParentId && showCurrentParentFlag) {
      addToStr(currParentId);
    }
    parentKeys.forEach(function (parent, ix) { // add all others (all, if no currParentObj)
      if (parent !== currParentId) {
        addToStr(parent);
      }
    }, this);
    return addedCount === 1 && showCurrentParentFlag && currParentId === this.model.rootID
      ? ''
      : str;
  }; // h_parentsInfoStr()
  protoApp.parentsInfoStr = function (childObj, currParentObj, prefix,
                                      showCurrentParentFlag) {
    return this.h_parentsInfoStr(childObj, currParentObj, prefix,
                                 showCurrentParentFlag,
                                 this.model.elementSortAfterTimeFunc());
  };
  protoApp.relsInfoStr = function (elemObj, relation, relationName, prefix,
                                   keysSortFunc) {
    var self = this;
    var rels = relation[elemObj.id];
    var relKeys = eg.keys(rels);
    if (keysSortFunc) {
      relKeys.sort(keysSortFunc);
    }
    var str = "";
    var addedCount = 0;
    function addToStr(elementId) {
      str += (addedCount++ ? "\n" : "")
        + prefix + self.relationIndentStr
        + relationName
        + " "
        + self.elemInfoStrShort(self.model.getObject(elementId));
    }
    relKeys.forEach(function (elem) {
      addToStr(elem);
    }, this);
    return str;
  };
  protoApp.predsInfoStr = function (elemObj, prefix) {
    return this.relsInfoStr(elemObj, this.model.toFrom, "<-", prefix,
                            this.model.elementSortAfterTimeFunc());
  };
  protoApp.succsInfoStr = function (elemObj, prefix) {
    return this.relsInfoStr(elemObj, this.model.fromTo, "->", prefix,
                            this.model.elementSortAfterTimeFunc());
  };

protoApp.subelemsInfoStr = function (taskObj) {
  var childs = this.model.parent2Childs[taskObj.id];
  var childObjects = eg.map2arr(childs, function(val, child) {
    return this.model.getObject(child);
  }, this);
  childObjects.sort(this.model.elementObjSortAfterTimeFunc);
  var str = "";
  childObjects.forEach(function(childObj) {
    str += this.relationIndentStr;
    str += "\u2193 ";
    if (childObj.type === 'task') {
      str += this.taskInfoStrShort(childObj);
      var predsInfoStr = this.predsInfoStr(childObj, this.relationIndentStr);
      if (predsInfoStr) {
        str += "\n" + predsInfoStr;
      }
      var succsInfoStr = this.succsInfoStr(childObj, this.relationIndentStr);
      if (succsInfoStr) {
        str += "\n" + succsInfoStr;
      }
      var parentsInfoStr = this.parentsInfoStr(childObj, taskObj, this.relationIndentStr);
      if (parentsInfoStr) {
        str += "\n" + parentsInfoStr;
      }
    } else if (childObj.type === 'comment') {
      str += this.commentInfoStrShort(childObj);
    } else {
      str += "??";
    }
    str += "\n";
  }, this);
  return str;
};

  // for other arrows see http://www.alanwood.net/unicode/arrows.html
  protoApp.aliasChildInfoStr = function (elementObj) {
    return (
      (this.model.aliasCount(elementObj.id) > 1
       ? (this.model.childCount(elementObj.id)
          ? "\u21C8\u2193 " //
          : "\u21C8 ") // upwards paired arrows
       : (this.model.childCount(elementObj.id)
          ? "\u2193 " //
          : "")
      )
    );
    // "\u2191" upwards arrow
    // "\u21D1" upwards double arrow
    // "\u21E7" upwards white arrow
    // "\u21A5 " UPWARDS ARROW from bar
    // "\u21C5 " UPWARDS ARROW LEFTWARDS OF DOWNWARDS ARROW
  };

  protoApp.prio2str = { '-1':"low", '0':"normal", '1':"high" };
  // Goes directly via obj; which is possible, because an obj ptr stays for its lifetime.
  protoApp.elementObjInfoStrCB = function (elementObj, parent) {
    var self = this;
    var fun = function (showCurrentParentFlag) { // this to be bound to elemObj
      var parentsInfoStr =
        self.parentsInfoStr(elementObj,
                            self.model.getObject(parent) || null,
                            "",
                            showCurrentParentFlag);
      var predsInfoStr = self.predsInfoStr(elementObj, "");
      var succsInfoStr = self.succsInfoStr(elementObj, "");
      switch (elementObj.type) {
      case 'task':
        var prioStr = self.postTaskNameStr(elementObj);
        var subelemsStr = self.subelemsInfoStrShort(elementObj);
        return ""
          + self.elementLinkStr(elementObj,
                                self.preTaskNameStr(elementObj),
                                elementObj.name,
                                prioStr + subelemsStr)
          + (predsInfoStr ? predsInfoStr + "\n" : "")
          + (succsInfoStr ? succsInfoStr + "\n" : "")
          + (parentsInfoStr ? parentsInfoStr + "\n" : "")
          + self.creationNModificationInfoString(elementObj)
          + "\n"
          + (elementObj.description ? elementObj.description + "\n|----|\n" : "")
          + self.subelemsInfoStr(elementObj);
        break;
      default:
        return "No info for element with type '" + elementObj.type + "'.";
        break;
      case 'comment':
        return ""
          + self.elementLinkStr(elementObj,
                                "",
                                self.computeCommentTitle(elementObj))
          + (parentsInfoStr ? parentsInfoStr + "\n" : "")
          + self.creationNModificationInfoString(elementObj)
          + '\n'
          + elementObj.text;
        break;
      }
    };
    fun.elementType = elementObj.type;
    fun.elementId = elementObj.id; // attach for later use
    fun.parentId = parent; // attach for later use
    return fun;
  }; // elementObjInfoStrCB()
  protoApp.elementInfoStrCB = function (element, parent) {
    return this.elementObjInfoStrCB(this.model.getObject(element), parent);
  };
  protoApp.elementInfoStr = function (element, parent) {
    return this.elementInfoStrCB(element, parent)();
  };
  protoApp.elementObjInfoStr = function (elementObj, parent) {
    return this.elementObjInfoStrCB(elementObj, parent)();
  };

protoApp.undoPossibleCheck = function () {
  if (this.model.atBegin()) {
    this.logger.warn("undo impossible: already at begin.");
    return false;
  }
  return true;
};
protoApp.redoPossibleCheck = function () {
  if (this.model.atEnd()) {
    this.logger.warn(
      "redo impossible: already at end"
        + (this.model.justAfterSnapshotMarker()
           ? (" (snapshot #" + this.model.numOfCurrentSnapshotMarker() + ")")
           : ""
          )
        + "."
    );
    return false;
  }
  return true;
};

  protoApp.basicNewProject = function () {
    this.deleteModelNFlowEditor();
    this.initModelNFlowEditor();
    ryt.info.setCurrentProject(null);
  };
  protoApp.newProject = function () {
    var prefix = "[new project]";
    if (this.unsavedChangesCheck(prefix)) {
      //this.basicNewProject();
      eg.goto_URL(ryt.info.rytURL_project(null));
    }
  };

  protoApp.tryInitFromData = function (data, projectId, projectProps,
                                       callbackOrNil) {
    try {
      this.initFromData(data);
      projectProps.title = data.title;
      projectProps.loadTime = +new Date();
      ryt.info.setProjectProps( projectId, projectProps );
      ryt.info.setCurrentProject(projectId);
      this.logger.info(
        "Project users: "
          + (this.model.users && eg.hasProps(this.model.users)
             ? eg.JSON.stringify(this.model.users)
             : "none")
          + "."
          + (this.model.lockedBy
             ? "\nModel locked by *" + this.model.lockedBy + "*!"
             : "")
      );
      callbackOrNil && callbackOrNil();
    } catch (e) {
      if (eg.isString(e)) { // string for error handling Exceptions
        this.logger.error(e);
      } else { // don't know what has happened
        this.logger.unexpectedError("tryInitFromData()\n" + e);
      }
    }
  }; // tryInitFromData()


  // load/save
  //

  // compatibility queries
  function getMarkerIdsOfData(d) {
    return d.versionMinor <= 1
      ? d.snapshotMarkers // <= 1.1
      : d.objectStore.markers.map(function(mObj, ix) { // >= 1.2
        return mObj.id;
      });
  };
  function isEqualProjectMarkers(markers_1, markers_2) {
    // if both are ending with same snapshot marker, they are equal
    var len_1 = markers_1.length;
    var len_2 = markers_2.length;
    return len_1 === len_2
      && (markers_1[len_1 - 1] === markers_2[len_1 - 1]);
  }
  function isEqualProjectData(d1, d2) {
    if (! eg.isEqualModelVersion(d1, d2)) {
      return false;
    }
    return isEqualProjectMarkers(getMarkerIdsOfData(d1),
                                 getMarkerIdsOfData(d2));
  }
  function isSubsetProjectMarkers(markers_1, markers_2) {
    // if d2 markers start with all of d1 ones and if d2 has more markers,
    // then d1 is a subset of d2
    var len_1 = markers_1.length;
    var len_2 = markers_2.length;
    if (len_1 >= len_2) {
      return false;
    }
    for (i = 0; i < len_1; ++i) {
      if (markers_1[i] !== markers_2[i]) {
        return false;
      }
    }
    return true;
  }
  function isSubsetProjectData(d1, d2) {
    if (! eg.isLessEqualModelVersion(d1, d2)) {
      return false;
    }
    return isSubsetProjectMarkers(getMarkerIdsOfData(d1),
                                  getMarkerIdsOfData(d2));
  }
  function isUpgradeOf(pd1, pd2) {
    return isSubsetProjectData(pd2, pd1);
  }

  function isPublicDataIdent(ident) {
    return ident.charAt(0) == '[';
  }

  protoApp.createCredentials = function (ident, forSaveFlag, forDeleteFlag) {
    var credentials = { };
    if (ident && isPublicDataIdent(ident)) { // don't use (data) key
      if (forSaveFlag || forDeleteFlag) { // need pw, only to be changed by admins
        if (! ryt.info.prefs.adminModeFlag) {
          this.logger.problem(
            "Project '" + ident + "' only to be "
              + (forSaveFlag ? "saved" : "deleted")
              + " by admin"
              + (forSaveFlag ? ": please saveAs under another name (without '[]')." : ".")
          );
          return null;
        }
        credentials.pw =
          prompt("Save public file, admin password needed:"
                 ,""); // no default pw ;-)
      }
    } else { // normal project load, save and listing needs key
      var postErrStr = " for private project load/save/listing.";
      if (ryt.info.dataKey) {
        var keyRegEx = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
        if (keyRegEx.test(ryt.info.dataKey)) {
          credentials.key = ryt.info.dataKey;
        } else { // error
          this.logger.error("Key ill formed" + postErrStr);
          return null;
        }
      } else { // error
        this.logger.error("Key missing" + postErrStr);
        return null;
      }
    }
    return credentials;
  }
  protoApp.createOrSetEncryptionKey = function(cbOK, cbFail, createIfMissingFlag) {
    var self = this;
    var encryption = ryt.info.encryption;
    ryt.openKeyDialog(encryption.key, function(key) {
      var keyLen = 44;
      if (key.length !== keyLen) {
        alert("Invalid key! Input ignored.");
        cbFail && cbFail();
        return;
      }
      if (encryption.key !== key) {
        self.logger.info("Encryption key "
                         + (encryption.key ? "changed" : "set")
                         + ":\n" + key);
        encryption.key = key;
        ryt.info.addKeyProps({ encryption: encryption });
      } else {
        self.logger.info("Encryption key unchanged:\n" + key);
      }
      cbOK && cbOK();
    }, createIfMissingFlag);
  }
  protoApp.basicLoadProject = function (id, prefix, // expects well formed id
                                        callbackOrNil) {
    eg.assert(id);
    var self = this;
    prefix = prefix || "[basic project load] ";

    // encryption
    if (ryt.info.encrypted && ! ryt.info.encryption.key) {
      this.createOrSetEncryptionKey(
        function() { self.basicLoadProject(id, prefix, callbackOrNil); },
        function() { self.logger.error(prefix + "Encryption key missing!"); }
        // do not create missing key: there has to be an older one to be used for *de*cryption
      );
      return; // callback calls again
    }

    var projectProps = {};

    if (ryt.info.hasLocalProjectData(id)) {
      var oldProps = ryt.info.getProjectProps(id);
      var now = +new Date();
      var distInSeconds = 30;
      if (oldProps.saveTime
          && (now - oldProps.saveTime) < distInSeconds * 1000) {
        var localData = ryt.info.projectImportLocally(id);
        this.logger.success(
          prefix + "Loaded locally (*without* bothering server), because it has just been saved (<" + distInSeconds + "s ago)."
        );
        projectProps.loadType = 'localJustAfterSave';
        self.tryInitFromData(localData, id, projectProps,
                             callbackOrNil);
        return;
      }
    }

    var infoNotice = this.logger.info(prefix + "Load *" + id + "* from server ...");
    function successCB(serverData) {
      self.spinnerOff();
      projectProps.serverContact = 'success';
      projectProps.atServer = !!serverData;
      var invalidServerData = serverData === undefined;
      var dataToBeUsed = null;
      if (! ryt.info.hasLocalProjectData(id)) {
        if (! serverData) {
          projectProps.loadType = invalidServerData
            ? 'invalidServerCreateNew'
            : 'unknownProjectCreateNew';
          self.basicNewProject();
          self.logger.warn(prefix + "... there is "
                           + (invalidServerData ? "invalid" : "no")
                           + " server and no local data for *"
                           + id + "*: new project created.");
          ryt.info.setProjectProps(id, projectProps);
          ryt.info.setCurrentProject(id);
          return;
        } else { // serverData exists
          dataToBeUsed = serverData;
          projectProps.loadType = 'server';
          var localCacheOK = ryt.info.projectExportLocally(id, dataToBeUsed);
          self.logger.success(
            "... *" + id + "* loaded from server"
              + (localCacheOK ? " (cached locally for offline use...)" : "")
              +".");
        }
      } else { // project seen before
        var str = prefix + "... there already is local data:"
          + "\n-> comparing it with loaded from server one ...";
        if (self.logger.isLastNotice(infoNotice)) {
          self.logger.append("\n" + str);
        } else {
          self.logger.info(str);
        }
        // compare local and server data
        var localData = ryt.info.projectImportLocally(id);
        if (! serverData) {
          projectProps.loadType = invalidServerData
            ? 'invalidServerUseLocal'
            : 'noServerUseLocal';
          dataToBeUsed = localData;
          self.logger.warn(prefix + "... there is "
                           + (invalidServerData ? "invalid" : "no")
                           + " server data for *"
                           + id + "*:\n-> using local data instead.");
        } else if (isEqualProjectData(localData, serverData)) {
          projectProps.loadType = 'inSync';
          dataToBeUsed = localData; // perfectly in sync
          self.logger.success(prefix + "... local and server data are perfectly in sync.");
        } else if (isUpgradeOf(serverData, localData)) {
          projectProps.loadType = 'upgradeFromServer';
          dataToBeUsed = serverData;
          ryt.info.projectExportLocally(id, dataToBeUsed); // as logger has told
          self.logger.success(prefix + "... server data has upgraded local data.");
        } else if (isUpgradeOf(localData, serverData)) {
          projectProps.loadType = 'useNewerLocal';
          dataToBeUsed = localData; // but should be POSTed to server
          self.logger.warn(prefix + "... local data is newer than server data:"
                      + "\n-> using local data (leaving server data unchanged).");
        } else {
          self.logger.problem(prefix + "... there is a conflict between server and local data: "
                         + "don't know which to use!"
                         + "\n-> Asking user ...");
          ryt.decisionDialog({
            topic:"[project load] Conflict: overwrite local with server data?",
            text:"There is a conflict between server and local data of *" + id +"* : overwrite local with server data?\nNote: <save as> could be used in advance for saving local data as a copy with another project ID (for not conflicting with current server data).",
            noButtonText:"No, use local data (not affecting server data)",
            noCallback: function(){
              projectProps.loadType = 'conflictUseLocal';
              dataToBeUsed = localData;
              self.logger.info(prefix + "... use local data (ignore server data).");
              self.tryInitFromData(dataToBeUsed, id, projectProps,
                                   callbackOrNil);
            },
            yesButtonText:"Yes, use server data (overwriting local data)",
            yesCallback: function(){
              projectProps.loadType = 'conflictUseServer';
              dataToBeUsed = serverData;
              ryt.info.projectExportLocally(id, dataToBeUsed); // as logger has told
              self.logger.warn(prefix + "... server data has overwritten local data.");
              self.tryInitFromData(dataToBeUsed, id, projectProps,
                                   callbackOrNil);
            },
            cancelButtonText:"Cancel (use no data at all)",
            cancelCallback: function(){
              projectProps.loadType = 'conflictUseNone';
              self.logger.info(prefix + "... use no data (new project).");
              ryt.info.setProjectProps(id, projectProps);
              self.restartWithProject(null, false); // true for redirect
            },
            noFirst: true
          });
        }
      }
      if (! dataToBeUsed) {
          return; // callback by dialog above
      }
      self.tryInitFromData(dataToBeUsed, id, projectProps,
                           callbackOrNil);
    } // successCB()
    function failCB() {
      self.spinnerOff();
      projectProps.serverContact = 'failure';
      if (ryt.info.hasLocalProjectData(id)) {
        projectProps.loadType = 'serverFailedUseLocal';
        self.logger.warn(prefix + "... load from server failed!\nIs your host online?\nFallback to locally stored data.");
        var localData = ryt.info.projectImportLocally(id);
        self.tryInitFromData(localData, id, projectProps,
                             callbackOrNil);
      } else {
        projectProps.loadType = 'serverFailedNoLocal';
        self.logger.error(prefix + "... load from server failed!\nIs your host online?\nNo locally cached data.");
        ryt.info.setProjectProps(id, projectProps);
      }
    } // failCB()
    var credentials = this.createCredentials(id, false);
    if (! credentials) { // error
      return;
    }
    self.spinnerOn(true);
    ryt.importData(id, credentials, successCB, failCB);
  }; // basicLoadProject()

  function setProjectPropsNCallBackIfSaved(id, projectProps, callbackOrNil) {
    ryt.info.setProjectProps( id, projectProps );
    if (projectProps.saveType) {
      callbackOrNil && callbackOrNil();
    } else {
      ryt.app.logger.error("Save failed!");
    }
  }
  // Precondition of the logics below: if there is no file at server, there will be created an
  // empty one. Return string is "", which will be converted to null.
  protoApp.basicSaveProject = function (id, prefix, saveCBOrNil) { // expects well formed ident
    var self = this;
    prefix = prefix || "[basic project save] ";
    // encryption
    if (ryt.info.encrypted && ! ryt.info.encryption.key) {
      this.createOrSetEncryptionKey(
        function() { self.basicSaveProject(id, prefix, saveCBOrNil); },
        function() { self.logger.error(prefix + "Encryption key missing!"); },
        true // create new key, probably it's first save
      );
      return; // callback calls again
    }
    eg.assert(id);
    var credentials = this.createCredentials(id, true);
    if (! credentials // error
        || isPublicDataIdent(id) && ! credentials.pw ) { // no pw given 
      return;
    }
    this.model.storeUndone();
    this.model.addSnapshotMarker('GUI');
    var toBeStoredObj = this.model.asData();
    var projectProps = { title: this.model.title, saveTime: +new Date() };
    if (ryt.info.projectExportLocally(id, toBeStoredObj)) {
      this.logger.info(prefix + "Project *" + id + "* locally saved. Try save to server ...");
      projectProps.saveType = 'local';
    } else {
      this.logger.info(prefix + "Project *" + id + "* *not* locally saved. Try save to server ...");
    }
    function failImportCB() {
      self.spinnerOff();
      self.logger.warn(prefix + "... access to server failed!\nIs your host online?"
                       + (projectProps.saveType === 'local' ? "\nSaved locally only." : ""));
      setProjectPropsNCallBackIfSaved(id, projectProps, saveCBOrNil);
    }
    function failExportCB() {
      self.spinnerOff();
      self.logger.warn(prefix + "... export to server failed!\nSaved locally only.");
      setProjectPropsNCallBackIfSaved(id, projectProps, saveCBOrNil);
    }
    function successCB(serverData) {
      self.spinnerOff();
      projectProps.serverContact = 'success';
      projectProps.atServer = !!serverData;
      if (serverData === null) {
        self.logger.info(prefix + "... there is no server data ...");
        self.spinnerOn(false);
        ryt.exportData(id, toBeStoredObj, credentials, function(){ // success callback
          self.spinnerOff();
          projectProps.saveType = 'serverCreate';
          self.logger.success(prefix + "... local data of *" + id + "* creates server data.");
          setProjectPropsNCallBackIfSaved(id, projectProps, saveCBOrNil);
        }, failExportCB); // fail callback
        return;
      }
      if (serverData === undefined) { // special case JSON parse ex
        self.logger.warn(prefix + "... there is invalid server data: this should not happen!\n"
                         + "Anyway: let's overwrite it (could only make things better) ...");
        self.spinnerOn(false);
        ryt.exportData(id, toBeStoredObj, credentials, function(){ // success callback
          self.spinnerOff();
          projectProps.saveType = 'overwriteInvalidServer';
          self.logger.success(prefix + "... local data of *" + id + "* has overwritten - invalid - server data.");
          setProjectPropsNCallBackIfSaved(id, projectProps, saveCBOrNil);
        }, failExportCB); // fail callback
        return;
      }
      self.logger.info(prefix + "... there is server data:"
                  + "\n-> comparing it with local one ...");
      if (isUpgradeOf(toBeStoredObj, serverData)) {
        self.spinnerOn(false);
        self.logger.info(prefix + "... local data of *" + id + "* upgrades server data, contacting server ...");
        ryt.exportData(id, toBeStoredObj, credentials, function(){ // success callback
          self.spinnerOff();
          projectProps.saveType = 'serverUpgrade';
          self.logger.success(prefix + "... local data of *" + id + "* has upgraded server data.");
          setProjectPropsNCallBackIfSaved(id, projectProps, saveCBOrNil);
        }, failExportCB); // fail callback
      } else if (isUpgradeOf(serverData, toBeStoredObj)) {
        eg.assert(false, "cannot be reached, because of generated snapshot marker");
      } else { // conflict with server version
        self.logger.problem(prefix + "... there is conflict between server and local data:"
                       + "\n-> saved locally;"
                       + " asking user for overwriting server data ...");
        var overwrite = confirm(prefix + "There is a conflict between server and local data:\nOverwrite server data?");
        if (overwrite) {
          self.spinnerOn(false);
          ryt.exportData(id, toBeStoredObj, credentials, function(){ // success callback
            self.spinnerOff();
            projectProps.saveType = 'conflictOverwriteServer';
            self.logger.warn(prefix + "... local data of *"
                             + id
                             + "* has overwritten server data!");
            setProjectPropsNCallBackIfSaved(id, projectProps, saveCBOrNil);
          }, failExportCB); // fail callback
        } else {
          projectProps.saveType = 'conflictLocal';
          self.logger.warn(prefix + "... no save to server.");
          // saveCB() call due to local save
          setProjectPropsNCallBackIfSaved(id, projectProps, saveCBOrNil);
        }
      }
    } // successCB()
    // imports server data for comparison with local one
    self.spinnerOn(true);
    ryt.importData(id, credentials, successCB, failImportCB);
  }; // basicSaveProject()

  protoApp.loadProjectByURL = function (ident, prefix) {
    if (! this.unsavedChangesCheck(prefix)) {
      return;
    }
    eg.goto_URL(ryt.info.rytURL_project(ident));
  };
  protoApp.restartWithProject = function (projectId, redirectFlag) {
    var self = this;
    this.forcedBusy = true;
    this.logger.info("Restarting RYT in 10 seconds (for changing project ID in URL)...");
    setTimeout(function(){
      self.forcedBusy = false;
      if (redirectFlag) {
        eg.redirect_URL(ryt.info.rytURL_project(projectId));
      } else {
        eg.goto_URL(ryt.info.rytURL_project(projectId));
      }
    }, 10000); // give user a chance reading logger messages
  };
  protoApp.saveOrLoadProject = function (identOrNil, saveFlagOrNil) {
    var self = this;
    var saveFlag = saveFlagOrNil;
    if (saveFlag) {
      if (this.model.lockedBy && this.model.lockedBy !== this.model.getUserID()) {
        ryt.warnDialog(
          { topic: "Project Lock",
            text: ("Project has been locked by " + this.model.lockedBy
                   + ": cannot save before unlock.\n"
                   + "Hint: unlock followed by saveAs could be a good idea."
                  ),
            yesButtonText: "OK" }
        );
        return;
      }
    }
    var prefix;
    if (identOrNil) {
      if (saveFlag) {
        prefix = "[project save] ";
        this.basicSaveProject(identOrNil, prefix, function() {
          self.handleDirtyness(false);
        });
      } else {
        prefix = "[project load] ";
        //this.basicLoadProject(identOrNil, prefix);
        this.loadProjectByURL(identOrNil, prefix);
      }
      return;
    }
    var projectList = eg.map2arr(ryt.info.projectProps, function(val, id) {
      return { id:id, title:val.title || "", setTime:val.setTime };
    }).sort(function(o1, o2) {
      return o1.setTime < o2.setTime; // younger before older
    });
    //eg.log(projectList);
    var argObj =
      { id: ryt.info.currentProjectId,
        lastProjects: projectList,
        saveFlag:saveFlag };
    if (saveFlag) {
      prefix = "[project saveAs] ";
      argObj.title = this.model.title;
    } else {
      prefix = "[project load] ";
    }
    ryt.openProjectSaveAsOrLoadDialog(
      argObj,
      function(resultObj) {
        //eg.log(resultObj);
        if (! resultObj.id) {
          self.logger.warn(prefix + "Invalid project identifier.");
          return;
        }
        if (saveFlag) {
          if (ryt.info.containsProjectProps(resultObj.id)) {
            var check = confirm(prefix + "There already is a project "
                                + resultObj.id +": overwrite it?");
            if (! check) {
              return;
            }
          }
          if (resultObj.title) {
            self.model.title = resultObj.title;
          }
          self.basicSaveProject(resultObj.id, prefix, function() {
            self.restartWithProject(resultObj.id);
          });
        } else { // load
          self.loadProjectByURL(resultObj.id, prefix);
          //self.basicLoadProject(resultObj.id, prefix);
        }
      }
    );
  } // saveOrLoadProject()

  protoApp.loadProject = function (identOrNil) { // expects well formed ident or nil
    this.saveOrLoadProject(identOrNil, false/* load */);
  }; // loadProject()

  protoApp.openUserInfoDialogNeedValidInput = function(
    noValidInputErrStr, topic, successCB, failureCB
  ) {
    var self = this;
    var cb = function(data) {
      if (! (data && data.id)) {
        self.logger.problem(noValidInputErrStr, topic);
        failureCB && failureCB();
        return;
      }
      ryt.info.setLocally('user', data);
      self.greetingsAnimation();
      successCB(data);
    }
    ryt.openUserInfoDialog(
      ryt.info.user, // may be undefined
      cb, cb // OK CB same as cancel CB
    );
  };
  protoApp.saveProject = function (identOrNil) { // expects well formed ident or nil
    this.saveOrLoadProject(identOrNil, true/*save*/);
  }; // saveProject()

  protoApp.lockProject = function () {
    var self = this;
    var lockWithUserIDFun = function () {
      if (! self.model.lockedBy) {
        self.model.lockedBy = ryt.info.user.id;
        self.logger.info("Model locked by *" + ryt.info.user.id + "*.");
        self.handleDirtyness(true);
      } else {
        if (self.model.lockedBy === ryt.info.user.id) {
          self.logger.warn("Nothing to do: model already locked by *"
                           + ryt.info.user.id + "*.");
        } else {
          ryt.confirmDialog({
            topic: "Project Lock",
            text: "Project locked by user *" + self.model.lockedBy + "*."
              + "Transfer lock to you?",
            yesButtonText: "Yes", noButtonText: "No",
            yesCallback: function() {
              self.model.lockedBy = ryt.info.user.id;
              self.handleDirtyness(true);
              self.logger.info("Model locked by *" + ryt.info.user.id + "*.");
            },
            noCallback: function() {
              self.logger.info("Model lock transfer cancelled.");
            }
          });
        }
      }
    };
    if (! ryt.info.user) {
      this.openUserInfoDialogNeedValidInput(
        "Invalid userID: cannot lock project!", "Lock Project",
        lockWithUserIDFun // success callback
      );
      return;
    }
    lockWithUserIDFun();
  };
  protoApp.unlockProject = function () {
    if (! this.model.lockedBy) {
      this.logger.warn("Nothing to do: model already unlocked.");
      return;
    }
    this.model.lockedBy = null;
    this.handleDirtyness(true);
    this.logger.info("Model unlocked.");
  };
  protoApp.lockSwitchProject = function () {
    if (this.model.lockedBy) {
      this.unlockProject();
    } else {
      this.lockProject();
    }
  };

protoApp.createMainButtons = function () {
  var r = this.r;
  var self = this;
  var gap = eg.Point.xy(20,0);
  var lastPos = eg.Point.xy(0, 1); // for getting upper lines with rounded corners
  if (ryt.info.inBeginnerMode()) {
    var createButton = this.createCreateButton(r, lastPos, null);
    lastPos = createButton.topRight();
  }

  // undo/redo buttons
  //
  function performPermanent(actionFNStr, stateStr, stopPred) {
    eg.repeatWithTimeout(function() { // doPred
      return self.naviState === stateStr;
    }, function() { // busyPred
      return self.isBusy();
    }, function() { // action
      self.model[actionFNStr]("GUI_performPermanent");
    }, function() { // againPred
      if (stopPred()) {
        self.naviState = null;
        return false;
      } else {
        return true;
      }
    }, self.timeouts);
  }
  function undoPermanent() {
    performPermanent('undo', undoPermanent.state, eg.bindThis(self.model.atBegin, self.model));
  }
  undoPermanent.state = 'undoPermanent'; //YODO: check if state is different for multiple apps
  function navigateAction(checkFunc, naviFunc) {
    if (! checkFunc()) {
      return;
    }
    this.naviState = naviFunc.state;
    naviFunc();
  };
  function navigateButtonAction(app, checkFunc, naviFunc) {
    return eg.bindThisNArgs(navigateAction, app, checkFunc, naviFunc);
  }
  var undoPermanentB
    = r.eg.createTextButtonAt(lastPos.add(gap),
                              "<<");
  undoPermanentB.click(navigateButtonAction(
    this,
    eg.bindThis(this.undoPossibleCheck, this),
    undoPermanent));

  function undoToSnapshot() {
    performPermanent('undo', undoToSnapshot.state, function() { // stop pred
      return self.model.justAfterSnapshotMarker() || self.model.atBegin();
    });
  }
  function redoToSnapshot() {
    performPermanent('redo', redoToSnapshot.state, function() { // stop pred
      return self.model.justAfterSnapshotMarker() || self.model.atEnd();
    });
  }
  function undo() {
    performPermanent('undo', undo.state, eg.returnTrueFunc); // returnTrueFunc for ..
  }
  function redo() {
    performPermanent('redo', redo.state, eg.returnTrueFunc); // .. stopping immediately.
  }
  function redoPermanent() {
    performPermanent('redo', redoPermanent.state, eg.bindThis(self.model.atEnd, self.model));
  }
  undoToSnapshot.state = 'undoToSnapshot';
  redoToSnapshot.state = 'redoToSnapshot';
  undo.state = 'undo';
  redo.state = 'redo';
  redoPermanent.state = 'redoPermanent';

  var undoToSnapshotB = r.eg.createTextButtonAt(undoPermanentB.topRight(), "|<<");
  undoToSnapshotB.click(navigateButtonAction(
    this,
    eg.bindThis(this.undoPossibleCheck, this),
    undoToSnapshot));
  var undoButton = r.eg.createTextButtonAt(undoToSnapshotB.topRight(), "undo");
  undoButton.click(navigateButtonAction(
    this,
    eg.bindThis(this.undoPossibleCheck, this),
    undo));
  var stopButton = r.eg.createTextButtonAt(undoButton.topRight(), "stop");
  stopButton.click(function() {
    //eg.log("stopButton pressed");
    self.naviState = null;
  });
  var redoButton = r.eg.createTextButtonAt(stopButton.topRight(), "redo");
  redoButton.click(navigateButtonAction(
    this,
    eg.bindThis(this.redoPossibleCheck, this),
    redo));
  var redoToSnapshotB = r.eg.createTextButtonAt(redoButton.topRight(), ">>|");
  redoToSnapshotB.click(navigateButtonAction(
    this,
    eg.bindThis(this.redoPossibleCheck, this),
    redoToSnapshot));
  var redoPermanentB = r.eg.createTextButtonAt(redoToSnapshotB.topRight(), ">>");
  redoPermanentB.click(navigateButtonAction(
    this,
    eg.bindThis(this.redoPossibleCheck, this),
    redoPermanent));

  undoButton.dblclick(eg.eatThemEventHandler);
  redoButton.dblclick(eg.eatThemEventHandler);
  undoPermanentB.dblclick(eg.eatThemEventHandler);
  redoPermanentB.dblclick(eg.eatThemEventHandler);
  undoToSnapshotB.dblclick(eg.eatThemEventHandler);
  redoToSnapshotB.dblclick(eg.eatThemEventHandler);

  this.titleForWidget("undo one step", undoButton);
  this.titleForWidget("redo one step", redoButton);
  this.titleForWidget("permanent undo until begin", undoPermanentB);
  this.titleForWidget("permanent redo until end", redoPermanentB);
  this.titleForWidget("permanent undo until snapshot", undoToSnapshotB);
  this.titleForWidget("permanent redo until snapshot", redoToSnapshotB);
  this.titleForWidget("stop permanent undo/redo", stopButton);

  var
  verySlowRB_on = r.eg.createTextButton("very slow", {"fill":"red", "stroke":"red"}),
  verySlowRB_off = r.eg.createTextButton("very slow"),
  verySlowRB = r.eg.createOnOffButtonFrom(verySlowRB_off, verySlowRB_on, true),

  slowRB_on = r.eg.createTextButton("slow", {"fill":"red", "stroke":"red"}),
  slowRB_off = r.eg.createTextButton("slow"),
  slowRB = r.eg.createOnOffButtonFrom(slowRB_off, slowRB_on, true),

  mediumRB_on = r.eg.createTextButton("medium", {"fill":"red", "stroke":"red"}),
  mediumRB_off = r.eg.createTextButton("medium"),
  mediumRB = r.eg.createOnOffButtonFrom(mediumRB_off, mediumRB_on, true),

  fastRB_on = r.eg.createTextButton("fast", {"fill":"red", "stroke":"red"}),
  fastRB_off = r.eg.createTextButton("fast"),
  fastRB = r.eg.createOnOffButtonFrom(fastRB_off, fastRB_on, true),

  veryFastRB_on = r.eg.createTextButton("very fast", {"fill":"red", "stroke":"red"}),
  veryFastRB_off = r.eg.createTextButton("very fast"),
  veryFastRB = r.eg.createOnOffButtonFrom(veryFastRB_off, veryFastRB_on, true),

  asFastAsPossibleRB_on = r.eg.createTextButton("max speed", {"fill":"red", "stroke":"red"}),
  asFastAsPossibleRB_off = r.eg.createTextButton("max speed"),
  asFastAsPossibleRB = r.eg.createOnOffButtonFrom(asFastAsPossibleRB_off, asFastAsPossibleRB_on, true);

  slowRB.moveToP(verySlowRB.topRight());
  mediumRB.moveToP(slowRB.topRight());
  fastRB.moveToP(mediumRB.topRight());
  veryFastRB.moveToP(fastRB.topRight());
  asFastAsPossibleRB.moveToP(veryFastRB.topRight());

  var
  speedButtons = [ verySlowRB, slowRB, mediumRB, fastRB, veryFastRB, asFastAsPossibleRB ],
  speedButtonsWidget = r.eg.createRadioButtons(speedButtons, 2); // mediumRB on

  speedButtonsWidget.moveToP(redoPermanentB.topRight().add(gap));
  speedButtonsWidget.click(eg.bindAsEventListener((function() {
    //eg.log(this.state);
    switch (this.state) {
    case 0: self.setAnimationTime(4000);
      break;
    case 1: self.setAnimationTime(2000);
      break;
    case 2: self.setAnimationTime(1000);
      break;
    case 3: self.setAnimationTime(400);
      break;
    case 4: self.setAnimationTime(200);
      break;
    case 5: self.setAnimationTime(0);
      break;
    default: eg.assert(false, "should not be reached");
      break;
    }
  }), speedButtonsWidget));

  var movementInfoStr = "speed of element movement";
  speedButtons.forEach(function(b) {
    this.titleForWidget(movementInfoStr, b);
  }, this);

  var newB = r.eg.createTextButtonAt(speedButtonsWidget.topRight().add(gap), "new");
  newB.click(this.addBlockedCheck(function(){ self.newProject(); }));
  this.titleForWidget("new project", newB);

  var loadB = r.eg.createTextButtonAt(newB.topRight().add(gap), "load");
  loadB.click(this.addBlockedCheck(function(e){ self.loadProject(); }));
  this.titleForWidget("load project", loadB);

  var saveB = r.eg.createTextButtonAt(loadB.topRight(), "save");
  saveB.click(this.addBlockedCheck(function(e){ self.saveProject(ryt.info.currentProjectId); }));
  this.titleForWidget("save project", saveB);

  var saveAsB = r.eg.createTextButtonAt(saveB.topRight(), "saveAs");
  saveAsB.click(this.addBlockedCheck(function(e){ self.saveProject(); }));
  this.titleForWidget("save project as", saveAsB);

  this.mainButtons = { /*
             createButton:createButton,
             undoPermanentB:undoPermanentB,
             undoToSnapshotB:undoToSnapshotB,
             undoButton:undoButton,
             stopButton:stopButton,
             redoButton:redoButton,
             redoToSnapshotB:redoToSnapshotB,
             redoPermanentB:redoPermanentB,
           */
    speedButtonsWidget:speedButtonsWidget,
    newB:newB,
    loadB:loadB,
    saveB:saveB,
    saveAsB:saveAsB
  };
}; // protoApp.createMainButtons()
protoApp.titleForWidget = function (title, widget) {
  var widgetRect = widget.egRect();
  var widgetExtent = widgetRect.extent();
  var divStr = ''
    +'<div id="titleDiv_'+ ++protoApp.titleForWidget.count + '" '
    +  'title="'+title+'" '
    +  'class="tooltip" '
    +  'style="position:absolute; z-index:6000;'// visibility:hidden;'
    +  'top:'+widgetRect.top()+'px; left:'+widgetRect.left()+'px; '
    +  'width:'+widgetExtent.x+'px; height:'+widgetExtent.y+'px" '
    +'>'
    +'</div>';
  var divElem = $(divStr);
  // copy widget events to div
  var events = widget.getREvents();
  events.forEach(function(val) {
    divElem[val.name](val.f);
  });
  divElem.appendTo($("body"));
  return divElem;
};
protoApp.titleForWidget.count = 0;
protoApp.popupMenuForWidget = function (entries, title, widget) {
  var widgetRect = widget.egRect();
  var widgetExtent = widgetRect.extent();
  var divStr = ''
    +'<div'
    + ' id="menuDiv_'+ protoApp.popupMenuForWidget.count++ + '"'
    + (title ? ' title="'+title+'"' : '')
    + ' style="position:absolute; z-index:900;'
    + ' top:'+widgetRect.top()+'px; left:'+widgetRect.left()+'px;'
    + ' width:'+widgetExtent.x+'px; height:'+widgetExtent.y+'px">'
    +'</div>';
  var divElem = $(divStr);
  divElem.appendTo($("body"));
  divElem.dblclick(function(e){
    //eg.log("e:",e);
    eg.stopPropagationPreventDefault(e); // don't reach canvas with dblclick
  });
  ryt.popupMenu(entries, divElem);
};
protoApp.popupMenuForWidget.count = 0;

protoApp.popupMenuForFlowEditor = function (flowEditor, flowId) {
  var entries = [
    { key:"select all (ctrl-a)", val: function() {
      flowEditor.selectAll();
    } },
    { key:"copy (ctrl-c)", val: function() {
      flowEditor.sendCopyEvent();
    } },
    { key:"cut (ctrl-x)", val: function() {
      flowEditor.deleteOrCut(true); // cutFlag
    } },
    { key:"paste (ctrl-v)", val: function() {
      flowEditor.sendPasteEvent();
    } },
    { key:"alias (ctrl-shift-V)", val: function() {
      flowEditor.sendAliasEvent();
    } },
    { /* sep */ },
    { key:"transfer between projects", val: [
      { key:"copy'n'export (ctrl-alt-c)", val: function() {
        flowEditor.sendExportEvent();
      } },
      { key:"import'n'paste (ctrl-alt-v)", val: function() {
        flowEditor.sendImportEvent();
      } }
    ] }
  ];
  if (flowId === this.model.rootID) {
    entries.push(
      //{ /* sep */ },
      { key:"set undo/redo window positions (for new ones)", val: [
        { key:"flow win to here (menu top left)", val: function(e, context) {
          //eg.log(e, context);
          //eg.log('ryt.info.contextMenuOpenClickPos', ryt.info.contextMenuOpenClickPos);
          ryt.info.undoRedo.openFlowWinPosition = ryt.info.contextMenuOpenClickPos;
        } },
        { key:"diff win to here (menu top left)", val: function() {
          ryt.info.undoRedo.openDiffWinPosition = ryt.info.contextMenuOpenClickPos;
        } },
        { key:"default for both", val: function() {
          ryt.info.undoRedo.openFlowWinPosition = ryt.info.undoRedo.default_openFlowWinPosition;
          ryt.info.undoRedo.openDiffWinPosition = ryt.info.undoRedo.default_openDiffWinPosition;
        } }
      ] }
    );
  }
  if (ryt.info.inBeginnerMode()) {
    entries.push(
      { /* sep */ },
      { key:"create", val: this.createEntriesForPopupMenu(flowId) }
    );
  }
  var menuID = ryt.popupMenu(entries, $(flowEditor.canvas), true);
  flowEditor.contextMenuID = menuID;
};
protoApp.createActionButtons = function () {
  var self = this;
  var r = this.r;
  var gap = eg.Point.xy(20,0);
  var lastPos = this.mainButtons.saveAsB.topRight();

  // action buttons
  var condenseButt = r.eg.createTextButtonAt(lastPos.add(gap), "Condense..");
  var condenseBeforeSnapshotMarkersFunc = this.addBlockedCheck(function() {
    if (! ryt.info.inBeginnerMode()
        || confirm("[Condense] This condenses undo/redo history before snapshot markers and after last one.\nReally continue?")) {
      var oldLen = self.model.len_actionS();
      self.model.condenseBetweenSnapshotMarkers();
      var newLen = self.model.len_actionS();
      if (newLen < oldLen) {
        self.logger.success(
          "Project condensed: from " + oldLen + " to " + newLen
            +" actions and markers."
//            +"(to one action - or zero for no actions - before "
//            +"each snapshot marker and after last one).");
        );
      } else {
        self.logger.warn(
          "Nothing condensed! Staying at " + oldLen + " actions and markers."
        );
      }
    }
  });
  var condenseAllFunc = this.addBlockedCheck(function() {
    if (! ryt.info.inBeginnerMode()
        || confirm("[Condense] This removes all of your undo/redo history.\nReally continue?")) {
      var oldLen = self.model.len_actionS();
      self.model.condense();
      if (self.model.len_actionS() < oldLen) {
        self.logger.success("Project condensed (all history removed).");
      } else {
        self.logger.warn("Nothing condensed!");
      }
    }
  });
  var entries = [
    { key:'Condense between Snapshots',
      val: condenseBeforeSnapshotMarkersFunc },
    { key: 'Condense all (remove all History)',
      val: condenseAllFunc }
  ];
  this.popupMenuForWidget(entries, "condense history", condenseButt);

  lastPos = condenseButt.topRight();

  var helpButt = r.eg.createTextButtonAt(lastPos.add(gap), "?..");
  /*
  var logFunc = function(e, context) {
    eg.log("e:", e, "context:", context, 'text:', e.target.textContent);
  };
  */
  var limitationsFunc = function () {
    //self.logger.log("Action 2");
    var text = ""
      +"Bad News (first)\n"
      +"================\n"
      +"Security hint: there is no encryption!\n"
      +"--------------------------------------\n"
      +"This means:\n"
      +"- unencrypted communication between browser and server, and\n"
      +"- unencrypted storage at server.\n"
      +"So you should *not* store sensitive data (e.g. passwords).\n"
      +"Update 2011-07-16: now there is an experimental mode - off by default - of having encrypted project areas, where projects are stored encrypted at server. In this mode nobody without the correct encryption key (stored in browser and backuped by yourself) can read projects at server. But nevertheless they may be deleted somehow (not easy, but possible, because there is no https).\n"
      +"\n"
      +"Further limitations\n"
      +"-------------------\n"
      +"- there is no guarantee - due to being a private effort - for permanent availability of this http://www.evolgo.de/RYT/app.html'service' (at http://www.evolgo.de/RYT/app.html);\n"
      +"- this software surely has bugs;\n"
      +"- compatibility between different versions cannot be guaranteed\n"
      +"  (though it is a goal to stay compatible with older versions).\n"
      +"\n"
      +"Good News (second)\n"
      +"==================\n"
      +"The developer of this software\n"
      +"- likes it (has made it fitting his specific needs);\n"
      +"- uses it himself as tool for task management at his current - bread and butter - job;\n"
      +"- wants to help others getting things easier;\n"
      +"-> so there is some motivation to keep it running..."
    ;
    ryt.confirmDialog({ topic: "Security Hint, further Limitations",
                        text: text, text2HTMLFlag: true,
                        yesButtonText: "I have read this!" });
  };
  var mouseNKeyBindingsFunc = function () {
    var text = ""
      +"Notes\n"
      +"=====\n"
      +"An\n"
      +'- element is one of '
      +   "@@@<span " + self.spanStyleFor('task')    + ">task</span>@@@, "
      +   "@@@<span " + self.spanStyleFor('comment') + ">comment</span>@@@;\n"
      +"- element *link* appears in element info in same color as its corresponding element widget.\n"
      +"\n"
      +"Mouse bindings\n"
      +"==============\n"
      +"hover                element[link] -> show element info\n"
      +"click                element info  -> change to win\n"
      +"\n"
      +"double-click         canvas        -> create task (at clicked position)\n"
      +"shift-double-click   canvas        -> create comment (at clicked position)\n"
      +"double-click         element[link] -> edit element\n"
      +"\n"
      +"right-click          canvas        -> context menu\n"
      +"\n"
      +"click-move           element       -> move element\n"
      +"click-move selected  element       -> move selected element(s)\n"
      +"\n"
      +"shift-click          element       -> add element in addition to already selected (for multiple selects)\n"
      +"meta(win)-click      element       -> toggle selection of element\n"
      +"click-move           canvas        -> select elements by a rectangle\n"
      +"shift-click-move     canvas        -> add rectangle selection of elements to already selected\n"
      +"meta(win)-click-move canvas        -> toggle rectangle selection of elements\n"
      +"\n"
      +"click-del            element       -> delete element\n"
      +"\n"
      +"click-move connector point         -> start connection    *from* element\n"
      +"alt-click            element       -> start connection(s) *from* selected element(s)\n"
      +"alt-click            canvas        -> start connection    *to*   selected element(s)\n"
      +"\n"
      +"Key bindings\n"
      +"============\n"
      +"ctrl-a       -> select all (in current flow)\n"
      +"\n"
      +"del          -> delete selected\n"
      +"ctrl-c       -> copy selected\n"
      +"ctrl-alt-c   -> copy'n'export selected (for import into another project)\n"
      +"ctrl-x       -> cut selected\n"
      +"ctrl-v       -> paste cutted/copied as copy (creating new element(s))\n"
      +"ctrl-alt-v   -> import'n'paste (after export from another project)\n"
      +"\n"
      +"ctrl-shift-V -> paste cutted/copied as *alias* (referencing them without creating new ones)\n"
    ;
    ryt.helpDialog("Mouse'n'Key Bindings", text, 'auto');
  }; // mouseNKeyBindingsFunc()

  var examplesFunc = function () {
    var adder_1_URL = ryt.info.rytURL_project("[adder_1]");
    var adder_4_URL = ryt.info.rytURL_project("[adder_4]");
    var ViP_URL = ryt.info.rytURL_project("[ViP]");
    var PeterNMaryConflictResolution_URL = ryt.info.rytURL_project("[PeterNMaryConflictResolution]");
    //var ?_URL = ryt.info.rytURL_project("[?]");

    var text = ''
      +'These public (read-only) project examples can be stored in your own project area by choosing a name without brackets ([]) around.\n'
      +'Feel free to use them however you like.\n'
      +'- '+ PeterNMaryConflictResolution_URL + "'Peter'n'Mary conflict resolution'\n"
      +'  Project example from screencast.\n'
      +'- '+ ViP_URL + '"ViP"\n'
      +'  Some real life project (RYT is in use in its developer\'s \'bread and butter\' job).\n'
      +'- '+ adder_1_URL + '"1-bit adder"\n'
      +'  Adds two bits with input and output carry; modeled with help of subtask finishing logics.\n'
      +'- '+ adder_4_URL + '"4-bit adder"\n'
      +'  Adds two 4-bit numbers; based on 1-bit adder.\n'
    ;
    ryt.helpDialog("Examples (public)", text);
  };

  var linksFunc = function () {
    var rytURL = ryt.info.rytURL();
    var rytEncryptedURL = ryt.info.rytURL(true);
    var currentURL = ryt.info.rytURLForCurrentProject();
    var infoURL = ryt.info.rytURL_project("[info]");
    var newURL = ryt.info.rytURL_project(null);
    var text = ''
      +'Projects\n'
      +'--------\n'
      +'- Link to current project'
      +   (ryt.info.currentProjectId
           ? ' *'+ryt.info.currentProjectId+'*'
           : "")
      +   ':\n'
      +(ryt.info.currentProjectId
        ? '  \t\t' + currentURL +'\n'
        : '  \t\t' + 'none: no project ID.\n')
      +'  -> Loads current project *'+ryt.info.currentProjectId+'* during RYT startup.\n\n'
      +'- Link for creating new project:\n'
      +'  \t\t' + newURL +'\n'
      +'  -> Creates a new project in your project area.\n\n'
      +'- Link to *public* [info] project:\n'
      +'  \t\t' + infoURL +'\n'
      +'  -> Loads [info] project.\n'
      +'  Note: only saveable\n'
      +'  - under another name (without \'[]\' brackets), !or!\n'
      +'  - with maintainer password.\n\n'
      +'Elements\n'
      +'--------\n';
    if (ryt.info.currentProjectId && ryt.info.currentElementId) {
      text += ''
        +'- Link to element *'+ryt.info.currentElementId+'* of current project *'+ryt.info.currentProjectId+'*'
        +   ':\n'
        +'  \t\t' + currentURL +'\n'
        +'  -> Loads current project *'+ryt.info.currentProjectId+'* and opens info window of referenced element during RYT startup.\n\n';
    }
    text += ''
      +'- Links to copied elements of current project *'+ryt.info.currentProjectId+'*:';

    var selected = self.model.getSelected();
    if (eg.numOfProps(selected)) {
      eg.forEach(selected, function(val, sel) {
        text += "\n  - @" + sel + "@ (@" + sel + "@):";
        text += '\n    ';
        text += ryt.info.rytURL_projectElement(ryt.info.currentProjectId, sel);
      });
      if (eg.numOfProps(selected) > 1) {
        text += "\n  - all together:";
        text += '\n    ';
        text += ryt.info.rytURL_projectElements(ryt.info.currentProjectId, selected);
      }
    } else {
      text += '\n  \t\tnone.'
    }
    text += '\n  -> Loads current project *'+ryt.info.currentProjectId
      +'* and opens info window of referenced element during RYT startup.\n\n';
    text += ''
      +'New Project Areas\n'
      +'-----------------\n'
      +'- Unencrypted (default): link for creating a fresh project area (suited for multiple projects):\n'
      +'  \t\t' + rytURL +'\n'
      +'  -> Creates a new key being part of a unique URL, which identifies your - private or shared - project area.\n\n'
      +'- Encrypted: link for creating a fresh project area (suited for multiple projects) with encryption:\n'
      +'  \t\t' + rytEncryptedURL +'\n'
      +'  -> Creates a new key being part of a unique URL, which identifies your - private or shared - *encrypted* project area.';

    ryt.helpDialog("Links", text, 'auto');
  };
  var feedbackFunc = function () {
    var text = ''
      +"Feedback is appreciated: especially browser compatibility is of interest (after looking into corresponding element in [info] project).\n"
      +'Please mailto:\n'
      +'- @@@'
      + eg.createMailtoHTMLString(
        'browser compatibility feedback',
        'sr',
        'evolgo.de',
        '[RYT browser compatibility feedback] ',
        ''
          +'RYT version: ' + ryt.info.version
          +'%0a%0a'
          +'Browser version: [Internet Explorer, Firefox, Safari, Chrome; version] '
          +'%0a%0a'
          +'OS version: [Windows, Linux, MacOSX; version] '
          +'%0a%0a'
          +'Experience: [works, works with limitations, does not work; issues] '
          +'%0a%0a')
      +'@@@,\n'
      +'- @@@'
      + eg.createMailtoHTMLString(
        'general feedback',
        'sr',
        'evolgo.de',
        '[RYT general feedback] ')
      +'@@@.';
    ryt.helpDialog("Feedback", text);
  };
  var donationsFunc = function () {
    var featuresNiceToHave = ''
      +'RYT features I would like to have:'
      +'%0a%0a';
    var text = ''
      +"Donations are appreciated.\n"
      +'Please mailto:\n'
      +'- @@@'
      + eg.createMailtoHTMLString(
        'bitcoin donation',
        'sr',
        'evolgo.de',
        '[bitcoin donation] ',
        ''
          +'I want to donate - with knowing you about me -: please send me a bitcoin address.'
          +'%0a%0a'
          + featuresNiceToHave)
      +'@@@ (info about http://bitcoin.org/"bitcoins" ),\n'
      +'- @@@'
      + eg.createMailtoHTMLString(
        'donation by other means',
        'sr',
        'evolgo.de',
        '[donation] ',
        ''
          +'I want to donate without using bitcoins: please contact me.'
          +'%0a%0a'
          + featuresNiceToHave)
      +'@@@.';
    ryt.helpDialog("Donations", text);
  };
  var aboutFunc = function () {
    var text = ''
      +'Project  : Roll Your Tasks (RYT)\n'
      +'Version  : ' + ryt.info.version + '\n'
      +'Purpose  : Support of task management for individuals and small groups.\n'
      +'License  : https://github.com/hartrock/RYT/blob/master/agpl_short.txt"AGPL" .\n'
      +'Published: https://www.github.com/hartrock/RYT"Github" .\n'
      +'Credits  : See \'Credits\' in ' + ryt.info.rytURL_project("[info]" + '"[info] project"') + ' .\n'
      +'Developer: @@@' + eg.createMailtoHTMLString('Stephan Rudlof','sr','evolgo.de') + '@@@'
    ;
    ryt.helpDialog("About", text, 'auto');
  };
  var entries = [
    { key:"Mouse'n'Key Bindings", val:mouseNKeyBindingsFunc },
    { key:'Load [info] Project', val:function(){ self.loadProject('[info]'); } },
    { key:"Examples (public)", val:examplesFunc },
    { key:"Links", val:linksFunc },
    { key:'Security Hint, Limitations', val:limitationsFunc },
    { key:'Feedback', val:feedbackFunc },
    { key:'Donations', val:donationsFunc },
    { key:'About', val:aboutFunc }
  ];
  this.popupMenuForWidget(entries, "help", helpButt);
  lastPos = helpButt.topRight();

  var advancedButt
    = r.eg.createTextButtonAt(lastPos.add(gap), "Advanced..");
  var setKeyFunc = function () {
    self.createOrSetEncryptionKey(null, null, true);
  }
  var clearKeyFunc = function () {
    var encryption = ryt.info.encryption;
    encryption.key = null;
    ryt.storeLocally("encryption", encryption);
  };
  var setPreferencesFunc = function () {
    ryt.openPrefsDialog(ryt.info.prefs, function(props) {
      if (! eg.propsSame(ryt.info.prefs, props)) {
        ryt.info.setLocally("prefs", props);
        self.logger.info("Preferences changed: reload project to see all effects.");
      } else {
        self.logger.info("Preferences unchanged.");
      }
    });
  };
  var lockStr = "Lock Project";
  var unlockStr = "Unlock Project";
  var keys = this.model && this.model.lockedBy
    ? [unlockStr, lockStr] : [lockStr, unlockStr];
  var entries = [
/* // does not always work with project start
    { key:keys,
      val: function(e) {
        self.lockSwitchProject();
        $(e.target).text(self.model.lockedBy ? unlockStr : lockStr);
      } },
      */
    { key:"Set Preferences", val:setPreferencesFunc },
    { }, // separator
    { key:lockStr, val: function() { self.lockProject(); } },
    { key:unlockStr, val: function() { self.unlockProject(); } },
    { }, // separator
    { key:"Change User Info", val: function() {
      var topic = "Change User Info";
      var userInfo = ryt.info.user;
      var cbOK = function(data) {
        //eg.log("user info", data);
        if (data && data.id) {
          if (! userInfo
              || userInfo.id !== data.id || userInfo.name !== data.name) {
            ryt.info.setLocally('user', data);
            self.setUserInModel();
            self.logger.success(
              "User info changed to id *" + data.id + "* and name ***"
                + data.name + "***.",
              topic
            );
          } else {
            self.logger.info("User info unchanged.", topic);
          }
        } else {
          self.logger.warn("Invalid input!\nNothing changed.", topic);
        }
      }
      var argObj = eg.cloneProps(userInfo); argObj.title = topic;
      ryt.openUserInfoDialog(argObj, cbOK);
    } },
    { }, // separator
    { key:"Sanity Checks", val:function() {
      eg.assert.throwOnce = true;
      try {
        self.model.sanityChecks();
        self.logger.success("[sanity checks] Model OK.");
      } catch (e) {
        self.logger.error("[sanity checks] Model checks failed: this should not happen!\n" + e);
      }
      if (ryt.hasReasonableStorage()) {
        self.logger.success("[sanity checks] Browser storage OK.");
      } else {
        self.logger.problemNStay(
          "[sanity checks] No reasonable browser storage: problems expected!"
        );
      }
    } },
    { key:"Clear local Cache", val: [
      { key:"of oldest Project", val:function() {
        var oldSize = $.jStorage.storageSize();
        var removed = ryt.info.removeOldestProject();
        var str = "[clear local cache of oldest project] ";
        if (removed) {
          var newSize = $.jStorage.storageSize();
          str += "key: " + removed[0] + ", id: " + removed[1] + " cleared;\n"
            + "old size: " + oldSize + ", new size: " + newSize
            + ", freed: " + (oldSize - newSize)
            + ".";
          self.logger.success(str);
        } else {
          str += "no oldest project found: cannot clear cache for it.";
          self.logger.warn(str);
        }
      } },
      { key:"of all Projects", val:function() {
        var oldSize = $.jStorage.storageSize();
        ryt.info.removeAllProjects();
        var newSize = $.jStorage.storageSize();
        self.logger.info(
          "[clear local cache of all projects] old size: " + oldSize
            + ", new size: " + newSize
            + ", freed: " + (oldSize - newSize) + "."
        );
      } }
    ] },
    { }, // separator
    { key:"Project Area Maintenance", val:function() {
      var credentials = ryt.app.createCredentials(null, null, true);
      ryt.importProjectList(
        credentials,
        function(listing) {
          eg.log(listing);
          ryt.openMaintenanceDialog(
            listing, credentials.key, function(toBeDeleted, deleteFlag) {
              if (! deleteFlag || ! toBeDeleted.length) {
                return;
              }
              if (confirm("Really delete project(s) " + toBeDeleted.join(', ') + "?")) {
                eg.log(toBeDeleted);
                toBeDeleted.forEach(function(projectId) {
                  eg.log(projectId);
                  ryt.deleteProject(
                    projectId,
                    self.createCredentials(projectId, false, true),
                    function() {
                      ryt.app.logger.success("Project *" + projectId
                                             + "* deleted at server.");
                    },
                    function() {
                      self.logger.error("Deletion of project *" + projectId
                                        + "* at server failed.");
                    });
                });
              }
            }
          );
        });
    } },
    { key: "Backup", val: [
      { key:"Export raw Project Data", val: function() {
        var topic = "Export raw Project Data";
        var toBeStoredObj = self.model.asData();
        var rawDataString = eg.JSON.stringify(toBeStoredObj);
        var argObj = {
          title: "[" + topic + "] copy/paste/save text from this window...",
          text: rawDataString,
          helpText: "This is for storing raw project data of current project in your local file system (e.g. for backup): you could \n# copy,\n# paste (e.g. into some editor window), and\n# store\nit."
            + "\n-> After that you could import stored data by ***import raw project data***.",
          labelCancel: "Close"
        };
        ryt.openTextareaDialog(argObj);
      } },
      { key:"Import raw Project Data", val: function() {
        var topic = "Import raw Project Data";
        if (ryt.info.currentProjectId) {
          ryt.confirmDialog({
            topic: topic,
            text: "Raw project data import only possible into *new* project.\n"
              + "-> Try again after pressing the 'new' button.",
            yesButtonText: "OK"
          });
          return;
        }
        if (! self.unsavedChangesCheck()) {
          return;
        }
        var argObj = {
          title: "[" + topic + "] paste text into this window...",
          helpText: "This is for importing previously stored raw project data, and recreates corresponding project. After that you have to ***save/saveAs*** for getting it onto server (and/or into browser storage).",
          labelOK: "Import",
          labelCancel: "Cancel"
        };
        ryt.openTextareaDialog(argObj, function(props){
          var text = props.text;
          if (! text) {
            self.logger.warn("Nothing to import.");
            return;
          }
          try {
            var modelData = eg.JSON.parse(text);
          } catch (ex) {
            self.logger.error("Invalid project data: cannot parse JSON text.", topic);
            return;
          }
          try {
            self.initFromData(modelData);
            self.logger.success("", topic);
          } catch (ex) {
            if (eg.isString(ex)) {
              self.logger.error(ex, topic);
            } else {
              self.logger.unexpectedError(ex, topic);
            }
          }
        });
      } }
    ] }
  ];
  if (ryt.info.encrypted) {
    entries.push({ key:"Set Encryption Key", val:setKeyFunc });
    if (ryt.info.develMode) {
      entries.push(
        { key:"Clear Encryption Key", val:clearKeyFunc },
        { key:"log strength", val: function() { ryt.logStrength(); } }
      )
    }
  }
  this.popupMenuForWidget(entries, "advanced (preferences, etc.)", advancedButt);
  lastPos = advancedButt.topRight();

  if (! ryt.info.develMode) {
    return;
  }

  var clearLocalProjectDataFun = function () {
    ryt.info.removeAllProjects();
  };
  var develButt = r.eg.createTextButtonAt(lastPos.add(gap), "Devel..");
  entries = [
    { key:"show news", val: function() { ryt.showNews(true); } },
    { key:"log", val: [
      { key:"ryt.info", val: function() { eg.log("ryt.info:", ryt.info); } },
      { key:"local storage",
        val: function() {
          eg.log("storageObj:", $.jStorage.storageObj(),
                 "storageSize:", $.jStorage.storageSize(),
                 "index:", $.jStorage.index());
        }
      },
      { key:"actionS, objectMap, relations",
        val:function() {
          eg.log("actionS", self.model.objectStore.getActionS());
          eg.log("objectMap", self.model.objectMap);
          eg.log("relations", self.model.relations);
        } },
      { key:"stats", val:function() {
        eg.log(self.model.statsString());
      } },
      { key:"app", val:function() {
        eg.log(self);
      } }
    ] },
    { key:"delete project", val: function() {
      var ident = prompt("Input project id:");
      if (! ident) {
        return;
      }
      var credentials = ryt.app.createCredentials(ident, null, true);
      ryt.deleteProject(ident, credentials);
    } },
    { key:"list projects", val: function() {
      var credentials = ryt.app.createCredentials(null, null, true);
      ryt.importProjectList(credentials,
                            function(listing) {
                              eg.log(listing);
                            });
    } },
    { key:"sound test", val: function() {
      var sound = $("#mm_sound")[0];
      sound.play();
    } },
    { key:"spinner on in", val: function() {
      ryt.app.spinnerOn(true);
    } },
    { key:"spinner on out", val: function() {
      ryt.app.spinnerOn(false);
    } },
    { key:"spinner off", val: function() {
      ryt.app.spinnerOff();
    } },
    { key:"spinner start", val: function() {
      ryt.app.spinner.start(5000, 10, 200);
    } },
    { key:"spinner start 2", val: function() {
      ryt.app.spinner.start(5000, 50, 200);
    } },
    { key:"spinner stop", val: function() {
      ryt.app.spinner.stop();
    } },
    { key:"showNews(true)", val: function() {
      ryt.showNews(true);
    } },
    { key:"focus test", val: function() {
      setTimeout(function() {
        var focus = $(":focus");
        eg.log("focus: ", $(":focus"), ", document.activeElement: ",  $(document.activeElement));
      }, 5000);
    } },
    { key:"whatever test", val: function() {
      eg.assert.throwOnce = true;
      try {
        eg.assert(false, "first");
      } catch (e) {
        eg.log("catched:", e);
      }
      eg.assert(false, "second");
    } },
    { key:"clear local project data", val:clearLocalProjectDataFun }
  ];
  this.popupMenuForWidget(entries, "devel", develButt);
  lastPos = develButt.topRight();

  var action
    = r.eg.createTextButtonAt(lastPos.add(gap), "action");
  action.click(function() {
    self.basicNewProject();
    self.logger.log('[Action] @@@<a href="http://www.n-tv.de/">| n-tv |</a>@@@');
    var str = null;
    if (eg.isString(ryt.info.defaultElementId)) {
      var element = self.model.getObject(ryt.info.defaultElementId);
      if (element) {
        str = self.elementObjInfoStrCB(null).call(element);
      } else {
        self.logger.warn(
          "Element " + ryt.info.defaultElementId + " (given by URL) not found."
        );
      }
    }
    //return;
    var str = "This is a test.";
    var strArg = eg.str2HTML(str);
    ryt.showInfo(function(){return str;},
                 { title:"Welcome to RYT!", dims:eg.Point.xy(800,500) });
  });
  lastPos = action.topRight();
}; // protoApp.createActionButtons()

protoApp.createFlowEditorNObservers = function (r, flowId) {
  var flowEditor = new RYT.FlowEditor(r);
  var res = {
    flowEditor: flowEditor,
    mo_flowEditor: new MO_FlowEditor(this, flowEditor, flowId),
    feo_Model: new FlowEditorObserver(this)
  };
  this.wire(res.flowEditor, flowId, res.mo_flowEditor, res.feo_Model);
  this.setCanvasSizeFor(r);
  return res;
};
protoApp.setUserInModel = function () {
  var id = ryt.info.user && ryt.info.user.id || '??';
  var name = ryt.info.user && ryt.info.user.name || 'unknown user';
  if (! this.model.getUser(id)) {
    this.model.addUser(id, name);
  }
  this.model.setUserID(id);
};
protoApp.initModelNFlowEditor = function (data) {
  var self = this;
  eg.assert(! this.flowEditors.size());
  this.model = RYT.createModel(this.logger, this.selectedStore, data);
  if (! ryt.info.user) {
    var callback = function() {
      eg.log("user info", data);
      self.setUserInModel();
    };
    this.openUserInfoDialogNeedValidInput(
      "Invalid userID: no user info for newly created elements!", "Init",
      callback, // success
      callback  // failure
    );
  } else {
    this.setUserInModel();
  }

  // uses ordered set property of channel listeners to be first listener
  this.mo_Visualizer = new MO_Visualizer(this);
  this.wireModelObserver(this.mo_Visualizer);

  var rootID = this.model.rootID;
  this.flowEditorNObservers = this.createFlowEditorNObservers(this.r, rootID);
  // milestone widget //TODO: move to createMainButtons?
  this.mw = this.r.eg.createMilestonesWidget(
    this.mainButtons.speedButtonsWidget.bottomLeft().add(eg.Point.xy(0,10)),
    this.mainButtons.speedButtonsWidget.getBBox().width, eg.Point.xy(10,10)
  );
  ryt.info.infoWinTopOffset = this.mw.bottom();
  if (true) {//ryt.info.experimental) {
    this.mo_MilestonesWidget = new MO_MilestonesWidget(this, this.mw); // inits MW
    this.wireModelActionSObserver(this.mo_MilestonesWidget);
  }
  this.mo_App = new MO_App(this);
  this.wireModelActionSObserver(this.mo_App);
};
protoApp.deleteModelNFlowEditor = function() {
  if (! this.model) {
    eg.assert(! this.flowEditorNObservers && ! this.mo_MilestonesWidget && ! this.mw);
    return;
  }
  // asArray() for not interating changing coll
  this.openDialogs.asArray().forEach(function(od) {
    od.dialog('close');
  });
  // eg.vals() for not iterating changing coll
  eg.vals(this.elem2diffDia).forEach(function(dd) {
    dd.dialog('close');
  });
  this.unwireModelObserver(this.mo_Visualizer);
  var rootFlowEditor = this.flowEditorNObservers.flowEditor;
  this.unwireModelObserver(this.flowEditorNObservers.mo_flowEditor);
  this.unwireModelActionSObserver(this.mo_MilestonesWidget);
  this.unwireModelActionSObserver(this.mo_App);
  this.model.channel = rootFlowEditor.channel = null;
  this.flowEditors.remove(rootFlowEditor);
  rootFlowEditor.removeFromGUI();
  this.mw.remove();
  this.mw = null;
  this.mo_Visualizer
    = this.flowEditorNObservers
    = this.mo_MilestonesWidget = this.mo_App
    = null;
  this.model = null;
};
// helper for positioning of elems inside canvas (relative to its origin)
protoApp.getCanvasRect = function () {
  var bbox = this.r.canvas.getBBox();
  return eg.Rect.originExtent(eg.Point.xy(bbox.x, bbox.y),
                              eg.Point.xy(bbox.width, bbox.height));
};
protoApp.setCanvasSizeFor = function (r) {
  r.updateCanvasSize();
};
protoApp.setCanvasSize = function () {
  this.setCanvasSizeFor(this.r);
};
// for changing keyboard focus to a div without scrolling to its top
protoApp.createInputDummy = function (elementID) {
  var dummy = $(
    '<input id="inputDummy_'+ elementID +'" '
      + 'name="usedForFocusSwitch" '
      + 'style="'
      +   'width:0; height:0; top:0; left:0; position:fixed; '
      +   'z-index:-1; opacity:0; '
      +'">'
  );
  dummy.appendTo($('#'+elementID));
  //dummy[0].onkeydown = function(e) { eg.log("dummy e:", e); };
  //$(dummy).keydown(function(e) { eg.log("dummy e:", e); });
};

protoApp.addBlockedCheck = function(handler) {
  var self = this;
  return function(e) {
    if (self.isBusy()) {
      self.busyAlert();
      eg.stopPropagationPreventDefault(e);
    } else {
      handler.call(this, e);
    }
  };
};

/*// MEM
  ...
  newRoot[0].onmousedown = root[0].onmousedown;
  newRoot[0].onmousemove = root[0].onmousemove;
  newRoot[0].onmouseup = root[0].onmouseup;
  newRoot[0].onmouseout = root[0].onmouseout;
};
*/
protoApp.initFromData = function(data) {
  this.deleteModelNFlowEditor();
  this.initModelNFlowEditor(data);
}; // protoApp.initFromData()

protoApp.unsavedChangesCheck = function (prefixOrNil) {
  var prefix = prefixOrNil ? prefixOrNil + " " : "";
  var check = true;
  if (this.unsavedProjectFlag) { // not saved
    check = confirm(prefix + "There are unsaved changes.\nReally continue?");
  } else if (this.openDialogs.size()) {
    check = confirm(prefix + "There are open element dialogs.\nReally continue?");
  }
  return check;
};

  protoApp.greetingsAnimation = function (textOrNil) {
    var text = textOrNil || ryt.info.computeGreeting();
    if (this.greetingsAnimation.currentText) {
      this.greetingsAnimation.currentText.remove();
      this.greetingsAnimation.currentText = null;
    }
    this.greetingsAnimation.currentText
      = this.r.text(document.body.clientWidth  / 2, // center
                    document.body.clientHeight / 2, // center
                    text);
    var colorEmph = "#fff";
    var color = "#373737"; //#444
    var txt = this.greetingsAnimation.currentText.attr({
      stroke:color, fill:color,
      'font-size':60, 'font-family':"times", 'line-increment':"30"});
    txt.toBack();
    txt.animate({fill:colorEmph, stroke:colorEmph}, 10000,
                 function(){
                   txt.animate({fill:color, stroke:color}, 10000, function(){
                     txt.animate({fill:colorEmph, stroke:colorEmph}, 10000, function(){
                       txt.animate({fill:color, stroke:color}, 10000);
                     });
                   });
                 });
    txt.node.id='greetings';
  };

  protoApp.createSpinner = function() {
    var x = document.body.clientWidth  / 2;
    var y = document.body.clientHeight / 2;
    return this.r.eg.createSpinnerAtXY(x, y);
  };
  protoApp.spinnerOn = function(inFlag) {
    if (this.spinner) {
      return; // don't create twice
    }
    this.spinner = this.createSpinner();
    // ms, steps, maxRadius, increaseFlag, text
    this.spinner.start(5000, 10, 150, inFlag, inFlag ? "data in..." : "data out...");
  };
  protoApp.spinnerOff = function() {
    if (! this.spinner) {
      return;
    }
    this.spinner.stop();
    this.spinner.remove();
    this.spinner = null;
  };

  protoApp.handleDirtyness = function (dirtyFlag) {
    this.unsavedProjectFlag = dirtyFlag;
    if (dirtyFlag
        ? ! ryt.info.dirtynessShown
        : ryt.info.dirtynessShown) {
      ryt.setDocumentTitle();
      var saveB = this.mainButtons.saveB;
      if (dirtyFlag) {
        saveB.addClassAttribute('emphasize');
      } else {
        saveB.removeClassAttribute('emphasize');
      }
    }
  };

  // exports
  ryt.App = App;

}(EvolGo, RYT));
