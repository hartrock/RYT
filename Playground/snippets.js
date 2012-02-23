//
// language
//

var obj = [null, undefined, {"eins":1}, {"eins":undefined}];
var objSpecial = { eins:1, null:undefined, undefined:null };
var objSpecial = { eins:1, null:null, undefined:null, vier:undefined };
var arrSpecial = [ undefined ];
var stringified = JSON.stringify(objSpecial);
var parsed = JSON.parse(stringified);
console.log("parsed:", parsed);
for (var k in objSpecial) { console.log("o:", k, obj[k]); };
for (var k in parsed) { console.log("p:", k, parsed[k]); };

var obj = { undefined:null };
"undefined" in obj && obj.undefined === null;

function hasOnlyPropUndefinedEqualNull(o) { // check for {undefined:null})
  if (o.constructor !== Object) {
    return false;
  }
  var e, ok = false;
  for (e in o) {
    if (e === "undefined" && o["undefined"] === null) {
      ok = true;
    } else {
      return false
    };
  }
  return ok;
}
hasOnlyPropUndefinedEqualNull({undefined:null});

function arrayWithNullElementOnly(a) { // check for [null]
  return a && a.length === 1 && a[0] === null;
}


var eg = EvolGo;
function printThisGlobal() {
  eg.log("printThisGlobal():", this);
}
var obj = {
  aSlot: 4711,
  printThis: function() { eg.log("obj.printThis():", this); }, // prints obj with aSlot
  printThisGlobal: printThisGlobal,
  printFrozen: function() { eg.log("obj.printFrozen():", this.frozen); },
}
obj.printThis();
obj.printThisGlobal();
function Func() {
  var inner = "inner";
  this.take_obj_printThis = obj.printThis;
  this.printInner = function() { eg.log("Func.printInner():", inner); };
  this.printThis = function() { eg.log("Func.printThis():", this); };
  this.printThisGlobal = printThisGlobal;
}
var func = new Func();
func.take_obj_printThis();
func.printInner();
func.printThis();
func.printThisGlobal();
obj.frozen = true;
