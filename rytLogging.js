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

// make it as load sequence agnostic as possible
var EvolGo = EvolGo || {}, RYT = RYT || {};

// enrich RYT ns
(function(eg, ryt) {
  // info elements at bottom of page
  function initLogger() {
    var logger = null;
    var _logger = null;
    var numOfMessages = 0;
    var lastNoticeItemInner = null;
    var noticeWrapInited = false;
    var justRemovingNotices = false;
    function initNoticeWrap() {
      jQuery.noticeAdd({text: 'init notifications...', stayTime: 0, appendOrPrepend: 'prepend'});
      var noticeWrap = $(".notice-wrap:first");
      var yPos = window.innerHeight - noticeWrap.height();
      noticeWrap.css("top","" + yPos + "px");
      noticeWrapInited = true;
    }
    function _log(str, params, prefix, messageNumber) {
      if (! noticeWrapInited) { // lazy init, if not inited before
        initNoticeWrap();
      }
      params.text =
        "[" + messageNumber +"]" + (prefix ? prefix : "") + " " + str;
      params.inEffect = {opacity: 'show', width: 'show'}; //, height: 'show'};
      lastNoticeItemInner = jQuery.noticeAdd(params);
      return lastNoticeItemInner;
    }
    function log(strOrObjOrNil, params, prefix) {
      if (justRemovingNotices) {
        return null; // ignore log()
      }
      var htmlStr = eg.str2HTML(strOrObjOrNil ? strOrObjOrNil.toString() : "");
      var messageNumber = ++numOfMessages; // reference local copy instead of changing var
      return _log(htmlStr, params, prefix, messageNumber);
      /*
        tryAgainPre(_log, this,
        [htmlStr, params, prefix, messageNumber], // prefix can be undefined, messageNumber added
        function() { return ! justRemovingNotices; }, // precondition
        1000, 5);
      */
    }
    _logger = {
      _log: function () { },
      log: function () { }
    };
    logger = {
      _log: function () { }, // for selectively switching it off with one keystroke
      log: function (str) {
        if (! ryt.info.develMode) {
          return;
        }
        return log(str, { // log function above
          stayTime: 10000,
          appendOrPrepend: 'prepend'
        });
      },
      logNStay: function (str) {
        if (! ryt.info.develMode) {
          return;
        }
        return log(str, {
          stay: true,
          appendOrPrepend: 'prepend'
        });
      },
      info: function (str) {
        if (! ryt.info.develMode && ! ryt.info.prefs.showInfoMessagesFlag) {
          return;
        }
        return log(str, {
          type: 'info',
          stayTime: 20000,
          appendOrPrepend: 'prepend'
        },"[Info]");
      },
      infoNStayLong: function (str) {
        if (! ryt.info.develMode && ! ryt.info.prefs.showInfoMessagesFlag) {
          return;
        }
        return log(str, {
          type: 'info',
          stayTime: 60000,
          appendOrPrepend: 'prepend'
        },"[Info]");
      },
      infoNStay: function (str) { // ignore showInfoMessagesFlag for explicit stay
        return log(str, {
          type: 'info',
          stay: true,
          appendOrPrepend: 'prepend'
        },"[Info]");
      },
      success: function (str) {
        return log(str, {
          type: 'success',
          stayTime: 30000,
          appendOrPrepend: 'prepend'
        },"[Success]");
      },
      warn: function (str) {
        return log(str, {
          type: 'warn',
          stayTime: 20000,
          appendOrPrepend: 'prepend'
        },"[Warning]");
      },
      problem: function (str) {
        return log(str, {
          type: 'problem',
          stayTime: 40000,
          appendOrPrepend: 'prepend'
        },"[Problem]");
      },
      problemNStay: function (str) {
        return log(str, {
          type: 'problem',
          stay: true,
          appendOrPrepend: 'prepend'
        },"[Problem]");
      },
      error: function (str) {
        return log(str, {
          type: 'error',
          stay: true,
          appendOrPrepend: 'prepend'
        }, "[ERROR]");
      },
      unexpectedError: function (str) {
        return log(str, {
          type: 'error',
          stay: true,
          appendOrPrepend: 'prepend'
        }, "[UNEXPECTED ERROR]");
      },
      help: function (str) {
        return log(str, {
          type: 'help',
          stay: true,
          appendOrPrepend: 'prepend'
        },"[Help]");
      },
      append: function (str, noticeItemInnerOrNil) {
        if (justRemovingNotices) { // nothing to append to anymore
          return;
        }
        var noticeItemInner = noticeItemInnerOrNil || lastNoticeItemInner;
        if (! noticeItemInner || noticeItemInner.finalizing) {
          return;
        }
        var htmlStr = eg.str2HTML(str.toString());
        var textNode = noticeItemInner.children("p").first();
        textNode && textNode.html('<p>' + textNode.html() + htmlStr + '</p>');
      },
      removeAll: function () {
        if (justRemovingNotices) {
          return; // don't start multiple removals
        }
        if (lastNoticeItemInner) {
          justRemovingNotices = true; // block calling this and logging
          jQuery.noticeRemove($('.notice-item'));
          // unblock after giving noticeRemove() some time
          setTimeout(function(){
            justRemovingNotices = false;
          }, 1500); // 1000 (has been sufficient) + some safety margin
        }
      },
      isLastNotice: function (notice) {
        return notice === lastNoticeItemInner;
      }
    }
    initNoticeWrap();
    RYT.logger = logger;
    RYT._logger = _logger;
  } // initLogger()

  function testLogger() {
    logger.log("Append: ");
    logger.append("appended!");
    for (var i = 0; i < 10; ++i) {
      logger.log(i);
    }
    logger.log("log()");
    var lns = logger.logNStay("logNStay()");
    setTimeout(function() { logger.append("\nappended line...", lns); }, 5000);
    setTimeout(function() { jQuery.noticeRemove(lns); }, 10000);
    logger.warn("warn()");
    logger.error("error()");
  }

  // exports
  ryt.initLogger = initLogger;
  ryt.testLogger = testLogger;

}(EvolGo, RYT));
