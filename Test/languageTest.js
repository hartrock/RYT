<!-- with jquery: -->
<!-- $(document).ready(function(){ -->
<!-- without jquery: -->
window.onload = (function(){
/*
module("name");
  test("name", function() {
    ok( arg, "commentToOK"
        + " | ok( arg ) |" );
    strictEqual( 2args, "commentToStrictEqual"
                 + " | strictEqual( 2args ) |" );
  });
*/



module("Misc");

  test("JSON.stringify() with replacer", function() {
    var undef;
    var foo = { one:1, two:2, three:undef };
    function replacer(key, value) {
      if (key === 'one') {
        return true;
      }
      if (typeof value === 'undefined') {
        return null;
      }
      return value;
    }
    var res = JSON.stringify(foo, replacer);
    var expectedStr = '{"one":true,"two":2,"three":null}';
    strictEqual( res, expectedStr, "replacer func works (bug in FF 3.6.10)"
                 + " | strictEqual( res, " + JSON.stringify(expectedStr) + " ) |" );
  });

  test("bool * num", function() {
    strictEqual( true * 2, 2, ""
                 + " | strictEqual( true * 2, 2 ) |" );
    strictEqual( false * 2, 0, ""
                 + " | strictEqual( false * 2, 0 ) |" );
    
  });
  test("try to change func param", function() {
    var v1 = 0;
    var v2 = 1;
    var p = v1;
    function changeParam(p) {
      p = v2;
    }
    strictEqual( p, v1, "call by (ptr or basic) value: param not changed outside func"
                 + " | strictEqual( p, v1 ) |" );
  });

/* // does not work with qunit (gives SyntaxError ex)
// Exception tests with qunit seem to be impossible!
  function testEx() {
    try {
      JSON.parse('');
      return false; // shouldn't be reached
    } catch (e) {
      //ok ( true, "e: " + e );
      return true;
    }
  }
*/
  test("JSON.parse()", function() {
    strictEqual( JSON.parse(null), null, ""
                 + " | strictEqual( JSON.parse(null), null ) |" );
    deepEqual( JSON.parse('[]'), [], ""
               + " | deepEqual( JSON.parse('[]'), [] ) |" );
    strictEqual( JSON.parse('true'), true, ""
                 + " | strictEqual( JSON.parse('true'), true ) |" );
    deepEqual( JSON.parse('{}'), {}, ""
               + " | deepEqual( JSON.parse('{}'), {} ) |" );
  });


module("setTimeout()");
  var str;
  function cb1() {
    str += " cb1()";
    console.log("[cb1] " + str);
  }
  function cb2() {
    str += " cb2()";
    console.log("[cb2] " + str);
  }
  test("setTimeout(,0)", function() {
    var timeout = 0;
    str = "before callback";
    console.log("setTimeout(cb1, " + timeout + ")");
    setTimeout(cb1, timeout);
    console.log("setTimeout(cb2, " + timeout + ")");
    setTimeout(cb2, timeout);
    strictEqual( str, 'before callback',
                 "guarantee that setTimeout() with zero timeout does *not* directly call callback"
                 + " (str will be changed by callbacks)"
                 + " | strictEqual( str, 'before callback' ) |" );
  });

module("operator speed")

  test("pure loop speed", function() {
    var loops = 1000000;
    ok ( true, "loops: " + loops );
    var timers = [];
    function loop(timerName) {
      var i, timer;
      timer = new Timer(timerName);
      timers.push(timer);
      timer.start();
      for (i = 0; i < loops; ++i) {
        // do nothing
      }
      timer.stop();
    }
    loop("loop 1. run");
    loop("loop 2. run");
    stats(timers);
  });

  test("access", function() {
    var loops = 1000000;
    ok ( true, "loops: " + loops );
    var i;
    var prop = "prop";
    var obj = { };
    obj.prop = 0;
    var timers = [], timer;

    timer = new Timer("access of obj.prop");
    timers.push(timer);
    timer.start();
    for (i = 0; i < loops; ++i) {
      obj.prop;
    }
    timer.stop();

    timer = new Timer("access of obj[prop]");
    timers.push(timer);
    timer.start();
    for (i = 0; i < loops; ++i) {
      obj[prop];
    }
    timer.stop();

    timer = new Timer("assign to obj.prop");
    timers.push(timer);
    timer.start();
    for (i = 0; i < loops; ++i) {
      obj.prop = i;
    }
    timer.stop();

    timer = new Timer("assign to obj[prop]");
    timers.push(timer);
    timer.start();
    for (i = 0; i < loops; ++i) {
      obj[prop] = i;
    }
    timer.stop();

    stats(timers);
  });

  test("*crement times compared", function () {
    var numOfCrements = 1000000;
    var deviationLimit = 1/5;
    var timers = [];

    ok ( true, "crements: " + numOfCrements );

    function t1() {
      var a,b,c,d,e,f,g,h;
      a = b = c = d = e = f = g = h = 0;
      var i = 0, end = numOfCrements;
      var timer = new Timer("pre increment");
      timers.push(timer);
      timer.start();
      for (; i < end; ++i) {
        ++a; ++b; ++c; ++d; ++e; ++f; ++g; ++h;
      }
      timer.stop();
      ok ( true, timer.name );
    }
    function t2() {
      var a,b,c,d,e,f,g,h;
      a = b = c = d = e = f = g = h = 0;
      var i = 0, end = numOfCrements;
      var timer = new Timer("post increment");
      timers.push(timer);
      timer.start();
      for (; i < end; ++i) {
        a++; b++; c++; d++; e++; f++; g++; h++;
      }
      timer.stop();
      ok ( true, timer.name );
    }
    function t3() {
      var a,b,c,d,e,f,g,h;
      a = b = c = d = e = f = g = h = numOfCrements;
      var i = 0, end = numOfCrements;
      var timer = new Timer("pre decrement");
      timers.push(timer);
      timer.start();
      for (; i < end; ++i) {
        --a; --b; --c; --d; --e; --f; --g; --h;
      }
      timer.stop();
      ok ( true, timer.name );
    }
    function t4() {
      var a,b,c,d,e,f,g,h;
      a = b = c = d = e = f = g = h = numOfCrements;
      var i = 0, end = numOfCrements;
      var timer = new Timer("post decrement");
      timers.push(timer);
      timer.start();
      for (; i < end; ++i) {
        a--; b--; c--; d--; e--; f--; g--; h--;
      }
      timer.stop();
      ok ( true, timer.name );
    }
    t1(); t2(); t3(); t4();
    stats(timers, deviationLimit);
  });


module("Call chain");
  function getStack(){
    var caller = arguments.callee.caller;
    var stack = "Stack = ";
    var limit = 10; // limit potentially infinite recursion
    var count = 0;
    while (caller && count++ < limit){
      var args = " ";
      for (var i = 0; i < caller.arguments.length; ++i) {
        args += caller.arguments[i]; args += " ";
      }
      stack += "-->"+caller.name+"("+args+")";
      caller = caller.arguments.callee.caller;
    };
    return stack;
  }

  function recFunc(count) {
    //count && recFunc(count - 1);
    console.log("recFunc: ", getStack());
    if (count) {
      recFunc(count - 1);
    }
  }
  function outerFunc() {
    function innerFunc() {
      console.log("innerFunc", "this: ", this, "innerFunc.caller :", innerFunc.caller, getStack());
    }
    console.log("outerFunc", "this: ", this, "outerFunc.caller :", outerFunc.caller, getStack());
    innerFunc();
  }
  test("call outerFunc", function() {
    outerFunc();
    ok (true, "outerFunc() called");
  });

  test("call outerFunc via obj prop", function() {
    var obj = { 'func': outerFunc };
    obj.func();
    ok (true, "obj.func() called");
  });

  test("recursive func", function() {
    recFunc(12);
    ok( true, "recFunc(12)" );
  });

  //TODO: interesting for egBase.js?
  function numOfProperties(obj) {
    var count = 0;
    for (var prop in obj) {
        ++count;
    }
    return count;
  }
  function numOfOwnProperties(obj) {
    var count = 0;
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        ++count;
      }
    }
    return count;
  }
  function numOfOwnDefinedProperties(obj) {
    var count = 0;
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop) && obj[prop] !== undefined) {
        ++count;
      }
    }
    return count;
  }
  function propertiesString(obj) {
    var str = "";
    for (var prop in obj) {
      str += prop; str += " ";
    }
    return str;
  }
  var ownPropertiesString = function (obj) {
    var str = "";
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        str += prop; str += " ";
      }
    }
    return str;
  }

  function ObjectWithPrototype() {
  }
  function createObjectWithPrototype() {
    return new ObjectWithPrototype();
  }
  ObjectWithPrototype.prototype.toString = function() {
    return "ObjectWithPrototype";
  }

  var dontEnumPropsInObjectProtoArray
    = [ 'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf',
       'propertyIsEnumerable', 'constructor' ];
  var dontEnumPropsInFunctionProtoArray
    = [ 'prototype', 'call', 'apply' ];

  function testCountDontEnumProps(objDescriptionString, furtherComment,
                                  obj, dontEnumPropsArray,
                                  expectedAsItIs, expectedAfterSettingProps) {
    var info
      = dontEnumPropsArray + " (" + dontEnumPropsArray.length + ") don't enum props in "
      + objDescriptionString + furtherComment;
    test(info, function() {
      var countProps = numOfProperties(obj);
      console.log(propertiesString(obj));
      console.log(ownPropertiesString(obj));
      equals(countProps, expectedAsItIs, objDescriptionString + " as it is"
             + " | equals(countProps, expectedAsItIs) |" );
      for (var i = 0; i < dontEnumPropsArray.length; ++i) {
        obj[dontEnumPropsArray[i]] = obj[dontEnumPropsArray[i]];
      }
      countProps = numOfProperties(obj);
      console.log(propertiesString(obj));
      console.log(ownPropertiesString(obj));
      equals( countProps, expectedAfterSettingProps,
              "props in dontEnumPropsArray copied into " + objDescriptionString
              + " | equals( countProps, expectedAfterSettingProps ) |" );
    });
  };


