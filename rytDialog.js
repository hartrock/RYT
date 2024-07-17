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

(function(eg, ryt) { // namespace args at end, exports before them
/*
<h1>Pizzeria Fantasia</h1>

<form action="select.htm">
  <p>Ihre Pizza-Bestellung:</p>
  <p>
    <select name="Pizza" size="5"
        onchange="alert(this.form.Pizza.options[this.form.Pizza.selectedIndex].value)">
      <option value="P101">Pizza Napoli</option>
      <option value="P102">Pizza Funghi</option>
      <option value="P103">Pizza Mare</option>
      <option value="P104">Pizza Tonno</option>
      <option value="P105">Pizza Mexicana</option>
      <option value="P106">Pizza Regina</option>
      <option value="P107">Pizza de la Casa</option>
      <option value="P108">Pizza Calzone</option>
      <option value="P109">Pizza con tutti</option>
    </select>
  </p>
</form>

Um einen Eintrag der Auswahlliste vorzuselektieren, geben Sie im einleitenden <option>-Tag des betreffenden Eintrags das Attribut selected an.
Beachten Sie:

Wenn Sie XHTML-Standard-konform arbeiten wollen, müssen Sie das Attribut in der Form selected="selected" notieren. Weitere Informationen dazu im Kapitel Kapitel XHTML und HTML.
*/
  function test_jeegoocontextTestDialog(topic, text) {
    var itemsString =
      '<ul id="menu" class="jeegoocontext cm_blue" style="z-index: 2000">'
      +'<li>Option A</li>'
      +'<li>Option B</li>'
      +'<li>Option C</li>'
      +'<li>Option D</li>'
      +'</ul>';
    var dia = $('<div id="dialog-test" title="[Test] ' + topic + '">'
                + eg.str2HTML(text)
                +'</div>');
    var menuItems = $(itemsString);
    eg.log("menuItems:", menuItems);
    menuItems.appendTo($("body"));
    var menuArea = dia;
    var menu = menuArea.jeegoocontext('menu', {
      widthOverflowOffset: 0,
      heightOverflowOffset: 1,
      submenuLeftOffset: -4,
      submenuTopOffset: -2,
      event: 'click',
      openBelowContext: true,
      autoHide: true,
      onSelect: function (e, context) {
        eg.log(e, context, e.target,
               e.target.textContent);
      }
    });
    var openDia = dia.dialog({
      resizable: false,
      width:500, //height:400,
      modal: false,
      position: 'top',
      close: function(event, ui) {
        menuItems.remove();
        dia.remove();
      },
      buttons: {
        DoIt: function() {
          eg.log("dummy");
        },
	Cancel: function() {
	  $(this).dialog('close');
	}
      }
    });
  } // test_jeegoocontextTestDialog()

  // for creating nested menus
  function sublistOrNothing(entries, key2fun, listStartTag) {
    if (! eg.isArrayLike(entries)) {
      return '';
    }
    var itemsStr = listStartTag;
    var i, len;
    for (i = 0, len = entries.length; i < len; ++i) {
      var key = entries[i].key;
      var val = entries[i].val;
      if (typeof val === 'function') {
        if (eg.isArrayLike(key)) {
          key.forEach(function(k) {
            key2fun[k] = val;
          });
        } else {
          key2fun[key] = val;
        }
      }
      // separator class has no effect for hovering, but it cannot hurt to set
      // it here.
      itemsStr += '<li' + (key ? '' : ' class="separator"') + '>';
      itemsStr += key
        ? (eg.isArrayLike(key) ? key[0] : key)
        : '';
      itemsStr += sublistOrNothing(val, key2fun, '<ul>');
      itemsStr += '</li>';
    }
    itemsStr += '</ul>';

    return itemsStr;
  }
  function popupMenu(entries, menuArea, contextMenuFlag) {
    var key2fun = { };
    var menuId = 'menu_' + ++popupMenu.count;
    // top level list with jeegoocontext class
    var listStartTag = '<ul id="'+ menuId + '" class="jeegoocontext cm_blue" '
      +'style="z-index: 6000">';

    var itemsStr = sublistOrNothing(entries, key2fun, listStartTag);

    var menuItems = $(itemsStr);
    menuItems.appendTo($("body"));
    var params = {
      onShow: function (e, context) {
        ryt.info.contextMenuOpenClickPos = eg.Point.xy(e.pageX, e.pageY);
      },
      autoHide: true,
      separatorClass: 'separator',
      onSelect: function (e, context) {
        var text = e.target.textContent;
        var func = key2fun[text];
        func && func(e, context);
      }
    };
    if (! contextMenuFlag) {
      params.event = 'mouseover';
      params.openBelowContext = true;
    }
    var menu = menuArea.jeegoocontext(menuId, params);
    return menuId;
  }
  popupMenu.count = 0;

  function test_openPopupMenu() {
    var dia = $('<div id="dialog-test" title="[Test]">' + 'fooBar' + '</div>');
    var openDia = dia.dialog({
      resizable: false,
      width:500, //height:400,
      modal: false,
      position: 'top',
      close: function(event, ui) {
        //menuItems.remove();
        dia.remove();
      },
      buttons: {
        DoIt: function() {
          eg.log("dummy");
        },
	Cancel: function() {
	  $(this).dialog('close');
	}
      }
    });
    var func = function(e, context) {
      eg.log("e:", e, "context:", context, 'text:', e.target.textContent);
    };
    var entries = [ { key:'eins', val:func },
                    { key:'zwei', val:func },
                    { key:'drei', val:func } ];
    popupMenu(entries, dia);
  }
  function helpDialog(topic, text, widthOrNil) {
    var topOff = 50;
    var dia = computeDivNodeForText(
      { id: 'helpDialog_' + ++helpDialog.count,
        classString: 'helpDialog',
        title: '[Help] ' + topic },
      text
    );
    installElementLinkBehavior(dia, null);
    dia.dialog({
      resizable: true,
      width: widthOrNil ? widthOrNil : '500',
      modal: false,
      position: ['center', topOff]
    });
  } // helpDialog()
  helpDialog.count = 0;

  function yesNoCancelDialog(argObj) {
    var prefix = argObj.prefix;
    var embeddedText = "";
    if (argObj.text) {
      embeddedText += argObj.text2HTMLFlag
        ? text2HTML(argObj.text)
        : eg.str2HTML(argObj.text); // default
    }
    var dia = $(
      '  <div class="yesNoCancelDialog" id="yesNoCancelDialog_' + ++yesNoCancelDialog.count + '"'
        +  'title="' + (prefix ? '['+argObj.prefix+'] ':'')
        +     (argObj.topic || '') +'">'
        +(! argObj.noIcon
          ? ('<span class="ui-icon ui-icon-alert"'
             + ' style="float:left; margin:0 7px 10px 0;">'
             +'</span>')
          : ''
         )
        +  '<div style="float:left;">'
        +     embeddedText
        +  '</div>'
        +'</div>'
    );
    yesNoCancelDialog.count = 0;
    var buttons = { };
    var yesFirst = ! argObj.noFirst;
    if (yesFirst && argObj.yesButtonText) {
      buttons[argObj.yesButtonText] = function() {
      argObj.yesCallback && argObj.yesCallback();
      $(this).dialog('close');
      };
    }
    if (argObj.noButtonText) {
      buttons[argObj.noButtonText] = function() {
      argObj.noCallback && argObj.noCallback();
      $(this).dialog('close');
      };
    }
    if (! yesFirst && argObj.yesButtonText) {
      buttons[argObj.yesButtonText] = function() {
      argObj.yesCallback && argObj.yesCallback();
      $(this).dialog('close');
      };
    }
    if (argObj.cancelButtonText) {
      buttons[argObj.cancelButtonText] = function() {
      argObj.cancelCallback && argObj.cancelCallback();
      $(this).dialog('close');
      };
    }
    dia.dialog({
      modal: true,
      resizable: false,
      width: argObj.width || 900,
      buttons: buttons
    });
  }
  function decisionDialog(argObj) {
    argObj.prefix = 'Decision';
    yesNoCancelDialog(argObj);
  }
  function confirmDialog(argObj) {
    argObj.prefix = 'Confirm';
    yesNoCancelDialog(argObj);
  }
  function warnDialog(argObj) {
    argObj.prefix = 'Warn';
    yesNoCancelDialog(argObj);
  }
  function newsDialog(argObj) {
    argObj.prefix = 'News';
    argObj.noIcon = true;
    argObj.width = 'auto';
    yesNoCancelDialog(argObj);
  }
  function openUserInfoDialog(argObj, cb_OK, cb_Cancel) {
    var dialogTitle = argObj && (argObj.title || 'Edit user info') || 'Who are you? Create user info...';
    var name = (argObj && argObj.name) || "";
    var id = (argObj && argObj.id) || "..";
    var closeFromOK = false;
    var diaCount = ++openUserInfoDialog.diaCount;
    var $dia = $(
      '<div class="userInfo-dialog" title="'+dialogTitle+'">'
        +'<form id="userInfo-form" action="">'
        +'<table>'
        +'<tr>'
        +'<td>name</td>'
        +'<td>'
        +'<textarea name="name" id="name" rows="1" cols="50" style="width:100%;">'
        + name
        +'</textarea>'
        +'</td>'
        +'</tr>'
        +'<tr>'
        +'<td>user id</td>'
        +'<td>'
        +'<textarea name="userID" id="userID" rows="1" cols="5" style="font-family:Courier; font-size:150%;">'
        + id
        +'</textarea>'
        +'</td>'
        +'</tr>'
        +'</table>'
        +'</form>'
        +'</div>'
    );
    // avoid creating new task dialogs with dblclick (is there a better way (probably in document ev handler?)?)
    $dia.dblclick(eg.eatThemEventHandler);
    var form = $dia.find("#userInfo-form");
    var nameArea = form.find("#name");
    var userIDArea = form.find("#userID");
    var allowedUIDRE = /[a-zA-Z][a-zA-Z-_0-9]+/;
    var inputUIDRE = /[a-zA-Z][a-zA-Z-_0-9]*/;
    var okFN = function () {
      var name = nameArea.val().replace(/\s+/g, " ");
      var userID = userIDArea.val();
      var match = userID.match(allowedUIDRE);
      if (! match || match[0].length !== userID.length) {
        userID = null;
      }
      //ryt.logger.log("name: " + name, "userID: " + userID);
      closeFromOK = true;
      $dia.dialog('close');
      cb_OK && cb_OK({ name: name, id: userID });
    };
    var cancelFN = function() {
      $dia.dialog('close');
      cb_Cancel && cb_Cancel();
    };
    form.keyup(function(e) {
      e = e || window.event;
      var val, str;
      if (e.keyCode === 13) {
        if (e.target === nameArea[0]) {
          val = nameArea.val();
          nameArea.val(val.substr(0, val.length-1));
        } else if (e.target === userIDArea[0]) {
          val = userIDArea.val();
          userIDArea.val(val.substr(0, val.length-1));
        }
        okFN();
        return;
      }
      if (e.target === nameArea[0]) {
        str = nameArea.val().replace(/\s+/g, " "); // globally replace one or more WSs by ' '
        var strSplit = str.split(" ");
        var uid = "";
        var len = strSplit.length;
        if (len >= 2 && strSplit[0].length && strSplit[1].length) {
          for (var i = 0; i < len; ++i) {
            strSplit[i].length && (uid += strSplit[i].charAt(0));
          }
        } else if (len >= 1 && strSplit[0].length >= 1) {
          if (strSplit[0].length >= 2) {
            uid = strSplit[0].substr(0,2);
          } else { // strSplit[0].length === 1
            uid = strSplit[0].charAt(0) + ".";
          }
        }
        else {
          uid = "..";
        }
        uid = uid.toLowerCase();
        if (userIDArea.val() !== uid) {
          userIDArea.val(uid);
        }
      } else if (e.target === userIDArea[0]) {
        val = userIDArea.val();
        var match = val.match(inputUIDRE);
        str = match ? match[0] : "";
        if (val.length !== str.length) {
          userIDArea.val(str); // only allow correctly formed uid
        }
      }
    });
    $dia.dialog({
      autoOpen: false, modal: (ryt.app.inModalDialog = true),
      /*show: 'scale',*/ // does not work well with focus()
      hide: 'scale', width: 400,
      open: function() {
        var nameArea = $dia.find("#name");
        nameArea.select();
        nameArea.focus();
      },
      close: function(event, ui) {
        $dia.remove();
        ryt.app.inModalDialog = false;
      },
      buttons: {
        "OK": function() {
          okFN();
        },
        "Cancel": function() {
          cancelFN();
        },
        "?": function() {
          var helpText = ""
            +"User info is needed for knowing who has created/modified something.\n"
            +"If you just type in your 'name', a 'user id' will be suggested (changeable).\n"
            +"The 'user id' should\n"
            +"- be unique amongst all project users,\n"
            +"- have two letters at least,\n"
            +"- contain only letters, digits and underscores, and\n"
            +"- start with a letter.";
          ryt.helpDialog(dialogTitle, helpText);
        }
      }
    });
    // open after all other (elem) dialogs: modal moveToTop does not work
    setTimeout(function() {
      $dia.dialog('open');
    }, 0);
  } // openUserInfoDialog()
  openUserInfoDialog.diaCount = 0;

  function logStrength() {
    eg.log("strength: " + sjcl.random._strength,
           "poolStrength: " + sjcl.random._poolStrength);
  }
  function openKeyDialog(keyOrNil, callbackOK, createIfMissingFlag) {
    logStrength();
    var key = keyOrNil;
    if (! key && createIfMissingFlag) {
      if (sjcl.random.getProgress() < 1.0) {
        //alert("Need some randomness: please move the mouse a while...");
        var progressPrefix = 'Progress (needing 100%): ';
        var progressStr = (sjcl.random.getProgress() * 100).toFixed(2) + "%";
        var progressDivStr = ''
          +'<div style="text-align:center;">'
          + progressPrefix
          +'<h1>'
          + progressStr
          +'</h1>'
          +'</div>';
        var progressDiv = $(progressDivStr);
        var $dia;
        $dia = progressDiv.dialog({
          title: "Need some randomness for creating an encryption key: please move the mouse for a while.",
          autoOpen: true,
          modal: (ryt.app.inModalDialog = true), closeOnEscape: false,
          show: 'scale', hide: 'scale',
          open: function(event, ui) {
            //$(".ui-dialog-titlebar-close", ui).hide(); // does not work
            progressDiv.parent().find(".ui-dialog-titlebar-close").hide();
          },
          close: function(event, ui) {
            progressDiv.remove();
            ryt.app.inModalDialog = false;
          }
        });
        var progressHeader = progressDiv.find("h1");
        var progressCB = function (progress) {
          logStrength();
          progressHeader.text((progress * 100).toFixed(2) + "%");
        }
        var seededCB = function () {
          progressDiv.dialog("close");
          sjcl.random.removeEventListener("progress", progressCB);
          sjcl.random.removeEventListener("seeded", seededCB);
          openKeyDialog(keyOrNil, callbackOK, createIfMissingFlag);
        }
        sjcl.random.addEventListener("progress", progressCB);
        sjcl.random.addEventListener("seeded", seededCB);
        return;
      }
      var rawKey = sjcl.random.randomWords(8);
      key = sjcl.codec.base64.fromBits(rawKey);
    }
    var diaTitle = "Set Encryption Key";
    var diaStr =
      '<div class="key-dialog" title="'+diaTitle+'" style="text-align:left;">'
      +'<form id="key-form" action="">'

      +'<textarea class="key" name="encryptionKey" id="encryptionKey" rows="1" cols="44">'
      + (key || '')
      +'</textarea>'
      +'<p>'
      + eg.str2HTML(
        keyOrNil
          ? ('Existing encryption key found.'
             + '')
          : (key
             ? ('Newly generated encryption key (may be overwritten by a stored one).\n\n'
                +'Important: please backup this key for\n'
                +'- use in another browser, or\n'
                +'- installing it back after the browser cache has been cleared.'
               )
             : 'No encryption key found: please input stored one.'
            )
      )
      +'</p>'
      +'</form>'
      +'</div>';

    var $dia = $(diaStr);
    $dia.extractProps = function() {
      var form = $dia.find("#key-form")[0];
      return form.encryptionKey.value
    };
    $dia.dialog({
      autoOpen: true, modal: true, show: 'scale', hide: 'scale', width: 'auto',
      close: function(event, ui) {
        var key = $dia.extractProps();
        $dia.remove();
        $dia.closeFromOK || ryt.logger.info("'"+diaTitle + "' cancelled.");
        $dia.closeFromOK && callbackOK && callbackOK(key);
      },
      buttons: {
        "OK": function() {
          $dia.closeFromOK = true;
          $dia.dialog('close');
        },
        "Cancel": function() {
          $dia.dialog('close');
        },
        "?": function() {
	  ryt.logger.help(diaTitle + ": this encryption key will be used for encryption/decryption of project data before/after saving/loading it to/from server (so nobody can read it there). One encryption key per project area (defined by your personal key) will be stored locally (in browser storage).\nImportant: please backup!");
        }
      }
    });
  } // openKeyDialog()

  // falls back to no pre selection, if selIx === -1 (and takes first item then)
  function createSelectHTML(id, name, size, selIxOrNull, keys, valsOrNil) {
    var pre = '<select id="'+id+'" name="'+name+'" size="'+size+'">\n';
    //+ 'onchange="alert(this.form.Select.options[this.form.Select.selectedIndex].value)">\n';
    var vals = valsOrNil || keys;
    /*
      stringArr.filter(function(val) {
      selectItems += '<option value="' + val + '">' + val + '</option>\n';
      });
    */
    var selectItems = "";
    for (var i = 0, len = keys.length; i < len; ++i) {
      selectItems += '<option value="' + vals[i] + '"';
      if (selIxOrNull === i) {
        selectItems += ' selected="selected"';
      }
      selectItems += '>' + keys[i] + '</option>\n';
    };
    var post = '</select>\n';
    return pre + selectItems + post;
  }
  function createSelectHTMLGenerator(props, defaults) {
    var selData = {};
    return {
      getSelectionData: function() { return selData; },
      addSelectionData: function(ident, vals, keysOrNil) {
        var keys = keysOrNil ? keysOrNil : vals.slice();
        var defaultIx = vals.indexOf(defaults[ident]);
        keys[defaultIx] += " (default)";
        var sel = vals.indexOf(props[ident]);
        if (sel === -1) { // no sel found in props
          sel = defaultIx;
        }
        eg.assert(sel !== -1);
        var data = { id: ident, vals: vals, keys: keys, sel:sel };
        selData[ident] = data;
      },
      createSelectHTMLIdent: function(ident) {
        var props = selData[ident];
        return createSelectHTML(
          props.id, props.id, props.size || 1, props.sel, props.keys, props.vals
        );
      },
      getPropsFromForm: function(form) {
        var props = {};
        eg.forEach(selData, function(data, key) {
          props[key] = data.vals[form[key].selectedIndex];
        });
        return props;
      }
    };
  }
  function openPrefsDialog(props, callbackOK) { // props expected
    var self = this;
    var sg = createSelectHTMLGenerator(props, ryt.info.defaultPrefs);

    sg.addSelectionData('userExperience',
                        ['beginner', 'intermediate', 'expert']);

    sg.addSelectionData('showInfoMessagesFlag', [false, true], ["off", "on"]);
    sg.addSelectionData('fastInputFlag',        [false, true], ["off", "on"]);

    sg.addSelectionData(
      'rectCornerRadius',
      [null, 2, 5, 10, 20, 50],
      ["none", "very low", "low", "medium", "high", "very high"]);

    sg.addSelectionData('taskColor',
                        ['green', 'blue', 'red', 'yellow']);
    sg.addSelectionData('transparent_taskColor',
                        ['cyan', 'magenta', 'green', 'light green', 'light blue', 'test']);
    sg.addSelectionData('commentColor',
                        ['yellow', 'blue', 'red', 'green']);
    sg.addSelectionData('taskFontColor',
                        ['black max', 'black', 'white', 'white max']);
    sg.addSelectionData('transparent_taskFontColor',
                        ['black', 'black max', 'white', 'white max']);
    sg.addSelectionData('commentFontColor',
                        ['black max', 'black', 'white', 'white max']);

    sg.addSelectionData('showElementIDsFlag', [false, true], ["no", "yes"]);
    sg.addSelectionData('adminModeFlag',      [false, true], ["off", "on"]);

    var diaTitle = "Set Preferences";
    var diaStr =
      '<div class="prefsDialog" title="'+diaTitle+'" style="text-align:center;">'
      +'<form id="prefs-form" action="">'

      +'<table border=1>'

      +  '<tr>'
      +    '<td colspan=2>user experience</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("userExperience")
      +    '</td>'
      +    '<td align="left">'
      + eg.str2HTML(
        ''
          +'- *beginner* :\n'
          +'  show all possible hints, confirmation dialogs and \'create\' menu\n'
          +'- *intermediate* :\n'
          +'  omit some hints, some confirmation dialogs and \'create\' menu\n'
          +'- *expert* :\n'
          +'  same as intermediate and \'More\' button in task create/edit dialog (for changing subtask finishing behavior)'
      )
      +    '</td>'
      +  '</tr>'

      +  '<tr>'
      +    '<td colspan=2>show info messages</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("showInfoMessagesFlag")
      +    '</td>'
      +    '<td align="left">'
      +      '[Info] messages to be shown?'
      +    '</td>'
      +  '</tr>'

      +  '<tr>'
      +    '<td colspan=2>fast task input</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("fastInputFlag")
      +    '</td>'
      +    '<td align="left">'
      + eg.str2HTML(
        ''
          +'\'Return\' in name field of task dialog creates task and\n'
          +'- *off* : nothing more\n'
          +'- *on* : opens new task dialog for input of next task'
      )
      +    '</td>'
      +  '</tr>'

      +  '<tr>'
      +    '<td colspan=2>corner rounding</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("rectCornerRadius")
      +    '</td>'
      +    '<td align="left">'
      +      'How much corners of rectangular text widgets are rounded.'
      +    '</td>'
      +  '</tr>'

      +  '<tr>'
      +    '<td rowspan=3>element colors</td>'
      +    '<td>task</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("taskColor")
      +    '</td>'
      +    '<td rowspan=3 align="left">'
      +      'background color switches'
      +    '</td>'
      +  '</tr>'
    //
      +  '<tr>'
      +    '<td>transparent task</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("transparent_taskColor")
      +    '</td>'
      +  '</tr>'
    //
      +  '<tr>'
      +    '<td>comment</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("commentColor")
      +    '</td>'
      +  '</tr>'

      +  '<tr>'
      +    '<td rowspan=3>element font colors</td>'
      +    '<td>task</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("taskFontColor")
      +    '</td>'
      +    '<td rowspan=3 align="left">'
      +      'font color switches'
      +    '</td>'
      +  '</tr>'
    //
      +  '<tr>'
      +    '<td>transparent task</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("transparent_taskFontColor")
      +    '</td>'
      +  '</tr>'
    //
      +  '<tr>'
      +    '<td>comment</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("commentFontColor")
      +    '</td>'
      +  '</tr>'

      +  '<tr>'
      +    '<td colspan=2>show element IDs</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("showElementIDsFlag")
      +    '</td>'
      +    '<td align="left">'
      +      'Element IDs to be shown in element infos?'
      +    '</td>'
      +  '</tr>'

      +  '<tr>'
      +    '<td colspan=2>set admin mode</td>'
      +    '<td class="switch" align="left">'
      + sg.createSelectHTMLIdent("adminModeFlag")
      +    '</td>'
      +    '<td align="left">'
      +      'If you are a RYT admin - knowing RYT admin password - admin mode allows to save public projects.'
      +    '</td>'
      +  '</tr>'

      +'</table>'

      +'</form>'
      +'</div>';
    var $dia = $(diaStr);
    $dia.extractProps = function() {
      var form = $dia.find("#prefs-form")[0];
      $dia.props = sg.getPropsFromForm(form);
    };
    $dia.dialog({
      autoOpen: true, modal: true, show: 'scale', hide: 'scale', width: 'auto',
      close: function(event, ui) {
        var props = $dia.extractProps();
        $dia.remove();
        $dia.closeFromOK || self.logger.info("'"+diaTitle + "' cancelled.");
        $dia.closeFromOK && callbackOK && callbackOK($dia.props);
      },
      buttons: { 
        "OK": function() {
          $dia.closeFromOK = true;
          $dia.dialog('close');
        }, 
        "Cancel": function() {
          $dia.dialog('close');
        }, 
        "?": function() {
	  self.logger.help(diaTitle + ": all changes are visible after project reload.");
        }
      }
    });
  } // openPrefsDialog()
  function openProjectSaveAsOrLoadDialog(argObj, callbackOK) {
    var saveFlag = argObj.saveFlag;
    var dialogTitle = saveFlag ? 'Save project as' : 'Load project';
    var title = (argObj && argObj.title) || "";
    var closeFromOK = false;

    var lastProjects = argObj.lastProjects; //["eins", "zwei", "drei" ];
    var id = argObj.id ? argObj.id : lastProjects[0] ? lastProjects[0].id : "";
    var lastProjectItems = lastProjects.map(function(elem) {
      return elem.id + (elem.title
                        ? ": " + elem.title
                        : "");
    });
    var lastProjectIds = lastProjects.map(function(elem) {
      return elem.id;
    });

    var diaStr = ''
      +'<div class="projectSaveAs-dialog" title="'+dialogTitle+'">'
      +'<form id="projectSaveAs-form" action="">'
      +'<table>'

      + (lastProjectItems
         ? ('<tr>'
            +'<td>last</td>'
            +'<td>'
            //+ createSelectHTML(lastProjectItems, lastProjectIds)
            + createSelectHTML("select", "Select", 1, 0, lastProjectIds)
            +'</td>'
            +'</tr>')
         : '')
    
      +'<tr>'
      +'<td>id<br/>(mandatory, identifier)</td>'
      +'<td>'
      +'<textarea name="id" id="id" rows="1" cols="100" style="width:100%;">'
      + id
      +'</textarea>'
      +'</td>'
      +'</tr>'
      + (saveFlag
         ? ('<tr>'
            +'<td>title<br/>(optional, string)</td>'
            +'<td>'
            +'<textarea name="title" id="title" rows="1" cols="100" style="width:100%;">'
            + title
            +'</textarea>'
            +'</td>'
            +'</tr>')
         : '')

      +'</table>'
      +'</form>'
      +'</div>';

    var $dia = $(diaStr);

    // avoid creating new task dialogs with dblclick (is there a better way (probably in document ev handler?)?)
    $dia.dblclick(eg.eatThemEventHandler);
    var form = $dia.find("#projectSaveAs-form");
    var idArea = form.find("#id");
    var titleArea = form.find("#title");
    var selectArea = form.find("#select");
    selectArea.change(function(){
      var text = this.form.Select.options[this.form.Select.selectedIndex].value;
      idArea.val(text);
    });
    if (saveFlag && ! (ryt.info.develMode || ryt.info.prefs.adminModeFlag)) {// ordinary user may load, but ..
      var allowedIdRE = /[a-zA-Z-_0-9]+/;   // .. not save public '[*]' files.
      var inputIdRE = allowedIdRE;
    } else { // greedy regexes
      var allowedIdRE = /[a-zA-Z-_0-9]+|[\[][a-zA-Z-_0-9]+[\]]/;
      var inputIdRE = /[a-zA-Z-_0-9]+|[\[][a-zA-Z-_0-9]+[\]]?|[\[]/;
    }
    var okFN = function() {
      var id = idArea.val();
      var title = titleArea.val() && titleArea.val().replace(/\s+/g, " ");
      var match = id.match(allowedIdRE);
      if (! match || match[0].length !== id.length) {
        id = null; // invalid id
      }
      closeFromOK = true;
      $dia.dialog('close');
      callbackOK && callbackOK({ id: id, title: title });
    };
    form.keyup(function(e) {
      e = e || window.event;
      if (e.target === idArea[0]) {
        var val = idArea.val(), originalLen = val.length;
        if (e.keyCode === 13) {
          val = val.replace(/\n/,''); // rm NL from RET key press
        }
        var match = val.match(inputIdRE);
        var str = match ? match[0] : "";
        if (originalLen !== str.length) {
          idArea.val(str); // only allow correctly formed ids
        }
      }
      if (e.keyCode === 13) {
        okFN();
      }
    });
    function focus() {
      idArea.focus();
    }
    $dia.dialog({
      autoOpen: true, modal: (ryt.app.inModalDialog = true), show: 'scale', hide: 'scale', width: 500,
      open: function(event, ui) {
        setTimeout(focus, 500); // there may be a better solution later
      },
      close: function(event, ui) {
        closeFromOK || ryt.logger.info("'"+dialogTitle + "' cancelled.");
        $dia.remove();
        ryt.app.inModalDialog = false;
      },
      buttons: { 
        "OK": function() {
          okFN();
        }, 
        "Cancel": function() {
          $dia.dialog('close');
        }, 
        "?": function() {
          var helpText = ""
            +"A project 'id' is needed for *identifying* the project; it should:\n"
            +"- be unique amongst all projects,\n"
            +"- contain only letters, digits and underscores, and\n"
            +"- start with a letter.\n"
            +"Note: project ids with brackets around (e.g. '[info]') are reserved for public projects: they can be loaded, but not saved without changing their name (to an unbracketed one)."
            +
            (saveFlag
             ?"\nAn optional 'title' may be given: this can be an arbitrary string."
             :""
            );
          ryt.helpDialog(dialogTitle, helpText);
        }
      }
    });
  } // openProjectSaveAsOrLoadDialog()

  var linkProps = {
    elementLinkClassString: "elementLink",
    followLinkClassString: "followLink",
    followLinkClickFunction: function(e) {
      return ryt.app.unsavedChangesCheck("[Follow Link]");
    }
  }
  function text2HTML(text) {
    var noFormatting = false;
    var str = "";
    var lessFormatting = noFormatting || ryt.prefs && ryt.prefs.lessFormatting;
    lessFormatting && (str+='<pre>');
    str+= noFormatting
      ? text
      : eg.str2HTML(text, { noListConversionFlag: lessFormatting,
                            followLinkClassString: linkProps.followLinkClassString,
                            elementLinkClassString: linkProps.elementLinkClassString });
    lessFormatting && (str+='</pre>');
    return str;
  }

  function divString(argObj, contentStr) {
    let divBeginStr = ''
      + '<div'
      + (argObj.title ? ' title="' + argObj.title + '"' : '')
      +' style="'
      + (argObj.hoverFlag
         ? 'position:absolute; z-index:2000; '
         : ''
        )
      + (argObj.width
         ? 'width:'+ argObj.width + 'px; '
         : ''/* give <pre> width it wants */)
      + (argObj.maxWidth
         ? 'max-width:'+ argObj.maxWidth + 'px;'
         : '')
      +   'font-family:monospace; font-size:9pt; ' // keep layout of simple text
      + '"'
      + '>'
    return (divBeginStr
            + contentStr
            + '</div>');
  } // divString()
  function infoDivString(argObj, contentStr) {
    let divBeginStr = ''
      + '<div'
      + (argObj.infoId
         ? ' id="' + argObj.infoId + '"'
         : '')
      + ' class="' + argObj.classString + '"'
      + (argObj.title ? ' title="' + argObj.title + '"' : '')
      +' style="'
      + (argObj.hoverFlag
         ? 'position:absolute; z-index:2000; '
         : ''
        )
      +   'opacity:0.9; background-color: rgb(15, 15, 15); '
      +   'color:rgb(255, 255, 255); '
      +   'font-family:monospace; font-size:9pt; '
      + '"'
      + '>';
    let hoverHintStr = (ryt.info.inBeginnerMode()
                        && argObj.hoverFlag && ryt.info.hoverHintCount++ < 3)
        ? '<p style="text-align:center;">[hint] hover for hold, click for window.</p>'
        : '';
    return divBeginStr + hoverHintStr + contentStr + '</div>';
  } // infoDivString()

  function enrichDivNode(divNode, contentStr) {
    divNode.containsPreFlag = contentStr.match(/<pre>/g) !== null;
    let links = divNode.find("." + linkProps.followLinkClassString);
    links.click(linkProps.followLinkClickFunction);
  }

  function computeDivNode(argObj, contentStr) {
    var divStr = divString(argObj, contentStr);
    var divNode = $(divStr);
    enrichDivNode(divNode, contentStr);
    return divNode;
  }
  function computeDivNodeForText(argObj, text) {
    return computeDivNode(argObj, text2HTML(text));
  }

  function computeInfoDivNode(argObj, contentStr) {
    let divStr = infoDivString(argObj, contentStr);
    let infoDivNode = $(divStr);
    enrichDivNode(infoDivNode, contentStr);
    return infoDivNode;
  }
  /*
  function computeInfoCanvasDivNode(argObj, contentStr) {
    let infoDivStr   = infoDivString(argObj, contentStr);
    let canvasDivStr = ryt.app.canvasDivString(argObj.canvasId);
    let node         = computeDivNode(argObj, infoDivStr + canvasDivStr);
    return node;
  }
  */
  // no enrichDivNode() for canvasDivNode or its parent
  function computeInfoCanvasDivNode(argObj, contentStr) {
    let infoDivNode   = computeInfoDivNode(argObj, contentStr);
    let canvasDivStr  = ryt.app.canvasDivString(argObj.canvasId);
    let canvasDivNode = $(canvasDivStr);
    let node          = $('<div></div>');//computeDivNode(argObj, '');
    node.append(infoDivNode, canvasDivNode);
    return node;
  }

  var infoCount = 0;
  function computeDivNodeFor(infoStrCB, hoverFlag) {
    let text = infoStrCB(! hoverFlag, // ? -> show parent info
                         hoverFlag);  // ? -> show childs info
    let html = text2HTML(text);
    let argObj;
    let infoNode;
    if (! hoverFlag) {
      let infoId   = "info-HTML_" + ++infoCount;
      let canvasId = "info-canvas_" + infoCount;
      argObj = { hoverFlag: hoverFlag,
                 classString: 'showInfo',
                 infoId: infoId,
                 canvasId: canvasId
               };
      infoNode = computeInfoCanvasDivNode(argObj, html);
      infoNode.infoId = infoId;
      infoNode.canvasId = canvasId;
    } else {
      argObj = { hoverFlag: hoverFlag,
                 classString: 'showHoverInfo',
               };
      infoNode = computeInfoDivNode(argObj, html);
    }
    return infoNode;
  }
  function computeInfoNode(infoStrCB, hoverFlag) {
    var maxWidth = ryt.info.develMode || ryt.info.prefs.showElementIDsFlag
      ? 800
      : 600;

    var infoNode = computeDivNodeFor(infoStrCB, hoverFlag);
    installElementLinkBehavior(infoNode, infoStrCB);
    if (! hoverFlag) {
      infoNode.rerender_info = function () { // brute-force
        let oldInfo = this.find('#'+this.infoId);
        let text = infoStrCB(true, false);
        let html = text2HTML(text);
        let argObj = { infoId: this.infoId };
        let newInfo = computeInfoDivNode(argObj, html);
        installElementLinkBehavior(newInfo, infoStrCB);
        $('#'+this.infoId).remove(); //oldInfo);
        this.prepend(newInfo);
      };
      ryt.TTT || (ryt.TTT = infoNode); // once
    }
    infoNode.appendTo($("body"));

    // from here on width has been computed by rendering
    if (infoNode.width() > maxWidth) {
      infoNode.width(maxWidth);
      // next line would hinder to follow resizing outer things (dialog())
      //   infoNode.css('max-width', maxWidth + 'px');
    }
    return infoNode;
  }

  function computeTitle(argObj) {
    return (
      (argObj
       ? (argObj.elementType === 'task'
          ? 'Task Element'
          : (argObj.elementType === 'comment'
             ? 'Comment Element'
             : (argObj.type === 'marker'
                ? 'Marker'
                : '???')))
       : '') + ' Info'
    );
  }
  function showInfo(infoStrCB, argObj) {
    argObj = argObj || { };
    var maxWidth = ryt.info.develMode || ryt.info.prefs.showElementIDsFlag
      ? 800
      : 600;
    var dialogBorderMargin = 26; // extra width for dialog decoration
    var dia = computeInfoNode(infoStrCB,
                              false); // hoverFlag
    // dialog() sets width of dia infoNode to auto

    var mo_InfoDialog = new ryt.MO_InfoDialog(ryt.app, dia,
                                              infoStrCB.parentId,
                                              infoStrCB.elementId);
    ryt.app.wireModelObserver(mo_InfoDialog);

    var ao = {
      title: computeTitle(infoStrCB),
      autoOpen: true, modal: false, //show: 'scale', hide: 'scale',
      width: argObj.width || dia.width() + dialogBorderMargin, // auto would go to div
      height: argObj.height || 'auto',
      minHeight:40, // allow smaller than default
      //minWidth:?, // default is OK
      position: argObj.pos && [argObj.pos.x, argObj.pos.y]
        || 'auto',
      //close: argObj.close || function(event, ui) {
      //},
      close: function(event, ui) {
        if (ao.closeCanvasHook) {
          ao.closeCanvasHook();
        }
        ryt.app.unwireModelObserver(mo_InfoDialog);
        dia.remove();
        ryt.app.unregisterDialog(infoStrCB.elementId, dia);
      },
      open: function(event, ui) {
        ryt.app.registerDialog(infoStrCB.elementId, dia);
        if (ao.openCanvasHook) {
          ao.openCanvasHook();
        }
        if (! eg.isNil(argObj.topOff)) {
          dia.parent().css("top", argObj.topOff + "px");
        }
        if (! eg.isNil(argObj.leftOff)) {
          dia.parent().css("left", argObj.leftOff + "px");
        }
        var top = dia.parent().css("top");
        if (top === "0px") {
          dia.parent().css("top", ryt.info.infoWinTopOffset + "px");
        }
      }
    };
    ryt.app.extendDialogWithCanvas(ao, dia, infoStrCB.elementId, dia.canvasId);
    dia.forcedClose = function () {
      dia.dialog("close");
    };
    dia.dialog(ao);
    if (argObj.closeOnClick) {
      dia.click(function(e) {
        dia.dialog('close');
        eg.stopPropagation(e);
      })
    }

  } // showInfo()

  function create_click_XOR_dblclick(clickAction, dblclickAction) {
    var clickActionDelay = 500; // delay of clickAction for cancelling it by gotten dblclick
    var clickTime = null;
    var doClickAction = false;
    var clickActionLater = function(e) {
      if (doClickAction) {
        clickAction(e);
      }
    };
    var clickFunc = function(e) {
      if (! doClickAction) clickTime = +new Date();
      doClickAction = true;
      setTimeout(function() { clickActionLater(e); }, clickActionDelay);
    };
    var dblclickFunc = function(e) {
      /*
      var dblclickTime = +new Date();
      eg.log("dblclickTime:", dblclickTime, ", clickTime:", clickTime, "diff:", dblclickTime - clickTime);
      */
      doClickAction = false;
      dblclickAction(e);
    }
    return [ clickFunc, dblclickFunc ];
  } // create_click_XOR_dblclick()

  function showHoverInfo(pos, infoStrCB, usePosAsItIsFlag) {
    var off = 20; // don't cover things at cursor pos
    var infoNode = computeInfoNode(infoStrCB, true);
    if (infoNode.containsPreFlag) {
      infoNode.css('width',''); // let hover info win contain all pre
    }
    if (usePosAsItIsFlag) {
      infoNode.css({left:pos.x, top:pos.y});
    } else {
      // compute position
      var infoNodeRect = eg.Rect.originExtent(pos, eg.Point.xy(infoNode.width(), infoNode.height()));
      var canvasRect = RYT.app.getCanvasRect();
      var
      r1 = eg.Rect.originExtent(pos.add(eg.Point.xy(off, off)),
                                infoNodeRect.extent()),
      r2 = eg.Rect.originExtent(pos.add(eg.Point.xy(-off - infoNodeRect.width(), off)),
                                infoNodeRect.extent()),
      r3 = eg.Rect.originExtent(pos.add(eg.Point.xy(off, -off - infoNodeRect.height())),
                                infoNodeRect.extent()),
      r4 = eg.Rect.originExtent(pos.add(eg.Point.xy(-off - infoNodeRect.width(), -off - infoNodeRect.height())),
                                infoNodeRect.extent());
      if (canvasRect.containsRect(r1)) {
        infoNode.css({left:r1.left(), top:r1.top()});
      } else if (canvasRect.containsRect(r2)) {
        infoNode.css({left:r2.left(), top:r2.top()});
      } else if (canvasRect.containsRect(r3)) {
        infoNode.css({left:r3.left(), top:r3.top()});
      } else if (canvasRect.containsRect(r4)) {
        infoNode.css({left:r4.left(), top:r4.top()});
      } else {
        infoNode.css({left:r1.left(), top:r1.top()});
      }
    }
    var clickAction = function(e) {
      e = e || window.event;
      ++ryt.info.showHoverInfoClickForStayCount;
      var pos = infoNode.position();
      showInfo(
        infoStrCB,
        {
          pos: eg.Point.xy(pos.left, pos.top),
          closeOnClick: false
        }
      );
      infoNode.stayFlag = false; // for cleanup in infoHoverFuns
      infoNode.timeoutFunc(); // remove faster as per hover timeout
      eg.stopPropagationPreventDefault(e);
    };
    var click_N_dblclick_funcs = create_click_XOR_dblclick(clickAction, function(e){
      RYT.info.dblclickTime = +new Date();
      eg.stopPropagationPreventDefault(e);
    });
    infoNode
      .click(click_N_dblclick_funcs[0])
      .dblclick(click_N_dblclick_funcs[1]);

    if (infoStrCB.elementId) {
      installElementLinkBehavior(infoNode, infoStrCB);
    }
    infoNode.hover(function(e) {
      //eg.log("in..");
      infoNode.stayFlag = true;
    }, function(e) {
      //eg.log("..out.");
      infoNode.stayFlag = false;
    });
    infoNode.css('display', ''); // make it visible
    return infoNode;
  } // showHoverInfo()

  function createInfoHoverFuns(infoStrCB, app, elementLinkFlag) {
    var startDelay = 1500; // delay before showing info after entering elem
    var overStayTime = 10000; // how long to stay if just waiting over elem
    var stopDelay = 1000; // how long to stay after leaving elem
    var noneDblclickTime = 1000; // min dist of dblclick before entering elem
    var info;
    var infoTimeout;
    var timeoutFunc = function(e,c){
      if (info) {
        if (! info.stayFlag) {
          info.remove(); ryt.app.unregisterHoverInfo(info); info = null;
        } else {
          infoTimeout = setTimeout(timeoutFunc, 1000);
        }
      }
    };
    return [
      function (e) {
        if (infoTimeout) {
          return; // only set it once
        }
        e = e || window.event;
        if (app.isBusy()) {
          return;
        }
        infoTimeout = setTimeout(function(){
          //eg.log(RYT.info.dblclickTime, +new Date(), +new Date() - RYT.info.dblclickTime);
          if (+new Date() - RYT.info.dblclickTime
              < startDelay + noneDblclickTime) {
            return; // avoid hover info, if just doubleclicked onto elem
          }
          if (! info && ! app.isBusy()
              && ! app.isMouseDown() /* do not show info, if in selecting */) {
            var cb;
            if (elementLinkFlag) {
              var element = e.currentTarget.id;
              var parent =
                (infoStrCB
                 ? (element !== infoStrCB.elementId
                    ? infoStrCB.elementId // subelem
                    : infoStrCB.parentId) // elem itself
                 : null
                );
              cb = app.elementInfoStrCB(element, parent);
            } else {
              cb = infoStrCB;
            }
            info = showHoverInfo(eg.Point.xy(e.pageX,e.pageY), cb);
            info.timeoutFunc = timeoutFunc;
            ryt.app.registerHoverInfo(info);
            infoTimeout = setTimeout(timeoutFunc, overStayTime);
          }}, startDelay);
        //eg.stopPropagationPreventDefault(e);
      },
      function(e){
        e = e || window.event;
        if (infoTimeout) {
          clearTimeout(infoTimeout); infoTimeout = null;
          if (info) {
            if (app.isBusy()) {
              info.stayFlag = false;
              timeoutFunc();
            } else {
              setTimeout(timeoutFunc, stopDelay);
            }
          }
        }
        //eg.stopPropagationPreventDefault(e);
      }
    ];
  } // createInfoHoverFuns()

  function installElementLinkBehavior(node, infoStrCB) {
    var hoverFuns = createInfoHoverFuns(infoStrCB, ryt.app, true);
    node.find(".elementLink")
      .dblclick(function(e) {
        e = e || window.event;
        var id = e.currentTarget.id;
        // Timeout needed here, because openElementDialog() may remove node
        // containing elem link, so propagation below would not work without ..
        setTimeout(function() {
          ryt.app.openElementDialog(
            id, (infoStrCB
                 ? (id !== infoStrCB.elementId
                    ? infoStrCB.elementId // subelem
                    : infoStrCB.parentId) // elem itself
                 : null)
          );
        }, 0);
        // .. propagate dblclick ev to node, because it may need it for
        // cancelling single click action (timeout above ensures propagation):
        // this is used by hover infos (created by hovering).
      })
      .hover(hoverFuns[0], hoverFuns[1]);
  }
  function line2HTML(line) {
    return eg.str2HTMLBasic(eg.leadingSpaces2nbsp(line), { rawFlag:true });
  }
  function linePart2HTML(str) {
    return eg.str2HTMLBasic(eg.allSpaces2nbsp(str), { rawFlag:true });
  }

  function diffStringsHTML(diffInfo) {
    var chunk, chunkIx, chunkLen = diffInfo.length;
    var minusHTML = '', plusHTML = '';
    var strMinus, strPlus, minus, plus, minusLen, plusLen, ix, len, equalFlag;
    for (chunkIx = 0; chunkIx < chunkLen; ++chunkIx) {
      chunk = diffInfo[chunkIx];
      minus = chunk['-']; minusLen = minus.length;
      plus = chunk['+']; plusLen = plus.length;
      len = Math.max(minusLen, plusLen);
      equalFlag = chunk.type === '==';
      ix = 0;
      if (equalFlag) {
        strMinus = strPlus = '';
        for (; ix < len; ++ix) {
          strMinus += minus[ix][0];
          strPlus += plus[ix][0];
        }
        minusHTML += linePart2HTML(strMinus);
        plusHTML += linePart2HTML(strPlus);
      } else {
        if (ix < minusLen && ix < plusLen) {
          minusHTML += '<span class="diff replace">';
          plusHTML += '<span class="diff replace">';
          strMinus = strPlus = '';
          for (ix = 0; ix < len && ix < minusLen && ix < plusLen; ++ix) {
            strMinus += minus[ix][0];
            strPlus += plus[ix][0];
          }
          minusHTML += linePart2HTML(strMinus);
          plusHTML += linePart2HTML(strPlus);
          minusHTML += '</span>';
          plusHTML += '</span>';
        }
        if (ix < minusLen) { // delete
          strMinus = '';
          minusHTML += '<span class="diff delete">';
          for (; ix < minusLen; ++ix) {
            strMinus += minus[ix][0];
          }
          minusHTML += linePart2HTML(strMinus);
          minusHTML += '</span>';
        } else if (ix < plusLen) { // insert
          strPlus = '';
          plusHTML += '<span class="diff insert">';
          for (; ix < plusLen; ++ix) {
            strPlus += plus[ix][0];
          }
          plusHTML += linePart2HTML(strPlus);
          plusHTML += '</span>';
        }
      }
    } // chunk loop
    return [minusHTML, plusHTML];
  } // diffStringsHTML()

  function diffLine(mNumber, mLine, pLine, pNumber, equalFlag) {
    var diffStringsThreshold = 1/5;
    var classActionStr = equalFlag
      ? 'equal'
      : (mNumber
         ? (pNumber
            ? 'replace'
            : 'delete')
         : (pNumber
            ? 'insert'
            : '???') // shouldn't happen
        );
    var classStr = 'diff ' + classActionStr;
    var diffStrings, mHTML, pHTML;
    var diffInfo, chunk, chunkIx, chunkLen;
    var minus, plus, minusLen, plusLen;
    var equalFlag;
    var allMinusLen, allPlusLen, maxEqualLen;
    if (classActionStr === 'replace') {
      diffInfo = eg.strDiff(mLine, pLine);
      allMinusLen = 0, allPlusLen = 0, allEqualLen = 0, maxEqualLen = 0;
      chunkLen = diffInfo.length;
      for (chunkIx = 0; chunkIx < chunkLen; ++chunkIx) {
        chunk = diffInfo[chunkIx];
        equalFlag = chunk.type === '==';
        minus = chunk['-']; minusLen = minus.length;
        plus = chunk['+']; plusLen = plus.length;
        allMinusLen += minusLen;
        allPlusLen += plusLen;
        if (equalFlag) {
          maxEqualLen = Math.max(maxEqualLen, minus.length);
          allEqualLen += minus.length;
        }
      }
      //eg.log(allMinusLen, allPlusLen, maxEqualLen);
      // Check if biggest ommon part of mLine, pLine is big enough for diffing.
      if (allEqualLen / allMinusLen > diffStringsThreshold
          && allEqualLen / allPlusLen > diffStringsThreshold) {
        diffStrings = diffStringsHTML(diffInfo);
        mHTML = diffStrings[0];
        pHTML = diffStrings[1];
      } else {
        mHTML = line2HTML(mLine);
        pHTML = line2HTML(pLine);
      }
    } else {
      mHTML = mLine && line2HTML(mLine) || '';
      pHTML = pLine && line2HTML(pLine) || '';
    }
    var str = '';
    str += '<tr>';
    str += '<td '+ 'class="' + 'minus number ' + classStr + '">';
    str += mNumber || '';
    str += '</td>';
    str += '<td '+ 'class="' + 'minus line ' + classStr + '">';
    str += mHTML;
    str += '</td>';
    //
    str += '<td '+ 'class="' + 'plus number ' + classStr + '">';
    str += pNumber || '';
    str += '</td>';
    str += '<td '+ 'class="' + 'plus line ' + classStr + '">';
    str += pHTML;
    str += '</td>';
    str += '</tr>';
    return str;
  }
  var diffTableColumns = 4;
  function createDiffTableSection(subheader, text_1, text_2, title_1, title_2) {
    var diffInfo = eg.lineDiff(text_1, text_2);
    var chunk, chunkIx, chunkLen = diffInfo.length;
    var str = '', minus, plus, minusLen, plusLen, ix, len, equalFlag;
    if (subheader) {
      str += ''
        +'<thead class="diff subHeader">'
        +'<th colspan="' + diffTableColumns + '">' + subheader + '</th>'
        +'</thead>';
    }
    if (title_1 || title_2) {
      str += '' 
        +'<thead>'
        +  '<th colspan="2">' + (title_1 || '') + '</th>'
        +  '<th colspan="2">' + (title_2 || '') + '</th>'
        +'</thead>';
    }
    str += '<tbody>';
    for (chunkIx = 0; chunkIx < chunkLen; ++chunkIx) {
      chunk = diffInfo[chunkIx];
      minus = chunk['-']; minusLen = minus.length;
      plus = chunk['+']; plusLen = plus.length;
      len = Math.max(minusLen, plusLen);
      equalFlag = chunk.type === '==';
      for (ix = 0; ix < len; ++ix) {
        str += diffLine(
          ix < minusLen ? minus[ix][1] + 1 : null,
          ix < minusLen ? minus[ix][0]     : null,
          ix < plusLen  ? plus[ix][0]      : null,
          ix < plusLen  ? plus[ix][1] + 1  : null,
          equalFlag
        );
      }
    }
    str += '</tbody>';
    return str;
  }
  function createDiffHTML(text_1, text_2, subheader, title_1, title_2) {
    var str = '';
    str += '<table border="1">';
    str += createDiffTableSection(text_1, text_2, subheader, title_1, title_2);
    str += createDiffTableSection(text_1, text_2, subheader);
    str += '</table>';
    return str;
  } // createDiffHTML()

  function diffDialog(text_1, text_2, widthOrNil) {
    var topOff = 50;
    var diffHTML = createDiffHTML(text_1, text_2, 'subheader', 'first', 'second');
    var dia = $('<div>'+diffHTML+'</div>');
    dia.dialog({
      resizable: true,
      width: widthOrNil ? widthOrNil : '500',
      modal: false,
      position: ['center', topOff]
    });
  } // diffDialog()
  function createDiffTableEntry(subheader, mText, pText, additionalClassStr) {
    var classActionStr = mText === pText
      ? 'equal'
      : (mText
         ? (pText
            ? 'replace'
            : 'delete')
         : (pText
            ? 'insert'
            : '???') // shouldn't happen
        );
    var classStr = 'diff ' + classActionStr
      + (additionalClassStr
         ? ' ' + additionalClassStr
         : '');
    var html = '';
    if (subheader) {
      html += ''
        +'<thead class="diff subHeader '
        //+ classStr
        +'">'
        +'<th colspan="' + diffTableColumns + '">' + subheader + '</th>'
        +'</thead>';
    }
    html += '<tr>';
    html += '<td colspan="'+ diffTableColumns/2 + '"'
      +' class="minus text ' + classStr + '">';
    html += mText || '';
    html += '</td>';
    html += '<td colspan="'+ diffTableColumns/2 + '"'
      +' class="plus text ' + classStr + '">';
    html += pText || '';
    html += '</td>';
    html += '</tr>';
    return html;
  }
  function showDiff(elementId, elementObj, currentProps, previousProps, diaArgObj) {
    diaArgObj = diaArgObj || {};
    var type = elementObj && elementObj.type;
    var topOff = 50;
    var diffId = 'showDiff_' + elementId;
    var html = '';
    html += '<div>';//'<div ' + 'id="' + diffId + '">';
    html += elementObj ?
      eg.str2HTML('@'+elementId+'@', { elementLinkClassString: linkProps.elementLinkClassString })
    : '[non-existing element]';
    html += '</div>';
    html += '<hr />';
    html += '<table border="0" width="100%">';
    html += ''
      +'<thead class="diff mainHeader">'
      +'<th'
      //+' style="border: 1px solid white;"'
      +' colspan="' + diffTableColumns/2 + '" width="50%">'
      + '<h2>previous</h2>' + '</th>'
      +'<th'
      //+' style="border: 1px solid white;"'
      +' colspan="' + diffTableColumns/2 + '" width="50%">'
      + '<h2>current</h2>' + '</th>'
      +'</thead>';
    // show always
    html += createDiffTableEntry(
      null, // timestamp
      ! previousProps ? null
        : (  previousProps.lastModificationTime
             && eg.localDateTimeString(previousProps.lastModificationTime)
          )
        || eg.localDateTimeString(previousProps.creationTime),
      ! currentProps ? null
        : (  currentProps.lastModificationTime
             && eg.localDateTimeString(currentProps.lastModificationTime)
          )
        || eg.localDateTimeString(currentProps.creationTime),
      'timestamp'
    );
    html += createDiffTableEntry(
      'by user',
      ! previousProps ? null
        : (previousProps.lastModifiedBy || previousProps.createdBy),
      ! currentProps ? null
        : currentProps.lastModifiedBy || currentProps.createdBy
    );
    if (type === 'comment') {
      html += createDiffTableSection(
        'text',
        ! previousProps ? null
          : previousProps.text,
        ! currentProps ? null
          : currentProps.text
      );
    } else if (type === 'task') {
      html += createDiffTableSection(
        'name',
        ! previousProps ? null
          : previousProps.name,
        ! currentProps ? null
          : currentProps.name
      );
      html += createDiffTableSection(
        'description',
        ! previousProps ? null
          : previousProps.description,
        ! currentProps ? null
          : currentProps.description
      );
      html += createDiffTableEntry(
        'finished',
        ! previousProps ? null
          : (eg.isNil(previousProps.finished)
             ? 'n/a' : '' + previousProps.finished),
        ! currentProps ? null
          : (eg.isNil(currentProps.finished)
             ? 'n/a' : '' + currentProps.finished)
      );
      // show only, if differing from default
      if (previousProps && ! eg.isNil(previousProps.prio)
          || currentProps && ! eg.isNil(currentProps.prio)) {
        html += createDiffTableEntry(
          'prio',
          ! previousProps ? null
            : eg.isNil(previousProps.prio) ? 'n/a' : "" + previousProps.prio,
          ! currentProps ? null
            : eg.isNil(currentProps.prio) ? 'n/a' : "" + currentProps.prio
        );
      }
      if (previousProps && ! eg.isNil(previousProps.subtaskFinishPropagation)
          || (currentProps
              && ! eg.isNil(currentProps.subtaskFinishPropagation))) {
        html += createDiffTableEntry(
          'subtask finish propagation',
          ! previousProps ? null
            : (eg.isNil(previousProps.subtaskFinishPropagation)
               ? 'false' : '' + previousProps.subtaskFinishPropagation),
          ! currentProps ? null
            : (eg.isNil(currentProps.subtaskFinishPropagation)
               ? ' false' : '' + currentProps.subtaskFinishPropagation)
        );
      }
      if (previousProps && ! eg.isNil(previousProps.logic)
          || currentProps && ! eg.isNil(currentProps.logic)) {
        html += createDiffTableEntry(
          'logic',
          ! previousProps ? null
            : (eg.isNil(previousProps.logic) ? 'and' : previousProps.logic),
          ! currentProps ? null
            : (eg.isNil(currentProps.logic) ? 'and' : currentProps.logic)
        );
      }
    } // if (type === 'task')
    html += '</table>';
    var dia = $('<div id="' + diffId + '" class="showDiff">'
                + html
                +'</div>'
               );
    var title = (type === 'comment'
                 ? 'Comment'
                 : type === 'task'
                 ? 'Task'
                 : '???')
      + ' Diff';
    elementObj && installElementLinkBehavior(dia, null);
    dia.dialog({
      title: title,
      modal: false,
      resizable: true,
      width: diaArgObj.width || 'auto',
      //mem position: ['center', 200], // mixed type of args working
      position: diaArgObj.pos ?
        [diaArgObj.pos.x, diaArgObj.pos.y]
        : diaArgObj.position ?
        [diaArgObj.position, topOff]
        : 'center',
      // could be of interest later:
      // collision: 'none',
      // position: {my: 'top left', 
      //            at: 'top left',
      //            of: window,
      //            offset: '0% 50px'},
      open: function () {
        ryt.app.registerDiff(elementId, dia);
        // Dialog windows covering action buttons at top can happen, if main
        //   window is too small for some dia window: lines here correct this
        //   behavior.
        var topStr = $(this).parent().css('top'); // string with 'px' postfix
        if (parseInt(topStr, 10) < topOff) {// compare numbers (get rid of 'px')
          $(this).parent().css({'top': topOff});
        }
      },
      close: function() {
        dia.remove();
        ryt.app.unregisterDiff(elementId);
      }
    });
    dia._count = ++showDiff.count;
    dia._id = diffId;
    return dia;
  }
  showDiff.count = 0;

  function openMaintenanceDialog(entries_, key, cb) {
    var entries = entries_.sort(function(e_1, e_2) {
      var mtime_1 = e_1.mtime, mtime_2 = e_2.mtime;
      // newest first (descending)
      return mtime_1 > mtime_2 ? -1 : mtime_1 === mtime_2 ? 0 : +1;
    });
    var diaArgObj = {};
    var str = '';
    var ix, len = entries.length;
    str += '<div>'
      +'<h3>Projects at server inside project area<br>'
      + '<span style="font-family:monospace;">&nbsp;&nbsp;' + key + '</span>'
      + '<br>(newest first):</h3>'
      +'<hr>';
    str += ''
      +'<table class="maintenance dia">'
      +  '<thead>'
      +    '<th>project</th>'
      +    '<th>server modification time</th>'
      +    '<th>size</th>'
      +    '<th>select</th>'
      +  '</thead>'
      +  '<tbody>';
    for (ix = 0; ix < len; ++ix) {
      var entry = entries[ix];
      var ident = entry.fn.slice(0, -5);
      var suffix = entry.fn.slice(-5);
      if (! ident || suffix != '.json') {
        continue; // robustness against files not being project data files
      }
      str += '<tr>'
      str +=   '<td>' + ident + '</td>';
      str +=   '<td style ="text-align:center;">' + entry.mtime + '</td>';
      str +=   '<td style="text-align:right;">' + entry.size + '</td>';
      var selectHTML = '<input type="checkbox" name="selectProject"'
        + ' value="' + ident + '" />';
      str +=   '<td style="text-align:center;">' + selectHTML + '</td>';
      str += '</tr>';
    }
    str += '</tbody></table>';
    str += '</div>';
    dia = $(str);
    var deleteFlag = false;
    dia.dialog({
      title: 'Project Area Maintenance',
      autoOpen: true,
      modal: true,
      resizable: true,
      width: 'auto',
      position: diaArgObj.pos ?
        [diaArgObj.pos.x, diaArgObj.pos.y]
        : diaArgObj.position ?
        [diaArgObj.position, topOff]
        : 'center',
      open: function () {
        null;
      },
      close: function(arg) {
        var checked = [];
        $("input[name='selectProject']:checked").each(function() {
          checked.push($(this).val());
        });
        dia.remove();
        cb(checked, deleteFlag);
      },
      buttons: {
        DeleteSelected: function() {
          deleteFlag = true;
          $(this).dialog('close');
        },
        Cancel: function() {
          $(this).dialog('close');
        }
      }
    });
    return dia;
  }

  function openTextareaDialog(argObj, callbackOK) {
    argObj = argObj || {};
    var title = argObj.title || '?';
    var diaCount = ++openTextareaDialog.diaCount;
    var $dia = $(
      '<div id="textarea-dialog'+ diaCount +'" title="'+ title +'"'
        +'style="overflow:hidden;" '
        +'>'

    //+'<form accept-charset="utf-8">'

        +'<textarea '
        +   'name="text" id="text" rows="10" '
        +   'style="width:100%; height:100%; font-family:Courier;" '
        +'>'
      //+ text
        +'</textarea>'

      //+'</form>'

        +'</div>'
    );
    $dia.find("#text").val(argObj.text || "");
    $dia.extractProps = function () {
      var textarea = $dia.find("#text");
      $dia.props = { text:textarea.val() };
    };
    $dia.closeFromOK = false;

    var helpText = argObj.helpText || 'No help available.';

    var buttons = {}, labelOK = argObj.labelOK, labelCancel = argObj.labelCancel;
    var buttons = {};
    labelOK && (buttons[labelOK] = function() {
      $dia.closeFromOK = true;
      $dia.dialog('close');
    });
    labelCancel && (buttons[labelCancel] = function() {
      $dia.dialog('close');
    });
    buttons["?"] = function() {
      ryt.helpDialog(title, helpText);
    };
    $dia.dialog({
      position: argObj.pos ? [argObj.pos.x, argObj.pos.y] : 'center',
      autoOpen: true, modal: true, show: 'scale', hide: 'scale', width: 800,
      open: function(){
        var textArea = $dia.find("#text");
        setTimeout(function() {
          textArea.focus();
        }, 500);
      },
      close: function(event, ui) {
        if ($dia.closeFromOK && callbackOK) {
          $dia.extractProps();
          callbackOK($dia.props);
        }
      },
      buttons: buttons
      //beforeClose: self.createElemDialogBeforeCloseFunc($dia, dialogTitle, commentIdOrNil),
    });
  } // openTextareaDialog()
  openTextareaDialog.diaCount = 0;


/* test:
var ryt = RYT;
var t1 = 'foo\neins\nzwei\ndrei\nvier\nfuenf';
var t2 = 'bar\neins\nzwei\ndreie\ndrei\nextra';
var res = ryt.createDiffHTML(t1, t2, 'first', 'second');
ryt.diffDialog(t1, t2)
*/

  // exports
  //

  // devel
  ryt.createDiffHTML = createDiffHTML;
  ryt.diffDialog = diffDialog;

  // info
  ryt.showInfo = showInfo;
  ryt.showHoverInfo = showHoverInfo;
  ryt.showDiff = showDiff;

  // dialogs generic
  ryt.helpDialog = helpDialog;
  ryt.decisionDialog = decisionDialog;
  ryt.confirmDialog = confirmDialog;
  ryt.warnDialog = warnDialog;
  ryt.newsDialog = newsDialog;

  // dialogs specific
  ryt.openTextareaDialog = openTextareaDialog;
  ryt.openUserInfoDialog = openUserInfoDialog;
  ryt.openProjectSaveAsOrLoadDialog = openProjectSaveAsOrLoadDialog;
  ryt.openPrefsDialog = openPrefsDialog;
  ryt.openMaintenanceDialog = openMaintenanceDialog;

  // menu
  ryt.popupMenu = popupMenu;

  // encryption
  ryt.openKeyDialog = openKeyDialog;
  ryt.logStrength = logStrength;

  // misc
  ryt.createInfoHoverFuns = createInfoHoverFuns;
  ryt.createSelectHTMLGenerator = createSelectHTMLGenerator;

}(EvolGo, RYT));
