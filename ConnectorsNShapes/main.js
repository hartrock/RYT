// Dependency scripts loading via main script; correct sequence has to be ensured here.

// Code from
//   http://www.phpied.com/javascript-include-ready-onload/
// (extended with callback).
function include_js(file, callback) {
  var js;
  var html_doc = document.getElementsByTagName('head')[0];
  js = document.createElement('script');
  
  js.onreadystatechange = function () {
    if (js.readyState == 'complete') {
      //alert('JS onreadystate fired (' + file.toString() + ')');
      if (callback) {
        callback();
      }
    }
  }
  js.onload = function () {
    //alert('JS onload fired (' + file.toString() + ')');
    if (callback) {
      callback();
    }
  }
  js.setAttribute('type', 'text/javascript');
  js.setAttribute('src', file);
  html_doc.appendChild(js);
  return false;
}

function init() {
  //alert("init()");
  window_onload();
}

window.onload = function() {
  // include_js outside window.onload makes browser compat problems
  include_js("../egBase.js", function(){
    include_js("../External/raphael.js", function(){
      include_js("../raphaelExtensions.js", function(){
        include_js("../rytFlowEditor.js", function(){
          include_js("../ConnectorsNShapes/connectors.js", init);
        })
      })
    })
  })
};