module("Object");
  testCountDontEnumProps("{ }","", { },
                         dontEnumPropsInObjectProtoArray,
                         0,
                         dontEnumPropsInObjectProtoArray.length);
  testCountDontEnumProps("new ObjectWithPrototype()", " with toString()", new ObjectWithPrototype(),
                         dontEnumPropsInObjectProtoArray,
                         1, // expected toString()
                         dontEnumPropsInObjectProtoArray.length); // expected all
  testCountDontEnumProps("(function() { return 'foo'; })", " -> 'prototype' stays *not* enumerated (OK in FF 3.6.8, fails in FF 3.5.11!)",
                         (function() { return "foo"; }),
                         dontEnumPropsInFunctionProtoArray,
                         0,
                         dontEnumPropsInFunctionProtoArray.length
                         - 1); // 'prototype' stays non enumerated

  test("object without prototype", function() {
    var obj = { };
    strictEqual( obj.toString(), '[object Object]', ""
        + " | strictEqual( obj.toString(), '[object Object]' ) |" );
    strictEqual( JSON.stringify(obj), '{}', ""
        + " | strictEqual( JSON.stringify(obj), '{}' ) |" );
    ok( ! obj.hasOwnProperty('prototype'), ""
        + " | ok( ! obj.hasOwnProperty('prototype') ) |" );
    ok( ! obj.hasOwnProperty('constructor'), ""
        + " | ok( ! obj.hasOwnProperty('constructor') ) |" );
    ok( obj.constructor, ""
        + " | ok( obj.constructor ) |" );
    ok( obj.constructor.prototype, ""
        + " | ok( obj.constructor.prototype ) |" );
    ok( obj.constructor.prototype === Object.prototype, ""
        + " | ok( obj.constructor.prototype === Object.prototype ) |" );

    obj.constructor = "overwrittenConstructor";
    obj.prototype = "overwrittenPrototype";
    ok( obj.hasOwnProperty('prototype'), "try to overwrite in obj works"
        + " | ok( obj.hasOwnProperty('prototype') ) |" );
    ok( obj.hasOwnProperty('constructor'), "try to overwrite in obj works"
        + " | ok( obj.hasOwnProperty('constructor') ) |" );
  });
  test("setting Object.prototype.foo", function() {
    var obj = { };
    ok (! Object.prototype.foo, "! Object.prototype.foo");
    Object.prototype.foo = function () { return "foo"; };
    strictEqual( obj.foo(), 'foo',
                 "after setting Object.prototype.foo to custom foo()"
                 + " | strictEqual( obj.foo(), 'foo' ) |" );
    strictEqual( numOfProperties(obj), 1,
                 "properties in Object, after setting foo() in Object.prototype!"
                 + " | strictEqual( numOfProperties(obj), 1 ) |" );
    ok (! obj.hasOwnProperty('foo'), "but: | ! obj.hasOwnProperty('foo') |");
    delete(Object.prototype.foo);
    ok (! Object.prototype.foo, "after delete: | ! Object.prototype.foo |");
  });
  test("changing Object.prototype.toString", function() {
    var obj = { };
    ok (Object.prototype.toString, "Object.prototype.toString");
    strictEqual( obj.toString(), '[object Object]',
                 "before replacing Object.prototype.toString by custom toString()"
                 + " | strictEqual( obj.toString(), '[object Object]' ) |" );
    var default_toString = Object.prototype.toString;
    Object.prototype.toString = function () { return "foo"; };
    strictEqual( obj.toString(), 'foo',
                 "after replacing Object.prototype.toString by custom toString()"
                 + " | strictEqual( obj.toString(), 'foo' ) |" );
    strictEqual( numOfProperties(obj), 0,
                 "no properties in Object, even after changing toString() in Object.prototype!"
                 + " | strictEqual( numOfProperties(obj), 0 ) |" );
    Object.prototype.toString = default_toString;
    strictEqual( obj.toString(), '[object Object]',
                 "after resetting Object.prototype.toString to original one"
                 + " | strictEqual( obj.toString(), '[object Object]' ) |" );
  });
  test("object with prototype", function() {
    var objWithProto = new ObjectWithPrototype();
    strictEqual( numOfProperties(objWithProto), 1, "properties in ObjectWithPrototype!"
                 + " | strictEqual( numOfProperties(objWithProto), 1 ) |" );
    strictEqual( numOfOwnProperties(objWithProto), 0, "but: no own properties in ObjectWithPrototype!"
                 + " | strictEqual( numOfOwnProperties(objWithProto), 0 ) |" );
    ok( objWithProto.toString() === 'ObjectWithPrototype', ""
        + " | ok( objWithProto.toString() === 'ObjectWithPrototype' ) |" );
    strictEqual( JSON.stringify(objWithProto), '{}', ""
        + " | strictEqual( JSON.stringify(objWithProto), '{}' ) |" );
    ok( ! objWithProto.hasOwnProperty('prototype'), ""
        + " | ok( ! objWithProto.hasOwnProperty('prototype') ) |" );
    ok( ! objWithProto.hasOwnProperty('constructor'), ""
        + " | ok( ! objWithProto.hasOwnProperty('constructor') ) |" );
    ok( objWithProto.constructor, ""
        + " | ok( objWithProto.constructor ) |" );
    ok( objWithProto.constructor.prototype, ""
        + " | ok( objWithProto.constructor.prototype ) |" );
    ok( objWithProto.constructor.prototype === ObjectWithPrototype.prototype, ""
        + " | ok( objWithProto.constructor.prototype === ObjectWithPrototype.prototype ) |" );
  });


