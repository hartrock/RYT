<!-- with jquery: -->
<!-- $(document).ready(function(){ -->
<!-- without jquery: -->
window.onload = (function(){
/*
module("name");
  test("name", function() {
    ok( arg, "commentToOK"
        + " | ok( arg ) |" );
    strictEqual( 2args, "commentToDeepEqual"
                 + " | strictEqual( 2args ) |" );
  });
    deepEqual( 2args, "commentToDeepEqual"
               + " | deepEqual( 2args ) |" );
  });
*/

// http://www.adequatelygood.com/2010/7/Writing-Testable-JavaScript
function testCases(fn, context, tests) {
  for (var i = 0; i < tests.length; i++) {
    strictEqual(fn.apply(context, tests[i][0]), tests[i][1],
                tests[i][2] || JSON.stringify(tests[i]));
  }
}

module("infrastructure");

  test("foo", function() {
    function foo(a,b) { return a + b; }
    testCases(foo, null, [
      [["bar", "baz"], "barbaz"],
      [["bar", "bar"], "barbar", "a passing test"]
    ]);
  });

var eg = EvolGo;
var aPos = eg.Point.zero;

module("observers");
  NotificationObserver = function(name) {
    this.name = name || "";
    this.numOfNotifications = 0;
  };
  NotificationObserver.prototype.toString = function() {
    return "NotificationObserver '" + this.name + "'";
  };
  NotificationObserver.prototype.receiveFrom = function(msg, from) {
    ++this.numOfNotifications;
    ++NotificationObserver.numOfNotificationsAll;
    ok( true, "this: " + this + ", msg: " + JSON.stringify(msg) + ", from: " + from );
  };
  NotificationObserver.prototype.receiveBatchFrom = function(msg, from) {
    ++this.numOfNotifications;
    ++NotificationObserver.numOfNotificationsAll;
    ok( true, "msg: " + JSON.stringify(msg) + ", from: " + from );
  };
  NotificationObserver.numOfNotificationsAll = 0;
  test("two observers 1", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    //var m = new eg.Model();
    var no1 = new NotificationObserver("first");
    var no2 = new NotificationObserver("second");
    m.channel.addListener(no1);
    m.actionSChannel.addListener(no2);
    var task = m.createTask("name",aPos,"description",'mTest');
    createTaskAndChangeNameWithoutAddingObserver(m);
    var expected_numNotifications_1 = 20;
    var expected_numNotifications_2 = 6;
    strictEqual( no1.numOfNotifications, expected_numNotifications_1, ""
                 + " | strictEqual( no1.numOfNotifications ) |" );
    strictEqual( no2.numOfNotifications, expected_numNotifications_2, ""
                 + " | strictEqual( no2.numOfNotifications ) |" );
    strictEqual( NotificationObserver.numOfNotificationsAll,
                 expected_numNotifications_1 + expected_numNotifications_2, ""
                 + " | strictEqual( NotificationObserver.numOfNotificationsAll ) |" );
  });
  test("two observers 2", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    m.channel.addListener(new NotificationObserver("first"));
    m.channel.addListener(new NotificationObserver("second"));
    var task = m.createTask("name",aPos,"description",'mTest');
    createTaskAndChangeNameWithoutAddingObserver(m);
  });
  test("ten observers", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    for (var i = 0; i < 10; ++i) {
      m.channel.addListener(new NotificationObserver(i.toString()));
    }
    var task = m.createTask("name",aPos,"description",'mTest');
    createTaskAndChangeNameWithoutAddingObserver(m);
  });


module("Data");
  var aPos = eg.Point.zero;
  test("createTask", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    ok ( m.isEmpty(), "m.isEmpty()" );
    var taskId = m.createTask(m.rootID, aPos, "name", "description");
    var task = m.getObject(taskId);
    ok ( task, "task creation");
    ok ( ! m.isEmpty(), "! m.isEmpty()" );
    equal( task.name, "name" );
    equal( task.description, "description" );
    ok ( m.holdsObject(task), "m.holdsObject(task)" );
    ok ( ! m.holdsObject("foo"));
  });

  test("changeTaskName", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    var taskId = m.createTask(m.rootID, aPos, "name", "description");
    var task = m.getObject(taskId);
    equal( task.name, "name" );
    m.changeTaskName(taskId, "new name");
    equal( task.name, "new name" );
  });

  test("Task.toString()", function () {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    var taskId = m.createTask(m.rootID, aPos, "name", "description");
    var task = m.getObject(taskId);
    equal( task.toString(), "[object Object]" );
  });

