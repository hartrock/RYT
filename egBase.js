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

// extensions
//

// ECMA-262 5th Edition ..

// from
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/Reduce#Compatibility
if (!Array.prototype.reduce)
{
  Array.prototype.reduce = function(fun /*, initialValue */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    // no value to return if no initial value and an empty array
    if (len == 0 && arguments.length == 1)
      throw new TypeError();

    var k = 0;
    var accumulator;
    if (arguments.length >= 2)
    {
      accumulator = arguments[1];
    }
    else
    {
      do
      {
        if (k in t)
        {
          accumulator = t[k++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++k >= len)
          throw new TypeError();
      }
      while (true);
    }

    while (k < len)
    {
      if (k in t)
        accumulator = fun.call(undefined, accumulator, t[k], k, t);
      k++;
    }

    return accumulator;
  };
}

// .. ECMA-262 5th Edition.

if (typeof Object.create !== 'function') {
  Object.create = function(o) {
    function F() {}
    F.prototype = o;
    return new F();
  };
}

/* moved to EvolGo below (don't pollute standard objects/functions)
 *
// functional.js
//http://javascript-reference.info/9-javascript-tips-you-may-not-know.htm
function bind(obj, method) {
  return function() { return method.apply(obj, arguments); }
}

// http://aktuell.de.selfhtml.org/artikel/javascript/organisation/#eigene-objekte
Function.prototype.bind = function () {
  var method = this, args = $A(arguments), object = args.shift();
  return function() {
    return method.apply(object, args);
  }
};
function $A (iterable) {
  return Array.prototype.slice.apply(iterable);
}
Function.prototype.bindAsEventListener = function (object) {
  var method = this;
  return function(event) {
    return method.call(object, event || window.event);
  }
};

// able to bind this and leading args
Function.prototype.bindThisNArgs = function () {
  var method = this, args = $A(arguments), object = args.shift();
  return function() {
    return method.apply(object, (args.length
                                 ? args.concat($A(arguments))
                                 : arguments));
  }
};
// subset of the former
Function.prototype.bindThis = function (obj) {
  var method = this; // that
  return function() {
    return method.apply(obj, arguments);
  }
};
*/

(function(eg) {

  // TODO: use forEach* as base for other array-like functions, if it's fast enough...
  function forEach(obj, fun, thisOrNil) {
    var key, val;
    if (typeof fun !== 'function') {
      throw new TypeError();
    }
    for (key in obj) {
      val = obj[key];
      fun.call(thisOrNil, val, key, obj);
    }
  }
  function forEachOwn(obj, fun, thisOrNil) {
    function funOwn(val, key, obj) {
      if (obj.hasOwnProperty(key)) {
        fun.call(this, val, key, obj);
      }
    }
    forEach(obj, funOwn, thisOrNil); // thisOrNil becomes this above
  }
  function forEachOwn_alt(obj, fun, thisOrNil) {
    var key, val;
    if (typeof fun !== 'function') {
      throw new TypeError();
    }
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        val = obj[key];
        fun.call(thisOrNil, val, key, obj);
      }
    }
  }

  // func creation
  function applyFunc(func) {
    return function(obj) {
      forEach(obj, func, this);
    };
  }

  function mapReduceFunc(mapFunc, reduceFunc, initialValOrNil) {
    return function(obj) {
      var arr = map2arr(obj, mapFunc, this);
      return Array.prototype.reduce.call(arr, reduceFunc, initialValOrNil);
    };
  }

  function genericDetect (someFun, coll, pred, predThisOrNil) {
    var foundOrNull = null;
    function detectNStore (val, key, coll) {
      if (pred.call(predThisOrNil, val, key, coll)) {
        foundOrNull = val;
        return true;
      }
      return false;
    }
    someFun.call(coll, detectNStore, predThisOrNil);
    return foundOrNull;
  }
  function detect(obj, pred, thisOrNil) {
    return genericDetect(objSome, obj, pred, thisOrNil);
  }
  function detectOwn(obj, pred, thisOrNil) {
    return genericDetect(objSomeOwn, obj, pred, thisOrNil);
  }

  function inject(obj, injected, fun, thisOrNil) {
    forEach(obj, function(val, key, obj) {
      injected = fun.call(thisOrNil, injected, val, key, obj);
    });
    return injected;
  }


  // Array specific functions
  //

  function arrDetect(arr, pred, thisOrNil) {
    // Array some() applies given predicate only to assigned vals
    return genericDetect(Array.prototype.some,
                         arr, // Array instance
                         pred, thisOrNil);
  }
  function arrContains(arr, elem) {
    return arr.indexOf(elem) >= 0;
  }
  function arrVals2ObjKeysNVals(arr) {
    var res = {};
    arr.forEach(function(val) {
      res[val] = val;
    });
    return res;
  }

  function numOfProps_slow(obj) {
    var num = 0;
    forEach(obj, function() {
      ++num;
    });
    return num;
  }
  function numOfOwnProps_slow(obj) {
    var num = 0;
    forEachOwn(obj, function() {
      ++num;
    });
    return num;
  }
  function numOfProps_fast(obj) {
    var num = 0, key;
    for (key in obj) {
      ++num;
    }
    return num;
  }
  function numOfOwnProps_fast(obj) {
    var num = 0, key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        ++num;
      }
    }
    return num;
  }

  function returnTrueFunc() { return true; }
  function returnFalseFunc() { return false; }

  function makePredicateOwnProps(obj) {
    return function(valIgnored, key) {
      return obj.hasOwnProperty(key);
    };
  }

  // Array-like extensions; see https://developer.mozilla.org/en/New_in_JavaScript_1.6
  function old_filter2props(obj, pred, thisOrNil) {
    if (typeof pred !== 'function') {
      throw new TypeError();
    }
    var res = { };
    for (var key in obj) {
      var val = obj[key];
      if (pred.call(thisOrNil, val, key, obj)) { // be as compatible as possible with Array.proto.filter()
        res[key] = val;
      }
    }
    return res;
  }
  function new_filter2props(obj, pred, thisOrNil) {
    var res = { };
    forEach(obj, function(val, key, obj) {
      if (pred.call(this, val, key, obj)) {
        res[key] = val;
      }
    }, thisOrNil);
    return res;
  }
  var filter2props = old_filter2props;

  function filterVals2arr(obj, pred, thisOrNil) {
    if (typeof pred !== 'function') {
      throw new TypeError();
    }
    var res = [];
    for (var key in obj) {
      var val = obj[key];
      if (pred.call(thisOrNil, val, key, obj)) {
        res.push(val);
      }
    }
    return res;
  }
  function old_map2arr(obj, fun, thisOrNil) {
    if (typeof fun !== 'function') {
      throw new TypeError();
    }
    var res = [];
    for (var key in obj) {
      var val = obj[key];
      res.push(fun.call(thisOrNil, val, key, obj));
    }
    return res;
  }
  function new_map2arr(obj, fun, thisOrNil) {
    var res = [];
    forEach(obj, function(val, key, obj) {
      res.push(fun.call(this, val, key, obj));
    }, thisOrNil);
    return res;
  }
  var map2arr = old_map2arr;

  function mapA(obj, fun, thisOrNil) {
    return Array.prototype.map.apply(obj, [fun, thisOrNil]);
  }
  function map2vals(obj, fun, thisOrNil) { // not clear: to vals or to keys...
    if (typeof fun !== 'function') {
      throw new TypeError();
    }
    var res = {};
    for (var key in obj) {
      var val = obj[key];
      res[key] = fun.call(thisOrNil, val, key, obj);
    }
    return res;
  }
  function map2keys(obj, fun, thisOrNil) { // not clear: to vals or to keys...
    if (typeof fun !== 'function') {
      throw new TypeError();
    }
    var res = {};
    for (var key in obj) {
      var val = obj[key];
      var mappedKey = fun.call(thisOrNil, val, key, obj);
      res[mappedKey] = val;
    }
    return res;
  }
  function filterMap2arr(obj, pred, fun, thisOrNilPred, thisOrNilFun) {
    if (typeof fun !== 'function' || typeof pred !== 'function') {
      throw new TypeError();
    }
    var res = [];
    for (var key in obj) {
      var val = obj[key];
      if (pred.call(thisOrNilPred, val, key, obj)) {
        res.push(fun.call(thisOrNilFun, val, key, obj));
      }
    }
    return res;
  }
  function filterMap2vals(obj, pred, fun, thisOrNilPred, thisOrNilFun) {
    if (typeof fun !== 'function' || typeof pred !== 'function') {
      throw new TypeError();
    }
    var res = {};
    for (var key in obj) {
      var val = obj[key];
      if (pred.call(thisOrNilPred, val, key, obj)) {
        res[key] = fun.call(thisOrNilFun, val, key, obj);
      }
    }
    return res;
  }
  function andFilterPredicate(pred1, pred2, thisOrNilPred1, thisOrNilPred2) {
    if (typeof pred1 !== 'function' || typeof pred2 !== 'function') {
      throw new TypeError();
    }
    return function(val, key, obj) {
      return (
        pred1.call(thisOrNilPred1, val, key, obj)
          && pred2.call(thisOrNilPred2, val, key, obj)
      );
    }
  }
  function orFilterPredicate(pred1, pred2, thisOrNilPred1, thisOrNilPred2) {
    return function(val, key, obj) {
      return (
        pred1.call(thisOrNilPred1, val, key, obj)
          || pred2.call(thisOrNilPred2, val, key, obj)
      );
    }
  }
  function filterOwnVals2arr(obj, pred, thisOrNil) {
    return filterVals2arr(
      obj,
      andFilterPredicate(makePredicateOwnProps(obj), pred,
                         null, thisOrNil)
    );
  }
  function filterOwn2props(obj, pred, thisOrNil) {
    return filter2props(
      obj,
      andFilterPredicate(makePredicateOwnProps(obj), pred,
                         null, thisOrNil)
    );
  }
  function mapOwn2arr(obj, fun, thisOrNil) {
    return filterMap2arr(
      obj,
      makePredicateOwnProps(obj), fun,
      null, thisOrNil);
  }
  function mapOwn2vals(obj, fun, thisOrNil) {
    return filterMap2vals(
      obj,
      makePredicateOwnProps(obj), fun,
      null, thisOrNil);
  }
  function filterMapOwn2arr(obj, pred, fun, thisOrNilPred, thisOrNilFun) {
    return map2arr(filterOwnProps(obj, pred, thisOrNilPred),
                   fun, thisOrNilFun);
  }
  function filterMapOwn2vals(obj, pred, fun, thisOrNilPred, thisOrNilFun) {
    return map2vals(filterOwnProps(obj, pred, thisOrNilPred),
                    fun, thisOrNilFun);
  }

  function associations(obj) {
    return map2arr(obj, function(val, key) {
      return { key: key, val: val };
    });
  }
  function ownAssociations(obj) {
    return filterMap2arr(obj, makePredicateOwnProps(obj), function(val, key) {
      return { key: key, val: val };
    });
  }
  function keys(obj) {
    return map2arr(obj, function(valIgnored, key) {
      return key;
    });
  }
  function ownKeys(obj) {
    return filterMap2arr(obj, makePredicateOwnProps(obj), function(valIgnored, key) {
      return key;
    });
  }
  function vals(obj) {
    return map2arr(obj, function(val, keyIgnored) {
      return val;
    });
  }
  function ownVals(obj) {
    return filterMap2arr(obj, makePredicateOwnProps(obj), function(val, keyIgnored) {
      return val;
    });
  }

  function copyProps(from, to) {
    for (var key in from) {
      to[key] = from[key];
    }
  }
  function copyMissingProps(from, to) {
    for (var key in from) {
      if (! (key in to)) {
        to[key] = from[key];
      }
    }
  }
  function copyOwnProps(from, to) {
    for (var key in from) {
      if (from.hasOwnProperty(key)) {
        to[key] = from[key];
      }
    }
  }
  function cloneProps(obj) {
    var clone = { };
    copyProps(obj, clone);
    return clone;
  }
  function cloneOwnProps(obj) {
    var clone = { };
    copyOwnProps(obj, clone);
    return clone;
  }
  function hasProps(obj) {
    for (var key in obj) {
      return true;
    }
    return false;
  }
  function hasOwnProps(obj) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        return true;
      }
    }
    return false;
  }

  function selectPropsByKeysArr(props, arr) {
    var res = { };
    arr.forEach(function(val, ix) {
      res[val] = props[val];
    });
    return res;
  }

  function propsUnion(props_1, props_2) {
    var res = cloneProps(props_1);
    forEach(props_2, function(val_2, key_2) {
      if (key_2 in props_1) {
        var val_1 = props_1[key_2];
        if (val_1 !== val_2) {
          throw "Error propsUnion(): val conflict";
        }
      }
      res[key_2] = val_2;
    });
    return res;
  }
  function propsIntersection(props_1, props_2) {
    return filter2props(props_1, function(val_1, key) {
      if (key in props_2) {
        var val_2 = props_2[key];
        if (val_2 !== val_1) {
          throw "Error propsIntersection(): val conflict";
        }
        return true;
      } else {
        return false;
      }
    });
  }
  function propsSub(props_1, props_2) {
    return filter2props(props_1, function(val_1, key) {
      if (key in props_2) {
        var val_2 = props_2[key];
        if (val_2 !== val_1) {
          throw "Error propsSub(): val conflict";
        }
        return false;
      } else {
        return true;
      }
    });
  }
  function keysSame(props_1, props_2) {
    var key;
    for (key in props_1) {
      if (! (key in props_2)) {
        return false;
      }
    }
    for (key in props_2) {
      if (! (key in props_1)) {
        return false;
      }
    }
  }
  function propsSame(props_1, props_2) {
    var key;
    eg.assert(eg.isObjectNotNullNotRegExp(props_1)
              && eg.isObjectNotNullNotRegExp(props_2));
    for (key in props_1) {
      if (! (key in props_2) || props_1[key] !== props_2[key]) {
        return false;
      }
    }
    for (key in props_2) {
      if (! (key in props_1)) {
        return false;
      } // else already compared
    }
    return true;
  }
  function _propsSameDeep(props_1, props_2) {
    var key;
    if (! (eg.isObjectNotNullNotRegExp(props_1)
           && eg.isObjectNotNullNotRegExp(props_2))) {
      return props_1 === props_2;
    }
    for (key in props_1) {
      if (! (key in props_2)) {
        return false;
      }
      if (! _propsSameDeep(props_1[key], props_2[key])) {
        return false;
      }
    }
    for (key in props_2) {
      if (! (key in props_1)) {
        return false;
      } // else already compared
    }
    return true;
  }
  function propsSameDeep(props_1, props_2) {
    eg.assert(eg.isObjectNotNull(props_1) && eg.isObjectNotNull(props_2));
    return _propsSameDeep(props_1, props_2);
  }
  // untested
  function alt_propsSame(props_1, props_2) {
    // 'return' with expr only works with expr starting same line! (automatic ';' insertion)
    return ! ( some(props_1, function(val, key) { props_2[key] !== val; })
               || some(props_2, function(val, key) { props_1[key] !== val; }) );
  }

  // Note: if path is empty, obj itself will be returned
  function propOfObjByPath(obj, path) {
    assert(isArrayLike(path), "isArrayLike(path)");
    var val = obj;
    for (var i = 0; i < path.length; ++i) {
      val = val[path[i]];
      if (isUndefined(val)) {
        break;
      }
    }
    return val;
  }
  // Note: nil for deleting props
  function modifyProps(src, obj) {
    for (var key in src) {
      var val = src[key];
      if (isNil(val)) {
        delete obj[key];
      } else {
        obj[key] = val;
      }
    }
  }
  function modifyPropsByPath(src, obj, path) {
    var toBeModified = propOfObjByPath(obj, path);
    assert(isObjectNotNull(toBeModified), "isObjectNotNull()");
    modifyProps(src, toBeModified);
  }
  function filterOwn2props_alt(obj, pred, thisOrNil) {
    if (typeof pred !== 'function') {
      throw new TypeError();
    }
    var res = { };
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var val = obj[key];
        if (pred.call(thisOrNil, val, key, obj)) { // be as compatible as possible with Array.proto.filter()
          res[key] = val;
        }
      }
    }
    return res;
  }

  // to be called with this: for use in genericDetect like Array.proto.some()
  function objSome(pred, thisOrNil) {
    if (typeof pred !== 'function') {
      throw new TypeError();
    }
    for (var key in this) {
      var val = this[key];
      if (pred.call(thisOrNil, val, key, this)) {
        return true;
      }
    }
    return false;
  }
  function objSomeOwn(pred, thisOrNil) {
    return (
      objSome.call(this,
                   andFilterPredicate(makePredicateOwnProps(this), pred,
                                      null, thisOrNil) )
    );
  }

  function sortKeys(props, sortFunc, thisOrNil) {
    var keys = keys(props);
    return keys.sort(function(key, ix) {
      var val = props[key];
      return sortFunc(val, key, props);
    });
  }

  function some(obj, pred, thisOrNil) {
    return objSome.call(obj, pred, thisOrNil);
  }
  function someOwn(obj, pred, thisOrNil) {
    return objSomeOwn.call(obj, pred, thisOrNil);
  }

  function bindAsEventListener(func, object) {
    return (function(event) {
      return func.call(object, event || window.event);
    });
  }
  function bindThis(func, obj) {
    return function() {
      return func.apply(obj, arguments);
    }
  }
  // iterable in sense of Array (length, etc.)
  function $A(iterable) {
    return Array.prototype.slice.apply(iterable);
  }
  // Binds args from left to right: additional args at call time will be appended to bound ones.
  function bindThisNArgs(/* func, obj, args... */) {
    var args = $A(arguments), func = args.shift(), object = args.shift();
    return function() {
      return func.apply(object, (args.length
                                 ? args.concat($A(arguments))
                                 : arguments));
    }
  }
  function bindThisNArgsFromRight(/* func, obj, args... */) {
    var args = $A(arguments), func = args.shift(), object = args.shift();
    return function() {
      return func.apply(object, (args.length
                                 ? $A(arguments).concat(args)
                                 : arguments));
    }
  }
  // experimental:
  // - f_2 : first arg gets result of calling f_1
  // - this : available in both f_1, f_2
  function combine(f_1, f_2) {
    return function(/* arguments */) {
      return f_2.call(this, f_1.apply(this, arguments));
    }
  }

  // 
  function ifThenElse(pred, thenFunc, elseFunc) {
    return function (/* arguments */) {
      return (pred.apply(this, arguments)
              ? thenFunc.apply(this, arguments)
              : elseFunc.apply(this, arguments));
    };
  }

  function ignoreFN() {}
  // logging exports (may be usable below (during source load))
  if (window.console !== undefined) { // console === undefined may throw below
    if (console.firebug) {
      eg.log    = console.log;
      eg.logAssert = console.assert;
      eg.info   = console.info;
      eg.warn   = console.warn;
      eg.error  = console.error;
      eg.trace = console.trace; // needed for FF, but not for Safari/Chrome
    } else {
      eg.log       = bindThis(console.log,    console);
      eg.logAssert = console.assert
        ? bindThis(console.assert, console)
        : function(expr, msg) {
          if (! expr) {
            console.error(msg);
          }
        };
      eg.info      = bindThis(console.info,   console);
      eg.warn      = bindThis(console.warn,   console);
      eg.error     = bindThis(console.error,  console);
    }
  } else {
    eg.log    = ignoreFN;
    eg.logAssert = ignoreFN;
    eg.info   = ignoreFN;
    eg.warn   = ignoreFN;
    eg.error  = ignoreFN;
  };
  // for switching selectively off with one char
  eg._log = ignoreFN;
  eg._logAssert = ignoreFN;
  eg._info   = ignoreFN;
  eg._warn   = ignoreFN;
  eg._error  = ignoreFN;

  // assert() differencing between devel and production mode
  function assert(exp, msg) {
    if (exp) {
      return true;
    }
    // log into console
    eg.logAssert(exp, "assert(" + exp + ") failed" + (msg ? ": " + msg : ""));
    // If failing asserts should be thrown, they can be thrown by ..
    if (assert.throwOnce) {// .. temporarily setting assert.throwException.
      assert.throwOnce = false;
      throw new AssertException(exp, msg);
    }
    if (eg.shared.productionMode) {
      // log into GUI
      var errMsg =
        "If it is reproducible, please think about writing a bug report!"
        + (msg ? "\n'"+msg+"'" : "");
      if (RYT && RYT.logger) {
        RYT.logger.unexpectedError(errMsg);
      } else {
        alert(errMsg); // fallback
      }
      return false; // don't throw in productionMode
    }
    // Devel mode: trigger debugger with valid call stack, but ..
    // debugger; // .. minify does not work with debugger keyword, so ..
    undefined(); // .. trigger debugger indirectly (FB: "Break on all Errors").
    return false;
  }
  function assertThrow(exp, msg) {
    if (exp) {
      return true;
    }
    throw new AssertException(exp, msg);
  }

  // browser agnostic event handling
  // see http://www.webdesignerforum.co.uk/topic/34087-javascript-prevent-default/
  //     http://www.quirksmode.org/js/events_order.html
  //     http://msdn.microsoft.com/en-us/library/ms534372%28v=VS.85%29.aspx
  //     http://www.javascriptkit.com/dhtmltutors/domeventp2-1.shtml // error for window.event.returnValue
  // robust against window.event as arg
  function stopPropagation(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    } else {
      window.event.cancelBubble = true;
    }
  }
  function preventDefault(e) {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    else {
      window.event.returnValue = false; // true seems to be false ;-)
    }
  }
  function stopPropagationPreventDefault(e) {
    stopPropagation(e);
    preventDefault(e);
  }
  // expects normalized event
  function targetWithPosition(e) {
    var target;
    if (e) {
      target = e.target;
      // http://www.brainjar.com/dhtml/drag/default2.asp
      while (target.nodeType !== 1) { // for reaching node with position prop (and leaving text nodes)
        target = target.parentNode;
      }
    } else {
      target = window.event.srcElement;
    }
    return target;
  }
  // don't use: unclear how it could be used portably
  /*
  function currentTarget(e) {
    if (!e) var e = window.event;
    if (e.currentTarget) {
      return e.currentTarget;
    }
    // TODO: incorporate jQuery solution to get IE compatibility,
    // see http://brandonaaron.net/blog/2009/05/12/jquery-edge-bind-with-a-different-this .
    if (e.srcElement) {
      return e.srcElement;
    }
  }
  */
  function mouseoverFrom(e) { // quirksmode
    return e ? e.relatedTarget : window.event.fromElement;
  }
  function mouseoutTo(e) { // quirksmode
    return e ? e.relatedTarget : window.event.toElement;
  }


  function DebugEventHandler (infoObj) {
    this.info = infoObj;
    var that = this;
    return function(e) {
      e = e || window.event;
      eg.log(that, e);
    }
  }
  DebugEventHandler.prototype.toString = function () {
    return "DebugEventHandler";
  };
  function makeEatThemEventHandler(info) {
    var handler = function (ev) {
      stopPropagation(ev);
      preventDefault(ev);
    }
    handler.info = info;
    return handler;
  }
  function eatThemEventHandler (ev) {
    stopPropagation(ev);
    preventDefault(ev);
  }
  
  // TODO: think about changing to hashmap impl
  function OSet() {
    this._arr = [];
  }
  var protoOSet = OSet.prototype;
  protoOSet.size = function () {
    return this._arr.length;
  };
  protoOSet.contains = function (e) {
    return arrContains(this._arr, e);
  };
  protoOSet.add = function (e) {
    if (! this.contains(e)) {
      this._arr.push(e);
    }
  };
  protoOSet.remove = function (e) {
    var ix = this._arr.indexOf(e);
    if (ix >= 0) {
      this._arr.splice(ix,1);
    } else { // complain if e is missing
      assert(false, this+"("+this._arr+"): cannot remove element "+e);
    }
  };
  protoOSet.flip = function (e) {
    if (this.contains(e)) {
      this.remove(e);
    } else {
      this.add(e);
    }
  };
  protoOSet.last = function () {
    return this._arr[this._arr.length-1]; // rets undefined for empty arr
  };
  protoOSet.toString = function () {
    return "EvolGo.OSet";
  };
  protoOSet.forEach = function (fn, thisArg) {
    return this._arr.forEach(fn, thisArg);
  };
  protoOSet.asArray = function () {
    return this._arr.slice();
  };
  protoOSet.some = function (fn) {
    return this._arr.some(fn);
  };
  function createOSet() {
    return new OSet();
  };

  function AssertException(expr, msg) {
    this.expr = expr;
    this.message = msg;
  }
  AssertException.prototype.toString = function () {
    return 'AssertException'
      + (this.expr ? '('+this.expr+')' : "")
      + (this.message ? ': ' + this.message : "");
  }

  /* Channel
   *
   * This is a low level interface, focused on transport.
   * Semantics of transported messages have to be defined at higher layer.
   *
   * Channel interface for sender is
   *   sendFrom(msg, sender)
   * ; args can be of arbitrary type.
   *
   * Expected listener interface is
   *   receiveFrom(msg, sender)
   * ; args are the ones given by sender.
   *
   * Listeners have to be added by
   *   addListener()
   * ; senders only have to know channel.
   * 
   * If there are different senders, listeners could differentiate by sender arg
   * of receiveFrom().
   *
   * Examples:
   * - 1-1:
   *   listener: channel.addListener(listener);
   *   sender:   channel.sendFrom(msg);
   *   -> from arg may be omitted here, if listener knows sender.
   * - 1->N:
   *   listeners: channel.addListener(listener_n); // 1..N
   *   sender: same as for 1-1.
   * - M->N:
   *   listeners: same as for 1->N
   *   senders: channel.sendFrom(msg, from_m); // 1..M
   *   -> from arg is of interest here: if it is given, listeners are able
   *      to differentiate senders.
   * Notes:
   * - numOfSends(): count of each sendFrom() call (not zero after first call);
   * - numOfReceives(): count of  each receiveFrom() call (this may stay at
   *   zero, if there are no listeners).
   */
  function Channel() {
    this._proto = protoC;
    this.init(); // moved outside ctor to allow subclass call
  }
  var protoC = Channel.prototype;
  protoC.init = function() {
    this.listeners = new OSet(); // ordering can be exploited by listeners
    this._numOfSends = 0;    // sum of send()s from senders
    this._numOfReceives = 0; // sum of receive calls to receivers
    this.messageStore = []; // initing here simplifies logic below
  }
  protoC.toString = function() {
    return "Channel";
  };
  // most used func
  protoC.sendFrom = function (msg, from) {
    var self = this;
    ++this._numOfSends;
    this.storeFlag && this.messageStore.push({ msg: msg, from: from });
    // iterate over copy for being robust against listener changes
    this.listeners.asArray().forEach(function(l) {
      l.receiveFrom(msg, from);
      ++self._numOfReceives;
    });
    return this;
  };
  protoC.addListener = function (l) {
    this.listeners.add(l);
    return this;
  };
  protoC.removeListener = function (l) {
    if (this.listeners.contains(l)) { // silently ignore removal of nonexisting
      this.listeners.remove(l);
    } else {
      eg.warn(this.toString() + ".removeListener(): listener not known.");
    }
    return this;
  };
  protoC.numOfListeners = function () {
    return this.listeners.size();
  };
  protoC.setIsStoringMessages = function (storeFlag) {
    eg.assert( storeFlag !== 'undefined' );
    this.storeFlag = storeFlag;
    return this; // chaining
  };
  protoC.startStoringMessages = function () {
    return this.setIsStoringMessages(true);
  };
  protoC.stopStoringMessages = function () {
    return this.setIsStoringMessages(false);
  };
  protoC.isStoringMessages = function () {
    return this.storeFlag;
  };
  protoC.clearStoredMessages = function () {
    this.messageStore = [];
  };
  protoC.getStoredMessages = function () {
    return [].concat(this.messageStore); // copy: is there a better one?
  };
  protoC.numOfStoredMessages = function () {
    return this.messageStore.length;
  };
  protoC.numOfSends = function () {
    return this._numOfSends;
  };
  protoC.numOfReceives = function () {
    return this._numOfReceives;
  };

  /* BatchChannel
   *
   * BatchChannel is an extension to Channel with batch behavior (batch mode).
   * It can be used as ordinary Channel, too.
   *
   * Batches:
   * A batch is suited for collecting multipe sends into one batch.
   * After opening it for some sender, messages send from this sender
   * to the channel will be collected into a batch store for a later 'all
   * together' receive by the listeners.
   *
   * Senders are opening batches by
   *   openBatch(sender)
   * and closing them by
   *   closeBatch(sender, arg, trigger)
   * ; where
   *   - sender: sender of [open|close]Batch(),
   *   - arg: says something about the batch (e.g. 'createTask',
   *   - trigger: gives info about who has been the reason for creating this
   *     batch at all.
   * A batch can be opened multiple times (nesting), whereby each openBatch()
   * call has to correspond to a closeBatch() call coming later.
   * If there is an open batch,
   *   sendFrom(msg, sender)
   * automatically collects messages into it then.
   *
   * Listeners are listening with
   *   receiveBatchFrom(batch, sender, arg, trigger)
   * (batch containing collected messages), which will be called automatically,
   * after an open batch has been fully closed by its sender.
   *
   * Supported is *one* batch from a *single* sender at some time. After closing
   * *all* openings - triggering receiveBatchFrom() for the channel listeners -
   * an arbitrary sender can open a new batch.
   *
   * Notes:
   * - If there is no open batch, BatchChannel can also be used as ordinary
   *   Channel.
   * - Though the interface is suited for multiple batches at the same time
   *   (each from another sender), this is not implemented.
   */
  function BatchChannel() {
    this._proto = protoBC;
    this.init();
  }
  BatchChannel.prototype = new Channel();
  BatchChannel.prototype.constructor = BatchChannel;
  var protoBC = BatchChannel.prototype;

  protoBC.init = function() {
    protoBC._proto.init.call(this); // call superclass
    this._batchCount = 0; // how many batches have been created
    // sum of (into) batch send()s from senders (subset of the former)
    this._numOfBatchSends = 0;
    // sum of batch receive calls to receivers (subset of the former),
    // should be the same as _batchCount, if no open batch
    this._numOfBatchReceives = 0;
    this.batchFrom = null;
    this.batchStore = null;
    // nesting: inc for openBatch(), dec for closeBatch()
    this.batchOpenCount = 0;
  }
  protoBC.toString = function() {
    return "BatchChannel";
  };
  // most used func
  protoBC.sendFrom = function (msg, from) {
    if (! this.sendsToBatch(from)) {
      protoBC._proto.sendFrom.call(this, msg, from); // super call
      return this;
    }
    ++this._numOfBatchSends;
    this.batchStore.push(msg);
    return this;
  };
  // Batch mode: interface suited for multiple batches (each from different
  // sender); but this is not implemented.
  protoBC.initBatchFor = function (sender) {
    eg.assert(this.batchFrom === null);
    this.batchFrom = sender;
    this.batchStore = [];
    this.batchOpenCount = 0; // to be inc in open func
    ++this._batchCount;
  };
  protoBC.openBatch = function (sender) {
    eg.assert(sender);
    if (! this.sendsToBatch(sender)) {
      this.initBatchFor(sender);
    }
    ++this.batchOpenCount;
  };
  protoBC.sendsToBatch = function (sender) {
    return this.batchFrom === sender;
  };
  protoBC.openBatchCount = function (sender) {
    return this.batchOpenCount;
  };
  protoBC.closeBatch = function (sender, arg, trigger) {
    eg.assert(this.batchFrom === sender); // only one batch supported
    --this.batchOpenCount;
    if (this.batchOpenCount === 0) { // send batch
      var self = this;
      this.storeFlag && this.messageStore.push({ batch: this.batchStore,
                                                 from: sender });
      // iterate over copy for being robust against listener changes
      this.listeners.asArray().forEach(function(l) {
        l.receiveBatchFrom(self.batchStore, sender, arg, trigger);
        ++self._numOfBatchReceives;
      });
      this.batchFrom = null;
      this.batchStore = null;
    }
    return this;
  };


  function isUndefined(arg) { // short and fast (FF)
    return arg === void 0;
  }
  function isNull(arg) {
    return arg === null;
  }

  function isFunction(arg) {
    return typeof arg === 'function';
  }
  function isObject(arg) {
    return typeof arg === 'object';
  }
  function isBoolean(arg) {
    return typeof arg === 'boolean';
  }
  function isString(arg) {
    return typeof arg === 'string';
  }
  function isNumber(arg) {
    return typeof arg === 'number';
  }
  function isRegExp(arg) {
    return ! isNil(arg) && arg.constructor === RegExp;
  }
  function isObjectNotNull(arg) {
    return arg !== null && typeof arg === 'object';
  }
  function isObjectNotNullNotRegExp(arg) {
    return isObjectNotNull(arg) && ! isRegExp(arg);
  }

  function isNil(arg) {
    return isUndefined(arg) || arg === null;
  }
  function isNilOrFunction(arg) {
    return isNil(arg) || typeof arg === 'function';
  }
  function isNilOrObject(arg) {
    return isUndefined(arg) || typeof arg === 'object'; // typeof null === object
  }
  function isNilOrBoolean(arg) {
    return isNil(arg) || typeof arg === 'boolean';
  }
  function isNilOrString(arg) {
    return isNil(arg) || typeof arg === 'string';
  }
  function isNilOrNumber(arg) {
    return isNil(arg) || typeof arg === 'number';
  }
  function isNullOrFunction(arg) {
    return arg === null || typeof arg === 'function';
  }
  function isNullOrBoolean(arg) {
    return arg === null || typeof arg === 'boolean';
  }
  function isNullOrString(arg) {
    return arg === null || typeof arg === 'string';
  }
  function isNullOrNumber(arg) {
    return arg === null || typeof arg === 'number';
  }

  function isOneOfNextArgs(arg) {
    for (var i = 1, len = arguments.length; i < len; ++i) {
      if (arguments[i] === arg) {
        return true;
      }
    }
    return false;
  }
  function isArrayLike(arg) {
    return isObjectNotNull(arg) && isFunction(arg.slice);
  }
  function isArray(arg) {
    return isArrayLike(arg); // there is no 'array' typeof...
  }

  // http://snipplr.com/view/19838/get-url-parameters/
  // (changed by [sr])
  // Further processing not here: concentrating on one task at a time covering
  // as much cases as possible.
  function getUrlVars() {
    var map = {};
    var parts = window.location.search.replace(/[?&]+([^=&]+)(=[^&]*)?/gi, function(m,key,value) {
      // unclear, if "" may appear (looks (after some years...) like "" has worked instead of 'unsigned' some time ago)
      var newVal = ( value === undefined || value === "" || value === "=true" // first two for usage without '='
                     ? true // flag
                     : (value === "=false"
                        ? false // flag
                        : value.substring(1)) // omit '='
                   );
      var entry = map[key];
      if (entry === undefined) {
        map[key] = newVal;
      } else if (isArray(entry)) { // arr already there
        entry.push(newVal);
      } else { // arr creation
        entry = [entry];
        entry.push(newVal);
        map[key] = entry;
      }
    });
    return map;
  }

  function localDateTimeString(timeOrNil) {
    function forceTwoDigits(oneOrTwoDigits) {
      var digitsStr = oneOrTwoDigits.toString();
      return (digitsStr.length === 2
              ? digitsStr
              : "0" + digitsStr);
    }
    var
    dateTime = timeOrNil ? new Date(timeOrNil) : new Date(),
    year = dateTime.getFullYear(), month = dateTime.getMonth(), date = dateTime.getDate(),
    hours = dateTime.getHours(), minutes = dateTime.getMinutes(), seconds = dateTime.getSeconds(),
    dateTimeStr =
      year + "-" + forceTwoDigits(month+1) + "-" + forceTwoDigits(date)
      + " "
      + forceTwoDigits(hours) + ":" + forceTwoDigits(minutes) + ":" + forceTwoDigits(seconds);
    return dateTimeStr;
  }

  // unordered lists
  var list_1_P = "(^- " + "([\\s\\S](?!"
    + "^([^- ]|-[^ ])" // top level pattern
    + "))*[\n]?)";
  var list_2_P = "(^  - " + "([\\s\\S](?!"
    + "^( {0,1}[^ ]| {2}([^- ]|-[^ ]))"
    + "))*)";
  var list_3_P = "(^    - " + "([\\s\\S](?!"
    + "^( {0,3}[^ ]| {4}([^- ]|-[^ ]))"
    + "))*)";
  var list_4_P = "(^      - " + "([\\s\\S](?!"
    + "^( {0,5}[^ ]| {6}([^- ]|-[^ ]))"
    + "))*)";
  var list_1_RE = new RegExp(list_1_P, "gm");
  var list_2_RE = new RegExp(list_2_P, "gm");
  var list_3_RE = new RegExp(list_3_P, "gm");
  var list_4_RE = new RegExp(list_4_P, "gm");

  var item_1_P = "(^- " + "([\\s\\S](?!"
    + "^[^ ]"
    + "))*)";
  var item_2_P = "(^  - " + "([\\s\\S](?!"
    + "^ {0,2}[^ ]"
    + "))*)";
  var item_3_P = "(^    - " + "([\\s\\S](?!"
    + "^ {0,4}[^ ]"
    + "))*)";
  var item_4_P = "(^      - " + "([\\s\\S](?!"
    + "^ {0,6}[^ ]"
    + "))*)";
  var item_1_RE = new RegExp(item_1_P, "gm");
  var item_2_RE = new RegExp(item_2_P, "gm");
  var item_3_RE = new RegExp(item_3_P, "gm");
  var item_4_RE = new RegExp(item_4_P, "gm");

  var marker_1_RE = /^- /gm;
  var marker_2_RE = /^  - /gm;
  var marker_3_RE = /^    - /gm;
  var marker_4_RE = /^      - /gm;

  // ordered lists
  var oList_1_P = "(^# " + "([\\s\\S](?!"
    + "^([^# ]|#[^ ])" // top level pattern
    + "))*[\n]?)";
  var oList_2_P = "(^  # " + "([\\s\\S](?!"
    + "^( {0,1}[^ ]| {2}([^# ]|#[^ ]))"
    + "))*)";
  var oList_3_P = "(^    # " + "([\\s\\S](?!"
    + "^( {0,3}[^ ]| {4}([^# ]|#[^ ]))"
    + "))*)";
  var oList_4_P = "(^      # " + "([\\s\\S](?!"
    + "^( {0,5}[^ ]| {6}([^# ]|#[^ ]))"
    + "))*)";
  var oList_1_RE = new RegExp(oList_1_P, "gm");
  var oList_2_RE = new RegExp(oList_2_P, "gm");
  var oList_3_RE = new RegExp(oList_3_P, "gm");
  var oList_4_RE = new RegExp(oList_4_P, "gm");

  var oItem_1_P = "(^# " + "([\\s\\S](?!"
    + "^[^ ]"
    + "))*)";
  var oItem_2_P = "(^  # " + "([\\s\\S](?!"
    + "^ {0,2}[^ ]"
    + "))*)";
  var oItem_3_P = "(^    # " + "([\\s\\S](?!"
    + "^ {0,4}[^ ]"
    + "))*)";
  var oItem_4_P = "(^      # " + "([\\s\\S](?!"
    + "^ {0,6}[^ ]"
    + "))*)";
  var oItem_1_RE = new RegExp(oItem_1_P, "gm");
  var oItem_2_RE = new RegExp(oItem_2_P, "gm");
  var oItem_3_RE = new RegExp(oItem_3_P, "gm");
  var oItem_4_RE = new RegExp(oItem_4_P, "gm");

  var oMarker_1_RE = /^# /gm;
  var oMarker_2_RE = /^  # /gm;
  var oMarker_3_RE = /^    # /gm;
  var oMarker_4_RE = /^      # /gm;


  var list_RE = new RegExp(list_1_P + "|" + oList_1_P, "gm");
  // result alway starts with a non-list:
  // even entry -> non-list,
  // odd entry -> list.
  function separateLists(str) {
    var res = [ ];
    var previousIndex = 0;
    var arr;
    while ((arr = list_RE.exec(str)) != null)
    {
/*    var msg = "Found " + arr[0] + ".\nIndex: " + arr.index;
      msg += ". Next match starts at " + list_RE.lastIndex;
      eg.log(msg);
*/
      res.push(str.substring(previousIndex, arr.index));
      res.push(arr[0]);
      previousIndex = list_RE.lastIndex;
    }
    res.push(str.substring(previousIndex));
    //eg.log("separateLists()", list_RE, res);
    return res;
  };
  function strUntil(str, searched) {
    var posNL = str.indexOf(searched);
    return posNL === -1 ? str : str.substring(0, posNL);
  }
  function strUntilNL(str) {
    return strUntil(str, "\n");
  }
  function strIndexOfOrEnd(str, searched) {
    var indexOf = str.indexOf(searched);
    return indexOf === -1 ? str.length : indexOf;
  }
  function strIndexOfNLOrEnd(str) {
    return strIndexOfOrEnd(str, "\n");
  }

  function replaceExtraWSBy_nbsp(text, usualIndent) {
    var extraWS_RE = new RegExp(
      "(^[ ]{" + usualIndent + "})" // Separate usual WSs ..
        + "([ ]*)"                  // .. from extra indented ones ..
        + "(.*)"                    // .. from rest in line.
      , "gm"
    );
    var strWith_nbsp = text.replace(
      extraWS_RE,
      function(str, LFusualWS, extraWS, restInLine) {
        return LFusualWS
          + strFromCharLen("\u00A0", extraWS.length) // nbsp in unicode
          //+ restInLine // for testing
          + restInLine.replace(/  +/g, // treat at least 2 WS (same as /[ ][ ]+/g) as nbsps
                               function(strMin2WS) {
                                 return strFromCharLen("\u00A0", strMin2WS.length);
                                 //return strFromCharLen("U", strMin2WS.length); //FT
                               });
      });
    return strWith_nbsp;
  }

  // matches lines *without* any of <ul>, <li>, </ul>, </li>, etc.
  var lineInListStart = '(?:^(?!(?:[ ]*(?:<li>|<\\/li>|<ul>|<ul style="margin:0px;">|<\\/ul>|<ol>|<ol style="margin:0px;">|<\\/ol>))))';
  var linesInListREStr = ""
    +  lineInListStart + "(?:[ ]*)([^\n]*"
    + "([\n]" + lineInListStart + ")?)*"; // only take NL, if next line raw ..
  var linesInListRE =
    new RegExp(linesInListREStr, "gm"); // .. again for NL -> <br /> conversion.

  function str2HTMLList(str, argObj) {
    var str_list_1, str_list_2, str_list_3, str_list_4;
    var str_item_1, str_item_2, str_item_3, str_item_4;
    var str_marker_1, str_marker_2, str_marker_3, str_marker_4;
    str_list_1 = str.replace(list_1_RE,        '<ul style="margin:0px;">\n$1\n</ul>');
    str_list_2 = str_list_1.replace(list_2_RE, "  <ul>\n$1\n  </ul>");
    str_list_3 = str_list_2.replace(list_3_RE, "    <ul>\n$1\n    </ul>");
    str_list_4 = str_list_3.replace(list_4_RE, "      <ul>\n$1\n    </ul>");

    str_item_1 = str_list_4.replace(item_1_RE, " <li>\n$1\n </li>");
    str_item_2 = str_item_1.replace(item_2_RE, "   <li>\n$1\n   </li>");
    str_item_3 = str_item_2.replace(item_3_RE, "     <li>\n$1\n     </li>");
    str_item_4 = str_item_3.replace(item_4_RE, "       <li>\n$1\n     </li>");

    str_marker_1 = str_item_4.replace(marker_1_RE,   "  ");
    str_marker_2 = str_marker_1.replace(marker_2_RE, "    ");
    str_marker_3 = str_marker_2.replace(marker_3_RE, "      ");
    str_marker_4 = str_marker_3.replace(marker_4_RE, "        ");

    var str2 = str_marker_4;
    var str_oList_1, str_oList_2, str_oList_3, str_oList_4;
    var str_oItem_1, str_oItem_2, str_oItem_3, str_oItem_4;
    var str_oMarker_1, str_oMarker_2, str_oMarker_3, str_oMarker_4;
    str_oList_1 = str2.replace(oList_1_RE,       '<ol style="margin:0px;">\n$1\n</ol>');
    str_oList_2 = str_oList_1.replace(oList_2_RE, "  <ol>\n$1\n  </ol>");

    str_oList_3 = str_oList_2.replace(oList_3_RE, "    <ol>\n$1\n    </ol>");
    str_oList_4 = str_oList_3.replace(oList_4_RE, "      <ol>\n$1\n    </ol>");

    str_oItem_1 = str_oList_4.replace(oItem_1_RE, " <li>\n$1\n </li>");
    str_oItem_2 = str_oItem_1.replace(oItem_2_RE, "   <li>\n$1\n   </li>");
    str_oItem_3 = str_oItem_2.replace(oItem_3_RE, "     <li>\n$1\n     </li>");
    str_oItem_4 = str_oItem_3.replace(oItem_4_RE, "       <li>\n$1\n     </li>");

    str_oMarker_1 = str_oItem_4.replace(oMarker_1_RE,   "  ");
    str_oMarker_2 = str_oMarker_1.replace(oMarker_2_RE, "    ");
    str_oMarker_3 = str_oMarker_2.replace(oMarker_3_RE, "      ");
    str_oMarker_4 = str_oMarker_3.replace(oMarker_4_RE, "        ");

    var str3 = str_oMarker_4.replace(
      linesInListRE,
      function(lines, p1) {
        var leadingWS = lines.match(/^[ ]+/);
        var indent = leadingWS ? leadingWS[0].length : 0;
        return str2HTML_step_2(
          (argObj.noWhitespaceConversionFlag
           ? lines // don't do the default
           : replaceExtraWSBy_nbsp(lines, indent)),
          argObj,
          { inListFlag:true });
      });
    //eg.log(str3);
    return str3;
  } // str2HTMLList()

  // - recognize << 'start   'n   stop' >> as *one* str from start to stop
  //   (all inclusive border quotes)
  // do not eat trailing char for allowing 'str':'str'
  var quotedString_RE = /(^|\W)('(?:(?:[^']|'\w)+)'|"(?:[^"]+)")(?=$|\W)/gm;
  //
  function handleQuotedStrings(str, argObj) {
    // do nothing
    return str;

    // replace variant
    return str.replace(quotedString_RE, '$1<span style="background-color:rgba(100, 100, 100, 0.5);">' + '$2' + '</span>');

    // exec variant
    var res = "";
    var previousIndex = 0;
    var arr;
    //eg.log('str:', '$' + str + '$');
    while ((arr = quotedString_RE.exec(str)) != null) {
      //eg.log(arr);
      res += str.substring(previousIndex, arr.index);
      res += arr[1]; // match before
      // string match (including quotes)
      res+='<span style="background-color:rgba(100, 100, 100, 0.5);">' + arr[2] + '</span>';
      previousIndex = quotedString_RE.lastIndex;
    }
    res += str.substring(previousIndex);
    return res;
  } // handleQuotedStrings()

  function str2HTML_basic(str, argObj) {
    if (! str) {
      return "";
    }
    var tmp = str.replace(/&/g, "&amp;");
    if (! argObj.rawFlag) {
      tmp = tmp.replace(/->/g, "&rarr;").replace(/<-/g, "&larr;");
    }
    tmp = tmp.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return argObj.rawFlag
      ? tmp
      : (tmp
         .replace(em1SentenceRE, "<em>$1</em>")
         .replace(em2SentenceRE, "<b>$1</b>")
         .replace(emBothWordRE, "<em><b>$1</b></em>")
         .replace(em1WordRE, "<em>$1</em>")
         .replace(em2WordRE, "<b>$1</b>")
        );
  }
  function str2HTMLBasic(str, argObjOrNil) {
    return str2HTML_basic(str, argObjOrNil || {}); // ensure policy for argObj
  }
  var str2HTML_raw_classStr = 'str2html raw';
  function str2HTML_raw(str) {
    return '<pre class="' + str2HTML_raw_classStr + '">'
      + str2HTML_basic(str, { rawFlag:true }) + '</pre>';
  }

  // URI standard: http://www.ietf.org/rfc/std/std66.txt
  // Examples:
  //   http://www.foo.bar'some text'
  //   http://www.foo.bar"some text"
  //   http://www.foo.bar
  //   ftp://ftp.foo.bar
  // Allowed separators around whole link are
  // - WS or
  // - '(' (at begin) and ')' (at end)
  // e.g.
  //   this service (at http://www.foo.bar)
  // would work.
  var followLinkRE = /(\s|^|\()((?:http|https|ftp):\/\/[^\s'")]+)(?:(?:')((?:[^'\n]|'\w)+)(?:')|(?:")([^"\n]+)(?:"))?(\s|$|\))/gm;
  function followLinks2HTML(str, followLinkClassString) {
    return str.replace(followLinkRE, function(
      a1, pre, link, singleQuotedText, doubleQuotedText, post, a7) {
      //eg.log("a1: ", a1, "pre: ", pre, "link: ", link, "singleQuotedText: ", singleQuotedText, "doubleQuotedText: ", doubleQuotedText, "post: ", post, "a7: ", a7);
      var text = singleQuotedText || doubleQuotedText;
      return pre
        + '<a href="' + link + '"'
        + (followLinkClassString
           ? ' class="' + followLinkClassString + '"'
           : '')
        +'>' + (text ? text : link) + "</a>"
        + post;
    });
  }
  // @1305670230335_1_1@
  var elementLinkRE = /(\s|^)@(\w*[\d_]{17,})@(\s|$)/gm;
  function elementLinks2HTML(str) {
    return str.replace(elementLinkRE, function(a1, pre, link, post, a5) {
      return pre
        + RYT.app.elementLinkStrHTML(link)
        + post;
    });
  }

  function str2HTML_step_4(str, argObj, stateObj) {
    var tmp = str;
    // basic markup
    tmp = str2HTML_basic(tmp, argObj);
    // handle quoted strings somehow
    tmp = handleQuotedStrings(tmp, argObj);
    // links
    if (argObj.followLinkClassString) {
      tmp = followLinks2HTML(tmp, argObj.followLinkClassString);
    }
    if (argObj.elementLinkClassString) {
      tmp = elementLinks2HTML(tmp);
    }
    return tmp;
  }

  // lower level conversion: also used by - higher level - str2HTMLList().
  // see http://www.regular-expressions.info/reference.html
  // *word*, also *[word]*
  var em1WordRE = /(?=\W)\*((\w|')+|\[(\w|')+\])\*(?=\W)/g;
  // !word!, also ![word]!
  var em2WordRE = /(?=\W)!((\w|')+|\[(\w|')+\])!(?=\W)/g;
  // *!word!* or !*word*!, also bracketed variants
  var emBothWordRE = /(?=\W)(?:!\*|\*!)((\w|')+|\[(\w|')+\])(?:!\*|\*!)(?=\W)/g;

  // "*** foo bar ***"
  var em1SentenceRE = /\*\*\*(([^\*]|[\*][^\*]|[\*][\*][^\*])+)\*\*\*/g;
  // "!!! foo bar !!!"
  var em2SentenceRE = /!!!(([^!]|[!][^!]|[!][!][^!])+)!!!/g;


  // <h6>
  var headerRE_1 = /\n?(.+)\n#{4,}\n/gm;
  var headerRE_2 = /\n?(.+)\n={4,}\n/gm;
  var headerRE_3 = /\n?(.+)\n-{4,}\n/gm;
  // .+\n-{4,}\n
  function str2HTML_step_3(str, argObj, stateObj) {
    // stateObj.inList: for not computing headers, etc. from inside lists
    // basic conversion before headers allows emphasized text and '<>' inside
    // them.
    var res = str2HTML_step_4(str, argObj, stateObj);
    if (! (argObj.simpleFlag || stateObj && stateObj.inList)) {
      res = res
      // \n needed for correctly matching following (<h*>s, etc.)
        .replace(headerRE_1, "<h1>$1</h1>\n")
        .replace(headerRE_2, "<h2>$1</h2>\n")
        .replace(headerRE_3, "<h3>$1</h3>\n")
        .replace(/\n?^\|-{4,}\|\n?/gm, "<hr />");
    }
    if (! argObj.noWhitespaceConversionFlag) {
      res = res // cstr like
      // rm \n after </h*>s to avoid too many <br>s
        .replace(/<\/h([1234])>\n+/gm, "</h$1>")// '4' for potential 4'th header
        .replace(/\n/g, "<br>")
        .replace(/\t/g, "\u00A0\u00A0");
    }
    return res;
  }
  function str2HTML_step_2(str, argObj, stateObj) {
    if (argObj.noEmbeddedHtmlFlag) {
      return str2HTML_step_3(str, argObj, stateObj);
    }
    var splitArr = str.split(/@@@(?!['"])/g);
    //eg.log(str, splitArr);
    return textHtmlArr2HTML(splitArr, str2HTML_step_3, argObj, stateObj);
  }
  // looks for lists; if they exist, they will be extracted and
  // converted at a higher level (1) than strs without lists.
  function str2HTML_step_1(str, argObj) {
    if (argObj.noConversionAtAllFlag) {
      return str;
    }
    if (argObj.noListConversionFlag) {
      return str2HTML_step_2(str, argObj);
    }
    var res = "";
    var sepArr = separateLists(str);
    var i, len;
    for (i = 0, len = sepArr.length; i < len; ++i) {
      res += i % 2 === 1
        ? str2HTMLList(sepArr[i], argObj)
        : str2HTML_step_2((argObj.noWhitespaceConversionFlag
                           ? sepArr[i]
                           : replaceExtraWSBy_nbsp(sepArr[i], 0)),
                          argObj);
    }
    return res;
  }
  // strArr contains to be converted strs, policy is:
  // - even entry -> to be converted by conversionFunc_even
  // - odd entry -> to be converted by conversionFunc_odd
  // policy for args: *if* used by conversionFunc
  // - argObj has to be {}, but
  // - stateObj can always be nil (callee has to check it).
  function strArr2HTML(strArr,
                       conversionFunc_even, argObj_even, stateObjOrNil_even,
                       conversionFunc_odd, argObj_odd, stateObjOrNil_odd) {
    var res = "", i, len;
    for (i = 0, len = strArr.length; i < len; ++i) {
      var str = strArr[i];
      res += i % 2
        ? conversionFunc_odd(str, argObj_odd, stateObjOrNil_odd)
        : conversionFunc_even(str, argObj_even, stateObjOrNil_even);
    }
    return res;
  }
  // textHtmlArr2HTML starts with to be converted entry, the policy is:
  // - even entry -> to be converted,
  // - odd entry -> treated as HTML taken unchanged.
  function textHtmlArr2HTML(strHtmlArr, conversionFunc, argObj, stateObj) {
    return strArr2HTML(strHtmlArr, conversionFunc, argObj, stateObj,
                       function(text) { return text; }, null, null);
  }

  var rawTextSplitRE = /^#@@@$\n?/gm;
  var embeddedHTMLSplitRE = /^@@@$\n?/gm;
  // Entry point for all text2HTML conversions.
  // argObj:
  // - { noConversionAtAllFlag:        -> as it says
  // - { noListConversionFlag: }       -> no conversion of '- ' lists
  // - { simpleFlag: }                 -> no conversion to <em>, <hr>
  // - { noWhitespaceConversionFlag: } -> no conversion of '\n\t'
  function str2HTML(textOrTextHTMLArr, argObjOrNil) {
    var argObj = argObjOrNil || { }; // simplifies conditions hereafter
    if (isArrayLike(textOrTextHTMLArr)) {
      return textHtmlArr2HTML(textOrTextHTMLArr, str2HTML_step_1, argObj);
    }
    if (argObj.noEmbeddedHtmlFlag) {
      return str2HTML_step_1(textOrTextHTMLArr, argObj);
    }
    var splitArr = textOrTextHTMLArr.split(rawTextSplitRE);
    if (splitArr.length > 1) {
      return strArr2HTML(splitArr,
                         str2HTML, argObj, null,
                         str2HTML_raw, null, null);
    }
    splitArr = textOrTextHTMLArr.split(embeddedHTMLSplitRE);
    return textHtmlArr2HTML(splitArr, str2HTML_step_1, argObj);
  }

  function embedHTML(strHTML) {
    return "@@@" + strHTML + "@@@";
  }

  // str util
  //
  function allSpaces2nbsp(str) {
    return str.replace(/ /gm, "\u00A0");
  }
  function leadingSpaces2nbsp(str) {
    return str.replace(/^ +/, function(leadingWS, b, c, d) {
      return eg.strFromCharLen("\u00A0", leadingWS.length);
    });
  }
  // removes *one* trailing NL
  function withoutTrailingNL(str) {
    if (! str) {
      return str;
    }
    var lastIx = str.length - 1;
    return (str.charAt(lastIx) === "\n")
      ? str.substr(0, lastIx)
      : str;
  }
  function firstLine(str) {
    return str.match(/[^\n]*/)[0];
  }
  function strMultiplied(str, multiplier) {
    var res = "";
    for (var i = 0; i < multiplier; ++i) {
      res += str;
    }
    return res;
  }
  function strFromCharLen(charStr, len) {
    eg.assert(charStr.length === 1);
    if (! len) {
      return "";
    }
    while (charStr.length < len) {
      charStr += charStr; // * 2
    }
    return charStr.length === len ? charStr : charStr.substr(0, len);
  }
  // only wraps at spaces
  function wordWrapIntoTwoLines(text, startPosOrNil) {
    // middlePos is ix of first char of second part for even sized texts
    // correct:
    //   var middlePos = Math.floor(text.length / 2);
    // , but also works with:
    var middlePos = text.length / 2;
    var bestPos = 0;
    var pos = startPosOrNil || 1;
    while (bestPos < middlePos // after middlePos it can only get worse
           && (pos = text.indexOf(' ', pos)) !== -1
           && Math.abs(pos - middlePos) <= Math.abs(bestPos - middlePos)) {
      bestPos = pos++; // nearer to middlePos (prefer *behind* for same dist)
    }
    return ( // replace ' ' by '\n'
      bestPos === 0
        ? text // no wrap pos found
        : text.substring(0, bestPos) + '\n' + text.substring(bestPos + 1)
    );
  }
  function strAscii2Unicode(str) {
    return str.replace(/->/g, "\u2192").replace(/<-/g, "\u2190");
  }

  // most from http://stackoverflow.com/questions/2161159/get-script-path (Andrew Clover and yannis)
  // find the base path of a script
  function getBasePathOfScript (name) {
    var nameLen = name.length;
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length; --i >= 0; ) {
      var src = scripts[i].src.split('?')[0]; // remove any ?query
      var l = src.length;
      if (src.substr(l - nameLen) === name) {
        // set a global propery here
        return src.substr(0, l - nameLen - 1);
      }
    }
  }

  //<a href="mailto:sr@evolgo.de?subject=[RYT feedback]">general feedback</a>
  function createMailtoHTMLString(text, emailUser, emailHost, subject, body) {
    var re = / /g;
    return '<a href="mailto:'
      + emailUser + '@' + emailHost
      + (subject
         ? '?subject=' + subject.replace(/ /g, "%20")
         : '')
      + (body
         ? ( (subject ? '&' : '?')
             + 'body=' + body.replace(/ /g, "%20") )
         : '')
      +'">'
      + text
      + '</a>';
  }

  function linkWithClassStringHTML(url, classString, textOrNil) {
    var text = textOrNil || url;
    return '<a href="' + url + '" class="' + classString + '">' + text + '</a>';
  }

  function repeatWithTimeout(doPred, busyPred,
                             action,
                             againPred,
                             timeouts) { // { busyTimeout:, repeatTimeout: }
    //eg.log("[repeatWithTimeout()] action: " + action);
    if (! doPred()) { // don't even start
      //eg.log("[repeatWithTimeout()] ! doPred()");
      return;
    }
    if (busyPred()) { // wait for not being busy
      setTimeout(bindThisNArgs(repeatWithTimeout, this,
                               doPred, busyPred,
                               action,
                               againPred,
                               timeouts),
                 timeouts.busyTimeout);
      return;
    }
    //eg.log("[repeatWithTimeout()] action()...");
    action();
    //eg.log("[repeatWithTimeout()] ...action()");
    if (! againPred()) { // do not repeat
      //eg.log("[repeatWithTimeout()] ! againPred()");
      return;
    }
    //eg.log("[repeatWithTimeout()] call again with timeout: ", timeouts.repeatTimeout);
    setTimeout(bindThisNArgs(repeatWithTimeout, this,
                             doPred, busyPred,
                             action,
                             againPred,
                             timeouts),
               timeouts.repeatTimeout);
  } // repeatWithTimeout()

  // Timeout is needed for getting back/forward browser buttons work; just interrupting (0) seems to
  // be OK. Without timeout it has redirect semantics.
  function goto_URL(url) {
    setTimeout(function(){ window.location.href = url; }, 0);
  }
  function redirect_URL(url) {
    window.location.replace(url);
  }


  // Exports
  //

  // logging exports above

  // public shared vars
  eg.shared = eg.shared || {}; // could also be initialized elsewhere
  eg.shared.productionMode = false;

  // very basic
  eg.returnTrueFunc = returnTrueFunc;
  eg.returnFalseFunc = returnFalseFunc;

  // props
  //
  eg.numOfProps = numOfProps_fast;
  eg.numOfProps_alt = numOfProps_slow;
  eg.numOfOwnProps = numOfOwnProps_fast;
  eg.numOfOwnProps_alt = numOfOwnProps_slow;

  eg.copyProps = copyProps;
  eg.copyMissingProps = copyMissingProps;
  eg.copyOwnProps = copyOwnProps;
  eg.cloneProps = cloneProps;
  eg.cloneOwnProps = cloneOwnProps;
  eg.hasProps = hasProps;
  eg.hasOwnProps = hasOwnProps;
  //
  eg.propsSame = propsSame;
  eg.propsSameDeep = propsSameDeep;
  //
  eg.selectPropsByKeysArr = selectPropsByKeysArr;
  // there may be val conflicts...
  eg.propsUnion = propsUnion;
  eg.propsIntersection = propsIntersection;
  eg.propsSub = propsSub;
  // prop modification (inclusive delete of props)
  eg.propOfObjByPath = propOfObjByPath;
  eg.modifyProps = modifyProps;
  eg.modifyPropsByPath = modifyPropsByPath;

  // Array functions
  eg.arrDetect = arrDetect;
  eg.arrContains = arrContains;
  eg.arrVals2ObjKeysNVals = arrVals2ObjKeysNVals;

  // Array-like object functions
  //
  eg.forEach = forEach;
  eg.forEachOwn = forEachOwn;
  //
  eg.andFilterPredicate = andFilterPredicate;
  eg.orFilterPredicate = orFilterPredicate;
  //
  eg.some = some; // O -> bool
  eg.someOwn = someOwn; // O -> bool
  eg.detect = detect; // O -> val
  eg.detectOwn = detectOwn; // O -> val
  eg.inject = inject; // O -> val
  //
  //
  // new versions uses eg.forEach(): speed to be tested
  eg.old_filter2props = old_filter2props;
  eg.new_filter2props = new_filter2props;
  eg.filter2props = filter2props;

  eg.filterOwn2props = filterOwn2props;
  eg.filterVals2arr = filterVals2arr;
  eg.filterOwnVals2arr = filterOwnVals2arr;
  //
  eg.map2vals = map2vals; // O -> O
  eg.map2keys = map2keys; // O -> O
  eg.mapOwn2vals = mapOwn2vals;// O -> O

  eg.old_map2arr = old_map2arr;
  eg.new_map2arr = new_map2arr;
  eg.map2arr = map2arr;

  eg.mapOwn2arr = mapOwn2arr;

  //
  //eg.mapA = mapA; // test
  //
  eg.filterMap2vals = filterMap2vals; // O -> O
  eg.filterMapOwn2vals = filterMapOwn2vals; // O -> O
  eg.filterMap2arr = filterMap2arr;
  eg.filterMapOwn2arr = filterMapOwn2arr;

  // shortcuts; all are O -> O
  eg.filter = eg.filter2props;
  eg.filterOwn = eg.filterOwn2props;
  eg.map = eg.map2vals;
  eg.mapOwn = eg.mapOwn2vals;
  eg.filterMap = filterMap2vals;
  eg.filterMapOwn = filterMapOwn2vals;

  // func creation
  eg.applyFunc = applyFunc;
  eg.mapReduceFunc = mapReduceFunc;

  // object2array: associations, keys, vals;
  // all are O -> A.
  eg.associations = associations;
  eg.ownAssociations = ownAssociations;
  eg.keys = keys;
  eg.ownKeys = ownKeys;
  eg.vals = vals;
  eg.ownVals = ownVals;

  eg.create = eg.create || Object.create; //TODO

  eg.bindAsEventListener = bindAsEventListener;
  eg.bindThis = bindThis;
  eg.$A = $A;
  eg.bindThisNArgs = bindThisNArgs;

  // function composition
  eg.ifThenElse = ifThenElse;

  // browser agnostic event handling
  eg.stopPropagation = stopPropagation;
  eg.preventDefault = preventDefault;
  eg.stopPropagationPreventDefault = stopPropagationPreventDefault;
  eg.targetWithPosition = targetWithPosition;
  eg.mouseoverFrom = mouseoverFrom;
  eg.mouseoutTo = mouseoutTo;
  // event handlers
  eg.eatThemEventHandler = eatThemEventHandler;
  eg.DebugEventHandler = DebugEventHandler;
  eg.makeEatThemEventHandler = makeEatThemEventHandler;

  // Exceptions
  eg.AssertException = AssertException;

  // Misc
  eg.OSet = OSet;
  eg.Set = OSet;
  eg.Channel = Channel;
  eg.BatchChannel = BatchChannel;

  // utils
  // type checks
  eg.isUndefined = isUndefined;
  eg.isNull = isNull;
  // standard
  eg.isFunction = isFunction;
  eg.isObject = isObject; // aliased below
  eg.isBoolean = isBoolean;
  eg.isString = isString;
  eg.isNumber = isNumber;
  eg.isRegExp = isRegExp;
  // 'object' null variants
  eg.isObjectOrNull = isObject;         // alias: null is 'object' ..
  eg.isObjectNotNull = isObjectNotNull; // .. filter it out here.
  eg.isObjectNotNullNotRegExp = isObjectNotNullNotRegExp;// RegExp is 'object'
  eg.isProper = isObjectNotNullNotRegExp; // shortcut

  // for checking optional params (after last given arg)
  eg.isNil = isNil;
  eg.isNilOrFunction = isNilOrFunction;
  eg.isNilOrObject = isNilOrObject;
  eg.isNilOrBoolean = isNilOrBoolean;
  eg.isNilOrString = isNilOrString;
  eg.isNilOrNumber = isNilOrNumber;
  // for checking mandatory params with null allowed as val
  eg.isNullOrFunction = isNullOrFunction;
  eg.isNullOrObject = isObject; // alias
  eg.isNullOrBoolean = isNullOrBoolean;
  eg.isNullOrString = isNullOrString;
  eg.isNullOrNumber = isNullOrNumber;

  eg.isOneOfNextArgs = isOneOfNextArgs;
  eg.isArrayLike = isArrayLike;

  // assert
  eg.assert = assert;
  eg.assertThrow = assertThrow;

  // parsing
  eg.getURLVars = getUrlVars;

  // str2HTML
  eg.embeddedHTMLSplitRE = embeddedHTMLSplitRE;
  eg.rawTextSplitRE = rawTextSplitRE;
  //
  eg.str2HTMLBasic = str2HTMLBasic;
  eg.str2HTML = str2HTML;
  eg.embedHTML = embedHTML;

  // str util
  eg.allSpaces2nbsp = allSpaces2nbsp;
  eg.leadingSpaces2nbsp = leadingSpaces2nbsp;
  eg.withoutTrailingNL = withoutTrailingNL;
  eg.firstLine = firstLine;
  eg.strMultiplied = strMultiplied;
  eg.strFromCharLen = strFromCharLen;
  eg.wordWrapIntoTwoLines = wordWrapIntoTwoLines;
  eg.strAscii2Unicode = strAscii2Unicode;

  // util
  eg.localDateTimeString = localDateTimeString;
  eg.getBasePathOfScript = getBasePathOfScript;
  eg.createMailtoHTMLString = createMailtoHTMLString;
  eg.linkWithClassStringHTML = linkWithClassStringHTML;

  eg.repeatWithTimeout = repeatWithTimeout;

  eg.redirect_URL = redirect_URL;
  eg.goto_URL = goto_URL;

  // experimental
  function foo() {
    eg.log("foo() this:", this);
  }
  eg.foo = foo;
  eg.bar = function () {
    eg.log("bar() this:", this);
    baz();
  };
  function baz () {
    eg.log("baz() this:", this);
  }
  function Fool() {
    this.baz = baz;
  }
  eg.Fool = Fool;

  eg.followLinks2HTML = followLinks2HTML;

}(EvolGo));
