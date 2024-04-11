var LiveResults;
(function (LiveResults) {
  // ReSharper disable once InconsistentNaming
  LiveResults.Instance = null;
  var AjaxViewer = /** @class */ (function () {
    function AjaxViewer(competitionId, language, classesDiv, lastPassingsDiv, resultsHeaderDiv, resultsControlsDiv, resultsDiv, txtResetSorting,
      resources, isMultiDayEvent, isSingleClass, setAutomaticUpdateText, setCompactViewText, runnerStatus, showTenthOfSecond, radioPassingsDiv,
      EmmaServer = false, filterDiv = null, fixedTable = false) {
      var _this = this;
      this.local = true;
      this.competitionId = competitionId;
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
      this.fixedTable = fixedTable;
      this.updateAutomatically = true;
      this.autoUpdateLastPassings = true;
      this.compactView = true;
      this.showEcardTimes = false;
      this.showTimesInSprint = false;
      this.showCourseResults = false;
      this.showTenthOfSecond = false;
      this.updateInterval = (this.local ? 2000 : (EmmaServer ? 15000 : 10000));
      this.radioUpdateInterval = (this.local ? 2000 : 5000);
      this.clubUpdateInterval = 60000;
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
      this.runnerList = null;
      this.speakerView = false;
      this.shortSprint = false;
      this.browserType = this.isMobile(); // 1:Mobile, 2:iPad, 3:PC and other
      this.maxNameLength = (this.browserType == 1 ? 15 : (this.browserType == 2 ? 22 : 30));
      this.maxClubLength = (this.browserType == 1 ? 12 : (this.browserType == 2 ? 15 : 20));
      this.apiURL = (EmmaServer ? "https://liveresultat.orientering.se/api.php" : (this.local ? "api/api.php" : "//api.liveres.live/api.php"));
      this.radioURL = (this.local ? "api/radioapi.php" : "//api.liveres.live/radioapi.php");
      this.messageURL = (this.local ? "api/messageapi.php" : "//api.liveres.live/messageapi.php");
      LiveResults.Instance = this;

      $(document).ready(function (e) {
        _this.onload();
      });

      $(window).on('hashchange', function (e) {
        _this.onload();
      });

      $(window).on('resize', function () {
        if (_this.currentTable == null || _this.curClassName == "startlist" || (_this.curClassName != null && _this.curClassName.includes("plainresults")))
          return;
        else
        {
          _this.currentTable.api().fixedHeader.disable();
          _this.currentTable.api().columns.adjust().draw();
          _this.currentTable.api().fixedHeader.enable();
        }

      });
    }

    AjaxViewer.prototype.onload = function () {
      var _this = this;
      if (window.location.hash) {  
        var hash = window.location.hash.substring(1);
        var cl;
        if (hash.indexOf('club::') >= 0) {
          cl = decodeURIComponent(hash.substring(6));
          if (cl != _this.curClubName)
            LiveResults.Instance.viewClubResults(cl);
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
          if (cl != _this.curRelayView)
            LiveResults.Instance.viewRelayResults(cl);
        }
        else {
          cl = decodeURIComponent(hash);
          if (cl != _this.curClassName)
            setTimeout(function () { _this.chooseClass(cl); }, 100);
        }
      }
    }

    AjaxViewer.prototype.startPredictedTimeTimer = function () {
      var _this = this;
      let dt = new Date();
      let ms = dt.getMilliseconds();
      let timer = (ms>950 ? 2000-ms : 1000-ms);
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
      this.inactiveTimer += this.classUpdateInterval / 1000;
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
    AjaxViewer.prototype.updateClassList = function () {
      var _this = this;
      this.inactiveTimer += this.classUpdateInterval / 1000;

      if (this.updateAutomatically) {
        $.ajax({
          url: this.apiURL,
          data: "comp=" + this.competitionId + "&method=getclasses&last_hash=" + this.lastClassListHash,
          success: function (data) {
            _this.handleUpdateClassListResponse(data);
          },
          error: function () {
            _this.classUpdateTimer = setTimeout(function () { _this.updateClassList(); }, _this.classUpdateInterval);
          },
          dataType: "json"
        });
      }
    };
    AjaxViewer.prototype.handleUpdateClassListResponse = function (data) {
      var _this = this;
      if (data.rt != undefined && data.rt > 0)
        this.classUpdateInterval = data.rt * 1000;
      if (data != null && data.status == "OK") {
        this.courseNames = data.courses; 
        $('#divInfoText').html(data.infotext);
        if (!data.classes || !$.isArray(data.classes) || data.classes.length == 0)
          $('#resultsHeader').html("<b>" + this.resources["_NOCLASSESYET"] + "</b>");
        if (data.classes != null) {
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
                    str += "<b> " + classNameClean + "</b><br/>&nbsp;";
                  else
                    str += "<a href=\"javascript:LiveResults.Instance.viewRelayResults('" + classNameURL.replace(/-[0-9]{1,2}$/, '') + "')\" style=\"text-decoration: none\"><b> " + classNameClean + "</b></a><br/>&nbsp;";
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
                            "')\" style=\"text-decoration: none\"><b>" + this.shortClassName(classNameCleanSprint) + "</b></a><br/>&nbsp;";
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
                  str += "<br/>&nbsp;"
                if (className.replace(classNameClean, '') == "-All")
                  legText = "&#9398";
                else
                  legText = "<span style=\"font-size:1.2em\">&#" + (10111 + leg) + "</span>";
                str += "<a href=\"javascript:LiveResults.Instance.chooseClass('" + classNameURL + "')\" style=\"text-decoration: none\"> " + legText + "</a>";
                if (!relayNext)
                  str += "<br/>";
              }
              else if (sprint) {
                var heatStr = className.match(/ \d+$/);
                var heat = parseInt((heatStr != null ? heatStr[0] : 0), 10);
                if (heat > 1 && (heat - 1) % 3 == 0) // Line shift every 3 heat
                  str += "<br/>&nbsp;"
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
                  str += "<br/>";
                else if (shiftHeat)
                  str += "<br/>&nbsp;";
              }
              else
              {
                var elit = (className.toLowerCase().match(/(-e| e|\d+e|elite|wre)(\s*\d*)$/) != null);
                if (!elit && elitLast && !this.EmmaServer)
                  str += "<hr>";
                str += "<a href=\"javascript:LiveResults.Instance.chooseClass('" + classNameURL + "')\">" + className + "</a><br/>";
                elitLast = elit;
              }
            }
          };
          if (!this.EmmaServer) {
            str += "<hr><a href=\"javascript:LiveResults.Instance.chooseClass('plainresults')\" style=\"text-decoration: none\">Alle klasser</a>";
            str += "<br/><a href=\"javascript:LiveResults.Instance.chooseClass('startlist')\" style=\"text-decoration: none\">Startliste</a>";
            if (this.isMultiDayEvent)
              str += "<br/><a href=\"javascript:LiveResults.Instance.chooseClass('plainresultstotal')\" style=\"text-decoration: none\">" + this.resources["_TOTAL"] + "</a>";
          }
          if (this.showCourseResults && data.courses != undefined) {
            str += "<hr></nowrap>";           
            for (var i = 0; i < this.courseNames.length; i++) {
              str += "<a href=\"javascript:LiveResults.Instance.chooseClass('course::" + this.courseNames[i].No + "')\">" + this.courseNames[i].Name + "</a><br/>";
            }
          }

          str += "<hr></nowrap>";
          $("#" + this.classesDiv).html(str);
          $("#numberOfRunnersTotal").html(data.numberOfRunners);
          $("#numberOfRunnersStarted").html(data.numberOfStartedRunners);
          $("#numberOfRunnersFinished").html(data.numberOfFinishedRunners);

          this.lastClassListHash = data.hash;
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
          if (data.results[i].start != undefined && data.results[i].start > 0 ) {
            if (first)
            {
              first = false;
              firstStart = data.results[i].start;
              lastStart = data.results[i].start;
            } 
            else
            { 
              firstStart = Math.min(data.results[i].start,firstStart);
              lastStart = Math.max(data.results[i].start,lastStart);
            }
          }
        }
        isMassStart = (lastStart-firstStart<100);
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

      const validateLim   = 0.333;  // Fraction of runners with split to set split to OK
      const minNum        = 3;      // Minimum numbers of runners to set split to BAD
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
          var finishTime = ( finishOK ? parseInt(data.results[j].result) : 8640000); // 24 h
          if (isNaN(split) && laterSplitOKj[j]){ // Split does not exist and missing split detected
            statusN++;
            runnerOK[j] = false;
            raceOK = false;
          }
          else if (split < 0 || split > finishTime){ // Remove split if negative or longer than finish time
            statusN++;
            data.results[j].splits[classSplits[spRef].code] = "";
            data.results[j].splits[classSplits[spRef].code + "_changed"] = "";
            runnerOK[j] = false;
            raceOK = false;
          }
          else if (!isNaN(split)){ // Split exists and time is OK
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
      var splitFracRunner = Array.from({ length: this.curClassNumSplits + 1 }, _ => [0]);
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
        for (var sp = this.curClassNumSplits - 1; sp >= 0; sp--){
          if (!classSplitsOK[sp]) // Bad split
            continue;
          var spRef = this.splitRef(sp);
          split = parseInt(data.results[j].splits[classSplits[spRef].code]);
          if (!isNaN(split)){ // Split exist
            if (sp == this.curClassNumSplits - 1 && nextSplit != null && nextSplit > split){ // last split time
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
          else{ // Split does not exist
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
        if (!classSplitsOK[sp]){ // Bad split
          splitsPar.push(null);
          continue;
        }
        
        // Median split fractions
        var numFractions = 0;
        var fractions = [];
        for (var j = 0; j < numRunners; j++){
          if (splitFracRunner[sp][j] > 0 && splitFracRunner[sp][j] < 1){
            fractions.push(splitFracRunner[sp][j]);
            numFractions++;
          }
        }
        if (numFractions == 0){
          splitsPar.push(null);
          continue;
        }
        var median = this.medianFrac(fractions, 0.25);

        // Median absolute deviation
        var absdev = [];
        for (var j = 0; j < numRunners; j++){
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
        var stdDev = 1.48*medianDev;     
        
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
      if (!this.curClassIsRelay && !this.curClassIsLapTimes){
        for (var sp1 = 0; sp1 < this.curClassNumSplits-1; sp1++){
          var code1 = classSplits[sp1].code;
          for (var sp2 = sp1+1; sp2 < this.curClassNumSplits; sp2++){
            var code2 = classSplits[sp2].code;
            if ((code2 - code1) % 1000 == 0){
              multiPass = true;
              break;
            }
          }
        }
      }
      
      // Shift split times if splits are missing when multi-pass type
      if (multiPass && !raceOK){
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
        for (var j = 0; j < numRunners; j++){
          if (runnerOK[j])
            continue;
          var finishOK = (data.results[j].place != undefined && data.results[j].place > 0 || data.results[j].place == "=");
          var finishTime = parseInt(data.results[j].result); 
          if (!finishOK || finishTime <= 0)
            continue;
          for (var sp = this.curClassNumSplits - 1; sp >= 0; sp--) {
            var spRef = this.splitRef(sp);
            split = parseInt(data.results[j].splits[classSplits[spRef].code]);
            if (isNaN(split)){      
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
              if (spi >= 0){ // A matching split exists
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
              if (bestFitSpi == sp){ // Best fit is to move split time to current split
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
      const minDev     = 0.15;  // Minimum deviation from median fraction to set unlikely split
      const stdFactor  = 1.48;  // Conversion from abs median deviation to standard deviation
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
          var devLimit = Math.max(minDev, stdFactor*splitsPar[sp].medianDev*Math.exp(1.19 + 1.5*Math.exp(-0.14*(splitsPar[sp].numFractions-1))));
          var splitFrac = Math.max(splitsPar[sp].min, Math.min(splitsPar[sp].max, splitsPar[sp].a*j + splitsPar[sp].b));
          if (splitFrac - splitFracRunner[sp][j] > devLimit) {
              data.results[j].splits[classSplits[spRef].code] = "";
              data.results[j].splits[classSplits[spRef].code + "_changed"] = "";
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
          else{  // No split but estimate parameters exist, calculate and insert estimated split        
            var x = [];
            var spPrev = sp;
            while (isNaN(prevSplit) && spPrev >= 0) // Find first of previous splits that exist
            {
              if (classSplitsOK[spPrev])
                x.push(Math.max(splitsPar[spPrev].min, Math.min(splitsPar[spPrev].max, splitsPar[spPrev].a*j + splitsPar[spPrev].b)));
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

      // Update split places
      for (var sp = 0; sp < classSplits.length; sp++) {
        if (!classSplitsUpdated[sp])
          continue;
        data.results.sort(this.splitSort(sp, classSplits));

        var splitPlace = 1;
        var curSplitPlace = 1;
        var curSplitTime = "";
        var bestSplitTime = -1;
        var bestSplitKey = -1;
        var secondBest = false;

        for (var j = 0; j < numRunners; j++) {
          var spTime = "";
          var raceStatus = data.results[j].status;

          if (data.results[j].splits[classSplits[sp].code] != undefined && data.results[j].splits[classSplits[sp].code] != "") {
            spTime = data.results[j].splits[classSplits[sp].code];
            if (bestSplitTime < 0 && (raceStatus == 0 || raceStatus == 9 || raceStatus == 10)) {
              bestSplitTime = spTime;
              bestSplitKey = j;
            }
          }
          if (spTime != "") {
            data.results[j].splits[classSplits[sp].code + "_timeplus"] = spTime - bestSplitTime;
            if (!secondBest && bestSplitKey > -1 && j != bestSplitKey && (raceStatus == 0 || raceStatus == 9 || raceStatus == 10)) {
              data.results[bestSplitKey].splits[classSplits[sp].code + "_timeplus"] = bestSplitTime - spTime;
              secondBest = true;
            }
          }
          else
            data.results[j].splits[classSplits[sp].code + "_timeplus"] = -2;

          if (curSplitTime != spTime)
            curSplitPlace = splitPlace;

          if (raceStatus == 0 || raceStatus == 9 || raceStatus == 10) {
            data.results[j].splits[classSplits[sp].code + "_place"] = curSplitPlace;
            splitPlace++;
            if (data.results[j].splits[classSplits[sp].code] != undefined && data.results[j].splits[classSplits[sp].code] != "")
              curSplitTime = data.results[j].splits[classSplits[sp].code];
          }
          else if (raceStatus == 13)
            data.results[j].splits[classSplits[sp].code + "_place"] = "F";
          else {
            data.results[j].splits[classSplits[sp].code + "_place"] = "-";
            data.results[j].splits[classSplits[sp].code + "_status"] = raceStatus;
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
    AjaxViewer.prototype.refSplit = function (spRef, totTime = false) {
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

          var data = this.currentTable.fnGetData();
          var table = this.currentTable.api();
          var offset = 3 + (this.curClassHasBibs ? 1 : 0) + ((this.curClassIsUnranked || this.compactView && !this.curClassLapTimes) ? 1 : 0);
          var MDoffset = (this.curClassIsCourse ? 1 : 0) +  (this.isMultiDayEvent && !this.compactView && !this.curClassIsUnranked ? -1 : 0) // Multiday offset
          var rank;
          const predOffset = 1500;
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

              if (highlight) {
                if (this.compactView || this.curClassIsRelay || this.curClassLapTimes) {
                  if (!$(table.cell(i, (offset + this.curClassNumSplits * 2)).node()).hasClass('red_cell_sqr')) {
                    $(table.cell(i, (offset + this.curClassNumSplits * 2)).node()).addClass('red_cell_sqr');
                    $(table.cell(i, (offset + this.curClassNumSplits * 2 + 2)).node()).addClass('red_cell');
                    if (this.isMultiDayEvent) {
                      $(table.cell(i, (offset + this.curClassNumSplits * 2 + 3)).node()).addClass('red_cell_sqr');
                      $(table.cell(i, (offset + this.curClassNumSplits * 2 + 5)).node()).addClass('red_cell');
                    }
                  }
                }
                else {
                  if (!$(table.cell(i, (offset + this.curClassNumSplits * 2)).node()).hasClass('red_cell')) {
                    $(table.cell(i, (offset + this.curClassNumSplits * 2)).node()).addClass('red_cell');
                    if (this.isMultiDayEvent)
                      $(table.cell(i, (offset + this.curClassNumSplits * 2 + 2)).node()).addClass('red_cell');
                  }
                }
              }
              else // Not highlight
              {
                if (this.compactView || this.curClassIsRelay || this.curClassLapTimes) {
                  if ($(table.cell(i, (offset + this.curClassNumSplits * 2)).node()).hasClass('red_cell_sqr')) {
                    $(table.cell(i, (offset + this.curClassNumSplits * 2)).node()).removeClass('red_cell_sqr');
                    $(table.cell(i, (offset + this.curClassNumSplits * 2 + 2)).node()).removeClass('red_cell');
                    if (this.isMultiDayEvent) {
                      $(table.cell(i, (offset + this.curClassNumSplits * 2 + 3)).node()).removeClass('red_cell_sqr');
                      $(table.cell(i, (offset + this.curClassNumSplits * 2 + 5)).node()).removeClass('red_cell');
                    }
                  }
                }
                else {
                  if ($(table.cell(i, (offset + this.curClassNumSplits * 2)).node()).hasClass('red_cell')) {
                    $(table.cell(i, (offset + this.curClassNumSplits * 2)).node()).removeClass('red_cell');
                    if (this.isMultiDayEvent)
                      $(table.cell(i, (offset + this.curClassNumSplits * 2 + 2)).node()).removeClass('red_cell');
                  }
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
                  $(table.cell(i, colNum).node()).addClass('red_cell');
                  highlightEmma = true;
                  highlight = true;
                }
                else if (data[i].splits[this.curClassSplits[spRef].code + "_changed"] != "") {
                  age = timeServer - data[i].splits[this.curClassSplits[spRef].code + "_changed"];
                  highlight = (age < this.highTime);
                }
                if (highlight && !$(table.cell(i, colNum).node()).hasClass('red_cell')) {
                  $(table.cell(i, colNum).node()).addClass('red_cell');
                }
                else if (!highlight && $(table.cell(i, colNum).node()).hasClass('red_cell')) {
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
                  var elapsedTimeStr = (this.curClassIsRelay ? "<i>⟳" : "<i>") + this.formatTime(elapsedTime, 0, false) + "</i>";
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
                        timeDiffStr = "<span class=\"place\"><i>&#10072;..&#10072;</i></span>";
                        if (this.isMultiDayEvent && !this.compactView) {
                          timeDiffStr = "";
                          elapsedTimeStr += "<span class=\"place\"> <i>&#10072;..&#10072;</i></span>";
                        }
                      }
                      if (this.isMultiDayEvent && !this.compactView) {
                        if (this.curClassNumberOfRunners >= 10)
                          elapsedTimeStr += "<br/>" + timeDiffStr + "<span class=\"place\"> &numsp;<i>&#10072;..&#10072;</i></span>";
                        else
                          elapsedTimeStr += "<br/>" + timeDiffStr + "<span class=\"place\"> <i>&#10072;..&#10072;</i></span>";
                      }
                      else
                        table.cell(i, 6 + MDoffset + (this.curClassHasBibs ? 1 : 0)).data(timeDiffStr);
                    }
                    table.cell(i, 4 + MDoffset + (this.curClassHasBibs ? 1 : 0)).data(elapsedTimeStr);

                    // Insert finish time if predict ranking is on
                    if (predRank && this.rankedStartlist && !this.curClassIsRelay && !this.curClassLapTimes && !this.curClassIsUnranked &&
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
                        elapsedTimeStr += "<br/>" + timeDiffStr + extraSpace;
                      table.cell(i, offset + this.curClassNumSplits * 2).data(elapsedTimeStr);

                      // Update predData: Insert current time if longer than a runner with larger index / virtual position
                      if (predRank && !this.curClassIsRelay && !this.curClassLapTimes) {
                        if (nextSplit == 0 && this.rankedStartlist) // First split
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
          if (updatedVP){
            if (this.qualLimits != null && this.qualLimits.length > 0)
              this.updateQualLimMarks(data, this.curClassName);
            table.rows().invalidate();
          }
          
          if (updatedVP || timesOnly)
            table.columns.adjust().draw();

          if (!timesOnly){
            if (updatedVP)
              this.animateTable(oldData, data, this.animTime, true);
            else 
              this.startPredictedTimeTimer();
          }
        }
        catch (e) 
        { 
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
      if (this.updateAutomatically && this.autoUpdateLastPassings) {
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
            var cl = value["class"];
            var status = value["status"];
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
            str += value.passtime + ": " + bibStr + runnerName
              + " (<a href=\"javascript:LiveResults.Instance.chooseClass('" + cl + "')\">" + value["class"] + "</a>) "
              + (value.control == 1000 && status > 0 && status < 7 ? _this.resources["_NEWSTATUS"] :
                (value.control == 1000 ? _this.resources["_LASTPASSFINISHED"] : _this.resources["_LASTPASSPASSED"] + " " + value["controlName"])
                + " " + _this.resources["_LASTPASSWITHTIME"]) + " " + value["time"] + "<br/>";
          });
          $("#" + this.lastPassingsDiv).html(str);
          this.lastPassingsUpdateHash = data.hash;
        }
      }
      if (_this.isCompToday())
        this.passingsUpdateTimer = setTimeout(function () { _this.updateLastPassings(); }, _this.updateInterval);
    };

    //Request data for the last radio passings div
    AjaxViewer.prototype.updateRadioPassings = function (code, calltime, minBib, maxBib) {
      var _this = this;
      clearTimeout(this.radioPassingsUpdateTimer);
      if (this.updateAutomatically) {
        $.ajax({
          url: this.radioURL,
          data: "comp=" + this.competitionId + "&method=getradiopassings&code=" + code + "&calltime=" + calltime +
            "&minbib=" + minBib + "&maxbib=" + maxBib +
            "&lang=" + this.language + "&last_hash=" + this.lastRadioPassingsUpdateHash,
          success: function (data, status, resp) {
            var expTime = new Date();
            expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
            _this.handleUpdateRadioPassings(data, expTime, code, calltime, minBib, maxBib);
          },
          error: function () {
            _this.radioPassingsUpdateTimer = setTimeout(function () { _this.updateRadioPassings(); }, _this.radioUpdateInterval);
          },
          dataType: "json"
        });
      }
    };

    //Handle response for updating the last radio passings..
    AjaxViewer.prototype.handleUpdateRadioPassings = function (data, expTime, code, calltime, minBib, maxBib) {

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
        var time = dt.getSeconds() + 60 * dt.getMinutes() + 3600 * dt.getHours();
        $.each(this.radioData, function (idx, passing) {
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
        var oldData = $.extend(true, [], this.currentTable.fnGetData());
        this.currentTable.fnClearTable();
        this.currentTable.fnAddData(this.radioData, true);
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
            columns.push({ "sTitle": "Sted", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "controlName" });
            columns.push({ "sTitle": "Tidsp.", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "passtime" });
          }
          columns.push({
            "sTitle": "&#8470;", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "bib",
            "render": function (data, type, row) {
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
            "sTitle": "Navn", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "runnerName",
            "render": function (data, type, row) {
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
            "sTitle": "Klubb", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "club",
            "render": function (data, type, row) {
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
            "sTitle": "Klasse", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "class",
            "render": function (data, type, row) {
              var link = "<a href=\"followfull.php?comp=" + _this.competitionId + "&class=" + encodeURIComponent(row.class);
              link += "\" target=\"_blank\" style=\"text-decoration: none;\">" + row.class + "</a>";
              return link;
            }
          });
          if (!leftInForest && this.radioData.length > 0 && this.radioData[0].rank != null)
            columns.push({
              "sTitle": "#", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "rank",
              "render": function (data, type, row) {
                var res = "";
                if (row.rank >= 0) res += row.rank;
                return res;
              }
            });

          var timeTitle = "Tid";
          if (leftInForest)
            timeTitle = "Starttid";
          columns.push({ "sTitle": timeTitle, "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "time" });

          if (!leftInForest && this.radioData.length > 0 && this.radioData[0].timeDiff != null)
            columns.push({
              "sTitle": "Diff", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "timeDiff",
              "render": function (data, type, row) {
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
              "sTitle": "", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "status",
              "render": function (data, type, row) {
                var res = "";
                if (row.checked == 1 || row.status == 9)
                  res += "&#9989; "; // Green checkmark
                else
                  res += "&#11036; "; // Empty checkbox
                return res;
              }
            });
            columns.push({
              "sTitle": "DNS", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "controlName",
              "render": function (data, type, row) {
                var runnerName = (Math.abs(row.bib) > 0 ? "(" + Math.abs(row.bib) + ") " : "") + row.runnerName;
                var link = "<button onclick=\"res.popupDialog('" + runnerName + "'," + row.dbid + ",1);\">&#128172;</button>";
                return link;
              }
            });
          }

          this.currentTable = $('#' + this.radioPassingsDiv).dataTable({
            fixedHeader: true,
            paging: false,
            lengthChange: false,
            searching: true,
            info: false,
            data: this.radioData,
            ordering : false,
            order: [[1, "desc"]],
            columnDefs: columns,
            destroy: true,
            dom: 'lrtip',
            orderCellsTop: true
          });
        }
      }
      if (this.isCompToday())
        this.radioPassingsUpdateTimer = setTimeout(function () { _this.updateRadioPassings(code, calltime, minBib, maxBib); }, this.radioUpdateInterval);
      else
        $('#liveIndicator').html('<span class="notLiveClient" id="liveIndicator">◉</span>');

    };

    //Request data for the last radio passings div
    AjaxViewer.prototype.updateStartRegistration = function (openStart) {
      var _this = this;
      clearTimeout(this.radioPassingsUpdateTimer);
      if (this.updateAutomatically) {
        $.ajax({
          url: this.apiURL,
          data: "comp=" + this.competitionId + "&method=getrunners" + "&last_hash=" + this.lastRadioPassingsUpdateHash,
          success: function (data, status, resp) {
            var expTime = new Date();
            expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
            _this.handleUpdateStartRegistration(data, expTime, openStart);
          },
          error: function () {
            _this.radioPassingsUpdateTimer = setTimeout(function () { _this.updateStartRegistration(); }, _this.radioUpdateInterval);
          },
          dataType: "json"
        });
      }
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
        this.lastRadioPassingsUpdateHash = data.hash;
        this.radioData = data.runners;
        this.radioData.sort(this.startSorter);

        // Modify data-table
        if (this.currentTable != null) // Existing datatable
        {
          var scrollX = window.scrollX;
          var scrollY = window.scrollY;
          this.currentTable.fnClearTable();
          this.currentTable.fnAddData(this.radioData, true);
          this.filterTable();
          window.scrollTo(scrollX, scrollY);
        }  
        else if (this.currentTable == null) // New datatable
        {
          if (this.radioData != null && this.radioData.length > 0) {
            var columns = Array();
            var col = 0;    
            columns.push({
              "sTitle": "&#8470;", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "bib",
              "render": function (data, type, row) {
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
              "sTitle": "Navn", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "name",
              "render": function (data, type, row) {
                if (type === 'display') 
                {
                  var name = (data.length > _this.maxNameLength? _this.nameShort(data) : data);                  
                  return name;
                }
                else
                  return data;
              }
            });
            columns.push({
              "sTitle": "Klubb", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "club",
              "render": function (data, type, row) {
                if (type === 'display') 
                {
                  var club = (data.length > _this.maxClubLength ? _this.clubShort(data) : data);                  
                  return club;
                }
                else
                  return data;               
              }
            });
            columns.push({
              "sTitle": "Klasse", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "class",
              "render": function (data, type, row) {
                var link = "<a href=\"followfull.php?comp=" + _this.competitionId + "&class=" + encodeURIComponent(row.class);
                link += "\" target=\"_blank\" style=\"text-decoration: none;\">" + row.class + "</a>";
                return link;
              }
            });
            columns.push({
              "sTitle": "Brikke", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "ecard1",
              "render": function (data, type, row) {
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
              "sTitle": "Starttid", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "start",
              "render": function (data, type, row) {
                return data;
              }
            });
            
            var message = "<button onclick=\"res.popupDialog('Generell melding',0,0);\">&#128172;</button>";
            columns.push({
              "sTitle": message, "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "start",
              "render": function (data, type, row) {
                var defaultDNS = (row.dbid > 0 ? 1 : 0);
                var name = (Math.abs(row.bib) > 0 ? "(" + Math.abs(row.bib) + ") " : "") + row.name;
                var link = "<button onclick=\"res.popupDialog('" + name + "'," + row.dbid + "," + defaultDNS + ");\">&#128172;</button>";
                return link;
              }
            });

            this.currentTable = $('#' + this.radioPassingsDiv).dataTable({
              fixedHeader: true,
              paging: false,
              lengthChange: false,
              searching: true,
              info: false,
              data: this.radioData,
              ordering : false,
              columnDefs: columns,
              destroy: true,
              dom: 'lrtip',
              orderCellsTop: true
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
    
    // Update start list
    AjaxViewer.prototype.filterStartRegistration = function (openStart) {
      if (this.radioData != null) {
        try {
          var _this = this;
          var dt = new Date();
          this.updateStartClock(dt);
          var time = dt.getSeconds() + 60*dt.getMinutes() + 3600*dt.getHours();
          var data = this.currentTable.fnGetData();
          var table = this.currentTable.api();

          var callTime = parseInt($('#callTime')[0].value)*60;
          var postTime = parseInt($('#postTime')[0].value)*60;
          var minBib = parseInt($('#minBib')[0].value);
          var maxBib = parseInt($('#maxBib')[0].value);

          var preTime  = 60;
          var firstUnknown = true;
          var firstOpen = true;
          var firstInCallTime = true;
          var firstInPostTime = true;
          var lastStartTime   = -1000; 
          var shownId = Array(0);
          var timeBeforeStartMakeSound = 4;  
          var startBeep = 0; // 0: no, 1: short, 2: long
  
          // *** Hide or highlight rows ***
          for (var i = 0; i < data.length; i++){
            var row = table.row(i).node();
            $(row).hide();
            
            const showStatus = [1,9,10]; // DNS, Started, Entered
            if (data[i].bib < minBib || data[i].bib > maxBib || !showStatus.includes(data[i].status)){
              continue;
            }
            
            if (data[i].dbid < 0){
              $(row).show();
              shownId.push({dbid: data[i].dbid});
              if (firstUnknown){
                $(row).addClass('firstnonqualifier');
                firstUnknown = false;
              }
              $(row).addClass('red_row');
              continue;
            }

            if (openStart){
              if (data[i].starttime == -999){
                $(row).show();
                shownId.push({dbid: data[i].dbid});
                if (firstOpen){
                  $(row).addClass('firstnonqualifier');
                  firstOpen = false;
                }
              }
            }
            else{ // Timed start
              $(row).removeClass();
              var startTimeSeconds = data[i].starttime/100;
              var timeToStart = startTimeSeconds-time;
              
              if (timeToStart == 0)
                startBeep = 2;
              else if (startBeep == 0 && timeToStart > 0 && timeToStart <= timeBeforeStartMakeSound)
                startBeep = 1; 

              if (timeToStart <= -postTime)
                continue;
              else if (timeToStart <= 0){
                $(row).show();
                shownId.push({dbid: data[i].dbid});
                $(row).addClass('pre_post_start')
                if (firstInPostTime){
                  $(row).addClass('firststarter');
                  firstInPostTime = false;
                }
              }
              else if (timeToStart <= callTime){
                $(row).show();
                shownId.push({dbid: data[i].dbid});
                if (firstInCallTime){
                  $(row).addClass('firststarter yellow_row');
                  firstInCallTime = false;
                }
                else if (lastStartTime - startTimeSeconds > 29)
                  $(row).addClass('yellow_row_new');
                else
                  $(row).addClass('yellow_row');
              }
              else if (timeToStart <= callTime + preTime)
              {
                $(row).show();
                shownId.push({dbid: data[i].dbid});
                $(row).addClass('pre_post_start');
              }
              lastStartTime = startTimeSeconds;
            }
            if (data[i].status == 1 || this.messageBibs.indexOf(data[i].dbid) > -1)
              $(row).addClass('dns');
          }

          for (var i = 0; i < shownId.length; ++i) {
            if (shownId[i].dbid !== this.prewShownId[i])
            {
              this.animateTable(_this.prewShownId,shownId,_this.animTime);
              break;
            }
          }
          this.prewShownId = shownId;
          if (startBeep>0 && !this.audioMute)
            window.makeStartBeep(startBeep==2); // 2 : long beep
          
          var dt = new Date();
          var ms = dt.getMilliseconds();
          var timer = (ms>800 ? 2000-ms : 1000-ms);
          this.updateStartRegistrationTimer = setTimeout(function () { _this.filterStartRegistration(openStart); }, timer);  
        }
        catch (e) { };
      }
    }
    
    AjaxViewer.prototype.updateStartClock = function (dt) {
      var currTime = new Date(Math.round(dt.getTime()/1000)*1000);
      var timeID = document.getElementById("time");
      var HTMLstringCur = currTime.toLocaleTimeString('en-GB');
      timeID.innerHTML = HTMLstringCur;

      var callTime = document.getElementById("callTime").value;	
      var preTimeID = document.getElementById("pretime");
      if ( preTimeID!= null )
      {
        var preTime = new Date(currTime.valueOf() + callTime*60*1000);
        var HTMLstringPre = preTime.toLocaleTimeString('en-GB');
        preTimeID.innerHTML = HTMLstringPre;
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
          success: function (data, status, resp) {
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
          "sTitle": "St.no", "bVisible": false, "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "bib",
          "render": function (data, type, row) {
            return Math.abs(data);
          }
        });
        columns.push({
          "sTitle": "St.no", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "bib",
          "render": function (data, type, row) {
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
          "sTitle": "Navn", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "name",
          "render": function (data, type, row) {
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
          "sTitle": "Klubb", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "club",
          "render": function (data, type, row) {
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
          "sTitle": "Klasse", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "class",
          "render": function (data, type, row) {
            className = row.class;
            var link = "<a href=\"followfull.php?comp=" + _this.competitionId + "&class=" + encodeURIComponent(row.class);
            link += "\" target=\"_blank\" style=\"text-decoration: none;\">" + row.class + "</a>";
            if (row.status == 1) // DNS
              return ("<del>" + link + "</del>");
            else
              return link;
          }
        });

        columns.push({
          "sTitle": "Starttid", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "start",
          "render": function (data, type, row) {
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
          "sTitle": "Brikke#1", "sClass": "center", "bSortable": false, "aTargets": [col++], "mDataProp": "ecard1",
          "render": function (data, type, row) {
            var bibStr = (row.bib == 0 ? "" : "(" + (row.bib < 0 ? (-row.bib / 100 | 0) + "-" + (-row.bib % 100) : row.bib) + ") ");
            var ecardStr = (row.ecard1 == 0 ? "-" : row.ecard1);
            var runnerName = bibStr + row.name;
            var link = "<button style=\"width:50px\" onclick=\"res.popupDialog('" + runnerName + ". Endre brikke 1 fra "
              + ecardStr + " til '," + row.dbid + ",0,1);\">" + ecardStr + "</button>";
            return link;
          }
        });
        columns.push({
          "sTitle": "Brikke#2", "sClass": "center", "bSortable": false, "aTargets": [col++], "mDataProp": "ecard2",
          "render": function (data, type, row) {
            var bibStr = (row.bib == 0 ? "" : "(" + (row.bib < 0 ? (-row.bib / 100 | 0) + "-" + (-row.bib % 100) : row.bib) + ") ");
            var ecardStr = (row.ecard2 == 0 ? "-" : row.ecard2);
            var runnerName = bibStr + row.name;
            var link = "<button style=\"width:50px\" onclick=\"res.popupDialog('" + runnerName + ". Endre brikke 2 fra "
              + ecardStr + " til '," + row.dbid + ",0,1);\">" + ecardStr + "</button>";
            return link;
          }
        });

        this.currentTable = $('#startList').dataTable({
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
      if (!isNaN(legNoStr) && lastDiv > 0)
        shortClub = shortClub.substring(0, Math.min(lastDiv, _this.maxClubLength)) + legNoStr;
      else
        shortClub = shortClub.substring(0, _this.maxClubLength)
      if (del)
        shortClub = "<del>" + shortClub + "</del>";

      return shortClub;
    };


    // Filter rows in table
    AjaxViewer.prototype.filterTable = function () {
      var table = this.currentTable.api();
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
            var tableData = this.currentTable.fnGetData();
            this.setHighlight(tableData, this.highlightID);
            this.currentTable.fnClearTable();
            this.currentTable.fnAddData(tableData, true);
          }
          else
            this.chooseClass(this.runnerList.runners[ind].class);
        }
      }
      $('#searchRunner').html(runnerText);
      if (ind == -1 && this.highlightID != null) {
        this.highlightID = null;
        var tableData = this.currentTable.fnGetData();
        this.setHighlight(tableData, this.highlightID);
        this.currentTable.fnClearTable();
        this.currentTable.fnAddData(tableData, true);
      }
    };

    //Popup window for setting ecard to checked
    AjaxViewer.prototype.popupCheckedEcard = function (dbid, name, ecards, checked) {
      _this = this;
      var message;
      if (checked)
        message = "Ta bort markering for " + name + "?";
      else  
        message = "Bekrefte: " + name + (ecards.length>0? ", brikke " + ecards : "") + "?";
      $('<p>'+message+'</p>').confirm(function(e){
        if(e.response)
        {
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
      $('<p>'+promptText+'</p>').prompt(function(e){
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
                success: function (data, status, resp) {
                  try {
                    var blob = new Blob([data], { type: "text/plain;charset=utf-8" });
                    saveAs(blob, "RaceSplitter.csv")
                  }
                  catch (e) { }
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


    //Check for updating of class results 
    AjaxViewer.prototype.checkForClassUpdate = function () {
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
            data: "comp=" + this.competitionId + "&method=getclassresults&unformattedTimes=true&class=" + encodeURIComponent(this.curClassName) + "&nosplits=" + this.noSplits +
              "&last_hash=" + this.lastClassHash + (this.isMultiDayEvent ? "&includetotal=true" : ""),
            success: function (data, status, resp) {
              var expTime = false;
              try {
                var postTime = new Date().getTime();
                var varTime = Math.max(1000, postTime - preTime); // Uncertainty in server time. Add 1000 to account for seconds resultion
                var reqTime = resp.getResponseHeader("date");
                if (reqTime) {
                  var newTimeDiff = postTime - (new Date(reqTime).getTime() + 500);
                  if (Math.abs(newTimeDiff - _this.serverTimeDiff) > varTime)
                    _this.serverTimeDiff = 0.9*_this.serverTimeDiff + 0.1*newTimeDiff;
                }
                expTime = new Date(resp.getResponseHeader("expires")).getTime();
              }
              catch (e) { }
              _this.handleUpdateClassResults(data, expTime);
            },
            error: function () {
              _this.resUpdateTimeout = setTimeout(function () { _this.checkForClassUpdate(); }, _this.updateInterval);
            },
            dataType: "json"
          });
        }
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
        if (this.EmmaServer)
          $('#liveIndicator').html('');
        else {
          if (newData.active && !$('#liveIndicator').find('span').hasClass('liveClient'))
            $('#liveIndicator').html('<span class="liveClient" id="liveIndicator">◉</span>');
          if (!newData.active && !$('#liveIndicator').find('span').hasClass('notLiveClient'))
            $('#liveIndicator').html('<span class="notLiveClient" id="liveIndicator">◉</span>');
        }
        var _this = this;
        if (newData.status == "OK") {
          clearTimeout(this.updatePredictedTimeTimer);
          if (this.animating) // Wait until animation is completed
          {
            setTimeout(function () { _this.handleUpdateClassResults(newData, expTime); }, 100);
            return;
          }
          if (this.currentTable != null) {
            $('#divInfoText').html(newData.infotext);

            var oldResults = $.extend(true, [], this.currentTable.fnGetData());
            var table = this.currentTable.api();
            var posLeft = $(table.settings()[0].nScrollBody).scrollLeft();
            var scrollX = window.scrollX;
            var scrollY = window.scrollY;

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

            this.currentTable.fnClearTable();
            this.currentTable.fnAddData(newData.results, true);

            // Hide columns if split is BAD
            if (this.curClassSplits != null && this.curClassSplits.length > 0) {
              var offset = 3 + (this.curClassHasBibs ? 1 : 0) + ((this.curClassIsUnranked || (this.compactView && !this.curClassLapTimes)) ? 1 : 0);
              for (var sp = 0; sp < this.curClassNumSplits; sp++) {
                colNum = offset + 2 * sp;
                table.column(colNum).visible(this.curClassSplitsOK[sp]);
              }
            }

            this.updatePredictedTimes(true); // Insert times only
            $(table.settings()[0].nScrollBody).scrollLeft(posLeft);
            window.scrollTo(scrollX, scrollY);

            var newResults = this.currentTable.fnGetData();
            this.animateTable(oldResults, newResults, this.animTime);

            this.lastClassHash = newData.hash;

            setTimeout(function () { _this.startPredictedTimeTimer(); }, _this.animTime + 200);
          }
        }
      }
      catch (e) { }
      if (this.isCompToday())
        this.resUpdateTimeout = setTimeout(function () { _this.checkForClassUpdate(); }, _this.updateInterval);
    };

    AjaxViewer.prototype.animateTable = function (oldData, newData, animTime, predRank = false) {
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
            prevProg[oldID] = (isResTab ? oldData[i].progress : 100);
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
        if ( Object.keys(lastInd).length == 0 ) { // No modifications
          if (predRank)
            this.startPredictedTimeTimer();
          return;
        }

        var tableDT = this.currentTable.api();  
        var order = tableDT.order();
        var numCol = tableDT.settings().columns()[0].length;
        if (isResTab && order[0][0] != numCol - 1) { // Not sorted on virtual position
          if (predRank)
            this.startPredictedTimeTimer();
          return;
        }

        // Prepare for animation
        this.animating = true;
        var table = (isResTab ? $('#' + this.resultsDiv) : $('#' + this.radioPassingsDiv));

        // Set each td's width. Subtract 9 for the padding width of the td
        var column_widths = new Array();
        $(table).find('tr:first-child th').each(function () { column_widths.push($(this)[0].getBoundingClientRect().width - 9); });
        $(table).find('tr td, tr th').each(function () { $(this).css('min-width', column_widths[$(this).index()]); });

        // Set table height and width
        var height = $(table).outerHeight();

        // Put all the rows back in place
        var rowPosArray = new Array();
        var rowIndArray = new Array();
        var ind = -1; // -1:header; 0:first data
        var tableTop = (isResTab ? $(table)[0].getBoundingClientRect().top : -window.scrollY);
        $(table).find('tr').each(function () {
          var rowPos = $(this)[0].getBoundingClientRect().top - tableTop;
            $(this).css('top', rowPos);
            if ($(this).is(":visible"))
            {               
              rowPosArray.push(rowPos);
              rowIndArray.push(ind);
            }
            ind++;  
        });
        $(table).height(height).width('100%');
        if (isResTab) // Set fixed table layout to avoid slider 
          $(table).css({'table-layout': 'fixed' });

        // Set table cells position to absolute
        $(table).find('tbody tr').each(function () {
          $(this).css('position', 'absolute').css('z-index', '91');
        });  

        // Animation
        for (var lastIndStr in lastInd) {
          var newInd = parseInt(lastIndStr);
          var oldInd = lastInd[newInd];
          var oldPos = rowPosArray[oldInd + 1]; // First entry is header
          var newPos = rowPosArray[newInd + 1];
          var row = $(table).find("tbody tr").eq(rowIndArray[newInd+1]);                            
          var oldBkCol = (oldInd % 2 == 0 ? '#E6E6E6' : '#FFFFFF');
          var newBkCol = (newInd % 2 == 0 ? '#E6E6E6' : '#FFFFFF');
          var zind;
          if (predRank) // Update from predictions of running times         
            zind = (newInd == 0 ? 96 : (newInd > oldInd ? 95 : 93));
          else // Updates from new data from server
            zind = (updProg[newInd] ? 95 : 93);
               
          $(row).css('top', oldPos).css('z-index', zind);
          $(row).velocity({ translateZ: 0, top: newPos }, { duration: animTime });
          $(row).find('td').each(function () {
            $(this).css('background-color', oldBkCol);
            $(this).velocity({backgroundColor: newBkCol}, {duration: animTime});
          });
          
        }
        setTimeout(function () { _this.endAnimateTable(table, predRank) }, _this.animTime + 100);
      }      
      catch (e) { }
    };

    // Reset settings after animation is completed
    AjaxViewer.prototype.endAnimateTable = function (table, predRank) {
      $(table).find('tr td, tr th').each(function () { $(this).css('min-width', ''); });
      $(table).find('tr').each(function () { $(this).css('position', ''); });
      $(table).height(0).width('100%');
      $(table).css({'table-layout': 'auto' });
      this.animating = false;
      if (predRank)
        this.startPredictedTimeTimer();
      
    };

    //Check for update in clubresults
    AjaxViewer.prototype.checkForClubUpdate = function () {
      var _this = this;
      if (this.inactiveTimer >= this.inactiveTimeout) {
        alert('For lenge inaktiv. Trykk OK for å oppdatere.')
        this.inactiveTimer = 0;
      }
      if (this.updateAutomatically) {
        if (this.currentTable != null) {
          $.ajax({
            url: this.apiURL,
            data: "comp=" + this.competitionId + "&method=getclubresults&unformattedTimes=true&club=" + encodeURIComponent(this.curClubName) + "&last_hash=" + this.lastClubHash + (this.isMultiDayEvent ? "&includetotal=true" : ""),
            success: function (data, status, resp) {
              var expTime = new Date();
              expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
              _this.handleUpdateClubResults(data, expTime);
            },
            error: function () {
              _this.resUpdateTimeout = setTimeout(function () { _this.checkForClubUpdate(); }, _this.clubUpdateInterval);
            },
            dataType: "json"
          });
        }
      }
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
      if (data.status == "OK" && this.currentTable != null) {
        var numberOfRunners = data.results.length;
        $('#numberOfRunners').html(numberOfRunners);
        var posLeft = $(this.currentTable.api().settings()[0].nScrollBody).scrollLeft();
        var scrollX = window.scrollX;
        var scrollY = window.scrollY;
        this.currentTable.fnClearTable();
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
        this.currentTable.fnAddData(data.results, true);
        $(this.currentTable.api().settings()[0].nScrollBody).scrollLeft(posLeft);
        window.scrollTo(scrollX, scrollY)
        this.lastClubHash = data.hash;
        this.currentTable.api().columns.adjust().draw();      }
      if (_this.isCompToday())
        this.resUpdateTimeout = setTimeout(function () { _this.checkForClubUpdate(); }, _this.clubUpdateInterval);
    };

    AjaxViewer.prototype.chooseClass = function (className) {
      if (className.length == 0)
        return;
      var _this = this;
      clearTimeout(this.resUpdateTimeout);
      clearTimeout(this.updatePredictedTimeTimer);
      this.inactiveTimer = 0;
      if (this.currentTable != null) {
        try {
          this.currentTable.api().destroy();
        }
        catch (e) { }
      }

      $('#divResults').html('');
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
        callStr = "&method=getplainresults&unformattedTimes=true&classmask=" + className.replace("plainresultsclass_","");
      else if (className == "startlist")
        callStr = "&method=getstartlist";
      else
        callStr = "&method=getclassresults&unformattedTimes=true&class=" + encodeURIComponent(className) + "&nosplits=" + this.noSplits + (this.isMultiDayEvent ? "&includetotal=true" : "");
      $.ajax({
        url: this.apiURL,
        data: "comp=" + this.competitionId + callStr,
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
            expTime = new Date(resp.getResponseHeader("expires")).getTime();
          }
          catch (e) { }
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
      if (expTime) {
        var lastUpdate = new Date();
        lastUpdate.setTime(expTime - this.updateInterval + 1000);
        $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
      }
      var _this = this;
      if (data != null && data.status == "OK") {
        $('#divInfoText').html(data.infotext);
        if (data.className != null) {
          if (data.className == "plainresults") {
            $('#' + this.resultsHeaderDiv).html("<b>Alle klasser</b>");
            $('#' + this.txtResetSorting).html("");
          }
          else if (data.className == "plainresultstotal") {
            $('#' + this.resultsHeaderDiv).html("<b>Sammenlagt alle klasser</b>");
            $('#' + this.txtResetSorting).html("");
          }
          else if (data.className.includes("plainresultsclass_")) {
            $('#' + this.resultsHeaderDiv).html("<b>"+ data.className.replace("plainresultsclass_","") + "</b>"); 
            $('#' + this.txtResetSorting).html("");
          }
          else if (data.className == "startlist") {
            $('#' + this.resultsHeaderDiv).html("<b>Startliste</b>");
            $('#' + this.txtResetSorting).html("");
          }
          else {
            var headerName = (data.courseName != undefined ? data.courseName : data.className);
            var distance = (data.distance != undefined && data.distance != "" ? "&emsp;<small>" + data.distance + " km</small>" : "");
            var classHead = "<b>" + headerName + "</b>" + distance;
            $('#' + this.resultsHeaderDiv).html(classHead);
            var courses = this.courses[data.className];
            var link = "";
            if (this.showEcardTimes && courses != undefined && courses.length > 0)
              link = this.splitTimesLink(data.className, courses);
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

            var sprintStage = (className.includes('| Prolog')? 0 : ( 
                               className.includes('| Kvart') ? 1 : ( 
                               className.includes('| Semi')  ? 2 : (
                               className.includes('| Finale')? 3 : -1 )))); 
            var isSprintHeat = sprintStage > 0;

            if (isSprint)
            {
              if (first)
                res += "<td style=\"vertical-align:top\"><table style=\"width:100%;\">";
              else if (sprintStage != sprintStageLast)
                res += "</table></td><td style=\"vertical-align:top\"><table style=\"width:100%;\">";
              sprintStageLast = sprintStage;
              first = false;
              var classPre = data.className.replace("plainresultsclass_","") + " | ";
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
              else
              {
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
          $('#numberOfRunners').html($("#numberOfRunnersTotal").html());
          if (this.browserType == 1)
            $('#switchNavClick').trigger('click');
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
          var NumRunText = $("#numberOfRunnersTotal").html();
          NumRunText += "</br><a href=\"javascript:res.raceSplitterDialog();\">Lag RaceSplitter fil</a>";
          $('#numberOfRunners').html(NumRunText);
          if (this.browserType == 1)
            $('#switchNavClick').trigger('click');
        }
        else if (data.results != null && data.results.length > 0) {
          $('#updateinterval').html(this.updateInterval / 1000);
          if (this.EmmaServer)
            $('#liveIndicator').html('');
          else if (data.active)
            $('#liveIndicator').html('<span class="liveClient" id="liveIndicator">◉</span>');
          else
            $('#liveIndicator').html('<span class="notLiveClient" id="liveIndicator">◉</span>');

          var haveSplitControls   = (data.splitcontrols != null) && (data.splitcontrols.length > 0);
          this.curClassSplits     = data.splitcontrols;
          this.curClassIsRelay    = (haveSplitControls && this.curClassSplits[0].code == "0");
          this.curClassLapTimes   = (haveSplitControls && this.curClassSplits[0].code != "0" && this.curClassSplits.length > 1 && this.curClassSplits[this.curClassSplits.length - 1].code == "999");
          this.curClassIsUnranked = !(this.curClassSplits.every(function check(el) { return el.code != "-999"; })) || !(data.results.every(function check(el) { return el.status != 13; }));
          this.curClassHasBibs    = (data.results[0].bib != undefined && data.results[0].bib != 0);
          this.curClassIsCourse   = (data.results[0].class != undefined);

          if (this.curClassSplits == null)
            this.curClassNumSplits = 0;
          else if (this.curClassIsRelay)
            this.curClassNumSplits = this.curClassSplits.length / 2 - 1;
          else if (this.curClassLapTimes)
            this.curClassNumSplits = (this.curClassSplits.length - 1) / 2;
          else
            this.curClassNumSplits = this.curClassSplits.length;

          this.compactView = !(this.curClassIsRelay || this.curClassLapTimes || this.isMultiDayEvent);
          this.curClassIsMassStart = (this.checkForMassStart(data) || this.curClassIsRelay);

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
          var fullView = !this.compactView;
          var isRelayClass = this.relayClasses.includes(data.className);
          var isSprintHeat = (data.className.includes('| Kvart') || data.className.includes('| Semi') || data.className.includes('| Finale'));

          const vertLine = "<span class=\"hideplace\">&#10072;</span>";

          columns.push({
            "sTitle": "#",
            "sClass": "right",
            "bSortable": false,
            "aTargets": [col++],
            "mDataProp": "place",
            "width": (_this.fixedTable ? "5%" : null),
            "render": function (data, type, row) {
              if (type === 'display' && data != "")
                return vertLine + data;
              else
                return data;
            }

          });

          if (isRelayClass) {
            if (!haveSplitControls || !fullView)
              columns.push({
                "sTitle": this.resources["_CLUB"],
                "sClass": "left",
                "bSortable": false,
                "aTargets": [col++],
                "mDataProp": "club",
                "render": function (data, type, row) {
                  var param = row.club;
                  var clubShort = row.club;
                  if (param && param.length > 0) {
                    param = param.replace('\'', '\\\'');
                    if (clubShort.length > _this.maxClubLength)
                      clubShort = _this.clubShort(clubShort);
                  }
                  return "<a class=\"relayclub\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>" + vertLine;
                }
              });
            columns.push({
              "sTitle": (haveSplitControls && fullView) ? this.resources["_CLUB"] + " / " + this.resources["_NAME"] : this.resources["_NAME"],
              "sClass": "left",
              "responsivePriority": (haveSplitControls && fullView) ? 1 : 10000,
              "bSortable": false,
              "aTargets": [col++],
              "mDataProp": "name",
              "render": function (data, type, row) {
                var param = row.club;
                var clubShort = row.club;
                var nameShort = row.name;
                if (row.name.length > _this.maxNameLength)
                  nameShort = _this.nameShort(row.name);
                if (param && param.length > 0) {
                  param = param.replace('\'', '\\\'');
                  if (clubShort.length > _this.maxClubLength)
                    clubShort = _this.clubShort(clubShort);
                }
                var clubLink = "<a class=\"relayclub\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                return (haveSplitControls && fullView ? clubLink + vertLine + "<br/>" + nameShort : nameShort + vertLine);
              }
            });
          }
          else // Not curClassIsRelay
          {
            if (!(haveSplitControls || _this.isMultiDayEvent) || _this.curClassIsUnranked || (!fullView && !_this.curClassLapTimes))
              columns.push({
                "sTitle": this.resources["_NAME"],
                "sClass": "left",
                "bSortable": false,
                "aTargets": [col++],
                "mDataProp": "name",
                "width": (_this.fixedTable ? "30%" : null),
                "render": function (data, type, row) {
                  if (type === 'display')
                    return (data.length > _this.maxNameLength ? _this.nameShort(data) : data) + vertLine;
                  else
                    return data;
                }
              });

            columns.push({
              "sTitle": ((haveSplitControls || _this.isMultiDayEvent) && !_this.curClassIsUnranked && (fullView || _this.curClassLapTimes)) ? this.resources["_NAME"] + " / " + this.resources["_CLUB"] : this.resources["_CLUB"],
              "sClass": "left",
              "bSortable": false,
              "aTargets": [col++],
              "mDataProp": "club",
              "width": (_this.fixedTable ? "20%" : null),
              "render": function (data, type, row) {
                var param = row.club;
                var clubShort = row.club;
                if (param && param.length > 0) {
                  param = param.replace('\'', '\\\'');
                  if (clubShort.length > _this.maxClubLength)
                    clubShort = _this.clubShort(clubShort);
                }
                var link = "<a class=\"club\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                if ((haveSplitControls || _this.isMultiDayEvent) && !_this.curClassIsUnranked && (fullView || _this.curClassLapTimes))
                  return (row.name.length > _this.maxNameLength ? _this.nameShort(row.name) : row.name) + vertLine + "<br/>" + link;
                else if (_this.fixedTable)
                  return clubShort + vertLine;
                else
                  return link + vertLine;
              }
            });
          }

          if (this.curClassIsCourse) {
            columns.push({
              "sTitle": this.resources["_CLASS"], "sClass": "left", "aTargets": [col++], "mDataProp": "class",
              "render": function (data, type, row) {
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
              "sTitle": "&#8470",
              "sClass": "right",
              "bSortable": !_this.fixedTable,
              "aTargets": [col++],
              "mDataProp": "bib",
              "width": (_this.fixedTable ? "5%" : null),
              "render": function (data, type, row) {
                if (type === 'display') {
                  var txt = vertLine;
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
            "sTitle": this.resources["_START"],
            "sClass": "right",
            "bSortable": !_this.fixedTable,
            "sType": "numeric",
            "aDataSort": [col],
            "aTargets": [col],
            "bUseRendered": false,
            "mDataProp": "start",
            "width": (_this.fixedTable ? "10%" : null),
            "render": function (data, type, row) {
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

                  if (fullView){
                    if (row.splits["0_place"] == 1)
                      txt += "<span class=\"besttime\">";
                    else
                      txt += "<span>";
                    txt += "+" + _this.formatTime(Math.max(0,row.splits["0_timeplus"]), 0, _this.showTenthOfSecond) + place + "</span><br />";
                  }
                  txt += vertLine + "<span>";
                  if (!fullView && row.splits["0_place"] >= 1)
                    txt += place;
                  txt += _this.formatTime(row.start, 0, false, true, true, true) + "</span>";
                }
                else
                  txt += vertLine + _this.formatTime(row.start, 0, false, true, true, true);
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
                
                columns.push(
                  {
                    "sTitle": splitName,
                    "bVisible": _this.curClassSplitsOK[refSp],
                    "sClass": "right",
                    "bSortable": !_this.curClassIsUnranked,
                    "sType": "numeric",
                    "aDataSort": [col + 1, col],
                    "aTargets": [col],
                    "bUseRendered": false,
                    "mDataProp": "splits." + value.code,
                    "render": function (data, type, row) {
                      if (isNaN(parseInt(data)))
                        return data;
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
                            txt += "<br/><span class=";
                            var legplace = "";

                            if (row.splits[value.code + 100000 + "_estimate"]){
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
                              txt += "⟳" + _this.formatTime(row.splits[(value.code + 100000)], 0, _this.showTenthOfSecond);
                            else
                              txt += _this.formatTime(row.splits[(value.code + 100000)], 0, _this.showTenthOfSecond);
                            txt += legplace + "</span>";
                          }
                          else if ((row.splits[value.code + "_timeplus"] != undefined) && fullView && !_this.curClassIsRelay && (value.code > 0) && row.splits[value.code + "_place"] > 1)
                          // Second line for ordinary passing (drop if code is negative - unranked)
                          {
                            txt += "<br/><span class=";
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
                columns.push({ "sTitle": value.name + "_Status", "bVisible": false, "aTargets": [col++], "sType": "numeric", "mDataProp": "splits." + value.code + "_status" });
              }
            });
          }

          columns.push({
            "sTitle": this.resources["_CONTROLFINISH"],
            "sClass": "right",
            "sType": "numeric",
            "aDataSort": [col + 1, col, 0],
            "aTargets": [col],
            "bUseRendered": false,
            "bSortable": !_this.fixedTable,
            "mDataProp": "result",
            "width": (_this.fixedTable ? "10%" : null),
            "render": function (data, type, row) {
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
                  res += "<br/><span class=\"plustime\">+" + _this.formatTime(row.timeplus, row.status, _this.showTenthOfSecond) + "</span>";
                  if (_this.curClassNumberOfRunners >= 10)
                    res += "<span class=\"hideplace\"> &numsp;<i>&#10072;..&#10072;</i></span>";
                  else
                    res += "<span class=\"hideplace\"> <i>&#10072;..&#10072;</i></span>";
                }
              }
              if (haveSplitControls && (fullView && _this.curClassIsRelay || _this.curClassLapTimes) && (row.splits["999_place"] != undefined)) {
                if (row.splits[(999)] > 0) {
                  var legplace = "";
                  res += "<br/><span class=";
                  if (row.splits["999_place"] == 1) {
                    res += "\"besttime\">";
                    legplace += "<span class=\"bestplace\"> ";
                  }
                  else {
                    res += "\"legtime\">";
                    legplace += "<span class=\"place\"> ";
                  }
                  if (_this.curClassIsRelay)
                    res += "⟳";
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
          columns.push({ "sTitle": "Status", "bVisible": false, "aTargets": [col++], "sType": "numeric", "mDataProp": "status" });

          if (!(haveSplitControls || _this.isMultiDayEvent) || !fullView || _this.curClassLapTimes) {
            columns.push({
              "sTitle": "&nbsp;&nbsp;&nbsp;&nbsp;",
              "bVisible": (!isSprintHeat || _this.showTimesInSprint) && (!_this.curClassIsUnranked || _this.fixedTable),
              "sClass": "right",
              "bSortable": false,
              "aTargets": [col++],
              "mDataProp": "timeplus",
              "width": (this.fixedTable ? "10%" : null),
              "render": function (data, type, row) {
                if (isNaN(parseInt(data)))
                  return data;
                var res = vertLine;
                if (row.status == 0 && row.timeplus > 0) {
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
                "sTitle": "Total<br/><span class=\"legtime\">⟳Etp</span>",
                "sClass": "right",
                "bSortable": false,
                "aTargets": [col++],
                "mDataProp": "timeplus",
                "render": function (data, type, row) {
                  if (isNaN(parseInt(data)))
                    return data;
                  var res = vertLine;
                  if (row.status == 0) {
                    res += "<span>";
                    if (row.place > 1)
                      res += "+" + _this.formatTime(row.timeplus, row.status, _this.showTenthOfSecond);
                    res += "</span><br />" + vertLine;
                    if (row.splits["999_place"] > 1)
                      res += "<span class=\"legtime\">+" + _this.formatTime(row.splits["999_timeplus"], 0, _this.showTenthOfSecond) + "</span>";
                  }
                  return res;
                }
              });
            }

          if (this.isMultiDayEvent) {
            columns.push({
              "sTitle": this.resources["_TOTAL"],
              "sClass": "right",
              "sType": "numeric",
              "aDataSort": [col + 1, col, 0],
              "aTargets": [col],
              "bUseRendered": false,
              "mDataProp": "totalresult",
              "render": function (data, type, row) {
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
                    totalres += "<br/><span class=\"plustime\">+";
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
            columns.push({ "sTitle": "TotalStatus", "bVisible": false, "aTargets": [col++], "sType": "numeric", "mDataProp": "totalstatus" });
            if (!fullView) {
              columns.push({
                "sTitle": "",
                "sClass": "right",
                "bSortable": false,
                "aTargets": [col++],
                "mDataProp": "totalplus",
                "render": function (data, type, row) {
                  if (isNaN(parseInt(data)))
                    return data;
                  if (row.totalstatus != 0)
                    return "";
                  else {
                    var res = vertLine;
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
          columns.push({ "sTitle": "VP", "bVisible": false, "aTargets": [col++], "mDataProp": "virtual_position" });
          $('#' + this.resultsDiv).height(0);

          this.currentTable = $('#' + this.resultsDiv).dataTable({
            fixedHeader: true,
            fixedColumns: { leftColumns: 2 },
            scrollX: true,
            paging: false,
            lengthChange: false,
            searching: false,
            info: false,
            data: data.results,
            order: [[col - 1, "asc"]],
            columnDefs: columns,
            destroy: true,
            preDrawCallback: function (settings) {
              var api = new $.fn.dataTable.Api(settings);
              if (api.order()[0][0] != col - 1)
                $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\">&#8635;" + _this.resources["_RESETTODEFAULT"] + "</a>");
            },
          });

          // Scroll to initial view and hide class column if necessary
          if (data.results[0].progress != undefined) // Scroll to inital view
          {
            var scrollBody = $(this.currentTable).parent();
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
                if ($(".firstCol").width() > 0 && maxScroll >= clubBibWidth + 5)
                  $('#switchNavClick').trigger('click');
              }
            }
          }

          this.lastClassHash = data.hash;
          
          if (this.isCompToday())
          {
            this.updatePredictedTimes(true); // Insert times only
            this.currentTable.api().columns.adjust().draw();
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

        if (time > 100*3600*100) // 100 hours. Used for indicating restart in relay
        {
          restart = "<small>*</small>"; // Small * to indicate that team has restarted  
          time = time%(100*3600*100);
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
      if (this.animating){
         setTimeout(function () { _this.viewClubResults(clubName); }, 500);
         return;
      }
      this.inactiveTimer = 0;
      if (this.currentTable != null) {
        try {
          this.currentTable.api().destroy();
        }
        catch (e) { }
      }
      $('#divResults').html('');
      $('#' + this.txtResetSorting).html('');
      this.curClubName = clubName;
      this.curClassName = null;
      this.curSplitView = null;
      this.curRelayView = null;
      $('#resultsHeader').html(this.resources["_LOADINGRESULTS"]);
      $.ajax({
        url: this.apiURL,
        data: "comp=" + this.competitionId + "&method=getclubresults&unformattedTimes=true&club=" + encodeURIComponent(clubName) + (this.isMultiDayEvent ? "&includetotal=true" : ""),
        success: function (data, status, resp) {
          var expTime = new Date();
          expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
          _this.updateClubResults(data, expTime);
        },
        dataType: "json"
      });
      if (!this.isSingleClass) {
        window.location.hash = "club::" + clubName;
      }
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
          var columns = Array();
          var col = 0;
          columns.push({ "sTitle": "#", "sClass": "right", "aDataSort": [1], "aTargets": [col++], "mDataProp": "place" });
          columns.push({
            "sTitle": "placeSortable", "bVisible": false, "mDataProp": "placeSortable", "aTargets": [col++], "render": function (data, type, row) {
              if (type == "sort")
                return row.placeSortable;
              else
                return data;
            }
          });
          columns.push({
            "sTitle": this.resources["_NAME"], "sClass": "left", "aTargets": [col++], "mDataProp": "name",
            "render": function (data, type, row) {
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
            "sTitle": this.resources["_CLASS"], "sClass": "left", "aTargets": [col++], "mDataProp": "class",
            "render": function (data, type, row) {
              var param = row["class"];
              if (param && param.length > 0)
                param = param.replace('\'', '\\\'');
              return "<a href=\"javascript:LiveResults.Instance.chooseClass('" + param + "')\">" + row["class"] + "</a>";
            }
          });
          columns.push({
            "sTitle": "&#8470;", "sClass": "right", "aTargets": [col++], "mDataProp": (_this.curClassHasBibs ? "bib" : null),
            "render": function (data, type, row) {
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
            "sTitle": "bibSortable", "bVisible": false, "mDataProp": (_this.curClassHasBibs ? "bib" : null), "aTargets": [col++], "render": function (data, type, row) {
              return Math.abs(data);
            }
          });
          columns.push({
            "sTitle": this.resources["_START"], "sClass": "right", "sType": "numeric", "aDataSort": [col], "aTargets": [col], "bUseRendered": false, "mDataProp": "start",
            "render": function (data, type, row) {
              if (row.start == "") {
                return "";
              }
              else {
                return _this.formatTime(row.start, 0, false, true, true, true)
              }
            }
          });
          col++;
          columns.push({
            "sTitle": this.resources["_CONTROLFINISH"], "sClass": "right", "sType": "numeric", "aDataSort": [col + 1, col, 0], "aTargets": [col], "bUseRendered": false, "mDataProp": "result",
            "render": function (data, type, row) {
              if (row.place == "-" || row.place == "" || row.place == "F") {
                return _this.formatTime(row.result, row.status);
              }
              else {
                return _this.formatTime(row.result, row.status);
              }
            }
          });
          col++;
          columns.push({ "sTitle": "Status", "bVisible": false, "aTargets": [col++], "sType": "numeric", "mDataProp": "status" });
          columns.push({
            "sTitle": "Diff", "sClass": "right", "bSortable": true, "aTargets": [col++], "mDataProp": "timeplus",
            "render": function (data, type, row) {
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
              "sTitle": "m/km", "sClass": "right", "bSortable": true, "aTargets": [col++], "mDataProp": "pace",
              "render": function (data, type, row) {
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
          this.currentTable = $('#' + this.resultsDiv).dataTable({
            fixedHeader: true,
            fixedColumns: { leftColumns: 2 },
            scrollX: true,
            paging: false,
            lengthChange: false,
            searching: false,
            info: false,
            data: data.results,
            order: [[1, "asc"], [5, 'asc']],
            columnDefs: columns,
            destroy: true,
            preDrawCallback: function (settings) {
              var api = new $.fn.dataTable.Api(settings);
              if (api.order()[0][0] != 1)
                $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\">&#8635;" + _this.resources["_RESETTODEFAULT"] + "</a>");
            }
          });
          this.lastClubHash = data.hash;
        }
      }
      if (_this.isCompToday())
        this.resUpdateTimeout = setTimeout(function () { _this.checkForClubUpdate(); }, _this.clubUpdateInterval);
    };

    AjaxViewer.prototype.viewRelayResults = function (className) {
      var _this = this;
      clearTimeout(this.resUpdateTimeout);
      this.inactiveTimer = 0;
      if (this.currentTable != null) {
        try { this.currentTable.api().destroy(); }
        catch (e) { }
      }
      $('#divResults').html('');
      $('#' + this.txtResetSorting).html('');
      this.curClubName = null;
      this.curClassName = null;
      this.curSplitView = null;
      this.curRelayView = className;

      $('#resultsHeader').html(this.resources["_LOADINGRESULTS"]);
      $.ajax({
        url: this.apiURL,
        data: "comp=" + this.competitionId + "&unformattedTimes=true&method=getrelayresults&class=" + encodeURIComponent(className),
        success: function (data, status, resp) {
          var expTime = new Date();
          expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
          _this.updateRelayResults(data, expTime);
        },
        dataType: "json"
      });
      window.location.hash = "relay::" + className;
    };

    AjaxViewer.prototype.updateRelayResults = function (data, expTime) {
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
        if (data.className != null) {
          $('#' + this.resultsHeaderDiv).html('<b>' + data.className + '</b>');
          $('#' + this.resultsControlsDiv).show();
        }
        if (data.legs != null & data.relayresults != null) {
          var legs = data.legs;
          var numberOfTeams = data.relayresults[0].results.length;
          var numberOfRunners = legs * numberOfTeams;
          $('#numberOfRunners').html(numberOfRunners);

          var teamresults = [];
          for (let leg = 1; leg <= legs; leg++) {
            var legResults = data.relayresults[leg - 1].results;
            for (let runner = 0; runner < legResults.length; runner++) {
              var br = "";
              var teamBib = (-legResults[runner].bib / 100 | 0);
              var legTime;
              var legStatus;
              var legPlusTime;
              var legPlace;
              if (leg == 1) {
                var clubShort = legResults[runner].club;
                if (clubShort.length > _this.maxClubLength)
                  clubShort = _this.clubShort(clubShort);
                teamresults[teamBib] = {
                  names: "<b>" + clubShort + "</b><br/>",
                  bib: "<b>" + teamBib + "</b><br/>",
                  legTime: "<br/>",
                  legPlace: "<br/>",
                  legDiff: "<br/>",
                  totTime: "",
                  totPlace: "<br/>",
                  totDiff: "",
                  kmTime: "<br/>",
                  lastPlace: legResults[runner].place,
                  lastDiff: legResults[runner].timeplus,
                  placeDiff: "<br/>",
                  totGained: "<br/>",
                  placeStr: "",
                  sort: []
                }
                legTime = legResults[runner].result;
                legStatus = legResults[runner].status;
                legPlusTime = legResults[runner].timeplus;
                legPlace = legResults[runner].place;
              }
              else {
                br = "<br/>";
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
              var totGained = Math.max(0,legResults[runner].timeplus) - teamresults[teamBib].lastDiff;
              teamresults[teamBib].lastPlace = legResults[runner].place;
              teamresults[teamBib].lastDiff = Math.max(0,legResults[runner].timeplus);

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
                + "+" + _this.formatTime(Math.max(0,legResults[runner].timeplus), 0, _this.showTenthOfSecond) + "</span>" : "");
              teamresults[teamBib].placeDiff += br + (leg == 1 ? "" : (placeDiff < 0 ? "<span class=\"gained\">" : (placeDiff > 0 ? "<span class=\"lost\">+" : "<span>")) 
                + placeDiff + "</span>");
              teamresults[teamBib].totGained += br + (leg > 1 && legStatus == 0 ? (totGained < 0 ? "<span class=\"gained\">-" : "<span class=\"lost\">+")
                  + _this.formatTime(Math.abs(totGained), 0, _this.showTenthOfSecond) : "");

              teamresults[teamBib].legTime += br + (legPlace == 1 ? "<span class=\"time1\">" : "<span>")
                + _this.formatTime(legTime, legStatus, _this.showTenthOfSecond) + "</span>"
                + (legStatus == 0 ? (numberOfTeams >= 10 && legPlace < 10 ? "&numsp;" : "")
                + (legPlace == 1 ? "<span class=\"place1\">" : "<span class=\"place\">")
                + "&numsp;&#10072;" + legPlace + "&#10072;" : "") +"</span>"; 
              teamresults[teamBib].legDiff += br + (legStatus == 0 ? (legPlace == 1 ? "<span class=\"time1\">" : "<span>") 
                + "+" + _this.formatTime(Math.max(0,legPlusTime), 0, _this.showTenthOfSecond) + "</span>" : "");

              if (legResults[runner].place == "-")
                teamresults[teamBib].sort[leg - 1] = 999999 + (leg == 1 ? teamBib : 0);
              else if (legResults[runner].place == "")
                teamresults[teamBib].sort[leg - 1] = 99999 + (leg == 1 ? teamBib : 0);
              else
                teamresults[teamBib].sort[leg - 1] = legResults[runner].place;

              if (leg == legs) {
                teamresults[teamBib].placeStr = "<b>" + legResults[runner].place + "</b>";
                teamresults[teamBib].totTime = "<b>" + _this.formatTime(legResults[runner].result, legResults[runner].status, _this.showTenthOfSecond)
                  + "</b><br/>" + teamresults[teamBib].totTime;
                teamresults[teamBib].totDiff = "<b>" + (legResults[runner].status == 0 ? "+"
                  + _this.formatTime(Math.max(0,legResults[runner].timeplus), 0, _this.showTenthOfSecond) : "")
                  + "</b><br/>" + teamresults[teamBib].totDiff;
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
              "sTitle": "sort", "bVisible": false, "mDataProp": "sort", "aTargets": [col++], "render": function (data, type, row, meta) {
                leg = meta.col;
                return row.sort[leg];
              }
            });
          }
          columns.push({ "sTitle": "#", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "placeStr" });
          columns.push({ "sTitle": "&#8470", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "bib" });
          columns.push({ "sTitle": this.resources["_NAME"], "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "names" });
          columns.push({ "sTitle": "Total", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "totTime" });
          columns.push({ "sTitle": "", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "totDiff" });
          columns.push({ "sTitle": "", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "placeDiff" });
          columns.push({ "sTitle": "±Tet", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "totGained" });
          columns.push({ "sTitle": "Etappe", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "legTime" });
          columns.push({ "sTitle": "", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "legDiff" });
          columns.push({ "sTitle": "m/km", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "kmTime" });

          this.currentTable = $('#' + this.resultsDiv).dataTable({
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
      var idxCol = 1;
      $.each(this.currentTable.fnSettings().aoColumns, function (idx, val) {
        if (val.sTitle == "VP") {
          idxCol = idx;
        }
      });
      this.currentTable.fnSort([[idxCol, 'asc']]);
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
        for (i = 0; i < courses.length; i++){
          let courseName = this.courseNames.find(course => course.No === courses[i]);
          if (courseName) {
            link += "<a href=\"javascript:LiveResults.Instance.viewSplitTimeResults('" + className + "'," + courses[i] + ");\">" + courseName.Name + "</a>";
          }
        }
        link += "</div>";
      }
      return link;
    };

    //Request data for result viewer
    AjaxViewer.prototype.updateResultView = function (className, place, first, last) {
      var _this = this;
      $.ajax({
        url: this.apiURL,
        data: "comp=" + this.competitionId + "&method=getclassresults&unformattedTimes=true&class=" + encodeURIComponent(className),
        success: function (data, status, resp) { _this.handleUpdateResultViews(data, className, place, first, last); },
        error: function () { },
        dataType: "json"
      });
    };

    //Handle response for updating the last radio passings..
    AjaxViewer.prototype.handleUpdateResultViews = function (data, className, place, first, last) {
      var _this = this;
      if (data != null && data.status == "OK") {
        if (data.className != null)
          $('#' + this.resultsHeaderDiv).html('<b>' + data.className + '</b>');
        if (data.results != null && data.results.length > 0) {
          var haveSplitControls = (data.splitcontrols != null) && (data.splitcontrols.length > 0);
          this.curClassSplits = data.splitcontrols;
          this.curClassIsRelay = (haveSplitControls && this.curClassSplits[0].code == "0");
          this.curClassIsUnranked = !(this.curClassSplits.every(function check(el) { return el.code != "-999"; })) || !(data.results.every(function check(el) { return el.status != 13; }));
          this.curClassHasBibs = (data.results[0].bib != undefined && data.results[0].bib != 0);
          var isRelayClass = this.relayClasses.includes(data.className);

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


          // Select data for display
          var results = [];
          var minPlace = 1;
          var maxPlace = 10;

          for (var i = 0; i < data.results.length; i++) {
            if (data.results[i].place >= minPlace && data.results[i].place <= maxPlace) {
              results.push(data.results[i]);
            }
          }

          var columns = Array();
          var col = 0;

          columns.push({
            "sTitle": "#",
            "sClass": "right",
            "bSortable": false,
            "aTargets": [col++],
            "mDataProp": "place",
            "width": "5%"
          });

          if (_this.curClassHasBibs) {
            columns.push({
              "sTitle": "No",
              "sClass": "right",
              "bSortable": false,
              "aTargets": [col++],
              "mDataProp": "bib",
              "width": "5%",
              "render": function (data, type, row) {
                if (type === 'display') {
                  if (data < 0) // Relay
                    return "(" + (-data / 100 | 0) + ")";
                  else if (data > 0)    // Ordinary
                    return "(" + data + ")";
                  else
                    return "";
                }
                else
                  return Math.abs(data);
              }
            });
          }

          if (isRelayClass) {
            columns.push({
              "sTitle": this.resources["_CLUB"],
              "sClass": "left",
              "bSortable": false,
              "aTargets": [col++],
              "mDataProp": "club",
              "width": "20%",
              "render": function (data, type, row) {

                var clubShort = row.club;
                if (clubShort.length > _this.maxClubLength)
                  clubShort = _this.clubShort(clubShort);
                return clubShort;
              }
            });

            columns.push({
              "sTitle": this.resources["_NAME"],
              "sClass": "left",
              "bSortable": false,
              "aTargets": [col++],
              "mDataProp": "name",
              "width": "20%",
              "render": function (data, type, row) {
                var nameShort = row.name;
                if (row.name.length > _this.maxNameLength)
                  nameShort = _this.nameShort(row.name);
                return nameShort;
              }
            });
          }
          else // Not this.curClassIsRelay
          {
            columns.push({
              "sTitle": this.resources["_NAME"],
              "sClass": "left",
              "bSortable": false,
              "aTargets": [col++],
              "mDataProp": "name",
              "width": "20%",
              "render": function (data, type, row) {
                var nameShort = row.name;
                if (row.name.length > _this.maxNameLength)
                  nameShort = _this.nameShort(row.name);

                return nameShort;
              }
            });

            columns.push({
              "sTitle": this.resources["_CLUB"],
              "sClass": "left",
              "bSortable": false,
              "aTargets": [col++],
              "mDataProp": "club",
              "width": "20%",
              "render": function (data, type, row) {
                var clubShort = row.club;
                if (clubShort.length > _this.maxClubLength)
                  clubShort = _this.clubShort(clubShort);
                return clubShort;
              }
            });
          }

          columns.push({
            "sTitle": "Tid",
            "sClass": "right",
            "sType": "numeric",
            "bSortable": false,
            "aTargets": [col++],
            "bUseRendered": false,
            "width": "10%",
            "render": function (data, type, row) {
              if (type == "sort")
                return parseInt(data);
              var res = "";
              res += _this.formatTime(row.result, row.status, _this.showTenthOfSecond);
              return res;
            }
          });

          columns.push({
            "sTitle": "&nbsp;&nbsp;&nbsp;&nbsp;",
            "sClass": "right",
            "bSortable": false,
            "aTargets": [col++],
            "mDataProp": "timeplus",
            "width": "10%",
            "render": function (data, type, row) {
              var res = "";
              if (row.status == 0) {
                res += "<span class=\"plustime\">+";
                res += _this.formatTime(Math.max(0, row.timeplus), row.status, _this.showTenthOfSecond) + "</span>";
              }
              return res;
            }
          });

          columns.push({ "sTitle": "sort", "bVisible": false, "aTargets": [col++], "mDataProp": "place" });

          this.currentTable = $('#' + this.resultsDiv).dataTable({
            paging: false,
            lengthChange: false,
            searching: false,
            info: false,
            data: results,
            order: [[col - 1, "asc"]],
            columnDefs: columns,
            destroy: true
          });
        }
      }
    };


    AjaxViewer.prototype.viewSplitTimeResults = function (className, course) {
      if (!this.showEcardTimes)
        return
      var _this = this;
      clearTimeout(this.resUpdateTimeout);
      if (this.animating){
        setTimeout(function () { _this.viewSplitTimeResults(className, course); }, 500);
        return;
      }
      if (this.currentTable != null) {
        try {
          this.currentTable.api().destroy();
        }
        catch (e) { }
      }
      $('#divResults').html('');
      var link = "<a href=\"javascript:LiveResults.Instance.chooseClass('" + className.replace('\'', '\\\'') + "')\">&#5130; Resultater</a>";
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
          var courseName = (course > 0 ? _this.courseNames.find(item => item.No === course).Name : 'Felles poster');
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
            columns.push({ "sTitle": "#", "sClass": "right", "aDataSort": [1], "aTargets": [col++], "mDataProp": "place" });
            columns.push({
              "sTitle": "placeSortable", "bVisible": false, "mDataProp": "placeSortable", "aTargets": [col++], "render": function (data, type, row) {
                if (type == "sort")
                  return row.placeSortable;
                else
                  return data;
              }
            });

            columns.push({
              "sTitle": this.resources["_NAME"] + "<br/>" + this.resources["_CLUB"],
              "sClass": "left",
              "bSortable": false,
              "aTargets": [col++],
              "mDataProp": "club",
              "width": null,
              "render": function (data, type, row) {
                var param = row.club;
                var clubShort = row.club;
                if (param && param.length > 0) {
                  param = param.replace('\'', '\\\'');
                  if (clubShort.length > _this.maxClubLength)
                    clubShort = _this.clubShort(clubShort);
                }
                var link = "<a class=\"club\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                return (row.name.length > _this.maxNameLength ? _this.nameShort(row.name) : row.name) + "<br/>" + link;
              }
            });

            columns.push({
              "sTitle": "tid<br/>m/km",
              "sClass": "right",
              "bSortable": false,
              "aTargets": [col++],
              "mDataProp": "result",
              "width": null,
              "render": function (data, type, row) {
                var ret = _this.formatTime(row.result, row.status);
                if (row.status == 0 && row.pace > 0)
                  ret += "<br/>" + _this.formatTime(row.pace, 0);
                return ret;
              }
            });

            if (data.splitcontrols != null && data.splitcontrols.length > 1) {
              for (var i = 0; i < data.splitcontrols.length; i++) {
                var code = data.splitcontrols[i];
                var title = "";
                if (course > 0) {
                  if (code == 999)
                    title = (i + 1) + "-" + _this.resources["_CONTROLFINISH"];
                  else if (i == 0)
                    title = "S-1<br/>(" + code + ")";
                  else
                    title = i + "-" + (i + 1) + "<br/>(" + code + ")";
                }
                else {
                  var codePre = (i > 0 ? data.splitcontrols[i - 1] : 0);
                  if (code == 999)
                    title = codePre + "-" + _this.resources["_CONTROLFINISH"];
                  else if (i == 0)
                    title = "S-" + code;
                  else
                    title = codePre + "-" + code;
                }

                columns.push({
                  "sTitle": title,
                  "bVisible": true,
                  "sClass": "right",
                  "bSortable": true,
                  "sType": "numeric",
                  "aDataSort": [col],
                  "aTargets": [col],
                  "bUseRendered": false,
                  "mDataProp": "result",
                  "render": function (data, type, row, meta) {
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
                        txt += "<br/>";
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

            this.currentTable = $('#' + this.resultsDiv).dataTable({
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
                if (api.order()[0][0] != 1)
                  $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\">&#8635;" + _this.resources["_RESETTODEFAULT"] + "</a>");
              }
            });

            var scrollBody = $(this.currentTable).parent();
            var maxScroll = scrollBody[0].scrollWidth - scrollBody[0].clientWidth;
            if ($(".firstCol").width() > 0 && maxScroll > 5)
              $('#switchNavClick').trigger('click');
            this.currentTable.api().columns.adjust().draw();
          }
        }
      }
    };


    AjaxViewer.prototype.splitAnalyze = function (splitResults) {
      var nRunners = splitResults.length;
      var nSplits = splitResults[0].split_time.length;
      const bestFrac = 0.25; // Best time fraction
      const missFrac = 1.2;  // Criteria for miss indication
      const missMin = 20;   // Minimum number of seconds for a miss indication

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
      var min = length/2 - nValues/2;
      var max = length/2 + nValues/2;
      var indMin = Math.floor(min);
      var indMax = Math.floor(max);
      var sumVal = 0;
      for (var i = indMin; i <= indMax; i++){
        if (i == indMin)
          sumVal += (indMin + 1 - min) * nums[i];
        else if (i == indMax)
          sumVal += (max - indMax) * nums[i];
        else
          sumVal += nums[i];
      }
      return sumVal / nValues;
    };

    
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