module("undo/redo");

  test("just undo", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    var taskId = m.createTask(m.rootID, aPos, "name 1", "description");
    var task = m.getObject(taskId);
    equal( task.name, "name 1" );
    m.changeTaskName(taskId, "name 2");
    m.changeTaskName(taskId, "name 3");
    equal( task.name, "name 3", "after setting three different task names" );
    m.undo();
    equal( task.name, "name 2", "m.undo()" );
    m.undo();
    equal( task.name, "name 1", "m.undo()" );
    m.undo();
    equal( task.name, "name 1", "m.undo()" );
  });
  test("undo deleteTask()", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    var taskId = m.createTask(m.rootID, aPos, "name", "description");
    m.deleteTask(taskId, m.rootID, 'test');
    ok (! m.getObject(taskId), "task deleted");
    m.undo();
    ok (m.getObject(taskId), "task restored");
  });
  function createTaskAndChangeName (m) {
    m.channel.addListener(new NotificationObserver("third"));
    return createTaskAndChangeNameWithoutAddingObserver(m);
  }
  function createTaskAndChangeNameWithoutAddingObserver(m) {
    var taskId = m.createTask(m.rootID, aPos, "name 1", "description");
    var task = m.getObject(taskId);
    m.changeTaskName(taskId, "name 2", "mTest");
    m.changeTaskName(taskId, "name 3", "mTest");
    m.changeTaskName(taskId, "name 4", "mTest");
    m.changeTaskName(taskId, "name 5", "mTest");
    equal( task.name, "name 5", 'after changing a few times: "name 1" -> "name 2" -> "name 3" -> "name 4" -> "name 5"' );
    return task;
  }
  test("undo/redo once", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    var task = createTaskAndChangeName(m);
    ok ( ! m.atBegin(), "undo is possible" );
    m.undo(); equal( task.name, "name 4", "m.undo()" );
    ok ( ! m.atEnd(), "redo possible" );
    m.redo(); equal( task.name, "name 5", "m.redo()" );
  });
  test("undo/redo common 1", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    var task = createTaskAndChangeName(m);
    var taskId = m.getId(task);

    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );
    m.undo(); equal( task.name, "name 2", "m.undo()" );
    ok ( ! m.atBegin(), "undo possible" );
    m.undo(); equal( task.name, "name 1", "m.undo()" );
    ok ( ! m.atBegin(), "undo possible" );
    m.undo(); equal( task.name, "name 1", "m.undo(): prop of deleted task" );
    ok(! m.holdsObject(task), "task deleted");

    m.redo(); task = m.getObject(taskId);
    equal( task.name, "name 1", "m.redo(): recreated deleted task" );
    m.redo(); equal( task.name, "name 2", "m.redo()" );
    m.redo(); equal( task.name, "name 3", "m.redo()" );
    m.redo(); equal( task.name, "name 4", "m.redo()" );
    ok ( ! m.atEnd(), "redo possible" );
    m.redo(); equal( task.name, "name 5", "m.redo()" );
    ok ( ! ! m.atEnd(), "redo not possible" );
    m.redo(); equal( task.name, "name 5", "m.redo()" );
  });

  test("undo/redo common 2", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    var taskId = m.createTask("name",aPos,"description");
    var task = createTaskAndChangeName(m);
    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );

    m.redo(); equal( task.name, "name 4", "m.redo()" );
    m.redo(); equal( task.name, "name 5", "m.redo()" );
    m.redo(); equal( task.name, "name 5", "m.redo()" );

    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );
    m.undo(); equal( task.name, "name 2", "m.undo()" );

    m.redo(); equal( task.name, "name 3", "m.redo()" );
    m.redo(); equal( task.name, "name 4", "m.redo()" );
    m.redo(); equal( task.name, "name 5", "m.redo()" );

    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );
    m.undo(); equal( task.name, "name 2", "m.undo()" );
    m.undo(); equal( task.name, "name 1", "m.undo()" );
    m.undo(); equal( task.name, "name 1", "m.undo(): prop of deleted task" );
    ok(! m.holdsObject(task), "task deleted");
  });

  test("undo/redo cycle interrupted", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    var task = createTaskAndChangeName(m);
    var taskId = m.getId(task);
    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );

    m.changeTaskName(taskId, "name 11","mTest");
    equal( task.name, "name 11", "changeTaskName()" );
    m.changeTaskName(taskId, "name 22","mTest");
    equal( task.name, "name 22", "changeTaskName()" );

    m.undo(); equal( task.name, "name 11", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );

    m.redo(); equal( task.name, "name 11", "m.redo()" );
    m.redo(); equal( task.name, "name 22", "m.redo()" );
    m.redo(); equal( task.name, "name 22", "m.redo() (ignored)" );

    m.undo(); equal( task.name, "name 11", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );
    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 5", "m.undo()" );
    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );
    m.undo(); equal( task.name, "name 2", "m.undo()" );
    m.undo(); equal( task.name, "name 1", "m.undo()" );
    m.undo(); equal( task.name, "name 1", "m.undo(): prop of deleted task" );

    ok(! m.holdsObject(task), "task deleted");
    ok(m.atBegin(), "m.atBegin()");
    ok( ! m.atEnd(), " ! m.atEnd()");

    m.redo();
    task = m.getObject(taskId);
    equal( task.name, "name 1", "m.redo(): just recreated" );

    m.changeTaskName(taskId, "name 4711");
    equal( task.name, "name 4711", "m.changeTaskName()","mTest");

    m.undo(); equal( task.name, "name 1", "m.undo()" );
    m.undo(); equal( task.name, "name 2", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );
    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 5", "m.undo()" );
    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );
    m.undo(); equal( task.name, "name 11", "m.undo()" );
    m.undo(); equal( task.name, "name 22", "m.undo()" );
    m.undo(); equal( task.name, "name 11", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );
    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 5", "m.undo()" );
    m.undo(); equal( task.name, "name 4", "m.undo()" );
    m.undo(); equal( task.name, "name 3", "m.undo()" );
    m.undo(); equal( task.name, "name 2", "m.undo()" );
    m.undo(); equal( task.name, "name 1", "m.undo()" );

    m.undo(); equal( task.name, "name 1",
                     "m.undo() -> task deleted, but ref holds" );
    ok (! m.holdsObject(task),
        "after m.undo(): task deleted");
    ok( m.atBegin(), "atBegin()" );
   }); // test("undo/redo cycle interrupted", ...

  test("create task, subtask and delete all by deleting task", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    strictEqual(eg.numOfProps(m.objectMap), 2,
                "objectMap with only root and copyStore");
    var taskId = m.createTask(m.rootID, aPos, "task", "desc");
    var subtaskId = m.createTask(taskId, aPos, "subtask", "desc");
    var task = m.getObject(taskId);
    var subtask = m.getObject(subtaskId);
    ok ( task, "task creation");
    ok ( subtask, "subtask creation");
    equal( task.name, "task" );
    equal( subtask.name, "subtask" );
    ok ( m.holdsObject(task), "m.holdsObject(task)" );
    ok ( m.holdsObject(subtask), "m.holdsObject(subtask)" );
    m.deleteTask(taskId, m.rootID, 'test');
    ok ( ! m.holdsObject(task),
         "after delete task | ! m.holdsObject(task)" );
    ok ( ! m.holdsObject(subtask),
         "after delete task | ! m.holdsObject(subtask)" );
    eg.log(m.objectMap);
    strictEqual(eg.numOfProps(m.objectMap), 2,
                "after delete task | objectMap with only root and copyStore");
  });

  test("add marker", function() {
    var selectedStore = {};
    var m = RYT.createModel(null, selectedStore, null);
    var os = m.objectStore;
    ok ( ! m.justAfterSnapshotMarker(),
         "before addSnapshotMarker(): ! m.justAfterMarker()" );
    var sm = m.addSnapshotMarker('add marker');
    ok( sm, "snapshot marker '" + sm + "' generated" );
    ok( os.markers[0].id === sm,
        "snapshot marker '" + sm + "' in OS -- "
        + JSON.stringify(os.markers[0]) );
    ok ( m.justAfterSnapshotMarker(),
         "after addSnapshotMarker(): m.justAfterMarker()" );
  });
}); // window.onload()
