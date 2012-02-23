EvolGo.connectors = { };
// outside create_widgetWrapper() for sharing
EvolGo.connectors.getBBox = function () {
  var box = this.data().handle.elem.parentNode.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
};
EvolGo.connectors.toFront = function () {
  //TODO
};
EvolGo.connectors.create_widgetWrapper = function (widget) {
  wrapper = Object.create(widget);
  wrapper.getBBox = EvolGo.connectors.getBBox;
  wrapper.toFront = EvolGo.connectors.toFront;
  return wrapper;
};

/*
EvolGo.shared.triaHook = function () {
  var eg = EvolGo;
  var shared = eg.shared;
  var fe = shared.flowEditor;
  eg.log("in triaHook()");
  var tw1 = createWindow("1. created from triaHook()", true);
  var tw2 = createWindow("2. created from triaHook()", true);
  eg.log(tw1, tw1.offset(), tw1.innerWidth(), tw1.innerHeight());
  eg.log(tw1, tw1.position(), tw1.width(), tw1.height());

  var tw1Wrapper = eg.connectors.create_widgetWrapper(tw1);
  var tw2Wrapper = eg.connectors.create_widgetWrapper(tw2);
  fe.setShapeBehavior(tw1);
  fe.setShapeBehavior(tw2);
  eg.log("tw1: ", tw1Wrapper, tw1Wrapper.getBBox(),
         "tw2: ", tw2Wrapper, tw2Wrapper.getBBox());
  var conn = new fe.r.Connector(tw1Wrapper, tw2Wrapper, null, null,
				fe.fromMarker, fe.toMarker);
  fe.setConnectionBehavior(conn);
  fe.connections.push(conn);
};
*/
EvolGo.shared.triaHook = function () {
  var eg = EvolGo;
  var flowEditor = eg.shared.flowEditor;
  var r = flowEditor.r;
  var task = { type: 'task', id: '4711', name: "this is a task: double click for editing it",
               description: "this is the description..." };
  var taskWidget
    = r.eg.createTextFieldAtXY(0,400, task.name);
  taskWidget.dblclick(eg.bindAsEventListener((function() { createTaskDialog(task, true); }),
                                             taskWidget));
  flowEditor.setWidgetBehavior(taskWidget);
  taskWidget.addClassAttribute('task');
  taskWidget.addClassAttribute('connectable');

  $('.task').css('cursor','move');

};

function createTaskDialog(task, open) {
  /*
  var $dialog = $('<div id="task-dialog" title="New task">'
                  +'<form id="task-form" action="">'
                  +'<textarea name="name" id="description" rows="1" cols="47"'
                  +' class="ui-widget-content ui-corner-all ui-state-default">'
                  + task.name
                  +'</textarea>'
                  +'<textarea name="description" id="description" rows="7" cols="47"'
                  +' class="ui-widget-content ui-corner-all ui-state-default">'
                  + task.description
                  +'</textarea>'
                  +'</form>'
                  +'</div>');
  */

  var $dialog = $('<div id="task-dialog" title="New task">'
                  +'<form id="task-form" action="">'
                  +'<table>'
                    +'<tr>'
                      +'<td>'+'name'+'</td>'
                      +'<td>'+'<textarea name="name" id="name" rows="1" cols="47"'
                             //+' class="ui-widget-content ui-corner-all ui-state-default">'
                             +' >'
                             + task.name
                             +'</textarea>'
                      +'</td>'
                    +'<tr>'
                      +'<td>'+'desc'+'</td>'
                      +'<td>'+'<textarea name="description" id="description" rows="7" cols="47"'
                             //+' class="ui-widget-content ui-corner-all ui-state-default">'
                             +' >'
                             + task.description
                             +'</textarea>'
                      +'</td>'
                    +'</tr>'
                  +'</table>'
                  +'</form>'
                  +'</div>');

  $dialog.dialog({
      autoOpen: open, modal: false, width: 600, show: 'scale', hide: 'scale',
      title: 'Edit Task',
      close: function(event, ui) {
        if (typeof console !== "undefined") {
	  console.log('close');
	}
      },
      buttons: { 
        "OK": function() {
          console.log('ok');
          var textArea = $dialog.find("#description");
          console.log("text: ", textArea.val());
          $dialog.dialog('close');
        }, 
        "Cancel": function() {
          console.log('cancel');
          $dialog.remove();
          //$dialog.dialog('close');
        }, 
        "DoIt": function() {
	  EvolGo.log($dialog.data(), this, $dialog, $dialog.find('#description'));
        }
      }
    });
  var textArea = $dialog.find("#description");
  EvolGo.shared.shouldGetFocus = textArea;
  setTimeout("EvolGo.shared.shouldGetFocus.focus();",500);
  if (open) {
    var ttt = $dialog;
  }
  return $dialog;
}
