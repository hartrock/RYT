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
var EvolGo = EvolGo || {}, RYT = RYT || {};

(function(eg, ryt) {

  function Info(version) {
    this.version = version;
    this.versionLong = version
      + " (Model " + ryt.getModelVersionString() + ")";
    var scripts= document.getElementsByTagName('script');
    var path= scripts[scripts.length-1].src.split('?')[0]; // remove any ?query
    var splitted = path.split('/');
    this.versionDirURL = eg.getBasePathOfScript('rytMain-min.js') || eg.getBasePathOfScript('rytMain.js');
    this.versionDirName = this.versionDirURL.substr(this.versionDirURL.lastIndexOf('/') + 1);

    this.urlVars = eg.getURLVars();
    //eg.log("urlVars: ", this.urlVars);
    this.host = window.location.hostname;
    this.develMode = (this.urlVars.develMode
                      ? true // URL param ..
                      : (this.urlVars.develMode === false
                         ? false // .. overrides ..
                         : (// .. defaults.
                           this.versionDirName === 'Devel'
                             || this.versionDirName.indexOf("Branch_") === 0 /* startsWith */)
                        )
                     );
    this.experimental = ("experimental" in this.urlVars
                         && ! (this.urlVars.experimental === false));
    this.defaultProjectId = this.urlVars.project || null;
    if (this.defaultProjectId && this.defaultProjectId.match(/%/)) { // unescape for browser escaping '[]' in URL line
      this.defaultProjectId = unescape(this.defaultProjectId);
    }
    this.currentProjectId = null;
    this.defaultElementIds = this.urlVars.element || [];
    if (! eg.isArrayLike(this.defaultElementIds)) {
      this.defaultElementIds = [this.defaultElementIds];
    }
    this.encrypted = this.urlVars.encrypted || false;
    this.dataKey = this.urlVars.key || null;
    if (! this.dataKey) {
      return; // only continue with dataKey -> redirect elsewhere
    }
    this.getLocally('knownKeys', { });
    if (! (this.dataKey in this.knownKeys)) {
      this.knownKeys[this.dataKey] = +new Date();
      ryt.storeLocally('knownKeys', this.knownKeys);
    }
    this.infoProjectFlag = (this.defaultProjectId === "[info]");
    this.firstTimeStart = ! ryt.loadLocally('notTheFirstTime');
    this.infoProjectSeen = ryt.loadLocally('infoProjectSeen');
    this.justKeyGenerated = ryt.loadLocally('justKeyGenerated');
    this.sessionID = new Date().getTime(); // KISS: ms should be random enough for getting unique id
    this.getLocally('lastLoadedVersion');
    this.getLocally('encryption', { });
    this.getLocally('newsSeen');
    //eg.log(this.lastLoadedVersion);
    this.infoWin = null;
    this.infoWinTopIncrement = 100;
    this.infoWinLeftIncrement = 40;
    //var downArrow = '↓';
    this.preferInitials = true;

    this.hoverHintCount = 0;
    this.showHoverInfoClickForStayCount = 0;

    this.initLocallyShared();
    var self = this;
    ryt.localStorageChangedCB = function() {
      //eg.log("locallyStorageChangedCB()");
      self.initLocallyShared();
    };
    this.dblclickTime = 0; // as far in past as possible, avoid NaN in time computations

    this.undoRedo = {};
    this.undoRedo.openFlowWinPosition = this.undoRedo.default_openFlowWinPosition = null;
    this.undoRedo.openDiffWinPosition = this.undoRedo.default_openDiffWinPosition = null;
    // sounds
    this.sounds = {};
    this.sounds.mm = $("#mm_sound")[0];
    if (! this.sounds.mm.play) {
      this.sounds = {};
    }
  }
  var protoI = Info.prototype;
  protoI.initLocallyShared = function () {
    this.getLocally('user');
    this.projectProps = ryt.importLocally(this.addKeyPrefix('projectProps'), { });
    this.keyProps = ryt.importLocally(this.addKeyPrefix('keyProps'), { });
    this.encryption = this.keyProps.encryption || { };
    this.getLocally('prefs', this.defaultPrefs);
    eg.copyMissingProps(this.defaultPrefs, this.prefs);
  };
  protoI.inBeginnerMode = function () {
    return this.prefs.userExperience === 'beginner';
  };
  protoI.inExpertMode = function () {
    return this.prefs.userExperience === 'expert';
  };

  protoI.showDoubleclickForEditHelp = function () {
    return this.inBeginnerMode()
      && this.showHoverInfoClickForStayCount < 3;
  };

  protoI.defaultPrefs = { taskColor:"green", commentColor:"yellow",
                          taskFontColor:"white", commentFontColor:"black max",
                          showInfoMessagesFlag:true,
                          fastInputFlag:false,
                          userExperience:'beginner',
                          rectCornerRadius: 10,
                          adminModeFlag:false,
                          showElementIDsFlag:false
                        };
  protoI.color2HTMLColorMap = {
    'green':"rgb(0, 127, 0)",
    'yellow':"#bfac00",
    'red':"red",
    'blue':"blue",
    'white':"#ccc",
    'black':"#111",
    'white max':"#fff",
    'black max':"#000"
  };
  protoI.color2HTMLColor = function (color) {
    return this.color2HTMLColorMap[color];
  };
  protoI.attrsForBg = function (color) {
    switch (color) {
    case "green": return {
      "fill":"rgb(0, 255, 0)", "stroke": this.color2HTMLColorMap[color],
      "fill-opacity":0.25
    }; break;
    case "yellow": return {
      "fill":"#bfac00", "stroke": this.color2HTMLColorMap[color],
      "fill-opacity":0.5
    }; break;
    case "red": return {
      "fill":"red", "stroke": this.color2HTMLColorMap[color],
      "fill-opacity":0.5
    }; break;
    case "blue": return {
      "fill":"blue", "stroke": this.color2HTMLColorMap[color],
      "fill-opacity":0.5
    }; break;
    default: throw "implementation error";
      break;
    }
  };
  protoI.attrsForText = function (color) {
    switch (color) {
    case "white": return {
      "fill":"#ccc",
      "stroke":"#ccc",
      "stroke-width":0.1
    }; break;
    case "black": return {
      "fill":"#111",
      "stroke":"#111",
      "stroke-width":0.1
    }; break;
    case "white max": return {
      "fill":"#fff",
      "stroke":"#fff",
      "stroke-width":0.1
    }; break;
    case "black max": return {
      "fill":"#000",
      "stroke":"#000",
      "stroke-width":0.2
    }; break;
    default: throw "implementation error";
      break;
    }
  };
  protoI.attrsForTaskBg = function () {
    return this.attrsForBg(this.prefs.taskColor);
  };
  protoI.attrsForCommentBg = function () {
    return this.attrsForBg(this.prefs.commentColor);
  };
  protoI.attrsForTaskText = function () {
    return this.attrsForText(this.prefs.taskFontColor);
  };
  protoI.attrsForCommentText = function () {
    return this.attrsForText(this.prefs.commentFontColor);
  };
  protoI.attrsForTaskConnectArea = function () {
    switch (this.prefs.taskColor) {
    case "green": return {
      "fill-opacity": 0.5, "fill":"rgb(0, 64, 0)"
    }; break;
    case "yellow": return {
      "fill-opacity": 0.5, "fill":"#bfac00"
    }; break;
    case "blue": return {
      "fill-opacity": 0.5, "fill":"rgb(0, 0, 64)"
    }; break;
    case "red": return {
      "fill-opacity": 0.5, "fill":"rgb(64, 0, 0)"
    }; break;
    default: throw "implementation error";
      break;
    }
  };
  protoI.toString = function () {
    return "Info";
  };
  protoI.setLocally = function (key, value) {
    this[key] = value;
    ryt.storeLocally(key, value);
  };
  protoI.getLocally = function (key, defaultOrNil) {
    this[key] = ryt.loadLocally(key, defaultOrNil);
    return this[key];
  };
  protoI.computeGreeting = function () {
    this.greeting =
      (this.version
       + '\n \nstarted ' + eg.localDateTimeString() + '\n'
       + '\n \nfor '
       + (this.user
          ? (this.user.name
             ? this.user.name
             : (this.user.id
                ? this.user.id
                : "unknown user"))
          : "unknown user")
       + ':'
       + '\n \nhave fun!');
/*
      + (this.infoProjectFlag
         ? "\n \n(public [info] project)"
         : "");
*/
    return this.greeting;
  };
  protoI.isPublicId = function(projectId) {
    var publicIdRE = /[\[][a-zA-Z-_0-9]+[\]]/;
    return projectId.match(publicIdRE);
  };
  protoI.setCurrentProject = function(newId) {
    this.currentProjectId = newId;
    ryt.setDocumentTitle();
  };
  protoI.importProjectPropsForKey = function (key) {
    return ryt.importLocally(this.addKeyPrefixKeyStr(key, 'projectProps'), { });
  };
  protoI.exportProjectPropsForKey = function (key, projectProps) {
    ryt.exportLocally(this.addKeyPrefixKeyStr(key, 'projectProps'), projectProps);// ..but here.
  };
  protoI.removeProject_key_id_projectProps = function (key, id, projectProps) {
    ryt.deleteLocally(this.addKeyPrefixKeyStr(key, this.projectId2filename(id)),
                      true/* no save here.. */);
    delete projectProps[id];//..and here.
  };
  protoI.getProjectPropsMapForKey = function (key) {
    return this.dataKey === key
      ? this.projectProps
      : this.importProjectPropsForKey(key);
  };
  protoI.removeProject = function (key, id) {
    var projectProps = this.getProjectPropsMapForKey(key);
    this.removeProject_key_id_projectProps(key, id, projectProps);// no save..
    this.exportProjectPropsForKey(key, projectProps);// ..but here.
  };
  protoI.removeAllProjectsForKey = function (key) {
    var projectProps = this.getProjectPropsMapForKey(key);
    for (var id in eg.cloneProps(projectProps)) {
      eg.log(id + " deleted");
      this.removeProject_key_id_projectProps(key, id, projectProps);// no save..
    }
    this.exportProjectPropsForKey(key, projectProps);// ..but here.
  };
  protoI.removeAllProjects = function () {
    var self = this;
    eg.forEach(this.knownKeys, function(val, key) {
      self.removeAllProjectsForKey(key);
    });
  };
  protoI.oldestProject = function () {
    var self = this;
    var oldestTime = Number.POSITIVE_INFINITY, oldestKey = null, oldestId = null;
    eg.forEach(this.knownKeys, function(val, key) {
      eg.forEach(self.getProjectPropsMapForKey(key), function(props, id) {
      if (props.setTime < oldestTime) {
        oldestTime = props.setTime;
        oldestKey = key;
        oldestId = id;
      }
      });
    });
    eg.log("oldestKey:", oldestKey, ", oldestId:", oldestId);
    return [oldestKey, oldestId];
  };
  protoI.removeOldestProject = function () {
    var oldestProject = this.oldestProject();
    if (! oldestProject[0]) {
      return null;
    }
    this.removeProject(oldestProject[0], oldestProject[1]);
    return oldestProject;
  };
  protoI.removeLastLoadedVersion = function () {
    ryt.deleteLocally('lastLoadedVersion');
    this.lastLoadedVersion = null;
  };
  protoI.getProjectNames = function () {
    //eg.log("projectProps:", this.projectProps);
    return eg.map2arr(this.projectProps, function(val, key) {
      return key;
    }).sort(function(id1, id2) {
      return id1 > id2; // greater strings after
    });
  };
  protoI.getProjectProps = function (id) {
    return this.projectProps[id] || null;
  };
  protoI.getCurrentProjectProps = function () {
    return this.getProjectProps(this.currentProjectId);
  };
  protoI.containsProjectProps = function (id) {
    return id in this.projectProps;
  };
  protoI.hasLocalProjectData = function (id) {
    return (this.containsProjectProps(id)
            && this.getProjectProps(id).storedLocally);
  };
  protoI.addKeyProps = function (props) {
    eg.copyProps(props, this.keyProps);
    ryt.exportLocally(this.addKeyPrefix('keyProps'), this.keyProps);
  };
  protoI.setProjectProps = function (id, props) {
    eg.assert(eg.isObject(props));
    var propsForId = this.projectProps[id];
    if (! propsForId) {
      this.projectProps[id] = propsForId = props;
    } else {
      eg.copyProps(props, propsForId);
    }
    propsForId.setTime = +new Date();
    ryt.exportLocally(this.addKeyPrefix('projectProps'), this.projectProps);
  };
  protoI.currentProjectId2filename = function () {
    return this.currentProjectId
      ? this.projectId2filename(this.currentProjectId)
      : null;
  };
  protoI.projectId2filename = function (id) {
    return id + ".json";
  };

  var reservedSize = 1 << 14; // 16384
  protoI.projectExportLocally = function (id, data) {
    var key = this.addKeyPrefix(this.projectId2filename(id));
    try {
      ryt.exportLocally(key, data, reservedSize);
      this.setProjectProps(id, { storedLocally: true }); // should never fail, due to reservedSize
    } catch (ex) {
      ryt.deleteLocally(key, true); // save in next step
      this.setProjectProps(id, { storedLocally: false });
      ryt.logger.problemNStay(
        "*" + id + "* cannot be cached locally: local storage exhausted (or not available at all)!"
          + "\nPlease think of making room via 'advanced -> Clear local Cache -> ...'."
      );
      return false;
    }
    return true;
  };
  protoI.projectImportLocally = function (id) {
    return  ryt.importLocally(this.addKeyPrefix(this.projectId2filename(id)));
  };
  protoI.addKeyPrefixKeyStr = function (key, str) {
    return key + " " + str;
  };
  protoI.addKeyPrefix = function (str) {
    return this.addKeyPrefixKeyStr(this.dataKey, str);
  };
  protoI.rytURL = function (encryptedOrNil, keyOrNil, projectIdOrNil, elementIdsOrNil) {
    var str = window.location.protocol + "//" + window.location.host + window.location.pathname;
    var sep = "?";
    if (encryptedOrNil) {
      str += "?encrypted";
      sep = "&";
    }
    if (keyOrNil) {
      str += sep + "key=" + keyOrNil;
      if (projectIdOrNil) {
        str += "&project=" + projectIdOrNil;
        if (elementIdsOrNil) {
          eg.forEach(elementIdsOrNil, function(val, elementId) {
            str += "&element=" + elementId;
          });
        }
      }
    }
    return str;
  };
  protoI.rytURL_project = function (projectIdOrNull) { // null for new project
    return this.rytURL(this.encrypted, this.dataKey, projectIdOrNull);
  };
  protoI.rytURL_projectElements = function (projectId, elementIds) {
    return this.rytURL(this.encrypted, this.dataKey, projectId, elementIds);
  };
  protoI.rytURL_projectElement = function (projectId, elementId) {
    var elementIds = {};
    elementIds[elementId] = elementId;
    return this.rytURL_projectElements(projectId, elementIds);
  };
  protoI.rytURLForCurrentProject = function () {
    return this.rytURL(this.encrypted,
                       this.dataKey,
                       this.currentProjectId, // may be null
                       this.currentElementIds); // may be null
  };

  // exports
  ryt.Info = Info;

}(EvolGo, RYT));
