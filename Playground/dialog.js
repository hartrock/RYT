function createWindow(text, open) {
  var $dialog = $('<div>this is a test</div>')
    .html(text)
    .dialog({
      autoOpen: open,
      title: 'Basic Win with Text'
    });
  return $dialog;
}
function createTaskWindow(text, open) {
  var $dialog = $('<div id="task-dialog" title="New task">'
                  +'<form id="task-form" action="">'
                  +'<textarea name="description" id="description" rows="7" cols="47"'
                  +' class="ui-widget-content ui-corner-all ui-state-default">'
                  + text
                  +'</textarea>'
                  +'</form>'
                  +'</div>');
  var wrapper = EvolGo.connectors.create_widgetWrapper($dialog);
  wrapper.dialog({
      autoOpen: open, modal: false, width: 600, show: 'scale', hide: 'scale',
      title: 'Task Win with Text',
      close: function(event, ui) {
        if (typeof console !== "undefined") {
	  console.log('close');
	}
      },
      buttons: { 
        "OK": function() {
          console.log('ok');
          var textArea = wrapper.find("#description");
          console.log("text: ", textArea.val());
          //console.log($dialog);
          //console.log($('#task-dialog').parent());
        }, 
        "Cancel": function() {
          console.log('cancel');
          wrapper.dialog('close');
        }, 
        "DoIt": function() {
          var pos = wrapper.getBBox();
	  EvolGo.log(wrapper.data(), pos, this, wrapper);
        }
      }
    });
  if (open) {
    var ttt = $dialog;
  }
  return $dialog;
}

$(document).ready(function() {
  //var $dialog = createWindow('This could be an interesting text!', false);

  var buttonWinOpener = $('<button id="winOpener" style="z-index: 9999; position: absolute; left: 520px; top: 180px;">Open a window</button>');
  buttonWinOpener.appendTo($('body'));
  var buttonWinCloser = $('<button id="winCloser" style="z-index: 9999; position: absolute; left: 620px; top: 180px;">Close all windows</button>');
  buttonWinCloser.appendTo($('body'));

  $('#opener').click(function() {
    $dialog.dialog('open');
  });
  var windows = [];
  $('#winOpener').click(function () {
    var newWin = createTaskWindow('some text',true);
    windows.push(newWin);
  });
  $('#winCloser').click(function () {
    for (var len = windows.length; len--; ) {
      windows[len].dialog('close');
      var winRemoveFun = function (win) { // closure win
        return function () { win.remove(); }
      }
      setTimeout(winRemoveFun(windows[len]), 3000); // give time for 'close' effect
    }
    windows = [];
  });
});

$(function () {
  $('#task-dialog').dialog({ 
    autoOpen: false, modal: false, width: 600, show: 'scale', hide: 'scale',
    title: 'New task',
    close: function(event, ui) {
      console.log('close');
    },
    buttons: { 
      "OK": function() {
        console.log('ok');
        console.log($('#description').val());
        console.log($('#task-dialog').parent());
      }, 
      "Cancel": function() {
        console.log('cancel');
        $(this).dialog('close');
      } 
    }
  });
  $('#taskOpener').click(function() {
    $('#task-dialog').dialog('open');
  });
});

function cleanup() {
  // could be made from time to time
  $('.ui-effects-wrapper').remove();
}
