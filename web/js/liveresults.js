var LiveResults;
(function (LiveResults) {
  // ReSharper disable once InconsistentNaming
  LiveResults.Instance = null;
  var AjaxViewer = /** @class */ (function () {
    function AjaxViewer(competitionId, language, classesDiv, lastPassingsDiv, resultsHeaderDiv, resultsControlsDiv, resultsDiv, txtResetSorting,
      resources, isMultiDayEvent, isSingleClass, setAutomaticUpdateText, setCompactViewText, runnerStatus, showTenthOfSecond, radioPassingsDiv,
      EmmaServer, Time4oServer, filterDiv = null, fixedTable = false) {
      var _this = this;
      this.local = true;
      this.competitionId = competitionId;
      this.LiveloxID = 0;
      this.language = language;
      this.classesDiv = classesDiv;
      this.lastPassingsDiv = lastPassingsDiv;
      this.resultsHeaderDiv = resultsHeaderDiv;
      this.resultsControlsDiv = resultsControlsDiv;
      this.resultsDiv = resultsDiv;
      this.radioPassingsDiv = radioPassingsDiv;
      this.txtResetSorting = txtResetSorting;
      this.resources = resources;
      this.isMultiDayEvent = isMultiDayEvent;
      this.isSingleClass = isSingleClass;
      this.setAutomaticUpdateText = setAutomaticUpdateText;
      this.setCompactViewText = setCompactViewText;
      this.runnerStatus = runnerStatus;
      this.EmmaServer = EmmaServer;
      this.Time4oServer = Time4oServer;
      this.fixedTable = fixedTable;
      this.updateAutomatically = true;
      this.autoUpdateLastPassings = true;
      this.compactView = true;
      this.showEcardTimes = false;
      this.showTimesInSprint = false;
      this.showCourseResults = false;
      this.showTenthOfSecond = false;
      this.lastChanged = 0;
      this.clubUpdateInterval = 20000;
      this.classUpdateInterval = 60000;
      this.inactiveTimeout = 30 * 60;
      this.inactiveTimer = 0;
      this.radioHighTime = 15;
      this.highTime = 60;
      this.animTime = 700;
      this.animating = false;
      this.numAnimElements = 0;
      this.startBeepActive = false;
      this.audioMute = true;
      this.classUpdateTimer = null;
      this.passingsUpdateTimer = null;
      this.radioPassingsUpdateTimer = null;
      this.runnerListTimer = null;
      this.resUpdateTimeout = null;
      this.updatePredictedTimeTimer = null;
      this.updateStartRegistrationTimer = null;
      this.lastClassListHash = "";
      this.lastRunnerListHash = "";
      this.lastPassingsUpdateHash = "";
      this.lastRadioPassingsUpdateHash = "";
      this.curClassName = null;
      this.curClubName = null;
      this.curSplitView = null;
      this.curRelayView = null;
      this.lastClassHash = "";
      this.curClassNumberOfRunners = 0;
      this.curClassSplits = null;
      this.curClassSplitsBests = null;
      this.curClassSplitsOK = null;
      this.curClassIsMassStart = false;
      this.curClassIsRelay = false;
      this.curClassIsLapTimes = false;
      this.curClassIsCourse = false;
      this.curClassNumSplits = false;
      this.curClassIsUnranked = false;
      this.curClassHasBibs = false;
      this.curClubSplits = null;
      this.highlightID = null;
      this.lastClubHash = "";
      this.currentTable = null;
      this.serverTimeDiff = 0;
      this.eventTimeZoneDiff = 0;
      this.radioData = null;
      this.compName = "";
      this.compDate = "";
      this.qualLimits = null;
      this.qualClasses = null;
      this.messageBibs = [];
      this.noSplits = false;
      this.filterDiv = filterDiv;
      this.prewShownId = Array(0);
      this.predData = Array(0);
      this.rankedStartlist = true;
      this.relayClasses = [];
      this.courses = {};
      this.courseNames = {};
      this.activeClasses = null;
      this.runnerList = null;
      this.speakerView = false;
      this.shortSprint = false;
      this.browserType = this.isMobile(); // 1:Mobile, 2:iPad, 3:PC and other
      this.maxNameLength = (this.browserType == 1 ? 15 : (this.browserType == 2 ? 22 : 30));
      this.maxClubLength = (this.browserType == 1 ? 12 : (this.browserType == 2 ? 15 : 20));
      this.restartTimeOffset = 100 * 3600 * 100; // 100 hours added to time for restarted runners

      if (Time4oServer) {
        this.updateInterval = 3000;
        this.radioUpdateInterval = 15000;
        this.apiURL = "https://center.time4o.com/api/v1/";
        this.radioURL = "https://center.time4o.com/api/v1/"
        this.messageURL = "//api.liveres.live/messageapi.php";
      }
      else if (EmmaServer) {
        this.updateInterval = 15000;
        this.radioUpdateInterval = 5000;
        this.apiURL = "https://liveresultat.orientering.se/api.php";
        this.radioURL = "";
        this.messageURL = "";
      }
      else if (this.local) {
        this.updateInterval = 2000;
        this.radioUpdateInterval = 2000;
        this.apiURL = "api/api.php";
        this.radioURL = "api/radioapi.php";
        this.messageURL = "api/messageapi.php";
      }
      else { // LiveRes
        this.updateInterval = 5000;
        this.radioUpdateInterval = 5000;
        this.apiURL = "//api.liveres.live/api.php";
        this.radioURL = "//api.liveres.live/radioapi.php";
        this.messageURL = "//api.liveres.live/messageapi.php";
      }
      LiveResults.Instance = this;

      $(document).ready(function () {
        _this.onload();
      });

      $(window).on('hashchange', function () {
        _this.onload();
      });
    }

    AjaxViewer.prototype.onload = function () {
      var _this = this;
      if (window.location.hash) {
        var hash = window.location.hash.substring(1);
        var cl;
        if (hash.indexOf('club::') >= 0) {
          cl = decodeURIComponent(hash.substring(6));
          if (cl != _this.curClubName) {
            var delay = (_this.Time4oServer ? 500 : 100);
            setTimeout(function () { _this.viewClubResults(cl); }, delay);
          }
        }
        else if (hash.indexOf('splits::') >= 0 && hash.indexOf('::course::') >= 0) {
          var coind = hash.indexOf('::course::');
          cl = decodeURIComponent(hash.substring(8, coind));
          var co = hash.substring(coind + 10);
          if (_this.curSplitView == null || cl != _this.curSplitView[0] || co != _this.curSplitView[1])
            LiveResults.Instance.viewSplitTimeResults(cl, co);
        }
        else if (hash.indexOf('relay::') >= 0) {
          cl = decodeURIComponent(hash.substring(7));
          if (cl != _this.curRelayView) {
            var delay = (_this.Time4oServer ? 500 : 100);
            setTimeout(function () { _this.viewRelayResults(cl); }, delay);
          }
        }
        else {
          cl = decodeURIComponent(hash);
          if (cl != _this.curClassName) {
            var delay = (_this.Time4oServer ? 500 : 100);
            setTimeout(function () { _this.chooseClass(cl); }, delay);
          }
        }
      }
    }

    AjaxViewer.prototype.startPredictedTimeTimer = function () {
      var _this = this;
      let dt = new Date();
      let ms = dt.getMilliseconds();
      let timer = (ms > 950 ? 2000 - ms : 1000 - ms);
      this.updatePredictedTimeTimer = setTimeout(function () { _this.updatePredictedTimes(); }, timer);
      return;
    };

    // Function to detect if comp date is today or max 6 hours into next day
    AjaxViewer.prototype.isCompToday = function () {
      var now = new Date();
      var compDay = new Date(this.compDate);
      var dDays = (now - compDay) / 1000 / 86400;
      return (dDays > 0 && dDays < 1.25 || this.compDate == "" || this.local)
    };

    //Detect if the browser is a mobile phone or iPad: 1 = mobile, 2 = iPad, 0 = PC/other
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

    // Update list of runners
    AjaxViewer.prototype.updateRunnerList = function () {
      var _this = this;
      if (this.updateAutomatically) {
        $.ajax({
          url: this.apiURL,
          data: "comp=" + this.competitionId + "&method=getrunners&last_hash=" + this.lastRunnerListHash,
          success: function (data) {
            _this.handleUpdateRunnerListResponse(data);
          },
          error: function () {
            _this.runnerListTimer = setTimeout(function () { _this.updateRunnerList(); }, _this.classUpdateInterval);
          },
          dataType: "json"
        });
      }
    };

    AjaxViewer.prototype.handleUpdateRunnerListResponse = function (data) {
      var _this = this;
      if (data != null && data.status == "OK") {
        this.runnerList = data;
        this.lastRunnerListHash = data.hash;
      }
      this.runnerListTimer = setTimeout(function () { _this.updateRunnerList(); }, this.classUpdateInterval);
    }

    // Update the classlist
    AjaxViewer.prototype.updateClassList = function (first = false) {
      if (!this.updateAutomatically)
        return
      var _this = this;
      this.inactiveTimer += this.classUpdateInterval / 1000;
      var URLextra, headers;
      if (this.Time4oServer) {
        URLextra = "race/" + this.competitionId + "/raceClass";
        headers = this.lastClassListHash ? { 'If-None-Match': this.lastClassListHash } : {};
      }
      else {
        URLextra = "?comp=" + this.competitionId + "&method=getclasses&last_hash=" + this.lastClassListHash;
        headers = {};
      }
      $.ajax({
        url: this.apiURL + URLextra,
        headers: headers,
        success: function (data, status, resp) {
          if (_this.Time4oServer) {
            if (resp.status == 200) {
              _this.lastClassListHash = resp.getResponseHeader("etag").slice(1, -1);
              data.status = "OK";
            }
            else if (resp.status == 304) {
              data = { status: "NOT MODIFIED", lastchanged: false };
            }
            data.rt = _this.classUpdateInterval / 1000;
          }
          _this.handleUpdateClassListResponse(data, first);
        },
        error: function () {
          _this.classUpdateTimer = setTimeout(function () { _this.updateClassList(first); }, _this.classUpdateInterval);
        },
        dataType: "json"
      });

    };

    AjaxViewer.prototype.handleUpdateClassListResponse = function (data, first) {
      var _this = this;
      if (data.rt != undefined && data.rt > 0)
        this.classUpdateInterval = data.rt * 1000;
      if (data != null && data.status == "OK") {

        if (this.Time4oServer) {
          data = this.Time4oClassesToLiveres(data);
          this.activeClasses = data.classes;
        }
        else
          this.lastClassListHash = data.hash;

        this.courseNames = data.courses;
        $('#divInfoText').html(data.infotext);
        if (!data.classes || !$.isArray(data.classes) || data.classes.length == 0)
          $('#resultsHeader').html("<b>" + this.resources["_NOCLASSESYET"] + "</b>");
        if (data.classes != null) {
          data.classes = this.sortClasses(data.classes);
          this.courses = {};
          this.relayClasses = [];
          var classes = data.classes;
          var str = "";
          var nClass = classes.length;
          var relayNext = false;
          var leg = 0;
          var sprintNext = false;
          var shiftHeat = false;
          var elitLast = false;

          for (var i = 0; i < nClass; i++) {
            var className = classes[i].className;
            this.courses[className] = (classes[i].courses != undefined ? classes[i].courses : []);
            var relay = relayNext;
            var sprint = sprintNext;
            var classNameURL = className.replace('\'', '\\\'');
            if (className && className.length > 0) {
              className = this.shortClassName(className);
              var classNameClean = className.replace(/-[0-9]{1,2}$/, '');
              classNameClean = classNameClean.replace(/-All$/, '');
              var LegNoStr = className.match(/-[0-9]{1,2}$/);
              var LegNo = parseInt((LegNoStr != null ? -LegNoStr[0] : 0), 10);
              var classNameCleanNext = "";
              var LegNoNext = 0;

              if (i < (nClass - 1)) { // Relay
                classNameCleanNext = this.shortClassName(classes[i + 1].className);
                classNameCleanNext = classNameCleanNext.replace(/-[0-9]{1,2}$/, '');
                LegNoStr = classes[i + 1].className.match(/-[0-9]{1,2}$/);
                LegNoNext = parseInt((LegNoStr != null ? -LegNoStr[0] : 0), 10);
              }

              if (classNameClean == classNameCleanNext && LegNoNext == LegNo + 1) // Relay trigger
              {
                if (!relay) // First class in relay  
                {
                  if (this.EmmaServer)
                    str += "<b> " + classNameClean + "</b><br>&nbsp;";
                  else {
                    {
                      if (this.Time4oServer)
                        var classNameLink = classNameURL;
                      else
                        var classNameLink = classNameURL.replace(/-[0-9]{1,2}$/, '')
                    }
                    str += "<a href=\"javascript:LiveResults.Instance.viewRelayResults('" + classNameLink + "')\" style=\"text-decoration: none\"><b> " + classNameClean + "</b></a><br>&nbsp;";
                  }
                  leg = 0;
                }
                relay = true;
                relayNext = true;
              }
              else {
                relayNext = false;
                // Sprint
                if (classNameURL.includes('| Prolog') || classNameURL.includes('| Kvart') || classNameURL.includes('| Semi') || classNameURL.includes('| Finale')) {
                  var classNameCleanSprint = classNameURL.replace(' | ', '');
                  classNameCleanSprint = classNameCleanSprint.replace('Prolog', '');
                  classNameCleanSprint = classNameCleanSprint.replace(/Kvart \d+/, '');
                  classNameCleanSprint = classNameCleanSprint.replace(/Semi \d+/, '');
                  classNameCleanSprint = classNameCleanSprint.replace(/Finale \d+/, '');

                  var classNameCleanSprintNext = "";
                  if (i < (nClass - 1)) {
                    classNameCleanSprintNext = classes[i + 1].className.replace('\'', '\\\'');
                    classNameCleanSprintNext = classNameCleanSprintNext.replace(' | ', '');
                  }
                  classNameCleanSprintNext = classNameCleanSprintNext.replace(/Kvart \d+/, '');
                  classNameCleanSprintNext = classNameCleanSprintNext.replace(/Semi \d+/, '');
                  classNameCleanSprintNext = classNameCleanSprintNext.replace(/Finale \d+/, '');

                  if (!sprint) // First class in sprint or new class
                    str += "<a href=\"javascript:LiveResults.Instance.chooseClass('plainresultsclass_" + classNameCleanSprint +
                      "')\" style=\"text-decoration: none\"><b>" + this.shortClassName(classNameCleanSprint) + "</b></a><br>&nbsp;";
                  sprint = true;
                  sprintNext = (classNameCleanSprintNext == classNameCleanSprint);

                  if (i < (nClass - 1) && (className.includes('| Prolog') ||
                    className.includes('| Kvart') && !classes[i + 1].className.includes('| Kvart') ||
                    className.includes('| Semi') && !classes[i + 1].className.includes('| Semi')))
                    shiftHeat = true;
                  else
                    shiftHeat = false;
                }
              }

              if (relay) {
                this.relayClasses.push(classes[i].className);
                var legText = "";
                leg += 1;
                if (leg > 1 && (leg - 1) % 3 == 0) // Line shift every 3 legs
                  str += "<br>&nbsp;"
                if (className.replace(classNameClean, '') == "-All")
                  legText = "&#9398";
                else
                  legText = "<span style=\"font-size:1.2em\">&#" + (10111 + leg) + ";</span>";
                str += "<a href=\"javascript:LiveResults.Instance.chooseClass('" + classNameURL + "')\" style=\"text-decoration: none\"> " + legText + "</a>";
                if (!relayNext)
                  str += "<br>";
              }
              else if (sprint) {
                var heatStr = className.match(/ \d+$/);
                var heat = parseInt((heatStr != null ? heatStr[0] : 0), 10);
                if (heat > 1 && (heat - 1) % 3 == 0) // Line shift every 3 heat
                  str += "<br>&nbsp;"
                if (className.includes('| Prolog'))
                  heatText = "Prolog";
                else if (className.includes('| Kvart'))
                  heatText = "K" + heat;
                else if (className.includes('| Semi'))
                  heatText = "S" + heat;
                else
                  heatText = "F" + heat;
                str += "<a href=\"javascript:LiveResults.Instance.chooseClass('" + classNameURL + "')\" style=\"text-decoration: none\"> " + heatText + "</a>";
                if (!sprintNext)
                  str += "<br>";
                else if (shiftHeat)
                  str += "<br>&nbsp;";
              }
              else {
                var elit = (className.toLowerCase().match(/(-e| e|\d+e|elite|wre|nm)(\s*\d*)$/) != null);
                if (!elit && elitLast && !this.EmmaServer)
                  str += "<hr>";
                str += "<a href=\"javascript:LiveResults.Instance.chooseClass('" + classNameURL + "')\">" + className + "</a><br>";
                elitLast = elit;
              }
            }
          };
          if (!this.EmmaServer) {
            str += "<hr><a href=\"javascript:LiveResults.Instance.chooseClass('plainresults')\" style=\"text-decoration: none\">Alle klasser</a>";
            str += "<br><a href=\"javascript:LiveResults.Instance.chooseClass('startlist')\" style=\"text-decoration: none\">Startliste</a>";
            if (this.isMultiDayEvent)
              str += "<br><a href=\"javascript:LiveResults.Instance.chooseClass('plainresultstotal')\" style=\"text-decoration: none\">" + this.resources["_TOTAL"] + "</a>";
          }
          if (this.showCourseResults && data.courses != undefined) {
            str += "<hr></nowrap>";
            for (var i = 0; i < this.courseNames.length; i++) {
              str += "<a href=\"javascript:LiveResults.Instance.chooseClass('course::" + this.courseNames[i].No + "')\">" + this.courseNames[i].Name + "</a><br>";
            }
          }

          str += "</nowrap>";
          if (first) // Open class list if first time update
            $('#classColumnContent').removeClass('closed').addClass('open');
          $("#" + this.classesDiv).html(str);
          if (!this.Time4oServer && !this.EmmaServer) {
            $("#numberOfRunnersTotal").html(data.numberOfRunners);
            $("#numberOfRunnersStarted").html(data.numberOfStartedRunners);
            $("#numberOfRunnersFinished").html(data.numberOfFinishedRunners);
          }
        }
      }

      if (_this.isCompToday())
        this.classUpdateTimer = setTimeout(function () { _this.updateClassList(); }, _this.classUpdateInterval);
    };

    AjaxViewer.prototype.shortClassName = function (className) {
      var ret = className.replace(/menn/i, 'M');
      ret = ret.replace(/kvinner/i, 'K');
      ret = ret.replace(/gutter/i, 'G');
      ret = ret.replace(/jenter/i, 'J');
      ret = ret.replace(/veteraner/i, 'Vet');
      ret = ret.replace(/veteran/i, 'Vet');
      ret = ret.replace(' Vann', 'V');
      return ret;
    }

    // Update best split times
    AjaxViewer.prototype.updateClassSplitsBest = function (data) {
      if (data != null && data.status == "OK" && data.results != null) {
        var classSplits = data.splitcontrols;
        var classSplitsBest = new Array(this.curClassNumSplits + 1);
        for (var i = 0; i < classSplitsBest.length; i++) {
          classSplitsBest[i] = new Array(1).fill(0);
        }

        // Fill in finish times
        var j = 0;
        for (var i = 0; i < data.results.length; i++) {
          if (data.results[i].place != undefined && data.results[i].place > 0 || data.results[i].place == "=") {
            if (this.curClassIsRelay) // start time + leg time (add 24 h if starttime between 00:00 and 06:00)
            {
              var startTime = data.results[i].start + (data.results[i].start < 6 * 3600 * 100 ? 24 * 3600 * 100 : 0);
              classSplitsBest[this.curClassNumSplits][j] = startTime + data.results[i].splits[classSplits[classSplits.length - 1].code];
            }
            else
              classSplitsBest[this.curClassNumSplits][j] = parseInt(data.results[i].result);
            j++;
          }
        }
        classSplitsBest[this.curClassNumSplits].sort(function (a, b) { return a - b; });
        if (this.curClassNumSplits > 0) {
          // Fill in split times
          var spRef;
          for (var sp = 0; sp < this.curClassNumSplits; sp++) {
            j = 0;
            spRef = this.splitRef(sp);
            for (var i = 0; i < data.results.length; i++) {
              if (data.results[i].splits[classSplits[spRef].code + "_place"] != undefined && data.results[i].splits[classSplits[spRef].code + "_place"] > 0
                && data.results[i].splits[classSplits[spRef].code] != "") {
                if (this.curClassIsRelay) // If relay, store pass time stamp instead of used time. Using leg time and start time
                // (add 24 h if starttime between 00:00 and 06:00)
                {
                  var startTime = data.results[i].start + (data.results[i].start < 6 * 3600 * 100 ? 24 * 3600 * 100 : 0);
                  classSplitsBest[sp][j] = startTime + data.results[i].splits[classSplits[spRef - 1].code];
                }
                else
                  classSplitsBest[sp][j] = data.results[i].splits[classSplits[spRef].code];
                j++;
              }
            }
            classSplitsBest[sp].sort(function (a, b) { return a - b; });
          }
        }
        this.curClassSplitsBests = classSplitsBest;
      }
    };

    AjaxViewer.prototype.checkForMassStart = function (data) {
      var isMassStart = false;
      if (data != null && data.status == "OK" && data.results != null) {
        var firstStart = 0;
        var lastStart = 999;
        var first = true;
        for (var i = 0; i < data.results.length; i++) {
          if (data.results[i].start != undefined && data.results[i].start > 0) {
            if (first) {
              first = false;
              firstStart = data.results[i].start;
              lastStart = data.results[i].start;
            }
            else {
              firstStart = Math.min(data.results[i].start, firstStart);
              lastStart = Math.max(data.results[i].start, lastStart);
            }
          }
        }
        isMassStart = (lastStart - firstStart < 100);
      }
      return isMassStart;
    };

    // Quality check of radio controls and estimate missing passing times
    AjaxViewer.prototype.checkRadioControls = function (data) {
      if (data == null || data.status != "OK" || data.results == null || this.curClassIsLapTimes || this.curClassIsUnranked)
        return;

      var classSplits = data.splitcontrols;
      if (classSplits.length == 0)
        return;

      const validateLim = 0.333;  // Fraction of runners with split to set split to OK
      const minNum = 3;      // Minimum numbers of runners to set split to BAD
      const sprintTimeLim = 90;     // Max time (seconds) from last to finish to trigger shortSprint setting

      this.updateResultVirtualPosition(data.results);
      var numRunners = data.results.length;
      var runnerOK = new Array(numRunners).fill(true);
      var laterSplitOKj = new Array(numRunners).fill(false);
      var shiftedSplits = new Array(numRunners).fill(false);
      var raceOK = true;

      // Check quality of split controls
      var OKSum;
      var statusN;
      var classSplitsOK = new Array(this.curClassNumSplits);
      for (var sp = this.curClassNumSplits - 1; sp >= 0; sp--) {
        OKSum = 0;
        statusN = 0;
        for (var j = 0; j < numRunners; j++) {
          if (data.results[j].status != 0 && data.results[j].status != 9 && data.results[j].status != 10)
            continue;

          var finishOK = (data.results[j].place != undefined && data.results[j].place > 0 || data.results[j].place == "=");
          if (sp == (this.curClassNumSplits - 1) && finishOK)
            laterSplitOKj[j] = true;

          var spRef = this.splitRef(sp);
          var split = parseInt(data.results[j].splits[classSplits[spRef].code]);
          var finishTime = (finishOK ? parseInt(data.results[j].result) : 360000000); // 1000 h
          if (isNaN(split) && laterSplitOKj[j]) { // Split does not exist and missing split detected
            statusN++;
            runnerOK[j] = false;
            raceOK = false;
          }
          else if (split < 0 || split > finishTime) { // Remove split if negative or longer than finish time
            statusN++;
            data.results[j].splits[classSplits[spRef].code] = "";
            data.results[j].splits[classSplits[spRef].code + "_changed"] = "";
            runnerOK[j] = false;
            raceOK = false;
          }
          else if (!isNaN(split)) { // Split exists and time is OK
            statusN++;
            OKSum++;
            laterSplitOKj[j] = true;
          }
        }
        var statusAvg = (statusN >= minNum ? OKSum / statusN : 1);
        classSplitsOK[sp] = (statusAvg > validateLim ? true : false);
      }
      this.curClassSplitsOK = classSplitsOK;

      // Calculate split fractions and sprint times per runner
      var splitFracRunner = Array.from(
        { length: this.curClassNumSplits },
        () => new Array(numRunners).fill(null)
      );
      var splitFrac;
      var prevSplit;
      var nextSplit;
      var startTime;
      var sprintTimeSum = 0;
      var sprintTimeNum = 0;

      for (var j = 0; j < numRunners; j++) {
        if (data.results[j].status != 0 && data.results[j].status != 9 && data.results[j].status != 10)
          continue;
        nextSplit = null;
        startTime = (this.curClassIsRelay ? parseInt(data.results[j].splits[0]) : 0);
        if (data.results[j].place != undefined && data.results[j].place > 0 || data.results[j].place == "=") // Finish time
          nextSplit = parseInt(data.results[j].result);
        for (var sp = this.curClassNumSplits - 1; sp >= 0; sp--) {
          if (!classSplitsOK[sp]) // Bad split
            continue;
          var spRef = this.splitRef(sp);
          split = parseInt(data.results[j].splits[classSplits[spRef].code]);
          if (!isNaN(split)) { // Split exist
            if (sp == this.curClassNumSplits - 1 && nextSplit != null && nextSplit > split) { // last split time
              sprintTimeSum += nextSplit - split;
              sprintTimeNum++;
            }
            var spPrev = sp - 1;
            while (!classSplitsOK[spPrev] && spPrev >= 0)
              spPrev--;
            var spPrevRef = this.splitRef(spPrev);
            prevSplit = (spPrevRef >= 0 ? parseInt(data.results[j].splits[classSplits[spPrevRef].code]) : startTime);
            if (nextSplit != null && nextSplit <= split || prevSplit != null && split <= prevSplit)
              splitFracRunner[sp][j] = -1;
            else
              splitFracRunner[sp][j] = (nextSplit != null && prevSplit != null ? (split - prevSplit) / (nextSplit - prevSplit) : null);
            nextSplit = split;
          }
          else { // Split does not exist
            nextSplit = null;
            splitFracRunner[sp][j] = null;
          }
        }
      }

      // Check if sprint is short
      if (sprintTimeNum > 0) {
        var sprintTimeAvg = sprintTimeSum / sprintTimeNum;
        this.shortSprint = (sprintTimeAvg > 0 && sprintTimeAvg < sprintTimeLim * 100);
      }
      else
        this.shortSprint = false;

      // Make parameters for split estimates
      var splitsPar = [];
      var classSplitsUpdated = new Array(classSplits.length).fill(false);

      for (var sp = 0; sp < this.curClassNumSplits; sp++) {
        if (!classSplitsOK[sp]) { // Bad split
          splitsPar.push(null);
          continue;
        }

        // Median split fractions
        var numFractions = 0;
        var fractions = [];
        for (var j = 0; j < numRunners; j++) {
          if (splitFracRunner[sp][j] > 0 && splitFracRunner[sp][j] < 1) {
            fractions.push(splitFracRunner[sp][j]);
            numFractions++;
          }
        }
        if (numFractions == 0) {
          splitsPar.push(null);
          continue;
        }
        var median = this.medianFrac(fractions, 0.25);

        // Median absolute deviation
        var absdev = [];
        for (var j = 0; j < numRunners; j++) {
          if (splitFracRunner[sp][j] > 0 && splitFracRunner[sp][j] < 1) {
            absdev.push(Math.abs(splitFracRunner[sp][j] - median));
          }
        }
        var medianDev = this.medianFrac(absdev, 0.1);

        // Linear estimation (weighted least squares)
        var count = 0;
        var wSum = 0;
        var xSum = 0;
        var ySum = 0;
        var xySum = 0;
        var xxSum = 0;
        var maxFrac = 0;
        var minFrac = 1;
        var stdDev = 1.48 * medianDev;

        for (var j = 0; j < numRunners; j++) {
          if (splitFracRunner[sp][j] != null && splitFracRunner[sp][j] > 0 && splitFracRunner[sp][j] < 1) {
            var frac = splitFracRunner[sp][j];
            if (Math.abs(frac - median) <= 2 * stdDev) {
              if (frac > maxFrac) maxFrac = frac;
              if (frac < minFrac) minFrac = frac;
              var weight = (numRunners - j) / numRunners;
              count++;
              wSum += weight;
              xSum += j * weight;
              ySum += frac * weight;
              xxSum += j * j * weight;
              xySum += j * frac * weight;
            }
          }
        }

        // Calculate estimation parameters
        var a = 0;
        var b = null;
        if (count >= 1) {
          a = (count >= 2 ? (wSum * xySum - xSum * ySum) / (wSum * xxSum - xSum * xSum) : 0);
          b = (ySum - a * xSum) / wSum;
        }

        splitsPar.push({
          median: median,
          medianDev: medianDev,
          numFractions: numFractions,
          a: a,
          b: b,
          max: maxFrac,
          min: minFrac
        });
      }

      // Check if class has multipass type splits
      var multiPass = false;
      if (!this.curClassIsRelay && !this.curClassIsLapTimes) {
        for (var sp1 = 0; sp1 < this.curClassNumSplits - 1; sp1++) {
          var code1 = classSplits[sp1].code;
          for (var sp2 = sp1 + 1; sp2 < this.curClassNumSplits; sp2++) {
            var code2 = classSplits[sp2].code;
            if ((code2 - code1) % 1000 == 0) {
              multiPass = true;
              break;
            }
          }
        }
      }

      // Shift split times if splits are missing when multi-pass type
      if (multiPass && !raceOK) {
        // Calculate nominal split fractions as fraction of total time
        var splitFracNom = new Array(this.curClassNumSplits).fill(1);
        var lastFrac = 1;
        for (var sp = this.curClassNumSplits - 1; sp >= 0; sp--) {
          if (!classSplitsOK[sp] || splitsPar[sp] == null)
            continue;
          var X = splitsPar[sp].median;
          for (var spi = sp - 1; spi >= 0; spi--) {
            if (!classSplitsOK[spi]) // Bad split
              continue;
            X = splitsPar[spi].median / (1 - X * (1 - splitsPar[spi].median));
          }
          splitFracNom[sp] = X * lastFrac;
          lastFrac = splitFracNom[sp];
        }

        // Shift split times if splits are missing when multi-pass type
        for (var j = 0; j < numRunners; j++) {
          if (runnerOK[j])
            continue;
          var finishOK = (data.results[j].place != undefined && data.results[j].place > 0 || data.results[j].place == "=");
          var finishTime = parseInt(data.results[j].result);
          if (!finishOK || finishTime <= 0)
            continue;
          for (var sp = this.curClassNumSplits - 1; sp >= 0; sp--) {
            var spRef = this.splitRef(sp);
            split = parseInt(data.results[j].splits[classSplits[spRef].code]);
            if (isNaN(split)) {
              var splitCode = classSplits[spRef].code;
              var spliti = NaN;
              var spi = sp - 1;
              var spRefi;
              var splitCodei;
              while (spi >= 0) {
                spRefi = this.splitRef(spi);
                splitCodei = classSplits[spRefi].code;
                if ((splitCode - splitCodei) % 1000 == 0) {
                  spliti = parseInt(data.results[j].splits[splitCodei]);
                  if (!isNaN(spliti))
                    break;
                }
                spi--;
              }
              if (spi >= 0) { // A matching split exists
                var bestFitDev = Math.abs(spliti / finishTime - splitFracNom[spi]);
                var bestFitSpi = spi;
                for (var spj = spi + 1; spj <= sp; spj++) {
                  var spRefj = this.splitRef(spj);
                  var splitCodej = classSplits[spRefj].code;
                  var splitDevSpj = Math.abs(spliti / finishTime - splitFracNom[spj]);
                  if (splitDevSpj < bestFitDev && (splitCode - splitCodej) % 1000 == 0) {
                    bestFitSpi = spj;
                    bestFitDev = splitDevSpj;
                  }
                }
              }
              if (bestFitSpi == sp) { // Best fit is to move split time to current split
                data.results[j].splits[splitCode] = data.results[j].splits[splitCodei];
                data.results[j].splits[splitCode + "_changed"] = 0;
                data.results[j].splits[splitCode + "_status"] = 0;
                data.results[j].splits[splitCodei] = undefined;
                classSplitsUpdated[sp] = true;
                classSplitsUpdated[spj] = true;
                shiftedSplits[j] = true;
              }
            }
          }
        }
      }

      // Loop through all runners and remove unlikely short split times
      const placeLimit = 3;     // Only top splits considered
      const minNumFrac = 5;     // Minumum number of fractions to set unlikely split
      const minDev = 0.15;  // Minimum deviation from median fraction to set unlikely split
      const stdFactor = 1.48;  // Conversion from abs median deviation to standard deviation
      for (var j = 0; j < numRunners; j++) {
        if (shiftedSplits[j] || data.results[j].status != 0 && data.results[j].status != 9 && data.results[j].status != 10)
          continue;
        for (var sp = this.curClassNumSplits - 1; sp >= 0; sp--) {
          if (splitsPar[sp] == null || splitsPar[sp].numFractions < minNumFrac || !classSplitsOK[sp] || splitFracRunner[sp][j] == null) // Too few, bad or none existing split
            continue;
          var spRef = this.splitRef(sp);
          var splitCode = classSplits[spRef].code;
          if (data.results[j].splits[splitCode + "_place"] > placeLimit)
            continue;
          // Calculate limit for unlikely split based on estimaed std dev and apporiximate Stundent t value at 99.9% confidence
          var devLimit = Math.max(minDev, stdFactor * splitsPar[sp].medianDev * Math.exp(1.19 + 1.5 * Math.exp(-0.14 * (splitsPar[sp].numFractions - 1))));
          var splitFrac = Math.max(splitsPar[sp].min, Math.min(splitsPar[sp].max, splitsPar[sp].a * j + splitsPar[sp].b));
          if (splitFrac - splitFracRunner[sp][j] > devLimit) {
            data.results[j].splits[classSplits[spRef].code] = "";
            data.results[j].splits[classSplits[spRef].code + "_changed"] = "";
            classSplitsUpdated[spRef] = true;
            runnerOK[j] = false;
            raceOK = false;
          }
        }
      }

      if (raceOK)
        return;

      // Loop through all runners and insert estimated times where needed
      for (var j = 0; j < numRunners; j++) {
        if (runnerOK[j])
          continue;
        var nextSplit = null;
        startTime = (this.curClassIsRelay ? parseInt(data.results[j].splits[0]) : 0);

        // Initialize with finish time
        var finishTime = null;
        if (data.results[j].place != undefined && data.results[j].place > 0 || data.results[j].place == "=") {
          finishTime = parseInt(data.results[j].result);
          nextSplit = finishTime;
        }

        for (var sp = this.curClassNumSplits - 1; sp >= 0; sp--) {
          if (!classSplitsOK[sp]) // Bad split
            continue;
          var prevSplit = NaN;
          var spRef = this.splitRef(sp);
          split = parseInt(data.results[j].splits[classSplits[spRef].code]);
          if (!isNaN(split)) // Split exist
            nextSplit = split;
          else if (splitsPar[sp] == null) // No split and no parameters
            nextSplit = 0;
          else {  // No split but estimate parameters exist, calculate and insert estimated split        
            var x = [];
            var spPrev = sp;
            while (isNaN(prevSplit) && spPrev >= 0) // Find first of previous splits that exist
            {
              if (classSplitsOK[spPrev])
                x.push(Math.max(splitsPar[spPrev].min, Math.min(splitsPar[spPrev].max, splitsPar[spPrev].a * j + splitsPar[spPrev].b)));
              spPrev--;
              var spPrevRef = this.splitRef(spPrev);
              prevSplit = (spPrevRef >= 0 ? parseInt(data.results[j].splits[classSplits[spPrevRef].code]) : startTime);
            }
            var X = x[x.length - 1];
            for (var i = x.length - 2; i >= 0; i--)
              X = x[i] / (1 - X * (1 - x[i])); // Recursive formula for aggregated fraction

            if (nextSplit > 0 && !isNaN(prevSplit) && X > 0) {
              classSplitsUpdated[spRef] = true;
              split = Math.round((X * nextSplit + (1 - X) * prevSplit) / 100) * 100;
              nextSplit = split;

              data.results[j].splits[classSplits[spRef].code] = split;
              data.results[j].splits[classSplits[spRef].code + "_estimate"] = true;
              data.results[j].splits[classSplits[spRef].code + "_changed"] = 0;
              data.results[j].splits[classSplits[spRef].code + "_status"] = 0;

              if (this.curClassIsRelay) // Leg time
              {
                classSplitsUpdated[spRef - 1] = true;
                data.results[j].splits[classSplits[spRef].code + 100000] = split - startTime;
                data.results[j].splits[(classSplits[spRef].code + 100000) + "_estimate"] = true;
                data.results[j].splits[(classSplits[spRef].code + 100000) + "_changed"] = 0;
                data.results[j].splits[(classSplits[spRef].code + 100000) + "_status"] = 0;
              }
            }
          }
        }
      }

      this.updateSplitPlaces(data, classSplitsUpdated);
    }

    // Update split places and timeplus 
    AjaxViewer.prototype.updateSplitPlaces = function (data, updateSplits) {
      var classSplits = data.splitcontrols;
      for (var sp = 0; sp < classSplits.length; sp++) {
        if (!updateSplits[sp])
          continue;

        data.results.sort(this.splitSort(sp, classSplits));

        var splitPlace = 1;
        var curSplitPlace = 1;
        var curSplitTime = "";
        var bestSplitTime = -1;
        var bestSplitKey = -1;
        var secondBest = false;

        for (var j = 0; j < data.results.length; j++) {
          var spTime = "";
          var status = 0;
          if (data.results[j].splits["999_status"] != undefined && classSplits[sp].code > 100000) // leg times
            status = data.results[j].splits["999_status"];
          else
            status = data.results[j].status;

          if (data.results[j].splits[classSplits[sp].code] != undefined && data.results[j].splits[classSplits[sp].code] != "") {
            spTime = data.results[j].splits[classSplits[sp].code];
            if (bestSplitTime < 0 && (status == 0 || status == 9 || status == 10)) {
              bestSplitTime = spTime;
              bestSplitKey = j;
            }
          }
          if (spTime != "") {
            data.results[j].splits[classSplits[sp].code + "_timeplus"] = spTime - bestSplitTime;
            if (!secondBest && bestSplitKey > -1 && j != bestSplitKey && (status == 0 || status == 9 || status == 10)) {
              data.results[bestSplitKey].splits[classSplits[sp].code + "_timeplus"] = bestSplitTime - spTime;
              secondBest = true;
            }
          }
          else
            data.results[j].splits[classSplits[sp].code + "_timeplus"] = -2;

          if (curSplitTime != spTime)
            curSplitPlace = splitPlace;

          if (status == 0 || status == 9 || status == 10) {
            data.results[j].splits[classSplits[sp].code + "_place"] = curSplitPlace;
            splitPlace++;
            if (data.results[j].splits[classSplits[sp].code] != undefined && data.results[j].splits[classSplits[sp].code] != "")
              curSplitTime = data.results[j].splits[classSplits[sp].code];
          }
          else if (status == 13)
            data.results[j].splits[classSplits[sp].code + "_place"] = "F";
          else {
            data.results[j].splits[classSplits[sp].code + "_place"] = "-";
            data.results[j].splits[classSplits[sp].code + "_status"] = status;
          }
        }
      }
    }

    // Sort function for passing times
    AjaxViewer.prototype.splitSort = function (split, classSplits) {
      return function (a, b) {
        var aVal = a.splits[classSplits[split].code];
        var bVal = b.splits[classSplits[split].code];
        var aUndefined = (aVal == undefined || aVal == "");
        var bUndefined = (bVal == undefined || bVal == "");
        if (!aUndefined && !bUndefined) {
          if (aVal != bVal)
            return (aVal < bVal ? -1 : 1);
          else
            return 0;
        }
        if (aUndefined && !bUndefined)
          return 1;
        if (!aUndefined && bUndefined)
          return -1;
        if (aUndefined && bUndefined)
          return 0;
      }
    }

    // Update qualification markings
    AjaxViewer.prototype.updateQualLimMarks = function (results, className) {
      if (results != null && this.qualLimits != null) {
        var qualIndex = -1;
        if (this.qualClasses != null)
          qualIndex = this.qualClasses.indexOf(className);
        if (qualIndex == -1)
          qualIndex = this.qualLimits.length - 1;
        var qualLim = this.qualLimits[qualIndex];
        if (qualLim < 0)
          return
        if (qualLim < 1) // If given as a fraction of started runners
        {
          var numDNS = 0;
          for (var i = 0; i < results.length; i++) {
            if (results[i].status == 1)
              numDNS++;
          }
          qualLim = Math.ceil(qualLim * (results.length - numDNS));
        }
        var lastPos = -1;
        var curPos = -1;
        var instaRanked = false;
        var limitSet = false;
        for (var i = 0; i < results.length; i++) {
          lastPos = curPos;
          curPos = results[i].place;
          if (results[i].virtual_position != i)
            instaRanked = true;
          if ((!limitSet) && (this.rankedStartlist || !this.rankedStartlist && results[i].progress > 0) &&
            (curPos == "-" && results[i].virtual_position <= qualLim - 1 ||
              !instaRanked && results[i].virtual_position > qualLim - 1 && curPos != lastPos ||
              instaRanked && results[i].virtual_position == qualLim)) {
            limitSet = true;
            if (results[i].DT_RowClass == "yellow_row" || results[i].DT_RowClass == "yellow_row_fnq")
              results[i].DT_RowClass = "yellow_row_fnq";
            else
              results[i].DT_RowClass = "firstnonqualifier";
          }
          else {
            if (results[i].DT_RowClass == "yellow_row" || results[i].DT_RowClass == "yellow_row_fnq")
              results[i].DT_RowClass = "yellow_row";
            else
              results[i].DT_RowClass = "nostyle";
          }
          if (curPos == "" || curPos == '<span class="pulsing">◉</span>')
            curPos = "-";
        }
      }
    };

    // Convert from split render number to split data 
    AjaxViewer.prototype.splitRef = function (sp) {
      if (this.curClassIsRelay)
        return sp * 2 + 2;
      else if (this.curClassLapTimes)
        return sp * 2 + 1;
      else
        return sp;
    }

    // Convert from split data number to render number
    AjaxViewer.prototype.refSplit = function (spRef) {
      if (this.curClassIsRelay)
        return Math.floor((spRef - 1) / 2);
      else if (this.curClassLapTimes)
        return Math.floor(spRef / 2);
      else
        return spRef;
    }

    // Updated predicted times
    AjaxViewer.prototype.updatePredictedTimes = function (timesOnly = false) {
      var curClassActive = false;
      if (this.currentTable != null && this.curClassName != null && this.updateAutomatically && this.isCompToday()) {
        try {
          var dt = new Date();
          var currentTimeZoneOffset = -1 * new Date().getTimezoneOffset();
          var eventZoneOffset = ((dt.dst() ? 2 : 1) + this.eventTimeZoneDiff) * 60;
          var timeZoneDiff = eventZoneOffset - currentTimeZoneOffset;
          var time = 100 * Math.round((dt.getSeconds() + (60 * dt.getMinutes()) + (60 * 60 * dt.getHours())) - (this.serverTimeDiff / 1000) + (timeZoneDiff * 60));
          var timeServer = (dt - this.serverTimeDiff) / 1000;
          var timeDiff = 0;
          var timeDiffCol = 0;
          var highlight = false;
          var age = 0;
          var table = this.currentTable;
          var data = table.data().toArray();
          var offset = 3 + (this.curClassHasBibs ? 1 : 0) + ((this.curClassIsUnranked || this.compactView && !this.curClassLapTimes) ? 1 : 0);
          var MDoffset = (this.curClassIsCourse ? 1 : 0) + (this.isMultiDayEvent && !this.compactView && !this.curClassIsUnranked ? -1 : 0) // Multiday offset
          var rank;
          const predOffset = 1500;
          const rankedStartListMinTimeDiff = -120 * 100; // Only make a dynamic ranking the last 2 minutes before best time 
          const predRank = true;

          var firstOKSplit = this.curClassNumSplits;
          for (var sp = 0; sp < this.curClassNumSplits; sp++) {
            if (this.curClassSplitsOK[sp]) {
              firstOKSplit = sp;
              break;
            }
          }

          if (this.isMultiDayEvent) {
            var totalTimeCol = offset + this.curClassNumSplits * 2 + (this.compactView ? 3 : 2);
            if (typeof (data[0].totalresultSave) == 'undefined') {
              for (var i = 0; i < data.length; i++)
                data[i].totalresultSave = data[i].totalresult;
            }
          }

          // *** Highlight new results and write running times***
          var tmpPredData = Array(0);
          for (var i = 0; i < data.length; i++) {
            tmpPredData.push(this.predData[i]);
            var row = table.row(i).node();

            // Single-result classes. Highlight whole line
            if (this.curClassNumSplits == 0 || (this.curClassIsUnranked && this.curClassNumSplits == 1)) {
              if (this.EmmaServer) {
                if ($(row).hasClass('new_result'))
                  $(row).addClass('red_row');
              }
              else {
                highlight = false;
                if (data[i].changed != "" && data[i].progress == 100) {
                  age = timeServer - data[i].changed;
                  highlight = (age < this.highTime);
                }
                if (highlight && !$(row).hasClass('yellow_row')) {
                  if (!$(row).hasClass('red_row') && !$(row).hasClass('new_fnq')) {
                    if (data[i].DT_RowClass != undefined && (data[i].DT_RowClass == "firstnonqualifier" || data[i].DT_RowClass == "new_fnq"))
                      $(row).addClass('new_fnq');
                    else
                      $(row).addClass('red_row');
                  }
                }
                else if ($(row).hasClass('red_row') || $(row).hasClass('new_fnq')) {
                  $(row).removeClass('red_row');
                  $(row).removeClass('new_fnq');
                }
              }
            }
            else  // Classes with split times
            {
              // Highlight finish-time
              highlight = false;
              var highlightEmma = false;
              if (this.EmmaServer && $(row).hasClass('new_result') && data[i].progress == 100) {
                highlight = true;
                highlightEmma = true;
              }
              else if (data[i].changed != "" && data[i].progress == 100) {
                age = timeServer - data[i].changed;
                highlight = (age < this.highTime);
              }

              var colFinish = offset + this.curClassNumSplits * 2;
              if (highlight && (data[i].highlight == undefined || data[i].highlight == false)) {
                data[i].highlight = true;
                if (this.compactView || this.curClassIsRelay || this.curClassLapTimes) {
                  $(table.cell(i, colFinish).node()).addClass('red_cell_sqr');
                  $(table.cell(i, colFinish + 2).node()).addClass('red_cell');
                  if (this.isMultiDayEvent) {
                    $(table.cell(i, colFinish + 3).node()).addClass('red_cell_sqr');
                    $(table.cell(i, colFinish + 5).node()).addClass('red_cell');
                  }
                }
                else {
                  $(table.cell(i, colFinish).node()).addClass('red_cell');
                  if (this.isMultiDayEvent)
                    $(table.cell(i, colFinish + 2).node()).addClass('red_cell');
                }
              }
              else if (!highlight && data[i].highlight == true) {
                data[i].highlight = false;
                if (this.compactView || this.curClassIsRelay || this.curClassLapTimes) {
                  $(table.cell(i, colFinish).node()).removeClass('red_cell_sqr');
                  $(table.cell(i, colFinish + 2).node()).removeClass('red_cell');
                  if (this.isMultiDayEvent) {
                    $(table.cell(i, colFinish + 3).node()).removeClass('red_cell_sqr');
                    $(table.cell(i, colFinish + 5).node()).removeClass('red_cell');
                  }
                }
                else {
                  $(table.cell(i, colFinish).node()).removeClass('red_cell');
                  if (this.isMultiDayEvent)
                    $(table.cell(i, colFinish + 2).node()).removeClass('red_cell');
                }
              }

              // Highlight split times
              var spRef = 0;
              var colNum = 0;
              for (var sp = this.curClassNumSplits - 1; sp >= 0; sp--) {
                if (highlightEmma)
                  break;
                spRef = this.splitRef(sp);
                colNum = offset + 2 * sp;

                highlight = false;
                if (this.EmmaServer && $(row).hasClass('new_result') && data[i].splits[this.curClassSplits[spRef].code] > 0) {
                  highlightEmma = true;
                  highlight = true;
                }
                else if (data[i].splits[this.curClassSplits[spRef].code + "_changed"] != "") {
                  age = timeServer - data[i].splits[this.curClassSplits[spRef].code + "_changed"];
                  highlight = (age < this.highTime);
                }

                if (highlight && (data[i].splits[this.curClassSplits[spRef].code + "_highlight"] == undefined ||
                  data[i].splits[this.curClassSplits[spRef].code + "_highlight"] == false)) {
                  data[i].splits[this.curClassSplits[spRef].code + "_highlight"] = true;
                  $(table.cell(i, colNum).node()).addClass('red_cell');
                }
                else if (!highlight && data[i].splits[this.curClassSplits[spRef].code + "_highlight"] == true) {
                  data[i].splits[this.curClassSplits[spRef].code + "_highlight"] = false;
                  $(table.cell(i, colNum).node()).removeClass('red_cell');
                }
              }
            }

            // *** Update predicted times ***
            if (data[i].status == 10 || data[i].status == 9) {
              curClassActive = true;
              if (data[i].start != "" && data[i].start > 0) {
                var elapsedTime = time - data[i].start;
                if (elapsedTime < -18 * 3600 * 100) // Time passed midnight (between 00:00 and 06:00)
                  elapsedTime += 24 * 3600 * 100;
                if (elapsedTime >= 0) {
                  table.cell(i, 0).data("<span class=\"pulsing\">◉</span>");

                  if (this.isMultiDayEvent && (data[i].totalstatus == 10 || data[i].totalstatus == 9) && !this.curClassIsUnranked) {
                    var elapsedTotalTime = elapsedTime + data[i].totalresultSave;
                    var elapsedTotalTimeStr = "<i>&#10092;" + this.formatTime(elapsedTotalTime, 0, false) + "&#10093;</i>";
                    if (this.curClassNumberOfRunners >= 10)
                      elapsedTotalTimeStr += "<span class=\"hideplace\">&nbsp;<i>..&#10072;</i></span>";
                    else
                      elapsedTotalTimeStr += "<span class=\"hideplace\"><i>..&#10072;</i></span>";
                    table.cell(i, totalTimeCol).data(elapsedTotalTimeStr);
                  }

                  var timeDiffStr = "";
                  var elapsedTimeStr = (this.curClassIsRelay ? "<i><span class=\"legicon\">&#8635; </span>" : "<i>") + this.formatTime(elapsedTime, 0, false) + "</i>";
                  if (this.curClassSplits == null || this.curClassSplits.length == 0) {
                    // No split controls
                    if (!this.curClassIsUnranked) {
                      if (this.curClassSplitsBests[0][0] > 0) {
                        rank = this.findRank(this.curClassSplitsBests[0], elapsedTime);
                        var rankStr = "<span class=\"place\"> ";
                        if (this.curClassNumberOfRunners >= 10 && rank < 10)
                          rankStr += "&numsp;"
                        if (rank > 1)
                          rankStr += "<i>&#10072;" + rank + "&#10072;</i></span>";
                        else
                          rankStr += "<i>&#10072;..&#10072;</i></span>";
                        elapsedTimeStr += rankStr;
                        timeDiff = elapsedTime - this.curClassSplitsBests[0][0];
                        timeDiffStr = "<i>" + (timeDiff < 0 ? "-" : "+") + this.formatTime(Math.abs(timeDiff), 0, false) + "</i>";
                      }
                      else // No best time
                      {
                        timeDiff = rankedStartListMinTimeDiff - 1; // Force no dynamic ranking
                        timeDiffStr = "<span class=\"place\"><i>&#10072;..&#10072;</i></span>";
                        if (this.isMultiDayEvent && !this.compactView) {
                          timeDiffStr = "";
                          elapsedTimeStr += "<span class=\"place\"> <i>&#10072;..&#10072;</i></span>";
                        }
                      }
                      if (this.isMultiDayEvent && !this.compactView) {
                        if (this.curClassNumberOfRunners >= 10)
                          elapsedTimeStr += "<br>" + timeDiffStr + "<span class=\"place\"> &numsp;<i>&#10072;..&#10072;</i></span>";
                        else
                          elapsedTimeStr += "<br>" + timeDiffStr + "<span class=\"place\"> <i>&#10072;..&#10072;</i></span>";
                      }
                      else {
                        table.cell(i, 6 + MDoffset + (this.curClassHasBibs ? 1 : 0)).data(timeDiffStr);
                      }
                    }
                    table.cell(i, 4 + MDoffset + (this.curClassHasBibs ? 1 : 0)).data(elapsedTimeStr);

                    // Insert finish time if predict ranking is on
                    if (predRank && this.rankedStartlist && timeDiff > rankedStartListMinTimeDiff && !this.curClassIsRelay && !this.curClassLapTimes && !this.curClassIsUnranked &&
                      data[i].progress == 0 && (data[i].status == 0 || data[i].status == 9 || data[i].status == 10)) {
                      tmpPredData[i].result = Math.max(elapsedTime / (predOffset + 1), elapsedTime - predOffset);
                      tmpPredData[i].progress = 100;
                      tmpPredData[i].place = "p";
                      tmpPredData[i].status = 0;
                    }
                  }
                  else {
                    // Have split controls. Find next split to reach
                    // Insert default value being the first OK split and last OK
                    var lastOKSplit = this.curClassNumSplits;
                    nextSplit = firstOKSplit;
                    var extraSpace = "<span class=\"hideplace\"> " + (this.curClassNumberOfRunners >= 10 ? "&numsp;" : "") + "<i>&#10072;..&#10072;</i></span>";

                    for (var sp = this.curClassNumSplits - 1; sp >= 0; sp--) {
                      var spRef = this.splitRef(sp);
                      if (!isNaN(parseInt(data[i].splits[this.curClassSplits[spRef].code]))) {
                        nextSplit = lastOKSplit;
                        break;
                      }
                      if (this.curClassSplitsOK[sp])
                        lastOKSplit = sp;
                    }

                    if (this.curClassIsUnranked) {
                      table.cell(i, offset + nextSplit * 2).data(elapsedTimeStr);
                      table.cell(i, offset + this.curClassNumSplits * 2).data("<span class=\"place\"><i>&#10072;..&#10072;</i></span>");
                    }
                    else {
                      var rankStr = "";
                      if (this.curClassSplitsBests[nextSplit][0] == 0) {
                        timeDiff = rankedStartListMinTimeDiff - 1; // Force no dynamic ranking
                        rank = 0;
                        rankStr += "<i>&#10072;..&#10072;</i></span>";
                        if (nextSplit != this.curClassNumSplits && !this.curClassIsRelay)
                          timeDiffStr = elapsedTimeStr;
                      }
                      else {
                        if (this.curClassIsRelay) {   // Add 24 h if time passed midnight (between 00:00 and 06:00)
                          timeRelay = time + (time < 6 * 3600 * 100 ? 24 * 3600 * 100 : 0);
                          timeDiff = timeRelay - this.curClassSplitsBests[nextSplit][0];
                          rank = this.findRank(this.curClassSplitsBests[nextSplit], timeRelay);
                        }
                        else {
                          timeDiff = elapsedTime - this.curClassSplitsBests[nextSplit][0];
                          rank = this.findRank(this.curClassSplitsBests[nextSplit], elapsedTime);
                        }
                        rankStr += "<i>&#10072;" + rank + "&#10072;</i></span>";
                        timeDiffStr = "<i>" + (timeDiff < 0 ? "-" : "+") + this.formatTime(Math.abs(timeDiff), 0, false) + "</i>";
                      }
                      rankStr = "<span class=\"place\"> " + (this.curClassNumberOfRunners >= 10 && rank < 10 ? "&numsp;" : "") + rankStr;

                      if (this.curClassIsRelay) {
                        elapsedTimeStr += extraSpace;
                        if (!this.compactView) {
                          timeDiffStr += rankStr;
                          if (nextSplit == this.curClassNumSplits) {
                            elapsedTimeStr = timeDiffStr + "<br>" + elapsedTimeStr;
                            timeDiffStr = "";
                          }
                          else {
                            timeDiffStr = timeDiffStr + "<br>" + elapsedTimeStr;
                            elapsedTimeStr = "";
                          }
                        }
                        else if (nextSplit != this.curClassNumSplits)
                          timeDiffStr += rankStr;
                      }
                      else {
                        if (nextSplit == this.curClassNumSplits)
                          elapsedTimeStr += rankStr;
                        else {
                          timeDiffStr += rankStr;
                          elapsedTimeStr += extraSpace;
                        }
                      }

                      // Display time diff
                      if (this.compactView || nextSplit != this.curClassNumSplits || this.curClassLapTimes) {
                        timeDiffCol = offset + nextSplit * 2 + (nextSplit == this.curClassNumSplits ? 2 : 0);
                        table.cell(i, timeDiffCol).data(timeDiffStr);
                      }

                      // Display elapsed time
                      if (!this.compactView && !this.curClassIsRelay && !this.curClassLapTimes && nextSplit == this.curClassNumSplits)
                        elapsedTimeStr += "<br>" + timeDiffStr + extraSpace;
                      table.cell(i, offset + this.curClassNumSplits * 2).data(elapsedTimeStr);

                      // Update predData: Insert current time if longer than a runner with larger index / virtual position
                      if (predRank && !this.curClassIsRelay && !this.curClassLapTimes) {
                        if (nextSplit == 0 && this.rankedStartlist && timeDiff > rankedStartListMinTimeDiff) // First split
                        {
                          tmpPredData[i].splits[this.curClassSplits[0].code] = Math.max(elapsedTime / (predOffset + 1), elapsedTime - predOffset);
                          tmpPredData[i].progress = 100.0 * 1 / (this.curClassNumSplits + 1);
                          tmpPredData[i].place = "";
                        }
                        else {
                          for (var j = i + 1; j < data.length; j++) {
                            if (data[j].status != 0 && data[j].status != 9 && data[j].status != 10)
                              break
                            if (!this.shortSprint && nextSplit == this.curClassNumSplits && data[j].status == 0 && elapsedTime - predOffset > parseInt(data[j].result)) {   // Finish
                              tmpPredData[i].result = Math.max(elapsedTime / (predOffset + 1), elapsedTime - predOffset);
                              tmpPredData[i].progress = 100;
                              tmpPredData[i].place = "p";
                              tmpPredData[i].status = 0;
                              break;
                            }
                            if (nextSplit < this.curClassNumSplits && parseInt(data[j].splits[this.curClassSplits[nextSplit].code]) > 0) {
                              if (elapsedTime - predOffset > parseInt(data[j].splits[this.curClassSplits[nextSplit].code])) {
                                tmpPredData[i].splits[this.curClassSplits[nextSplit].code] = elapsedTime - predOffset;
                                tmpPredData[i].progress = 100.0 * (nextSplit + 1) / (this.curClassNumSplits + 1);
                                tmpPredData[i].place = "";
                              }
                              break;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // Update virtal positions if predRank is on
          var updatedVP = false;
          if (predRank && !this.curClassIsMassStart && !this.curClassIsRelay && !this.curClassIsUnranked && !this.curClassLapTimes) {
            oldData = $.extend(true, [], data); // Take a copy before updating VP
            this.updateResultVirtualPosition(tmpPredData, false);
            for (var j = 0; j < tmpPredData.length; j++) {
              if (data[tmpPredData[j].idx].virtual_position != tmpPredData[j].virtual_position) {
                updatedVP = true;
                data[tmpPredData[j].idx].virtual_position = tmpPredData[j].virtual_position;
              }
            }
          }

          // Update table if required
          if (updatedVP) {
            if (this.qualLimits != null && this.qualLimits.length > 0)
              this.updateQualLimMarks(data, this.curClassName);
            table.rows().invalidate();
          }

          if (updatedVP || timesOnly)
            table.columns.adjust().draw();

          if (!timesOnly) {
            if (updatedVP)
              this.animateTable(oldData, data, this.animTime, true);
            else
              this.startPredictedTimeTimer();
          }
        }
        catch {
          this.startPredictedTimeTimer();
        }
      }

      // Stop requesting updates if class not active
      if (!curClassActive && !this.EmmaServer && this.curClassName != null && !this.noSplits) {
        clearTimeout(this.resUpdateTimeout);
        $('#liveIndicator').html('');
      }
    };

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

    //Set wether to display tenth of a second in results
    AjaxViewer.prototype.setShowTenth = function (val) {
      this.showTenthOfSecond = val;
    };

    //Request data for the last-passings div
    AjaxViewer.prototype.updateLastPassings = function () {
      var _this = this;
      if (this.updateAutomatically && this.autoUpdateLastPassings && !this.Time4oServer) {
        $.ajax({
          url: this.apiURL,
          data: "comp=" + this.competitionId + "&method=getlastpassings&lang=" + this.language + "&last_hash=" + this.lastPassingsUpdateHash,
          success: function (data) { _this.handleUpdateLastPassings(data); },
          error: function () {
            _this.passingsUpdateTimer = setTimeout(function () { _this.updateLastPassings(); }, _this.updateInterval);
          },
          dataType: "json"
        });
      }
    };

    //Handle response for updating the last passings
    AjaxViewer.prototype.handleUpdateLastPassings = function (data) {
      var _this = this;
      if (data.rt != undefined && data.rt > 0)
        this.updateInterval = data.rt * 1000;
      if (data != null && data.status == "OK") {
        if (data.passings != null) {
          var str = "";
          $.each(data.passings, function (key, value) {
            var runnerName = (value.runnerName.length > _this.maxNameLength ? _this.nameShort(value.runnerName) : value.runnerName);
            var status = value["status"];
            var place = value["place"];
            var code = value["control"];
            var cl = value["class"];

            if (cl && cl.length > 0)
              cl = cl.replace('\'', '\\\'');

            var bibStr = "";
            if (_this.speakerView) {
              var bib = value["bib"];
              var bibFormat = "";
              if (bib < 0)
                bibFormat = (-bib / 100 | 0) + "-" + (-bib % 100)
              else
                bibFormat = bib;
              bibStr = " (<a href=\"javascript:LiveResults.Instance.searchBib(" + bib + ")\">" + bibFormat + "</a>) ";
            }

            var placeStr = (code > 0 && place > 0 && status == 0 ? " (" + place + ")" : "");

            str += value.passtime + ": " + bibStr + runnerName
              + " (<a href=\"javascript:LiveResults.Instance.chooseClass('" + cl + "')\">" + value["class"] + "</a>) "
              + (code == 1000 && status > 0 && status < 7 ? _this.resources["_NEWSTATUS"] :
                (code == 1000 ? _this.resources["_LASTPASSFINISHED"] : _this.resources["_LASTPASSPASSED"] + " " + value["controlName"])
                + " " + (status == 13 ? _this.resources["_LASTPASSWITHSTATUS"] : _this.resources["_LASTPASSWITHTIME"])) + " "
              + value["time"] + placeStr + "<br>";
          });
          $("#" + this.lastPassingsDiv).html(str);
          this.lastPassingsUpdateHash = data.hash;
        }
      }
      if (_this.isCompToday())
        this.passingsUpdateTimer = setTimeout(function () { _this.updateLastPassings(); }, _this.updateInterval);
    };

    //Request data for the last radio passings div
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

    //Handle response for updating the last radio passings..
    AjaxViewer.prototype.handleUpdateRadioPassings = function (data, expTime, code) {

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
      var _this = this;
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
              if (type === 'display') {
                if (data.length > _this.maxNameLength)
                  return _this.nameShort(data);
                else
                  return data;
              }
              else
                return data;
            }
          });
          columns.push({
            title: "Klubb", className: "dt-left", orderable: leftInForest, targets: [col++], data: "club",
            render: function (data, type) {
              if (type === 'display') {
                if (data.length > _this.maxClubLength) {
                  return _this.clubShort(data);
                }
                else
                  return data;
              }
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
        URLextra = "race/" + this.competitionId + "/entry";
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
        },
        dataType: "json"
      });
    };

    //Handle response for updating the start registration
    AjaxViewer.prototype.handleUpdateStartRegistration = function (data, expTime, openStart) {
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

      var _this = this;

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
                var link = "<a href=\"followfull.php?comp=" + _this.competitionId + (_this.Time4oServer ? "&time4o" : "");
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
                ecardstr += ecards;
                ecardstr += "</div>";
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
                  timeToStartStr = "<span style=\"color:" + (data < 0 ? "black" : "red") + "\">";
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
                var defaultDNS = (row.dbid > 0 ? 1 : 0);
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

    AjaxViewer.prototype.startListSorter = function (a, b) {
      if (a.start - b.start != 0)
        return a.start - b.start;
      else if (a.bib - b.bib != 0)
        return a.bib - b.bib;
      else
        return a.dbid - b.dbid;
    }

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

    //Request data for start list
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
    //Handle response for updating start list
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
            className = row.class;
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


    // Club name shortener
    AjaxViewer.prototype.clubShort = function (club) {
      _this = this;
      if (!club)
        return false;
      var shortClub = club.replace('Orienterings', 'O.');
      shortClub = shortClub.replace('Orientering', 'O.');
      shortClub = shortClub.replace('Orienteering', 'O.');
      shortClub = shortClub.replace('Orienteer', 'O.');
      shortClub = shortClub.replace('Skiklubb', 'Sk.');
      shortClub = shortClub.replace('Skilag', 'Sk.');
      shortClub = shortClub.replace('og Omegn IF', 'OIF.');
      shortClub = shortClub.replace('og Omegn IL', 'OIL.');
      shortClub = shortClub.replace('og omegn', '');
      shortClub = shortClub.replace(/national team/i, 'NT');
      shortClub = shortClub.replace('Sportklubb', 'Spk.');
      shortClub = shortClub.replace('Sportsklubb', 'Spk.');
      shortClub = shortClub.replace('Idrettslaget', 'IL');
      shortClub = shortClub.replace('Idrettslag', 'IL');
      shortClub = shortClub.replace('Idrettsforeningen', 'IF');
      shortClub = shortClub.replace('Idrettsforening', 'IF');
      shortClub = shortClub.replace('Skiskyttarlaget', 'SSL');
      shortClub = shortClub.replace('Skiskyttarlag', 'SSL');
      shortClub = shortClub.replace(' - Ski', '');
      shortClub = shortClub.replace('OL', '');
      shortClub = shortClub.replace('OK', '');
      shortClub = shortClub.replace('SK', '');
      shortClub = shortClub.trim();

      var del = (shortClub.substring(0, 5) == "<del>");
      shortClub = shortClub.replace("<del>", "");
      shortClub = shortClub.replace("</del>", "");

      var lastDiv = shortClub.lastIndexOf("-");
      var legNoStr = shortClub.substr(lastDiv);
      var tooLong = (shortClub.length > _this.maxClubLength);
      if (!isNaN(legNoStr) && lastDiv > 0)
        shortClub = shortClub.substring(0, Math.min(lastDiv, _this.maxClubLength)) + legNoStr;
      else
        shortClub = shortClub.substring(0, _this.maxClubLength)
      if (tooLong)
        shortClub = shortClub + "..";
      if (del)
        shortClub = "<del>" + shortClub + "</del>";

      return shortClub;
    };

    // Filter rows in table
    AjaxViewer.prototype.filterTable = function () {
      var table = this.currentTable;
      table.search($('#' + this.filterDiv)[0].value).draw();
    };

    // Insert bib and search (speaker view)
    AjaxViewer.prototype.searchBib = function (bib) {
      $('#searchBib').val(bib);
      this.searchRunner();
    }

    // Search runner in speaker view
    AjaxViewer.prototype.searchRunner = function () {
      var searchText = $('#searchBib')[0].value;
      var bib = searchText.match(/\d+/g);
      var ind = -1;
      var runnerText = "Ukjent startnummer";
      if (bib != null) {
        var ind = this.runnerList.runners.findIndex(x => Math.abs(x.bib) == bib);
        if (ind > -1) {
          runnerText = "(" + bib + ") " + this.runnerList.runners[ind].name + ", "
            + this.runnerList.runners[ind].club + ", " + this.runnerList.runners[ind].class + ", "
            + this.runnerList.runners[ind].start;
          this.highlightID = this.runnerList.runners[ind].dbid;
          if (this.curClassName == this.runnerList.runners[ind].class) {
            var tableData = this.currentTable.data().toArray();
            this.setHighlight(tableData, this.highlightID);
            this.currentTable.clear();
            this.currentTable.rows.add(tableData).draw();
          }
          else
            this.chooseClass(this.runnerList.runners[ind].class);
        }
      }
      $('#searchRunner').html(runnerText);
      if (ind == -1 && this.highlightID != null) {
        this.highlightID = null;
        var tableData = this.currentTable.data().toArray();
        this.setHighlight(tableData, this.highlightID);
        this.currentTable.clear();
        this.currentTable.rows.add(tableData).draw();
      }
    };

    //Popup window for setting ecard to checked
    AjaxViewer.prototype.popupCheckedEcard = function (dbid, name, ecards, checked) {
      _this = this;
      var message;
      if (checked)
        message = "Ta bort markering for " + name + "?";
      else
        message = "Bekrefte: " + name + (ecards.length > 0 ? ", brikke " + ecards : "") + "?";
      $('<p>' + message + '</p>').confirm(function (e) {
        if (e.response) {
          if (checked)
            $.ajax({
              url: _this.messageURL + "?method=setecardnotchecked",
              data: "&comp=" + _this.competitionId + "&dbid=" + dbid,
              error: function () { alert("Meldingen kunne ikke sendes. Ikke nett?"); }
            });
          else
            $.ajax({
              url: _this.messageURL + "?method=setecardchecked",
              data: "&comp=" + _this.competitionId + "&dbid=" + dbid,
              error: function () { alert("Meldingen kunne ikke sendes. Ikke nett?"); }
            });
        }
      });
    }

    //Popup window for messages to message center
    AjaxViewer.prototype.popupDialog = function (promptText, dbid, defaultDNS, startListChange = -1) {
      _this = this;
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
              data: "&comp=" + _this.competitionId + "&dbid=" + dbid + "&message=" + message + "&dns=" + DNS + "&ecardchange=" + ecardChange,
              error: function () { alert("Meldingen kunne ikke sendes. Ikke nett?"); }
            });
          if (DNS)
            _this.messageBibs.push(dbid);
        }
      }, defaultText);
    };

    //Popup window for requesting RaceSplitter file
    AjaxViewer.prototype.raceSplitterDialog = function () {
      var error = true;
      var interval = prompt("Start generering av RaceSplitter fil. Legg inn startintervall i sekunder:", 15);
      if (interval != null) {
        interval = interval.substring(0, 250); // limit number of characters
        if (interval.match(/\d+/g) != null);
        {
          interval = interval * 100;
          var firstStart = prompt("Legg inn første start (format HH:MM:SS)", "11:00:00");
          var a = firstStart.split(':'); // split it at the colons
          if (a.length == 3) {
            var firstStartcs = 100 * ((+a[0]) * 3600 + (+a[1]) * 60 + (+a[2]));
            if (firstStartcs >= 0) {
              error = false;
              $.ajax({
                url: this.apiURL + "?method=getracesplitter",
                data: "&comp=" + this.competitionId + "&firststart=" + firstStartcs + "&interval=" + interval,
                success: function (data) {
                  try {
                    var blob = new Blob([data], { type: "text/plain;charset=utf-8" });
                    saveAs(blob, "RaceSplitter.csv")
                  }
                  catch { }
                },
                dataType: "html"
              });
            }
          }
        };
      };
      if (error)
        window.alert("Feil input!");
    };

    // Check for updates in class
    AjaxViewer.prototype.checkForChanges = function () {
      var _this = this;
      if (this.inactiveTimer > this.inactiveTimeout) {
        alert('For lenge inaktiv. Trykk OK for å oppdatere.')
        this.inactiveTimer = 0;
      }
      if (this.updateAutomatically) {
        if (this.currentTable != null) {
          var preTime = new Date().getTime();
          $.ajax({
            url: this.apiURL,
            data: "comp=" + this.competitionId + "&method=getclasseslastchanged&last_hash=" + this.lastClassHash,
            success: function (data, status, resp) {
              var expTime = false;
              try {
                var postTime = new Date().getTime();
                var varTime = Math.max(1000, postTime - preTime); // Uncertainty in server time. Add 1000 to account for seconds resultion
                var reqTime = resp.getResponseHeader("date");
                if (reqTime) {
                  var newTimeDiff = postTime - (new Date(reqTime).getTime() + 500);
                  if (Math.abs(newTimeDiff - _this.serverTimeDiff) > varTime)
                    _this.serverTimeDiff = 0.9 * _this.serverTimeDiff + 0.1 * newTimeDiff;
                }
                expTime = new Date(resp.getResponseHeader("expires")).getTime();
              }
              catch { }
              _this.handleUpdateChanges(data, expTime);
            },
            error: function () {
              _this.resUpdateTimeout = setTimeout(function () { _this.checkForChanges(); }, _this.updateInterval);
            },
            dataType: "json"
          });
        }
      }
    };

    //handle response from class-change-update
    AjaxViewer.prototype.handleUpdateChanges = function (data, expTime) {
      if (this.curClassName == null)
        return;
      var _this = this;
      try {
        if (data.rt != undefined && data.rt > 0)
          this.updateInterval = data.rt * 1000;
        $('#updateinterval').html(this.updateInterval / 1000);
        if (expTime) {
          var lastUpdate = new Date();
          lastUpdate.setTime(expTime - this.updateInterval + 1000);
          $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
        }
        if (data.active && !$('#liveIndicator').find('span').hasClass('liveClient'))
          $('#liveIndicator').html('<span class="liveClient" id="liveIndicator">◉</span>');
        if (!data.active && !$('#liveIndicator').find('span').hasClass('notLiveClient'))
          $('#liveIndicator').html('<span class="notLiveClient" id="liveIndicator">◉</span>');
        if (data.status == "OK") {
          var index = data.lastchanged.findIndex(function (item) {
            return item.class === _this.curClassName;
          });
          this.lastClassHash = data.hash;
          if (data.lastchanged[index].lastchanged > this.lastChanged) {
            this.checkForClassUpdate();
            return;
          }
        }
      }
      catch { }
      if (this.isCompToday())
        this.resUpdateTimeout = setTimeout(function () { _this.checkForChanges(); }, _this.updateInterval);
    };


    //Check for updating of class results 
    AjaxViewer.prototype.checkForClassUpdate = function () {
      if (!this.updateAutomatically)
        return;
      var _this = this;
      if (this.inactiveTimer > this.inactiveTimeout) {
        alert('For lenge inaktiv. Trykk OK for å oppdatere.')
        this.inactiveTimer = 0;
      }

      if (this.currentTable != null) {
        var preTime = new Date().getTime();
        var URLextra, headers;
        if (this.Time4oServer) {
          URLextra = "race/" + this.competitionId + "/entry?raceClassId=" +
            this.activeClasses?.find(c => c.className === this.curClassName).id;
          headers = this.lastClassHash ? { 'If-None-Match': this.lastClassHash } : {};
        }
        else {
          URLextra = "?comp=" + this.competitionId + "&method=getclassresults&unformattedTimes=true&class="
            + encodeURIComponent(this.curClassName) + "&nosplits=" + this.noSplits +
            "&last_hash=" + this.lastClassHash + (this.isMultiDayEvent ? "&includetotal=true" : "")
          headers = {};
        }
        $.ajax({
          url: this.apiURL + URLextra,
          headers: headers,
          success: function (data, status, resp) {
            var expTime = false;
            try {
              var postTime = new Date().getTime();
              var varTime = Math.max(1000, postTime - preTime); // Uncertainty in server time. Add 1000 to account for seconds resultion
              var reqTime = resp.getResponseHeader("date");
              if (reqTime) {
                var newTimeDiff = postTime - (new Date(reqTime).getTime() + 500);
                if (!_this.Time4oServer && Math.abs(newTimeDiff - _this.serverTimeDiff) > varTime)
                  _this.serverTimeDiff = 0.9 * _this.serverTimeDiff + 0.1 * newTimeDiff;
              }
              if (_this.Time4oServer) {
                expTime = new Date(resp.getResponseHeader("date")).getTime() + _this.updateInterval;
                if (resp.status == 200) {
                  _this.lastClassHash = resp.getResponseHeader("etag").slice(1, -1);
                  data.status = "OK";
                }
                else if (resp.status == 304) {
                  data = { status: "NOT MODIFIED" };
                };
                data.rt = _this.updateInterval / 1000;
              }
              else
                expTime = new Date(resp.getResponseHeader("expires")).getTime();
            }

            catch { }
            _this.handleUpdateClassResults(data, expTime);
          },
          error: function () {
            _this.resUpdateTimeout = setTimeout(function () { _this.checkForClassUpdate(); }, _this.updateInterval);
          },
          dataType: "json"
        });
      }

    };

    //handle response from class-results-update
    AjaxViewer.prototype.handleUpdateClassResults = function (newData, expTime) {
      if (this.curClassName == null)
        return;
      try {
        if (newData.rt != undefined && newData.rt > 0)
          this.updateInterval = newData.rt * 1000;
        $('#updateinterval').html(this.updateInterval / 1000);
        if (expTime) {
          var lastUpdate = new Date();
          lastUpdate.setTime(expTime - this.updateInterval + 1000);
          $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
        }
        if (this.EmmaServer || this.Time4oServer)
          $('#liveIndicator').html('');
        else {
          if (newData.active && !$('#liveIndicator').find('span').hasClass('liveClient'))
            $('#liveIndicator').html('<span class="liveClient" id="liveIndicator">◉</span>');
          if (!newData.active && !$('#liveIndicator').find('span').hasClass('notLiveClient'))
            $('#liveIndicator').html('<span class="notLiveClient" id="liveIndicator">◉</span>');
        }
        var _this = this;
        var table = this.currentTable;
        if (newData.status == "OK") {
          if (this.Time4oServer) {
            const classInfo = this.activeClasses?.find(c => c.className === this.curClassName) ?? null;
            if (classInfo == null)
              return;
            newData = this.Time4oResultsToLiveres(newData, classInfo);
            if (newData.updatedSplits.some(v => v))
              this.updateSplitPlaces(newData, newData.updatedSplits);
            newData.className = this.curClassName;
            newData.splitcontrols = classInfo.splitcontrols;
          }
          clearTimeout(this.updatePredictedTimeTimer);
          if (this.animating) // Wait until animation is completed
          {
            setTimeout(function () { _this.handleUpdateClassResults(newData, expTime); }, 100);
            return;
          }
          if (table != null && newData.results != null && newData.results.length > 0) {
            $('#divInfoText').html(newData.infotext);

            var oldResults = $.extend(true, [], table.data().toArray());
            var posLeft = $(table.table().container()).find('.dt-scroll-body').scrollLeft();
            var scrollX = window.scrollX;
            var scrollY = window.scrollY;
            var oldColumnVisibility = table.columns().visible().toArray();
            var oldClassSplitOK = this.curClassSplitsOK;

            this.curClassNumberOfRunners = newData.results.length;
            $('#numberOfRunners').html(this.curClassNumberOfRunners);
            this.checkRadioControls(newData);
            this.updateClassSplitsBest(newData);
            this.updateResultVirtualPosition(newData.results);
            this.predData = $.extend(true, [], newData.results);
            if (this.highlightID != null)
              this.setHighlight(newData.results, this.highlightID);
            if (this.qualLimits != null && this.qualLimits.length > 0)
              this.updateQualLimMarks(newData.results, newData.className);

            table.clear();
            table.rows.add(newData.results).draw();

            // Restore the visibility state after reloading data
            oldColumnVisibility.forEach((isVisible, index) => {
              table.column(index).visible(isVisible);
            });

            // Hide columns if split is BAD
            if (this.curClassSplits != null && this.curClassSplits.length > 0) {
              var offset = 3 + (this.curClassHasBibs ? 1 : 0) + ((this.curClassIsUnranked || (this.compactView && !this.curClassLapTimes)) ? 1 : 0);
              for (var sp = 0; sp < this.curClassNumSplits; sp++) {
                colNum = offset + 2 * sp;
                if (this.curClassSplitsOK[sp] == false) // Hide column if split is or has become BAD
                  table.column(colNum).visible(false);
                else if (oldClassSplitOK[sp] == false) // Show column if split has become OK
                  table.column(colNum).visible(true);
                // Else keep the column as it is
              }
            }

            this.updatePredictedTimes(true); // Insert times only
            $(table.table().container()).find('.dt-scroll-body').scrollLeft(posLeft);
            window.scrollTo(scrollX, scrollY);
            var newResults = table.data().toArray();
            this.animateTable(oldResults, newResults, this.animTime);

            if (!newData.lastChanged && !this.Time4oServer)
              this.lastClassHash = newData.hash;

            setTimeout(function () { _this.startPredictedTimeTimer(); }, _this.animTime + 200);
          }
        }
      }
      catch { }
      if (this.isCompToday()) {
        if (newData.lastchanged) {
          this.lastChanged = newData.lastchanged;
          this.resUpdateTimeout = setTimeout(function () { _this.checkForChanges(); }, _this.updateInterval);
        }
        else
          this.resUpdateTimeout = setTimeout(function () { _this.checkForClassUpdate(); }, _this.updateInterval);
      }
    };

    AjaxViewer.prototype.animateTable = function (oldData, newData, animTime, predRank = false, clubTable = false) {
      // Animate an update to date table
      // Based on jQuery Animated Table Sorter 0.2.2 (02/25/2013)
      // http://www.matanhershberg.com/plugins/jquery-animated-table-sorter/

      if (this.animating)
        return
      try {
        var _this = this;
        var isResTab = (newData[0].virtual_position != undefined);

        // Make list of indexes and progress for all runners 
        var prevInd = new Object();  // List of old indexes
        var prevProg = new Object(); // List of old progress
        for (var i = 0; i < oldData.length; i++) {
          var oldID;
          if (this.EmmaServer)
            oldID = oldData[i].name + oldData[i].club;
          else if (!isResTab && oldData[i].controlName != undefined)
            oldID = oldData[i].controlName + oldData[i].dbid;
          else
            oldID = oldData[i].dbid;
          if (prevInd[oldID] != undefined) {
            prevInd[oldID] = "noAnimation"; // Skip if two identical ID
          }
          else {
            prevInd[oldID] = (isResTab ? oldData[i].virtual_position : i);
            prevProg[oldID] = (isResTab && !clubTable ? oldData[i].progress : 100);
          }
        }

        var lastInd = new Object(); // List of last index for updated entries
        var updProg = new Object(); // List of progress change
        for (var i = 0; i < newData.length; i++) {
          var newID;
          if (this.EmmaServer)
            newID = newData[i].name + newData[i].club;
          else if (!isResTab && newData[i].controlName != undefined)
            newID = newData[i].controlName + newData[i].dbid;
          else
            newID = newData[i].dbid;
          var newInd = (isResTab ? newData[i].virtual_position : i);
          if (prevInd[newID] != undefined && prevInd[newID] != "noAnimation" && prevInd[newID] != newInd) {
            lastInd[newInd] = prevInd[newID];
            updProg[newInd] = (isResTab ? prevProg[newID] != newData[i].progress : false);
          }
        }
        if (Object.keys(lastInd).length == 0) { // No modifications
          if (predRank)
            this.startPredictedTimeTimer();
          else if (clubTable)
            this.updateClubTimes();
          return;
        }

        var order = this.currentTable.order();
        var numCol = this.currentTable.settings().columns()[0].length;
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
          this.currentTable.fixedHeader.disable();

        var table = (isResTab ? $('#' + this.resultsDiv) : $('#' + this.radioPassingsDiv));

        // Set each td's width
        var column_widths = new Array();
        $(table).find('tr:first-child th').each(function () {
          column_widths.push($(this)[0].getBoundingClientRect().width);
        });
        $(table).find('tr td, tr th').each(function () { $(this).css('min-width', column_widths[$(this).index()]); });

        // Set table height and width
        var height = $(table).outerHeight();

        // Put all the rows back in place
        var rowPosArray = new Array();
        var rowIndArray = new Array();
        var ind = -1; // -1:header; 0:first data
        var tableTop = $(table)[0].getBoundingClientRect().top;
        $(table).find('tr').each(function () {
          var rowPos = $(this)[0].getBoundingClientRect().top - tableTop;
          $(this).css('top', rowPos);
          if ($(this).is(":visible")) {
            rowPosArray.push(rowPos);
            rowIndArray.push(ind);
          }
          ind++;
        });
        $(table).height(height).width('100%');
        $(table).css({ 'table-layout': 'fixed' });

        // Set table cells position to absolute
        $(table).find('tbody tr').each(function () {
          $(this).css('position', 'absolute').css('z-index', '-9');;
        });

        // Animation
        for (var lastIndStr in lastInd) {
          var newInd = parseInt(lastIndStr);
          var oldInd = lastInd[newInd];
          var oldPos = rowPosArray[oldInd + 1]; // First entry is header
          var newPos = rowPosArray[newInd + 1];
          var row = $(table).find("tbody tr").eq(rowIndArray[newInd + 1]);
          var oldOpacity = (oldInd % 2 == 0 ? 0.08 : 0);
          var newOpacity = (newInd % 2 == 0 ? 0.08 : 0);
          var zind;
          if (predRank) // Update from predictions of running times         
            zind = (newInd == 0 ? -4 : (newInd > oldInd ? -5 : -7));
          else // Updates from new data from server
            zind = (updProg[newInd] ? -5 : -7);

          $(row).css('z-index', zind);

          var translateOld = "translate3d(0," + (oldPos - newPos) + "px,0)";
          var translateNew = "translate3d(0,0,0)";

          // Set the initial position instantly
          $(row).css({
            'transition': 'none',
            'transform': translateOld
          });
          // Force a reflow to ensure the browser registers the initial position
          $(row)[0].offsetHeight;
          // Set the new position with a transition
          $(row).css({
            'transition': 'transform ' + _this.animTime + 'ms',
            'transform': translateNew,
          });

          $(row).find('td').each(function () {
            if (Object.keys(lastInd).length < 10) { // Drop animation of background color for large updates
              $(this).css('box-shadow', 'inset 0 0 0 9999px rgba(0, 0, 0, ' + oldOpacity + ')');
              $(this)[0].offsetHeight;
              $(this).css({
                'transition': 'box-shadow ' + _this.animTime + 'ms',
                'box-shadow': 'inset 0 0 0 9999px rgba(0, 0, 0, ' + newOpacity + ')'
              });
            }
            else
              $(this).css({
                'transition': 'none',
                'box-shadow': 'inset 0 0 0 9999px rgba(0, 0, 0, ' + newOpacity + ')'
              });
          });
        }
        setTimeout(function () { _this.endAnimateTable(table, predRank, clubTable) }, _this.animTime + 100);
      }
      catch {
        this.animating = false;
        if (!this.currentTable.fixedHeader.enabled()) {
          this.currentTable.fixedHeader.enable();
        }
        if (predRank)
          this.startPredictedTimeTimer();
      }
    };

    // Reset settings after animation is completed
    AjaxViewer.prototype.endAnimateTable = function (table, predRank, clubTable) {
      $(table).find('tr td, tr th').each(function () { $(this).css('min-width', ''); });
      $(table).find('tr').each(function () {
        $(this).css('position', '');
      });
      $(table).height(0).width('100%');
      $(table).css({ 'table-layout': 'auto' });
      this.animating = false;
      if (!this.currentTable.fixedHeader.enabled()) {
        this.currentTable.fixedHeader.enable();
      }
      if (predRank)
        this.startPredictedTimeTimer();
      else if (clubTable)
        this.updateClubTimes();
    };

    //Check for update in clubresults
    AjaxViewer.prototype.checkForClubUpdate = function () {
      var _this = this;
      if (this.inactiveTimer >= this.inactiveTimeout) {
        alert('For lenge inaktiv. Trykk OK for å oppdatere.')
        this.inactiveTimer = 0;
      }
      if (!this.updateAutomatically || this.currentTable == null)
        return;

      var URLextra, headers;
      if (this.Time4oServer) {
        URLextra = "race/" + this.competitionId + "/entry?organisationId=" + this.curClubName;
        headers = this.lastClubHash ? { 'If-None-Match': this.lastClubHash } : {};
      }
      else {
        URLextra = "?comp=" + this.competitionId + "&method=getclubresults&unformattedTimes=true&club="
          + encodeURIComponent(this.curClubName) + "&last_hash=" + this.lastClubHash
          + (this.isMultiDayEvent ? "&includetotal=true" : "");
        headers = {};
      }

      $.ajax({
        url: this.apiURL + URLextra,
        headers: headers,
        dataTable: "json",
        success: function (data, status, resp) {
          var expTime = new Date();
          if (_this.Time4oServer) {
            expTime.setTime(new Date(resp.getResponseHeader("date")).getTime() + _this.clubUpdateInterval);
            if (resp.status == 200) {
              _this.lastClubHash = resp.getResponseHeader("etag").slice(1, -1);
              data.status = "OK";
            }
            else if (resp.status == 304) {
              data = { status: "NOT MODIFIED" };
            };
            data.rt = _this.clubUpdateInterval / 1000;
          }
          else
            expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
          _this.handleUpdateClubResults(data, expTime);
        },
        error: function () {
          _this.resUpdateTimeout = setTimeout(function () { _this.checkForClubUpdate(); }, _this.clubUpdateInterval);
        }
      });
    };

    //handle the response on club-results update
    AjaxViewer.prototype.handleUpdateClubResults = function (data, expTime) {
      var _this = this;
      if (this.curClubName == null)
        return;
      if (data.rt != undefined && data.rt > 0)
        this.clubUpdateInterval = data.rt * 1000;
      $('#updateinterval').html(this.clubUpdateInterval / 1000);
      if (expTime) {
        var lastUpdate = new Date();
        lastUpdate.setTime(expTime - this.clubUpdateInterval + 1000);
        $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
      }
      var table = this.currentTable;
      if (data.status == "OK" && this.currentTable != null) {
        if (this.Time4oServer)
          data = this.Time4oClubResultsToLiveres(data, this.activeClasses);
        clearTimeout(this.updatePredictedTimeTimer);
        var numberOfRunners = data.results.length;
        $('#numberOfRunners').html(numberOfRunners);
        var oldColumnVisibility = table.columns().visible().toArray();
        var posLeft = $(table.table().container()).find('.dt-scroll-body').scrollLeft();
        var scrollX = window.scrollX;
        var scrollY = window.scrollY;
        if (data && data.results) {
          $.each(data.results, function (idx, res) {
            res.placeSortable = res.place;
            if (res.place == "-")
              res.placeSortable = 999999;
            if (res.place == "")
              res.placeSortable = 9999;
            if (res.place == "F")
              res.placeSortable = 0;
          });
        }
        var oldData = $.extend(true, [], this.currentTable.data().toArray());
        table.clear();
        table.rows.add(data.results).draw();
        // Restore the visibility state after reloading data
        oldColumnVisibility.forEach((isVisible, index) => {
          table.column(index).visible(isVisible);
        });
        this.updateClubOrder(); // Update position in table
        this.updateClubTimes(false); // Insert times and highlights only
        $(table.table().container()).find('.dt-scroll-body').scrollLeft(posLeft);
        window.scrollTo(scrollX, scrollY)
        this.animateTable(oldData, data.results, this.animTime, false, true);
        if (!this.Time4oServer)
          this.lastClubHash = data.hash;
      }
      if (_this.isCompToday()) {
        this.resUpdateTimeout = setTimeout(function () { _this.checkForClubUpdate(); }, _this.clubUpdateInterval);
      }
    };

    AjaxViewer.prototype.updateClubOrder = function () {
      const table = this.currentTable;
      table.rows({ order: 'applied' }).every(function (rowIdx, tableLoop, rowLoop) {
        rowData = this.data();
        rowData.virtual_position = rowLoop;
      });
    }

    AjaxViewer.prototype.chooseClass = function (className) {
      if (className.length == 0)
        return;
      var _this = this;
      clearTimeout(this.resUpdateTimeout);
      clearTimeout(this.updatePredictedTimeTimer);
      this.inactiveTimer = 0;
      if (this.currentTable != null && DataTable.isDataTable('#' + this.resultsDiv)) {
        try {
          this.currentTable.destroy();
        }
        catch { }
      }

      // Remove dropdown class list
      $('#classColumnContent').removeClass('open').addClass('closed');
      $('#divResults').html('');
      $('#divLivelox').html('');
      this.curClassName = className;
      this.curClubName = null;
      this.curSplitView = null;
      this.curRelayView = null;
      $('#resultsHeader').html(this.resources["_LOADINGRESULTS"]);
      var preTime = new Date().getTime();
      var callStr;
      if (className == "plainresults")
        callStr = "&method=getplainresults&unformattedTimes=true";
      else if (className == "plainresultstotal")
        callStr = "&method=getplainresults&unformattedTimes=true&includetotal=true";
      else if (className.includes("plainresultsclass_"))
        callStr = "&method=getplainresults&unformattedTimes=true&classmask=" + className.replace("plainresultsclass_", "");
      else if (className == "startlist")
        callStr = "&method=getstartlist";
      else { // Normal class
        var includeTotal = (this.isMultiDayEvent && className.indexOf("course::") != 0);
        callStr = "&method=getclassresults&unformattedTimes=true&class=" + encodeURIComponent(className) + "&nosplits=" + this.noSplits + (includeTotal ? "&includetotal=true" : "");
        if (className.indexOf("course::") != 0 && this.LiveloxID > 0) {
          let LiveloxLink = 'https://www.livelox.com/Viewer?eventId=' + this.LiveloxID + '&className=' + encodeURIComponent(className);
          $('#divLivelox').html('<a href="' + LiveloxLink + '">Livelox <img src="images/livelox32x32.png" style="height:1em;"></a>');
        }
      }

      var URLextra;
      if (this.Time4oServer) {
        URLextra = "race/" + this.competitionId + "/entry";
        if (className != "startlist" && className != "plainresults")
          URLextra += "?raceClassId=" +
            this.activeClasses?.find(c => c.className === this.curClassName).id;
      }
      else {
        URLextra = "?comp=" + this.competitionId + callStr;
      }

      $.ajax({
        url: this.apiURL + URLextra,
        headers: {},
        success: function (data, status, resp) {
          var expTime = false;
          try {
            var postTime = new Date().getTime();
            var varTime = Math.max(1000, postTime - preTime); // Uncertainty in server time. Add 1000 to account for seconds resultion
            var reqTime = resp.getResponseHeader("date");
            if (reqTime) {
              var newTimeDiff = postTime - (new Date(reqTime).getTime() + 500);
              if (Math.abs(newTimeDiff - _this.serverTimeDiff) > 1.5 * varTime)
                _this.serverTimeDiff = newTimeDiff;
            }
            if (_this.Time4oServer && resp.status === 200) {
              expTime = new Date(resp.getResponseHeader("date")).getTime() - _this.updateInterval;
              _this.lastClassHash = resp.getResponseHeader("etag").slice(1, -1);
              data.status = "OK";
              data.type = (className === "startlist" ? "startList" : className === "plainresults" ? "plainResults" : "classResults");
              data.rt = _this.updateInterval / 1000;
            }
            else
              expTime = new Date(resp.getResponseHeader("expires")).getTime();
          }
          catch { }
          _this.updateClassResults(data, expTime);
        },
        dataType: "json"
      });
      if (!this.isSingleClass)
        window.location.hash = className;
    };

    AjaxViewer.prototype.updateClassResults = function (data, expTime) {
      if (this.curClassName == null)
        return;

      if (data != null && data.rt != undefined && data.rt > 0)
        this.updateInterval = data.rt * 1000;
      if (data != null && data.lastchanged != undefined)
        this.lastChanged = data.lastchanged;

      if (expTime) {
        var lastUpdate = new Date();
        lastUpdate.setTime(expTime - this.updateInterval + 1000);
        $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
      }
      var _this = this;
      if (data != null && data.status == "OK") {
        if (this.Time4oServer) {
          if (data.type == 'startList' || data.type == 'plainResults') {
            data = this.Time4oResultsToLiveres(data, this.activeClasses);
          }
          else {
            const classInfo = this.activeClasses?.find(c => c.className === this.curClassName) ?? null;
            if (classInfo == null)
              return;
            data = this.Time4oResultsToLiveres(data, classInfo);
            if (data.updatedSplits.some(v => v))
              this.updateSplitPlaces(data, data.updatedSplits);
          }
        }
        $('#divInfoText').html(data.infotext);
        if (data.className != null) {
          var courseResults = data.className.indexOf("course::") == 0;
          if (data.className == "plainresults") {
            $('#' + this.resultsHeaderDiv).html("<b>Alle klasser</b>");
            $('#' + this.txtResetSorting).html("");
          }
          else if (data.className == "plainresultstotal") {
            $('#' + this.resultsHeaderDiv).html("<b>Sammenlagt alle klasser</b>");
            $('#' + this.txtResetSorting).html("");
          }
          else if (data.className.includes("plainresultsclass_")) {
            $('#' + this.resultsHeaderDiv).html("<b>" + data.className.replace("plainresultsclass_", "") + "</b>");
            $('#' + this.txtResetSorting).html("");
          }
          else if (data.className == "startlist") {
            $('#' + this.resultsHeaderDiv).html("<b>Startliste</b>");
            $('#' + this.txtResetSorting).html("");
          }
          else { // Course or class results
            var headerName;
            var link = "";
            if (courseResults) {// Course results
              headerName = data.courseName;
              var courseNo = data.className.replace("course::", "");
              if (this.showEcardTimes)
                link = this.splitTimesLink("AllClasses", [courseNo]);
            }
            else {// Class results
              headerName = data.className;
              var courses = this.courses[data.className];
              if (this.showEcardTimes && courses != undefined && courses.length > 0)
                link = this.splitTimesLink(data.className, courses);
            }
            var distance = (data.distance != undefined && data.distance != "" ? "&emsp;<small>" + data.distance + " km</small>" : "");
            var nameDistance = "<b>" + headerName + "</b>" + distance;
            $('#' + this.resultsHeaderDiv).html(nameDistance);
            $("#" + this.txtResetSorting).html(link);
          }
          $('#' + this.resultsControlsDiv).show();
        }

        if (data.className.includes("plainresults")) {
          $('#updateinterval').html("- ");
          $('#liveIndicator').html('');
          var hasDistance = false;
          $.each(data.results, function (idx, res) {
            if (res.distance != "") {
              hasDistance = true;
              return false;
            }
          });
          var res = "";
          var isSprint = (data.className.includes("plainresultsclass"));
          if (isSprint)
            res += "<tr>";
          var sprintStageLast = -1;
          var first = true;
          for (var i = 0; i < data.results.length; i++) {
            var className = data.results[i].className;
            var classNameHeader = className;
            var distance = (data.results[i].distance != "" ? "&emsp;" + data.results[i].distance + " km" : "");

            var sprintStage = (className.includes('| Prolog') ? 0 : (
              className.includes('| Kvart') ? 1 : (
                className.includes('| Semi') ? 2 : (
                  className.includes('| Finale') ? 3 : -1))));
            var isSprintHeat = sprintStage > 0;

            if (isSprint) {
              if (first)
                res += "<td style=\"vertical-align:top\"><table style=\"width:100%;\">";
              else if (sprintStage != sprintStageLast)
                res += "</table></td><td style=\"vertical-align:top\"><table style=\"width:100%;\">";
              sprintStageLast = sprintStage;
              first = false;
              var classPre = data.className.replace("plainresultsclass_", "") + " | ";
              classNameHeader = className.replace(classPre, "");
            }

            res += "<tr style=\"background-color:#E6E6E6;\"><td colspan=6><span style=\"font-weight:bold; font-size: 1.3em\">&nbsp;" + classNameHeader + "</span>";
            res += distance + "</td></tr>";
            res += "<tr style=\"font-weight:bold\"><td align=\"right\">#</td><td>" + this.resources["_NAME"] + "</td>"
            if (!isSprintHeat)
              res += "<td>" + this.resources["_CLUB"] + "</td>";
            res += "<td align=\"right\">Tid</td><td align=\"right\">Diff</td>";
            if (!isSprintHeat && hasDistance)
              res += "<td align=\"right\">m/km&nbsp;</td>";
            res + "</tr>";
            for (var j = 0; j < data.results[i].results.length; j++) {
              var time = data.results[i].results[j].result;
              var kmTime = data.results[i].results[j].pace;
              var name = data.results[i].results[j].name;
              if (name.length > this.maxNameLength)
                name = this.nameShort(name);
              var club = data.results[i].results[j].club;
              if (club.length > this.maxClubLength)
                club = this.clubShort(club);
              res += "<tr><td align=\"right\">" + data.results[i].results[j].place + "</td>";
              res += "<td>" + name + "</td>";
              if (!isSprintHeat)
                res += "<td>" + club + "</td>";
              if (isSprintHeat && !this.showTimesInSprint)
                res += "<td></td><td></td>";
              else {
                res += "<td align=\"right\">" + this.formatTime(time, data.results[i].results[j].status, _this.showTenthOfSecond) + "</td>";
                res += "<td align=\"right\"><span class=plustime>"
                if (data.results[i].results[j].status == 0)
                  res += "+" + this.formatTime(data.results[i].results[j].timeplus, data.results[i].results[j].status, _this.showTenthOfSecond);
                res += "</span></td>";
              }
              if (!isSprintHeat && hasDistance) {
                res += "<td align=\"right\"><span class=plustime>";
                if (data.results[i].results[j].status == 0 && kmTime > 0)
                  res += this.formatTime(kmTime, 0, _this.showTenthOfSecond);
                res += "&nbsp;</span>";
              }
              res += "</tr>";
            }
            res += "<tr style=\"height: 10px\"><td colspan=5></td></tr>";
          }
          if (isSprint)
            res += "</table></td></tr>"
          $('#' + this.resultsDiv).html(res);
          if (this.Time4oServer)
            $('#numberOfRunners').html(String(data.numResults) + "/" + String(data.numEntries));
          else
            $('#numberOfRunners').html($("#numberOfRunnersTotal").html());
        }
        else if (data.className == "startlist") {
          $('#updateinterval').html("- ");
          $('#liveIndicator').html('');
          var res = "";
          for (var i = 0; i < data.results.length; i++) {
            var distance = (data.results[i].distance != "" ? "&emsp;" + data.results[i].distance + " km" : "");
            res += "<tr style=\"background-color:#E6E6E6;\"><td colspan=5><span style=\"font-weight:bold; font-size: 1.3em\">&nbsp;" + data.results[i].className + "</span>";
            res += distance + "</td></tr>";
            res += "<tr style=\"font-weight:bold\"><td align=\"right\">&#8470;</td><td>" + this.resources["_NAME"] + "</td><td>" + this.resources["_CLUB"] + "</td>";
            res += "<td align=\"right\">" + this.resources["_START"] + "</td><td align=\"right\">Brikke&nbsp;</td></tr>"
            for (var j = 0; j < data.results[i].results.length; j++) {
              var name = data.results[i].results[j].name;
              if (name.length > this.maxNameLength)
                name = this.nameShort(name);
              var club = data.results[i].results[j].club;
              if (club.length > this.maxClubLength)
                club = this.clubShort(club);

              var bibRaw = data.results[i].results[j].bib;
              var bib = "";
              if (bibRaw < 0)         // Relay
                bib = (-bibRaw / 100 | 0) + "-" + (-bibRaw % 100);
              else if (bibRaw > 0)   // Ordinary
                bib = bibRaw;

              var ecards = "";
              if (data.results[i].results[j].ecard1 > 0) {
                ecards += data.results[i].results[j].ecard1;
                if (data.results[i].results[j].ecard2 > 0)
                  ecards += " / " + data.results[i].results[j].ecard2;
              }
              else if (data.results[i].results[j].ecard2 > 0)
                ecards += data.results[i].results[j].ecard2;

              var delPre = (data.results[i].results[j].status == 1 ? "<del>" : "");
              var delPost = (data.results[i].results[j].status == 1 ? "</del>" : "");

              res += "<tr><td align=\"right\">" + delPre + bib + delPost + "</td>";
              res += "<td>" + delPre + name + delPost + "</td>";
              res += "<td>" + delPre + club + delPost + "</td>";
              res += "<td align=\"right\">" + delPre + _this.formatTime(data.results[i].results[j].start, 0, false, true, true, true) + delPost + "</td>";
              res += "<td align=\"right\"><span class=small>" + delPre + ecards + delPost + "</span>&nbsp;</td>";
              res += "</tr>";
            }
            res += "<tr style=\"height: 10px\"><td colspan=5></td></tr>";
          }
          $('#' + this.resultsDiv).html(res);
          var NumRunText = "";
          if (this.Time4oServer)
            NumRunText = String(data.numEntries);
          else {
            NumRunText = $("#numberOfRunnersTotal").html();
            NumRunText += "</br><a href=\"javascript:res.raceSplitterDialog();\">Lag RaceSplitter fil</a>";
          }
          $('#numberOfRunners').html(NumRunText);
        }
        else if (data.results != null && data.results.length == 0) {
          $('#numberOfRunners').html('<span style=\"font-weight:bold; font-size: 2em\">Ingen løpere i klassen.</span>');
        }
        else if (data.results != null && data.results.length > 0) {
          $('#updateinterval').html(this.updateInterval / 1000);
          if (this.EmmaServer)
            $('#liveIndicator').html('');
          else if (data.active)
            $('#liveIndicator').html('<span class="liveClient" id="liveIndicator">◉</span>');
          else
            $('#liveIndicator').html('<span class="notLiveClient" id="liveIndicator">◉</span>');

          var haveSplitControls = (data.splitcontrols != null) && (data.splitcontrols.length > 0);
          this.curClassSplits = data.splitcontrols;
          this.curClassIsRelay = (haveSplitControls && this.curClassSplits[0].code == "0");
          this.curClassLapTimes = (haveSplitControls && this.curClassSplits[0].code != "0" && this.curClassSplits.length > 1 && this.curClassSplits[this.curClassSplits.length - 1].code == "999");
          this.curClassIsUnranked = !(this.curClassSplits.every(function check(el) { return el.code != "-999"; })) || !(data.results.every(function check(el) { return el.status != 13; }));
          this.curClassHasBibs = (data.results[0].bib != undefined && data.results[0].bib != 0);
          this.curClassIsCourse = (data.results[0].class != undefined && !this.Time4oServer);
          this.curClassIsMassStart = (this.checkForMassStart(data) || this.curClassIsRelay);
          this.compactView = !(this.curClassIsRelay || this.curClassLapTimes || this.isMultiDayEvent);
          var fullView = !this.compactView;

          if (this.curClassSplits == null)
            this.curClassNumSplits = 0;
          else if (this.curClassIsRelay)
            this.curClassNumSplits = this.curClassSplits.length / 2 - 1;
          else if (this.curClassLapTimes)
            this.curClassNumSplits = (this.curClassSplits.length - 1) / 2;
          else
            this.curClassNumSplits = this.curClassSplits.length;

          this.curClassSplitsOK = new Array(this.curClassNumSplits).fill(true);
          this.checkRadioControls(data);
          this.updateClassSplitsBest(data);
          this.updateResultVirtualPosition(data.results);
          this.predData = $.extend(true, [], data.results);
          if (this.highlightID != null)
            this.setHighlight(data.results, this.highlightID);
          if (this.qualLimits != null && this.qualLimits.length > 0)
            this.updateQualLimMarks(data.results, data.className);

          this.curClassNumberOfRunners = data.results.length;
          $('#numberOfRunners').html(this.curClassNumberOfRunners);

          var columns = Array();
          var col = 0;
          var isRelayClass = this.relayClasses.includes(data.className);
          var isSprintHeat = (data.className.includes('| Kvart') || data.className.includes('| Semi') || data.className.includes('| Finale'));

          columns.push({
            name: "place",
            title: "#",
            className: "dt-right",
            orderable: false,
            targets: [col++],
            data: "place",
            width: (_this.fixedTable ? "5%" : null),
            render: function (data) {
              return data;
            }
          });

          if (isRelayClass) {
            if (!haveSplitControls || !fullView)
              columns.push({
                name: "club",
                title: this.resources["_CLUB"],
                className: "dt-left",
                orderable: false,
                targets: [col++],
                data: "club",
                render: function (data, type, row) {
                  var param = (_this.Time4oServer ? row.clubId : row.club);
                  var clubShort = row.club;
                  if (param && param.length > 0)
                    param = param.replace('\'', '\\\'');
                  if (clubShort.length > _this.maxClubLength)
                    clubShort = _this.clubShort(clubShort);
                  return "<a class=\"relayclub\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                }
              });
            columns.push({
              name: "name",
              title: (haveSplitControls && fullView) ? this.resources["_CLUB"] + " / " + this.resources["_NAME"] : this.resources["_NAME"],
              className: "dt-left",
              orderable: false,
              targets: [col++],
              data: "name",
              render: function (data, type, row) {
                var param = (_this.Time4oServer ? row.clubId : row.club);
                var clubShort = row.club;
                var nameShort = row.name;
                if (row.name.length > _this.maxNameLength)
                  nameShort = _this.nameShort(row.name);
                if (param && param.length > 0)
                  param = param.replace('\'', '\\\'');
                if (clubShort.length > _this.maxClubLength)
                  clubShort = _this.clubShort(clubShort);
                var clubLink =
                  "<a class=\"relayclub\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                return (haveSplitControls && fullView ? clubLink + "<br>" + nameShort : nameShort);
              }
            });
          }
          else // Not curClassIsRelay
          {
            if (!(haveSplitControls || _this.isMultiDayEvent) || _this.curClassIsUnranked || (!fullView && !_this.curClassLapTimes))
              columns.push({
                name: "name2",
                title: this.resources["_NAME"],
                className: "dt-left",
                orderable: false,
                targets: [col++],
                data: "name",
                width: (_this.fixedTable ? "30%" : null),
                render: function (data, type) {
                  if (type === 'display')
                    return (data.length > _this.maxNameLength ? _this.nameShort(data) : data);
                  else
                    return data;
                }
              });

            columns.push({
              name: "club2",
              title: ((haveSplitControls || _this.isMultiDayEvent) && !_this.curClassIsUnranked && (fullView || _this.curClassLapTimes)) ? this.resources["_NAME"] + " / " + this.resources["_CLUB"] : this.resources["_CLUB"],
              className: "dt-left",
              orderable: false,
              targets: [col++],
              data: "club",
              width: (_this.fixedTable ? "20%" : null),
              render: function (data, type, row) {
                var param = (_this.Time4oServer ? row.clubId : row.club);
                var clubShort = row.club;
                if (param && param.length > 0)
                  param = param.replace('\'', '\\\'');
                if (clubShort.length > _this.maxClubLength)
                  clubShort = _this.clubShort(clubShort);
                var link = "<a class=\"club\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                if ((haveSplitControls || _this.isMultiDayEvent) && !_this.curClassIsUnranked && (fullView || _this.curClassLapTimes))
                  return (row.name.length > _this.maxNameLength ? _this.nameShort(row.name) : row.name) + "<br>" + link;
                else if (_this.fixedTable)
                  return clubShort;
                else
                  return link;
              }
            });
          }

          if (this.curClassIsCourse) {
            columns.push({
              name: "class",
              title: this.resources["_CLASS"],
              className: "dt-left",
              targets: [col++],
              data: "class",
              render: function (data, type, row) {
                var classRaw = row["class"];
                var classDisplay = _this.shortClassName(classRaw);
                if (classRaw && classRaw.length > 0)
                  classRaw = classRaw.replace('\'', '\\\'');
                return "<a href=\"javascript:LiveResults.Instance.chooseClass('" + classRaw + "')\">" + classDisplay + "</a>";
              }
            });
          }

          if (_this.curClassHasBibs) {
            columns.push({
              name: "bib",
              title: "&#8470",
              className: "dt-right",
              orderable: !_this.fixedTable,
              targets: [col++],
              data: "bib",
              width: (_this.fixedTable ? "5%" : null),
              render: function (data, type) {
                if (type === 'display') {
                  var txt = "";
                  if (data < 0)       // Relay
                    txt += "<span class=\"bib\">" + (-data / 100 | 0) + "</span>";
                  else if (data > 0)  // Ordinary
                    txt += "<span class=\"bib\">" + data + "</span>";
                  return txt;
                }
                else
                  return Math.abs(data);
              }
            });
          }

          columns.push({
            name: "start",
            title: this.resources["_START"],
            className: "dt-right",
            orderable: !_this.fixedTable,
            type: "numeric",
            orderData: [col],
            targets: [col],
            data: "start",
            width: (_this.fixedTable ? "10%" : null),
            render: function (data, type, row) {
              if (row.start == "")
                return "";
              else if (type == "sort")
                return data;
              else {
                var txt = "";
                if (row.splits != undefined && row.splits["0_place"] >= 1) {
                  var place = "";
                  if (row.splits["0_place"] == 1)
                    place += "<span class=\"bestplace\"> ";
                  else
                    place += "<span class=\"place\"> ";
                  if (row.splits["0_place"] < 10 && _this.curClassNumberOfRunners >= 10)
                    place += "&numsp;"
                  place += "&#10072;" + row.splits["0_place"] + "&#10072; </span>"

                  if (fullView) {
                    if (row.splits["0_place"] == 1)
                      txt += "<span class=\"besttime\">";
                    else
                      txt += "<span>";
                    txt += "+" + _this.formatTime(Math.max(0, row.splits["0_timeplus"]), 0, _this.showTenthOfSecond) + place + "</span><br>";
                  }
                  txt += "<span>";
                  if (!fullView && row.splits["0_place"] >= 1)
                    txt += place;
                  txt += _this.formatTime(row.start, 0, false, true, true, true) + "</span>";
                }
                else
                  txt += _this.formatTime(row.start, 0, false, true, true, true);
                return txt;
              }
            }
          });

          col++;
          if (data.splitcontrols != null) {
            $.each(data.splitcontrols, function (key, value) {
              var refSp = _this.refSplit(key);
              if (value.code != 0 && value.code != 999 && !((_this.curClassIsRelay || _this.curClassLapTimes) && value.code > 100000)) // Code = 0 for exchange, 999 for leg time, 100000+ for leg passing
              {
                var splitName = value.name;
                if (splitName.length >= 10)
                  splitName = splitName.replace("Mellomtid", "M.tid");

                columns.push({
                  name: "splits." + value.code,
                  title: splitName,
                  visible: _this.curClassSplitsOK[refSp],
                  className: "dt-right timePlaceWidth",
                  orderable: !_this.curClassIsUnranked,
                  type: "numeric",
                  orderData: [col + 1, col],
                  targets: [col],
                  data: "splits." + value.code,
                  render: function (data, type, row) {
                    if (isNaN(parseInt(data)))
                      return data ?? "";
                    else if (type == "sort")
                      return parseInt(data);
                    else {
                      if (!row.splits[value.code + "_place"])
                        return "";
                      else {
                        var txt = "";
                        var place = "";
                        if (!row.splits[value.code + "_estimate"] && row.splits[value.code + "_place"] == 1)
                          place += "<span class=\"bestplace\"> ";
                        else
                          place += "<span class=\"place\"> ";
                        if (_this.curClassNumberOfRunners >= 10 && (row.splits[value.code + "_place"] < 10 || row.splits[value.code + "_place"] == "-" || row.splits[value.code + "_place"] == "="))
                          place += "&numsp;"
                        place += "&#10072;" + row.splits[value.code + "_place"] + "&#10072;</span>";

                        // First line
                        if ((!fullView || _this.curClassIsRelay) && (row.splits[value.code + "_place"] != 1) && !_this.curClassIsUnranked && !_this.curClassLapTimes && (value.code > 0))
                        // Compact view or relay view, all but first place
                        {
                          txt += "<div class=\"";
                          if (row.splits[value.code + "_estimate"])
                            txt += "estimate ";
                          txt += "tooltip\">+" + _this.formatTime(row.splits[value.code + "_timeplus"], 0, _this.showTenthOfSecond)
                            + place + "<span class=\"tooltiptext\">"
                            + _this.formatTime(row.splits[value.code], 0, _this.showTenthOfSecond) + "</span></div>";
                        }
                        else
                        // Ordinary passing or first place at passing for relay (drop place if code is negative - unranked)
                        {
                          if (row.splits[value.code + "_estimate"])
                            if (row.splits[value.code + "_place"] == 1 && value.code > 0)
                              txt += "<span class=\"estimatebest\">";
                            else
                              txt += "<span class=\"estimate\">";
                          else if (row.splits[value.code + "_place"] == 1 && value.code > 0)
                            txt += "<span class=\"besttime\">";
                          else
                            txt += "<span>";
                          txt += _this.formatTime(row.splits[value.code], 0, _this.showTenthOfSecond);
                          if (value.code > 0)
                            txt += place;
                          txt += "</span>";
                        }
                        // Second line
                        if ((fullView && _this.curClassIsRelay || _this.curClassLapTimes) && (row.splits[(value.code + 100000) + "_timeplus"] != undefined))
                        // Relay passing, second line with leg time to passing 
                        {
                          txt += "<br><span class=";
                          var legplace = "";

                          if (row.splits[value.code + 100000 + "_estimate"]) {
                            if (row.splits[(value.code + 100000) + "_place"] == 1) {
                              txt += "\"estimatebest\">";
                              legplace += "<span class=\"place\"> ";
                            }
                            else {
                              txt += "\"estimate\">";
                              legplace += "<span class=\"place\"> ";
                            }
                          }
                          else if (row.splits[(value.code + 100000) + "_place"] == 1) {
                            txt += "\"besttime\">";
                            legplace += "<span class=\"bestplace\"> ";
                          }
                          else {
                            txt += "\"legtime\">";
                            legplace += "<span class=\"place\"> ";
                          }

                          if (_this.curClassNumberOfRunners >= 10 && (row.splits[(value.code + 100000) + "_place"] < 10 || row.splits[(value.code + 100000) + "_place"] == "-"))
                            legplace += "&numsp;"
                          legplace += "&#10072;" + row.splits[(value.code + 100000) + "_place"] + "&#10072;</span>";
                          if (_this.curClassIsRelay)
                            txt += "<span class=\"legicon\">&#8635; </span>" + _this.formatTime(row.splits[(value.code + 100000)], 0, _this.showTenthOfSecond);
                          else
                            txt += _this.formatTime(row.splits[(value.code + 100000)], 0, _this.showTenthOfSecond);
                          txt += legplace + "</span>";
                        }
                        else if ((row.splits[value.code + "_timeplus"] != undefined) && fullView && !_this.curClassIsRelay && (value.code > 0) && row.splits[value.code + "_place"] > 1)
                        // Second line for ordinary passing (drop if code is negative - unranked)
                        {
                          txt += "<br><span class=";
                          if (row.splits[value.code + "_estimate"])
                            txt += "\"estimate\">+";
                          else
                            txt += "\"plustime\">+";
                          txt += _this.formatTime(Math.abs(row.splits[value.code + "_timeplus"]), 0, _this.showTenthOfSecond) + "</span>";
                          if (_this.curClassNumberOfRunners >= 10)
                            txt += "<span class=\"hideplace\"> &numsp;<i>&#10072;..&#10072;</i></span>";
                          else
                            txt += "<span class=\"hideplace\"> <i>&#10072;..&#10072;</i></span>";
                        }
                      }
                      return txt;
                    }
                  }
                });
                col++;
                columns.push({
                  name: "splits." + value.code + "_status",
                  title: value.name + "_Status",
                  className: "noVis",
                  visible: false,
                  targets: [col++],
                  type: "numeric",
                  data: "splits." + value.code + "_status",
                  render: function (data) {
                    return data ?? "";
                  }
                });
              }
            });
          }

          columns.push({
            name: "finish",
            title: this.resources["_CONTROLFINISH"],
            className: "dt-right timePlaceWidth",
            type: "numeric",
            orderData: [col + 1, col, 0],
            targets: [col],
            orderable: !_this.fixedTable,
            data: "result",
            width: (_this.fixedTable ? "10%" : null),
            render: function (data, type, row) {
              if (isNaN(parseInt(data)))
                return data;
              else if (type == "sort")
                return parseInt(data);
              var res = "";
              if (row.place == "-" || row.place == "" || row.place == "F")
                res += _this.formatTime(row.result, row.status, _this.showTenthOfSecond);
              else {
                var place = "";
                if ((haveSplitControls || _this.isMultiDayEvent) && (row.place == 1)) {
                  res += "<span class=\"besttime\">";
                  place += "<span class=\"bestplace\"> ";
                }
                else {
                  res += "<span>";
                  place += "<span class=\"place\"> ";
                }
                if (_this.curClassNumberOfRunners >= 10 && (row.place < 10 || row.place == "-" || row.place == "="))
                  place += "&numsp;"
                place += "&#10072;" + row.place + "&#10072;</span>";

                if (!isSprintHeat || _this.showTimesInSprint)
                  res += _this.formatTime(row.result, row.status, _this.showTenthOfSecond);
                res += place + "</span>";

                if ((haveSplitControls || _this.isMultiDayEvent) && fullView && !(_this.curClassIsRelay) && !(_this.curClassLapTimes) && row.status == 0 && row.place > 1) {
                  res += "<br><span class=\"plustime\">+" + _this.formatTime(row.timeplus, row.status, _this.showTenthOfSecond) + "</span>";
                  if (_this.curClassNumberOfRunners >= 10)
                    res += "<span class=\"hideplace\"> &numsp;<i>&#10072;..&#10072;</i></span>";
                  else
                    res += "<span class=\"hideplace\"> <i>&#10072;..&#10072;</i></span>";
                }
              }
              if (haveSplitControls && (fullView && _this.curClassIsRelay || _this.curClassLapTimes) && (row.splits["999_place"] != undefined)) {
                if (row.splits[(999)] > 0) {
                  var legplace = "";
                  res += "<br><span class=";
                  if (row.splits["999_place"] == 1) {
                    res += "\"besttime\">";
                    legplace += "<span class=\"bestplace\"> ";
                  }
                  else {
                    res += "\"legtime\">";
                    legplace += "<span class=\"place\"> ";
                  }
                  if (_this.curClassIsRelay)
                    res += "<span class=\"legicon\">&#8635; </span>";
                  if (_this.curClassNumberOfRunners >= 10 && (row.splits["999_place"] < 10 || row.splits["999_place"] == "-"))
                    legplace += "&numsp;"
                  legplace += "&#10072;" + row.splits["999_place"] + "&#10072;</span>";
                  res += _this.formatTime(row.splits[(999)], 0, _this.showTenthOfSecond) + legplace + "</span>";
                }
              }
              return res;
            }
          });

          col++;
          columns.push({
            name: "status",
            title: "Status",
            className: "noVis",
            visible: false,
            targets: [col++],
            type: "numeric",
            data: "status"
          });

          if (!(haveSplitControls || _this.isMultiDayEvent) || !fullView || _this.curClassLapTimes) {
            columns.push({
              name: "diff",
              title: "Diff",
              visible: (!isSprintHeat || _this.showTimesInSprint) && (!_this.curClassIsUnranked || _this.fixedTable),
              className: "dt-right timeWidth",
              orderable: true,
              orderData: [col - 1, col - 2, 0],
              targets: [col++],
              data: "timeplus",
              width: (this.fixedTable ? "10%" : null),
              render: function (data, type, row) {
                if (isNaN(parseInt(data)))
                  return data;
                var res = "";
                if (row.status == 0) {
                  res += "<span class=\"plustime\">+";
                  res += _this.formatTime(Math.max(0, row.timeplus), row.status, _this.showTenthOfSecond) + "</span>";
                }
                return res;
              }
            });
          }
          else
            if (_this.curClassIsRelay && fullView) {
              columns.push({
                name: "total",
                title: "Total<br><span class=\"legtime\"><span class=\"legicon\">&#8635; </span>Etp</span>",
                className: "dt-right",
                orderable: false,
                targets: [col++],
                data: "timeplus",
                render: function (data, type, row) {
                  if (isNaN(parseInt(data)) && isNaN(parseInt(row.splits["999_place"])))
                    return data;
                  var res = "<span>";
                  if (row.status == 0 && row.place > 0)
                    res += "+" + _this.formatTime(Math.max(0, row.timeplus), row.status, _this.showTenthOfSecond);
                  res += "</span><br>";
                  if (row.splits["999_place"] > 0)
                    res += "<span class=\"legtime\">+" + _this.formatTime(Math.max(0, row.splits["999_timeplus"]), 0, _this.showTenthOfSecond) + "</span>";
                  return res;
                }
              });
            }

          if (this.isMultiDayEvent && !courseResults) {
            columns.push({
              name: "total2",
              title: this.resources["_TOTAL"],
              className: "dt-right timePlaceWidth",
              type: "numeric",
              orderData: [col + 1, col, 0],
              targets: [col],
              data: "totalresult",
              render: function (data, type, row) {
                if (type == "sort")
                  return parseInt(data);
                if (isNaN(parseInt(data)))
                  return data;
                if (row.totalplace == "-" || row.totalplace == "") {
                  return _this.formatTime(row.totalresult, row.totalstatus);
                }
                else {
                  var totalplace = "";
                  var totalres = "";
                  if (row.totalplace == 1) {
                    totalres += "<span class=\"besttime\">";
                    totalplace += "<span class=\"bestplace\"> ";
                  }
                  else {
                    totalres += "<span>";
                    totalplace += " <span class=\"place\"> ";
                  }
                  if (row.totalplace < 10 && _this.curClassNumberOfRunners >= 10)
                    totalplace += "&numsp;"
                  totalplace += "&#10072;" + row.totalplace + "&#10072;</span>";
                  totalres += _this.formatTime(row.totalresult, row.totalstatus) + totalplace + "</span>";
                  if (fullView && row.totalplace > 1) {
                    totalres += "<br><span class=\"plustime\">+";
                    totalres += _this.formatTime(row.totalplus, row.totalstatus) + "</span>";
                    if (_this.curClassNumberOfRunners >= 10)
                      totalres += "<span class=\"hideplace\"> &numsp;<i>&#10072;..&#10072;</i></span>";
                    else
                      totalres += "<span class=\"hideplace\"> <i>&#10072;..&#10072;</i></span>";
                  }
                  return totalres;
                }
              }
            });

            col++;
            columns.push({
              name: "totalstatus",
              title: "TotalStatus",
              visible: false,
              className: "noVis",
              targets: [col++],
              type: "numeric",
              data: "totalstatus"
            });

            if (!fullView) {
              columns.push({
                name: "totaldiff",
                title: "Diff",
                orderable: false,
                targets: [col++],
                data: "totalplus",
                render: function (data, type, row) {
                  if (isNaN(parseInt(data)))
                    return data;
                  if (row.totalstatus != 0)
                    return "";
                  else {
                    var res = "";
                    if (row.totalplace == 1)
                      res += "<span class=\"besttime\">+";
                    else
                      res += "<span class=\"plustime\">+";
                    res += _this.formatTime(row.totalplus, row.totalstatus) + "</span>";
                    return res;
                  }
                }
              });
            }
          }
          columns.push({
            name: "VP",
            title: "VP",
            visible: false,
            className: "noVis",
            targets: [col++],
            data: "virtual_position"
          });
          $('#' + this.resultsDiv).height(0);

          this.currentTable = $('#' + this.resultsDiv).DataTable({
            stateSave: true,
            stateSaveParams: function (settings, data) {
              delete data.order;
              data.compId = _this.competitionId;
            },
            stateLoadParams: (settings, data) => {
              if (!data || data.compId !== this.competitionId)
                return false;
              return true;
            },
            fixedHeader: {
              header: true,
              headerOffset: _this.fixedTable ? 20 : 0
            },
            fixedColumns: { leftColumns: 2 },
            scrollX: true,
            paging: false,
            layout: {
              topStart: null,
              topEnd: null,
              bottomStart: null,
              bottomEnd: null
            },
            data: data.results,
            order: [[col - 1, "asc"]],
            columns: columns,
            destroy: true,
            preDrawCallback: function (settings) {
              var api = new $.fn.dataTable.Api(settings);
              if (api.order()[0] != undefined && api.order()[0][0] !== col - 1)
                $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\">&#8635;" + _this.resources["_RESETTODEFAULT"] + "</a>");
            },
          });

          new DataTable.Buttons(this.currentTable, {
            name: 'commands',
            buttons: [
              {
                extend: 'colvis',
                text: '',
                dropIcon: false,
                className: 'fa-solid fa-columns',
                columns: ':not(.noVis)'
              }
            ]
          });
          $('#colSelector').html('');
          this.currentTable.buttons(0, null).containers().appendTo($('#colSelector'));

          // Scroll to initial view 
          if (data.results[0].progress != undefined) {
            var scrollBody = $(this.currentTable.table().container()).find('.dt-scroll-body');
            var maxScroll = scrollBody[0].scrollWidth - scrollBody[0].clientWidth;
            if (maxScroll > 5) {
              var clubBibWidth = 0;
              if (this.curClassIsUnranked || (this.compactView && !this.curClassLapTimes)) // Club and bib col 
                clubBibWidth = 9 + parseInt($('#' + this.resultsDiv + ' thead th:eq(2)').css('width'))
                  + (this.curClassHasBibs ? 9 + parseInt($('#' + this.resultsDiv + ' thead th:eq(3)').css('width')) : 0);
              else // Bib col
                clubBibWidth = (this.curClassHasBibs ? 9 + parseInt($('#' + this.resultsDiv + ' thead th:eq(2)').css('width')) : 0);

              var scrollLength = 0;
              if (data.results[0].progress > 0 && data.results[0].progress < 50)
                scrollLength = clubBibWidth;
              else if (data.results[0].progress >= 50)
                scrollLength = maxScroll;

              if (scrollLength > 0) {
                scrollBody.scrollLeft(scrollLength);
              }
            }
          }

          if (!this.Time4oServer)
            this.lastClassHash = data.hash;

          if (this.isCompToday()) {
            this.updatePredictedTimes(true); // Insert times only
            if (this.lastChanged)
              this.resUpdateTimeout = setTimeout(function () { _this.checkForChanges(); }, this.updateInterval);
            else
              this.resUpdateTimeout = setTimeout(function () { _this.checkForClassUpdate(); }, this.updateInterval);
            this.startPredictedTimeTimer();
          }
        }
      }
    };

    AjaxViewer.prototype.setHighlight = function (results, highlightID) {
      for (var j = 0; j < results.length; j++) {
        if (results[j].dbid == highlightID) {
          if (results[j].DT_RowClass == "firstnonqualifier" || results[j].DT_RowClass == "yellow_row_fnq")
            results[j].DT_RowClass = "yellow_row_fnq";
          else
            results[j].DT_RowClass = "yellow_row";
        }
        else {
          if (results[j].DT_RowClass == "yellow_row")
            results[j].DT_RowClass = "nostyle";
          else if (results[j].DT_RowClass == "yellow_row_fnq")
            results[j].DT_RowClass = "firstnonqualifier";
        }
      }
    }


    AjaxViewer.prototype.setAutomaticUpdate = function (val) {
      this.updateAutomatically = val;
      if (this.updateAutomatically) {
        $("#" + this.setAutomaticUpdateText).html("<b>" + this.resources["_AUTOUPDATE"] + ":</b> " + this.resources["_ON"] + " | <a href=\"javascript:LiveResults.Instance.setAutomaticUpdate(false);\">" + this.resources["_OFF"] + "</a>");
        this.updateLastPassings();
        this.checkForClassUpdate();
      }
      else {
        clearTimeout(this.resUpdateTimeout);
        clearTimeout(this.passingsUpdateTimer);
        clearTimeout(this.radioPassingsUpdateTimer);
        clearTimeout(this.classUpdateTimer);
        $("#" + this.setAutomaticUpdateText).html("<b>" + this.resources["_AUTOUPDATE"] + ":</b> <a href=\"javascript:LiveResults.Instance.setAutomaticUpdate(true);\">" + this.resources["_ON"] + "</a> | " + this.resources["_OFF"] + "");
        if (this.currentTable) {
          $.each(this.currentTable.fnGetNodes(), function (idx, obj) {
            for (var i = 4; i < obj.childNodes.length; i++) {
              var innerHtml = obj.childNodes[i].innerHTML;
              if (innerHtml.indexOf("<i>(") >= 0) {
                obj.childNodes[i].innerHTML = "<td class=\"left\"></td>";
              }
            }
          });
        }
      }
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

    AjaxViewer.prototype.updateResultVirtualPosition = function (data, updateIdx = true) {
      var _this = this;
      var i;
      data.sort(this.resultSorter);
      /* move down runners that have not finished to the correct place*/
      var firstFinishedIdx = -1;
      for (i = 0; i < data.length; i++) {
        if (data[i].place != "") {
          firstFinishedIdx = i;
          break;
        }
      }

      if (firstFinishedIdx == -1)
        firstFinishedIdx = data.length;

      if (this.curClassIsMassStart) {
        /*append results from splits backwards (by place on actual split)*/
        data.sort(function (a, b) { return _this.sortByDistAndSplitPlace(a, b); });
      }
      else {
        var tmp = Array();
        for (i = 0; i < firstFinishedIdx; i++) {
          tmp.push(data[i]);
        }
        data.splice(0, firstFinishedIdx);
        //advanced virtual-sorting for individual races
        tmp.sort(this.sortByDist);
        for (i = 0; i < tmp.length; i++) {
          if (data.length == 0)
            data.push(tmp[i]);
          else
            this.insertIntoResults(tmp[i], data);
        }
      }

      for (i = 0; i < data.length; i++) {
        data[i].virtual_position = i;
        if (updateIdx)
          data[i].idx = i;
      }
    };

    //Sorts results by the one that have run longest on the course
    AjaxViewer.prototype.sortByDist = function (a, b) {
      if (a.progress == 0 && b.progress == 0) {
        if (a.start && !b.start)
          return -1;
        if (!a.start && b.start)
          return 1;
        if (a.start == b.start)
          if (a.bib != undefined && b.bib != undefined)
            return Math.abs(a.bib) - Math.abs(b.bib);
          else
            return 0;
        if (a.start == -999 || b.start == -999) // Place open start lower
          return b.start - a.start;
        else
          return a.start - b.start;
      }
      else
        return b.progress - a.progress;
    };

    //Sorts results by the one that have run longest on the course, and if they are on the same split, place on that split
    //"MassStart-Sorting"
    AjaxViewer.prototype.sortByDistAndSplitPlace = function (a, b) {
      var sortStatusA = a.status;
      var sortStatusB = b.status;
      if (sortStatusA == 9 || sortStatusA == 10 || sortStatusA == 13)
        sortStatusA = 0;
      if (sortStatusB == 9 || sortStatusB == 10 || sortStatusB == 13)
        sortStatusB = 0;
      if (sortStatusA != sortStatusB) {
        if (sortStatusA == 0)
          return -1
        else if (sortStatusB == 0)
          return 1
        else
          return sortStatusB - sortStatusA;
      }
      if (a.progress == 100 && b.progress == 100)
        return a.result - b.result;
      if (a.progress == 0 && b.progress == 0) {
        if (a.start && !b.start)
          return -1;
        if (!a.start && b.start)
          return 1;
        if (a.start == b.start)
          if (a.bib != undefined && b.bib != undefined)
            return Math.abs(a.bib) - Math.abs(b.bib);
          else
            return 0;
        if (a.start == -999 || b.start == -999) // Place open start lower
          return b.start - a.start;
        else
          return a.start - b.start;
      }
      if (a.progress == b.progress && a.progress > 0 && a.progress < 100) {
        //Both have reached the same split
        if (this.curClassSplits != null) {
          for (var s = this.curClassSplits.length - 1; s >= 0; s--) {
            var splitCode = this.curClassSplits[s].code;
            if (a.splits[splitCode + "_place"] != "") {
              var diff = a.splits[splitCode + "_place"] - b.splits[splitCode + "_place"];
              if (diff == 0 && a.bib != undefined && b.bib != undefined)
                return Math.abs(a.bib) - Math.abs(b.bib);
              else
                return diff;
            }
          }
        }
      }
      return b.progress - a.progress;
    };

    //Inserts a result in the array of results.
    //The result to be inserted is assumed to have same or worse progress than all other results already in the array
    AjaxViewer.prototype.insertIntoResults = function (result, data) {
      var d;
      if (this.curClassSplits != null) {
        for (var s = this.curClassSplits.length - 1; s >= 0; s--) {
          var splitCode = this.curClassSplits[s].code;
          if (result.splits[splitCode] != "") {
            var numOthersAtSplit = 0;
            for (d = 0; d < data.length; d++) {
              if (data[d].splits[splitCode] != "") {
                numOthersAtSplit++;
              }
              // insert result 
              // * before results with - as placemark
              // * before the first result with worse time at this split 
              if (data[d].place == "-" || (data[d].splits[splitCode] != "" && data[d].splits[splitCode] > result.splits[splitCode])) {
                data.splice(d, 0, result);
                return;
              }
            }
            //If numothersatsplit there exists results at this split, but all are better than this one..
            //Append last
            if (numOthersAtSplit > 0) {
              data.push(result);
              return;
            }
          }
        }
      }
      if (result.start != "") {
        var startTime = (result.start == -999 ? 8640000 : result.start);
        for (d = 0; d < data.length; d++) {
          if (data[d].place == "-") {
            data.splice(d, 0, result);
            return;
          }
          if (result.place == "" && data[d].place != "") {
          }
          else if (data[d].start != "" && data[d].start > startTime && result.progress == 0 && data[d].progress == 0) {
            data.splice(d, 0, result);
            return;
          }
        }
      }
      data.push(result);
    };

    AjaxViewer.prototype.resultSorter = function (a, b) {
      var aStatus = a.status;
      var bStatus = b.status;
      if (a.place == "F") {
        aStatus = 0;
      }
      else if (b.place == "F") {
        bStatus = 0;
      }
      if (a.place != "" && b.place != "") {
        if (aStatus != bStatus)
          if (aStatus == 0)
            return -1
          else if (bStatus == 0)
            return 1
          else
            return bStatus - aStatus;
        else {
          if (a.result == b.result) {
            if (a.place == "=" && b.place != "=")
              return 1;
            else if (b.place == "=" && a.place != "=")
              return -1;
            else if (a.bib != undefined && b.bib != undefined)
              return a.bib - b.bib;
            else if (a.dbid != undefined && b.dbid != undefined)
              return a.dbid - b.dbid;
            else
              return 0;
          }
          else {
            return a.result - b.result;
          }
        }
      }
      else if (a.place == "-" || a.place != "") {
        return 1;
      }
      else if (b.place == "-" || b.place != "") {
        return -1;
      }
      else {
        return 0;
      }
    };

    AjaxViewer.prototype.newWin = function () {
      var url = "";
      if (this.EmmaServer)
        url += 'emma/';
      url += 'followfull.php?comp=' + this.competitionId + '&lang=' + this.language;
      if (this.curClassName != null) {
        url += '&class=' + encodeURIComponent(this.curClassName);
        if (!this.compactView)
          url += '&fullview';
      }
      else
        url += '&club=' + encodeURIComponent(this.curClubName);
      window.open(url, '', 'status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=1,resizable=1');
    };

    AjaxViewer.prototype.viewClubResults = function (clubName) {
      var _this = this;
      clearTimeout(this.resUpdateTimeout);
      clearTimeout(this.updatePredictedTimeTimer);
      if (this.animating) {
        setTimeout(function () { _this.viewClubResults(clubName); }, 500);
        return;
      }
      this.inactiveTimer = 0;
      if (this.currentTable != null && DataTable.isDataTable('#' + this.resultsDiv)) {
        try {
          this.currentTable.destroy();
        }
        catch { }
      }
      $('#divResults').html('');
      $('#divLivelox').html('');
      $('#' + this.txtResetSorting).html('');
      this.curClubName = clubName;
      this.curClassName = null;
      this.curSplitView = null;
      this.curRelayView = null;
      $('#resultsHeader').html(this.resources["_LOADINGRESULTS"]);

      var URLextra;
      var headers = {};
      if (this.Time4oServer) {
        URLextra = "race/" + this.competitionId + "/entry?organisationId=" + clubName;
      }
      else {
        URLextra = "?comp=" + this.competitionId + "&method=getclubresults&unformattedTimes=true&club="
          + encodeURIComponent(clubName) + (this.isMultiDayEvent ? "&includetotal=true" : "");
      }

      $.ajax({
        url: this.apiURL + URLextra,
        headers: headers,
        dataTable: "json",
        success: function (data, status, resp) {
          var expTime = false;
          try {
            if (_this.Time4oServer) {
              expTime = new Date(resp.getResponseHeader("date")).getTime() + _this.clubUpdateInterval;
              if (resp.status == 200) {
                _this.lastClubHash = resp.getResponseHeader("etag").slice(1, -1);
                data.status = "OK";
                data.rt = _this.clubUpdateInterval / 1000;
              }
            }
            else
              expTime = new Date(resp.getResponseHeader("expires")).getTime();
            if (!this.isSingleClass) {
              window.location.hash = "club::" + clubName;
            }
            _this.updateClubResults(data, expTime);
          }
          catch { }
        }
      });
    };


    AjaxViewer.prototype.updateClubResults = function (data, expTime) {
      if (this.curClubName == null)
        return;
      var _this = this;
      if (data.rt != undefined && data.rt > 0)
        this.clubUpdateInterval = data.rt * 1000;
      $('#updateinterval').html(this.clubUpdateInterval / 1000);
      $('#liveIndicator').html('');
      if (expTime) {
        var lastUpdate = new Date();
        lastUpdate.setTime(expTime - this.clubUpdateInterval + 1000);
        $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
      }
      if (data != null && data.status == "OK") {
        if (this.Time4oServer)
          data = this.Time4oClubResultsToLiveres(data, _this.activeClasses);
        if (data.clubName != null) {
          $('#' + this.resultsHeaderDiv).html('<b>' + data.clubName + '</b>');
          $('#' + this.resultsControlsDiv).show();
        }
        if (data.results != null) {
          var hasPace = false;
          $.each(data.results, function (idx, res) {
            if (res.pace > 0)
              hasPace = true;
            res.placeSortable = res.place;
            if (res.place == "-")
              res.placeSortable = 999999;
            if (res.place == "")
              res.placeSortable = 9999;
            if (res.place == "F")
              res.placeSortable = 0;
          });

          var numberOfRunners = data.results.length;
          $('#numberOfRunners').html(numberOfRunners);
          this.curClubSplits = (data.numSplits == undefined ? 0 : data.numSplits);

          var columns = Array();
          var col = 0;
          columns.push({
            name: "place",
            title: "#",
            className: "dt-right",
            orderData: [1],
            targets: [col++],
            data: "place"
          });
          columns.push({
            name: "placesortable",
            title: "placeSortable",
            className: "noVis",
            visible: false,
            data: "placeSortable",
            targets: [col++],
            render: function (data, type, row) {
              if (type == "sort")
                return row.placeSortable;
              else
                return data;
            }
          });
          columns.push({
            name: "name",
            title: this.resources["_NAME"],
            className: "dt-left",
            targets: [col++],
            data: "name",
            render: function (data, type) {
              if (type === 'display') {
                if (data.length > _this.maxNameLength)
                  return _this.nameShort(data);
                else
                  return data;
              }
              else
                return data;
            }
          });
          columns.push({
            name: "class",
            title: this.resources["_CLASS"],
            className: "dt-left",
            targets: [col++],
            data: "class",
            render: function (data, type, row) {
              var param = row["class"];
              if (param && param.length > 0)
                param = param.replace('\'', '\\\'');
              return "<a href=\"javascript:LiveResults.Instance.chooseClass('" + param + "')\">" + row["class"] + "</a>";
            }
          });
          columns.push({
            name: "bib",
            title: "&#8470;",
            className: "dt-right",
            orderData: [col + 1],
            targets: [col++],
            data: (_this.EmmaServer ? null : "bib"),
            render: function (data, type, row) {
              if (type === 'display') {
                if (row.bib < 0) // Relay
                  return "<span class=\"bib\">" + (-row.bib / 100 | 0) + "</span>";
                else if (row.bib > 0)       // Ordinary
                  return "<span class=\"bib\">" + row.bib + "</span>";
                else
                  return "";
              }
              else
                return data;
            }
          });
          columns.push({
            name: "bibsortable",
            title: "bibSortable",
            className: "noVis",
            visible: false,
            data: (_this.EmmaServer ? null : "bib"),
            targets: [col++],
            render: function (data) {
              return Math.abs(data);
            }
          });
          columns.push({
            name: "start",
            title: this.resources["_START"],
            className: "dt-right",
            type: "numeric",
            orderData: [col + 1],
            targets: [col++],
            data: "start",
            render: function (data, type, row) {
              if (row.start == "") {
                return "";
              }
              else {
                return _this.formatTime(row.start, 0, false, true, true, true)
              }
            }
          });
          columns.push({
            name: "startsortable",
            title: "startSortable",
            className: "noVis",
            visible: false,
            data: "start",
            targets: [col++],
            data: "start",
            render: function (data) {
              if (data < 0) // Open start
                return 99999999;
              else if (data == "")
                return 0;
              else
                return data;
            }
          });

          for (var i = 0; i < this.curClubSplits; i++) {
            var splitName = "M" + (i + 1);
            columns.push({
              name: splitName,
              title: splitName,
              className: "dt-right timePlaceWidth",
              type: "numeric",
              targets: [col++],
              data: "result", // using dummy variable to be replaced in the render function
              render: function (data, type, row, meta) {
                if (data != "" && isNaN(parseInt(data)))
                  return data;
                var idx = meta.col - 8;
                time = (row.splits[idx] == undefined ? null : row.splits[idx].time);
                var NA = (time == null || time == "");
                if (type == "sort") {
                  if (NA)
                    return 999999;
                  else if (time == -1)
                    return 999998;
                  else
                    return time;
                }
                if (NA)
                  return '<div style="background-color: #CCCCCC;">&nbsp;</div>';
                if (time == -1)
                  return "";
                var place = row.splits[idx].place;
                var placeTxt = "<span class=\"place\"> ";
                if (place < 10)
                  placeTxt += "&numsp;"
                placeTxt += "&#10072;" + (place > 0 ? place : "-") + "&#10072;</span>";
                var txt = "";
                if (place == 1) {
                  txt += _this.formatTime(time, 0, _this.showTenthOfSecond) + placeTxt;
                }
                else {
                  txt += "<div class=\"";
                  txt += "tooltip\">+" + _this.formatTime(row.splits[idx].timeplus, 0, _this.showTenthOfSecond)
                    + placeTxt + "<span class=\"tooltiptext\">"
                    + _this.formatTime(time, 0, _this.showTenthOfSecond) + "</span></div>";
                }
                return txt;
              }
            });
          };

          columns.push({
            name: "finish",
            title: this.resources["_CONTROLFINISH"],
            className: "dt-right timePlaceWidth",
            type: "numeric",
            orderData: [col + 1, col, 0],
            targets: [col],
            data: "result",
            defaultContent: "undefined",
            render: function (data, type, row) {
              if (isNaN(parseInt(data)))
                return data;
              if (type == "sort")
                return parseInt(data);
              if (row.place == "-" || row.place == "" || row.place == "F") {
                return _this.formatTime(row.result, row.status);
              }
              var place = row.place;
              var placeTxt = "<span class=\"place\"> ";
              if (place < 10)
                placeTxt += "&numsp;"
              placeTxt += "&#10072;" + (place > 0 ? place : "-") + "&#10072;</span>";
              txt = _this.formatTime(row.result, 0, _this.showTenthOfSecond) + placeTxt;
              return txt;
            }
          });

          col++;
          columns.push({
            name: "status",
            title: "Status",
            className: "noVis",
            visible: false,
            targets: [col++],
            type: "numeric",
            data: "status"
          });
          columns.push({
            name: "diff",
            title: "Diff",
            className: "dt-right",
            orderable: true,
            targets: [col++],
            data: "timeplus",
            render: function (data, type, row) {
              if (isNaN(parseInt(data)))
                return data;
              if (type === 'display') {
                if (row.status == 0)
                  return "<span class=\"plustime\">+" + _this.formatTime(row.timeplus, row.status) + "</span>";
                else
                  return "";
              }
              else {
                if (row.status == 0)
                  return row.timeplus;
                else
                  return 999999;
              }
            }
          });
          if (hasPace) {
            columns.push({
              name: "pace",
              title: "m/km",
              className: "dt-right",
              orderable: true,
              targets: [col++],
              data: "pace",
              render: function (data, type, row) {
                if (row.status == 0 && data > 0) {
                  if (type === 'display')
                    return "<span class=\"plustime\">" + _this.formatTime(data, 0) + "</span>";
                  else
                    return data;
                }
                else if (type === 'display')
                  return "";
                else
                  return 999999;
              }
            });
          }
          this.currentTable = $('#' + this.resultsDiv).DataTable({
            stateSave: true,
            stateSaveParams: function (settings, data) {
              delete data.order;
              data.compId = _this.competitionId;
            },
            stateLoadParams: (settings, data) => {
              if (!data || data.compId !== this.competitionId)
                return false;
              return true;
            },
            fixedHeader: true,
            fixedColumns: { leftColumns: 2 },
            scrollX: true,
            paging: false,
            layout: {
              topStart: null,
              topEnd: null,
              bottomStart: null,
              bottomEnd: null
            },
            data: data.results,
            order: [[1, 'asc'], [7, 'asc'], [5, 'asc']],
            columnDefs: columns,
            destroy: true,
            preDrawCallback: function (settings) {
              var api = new $.fn.dataTable.Api(settings);
              if (api.order()[0] != undefined && api.order()[0][0] !== 1)
                $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\">&#8635;" + _this.resources["_RESETTODEFAULT"] + "</a>");
            }
          });

          new DataTable.Buttons(this.currentTable, {
            name: 'commands',
            buttons: [
              {
                extend: 'colvis',
                text: '',
                dropIcon: false,
                className: 'fa-solid fa-columns',
                columns: ':not(.noVis)'
              }
            ]
          });
          $('#colSelector').html('');
          this.currentTable.buttons(0, null).containers().appendTo($('#colSelector'));
          if (!this.Time4oServer)
            this.lastClubHash = data.hash;
        }
      }
      this.updateClubOrder(); // Update position in table
      if (_this.isCompToday()) {
        this.resUpdateTimeout = setTimeout(function () { _this.checkForClubUpdate(); }, _this.clubUpdateInterval);
        this.updateClubTimes();
      }
    };

    AjaxViewer.prototype.updateClubTimes = function (startTimer = true) {
      if (this.currentTable == null || this.curClubName == null || !this.isCompToday())
        return;
      try {
        _this = this;
        var dt = new Date();
        var currentTimeZoneOffset = -1 * new Date().getTimezoneOffset();
        var eventZoneOffset = ((dt.dst() ? 2 : 1) + this.eventTimeZoneDiff) * 60;
        var timeZoneDiff = eventZoneOffset - currentTimeZoneOffset;
        var time = 100 * Math.round((dt.getSeconds() + (60 * dt.getMinutes()) + (60 * 60 * dt.getHours())) - (this.serverTimeDiff / 1000) + (timeZoneDiff * 60));
        var timeServer = (dt - this.serverTimeDiff) / 1000;
        var table = this.currentTable;
        var data = table.data().toArray();
        var offset = 8;
        var colFinish = offset + this.curClubSplits;

        // *** Write running times and highlight new results ***
        for (var i = 0; i < data.length; i++) {
          var row = table.row(i).node();

          // Highlight finish
          if (this.EmmaServer && $(row).hasClass('new_result')) {
            $(row).addClass('red_row');
          }
          else {
            var changed = parseInt(data[i].changed);
            var noStartStatus = (data[i].status != 9 && data[i].status != 10);
            var highlight = (noStartStatus && changed > 0 && (timeServer - data[i].changed < this.highTime));

            if (this.curClubSplits == 0) { // No splits, highlight row
              if (highlight) {
                if (!$(row).hasClass('red_row')) {
                  $(row).addClass('red_row');
                }
              }
              else if ($(row).hasClass('red_row')) {
                $(row).removeClass('red_row');
              }
            }
            else { // Highlight finish and diff
              if (highlight && (data[i].highlight == undefined || data[i].highlight == false)) {
                data[i].highlight = true;
                $(table.cell(i, colFinish).node()).addClass('red_cell');
                $(table.cell(i, colFinish + 2).node()).addClass('red_cell');
              }
              else if (!highlight && data[i].highlight == true) {
                data[i].highlight = false;
                $(table.cell(i, colFinish).node()).removeClass('red_cell');
                $(table.cell(i, colFinish + 2).node()).removeClass('red_cell');
              }
            }
          }

          // Highlight split times
          for (var sp = 0; sp < this.curClubSplits; sp++) {
            if (data[i].splits[sp] == undefined)
              continue;
            var changed = parseInt(data[i].splits[sp].changed);
            var highlight = (changed > 0 ? timeServer - changed < this.highTime : false);

            if (highlight && (data[i].splits[sp].highlight == undefined || data[i].splits[sp].highlight == false)) {
              data[i].splits[sp].highlight = true;
              $(table.cell(i, offset + sp).node()).addClass('red_cell');
            }
            else if (!highlight && data[i].splits[sp].highlight == true) {
              data[i].splits[sp].highlight = false;
              $(table.cell(i, offset + sp).node()).removeClass('red_cell');
            }
          }

          // Show elapsed times and differences to best time
          if ((data[i].status == 10 || data[i].status == 9) && data[i].start != "" && data[i].start > 0) {
            var elapsedTime = time - data[i].start;
            if (elapsedTime < -18 * 3600 * 100) // Time passed midnight (between 00:00 and 06:00)
              elapsedTime += 24 * 3600 * 100;
            if (elapsedTime >= 0) {

              table.cell(i, 0).data("<span class=\"pulsing\">◉</span>");
              var elapsedTimeStr = "<i>" + this.formatTime(elapsedTime, 0, false) + "</i>";
              elapsedTimeStr += " <span class=\"hideplace\">&numsp;<i>&#10072;..&#10072;</i></span>";
              table.cell(i, colFinish).data(elapsedTimeStr);

              // Find next split to reach (largest order)              
              var nextSplit = this.curClubSplits; // Default to finish
              for (let j = this.curClubSplits - 1; j >= 0; j--) {
                if (data[i].splits[j] != undefined && data[i].splits[j].time > 0)
                  break;
                if (data[i].splits[j] != undefined)
                  nextSplit = j;
              }

              // Insert predicted time to next split
              if (nextSplit == this.curClubSplits) // Finish
              {
                if (data[i].bestTime == undefined) // Get best time from timeplus 
                  data[i].bestTime = Math.abs(data[i].timeplus);
                if (data[i].bestTime > 0) {
                  var timeDiff = elapsedTime - data[i].bestTime;
                  var timeDiffStr = "<i>" + (timeDiff < 0 ? "-" : "+") + this.formatTime(Math.abs(timeDiff), 0, false) + "</i>";
                  table.cell(i, colFinish + 2).data(timeDiffStr);
                }
              }
              else {
                var bestTime = data[i].splits[nextSplit].besttime;
                var timeStr = "<i>";;
                if (bestTime > 0) {
                  var timeDiff = elapsedTime - bestTime;
                  timeStr += (timeDiff < 0 ? "-" : "+") + this.formatTime(Math.abs(timeDiff), 0, false) + "</i>";
                }
                else {
                  timeStr += this.formatTime(elapsedTime, 0, false) + "</i>";
                }
                timeStr += " <span class=\"hideplace\">&numsp;<i>&#10072;..&#10072;</i></span>";
                table.cell(i, offset + nextSplit).data(timeStr);
              }
            }
          }
        }
      }
      catch { }
      if (startTimer)
        this.updatePredictedTimeTimer = setTimeout(function () { _this.updateClubTimes(); }, 1000);
    }

    AjaxViewer.prototype.viewRelayResults = function (className) {
      var _this = this;
      clearTimeout(this.resUpdateTimeout);
      this.inactiveTimer = 0;
      if (this.currentTable != null && DataTable.isDataTable('#' + this.resultsDiv)) {
        try {
          this.currentTable.destroy();
        }
        catch { }
      }
      $('#classColumnContent').removeClass('open').addClass('closed');
      $('#divResults').html('');
      $('#divLivelox').html('');
      $('#' + this.txtResetSorting).html('');
      this.curClubName = null;
      this.curClassName = null;
      this.curSplitView = null;
      this.curRelayView = className;
      $('#resultsHeader').html(this.resources["_LOADINGRESULTS"]);

      var URLextra;
      if (this.Time4oServer) {
        var classId = this.activeClasses?.find(c => c.className === className).id;
        classId = classId.replace('.1', '.all');
        URLextra = "race/" + this.competitionId + "/entry?raceClassId=" + classId;
      }
      else {
        URLextra = "?comp=" + this.competitionId + "&unformattedTimes=true&method=getrelayresults&class=" + encodeURIComponent(className)
      }

      $.ajax({
        url: this.apiURL + URLextra,
        headers: {},
        dataType: "json",
        success: function (data, status, resp) {
          var expTime = false;
          try {
            if (_this.Time4oServer) {
              expTime = new Date(resp.getResponseHeader("date")).getTime() + _this.updateInterval;
              if (resp.status == 200)
                data.status = "OK";
              else
                data.status = "ERR";
              data.rt = _this.updateInterval / 1000;
            }
            else
              expTime = new Date(resp.getResponseHeader("expires")).getTime();
            _this.updateRelayResults(data, expTime, className);
          }
          catch { }
        }
      });
      window.location.hash = "relay::" + className;
    };

    AjaxViewer.prototype.updateRelayResults = function (data, expTime, className) {
      if (this.curRelayView == null)
        return;
      var _this = this;
      if (data.rt != undefined && data.rt > 0)
        this.updateInterval = data.rt * 1000;
      $('#updateinterval').html("- ");
      $('#liveIndicator').html('');
      if (expTime) {
        var lastUpdate = new Date();
        lastUpdate.setTime(expTime - this.clubUpdateInterval + 1000);
        $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
      }
      if (data != null && data.status == "OK") {
        if (this.Time4oServer) {
          data = this.Time4oRelayResultsToLiveres(data, className, this.activeClasses);
        }
        if (data.className != null) {
          $('#' + this.resultsHeaderDiv).html('<b>' + data.className + '</b>');
          $('#' + this.resultsControlsDiv).show();
        }
        if (data.legs != null && data.relayresults != null) {
          var legs = data.legs;
          var numberOfTeams = data.relayresults[0].results.length;
          var numberOfRunners = legs * numberOfTeams;
          $('#numberOfRunners').html(numberOfRunners);

          var teamresults = [];
          for (let leg = 1; leg <= legs; leg++) {
            var legResults = data.relayresults[leg - 1].results;
            for (let runner = 0; runner < legResults.length; runner++) {
              var br = "";
              var teamBib = (this.Time4oServer ? legResults[runner].bib : (-legResults[runner].bib / 100 | 0));
              var legTime;
              var legStatus;
              var legPlusTime;
              var legPlace;
              if (leg == 1) {
                var clubShort = legResults[runner].club;
                if (clubShort.length > _this.maxClubLength)
                  clubShort = _this.clubShort(clubShort);
                teamresults[teamBib] = {
                  names: "<b>" + clubShort + "</b><br>",
                  bib: "<b>" + teamBib + "</b><br>",
                  legTime: "<br>",
                  legPlace: "<br>",
                  legDiff: "<br>",
                  totTime: "",
                  totPlace: "<br>",
                  totDiff: "",
                  kmTime: "<br>",
                  lastPlace: legResults[runner].place,
                  lastDiff: legResults[runner].timeplus,
                  placeDiff: "<br>",
                  totGained: "<br>",
                  placeStr: "",
                  sort: []
                }
                legTime = legResults[runner].result;
                legStatus = legResults[runner].status;
                legPlusTime = legResults[runner].timeplus;
                legPlace = legResults[runner].place;
              }
              else {
                br = "<br>";
                legTime = legResults[runner].splits["999"];
                legStatus = legResults[runner].status;
                legPlusTime = legResults[runner].splits["999_timeplus"];
                legPlace = legResults[runner].splits["999_place"];

              }
              var kmTime = legResults[runner].pace;
              teamresults[teamBib].kmTime += br + ((kmTime > 0 && legStatus == 0) ? _this.formatTime(kmTime, 0) : "");

              var totStatus = legResults[runner].status;
              var totPlace = legResults[runner].place;
              var placeDiff = (totStatus == 0 && teamresults[teamBib].lastPlace > 0 ? legResults[runner].place - teamresults[teamBib].lastPlace : "");
              var totGained = Math.max(0, legResults[runner].timeplus) - teamresults[teamBib].lastDiff;
              teamresults[teamBib].lastPlace = legResults[runner].place;
              teamresults[teamBib].lastDiff = Math.max(0, legResults[runner].timeplus);

              var nameShort = legResults[runner].name;
              if (nameShort.length > _this.maxNameLength)
                nameShort = _this.nameShort(nameShort);

              teamresults[teamBib].names += br + nameShort;
              teamresults[teamBib].bib += br + leg;

              teamresults[teamBib].totTime += br + (totPlace == 1 ? "<span class=\"time1\">" : "<span>")
                + _this.formatTime(legResults[runner].result, legResults[runner].status, _this.showTenthOfSecond) + "</span>"
                + (totPlace == 1 ? "<span class=\"place1\">" : "<span class=\"place\">")
                + (legResults[runner].status == 0 ? (numberOfTeams >= 10 && totPlace < 10 ? "&numsp;" : "")
                  + "&numsp;&#10072;" + totPlace + "&#10072;" : "") + "</span>";
              teamresults[teamBib].totDiff += br + (totStatus == 0 ? (totPlace == 1 ? "<span class=\"time1\">" : "<span>")
                + "+" + _this.formatTime(Math.max(0, legResults[runner].timeplus), 0, _this.showTenthOfSecond) + "</span>" : "");
              teamresults[teamBib].placeDiff += br + (leg == 1 ? "" : (placeDiff < 0 ? "<span class=\"gained\">" : (placeDiff > 0 ? "<span class=\"lost\">+" : "<span>"))
                + placeDiff + "</span>");
              teamresults[teamBib].totGained += br + (leg > 1 && legStatus == 0 ? (totGained < 0 ? "<span class=\"gained\">-" : "<span class=\"lost\">+")
                + _this.formatTime(Math.abs(totGained), 0, _this.showTenthOfSecond) : "");

              teamresults[teamBib].legTime += br + (legPlace == 1 ? "<span class=\"time1\">" : "<span>")
                + _this.formatTime(legTime, legStatus, _this.showTenthOfSecond) + "</span>"
                + (legStatus == 0 ? (numberOfTeams >= 10 && legPlace < 10 ? "&numsp;" : "")
                  + (legPlace == 1 ? "<span class=\"place1\">" : "<span class=\"place\">")
                  + "&numsp;&#10072;" + legPlace + "&#10072;" : "") + "</span>";
              teamresults[teamBib].legDiff += br + (legStatus == 0 ? (legPlace == 1 ? "<span class=\"time1\">" : "<span>")
                + "+" + _this.formatTime(Math.max(0, legPlusTime), 0, _this.showTenthOfSecond) + "</span>" : "");

              if (legResults[runner].place == "-")
                teamresults[teamBib].sort[leg - 1] = 999999 + (leg == 1 ? teamBib : 0);
              else if (legResults[runner].place == "")
                teamresults[teamBib].sort[leg - 1] = 99999 + (leg == 1 ? teamBib : 0);
              else
                teamresults[teamBib].sort[leg - 1] = legResults[runner].place;

              if (leg == legs) {
                teamresults[teamBib].placeStr = "<b>" + legResults[runner].place + "</b>";
                teamresults[teamBib].totTime = "<b>" + _this.formatTime(legResults[runner].result, legResults[runner].status, _this.showTenthOfSecond)
                  + "</b><br>" + teamresults[teamBib].totTime;
                teamresults[teamBib].totDiff = "<b>" + (legResults[runner].status == 0 ? "+"
                  + _this.formatTime(Math.max(0, legResults[runner].timeplus), 0, _this.showTenthOfSecond) : "")
                  + "</b><br>" + teamresults[teamBib].totDiff;
              }
            };
          };

          teamresults = teamresults.filter(Boolean);

          var columns = Array();
          var col = 0;
          var sorting = [];
          for (let leg = 1; leg <= legs; leg++) {
            sorting.unshift([col, "asc"]);
            columns.push({
              title: "sort", visible: false, data: "sort", targets: [col++], render: function (data, type, row, meta) {
                leg = meta.col;
                return row.sort[leg];
              }
            });
          }
          columns.push({ title: "#", className: "dt-right", orderable: false, targets: [col++], data: "placeStr" });
          columns.push({ title: "&#8470", className: "dt-right", orderable: false, targets: [col++], data: "bib" });
          columns.push({ title: this.resources["_NAME"], className: "dt-left", orderable: false, targets: [col++], data: "names" });
          columns.push({ title: "Total", className: "dt-right", orderable: false, targets: [col++], data: "totTime" });
          columns.push({ title: "", className: "dt-right", orderable: false, targets: [col++], data: "totDiff" });
          columns.push({ title: "", className: "dt-right", orderable: false, targets: [col++], data: "placeDiff" });
          columns.push({ title: "±Tet", className: "dt-right", orderable: false, targets: [col++], data: "totGained" });
          columns.push({ title: "Etappe", className: "dt-right", orderable: false, targets: [col++], data: "legTime" });
          columns.push({ title: "", className: "dt-right", orderable: false, targets: [col++], data: "legDiff" });
          columns.push({ title: "m/km", className: "dt-right", orderable: false, targets: [col++], data: "kmTime" });

          this.currentTable = $('#' + this.resultsDiv).DataTable({
            fixedHeader: true,
            fixedColumns: { leftColumns: 3 },
            scrollX: true,
            paging: false,
            lengthChange: false,
            searching: false,
            info: false,
            data: teamresults,
            order: sorting,
            columnDefs: columns,
            destroy: true
          });
        };
      };
    };

    AjaxViewer.prototype.resetSorting = function () {
      if (this.curClubName != null) {
        this.currentTable.order([1, 'asc'], [7, 'asc'], [5, 'asc']).draw();
      }
      else {
        var idxCol = 1;
        this.currentTable.columns().every(function (idx) {
          var column = this;
          if (column.header().textContent == "VP") {
            idxCol = idx;
          }
        });
        this.currentTable.order([idxCol, 'asc']).draw();
      }
      var link = "";
      if (this.curSplitView != null)
        link = "<a href=\"javascript:LiveResults.Instance.chooseClass('" + this.curSplitView[0].replace('\'', '\\\'') + "')\">&#5130; Resultater</a>";
      else if (this.curClassName != null && this.showEcardTimes) {
        var courses = this.courses[this.curClassName];
        if (courses != undefined && courses.length > 0)
          link = this.splitTimesLink(this.curClassName, courses);
      }

      $("#" + this.txtResetSorting).html(link);
    };

    //Make link for split times
    AjaxViewer.prototype.splitTimesLink = function (className, courses) {
      var link;
      if (courses.length == 1)
        link = "<a href=\"javascript:LiveResults.Instance.viewSplitTimeResults('" + className + "'," + courses[0] + ");\">Strekktider &#5125;</a>";
      else {
        link = "<button onclick=\"res.showCourses()\" class=\"dropbtn\">Strekktider &#5125;</button><div id=\"myDropdown\" class=\"dropdown-content\">";
        link += "<a href=\"javascript:LiveResults.Instance.viewSplitTimeResults('" + className + "',-1);\">Felles poster</a>";
        for (i = 0; i < courses.length; i++) {
          let courseName = this.courseNames.find(course => course.No === courses[i]);
          if (courseName) {
            link += "<a href=\"javascript:LiveResults.Instance.viewSplitTimeResults('" + className + "'," + courses[i] + ");\">" + courseName.Name + "</a>";
          }
        }
        link += "</div>";
      }
      return link;
    };


    AjaxViewer.prototype.viewSplitTimeResults = function (className, course) {
      if (!this.showEcardTimes)
        return
      var _this = this;
      clearTimeout(this.resUpdateTimeout);
      if (this.animating) {
        setTimeout(function () { _this.viewSplitTimeResults(className, course); }, 500);
        return;
      }
      if (this.currentTable != null && DataTable.isDataTable('#' + this.resultsDiv)) {
        try {
          this.currentTable.destroy();
        }
        catch { }
      }
      $('#divResults').html('');

      var classLink = className.replace('\'', '\\\'');
      if (classLink == "AllClasses")
        classLink = "course::" + course;
      var link = "<a href=\"javascript:LiveResults.Instance.chooseClass('" + classLink + "')\">&#5130; Resultater</a>";
      var courses = this.courses[className];
      if (courses != undefined && courses.length > 1)
        link += " " + this.splitTimesLink(className, courses);
      $('#' + this.txtResetSorting).html(link);

      this.curClubName = null;
      this.curClassName = null;
      this.curSplitView = [className, course];
      this.curRelayView = null;
      $('#resultsHeader').html(this.resources["_LOADINGRESULTS"]);
      $.ajax({
        url: this.apiURL,
        data: "comp=" + this.competitionId + "&method=getclasscoursesplits&class=" + encodeURIComponent(className) + "&course=" + course,
        success: function (data, status, resp) {
          var expTime = new Date();
          expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
          _this.updateSplitTimeResults(data, course, expTime);
        },
        dataType: "json"
      });
      window.location.hash = "splits::" + className + "::course::" + course;
    };

    AjaxViewer.prototype.updateSplitTimeResults = function (data, course, expTime) {
      if (this.curSplitView == null)
        return;
      var _this = this;
      var updateInterval = 0;
      if (data.rt != undefined && data.rt > 0)
        updateInterval = data.rt * 1000;
      $('#updateinterval').html("- ");
      $('#liveIndicator').html('');
      if (expTime) {
        var lastUpdate = new Date();
        lastUpdate.setTime(expTime - updateInterval + 1000);
        $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
      }

      if (data != null && data.status == "OK") {
        if (data.className != null) {
          var courseName = (course > 0 && _this.courseNames.length > 0 ? _this.courseNames.find(item => item.No === Number(course)).Name : 'Felles poster');
          $('#' + this.resultsHeaderDiv).html('<b>' + data.className + '</b>&nbsp;&nbsp;<small>' + courseName + '</small>');
          $('#' + this.resultsControlsDiv).show();
        }
        if (data.results != null) {
          $.each(data.results, function (idx, res) {
            res.placeSortable = res.place;
            if (res.place == "-")
              res.placeSortable = 999999;
            if (res.place == "F")
              res.placeSortable = 0;
          });
          this.curClassNumberOfRunners = data.results.length;
          $('#numberOfRunners').html(_this.curClassNumberOfRunners);
          if (this.curClassNumberOfRunners > 0) {
            //if (course>0)
            this.splitAnalyze(data.results);
            var columns = Array();
            var col = 0;
            columns.push({ title: "#", className: "dt-right", orderData: [1], targets: [col++], data: "place" });
            columns.push({
              title: "placeSortable", visible: false, data: "placeSortable", targets: [col++], render: function (data, type, row) {
                if (type == "sort")
                  return row.placeSortable;
                else
                  return data;
              }
            });

            columns.push({
              title: this.resources["_NAME"] + "<br>" + this.resources["_CLUB"],
              className: "dt-left",
              orderable: false,
              targets: [col++],
              data: "club",
              width: null,
              render: function (data, type, row) {
                var param = row.club;
                var clubShort = row.club;
                if (param && param.length > 0)
                  param = param.replace('\'', '\\\'');
                if (clubShort.length > _this.maxClubLength)
                  clubShort = _this.clubShort(clubShort);
                var link = "<a class=\"club\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                return (row.name.length > _this.maxNameLength ? _this.nameShort(row.name) : row.name) + "<br>" + link;
              }
            });

            columns.push({
              title: "tid<br>m/km",
              className: "dt-right",
              orderable: false,
              targets: [col++],
              data: "result",
              width: null,
              render: function (data, type, row) {
                var ret = _this.formatTime(row.result, row.status);
                if (row.status == 0 && row.pace > 0)
                  ret += "<br>" + _this.formatTime(row.pace, 0);
                return ret;
              }
            });

            if (data.splitcontrols != null && data.splitcontrols.length > 1) {
              for (var i = 0; i < data.splitcontrols.length; i++) {
                var code = data.splitcontrols[i];
                var title = "";
                if (course > 0) {
                  if (i == 0)
                    title = "S-1<br>(" + code + ")";
                  else if (code == 999)
                    title = i + "-" + _this.resources["_CONTROLFINISH"];
                  else
                    title = i + "-" + (i + 1) + "<br>(" + code + ")";
                }
                else {
                  var codePre = (i > 0 ? data.splitcontrols[i - 1] : 0);
                  if (i == 0)
                    title = "S-" + code;
                  else if (code == 999)
                    title = codePre + "-" + _this.resources["_CONTROLFINISH"];
                  else
                    title = codePre + "-" + code;
                }

                columns.push({
                  title: title,
                  visible: true,
                  className: "dt-right",
                  orderable: true,
                  type: "numeric",
                  orderData: [col],
                  targets: [col],
                  data: "result",
                  render: function (data, type, row, meta) {
                    var no = meta.col - 4;
                    var last = (no == (row.split_place.length - 1));
                    if (type == "sort") {
                      if (row.split_place[no] > 0)
                        return row.split_place[no];
                      else
                        return 9999;
                    }
                    else {
                      var txt = "";
                      var place = "";
                      var passPlace = row.pass_place[no];
                      var passTime = row.pass_time[no];
                      var passPlus = row.pass_plus[no]
                      var splitPlace = row.split_place[no];
                      var splitTime = row.split_time[no];
                      var splitPlus = row.split_plus[no];
                      var splitMiss = (row.split_miss != undefined ? row.split_miss[no] : false);
                      var splitLost = (row.split_lost != undefined ? row.split_lost[no] : 0);

                      // First line
                      if (passTime > 0 || last) {
                        if (passPlace == 1) {
                          place += "<span class=\"place1\"> ";
                          txt += "<span class=\"time1\">";
                        }
                        else if (passPlace == 2 || passPlace == 3) {
                          place += "<span class=\"place23\"> ";
                          txt += "<span class=\"time23\">";
                        }
                        else {
                          place += "<span class=\"place\"> ";
                          txt += "<span>";
                        }
                        if (_this.curClassNumberOfRunners >= 10 && passPlace < 10)
                          place += "&numsp;"
                        place += "&#10072;" + (passPlace > 0 ? passPlace : "-") + "&#10072</span>";

                        var passTimeStr;
                        if (last)
                          passTimeStr = _this.formatTime(row.result, ((row.result != row.dbid && row.status == 13) ? 0 : row.status), false);
                        else
                          passTimeStr = _this.formatTime(passTime * 100, 0, false);

                        txt += "<div class=\"tooltip\">" + passTimeStr + place;
                        txt += "<span class=\"tooltiptext\">+" + _this.formatTime(passPlus * 100, 0, false) + "</span></div>";
                        txt += "</span>";
                      }
                      // Second line
                      if (splitTime > 0) {
                        txt += "<br>";
                        if (splitMiss)
                          txt += "<div class = \"splitMiss\">";
                        place = "";

                        if (splitPlace == 1) {
                          place += "<span class=\"place1\"> ";
                          txt += "<span class=\"time1\">";
                        }
                        else if (splitPlace == 2 || splitPlace == 3) {
                          place += "<span class=\"place23\"> ";
                          txt += "<span class=\"time23\">";
                        }
                        else {
                          place += "<span class=\"place\"> ";
                          txt += "<span>";
                        }
                        if (_this.curClassNumberOfRunners >= 10 && splitPlace < 10)
                          place += "&numsp;"
                        place += "&#10072;" + (splitPlace > 0 ? splitPlace : "-") + "&#10072;</span>";
                        txt += "<div class=\"tooltip\">" + _this.formatTime(splitTime * 100, 0, false) + place;
                        var tooltext = "<span class=\"tooltiptext\">+" + _this.formatTime(splitPlus * 100, 0, false);
                        if (splitMiss)
                          tooltext += "<br>Bom: " + _this.formatTime(splitLost * 100, 0, false);
                        tooltext += "</span></div>";
                        txt += tooltext;
                        txt += "</span>";
                      }
                      if (splitMiss)
                        txt += "</span>";
                    };
                    return txt;
                  }
                });
                col++;
              };
            };

            this.currentTable = $('#' + this.resultsDiv).DataTable({
              fixedHeader: true,
              fixedColumns: { leftColumns: 2 },
              scrollX: true,
              paging: false,
              lengthChange: false,
              searching: false,
              info: false,
              data: data.results,
              order: [[1, "asc"]],
              columnDefs: columns,
              destroy: true,
              preDrawCallback: function (settings) {
                var api = new $.fn.dataTable.Api(settings);
                if (api.order()[0] != undefined && api.order()[0][0] !== 1)
                  $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\">&#8635;" + _this.resources["_RESETTODEFAULT"] + "</a>");
              }
            });
          }
        }
      }
    };


    AjaxViewer.prototype.splitAnalyze = function (splitResults) {
      var nRunners = splitResults.length;
      var nSplits = splitResults[0].split_time.length;
      const bestFrac = 0.25; // Best time fraction
      const missFrac = 1.2;  // Criteria for miss indication
      const missMin = 20;    // Minimum number of seconds for a miss indication

      // Calc best times
      var bestTimes = Array(nSplits).fill(-1);
      for (var split = 0; split < nSplits; split++) {
        var times = Array();
        for (var runner = 0; runner < nRunners; runner++) {
          if (splitResults[runner].split_time[split] > 0)
            times.push(splitResults[runner].split_time[split]);
        }
        var nTimes = times.length;
        if (nTimes > 0) {
          times.sort(function (a, b) { return a - b });
          var nBest = nTimes * bestFrac;
          var sumTimes = 0;
          var nBestLast = Math.floor(nBest);
          for (var i = 0; i <= nBestLast; i++)
            sumTimes += (i == nBestLast ? nBest - nBestLast : 1) * times[i];
          bestTimes[split] = sumTimes / nBest;
        }
      }

      // Calc time fractions, misses and lost time
      for (var runner = 0; runner < nRunners; runner++) {
        var frac = Array();
        var fracNom = 0;  // Nominal fraction (median)
        var fracTop = 0;  // Average fraction, up to the mid value
        var nFracTop = 0; // Average top fractions

        splitResults[runner].split_miss = Array(nSplits).fill(false);
        splitResults[runner].split_lost = Array(nSplits).fill(0);

        for (var split = 0; split < nSplits; split++) {
          var time = splitResults[runner].split_time[split];
          if (time > 0)
            frac.push(bestTimes[split] / time);
        }
        var nFrac = frac.length;
        if (nFrac == 0)
          continue;
        frac.sort(function (a, b) { return b - a });
        if (nFrac == 1) {
          fracNom = frac[0];
          nFracTop = 1;
        }
        else if (nFrac % 2 == 0) // Even number
        {
          fracNom = (frac[nFrac / 2 - 1] + frac[nFrac / 2]) / 2;
          nFracTop = nFrac / 2;
        }
        else // Odd number
        {
          fracNom = frac[(nFrac - 1) / 2];
          nFracTop = (nFrac - 1) / 2 + 1;
        }
        var fracTopSum = 0;
        for (var i = 0; i < nFracTop; i++)
          fracTopSum += frac[i];
        fracTop = fracTopSum / nFracTop;

        for (var split = 0; split < nSplits; split++) {
          var time = splitResults[runner].split_time[split];
          if (time > 0) {
            var nomTime = bestTimes[split] / fracNom;
            var missLim = nomTime * missFrac;
            if (time > missLim && (time - nomTime) > missMin) {
              splitResults[runner].split_miss[split] = true;
              splitResults[runner].split_lost[split] = time - bestTimes[split] / fracTop;
            }
          }
        }
      }
    }


    AjaxViewer.prototype.showCourses = function () {
      document.getElementById('myDropdown').classList.toggle("show");
    };


    AjaxViewer.prototype.medianFrac = function (arr, fraction = 0) {
      // Sort values and return the average of values around the mid point
      // The number of values is determined by the fraction parameter (0-1)
      // fraction = 0 returns the median
      var length = arr.length;
      if (length == 0 || fraction < 0 || fraction > 1)
        return null;
      if (length == 1)
        return arr[0];
      var nums = arr.sort((a, b) => a - b);
      var nValues = Math.max(1, fraction * length);
      var min = length / 2 - nValues / 2;
      var max = length / 2 + nValues / 2;
      var indMin = Math.floor(min);
      var indMax = Math.floor(max);
      var sumVal = 0;
      for (var i = indMin; i <= indMax; i++) {
        if (i == indMin)
          sumVal += (indMin + 1 - min) * nums[i];
        else if (i == indMax)
          sumVal += (max - indMax) * nums[i];
        else
          sumVal += nums[i];
      }
      return sumVal / nValues;
    };

    // Converters from Time4o format to LiveRes format

    AjaxViewer.prototype.Time4oClassesToLiveres = function (payload) {
      const classes = (payload?.data ?? []).map(classEntry =>
        this.normalizeClasses(classEntry)).flatMap(c => Array.isArray(c) ? c : [c]);;
      return {
        status: "OK",
        classes: classes ?? "",
        hash: ""
      };
    }

    AjaxViewer.prototype.normalizeClasses = function (classEntry) {
      if (!classEntry) return null;
      _this = this;

      const isRelay = (classEntry.eventForm == "Relay");
      const isUnordered = (classEntry.resultListMode == "Unordered");
      const isChaseStart = (classEntry.startType == "Chasing");
      const showLapTimes = classEntry.showLapTimes ?? false;
      const firstStart = classEntry.firstStart ?? null
      const resultListMode = classEntry.resultListMode ?? null;
      const startType = classEntry.startType ?? null;
      const timingResolution = classEntry.timingResolution ?? null;
      const timingStartTimeSource = classEntry.timingStartTimeSource ?? null;
      const legs = (classEntry.legs ? Object.keys(classEntry.legs).length : 1);
      var intermediateControls;
      classInfo = [];

      for (var i = 1; i <= legs; i++) {
        var legNo = i;
        var className = classEntry.name ?? "NoName";
        var id = classEntry.id ?? "NoId";

        // Relay specific fields
        if (isRelay) {
          legNo = classEntry.legs[i].number ?? 1;
          if (!className.endsWith("-"))
            className += "-";
          className += String(legNo);
          id = id + "." + String(legNo);
          intermediateControls = classEntry.legs[i]?.intermediateControls;
        }
        else {
          intermediateControls = classEntry.intermediateControls;
        }

        const splitcontrols = _this.normalizeIntermediateControls(intermediateControls, classEntry.resultListMode);

        // Add control for exchange times
        if (isChaseStart || (isRelay && legNo >= 2)) {
          splitcontrols.forEach(ctrl => {
            splitcontrols.push({
              code: ctrl.code + 100000,
              order: (2 * ctrl.order - 1),
              name: ctrl.name + "PassTime",
              updated: true
            });
            ctrl.order = 2 * ctrl.order;
          });
          splitcontrols.push({
            code: 0,
            order: 0,
            name: "Exchange",
            updated: true
          });
          splitcontrols.push({
            code: 999,
            order: 999,
            name: "Leg",
            updated: false
          });
          splitcontrols.sort((a, b) => a.order - b.order);
        }

        // Add control for showing time of unordered classes
        if (isUnordered)
          splitcontrols.push({
            code: -999,
            order: 999,
            name: "Time",
            updated: false
          });

        // Show lap times
        if (showLapTimes && splitcontrols.length > 0) {
          splitcontrols.forEach(ctrl => {
            splitcontrols.push({
              code: ctrl.code + 100000,
              order: (2 * ctrl.order - 1),
              name: ctrl.name + "PassTime",
              updated: true
            });
            ctrl.order = 2 * ctrl.order;
          });
          splitcontrols.push({
            code: 999,
            order: 999,
            name: "Leg",
            updated: true
          });
          splitcontrols.sort((a, b) => a.order - b.order);
        }

        classInfo.push(
          {
            className: className,
            showLapTimes: classEntry.showLapTimes ?? false,
            isRelay: isRelay,
            legs: legs,
            firstStart: firstStart ? firstStart : -999,
            resultListMode: resultListMode,
            startType: startType,
            timingResolution: timingResolution,
            id: id,
            splitcontrols: splitcontrols,
            timingStartTimeSource: timingStartTimeSource,
            updatedSplits: splitcontrols.map(ctrl => !!ctrl.updated)
          });
      }
      return classInfo;
    }

    AjaxViewer.prototype.normalizeIntermediateControls = function (intermediateControl, resultListMode) {
      if (!intermediateControl) return [];
      const unordered = ["Unordered", "UnorderedNoTimes"].includes(resultListMode);
      return Object.values(intermediateControl)
        .map((ctrl, idx) => ({
          order: ctrl?.order ?? idx + 1,
          code: (Number(ctrl?.id) + (ctrl?.counter ?? 1) * 1000) * (unordered ? -1 : 1),
          name: ctrl?.name ?? `Split ${idx + 1}`,
          updated: false
        }))
        .sort((a, b) => a.order - b.order);
    }

    AjaxViewer.prototype.Time4oRelayResultsToLiveres = function (payload, className, classes) {

      const entries = (payload?.data ?? []).map(entry => this.normalizeEntry(entry,
        classes.find(c => c.id === entry?.raceClassId)));
      const currentClass = classes.find(c => c.className === className);
      const classNameClean = className.replace(/-[0-9]{1,2}$/, '');

      let legResults = [];
      for (let leg = 1; leg <= currentClass.legs; leg++) {
        legResults[leg - 1] = {
          leg: leg,
          results: entries.filter(e => e.leg == leg)
        };
      }

      return {
        status: "OK",
        className: classNameClean,
        legs: currentClass.legs,
        relayresults: legResults,
      };
    }

    AjaxViewer.prototype.Time4oClubResultsToLiveres = function (payload, classes) {
      const entries = (payload?.data ?? []).map(entry => this.normalizeEntry(entry,
        classes.find(c => c.id === entry?.raceClassId)));

      return {
        status: "OK",
        clubName: entries[0]?.club ?? "",
        results: entries,
        lastchanged: false,
        infotext: "",
        active: 0
      };
    }

    AjaxViewer.prototype.Time4oResultsToLiveres = function (payload, classInfo) {
      if (payload.type === "startList" || payload.type === "plainResults") {
        const entries = (payload?.data ?? []).map(entry =>
          this.normalizeEntry(entry, classInfo.find(c => c.id === entry?.raceClassId)));
        const classEntries = this.groupEntriesByClass(entries, payload.type);
        return {
          status: "OK",
          className: payload.type === "startList" ? "startlist" : "plainresults",
          results: classEntries,
          numEntries: entries.length,
          numResults: (classEntries || []).reduce(
            (sum, c) => sum + (Array.isArray(c.results) ? c.results.length : 0),
            0)
        };
      }
      else {
        const entries = (payload?.data ?? []).map(entry =>
          this.normalizeEntry(entry, classInfo));
        return {
          status: "OK",
          className: classInfo?.className ?? "",
          distance: "",
          splitcontrols: classInfo?.splitcontrols ?? [],
          results: entries,
          lastchanged: false,
          infotext: "",
          updatedSplits: classInfo?.updatedSplits ?? [],
          active: 0
        };
      }
    }

    AjaxViewer.prototype.groupEntriesByClass = function (entries, type) {
      const groups = new Map();
      for (const e of (entries || [])) {
        if (type === "plainResults" && (e.status == 9 || e.status == 10))
          continue;
        const name = e.class || "Unknown";
        if (!groups.has(name))
          groups.set(name, []);
        groups.get(name).push(e);
      }

      var sortType = (type === "startList") ? this.startListSorter : this.resultSorter;
      const grouped = Array.from(groups, ([className, results]) => ({
        className,
        results: results.slice().sort(sortType),
        distance: ""
      }));

      return this.sortClasses(grouped);
    };

    AjaxViewer.prototype.Time4oEntryListToLiveres = function (payload, classes) {
      const entries = (payload?.data ?? []).map(entry =>
        this.normalizeEntry(entry, classes.find(c => c.id === entry?.raceClassId)));
      return {
        status: "OK",
        runners: entries,
        active: 0
      };
    }

    AjaxViewer.prototype.Time4oStatusMap = function (statusKey, unordered) {
      const statusMap = {
        "OK": 0,
        "DidNotStart": 1,
        "DidNotFinish": 2,
        "MissingPunch": 3,
        "Disqualified": 4,
        "OverTime": 5,
        "NotClassified": 6,
        "Overtime": 11,
        "Walkover": 12,
        "Finished": 13
        // runnerStatus[9] = "";
        // runnerStatus[10] = "";
      };
      if (statusKey == "OK" && unordered)
        statusKey = "Finished";
      return statusMap[statusKey] ?? 10;
    }

    AjaxViewer.prototype.normalizeEntry = function (entry, classInfo) {
      if (!entry || !classInfo) return null;
      var _this = this;

      // Start time
      const timingStartTimeSource = entry.timingStartTimeSource ?? classInfo.timingStartTimeSource ?? "Timing";
      const startListStartTime = entry.start?.startTime ?? classInfo.firstStart ?? null;
      let rawStartIso = null;
      if (classInfo.startType === "Free") {
        rawStartIso = entry.time?.startTime ?? null;
      } else if (timingStartTimeSource === "Timing") {
        rawStartIso = entry.time?.startTime ?? startListStartTime;
      }
      else {
        rawStartIso = startListStartTime;
      }
      const startTime = rawStartIso ? _this.toHundredthsSinceMidnight(rawStartIso) : -999;
      var timeFromClassStart = 0;
      if (startTime > 0 && classInfo.firstStart) {
        timeFromClassStart = startTime - _this.toHundredthsSinceMidnight(classInfo.firstStart);
      }

      const unordered = ["Unordered", "UnorderedNoTimes"].includes(classInfo.resultListMode);
      const chaseStart = (classInfo.startType == "Chasing");
      var splits = {};
      var rawResult, rawBehind, place, statusKey, statusValue;
      var startTotalTime = 0;
      var restart = false;

      // Chase start or relay leg >= 2
      if (chaseStart || (classInfo.isRelay && entry.leg?.number >= 2)) {
        restart = entry.time?.restart ?? false;
        statusKey = entry.overallStatus?.status ?? "Unknown";
        statusValue = _this.Time4oStatusMap(statusKey, unordered);
        place = entry.overallResult?.position != null ? String(entry.overallResult.position) : "";
        rawResult = entry.overallResult?.time ?? null;
        rawBehind = entry.overallResult?.behind ?? null;
        if (restart) {
          rawResult += _this.restartTimeOffset * 10;
          rawBehind += _this.restartTimeOffset * 10;
        }

        if (entry.startOverallResult?.time) {
          startTotalTime = Math.floor(entry.startOverallResult.time / 10);
        }
        else if (timeFromClassStart > 0) {
          startTotalTime = timeFromClassStart;
        }
        if (startTotalTime > 0) {
          splits["0"] = startTotalTime + (restart ? _this.restartTimeOffset : 0);
        }

        // Leg result
        if (entry.time?.time != null) {
          let legStatusKey = entry.status?.status ?? "Unknown";
          let legStatusValue = _this.Time4oStatusMap(legStatusKey, unordered);
          let rawLegResult = entry.time?.time ?? null;
          let rawLegBehind = entry.time?.behind ?? null;
          let legResult = rawLegResult != null ? Math.floor(rawLegResult / 10) : -3;
          let legBehind = rawLegBehind != null ? Math.floor(rawLegBehind / 10) : null;
          splits["999"] = legResult > 0 ? legResult : "";
          splits["999_status"] = legStatusValue;
          splits["999_timeplus"] = legBehind >= 0 ? legBehind : "";
          splits["999_place"] = entry.position != null ? String(entry.position) : "-";
        }
      }
      // Individual class
      else {
        statusKey = entry.status?.status ?? "Unknown";
        statusValue = _this.Time4oStatusMap(statusKey, unordered);
        rawResult = entry.time?.time ?? null;
        rawBehind = entry.time?.behind ?? null;
        place = entry.position != null ? String(entry.position) : "";
      }

      let result = rawResult != null ? Math.floor(rawResult / 10) : -3;
      if (statusValue != 0 && statusValue != 9 && statusValue != 10) {
        place = "-";
      }

      // Intermediate times
      const intermediates = entry.intermediateTimes ?? {};
      var prevSplitTime = 0;
      for (const [key, val] of Object.entries(intermediates)) {
        const changedSplit = val?.updated ? Math.floor(Date.parse(val.updated) / 1000) : 0;
        const code = (Number(key.split('-')[1]) * 1000 + Number(key.split('-')[0])) * (unordered ? -1 : 1);
        var timeHundredths = val?.time != null ? Math.floor(val.time / 10) : "";
        var behindHundredths = val?.behind != null ? Math.floor(val.behind / 10) : "";

        // Leg times relay
        if (classInfo.isRelay && entry.leg?.number >= 2) {
          const legTime = timeHundredths !== "" ? timeHundredths - timeFromClassStart : "";
          splits[code + 100000] = legTime;
        }

        // Leg times chase start
        if (chaseStart) {
          const legTime = timeHundredths !== "" ? timeHundredths - startTotalTime : "";
          splits[code + 100000] = legTime;
        }

        if (restart && timeHundredths !== "") {
          timeHundredths += _this.restartTimeOffset;
          behindHundredths += _this.restartTimeOffset;
        }
        splits[code] = timeHundredths;
        splits[`${code}_status`] = statusValue;
        splits[`${code}_changed`] = changedSplit;
        splits[`${code}_timeplus`] = behindHundredths;
        splits[`${code}_place`] = val?.position ?? "-";

        // Lap times
        if (classInfo.showLapTimes) {
          const lapTime = timeHundredths !== "" ? timeHundredths - prevSplitTime : "";
          splits[code + 100000] = lapTime;
          prevSplitTime = val?.time != null ? Math.floor(val.time / 10) : prevSplitTime;
        }
      }

      // Final lap time
      if (classInfo.showLapTimes && result > 0 && result > prevSplitTime) {
        const lapTime = result - prevSplitTime;
        splits[999] = lapTime;
      }

      const changedIso = entry.time?.updated ?? entry.status?.updated ?? entry.updated_at ?? null;
      const changed = changedIso ? Math.floor(Date.parse(changedIso) / 1000) : 0;

      if (statusKey == "Finished") {
        splits["-999"] = result > 0 ? result : "";
        splits["-999_status"] = statusValue;
        splits["-999_changed"] = changed;
        splits["-999_timeplus"] = 0;
        splits["-999_place"] = "F";
        result = entry.person?.id != null ? entry.person.id : 100;
        place = "F";
      }

      // Club
      const clubName = classInfo.isRelay ? (entry.team?.name ?? "") : (entry.organisation?.name ?? "");

      return {
        place: place,
        dbid: entry.person?.id ?? 0,
        bib: entry.start?.bibNo ?? 0,
        name: entry.person?.name ?? "",
        club: clubName,
        clubId: entry.organisation?.id ?? 0,
        class: classInfo.className ?? "",
        leg: classInfo.isRelay ? entry.leg?.number ?? 1 : 0,
        pace: -1,
        status: statusValue,
        splits: splits,
        start: startTime,
        result: result,
        timeplus: rawBehind != null ? Math.floor(rawBehind / 10) : "",
        changed: changed,
        progress: (place != "" ? 100 : 0)
      };
    }

    AjaxViewer.prototype.toHundredthsSinceMidnight = function (isoString) {
      const d = new Date(isoString);
      if (Number.isNaN(d.getTime()))
        return -999;
      const ms = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000 + d.getMilliseconds();
      return Math.round(ms / 10);
    }

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
          .replace(/kvart/gi, "b")
          .replace(/semi/gi, "c")
          .replace(/finale/gi, "d");
      };

      return classes.slice().sort((a, b) => {
        const keyA = sortWeight(a);
        const keyB = sortWeight(b);
        if (keyA === keyB)
          return 0;
        return keyA < keyB ? -1 : 1;
      });
    }

    // ReSharper disable once InconsistentNaming
    AjaxViewer.VERSION = "2016-08-06-01";
    return AjaxViewer;
  }());

  LiveResults.AjaxViewer = AjaxViewer;
})(LiveResults || (LiveResults = {}));

Date.prototype.stdTimezoneOffset = function () {
  var jan = new Date(this.getFullYear(), 0, 1);
  var jul = new Date(this.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
};

Date.prototype.dst = function () {
  return this.getTimezoneOffset() < this.stdTimezoneOffset();
};