module("String");

  test("quoting", function () {
    strictEqual( 'aString', "aString",
                 "quoting of strings does not affect comparisons"
                 + ": strictEqual( 'aString', "+'"aString" )');
    strictEqual( 'aString', "aString",
               "quoting of strings does not affect comparisons"
               + ": strictEqual( 'aString', "+'"aString" )');
  });


module("declared/undeclared, assigned/unassigned vars and global");
  test("var access", function() {
    var aDeclaredVar;
    ok (! aDeclaredVar, "declared unassigned var can be tested (but undeclared unassigned var not!)");
    undeclaredVar = undefined;
    ok (! undeclaredVar, "undeclared *assigned* var can be tested though (undeclaredVar = undefined);"
        + " it becomes global ..");
    ok( window.hasOwnProperty('undeclaredVar'), ".. a)"
        + " | ok( window.hasOwnProperty('undeclaredVar') ) |" );
    strictEqual( undeclaredVar, window.undeclaredVar, ".. b)"
                 + " | strictEqual( undeclaredVar, window.undeclaredVar ) |" );
  });

module("properties");
  test("deleting not existing prop", function() {
    var obj = { };
    delete(obj['notExistingProp']);
    ok (true, "| delete(obj['notExistingProp']) | succeeded");
  });
  test("obj length", function() {
    var obj = { };
    ok( obj.length === undefined,
        "obj: " + JSON.stringify(obj)
        + " | ok( obj.length === undefined ) |" );
    obj['prop'] = "aProp";
    ok( obj.length === undefined,
        "assigning a prop does not change length of obj " + JSON.stringify(obj)
        + " | ok( obj.length === undefined ) |" );
    var objWithProto = new ObjectWithPrototype();
    ok( objWithProto.length === undefined,
        "objWithProto: " + JSON.stringify(objWithProto)
        + " | ok( objWithProto.length === undefined ) |" );
    objWithProto['prop'] = "aProp";
    ok( objWithProto.length === undefined,
        "assigning a prop does not change length of objWithProto " + JSON.stringify(objWithProto)
        + " | ok( objWithProto.length === undefined ) |" );
  });
  test("mere access (var val = obj.['prop']) does *not* create prop, but (obj['prop'] = undefined) does", function() {
    var obj = { };
    var val = obj['prop'];
    strictEqual( obj['prop'], undefined,
                 "property is undefined in obj " + JSON.stringify(obj)
                 + " | strictEqual( obj['prop'], undefined ) |" );
    ok( ! obj.hasOwnProperty('prop'), ""
        + "| ok( ! obj.hasOwnProperty('prop') ) |" );
    obj['prop'] = undefined;
    strictEqual( obj['prop'], undefined,
                 "[after assigning undefined] property remains undefined in obj " + JSON.stringify(obj)
                 + " | strictEqual( obj['prop'], undefined ) |" );
    ok( obj.hasOwnProperty('prop'), "[after assigning undefined] but it is a prop now:"
        + " | ok( obj.hasOwnProperty('prop') ) |" );
  });
  test("undefining properties", function() {
    var obj = { };
    obj['prop'] = "val";
    strictEqual( obj['prop'], 'val', "property has val " + JSON.stringify(obj['prop'])
                 + " in obj " + JSON.stringify(obj)
                 + " | strictEqual( obj['prop'], 'val' ) |" );
    ok( obj.hasOwnProperty('prop'), ""
        + "| ok( obj.hasOwnProperty('prop') ) |" );
    obj['prop'] = undefined;
    strictEqual( obj['prop'], undefined,
                 "a) assigning undefined to prop leads to"
                 + " | strictEqual( obj['prop'], undefined ) |" );
    ok( obj.hasOwnProperty('prop'), "b) but not to deleted prop:"
        + " | ok( obj.hasOwnProperty('prop') ) |" );
    delete( obj['prop'] );
    ok( ! obj.hasOwnProperty('prop'), "c) but after delete(obj['prop'])"
        + " | ok( ! obj.hasOwnProperty('prop') ) |" );
  });
  test("prop names", function () {
    function setProp(obj, key, val) {
      obj[key] = val;
    };
    function checkProp(obje, key, val) {
      deepEqual (obj[key], val, "checkProp(): key: '" + key + "', val");
      deepEqual( obj[key], val, "[deepEqual( obj[key], val )] " + "'"+key+"'" );
    }
    var obj = { };
    var props = ['eins', 'zwei', 'drei',
                 'sr@evolgo.de:4711', 'prototype', '#77',
                 ''];
    var vals = ["one", "two", "three",
                "sr@evolgo.de:4711 val", "prototype val", "#77 val",
                "empty string as prop name"];
    for (var i = 0, len = props.length; i < len; ++i) {
      setProp(obj, props[i], vals[i]);
    }
    for (var i = 0, len = props.length; i < len; ++i) {
      checkProp(obj, props[i], vals[i]);
    }
  });


