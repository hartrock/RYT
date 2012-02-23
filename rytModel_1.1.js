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

var EvolGo = EvolGo || {}, RYT = RYT || {};

/*****************
 * generic Model *
 *****************/

(function(eg) {
  function Model() {
    this._proto = proto;    // this used as subproto referring to proto
    this.instanceCount = 0; // instanceCount in subproto
    // no further init here, because instances are used as subproto of proto here
  }
  var proto = Model.prototype;
  //Model.instanceCount = 0;
  Model.sessionTimestamp = + new Date();
  proto.temporaryUID = '_cu';
  proto.init = function (dataOrNil) { // to be called from childs
    this.instanceCount = ++this._proto.instanceCount; // this: inst of subproto, this._proto: inst of proto;
                                                      // re refers to this.instanceCount in Model() above
    var idPrefixPrefix = null; // TODO later
    this.idPrefix =                               // uniqueness for:
    (idPrefixPrefix ? idPrefixPrefix  + "_" : "") // - browser instances started at same time,
      + Model.sessionTimestamp                    // - sessions in same browser instance,
      + "_" + this.instanceCount;                 // - model instances in same session.
    this.idCount = 0;
    this.objectMap = { };
    this.relations = { };
    this.actionS = []; // action Stack
    this.snapshotMarkers = [ ]; // order counts
    // if there are no undos, it's actionS.length; if there are undos, it's ix of last undone
    this.undoRedoIndex = 0;
    this.batchCount = 0;
    this.snapshotCount = 0;
    this.commandCount = 0;
    this.commandIndex = 0;

    this.functionMap = {
      'create': this.actionCreate,
      'delete': this.actionDelete,
      'change': this.actionChange,

      'addMarker': this.actionAddMarker,
      'removeMarker': this.actionRemoveMarker,
      'openBatch': this.actionOpenBatch,
      'closeBatch': this.actionCloseBatch
    };
    this.channel = new eg.BatchChannel();

    this.users = { };
    this.currentUID = proto.temporaryUID;

    if (dataOrNil) {
      this.initFromData(dataOrNil);
    }
  };

  proto.toString = function () {
    return 'EvolGo.Model';
  };

  // version info
  proto.versionStringOf = function (obj) {
    var major = eg.isUndefined(obj.versionMajor) ? "?" : obj.versionMajor;
    var minor = eg.isUndefined(obj.versionMinor) ? "?" : obj.versionMinor;
    return "v" + major + "." + minor;
  };
  proto.versionString = function () {
    return this.versionStringOf(this);
  };
  function isLessEqualVersion(props_1, props_2) {
    return (
      props_1.versionMajor < props_2.versionMajor
        || (props_1.versionMajor === props_2.versionMajor
            && props_1.versionMinor <= props_2.versionMinor)
    );
  }
  function isEqualVersion(props_1, props_2) {
    return (
      isLessEqualVersion(props_1, props_2)
        && isLessEqualVersion(props_2, props_1)
    );
  }

  // Because of JSON serialization of locally stored objects, collections
  // needn't be copied/cloned: further activities do not affect model objects.
  proto.asData = function () {
    return { storedObjectMap: this.storedObjectMap,
             actionS:this.actionS,
             snapshotMarkers: this.snapshotMarkers,
             versionMajor: this.versionMajor, versionMinor: this.versionMinor,
             users: this.users,
             title: this.title,
             lockedBy: this.lockedBy};
  };
  proto.initObjectMap = function (storedObjectMap) {
    if (! storedObjectMap) {
      return;
    }
    this.actionOpenBatch();
    eg.forEach(storedObjectMap, function(val, key) {
      this.actionCreate( { props:val }, // val to be cloned in actionCreate() ..
                         'init');       // .. id stays (part of 'props')!
      var obj = this.objectMap[key];
    }, this);
    this.actionCloseBatch();
  };
  proto.initFromDataProperties = function (storedObjectMap, actionS, snapshotMarkers) {
    this.storedObjectMap = storedObjectMap; // keep it for next save
    this.initObjectMap(storedObjectMap);
    var i, len, action;
    this.snapshotMarkers = snapshotMarkers;
    for (i = 0, len = actionS.length; i < len; ++i) {
      action = actionS[i];
      action.from = 'load';
      this.performAction(action);
    }
    this.snapshotCount = 0;
  };
  proto.initFromData = function (data) {
    if (this.versionMajor !== data.versionMajor) {
      var str =
        "Model version of imported data (" + this.versionStringOf(data) + ") is incompatible with builtin one ("
        + this.versionString() + "): please use other - major - RYT version.";
      //eg.log(str);
      throw str;
    }
    if (this.versionMinor < data.versionMinor) {
      throw "Model version of imported data (" + this.versionStringOf(data) + ") is newer than builtin one ("
        + this.versionString() + "): please use newer RYT version.";
    }
    if (this.versionMinor > data.versionMinor) {
      for (var i = data.versionMinor; i < this.versionMinor; ++i) {
        this.logger && this.logger.info("Upgrading model data from minor version " + i + " to " + (i+1) + ".");
        data = this['upgrade_'+ i + '_' + (i+1)](data);
      }
    }
    // If data stacks would be directly assigned to model ones, $A() may be needed for decoupling
    // with local store.
    this.initFromDataProperties(
      data.storedObjectMap,
      data.actionS,
      data.snapshotMarkers);
    this.users = data.users;
    this.title = data.title;
    this.initial_lockedBy = this.lockedBy = data.lockedBy || null; // may be missing
  };

  // user management
  proto.addUser = function (uid, name) {
    eg.assert(uid !== this.temporaryUID && ! this.users[uid]);
    this.users[uid] = name;
  };
  proto.setUserID = function (uid) {
    eg.assert(this.users[uid]);
    var oldUID = this.currentUID;
    this.currentUID = uid;
    if (oldUID === this.temporaryUID) {
      this.replaceTemporaryByCurrentUID();
    }
  };
  proto.getUser = function (uid) {
    return this.users[uid] || null;
  };
  proto.getUserName = function (uid) {
    return uid === this.temporaryUID ? "current user" : this.getUser(uid) || null;
  };
  proto.setUserName = function (uid, name) {
    eg.assert(this.users[uid]);
    this.users[uid] = name;
  };
  proto.containsUser = function (uid) {
    return this.getUser(uid) !== null;
  };

  proto.replaceUID_create = function (argObj) {
    var props = argObj.props;
    if (props.createdBy === this.temporaryUID) {
      props.createdBy = this.currentUID;
    }
  };
  proto.replaceUID_change = function (argObj) {
    var props = argObj.props;
    if (props.lastModifiedBy === this.temporaryUID) {
      props.lastModifiedBy = this.currentUID;
    }
  };
  proto.replaceUID_addMarker = function (argObj) {
    var props = argObj.props;
    eg.assert(props.createdBy !== this.temporaryUID);
  };
  proto.replaceUID_delete =
    proto.replaceUID_openBatch =
    proto.replaceUID_closeBatch =
    proto.replaceUID_removeMarker =
    function (argObj) { }; // do nothing
  proto.replaceTemporaryByCurrentUID = function () {
    var self = this;
    eg.forEach(this.objectMap, function(obj, id) {
      if (obj.lastModifiedBy === self.temporaryUID) {
        obj.lastModifiedBy = self.currentUID;
      }
      if (obj.createdBy === self.temporaryUID) {
        obj.createdBy = self.currentUID;
      }
    });
    function stackReplace(stack, fromIndex) {
      for (var i = fromIndex, len = stack.length; i < len; ++i) {
        var action = stack[i];
        self['replaceUID_'+action.doFuncId](action.doArg);
        self['replaceUID_'+action.undoFuncId](action.undoArg);
      }
    }
    var lastSnapshotIndexOrNull = this.lastSnapshotIndexOrNull();
    var startIndex = lastSnapshotIndexOrNull === null
      ? 0                            // no last snapshot, start from begin
      : lastSnapshotIndexOrNull + 1; // start just after last snapshot
    stackReplace(this.actionS, startIndex);
  };

  // dependents notification via channel
  proto.send = function (msg) {
    return this.channel && this.channel.sendFrom(msg, this);
  };

  // IDs: they should be unique (with collaboration in mind)
  proto.generateId = function () {
    return this.idPrefix + "_" // see above
      + ++this.idCount;  // uniqueness for IDs in same model instance
  };

  proto.getObject = function (id) {
    return this.objectMap[id];
  };
  proto.getId = function (obj) {
    var id = obj.id;
    if (id && id in this.objectMap) {
      return id;
    }
    return null;
  };
  proto.holdsId = function (id) {
    return this.objectMap.hasOwnProperty(id); // longer code, but may be faster
    // return id in this.objectMap;
    // corresponds to [[HasProperty]] (not own property)
  };
  proto.holdsObject = function (obj) {
    return this.getId(obj) !== null;
  };
  proto.installRelation = function (relObj) {
    var key_1 = relObj.key_1;
    var key_2 = relObj.key_2;
    var rel = this.relations[relObj._relation]
      || (this.relations[relObj._relation] = { '1->2':{ }, '2->1':{ },
                                               '1->2->id':{ } } );
    var map_1_2 = rel['1->2'][key_1] = rel['1->2'][key_1] || { };
    var map_2_1 = rel['2->1'][key_2] = rel['2->1'][key_2] || { };
    eg.assert(! map_1_2[key_2] && ! map_2_1[key_1]);
    map_1_2[key_2] = relObj.val_2 || key_2;
    map_2_1[key_1] = relObj.val_1 || key_1;

    var rel_1 = rel['1->2->id'][key_1] || (rel['1->2->id'][key_1] = { });
    eg.assert(! rel_1[key_2]);
    rel_1[key_2] = relObj.id; // to val mapping from key_1 and key_2 to rel id
  };
  proto.actionCreate = function (arg, from) {
    var props = arg.props;
    var id = props.id;
    eg.assert(id && ! this.holdsId(id));
    var obj = eg.cloneProps(props);
    this.objectMap[id] = obj;
    if (props._relation) {
      this.installRelation(obj);
    }
    this.send({ event:'created', obj:obj, triggeredBy:from });
    return id; // needed by clients
  };
  proto.actionDelete = function (arg, from, unArg) {
    var id = arg.id;
    var obj = this.getObject(id);
    eg.assert(this.holdsId(id) && ! obj.deleted);
    if (obj._relation) {
      var key_1 = obj.key_1;
      var key_2 = obj.key_2;
      var rel = this.relations[obj._relation];
      delete rel['1->2'][key_1][key_2];
      delete rel['2->1'][key_2][key_1];
      eg.assert(rel['1->2->id'][key_1][key_2] === id);
      delete rel['1->2->id'][key_1][key_2]; // alt: = null
    }
    obj.deleted = true; // for debugging purposes
    delete(this.objectMap[id]);
    this.send({ event: 'deleted', obj: obj, triggeredBy: from,
                unprops: unArg.props });
  };
  proto.actionChange = function (arg, from, unArg) {
    var id = arg.id; // mandatory
    var props = arg.props, pathProps = arg.pathProps, pathPropsArr = arg.pathPropsArr; // opt
    var obj = this.objectMap[id];
    var event = {event: 'changed', obj: obj, triggeredBy: from};
/*
    { path: ['one', 'two', 'three'], props: { p1: 1, ... } }
*/
    if (props) { // probably always there with modification info at least
      eg.modifyProps(props, obj);
      event.props = props;
      event.unprops = unArg.props;
    }
    if (pathProps) {
      eg.modifyPropsByPath(pathProps.props, obj, pathProps.path);
      event.pathProps = pathProps;
      event.unPathProps = unArg.pathProps;
    }
    if (pathPropsArr) {
      pathPropsArr.forEach(function(pp) {
        eg.modifyPropsByPath(pp.props, obj, pp.path);
      });
      event.pathPropsArr = pathPropsArr;
      event.unPathPropsArr = unArg.pathPropsArr;
    }
    var relName = obj._relation;
    if (relName) {
      var rel = this.relations[relName];
      if (props.val_1) {
        rel['2->1'][obj.key_2][obj.key_1] = props.val_1;
      }
      if (props.val_2) {
        rel['1->2'][obj.key_1][obj.key_2] = props.val_2;
      }
    }
    this.send(event);
  };

  proto.basicCreate = function (props) {
    var obj = eg.cloneProps(props);
    var id = this.generateId();
    obj.id = id;
    obj.creationTime = +new Date();
    obj.createdBy = this.currentUID; // Now it has all obj props ..
    return obj;
  };
  proto.create = function (props, from) {
    eg.assert(eg.isUndefined(props.id));
    var obj = this.basicCreate(props);
    var action
      = { doFuncId:'create', doArg:{ props:obj },
          undoFuncId:'delete', undoArg:{ id:obj.id },
          from:from };
    this.performAction(action); // .. and finally it is known by Model.
    return obj.id;
  };
  proto.createRelation = function (props, from) {
    eg.assert(eg.isUndefined(props.id));
    props._relation = props.type; // mark as relation
    return this.create(props, from);
  };
/*
  proto.changeRelationVals = function (props, from) {
    var relation = this.relations[props._relation];
    if (props.key_1) {
      map = relation['1->2'][key_1];
changedKeys2Vals = 
    } else if (props.key_2) {
      map = relation['2->1'][key_2];
    } else { // error
    }
    eg.assert(map);
    eg.forEach(props.changedKey_2Vals, function (val, key_2) {
      map[key_2] = val;
    });
  };
*/
  proto.deleteObjWithId = function (id, from) {
    //eg.log("deleteObjWithId(" + id + ", " + from);
    var obj = this.getObject(id);
    eg.assert(! obj.deleted);
    var clonedObj = eg.cloneProps(obj);
    var action
      = { doFuncId:'delete', doArg:{ id:id },
          undoFuncId:'create', undoArg:{ props:clonedObj },
          from:from };
    this.performAction(action);
  };
  proto.extractChangedProps = function (obj, props, // in
                                        oldProps, newProps /* out */) {
    for (var key in props) {
      var oldVal = obj[key];
      var newVal = props[key];
      if (oldVal !== newVal) {
        oldProps[key] = oldVal;
        newProps[key] = newVal;
      }
    }
  };
  proto.extractChangedPropsID = function (id, props, oldProps, newProps) {
    return this.extractChangedProps(this.getObject(id), props,
                                    oldProps, newProps);
  };
  proto.elemWouldChangeBy = function (id, props) {
    var oldProps = { }, newProps = { };
    this.extractChangedPropsID(id, props, oldProps, newProps);
    return eg.hasProps(newProps);
  };
  proto.extractChangedPathProps = function (rootObj, pathProps, oldProps, newProps) {
    var obj = eg.propOfObjByPath(rootObj, pathProps.path);
    this.extractChangedProps(obj, pathProps.props, oldProps, newProps);
  };
  proto.changeGeneric = function (id, argObj, from) {
    var props = argObj.props, pathProps = argObj.pathProps, pathPropsArr = argObj.pathPropsArr;
    var obj = this.getObject(id);
    eg.assert(obj);
    var doArg = { id:id }; var undoArg = { id:id }; // filled more differently
    var oldProps, newProps, hasNewProps;
    oldProps = {}, newProps = {};
    if (props) {
      this.extractChangedProps(obj, props, oldProps, newProps);
      hasNewProps = eg.hasProps(newProps);
    }
    oldProps.lastModificationTime = obj.lastModificationTime;
    newProps.lastModificationTime = +new Date();
    oldProps.lastModifiedBy = obj.lastModifiedBy;
    newProps.lastModifiedBy = this.currentUID;

    // Note: there are objs modified without modificationCount.
    if (obj.modificationCount) {
      oldProps.modificationCount = obj.modificationCount;
      newProps.modificationCount = obj.modificationCount + 1;
    } else {
      if (! obj.lastModificationTime) { // first modification: ..
        oldProps.modificationCount = undefined; // .. uncreate and ..
        newProps.modificationCount = 1; // create modificationCount.
      }
    }

    doArg.props = newProps;
    undoArg.props = oldProps;
    if (pathProps) {
      oldProps = {}, newProps = {};
      this.extractChangedPathProps(obj, pathProps, oldProps, newProps);
      if (eg.hasProps(newProps)) {
        doArg.pathProps = { path: pathProps.path, props: newProps };
        undoArg.pathProps = { path: pathProps.path, props: oldProps };
      }
    }
    if (pathPropsArr) {
      doArg.pathPropsArr = [];
      undoArg.pathPropsArr = [];
      pathPropsArr.forEach(function(pathProps) {
        oldProps = {}, newProps = {};
        this.extractChangedPathProps(obj, pathProps, oldProps, newProps);
        if (eg.hasProps(newProps)) {
          doArg.pathPropsArr.push({ path: pathProps.path, props: newProps });
          undoArg.pathPropsArr.push({ path: pathProps.path, props: oldProps });
        }
      });
    }
    if (! (hasNewProps
           || doArg.pathProps
           || (doArg.pathPropsArr
               && doArg.pathPropsArr.length) ) ) { // nothing changed
      return; // avoid noop
    }
    var action
      = { doFuncId:'change', doArg:doArg,
          undoFuncId:'change', undoArg:undoArg,
          from:from };
    this.performAction(action);
  };
  proto.change = function (id, props, from) {
    this.changeGeneric(id, { props: props }, from);
  };
  // action logic with undo/redo mechanism: 
  proto.pushPending = function () {
    var oldLen, oldUndoRedoIndex, i, action;
    if (! this.atEnd()) { // pending undo/redos ..
      oldLen = this.actionS.length;
      for (i = oldLen, oldUndoRedoIndex = this.undoRedoIndex; i-- > oldUndoRedoIndex; ) { // .. store them.
        action = this.getAction(i);
        var undoAction = { doFuncId:action.undoFuncId, doArg:action.undoArg,
                           undoFuncId:action.doFuncId, undoArg:action.doArg,
                           from:'undo' };// push pending always triggered by undo
        this.actionS.push(undoAction);
      }
      this.undoRedoIndex = this.actionS.length;
      this.commandCount += this.commandCount - this.commandIndex;
      this.commandIndex = this.commandCount;
      this.send({ event:'actionSIncreased', oldLength: oldLen });
    }
  };
  proto.performAction = function (action, inUndoRedoOrNil) {
    if (! inUndoRedoOrNil) { // push pending undos
      this.pushPending();
      this.actionS.push(action);
      this.undoRedoIndex = this.actionS.length;
      if (! this.batchCount) {
        this.commandIndex = ++this.commandCount;
      }
      this.send({ event:'actionSIncreased', oldLength: this.undoRedoIndex - 1 });
    }
    var res = this.functionMap[action.doFuncId].call(
      this, action.doArg, action.from, action.undoArg
    );
    return res;
  };
  proto.copyAction = function (action) {
    eg.assert(action);
    var copy = eg.cloneProps(action);
    copy.doArgObj = eg.cloneProps(copy.doArgObj);
    copy.undoArgObj = eg.cloneProps(copy.undoArgObj);
    return copy;
  };
  proto.getAction = function (ix) {
    return this.copyAction(this.actionS[ix]);
  };
  proto.undo = function (from) {
    if (this.atBegin()) {
      return;
    }
    do {
      --this.undoRedoIndex;
      var action = this.getAction(this.undoRedoIndex);
      var undoAction = { doFuncId:action.undoFuncId, doArg:action.undoArg,
                         undoFuncId:action.doFuncId, undoArg:action.doArg,
                         from:from };
      this.performAction(undoAction, true);
    } while (this.batchCount);
    --this.commandIndex;
    this.send({ event: 'undo', triggeredBy: from });
  };
  proto.redo = function (from) {
    if (this.atEnd()) {
      return;
    }
    do {
      var action = this.getAction(this.undoRedoIndex);
      action.from = from;
      ++this.undoRedoIndex;
      this.performAction(action, true);
    } while (this.batchCount);
    ++this.commandIndex;
    this.send({ event: 'redo', triggeredBy: from });
  };

  proto.atBegin = function () {
    return ! this.undoRedoIndex;
  };
  proto.atEnd = function () {
    return this.undoRedoIndex === this.actionS.length;
  };
  proto.undoAll = function () {
    while (! this.atBegin()) {
      this.undo();
    }
  };
  // Sensible? Use case?
  proto.reset = function () {
    //eg.log("reset()");
    this.undoAll();
    this.init();
  };


  // batches
  //
  proto.actionOpenBatch = function (arg, from) {
    ++this.batchCount;
    this.channel.openBatch(this);
  };
  proto.actionCloseBatch = function (arg, from) {
    --this.batchCount;
    this.channel.closeBatch(this, arg, from);
  };
  proto.openBatch = function (arg, from) {
    var action = { doFuncId:'openBatch', doArg:arg,
                   undoFuncId:'closeBatch', undoArg:arg,
                   from:from };
    this.performAction(action);
  };
  proto.closeBatch = function (arg, from) {
    var action = { doFuncId:'closeBatch', doArg:arg,
                   undoFuncId:'openBatch', undoArg:arg,
                   from:from };
    this.performAction(action);
  };


  // markers (e.g. for marking snapshots)
  // Note: there may be other as snapshot markers later; for which real removal could be a sensible action.
  // TODO: think about marker objects

  // Some action happens in addSnapshotMarker() below: this is for marking in stacks and notifying observers.
  proto.actionAddMarker = function (arg, from) {
    var props = arg.props;
    //eg.log("actionAddMarker(); props: ", props, "from: ", from);
    this.send({ event:'markerAdded', obj:props, triggeredBy:from }); // must not be changed
  };
  // Noop for having symmetry with actionAddMarker: no marker will be removed from stacks.
  proto.actionRemoveMarker = function (arg, from) {
    var marker = arg.marker;
    //eg.log("actionRemoveMarker(); marker: ", marker, "from: ", from);
  };
  proto.addMarker = function (obj, from) {
    var action = { doFuncId:'addMarker', doArg: { props:obj },
                   undoFuncId:'removeMarker', undoArg:{ marker:obj.marker },
                   from:from };
    this.performAction(action); // do/undo not the same
  };
  /* // If this would be used, a switch to some marker obj with corresponding repository would be needed.
  proto.removeMarker = function (marker, from) {
    var actionRemove = { funcId: 'removeMarker', args: [marker, from] };
    var actionAdd = { funcId: 'addMarker', args: [marker, from] };
    this.performAction(actionRemove, actionAdd); // do/undo not the same
  };
  */
  proto.actionAt = function (ix) {
    return this.actionS[ix];
  };
  proto.previousAction = function () { // would be reversed by getFirstUndoAction()
    return this.undoRedoIndex ? this.actionS[this.undoRedoIndex - 1] : null;
  };
  proto.justAfterMarker = function () {
    var previousAction = this.previousAction();
    return previousAction && previousAction.doFuncId === 'addMarker';
  };
  proto.snapshotPrefix = "snapshot_";
  proto.addSnapshotMarker = function (from) {
    var snapshotMarker = (this.snapshotPrefix + this.idPrefix
                          + "_" + ++this.snapshotCount);
    // only push here, not in action (to avoid multiple pushes by undo/redo)
    this.snapshotMarkers.push(snapshotMarker);
    // make it visible in actionS
    this.addMarker(this.basicCreate({ marker: snapshotMarker }), from);
    this.condensedBeforeSnapshotFlag = false; // somewhat hackish
    return snapshotMarker;
  };
  proto.getMarkerOf = function (addMarkerAction) {
    return addMarkerAction.doArg.props.marker;
  };
  proto.isSnapshotAddingAction = function (action) {
    return action && action.doFuncId === 'addMarker'
      && this.getMarkerOf(action).substr(0, this.snapshotPrefix.length) === this.snapshotPrefix;
  };
  proto.actionIsSnapshotMarkerAt = function (ix) {
    var action = this.actionS[ix];
    return this.isSnapshotAddingAction(action);
  };
  proto.justAfterSnapshotMarker = function () {
    var lastAction = this.previousAction();
    return this.isSnapshotAddingAction(lastAction);
  };
  proto.lastSnapshotIndexOrNull = function () {
    for (var i = this.actionS.length; i--;) {
      if (this.isSnapshotAddingAction(this.actionAt(i))) {
        return i;
      }
    }
    return null;
  };

  proto.deleteKeysWithEmptyValObj = function (props) {
    eg.forEach(eg.cloneProps(props), function(valObj, key) {
      if (! eg.hasProps(valObj)) {
        delete props[key];
      }
    });
  };
  proto.condenseRelations = function () {
    eg.forEach(eg.cloneProps(this.relations), function(rel, key) {
      this.deleteKeysWithEmptyValObj(rel['1->2']);
      this.deleteKeysWithEmptyValObj(rel['2->1']);
      this.deleteKeysWithEmptyValObj(rel['1->id']);
      this.deleteKeysWithEmptyValObj(rel['2->id']);
      if (! eg.hasProps(rel['1->2'])) {
        eg.assert(! eg.hasProps(rel['2->1'])); // symmetry
        eg.assert(! eg.hasProps(rel['1->id'])); // symmetry
        eg.assert(! eg.hasProps(rel['2->id'])); // symmetry
        delete this.relations[key];
      }
    }, this);
  };
  proto.storeObjectMap = function () {
    this.storedObjectMap = eg.JSON.parse(eg.JSON.stringify(this.objectMap));
  };
  proto.condense = function () {
    this.pushPending();
    this.storeObjectMap();
    this.actionS = [];
    this.undoRedoIndex = 0;
    this.commandCount = this.commandIndex = 0;
    this.condenseRelations();
    this.condensedBeforeSnapshotFlag = true;
    this.send({ event:'actionSCleared' });
  }; // condense()

  proto.collectReachableElemsVia = function (directedRel, startingAt) {
    function h_collectReachableElemsVia(directedRel, curr, reached) {
      if (! curr || reached[curr]) {
        return;
      }
      reached[curr] = curr;
      var keys_2 = directedRel[curr];
      eg.forEach(keys_2, function(val, key_2) {
        h_collectReachableElemsVia(directedRel, key_2, reached);
      });
    }
    var reached = { };
    h_collectReachableElemsVia(directedRel, startingAt, reached);
    return reached;
  };
  proto.computeStats = function () {
    var res = { };
    var om_objCount = 0, om_relObjCount = 0;
    var om_typeCounts = { };
    eg.forEach(this.objectMap, function(obj, id) {
      ++om_objCount;
      obj._relation && ++om_relObjCount;
      eg.assert(obj.type);
      if (om_typeCounts[obj.type]) {
        ++om_typeCounts[obj.type];
      } else {
        om_typeCounts[obj.type] = 1;
      }
    }, this);
    res.om_objCount = om_objCount;
    res.om_relObjCount = om_relObjCount;
    res.om_typeCounts = om_typeCounts;
    // look into relations map
    var rm_relCount = 0; // num of different relations
    var rm_relIDCount = 0; // sum of reached rel IDs
    var rm_rel2IDCounts = { }; // counts of objs belonging to a specific relation
    eg.forEach(this.relations, function(rel, relIdent) {
      ++rm_relCount;
      rm_rel2IDCounts[relIdent] = 0;
      var rel2relObjIDs = rel['1->2->id'];
      var reachedRelObjIDs = { }; // used as set
      eg.forEach(rel2relObjIDs, function(keys_2_obj, key_1) {
        eg.forEach(keys_2_obj, function(id, key_2) {
          eg.assert(! reachedRelObjIDs[id]); // assert each relID reached once
          reachedRelObjIDs[id] = id;
          ++rm_relIDCount;
          ++rm_rel2IDCounts[relIdent];
        });
      });
    }, this);
    res.rm_relCount = rm_relCount;
    res.rm_relIDCount = rm_relIDCount;
    res.rm_rel2IDCounts = rm_rel2IDCounts;
    return res;
  };
  proto.sanityChecksForStats = function (stats) {
    eg.assert(stats.rm_relIDCount === stats.om_relObjCount);
    eg.forEach(stats.rm_rel2IDCounts, function(count, relIdent) {
      eg.assert(count === (stats.om_typeCounts[relIdent] || 0));
    });
  };
  proto.sanityChecks = function () {
    this.sanityChecksForStats(this.computeStats());
  };

  proto.elementObjSortAfterTimeFunc = function (eo1, eo2) {
    var t1 = eo1.lastModificationTime || eo1.creationTime;
    var t2 = eo2.lastModificationTime || eo2.creationTime;
    return t2 - t1; // descending (youngest first)
  };
  proto.elementSortAfterTimeFunc = function () {
    var self = this;
    return function(e1, e2) {
      return self.elementObjSortAfterTimeFunc(self.getObject(e1),
                                              self.getObject(e2));
    };
  };


  // export
  // 
  eg.Model_1_1 = Model;
  eg.isLessEqualModelVersion = isLessEqualVersion;
  eg.isEqualModelVersion = isEqualVersion;

}(EvolGo));


