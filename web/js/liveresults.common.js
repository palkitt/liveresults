// Functions for radio.php and start registration

(function (Namespace) {
  "use strict";
  if (Namespace === undefined || Namespace.AjaxViewer === undefined)
    return;
  let AjaxViewer = Namespace.AjaxViewer;

  // Is the comp date today or max 6 hours into the next day
  AjaxViewer.prototype.isCompToday = function () {
    var now = new Date();
    var compDay = new Date(this.compDate);
    var dDays = (now - compDay) / 1000 / 86400;
    return (dDays > 0 && dDays < 1.25 || this.compDate == "" || this.local)
  };


  // Detect if the browser is a mobile phone or iPad: 1 = mobile, 2 = iPad, 0 = PC/other
  AjaxViewer.prototype.isMobile = function () {
    if (navigator.userAgent.match(/iPad/i) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
      return 2;
    if (navigator.userAgent.match(/Mobi/))
      return 1;
    if ('screen' in window && window.screen.width < 1366)
      return 1;
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && connection.type === 'cellular')
      return 1;
    return 0;
  }


  // Class name shortener
  AjaxViewer.prototype.classShort = function (className) {
    return className.replace(/menn/i, 'M')
      .replace(/herrer/i, 'H')
      .replace(/kvinner/i, 'K')
      .replace(/damer/i, 'D')
      .replace(/gutter/i, 'G')
      .replace(/jenter/i, 'J')
      .replace(/veteran(er)?/i, 'Vet')
      .replace(' Vann', 'V');
  }


  // Runner name shortener
  AjaxViewer.prototype.nameShort = function (name) {
    if (!name)
      return false;
    var array = name.split(' ');
    if (array.length == 1)
      return name;

    var num = array[array.length - 1];
    if (num.match(/\d+/g) != null) {
      array.pop();
      num = " " + num;
    }
    else
      num = "";

    var shortName = array[0] + ' ';
    for (var i = 1; i < array.length - 1; i++)
      shortName += array[i].charAt(0) + '.';
    if (shortName.length + array[array.length - 1].length < this.maxNameLength)
      shortName += ' ' + array[array.length - 1];
    else {
      var arrayLast = array[array.length - 1].split('-');
      var lastName = '';
      if (arrayLast.length > 1)
        lastName = arrayLast[arrayLast.length - 2].charAt(0) + '-' + arrayLast[arrayLast.length - 1];
      else
        lastName = arrayLast[0];
      shortName += ' ' + lastName;
    }
    return shortName + num;
  };


  // Club name shortener
  AjaxViewer.prototype.clubShort = function (club) {
    if (!club)
      return false;
    var del = /^<del>/i.test(club);
    var shortClub = club.replace(/<\/?del>/gi, '');
    if (shortClub.length <= this.maxClubLength)
      return club;

    shortClub = shortClub.replace(/orient[a-z]*/i, 'O.')
      .replace(/ski(?:klub|lag)[a-z]*/i, 'Sk.')
      .replace(/(?:og|&) omegn if/i, 'OIF')
      .replace(/(?:og|&) omegn il/i, 'OIL')
      .replace(/(?:og|&) omegn/i, '')
      .replace(/national team/i, 'NT')
      .replace(/sports?klubb[a-z]*/i, 'Spk.')
      .replace(/idretts?(?:forening|lag)[a-z]*/i, '')
      .replace(/skiskytt(?:e|a)r(?:forening|lag)[a-z]*/i, '')
      .replace(/university (?:of|college) /i, 'Un. ')
      .replace(/ ?- ?ski/i, '')
      .replace(/OL|OK|SK|IL/, '')
      .trim();

    var match = shortClub.match(/(-?\d+)$/); // Match trailing numbers
    var suffix = match ? match[0] : "";
    var clubNameOnly = match ? shortClub.slice(0, match.index).trim() : shortClub;
    if (clubNameOnly.length > this.maxClubLength)
      shortClub = clubNameOnly.slice(0, this.maxClubLength) + "…" + suffix;
    if (del)
      shortClub = "<del>" + shortClub + "</del>";
    return shortClub;
  };


  AjaxViewer.prototype.sortClasses = function (classes) {
    if (!Array.isArray(classes))
      return [];
    const sortWeight = (cls) => {
      const name = cls?.className ?? cls?.Class ?? "";
      let key = name.toLowerCase();
      if (/(åpen|open|gjest|dir|utv)/i.test(key))
        key = "z" + key;
      if (/(-e| e|\d+e|elite|wre|nm)(\s*\d*)$/i.test(key))
        key = "a" + key;
      return key
        .replace(/\d+/g, (num) => num.padStart(3, "0"))
        .replace(/\s+/g, "")
        .replace(/[-+]/g, "")
        .replace(/prolog/gi, "a")
        .replace(/(kvart|kv)/gi, "b")
        .replace(/(semi|se)/gi, "c")
        .replace(/finale/gi, "d")
        .replace(/nmko(total|talt)?/gi, "e");
    };

    return classes.slice().sort((a, b) => {
      const keyA = sortWeight(a);
      const keyB = sortWeight(b);
      if (keyA === keyB)
        return 0;
      return keyA < keyB ? -1 : 1;
    });
  }


  //Find rank number
  AjaxViewer.prototype.findRank = function (array, val) {
    var rank = 1;
    for (var i = 0; i < array.length; i++)
      if (array[i] < val)
        rank++;
      else
        break;
    return rank;
  };


  // Animate an update to date table
  AjaxViewer.prototype.animateTable = function (oldData, newData, animTime, predRank = false, clubTable = false) {
    // Based on jQuery Animated Table Sorter 0.2.2 (02/25/2013)
    // http://www.matanhershberg.com/plugins/jquery-animated-table-sorter/

    if (this.animating || !newData.length)
      return
    try {
      var _this = this;
      var currentTable = this.currentTable;
      var isResTab = (newData[0].virtual_position != undefined);

      var getRowId = function (row) {
        if (_this.EmmaServer)
          return row.name + row.club;
        if (!isResTab && row.controlName != undefined)
          return row.controlName + row.dbid;
        return row.dbid;
      };

      // Make list of indexes and progress for all runners 
      var prevInd = {};  // List of old indexes
      var prevProg = {}; // List of old progress
      for (var i = 0; i < oldData.length; i++) {
        var oldID = getRowId(oldData[i]);
        if (prevInd[oldID] != undefined) {
          prevInd[oldID] = "noAnimation"; // Skip if two identical ID
        }
        else {
          prevInd[oldID] = (isResTab ? oldData[i].virtual_position : i);
          prevProg[oldID] = (isResTab && !clubTable ? oldData[i].progress : 100);
        }
      }

      var lastInd = {}; // List of last index for updated entries
      var updProg = {}; // List of progress change
      for (var i = 0; i < newData.length; i++) {
        var newID = getRowId(newData[i]);
        var newInd = (isResTab ? newData[i].virtual_position : i);
        if (prevInd[newID] != undefined && prevInd[newID] != "noAnimation" && prevInd[newID] != newInd) {
          lastInd[newInd] = prevInd[newID];
          updProg[newInd] = (isResTab ? prevProg[newID] != newData[i].progress : false);
        }
      }
      var changedCount = Object.keys(lastInd).length;
      if (changedCount == 0) { // No modifications
        if (predRank)
          this.startPredictedTimeTimer();
        else if (clubTable)
          this.updateClubTimes();
        return;
      }

      var order = currentTable.order();
      var numCol = currentTable.settings().columns()[0].length;
      if (clubTable) {
        if (order.length > 0 && order[0][0] != 1) { // Not sorted on position
          this.updateClubTimes();
          return;
        }
      }
      else if (isResTab && order.length > 0 && order[0][0] != numCol - 1) { // Not sorted on virtual position
        if (predRank)
          this.startPredictedTimeTimer();
        return;
      }

      // Prepare for animation
      this.animating = true;
      // Turn off fixed header if not already applied
      if ($('div[class^="dtfh-floatingparent dtfh-floatingparent-head"]').length === 0)
        currentTable.fixedHeader.disable();

      var table = (isResTab ? $('#' + this.resultsDiv) : $('#' + this.radioPassingsDiv));
      var rows = table.find('tr');
      var bodyRows = table.find('tbody tr');
      var tableCells = table.find('tr td, tr th');

      // Set each td's width
      var column_widths = [];
      table.find('tr:first-child th').each(function () {
        column_widths.push($(this)[0].getBoundingClientRect().width);
      });
      tableCells.each(function () { 
        $(this).css('min-width', column_widths[$(this).index()]); 
      });

      // Set table height and width
      var height = table.outerHeight();

      // Put all the rows back in place
      var rowPosArray = [];
      var rowIndArray = [];
      var top = 0;
      var ind = -1; // -1:header; 0:first data
      rows.each(function () {
        var rowEl = this;
        var rowHeight = rowEl.getBoundingClientRect().height;        
        $(rowEl).css({
          top: top,
          height: rowHeight
        });
        if ($(rowEl).is(":visible")) {
          rowPosArray.push(top);
          rowIndArray.push(ind);
          top += rowHeight;
        }
        ind++;
      });

      table.height(height).width('100%');
      table.css({ 'table-layout': 'fixed' });

      // Set table cells position to absolute
      bodyRows.each(function () {
        $(this).css('position', 'absolute').css('z-index', '-9');;
      });

      // Animation
      var translateNew = "translate3d(0,0,0)";
      var transformTransition = 'transform ' + _this.animTime + 'ms';
      var boxShadowTransition = 'box-shadow ' + _this.animTime + 'ms';
      for (var lastIndStr in lastInd) {
        var newInd = parseInt(lastIndStr);
        var oldInd = lastInd[newInd];
        var oldPos = rowPosArray[oldInd + 1]; // First entry is header
        var newPos = rowPosArray[newInd + 1];
        var row = bodyRows.eq(rowIndArray[newInd + 1]);
        var rowEl = row[0];
        var cells = row.find('td');
        var oldOpacity = (oldInd % 2 == 0 ? 0.08 : 0);
        var newOpacity = (newInd % 2 == 0 ? 0.08 : 0);
        var zind;
        if (predRank) // Update from predictions of running times         
          zind = (newInd == 0 ? -4 : (newInd > oldInd ? -5 : -7));
        else // Updates from new data from server
          zind = (updProg[newInd] ? -5 : -7);
        row.css('z-index', zind);
        var translateOld = "translate3d(0," + (oldPos - newPos) + "px,0)";

        // Set the initial position instantly
        row.css({
          'transition': 'none',
          'transform': translateOld
        });

        // Set new bavkground color directly for lager updates
        var opacity = (changedCount < 10 ? oldOpacity : newOpacity);
        cells.each(function () {
          $(this).css({
            'transition': 'none',
            'box-shadow': 'inset 0 0 0 9999px rgba(0, 0, 0, ' + opacity + ')'
          });
        });

        // Force a single reflow to ensure the browser registers initial condition
        rowEl.offsetHeight; 

        // Set the new position with a transition
        row.css({
          'transition': transformTransition,
          'transform': translateNew,
        });
        
        // Animate background color from old to new opacity for smaller updates
        if (changedCount < 10) {
          cells.each(function () {
            $(this).css({
              'transition': boxShadowTransition,
              'box-shadow': 'inset 0 0 0 9999px rgba(0, 0, 0, ' + newOpacity + ')'
            });
          });
        }
      }
      setTimeout(function () { _this.endAnimateTable(table, predRank, clubTable) }, _this.animTime + 100);
    }
    catch {
      this.animating = false;
      if (!currentTable.fixedHeader.enabled()) {
        currentTable.fixedHeader.enable();
      }
      if (predRank)
        this.startPredictedTimeTimer();
    }
  };


  // Reset settings after animation is completed
  AjaxViewer.prototype.endAnimateTable = function (table, predRank, clubTable) {
    var currentTable = this.currentTable;
    var rows = table.find('tr');
    var tableCells = table.find('tr td, tr th');

    tableCells.each(function () { 
      $(this).css('min-width', ''); 
    });
    rows.each(function () {
      $(this).css('position', '').css('height', '');
    });
    table.height(0).width('100%');
    table.css({ 'table-layout': 'auto' });
    this.animating = false;
    if (!currentTable.fixedHeader.enabled()) {
      currentTable.fixedHeader.enable();
    }
    if (predRank)
      this.startPredictedTimeTimer();
    else if (clubTable)
      this.updateClubTimes();
  };



  AjaxViewer.prototype.formatTime = function (time, status, showTenthOs, showHours, padZeros, clockTime) {
    if (arguments.length == 2 || arguments.length == 3) {
      if (this.language == 'fi' || this.language == 'no') {
        showHours = true;
        padZeros = false;
      }
      else {
        showHours = false;
        padZeros = true;
      }
    }
    else if (arguments.length == 4) {
      if (this.language == 'fi' || this.language == 'no')
        padZeros = false;
      else
        padZeros = true;
    }
    if (status != 0) {
      return this.runnerStatus[status];
    }
    else if (time == -999)
      return this.resources["_FREESTART"];
    else if (time == -1)
      return "";
    else if (time < 0)
      return "*"
    else {
      var minutes;
      var seconds;
      var tenth;
      var restart = "";

      if (time > this.restartTimeOffset) // 100 hours. Used for indicating restart in relay
      {
        restart = "<small>*</small>"; // Small * to indicate that team has restarted  
        time = time % this.restartTimeOffset;
      }

      if (showHours) {
        var hours = Math.floor(time / 360000);
        minutes = Math.floor((time - hours * 360000) / 6000);
        seconds = Math.floor((time - minutes * 6000 - hours * 360000) / 100);
        tenth = Math.floor((time - minutes * 6000 - hours * 360000 - seconds * 100) / 10);
        if (hours > 0 || clockTime) {
          if (padZeros)
            hours = this.strPad(hours, 2);
          return hours + ":" + this.strPad(minutes, 2) + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "") + restart;
        }
        else {
          if (padZeros)
            minutes = this.strPad(minutes, 2);
          return minutes + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "") + restart;
        }
      }
      else {
        minutes = Math.floor(time / 6000);
        seconds = Math.floor((time - minutes * 6000) / 100);
        tenth = Math.floor((time - minutes * 6000 - seconds * 100) / 10);
        if (padZeros) {
          return this.strPad(minutes, 2) + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "") + restart;
        }
        else {
          return minutes + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "") + restart;
        }
      }
    }
  };

  AjaxViewer.prototype.strPad = function (num, length) {
    var str = '' + num;
    while (str.length < length) {
      str = '0' + str;
    }
    return str;
  };

})(window.LiveResults || window.Messages || {});