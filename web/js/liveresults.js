var LiveResults;
(function (LiveResults) {
    // ReSharper disable once InconsistentNaming
    LiveResults.Instance = null;
    var AjaxViewer = /** @class */ (function () {
        function AjaxViewer(competitionId, language, classesDiv, lastPassingsDiv, resultsHeaderDiv, resultsControlsDiv, resultsDiv, txtResetSorting, 
            resources, isMultiDayEvent, isSingleClass, setAutomaticUpdateText, setCompactViewText, runnerStatus, showTenthOfSecond, radioPassingsDiv, 
            EmmaServer=false,filterDiv=null,fixedTable=false) {
            var _this = this;
            this.local = false;
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
            this.showTenthOfSecond = false;
            this.updateAutomatically = true;
            this.autoUpdateLastPassings = true;
            this.showEcardTimes = false;
            this.compactView = true;
			this.scrollView = true;
            this.updateInterval = (this.local ? 2000 : (EmmaServer ? 15000 : 10000));
            this.radioUpdateInterval = (this.local ? 2000 : 5000);
            this.clubUpdateInterval = 60000;
            this.classUpdateInterval = 60000;
            this.inactiveTimeout = 30*60;
            this.inactiveTimer = 0;
            this.radioHighTime = 15;
            this.highTime = 60;
            this.animTime = 700;
            this.animating = false;
            this.numAnimElements = 0;
            this.classUpdateTimer = null;
            this.passingsUpdateTimer = null;
            this.radioPassingsUpdateTimer = null;
            this.runnerListTimer = null;
            this.resUpdateTimeout = null;
            this.updatePredictedTimeTimer = null;
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
            this.radioStart = false;
            this.filterDiv = filterDiv;
            this.predData = Array(0);
            this.rankedStartlist = true;
            this.relayClasses = [];
            this.courses = {};
            this.runnerList = null;
            this.speakerView = false;
            this.shortSprint = false;
            this.browserType = this.isMobile(); // 1:Mobile, 2:iPad, 3:PC and other
            this.maxNameLength = (this.browserType == 1 ? 15 : (this.browserType == 2 ? 22 : 30));
            this.maxClubLength = (this.browserType == 1 ? 12 : (this.browserType == 2 ? 15 : 20));
            this.apiURL = (this.local ? "api/api.php" : (EmmaServer ? "https://liveresultat.orientering.se/api.php" : "//api.liveres.live/api.php"));
            this.radioURL = (this.local ? "api/radioapi.php" : "//api.liveres.live/radioapi.php");
            this.messageURL = (this.local ? "api/messageapi.php" : "//api.liveres.live/messageapi.php");
            LiveResults.Instance = this;
            
			window.onload = function (e) {
                if (window.location.hash) {
                    var hash = window.location.hash.substring(1);
                    var cl;
                    if (hash.indexOf('club::') >= 0) 
                    {
                        cl = decodeURIComponent(hash.substring(6));
                        if (cl != _this.curClubName)
                            LiveResults.Instance.viewClubResults(cl);
                    }
                    else if (hash.indexOf('splits::') >= 0 && hash.indexOf('::course::') >= 0) 
                    {
                        var coind = hash.indexOf('::course::');
                        cl = decodeURIComponent(hash.substring(8,coind));
                        var co = hash.substring(coind+10);
                        if (_this.curSplitView == null || cl != _this.curSplitView[0] || co != _this.curSplitView[1])
                            LiveResults.Instance.viewSplitTimeResults(cl,co);
                    }
                    else if (hash.indexOf('relay::') >= 0) 
                    {
                        cl = decodeURIComponent(hash.substring(7));
                        if (cl != _this.curRelayView)
                            LiveResults.Instance.viewRelayResults(cl);
                    }
                    else 
                    {
                        cl = decodeURIComponent(hash);
                        if (cl != _this.curClassName)
                            setTimeout(function(){_this.chooseClass(cl);},100); 
                    }
                }
            };

            $(window).on('hashchange', function (e) {
                window.onload();});
            
            $(window).on('resize', function () 
            {
                if (_this.currentTable != null && _this.curClassName != "plainresults")
                    _this.currentTable.fnAdjustColumnSizing();
            } );
        }
        
        AjaxViewer.prototype.startPredictionUpdate = function () {
            var _this = this;
            clearInterval(this.updatePredictedTimeTimer);
            this.updatePredictedTimeTimer = setInterval(function () { _this.updatePredictedTimes(); }, 1000);
            this.updatePredictedTimes();
        };

        // Function to detect if comp date is today or max 6 hours into next day
        AjaxViewer.prototype.isCompToday = function () {
            var now = new Date();
            var compDay = new Date(this.compDate);
            var dDays = (now-compDay)/1000/86400;
            return  (dDays>0 && dDays<1.25 || this.compDate == "" || this.local )
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
            this.inactiveTimer += this.classUpdateInterval/1000;
            if (this.updateAutomatically) {
                $.ajax({
                    url: this.apiURL,
                    data: "comp=" + this.competitionId + "&method=getrunners&last_hash=" + this.lastRunnerListHash,
                    success: function (data) {
                        _this.handleUpdateRunnerListResponse(data);
                    },
                    error: function () {
                        _this.runnerListTimer = setTimeout(function () {_this.updateRunnerList();}, _this.classUpdateInterval);
                    },
                    dataType: "json"
                });
            }
        };
        AjaxViewer.prototype.handleUpdateRunnerListResponse = function (data) {
            var _this = this;
            if (data != null && data.status == "OK")
			{
                this.runnerList = data;
                this.lastRunnerListHash = data.hash;
            }
            this.runnerListTimer = setTimeout(function () {_this.updateRunnerList();}, this.classUpdateInterval);
        }        
        
        // Update the classlist
        AjaxViewer.prototype.updateClassList = function () {
            var _this = this;
            this.inactiveTimer += this.classUpdateInterval/1000;

            if (this.updateAutomatically) {
                $.ajax({
                    url: this.apiURL,
                    data: "comp=" + this.competitionId + "&method=getclasses&last_hash=" + this.lastClassListHash,
                    success: function (data) {
                        _this.handleUpdateClassListResponse(data);
                    },
                    error: function () {
                        _this.classUpdateTimer = setTimeout(function () {_this.updateClassList();}, _this.classUpdateInterval);
                    },
                    dataType: "json"
                });
            }
        };
        AjaxViewer.prototype.handleUpdateClassListResponse = function (data) {
            var _this = this;
            if (data.rt != undefined && data.rt > 0)
                this.classUpdateInterval = data.rt*1000;
            if (data != null && data.status == "OK")
			{                
                $('#divInfoText').html(data.infotext);
                if (!data.classes || !$.isArray(data.classes) || data.classes.length == 0)
                    $('#resultsHeader').html("<b>" + this.resources["_NOCLASSESYET"] + "</b>");
                if (data.classes != null)
				{
                    this.courses = {};
                    this.relayClasses = [];
                    var classes = data.classes;
					var str = "";
					var nClass = classes.length;
					var relayNext = false;
					var leg = 0;
                    var sprintNext = false;
                    var shiftHeat = false;
					for (var i=0; i<nClass; i++)
					{
						var className = classes[i].className;
                        this.courses[className] = (classes[i].courses != undefined ? classes[i].courses : []);                       
                        var relay = relayNext;
                        var sprint = sprintNext;
						
						param = className.replace('\'', '\\\'');
						if (className && className.length > 0)
						{
                            className = this.shortClassName(className);
                            
                            var classNameClean = className.replace(/-[0-9]{1,2}$/,'');
                            classNameClean = classNameClean.replace(/-All$/,'');
                            var LegNoStr = className.match(/-[0-9]{1,2}$/);
                            var LegNo = parseInt( (LegNoStr != null ? -LegNoStr[0] : 0),10);                            

							var classNameCleanNext = "";
                            var LegNoNext = 0;
                           
                            if (i<(nClass-1))
							{
								// Relay
                                classNameCleanNext = this.shortClassName(classes[i+1].className);
                                classNameCleanNext = classNameCleanNext.replace(/-[0-9]{1,2}$/,'');
                                LegNoStr = classes[i+1].className.match(/-[0-9]{1,2}$/);
                                LegNoNext = parseInt( (LegNoStr != null ? -LegNoStr[0] : 0),10);
                            }
								
                            if (classNameClean == classNameCleanNext && LegNoNext == LegNo + 1) // Relay trigger
                            {
                                if (!relay) // First class in relay  
                                {                                    
                                    str += "<a href=\"javascript:LiveResults.Instance.viewRelayResults('" + classNameClean + "')\" style=\"text-decoration: none\"><b> " + classNameClean + "</b></a><br/>&nbsp;";
                                    leg = 0;
                                }
                                relay = true;
                                relayNext = true;
                            }
                            else
                            {
                                relayNext = false;	
                                // Sprint
                                if (className.includes('| Prolog') || className.includes('| Kvart') || className.includes('| Semi') || className.includes('| Finale'))
                                { 
                                    var classNameCleanSprint = className.replace(' | ','');
                                    classNameCleanSprint = classNameCleanSprint.replace('Prolog','');
                                    classNameCleanSprint = classNameCleanSprint.replace(/Kvart [0-9]/,'');
                                    classNameCleanSprint = classNameCleanSprint.replace(/Semi [0-9]/,'');
                                    classNameCleanSprint = classNameCleanSprint.replace(/Finale [0-9]/,'');
                                    
                                    var classNameCleanSprintNext = "";
                                    if (i<(nClass-1))
                                    {
                                        classNameCleanSprintNext = this.shortClassName(classes[i+1].className);
                                        classNameCleanSprintNext = classNameCleanSprintNext.replace(' | ','');
                                    }
                                    classNameCleanSprintNext = classNameCleanSprintNext.replace(/Kvart [0-9]/,'');
                                    classNameCleanSprintNext = classNameCleanSprintNext.replace(/Semi [0-9]/,'');
                                    classNameCleanSprintNext = classNameCleanSprintNext.replace(/Finale [0-9]/,'');
                                    
                                    if (!sprint) // First class in sprint or new class  
                                        str += "<b>" + classNameCleanSprint + "</b><br/>&nbsp;";
                                    sprint = true;
                                    sprintNext = (classNameCleanSprintNext == classNameCleanSprint);
                                    
                                    if (i<(nClass-1) && (className.includes('| Prolog') ||
                                        className.includes('| Kvart')  && !classes[i+1].className.includes('| Kvart') ||
                                        className.includes('| Semi')   && !classes[i+1].className.includes('| Semi')))
                                        shiftHeat = true;
                                    else
                                        shiftHeat = false;
                                }
                            }
							
                            if (relay)
							{
                                this.relayClasses.push(classes[i].className);
                                var legText = "";
								leg += 1;
                                if (leg>1 && (leg-1)%3==0) // Line shift every 3 legs
                                    str += "<br/>&nbsp;"
								if (className.replace(classNameClean,'') == "-All")
									legText = "<font size=\"+0\">&#" + (9398) +"</font>"
								else
								    legText = "<font size=\"+1\">&#" + (10111+leg) +"</font>"; 
								str += "<a href=\"javascript:LiveResults.Instance.chooseClass('" + param + "')\" style=\"text-decoration: none\"> " + legText + "</a>";
								if (!relayNext)
									str += "<br/>";
							}
                            else if (sprint)
                            {
                                var heatStr = className.match(/ [0-9]$/); 
                                var heat = parseInt( (heatStr != null ? heatStr[0] : 0),10);
                                if (heat>1 && (heat-1)%3==0) // Line shift every 3 heat
                                    str += "<br/>&nbsp;"
                                if (className.includes('| Prolog'))
                                    heatText = "Prolog";
                                else if (className.includes('| Kvart'))
                                    heatText = "K" + heat;
                                else if (className.includes('| Semi'))
                                    heatText = "S" + heat;
                                else
                                    heatText = "F" + heat;
								str += "<a href=\"javascript:LiveResults.Instance.chooseClass('" + param + "')\" style=\"text-decoration: none\"> " + heatText + "</a>";
                                if (!sprintNext)
									str += "<br/>";
                                else if (shiftHeat)
                                    str += "<br/>&nbsp;";
                            }
							else	
								str += "<a href=\"javascript:LiveResults.Instance.chooseClass('" + param + "')\">" + className + "</a><br/>";							
						}
                    };
                    if (!this.EmmaServer)
                    {
                        str += "<hr><a href=\"javascript:LiveResults.Instance.chooseClass('plainresults')\" style=\"text-decoration: none\">Alle klasser</a>";
                        str += "<br/><a href=\"javascript:LiveResults.Instance.chooseClass('startlist')\" style=\"text-decoration: none\">Startliste</a>";
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
                this.classUpdateTimer = setTimeout(function () {_this.updateClassList(); }, _this.classUpdateInterval);
        };
        
        AjaxViewer.prototype.shortClassName = function (className) {
            var ret = className.replace(/menn/i,'M');
			ret = ret.replace(/kvinner/i,'K');
            ret = ret.replace(/gutter/i,'G');
            ret = ret.replace(/jenter/i,'J');
            ret = ret.replace(/veteraner/i,'Vet');
            ret = ret.replace(/veteran/i,'Vet');
			ret = ret.replace(' Vann','V');
            return ret;
        }

		// Update best split times
		AjaxViewer.prototype.updateClassSplitsBest = function (data) {
			if (data != null && data.status == "OK" && data.results != null) {
				var classSplits = data.splitcontrols;
				var classSplitsBest = new Array(this.curClassNumSplits+1);
				for (var i = 0; i < classSplitsBest.length; i++) {
					classSplitsBest[i] = new Array(1).fill(0);
				}
				                
                // Fill in finish times
				var j = 0;
				for (var i = 0; i< data.results.length; i++)
				{
					if(data.results[i].place != undefined && data.results[i].place > 0 || data.results[i].place == "=")
					{
						if (this.curClassIsRelay) // start time + leg time (add 24 h if starttime between 00:00 and 06:00)
                        { 
							var startTime = data.results[i].start + (data.results[i].start < 6*3600*100 ? 24*3600*100 : 0);
                            classSplitsBest[this.curClassNumSplits][j] = startTime + data.results[i].splits[classSplits[classSplits.length-1].code];
                        }  
                        else
							classSplitsBest[this.curClassNumSplits][j] = parseInt(data.results[i].result);
						j++;
					}
				}
				classSplitsBest[this.curClassNumSplits].sort(function (a, b) {  return a - b;  });			
				if (this.curClassNumSplits > 0)
				{
                    // Fill in split times
                    var spRef;
					for (var sp = 0; sp < this.curClassNumSplits; sp++)
					{
                        j = 0;
                        spRef = this.splitRef(sp);
						for (var i = 0; i< data.results.length ; i++)
						{
                            if(data.results[i].splits[classSplits[spRef].code + "_place"] != undefined && data.results[i].splits[classSplits[spRef].code + "_place"] > 0 
                            && data.results[i].splits[classSplits[spRef].code] != "")
							{
								if (this.curClassIsRelay) // If relay, store pass time stamp instead of used time. Using leg time and start time
                                // (add 24 h if starttime between 00:00 and 06:00)
                                {
                                    var startTime = data.results[i].start + (data.results[i].start < 6*3600*100 ? 24*3600*100 : 0);
                                    classSplitsBest[sp][j]  = startTime + data.results[i].splits[classSplits[spRef-1].code];
                                }
                                else
									classSplitsBest[sp][j]  = data.results[i].splits[classSplits[spRef].code];
								j++;
							}
						}
						classSplitsBest[sp].sort(function (a, b) {  return a - b;  });
					}
				}
				this.curClassSplitsBests = classSplitsBest;
			}
        };
        
        // Quality check of radio controls and estimate missing passing times
		AjaxViewer.prototype.checkRadioControls = function (data) {
            if (data != null && data.status == "OK" && data.results != null && !this.curClassIsLapTimes && !this.curClassIsUnranked)
            { 
                var classSplits = data.splitcontrols;
                if (classSplits.length == 0) 
                    return;
                
                const validateLim = 0.333;
                const minNum = 3; // Minimum numbers of runners to set split to BAD
                const sprintTimeLim = 90; // Shorter sprint times trigger shortSprint setting (seconds)
                this.updateResultVirtualPosition(data.results);
                var laterSplitOKj = new Array(data.results.length).fill(false);
                var runnerOK = new Array(data.results.length).fill(true);
                var raceOK = true;
                
                // Check quality of split controls
                var OKSum; 
                var statusN;
                var classSplitsOK = new Array(this.curClassNumSplits);
                for (var sp = this.curClassNumSplits-1; sp >= 0; sp--)
                {
                    OKSum = 0;
                    statusN = 0;
                    for (var j = 0; j < data.results.length ; j++)
                    {
                        if (data.results[j].status != 0 && data.results[j].status != 9 && data.results[j].status != 10)
                            continue;

                        // Finish
                        if (sp == (this.curClassNumSplits-1) && data.results[j].place != undefined && data.results[j].place > 0 || data.results[j].place == "=")
                            laterSplitOKj[j] = true;
                        
                        //  Set status: 0=bad, 1=OK, 2=unknown 
                        var spRef = this.splitRef(sp);
                        var split = parseInt(data.results[j].splits[classSplits[spRef].code]);
                        if (!isNaN(split)) // Split exist
                        {                            
                            OKSum++; 
                            statusN++; 
                            laterSplitOKj[j] = true;
                        }
                        else if (laterSplitOKj[j]) // Split does not exist and missing split detected
                        {
                            statusN++; 
                            runnerOK[j] = false;
                            raceOK = false;
                        }
                    }
                    var statusAvg = (statusN >= minNum ? OKSum/statusN : 1);
                    classSplitsOK[sp] = (statusAvg > validateLim ? true : false);
                }
                this.curClassSplitsOK = classSplitsOK;

                if (raceOK)
                    return;

                // Calculate split fractions and sprint times per runner
                var splitFracRunner = new Array(this.curClassNumSplits+1); // Fraction of next split - prev split
                for (var sp = 0; sp < this.curClassNumSplits; sp++) 
                    splitFracRunner[sp] = new Array(1).fill(0);
                var splitFrac;
                var prevSplit;
                var nextSplit;
                var nextSplitOK;
                var startTime;
                var sprintTimeSum = 0;
                var sprintTimeNum = 0;

                for (var j = 0; j < data.results.length ; j++)
                {
                    if (data.results[j].status != 0 && data.results[j].status != 9 && data.results[j].status != 10)
                        continue;
                                        
                    nextSplitOK = false;
                    nextSplit = null;
                    startTime = (this.curClassIsRelay ? parseInt(data.results[j].splits[0]) : 0);
                    if(data.results[j].place != undefined && data.results[j].place > 0 || data.results[j].place == "=")
                    {  // Finish time
                        nextSplit = parseInt(data.results[j].result);
                        nextSplitOK = true;
                    }
                    for (var sp = this.curClassNumSplits-1; sp >= 0; sp--)
                    {
                        if (!classSplitsOK[sp]) // Bad split
                            continue;
                        var spRef = this.splitRef(sp);
                        split = parseInt(data.results[j].splits[classSplits[spRef].code]);
                        if (!isNaN(split)) // Split exist
                        {
                            if (sp==this.curClassNumSplits-1 && nextSplit !=null && nextSplit>split) // last split time
                            {
                                sprintTimeSum += nextSplit-split;
                                sprintTimeNum++;
                            }
                            var spPrev = sp - 1;
                            while (!classSplitsOK[spPrev] && spPrev>=0)
                                spPrev--;
                            var spPrevRef = this.splitRef(spPrev);
                            prevSplit = (spPrevRef >= 0 ? parseInt(data.results[j].splits[classSplits[spPrevRef].code]) : startTime);
                            splitFrac = (nextSplit != null && nextSplit - prevSplit > 0 ? (split-prevSplit)/(nextSplit-prevSplit) : 0);
                            splitFracRunner[sp][j] = (splitFrac > 0 && splitFrac < 1 ? splitFrac : null);
                            nextSplit = split;
                            nextSplitOK = true;
                        }
                        else // Split does not exist
                        {
                            nextSplit = null;
                            splitFracRunner[sp][j] = null;
                        }
                    }
                }
                
                // Make correlation for split estimates
                if (sprintTimeNum > 0)
                {
                    var sprintTimeAvg = sprintTimeSum/sprintTimeNum;
                    this.shortSprint = (sprintTimeAvg > 0 && sprintTimeAvg < sprintTimeLim*100);
                }
                else
                    this.shortSprint = false;
                
                var splitsPar = [];
                var classSplitsUpdated = new Array(classSplits.length).fill(false);
               
                for (var sp = 0; sp < this.curClassNumSplits; sp++)
                {
                    if (!classSplitsOK[sp]) // Bad split
                    {
                        splitsPar.push(null);
                        continue;
                    }
                    
                    // Two passes. First pass to calculate mean and standard deviation
                    // Mean
                    var ySum = 0;
                    var count = 0;
                    for (var j = 0; j < data.results.length ; j++)
                        if (splitFracRunner[sp][j] > 0) 
                        {
                            count++;
                            ySum += splitFracRunner[sp][j];
                        }
                    var avg = (count > 0 ? ySum/count : null);
                    
                    // Standard deviation
                    ySum = 0;
                    count = 0;
                    for (var j = 0; j < data.results.length ; j++)
                        if (splitFracRunner[sp][j] > 0) 
                        {
                            count++;
                            ySum += (splitFracRunner[sp][j]-avg)*(splitFracRunner[sp][j]-avg);
                        }
                    var std = (count > 1 ? Math.sqrt(ySum/(count-1)) : 1);
                    
                    // Linear estimation (least squares)
                    var xSum = 0;
                    var xySum = 0;
                    var xxSum = 0;
                    var maxFrac = 0;
                    var minFrac = 1;
                    ySum = 0;
                    count = 0;
                    for (var j = 0; j < data.results.length ; j++)
                    {
                        if (splitFracRunner[sp][j] > 0)
                        {
                            var frac = splitFracRunner[sp][j];
                            if (Math.abs(frac - avg)<2*std)  
                            {
                                if (frac > maxFrac) maxFrac = frac;
                                if (frac < minFrac) minFrac = frac;
                                count++;
                                xSum  += j;
                                ySum  += frac;
                                xxSum += j*j;
                                xySum += j*frac;
                            }
                        }
                    }
                    
                    // Calculate estimation parameters
                    var a = 0;
                    var b = null;
                    if (count >= 1)
                    {
                        a = (count >= 2 ? (count*xySum - xSum*ySum) / (count*xxSum - xSum*xSum) : 0 );
                        b = (ySum - a*xSum)/count;
                    }
                    var obj = {avg   : (count > 0 ? ySum/count : null), 
                                 a   : a, 
                                 b   : b,
                                 max : maxFrac, 
                                 min : minFrac};
                    splitsPar.push(obj);
                }

                // Calculate nominal split fractions as fraction of total time
                var splitFracNom = new Array(this.curClassNumSplits);
                var lastFrac = 1;
                for (var sp = this.curClassNumSplits-1; sp >= 0; sp--) 
                {
                    if (!classSplitsOK[sp]) 
                        continue;
                    var X = splitsPar[sp].avg;
                    for (var spi = sp-1; spi>=0; spi--)
                    {
                        if (!classSplitsOK[spi]) // Bad split
                            continue;
                        X = splitsPar[spi].avg/(1 - X*(1- splitsPar[spi].avg));
                    }
                    splitFracNom[sp] = X*lastFrac;
                    lastFrac = splitFracNom[sp];
                }          
                
                // Loop through all runners and insert estimated times where needed
                for (var j = 0; j < data.results.length ; j++)
                {                                                          
                    if (runnerOK[j])
                        continue;
                    var nextSplit = null;
                    startTime = (this.curClassIsRelay ? parseInt(data.results[j].splits[0]) : 0);
                    
                    // Insert finish time and shift split times
                    if(data.results[j].place != undefined && data.results[j].place > 0 || data.results[j].place == "=")
                    {
                        nextSplit = parseInt(data.results[j].result);
                        var finishTime = nextSplit;

                        // Look for and shift split times if splits are multi-pass type
                        if (!this.curClassIsRelay && !this.curClassIsLapTimes)
                        {
                            for (var sp = this.curClassNumSplits-1; sp >= 0; sp--) 
                            {
                                if (!classSplitsOK[sp]) // Bad split
                                    continue;
                                var spRef = this.splitRef(sp);
                                var split = parseInt(data.results[j].splits[classSplits[spRef].code]);
                                if (isNaN(split) && sp > 0) // Split does not exist
                                {
                                    var splitCode = classSplits[spRef].code;
                                    // Find nearest, existing split
                                    var spliti = NaN;
                                    var spi = sp-1;
                                    var spRefi;
                                    var splitCodei;
                                    while (spi >= 0)
                                    {
                                        spRefi = this.splitRef(spi);
                                        splitCodei = classSplits[spRefi].code;
                                        if ( (splitCode-splitCodei) % 1000 == 0 )
                                        {
                                            spliti = parseInt(data.results[j].splits[splitCodei]);
                                            if(!isNaN(spliti))
                                                break;
                                        }
                                        spi--;
                                    }

                                    if (spi >= 0) // There exist a matching split 
                                    {
                                        var splitDevSpi = Math.abs(spliti/finishTime - splitFracNom[spi]);
                                        var bestFitSpi = spi;
                                        var bestFitDev = splitDevSpi;
                                        for (var spj = spi+1; spj <= sp; spj++)
                                        {
                                            var spRefj = this.splitRef(spj);
                                            var splitCodej = classSplits[spRefj].code;
                                            var splitDevSpj = Math.abs(spliti/finishTime - splitFracNom[spj]);
                                            if ( splitDevSpj < bestFitDev && (splitCode-splitCodej) % 1000 == 0 )
                                            {
                                                bestFitSpi = spj;
                                                bestFitDev = splitDevSpj;
                                            }
                                        }

                                        if (bestFitSpi == sp ) // Best fit is to move split time to current split
                                        {
                                            data.results[j].splits[splitCode] = data.results[j].splits[splitCodei];
                                            data.results[j].splits[splitCode  + "_changed"] = 0;
                                            data.results[j].splits[splitCode  + "_status"] = 0;
                                            data.results[j].splits[splitCodei] = undefined;
                                            classSplitsUpdated[sp] = true;
                                            classSplitsUpdated[spj] = true;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Insert estimated splits
                    for (var sp = this.curClassNumSplits-1; sp >= 0; sp--) 
                    {
                        if (!classSplitsOK[sp]) // Bad split
                            continue;
                        var prevSplit = NaN;
                        var spRef = this.splitRef(sp);
                        split = parseInt(data.results[j].splits[classSplits[spRef].code]);
                        if (!isNaN(split))                 // Split exist
                            nextSplit = split;
                        else if (splitsPar[sp].b != null)  // Split does not exist, and estimat parameter exist
                        {
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
                            var X = x[x.length-1];
                            for (var i = x.length-2; i >=0; i--)
                                X = x[i]/(1 - X*(1- x[i])); // Recursive formula for aggregated fraction
                            
                            if (nextSplit > 0 && !isNaN(prevSplit) && X>0) 
                            {
                                classSplitsUpdated[spRef] = true;
                                split = Math.round((X*nextSplit + (1-X)*prevSplit)/100)*100;
                                nextSplit = split;
                                                               
                                data.results[j].splits[classSplits[spRef].code] = split;
                                data.results[j].splits[classSplits[spRef].code  + "_estimate"] = true;
                                data.results[j].splits[classSplits[spRef].code  + "_changed"] = 0;
                                data.results[j].splits[classSplits[spRef].code  + "_status"] = 0;
                                
                                if (this.curClassIsRelay) // Leg time
                                {
                                    classSplitsUpdated[spRef-1] = true;
                                    data.results[j].splits[classSplits[spRef].code + 100000] = split - startTime;
                                    data.results[j].splits[(classSplits[spRef].code + 100000) + "_estimate"] = true;
                                    data.results[j].splits[(classSplits[spRef].code + 100000) + "_changed"] = 0;
                                    data.results[j].splits[(classSplits[spRef].code + 100000) + "_status"] = 0;
                                }
                            }
                        }
                        else // Split does not exist, and estimat parameter does exist
                            nextSplit = 0; 
                    }
                }                

                // Update split places
                for (var sp = 0; sp < classSplits.length; sp++)
                {
                    if (!classSplitsUpdated[sp])
                        continue;
                    data.results.sort(this.splitSort(sp, classSplits));

                    var splitPlace = 1;
                    var curSplitPlace = 1;
                    var curSplitTime = "";
                    var bestSplitTime = -1;
                    var bestSplitKey = -1;
                    var secondBest = false; 

                    for (var j = 0; j < data.results.length ; j++)
                    {
                        var spTime = "";
                        var raceStatus = data.results[j].status;
                        
                        if (data.results[j].splits[classSplits[sp].code] != undefined && data.results[j].splits[classSplits[sp].code] != "")
                        {
                            spTime = data.results[j].splits[classSplits[sp].code];
                            if (bestSplitTime < 0 && (raceStatus == 0 || raceStatus == 9 || raceStatus == 10))
                            {
                                bestSplitTime = spTime;
                                bestSplitKey = j;
                            }
                        }
                        if (spTime != "")
                        {
                            data.results[j].splits[classSplits[sp].code + "_timeplus"] = spTime - bestSplitTime;
                            if (!secondBest && bestSplitKey>-1 && j != bestSplitKey && (raceStatus == 0 || raceStatus == 9 || raceStatus == 10))
                            {
                                data.results[bestSplitKey].splits[classSplits[sp].code + "_timeplus"] = bestSplitTime - spTime;
                                secondBest = true;
                            }
                        }
                        else
                            data.results[j].splits[classSplits[sp].code + "_timeplus"] = -2;

                        if (curSplitTime != spTime)
                            curSplitPlace = splitPlace;
                            
                        if (raceStatus == 0 || raceStatus == 9 || raceStatus == 10)
                        {
                            data.results[j].splits[classSplits[sp].code + "_place"] = curSplitPlace;
                            splitPlace++;
                            if (data.results[j].splits[classSplits[sp].code] != undefined && data.results[j].splits[classSplits[sp].code] != "")
                                curSplitTime = data.results[j].splits[classSplits[sp].code];
                        }
                        else if (raceStatus == 13)
                            data.results[j].splits[classSplits[sp].code + "_place"] = "F";
                        else
                        {
                            data.results[j].splits[classSplits[sp].code + "_place"] = "-";
                            data.results[j].splits[classSplits[sp].code + "_status"] = raceStatus;
                        }
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
                if (!aUndefined && !bUndefined)
                {
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
			if (results != null && this.qualLimits != null) 
			{
				var qualIndex = -1;
				if (this.qualClasses != null)
					qualIndex = this.qualClasses.indexOf(className);
				if (qualIndex == -1)
					qualIndex = this.qualLimits.length-1;
                var qualLim = this.qualLimits[qualIndex];
                if (qualLim < 0)
                    return
                if (qualLim < 1) // If given as a fraction of started runners
                {
                    var numDNS = 0;
                    for (var i=0; i< results.length; i++)
                    {   if(results[i].status == 1)
                            numDNS++;
                    }
                    qualLim = Math.ceil(qualLim*(results.length - numDNS));
                }
                var lastPos = -1;
                var curPos = -1;
                var instaRanked = false;
                var limitSet = false;
				for (var i = 0; i< results.length; i++)
				{
                    lastPos = curPos;
                    curPos = results[i].place;
                    if (results[i].virtual_position != i)
                        instaRanked = true;
                    if ( (!limitSet) && ( this.rankedStartlist || !this.rankedStartlist && results[i].progress > 0 ) && 
                          ( curPos == "-" && results[i].virtual_position <= qualLim - 1 || 
                            !instaRanked  && results[i].virtual_position > qualLim - 1 && curPos != lastPos || 
                            instaRanked   && results[i].virtual_position == qualLim ) )
                    {
                        limitSet = true;
                        if (results[i].DT_RowClass == "yellow_row" || results[i].DT_RowClass == "yellow_row_fnq")
                            results[i].DT_RowClass = "yellow_row_fnq"; 
                        else 
                            results[i].DT_RowClass = "firstnonqualifier";
                    }
                    else 
                    {
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
                return sp*2 + 2;
            else if (this.curClassLapTimes)
                return sp*2 + 1;
            else
                return sp;
        }

        // Convert from split data number to render number
        AjaxViewer.prototype.refSplit = function (spRef, totTime = false) {
            if (this.curClassIsRelay)
                return Math.floor((spRef-1)/2);
            else if (this.curClassLapTimes)
                return Math.floor(spRef/2);
            else
                return spRef;
        }

		// Updated predicted times
		AjaxViewer.prototype.updatePredictedTimes = function (refresh = false, animate = true) {
            var curClassActive = false;
            if (this.currentTable != null && this.curClassName != null && this.updateAutomatically && this.isCompToday()) {
                try {
                    var dt = new Date();			
					var data = this.currentTable.fnGetData();
                    var currentTimeZoneOffset = -1 * new Date().getTimezoneOffset();
                    var eventZoneOffset = ((dt.dst() ? 2 : 1) + this.eventTimeZoneDiff) * 60;
                    var timeZoneDiff = eventZoneOffset - currentTimeZoneOffset;
                    var time = 100*Math.round((dt.getSeconds() + (60 * dt.getMinutes()) + (60 * 60 * dt.getHours())) - (this.serverTimeDiff / 1000) + (timeZoneDiff * 60));
					var timeServer = (dt - this.serverTimeDiff)/1000 + timeZoneDiff*60;
                    var timeDiff = 0;
					var timeDiffCol = 0;
                    var highlight = false;
                    var modifiedTable = false;
					var age = 0;
					var table = this.currentTable.api();					
                    var offset = 3 + (this.curClassHasBibs? 1 : 0) + ((this.curClassIsUnranked || (this.compactView && !this.curClassLapTimes)) ? 1 : 0);
                    var MDoffset = (this.isMultiDayEvent && !this.compactView && !this.curClassIsUnranked ? -1 : 0) // Multiday offset
                    var rank;
                    const predOffset = 1500;
                    const predRank = true;
                    
                    var firstOKSplit = this.curClassNumSplits; 
                    for (var sp = 0; sp < this.curClassNumSplits; sp++)
                    {
                        if (this.curClassSplitsOK[sp])
                        {
                            firstOKSplit = sp;
                            break;
                        }
                    }
                        
                    if (this.isMultiDayEvent){
                        var totalTimeCol = offset + this.curClassNumSplits*2 + (this.compactView ? 3 : 2);
                        if( typeof(data[0].totalresultSave) == 'undefined')
                        {
                            for (var i = 0; i < data.length; i++)
                                data[i].totalresultSave = data[i].totalresult;
                        }
                    }
                     
                    // *** Highlight new results and write running times***
                    var tmpPredData = Array(0); 
                    for (var i = 0; i < data.length; i++) 
                    {   
                        tmpPredData.push(this.predData[i]);
                        var row = table.row(i).node();

                        // Single-result classes. Highlight whole line
                        if (this.curClassNumSplits==0 || (this.curClassIsUnranked && this.curClassNumSplits==1) ) 
                        {
                            if (this.EmmaServer)
                            {
                                if ($(row).hasClass('new_result'))
                                    $(row).addClass('red_row');
                            }
                            else
                            { 
                                highlight = false;
                                if (data[i].changed != "" && data[i].progress==100){ 
                                    age = timeServer - data[i].changed;
                                    highlight = (age < this.highTime);
                                }
                                if (highlight && !$(row).hasClass('yellow_row'))
                                {
                                    if( !$(row).hasClass('red_row') && !$(row).hasClass('new_fnq') )
                                    {
                                        modifiedTable = true;
                                        if (data[i].DT_RowClass != undefined && (data[i].DT_RowClass == "firstnonqualifier" || data[i].DT_RowClass == "new_fnq" ))
                                            $(row).addClass('new_fnq');
                                        else
                                            $(row).addClass('red_row');
                                    }
                                }
                                else if( $(row).hasClass('red_row') || $(row).hasClass('new_fnq') )
                                {   
                                    modifiedTable = true;
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
                            if (this.EmmaServer && $(row).hasClass('new_result') && data[i].progress==100)
                            {
                                highlight = true;
                                highlightEmma = true;
                            } 
                            else if (data[i].changed != "" && data[i].progress==100){ 
                                age = timeServer - data[i].changed;
                                highlight = (age < this.highTime);
                            }                            
                            
                            if (highlight)
                            {
                                if (this.compactView || this.curClassIsRelay || this.curClassLapTimes)
                                {
                                    if (!$( table.cell(i,(offset + this.curClassNumSplits*2)).node() ).hasClass('red_cell_sqr'))
                                    {
                                        modifiedTable = true;
                                        $( table.cell(i,(offset + this.curClassNumSplits*2)).node() ).addClass('red_cell_sqr');
                                        $( table.cell(i,(offset + this.curClassNumSplits*2 + 2)).node() ).addClass('red_cell');
                                        if (this.isMultiDayEvent)
                                        {
                                            $( table.cell(i,(offset + this.curClassNumSplits*2 + 3)).node() ).addClass('red_cell_sqr');
                                            $( table.cell(i,(offset + this.curClassNumSplits*2 + 5)).node() ).addClass('red_cell');
                                        }
                                    }
                                }
                                else
                                {
                                    if (!$( table.cell(i,(offset + this.curClassNumSplits*2)).node() ).hasClass('red_cell'))
                                    {
                                        modifiedTable = true;
                                        $( table.cell(i,(offset + this.curClassNumSplits*2)).node() ).addClass('red_cell');
                                        if (this.isMultiDayEvent)
                                            $( table.cell(i,(offset + this.curClassNumSplits*2 + 2)).node() ).addClass('red_cell');
                                    }
                                }
                            }
                            else // Not highlight
                            {	
                                if (this.compactView || this.curClassIsRelay || this.curClassLapTimes)
                                {
                                    if ($( table.cell(i,(offset + this.curClassNumSplits*2)).node() ).hasClass('red_cell_sqr'))
                                    {
                                        modifiedTable = true;
                                        $( table.cell(i,(offset + this.curClassNumSplits*2)).node() ).removeClass('red_cell_sqr');
                                        $( table.cell(i,(offset + this.curClassNumSplits*2 + 2)).node() ).removeClass('red_cell');
                                        if (this.isMultiDayEvent)
                                        {
                                            $( table.cell(i,(offset + this.curClassNumSplits*2 + 3)).node() ).removeClass('red_cell_sqr');
                                            $( table.cell(i,(offset + this.curClassNumSplits*2 + 5)).node() ).removeClass('red_cell');
                                        }
                                    }
                                }
                                else
                                {
                                    if ($( table.cell(i,(offset + this.curClassNumSplits*2)).node() ).hasClass('red_cell'))
                                    {
                                        modifiedTable = true;
                                        $( table.cell(i,(offset + this.curClassNumSplits*2)).node() ).removeClass('red_cell');
                                        if (this.isMultiDayEvent)
                                            $( table.cell(i,(offset + this.curClassNumSplits*2 + 2)).node() ).removeClass('red_cell');
                                    }
                                }
                            }
                            
                            // Highlight split times
                            var spRef = 0;
                            var colNum = 0;
                            for (var sp = this.curClassNumSplits-1; sp >=0; sp--){
                                if (highlightEmma)
                                    break;
                                spRef = this.splitRef(sp);
                                colNum = offset + 2*sp;
                                
                                highlight = false;
                                if (this.EmmaServer && $(row).hasClass('new_result') && data[i].splits[this.curClassSplits[spRef].code] > 0)
                                {
                                    $( table.cell(i,colNum).node() ).addClass('red_cell');
                                    highlightEmma = true;
                                    highlight = true;
                                }
                                else if (data[i].splits[this.curClassSplits[spRef].code + "_changed"] != "")
                                {
                                    age = timeServer - data[i].splits[this.curClassSplits[spRef].code + "_changed"];
                                    highlight = (age < this.highTime);
                                }
                                if (highlight && !$( table.cell(i,colNum).node() ).hasClass('red_cell'))
                                {
                                    modifiedTable = true;
                                    $( table.cell(i,colNum).node() ).addClass('red_cell');
                                }
                                else if (!highlight && $( table.cell(i,colNum).node() ).hasClass('red_cell'))
                                {
                                    modifiedTable = true;
                                    $( table.cell(i,colNum).node() ).removeClass('red_cell');
                                }
                            }
                        }
						
						// *** Update predicted times ***
						if (data[i].status == 10 || data[i].status == 9)
                        {
                            curClassActive = true;
                            if (data[i].start != "" && data[i].start > 0) 
                            { 
                                var elapsedTime = time - data[i].start;
                                if (elapsedTime < -18*3600*100) // Time passed midnight (between 00:00 and 06:00)
                                    elapsedTime += 24*3600*100;
                                if (elapsedTime >= 0) 
                                {
                                    if (table.cell( i, 0 ).node().innerHTML == "")
                                    {
                                        table.cell( i, 0 ).data("<span class=\"pulsing\">◉</span>");
                                        modifiedTable = true;
                                    }                        

                                    if(this.isMultiDayEvent && (data[i].totalstatus == 10 || data[i].totalstatus == 9) && !this.curClassIsUnranked)
                                    {
                                        var elapsedTotalTime = elapsedTime + data[i].totalresultSave;
                                        var elapsedTotalTimeStr = "<i>&#10092;" + this.formatTime(elapsedTotalTime, 0, false) + "&#10093;</i>";
                                        if (this.curClassNumberOfRunners >= 10)
                                            elapsedTotalTimeStr += "<span class=\"hideplace\">&nbsp;<i>..&#10072;</i></span>";
                                        else
                                            elapsedTotalTimeStr += "<span class=\"hideplace\"><i>..&#10072;</i></span>";
                                        table.cell( i, totalTimeCol).data(elapsedTotalTimeStr);
                                    }  
                                    var timeDiffStr = "";
                                    var elapsedTimeStr = (this.curClassIsRelay ? "<i>⟳" : "<i>") + this.formatTime(elapsedTime, 0, false) + "</i>";
                                    if (this.curClassSplits == null || this.curClassSplits.length == 0)
                                    {
                                    // No split controls
                                        if (!this.curClassIsUnranked)
                                        {
                                            if (this.curClassSplitsBests[0][0]>0)
                                            {
                                                rank = this.findRank(this.curClassSplitsBests[0],elapsedTime);
                                                var rankStr = "<span class=\"place\"> ";                                                
                                                if (this.curClassNumberOfRunners >= 10 && rank < 10)
                                                    rankStr += "&numsp;"
                                                if (rank > 1)
                                                    rankStr += "<i>&#10072;" + rank + "&#10072;</i></span>";
                                                else
                                                    rankStr += "<i>&#10072;..&#10072;</i></span>";		
                                                elapsedTimeStr += rankStr;                                                	
                                                timeDiff = elapsedTime - this.curClassSplitsBests[0][0]; 
                                                timeDiffStr = "<i>" + (timeDiff<0 ? "-" : "+") + this.formatTime(Math.abs(timeDiff), 0, false) + "</i>";
                                            }
                                            else // No best time
                                            {
                                                timeDiffStr = "<span class=\"place\"><i>&#10072;..&#10072;</i></span>";
                                                if (this.isMultiDayEvent && !this.compactView)
                                                {
                                                    timeDiffStr = "";
                                                    elapsedTimeStr += "<span class=\"place\"> <i>&#10072;..&#10072;</i></span>";
                                                }
                                            }
                                            if (this.isMultiDayEvent && !this.compactView)
                                            {
                                                if (this.curClassNumberOfRunners >= 10)
                                                    elapsedTimeStr += "<br/>" + timeDiffStr + "<span class=\"place\"> &numsp;<i>&#10072;..&#10072;</i></span>";
                                                else
                                                    elapsedTimeStr += "<br/>" + timeDiffStr + "<span class=\"place\"> <i>&#10072;..&#10072;</i></span>";
                                            }                                     
                                            else
                                                table.cell( i, 6 + MDoffset + (this.curClassHasBibs? 1 : 0)).data(timeDiffStr);
                                        }
                                        table.cell( i, 4 + MDoffset + (this.curClassHasBibs? 1 : 0)).data(elapsedTimeStr);

                                        // Insert finish time if predict ranking is on
                                        if (predRank && this.rankedStartlist && !this.curClassIsRelay && !this.curClassLapTimes && !this.curClassIsUnranked &&
                                            data[i].progress == 0 && (data[i].status == 0 || data[i].status == 9 || data[i].status == 10))
                                        {
                                            tmpPredData[i].result = max(elapsedTime/(predOffset+1),elapsedTime - predOffset);
                                            tmpPredData[i].progress = 100;
                                            tmpPredData[i].place = "p";
                                            tmpPredData[i].status = 0;
                                        }
                                    }
                                    else
                                    {
                                    // Have split controls. Find next split to reach
                                    // Insert default value being the first OK split and last OK
                                        var lastOKSplit = this.curClassNumSplits;
                                        nextSplit       = firstOKSplit;
                                        var extraSpace = "<span class=\"hideplace\"> " + (this.curClassNumberOfRunners >= 10 ? "&numsp;":"") + "<i>&#10072;..&#10072;</i></span>";

                                        for (var sp = this.curClassNumSplits-1; sp >= 0; sp--)
                                        {
                                            var spRef = this.splitRef(sp);
                                            if (!isNaN(parseInt(data[i].splits[this.curClassSplits[spRef].code]))) {
                                                nextSplit = lastOKSplit;
                                                break;
                                            }
                                            if (this.curClassSplitsOK[sp])
                                                lastOKSplit = sp;
                                        }
                                        
                                        if (this.curClassIsUnranked){
                                            table.cell( i, offset + nextSplit*2 ).data(elapsedTimeStr);
                                            table.cell( i, offset + this.curClassNumSplits*2 ).data("<span class=\"place\"><i>&#10072;..&#10072;</i></span>");
                                        }
                                        else
                                        {
                                            var rankStr = "";
                                            if (this.curClassSplitsBests[nextSplit][0]==0)
                                            {
                                                rank = 0;
                                                rankStr += "<i>&#10072;..&#10072;</i></span>";		
                                                if (nextSplit!=this.curClassNumSplits && !this.curClassIsRelay)
                                                    timeDiffStr = elapsedTimeStr;
                                            }
                                            else
                                            {
                                                if (this.curClassIsRelay)
                                                {   // Add 24 h if time passed midnight (between 00:00 and 06:00)
                                                    timeRelay = time + (time < 6*3600*100 ? 24*3600*100 : 0);
                                                    timeDiff = timeRelay - this.curClassSplitsBests[nextSplit][0];
                                                    rank = this.findRank(this.curClassSplitsBests[nextSplit],timeRelay);
                                                }
                                                else
                                                {
                                                    timeDiff = elapsedTime - this.curClassSplitsBests[nextSplit][0];
                                                    rank = this.findRank(this.curClassSplitsBests[nextSplit],elapsedTime);                                                                                                
                                                }
                                                rankStr += "<i>&#10072;" + rank + "&#10072;</i></span>";                                                
                                                timeDiffStr = "<i>" + (timeDiff<0 ? "-" : "+") + this.formatTime(Math.abs(timeDiff), 0, false) + "</i>";
                                            }
                                            rankStr = "<span class=\"place\"> " + (this.curClassNumberOfRunners >= 10 && rank < 10 ? "&numsp;" : "") + rankStr;
                                                                                        
                                            if (this.curClassIsRelay)
                                            {
                                                elapsedTimeStr += extraSpace;
                                                if (!this.compactView)
                                                {
                                                    timeDiffStr += rankStr;
                                                    if (nextSplit==this.curClassNumSplits)
                                                    {
                                                        elapsedTimeStr = timeDiffStr + "<br>" + elapsedTimeStr;
                                                        timeDiffStr = "";
                                                    }
                                                    else
                                                    {
                                                        timeDiffStr = timeDiffStr + "<br>" + elapsedTimeStr;
                                                        elapsedTimeStr = "";
                                                    }
                                                }
                                                else if (nextSplit!=this.curClassNumSplits)
                                                    timeDiffStr += rankStr;
                                            }
                                            else
                                            {
                                                if (nextSplit==this.curClassNumSplits)
                                                    elapsedTimeStr += rankStr;
                                                else
                                                {
                                                    timeDiffStr += rankStr;
                                                    elapsedTimeStr += extraSpace;
                                                }
                                            }
                                            
                                            // Display time diff
                                            if (this.compactView || nextSplit!=this.curClassNumSplits || this.curClassLapTimes)
                                            {
                                                timeDiffCol = offset + nextSplit*2 + (nextSplit==this.curClassNumSplits ? 2 : 0);
                                                table.cell( i, timeDiffCol ).data(timeDiffStr);
                                            }
                                                                                        
                                            // Display elapsed time
                                            if (!this.compactView && !this.curClassIsRelay && !this.curClassLapTimes && nextSplit==this.curClassNumSplits)
                                                elapsedTimeStr += "<br/>" + timeDiffStr + extraSpace;
                                            table.cell( i, offset + this.curClassNumSplits*2 ).data(elapsedTimeStr);

                                            // Update predData: Insert current time if longer than a runner with larger index / virtual position
                                            if (predRank && !this.curClassIsRelay && !this.curClassLapTimes)
                                            {
                                                if (nextSplit == 0 && this.rankedStartlist) // First split
                                                    {   
                                                        tmpPredData[i].splits[this.curClassSplits[0].code] = Math.max(elapsedTime/(predOffset+1),elapsedTime - predOffset);
                                                        tmpPredData[i].progress = 100.0 * 1/(this.curClassNumSplits + 1);
                                                        tmpPredData[i].place = "";
                                                    }
                                                else
                                                {
                                                    for (var j = i+1; j < data.length; j++) 
                                                    {                                                
                                                        if (data[j].status != 0 && data[j].status != 9 && data[j].status != 10)
                                                            break                                                
                                                        if (!this.shortSprint && nextSplit == this.curClassNumSplits && data[j].status == 0 && elapsedTime - predOffset > parseInt(data[j].result))
                                                        {   // Finish
                                                            tmpPredData[i].result = Math.max(elapsedTime/(predOffset+1),elapsedTime - predOffset);
                                                            tmpPredData[i].progress = 100;
                                                            tmpPredData[i].place = "p";
                                                            tmpPredData[i].status = 0;
                                                            break;
                                                        }
                                                        if (nextSplit < this.curClassNumSplits && parseInt(data[j].splits[this.curClassSplits[nextSplit].code]) > 0)
                                                        {
                                                            if (elapsedTime - predOffset > parseInt(data[j].splits[this.curClassSplits[nextSplit].code]))
                                                            {
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
                    if (predRank && !this.curClassIsMassStart && !this.curClassIsRelay && !this.curClassIsUnranked && !this.curClassLapTimes)
                    {
                        oldData = $.extend(true,[],data); // Take a copy before updating VP
                        this.updateResultVirtualPosition(tmpPredData, false);
                        for (var j = 0; j < tmpPredData.length; j++)
                        {
                            if (data[tmpPredData[j].idx].virtual_position != tmpPredData[j].virtual_position)
                            {
                                updatedVP = true;    
                                data[tmpPredData[j].idx].virtual_position = tmpPredData[j].virtual_position;
                            }
                        }
                    }                    
                    // Update table if required
                    if (updatedVP && this.qualLimits != null && this.qualLimits.length > 0)                        
                        this.updateQualLimMarks(data, this.curClassName); 
                    if (updatedVP)
                        table.rows().invalidate().draw();
                    if (modifiedTable || refresh)
                    {
                        table.fixedColumns().update();
                        table.draw();
                    }
                    if (updatedVP && animate)
                        this.animateTable(oldData, data, this.animTime, true);
                } 
                catch (e) { }
            }
            
            // Stop requesting updates if class not active
            if (!curClassActive && !this.EmmaServer && this.curClassName != null && !this.noSplits)
                clearTimeout(this.resUpdateTimeout);
        };
		
		//Find rank number
        AjaxViewer.prototype.findRank = function (array, val) {
			var rank = 1;
			for(var i=0; i<array.length; i++)
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
                        _this.passingsUpdateTimer = setTimeout(function () {_this.updateLastPassings();}, _this.updateInterval);
                    },
                    dataType: "json"
                });
            }
        };
        //Handle response for updating the last passings
        AjaxViewer.prototype.handleUpdateLastPassings = function (data) {
            var _this = this;
            if (data.rt != undefined && data.rt > 0)
                this.updateInterval = data.rt*1000;
            if (data != null && data.status == "OK") 
            {
                if (data.passings != null) {
                    var str = "";
                    $.each(data.passings, function (key, value) {var runnerName = (value.runnerName.length > _this.maxNameLength ? _this.nameShort(value.runnerName) : value.runnerName);
                        var cl = value["class"];
                        var status = value["status"];
                        if (cl && cl.length > 0)
                            cl = cl.replace('\'', '\\\'');
                        var bibStr = "";
                        if (_this.speakerView)
                        {
                            var bib = value["bib"];
                            var bibFormat = "";
                            if (bib<0)
                                bibFormat = (-bib/100|0) + "-" + (-bib%100)
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
                this.passingsUpdateTimer = setTimeout(function () {_this.updateLastPassings();}, _this.updateInterval);
        };

        //Request data for the last radio passings div
        AjaxViewer.prototype.updateRadioPassings = function (code,calltime,minBib,maxBib) {
            var _this = this;
            clearTimeout(this.radioPassingsUpdateTimer);
            if (this.updateAutomatically) {
                $.ajax({
                    url: this.radioURL,
                    data: "comp=" + this.competitionId + "&method=getradiopassings&code=" + code + "&calltime=" + calltime +
                          "&minbib=" + minBib + "&maxbib=" + maxBib + 
                          "&lang=" + this.language + "&last_hash=" + this.lastRadioPassingsUpdateHash,
                    success: function (data,status,resp) {
                        var expTime = new Date();
                        expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
                        _this.handleUpdateRadioPassings(data,expTime,code,calltime,minBib,maxBib); },
                    error: function () {
                        _this.radioPassingsUpdateTimer = setTimeout(function () {_this.updateRadioPassings(); }, _this.radioUpdateInterval);
                    },
                    dataType: "json"                   
                });
            }

        };
        //Handle response for updating the last radio passings..
        AjaxViewer.prototype.handleUpdateRadioPassings = function (data,expTime,code,calltime,minBib,maxBib) {
            
            if (data.rt != undefined && data.rt > 0)
                this.radioUpdateInterval = data.rt*1000;
            $('#updateinterval').html(this.radioUpdateInterval/1000);
            if (expTime)
            {
                var lastUpdate = new Date();
                lastUpdate.setTime(expTime - this.radioUpdateInterval + 1000);
                $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
            }                       
            // Make live blinker pulsing
            var el = document.getElementById('liveIndicator');
                el.style.animation = 'none';
                el.offsetHeight; /* trigger reflow */
                el.style.animation = null; 
            const maxLines = 40;
            var _this = this;
			var leftInForest = false;
            var updated = false;

            // Insert data from query            
			if (data != null && data.status == "OK") 
            {
				this.lastRadioPassingsUpdateHash = data.hash;
                updated = true;
                if (data.passings != null) 
				{
					if (this.radioData == null || data.passings.length == 0 || data.passings[0].control == 100 || data.passings[0].timeDiff == -2)
						this.radioData = data.passings;
					else
					{
						Array.prototype.unshift.apply(this.radioData, data.passings);
						while (this.radioData.length > maxLines)
							this.radioData.pop();
					}
				}
			
                if (this.radioData != null && this.radioData.length > 0 && this.radioData[0].timeDiff == -2)
                {
                    leftInForest = true;
                    $('#numberOfRunners').html(this.radioData.length);
                }
            }			
			
            // Modify data-table
            if (this.radioData != null && !this.radioStart)
            {
                var dt = new Date();
                var time = dt.getSeconds() + 60 * dt.getMinutes() + 3600 * dt.getHours();
                $.each(this.radioData, function (idx, passing) {
                    var hms = passing.passtime.split(':'); 
                    var passTime = (+hms[0]) * 60 * 60 + (+hms[1]) * 60 + (+hms[2]); 
                    var age = time - passTime;
                    if (passing.status >= 1 && passing.status <= 6)
                    {
                        if (passing.DT_RowClass != "yellow_row")
                        {
                            passing.DT_RowClass = "yellow_row";
                            updated = true;
                        }
                    }
                    else if (age >= 0 && age <= _this.radioHighTime)
                    {
                        if (passing.rank == 1 && passing.DT_RowClass != "green_row")
                        {
                            passing.DT_RowClass = "green_row";
                            updated = true;
                        }
                        else if (passing.rank > 1 && passing.DT_RowClass != "red_row")
                        {
                            passing.DT_RowClass = "red_row";
                            updated = true;
                        }
                    }
                    else if (passing.DT_RowClass != "")
                    {
                        passing.DT_RowClass = "";
                        updated = true;
                    }
                });
            }
			
            if (this.currentTable != null && updated) // Existing datatable
            {
                var scrollX = window.scrollX;
                var scrollY = window.scrollY;
                var oldData = $.extend(true,[],this.currentTable.fnGetData());
                this.currentTable.fnClearTable();
                this.currentTable.fnAddData(this.radioData, true);
                this.filterTable();
                window.scrollTo(scrollX, scrollY);
                this.animateTable(oldData, this.radioData, this.animTime);
            }
            
            else if (this.currentTable == null) // New datatable
            {
                if (this.radioData != null && this.radioData.length > 0)
                {
                    var columns = Array();
                    var col = 0;
                    if (!this.radioStart && !leftInForest)
                    {
                        columns.push({ "sTitle": "Sted", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "controlName"});
                        columns.push({ "sTitle": "Tidsp." , "sClass": "left" , "bSortable": false, "aTargets": [col++], "mDataProp": "passtime"});
                    }
                    columns.push({ "sTitle": "&#8470;", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "bib",
                        "render": function (data,type,row) {
                            if (type === 'display')
                            {
                                if (data<0) // Relay
                                    return  "<span class=\"bib\">" + (-data/100|0) + "-" + (-data%100) + "</span>";
                                else if (data>0)    // Ordinary
                                    return " <span class=\"bib\">" + data + "</span>";
                                else
                                    return "";
                            }
                            else
                                return Math.abs(data);
                        }
                    });
                    columns.push({ "sTitle": "Navn", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "runnerName",
                    "render": function (data,type,row) {
                        if (type === 'display')
                        {
                            if (data.length>_this.maxNameLength)
                                return _this.nameShort(data);
                            else
                                return data;
                        }
                        else
                            return data;
                    }         
                });
                    columns.push({ "sTitle": "Klubb", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "club",
                        "render": function (data,type,row) {
                            if (type === 'display')
                            {
                                if (data.length>_this.maxClubLength)
                                {
                                    return _this.clubShort(data);
                                }
                                else
                                    return data;
                            }
                            else
                                return data;        
                        }});
                    columns.push({ "sTitle": "Klasse", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "class",
                        "render": function (data,type,row) {
                                var link = "<a href=\"followfull.php?comp=" + _this.competitionId + "&class=" + encodeURIComponent(row.class);
                                link +=	"\" target=\"_blank\" style=\"text-decoration: none;\">" + row.class + "</a>";
                                return link;
                            }});
                    if (this.radioStart)
                    {				
                        columns.push({ "sTitle": "Brikke" , "sClass": "left" , "bSortable": false, "aTargets": [col++], "mDataProp": "ecard1", 
                        "render": function (data,type,row) {
                            var ecards = "";
                            if (row.ecard1>0) {
                                ecards += row.ecard1;
                                if (row.ecard2>0) ecards += " / " + row.ecard2;}
                            else
                                if (row.ecard2>0) ecards += row.ecard2;
                            var runnerName = ( Math.abs(row.bib)>0 ? "(" + Math.abs(row.bib) + ") " : "" ) + row.runnerName;
                                    runnerName = runnerName.replace("<del>","");
                                    runnerName = runnerName.replace("</del>","");
                            var ecardstr = "<div onclick=\"res.popupCheckedEcard(" + row.dbid + ",'" + runnerName + "','" + ecards + "');\">";
                            if (row.checked == 1 || row.status==9)
                                ecardstr += "&#9989; "; // Green checkmark
                            else
                                ecardstr += "&#11036; "; // Empty checkbox
                            ecardstr += ecards;
                            ecardstr += "</div>";
                            return ecardstr;}});
                    }				
                    if (!leftInForest && this.radioData.length > 0 && this.radioData[0].rank != null)
                        columns.push({ "sTitle": "#", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "rank",
                            "render": function (data,type,row) {
                                var res = "";
                                if (row.rank >= 0) res += row.rank;
                                return res;
                            }});
                    
                    var timeTitle = "Tid";
                    if (this.radioStart || leftInForest) 
                        timeTitle = "Starttid";
                    columns.push({ "sTitle": timeTitle, "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "time"});
                    
                    if (!leftInForest && this.radioData.length > 0 && this.radioData[0].timeDiff != null)
                        columns.push({ "sTitle": "Diff", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "timeDiff",
                            "render": function (data,type,row) {
                                var res = "";
                                if (row.timeDiff >= 0)
                                    res += "+" + _this.formatTime(row.timeDiff, 0, _this.showTenthOfSecond);
                                else if (row.timeDiff != -1)
                                    res += "<i>-" + _this.formatTime(-row.timeDiff, 0, _this.showTenthOfSecond) +"</i>";
                                return res;
                            }});
                    if (leftInForest)
                    {
                        columns.push({ "sTitle": "", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "status",
                            "render": function (data,type,row) {
                                var res = "";
                                if (row.checked == 1 || row.status==9)
                                    res += "&#9989; "; // Green checkmark
                                else
                                    res += "&#11036; "; // Empty checkbox
                                return res;
                            }});
                        columns.push({ "sTitle": "DNS", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "controlName",
                            "render": function (data,type,row) {                               
                                var runnerName = ( Math.abs(row.bib)>0 ? "(" + Math.abs(row.bib) + ") " : "" ) + row.runnerName;                                
                                var link = "<button onclick=\"res.popupDialog('" + runnerName + "'," + row.dbid + ",1);\">&#128172;</button>";						
                                return link;
                            }});
                    }
                    if (this.radioStart){				
                        var message = "<button onclick=\"res.popupDialog('Generell melding',0,0);\">&#128172;</button>";
                        
                        columns.push({ "sTitle": message, "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "controlName",
                            "render": function (data,type,row) 
                            {
                                    var defaultDNS =  (row.dbid > 0 ? (code == -999 ? -1 : 1) : 0);
                                    var runnerName = ( Math.abs(row.bib)>0 ? "(" + Math.abs(row.bib) + ") " : "" ) + row.runnerName;
                                    runnerName = runnerName.replace("<del>","");
                                    runnerName = runnerName.replace("</del>","");
                                    var link = "<button onclick=\"res.popupDialog('" + runnerName + "'," + row.dbid + "," + defaultDNS + ");\">&#128172;</button>";						
                                    if ( _this.messageBibs.indexOf(row.dbid) > -1)
                                        link += " &#9679;";
                                    return link;
                            }});
                    }
                    
                    this.currentTable = $('#' + this.radioPassingsDiv).dataTable({
                        "bPaginate": false,
                        "bLengthChange": false,
                        "bFilter": true,
                        "dom": 'lrtip',
                        "bSort": false,
                        "bInfo": false,
                        "bAutoWidth": false,
                        "aaData": this.radioData,
                        "aaSorting": [[1, "desc"]],
                        "aoColumnDefs": columns,
                        "bDestroy": true,
                        "orderCellsTop": true
                        });            
                }
            }
            if (this.isCompToday())
                this.radioPassingsUpdateTimer = setTimeout(function () {_this.updateRadioPassings(code,calltime,minBib,maxBib);}, this.radioUpdateInterval);
        };
        
    // Runner name shortener
    AjaxViewer.prototype.nameShort = function (name) {
        if(!name)
           return false;
        var array = name.split(' ');
        if (array.length==1)
            return name;
        
        var num = array[array.length-1];
        if (num.match(/\d+/g) != null)
        {
            array.pop();
            num = " " + num;
        }
        else
            num = "";

        var shortName = array[0] + ' ';
        for (var i=1; i<array.length-1; i++)
            shortName += array[i].charAt(0) + '.';
        if (shortName.length + array[array.length-1].length < this.maxNameLength)
            shortName += ' ' + array[array.length-1];
        else
        {
            var arrayLast = array[array.length-1].split('-');
            var lastName = '';
            if (arrayLast.length>1)
                lastName = arrayLast[arrayLast.length-2].charAt(0) + '-' + arrayLast[arrayLast.length-1];
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
                success: function (data,status,resp) {                    
                    _this.handleUpdateStartList(data); },
                error: function () { },
                dataType: "json"                   
            });
        }
    };
    //Handle response for updating start list
    AjaxViewer.prototype.handleUpdateStartList = function (data) {
        
        var _this = this;
        // Insert data from query
        if (data != null && data.status == "OK" && data.runners != null) 
        {
            if (data.runners.length==0) return;
            var columns = Array();
            var col = 0;
            columns.push({ "sTitle": "St.no", "bVisible": false, "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "bib",
                            "render": function (data,type,row) {
                                    return Math.abs(data);
                            }
            });
            columns.push({ "sTitle": "St.no", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "bib",
                "render": function (data,type,row) {
                    if (type === 'display')
                    {
                        var res;
                        if (data<0) // Relay
                            res = (-data/100|0) + "-" + (-data%100);
                        else if (data>0)    // Ordinary
                            res = data;
                        else
                            res = "";
                        if (row.status==1) // DNS
                            return ("<del>" + res + "</del>");
                        else
                            return res;
                    }
                    else
                        return Math.abs(data);
                }
            });
            columns.push({ "sTitle": "Navn", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "name",
                "render": function (data,type,row) {
                if (type === 'display')
                {
                    var res;                                      
                    if (data.length>_this.maxNameLength)
                        res = _this.nameShort(data);
                    else
                        res = data;
                    if (row.status==1) // DNS
                        return ("<del>" + res + "</del>");
                    else
                        return res;
                }
                else
                    return data;
            }         
                });
            columns.push({ "sTitle": "Klubb", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "club",
                "render": function (data,type,row) {
                    if (type === 'display')
                    {
                        var res; 
                        if (data.length>_this.maxClubLength)
                            res = _this.clubShort(data);
                        else
                            res = data;
                        if (row.status==1) // DNS
                            return ("<del>" + res + "</del>");
                        else
                            return res;
                    }
                    else
                        return data;        
                }});
            columns.push({ "sTitle": "Klasse", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "class",
                "render": function (data,type,row) {
                        className = row.class;
                        var link = "<a href=\"followfull.php?comp=" + _this.competitionId + "&class=" + encodeURIComponent(row.class);
                        link +=	"\" target=\"_blank\" style=\"text-decoration: none;\">" + row.class + "</a>";                        
                        if (row.status==1) // DNS
                            return ("<del>" + link + "</del>");
                        else
                            return link;
                    }});
                    
            columns.push({ "sTitle": "Starttid", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "start",
                "render": function (data,type,row) {
                    if (type === 'display')
                    {
                        if (row.status==1) // DNS
                            return ("<del>" + data + "</del>");
                        else
                            return data;
                    }
                    else
                        return data;        
                    }});        				
          
            columns.push({ "sTitle": "Brikke#1" , "sClass": "center" , "bSortable": false, "aTargets": [col++], "mDataProp": "ecard1",
                "render": function (data,type,row) 
                {
                    var bibStr = (row.bib == 0 ? "" : "(" + (row.bib < 0 ? (-row.bib/100|0) + "-" + (-row.bib%100) : row.bib ) + ") ");
                    var ecardStr = (row.ecard1 == 0 ? "-" : row.ecard1 );
                    var runnerName = bibStr + row.name;
                    var link = "<button style=\"width:50px\" onclick=\"res.popupDialog('" + runnerName + ". Endre brikke 1 fra " 
                        + ecardStr + " til '," + row.dbid + ",0,1);\">"+ ecardStr +"</button>";						
                    return link;
                }});
            columns.push({ "sTitle": "Brikke#2" , "sClass": "center" , "bSortable": false, "aTargets": [col++], "mDataProp": "ecard2",
                "render": function (data,type,row) 
                {
                    var bibStr = (row.bib == 0 ? "" : "(" + (row.bib < 0 ? (-row.bib/100|0) + "-" + (-row.bib%100) : row.bib ) + ") ");
                    var ecardStr = (row.ecard2 == 0 ? "-" : row.ecard2 );
                    var runnerName = bibStr + row.name;
                    var link = "<button style=\"width:50px\" onclick=\"res.popupDialog('" + runnerName + ". Endre brikke 2 fra " 
                        + ecardStr + " til '," + row.dbid + ",0,1);\">"+ ecardStr +"</button>";						
                    return link;
                }});

            this.currentTable = $('#startList').dataTable({
                "bPaginate": false,
                "bLengthChange": false,
                "bFilter": true,
                "dom": 'lrtip',
                "bSort": true,
                "bInfo": false,
                "bAutoWidth": false,
                "aaData": data.runners,
                "aaSorting": [[0, "asc"]],
                "aoColumnDefs": columns,
                "bDestroy": true,
                "orderCellsTop": true
                });            
        }

    };
    
    
    // Club name shortener
    AjaxViewer.prototype.clubShort = function (club) {
        _this = this;
        if(!club)
            return false;
        var shortClub  = club.replace('Orienterings', 'O.');
        shortClub = shortClub.replace('Orientering', 'O.');
        shortClub = shortClub.replace('Orienteering', 'O.');
        shortClub = shortClub.replace('Orienteer', 'O.');
        shortClub = shortClub.replace('Skiklubb', 'Sk.');
        shortClub = shortClub.replace('og Omegn IF', 'OIF');
        shortClub = shortClub.replace('og omegn', '');
        shortClub = shortClub.replace(/national team/i,'NT');
        shortClub = shortClub.replace('Sportklubb', 'Spk.');
        shortClub = shortClub.replace('Sportsklubb', 'Spk.');
        shortClub = shortClub.replace('Idrettslaget', '');
        shortClub = shortClub.replace('Idrettslag', '');
        shortClub = shortClub.replace(' - Ski', '');
        shortClub = shortClub.replace('OL', '');
        shortClub = shortClub.replace('OK', '');
        shortClub = shortClub.replace('SK', '');
        shortClub = shortClub.replace('IL', '');
        shortClub = shortClub.trim();

        var del = (shortClub.substring(0,5)=="<del>");
        shortClub = shortClub.replace("<del>","");
        shortClub = shortClub.replace("</del>","");
  
        var lastDiv = shortClub.lastIndexOf("-");
        var legNoStr = shortClub.substr(lastDiv);
        if(!isNaN(legNoStr) && lastDiv>0)
            shortClub = shortClub.substring(0, Math.min(lastDiv,_this.maxClubLength)) + legNoStr;
        else
            shortClub = shortClub.substring(0, _this.maxClubLength)
        if (del)
            shortClub = "<del>" + shortClub + "</del>";
        
        return shortClub;
    };

    
    // Filter rows in table
    AjaxViewer.prototype.filterTable = function () {
        var table = this.currentTable.api();
        table.search($('#' + this.filterDiv)[0].value).draw()
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
        if (bib != null)
        {
            var ind = this.runnerList.runners.findIndex(x => Math.abs(x.bib) == bib);
            if (ind>-1)
            {
                runnerText = "(" + bib + ") " + this.runnerList.runners[ind].name + ", " 
                            + this.runnerList.runners[ind].club + ", " + this.runnerList.runners[ind].class + ", "
                            + this.runnerList.runners[ind].start;
                this.highlightID = this.runnerList.runners[ind].dbid;
                if (this.curClassName == this.runnerList.runners[ind].class)
                {
                    var tableData = this.currentTable.fnGetData();
                    this.setHighlight(tableData,this.highlightID);        
                    this.currentTable.fnClearTable();
                    this.currentTable.fnAddData(tableData, true);
                }
                else
                    this.chooseClass(this.runnerList.runners[ind].class);
            }
        }
        $('#searchRunner').html(runnerText);            
        if(ind == -1 && this.highlightID != null)
        {            
            this.highlightID = null;
            var tableData = this.currentTable.fnGetData();
            this.setHighlight(tableData,this.highlightID);        
            this.currentTable.fnClearTable();
            this.currentTable.fnAddData(tableData, true);
        }
    };

    //Popup window for setting ecard to checked
    AjaxViewer.prototype.popupCheckedEcard = function (dbid,name,ecards) {
        var message = name + ": " + ecards + " ?";
        var OK = confirm(message);
        if (OK)
            $.ajax({url: this.messageURL + "?method=setecardchecked", data: "&comp=" + this.competitionId + "&dbid=" + dbid });        
    }
	
    //Popup window for messages to message center
    AjaxViewer.prototype.popupDialog = function (promptText,dbid,defaultDNS,startListChange = -1) {
        var defaultText ="";
        if (defaultDNS==1)
            defaultText = "ikke startet";
        else if (defaultDNS==-1)
            defaultText = "startet";
        else if (dbid<0)
            defaultText = "startnummer:";
        var message = prompt(promptText, defaultText);
        if (message != null && message != "")
        {
            message = message.substring(0,250); // limit number of characters
            var DNS = (message == "ikke startet" ? 1 : 0);
            var ecardChange = (dbid<0 && message.match(/\d+/g) != null);
            var sendOK = true;
            if (startListChange > 0)
            {
                var senderName = prompt("Innsenders navn og mobilnummer");
                if (senderName == null || senderName == "")
                {
                    alert("Innsender må registreres!");
                    sendOK = false;
                }
                else
                {    
                    message = senderName + " registrerte: " + promptText + message;
                    alert("Ønsket endring av brikkenummer er registrert\n" + message);
                }
            }
            if (sendOK)
                $.ajax({
                    url: this.messageURL + "?method=sendmessage", 
                    data: "&comp=" + this.competitionId + "&dbid=" + dbid + "&message=" + message + "&dns=" + DNS + "&ecardchange=" + ecardChange
                }
            );
            this.messageBibs.push(dbid);
        }
    };

    //Popup window for requesting RaceSplitter file
    AjaxViewer.prototype.raceSplitterDialog = function () {
        var error = true;
        var interval = prompt("Start generering av RaceSplitter fil. Legg inn startintervall i sekunder:", 15);
        if (interval != null)
        {
            interval = interval.substring(0,250); // limit number of characters
            if (interval.match(/\d+/g) != null);
            {
                interval = interval*100;
                var firstStart = prompt("Legg inn første start (format HH:MM:SS)", "11:00:00");
                var a = firstStart.split(':'); // split it at the colons
                if (a.length == 3)
                {
                    var firstStartcs  = 100*((+a[0]) * 3600 + (+a[1]) * 60 + (+a[2]));
                    if (firstStartcs >= 0)
                    {
                        error = false;
                        $.ajax({
                            url: this.apiURL + "?method=getracesplitter", 
                            data: "&comp=" + this.competitionId + "&firststart=" + firstStartcs + "&interval=" + interval,
                            success: function (data, status, resp) {
                                try {
                                    var blob = new Blob([data],{ type: "text/plain;charset=utf-8" });
                                    saveAs(blob,"RaceSplitter.csv")
                                }
                                catch (e) {} },
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
            if (this.inactiveTimer > this.inactiveTimeout)
            {
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
                                var varTime = Math.max(1000,postTime-preTime); // Uncertainty in server time. Add 1000 to account for seconds resultion
                                var reqTime = resp.getResponseHeader("date"); 
                                if (reqTime) 
                                { 
                                    var newTimeDiff = postTime - (new Date(reqTime).getTime() + 500);
                                    if (Math.abs(newTimeDiff - _this.serverTimeDiff) > 1.5*varTime)
                                        _this.serverTimeDiff = newTimeDiff;
                                }
                                expTime = new Date(resp.getResponseHeader("expires")).getTime();
                            }
                            catch (e) {  }
                            _this.handleUpdateClassResults(data,expTime);
                        },
                        error: function () {
                            _this.resUpdateTimeout = setTimeout(function () {_this.checkForClassUpdate();}, _this.updateInterval);
                        },
                        dataType: "json"
                    });
                }
            }
        };
        
        //handle response from class-results-update
        AjaxViewer.prototype.handleUpdateClassResults = function (newData,expTime) {
            try{
                if (newData.rt != undefined && newData.rt > 0)
                    this.updateInterval = newData.rt*1000;
                $('#updateinterval').html(this.updateInterval/1000);
                if (expTime)
                {
                    var lastUpdate = new Date();
                    lastUpdate.setTime(expTime - this.updateInterval + 1000);
                    $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
                }
                var _this = this;
                if (newData.status == "OK") {
                    clearInterval(this.updatePredictedTimeTimer);
                    if (this.animating) // Wait until animation is completed
                    {
                        setTimeout(function () {_this.handleUpdateClassResults(newData,expTime);}, 100);
                        return;
                    }
                    if (this.currentTable != null)
                    {
                        $('#divInfoText').html(newData.infotext);
                        
                        var oldResults = $.extend(true,[],this.currentTable.fnGetData());
                        var table = this.currentTable.api();
                        var posLeft = $(table.settings()[0].nScrollBody).scrollLeft();
                        var scrollX = window.scrollX;
                        var scrollY = window.scrollY;

                        this.curClassNumberOfRunners = newData.results.length;
                        $('#numberOfRunners').html(this.curClassNumberOfRunners);
                        this.checkRadioControls(newData);
                        this.updateClassSplitsBest(newData);
                        this.updateResultVirtualPosition(newData.results);
                        this.predData = $.extend(true,[],newData.results);
                        if (this.highlightID != null)
                            this.setHighlight(newData.results,this.highlightID); 
                        if (this.qualLimits != null && this.qualLimits.length > 0)
                            this.updateQualLimMarks(newData.results, newData.className);

                        this.currentTable.fnClearTable();
                        this.currentTable.fnAddData(newData.results, true);
                        
                        // Hide columns if split is BAD
                        if (this.curClassSplits != null && this.curClassSplits.length > 0)
                        {
                            var offset = 3 + (this.curClassHasBibs? 1 : 0) + ((this.curClassIsUnranked || (this.compactView && !this.curClassLapTimes)) ? 1 : 0);
                            for (var sp = 0; sp < this.curClassNumSplits; sp++){
                                colNum = offset + 2*sp;
                                table.column(colNum).visible( this.curClassSplitsOK[sp] );
                            }
                        } 
                        
                        this.updatePredictedTimes(true, false); // Refresh = true; Animate = false
                        $(table.settings()[0].nScrollBody).scrollLeft( posLeft );
                        window.scrollTo(scrollX, scrollY);

                        var newResults = this.currentTable.fnGetData();                    
                        this.animateTable(oldResults, newResults, this.animTime);
                        
                        this.lastClassHash = newData.hash;
                        setTimeout(function(){_this.startPredictionUpdate();}, _this.animTime+200);
                    }
                }
            }
            catch (e) {}
            if (this.isCompToday())
                this.resUpdateTimeout = setTimeout(function () {_this.checkForClassUpdate();}, _this.updateInterval);
        };

        AjaxViewer.prototype.animateTable = function(oldData, newData, animTime, predRank = false){
            // Animate an update to date table
            // Based on jQuery Animated Table Sorter 0.2.2 (02/25/2013)
            // http://www.matanhershberg.com/plugins/jquery-animated-table-sorter/
            
            if (this.animating)
                return
            try
            {
                var _this = this;
                var tableDT = this.currentTable.api();
                var isResTab = (newData[0].virtual_position != undefined);
                var table = null;
                var fixedTable = null;
                this.currentTable.fnAdjustColumnSizing();

                if (isResTab) // Result table
                {
                    tableDT.draw();
                    table = $('#' + this.resultsDiv);
                    var order = tableDT.order();
                    var numCol = tableDT.settings().columns()[0].length;
                    if (order[0][0] != numCol-1) // Not sorted on virtual position
                        return; 
                    fixedTable = $(table.DataTable().cell(0,0).fixedNode()).parents('table')[0];
                }
                else // Radio table
                    table = $('#' + this.radioPassingsDiv);
                        
                // Make list of indexes and progress for all runners 
                var prevInd = new Object();
                var progress = new  Object();
                for (var i=0; i<oldData.length;i++)
                {
                    var oldID = (this.EmmaServer ? (oldData[i].name + oldData[i].club) : oldData[i].dbid);
                    if (prevInd[oldID] != undefined) 
                    {
                        prevInd[oldID] = "noAnimation";
                        continue
                    }
                    prevInd[oldID] = (isResTab ? oldData[i].virtual_position : i);
                    progress[oldID] = (isResTab ? oldData[i].progress : 100);
                }

                var oldIndArray = new Object(); // List of old indexes
                var updProg    = new Object();  // List of progress change
                for (var i=0; i<newData.length;i++){
                    var newID = (this.EmmaServer ? (newData[i].name + newData[i].club) : newData[i].dbid);
                    var newInd = (isResTab ? newData[i].virtual_position : i);
                    if (prevInd[newID] == "noAnimation")
                        continue;
                    else if (prevInd[newID] == undefined) // New entry
                    {
                        oldIndArray[newInd] = newInd; 
                        updProg[newInd] = false;                
                    }
                    else if (prevInd[newID] != newInd)
                    {
                        oldIndArray[newInd] = prevInd[newID];
                        updProg[newInd] = (isResTab ? progress[newID] != newData[i].progress : false);
                    }
                }
                if (Object.keys(oldIndArray).length == 0) // No modifications
                {
                    this.currentTable.api().draw();
                    return;
                }

                if (predRank)
                    clearInterval(this.updatePredictedTimeTimer);
                
                // Set each td's width
                var column_widths = new Array();
                $(table).find('tr:first-child th').each(function() {column_widths.push( $(this)[0].getBoundingClientRect().width-9);});
                $(table).find('tr td, tr th').each(function() {$(this).css('min-width',column_widths[$(this).index()]);});
                
                // Set table height and width
                var height = $(table).outerHeight()+20;

                // Put all the rows back in place
                var rowPosArray = new Array();
                var tableTop = $(table)[0].getBoundingClientRect().top; 
                $(table).find('tr').each(function() {
                    var rowPos = $(this)[0].getBoundingClientRect().top - tableTop + (this.clientTop>1 ? -1.5 : -0.5);
                    rowPosArray.push(rowPos);
                    $(this).css('top', rowPos);
                });

                // Set table cells position to absolute
                $(table).find('tbody tr').each(function() {
                    $(this).css('position', 'absolute').css('z-index', '91'); });

                if (isResTab)
                {
                    $(fixedTable).find('tr td, tr th').each(function() {$(this).css('min-width',column_widths[$(this).index()]);});        
                    $(fixedTable).find('tr').each(function(index) {$(this).css('top', rowPosArray[index]); });
                    $(fixedTable).find('tbody tr').each(function() {$(this).css('position', 'absolute').css('z-index', '92'); });
                    $(fixedTable).height(height).width('100%');
                }
                $(table).height(height).width('100%');

                // Animation
                this.animating = true;
                this.numAnimElements = 0;
                for (var newIndStr in oldIndArray) 
                {
                    var newInd   = parseInt(newIndStr);
                    var oldInd   = oldIndArray[newInd];
                    var oldPos   = rowPosArray[oldInd+1];
                    var newPos   = rowPosArray[newInd+1];
                    var row      = $(table).find("tbody tr").eq(newInd);
                    if (isResTab)         
                        var rowFix   = $(fixedTable).find("tbody tr").eq(newInd); 
                    var oldBkCol = (oldInd % 2 == 0 ? '#E6E6E6' : 'white');
                    var newBkCol = (newInd % 2 == 0 ? '#E6E6E6' : 'white');
                    var zind;
                    var zindFix;
                    if (predRank) // Update from predictions of running times 
                    {
                        zind    = (newInd == 0 ? 96 : (newInd > oldInd ? 95 : 93));
                        zindFix = zind + 1;
                    }
                    else // Updates from new data from server
                    {
                        zind    = (updProg[newInd] ? 95 : 93);
                        zindFix = zind + 1;
                    }
                    this.numAnimElements++;
                    $(row).css('background-color',oldBkCol).css('top', oldPos).css('z-index',zind);
                    $(row).velocity({translateZ: 0, backgroundColor: newBkCol, top: newPos}, 
                        {duration: animTime, complete: function(){_this.numAnimElements--;}});
                    if (isResTab)
                    {
                        this.numAnimElements++;
                        $(rowFix).css('background-color',oldBkCol).css('top', oldPos).css('z-index',zindFix);
                        $(rowFix).velocity({translateZ: 0, backgroundColor: newBkCol, top: newPos}, 
                        {duration: animTime, complete: function(){_this.numAnimElements--;}});
                    }
                }
                setTimeout(function(){_this.endAnimateTable(table,fixedTable,predRank,true)},_this.animTime+100);
            }
            catch (e) {}
        };   
            
        // Reset settings after animation is completed
        AjaxViewer.prototype.endAnimateTable = function (table,fixedTable,predRank,first) {
            var _this = this;
            if (this.numAnimElements > 0 && first ) // Wait for all animations to finish
                setTimeout(function(){_this.endAnimateTable(table,fixedTable,predRank,false)},_this.animTime);
            else
            {
                $(table).find('tr td, tr th').each(function() {$(this).css('min-width','');});   
                $(table).find('tr').each(function() {$(this).css('position', ''); });
                $(table).height(0).width('100%');
                if (fixedTable != null)
                {
                    $(fixedTable).find('tr td, tr th').each(function() {$(this).css('min-width','');});        
                    $(fixedTable).find('tr').each(function() {$(this).css('position', ''); });
                    $(fixedTable).height(0).width('100%');
                }
                this.currentTable.api().draw();
                this.animating = false;
                if (predRank)
                    setTimeout(function(){_this.startPredictionUpdate();},100);
            }
        };

        //Check for update in clubresults
        AjaxViewer.prototype.checkForClubUpdate = function () {
            var _this = this;
            if (this.inactiveTimer >= this.inactiveTimeout)
            {
                alert('For lenge inaktiv. Trykk OK for å oppdatere.')
                this.inactiveTimer = 0;
            }
            if (this.updateAutomatically) {
                if (this.currentTable != null) {
                    $.ajax({
                        url: this.apiURL,
                        data: "comp=" + this.competitionId + "&method=getclubresults&unformattedTimes=true&club=" + encodeURIComponent(this.curClubName) + "&last_hash=" + this.lastClubHash + (this.isMultiDayEvent ? "&includetotal=true" : ""),
                        success: function (data,status,resp) {
                            var expTime = new Date();
                            expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
                            _this.handleUpdateClubResults(data,expTime); 
                        },
                        error: function () {
                            _this.resUpdateTimeout = setTimeout(function () {_this.checkForClubUpdate();}, _this.clubUpdateInterval);
                        },
                        dataType: "json"
                    });
                }
            }
        };

        //handle the response on club-results update
        AjaxViewer.prototype.handleUpdateClubResults = function (data,expTime) {
            var _this = this;
            if (data.rt != undefined && data.rt > 0)
                this.clubUpdateInterval = data.rt*1000;
            $('#updateinterval').html(this.clubUpdateInterval/1000);
            if (expTime)
            {
                var lastUpdate = new Date();
                lastUpdate.setTime(expTime - this.clubUpdateInterval + 1000);
                $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
            }
            if (data.status == "OK" && this.currentTable != null)
            { 
                var numberOfRunners = data.results.length;
                $('#numberOfRunners').html(numberOfRunners);
                var posLeft = $(this.currentTable.api().settings()[0].nScrollBody).scrollLeft();
                var scrollX = window.scrollX;
                var scrollY = window.scrollY;
                this.currentTable.fnClearTable();
                if (data && data.results) 
                {
                    $.each(data.results, function (idx, res) 
                    {
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
                $(this.currentTable.api().settings()[0].nScrollBody).scrollLeft( posLeft );
                window.scrollTo(scrollX, scrollY)
                this.lastClubHash = data.hash;
                this.currentTable.fnAdjustColumnSizing();
            }
            if (_this.isCompToday())
                this.resUpdateTimeout = setTimeout(function () {_this.checkForClubUpdate();}, _this.clubUpdateInterval);
        };	
		
		AjaxViewer.prototype.chooseClass = function (className) {
            if (className.length == 0)
				return;
            var _this = this;
            this.inactiveTimer = 0;
            clearTimeout(this.resUpdateTimeout);
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
                        var varTime = Math.max(1000,postTime-preTime); // Uncertainty in server time. Add 1000 to account for seconds resultion
                        var reqTime = resp.getResponseHeader("date");
                        if (reqTime) 
                        { 
                            var newTimeDiff = postTime - (new Date(reqTime).getTime() + 500);
                            if (Math.abs(newTimeDiff - _this.serverTimeDiff) > 1.5*varTime)
                                _this.serverTimeDiff = newTimeDiff;
                        }
                        expTime = new Date(resp.getResponseHeader("expires")).getTime();
                    }
                    catch (e) { }
					_this.updateClassResults(data,expTime);
                },
                dataType: "json"
            });
            if (!this.isSingleClass)
                window.location.hash = className;           
        };
		
        AjaxViewer.prototype.updateClassResults = function (data,expTime) {
            if (data != null && data.rt != undefined && data.rt > 0)
                this.updateInterval = data.rt*1000;
            if (expTime)
            {
                var lastUpdate = new Date();
                lastUpdate.setTime(expTime - this.updateInterval + 1000);
                $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
            }
            var _this = this;    
            if (data != null && data.status == "OK") {
                $('#divInfoText').html(data.infotext);
                if (data.className != null) {
                    if (data.className == "plainresults")
                    {
                        $('#' + this.resultsHeaderDiv).html('<b>Alle klasser</b>');
                        $('#' + this.txtResetSorting).html("");
                    }
                    else if (data.className == "startlist")
                    {
                        $('#' + this.resultsHeaderDiv).html('<b>Startliste</b>');
                        $('#' + this.txtResetSorting).html("");
                    }
                    else
                    {
                        $('#' + this.resultsHeaderDiv).html('<b>' + data.className + '</b>');
                        var courses = _this.courses[data.className];
                        var link = "";
                        if (_this.showEcardTimes && courses != undefined && courses.length > 0)
                            link = this.splitTimesLink(data.className,courses);
                        $("#" + _this.txtResetSorting).html(link);

                    }
                    $('#' + this.resultsControlsDiv).show();
                }    
                
                if (data.className == "plainresults")
                {
                    $('#updateinterval').html("- ");
                    var res = "";
                    for (var i=0; i < data.results.length; i++)
                    {
                        res += "<tr style=\"background-color:#E6E6E6\"><td colspan=5><b>&nbsp;" + data.results[i].className + "<b></td></tr>";
                        for (var j=0; j < data.results[i].results.length; j++)
                        {
                            var name = data.results[i].results[j].name;
                            if (name.length> this.maxNameLength)
                                name = this.nameShort(name);
                            var club = data.results[i].results[j].club;
                            if (club.length > this.maxClubLength)
                                club = this.clubShort(club);	
                            res += "<tr><td align=\"right\">" + data.results[i].results[j].place + "</td>";
                            res += "<td>" + name + "</td>";
                            res += "<td>" + club + "</td>";
                            res += "<td align=\"right\">" + this.formatTime(data.results[i].results[j].result,data.results[i].results[j].status,_this.showTenthOfSecond) + "</td>";
                            res += "<td align=\"right\"><span class=plustime>"
                            if (data.results[i].results[j].status == 0)
                                res += "+" + this.formatTime(data.results[i].results[j].timeplus,data.results[i].results[j].status,_this.showTenthOfSecond);
                            res += "</span>&nbsp;</td></tr>";
                        }
                        res += "<tr style=\"height: 10px\"><td colspan=5></td></tr>";
                    }
                    $('#' + this.resultsDiv).html(res);
                    $('#numberOfRunners').html($("#numberOfRunnersTotal").html());
                }
                else if (data.className == "startlist")
                {
                    $('#updateinterval').html("- ");
                    var res = "";
                    for (var i=0; i < data.results.length; i++)
                    {
                        res += "<tr style=\"background-color:#E6E6E6\"><td colspan=5><b>&nbsp;" + data.results[i].className + "<b></td></tr>";
                        for (var j=0; j < data.results[i].results.length; j++)
                        {
                            var name = data.results[i].results[j].name;
                            if (name.length> this.maxNameLength)
                                name = this.nameShort(name);
                            var club = data.results[i].results[j].club;
                            if (club.length > this.maxClubLength)
                                club = this.clubShort(club);
                            
                                var bibRaw = data.results[i].results[j].bib;
                            var bib = "";
                            if (bibRaw<0)         // Relay
                                bib = (-bibRaw/100|0) + "-" + (-bibRaw%100);
                            else if (bibRaw>0)   // Ordinary
                                bib = bibRaw;
                            
                            var ecards = "";
                            if (data.results[i].results[j].ecard1>0) {
                                ecards += data.results[i].results[j].ecard1;
                            if (data.results[i].results[j].ecard2>0) 
                                ecards += " / " + data.results[i].results[j].ecard2;}
                            else if (data.results[i].results[j].ecard2>0) 
                                ecards += data.results[i].results[j].ecard2;
                            
                            var delPre = (data.results[i].results[j].status == 1 ? "<del>" : "");
                            var delPost = (data.results[i].results[j].status == 1 ? "</del>" : "");

                            res += "<tr><td align=\"right\">" + delPre + bib + delPost + "</td>";
                            res += "<td>" + delPre + name + delPost + "</td>";
                            res += "<td>" + delPre + club + delPost + "</td>";
                            res += "<td align=\"right\">" + delPre + _this.formatTime(data.results[i].results[j].start, 0, false, true, true) + delPost + "</td>";
                            res += "<td align=\"right\"><span class=small>" + delPre + ecards + delPost + "</span>&nbsp;</td>";
                            res += "</tr>";
                        }
                        res += "<tr style=\"height: 10px\"><td colspan=5></td></tr>";
                    }
                    $('#' + this.resultsDiv).html(res);
                    var NumRunText = $("#numberOfRunnersTotal").html();
                    NumRunText += "</br><a href=\"javascript:res.raceSplitterDialog();\">Lag RaceSplitter fil</a>";
                    $('#numberOfRunners').html(NumRunText);
                }                 
                else if (data.results != null && data.results.length>0) 
                {                    
                    $('#updateinterval').html(this.updateInterval/1000);
                    var haveSplitControls = (data.splitcontrols != null) && (data.splitcontrols.length > 0);
                    // Class properties
                    this.curClassSplits = data.splitcontrols;
                    this.curClassIsRelay = (haveSplitControls && this.curClassSplits[0].code == "0");
                    this.curClassLapTimes = (haveSplitControls && this.curClassSplits[0].code != "0" && this.curClassSplits.length > 1 && this.curClassSplits[this.curClassSplits.length - 1].code == "999");
                    this.curClassIsUnranked = !(this.curClassSplits.every(function check(el) {return el.code != "-999";})) || !(data.results.every(function check(el) {return el.status != 13;}));
                    this.curClassHasBibs = (data.results[0].bib != undefined && data.results[0].bib != 0);
					if (this.curClassSplits == null)
						this.curClassNumSplits = 0;
					else if (this.curClassIsRelay)
                        this.curClassNumSplits = this.curClassSplits.length/2-1;
					else if (this.curClassLapTimes)
                        this.curClassNumSplits = (this.curClassSplits.length-1)/2;
					else
                        this.curClassNumSplits = this.curClassSplits.length;

                    this.compactView = !(this.curClassIsRelay || this.curClassLapTimes || this.isMultiDayEvent);
                    this.curClassIsMassStart = this.curClassIsRelay;

                    this.curClassSplitsOK = new Array(this.curClassNumSplits).fill(true);
                    this.checkRadioControls(data);
                    this.updateClassSplitsBest(data);
                    this.updateResultVirtualPosition(data.results);
                    this.predData = $.extend(true,[],data.results);
                    if (this.highlightID != null)
                        this.setHighlight(data.results,this.highlightID);
                    if (this.qualLimits != null && this.qualLimits.length > 0)
                        this.updateQualLimMarks(data.results, data.className);
                    
                    this.curClassNumberOfRunners = data.results.length;
                    $('#numberOfRunners').html(this.curClassNumberOfRunners);
                    
                    var columns = Array();
                    var col = 0;
					var fullView = !this.compactView;
                    var isRelayClass = this.relayClasses.includes(data.className);

                    const vertLine = "<span class=\"hideplace\">&#10072;</span>";

                    columns.push({
                        "sTitle": "#",
						"responsivePriority": 1,
						"sClass": "right",
                        "bSortable": false,
                        "aTargets": [col++],
                        "mDataProp": "place",
                        "width": (_this.fixedTable ? "5%" : null),
                        "render": function (data,type,row) {
                            if (type === 'display' && data != "")
                                return vertLine + data;
                            else
                                return data;
                        }

                    });

                    if (isRelayClass)
                    {
                        if (!haveSplitControls || !fullView )
                            columns.push({
                                "sTitle": this.resources["_CLUB"],
                                "responsivePriority": 1,
                                "sClass": "left",
                                "bSortable": false,
                                "aTargets": [col++],
                                "mDataProp": "club",
                                "render": function (data,type,row) {
                                    var param = row.club;
                                    var clubShort = row.club;
                                    if (param && param.length > 0)
                                    {
                                        param = param.replace('\'', '\\\'');
                                        if (clubShort.length > _this.maxClubLength)
                                            clubShort = _this.clubShort(clubShort);				
                                    }
                                    return "<a class=\"relayclub\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>" + vertLine;
                                }
                            });
                        columns.push({
                            "sTitle": (haveSplitControls && fullView ) ? this.resources["_CLUB"] + " / " + this.resources["_NAME"] : this.resources["_NAME"],
                            "sClass": "left",
                            "responsivePriority": (haveSplitControls && fullView) ? 1 : 10000,
                            "bSortable": false,
                            "aTargets": [col++],
                            "mDataProp": "name",
                            "render": function (data,type,row) {
                                var param = row.club;
                                var clubShort = row.club;
                                var nameShort = row.name;
                                if (row.name.length>_this.maxNameLength)
                                    nameShort = _this.nameShort(row.name);
                                if (param && param.length > 0)
                                {
                                    param = param.replace('\'', '\\\'');
                                    if (clubShort.length > _this.maxClubLength)
                                        clubShort = _this.clubShort(clubShort);				
                                }
                                var clubLink = "<a class=\"relayclub\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                                return (haveSplitControls && fullView ? clubLink + vertLine + "<br/>" + nameShort : nameShort + vertLine) ;
                            }
                        });
                    }
                    else // Not curClassIsRelay
                    {
                        if (!(haveSplitControls || _this.isMultiDayEvent)|| _this.curClassIsUnranked || (!fullView && !_this.curClassLapTimes))
                            columns.push({
                                "sTitle": this.resources["_NAME"],
                                "responsivePriority": 1,
                                "sClass": "left",
                                "bSortable": false,
                                "aTargets": [col++],
                                "mDataProp": "name",
                                "width": (_this.fixedTable ? "30%" : null),
                                "render": function (data,type,row) {
                                    if (type === 'display')
                                        return (data.length>_this.maxNameLength ? _this.nameShort(data) : data ) + vertLine;
                                    else
                                        return data;
                                }
                            });
                        
                        columns.push({
                            "sTitle": ((haveSplitControls || _this.isMultiDayEvent) && !_this.curClassIsUnranked && (fullView || _this.curClassLapTimes)) ? this.resources["_NAME"] + " / " + this.resources["_CLUB"] : this.resources["_CLUB"],
                            "sClass": "left",
                            "responsivePriority": ((haveSplitControls|| _this.isMultiDayEvent) && !_this.curClassIsUnranked && (fullView || _this.curClassLapTimes)) ? 1 : 10000,
                            "bSortable": false,
                            "aTargets": [col++],
                            "mDataProp": "club",
                            "width": (_this.fixedTable ? "20%" : null),
                            "render": function (data,type,row) {
                                var param = row.club;
                                var clubShort = row.club;
                                if (param && param.length > 0)
                                {
                                    param = param.replace('\'', '\\\'');
                                    if (clubShort.length > _this.maxClubLength)
                                        clubShort = _this.clubShort(clubShort);				
                                }
                                var link = "<a class=\"club\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                                if ((haveSplitControls || _this.isMultiDayEvent) && !_this.curClassIsUnranked && (fullView || _this.curClassLapTimes))
                                    return (row.name.length>_this.maxNameLength ? _this.nameShort(row.name) : row.name) + vertLine + "<br/>" + link;
                                else if (_this.fixedTable)
                                    return clubShort + vertLine;
                                else
                                    return link + vertLine;
                            }
                        });
                    }
                    
                    if (_this.curClassHasBibs)
                    {
                        columns.push({
                            "sTitle": "&#8470;&nbsp;&nbsp;",
						    "responsivePriority": 1,
						    "sClass": "right",
                            "bSortable": !_this.fixedTable,
                            "aTargets": [col++],
                            "mDataProp": "bib",
                            "width": (_this.fixedTable ? "5%" : null),
                            "render": function (data,type,row) {
                                if (type === 'display')
                                {
                                    var txt = vertLine;
                                    if (data<0)       // Relay
                                        txt += "<span class=\"bib\">" + (-data/100|0) + "</span>";
                                    else if (data>0)  // Ordinary
                                        txt += "<span class=\"bib\">"  + data + "</span>";
                                    return txt;
                                }
                                else
                                    return Math.abs(data);
                            }
                        });
                    }
                    
					columns.push({
                        "sTitle": this.resources["_START"] + "&nbsp;&nbsp;",
						"responsivePriority": 4,
                        "sClass": "right",
                        "bSortable": !_this.fixedTable,
                        "sType": "numeric",
                        "aDataSort": [col],
                        "aTargets": [col],
                        "bUseRendered": false,
                        "mDataProp": "start",
                        "width": (_this.fixedTable ? "10%" : null),
                        "render": function (data,type,row) {
                            if (row.start == "")
                                return "";
							else if (type=="sort")
								return data;
                            else
                            {
                                var txt = "";
                                if (row.splits != undefined && row.splits["0_place"] >= 1)
								{
                                    var place = "";
                                    if (row.splits["0_place"] == 1)
                                        place += "<span class=\"bestplace\"> ";
                                    else
                                        place += "<span class=\"place\"> ";
                                    if (row.splits["0_place"] < 10 && _this.curClassNumberOfRunners >= 10)
                                        place += "&numsp;"
                                    place += "&#10072;" + row.splits["0_place"] + "&#10072; </span>" 
                                    
                                    if (fullView)
                                    {
                                        if (row.splits["0_place"] == 1)
                                            txt += "<span class=\"besttime\">+" + _this.formatTime(0, 0, _this.showTenthOfSecond) + place + "</span><br />";
                                        else
                                            txt += "<span>+" + _this.formatTime(row.splits["0_timeplus"], 0, _this.showTenthOfSecond) + place + "</span><br />";
                                    }
                                    txt += vertLine;
                                    if (row.splits["0_place"] == 1)									
										txt += "<span class=\"besttime\">";
									else 
										txt += "<span>";
                                    if (!fullView && row.splits["0_place"] >=1)
                                        txt += place;                                 
                                    txt += _this.formatTime(row.start, 0, false, true, true) + "</span>";
								}
								else
									txt += vertLine + _this.formatTime(row.start, 0, false, true, true); 
                                return txt;
                            }
                        }
                    });

                    col++;
                    if (data.splitcontrols != null)
                    {
                        $.each(data.splitcontrols, function (key, value)
                        {
                            var refSp = _this.refSplit(key);    
                            if (value.code != 0 && value.code != 999 && !((_this.curClassIsRelay || _this.curClassLapTimes) && value.code>100000)) // Code = 0 for exchange, 999 for leg time, 100000+ for leg passing
                            {
                                columns.push(
                                    {
                                        "sTitle": value.name + "&nbsp;&nbsp;",
                                        "bVisible": _this.curClassSplitsOK[refSp],
										"responsivePriority": 100,
                                        "sClass": "right",
										"bSortable": !_this.curClassIsUnranked,
                                        "sType": "numeric",
                                        "aDataSort": [col + 1, col],
                                        "aTargets": [col],
                                        "bUseRendered": false,
                                        "mDataProp": "splits." + value.code,
                                        "render": function (data,type,row)
                                        {
                                            if (isNaN(parseInt(data)))
												return data;
											else if (type=="sort")
												return parseInt(data);
											else
											{
											if (!row.splits[value.code + "_place"])
                                                return "";
                                            else
                                            {
                                                var txt = "";
                                                var place = "";
                                                if ( !row.splits[value.code + "_estimate"] && row.splits[value.code + "_place"] == 1)
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
                                                    if ( row.splits[value.code + "_estimate"] )
                                                        txt += "estimate ";
                                                    txt += "tooltip\">+" + _this.formatTime(row.splits[value.code + "_timeplus"], 0, _this.showTenthOfSecond) 
                                                        + place + "<span class=\"tooltiptext\">" 
                                                        + _this.formatTime(row.splits[value.code], 0, _this.showTenthOfSecond) + "</span></div>";
                                                }
                                                else 
											    // Ordinary passing or first place at passing for relay (drop place if code is negative - unranked)
                                                {
                                                    if ( row.splits[value.code + "_estimate"] )
                                                        txt += "<span class=\"estimate\">";
                                                    else if (row.splits[value.code + "_place"] == 1)
														txt += "<span class=\"besttime\">";
													else
														txt += "<span>";
                                                    txt += _this.formatTime(row.splits[value.code], 0, _this.showTenthOfSecond);
                                                    if (value.code > 0) 
                                                        txt += place + "</span>";
                                                }
												// Second line
                                                if ((fullView && _this.curClassIsRelay || _this.curClassLapTimes) && (row.splits[(value.code + 100000) + "_timeplus"] != undefined))
                                                // Relay passing, second line with leg time to passing 
                                                {
                                                    txt += "<br/><span class=";
                                                    var legplace = "";
                                                    
                                                    if (row.splits[value.code + 100000 + "_estimate"] )
                                                    {
                                                        txt += "\"estimate\">";
                                                        legplace += "<span class=\"place\"> ";
                                                    }
                                                    else if (row.splits[(value.code + 100000) + "_place"] == 1)
                                                    {
                                                        txt += "\"besttime\">";
                                                        legplace += "<span class=\"bestplace\"> ";
                                                    }
                                                    else
                                                    {
                                                        txt += "\"legtime\">";
                                                        legplace += "<span class=\"place\"> ";
                                                    }
                                                    if (_this.curClassNumberOfRunners >= 10 && (row.splits[(value.code + 100000) + "_place"] < 10 || row.splits[(value.code + 100000) + "_place"] == "-") )
                                                        legplace += "&numsp;"
                                                    legplace += "&#10072;" + row.splits[(value.code + 100000) + "_place"] + "&#10072;</span>";
                                                    if (_this.curClassIsRelay)
                                                    { 
                                                        txt += "⟳";
                                                        if (row.splits[(value.code + 100000) + "_place"] == 1)
                                                            txt += _this.formatTime(row.splits[(value.code + 100000)], 0, _this.showTenthOfSecond);
                                                        else
                                                            txt += "+" + _this.formatTime(row.splits[(value.code + 100000) + "_timeplus"], 0, _this.showTenthOfSecond);
                                                    }
                                                    else
                                                        txt += _this.formatTime(row.splits[(value.code + 100000)], 0, _this.showTenthOfSecond);
                                                    txt += legplace + "</span>";
                                                }
                                                else if ((row.splits[value.code + "_timeplus"] != undefined) && fullView && !_this.curClassIsRelay && (value.code > 0))
												// Second line for ordinary passing (drop if code is negative - unranked)
                                                {
                                                    txt += "<br/><span class=";
                                                    if ( row.splits[value.code + "_estimate"] && row.splits[value.code + "_place"] == 1)
                                                        txt += "\"estimate\">-";
                                                    else if ( row.splits[value.code + "_estimate"])
                                                        txt += "\"estimate\">+";
                                                    else if (row.splits[value.code + "_place"] == 1)
                                                       txt += "\"besttime\">-";
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
                        "sTitle": this.resources["_CONTROLFINISH"] + "&nbsp;&nbsp;",
						"responsivePriority": 2,
                        "sClass": "right",
                        "sType": "numeric",
                        "aDataSort": [col + 1, col, 0],
                        "aTargets": [col],
                        "bUseRendered": false,
                        "bSortable": !_this.fixedTable,
                        "mDataProp": "result",
                        "width": (_this.fixedTable ? "10%" : null),
                        "render": function (data,type,row) {
							if (isNaN(parseInt(data)))
								return data;
							else if (type=="sort")
								return parseInt(data);
                            var res = "";
                            if (row.place == "-" || row.place == "" || row.place == "F")
                                res += _this.formatTime(row.result, row.status, _this.showTenthOfSecond);
                            else 
							{
                                var place = "";
                                if ((haveSplitControls || _this.isMultiDayEvent) && (row.place == 1))
                                {
                                    res += "<span class=\"besttime\">";
                                    place += "<span class=\"bestplace\"> ";
                                }
                                else
								{
                                    res += "<span>";
                                    place += "<span class=\"place\"> ";
                                }
                                if (_this.curClassNumberOfRunners >= 10 && (row.place < 10 || row.place == "-" || row.place == "="))
                                    place += "&numsp;"
                                place += "&#10072;" + row.place + "&#10072;</span>";
                            
                                res += _this.formatTime(row.result, row.status, _this.showTenthOfSecond);
                                res += place + "</span>";
                                
                                if ((haveSplitControls || _this.isMultiDayEvent) && fullView && !(_this.curClassIsRelay) && !(_this.curClassLapTimes) && row.status == 0)
								{
                                    if (row.place==1)
                                    {
                                        res += "<br/><span class=\"besttime\">";
                                        res += ((haveSplitControls || _this.isMultiDayEvent) ? "-" : "+");
                                        res += _this.formatTime(-row.timeplus, row.status, _this.showTenthOfSecond) + "</span>";
                                    }
                                    else
                                        res += "<br/><span class=\"plustime\">+" + _this.formatTime(row.timeplus, row.status, _this.showTenthOfSecond) + "</span>";
                                    if (_this.curClassNumberOfRunners >= 10)
                                        res += "<span class=\"hideplace\"> &numsp;<i>&#10072;..&#10072;</i></span>";
                                    else
                                        res += "<span class=\"hideplace\"> <i>&#10072;..&#10072;</i></span>";
                                }
							}
							if (haveSplitControls && (fullView && _this.curClassIsRelay || _this.curClassLapTimes) && (row.splits["999_place"] != undefined))
							{
								if (row.splits[(999)]>0)
								{
                                    var legplace = "";
                                    res += "<br/><span class=";
                                    if (row.splits["999_place"] == 1)
                                    {
                                        res += "\"besttime\">";
                                        legplace += "<span class=\"bestplace\"> ";
                                    }
                                    else
                                    {
                                        res += "\"legtime\">";
                                        legplace += "<span class=\"place\"> ";
                                    }
                                    if (_this.curClassIsRelay) 
                                        res += "⟳";
                                    if (_this.curClassNumberOfRunners >= 10 && (row.splits["999_place"] < 10 || row.splits["999_place"] == "-") )
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
                            "bVisible": !_this.curClassIsUnranked || _this.fixedTable,
						    "responsivePriority": 2000,
                            "sClass": "right",
                            "bSortable": false,
                            "aTargets": [col++],
                            "mDataProp": "timeplus",
                            "width": (this.fixedTable ? "10%" : null),
                            "render": function (data,type,row) {
                                if (isNaN(parseInt(data)))
									return data;
								var res = vertLine;
                                if (row.status == 0)
                                {
                                    if (row.timeplus <= 0 && (haveSplitControls || _this.isMultiDayEvent))
                                        res += "<span class=\"besttime\">+";
                                    else
                                        res += "<span class=\"plustime\">+";
                                    res += _this.formatTime(Math.max(0,row.timeplus), row.status, _this.showTenthOfSecond) + "</span>";
                                }
                                return res;
                            }
                        });
                    }
					else
						if (_this.curClassIsRelay && fullView){
							columns.push({
                            "sTitle": "Total<br/><span class=\"legtime\">⟳Etp</span>",
						    "responsivePriority": 2000,
                            "sClass": "right",
                            "bSortable": false,
                            "aTargets": [col++],
                            "mDataProp": "timeplus",
                            "render": function (data,type,row) {
								if (isNaN(parseInt(data)))
									return data;
                                var res = vertLine;
                                if (row.status == 0)
                                {
                                    if (row.place == 1)
                                        res += "<span class=\"besttime\">+" + _this.formatTime(0, row.status, _this.showTenthOfSecond) ;
                                    else
                                        res += "<span>+" + _this.formatTime(row.timeplus, row.status, _this.showTenthOfSecond);
                                    
                                    res += "</span><br />" + vertLine;
                                    if (row.splits["999_place"] == 1)
                                        res += "<span class=\"besttime\">+" + _this.formatTime(0, 0, _this.showTenthOfSecond) + "</span>";
                                    else
                                        res += "<span class=\"legtime\">+" +_this.formatTime(row.splits["999_timeplus"], 0, _this.showTenthOfSecond) + "</span>";
                                }
                                return res;
                            }
                        });
						}
							
                    if (this.isMultiDayEvent) {
                        columns.push({
                            "sTitle": this.resources["_TOTAL"] + "&nbsp;&nbsp;",
                            "sClass": "right",
                            "sType": "numeric",
                            "aDataSort": [col + 1, col, 0],
                            "aTargets": [col],
                            "bUseRendered": false,
                            "mDataProp": "totalresult",
                            "render": function (data,type,row) {
								if (type=="sort")
								    return parseInt(data);
                                if (isNaN(parseInt(data)))
									return data;
                                if (row.totalplace == "-" || row.totalplace == "") {
                                    return _this.formatTime(row.totalresult, row.totalstatus);
                                }
                                else 
                                {
                                    var totalplace = "";
                                    var totalres = "";
                                    if (row.totalplace==1)
                                    {
                                        totalres += "<span class=\"besttime\">";
                                        totalplace += "<span class=\"bestplace\"> ";
                                    }
                                    else
                                    {
                                        totalres += "<span>";
                                        totalplace +=" <span class=\"place\"> ";
                                    }
                                    if (row.totalplace < 10 && _this.curClassNumberOfRunners >= 10)
                                        totalplace += "&numsp;"
                                    totalplace += "&#10072;" + row.totalplace + "&#10072;</span>";                             
                                    totalres += _this.formatTime(row.totalresult, row.totalstatus) + totalplace + "</span>";
                                    if (fullView) 
                                    {
                                        if (row.totalplace == 1)
                                            totalres += "<br/><span class=\"besttime\">+";
                                        else
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
                                "render": function (data,type,row) {
									if (isNaN(parseInt(data)))
										return data;
                                    if (row.totalstatus != 0)
                                        return "";
                                    else
                                    {
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
                        "scrollX": this.scrollView,
                        "fixedColumns": {leftColumns: 2, heightMatch: 'auto'},
                        "responsive": !(this.scrollView),
                        "bPaginate": false,
                        "bLengthChange": false,
                        "bFilter": false,
                        "bSort": true,
                        "bInfo": false,
                        "bAutoWidth": false,
                        "aaData": data.results,
                        "aaSorting": [[col - 1, "asc"]],
                        "aoColumnDefs": columns,
                        "fnPreDrawCallback": function (oSettings) {
                            if (oSettings.aaSorting[0][0] != col - 1) {
                                $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\">&#8635;" + _this.resources["_RESETTODEFAULT"] + "</a>");
                            }
                        },
                        "bDestroy": true
                    });

                    // Scroll to initial view and hide class column if necessary
                    if (this.scrollView && data.results[0].progress != undefined) // Scroll to inital view
                    {
                        var scrollBody = $(this.currentTable.api().settings()[0].nScrollBody);
                        var maxScroll = scrollBody[0].scrollWidth - scrollBody[0].clientWidth;
                        if ( maxScroll > 5 )
                        { 
                            var clubBibWidth = 0;
                            if (this.curClassIsUnranked || (this.compactView && !this.curClassLapTimes)) // Club and bib col 
                                clubBibWidth = 9 + parseInt($('#' + this.resultsDiv +' thead th:eq(2)').css('width'))
                                    + (this.curClassHasBibs? 9 + parseInt($('#' + this.resultsDiv +' thead th:eq(3)').css('width')) : 0); 
                            else // Bib col
                                clubBibWidth = (this.curClassHasBibs? 9 + parseInt($('#' + this.resultsDiv +' thead th:eq(2)').css('width')) : 0); 

                            var scrollLength = 0;
                            if (data.results[0].progress > 0 && data.results[0].progress < 50)
                                scrollLength = clubBibWidth;
                            else if (data.results[0].progress >= 50)
                                scrollLength = maxScroll;

                            if (scrollLength > 0)
                            {
                                scrollBody.scrollLeft( scrollLength );
                                if ( $(".firstCol").width() > 0 && maxScroll >= clubBibWidth+5)
                                    $('#switchNavClick1').trigger('click');
                            }
                        }
                    }

                    this.lastClassHash = data.hash;                    
                    this.updatePredictedTimes(true,false); // Refresh = true; Animate = false
                    this.currentTable.fnAdjustColumnSizing();

                    if (this.isCompToday())
                        this.resUpdateTimeout = setTimeout(function () { _this.checkForClassUpdate();}, this.updateInterval);
                }
            } 
        };
        
        AjaxViewer.prototype.setHighlight = function(results,highlightID){
            for (var j=0; j<results.length; j++)
            {
                if (results[j].dbid == highlightID)
                {
                    if (results[j].DT_RowClass == "firstnonqualifier" || results[j].DT_RowClass == "yellow_row_fnq")
                        results[j].DT_RowClass = "yellow_row_fnq";
                    else
                        results[j].DT_RowClass = "yellow_row";
                }
                else
                {
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

				
		AjaxViewer.prototype.setScrollView = function (val) {
            this.scrollView = val;
            if (this.scrollView) {
                $("#scrollView").html("<a href=\"javascript:LiveResults.Instance.setScrollView(false);\">&#8853;</a>");
				$("#" + this.resultsDiv).removeClass('dtr-inline collapsed');
            }
            else {
                $("#scrollView").html("<a href=\"javascript:LiveResults.Instance.setScrollView(true);\">&harr;</a>");
            }
			if (this.curClassName!=null)
			{				
				this.chooseClass(this.curClassName);
			}
			else if (this.curClubName!=null){
				this.viewClubResults(this.curClubName);
			}
        };

        AjaxViewer.prototype.formatTime = function (time, status, showTenthOs, showHours, padZeros) {
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
            else if (arguments.length == 4) 
			{
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
								
                if (showHours) {
                    var hours = Math.floor(time / 360000);
                    minutes = Math.floor((time - hours * 360000) / 6000);
                    seconds = Math.floor((time - minutes * 6000 - hours * 360000) / 100);
                    tenth = Math.floor((time - minutes * 6000 - hours * 360000 - seconds * 100) / 10);
                    if (hours > 0) {
                        if (padZeros)
                            hours = this.strPad(hours, 2);
                        return hours + ":" + this.strPad(minutes, 2) + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "");
                    }
                    else {
                        if (padZeros)
                            minutes = this.strPad(minutes, 2);
                        return minutes + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "");
                    }
                }
                else {
                    minutes = Math.floor(time / 6000);
                    seconds = Math.floor((time - minutes * 6000) / 100);
                    tenth = Math.floor((time - minutes * 6000 - seconds * 100) / 10);
                    if (padZeros) {
                        return this.strPad(minutes, 2) + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "");
                    }
                    else {
                        return minutes + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "");
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
            
            if (this.curClassIsMassStart) 
            {
                /*append results from splits backwards (by place on actual split)*/
                data.sort(function (a, b) { return _this.sortByDistAndSplitPlace(a, b); });
            }
            else 
            {
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
            
            for (i = 0; i < data.length; i++) 
            {
                data[i].virtual_position = i;
                if (updateIdx)
                    data[i].idx = i;    
            }
        };
        
        //Sorts results by the one that have run longest on the course
        AjaxViewer.prototype.sortByDist = function (a, b) {            
            if (a.progress == 0 && b.progress == 0) 
            {
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
            if (sortStatusA == 9 || sortStatusA == 10 || sortStatusA == 13 )
                sortStatusA = 0;
            if (sortStatusB == 9 || sortStatusB == 10 || sortStatusB == 13 )
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
            if (a.progress == 0 && b.progress == 0) 
            {
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
                        if (a.splits[splitCode] != "") {
                            return a.splits[splitCode + "_place"] - b.splits[splitCode + "_place"];
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
                            return a.bib-b.bib;
                        else if (a.dbid != undefined && b.dbid != undefined)
                            return a.dbid-b.dbid;
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
				if (!this.scrollView)
					url += '&notscroll';
			}
            else
                url += '&club=' + encodeURIComponent(this.curClubName);
            window.open(url, '', 'status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=1,resizable=1');
        };
        
        AjaxViewer.prototype.viewClubResults = function (clubName) {
            var _this = this;
            this.inactiveTimer = 0;
            if (this.currentTable != null) {
                try {
                    this.currentTable.api().destroy();
                }
                catch (e) { }
            }
            clearTimeout(this.resUpdateTimeout);
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
                success: function (data,status,resp) {
                    var expTime = new Date();
                    expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
                    _this.updateClubResults(data,expTime);
                },
                dataType: "json"
            });
            if (!this.isSingleClass) {
                window.location.hash = "club::" + clubName;
            }
        };
        
        AjaxViewer.prototype.updateClubResults = function (data,expTime) {
            var _this = this;
            if (data.rt != undefined && data.rt > 0)
                this.clubUpdateInterval = data.rt*1000;
            $('#updateinterval').html(this.clubUpdateInterval/1000);
            if (expTime)
            {
                var lastUpdate = new Date();
                lastUpdate.setTime(expTime - this.clubUpdateInterval + 1000);
                $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
            }
            if (data != null && data.status == "OK") 
            {
                if (data.clubName != null) {
                    $('#' + this.resultsHeaderDiv).html('<b>' + data.clubName + '</b>');
                    $('#' + this.resultsControlsDiv).show();
                }
                if (data.results != null) {
                    $.each(data.results, function (idx, res) {
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
                    columns.push({ "sTitle": "#&nbsp;&nbsp;", "sClass": "right", "aDataSort": [1], "aTargets": [col++], "mDataProp": "place"});
                    columns.push({ "sTitle": "placeSortable", "bVisible": false, "mDataProp": "placeSortable", "aTargets": [col++], "render": function (data,type,row) {
							if (type=="sort") 
								return row.placeSortable; 
					        else
                                return data; }});  
                    columns.push({ "sTitle": this.resources["_NAME"], "sClass": "left", "aTargets": [col++], "mDataProp": "name",
                       "render": function (data,type,row) {
                        if (type === 'display')
                        {
                            if (data.length>_this.maxNameLength)
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
                        "render": function (data,type,row) {
                            var param = row["class"];
                            if (param && param.length > 0)
                                param = param.replace('\'', '\\\'');
                            return "<a href=\"javascript:LiveResults.Instance.chooseClass('" + param + "')\">" + row["class"] + "</a>";
                        }
                    });
                    columns.push({ "sTitle": "&#8470;&nbsp;&nbsp;", "sClass": "right", "aTargets": [col++], "mDataProp": (_this.curClassHasBibs ? "bib" : null),
                        "render": function (data,type,row) {
                            if (type === 'display')
                            {
                                if (row.bib<0) // Relay
                                    return "<span class=\"bib\">" + (-row.bib/100|0) + "</span>";
                                else if(row.bib>0)       // Ordinary
                                    return "<span class=\"bib\">" + row.bib + "</span>";
                                else
                                    return "";
                            }
                            else
                                return data;
                        }
                    });
                    columns.push({ "sTitle": "bibSortable", "bVisible": false, "mDataProp": (_this.curClassHasBibs? "bib" : null), "aTargets": [col++], "render": function (data,type,row) {
                        return data; }});
                    
                    columns.push({
                        "sTitle": this.resources["_START"] + "&nbsp;&nbsp;", "sClass": "right", "sType": "numeric", "aDataSort": [col], "aTargets": [col], "bUseRendered": false, "mDataProp": "start",
                        "render": function (data,type,row) {
                            if (row.start == "") {
                                return "";
                            }
                            else {
                                return _this.formatTime(row.start, 0, false, true, true) 
                            }
                        }
                    });
                    col++;
                    var timecol = col;
                    columns.push({
                        "sTitle": this.resources["_CONTROLFINISH"] + "&nbsp;&nbsp;", "sClass": "right", "sType": "numeric", "aDataSort": [col + 1, col, 0], "aTargets": [col], "bUseRendered": false, "mDataProp": "result",
                        "render": function (data,type,row) {
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
                    columns.push({ "sTitle": "", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "timeplus",
                        "render": function (data,type,row) {
                            if (row.status != 0)
                                return "";
                            else
                                return "<span class=\"plustime\">+" + _this.formatTime(row.timeplus, row.status) + "</span>";
                        }
                    });
                    this.currentTable = $('#' + this.resultsDiv).dataTable({
						"scrollX": this.scrollView,
						"fixedColumns": {leftColumns: 3, heightMatch: 'auto'},
						"responsive": !(this.scrollView),
						"bPaginate": false,
                        "bLengthChange": false,
                        "bFilter": false,
                        "bSort": true,
                        "bInfo": false,
                        "bAutoWidth": false,
                        "aaData": data.results,
                        "aaSorting": [[1, "asc"],[5,'asc']],
                        "aoColumnDefs": columns,
                        "fnPreDrawCallback": function (oSettings) {
                            if (oSettings.aaSorting[0][0] != 1) {
                                $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\">&#8635;" + _this.resources["_RESETTODEFAULT"] + "</a>");
                            }
                        },
                        "bDestroy": true
                    });
                    this.currentTable.fnAdjustColumnSizing();
                    this.lastClubHash = data.hash;
                }
            }
            if (_this.isCompToday())
                this.resUpdateTimeout = setTimeout(function () {_this.checkForClubUpdate();}, _this.clubUpdateInterval);
        };
        
        AjaxViewer.prototype.viewRelayResults = function (className) {
            var _this = this;
            this.inactiveTimer = 0;
            if (this.currentTable != null) {
                try {this.currentTable.api().destroy(); }
                catch (e) { }
            }
            clearTimeout(this.resUpdateTimeout);
            $('#divResults').html('');
            $('#' + this.txtResetSorting).html('');
            this.curClubName =  null;
            this.curClassName = null;
            this.curSplitView = null; 
            this.curRelayView = className;
            
            $('#resultsHeader').html(this.resources["_LOADINGRESULTS"]);
            $.ajax({
                url: this.apiURL,
                data: "comp=" + this.competitionId + "&unformattedTimes=true&method=getrelayresults&class=" +encodeURIComponent(className),
                success: function (data,status,resp) {
                    var expTime = new Date();
                    expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
                    _this.updateRelayResults(data,expTime);
                },
                dataType: "json"
            });
            window.location.hash = "relay::" + className;
        };
        
        AjaxViewer.prototype.updateRelayResults = function (data,expTime) {
            var _this = this;
            if (data.rt != undefined && data.rt > 0)
                this.updateInterval = data.rt*1000;
            $('#updateinterval').html("- ");
            if (expTime)
            {
                var lastUpdate = new Date();
                lastUpdate.setTime(expTime - this.clubUpdateInterval + 1000);
                $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
            }
            if (data != null && data.status == "OK") 
            {
                if (data.className != null) {
                    $('#' + this.resultsHeaderDiv).html('<b>' + data.className + '</b>');
                    $('#' + this.resultsControlsDiv).show();
                }
                if (data.legs != null & data.relayresults != null)
                {
                    var legs = data.legs;
                    var numberOfRunners = legs*data.relayresults[0].results.length;
                    $('#numberOfRunners').html(numberOfRunners);

                    var teamresults = [];
                    for (let leg = 1; leg <= legs; leg++)
                    {
                        var legResults = data.relayresults[leg-1].results;
                        for (let runner = 0; runner < legResults.length; runner++)
                        {
                            var br = "";
                            var teamBib = (-legResults[runner].bib/100|0);
                            var legTime;
                            var legStatus;
                            var legPlusTime;
                            var legPlace;
                            if (leg==1)
                            {
                                var clubShort = legResults[runner].club;
                                if (clubShort.length > _this.maxClubLength)
                                    clubShort = _this.clubShort(clubShort);
                                teamresults[teamBib] = {
                                    names     : "<b>" + clubShort + "</b><br/>",		                                
                                    bib       : "<b>" + teamBib + "</b><br/>",
                                    legTime   : "<br/>",
                                    legPlace  : "<br/>",
                                    legDiff   : "<br/>",
                                    totTime   : "",
                                    totPlace  : "<br/>",
                                    totDiff   : "",
                                    lastPlace : legResults[runner].place,
                                    lastDiff  : legResults[runner].timeplus,
                                    placeDiff : "<br/>",
                                    totGained : "<br/>",
                                    placeStr  : "",
                                    sort      : []
                                }
                                legTime     = legResults[runner].result;
                                legStatus   = legResults[runner].status;
                                legPlusTime = legResults[runner].timeplus;
                                legPlace    = legResults[runner].place;
                            }
                            else
                            {
                                br = "<br/>";
                                legTime     = legResults[runner].splits["999"];
                                legStatus   = legResults[runner].status;
                                legPlusTime = legResults[runner].splits["999_timeplus"];
                                legPlace    = legResults[runner].splits["999_place"];
                            
                            }
                            var totStatus = legResults[runner].status;
                            var totPlace  = legResults[runner].place;
                            var placeDiff = (totStatus==0 && teamresults[teamBib].lastPlace > 0 ? legResults[runner].place - teamresults[teamBib].lastPlace : "");
                            var totGained = legResults[runner].timeplus - teamresults[teamBib].lastDiff;
                            teamresults[teamBib].lastPlace = legResults[runner].place;
                            teamresults[teamBib].lastDiff  = legResults[runner].timeplus;
                            
                            var nameShort = legResults[runner].name;
                            if (nameShort.length > _this.maxNameLength)
                                nameShort = _this.nameShort(nameShort); 

                            teamresults[teamBib].names    += br + nameShort;
                            teamresults[teamBib].bib      += br + leg;
                            
                            teamresults[teamBib].legPlace += br + (legPlace==1? "<span class=\"bestplace\">" : "<span>") + legPlace + "</span>";
                            teamresults[teamBib].legTime  += br + (legPlace==1? "<span class=\"besttime\">" : "<span>") 
                                                                + _this.formatTime(legTime,legStatus,_this.showTenthOfSecond) + "</span>";
                            teamresults[teamBib].legDiff  += br + (legStatus==0? (legPlace==1? "<span class=\"besttime\">" : "<span>") + (legPlusTime<0? "-" :"+") 
                                                                + _this.formatTime(Math.abs(legPlusTime),0,_this.showTenthOfSecond) + "</span>": "");
                            
                            teamresults[teamBib].totPlace += br + (totPlace==1? "<span class=\"bestplace\">" : "<span>") + totPlace +" </span>" ;
                            teamresults[teamBib].totTime  += br + (totPlace==1? "<span class=\"besttime\">" : "<span>") 
                                                                + _this.formatTime(legResults[runner].result,legResults[runner].status,_this.showTenthOfSecond) +" </span>" ;
                            teamresults[teamBib].totDiff  += br + (totStatus==0? (totPlace==1? "<span class=\"besttime\">" : "<span>") + ( legResults[runner].timeplus<0 ? "-": "+") 
                                                                +_this.formatTime(Math.abs(legResults[runner].timeplus),0,_this.showTenthOfSecond) + "</span>" : "");
                            
                            teamresults[teamBib].placeDiff+= br + (leg==1? "" : (placeDiff<0? "<span class=\"gained\">": (placeDiff>0? "<span class=\"lost\">+":"<span>")) + placeDiff + "</span>");
                            teamresults[teamBib].totGained+= br + (leg>1 && legStatus==0 ? (totGained<=0? "<span class=\"gained\">-" : "<span class=\"lost\">+") 
                                                                + _this.formatTime(Math.abs(totGained),0,_this.showTenthOfSecond) : "");

                            if (legResults[runner].place == "-")
                                teamresults[teamBib].sort[leg-1] = 999999 + (leg==1 ? teamBib : 0);
                            else if (legResults[runner].place == "")
                                teamresults[teamBib].sort[leg-1] = 99999 + (leg==1 ? teamBib : 0);
                            else 
                                teamresults[teamBib].sort[leg-1] = legResults[runner].place;
                            
                            if (leg == legs)
                            {
                                teamresults[teamBib].placeStr = "<b>" + legResults[runner].place + "</b>";
                                teamresults[teamBib].totTime = "<b>" + _this.formatTime(legResults[runner].result,legResults[runner].status,_this.showTenthOfSecond) 
                                                                     + "</b><br/>" + teamresults[teamBib].totTime;
                                teamresults[teamBib].totDiff = "<b>" + (legResults[runner].status==0? (legResults[runner].timeplus<0? "-":"+") 
                                                                     + _this.formatTime(Math.abs(legResults[runner].timeplus),0,_this.showTenthOfSecond) : "") 
                                                                     + "</b><br/>" + teamresults[teamBib].totDiff;
                            }
                        };
                    };
                    
                    teamresults = teamresults.filter(Boolean);
                    
                    var columns = Array();
                    var col = 0;
                    var sorting = []; 
                    for (let leg = 1; leg <= legs; leg++)
                    { 
                        sorting.unshift([col,"asc"]);
                        columns.push({ "sTitle": "sort", "bVisible": false, "mDataProp": "sort", "aTargets": [col++], "render": function (data,type,row,meta) {
                            leg = meta.col;
                            return row.sort[leg]; 
					         }});  
                    }
                    columns.push({ "sTitle": "#",     "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "placeStr"});
                    columns.push({ "sTitle": "&#8470","sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "bib"});
                    columns.push({ "sTitle": this.resources["_NAME"], "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "names"});
                    columns.push({ "sTitle": "Tot",   "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "totTime"});
                    columns.push({ "sTitle": "T#",    "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "totPlace"});
                    columns.push({ "sTitle": "Tot&#916;",  "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "totDiff"});
                    columns.push({ "sTitle": "Etp",   "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "legTime"});
                    columns.push({ "sTitle": "E#",    "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "legPlace"});
                    columns.push({ "sTitle": "Etp&#916;",  "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "legDiff"});
                    columns.push({ "sTitle": "±#",    "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "placeDiff"});
                    columns.push({ "sTitle": "±Tot",  "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "totGained"});

                    this.currentTable = $('#' + this.resultsDiv).dataTable({
						"scrollX": this.scrollView,
						"fixedColumns": {leftColumns: legs+3, heightMatch: 'auto'},
						"responsive": false,
						"bPaginate": false,
                        "bLengthChange": false,
                        "bFilter": false,
                        "bSort": true,
                        "bInfo": false,
                        "bAutoWidth": false,
                        "aaData": teamresults,
                        "aaSorting": sorting,
                        "aoColumnDefs": columns,
                        "bDestroy": true
                    });
                    this.currentTable.fnAdjustColumnSizing();
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
                link = "<a href=\"javascript:LiveResults.Instance.chooseClass('" +  this.curSplitView[0].replace('\'', '\\\'') + "')\">&#5130; Resultater</a>";
            else if (this.curClassName != null && this.showEcardTimes)
            { 
                var courses = this.courses[this.curClassName];
                if (courses != undefined && courses.length > 0)
                    link = this.splitTimesLink(this.curClassName,courses);
            }

            $("#" + this.txtResetSorting).html(link);
        };

    //Make link for split times
    AjaxViewer.prototype.splitTimesLink = function (className,courses) {
        var link;
        if (courses.length==1) 
            link = "<a href=\"javascript:LiveResults.Instance.viewSplitTimeResults('" + className + "'," + courses[0] + ");\">Strekktider &#5125;</a>";
        else
        {    
            link = "<button onclick=\"res.showCourses()\" class=\"dropbtn\">Strekktider &#5125;</button><div id=\"myDropdown\" class=\"dropdown-content\">";
            for (i=0;i<courses.length;i++)
                link += "<a href=\"javascript:LiveResults.Instance.viewSplitTimeResults('" + className + "'," + courses[i] + ");\">Løype "+courses[i]+"</a>";
            link += "</div>";
        }
        return link;
    };
    
    //Request data for result viewer
    AjaxViewer.prototype.updateResultView = function (className,place,first,last) {
        var _this = this;
        $.ajax({
            url: this.apiURL,
            data: "comp=" + this.competitionId + "&method=getclassresults&unformattedTimes=true&class=" + encodeURIComponent(className),
            success: function (data,status,resp) {_this.handleUpdateResultViews(data,className,place,first,last); },
            error: function () {  },
            dataType: "json"                   
        });
    };

    //Handle response for updating the last radio passings..
    AjaxViewer.prototype.handleUpdateResultViews = function (data,className,place,first,last) {
        var _this = this;    
        if (data != null && data.status == "OK") 
        {
            if (data.className != null)
                $('#' + this.resultsHeaderDiv).html('<b>' + data.className + '</b>');
            if (data.results != null && data.results.length>0) 
            {
                var haveSplitControls = (data.splitcontrols != null) && (data.splitcontrols.length > 0);
                this.curClassSplits = data.splitcontrols;
                this.curClassIsRelay = (haveSplitControls && this.curClassSplits[0].code == "0");
                this.curClassIsUnranked = !(this.curClassSplits.every(function check(el) {return el.code != "-999";})) || !(data.results.every(function check(el) {return el.status != 13;}));
                this.curClassHasBibs = (data.results[0].bib != undefined && data.results[0].bib != 0);
                var isRelayClass = this.relayClasses.includes(data.className);

                if (this.curClassSplits == null)
                    this.curClassNumSplits = 0;
                else if (this.curClassIsRelay)
                    this.curClassNumSplits = this.curClassSplits.length/2-1;
                else if (this.curClassLapTimes)
                    this.curClassNumSplits = (this.curClassSplits.length-1)/2;
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
                
                for (var i = 0; i< data.results.length; i++)
				{
                    if (data.results[i].place >= minPlace && data.results[i].place <= maxPlace)
                    {
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

                if (_this.curClassHasBibs)
                {
                    columns.push({
                        "sTitle": "No",
                        "sClass": "right",
                        "bSortable": false,
                        "aTargets": [col++],
                        "mDataProp": "bib",
                        "width": "5%",
                        "render": function (data,type,row) {
                            if (type === 'display')
                            {
                                if (data<0) // Relay
                                    return "(" + (-data/100|0) + ")";
                                else if (data>0)    // Ordinary
                                    return "("  + data + ")";
                                else
                                    return "";                                        
                            }
                            else
                                return Math.abs(data);
                        }
                    });
                }

                if (isRelayClass)
                {
                    columns.push({
                        "sTitle": this.resources["_CLUB"],
                        "sClass": "left",
                        "bSortable": false,
                        "aTargets": [col++],
                        "mDataProp": "club",
                        "width": "20%",
                        "render": function (data,type,row) {
                            
                            var clubShort = row.club;
                            if (clubShort.length > _this.maxClubLength)
                                clubShort = _this.clubShort(clubShort);		
                            return clubShort;
                        }});

                    columns.push({
                        "sTitle": this.resources["_NAME"],
                        "sClass": "left",
                        "bSortable": false,
                        "aTargets": [col++],
                        "mDataProp": "name",
                        "width": "20%",
                        "render": function (data,type,row) {
                            var nameShort = row.name;
                            if (row.name.length>_this.maxNameLength)
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
                        "render": function (data,type,row) {
                            var nameShort = row.name;
                            if (row.name.length>_this.maxNameLength)
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
                        "render": function (data,type,row) {
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
                    "render": function (data,type,row) {
                        if (type=="sort")
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
                    "width": "10%" ,
                    "render": function (data,type,row) {
                        var res = "";
                        if (row.status == 0)
                        {
                            res += "<span class=\"plustime\">+";
                            res += _this.formatTime(Math.max(0,row.timeplus), row.status, _this.showTenthOfSecond) + "</span>";
                        }
                        return res;
                    }
                });
                
                columns.push({ "sTitle": "sort", "bVisible": false, "aTargets": [col++], "mDataProp": "place" });

                this.currentTable = $('#' + this.resultsDiv).dataTable({
                    "bPaginate": false,
                    "bLengthChange": false,
                    "bFilter": false,
                    "bSort": true,
                    "bInfo": false,
                    "bAutoWidth": false,
                    "aaData": results,
                    "aaSorting": [[col-1, "asc"]],
                    "aoColumnDefs": columns,
                    "bDestroy": true
                    });
            }  
        }
    };
    
    
    AjaxViewer.prototype.viewSplitTimeResults = function (className,course) {
        if (!this.showEcardTimes)
            return
        var _this = this;
        if (this.currentTable != null) {
            try {
                this.currentTable.api().destroy();
            }
            catch (e) { }
        }        
        clearTimeout(this.resUpdateTimeout);
        $('#divResults').html('');   
        var link = "<a href=\"javascript:LiveResults.Instance.chooseClass('" +  className.replace('\'', '\\\'') + "')\">&#5130; Resultater</a>";
        var courses = this.courses[className];
        if (courses != undefined && courses.length > 1)
            link += " " + this.splitTimesLink(className,courses);
        $('#' + this.txtResetSorting).html(link); 
        
        this.curClubName = null;
        this.curClassName = null;
        this.curSplitView = [className,course];
        this.curRelayView = null;
        $('#resultsHeader').html(this.resources["_LOADINGRESULTS"]);
        $.ajax({
            url: this.apiURL,
            data: "comp=" + this.competitionId + "&method=getclasscoursesplits&class=" + encodeURIComponent(className) + "&course=" + course,
            success: function (data,status,resp) {
                var expTime = new Date();
                expTime.setTime(new Date(resp.getResponseHeader("expires")).getTime());
                _this.updateSplitTimeResults(data,course,expTime);
            },
            dataType: "json"
        });
        window.location.hash = "splits::" + className + "::course::" + course;
    };
    
    AjaxViewer.prototype.updateSplitTimeResults = function (data,course,expTime) {
        var _this = this;
        var updateInterval = 0;
        if (data.rt != undefined && data.rt > 0)
                updateInterval = data.rt*1000;
        $('#updateinterval').html("- ");
        if (expTime)
        {
            var lastUpdate = new Date();
            lastUpdate.setTime(expTime - updateInterval + 1000);
            $('#lastupdate').html(new Date(lastUpdate).toLocaleTimeString());
        }        
        
        if (data != null && data.status == "OK") 
        {
            if (data.className != null) {
                $('#' + this.resultsHeaderDiv).html('<b>' + data.className + '</b>&nbsp;&nbsp;<small>Løype ' + course + '</small>');
                $('#' + this.resultsControlsDiv).show();
            }
            if (data.results != null) 
            {
                $.each(data.results, function (idx, res) {
                    res.placeSortable = res.place;
                    if (res.place == "-")
                        res.placeSortable = 999999;
                    if (res.place == "F")
                        res.placeSortable = 0;
                });
                this.curClassNumberOfRunners = data.results.length;
                $('#numberOfRunners').html(_this.curClassNumberOfRunners);
                if (this.curClassNumberOfRunners>0)
                {
                    var columns = Array();
                    var col = 0;
                    columns.push({ "sTitle": "#&nbsp;&nbsp;", "sClass": "right", "aDataSort": [1], "aTargets": [col++], "mDataProp": "place"});
                    columns.push({ "sTitle": "placeSortable", "bVisible": false, "mDataProp": "placeSortable", "aTargets": [col++], "render": function (data,type,row) {
                        if (type=="sort") 
                            return row.placeSortable; 
                        else
                            return data; }});
                                    
                    columns.push({
                        "sTitle": this.resources["_NAME"] + " / " + this.resources["_CLUB"],
                        "sClass": "left",
                        "bSortable": false,
                        "aTargets": [col++],
                        "mDataProp": "club",
                        "width": null,
                        "render": function (data,type,row) {
                            var param = row.club;
                            var clubShort = row.club;
                            if (param && param.length > 0)
                            {
                                param = param.replace('\'', '\\\'');
                                if (clubShort.length > _this.maxClubLength)
                                    clubShort = _this.clubShort(clubShort);				
                            }
                            var link = "<a class=\"club\" href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                            return (row.name.length>_this.maxNameLength ? _this.nameShort(row.name) : row.name) + "<br/>" + link;
                        }
                    });
                                    
                    if (data.splitcontrols != null && data.splitcontrols.length>1)
                    {
                        for (var i=0; i<data.splitcontrols.length; i++)
                        {
                            var code = data.splitcontrols[i];
                            var title ="";
                            if (code==999)
                                title = (i+1) + "-" + _this.resources["_CONTROLFINISH"];
                            else if (i==0)
                                title = "S-1 (" + code + ")";
                            else
                                title = i + "-" + (i+1) + " (" + code + ")";

                            columns.push({
                                "sTitle": title + "&nbsp;&nbsp;",
                                "bVisible": true,
                                "sClass": "right",
                                "bSortable": true,
                                "sType": "numeric",
                                "aDataSort": [col],
                                "aTargets": [col],
                                "bUseRendered": false,
                                "mDataProp": "",
                                "render": function (data,type,row,meta)
                                {
                                    var no = meta.col - 3;
                                    var last = (no==(row.split_place.length-1));
                                    if (type=="sort")
                                    {
                                        if (row.split_place[no]>0)
                                            return row.split_place[no];
                                        else
                                            return 9999;
                                    }                                    
                                    else
                                    {
                                        var txt = "";
                                        var place = "";
                                        var passPlace  = row.pass_place[no];
                                        var passTime   = row.pass_time[no];
                                        var passPlus   = row.pass_plus[no]
                                        var splitPlace = row.split_place[no];
                                        var splitTime  = row.split_time[no]
                                        var splitPlus  = row.split_plus[no]
                                        
                                        // First line
                                        if (passTime>0 || last)
                                        {
                                            if (passPlace == 1)
                                            {
                                                place += "<span class=\"bestplace\"> ";
                                                txt += "<span class=\"besttime\">";
                                            }
                                            else if (passPlace ==2 || passPlace == 3)
                                            {
                                                place += "<span class=\"place23\"> ";
                                                txt += "<span class=\"time23\">";
                                            }
                                            else
                                            {
                                                place += "<span class=\"place\"> ";
                                                txt += "<span>";
                                            }
                                            if (_this.curClassNumberOfRunners >= 10 && passPlace < 10)
                                                place += "&numsp;"                                    
                                            place += "&#10072;" + (passPlace>0? passPlace : "-") + "&#10072</span>";
                                                
                                            var passTimeStr;
                                            if (last)
                                                passTimeStr = _this.formatTime(row.result, ((row.result!=row.dbid && row.status == 13) ? 0 : row.status), false);
                                            else
                                                passTimeStr = _this.formatTime(passTime*100, 0, false);

                                            txt += "<div class=\"tooltip\">" + passTimeStr + place ;
                                            txt += "<span class=\"tooltiptext\">+"+ _this.formatTime(passPlus*100, 0, false) +"</span></div>";
                                            txt += "</span>";
                                        }
                                        // Second line
                                        if (splitTime>0)
                                        {
                                            txt += "<br/><span class=";
                                            place = "";
                                            
                                            if (splitPlace == 1)
                                            {
                                                txt += "\"besttime\">";
                                                place += "<span class=\"bestplace\"> ";
                                            }
                                            else if (splitPlace ==2 || splitPlace == 3)
                                            {
                                                txt += "\"time23\">";
                                                place += "<span class=\"place23\"> ";
                                            }
                                            else
                                            {
                                                txt += "\"legtime\">";
                                                place += "<span class=\"place\"> ";
                                            }
                                            if (_this.curClassNumberOfRunners >= 10 && splitPlace < 10)
                                                place += "&numsp;"
                                            place += "&#10072;" + (splitPlace>0? splitPlace : "-") + "&#10072;</span>";
                                            txt += "<div class=\"tooltip\">" + _this.formatTime(splitTime*100, 0, false) + place ;
                                            txt += "<span class=\"tooltiptext\">+"+ _this.formatTime(splitPlus*100, 0, false) +"</span></div>";
                                            txt += "</span>";
                                        }                                        
                                    };
                                    return txt;
                                }
                            });
                            col++;
                        };                                							
                    };

                    this.currentTable = $('#' + this.resultsDiv).dataTable({
                        "scrollX": this.scrollView,
                        "fixedColumns": {leftColumns: 3},
                        "responsive": false,
                        "bPaginate": false,
                        "bLengthChange": false,
                        "bFilter": false,
                        "bSort": true,
                        "bInfo": false,
                        "bAutoWidth": false,
                        "aaData": data.results,
                        "aaSorting": [[1, "asc"]],
                        "aoColumnDefs": columns,
                        "fnPreDrawCallback": function (oSettings) {
                            if (oSettings.aaSorting[0][0] != 1) {
                                $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\">&#8635;" + _this.resources["_RESETTODEFAULT"] + "</a>");
                            }
                        },
                        "bDestroy": true
                    });

                    var scrollBody = $(this.currentTable.api().settings()[0].nScrollBody);
                    var maxScroll = scrollBody[0].scrollWidth - scrollBody[0].clientWidth;
                    if ( $(".firstCol").width() > 0 && maxScroll > 5)
                        $('#switchNavClick1').trigger('click');
                    this.currentTable.fnAdjustColumnSizing();
                }
            }
        }        
    };

    AjaxViewer.prototype.showCourses = function () {
        document.getElementById('myDropdown').classList.toggle("show");
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