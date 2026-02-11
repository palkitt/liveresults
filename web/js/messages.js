var Messages;
(function (Messages) {
  // ReSharper disable once InconsistentNaming
  Messages.Instance = null;
  var AjaxViewer = /** @class */ (function () {
    function AjaxViewer(local, competitionId, time4oid) {
      this.local = local;
      this.competitionId = competitionId;
      this.time4oid = time4oid;
      this.Time4oServer = time4oid.length > 0;
      this.compName = "";
      this.compDate = "";
      this.messagesUpdateInterval = 5000;
      this.messagesUpdateTimer = null;
      this.lastMessagesUpdateHash = "";
      this.runnerListUpdateInterval = 60000;
      this.runnerListTimer = null;
      this.lastRunnerListHash = "";
      this.lastClassListHash = "";
      this.runnerStatus = [];
      this.currentTable = null;
      this.messagesData = null;
      this.runnerList = null;
      this.activeClasses = null;
      this.showAllMessages = true;
      this.timeOrdered = false;
      this.audioMute = true;
      this.lastNumberOfMessages = null;
      this.browserType = this.isMobile(); // 1:Mobile, 2:iPad, 3:PC and other
      this.maxNameLength = (this.browserType == 1 ? 15 : (this.browserType == 2 ? 22 : 30));
      this.maxClubLength = (this.browserType == 1 ? 12 : (this.browserType == 2 ? 15 : 20));
      this.URL = (this.local ? "api/messageapi.php" : "//api.liveres.live/messageapi.php");
      Messages.Instance = this;
    }

    //Request data for messages
    AjaxViewer.prototype.updateMessages = function (refresh = false) {
      clearTimeout(this.messagesUpdateTimer);
      var _this = this;
      var hash = (refresh ? (Math.floor(Math.random() * 10000) + 1) : this.lastMessagesUpdateHash);
      $.ajax({
        url: this.URL,
        data: "comp=" + this.competitionId + "&method=getmessages&last_hash=" + hash,
        success: function (data, status, resp) {
          var reqTime = new Date();
          reqTime.setTime(new Date(resp.getResponseHeader("expires")).getTime() - _this.messagesUpdateInterval + 1000);
          _this.handleUpdateMessages(data, reqTime);
        },
        error: function () {
          _this.messagesUpdateTimer = setTimeout(function () { _this.updateMessages(); }, _this.messagesUpdateInterval);
        },
        dataType: "json"
      });
    };

    //Handle response for updating the last radio passings..
    AjaxViewer.prototype.handleUpdateMessages = function (data, reqTime) {
      $('#lastupdate').html(new Date(reqTime).toLocaleTimeString());
      var _this = this;
      if (data.rt != undefined && data.rt > 0)
        this.messagesUpdateInterval = data.rt * 1000;
      $('#updateinterval').html(this.messagesUpdateInterval / 1000);

      // Make live blinker pulsing
      if (data.active && !$('#liveIndicator').find('span').hasClass('liveClient'))
        $('#liveIndicator').html('<span class="liveClient" id="liveIndicator">◉</span>');
      if (!data.active && !$('#liveIndicator').find('span').hasClass('notLiveClient'))
        $('#liveIndicator').html('<span class="notLiveClient" id="liveIndicator">◉</span>');

      // Insert data from query
      if (data != null && data.status == "OK" && data.messages != null) {

        // Make list of group times for each bib
        var groupTimes = new Object();
        for (var i = 0; i < data.messages.length; i++) {
          if (this.Time4oServer) {
            var msg = data.messages[i];
            var runner = this.runnerList ? this.runnerList.get(String(msg.dbid)) : null;
            var runnerInfo = runner ?? {};
            msg.bib = runnerInfo.bib ?? 0;
            msg.name = runnerInfo.name ?? "";
            msg.club = runnerInfo.club ?? "";
            msg.class = runnerInfo.class ?? "";
            msg.ecard1 = runnerInfo.ecard1 ?? 0;
            msg.ecard2 = runnerInfo.ecard2 ?? 0;
            msg.start = runnerInfo.start ?? 0;
            msg.status = runnerInfo.status ?? 0;
          }
          var bib = Math.abs(data.messages[i].bib);
          if (groupTimes[bib] != undefined) continue
          groupTimes[bib] = data.messages[i].groupchanged;
        }
        // Insert group time for messages with bib number
        for (var i = 0; i < data.messages.length; i++) {
          var message = (data.messages[i].message).replace('startnummer:', '');
          var bibMessage = parseInt(message);
          if (groupTimes[bibMessage] != undefined)
            data.messages[i].groupchanged = groupTimes[bibMessage];
        }

        this.messagesData = data.messages;
        this.lastMessagesUpdateHash = data.hash;

        if (this.lastNumberOfMessages == null)
          this.lastNumberOfMessages = this.messagesData.length;
        else if (this.messagesData.length > this.lastNumberOfMessages) {
          this.lastNumberOfMessages = this.messagesData.length;
          if (!this.audioMute)
            window.playNotification();
        }

        // Existing datatable
        if (this.currentTable != null) {
          this.currentTable.clear();
          this.currentTable.rows.add(this.messagesData).draw();
          this.filterTable();
        }

        // New datatable
        else if (this.messagesData.length > 0) {
          var columns = Array();
          var col = 0;

          columns.push({
            title: "GroupTime", visible: false, className: "dt-left", orderable: true, targets: [col++], data: "groupchanged",
            "render": function (data) {
              return data;
            }
          });
          columns.push({
            title: "Time", visible: false, className: "dt-left", orderable: true, targets: [col++], data: "changed",
            "render": function (data) {
              return data;
            }
          });
          columns.push({
            title: "MessId", visible: false, className: "dt-left", orderable: true, targets: [col++], data: "messid",
            "render": function (data) {
              return data;
            }
          });

          columns.push({
            title: "&#8470;",
            className: "dt-left",
            orderable: false,
            targets: [col++], data: "bib",
            "render": function (data, type) {
              if (type === 'display') {
                if (data < 0) // Relay
                  return (-data / 100 | 0) + "-" + (-data % 100);
                else if (data > 0)    // Ordinary
                  return data;
                else
                  return "";
              }
              else
                return Math.abs(data);
            }
          });

          columns.push({
            title: "Navn",
            className: "dt-left",
            orderable: false,
            targets: [col++],
            data: "name",
            "render": function (data, type, row) {
              if (type === 'display') {
                var ret = "";
                if (data.length > _this.maxNameLength)
                  ret += _this.nameShort(data);
                else
                  ret += data;
                return "<div class=\"wrapok\"><a href=\"javascript:;\" onclick=\"mess.popupDialog('" + row.name + "'," + row.dbid + ")\">" + ret + "</a></div>";
              }
              else
                return data;
            }
          });
          columns.push({
            title: "Klubb",
            className: "dt-left",
            orderable: false,
            targets: [col++],
            data: "club",
            "render": function (data, type) {
              if (type === 'display') {
                if (data.length > _this.maxClubLength)
                  return _this.clubShort(data);
                else
                  return data;
              }
              else
                return data;
            }
          });
          columns.push({
            title: "Klasse",
            className: "dt-left",
            orderable: false,
            targets: [col++],
            data: "class"
          });

          columns.push({
            title: "Brikke",
            className: "dt-left",
            orderable: false,
            targets: [col++],
            data: "ecard1",
            "render": function (data, type, row) {
              var ecardstr = "";
              if (row.ecard1 > 0) {
                ecardstr = row.ecard1;
                if (row.ecard2 > 0)
                  ecardstr += " / " + row.ecard2;
              }
              else if (row.ecard2 > 0)
                ecardstr = row.ecard2;
              return "<div class=\"wrapok\">" + ecardstr + "</div>";
            }
          });

          columns.push({
            title: "Start",
            className: "dt-left",
            orderable: false,
            targets: [col++],
            data: "start",
            "render": function (data) {
              if (typeof data === 'string')
                return data;
              else
                return _this.formatTime(data, 0, false, true, true, true, true)
            }
          });

          columns.push({
            title: "Status",
            className: "dt-left",
            orderable: false,
            targets: [col++],
            data: "status",
            "render": function (data, type, row) {
              if (row.dbid <= 0)
                return ""
              else if (data == 9)
                return "startet";
              else if (data == 10)
                return "påmeldt";
              else
                return _this.runnerStatus[data];
            }
          });

          columns.push({
            title: "Tidsp.",
            className: "dt-left",
            orderable: false,
            targets: [col++],
            data: "changed",
            "render": function (data, type) {
              if (type === 'display')
                return "<div class=\"tooltip\">" + data.substring(11, 19) + "<span class=\"tooltiptext\">" + data.substring(2, 10) + "</span></div>";
              else
                return data;
            }
          });

          var messageTitle = "Melding <a href=\"javascript:;\" onclick=\"mess.popupDialog('Generell melding',0)\">(generell)</a>";
          columns.push({
            title: messageTitle,
            className: "dt-left",
            orderable: false,
            targets: [col++],
            data: "message",
            "render": function (data, type, row) {
              try {
                var jsonData = JSON.parse(data);
                var star = (jsonData.rent != undefined && jsonData.rent == 1 ? "*" : "");
                return `Påmelding: ${jsonData.firstName} ${jsonData.lastName}, ${jsonData.club}, ${jsonData.ecardNumber}${star}, ${jsonData.className}, ID:${row.dbid}, Melding: ${jsonData.comment}`;
              } catch {
                return "<div class=\"wrapok\">" + data + "</div>";
              }
            }
          });

          columns.push({
            title: "Utført",
            className: "dt-center",
            orderable: false,
            targets: [col++],
            data: "completed",
            "render": function (data, type, row) {
              if (data == 1)
                return '<input type="checkbox" onclick="mess.setMessageCompleted(' + row.messid + ',0);" checked>';
              else
                return '<input type="checkbox" onclick="mess.setMessageCompleted(' + row.messid + ',1);">';
            }
          });

          this.currentTable = $('#divMessages').DataTable({
            fixedHeader: true,
            paging: false,
            lengthChange: false,
            filter: true,
            dom: 'lrtip',
            ordering: true,
            info: false,
            autoWidth: false,
            data: this.messagesData,
            order: [[0, "desc"], [1, "desc"], [2, "desc"]],
            columns: columns,
            destroy: true,
            orderCellsTop: true
          });
        };
        this.updateMessageMarking();
      };
      if (this.isCompToday())
        this.messagesUpdateTimer = setTimeout(function () { _this.updateMessages(); }, this.messagesUpdateInterval);
    };

    // Update markings and visibility
    AjaxViewer.prototype.updateMessageMarking = function () {
      if (this.currentTable != null) {
        _this = this;
        var table = this.currentTable;
        var lastID = null;
        var lastChanged = null;

        if (this.timeOrdered)
          table.order([1, 'desc']).draw();
        else
          table.order([0, 'desc'], [1, 'desc'], [2, 'desc']).draw();

        table.rows().every(function (rowIdx) {
          var data = this.data();
          if (data.completed) {
            $(table.cell(rowIdx, 10).node()).addClass('green_cell');
            $(table.cell(rowIdx, 11).node()).addClass('green_cell');
          }
          else {
            $(table.cell(rowIdx, 10).node()).addClass('yellow_cell');
            $(table.cell(rowIdx, 11).node()).addClass('yellow_cell');
          }

          if (!_this.showAllMessages && data.groupcompleted)
            $(table.row(rowIdx).node()).hide();
          else
            $(table.row(rowIdx).node()).show();

          //if (data.dbid != lastID && Math.abs(data.dbid) != lastEcard1 && Math.abs(data.dbid) != lastEcard2 && data.groupchanged != lastChanged)
          if (data.groupchanged != lastChanged && data.dbid != lastID)
            $(table.row(rowIdx).node()).addClass('firstnonqualifier');
          else
            $(table.row(rowIdx).node()).removeClass('firstnonqualifier');
          lastID = data.dbid;
          lastChanged = data.groupchanged;
        });
      };
    }

    // Set message completed status
    AjaxViewer.prototype.setMessageCompleted = function (messid, completed) {
      _this = this;
      $.ajax({
        url: this.URL + "?method=setcompleted",
        data: "&messid=" + messid + "&completed=" + completed,
        success: function () { _this.updateMessages(true); }
      });
    }

    // Set message DNS status
    AjaxViewer.prototype.setMessageDNS = function (messid, dns) {
      var _this = this;
      $.ajax({
        url: _this.URL + "?method=setdns",
        data: "&messid=" + messid + "&dns=" + dns,
        success: function () { _this.updateMessages(); }
      });
    }

    // Filter rows in table
    AjaxViewer.prototype.filterTable = function () {
      var table = this.currentTable;
      table.search($('#filterText')[0].value).draw()
    };

    //Popup window for messages to message center
    AjaxViewer.prototype.popupDialog = function (promptText, dbid) {
      var defaultText = "";
      var message = prompt(promptText, defaultText);
      if (message != null && message != "") {
        message = message.substring(0, 250);
        $.ajax({
          url: this.URL + "?method=sendmessage",
          data: "&comp=" + this.competitionId + "&dbid=" + dbid + "&message=" + message
        }
        );
        this.updateMessages();
      }
    };


    AjaxViewer.prototype.updateClassList = function () {
      var _this = this;
      clearTimeout(this.classUpdateTimer);
      const URLextra = "race/" + this.time4oid + "/raceClass";
      const headers = this.lastClassListHash ? { 'If-None-Match': this.lastClassListHash } : {};
      const apiURL = "https://center.time4o.com/api/v1/";
      $.ajax({
        url: apiURL + URLextra,
        headers: headers,
        success: function (data, status, resp) {
          if (resp.status == 200) {
            _this.lastClassListHash = resp.getResponseHeader("etag").slice(1, -1);
            data.status = "OK";
          }
          else
            data = { status: "NOT MODIFIED" };
          _this.handleUpdateClassListResponse(data);
        },
        error: function () {
          _this.runnerListTimer = setTimeout(function () { _this.updateClassList(); }, _this.runnerListUpdateInterval);
        },
        dataType: "json"
      });
    };


    AjaxViewer.prototype.handleUpdateClassListResponse = function (data) {
      if (data != null && data.status == "OK") {
        data = this.Time4oClassesToLiveres(data);
        this.activeClasses = data.classes;
      }
      this.updateRunnerList();
    };


    // Update list of runners from time4o server
    AjaxViewer.prototype.updateRunnerList = function () {
      var _this = this;
      const URLextra = "race/" + this.time4oid + "/entry";
      const headers = this.lastRunnerListHash ? { 'If-None-Match': this.lastRunnerListHash } : {};
      const apiURL = "https://center.time4o.com/api/v1/";
      $.ajax({
        url: apiURL + URLextra,
        headers: headers,
        dataType: "json",
        success: function (data, status, resp) {
          if (resp.status == 200) {
            _this.lastRunnerListHash = resp.getResponseHeader("etag").slice(1, -1);
            data.status = "OK";
          }
          else
            data = { status: "NOT MODIFIED" };

          _this.handleUpdateRunnerListResponse(data);
        },
        error: function () {
          _this.runnerListTimer = setTimeout(function () { _this.updateClassList(); }, _this.runnerListUpdateInterval);
        }
      });
    };


    AjaxViewer.prototype.handleUpdateRunnerListResponse = function (time4odata) {
      var _this = this;
      if (time4odata != null && time4odata.status == "OK") {
        let data = this.Time4oEntryListToLiveres(time4odata, this.activeClasses);
        // Build a fast lookup for runner info (can be null early during startup)
        if (this.Time4oServer && Array.isArray(data.runners)) {
          this.runnerList = new Map();
          for (var j = 0; j < data.runners.length; j++) {
            var runner = data.runners[j];
            if (runner && runner.dbid != null)
              this.runnerList.set(String(runner.dbid), runner);
          }
        }
      }
      this.runnerListTimer = setTimeout(function () { _this.updateClassList(); }, _this.runnerListUpdateInterval);
    }


    // ReSharper disable once InconsistentNaming
    AjaxViewer.VERSION = "2016-08-06-01";
    return AjaxViewer;
  }());

  Messages.AjaxViewer = AjaxViewer;
})(Messages || (Messages = {}));



