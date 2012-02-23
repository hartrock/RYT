// main
//

function window_onload () {
  var eg = EvolGo; // shortcut
  var r = Raphael(0, 0, "100%", "100%").installExtensions();

  var flowEditor = new RYT.FlowEditor(r);
  var state = flowEditor.state;

  var fe = flowEditor;
  eg.shared.flowEditor = flowEditor; // for merged
  
  // triangles
  
  var isDoubleClicked = false;
  function backToAction(point) {
    var action = function (e) {
      eg.log("backToAction() action()");
      isDoubleClicked = this;
      var bb = this.getBBox();
      this.animate({"fill-opacity": 1}, 500);
      var p = r.path("M" + bb.x + " " + bb.y +"L" + point.toFixed(3));
      this.animateAlong(p, 1000);
      p.remove();
      //state.connLeader.show();
      //state.connLeader.translate(10,10);
      eg.stopPropagation(e);
      var pZero = eg.Point.zero();
      var poZero = pZero.orthogonal();
      var puZero = pZero.unit();
      eg.log(pZero, poZero, puZero);

      // new stuff
      if (typeof eg.shared.triaHook === "function") {
	eg.shared.triaHook();
      }
    };
    return action;
  }
  var triaLen = 60;
  var triangle = r.path("M0 0L"+triaLen+" 0L0 "+triaLen+"L0 0");
  var color = Raphael.getColor();
  triangle.attr({fill: color, stroke: color, "fill-opacity": 0.5, "stroke-width": 2});
  triangle.node.style.cursor = "pointer"; //"pointer" "move" "wait" "move" "crosshair" "help" "text"
  triangle.dblclick(backToAction(eg.Point.zero()));
  triangle.mousedown(fe.shapeMousedown);
  
  var pos = eg.Point.xy(200,400);
  var tria_1 = r.path("M"+pos.x+" "+pos.y+
                        "L"+(pos.x-triaLen/2)+" "+(pos.y+triaLen/2)+
                        "L"+(pos.x+triaLen/2)+" "+(pos.y+triaLen/2)+
                        "L"+pos.x+" "+pos.y);
  var color = Raphael.getColor();
  tria_1.attr({fill: color, stroke: color, "fill-opacity": 1, "stroke-width": 2});
  tria_1.node.style.cursor = "pointer"; //"pointer" "move" "wait" "move" "crosshair" "help" "text"
  tria_1.dblclick(new eg.DebugEventHandler("tria_1.dblclick()"));
  tria_1.mouseover(new eg.DebugEventHandler("tria_1.mouseover()"));
  tria_1.mouseout(new eg.DebugEventHandler("tria_1.mouseout()"));
  tria_1.mouseup(new eg.DebugEventHandler("tria_1.mouseup()"));
  tria_1.mousedown(new eg.DebugEventHandler("tria_1.mousedown()"));
  tria_1.mousemove(new eg.DebugEventHandler("tria_1.mousemove()"));
  tria_1.mousemove(new eg.DebugEventHandler("tria_1.mousemove() 2"));

  
  // shapes and their connections
  // TODO: factor out parts into FlowEditor
  var shapes = [ r.ellipse(190, 100, 30, 20),
                 r.rect(290, 180, 60, 40, 2),
                 r.ellipse(450, 100, 20, 20),
                 r.ellipse(290, 40, 30, 30),
                 r.rect(290, 80, 60, 40, 10),
                 r.circle(400, 400, 20),
                 r.circle(600, 400, 25),
                 r.eg.arrow(eg.Point.xy(50,400), eg.Point.xy(100,300), 50)
               ];
  for (var i = 0, ii = shapes.length; i < ii; i++) {
    var color = Raphael.getColor();
    shapes[i].attr({fill: color, stroke: color, "fill-opacity": 0.5});
    fe.addWidget(shapes[i]);
  }
  var fromMarker = { radius: 4 }; fe.fromMarker = fromMarker;
  var toMarker = { width: 10, length: 15 }; fe.toMarker = toMarker;
  fe.addConnection(new r.Connector(shapes[1], shapes[2], "#fff", "#fff|5", fromMarker, toMarker));
  fe.addConnection(new r.Connector(shapes[0], shapes[1], "#fff", null,     fromMarker));
  fe.addConnection(new r.Connector(shapes[1], shapes[3], "#000", "#fff",   null,       toMarker));
  fe.addConnection(new r.Connector(shapes[1], shapes[4], "#fff", null,     fromMarker, toMarker));
  fe.createConnection(shapes[5], shapes[1]);
  fe.createConnection(shapes[6], shapes[1]);

  // shape factories
  //
  function shapeFactoryDblclick (e) {
    eg.log("shapeFactoryDblclick");
    var newShape = this.clone();
    newShape.attr({"fill-opacity": 0.5});
    newShape.translate(0, 100);
    newShape.toFront();
    fe.addWidget(newShape);
  }
  var ell;
  var shapeFactories = [r.rect   (100,  0, 50, 50),
                        r.circle (200, 25, 25),
                        ell = r.ellipse(300, 25, 40, 25),
                        r.ellipse(400, 40, 25, 40)];
  function initShapeFactory (sf) {
    var color = Raphael.getColor();
    sf.attr({ fill: color, stroke: color});//, "fill-opacity": 0.5 });
    sf.dblclick(shapeFactoryDblclick);
  }
  shapeFactories.forEach(initShapeFactory);
  
  
  // data export/import
  //
  function makeXHRObject() {
    try {return new XMLHttpRequest();}
    catch (error) {}
    try {return new ActiveXObject("Msxml2.XMLHTTP");}
    catch (error) {}
    try {return new ActiveXObject("Microsoft.XMLHTTP");}
    catch (error) {}
    
    throw new Error("Could not create HTTP request object.");
  }
  function performHttpRequest(p) {
    var xhr = makeXHRObject();
    xhr.open(p.method, p.url, p.asynchronous);
    function headerFN(h) {
      var key = h[0], val = h[1];
      xhr.setRequestHeader(h[0], h[1]);
    }
    if (p.headers) {
      p.headers.forEach(headerFN);
    }
    if (p.asynchronous) {
      xhr.onreadystatechange = function() {
        //xhr.onload = function() {
        if (this.readyState == 4) {
          if (this.status == 200) {
            p.success && p.success(this);
          } else {
            p.failure && p.failure(this);
            // don't try to read this.statusText here (not always available)
          }
        }
      }
    }
    try {
      xhr.send(p.data ? p.data : null);
      if (! p.asynchronous) {
        success && success(xhr);
      }
    } catch (e) { // possible in synchronous case
      eg.log("ex: ", e);
      if (! p.asynchronous) {
        failure && failure(xhr);
      }
    }
  }
  function jsonHttpGET(ident, success, failure, asynchronous) {
    performHttpRequest({
                       method: "GET",
                       //url: "http://www.evolgo.de/RYT/Playground/data.php5",
                       url: "./data.php5",
                       success: success, failure: failure,
                       asynchronous: asynchronous,
                       headers: [["X-data-ident", ident],
                                 ["Accept",       "application/json"]]
                       });
  }
  function jsonHttpPOST(ident, data, success, failure, asynchronous) {
    performHttpRequest({
                       method: "POST",
                       //url: "http://www.evolgo.de/RYT/Playground/data.php5",
                       url: "./data.php5",
                       data: data,
                       success: success, failure: failure,
                       asynchronous: asynchronous,
                       headers: [["X-data-ident", ident],
                                 ["Content-Type", "application/json"]]
                       });
  }
  // test HTTP
  /*
   jsonHttpPOST("shapesNConns.json", exportData(), function(){alert("POST successful!");}, function(){alert("POST failed! Started as file://* ?");});
  eg.log("---");
  jsonHttpGET("shapesNConns.json", eg.log, eg.log);
  */
  
  // different domains only work for Safari in 'local mode'
  /*
  var xhr1
  = simpleHttpRequest({
                      method: "GET", url: "http://www.evolgo.de/index.html",
                      asynchronous: true, success: eg.log, failure: eg.log
                      });
  xhr1.send();
  var xhr2
  = simpleHttpRequest({
                      method: "GET", url: "http://www.heise.de/",
                      asynchronous: true, success: eg.log, failure: eg.log
                      });
  xhr2.send();
  */ 


  function exportData(id, data) {
    var dataString = JSON.stringify(data);
    jsonHttpPOST(id, dataString,
                 function(){alert("POST successful!");},
                 function(xhr){eg.log(xhr); alert("POST failed! Started as file://* ?");},
                 true);
  }
  function importData(id, doItFN) {
    function doItFN(xhr) {
      var responseText = xhr.responseText;
      if (responseText) {
        var dataObj = JSON.parse(responseText);
        addDataToGUI(dataObj);
      }
    }
    jsonHttpGET(id,
                doItFN,
                function(xhr){eg.log(xhr); alert("GET " + id + " failed! Started as file://* ?");},
                true);
  }
  
  function addDataToGUI(data) {
    var dss = data.shapes, dcs = data.connections;
    var map = []; // shape ids in dcs -> new shapes
    function fnShape(ds) {
      var newShape = r[ds.type]().attr(ds.attrs);
      fe.addWidget(newShape);
      map[ds.id] = newShape;
      fe.addSelection(newShape);
    }
    dss.forEach(fnShape);
    function fnConn(dc) {
      var source = map[dc.from], target = map[dc.to];
      fe.createConnection(source, target);
    }
    dcs.forEach(fnConn);
  }

  
  // buttons
  //
  var selectAllButton = r.eg.createTextButtonAtXY(0,100,"select all");
  function sabClickFN(e) {
    eg.log("sabClickFN()");
    function sFN(s) {
      fe.addSelection(s);
    }
    fe.shapes.forEach(sFN);
  }
  selectAllButton.click(sabClickFN);

  // radio buttons
  var
  radioButton_1
    = r.eg.createOnOffTextButton("#1", // textOff
                                 "",   // textOn same as textOff
                                 null, // default textOff attrs
                                 {"fill":"red", "stroke":"red"}), // textOn attrs
  radioButton_2
    = r.eg.createOnOffTextButton("#2", "", null, {"fill":"red", "stroke":"red"}),
  radioButton_3
    = r.eg.createOnOffTextButton("#3", "", null, {"fill":"red", "stroke":"red"});
  radioButton_2.moveToP(radioButton_1.topRight());
  radioButton_3.moveToP(radioButton_2.topRight());
  var radioButtons = r.eg.createRadioButtons([ radioButton_1, radioButton_2, radioButton_3 ]);
  radioButtons.moveTo(0, 150);
  function rbClick(e) {
    eg.log("rbClick()", this.type);
  }
  radioButtons.click(eg.bindAsEventListener(rbClick, radioButtons));

  var exportButton
    = r.eg.createTextButtonAt(radioButtons.bottomLeft(),"export...");
  function dataIdent() {
    return ("shapesNConns"
            + (radioButtons.state !== null
               ? "_"+(radioButtons.state+1)
               : "")
            + ".json");
  }
  function ebFN(e) {
    exportData(dataIdent(),
               { shapes: fe.shapes, connections: fe.connections });
  }
  exportButton.click(ebFN);
  
  var importButton
    = r.eg.createTextButtonAt(exportButton.bottomLeft(),"import...");
  function ibFN(e) {
   importData(dataIdent());
  }
  importButton.click(ibFN);

  var ballControlButton
    = r.eg.createOnOffTextButtonAt(importButton.bottomLeft().add(eg.Point.xy(0, 20)),
                                   "stop balls (currently rolling forever)",
                                   "let balls roll (currently stopped at next shape)",
                                   {"font-size":14}, {"font-size":14},
                                   {});
  function bcbFN(e) {
    eg.log("bcbFN()");
    fe.marblesRollFlag(ballControlButton.isOff());
  }
  ballControlButton.click(bcbFN);

  return;
}; // window_onload()


// If this script will be loaded by a main script,
// window.onload has been set already.
if (! window.onload) {
  EvolGo.info("window.onload");
  window.onload = window_onload;
};
