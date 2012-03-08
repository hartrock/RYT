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

(function(eg, ryt) {
  var storage = null;
  function addStorageEvents() {
    if (window.addEventListener) {
      window.addEventListener("storage", handle_storage, false);
    } else {
      window.attachEvent("onstorage", handle_storage);
    };
    function handle_storage(e) {
      e = e || window.event;
      //eg.log("storage event:", e);
      ryt.storageChanged(e);
    }
  }
  function _init() {
    //eg.log("storage _init()");
    if("localStorage" in window) {
      try {
        storage = window.localStorage;
      }
      catch(e) {
        /* Firefox fails when touching localStorage and cookies are disabled */
      }
    } else if ("globalStorage" in window) {
      try {
        storage = window.globalStorage[window.location.hostname];
      }
      catch(e) {
        // sr: could also be true for *global* storage
        /* Firefox fails when touching localStorage and cookies are disabled */
      }
    }
    if (storage) {
      addStorageEvents();
    }
  }
  function hasReasonableStorage() {
    return !!storage;
  }
  // to be called by storage event handler
  var storageChangedFlag = false;
  function storageChanged(e) {
    var url = e.url || e.uri;
    storageChangedFlag = true;
  }
  function _updateStorageIfNeeded() {
    if (storageChangedFlag) { // someone has changed storage
      //eg.log("_updateStorageIfNeeded(): update storage.");
      $.jStorage.reInit();
      storageChangedFlag = false;
      ryt.localStorageChangedCB && ryt.localStorageChangedCB();
    }
  }
  $(window).load(function() {
    //eg.log("$(window).load()");
    // Let switching back to this window update storage.
    $(window).focus(function(e) {
      //eg.log("focus()", e);
      _updateStorageIfNeeded();
    });
  });
/*
  $(window).ready(function() {
    eg.log("$(window).ready()");
  });
*/
  var reserve = "";
  var reserveKey = "rytStorage_reserveKey";
  function storeLocally(key, val, letFreeSize) {
    letFreeSize = letFreeSize || 0;
    _updateStorageIfNeeded();
    if (letFreeSize !== reserve.length) {
      reserve = eg.strFromCharLen(" ", letFreeSize);
    }
    var oldReserve = $.jStorage.get(reserveKey);
    var oldVal = $.jStorage.get(key);
    $.jStorage.set(reserveKey, reserve, true); // no save, should not throw
    try {
      $.jStorage.set(key, val); // save (may throw)
      eg.info("$.jStorage.storageSize(): ", $.jStorage.storageSize());
    } catch (ex) {
      //eg.log("ex:", ex);
      // rollback of unsaved storage obj: no save for both entries!
      $.jStorage.set(reserveKey, oldReserve, true);
      if (oldVal === null) { // null is get() default for not existing entry
        $.jStorage.deleteKey(key, true);
      } else {
        $.jStorage.set(key, oldVal, true);
      }
      throw(ex); // to be handled upwards
    }
  }

  function loadLocally(key, defaultOrNil) {
    _updateStorageIfNeeded();
    return $.jStorage.get(key, defaultOrNil || null);
  }
  function deleteLocally(key, noSaveFlag) {
    ! noSaveFlag && _updateStorageIfNeeded();
    $.jStorage.deleteKey(key, noSaveFlag);
  }
  // JSON replacer func for export: replaces undefined by null for deleting props
  // (see eg.modifyProps).
  function replacer(key, val) {
    if (eg.isUndefined(val)) {
      return null;
    }
    return val;
  }
  // local data export/import
  function exportLocally(key, val, letFreeSize) {
    var dataString = eg.JSON.stringify(val, replacer);
    storeLocally(key, dataString, letFreeSize);
  }
  function importLocally(key, defaultOrNil) {
    var dataString = loadLocally(key);
    var dataObj;
    if (eg.isString(dataString)) {
      dataObj = eg.JSON.parse(dataString);
    }
    return (eg.isUndefined(dataObj)
            ? (eg.isUndefined(defaultOrNil) ? null : defaultOrNil)
            : dataObj);
  }
  // server data export/import
  //
  function makeXHRObject() {
    try {return new XMLHttpRequest();}
    catch (error) {}
    try {return new ActiveXObject("Msxml2.XMLHTTP");}
    catch (error) {}
    try {return new ActiveXObject("Microsoft.XMLHTTP");}
    catch (error) {}
    
    throw new Error("Could not create HTTP request object.");
  }
  function performHttpRequest(p) {
    var xhr = makeXHRObject();
    xhr.open(p.method, p.url, p.asynchronous);
    if (p.headers) {
      p.headers.forEach(function(h){
        xhr.setRequestHeader(h[0], h[1]);
      });
    }
    if (p.asynchronous) {
      xhr.onreadystatechange = function() {
        //xhr.onload = function() {
        if (this.readyState == 4) {
          if (this.status == 200) {
            p.success && p.success(this);
          } else {
            p.failure && p.failure(this);
            // don't try to read this.statusText here (not always available)
          }
        }
      }
    }
    try {
      xhr.send(p.data ? p.data : null);
      if (! p.asynchronous) {
        success && success(xhr);
      }
    } catch (e) { // possible in synchronous case
      //eg.log("ex: ", e);
      if (! p.asynchronous) {
        failure && failure(xhr);
      }
    }
  }
  function pathComponents(pathIdent) {
    return pathIdent.split("/");
  }
  function createURLParameterArr(key, identOrNull, timezoneOffsetOrNil) {
    var arr = [];
    key         && arr.push(["key", key]);
    identOrNull && arr.push(["project", identOrNull]);
    ! eg.isNil(timezoneOffsetOrNil) // may be 0
                && arr.push(["timezoneOffset", timezoneOffsetOrNil]);
    return arr;
  }
  // no URL quoting
  function createURLParameterString(paramArr) {
    var str = '';
    if (! paramArr.length) {
      return str;
    }
    var entry = paramArr[0];
    str += '?' + entry[0];
    ! eg.isNil(entry[1]) && (str += '=' + entry[1]);
    for (var i = 1, len = paramArr.length; i < len; ++i) {
      entry = paramArr[i];
      str += '&' + entry[0];
      ! eg.isNil(entry[1]) && (str += '=' + entry[1]);
    }
    return str;
  }
  function createURLParams(
    key, identOrNull, timezoneOffsetOrNil
  ) {
    var paramArr = createURLParameterArr(
      key, identOrNull, timezoneOffsetOrNil
    );
    return createURLParameterString(paramArr);
  }

  function jsonHttp(method, URLParams, headers,
                    data,
                    success, failure, asynchronous) {
    var requestObject = {
      method: method,
      url: ryt.info.versionDirName+"/data.php" + URLParams,
      headers: headers,
      success: success, failure: failure,
      asynchronous: asynchronous
    };
    if (! eg.isNil(data)) {
      requestObject.data = data;
    }
    performHttpRequest(requestObject);
  }
  function jsonHttpGET(URLParams, headers,
                       success, failure, asynchronous) {
    jsonHttp(
      "GET", URLParams, headers,
      null, // no data
      success, failure, asynchronous
    );
  }
  function jsonHttpDELETE(URLParams, headers,
                          success, failure, asynchronous) {
    jsonHttp(
      "DELETE", URLParams, headers,
      null, // no data
      success, failure, asynchronous
    );
  }
  function jsonHttpPUT(URLParams, headers, data,
                       success, failure, asynchronous) {
    jsonHttp(
      "PUT", URLParams, headers,
      data,
      success, failure, asynchronous
    );
  }
  // unused; just for completeness
  function jsonHttpPOST(URLParams, headers, data,
                        success, failure, asynchronous) {
    jsonHttp(
      "POST", URLParams, headers,
      data,
      success, failure, asynchronous
    );
  }

  // encryption
  function getCipherKey() {
    var keyEncoded = ryt.info.encryption.key;
    var key = sjcl.codec.base64.toBits(keyEncoded);
    return key;
  }
  function encrypt(pt) {
    var key = getCipherKey();
    var ct = sjcl.encrypt(key, pt, { mode:'ccm', ks:256, ts:128, adata:(+new Date).toString() });
    return ct;
  }
  function decrypt(ct) {
    var key = getCipherKey();
    var pt = sjcl.decrypt(key, ct);
    return pt;
  }

  function exportData(id, dataObj, credentials, successCBOrNil, failCBOrNil) {
    var dataString, sendText;
    try {
      dataString = eg.JSON.stringify(dataObj, replacer);
    } catch(e) {
      ryt.logger.unexpectedError("ryt.exportData(): stringify.\n" + e);
      failCBOrNil && failCBOrNil(e);
      return;
    }
    // special case: there is *no* credentials.key for *unencrypted* public []
    // projects
    if (ryt.info.encrypted && credentials.key) {
      try {
        sendText = encrypt(dataString);
      } catch(e) {
        ryt.logger.unexpectedError("ryt.exportData(): encrypt.\n" + e);
        failCBOrNil && failCBOrNil(e);
        return;
      }
    } else {
      sendText = dataString;
    }
    jsonHttpPUT(createURLParams(credentials.key, id),
                credentials.pw && [["X-data-pw", credentials.pw]] || null,
                sendText, // data
                successCBOrNil || function(){
                  alert("PUT successful!");
                },
                failCBOrNil || function(xhr){
                  eg.error(xhr);
                  alert("PUT failed! RYT started as file://* ?");
                },
                true);
  }
  function importData(id, credentials, successCBOrNil, failCBOrNil) {
    function callbackFN(xhr) {
      var responseText = xhr.responseText;
      var dataString, dataObj;
      if (responseText) {
        // special case: there is *no* credentials.key for *unencrypted* public
        // [] projects
        if (ryt.info.encrypted && credentials.key) {
          try {
            dataString = decrypt(responseText);
          } catch(e) {
            ryt.logger.unexpectedError("ryt.importData(): decrypt.\n" + e);
          }
        } else {
          dataString = responseText;
        }
        if (dataString) {
          try {
            dataObj = eg.JSON.parse(dataString);
          } catch(e) {
            ryt.logger.unexpectedError("ryt.importData(): parse.\n" + e);
          }
        }
      } else {
        dataObj = null; // for project not existing
      }
      // if there is an exception above, dataObj stays undefined
      successCBOrNil ? successCBOrNil(dataObj) : alert("GET successful!");
    }
    jsonHttpGET(createURLParams(credentials.key, id),
                [["Accept", "application/json"]],
                callbackFN,
                failCBOrNil
                || function(xhr){ eg.error(xhr);
                                  alert("GET " + id + " failed! RYT started as file://* ?"); },
                true);
  }

  function getTimezoneOffset() {
    /* code taken from:
       http://de.php.net/manual/de/function.date-default-timezone-set.php#107297
    */
    var d = new Date()
    var offset= -d.getTimezoneOffset()/60;
    return offset;
  }
  function importProjectList(credentials, successCBOrNil, failCBOrNil) {
    function callbackFN(xhr) {
      var dataString = xhr.responseText;
      var dataObj;
      if (dataString) {
        try {
          dataObj = eg.JSON.parse(dataString);
        } catch(e) {
          ryt.logger.unexpectedError("ryt.getProjectList(): parse.\n" + e);
        }
      } else {
        ryt.logger.unexpectedError("ryt.getProjectList(): missing data string.\n" + e);
      }
      successCBOrNil ? successCBOrNil(dataObj) : alert("GET successful!");
    }
    jsonHttpGET(
      // no ident, timezoneOffset (for file mtime)
      createURLParams(credentials.key, null, getTimezoneOffset()),
      [["Accept", "application/json"]],
      callbackFN,
      failCBOrNil
        || function(xhr){ eg.error(xhr);
                          alert("GET for area listing"
                                + " failed! RYT started as file://* ?");
                        },
      true
    );
  }

  function deleteProject(id, credentials, successCBOrNil, failCBOrNil) {
    jsonHttpDELETE(
      createURLParams(credentials.key, id),
      credentials.pw && [["X-data-pw", credentials.pw]] || null,
      successCBOrNil
        || function(){ alert("DELETE " + id + " successful!"); },
      failCBOrNil
        || function(xhr){
          eg.error(xhr);
          alert("DELETE of " + id + " failed! RYT started as file://* ?");
        },
      true
    );
/*
    jsonHttpDELETE(
      id, credentials,
      successCBOrNil
        || function(){ alert("DELETE " + id + " successful!"); },
      failCBOrNil
        || function(xhr){
          eg.error(xhr);
          alert("DELETE of " + id + " failed! RYT started as file://* ?");
        },
      true
    );
    */
  }

  _init();

  // exports
  ryt.hasReasonableStorage = hasReasonableStorage;
  ryt.storeLocally = storeLocally;
  ryt.loadLocally = loadLocally;
  ryt.deleteLocally = deleteLocally;
  ryt.exportLocally = exportLocally;
  ryt.importLocally = importLocally;
  ryt.exportData = exportData;
  ryt.importData = importData;
  ryt.importProjectList = importProjectList;
  ryt.deleteProject = deleteProject;

  ryt.storageChanged = storageChanged;

}(EvolGo, RYT));
