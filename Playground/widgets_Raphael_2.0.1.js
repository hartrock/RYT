// main
//

function window_onload () {
  var eg = EvolGo; // shortcut
  var r = Raphael(0, 0, "100%", "100%").installExtensions();

  borderRect = new eg.Rect(eg.Point.xy(100,100),
                           eg.Point.xy(1000,225));
  r.rectFromEvolGoRect(borderRect);
  var
  aText = "this is a not printed textfield\nwith a not TTTTT second line...",
  textFieldWithText =
    r.createTextFieldAtXY(0, 0, aText,
			     {
                               'font-family':"monospace"
			       //, 'font': "Courier",
                             },
                             null, null
                            );//, eg.Point.xy(500,0));
  var textFieldWithoutText =
    r.createTextFieldAtXY(0, 0,
			     null, // no text
			     null, null, // no text, no bg attrs
			     eg.Point.xy(100, 20));
  var button = r.createTextButtonAtXY(0, 0, "text button");
  
  // on/off button
  var offButton = r.createTextButtonAtXY(0, 0, "off button");
  var onButton = r.createTextButtonAtXY(0, 0, "this is the on button");
  var onOffButton = r.createOnOffButtonFrom(offButton, onButton,
					       true); // alignment
  var
  radioButton_1_on = r.createTextButton("#1 on", {"fill":"red", "stroke":"red"}),
  radioButton_1_off = r.createTextButton("#1 off"),
  radioButton_1 = r.createOnOffButtonFrom(radioButton_1_off, radioButton_1_on, true),
  radioButton_2_on = r.createTextButton("#2 on", {"fill":"red", "stroke":"red"}),
  radioButton_2_off = r.createTextButton("#2 off"),
  radioButton_2 = r.createOnOffButtonFrom(radioButton_2_off, radioButton_2_on, true),
  radioButton_3_on = r.createTextButton("#3 on", {"fill":"red", "stroke":"red"}),
  radioButton_3_off = r.createTextButton("#3 off"),
  radioButton_3 = r.createOnOffButtonFrom(radioButton_3_off, radioButton_3_on, true);

  radioButton_2.moveToP(radioButton_1.topRight());
  radioButton_3.moveToP(radioButton_2.topRight());

  radioButtons = [radioButton_1, radioButton_2, radioButton_3],
  radioButtonsWidget = r.createRadioButtons(radioButtons);

  radioButtonsWidget.click(eg.bindAsEventListener((function() { eg.log(this.state); }),
                                                  radioButtonsWidget));
  var
  aText = "this is a not printed textfield\nwith a not TTTTT second line...",
  textField = r.createTextField(aText,
                                   {
                                     'font-family':"monospace" //, 'font': "Courier",
                                   },
                                   null, null
                                  );//, eg.Point.xy(500,0));

  var onOffButton
    = r.createOnOffTextButton("off", "   x", null, {"fill":"red", "stroke":"red"});

  var task = { type: 'task', id: '4711', name: "this is a task: double click for editing it" };
  var taskButton
    = r.createTextFieldAtXY(0,0, task.name);
  taskButton.dblclick(eg.bindAsEventListener((function() { eg.log(this); }),
                                             task));

  var widgets
    = [ onOffButton, textFieldWithText, textFieldWithoutText, button, radioButtonsWidget, textField, onOffButton, taskButton ];
  r.layoutWidgets(widgets, {
    rect: borderRect,
    direction: "right",
    offsets: (eg.Point.xy(10, 10))
  });


  // diamond
  var origin = eg.Point.xy(20,480), extent = eg.Point.xy(100,100);
  var d = r.diamond(origin.x, origin.y, extent.x, extent.y);
  d.attr({stroke:'green', fill:'red'});
  eg.log(d.getBBox());
  eg.log(d);

  // milestone widget
  var pos = eg.Point.xy(200,480);
  var mw = r.createMilestonesWidget(pos, 400, eg.Point.xy(20,20));
  mw.createMilestone(0.5);
  //mw.createMilestone(0);
  mw.createMilestone(0.2);
  mw.createMarker(1);
  mw.moveMarkerTo(0,0);
  //mw.moveMarkerTo(0,1);

  r.circle(100,100,100);
  return;

  productionMode = false;
  assert(true, "true is true");
  //assert(false, "false is not true");
 
 // text experiments

  var at = eg.Point.xy(0,500);
  var txt =
    r.text(at.x,at.y,
           "Hello World!" + "\n(" + this.outerWidth+","+this.innerHeight+")")
    .attr({stroke: "white", "font-size":24, "fill":"white", "text-anchor": "" })
    .moveToP(at);
  
  var box = txt.getBBox(); // show that text has been positioned correctly now
  r.rect( box.x, box.y, box.width, box.height, 0 ).attr({stroke:'white', 'stroke-width':1});

  at = eg.Point.xy(500, 100);
  var t = r.text( at.x, at.y, "this is some text" + " (" + box.x+" "+", "+box.y+", "+box.width+", "+box.height+")"
                  /*+" (" + box2.x+" "+", "+box2.y+", "+box2.width+", "+box2.height*/
                ).attr( {"font-size":8, "font-family":"Courier", "text-anchor": "left"} )
    .moveToP(at);
  box = t.getBBox(); // show that text has been positioned correctly now
  r.rect( box.x, box.y, box.width, box.height, 0 ).attr({stroke:'black', 'stroke-width':1});

  var text = "Hy!";
  var txt = [];
  var attr = {font: '50px Fontin-Sans, Arial', opacity: 0.5};
  at = eg.Point.xy(0, 240); txt[0] = r.text(at.x, at.y, text).attr(attr).attr({fill: "#0f0"}).moveToP(at);
  at = eg.Point.xy(320, 240); txt[1] = r.text(at.x,at.y, text).attr(attr).attr({fill: "#f00"}).moveToP(at);
  at = eg.Point.xy(640, 240); txt[2] = r.text(at.x,at.y, text).attr(attr).attr({fill: "#00f"}).moveToP(at);

}; // window_onload()


// If this script will be loaded by a main script,
// window.onload probably has been set already.
if (! window.onload) {
  EvolGo.info("window.onload");
  window.onload = window_onload;
};