module("numOf*Properties()");
  test("numOfProperties()", function() {
    var obj = { };
    strictEqual( numOfProperties(obj), 0, "no properties for empty object"
                 + " | strictEqual( numOfProperties(obj), 0 ) |" );
  });
  test("numOfOwnProperties(), numOfOwnDefinedProperties()", function() {
    var obj = { };
    ok( numOfOwnProperties(obj) === 0, "obj: " + JSON.stringify(obj)
        + " | ok( numOfOwnProperties(obj) === 0 ) |" );
    obj['prop'] = "aProp";
    ok( numOfOwnProperties(obj) === 1, "obj: " + JSON.stringify(obj)
        + " | ok( numOfOwnProperties(obj) === 1 ) |" );
    obj['prop'] = undefined;
    ok( numOfOwnProperties(obj) === 1, "after (obj['prop'] = undefined), obj: " + JSON.stringify(obj)
        + " | ok( numOfOwnProperties(obj) === 1 ) |" );
    ok( numOfOwnDefinedProperties(obj) === 0, "after (obj['prop'] = undefined), obj: " + JSON.stringify(obj)
        + " | ok( numOfOwnDefinedProperties(obj) === 0 ) |" );
    delete(obj['prop']);
    ok( numOfOwnProperties(obj) === 0, "after (delete(obj['prop'])), obj: " + JSON.stringify(obj)
        + " | ok( numOfOwnProperties(obj) === 0 ) |" );
    var objWithProto = new ObjectWithPrototype();
    ok( numOfOwnProperties(objWithProto) === 0, ""
        + " | ok( numOfOwnProperties(objWithProto) === 0 ) |" );
  });


module("Language behavior");

  test("boolean", function() {
    strictEqual( null && true, null, ""
                 + " | strictEqual( null && true, null ) |" );
    strictEqual( null === null ? false : true, false, ""
                 + " | strictEqual( null === null ? false : true, false ) |" );
  });


module("Language Capabilities");

  test("Array", function() {
    ok ( Array.map, "Array.map : " + Array.map );
    ok ( Array.filter, "Array.filter : " + Array.filter );
  });
  test("Object", function() {
    ok ( Object.toString, "Object.toString : " + Object.toString );
    ok ( Object.create, "[newer browsers] Object.create : " + Object.create );
    ok ( Object.defineProperty, "[newer browsers] Object.defineProperty : " + Object.defineProperty );
  });

 }); // window.onload()
