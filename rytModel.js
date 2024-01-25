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
  Model.sessionTimestamp = + new Date();
  proto.initUID = 'init';
  proto.setIdPrefix = function (browserInstanceId) {
    this.idPrefix =                                   // uniqueness for:
    (browserInstanceId ? browserInstanceId + "_" : "")// - browser instances started at same time,
      + Model.sessionTimestamp                        // - sessions in same browser instance,
      + "_" + this.instanceCount;                     // - model instances in same session.
  };
  proto.init = function (dataOrNil) { // to be called from childs
    this.instanceCount = ++this._proto.instanceCount; // this: inst of subproto, this._proto: inst of proto;
                                                      // re refers to this.instanceCount in Model() above
    this.idCount = 0; // for uniqueness of object ids

    this.objectStore = eg.createObjectStore();
    this.objectStore.createCB = eg.bindThis(this.createCB, this);
    this.objectStore.changeCB = eg.bindThis(this.changeCB, this);
    this.objectStore.deleteCB = eg.bindThis(this.deleteCB, this);
    // access shortcut
    this.objectMap = this.objectStore.getObjectMap();

    // channel we are listening from
    this.transactionsChannel = this.objectStore.channel;
    this.transactionsChannel.addListener(this);
    // channel we are sending into
    this.channel = new eg.Channel();
    // channel we are just publishing
    this.actionSChannel = this.objectStore.actionSChannel;

    this.relations = { }; // named relations for fast access
    this.users = { };
    this.currentUID = proto.initUID; // to be replaced by user id
    this.setIdPrefix(this.currentUID);
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
    return "Model_v" + major + "." + minor;
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

  // Because of JSON serialization of locally imported objects, collections
  // needn't be copied/cloned: further activities do not affect model objects.
  proto.asData = function () {
    return { objectStore: this.objectStore.asData(),
             versionMajor: this.versionMajor, versionMinor: this.versionMinor,
             users: this.users,
             title: this.title,
             lockedBy: this.lockedBy };
  };
  proto.initFromDataProperties = function (storedObjectStore) {
    this.objectStore.initFromData(storedObjectStore);
  };
  proto.initFromData = function (data) {
    if (this.versionMajor !== data.versionMajor) {
      var str =
        "Model version of imported data (" + this.versionStringOf(data) + ") is incompatible with builtin one ("
        + this.versionString() + "): please use other - major - RYT version.";
      throw str;
    }
    if (this.versionMinor < data.versionMinor) {
      throw "Model version of imported data (" + this.versionStringOf(data) + ") is newer than builtin one ("
        + this.versionString() + "): please use newer RYT version.";
    }
    if (this.versionMinor > data.versionMinor) {
      for (var i = data.versionMinor; i < this.versionMinor; ++i) {
        this.logger && this.logger.infoNStayLong(
          "Converting data from model version "
            + this.versionStringOf({ versionMajor: this.versionMajor, versionMinor: i })
            +" to "
            + this.versionStringOf({ versionMajor: this.versionMajor, versionMinor: i+1 })
            +" (minor version upgrade)."
        );
        data = this['upgrade_'+ i + '_' + (i+1)](data);
      }
    }
    this.initFromDataProperties(data.objectStore);
    this.users = data.users;
    this.title = data.title;
    this.lockedBy = data.lockedBy || null; // may be missing
  };
  // user management
  proto.addUser = function (uid, name) {
    eg.assert(uid !== this.initUID && ! this.users[uid]);
    this.users[uid] = name;
  };
  proto.setUserID = function (uid) {
    eg.assert(uid in this.users);
    var oldUID = this.currentUID;
    this.currentUID = uid;
    // browserInstanceId arg: two browsers won't be started at exactly the same
    // time by same user
    this.setIdPrefix(uid);
  };
  proto.getUserID = function () {
    eg.assert(this.currentUID !== this.initUID);
    return this.currentUID;
  }
  proto.getUser = function (uid) {
    return this.users[uid] || null;
  };
  proto.getUserName = function (uid) {
    return uid === this.initUID
      ? "no user (init phase)"
      : this.getUser(uid) || "unknown";
  };
  proto.setUserName = function (uid, name) {
    eg.assert(this.users[uid]);
    this.users[uid] = name;
  };
  proto.containsUser = function (uid) {
    return this.getUser(uid) !== null;
  };


  // events
  //

  proto.send = function (msg) {
    return this.channel && this.channel.sendFrom(msg, this);
  };
  proto.createEvents = function (event, triggeredBy, transInfo) {
    var id2oldProps = transInfo.id2old;
    var id2newProps = transInfo.id2new;
    var id2obj = transInfo.id2obj;
    var msg;
    if (event === 'deleted') {
      eg.forEach(id2oldProps, function(oldProps, id) {
        msg = {
          event:event, triggeredBy:triggeredBy,
          id:id, oldProps:oldProps
        };
        this.send(msg, this);
      }, this);
    } else if (event === 'created') {
      eg.forEach(id2newProps, function(newProps, id) {
        msg = {
          event:event, triggeredBy:triggeredBy,
          id:id, newProps:newProps
        };
        this.send(msg, this);
      }, this);
    } else if (event === 'changed') {
      eg.forEach(id2newProps, function(newProps, id) {
        msg = {
          event:event, triggeredBy:triggeredBy,
          id:id, newProps:newProps, oldProps:id2oldProps[id],
          objProps:id2obj[id]
        };
        this.send(msg, this);
      }, this);
    } else {
      eg.assert(false, "should not be reached");
    }
  };
  // channel to channel transform:
  // - ignores 'trans_cancelled' (unused)
  proto.receiveFrom = function (msg, sender) {
    //eg.log(this + " receiveFrom()", msg.event);
    // send trans start event before sending inner trans events (which are not
    // there in case of 'trans_open').
    if (msg.event === 'trans_apply_begin' || msg.event === 'trans_open') {
      this.send( {
        event: msg.event,
        transaction: msg.transaction,
        triggeredBy: msg.triggeredBy
      } );
      return;
    }
    // inner trans events
    if (msg.event === 'trans_apply_end' || msg.event === 'trans_close') {
      var transInfo = msg.transaction;
      // event seq matters! elems should have been created before being moved
      // by changing rels...
      this.createEvents('deleted', msg.triggeredBy, transInfo.deleted);
      this.createEvents('created', msg.triggeredBy, transInfo.created);
      var changed = transInfo.changed;
      if (eg.hasProps(changed.id2obj)) {
        var changes_other           = { id2new:{}, id2old:{}, id2obj:{} };
        var changes_conn_fromTo = { id2new:{}, id2old:{}, id2obj:{} };
        var changes_parentChild = { id2new:{}, id2old:{}, id2obj:{} };
        var id2new = transInfo.changed.id2new;
        var id2old = transInfo.changed.id2old;
        var id2obj = transInfo.changed.id2obj;
        for (var id in id2obj) {
          var obj = this.getObject(id);
          if (obj._relation) {
            if (obj._relation === 'conn_fromTo') {
              changes_conn_fromTo.id2new[id] = id2new[id];
              changes_conn_fromTo.id2old[id] = id2old[id];
              changes_conn_fromTo.id2obj[id] = id2obj[id];
            } else if (obj._relation === 'parentChild') {
              changes_parentChild.id2new[id] = id2new[id];
              changes_parentChild.id2old[id] = id2old[id];
              changes_parentChild.id2obj[id] = id2obj[id];
            } else {
              eg.assert(false, "should not been reached");
            }
          } else {
            changes_other.id2new[id] = id2new[id];
            changes_other.id2old[id] = id2old[id];
            changes_other.id2obj[id] = id2obj[id];
          }
        };
        this.createEvents('changed', msg.triggeredBy, changes_other);
        this.createEvents('changed', msg.triggeredBy, changes_conn_fromTo);
        this.createEvents('changed', msg.triggeredBy, changes_parentChild);
      }
      // send trans finish event after sending inner trans events
      this.send( {
        event: msg.event,
        transaction: msg.transaction,
        triggeredBy: msg.triggeredBy
      } );
    }
  }; // receiveFrom()
//&&&
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
  };
  proto.holdsObject = function (obj) {
    return this.getId(obj) !== null;
  };
  proto.installRelation = function (relObj) {
    eg.assert(this.holdsObject(relObj));//todo: rm later
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

  //use for model init during om init
  proto.changeCB = function (id, oldProps, newProps) {
    var obj = this.objectMap[id];
    if (obj._relation) {
      //eg.log("changeCB() for relation...");
      var relName = obj._relation;
      if (relName) {
        var rel = this.relations[relName];
        if (newProps.val_1) {
          rel['2->1'][obj.key_2][obj.key_1] = newProps.val_1;
        }
        if (newProps.val_2) {
          rel['1->2'][obj.key_1][obj.key_2] = newProps.val_2;
        }
      }
    }
  };
  proto.createCB = function (id, newProps) {
    if (newProps._relation) {
      this.installRelation(newProps);
    }
  };
  proto.deleteCB = function (id, oldProps) {
    eg.assert(! this.holdsId(id));//todo: rm later
    if ('_relation' in oldProps) {
      var rel = this.relations[oldProps._relation];
      var key_1 = oldProps.key_1;
      var key_2 = oldProps.key_2;
      // alt for deletes: = null
      delete rel['1->2'][key_1][key_2];
      delete rel['2->1'][key_2][key_1];
      eg.assert(rel['1->2->id'][key_1][key_2] === id);
      delete rel['1->2->id'][key_1][key_2];
    }
  };


  // Model ops
  //

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
    this.objectStore.doCreate(obj.id, obj);
    return obj.id;
  };
  proto.createRelation = function (props, from) {
    eg.assert(eg.isUndefined(props.id));
    props._relation = props.type; // mark as relation
    return this.create(props, from);
  };
  proto.deleteObjWithId = function (id, from) {
    var obj = this.getObject(id);
    eg.assert(! obj.deleted);
    this.objectStore.doDelete(id);
  };

  // ask for changed props
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

  proto.change = function (id, props, from) {
    eg.assert(props);
    var obj = this.getObject(id);
    eg.assert(obj);
    var newProps = eg.filter(props, function(prop, key) {
      return prop !== obj[key];
    });
    if (! eg.hasProps(newProps)) {
      return; // avoid NOOP
    }
    newProps.lastModificationTime = +new Date();
    // Note: there are objs modified without modificationCount (older models).
    if (obj.modificationCount) {
      newProps.modificationCount = obj.modificationCount + 1;
    } else if (! obj.lastModificationTime) { // first modification: ..
      newProps.modificationCount = 1; // create modificationCount.
    } else {
      // Don't start with modificationCount, if object has been modified
      // before without it.
    }
    newProps.lastModifiedBy = this.currentUID;
    this.objectStore.doChange(id, newProps);
  };
  proto.storeUndone = function () {
    this.objectStore.storeUndone();
  };
  proto.undo = function (from) {
    this.objectStore.undo(from);
  }
  proto.redo = function (from) {
    this.objectStore.redo(from);
  }
  proto.atBegin = function () {
    return this.objectStore.indexAtBegin();
  };
  proto.atEnd = function () {
    return this.objectStore.indexAtEnd();
  };

  // batches

  proto.openBatch = function (name, from) {
    //eg.log("openBatch(name, from)", name, from);
    this.objectStore.openBatch(name, from);
  };
  proto.closeBatch = function (name, from) {
    //eg.log("closeBatch(name, from)", name, from);
    this.objectStore.closeBatch(name, from);
  };

  // actionS queries

  proto.len_actionS = function () {
    return this.objectStore.len_actionS();
  };
  proto.pos_actionS = function () {
    return this.objectStore.pos_actionS();
  };
  proto.lastActionIndex = function () {
    return this.objectStore.pos_actionS() - 1;
  };
  proto.actionIsSnapshotMarkerAt = function (ix) {
    return this.objectStore.isMarkerAt(ix);
  };

  // snapshot markers

  proto.addSnapshotMarker = function (from) {
    // add id and timestamp
    var markerObj = this.basicCreate({ type:'marker' });
    this.objectStore.addMarker(markerObj, from);
    return markerObj.id;
  };
  proto.justAfterSnapshotMarker = function () {
    return this.objectStore.justAfterMarker();
  };
  proto.markerObjectAt = function (ix) {
    return this.objectStore.getMarkerAt(ix);
  };
  proto.numOfSnapshotMarker = function (id) {
    return this.objectStore.numOfMarkerWithId(id);
  };
  // only works justAfterSnapshotMarker
  proto.numOfCurrentSnapshotMarker = function () {
    return this.numOfSnapshotMarker(
      this.markerObjectAt(this.lastActionIndex()).id
    );
  };

  // condense

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
  }; // condenseRelations()
  proto.storeObjectMap = function () {
    this.objectStore.storeObjectMap();
  };
  proto.condense = function () {
    this.objectStore.condenseAll();
    this.condenseRelations();
  }; // condense()
  proto.condenseBetweenSnapshotMarkers = function () {
    this.objectStore.condenseBetweenMarkers();
    this.condenseRelations();
  }; // condenseBeforeSnapshotMarkers()

  // stats

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

  eg.Model = Model;
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
  Model.prototype = new eg.Model();
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
    str += "\nactionS ix/len: " + this.pos_actionS() + "/"
      + this.len_actionS();
    str += "\nmarkersInActionS/markers count: "
      + this.objectStore.count_markersInActionS() + "/"
      + this.objectStore.count_markers();
    str += "\nelem count: " + (stats.om_objCount - stats.om_relObjCount);
    str += "\nreachable via root count: " + stats.reachableViaRootCount;
    str += "\nreachable via copyStore count: "
      + stats.reachableViaCopyStoreCount;
    str += "\nreachable via root'n'copyStore count: "
      + stats.reachableViaRootNCopyStoreCount;

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
  proto.versionMinor = 2; // model should always be convertable to next minor version
  // version info in proto for giving access to eg.Model

  Model.versionString = function () {
    return proto.versionStringOf(proto);
  };

  proto.upgrade_0_1 = function (data) {
    eg.assert(data.versionMinor === 0);
    data.copyStoreID = this.initCopyStoreInObjectMap(data.storedObjectMap).id;
    data.versionMinor = 1;
    return data;
  };
