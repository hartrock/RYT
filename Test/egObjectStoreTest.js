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

var eg = EvolGo;
//eg.assert = eg.assertThrow; // needed for assert() testing

function equalObjectMaps(om_1, om_2) {
  if (! eg.keysSame(om_1, om_2)) {
    return false;
  }
  for (var key in om_1) {
    var obj_1 = om_1[key], obj_2 = om_2[key];
    if (! eg.isObject(obj_1)) { // may be c_delete string
      if (obj_1 !== obj_2) {
        return false;
      }
    } else { // obj_1 is object: compare with props of obj_2
      if (! eg.isObject(obj_2)) {
        return false;
      }
      if (! eg.propsSame(obj_1, obj_2)) {
        return false;
      }
    }
  }
  return true;
}

module("ObjectStore");

  var os, om, actionS, om_next;
  // useful for reinit
  function createOS() {
    var newOne = eg.createObjectStore();
    os = newOne;
    om = os.getObjectMap();
    actionS = os.getActionS();
    os.setDebug(true);
    return os;
  }

  test("empty ObjectStore", function(){
    createOS();
    om_next = {};
    ok(
      eg.propsSameDeep(om, om_next),
      "propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    strictEqual( actionS.length, 0, "actionS.length" );
  });

  test("batch name change", function(){
    var originalAssert = eg.assert;
    eg.assert = eg.assertThrow; // needed for assert() testing
    os.openBatch('test', 'from test');
    os.closeBatch('test', 'from test');
    ok( true, "open/close batch 'test'" );
    os.openBatch('test', 'from test');
    raises(
      function(){
        os.closeBatch("test2");
      },
      eg.AssertException,
      "closeBatch(): batch name change not allowed"
    )
    eg.assert = originalAssert;
    createOS(); // reinit, because we don't know about inner state after Ex
  });

  test("hasOpenBatch()", function(){
    ok( ! os.hasOpenBatch(), "before openBatch()! os.hasOpenBatch()" );
    strictEqual( actionS.length, 0, "actionS.length" );
    os.openBatch("test", 'from test');
    ok( os.hasOpenBatch(), "after 1. openBatch(): os.hasOpenBatch()" );
    os.openBatch("test");
    ok( os.hasOpenBatch(), "after 2. openBatch(): os.hasOpenBatch()" );
    os.closeBatch("test");
    ok( os.hasOpenBatch(), "after 1. closeBatch(): os.hasOpenBatch()" );
    os.closeBatch("test", 'from test');
    ok( ! os.hasOpenBatch(), "after 2. closeBatch(): ! os.hasOpenBatch()" );
    strictEqual( actionS.length, 0, "actionS.length" );
  });

  test("create()", function(){
    os.openBatch("test", 'from test');
    os.doCreate('id_one', { name: "one", first: 1, second: 2, third: 3 });
    om_next = {
      'id_one': { name: "one", first: 1, second: 2, third: 3 },
    };
    ok(
      eg.propsSameDeep(om, om_next),
      "propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    os.doCreate('id_two', { name: "two", first: 11, second: 22, third: 33 });
    om_next = {
      'id_one': { name: "one", first:  1, second:  2, third:  3 },
      'id_two': { name: "two", first: 11, second: 22, third: 33 },
    };
    ok(
      eg.propsSameDeep(om, om_next),
      "propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    os.doCreate('id_three', { name: "three", first:111, second: 222, third: 333 });
    om_next = {
      'id_one':   { name: "one",   first:   1, second:   2, third:   3 },
      'id_two':   { name: "two",   first:  11, second:  22, third:  33 },
      'id_three': { name: "three", first: 111, second: 222, third: 333 }
    };
    ok(
      eg.propsSameDeep(om, om_next),
      "propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    strictEqual( actionS.length, 0, "actionS.length before closeBatch()" );
    os.closeBatch("test", 'from test');
    strictEqual( actionS.length, 1, "actionS.length after closeBatch()" );
  });

  var storeForUndo, storeForRedo; // needed for und/redo test below

  test("change(): change prop", function(){
    os.openBatch("test", 'from test');

    om_next = {
      'id_one':   { name: "changed one", first:   1, second:   2, third:   3 },
      'id_two':   { name: "two",         first:  11, second:  22, third:  33 },
      'id_three': { name: "three",       first: 111, second: 222, third: 333 }
    };
    os.doChange('id_one', { name: "changed one" });
    ok(
      eg.propsSameDeep(om, om_next),
      "change prop: propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    om_next = {
      'id_one':   { name: "changed one", first:   1, second:  2,  third:   3 },
      'id_two':   { name: "two",         /* del */   second:  22  /* del */  },
      'id_three': { name: "three",       first: 111, second: 222, third: 333 }
    };
    os.doChange('id_two', { first:null, third:undefined });
    ok(
      eg.propsSameDeep(om, om_next),
      "delete prop: propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    om_next = {
      'id_one':   { name: "changed one", first:   1, second:  2,  third:   3 },
      'id_two':   { name: "two",         /* del */   second:  22  /* del */  },
      'id_three': { name: "three",       first: 111, second: 222, third: 333,
                    newProp: "new" }
    };
    os.doChange('id_three', { newProp:"new" });
    ok(
      eg.propsSameDeep(om, om_next),
      "create prop: propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    storeForUndo = om_next;

    os.closeBatch("test", 'from test');
  });
  
  test("delete()", function(){
    os.openBatch("test", 'from test');
    os.doDelete('id_two');
    om_next = {
      'id_one':   { name: "changed one", first:   1, second:   2, third:   3 },
      'id_three': { name: "three",       first: 111, second: 222, third: 333,
                    newProp: "new" }
    };
    ok(
      eg.propsSameDeep(om, om_next),
      "propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    storeForRedo = om_next;
    os.closeBatch("test", 'from test');
  });

  test("undo/redo", function(){
    om_next = storeForUndo;
    os.undo("test undo");
    ok(
      eg.propsSameDeep(om, om_next),
      "undo | propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    om_next = storeForRedo;
    os.redo("test redo");
    ok(
      eg.propsSameDeep(om, om_next),
      "redo | propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
  });

  test("undo then create and go back before undo", function(){
    om_next = storeForUndo;
    os.undo();
    // now storeForUndo reached
    var newObj = { name: "new one", prop_1: "Hello!" }, newId = 'id_new';
    var addProps = {}; addProps[newId] = newObj;
    om_next = eg.propsUnion(storeForUndo, addProps);
    os.openBatch("undo then create test", 'from test');
    os.doCreate(newId, newObj);
    os.closeBatch("undo then create test", 'from test');
    ok(
      eg.propsSameDeep(om, om_next),
      "create after undo | propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    om_next = storeForUndo;
    os.undo();
    ok(
      eg.propsSameDeep(om, om_next),
      "undo after create after undo | propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    om_next = storeForRedo; // before undo
    os.undo();
    ok(
      eg.propsSameDeep(om, om_next),
      "undo after undo after create after undo | propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
  });

  test("cancelBatch()", function(){
    // no change: om_next = storeForRedo;
    var numActionS = actionS.length;
    os.openBatch("test", 'from test');
    os.doCreate('id_four', { name: "four", first: 1111, second: 2222, third: 3333, fourth: 4444 });
    os.cancelBatch();
    ok(
      eg.propsSameDeep(om, om_next),
      "cancelBatch | propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(om_next) + ")"
    );
    ok ( ! os.hasOpenBatch(), "! os.hasOpenBatch()" );
    strictEqual( actionS.length, numActionS, "actionS.length" );
  });

  test("condenseAll()", function(){
    var os = createOS();
    fillOS(os);
    ok( os.getActionS().length > 1, "os.getActions() > 1 (being "
        + os.getActionS().length + ")" );
    eg.log("before condenseAll()", actionS);
    os.condenseAll();
    eg.log("after condenseAll()", actionS);
    strictEqual( os.getActionS().length, 0, "os.getActions().length" );
  });

  test("channel", function(){
    var os = createOS();
    fillOS(os);
    ok( os.channel, "channel exists" );
    var message;
    var trans;
    var listener = {
      receiveFrom: function(msg, sender) {
        eg.log(msg, sender);
        message = msg;
        if (msg.transaction) {
          trans = msg.transaction;
        }
      }
    }
    os.channel.addListener(listener);

    var numOmKeysBeforeCreation = eg.numOfProps(om);
    os.undo("test");
    ok(
      ! eg.hasProps(trans.deleted.id2old) && ! eg.hasProps(trans.changed.id2new),
      "channel test | ! eg.hasProps(trans.deleted.id2old) && ! eg.hasProps(trans.changed.id2new)" );
    ok (
      eg.numOfProps(trans.created.id2new) === eg.numOfProps(om) - numOmKeysBeforeCreation,
      "channel test | eg.numOfProps(trans.created.id2new) === eg.numOfProps(om) - numOmKeysBeforeCreation" );
    os.redo("test");
    strictEqual(
      eg.numOfProps(trans.deleted), 1,
      "one deleted"
    );
    ok( 'id_two' in trans.deleted.id2old,
        "'id_two' in trans.deleted.id2old" );
    var props_deleted = trans.deleted.id2old['id_two'];
    var props_expected = { name: "two", second: 22, third: 33 };
    ok(
      eg.propsSameDeep(props_deleted, props_expected),
      "after deletion | propsSameDeep(" + JSON.stringify(props_deleted) + ", " + JSON.stringify(props_expected) + ")"
    );

  });

  test("actionSChannel: length, index", function(){
    var os = createOS();
    fillOS(os);
    ok( os.actionSChannel, "channel exists" );
    var listener = {
      receiveFrom: function(message, sender) {
        eg.log(message, sender);
        msg = message;
      }
    }
    os.actionSChannel.addListener(listener);
    var lengthBeforeUndo = actionS.length;
    os.undo("test");
    ok( msg.index === actionS.length - 1,
        "undo | msg.index === actionS.length - 1" );
    os.openBatch('actionSChannel test', 'from test');
    os.doCreate('key_actionSChannel test', { prop: 'ttt' });
    os.cancelBatch('actionSChannel test');
    ok( msg.index === actionS.length - 1,
        "create batch cancelled: no change | msg.index === actionS.length - 1" );
    os.openBatch('actionSChannel test', 'from test');
    os.doCreate('key_actionSChannel test', { prop: 'ttt' });
    os.closeBatch('actionSChannel test', 'from test');
    ok( msg.length === actionS.length && msg.length === lengthBeforeUndo + 2,
        "create batch closed: change: | msg.length === actionS.length && msg.length === lengthBeforeUndo + 2 (undo and create pushed)" );
    os.actionSChannel.removeListener(listener);
  });

  test("actionSChannel: marker", function(){
    var os = createOS();
    var msg;
    var listener = {
      receiveFrom: function(message, sender) {
        eg.log(message, sender);
        msg = message;
      }
    }
    os.actionSChannel.addListener(listener);
    var markerObj = { id: 'markerObj' };
    ok(
      ! eg.arrContains(os.markers, markerObj),
      "before adding marker: ! eg.arrContains(os.markers, markerObj)"
    );
    ok(
      ! os.justAfterMarker(),
      "before adding marker: ! os.justAfterMarker()"
    );
    ok(
      ! os.isMarkerAt(0),
      "before adding marker: ! os.isMarkerAt(0)"
    );
    ok(
      os.firstMarkerIndexOrNull() === null,
      "before adding marker: os.firstMarkerIndexOrNull() === null"
    );
    os.addMarker(markerObj, 'marker test');
    ok(
      msg.length && msg.actionS[0].marker === markerObj && msg.from === 'marker test',
      "msg.length && msg.actionS[0].marker === markerObj && msg.from === 'marker test'"
    );
    ok(
      eg.arrContains(os.markers, markerObj),
      "after adding marker: eg.arrContains(os.markers, markerObj)"
    );
    ok(
      os.justAfterMarker(),
      "after adding marker: os.justAfterMarker()"
    );
    ok(
      os.isMarkerAt(0),
      "after adding marker: os.isMarkerAt(0)"
    );
    ok(
      os.firstMarkerIndexOrNull() === 0,
      "after adding marker: os.firstMarkerIndexOrNull() === 0"
    );
    os.undo();
    ok(
      msg.index === 0 && msg.from === 'undo',
      "msg.index === 0 && msg.from === 'undo'"
    );
    ok(
      eg.arrContains(os.markers, markerObj),
      "after undo: eg.arrContains(os.markers, markerObj)"
    );
    ok(
      ! os.justAfterMarker(),
      "after undo: ! os.justAfterMarker()"
    );
    ok(
      os.isMarkerAt(0),
      "after undo: os.isMarkerAt(0)"
    );
    os.actionSChannel.removeListener(listener);
  });

  function fillOS(os) {
    os.openBatch('asData() test', 'from test')
    os.doCreate('id_one', { name: "one", first: 1, second: 2, third: 3 });
    os.doCreate('id_two', { name: "two", first: 11, second: 22, third: 33 });
    os.doCreate('id_three', { name: "three", first:111, second: 222, third: 333 });
    os.closeBatch('asData() test', 'from test')
    os.openBatch('asData() test', 'from test')
    os.doChange('id_one', { name: "changed one" });
    os.doChange('id_two', { first:undefined });
    os.doChange('id_three', { newProp:"new" });
    os.closeBatch('asData() test', 'from test')

    os.openBatch('asData() test', 'from test')
    os.doDelete('id_two');
    os.closeBatch('asData() test', 'from test')
  }
  var omAfterFill = {
    'id_one':   { name: "changed one", first:   1, second:   2, third:   3 },
    'id_three': { name: "three",       first: 111, second: 222, third: 333,
                  newProp: "new" }
  };

  test("asData()", function() {
    var os = createOS();
    fillOS(os);
    ok(
      eg.propsSameDeep(om, omAfterFill),
      "propsSameDeep(" + JSON.stringify(om) + ", " + JSON.stringify(omAfterFill) + ")"
    );
    var data = os.asData();
    eg.log(data);
    var dataRaw = JSON.parse(JSON.stringify(data));
    eg.log(dataRaw);
  });

  test("initFromData()", function() {
    var os = createOS();
    fillOS(os);
    var data = os.asData();
    function replacerStringify(key, val) {
      if (eg.isUndefined(val)) {
        return null;
      }
      return val;
    }
    var dataRaw = JSON.parse(JSON.stringify(data, replacerStringify));

    var os2 = createOS();
    os2.initFromData(dataRaw);
    eg.log(os, os.getObjectMap(), os.getActionS());
    eg.log(os2, os2.getObjectMap(), os2.getActionS());
    ok( eg.propsSameDeep(os.getObjectMap(), os2.getObjectMap()),
        "equal object maps" );
    ok(
      os.getActionS().length === os2.getActionS().length,
      "os.getActionS().length === os2.getActionS().length"
    );
  });

  test("condenseBetweenMarkers()", function(){
    var os = createOS();
    fillOS(os);
    os.addMarker({ id:'m1' });
    os.undo();
    os.addMarker({ id:'m2' });
    os.openBatch('condensBeforeMarkers() test', 'from test')
    os.doCreate('id_cbm1', { name: "one", first: 1, second: 2, third: 3 });
    os.closeBatch('condensBeforeMarkers() test', 'from test')
    os.openBatch('condensBeforeMarkers() test', 'from test')
    os.doCreate('id_cbm2', { name: "two", first: 11, second: 22, third: 33 });
    os.closeBatch('condensBeforeMarkers() test', 'from test')
    os.addMarker({ id:'m3' });
    os.openBatch('condensBeforeMarkers() test', 'from test')
    os.doCreate('id_cbm3', { name: "three", first:111, second: 222, third: 333 });
    os.closeBatch('condensBeforeMarkers() test', 'from test')
    os.openBatch('condensBeforeMarkers() test', 'from test')
    os.doCreate('id_cbm4', { name: "three", first:111, second: 222, third: 333 });
    os.closeBatch('condensBeforeMarkers() test', 'from test')

    os.condenseBetweenMarkers();
    ok(
      os.markers.length === 3,
      "os.markers.length === 3"
    );
    ok(
      actionS.length === 6,
      "actionS.length === 6 (1 + 0 + 1 transactions + 3 marker, 1 additional transactions (2 condensed)"
    );
  });

  test("objectMap manipulation callbacks", function(){
    var os = createOS();
    os.changeCB = function(id, oldProps, newProps) {
      eg.log("changeCB() id, oldProps, newProps:", id, oldProps, newProps);
    }
    os.createCB = function(id, newProps) {
      eg.log("createCB() id, newProps:", id, newProps);
    }
    os.deleteCB = function(id, oldProps) {
      eg.log("deleteCB() id, oldProps:", id, oldProps);
    }
    ok(
      os.applyCreate_callCount === 0 && os.applyChange_callCount === 0 && os.applyDelete_callCount === 0,
      "before manipulating OS: all callback counts are zero"
    );
    os.openBatch("test", 'from test');
    os.doCreate('id_one', { name: "one", first: 1, second: 2, third: 3 });
    ok(
      os.applyCreate_callCount === 1 && os.applyChange_callCount === 0 && os.applyDelete_callCount === 0,
      "after create(): os.applyCreate_callCount === 1 && os.applyChange_callCount === 0 && os.applyDelete_callCount === 0"
    );
    os.doCreate('id_two', { name: "two", first: 11, second: 22, third: 33 });
    ok(
      os.applyCreate_callCount === 2 && os.applyChange_callCount === 0 && os.applyDelete_callCount === 0,
      "after create(): os.applyCreate_callCount === 2 && os.applyChange_callCount === 0 && os.applyDelete_callCount === 0"
    );
    os.doChange('id_one', { name: "changed one" });
    ok(
      os.applyCreate_callCount === 2 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 0,
      "after change(): os.applyCreate_callCount === 2 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 0"
    );

    os.closeBatch("test", 'from test');
    ok(
      os.applyCreate_callCount === 2 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 0,
      "after closeBatch(): os.applyCreate_callCount === 2 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 0"
    );

    os.openBatch("test", 'from test');
    os.doDelete('id_two');
    ok(
      os.applyCreate_callCount === 2 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 1,
      "after delete(): os.applyCreate_callCount === 2 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 1"
    );
    os.closeBatch("test", 'from test');

    os.undo("objectMap manipulation callBacks test");
    ok(
      os.applyCreate_callCount === 3 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 1,
      "after undo(): os.applyCreate_callCount === 3 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 1"
    );
    os.redo("objectMap manipulation callBacks test");
    ok(
      os.applyCreate_callCount === 3 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 2,
      "after redo(): os.applyCreate_callCount === 3 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 2"
    );
    os.condenseAll();
    ok(
      os.applyCreate_callCount === 3 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 2,
      "after condenseAll(): os.applyCreate_callCount === 3 && os.applyChange_callCount === 1 && os.applyDelete_callCount === 2"
    );
  });
  test("change with introducing new prop", function(){
    createOS();
    var id = 'id_one';
    os.openBatch("test", 'from test');
    os.doCreate(id, { name: "one" });
    var obj = om[id];
    ok(
      ('name' in obj) && ! ('first' in obj),
      "('name' in obj) && ! ('first' in obj)"
    );
    os.closeBatch("test", 'from test');

    os.openBatch("test", 'from test');
    os.doChange(id, { first: 1 });
    ok(
      ('first' in obj),
      "('first' in obj)"
    );
    os.closeBatch("test", 'from test');
    var action = actionS[1];
    var newProps = action.trans.id2new[id];
    var oldProps = action.trans.id2old[id];
    ok(
      'first' in newProps && newProps['first'] === 1,
      "'first' in newProps && newProps['first'] === 1"
    );
    ok(
      'first' in oldProps && oldProps['first'] === undefined,
      "'first' in oldProps && oldProps['first'] === undefined"
    );
    eg.log(actionS);
  });
}); // window.onload()
