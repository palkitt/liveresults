// Functions for radio.php and start registration

(function (LiveResults) {
  "use strict";
  let AjaxViewer = LiveResults.AjaxViewer;

  // Request data for the last radio passings div
  AjaxViewer.prototype.updateRadioPassings = function (code) {
    var _this = this;
    clearTimeout(this.radioPassingsUpdateTimer);
    if (this.updateAutomatically) {
      $.ajax({
        url: this.radioURL,
        data: "comp=" + this.competitionId + "&method=getradiopassings&code=" + code +
          "&lang=" + this.language + "&last_hash=" + this.lastRadioPassingsUpdateHash,
        success: function (data, status, resp) {
          var expTime = new Date();
          expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
          _this.handleUpdateRadioPassings(data, expTime, code);
        },
        error: function () {
          _this.radioPassingsUpdateTimer = setTimeout(function () { _this.updateRadioPassings(); }, _this.radioUpdateInterval);
        },
        dataType: "json"
      });
    }
  };


  // Handle response for updating the last radio passings
  AjaxViewer.prototype.handleUpdateRadioPassings = function (data, expTime, code) {
    var _this = this;
    if (data.rt != undefined && data.rt > 0)
      this.radioUpdateInterval = data.rt * 1000;
    $('#updateinterval').html(this.radioUpdateInterval / 1000);
    if (expTime) {
      var lastUpdate = new Date();
      lastUpdate.setTime(expTime - this.radioUpdateInterval + 1000);
      $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
    }

    // Make live blinker pulsing
    if (data.active && !$('#liveIndicator').find('span').hasClass('liveClient'))
      $('#liveIndicator').html('<span class="liveClient" id="liveIndicator">◉</span>');
    if (!data.active && !$('#liveIndicator').find('span').hasClass('notLiveClient'))
      $('#liveIndicator').html('<span class="notLiveClient" id="liveIndicator">◉</span>');

    const maxLines = 40;
    var leftInForest = false;
    var updated = false;

    // Insert data from query            
    if (data != null && data.status == "OK") {
      this.lastRadioPassingsUpdateHash = data.hash;
      updated = true;
      if (data.passings != null) {
        if (this.radioData == null || data.passings.length == 0 || data.passings[0].control == 100 || data.passings[0].timeDiff == -2)
          this.radioData = data.passings;
        else {
          Array.prototype.unshift.apply(this.radioData, data.passings);
          while (this.radioData.length > maxLines)
            this.radioData.pop();
        }
      }
      if (this.radioData != null && this.radioData.length > 0 && this.radioData[0].timeDiff == -2) {
        leftInForest = true;
        $('#numberOfRunners').html(this.radioData.length);
      }
    }

    // Modify data-table
    if (this.radioData != null) {
      var dt = new Date();
      var currentTimeZoneOffset = -1 * new Date().getTimezoneOffset();
      var eventZoneOffset = ((dt.dst() ? 2 : 1) + this.eventTimeZoneDiff) * 60;
      var timeZoneDiff = eventZoneOffset - currentTimeZoneOffset;
      var time = dt.getSeconds() + 60 * dt.getMinutes() + 3600 * dt.getHours() + 60 * timeZoneDiff;
      $.each(this.radioData, function (idx, passing) {
        if (_this.currentTable != null && (passing.status == 1 || _this.messageBibs.indexOf(parseInt(passing.dbid)) > -1)) {
          var row = _this.currentTable.row(idx).node();
          $(row).addClass('dns');
        }
        var hms = passing.passtime.split(':');
        var passTime = (+hms[0]) * 60 * 60 + (+hms[1]) * 60 + (+hms[2]);
        var age = time - passTime;
        if (passing.status >= 1 && passing.status <= 6) {
          if (passing.DT_RowClass != "yellow_row") {
            passing.DT_RowClass = "yellow_row";
            updated = true;
          }
        }
        else if (age >= 0 && age <= _this.radioHighTime) {
          if (passing.rank == 1 && passing.DT_RowClass != "green_row") {
            passing.DT_RowClass = "green_row";
            updated = true;
          }
          else if (passing.rank > 1 && passing.DT_RowClass != "red_row") {
            passing.DT_RowClass = "red_row";
            updated = true;
          }
        }
        else if (passing.DT_RowClass != "") {
          passing.DT_RowClass = "";
          updated = true;
        }
      });
    }

    if (this.currentTable != null && updated) // Existing datatable
    {
      var scrollX = window.scrollX;
      var scrollY = window.scrollY;
      var oldData = $.extend(true, [], this.currentTable.data().toArray());
      this.currentTable.clear();
      this.currentTable.rows.add(this.radioData).draw();
      this.filterTable();
      window.scrollTo(scrollX, scrollY);
      this.animateTable(oldData, this.radioData, this.animTime);
    }

    else if (this.currentTable == null) // New datatable
    {
      if (this.radioData != null && this.radioData.length > 0) {
        var columns = Array();
        var col = 0;
        if (!leftInForest) {
          columns.push({ title: "Sted", className: "dt-left", orderable: false, targets: [col++], data: "controlName" });
          columns.push({ title: "Tidsp.", className: "dt-left", orderable: false, targets: [col++], data: "passtime" });
        }
        columns.push({
          title: "&#8470;", className: "dt-right", orderable: leftInForest, targets: [col++], data: "bib",
          render: function (data, type) {
            if (type === 'display') {
              if (data < 0) // Relay
                return "<span class=\"bib\">" + (-data / 100 | 0) + "-" + (-data % 100) + "</span>";
              else if (data > 0)    // Ordinary
                return " <span class=\"bib\">" + data + "</span>";
              else
                return "";
            }
            else
              return Math.abs(data);
          }
        });
        columns.push({
          title: "Navn", className: "dt-left", orderable: leftInForest, targets: [col++], data: "runnerName",
          render: function (data, type) {
            if (type === 'display' && data.length > _this.maxNameLength)
              return _this.nameShort(data);
            else
              return data;
          }
        });
        columns.push({
          title: "Klubb", className: "dt-left", orderable: leftInForest, targets: [col++], data: "club",
          render: function (data, type) {
            if (type === 'display' && data.length > _this.maxClubLength)
              return _this.clubShort(data);
            else
              return data;
          }
        });
        columns.push({
          title: "Klasse", className: "dt-left", orderable: leftInForest, targets: [col++], data: "class",
          render: function (data, type, row) {
            var link = "<a href=\"followfull.php?comp=" + _this.competitionId + "#" + encodeURIComponent(row.class);
            link += "\" target=\"_blank\" style=\"text-decoration: none;\">" + row.class + "</a>";
            return link;
          }
        });
        if (!leftInForest && this.radioData.length > 0 && this.radioData[0].rank != null)
          columns.push({
            title: "#", className: "dt-right", orderable: false, targets: [col++], data: "rank",
            render: function (data, type, row) {
              var res = "";
              if (row.rank >= 0) res += row.rank;
              return res;
            }
          });

        var timeTitle = "Tid";
        if (leftInForest)
          timeTitle = "Starttid";
        columns.push({ title: timeTitle, className: "dt-right", orderable: leftInForest, targets: [col++], data: "time" });

        if (!leftInForest && this.radioData.length > 0 && this.radioData[0].timeDiff != null)
          columns.push({
            title: "Diff", className: "dt-right", orderable: false, targets: [col++], data: "timeDiff",
            render: function (data, type, row) {
              var res = "";
              if (row.timeDiff >= 0)
                res += "+" + _this.formatTime(row.timeDiff, 0, _this.showTenthOfSecond);
              else if (row.timeDiff != -1)
                res += "<i>-" + _this.formatTime(-row.timeDiff, 0, _this.showTenthOfSecond) + "</i>";
              return res;
            }
          });
        if (leftInForest) {
          columns.push({
            title: "Sjekk", className: "dt-center", orderable: true, targets: [col++], data: "status",
            render: function (data, type, row) {
              var res = "";
              if (row.checked == 1 || row.status == 9)
                res += "&#9989; "; // Green checkmark
              else
                res += "&#11036; "; // Empty checkbox
              return res;
            }
          });
          columns.push({
            title: "DNS", className: "dt-left", orderable: false, targets: [col++], data: "controlName",
            render: function (data, type, row) {
              var runnerName = (Math.abs(row.bib) > 0 ? "(" + Math.abs(row.bib) + ") " : "") + row.runnerName;
              var link = "<button onclick=\"res.popupDialog('" + runnerName + "'," + row.dbid + ",1);\">&#128172;</button>";
              return link;
            }
          });
        }

        this.currentTable = $('#' + this.radioPassingsDiv).DataTable({
          fixedHeader: true,
          fixedColumns: {
            leftColumns: (leftInForest ? 2 : 4),
            rightColumns: (leftInForest ? 1 : 0)
          },
          scrollX: true,
          paging: false,
          searching: true,
          ordering: leftInForest,
          data: this.radioData,
          layout: {
            topStart: null,
            topEnd: null,
            bottomStart: null,
            bottomEnd: null
          },
          order: (leftInForest ? [] : [[1, "desc"]]),
          columns: columns,
          destroy: true,
        });
      }
    }
    if (this.isCompToday())
      this.radioPassingsUpdateTimer = setTimeout(function () { _this.updateRadioPassings(code); }, this.radioUpdateInterval);
    else
      $('#liveIndicator').html('<span class="notLiveClient" id="liveIndicator">◉</span>');
  };


  AjaxViewer.prototype.updateStartRegistration = function (openStart) {
    var _this = this;
    clearTimeout(this.radioPassingsUpdateTimer);
    if (!this.updateAutomatically)
      return;
    var URLextra, headers;
    if (this.Time4oServer) {
      URLextra = "race/" + this.Time4oId + "/entry";
      headers = this.lastRadioPassingsUpdateHash ? { 'If-None-Match': this.lastRadioPassingsUpdateHash } : {};
    }
    else {
      URLextra = "?comp=" + this.competitionId + "&method=getrunners&last_hash=" + this.lastRadioPassingsUpdateHash
      headers = {};
    }
    $.ajax({
      url: this.apiURL + URLextra,
      headers: headers,
      dataType: "json",
      success: function (data, status, resp) {
        var expTime = false;
        if (_this.Time4oServer) {
          expTime = new Date(resp.getResponseHeader("date")).getTime() + _this.radioUpdateInterval;
          if (resp.status == 200) {
            _this.lastRadioPassingsUpdateHash = resp.getResponseHeader("etag").slice(1, -1);
            data.status = "OK";
          }
          else if (resp.status == 304) {
            data = { status: "NOT MODIFIED" };
          }
          else
            expTime = new Date(resp.getResponseHeader("expires")).getTime();
          data.rt = _this.radioUpdateInterval / 1000;
        }
        _this.handleUpdateStartRegistration(data, expTime, openStart);
      },
      error: function () {
        _this.radioPassingsUpdateTimer = setTimeout(function () { _this.updateStartRegistration(); }, _this.radioUpdateInterval);
      }
    });
  };


  // Handle response for updating the start registration
  AjaxViewer.prototype.handleUpdateStartRegistration = function (data, expTime, openStart) {
    var _this = this;
    if (data.rt != undefined && data.rt > 0)
      this.radioUpdateInterval = data.rt * 1000;
    $('#updateinterval').html(this.radioUpdateInterval / 1000);
    if (expTime) {
      var lastUpdate = new Date();
      lastUpdate.setTime(expTime - this.radioUpdateInterval + 1000);
      $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
    }

    // Make live blinker pulsing
    if (data.active && !$('#liveIndicator').find('span').hasClass('liveClient'))
      $('#liveIndicator').html('<span class="liveClient" id="liveIndicator">◉</span>');
    if (!data.active && !$('#liveIndicator').find('span').hasClass('notLiveClient'))
      $('#liveIndicator').html('<span class="notLiveClient" id="liveIndicator">◉</span>');

    // Insert data from query            
    if (data != null && data.status == "OK") {
      clearTimeout(this.updateStartRegistrationTimer);
      if (this.Time4oServer)
        data = this.Time4oEntryListToLiveres(data, this.activeClasses);
      else
        this.lastRadioPassingsUpdateHash = data.hash;

      data.runners.forEach(function (runner) {
        runner.show = 'true';
        runner.timeToStart = 0;
        if (_this.Time4oServer) {
          runner.starttime = runner.start;
          runner.start = _this.formatTime(runner.starttime, 0, false, true, false, true);
        }
      });
      this.radioData = data.runners;
      this.radioData.sort(this.startSorter);

      // Modify data-table
      if (this.currentTable != null) // Existing datatable
      {
        var scrollX = window.scrollX;
        var scrollY = window.scrollY;
        this.currentTable.clear();
        this.currentTable.rows.add(this.radioData).draw();
        this.filterTable();
        window.scrollTo(scrollX, scrollY);
      }
      else if (this.currentTable == null) // New datatable
      {
        if (this.radioData != null && this.radioData.length > 0) {
          var columns = Array();
          var col = 0;
          columns.push({
            title: "Show", orderable: false, targets: [col++], data: "show", visible: false
          });
          columns.push({
            title: "&#8470;", className: "dt-right", orderable: false, targets: [col++], data: "bib",
            render: function (data, type) {
              if (type === 'display') {
                if (data < 0) // Relay
                  return "<span class=\"bib\">" + (-data / 100 | 0) + "-" + (-data % 100) + "</span>";
                else if (data > 0)    // Ordinary
                  return "<span class=\"bib\">" + data + "</span>";
                else
                  return "";
              }
              else
                return Math.abs(data);
            }
          });
          columns.push({
            title: "Navn", className: "dt-left", orderable: false, targets: [col++], data: "name",
            render: function (data, type) {
              if (type === 'display') {
                var name = (data.length > _this.maxNameLength ? _this.nameShort(data) : data);
                return name;
              }
              else
                return data;
            }
          });
          columns.push({
            title: "Klubb", className: "dt-left", orderable: false, targets: [col++], data: "club",
            render: function (data, type) {
              if (type === 'display') {
                var club = (data.length > _this.maxClubLength ? _this.clubShort(data) : data);
                return club;
              }
              else
                return data;
            }
          });
          columns.push({
            title: "Klasse", className: "dt-left", orderable: false, targets: [col++], data: "class",
            render: function (data, type, row) {
              var link = "<a href=\"followfull.php?comp=" + _this.competitionId;
              link += "#" + encodeURIComponent(row.class);
              link += "\" target=\"_blank\" style=\"text-decoration: none;\">" + row.class + "</a>";
              return link;
            }
          });
          columns.push({
            title: "Brikke", className: "dt-left", orderable: false, targets: [col++], data: "ecard1",
            render: function (data, type, row) {
              var ecards = "";
              if (row.ecard1 > 0) {
                ecards += row.ecard1;
                if (row.ecard2 > 0) ecards += " / " + row.ecard2;
              }
              else
                if (row.ecard2 > 0) ecards += row.ecard2;
              var name = (Math.abs(row.bib) > 0 ? "(" + Math.abs(row.bib) + ") " : "") + row.name;
              var ecardstr = "<div onclick=\"res.popupCheckedEcard(" + row.dbid + ",'" + name + "','" + ecards + "', " + row.checked + ");\">";
              if (row.checked == 1 || row.status == 9)
                ecardstr += "&#9989; "; // Green checkmark
              else
                ecardstr += "&#11036; "; // Empty checkbox
              ecardstr += ecards + "</div>";
              return ecardstr;
            }
          });
          columns.push({
            title: "Starttid", className: "dt-right", orderable: false, targets: [col++], data: "start",
            render: function (data) {
              return data;
            }
          });
          if (!openStart) {
            columns.push({
              title: "Diff", className: "dt-right", orderable: false, targets: [col++], data: "timeToStart",
              render: function (data) {
                var timeToStartStr = "<span style=\"color:" + (data < 0 ? "black" : "red") + "\">";
                timeToStartStr += (data < 0 ? "-" : "+") + _this.formatTime(Math.abs(data), 0, false);
                timeToStartStr += "<\span>";
                return timeToStartStr;
              }
            });
          }

          var message = "<button onclick=\"res.popupDialog('Generell melding',0,0);\">&#128172;</button>";
          columns.push({
            title: message, className: "dt-left", orderable: false, targets: [col++], data: "start",
            render: function (data, type, row) {
              var defaultDNS = (row.status == 1 ? -1 : row.dbid > 0 ? 1 : 0);
              var name = (Math.abs(row.bib) > 0 ? "(" + Math.abs(row.bib) + ") " : "") + row.name;
              var link = "<button onclick=\"res.popupDialog('" + name + "'," + row.dbid + "," + defaultDNS + ");\">&#128172;</button>";
              return link;
            }
          });

          this.currentTable = $('#' + this.radioPassingsDiv).DataTable({
            fixedHeader: true,
            fixedColumns: {
              leftColumns: 2,
              rightColumns: 2
            },
            scrollX: true,
            paging: false,
            lengthChange: false,
            searching: true,
            info: false,
            data: this.radioData,
            ordering: false,
            columns: columns,
            destroy: true,
            dom: 'lrtip'
          });
        }
      }
      this.filterStartRegistration(openStart);
    };
    this.radioPassingsUpdateTimer = setTimeout(function () { _this.updateStartRegistration(openStart); }, this.radioUpdateInterval);
  };


  // Update start list
  AjaxViewer.prototype.filterStartRegistration = function (openStart) {
    if (this.radioData != null) {
      try {
        var _this = this;
        var dt = new Date();
        var currentTimeZoneOffset = -1 * new Date().getTimezoneOffset();
        var eventZoneOffset = ((dt.dst() ? 2 : 1) + this.eventTimeZoneDiff) * 60;
        var timeZoneDiff = eventZoneOffset - currentTimeZoneOffset;
        var time = dt.getSeconds() + 60 * dt.getMinutes() + 3600 * dt.getHours() + 60 * timeZoneDiff;
        this.updateStartClock(dt);
        var preTime = parseInt($('#preTime')[0].value) * 60;
        var callTime = parseInt($('#callTime')[0].value) * 60;
        var postTime = parseInt($('#postTime')[0].value) * 60;
        var minBib = parseInt($('#minBib')[0].value);
        var maxBib = parseInt($('#maxBib')[0].value);

        var firstUnknown = true;
        var firstOpen = true;
        var firstInCallTime = true;
        var firstInPostTime = true;
        var lastStartTime = -1000;
        var shownId = Array(0);
        var timeBeforeStartMakeSound = 4;
        var startBeep = 0; // 0: no, 1: short, 2: long

        var data = this.radioData;
        // *** Hide or highlight rows ***
        for (var i = 0; i < data.length; i++) {
          var row = this.currentTable.row(i).node();
          data[i].show = 'false';
          $(row).removeClass();

          const showStatus = [1, 9, 10]; // DNS, Started, Entered
          if (data[i].bib < minBib || data[i].bib > maxBib || !showStatus.includes(data[i].status)) {
            continue;
          }

          if (data[i].dbid < 0) {
            data[i].show = 'true';
            shownId.push({ dbid: data[i].dbid });
            if (firstUnknown) {
              $(row).addClass('firstnonqualifier');
              firstUnknown = false;
            }
            $(row).addClass('red_row');
            continue;
          }

          if (openStart) {
            if (data[i].starttime == -999) {
              data[i].show = 'true';
              shownId.push({ dbid: data[i].dbid });
              if (firstOpen) {
                $(row).addClass('firstnonqualifier');
                firstOpen = false;
              }
            }
          }
          else { // Timed start
            var startTimeSeconds = data[i].starttime / 100;
            var timeToStart = startTimeSeconds - time;
            data[i].timeToStart = -timeToStart * 100;

            if (timeToStart == 0)
              startBeep = 2;
            else if (startBeep == 0 && timeToStart > 0 && timeToStart <= timeBeforeStartMakeSound)
              startBeep = 1;

            if (timeToStart <= -postTime)
              continue;
            else if (timeToStart <= 0) {
              data[i].show = 'true';
              shownId.push({ dbid: data[i].dbid });
              $(row).addClass('pre_post_start')
              if (firstInPostTime) {
                $(row).addClass('firststarter');
                firstInPostTime = false;
              }
            }
            else if (timeToStart <= callTime) {
              data[i].show = 'true';
              shownId.push({ dbid: data[i].dbid });
              if (firstInCallTime) {
                $(row).addClass('firststarter yellow_row');
                firstInCallTime = false;
              }
              else if (lastStartTime - startTimeSeconds > 29)
                $(row).addClass('yellow_row_new');
              else
                $(row).addClass('yellow_row');
            }
            else if (timeToStart <= callTime + preTime) {
              data[i].show = 'true';
              shownId.push({ dbid: data[i].dbid });
              $(row).addClass('pre_post_start');
            }
            lastStartTime = startTimeSeconds;
          }
          if (data[i].status == 1 || this.messageBibs.indexOf(data[i].dbid) > -1)
            $(row).addClass('dns');
        }
        this.currentTable.rows().invalidate();
        this.currentTable.column(0).search('true').draw();

        this.animateTable(_this.prewShownId, shownId, _this.animTime);
        this.prewShownId = shownId;
        if (startBeep > 0 && !this.audioMute)
          window.makeStartBeep(startBeep == 2); // 2 : long beep

        var dt = new Date();
        var ms = dt.getMilliseconds();
        var timer = (ms > 800 ? 2000 - ms : 1000 - ms);
        this.updateStartRegistrationTimer = setTimeout(function () { _this.filterStartRegistration(openStart); }, timer);
      }
      catch { }
    }
  }


  // Request data for start list
  AjaxViewer.prototype.updateStartList = function () {
    var _this = this;
    if (true) {
      $.ajax({
        url: this.apiURL,
        data: "comp=" + this.competitionId + "&method=getrunners",
        success: function (data) {
          _this.handleUpdateStartList(data);
        },
        error: function () { },
        dataType: "json"
      });
    }
  };


  // Handle response for updating start list
  AjaxViewer.prototype.handleUpdateStartList = function (data) {
    var _this = this;
    // Insert data from query
    if (data != null && data.status == "OK" && data.runners != null) {
      if (data.runners.length == 0) return;
      var columns = Array();
      var col = 0;
      columns.push({
        title: "St.no", visible: false, className: "dt-right", orderable: false, targets: [col++], data: "bib",
        render: function (data) {
          return Math.abs(data);
        }
      });
      columns.push({
        title: "St.no", className: "dt-right", orderable: false, targets: [col++], data: "bib",
        render: function (data, type, row) {
          if (type === 'display') {
            var res;
            if (data < 0) // Relay
              res = (-data / 100 | 0) + "-" + (-data % 100);
            else if (data > 0)    // Ordinary
              res = data;
            else
              res = "";
            if (row.status == 1) // DNS
              return ("<del>" + res + "</del>");
            else
              return res;
          }
          else
            return Math.abs(data);
        }
      });
      columns.push({
        title: "Navn", className: "dt-left", orderable: false, targets: [col++], data: "name",
        render: function (data, type, row) {
          if (type === 'display') {
            var res;
            if (data.length > _this.maxNameLength)
              res = _this.nameShort(data);
            else
              res = data;
            if (row.status == 1) // DNS
              return ("<del>" + res + "</del>");
            else
              return res;
          }
          else
            return data;
        }
      });
      columns.push({
        title: "Klubb", className: "dt-left", orderable: false, targets: [col++], data: "club",
        render: function (data, type, row) {
          if (type === 'display') {
            var res;
            if (data.length > _this.maxClubLength)
              res = _this.clubShort(data);
            else
              res = data;
            if (row.status == 1) // DNS
              return ("<del>" + res + "</del>");
            else
              return res;
          }
          else
            return data;
        }
      });
      columns.push({
        title: "Klasse", className: "dt-left", orderable: false, targets: [col++], data: "class",
        render: function (data, type, row) {
          var link = "<a href=\"followfull.php?comp=" + _this.competitionId + "#" + encodeURIComponent(row.class);
          link += "\" target=\"_blank\" style=\"text-decoration: none;\">" + row.class + "</a>";
          if (row.status == 1) // DNS
            return ("<del>" + link + "</del>");
          else
            return link;
        }
      });

      columns.push({
        title: "Starttid", className: "dt-right", orderable: false, targets: [col++], data: "start",
        render: function (data, type, row) {
          if (type === 'display') {
            if (row.status == 1) // DNS
              return ("<del>" + data + "</del>");
            else
              return data;
          }
          else
            return data;
        }
      });

      columns.push({
        title: "Brikke#1", className: "dt-center", orderable: false, targets: [col++], data: "ecard1",
        render: function (data, type, row) {
          var bibStr = (row.bib == 0 ? "" : "(" + (row.bib < 0 ? (-row.bib / 100 | 0) + "-" + (-row.bib % 100) : row.bib) + ") ");
          var ecardStr = (row.ecard1 == 0 ? "-" : row.ecard1);
          var runnerName = bibStr + row.name;
          var link = "<button style=\"width:50px\" onclick=\"res.popupDialog('" + runnerName + ". Endre brikke 1 fra "
            + ecardStr + " til '," + row.dbid + ",0,1);\">" + ecardStr + "</button>";
          return link;
        }
      });
      columns.push({
        title: "Brikke#2", className: "dt-center", orderable: false, targets: [col++], data: "ecard2",
        render: function (data, type, row) {
          var bibStr = (row.bib == 0 ? "" : "(" + (row.bib < 0 ? (-row.bib / 100 | 0) + "-" + (-row.bib % 100) : row.bib) + ") ");
          var ecardStr = (row.ecard2 == 0 ? "-" : row.ecard2);
          var runnerName = bibStr + row.name;
          var link = "<button style=\"width:50px\" onclick=\"res.popupDialog('" + runnerName + ". Endre brikke 2 fra "
            + ecardStr + " til '," + row.dbid + ",0,1);\">" + ecardStr + "</button>";
          return link;
        }
      });

      this.currentTable = $('#startList').DataTable({
        fixedHeader: true,
        paging: false,
        lengthChange: false,
        searching: true,
        info: false,
        data: data.runners,
        order: [[0, "asc"]],
        columnDefs: columns,
        destroy: true,
        dom: 'lrtip',
        orderCellsTop: true
      });
    }
  };


  AjaxViewer.prototype.startSorter = function (a, b) {
    var diffStart = b.starttime - a.starttime;
    if (a.dbid < 0 && b.dbid > 0)
      return -1;
    else if (a.dbid > 0 && b.dbid < 0)
      return 1;
    else if (diffStart != 0)
      return diffStart;
    else if (a.starttime == -999)
      return a.bib - b.bib;
    else
      return b.bib - a.bib;
  }


  AjaxViewer.prototype.updateStartClock = function (dt) {
    var currTime = new Date(Math.round(dt.getTime() / 1000) * 1000);
    var timeID = document.getElementById("time");
    var HTMLstringCur = currTime.toLocaleTimeString('en-GB');
    timeID.innerHTML = HTMLstringCur;

    var callTime = document.getElementById("callTime").value;
    var callClockID = document.getElementById("callClock");
    if (callClockID != null) {
      var preTime = new Date(currTime.valueOf() + callTime * 60 * 1000);
      var HTMLstringPre = preTime.toLocaleTimeString('en-GB');
      callClockID.innerHTML = HTMLstringPre;
    }
  }


  // Popup window for setting ecard to checked
  AjaxViewer.prototype.popupCheckedEcard = function (dbid, name, ecards, checked) {
    var _this = this;
    var message = (checked ? "Ta bort markering for " + name + "?" :
      "Bekrefte: " + name + (ecards.length > 0 ? ", brikke " + ecards : "") + "?");
    $('<p>' + message + '</p>').confirm(function (e) {
      if (e.response) {
        var url = _this.messageURL + "?method=" + (checked ? "setecardnotchecked" :
          "setecardchecked");
        $.ajax({
          url: url,
          data: "&comp=" + _this.competitionId + "&dbid=" + dbid,
          error: function () { alert("Meldingen kunne ikke sendes. Ikke nett?"); }
        });
      }
    });
  }


  //Popup window for messages to message center
  AjaxViewer.prototype.popupDialog = function (promptText, dbid, defaultDNS, startListChange = -1) {
    var _this = this;
    var defaultText = "";
    if (defaultDNS == 1)
      defaultText = "ikke startet";
    else if (defaultDNS == -1)
      defaultText = "startet";
    else if (dbid < 0)
      defaultText = "startnummer:";
    $('<p>' + promptText + '</p>').prompt(function (e) {
      var message = e.response;
      if (message != null && message != "") {
        message = message.substring(0, 250); // limit number of characters
        var DNS = (message == "ikke startet" ? 1 : 0);
        var ecardChange = (dbid < 0 && message.match(/\d+/g) != null);
        if (_this.Time4oServer)
          message += ": " + promptText;
        var sendOK = true;
        if (startListChange > 0) {
          var senderName = prompt("Innsenders navn og mobilnummer");
          if (senderName == null || senderName == "") {
            alert("Innsender må registreres!");
            sendOK = false;
          }
          else {
            message = senderName + " registrerte: " + promptText + message;
            alert("Ønsket endring av brikkenummer er registrert\n" + message);
          }
        }
        if (sendOK)
          $.ajax({
            url: _this.messageURL + "?method=sendmessage",
            data: "comp=" + _this.competitionId + "&dbid=" + dbid + "&message=" + message + "&dns=" + DNS + "&ecardchange=" + ecardChange,
            error: function () { alert("Meldingen kunne ikke sendes. Ikke nett?"); }
          });
        if (DNS)
          _this.messageBibs.push(dbid);
      }
    }, defaultText);
  };

})(LiveResults || (LiveResults = {}));