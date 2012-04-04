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

//
// on load
//
(function (eg, ryt) {
function window_onload () {

  var version = "RYTv2.2.6.3 (2012-04-04)"; // programmatically updated from upgradeVersion

  var eg = EvolGo, ryt = RYT; // shortcuts

  //???
  function statwords(message){
    window.status = message;
  }

  // old
  function openInfoWin() {
    var infoUrl = ryt.rytURL_keyProject(ryt.info.dataKey, "[info]");
    ryt.info.infoWin = window.open(infoUrl,"","width="+document.width*3/4+",height="+document.height*3/4+",menubar=no,toolbar=no"); //dnw (FF)://,screenX:200,screenY:200");
    //eg.log(ryt.info.infoWin);
    ryt.info.infoWin
      && ryt.info.infoWin.moveTo(document.width/8,document.height/8); // OK (FF)
    //ryt.info.infoWin.focus();
  }
  //ryt.openInfoWin = openInfoWin;

  function prepareHTMLPage() {
    // remove content from body ("missing JavaScript" warning)
    $("h1").remove(); // RYT
    $("#JavaScript_hint").remove();
    $("#FF_hint").remove();
    // For switching focus browser compatible (visibility:hidden; display:none; or giving it
    // negative top/left coords has not worked):
    var rootDiv = $(
      ''
        +'<div id="rootNode" '
      //+'style="overflow-y:scroll;" '
      //+'style="width:100%; height:auto;" '
        +'tabindex=-1 '
        + '></div>');
    var parentNode = $("body")[0];
    var parentWidth = parentNode.clientWidth;
    var parentHeight = parentNode.clientHeight;
    rootDiv.css({width:parentWidth, height:parentHeight});
    rootDiv.appendTo($("body"));
  } // prepareHTMLPage()

  function setDocumentTitle() {
    var projectInfo = ryt.info.getCurrentProjectProps();//TODO
    //eg.log("projectInfo:", projectInfo);
    document.title = "[RYT] "
      + (ryt.info.currentProjectId
         ? (ryt.info.currentProjectId
            + (projectInfo
               ? (projectInfo.title
                  ? ": \"" + projectInfo.title + "\""
                  : "")
               : "")
           )
         : "new project")
      + (ryt.app.model && ryt.app.model.lockedBy
         ? " (locked by '" + ryt.app.model.lockedBy + "')"
         : "")
      + ((ryt.info.dirtynessShown
          = ryt.app.unsavedProjectFlag)
         ? " (unsaved)"
         : "") // false, too
  }
  ryt.setDocumentTitle = setDocumentTitle;

  function drawTestLines(r, pos) {
    var from, to, offX, i;
    from = pos;
    offX = 0;
    for (i = 0; i < 5; ++i) {
      from = pos.add(eg.Point.xy(0, i*10));
      offX = i;
      to = from.add(eg.Point.xy(offX,0));
      r.path(from.to_M()+to.to_L()).attr({"stroke": "white"});
    }
  }
 
  function checkForNakedStart() {
    if (! ryt.info.dataKey) {
      var key = ryt.info.lastKeyGenerated;
      if (key) {
        var text = "RYT started without key, but it has detected an earlier generated one:\n-> restart with key"
          + "\n\t" + key + "\n.";
        alert(eg.strAscii2Unicode(text));
      } else {
        alert("RYT started freshly (no key known).\n"
              +"Next step is to generate a key to your project area (suited for multiple projects) ...");
        //eg.info("Math.seedrandom()..");
        Math.seedrandom();
        //eg.info("..Math.seedrandom()");
        key = UUID.uuid4();
        alert("... generated key is\n\t" + key + "\n: it is needed for separating your data from other's."
              + "\nAfter restart you will see a generated URL (containing above key) in the browser line."
              +"\n\n[Important] Please bookmark "
              + (ryt.info.defaultProjectId ? "an" : "this")
              +" URL then: it is your personal link to your data!");
        ryt.storeLocally("justKeyGenerated", true);
        ryt.storeLocally("lastKeyGenerated", key);
      }
      // redirect, because we don't want to give user a new key by back button
      eg.redirect_URL(
        ryt.info.rytURL(
          ryt.info.encrypted, key,
          ryt.info.defaultProjectId,
          eg.arrVals2ObjKeysNVals(ryt.info.defaultElementIds)
        )
      );
      return true;
    }
    return false;
  }


  //////////////////////////////////////////////////////////////////////////////
  // statements
  //////////////////////////////////////////////////////////////////////////////

  // ensure page reload for browser navigation
  eg.log("### statements ###");
  $(window).unload(function(){});

  ryt.info = new ryt.Info(version);
  //eg.info(ryt.info);
  eg.shared.productionMode = ! ryt.info.develMode;

  // Workaround needed for getting context menu working by left mouse click with FF 5.0.1 at OS X Lion
  // (and there are other issues without).
  ryt.info.contextmenuEventWorkaround = true;
  $(document).bind("contextmenu", function(e){
    if ($(e.target).hasClass("followLink")) {
      return; // allow default for being able to copy link
    }
    eg.stopPropagationPreventDefault(e);
  });

  prepareHTMLPage();
  if (checkForNakedStart()) {
    return; // nothing should happen after redirect_URL() above!
  }

  //
  // from here a generated dataKey exists
  //

  // encryption
  if (ryt.info.encrypted) {
    sjcl.random.startCollectors();
  }

  var app = new ryt.App();
  ryt.app = app;


  if (ryt.info.develMode) {
    drawTestLines(app.r, eg.Point.xy(0, 100));
    drawTestLines(app.r, eg.Point.xy(0, 200.5));
  }
  // some shapes or not
  /*
    var r = app.r;
    r.circle(400, 50, 50).attr({fill:"#aaaaaa"}); // test Raphael
    r.circle(50, 400, 50).attr({fill:"#aaaaaa"}); // test Raphael
    r.rect(500, 500, 100, 100).attr({fill:"#aaaaaa"});
    r.circle(1000, 1000, 250).attr({fill:"#aaaaaa"});
    r.circle(1900, 1000, 250).attr({fill:"#aaaaaa"});
    r.rect(700, 700, 100, 100).attr({fill:"#aaaaaa"});
  */

  // default: show only if not seen before
  ryt.showNews = function(forceFlag) {
    var ident = 'RYTv2.2.5';
    // content
    var topic = ""
      + "[enh] Advanced -> backup: export/import of raw project data";
    var text = ""
      + ident +": " + topic + "\n"
      +"========\n"
      +"Export/import of current project as raw project data (JSON format) via textarea window. This allows backups into local file system by copy/paste/store.\n"
/*
      +"\n"
      +"Older News\n"
      +"==========\n"
      +"\n"
      +"RYTv1.6.5: [imp] top offset for info windows\n"
      +"---------\n"
      +"Info windows not covering buttons at top anymore.\n"
      +"\n"
      +"RYTv1.6.4: [new] unminified version\n"
      +"---------\n"
*/
    ;

    if (ryt.info.newsSeen === ident && ! forceFlag) {
      return; // don't show it twice, only if forced
    }
    ryt.info.setLocally('newsSeen', ident);
    if (! text) {
      return;
    }
    ryt.newsDialog(
      { topic: topic,
        text: text, text2HTMLFlag: true,
        yesButtonText: "OK"
      }
    );
  };

  ryt.initLogger();
  var logger = app.logger = ryt.logger;    // Shortcuts and ..
  var _logger = app._logger = ryt._logger; // .. app init.

  if (ryt.info.version !== ryt.info.lastLoadedVersion) {
    logger.infoNStayLong(
      ( ryt.info.lastLoadedVersion
        ? ("Current (new) RYT version '" + ryt.info.version + "' differs from last loaded '"
           + ryt.info.lastLoadedVersion +  "' one")
        : "Cannot find RYT version info of last loaded version"
      )
        + ": for getting more info about new version you could load the '[info]' project."
    );
    ryt.info.setLocally('lastLoadedVersion', ryt.info.version); // actualize for next start
    // Removal of local (cached) projects not needed - and potentially
    // dangerous -, due to automatic conversion during project load.
    ryt.showNews();
  }

  setDocumentTitle();

  var startString = ryt.info.versionLong + " started with key:\n\t" + ryt.info.dataKey + "\n.";
  var startString2 = "User identity: " + (ryt.info.user
                                          ? "uid=" + ryt.info.user.id + ", name='" + ryt.info.user.name + "'"
                                          : "unknown")
    + ".\nLocally known projects: " + ryt.info.getProjectNames() + ".";

  if (ryt.info.justKeyGenerated) {
    ryt.storeLocally("justKeyGenerated", false);
    alert(eg.strAscii2Unicode(
      ( ryt.info.defaultProjectId
        ? ( (ryt.info.isPublicId(ryt.info.defaultProjectId)
             ?"Public"
             :"Default")
            +" project load with new personal key: please bookmark\n"
            +"- current URL -> pointing to this project, or\n"
            +"- the one you'll see after pressing 'new' button (now or later) -> empty project in your project area." )
        : "Please bookmark the URL now!")
        + ( ! ryt.info.infoProjectSeen && ! ryt.info.defaultProjectId
            ? ("\n\nNote:\nBecause you seem to be a first time user, [info] project will be started automatically after pressing OK."
               + " This changes current URL; so it's a good idea to bookmark it before doing that.\nAlternatively you can get back this URL later by pressing the 'new' button.")
            : "" )
    ));
  }
  if (ryt.info.firstTimeStart) {
    ryt.storeLocally('notTheFirstTime', true); // first time only once
  }
  if (ryt.info.infoProjectFlag) {
    if (! ryt.info.infoProjectSeen) {
      ryt.storeLocally('infoProjectSeen', true);
    }
  } else if (! ryt.info.infoProjectSeen // show info project once
             && ! ryt.info.defaultProjectId) { // only load [info] if no project given
    eg.goto_URL( // to be able to go back
      ryt.info.rytURL_projectElement(
        "[info]", '1303425521007_2_1'
      )
    );
    return;
  }
  logger.success(startString);
  logger.info(startString2);

  if (ryt.info.develMode) {
    logger.info("Devel mode!");
  }
  if (ryt.info.defaultProjectId) {
    var infoStr = "Project *" + ryt.info.defaultProjectId + "* given by URL.";
    var callback = null;
    var elementIds = ryt.info.defaultElementIds;
    if (elementIds.length) {
      infoStr += "\nElement(s) " + elementIds + " given by URL.";
    }
    callback = function() {
      var leftOff = 0;
      var topOff = ryt.info.infoWinTopOffset;
      elementIds.forEach(function(elementId) {
        var element = app.model.getObject(elementId);
        if (element) {
          var parentId = app.model.someParent(elementId);
          var cb = app.elementObjInfoStrCB(element, parentId);
          ryt.showInfo(cb,
                       { width: 800, // auto height
                         leftOff: leftOff,
                         topOff: topOff
                       });
          leftOff += ryt.info.infoWinLeftIncrement;
          topOff += ryt.info.infoWinTopIncrement;
        } else {
          app.logger.warn(
            "Element " + elementId + " (given by URL) not found."
          );
        }
      });
    };
    logger.info(infoStr);
    app.basicLoadProject(ryt.info.defaultProjectId, "[default project load] ",
                         callback);
  } else {
    app.basicNewProject();
    logger.info("New Project.");
  }

  app.greetingsAnimation();

  // resizing browser win
  function resizeRootCanvas() {
    $("#rootNode").css({"width":"100%", "height":"100%"});
    ryt.app.setCanvasSize();
    ryt.initLogger();
  };
  var resizeTimer = null;
  $(window).bind('resize', function(e) {
    //eg.log(e, this);
    if (e.target == this) {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(resizeRootCanvas, 500);
    }
  });

  // force reload for back/forward browser buttons

}; // window_onload()


// If this script will be loaded by a main script,
// window.onload has been set already.
if (! window.onload) {
  window.onload = window_onload;
  //eg.info("window.onload = window_onload;");
};


}(EvolGo, RYT));