/* marker m1.2
      {
        "createdBy": "sr",
        "creationTime": 1327162100220,
        "id": "1327161757729_1_5",
        "type": "marker"
      },
*/
  proto.upgrade_1_2 = function (data_1_1) {
    eg.assert(data_1_1.versionMinor === 1 && this.versionMinor === 2
              && data_1_1.versionMajor === this.versionMajor);
    var model_1_1 = ryt.createModel_1_1(null, null, data_1_1);
    var marker2props = {};
    model_1_1.actionS.forEach(function(action) {
      if (model_1_1.isSnapshotAddingAction(action)) {
        var props = action.doArg.props;
        marker2props[props.marker] = props;
      }
    });
    model_1_1.condense();
    var data = model_1_1.asData();
    // create ObjectStore data
    var markers = [];
    var lenSnapshotPrefix = 'snapshot_'.length;
    data.snapshotMarkers.forEach(function(markerId, ix) {
      var idWithoutPrefix = markerId.substr(lenSnapshotPrefix);
      var timeStr = idWithoutPrefix.substr(0, idWithoutPrefix.indexOf('_'));
      // get info from markerProps, if available
      var markerProps = marker2props[markerId];
      var createdBy = markerProps && markerProps.createdBy
        || 'unknown'; // not available
      var creationTime = markerProps && markerProps.creationTime
        || +timeStr; // use time extracted from snapshot_*_* marker
      markers.push({
        type: 'marker',
        id: markerId,// from snapshotMarkers for project data subset comparisons
        creationTime: creationTime,
        createdBy: createdBy
      });
    });
    data.objectStore = {
      markers:markers,
      storedObjectMap: data.storedObjectMap,
      actionS: []
    };
    delete data.snapshotMarkers;
    delete data.storedObjectMap;
    delete data.actionS;
    data.versionMinor = 2;
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
    // robust for transaction queries at its begin
    // (at its *end* child2parents should be set correctly)
    // (MO_Visualizer)
    return eg.propsIntersection(
      this.child2Parents[c1] || {}, this.child2Parents[c2] || {}
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
    // robust for transaction queries at its begin
    // (at its *end* child2parents should be set correctly)
    var parents_1 = this.child2Parents[id_1] || {};
    var parents_2 = this.child2Parents[id_2] || {};

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

  var sum_nextNeighbors = 0;
  var sum_nextNeighbors2 = 0;
  proto.h_traverseOmitVisitedMulti = function (
    id2val, actionFunc, neighborsFunc, alreadyVisited, thisOrNil)
  {
    if (! eg.hasProps(id2val)) {
      return;
    }
    actionFunc.call(thisOrNil, id2val);
    var nextNeighbors = neighborsFunc.call(thisOrNil, id2val);
    eg.log("nextNeighbors:", nextNeighbors);
    sum_nextNeighbors += Object.keys(nextNeighbors).length;
    eg.log("sum_nextNeighbors:", sum_nextNeighbors);
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

  proto.h_traverseOmitVisitedMulti2 = function (
    id2val, actionRetNeighborsFunc, alreadyVisited, thisOrNil)
  {
    if (! eg.hasProps(id2val)) {
      return;
    }
    var nextNeighbors = actionRetNeighborsFunc.call(thisOrNil, id2val);
    eg.log("nextNeighbors:", nextNeighbors);
    sum_nextNeighbors2 += Object.keys(nextNeighbors).length;
    eg.log("sum_nextNeighbors2:", sum_nextNeighbors2);
    alreadyVisited = eg.propsUnion(alreadyVisited, id2val);
    var neighbors = eg.propsSub(nextNeighbors, alreadyVisited);
    this.h_traverseOmitVisitedMulti2(
      neighbors, actionRetNeighborsFunc, alreadyVisited, thisOrNil
    );
  };
  proto.traverseOmitVisitedMulti2 = function (
    id2val, actionRetNeighborsFunc, thisOrNil)
  {
    return this.h_traverseOmitVisitedMulti2(
      id2val, actionRetNeighborsFunc,
      { }, thisOrNil
    );
  }
  proto.traverseOmitVisitedSingle2 = function (
    id2val, actionRetNeighborsFunc, thisOrNil)
  {
    var actionRetNeighborsFuncMulti = eg.mapReduceFunc(actionRetNeighborsFunc,
                                                       eg.propsUnion, { });
    return this.traverseOmitVisitedMulti2(
      id2val, actionRetNeighborsFuncMulti, thisOrNil
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
    if (finished !== false) {
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
        } else { // update in all views
          this.send({event:'updateElem',
		     elem:id,
		     reason:'some successor prio prop changed',
		     succcessor:startId,
		     triggeredBy:this});
        }
      }
    }
    function neighborsFunc(val, id) {
      var obj = this.getObject(id);
      if (obj.type !== 'task' // only propagate via tasks
          // "shortcut" '|| obj.prio == prio' would be wrong
         ) {
        return { };
      }
      // jump over non-prio task to next task
      var res = this.toFrom[id]; // next id2val obj (val unused)
      //eg.log(res);
      return res;
    }

    function actionReturnNeighborsFunc(val, id) {
      var obj = this.getObject(id);
      if (obj.type == 'task' && ! eg.isNil(obj.prio)) {
        if (obj.prio < prio) {
          this.change(id, { prio:prio }, 'propagatePrio()');
          return { }; // its neighbors computation triggered by change()
        } else { // update in all FEs
          this.send({event:'updateElem',
		     elem:id,
		     reason:'some successor\'s prio prop changed',
		     succcessor:startId,
		     triggeredBy:this});
        }
      }
      return this.toFrom[id];
    }

    var startId2val = this.toFrom[startId];
    if (false) {
      this.traverseOmitVisitedSingle(
        startId2val, actionFunc, neighborsFunc, this
      );
    } else {
      this.traverseOmitVisitedSingle2(
        startId2val, actionReturnNeighborsFunc, this
      );
    }
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

  proto.addChildParentRelation = function (child, parent, pos, from) {
    this.createRelation({ type:'parentChild',
                          key_1:parent, key_2:child, val_2:pos },
                        from);
    var childObj = this.getObject(child);
    if ('finished' in childObj) {
      this.updateFinishedInParent(parent);
    }
  };
  // batch from callers
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
    from = from || this.toString();
    this.openBatch('createTask', from);
    var props = { type:'task',
                  name:name, description:description };
    finishedOrNIL !== undefined && (props.finished = finishedOrNIL);
    prioOrNIL !== undefined && (props.prio = prioOrNIL);
    logicOrNIL !== undefined && (props.logic = logicOrNIL);
    subtaskFinishPropagationOrNIL !== undefined && (props.subtaskFinishPropagation = subtaskFinishPropagationOrNIL);

    var task = this.create(props, from);
    this.addChildParentRelation(task, parent, pos, from);
    this.closeBatch('createTask', from);
    return task;
  };
  proto.change = function (id, props, from) {
    from = from || this.toString();
    if (! this.elemWouldChangeBy(id, props)) {
      eg.warn("[Model] element change() would be a NOOP: ignored.");
      return;
    }
    this.openBatch('change', from);
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
    this.closeBatch('change', from);
  };
  proto.createConn = function (fromId, toId, from) {
    this.openBatch('createConn', from);
    var relation = this.createRelation(
      { type:'conn_fromTo', key_1:fromId, key_2: toId },
      from
    );
    this.propagatePrio(toId);
    this.propagateFinishedState(fromId);
    this.closeBatch('createConn', from);
    return relation;
  };
  proto.createComment = function (parent, pos, text, from) {
    this.openBatch('createComment', from);
    var props = { type: 'comment',
                  text: text
                };
    var comment = this.create(props, from );
    this.addChildParentRelation(comment, parent, pos, from);
    this.closeBatch('createComment', from);
    return comment;
  };
  proto.deleteTask = function (task, inParent, from) {
    this.openBatch('deleteTask', from);
    this.removeChildParentRelation(task, inParent, from); // 1.
    // updated by deleteCB()
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
    this.closeBatch('deleteTask', from);
  };
  proto.deleteComment = function (comment, inParent, from) {
    this.openBatch('deleteComment', from);
    this.removeChildParentRelation(comment, inParent, from);
    if (! eg.hasProps(this.child2Parents[comment])) {
      this.deleteObjWithId(comment, from);
    }
    this.closeBatch('deleteComment', from);
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
    this.openBatch('deleteConn', from);
    this.deleteObjWithId(connId, from);
    this.closeBatch('deleteConn', from);
  };

  proto.changePositions = function (id2position, flow, from) {
    this.openBatch('changePositions', from);
    eg.forEach(id2position, function(pos, id) {
      var map2id = this.relations['parentChild']['1->2->id'];
      var rel = map2id[flow][id];
      var props = { val_2:pos };
      this.change(rel, props, from);
    }, this);
    this.closeBatch('changePositions', from);
  };
  proto.clearCopyStore = function (from) {
    var childsObj = this.getSelected();
    eg.forEach(childsObj, function(pos, id) {
      this.deleteElement(id, this.copyStoreID, from || 'clearCopyStore');
    }, this);
  };
  // flow is needed for getting elem positions
  proto.selectIn = function (ids, flow, from) {
    this.openBatch('selectIn', from); // treat removing/adding childParent relations as unit
    this.clearCopyStore('selectIn');
    // insert selected elems into copyStore (becoming parent of them)
    var child2pos = this.parent2Childs[flow];
    var selected = eg.selectPropsByKeysArr(child2pos, ids);
    eg.forEach(selected, function(pos, id) {
      this.addChildParentRelation(id, this.copyStoreID, pos, 'selectIn');
    }, this);
    this.closeBatch('selectIn', from);
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
    this.openBatch('pasteInto', from);
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
    this.closeBatch('pasteInto', from);
    this.send({ event:'pasted', into:flow, elems:eg.vals(old2new), triggeredBy:from });
    return numChild2pos;
  }; // proto.pasteInto_child2pos_elemMap_relMap_parent2childs()
  proto.pasteInto = function (flow, offset, from) {
    return this.pasteInto_child2pos_elemMap_relMap_parent2childs(
      flow, offset, from,
      this.getSelected(), this.objectMap, this.objectMap, this.parent2Childs
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
    if (! this.hasSelected()) {
      return null;
    }
    var sels = this.getSelected();
    var elems = { };
    this.collectChilds(sels, elems);
    var rels = this.filterObjects(function(obj, id) {
      return obj._relation && obj.key_1 in elems && obj.key_2 in elems;
    });
    return { // version info started with v1.2
      child2pos:sels, elemMap:elems, relMap:rels,
      versionMajor:this.versionMajor, versionMinor:this.versionMinor
    };
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
    var obj = ryt.importLocally("exportImportStore"); // not loadLocally()!
    if (! obj) {
      return null;
    }
    if (! eg.isEqualModelVersion(obj, this)) {
      this.logger && this.logger.error(
        "Cannot import data from different model version: used now is "
          + this.versionString() + ", stored one is "
          + this.versionStringOf(obj) + "."
          + "\nPlease export again (using current RYT)."
      );
      // clear store to avoid getting this problem again
      ryt.exportLocally("exportImportStore", null);
      return;
    }
    this.openBatch('importFromStore', this.toString());
    this.clearCopyStore('importFromStore');
    var res = this.importFromObj(obj);
    this.closeBatch('importFromStore', this.toString());
    return res;
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
    if (! this.hasSelected()) {
      return 0;
    }
    var selected = this.getSelected();
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
    this.openBatch('aliasInto', from);
    eg.forEach(selected, function(pos, id) {
      this.addChildParentRelation(id, flow,
                                  offset.add(pos).sub(minPoint),
                                  'aliasInto');
      aliased.push(id);
    }, this);
    this.closeBatch('aliasInto', from);
    this.send({ event:'aliased', into:flow, elems:aliased, triggeredBy:from });
    return aliased.length;
  }; // aliasInto()

  // &&& semantics could be: no elem added after initing without data
  proto.isEmpty = function () {
    return this.objectStore.isEmpty(); // when should this be (after init)?
  };

  // TODO?
  proto.changeTaskName = function (taskId, newName, from) {
    return this.change(taskId, { name: newName }, from);
  };

  // export
  //
  ryt.createModel = createModel;
  ryt.getModelVersionString = Model.versionString;

}(EvolGo, RYT));
