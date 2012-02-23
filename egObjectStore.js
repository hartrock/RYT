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

// top level namespace objects: ensure their existence
var EvolGo = EvolGo || { };

(function(eg) { // namespace args at end, exports before them
  var dbg = false;
  var log = eg.log;
  var assert = eg.assert;

  var c_delete = 'delete';

  function createTransaction(id2old, id2new) { // opt args
    return new Transaction(id2old, id2new);
  }
  function createTransactionToCreate(obj) {
    var id2old = eg.map(obj, function() {
      return c_delete;
    });
    return createTransaction(id2old, obj); // trans shares obj!
  }
  function Transaction(id2old, id2new) { // opt args
    this.id2old = id2old || {};
    this.id2new = id2new || {};
    if (! id2old) {
      this.open = true;
    }
  }
  var protoT = Transaction.prototype;

  protoT.close = function () {
    delete this.open;
  }
  protoT.isOpen = function () {
    return this.open;
  }
  protoT.isClosed = function () {
    return ! this.open;
  }
  //
  protoT.touched = function (id) {
    return id in this.id2old; // implies id in id2new
  };
  protoT.created = function (id) {
    return this.id2old[id] === c_delete; // implies touched
  };
  protoT.deleted = function (id) {
    return this.id2new[id] === c_delete; // implies touched
  };
  protoT.changed = function (id) {
    return this.touched(id)
      && ! this.created(id)
      && ! this.deleted(id);
  };
  protoT.isEmpty = function () {
    return ! eg.hasProps(this.id2old); // implicit && ! eg.hasProps(id2new);
  }; 
  protoT.addCreate = function (id, newProps) {
    dbg && assert(this.open
                  && ! this.created(id) && ! this.changed(id)); // do not create twice
    if (! this.touched(id)) { // fresh
      this.id2new[id] = eg.cloneProps(newProps);
      this.id2old[id] = c_delete;
    } else { // deleted then created: transform into change
      dbg && assert(this.deleted(id));
      this.id2new[id] = eg.cloneProps(newProps);
      // deletion backwards
      eg.forEach(newProps, function(id, prop) {
        if (! id in this.id2old) {
          this.id2old[id] = undefined; // mark for deletion
        }
      }, this);
    }
  };
  protoT.addChange = function (id, oldProps, newProps) {
    dbg && assert(this.open
                  && ! this.deleted(id));
    if (! this.touched(id)) { // unknown so far, store change
      this.id2old[id] = eg.cloneProps(oldProps);
      this.id2new[id] = eg.cloneProps(newProps);
    } else { // touched
      if (this.changed(id)) {
        // store old props, but avoid ..
        eg.copyMissingProps(oldProps, this.id2old[id]);//.. overwriting older ones.
        eg.copyProps(newProps, this.id2new[id]); // overwrite or extend new ones
      } else { // created
        dbg && assert(this.created(id));
        eg.copyProps(newProps, this.id2new[id]); // overwrite or create 'more'
        // stays: id2old[id] === c_delete;
      }
    }
  };
  protoT.addDelete = function (id, oldProps) {
    dbg && assert(this.open
                  && ! this.deleted(id));
    if (! this.touched(id)) { // fresh
      this.id2new[id] = c_delete;
      this.id2old[id] = eg.cloneProps(oldProps);
    } else { // touched before
      if (this.changed(id)) { // store old props, but do not overwrite ..
        eg.copyMissingProps(oldProps, this.id2old[id]); //.. more older ones.
        this.id2new[id] = c_delete;
      } else { // created then deleted: NOOP -> remove from transaction
        dbg && assert(this.created(id));
        delete this.id2old[id];
        delete this.id2new[id];
      }
    }
  };
  protoT.reverted = function () {
    return new Transaction(this.id2new, this.id2old); // auto closed
  };
  protoT.addTransaction = function (other) {
    dbg && assert(this.open
                  && ! other.open);
    for (var id in other.id2new) {
      if (other.created(id)) {
        this.addCreate(id, other.id2new[id]);
      } else if (other.deleted(id)) {
        this.addDelete(id, other.id2old[id]);
      } else {
        dbg && other.changed(id);
        this.addChange(id, other.id2old[id], other.id2new[id]);
      }
    }
  };
  protoT.addTransactions = function (transArr) {
    dbg && assert(this.open);
    transArr.forEach(function(trans) {
      dbg && assert(! trans.open);
      this.addTransaction(trans);
    }, this);
  };
  protoT.getInfo = function () {
    dbg && assert(! this.open);
    var self = this;
    return {
      changed: {
        id2new: eg.filter2props(this.id2new, function(val, id) {
          return self.changed(id);
        }),
        id2old: eg.filter2props(this.id2old, function(val, id) {
          return self.changed(id);
        })
      },
      created: {
        id2new: eg.filter2props(this.id2new, function(val, id) {
          return self.created(id);
        })
      },
      deleted: {
        id2old: eg.filter2props(this.id2old, function(val, id) {
          return self.deleted(id);
        })
      },
      from: this.from // activity resulting into trans
    };
  };


  // ObjectStore helper funcs without OS inst deps

  // transactions
  function _sumTransactions(transArr) {
    var res = createTransaction();
    res.addTransactions(transArr);
    res.close();
    return res;
  }
  function _transactionsReverted(transArr) {
    return transArr.reverse().map(function(trans) {
      return trans.reverted();
    });
  }
  function _sumTransactionsReverted(transArr) {
    return _sumTransactions(_transactionsReverted(transArr));
  }
  // other
  function _extractChangedProps(obj, props, // in
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


  // ObjectStore
  //
  // - callbacks for manipulationg object map:
  //   - set callback props [create|change|delete]CB for updating dependent
  //     model *while* creating a new or applying an existing transaction
  // - transaction events *before* and *after* each transaction:
  //   - existing one: 'trans_apply_begin', 'trans_apply_end'
  //   - being created: 'trans_open', 'trans_close'
  // - actionS events for changes in actionS
  //   - 'indexChanged': but no changes in actionS
  //   - 'contentAdded': actionS increased, no changes in old actionS
  //     -> implies index change
  //   - 'contentChanged': actionS changed, probably changes in old actionS
  //     -> implies index change

  var instanceCountOS = 0;
  function ObjectStore() {
    this.om = {}; // map
    this.actionS = []; // stack
    this.undoRedoIx = 0;
    this.batchLevelS = [];
    this.trans = null; // open transaction
    this.ident = "ObjectStore_" + ++instanceCountOS;
    this.storedObjectMap = null;
    this.batchFrom = null;

    this.condenseUndoneFlag = false;
    this.channel = new eg.Channel();
    this.actionSChannel = new eg.Channel();
    this.markers = [];

    this.applyCreate_callCount = 0;
    this.applyChange_callCount = 0;
    this.applyDelete_callCount = 0;
  }
  function createObjectStore() {
    return new ObjectStore();
  }

  var protoOS = ObjectStore.prototype;

  // init

  protoOS._initObjectMap = function (storedObjectMapData) {
    if (! storedObjectMapData) {
      return;
    }
    this.storedObjectMap = storedObjectMapData;
    // init by applying a transaction for notifying dependers
    var initialTransaction = createTransactionToCreate(storedObjectMapData);
    if (! initialTransaction.isEmpty()) {
      this._applyTransactionFrom(initialTransaction, '_initObjectMap');
    }
  };
  protoOS._initActionS = function (actionSData) {
    this.actionS.length = 0;
    actionSData.forEach(function(action) { // do not use eg.forEach() here!
      if (action.trans) { // create Transaction obj
        action.trans = createTransaction(action.trans.id2old,
                                         action.trans.id2new);
      }
      this.actionS.push(action);
    }, this);
    // apply transactions in actionS
    this.undoRedoIx = 0;
    this.gotoIndex(this.actionS.length, 'init');
  };

  // events

  protoOS._enrichTransInfo = function (transInfo) {
    // get om objects for changed props
    var id2obj = {};
    for (var id in transInfo.changed.id2new) {
      id2obj[id] = this.om[id];
    };
    transInfo.changed.id2obj = id2obj;
    return transInfo;
  };
  protoOS._changedTransaction = function (event, transInfo, trigger) {
    dbg && log("_changedTransaction(event, transInfo, trigger)",
               event, transInfo, trigger);
    if (! this.channel) {
      return;
    }
    this.channel.sendFrom(
      {
        event: event, transaction: transInfo, triggeredBy: trigger
      },
      this.ident
    );
  };
  protoOS._changedActionS = function (what, from) {
    if (! this.actionSChannel) {
      return;
    }
    what.from = from;
    what.actionS = this.actionS;
    this.actionSChannel.sendFrom(what, this.ident);
  };
  protoOS._contentChangedFrom = function (from) {
    var what = { event: 'contentChanged',
                 length: this.actionS.length,
                 index: this.undoRedoIx };
    this._changedActionS(what, from);
  };
  protoOS._contentAddedFrom = function (oldLength, from) {
    var what = { event: 'contentAdded',
                 length: this.actionS.length, oldLength: oldLength,
                 index: this.undoRedoIx };
    this._changedActionS(what, from);
  };
  protoOS._indexChangedFrom = function (oldIndex, from) {
    var what = { event: 'indexChanged',
                 index: this.undoRedoIx, oldIndex: oldIndex,
                 length: this.actionS.length };
    this._changedActionS(what, from);
  };

  protoOS._getTransactions = function (begin, end) {
    return this.actionS.slice(begin, end).filter(function(action) {
      return "trans" in action;
    }).map(function(action) {
      return action.trans;
    });
  };
  protoOS._isMarkerAction = function (action) {
    return 'marker' in action;
  };

  protoOS._nextMarkerIxOrLenFrom = function (begin) {
    for (var ix = begin, len = this.actionS.length;
         ix < len;
         ++ix) {
      if (this.actionS[ix].marker) {
        return ix;
      }
    }
    // ret len for doing things with actionS after last marker
    return len;
  };

  // object store manipulation

  protoOS._applyCreate = function (id, props) {
    ++this.applyCreate_callCount;
    this.om[id] = eg.cloneProps(props);
    if (this.createCB) {
      this.createCB.call(this, id, props);
    }
  };
  protoOS._applyChange = function (id, oldProps, newProps) {
    ++this.applyChange_callCount;
    eg.modifyProps(newProps, this.om[id]);
    if (this.changeCB) {
      this.changeCB.call(this, id, oldProps, newProps);
    }
  };
  protoOS._applyDelete = function (id, oldProps) {
    ++this.applyDelete_callCount;
    this.om[id].deleted = true; // for debugging purposes
    delete this.om[id];
    if (this.deleteCB) {
      this.deleteCB.call(this, id, oldProps);
    }
  };

  // Seq counts: for one id there is only deletion xor creation xor change,
  // but there may be equal props being as well in deletion and creation.
  // These may trigger problems (there were related to relations).
  protoOS._applyTransaction = function (trans) {
    dbg && assert(trans.isClosed());
    eg.forEach(trans.id2new, function(props, id) {
      if (trans.deleted(id)) {
        this._applyDelete(id, trans.id2old[id]);
      }
    }, this);
    eg.forEach(trans.id2new, function(props, id) {
      if (trans.created(id)) {
        this._applyCreate(id, props);
      }
    }, this);
    eg.forEach(trans.id2new, function(props, id) {
      if (trans.changed(id)) {
        this._applyChange(id, trans.id2old[id], props);
      }
    }, this);
  };
  protoOS._applyTransactionFrom = function (trans, from) {
    dbg && assert(! trans.isEmpty());
    var transInfo = trans.getInfo();
    this._changedTransaction(
      'trans_apply_begin', this._enrichTransInfo(transInfo), from
    );
    this._applyTransaction(trans);
    this._changedTransaction(
      'trans_apply_end', this._enrichTransInfo(transInfo), from
    );
  };

  // actionS manipulation

  protoOS._pushUndone = function (from) {
    var transArr = this._getTransactions(this.undoRedoIx, this.actionS.length);
    if (transArr.length) { // avoid empty undoTrans
      if (this.condenseUndoneFlag) {
        var undoTrans = _sumTransactionsReverted(transArr);
        this.actionS.push({ trans: undoTrans, from: from });
      } else {
        var undoTransarr = _transactionsReverted(transArr);
        undoTransarr.forEach(function(undoTrans) {
          this.actionS.push({ trans: undoTrans, from: from });
        }, this);
      }
    }
    this.undoRedoIx = this.actionS.length; // undoTrans[arr] already applied
  };


  //
  // public
  //

  protoOS.toString = function () {
    return this.ident;
  };

  // init

  protoOS.initFromData = function (data) {
    this.markers = data.markers;
    this._initObjectMap(data.storedObjectMap);
    this._initActionS(data.actionS);
  };

  // storage

  protoOS.asData = function () {
    return {
      storedObjectMap: this.storedObjectMap || {},
      actionS: this.actionS,
      markers: this.markers
    };
  };
  protoOS.storeObjectMap = function () {
    this.storedObjectMap = eg.JSON.parse(eg.JSON.stringify(this.om));
  };

  // access

  protoOS.getObjectMap = function () {
    return this.om;
  };
  protoOS.getActionS = function () {
    return this.actionS;
  };
  protoOS.getMarkerAt = function (ix) {
    return this.actionS[ix].marker;
  };

  // queriying

  protoOS.len_actionS = function () {
    return this.actionS.length;
  };
  protoOS.pos_actionS = function () {
    return this.undoRedoIx;
  };
  protoOS.indexAtBegin = function () {
    return this.undoRedoIx === 0;
  };
  protoOS.indexAtEnd = function () {
    return this.undoRedoIx === this.actionS.length;
  };
  protoOS.isEmpty = function () {
    return ! this.actionS.length && ! this.batchLevelS.length
      && ! this.markers.length;
  };
  protoOS.isMarkerAt = function (ix) {
    return this.actionS[ix] && this.actionS[ix].marker;
  };

  // transactions

  protoOS.openBatch = function (name, from) { // name needed for first openBatch()
    dbg && eg.assert(name);
    if (! this.batchLevelS.length) {
      dbg && eg.assert(! this.trans && from);
      this.trans = createTransaction();
      this.batchFrom = from;
      this._changedTransaction('trans_open', null, from);
    }
    this.batchLevelS.push(name);
  };
  protoOS.closeBatch = function (name, from) { // name needed for last closeBatch()
    dbg && eg.assert(this.batchLevelS.length);
    var oldLength = this.actionS.length;
    // pop
    var batchLevel = this.batchLevelS.splice(-1)[0];
    dbg && eg.assert(name === batchLevel);
    if (! this.batchLevelS.length) {
      dbg && eg.assert(from === this.batchFrom);
      this.trans.close();
      if (! this.trans.isEmpty()) {
        if (this.undoRedoIx != this.actionS.length) {
          this._pushUndone('closeBatch');
        }
        this.actionS.push({ trans: this.trans, from: batchLevel });
        ++this.undoRedoIx;
        this._changedTransaction(
          'trans_close', this._enrichTransInfo(this.trans.getInfo()), from
        );
        this._contentAddedFrom(oldLength, batchLevel);
      }
      this.trans = null;
      this.batchFrom = null;
    }
  };
  protoOS.cancelBatch = function (from) {
    dbg && assert(this.batchLevelS.length);
    this.trans.close();
    this._applyTransaction(this.trans.reverted());
    this.batchLevelS.splice(0); //&&&
    this.trans = null;
    this.batchFrom = null;
    this._changedTransaction('trans_cancelled', null, from);
  };
  protoOS.hasOpenBatch = function () {
    return this.batchLevelS.length;
  };
  protoOS.doCreate = function (id, props) {
    dbg && assert(this.batchLevelS.length && ! (id in this.om));
    this.trans.addCreate(id, props);
    this._applyCreate(id, props);
  };
  protoOS.doChange = function (id, changeProps) {
    dbg && assert(this.batchLevelS.length && id in this.om);
    var obj = this.om[id];
    var oldProps = {}, newProps = {}, hasNewProps;
    _extractChangedProps(obj, changeProps, oldProps, newProps);
    hasNewProps = eg.hasProps(newProps);
    if (! hasNewProps) {
      return;
    }
    this.trans.addChange(id, oldProps, newProps);
    this._applyChange(id, oldProps, newProps);
  };
  protoOS.doDelete = function (id) { // avoid keyword
    dbg && assert(this.batchLevelS.length && id in this.om);
    var oldProps = eg.cloneProps(this.om[id]);
    this.trans.addDelete(id, oldProps);
    this._applyDelete(id, oldProps);
  };

  // markers

  protoOS.addMarker = function (marker, from) {
    dbg && assert(! eg.arrContains(this.markers, marker));
    var oldLength = this.actionS.length;
    this.markers.push(marker);
    this.actionS.push({ marker: marker, from: from });
    ++this.undoRedoIx;
    this._contentAddedFrom(oldLength, from);
  };
  protoOS.numOfMarkerWithId = function (id) {
    var markers = this.markers;
    for (var ix = markers.length; --ix >= 0; ) {
      if (markers[ix].id === id) {
        return ix + 1; // #marker is 1-based
      }
    };
    return null; // not found
  };
  protoOS.count_markers = function () {
    return this.markers.length;
  };
  protoOS.count_markersInActionS = function () {
    var count = 0;
    this.actionS.forEach(function(action) {
      this._isMarkerAction(action) && ++count;
    }, this);
    return count;
  };
  protoOS.justAfterMarker = function () {
    return this.undoRedoIx && this.isMarkerAt(this.undoRedoIx - 1);
  };
  protoOS.firstMarkerIndexOrNull = function () {
    var ix = this._nextMarkerIxOrLenFrom(0);
    return ix === this.actionS.length ? null : ix;
  };
 
  // navigation

  protoOS.gotoIndex = function (ix, fromOrNil) {
    dbg && assert(ix <= this.actionS.length);
    if (ix === this.undoRedoIx) {
      return; // NOOP
    }
    var from = fromOrNil || 'gotoIndex()';
    var oldIndex = this.undoRedoIx;
    var transArr;
    if (ix < this.undoRedoIx) { // undo
      transArr = _transactionsReverted(this._getTransactions(ix, this.undoRedoIx));
    } else {
      transArr = this._getTransactions(this.undoRedoIx, ix);
    }
    transArr.forEach(function(trans) {
      this._applyTransactionFrom(trans, from);
    }, this);
    this.undoRedoIx = ix;
    this._indexChangedFrom(oldIndex, from);
  };
  protoOS.undo = function (from) {
    if (this.indexAtBegin()) {
      return;
    }
    this.gotoIndex(this.undoRedoIx - 1, 'undo');
  };
  protoOS.redo = function (from) {
    if (this.indexAtEnd()) {
      return;
    }
    this.gotoIndex(this.undoRedoIx + 1, 'redo');
  };

  // actionS manipulation

  protoOS.storeUndone = function () {
    var from = 'storeUndone';
    var oldLength = this.actionS.length;
    var oldIndex = this.undoRedoIx;
    this._pushUndone(from);
    if (this.actionS.length > oldLength) {
      this._contentAddedFrom(oldLength, from);
    } else if (this.undoRedoIx > oldIndex) {
      this._indexChangedFrom(oldIndex, from);
    }
  };
  protoOS.condenseBetweenMarkers = function () {
    var from = 'condenseBetweenMarkers';
    this._pushUndone(from);
    var res = [];
    var ix, len, markerIx, transactions;
    for (ix = 0, len = this.actionS.length;
         ix < len;
         ix = markerIx + 1) {
      markerIx = this._nextMarkerIxOrLenFrom(ix);
      // push transactions condensed ..
      transactions = this._getTransactions(ix, markerIx);
      var summedTrans = _sumTransactions(transactions);
      if (! summedTrans.isEmpty()) {
        res.push({ trans: summedTrans, from:from });
      }
      // .. push marker thereafter ..
      if (markerIx < len) { // if there is one.
        res.push(this.actionS[markerIx]);
      }
    }
    // put result into actionS obj
    this.actionS.length = 0;// clear, but keep references from the outside intact
    for (ix = 0, len = res.length; ix < len; ++ix) {
      this.actionS.push(res[ix]);
    }
    this.undoRedoIx = this.actionS.length;
    this._contentChangedFrom(from);
  };
  protoOS.condenseAll = function () {
    dbg && assert(! this.trans);
    var from = 'condenseAll';
    this._pushUndone();
    this.storeObjectMap();
    this.actionS.length = 0; // clear, but keep references from the outside intact
    this.undoRedoIx = 0;
    this._contentChangedFrom(from);
  };

  // misc

  protoOS.setDebug = function (dbgFlag) {
    dbg = dbgFlag;
  };

  // exports

  eg.createObjectStore = createObjectStore;

}(EvolGo));