/**********************
 * RYT specific Model *
 **********************/

/* Relation constraints:
 * - a relation of some type exists at most once for each key_1/key_2 pair,
 * - no changes of keys are allowed after creation (but vals may be changed).
 */

(function(eg, ryt) {
  function Model(logger, selectedStore, dataOrNil) {
    this._proto = proto;

    this.logger = logger;
    this.selectedStore = selectedStore; // for paste and alias

    this.init(dataOrNil);
  }
  // prototype chain
  Model.prototype = new eg.Model_1_1();
  Model.prototype.constructor = Model;
  var proto = Model.prototype; // proto set *after* proto chain

  proto.initRelation = function (name) {
      var rel = this.relations[name]
        || (this.relations[name] = { '1->2':{ }, '2->1':{ },
                                     '1->2->id':{ } } );
    return rel;
  };
  proto.initRelationShortcuts = function () {
    var parentChildRel = this.initRelation('parentChild');
    this.parent2Childs = parentChildRel['1->2'];
    this.child2Parents = parentChildRel['2->1'];
    var fromToRel = this.initRelation('conn_fromTo');
    this.fromTo = fromToRel['1->2'];
    this.toFrom = fromToRel['2->1'];
  };
  proto.initCopyStoreInObjectMap = function (om) {
    // copy/cut/paste/alias parent
    var copyStore = this.basicCreate({name:'copyStore', type:'root'});
    om[copyStore.id] = copyStore;
    return copyStore;
  };
  proto.init = function (dataOrNil) {
    proto._proto.init.call(this, dataOrNil);
    if (! dataOrNil) { // init of objectMap before first store
      // root
      var root = this.basicCreate({name:'root', type:'root'});
      this.objectMap[root.id] = root;
      this.rootID = root.id;
      // copy/cut/paste/alias parent
      var copyStore = this.initCopyStoreInObjectMap(this.objectMap);
      this.copyStoreID = copyStore.id;
      // for getting root and copyStore into storing data (don't want an action)
      this.storeObjectMap();
    }
    this.initRelationShortcuts();
  };
  proto.asData = function () {
    var data = proto._proto.asData.call(this);
    data.rootID = this.rootID;
    data.copyStoreID = this.copyStoreID;
    return data;
  }
  proto.initFromData = function (data) {
    proto._proto.initFromData.call(this, data);
    this.rootID = data.rootID;
    this.copyStoreID = data.copyStoreID;
  };
  proto.condenseRelations = function () {
    proto._proto.condenseRelations.call(this); // call parent func
    this.initRelationShortcuts(); // reinit
  };

  proto.computeStats = function () {
    var res = proto._proto.computeStats.call(this); // call parent func
    res.reachableViaRoot =
      this.collectReachableElemsVia(this.parent2Childs, this.rootID);
    res.reachableViaCopyStore =
      this.collectReachableElemsVia(this.parent2Childs, this.copyStoreID);
    res.reachableViaRootNCopyStore = eg.propsUnion(res.reachableViaRoot, res.reachableViaCopyStore);
    res.reachableViaRootCount = eg.numOfProps(res.reachableViaRoot);
    res.reachableViaCopyStoreCount = eg.numOfProps(res.reachableViaCopyStore);
    res.reachableViaRootNCopyStoreCount = eg.numOfProps(res.reachableViaRootNCopyStore);
    return res;
  };
  proto.sanityChecksForStats = function (stats) {
    proto._proto.sanityChecksForStats.call(this, stats);
    // all objs not being rels should have been reached
    eg.assert(stats.reachableViaRootNCopyStoreCount
              === stats.om_objCount - stats.om_relObjCount);
  };
  proto.statsString = function () {
    var stats = this.computeStats();
    var str = "";
    str += "Stats:";
    str += "\nobj count: " + stats.om_objCount;
    str += "\nrel obj count: " + stats.om_relObjCount;
    str += "\naction ix/count: " + this.undoRedoIndex + "/" + this.actionS.length;
    str += "\ncommand ix/count: " + this.commandIndex + "/" + this.commandCount;
    str += "\nelem count: " + (stats.om_objCount - stats.om_relObjCount);
    str += "\nreachable via root count: " + stats.reachableViaRootCount;
    str += "\nreachable via copyStore count: " + stats.reachableViaCopyStoreCount;
    str += "\nreachable via root'n'copyStore count: " + stats.reachableViaRootNCopyStoreCount;

    return str;
  };
  function createModel(logger, selectedStore, dataOrNil) {
    return new Model(logger, selectedStore, dataOrNil);
  };

  // As long there is an upgrade conversion from previous model version, minor will be incremented:
  // this means, there should always be an upgrade chain from lower minor versions to higher ones
  // having same major num;
  // e.g.:
  // x.1 -> x.2 -> x.3 -> ... -> x.y-2 x.y-1 -> x.y .
  proto.versionMajor = 1; // must change, if model conversion cannot be guaranteed
  proto.versionMinor = 1; // model should always be convertable to next minor version
  // version info in proto for giving access to eg.Model

  Model.versionString = function () {
    return proto.versionStringOf(proto);
  };

  // RYTv0.9
  proto.upgrade_0_1 = function (data) {
    eg.assert(data.versionMinor === 0);
    data.copyStoreID = this.initCopyStoreInObjectMap(data.storedObjectMap).id;
    data.versionMinor = 1;
    return data;
  };

  proto.toString = function () {
    return proto._proto.toString.call(this) + "<-RYT.Model_"
      + this.versionString()
      + "#" + this.instanceCount;
  };


  // RYT specific model stuff
  //

  proto.filterObjects = function (fun) {
    return eg.filter(this.objectMap, fun, this);
  };
  proto.filterObjectsWithParent = function (parent) {
    return eg.filter(this.objectMap, function(obj, id) {
      return this.elemHasParent(id, parent);
    }, this);
  };
  proto.filterElemsWithParent = proto.filterObjectsWithParent;
  proto.maxPosInParent = function (parent) {
    var childs = this.parent2Childs[parent];
    var max = eg.Point.zero();
    eg.forEach(childs, function(pos, child) {
      max = max.max(pos);
    });
    return max;
  };
  proto.filterTasksWithParent = function (parent) {
    return eg.filter(this.objectMap, function(obj, id) {
      return obj.type === 'task'
        && this.elemHasParent(id, parent);
    }, this);
  };
  proto.filterCommentsWithParent = function (parent) {
    return eg.filter(this.objectMap, function(obj, id) {
      return  obj.type === 'comment'
        && this.elemHasParent(id, parent);
    }, this);
  };
  // Note: used by pasteInto_child2pos_elemMap_relMap_parent2childs()
  // used by importSelectedObj().
  proto.filterConnections_map = function (rel2obj) {
    return eg.filter(rel2obj, function(obj, id) { // predicate
      return obj.type === 'conn_fromTo';
    });
  };
  proto.filterConnections = function () {
    return this.filterConnections_map(this.objectMap);
  };
  proto.filterConnectionsConnectingObjectsWithParent = function(parent) {
    var childsOfParent = this.parent2Childs[parent];
    if (! childsOfParent) {
      return { };
    }
    return eg.filter(this.objectMap, function(obj, id, objectMap) {
      return obj.type === 'conn_fromTo'
        && childsOfParent[obj.key_1]
        && childsOfParent[obj.key_2]
    });
  };
  proto._filterConnsConnectingFrom = function(connectableId) {
    return eg.filter(this.objectMap, function(obj, id) {
      return obj.type === 'conn_fromTo'
        && obj.key_1 === connectableId;
    });
  };
  proto._filterConnsConnectingTo = function(connectableId) {
    return eg.filter(this.objectMap, function(obj, id) {
      return obj.type === 'conn_fromTo'
        && obj.key_2 === connectableId;
    });
  };
  proto.filterConnsConnectingFrom = function(connectableId) {
    var fromTo = this.fromTo[connectableId];
    var relConn_1_2_id = this.relations.conn_fromTo['1->2->id'];
    var res = { };
    eg.forEach(fromTo, function(val, toId) {
      var connId = relConn_1_2_id[connectableId][toId];
      res[connId] = this.getObject(connId);
    }, this);
    return res;
  };
  proto.filterConnsConnectingTo = function(connectableId) {
    var toFrom = this.toFrom[connectableId];
    var relConn_1_2_id = this.relations.conn_fromTo['1->2->id'];
    var res = { };
    eg.forEach(toFrom, function(val, fromId) {
      var connId = relConn_1_2_id[fromId][connectableId];
      res[connId] = this.getObject(connId);
    }, this);
    return res;
  };

  proto.filterConnsConnecting = function(connectableId) {
    return eg.filter(this.objectMap, function(obj, id, objectMap) {
      return obj.type === 'conn_fromTo'
        && (obj.key_1 === connectableId || obj.key_2 === connectableId);
    });
  };
  proto.isConnInParent = function (connObj, parent) {
    return (this.elemHasParent(connObj.key_1, parent)
            && this.elemHasParent(connObj.key_2, parent))
  };
  proto.parentsWithBoth = function (c1, c2) {
    return eg.propsIntersection(
      this.child2Parents[c1], this.child2Parents[c2]
    );
  };
  proto.parentsWithChildRelObj = function (relObj) {
    return this.parentsWithBoth(relObj.key_1, relObj.key_2);
  };

  proto.positionOfChildInParent = function (child, inParent) {
    return this.parent2Childs[inParent][child];
  };

  // using parents in child
  proto.elemHasParent = function (elem, parent) {
    return this.child2Parents[elem] && this.child2Parents[elem][parent];
  };
  // obsolete?
  proto.hasUnfinishedChilds = function (id) {
    var childs = this.parent2Childs[id];
    return childs && eg.some(childs, function(val, childId) {
      return this.getObject(childId).finished === false;
    }, this);
  };

  proto.canBeFinishedFromChildsAfterLogic = function (childs, logic) {
    if (eg.isNil(childs) || ! eg.hasProps(childs)) {
      return true;
    }
    switch (logic) {
    case undefined:
    case 'and':
      return ! eg.some(childs, function(val, childId) {
        return this.getObject(childId).finished === false;
      }, this);
      break;
    case 'or':
      return eg.some(childs, function(val, childId) {
        return this.getObject(childId).finished === true;
      }, this);
      break;
    case 'nand':
      return eg.some(childs, function(val, childId) {
        return this.getObject(childId).finished === false;
      }, this);
      break;
    case 'nor':
      return ! eg.some(childs, function(val, childId) {
        return this.getObject(childId).finished === true;
      }, this);
      break;
    case 'xor': // some finished, some unfinished
      return (
        eg.some(childs, function(val, childId) {
          return this.getObject(childId).finished === true;
        }, this)
          && eg.some(childs, function(val, childId) {
            return this.getObject(childId).finished === false;
          }, this)
      );
      break;
    default:
      throw "elem logic '" + elem.logic + "' unknown";
      break;
    }
  };
  proto.canBeFinishedFromChilds = function (id) {
    var childs = this.parent2Childs[id];
    if (! childs) return true;
    var elem = this.getObject(id);
    return this.canBeFinishedFromChildsAfterLogic(childs, elem.logic);
  };
  // computes elems between two elems of parentChild relation:
  // child -> parentsNChilds -> grandparent; parentsNChilds will be computed.
  proto.parentsOfNChildsOf = function (childId, grandparentId) {
    var parents = this.child2Parents[childId]; // may be undefined
    return eg.filter(parents, function(val, id) {
      var grandparents = this.child2Parents[id];
      return grandparents && grandparents[grandparentId];
    }, this);
  };

  // counts parents except copyStoreID
  proto.aliasCount = function (id) {
    var parents = this.child2Parents[id];
    var parentCount = eg.numOfProps(parents);
    return parents[this.copyStoreID] ? parentCount - 1 : parentCount;
  };
  proto.childCount = function (id) {
    var childs = this.parent2Childs[id];
    return eg.numOfProps(childs);
  };

  proto.commonParents = function (id_1, id_2) {
    var parents_1 = this.child2Parents[id_1];
    var parents_2 = this.child2Parents[id_2];

    var intersection = eg.propsIntersection(parents_1, parents_2);
    return intersection;
  };
  proto.commonParentsCount = function (id_1, id_2) {
    return eg.numOfProps(this.commonParents(id_1, id_2));
  };
  proto.someParent = function (id) {
    var parents = this.child2Parents[id];
    if (this.rootID in parents) {
      return this.rootID;
    }
    return eg.detect(parents, function(parent) {
      return parent !== this.copyStoreID;
    }, this);
  };

  //
  // traversal funcs
  //

  proto.elemHasParentRecursive = function (elem, parentRec) {
    var parents = this.child2Parents[elem];
    if (! parents) { // anchor
      return false;
    }
    return eg.some(parents, function(val, parent) {
      return (parent === parentRec
              || this.elemHasParentRecursive(parent, parentRec));
    }, this);
  };

  proto.distanceToParent = function (elem, parent) {
    if (elem === parent) {
      return 0;
    }
    var parents = this.child2Parents[elem];
    if (! parents) {
      return null; // no dist
    }
    var minDistParents = eg.inject(
      parents,
      Number.POSITIVE_INFINITY,
      function(injected, val, key) {
        var dist = this.distanceToParent(key, parent);
        return dist !== null
          ? Math.min(injected, dist)
          : injected;
      },
      this);
    return minDistParents === Number.POSITIVE_INFINITY
      ? null
      : 1 + minDistParents;
  };
  proto.distanceToRoot = function (elem) {
    return this.distanceToParent(elem, this.rootID);
  };

  // generic
  //

  proto.traverseMulti = function (
    id2val, actionFunc, neighborsFunc, thisOrNil)
  {
    if (! eg.hasProps(id2val)) {
      return;
    }
    actionFunc.call(thisOrNil, id2val);
    var neighbors = neighborsFunc.call(thisOrNil, id2val);
    this.traverseMulti(neighbors, actionFunc, neighborsFunc, thisOrNil);
  };
  proto.traverseSingle = function (
    id2val, actionFunc, neighborsFunc, thisOrNil)
  {
    var actionFuncMulti = eg.applyFunc(actionFunc);
    var neighborsFuncMulti = eg.mapReduceFunc(neighborsFunc,
                                              eg.propsUnion, { });
    return this.traverseMulti(
      id2val, actionFuncMulti, neighborsFuncMulti, thisOrNil
    );
  };
  proto.h_traverseOmitVisitedMulti = function (
    id2val, actionFunc, neighborsFunc, alreadyVisited, thisOrNil)
  {
    if (! eg.hasProps(id2val)) {
      return;
    }
    actionFunc.call(thisOrNil, id2val);
    var nextNeighbors = neighborsFunc.call(thisOrNil, id2val);
    alreadyVisited = eg.propsUnion(alreadyVisited, id2val);
    var neighbors = eg.propsSub(nextNeighbors, alreadyVisited);
    this.h_traverseOmitVisitedMulti(
      neighbors, actionFunc, neighborsFunc, alreadyVisited, thisOrNil
    );
  };
  proto.traverseOmitVisitedMulti = function (
    id2val, actionFunc, neighborsFunc, thisOrNil)
  {
    return this.h_traverseOmitVisitedMulti(
      id2val, actionFunc, neighborsFunc,
      { }, thisOrNil
    );
  }
  proto.traverseOmitVisitedSingle = function (
    id2val, actionFunc, neighborsFunc, thisOrNil)
  {
    var actionFuncMulti = eg.applyFunc(actionFunc);
    var neighborsFuncMulti = eg.mapReduceFunc(neighborsFunc,
                                              eg.propsUnion, { });
    return this.traverseOmitVisitedMulti(
      id2val, actionFuncMulti, neighborsFuncMulti, thisOrNil
    );
  };
  proto.traverseDetect = function (
    id2val, pred, neighborsFunc, thisOrNil)
  {
    var found = null;
    var actionFuncMulti = function (id2val) {
      found = eg.detect(id2val, pred, thisOrNil);
    }
    var inner_neighborsFuncMulti = eg.mapReduceFunc(neighborsFunc,
                                                    eg.propsUnion, { });
    var neighborsFuncMulti = function (id2val) {
      if (found) {
        return { };
      }
      return inner_neighborsFuncMulti.call(this, id2val);
    }
    this.traverseOmitVisitedMulti(
      id2val, actionFuncMulti, neighborsFuncMulti, thisOrNil
    );
    return found;
  };
  // detects cycle for all reached from id2val (inclusive)
  proto.traverseDetectCycleWithVisitedFor = function (
    id2val, neighborsFunc, thisOrNil)
  {
    var visited = { };
    var revisited = { };
    var cycle = false;
    var actionFuncMulti = function (id2val) {
      revisited = eg.intersection(id2val, visited);
      cyle = revisited > 0;
      visited = eg.propsUnion(visited, id2val);
    }
    var inner_neighborsFuncMulti
      = eg.mapReduceFunc(neighborsFunc, eg.propsUnion, { });
    var neighborsFuncMulti = function (id2val) {
      if (cycle) {
        return { }; // end condition
      }
      return inner_neighborsFuncMulti.call(this, id2val);
    }
    this.traverseMulti(
      id2val, actionFuncMulti, neighborsFuncMulti, thisOrNil
    );
    return { cycle:cycle, revisited:revisited };
  };
  // detects cycle for id2val only (not for new ones reached from them)
  proto.traverseDetectCycleFor = function (
    id2val, neighborsFunc, thisOrNil)
  {
    var neighborsFuncMulti = eg.mapReduceFunc(neighborsFunc,
                                              eg.propsUnion, { });
    var neighbors = neighborsFuncMulti.call(thisOrNil, id2val);
    var pred = function (val, key) {
      return key in id2val;
    };
    // look if one in id2val will be visited starting with its neighbors
    return this.traverseDetect(
      neighbors, pred, neighborsFunc, thisOrNil
    );
  };
  // detects reachability of id: good for avoiding cycles by not creating them
  proto.traverseReachesId = function (id2val, id, neighborsFunc, thisOrNil) {
    var found = this.traverseDetect(
      id2val,
      function(val, key) { return key === id; },
      neighborsFunc,
      thisOrNil
    );
    return found !== null;
  };
  proto.traverseReachesIdWithRel = function (id2val, id, rel) {
    function neighborsFunc(val, id) {
      return rel[id];
    };
    return this.traverseReachesId(id2val, id, neighborsFunc);
  };

  proto.propagateFinishedState = function (startId) {
    var finished = this.getObject(startId).finished;
    if (! finished === false) {
      // finished === undefined || finished === true -> propagate nothing
      return;
    }
    function actionFunc(val, id) {
      var obj = this.getObject(id);
      if (! eg.isNil(obj.finished)) {
        if (obj.finished) {
          this.change(id, { finished:false }, 'propagateFinishedState()');
        }
      }
    }
    // finished === false -> propagate finished=false to succs
    function neighborsFunc(val, id) {
      var obj = this.getObject(id);
      if (eg.isNil(obj.finished)) {
        return { }; // only propagate finished === false (implies via tasks)
      }
      eg.assert(obj.finished === false); // avoid thinking errs
      return this.fromTo[id]; // next id2val, val unused
    };
    var startId2val = this.fromTo[startId];
    this.traverseOmitVisitedSingle(
      startId2val, actionFunc, neighborsFunc, this
    );
  };
  proto.propagatePrio = function (startId) {
    var prio = this.getObject(startId).prio;
    if (prio === undefined) {
      return;
    }
    function actionFunc(val, id) {
      var obj = this.getObject(id);
      if (! eg.isNil(obj.prio)) {
        if (obj.prio < prio) {
          this.change(id, { prio:prio }, 'propagatePrio()');
        }
      }
    }
    function neighborsFunc(val, id) {
      var obj = this.getObject(id);
      if (obj.type !== 'task' // only propagate via tasks
          || ! eg.isNil(obj.prio)) { // just updated
        return { };
      }
      // jump over non-prio task to next task
      return this.toFrom[id]; // next id2val, val unused
    };
    var startId2val = this.toFrom[startId];
    this.traverseOmitVisitedSingle(
      startId2val, actionFunc, neighborsFunc, this
    );
  };
  proto.followerMaxPrioOrNull = function (id) {
    var prio = null;
    var startId2val = this.fromTo[id];
    function actionFunc(val, id) {
      var obj = this.getObject(id);
      if (! eg.isNil(obj.prio)) {
        prio = prio === null ? obj.prio : Math.max(prio, obj.prio);
      }
    }
    function neighborsFunc(val, id) {
      var obj = this.getObject(id);
      if (obj.type !== 'task' // only traverse via tasks
          || ! eg.isNil(obj.prio)) { // only traverse to first found prio
        return { };
      }
      return this.fromTo[id]; // next id2val, val unused
    };
    this.traverseOmitVisitedSingle(
      startId2val, actionFunc, neighborsFunc, this
    );
    return prio;
  };
  proto.hasUnfinishedPreds = function (id) {
    var startId2val = this.toFrom[id];
    var pred = function(val, key) {
      var obj = this.getObject(key);
      return "finished" in obj && ! obj.finished;
    };
    function neighborsFunc(val, id) {
      var obj = this.getObject(id);
      if (obj.type !== 'task' // only traverse via tasks
          || "finished" in obj) { // stop at tasks having finished state
        return { };
      }
      return this.toFrom[id]; // next id2val, val unused
    };
    return (this.traverseDetect(startId2val, pred, neighborsFunc, this)
            !== null);
  };

  proto.canBeFinished = function (id) {
    return this.canBeFinishedFromChilds(id) && ! this.hasUnfinishedPreds(id);
  };

  proto.reachablesByRelFrom = function (rel, fromId) {
    var res = { };
    function actionFunc(val, id) {
      res[id] = val;
    }
    function neighborsFunc(val, id) {
      return rel[id];
    };
    var startId2val = rel[fromId];
    this.traverseOmitVisitedSingle(
      startId2val, actionFunc, neighborsFunc //, this unused
    );
    return res;
  };
  proto.reachablesByRelToFromId = function (id) {
    return this.reachablesByRelFrom(this.toFrom, id);
  };
  proto.reachablesByRelFromToId = function (id) {
    return this.reachablesByRelFrom(this.fromTo, id);
  };

/* // historic: for knowing how path props have been used.
  proto.createChildPosInParent = function (child, parent, pos, from) {
    var propsExt = { };
    propsExt[child] = pos;
    var argObj = { pathProps: { path: ['child2pos'], props: propsExt } };
    this.changeGeneric(parent, argObj, from);
  };
  proto.deleteChildPosInParent = function (child, inParent, from) {
    var props = { };
    props[child] = null; // for deleting prop
    var argObj = { pathProps: { path: ['child2pos'], props: props } };
    this.changeGeneric(inParent, argObj, from);
  };
  proto.childAddParent = function (child, parent, from) {
    var parents = this.getObject(child).parents;
    var newParents = eg.cloneProps(parents);
    newParents[parent] = newParents.nextIndex++;
    ++newParents.size;
    var argObj = { props: { parents: newParents } };
    this.changeGeneric(child, argObj, from);
  };
  proto.childRemoveParent = function (child, parent, from) {
    var parents = this.getObject(child).parents;
    var newParents = eg.cloneProps(parents);
    delete newParents[parent];
    --newParents.size;
    var argObj = { props: { parents: newParents } };
    this.changeGeneric(child, argObj, from);
  };
*/
  proto.addChildParentRelation = function (child, parent, pos, from) {
    this.createRelation({ type:'parentChild',
                          key_1:parent, key_2:child, val_2:pos },
                        from);
    var childObj = this.getObject(child);
    if ('finished' in childObj) {
      this.updateFinishedInParent(parent);
    }
  };
  proto.removeChildParentRelation = function (child, parent, from) {
    var id = this.relations['parentChild']['1->2->id'][parent][child];
    this.deleteObjWithId(id, from);
    var childObj = this.getObject(child);
    if ('finished' in childObj) {
      this.updateFinishedInParent(parent);
    }
  };

  proto.updateFinishedInParent = function (parent) {
    var parentObj = this.getObject(parent);
    if (parentObj.finished === undefined) {
      return;
    }
    var canBeFinished = this.canBeFinished(parent);
    if (canBeFinished === parentObj.finished) {
      return; // no change
    }
    // change
    if (! canBeFinished
        || parentObj.subtaskFinishPropagation) {
      this.change(parent, { finished:canBeFinished },
                  "updateFinishedInParent()");
    }
  };
  proto.updateFinishedInParentsOf = function (childId) {
    var parents = this.child2Parents[childId];
    eg.forEach(parents, function(val, id) {
      this.updateFinishedInParent(id);
    }, this);
  };


  proto.createTask = function (parent, pos, name, description, finishedOrNIL, prioOrNIL, logicOrNIL, subtaskFinishPropagationOrNIL, from) {
    this.openBatch('createTask..', from);
    var props = { type:'task',
                  name:name, description:description };
    finishedOrNIL !== undefined && (props.finished = finishedOrNIL);
    prioOrNIL !== undefined && (props.prio = prioOrNIL);
    logicOrNIL !== undefined && (props.logic = logicOrNIL);
    subtaskFinishPropagationOrNIL !== undefined && (props.subtaskFinishPropagation = subtaskFinishPropagationOrNIL);

    var task = this.create(props, from);
    this.addChildParentRelation(task, parent, pos, from);
    this.closeBatch('..createTask', from);
    return task;
  };
  proto.change = function (id, props, from) {
    if (! this.elemWouldChangeBy(id, props)) {
      eg.warn("[Model] element change() would be a NOOP: ignored.");
      return;
    }
    this.openBatch('change..', from);
    proto._proto.change.call(this, id, props, from);
    // finishing
    if ('logic' in props || props.subtaskFinishPropagation) {
      this.updateFinishedInParent(id); // update itself
    }
    if ('finished' in props) {
      this.updateFinishedInParentsOf(id); // update its parents
    }
    // connections
    if ('prio' in props) {
      this.propagatePrio(id);
    }
    if ('finished' in props) {
      this.propagateFinishedState(id);
    }
    this.closeBatch('..change', from);
  };
  proto.createConn = function (fromId, toId, from) {
    var relation = this.createRelation({ type:'conn_fromTo',
                                         key_1:fromId, key_2: toId },
                                       from );
    this.propagatePrio(toId);
    this.propagateFinishedState(fromId);
    // TODO: clearify, if batch makes sense here
    return relation;
  };
  proto.createComment = function (parent, pos, text, from) {
    this.openBatch('createComment..', from);
    var props = { type: 'comment',
                  text: text
                };
    var comment = this.create(props, from );
    this.addChildParentRelation(comment, parent, pos, from);
    this.closeBatch('..createComment', from);
    return comment;
  };
  proto.deleteTask = function (task, inParent, from) {
    this.openBatch('deleteTask..', from);
    this.removeChildParentRelation(task, inParent, from); // 1.
    if (! eg.hasProps(this.child2Parents[task])) {
      var childsMap = this.filterObjectsWithParent(task);
      var childTasks = eg.filter(childsMap, function(childObj, id) {
        return childObj.type === 'task';
      });
      var childComments = eg.filter(childsMap, function(childObj, id) {
        return childObj.type === 'comment';
      });
      var connsMap = this.filterConnsConnecting(task);
      var connId;
      for (connId in connsMap) { // remove conns first (future prove)
        this.deleteConn(connId, this.toString());
      }
      eg.forEach(childTasks, function(childObj, childId) { // delete child if parent is its last one
        this.deleteTask(childId, task, this.toString());
      }, this);
      eg.forEach(childComments, function(childObj, childId) { // delete child if parent is its last one
        this.deleteComment(childId, task, this.toString());
      }, this);
      this.deleteObjWithId(task, from);                       // 2.
    }
    this.closeBatch('..deleteTask', from);
  };
  proto.deleteComment = function (comment, inParent, from) {
    this.openBatch('deleteComment..', from);
    this.removeChildParentRelation(comment, inParent, from);
    if (! eg.hasProps(this.child2Parents[comment])) {
      this.deleteObjWithId(comment, from);
    }
    this.closeBatch('..deleteComment', from);
  };
  proto.deleteElement = function (id, inParent, from) {
    var type = this.getObject(id).type;
    if (type === 'task') {
      this.deleteTask(id, inParent, from);
    } else if (type === 'comment') {
      this.deleteComment(id, inParent, from);
    } else {
      throw "bug";
    }
  };
  proto.deleteConn = function (connId, from) {
    return this.deleteObjWithId(connId, from);
  };

  proto.changePositions = function (id2position, flow, from) {
    this.openBatch({ name:'changePositionsIn..', flow:flow }, from);
    eg.forEach(id2position, function(pos, id) {
      var map2id = this.relations['parentChild']['1->2->id'];
      var rel = map2id[flow][id];
      var argObj = { props:{ val_2:pos } };
      this.changeGeneric(rel, argObj, from);
    }, this);
    this.closeBatch({ name:'..changePositionsIn', flow:flow }, from);
  };
  proto.clearCopyStore = function (from) {
    var childsObj = this.getSelected();
    eg.forEach(childsObj, function(pos, id) {
      this.deleteElement(id, this.copyStoreID, from);
    }, this);
  };
  // flow is needed for getting elem positions
  proto.selectIn = function (ids, flow, from) {
    this.openBatch('selectIn..', from); // treat removing/adding childParent relations as unit
    this.clearCopyStore(from);
    // insert selected elems into copyStore (becoming parent of them)
    var child2pos = this.parent2Childs[flow];
    var selected = eg.selectPropsByKeysArr(child2pos, ids);
    eg.forEach(selected, function(pos, id) {
      this.addChildParentRelation(id, this.copyStoreID, pos, 'selectIn');
    }, this);
    this.closeBatch('..selectIn', from);
    return ids.length;
  };


  //  cloning
  //

  proto.basicCloneElem = function (elemObj) {
    var keysToBeRemoved = { // only keys are of interest here
      id:null, creationTime:null, createdBy:null,
      lastModificationTime:null, lastModifiedBy:null,
      modificationCount:null
    };
    var filteredProps = eg.filter(elemObj, function(val, key) {
      return ! (key in keysToBeRemoved);
    });
    var newElem = this.create(filteredProps);
    return newElem;
  };

  //  paste, alias
  //

  proto.pasteChilds_elemMap_parent2childs = function (
    child2pos, parent, old2new,
    elemMap, parent2childs) {
    eg.forEach(child2pos, function(pos, id) {
      var elemObj = elemMap[id];
      var newElem;
      if (id in old2new) {
        newElem = old2new[id]; // already cloned
      } else {
        newElem = this.basicCloneElem(elemObj);
        old2new[id] = newElem;
        var child2pos = parent2childs[id] || { };
        this.pasteChilds_elemMap_parent2childs(child2pos, newElem, old2new,
                                               elemMap, parent2childs);        
      }
      this.addChildParentRelation(newElem, parent, pos, 'paste');
    }, this);
  };
  proto.pasteChilds = function (child2pos, parent, old2new) {
    return this.pasteChilds_elemMap_parent2childs(
      child2pos, parent, old2new,
      this.objectMap, this.parent2Childs
    );
  };
  proto.getSelected = function () {
    return this.parent2Childs[this.copyStoreID];
  };
  proto.hasSelected = function () {
    return eg.numOfProps(this.getSelected());
  };
  proto.computeMinPoint = function (id2point) {
    return eg.inject(
      id2point,
      eg.Point.xy(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
      function(injected, val) { return injected.min(val); }
    );
  };

  // Cloning has to ensure that relations are reflected in Model (objectMap,
  // actionS, relations).
  proto.pasteInto_child2pos_elemMap_relMap_parent2childs = function (
    flow, offset, from,
    child2pos, elemMap, relMap, parent2childs) {
    var numChild2pos = eg.numOfProps(child2pos);
    if (! numChild2pos) {
      return 0;
    }
    var minPoint = this.computeMinPoint(child2pos);
    this.openBatch({ name:'pasteInto..', flow:flow }, from);
    var old2new = { };
    this.pasteChilds_elemMap_parent2childs(
      eg.map(child2pos, function(pos, key) {
        return offset.add(pos).sub(minPoint);
      }),
      flow, old2new,
      elemMap, parent2childs
    );
    var conns = eg.filter(
      this.filterConnections_map(relMap),
      function(connObj, id) {
        return relMap[connObj.id]
          && connObj.key_1 in old2new && connObj.key_2 in old2new;
      }, this);
    eg.forEach(conns, function(connObj, id) {
      this.createConn(old2new[connObj.key_1], old2new[connObj.key_2],
                      'pasteInto');
    }, this);
    this.send({ event:'pasted', into:flow, elems:eg.vals(old2new), triggeredBy:from });
    this.closeBatch({ name:'..pasteInto', flow:flow }, from);
    return numChild2pos;
  }; // proto.pasteInto_child2pos_elemMap_relMap_parent2childs()
  proto.pasteInto = function (flow, offset, from) {
    return this.pasteInto_child2pos_elemMap_relMap_parent2childs(
      flow, offset, from,
      this.getSelected(), this.objectMap, this.objectMap, this.parent2Childs,
      "paste", "pasted"
    );
  };
  proto.collectChilds = function (child2pos, collected) {
    eg.forEach(child2pos, function(pos, id) {
      var elemObj = this.getObject(id);
      var newElem;
      if (id in collected) {
        // do nothing (already traversed)
      } else {
        collected[id] = elemObj;
        var child2pos = this.parent2Childs[id] || { };
        this.collectChilds(child2pos, collected);        
      }
    }, this);
  };
  proto.exportToObj = function () {
    var sels = this.getSelected();
    var numSels = eg.numOfProps(sels);
    if (! numSels) {
      return null;
    }
    var elems = { };
    this.collectChilds(sels, elems);
    var rels = this.filterObjects(function(obj, id) {
      return obj._relation && obj.key_1 in elems && obj.key_2 in elems;
    });
    return { child2pos:sels, elemMap:elems, relMap:rels };
  }; // exportToObj()
  proto.exportToStore = function () {
    var obj = this.exportToObj();
    ryt.exportLocally("exportImportStore", obj); // not storeLocally()!
    if (! obj) {
      return null;
    }
    return {
      numTopLevelElements: eg.numOfProps(obj.child2pos),
      numAllElements: eg.numOfProps(obj.elemMap),
      numRelations: eg.numOfProps(obj.relMap)
    };
  };
  proto.importFromStore = function () {
    this.clearCopyStore();
    var obj = ryt.importLocally("exportImportStore"); // not loadLocally()!
    if (! obj) {
      return null;
    }
    return this.importFromObj(obj);
  };
  proto.importFromObj = function (obj) {
    var parent2childs = { };
    eg.forEach(obj.relMap, function(obj, id) {
      if (obj.type === 'parentChild') {
        var parent = obj.key_1;
        parent2childs[parent] = parent2childs[parent] || { };
        parent2childs[parent][obj.key_2] = obj.val_2; // child -> pos
      }
    });
    var numPasted = this.pasteInto_child2pos_elemMap_relMap_parent2childs(
      this.copyStoreID, eg.Point.zero(), 'import',
      obj.child2pos, obj.elemMap, obj.relMap, parent2childs
    );
    return {
      topLevelElementMap: obj.child2pos,
      numTopLevelElements: numPasted,
      numAllElements: eg.numOfProps(obj.elemMap),
      numRelations: eg.numOfProps(obj.relMap)
    };
  }; // importFromObj()
  proto.aliasInto = function (flow, offset, info, from) {
    var selected = this.getSelected();
    var numSelected = eg.numOfProps(selected);
    if (! numSelected) {
      return 0;
    }
    info.alreadyInTarget = [];
    info.wouldGenerateCycle = [];
    for (id in selected) {
      if (this.child2Parents[id][flow]) {
        info.alreadyInTarget.push(id);
      }
      if (id === flow // would become direct parent of itself
          || this.elemHasParentRecursive(flow, id) /* would become indirect parent of itself */) {
        info.wouldGenerateCycle.push(id);
      }
    };
    if (info.alreadyInTarget.length || info.wouldGenerateCycle.length) {
      return null; // error case
    }
    var minPoint = this.computeMinPoint(selected);
    var aliased = [];
    this.openBatch({ name:'aliasInto..', flow:flow }, from);
    eg.forEach(selected, function(pos, id) {
      this.addChildParentRelation(id, flow,
                                  offset.add(pos).sub(minPoint),
                                  'aliasInto');
      aliased.push(id);
    }, this);
    this.send({ event:'aliased', into:flow, elems:aliased, triggeredBy:from });
    this.closeBatch({ name:'..aliasInto', flow:flow }, from);
    return aliased.length;
  }; // aliasInto()

  // dirty checks
  proto.isEmpty = function () {
    return eg.numOfProps(this.objectMap) === 2 && ! this.actionS.length;
  };
  proto.hasUnsavedChanges = function () {
    if (this.condensedBeforeSnapshotFlag // false after adding snapshot marker
        || this.lockedBy !== this.initial_lockedBy) {
      return true;
    }
    if (this.atEnd()) {
      if (this.isEmpty() || this.justAfterSnapshotMarker()) {
        return false; // empty project or just saved
      }
    }
    return true;
  };

  // TODO?
  proto.changeTaskName = function (taskId, newName, from) {
    return this.change(taskId, { name: newName }, from);
  };

  // export
  //
  ryt.createModel_1_1 = createModel;
  ryt.getModelVersionString_1_1 = Model.versionString;

}(EvolGo, RYT));
