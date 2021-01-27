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
            this.classUpdateTimer = null;
            this.passingsUpdateTimer = null;
            this.resUpdateTimeout = null;
            this.updatePredictedTimeTimer = null;
            this.lastClassListHash = "";
            this.lastRunnerListHash = "";
            this.lastPassingsUpdateHash = "";
            this.lastRadioPassingsUpdateHash = "";
            this.curClassName = "";
            this.lastClassHash = "";
            this.curClassSplits = null;
            this.curClassSplitsBest = null;
            this.curClassSplitsOK = null;
            this.curClassIsMassStart = false;
            this.curClassIsRelay = false;
            this.curClassIsLapTimes = false;
            this.curClassNumSplits = false;
            this.curClassIsUnranked = false;
            this.curClassHasBibs = false;
            this.highlightID = null;
            this.curClubName = "";
            this.lastClubHash = "";
            this.currentTable = null;
            this.serverTimeDiff = 1;
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
            this.rankedStartlist = false;
            this.relayClasses = [];
            this.runnerList = null;
            this.browserType = this.isMobile(); // 1:Mobile, 2:iPad, 3:PC and other
            this.maxNameLength = (this.browserType == 1 ? 15 : (this.browserType == 2 ? 22 : 30));
            this.maxClubLength = (this.browserType == 1 ? 12 : (this.browserType == 2 ? 15 : 20));
            this.apiURL = (this.local ? "api/api.php" : (EmmaServer ? "https://liveresultat.orientering.se/api.php" : "//api.freidig.idrett.no/api.php"));
            this.radioURL = (this.local ? "api/radioapi.php" : "//api.freidig.idrett.no/radioapi.php");
            this.messageURL = (this.local ? "api/messageapi.php" : "//api.freidig.idrett.no/messageapi.php");
            LiveResults.Instance = this;
            
			$(window).hashchange(function () {
                if (window.location.hash) {
                    var hash = window.location.hash.substring(1);
                    var cl;
                    if (hash.indexOf('club::') >= 0) 
                    {
                        cl = decodeURIComponent(hash.substring(6));
                        if (cl != _this.curClubName)
                            LiveResults.Instance.viewClubResults(cl);
                    }
                    else 
                    {
                        cl = decodeURIComponent(hash);
                        if (cl != _this.curClassName) 
                            _this.chooseClass(cl);
                    }
                }
            });
            $(window).hashchange();
            $(window).on('resize', function () 
            {
                if (_this.currentTable != null)
                    _this.currentTable.fnAdjustColumnSizing();
            } );
        }
        
        AjaxViewer.prototype.startPredictionUpdate = function () {
            var _this = this;
            this.updatePredictedTimeTimer = setInterval(function () { _this.updatePredictedTimes(); }, 1000);
        };

        // Function to detect if comp date is today
        AjaxViewer.prototype.isCompToday = function () {
            var dt = new Date();
            var compDay = new Date(this.compDate);
            return (dt.getDate() == compDay.getDate() && dt.getMonth() == compDay.getMonth() || this.local )
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
                        _this.classUpdateTimer = setTimeout(function () {
                            _this.updateRunnerList();
                        }, _this.classUpdateInterval);
                    },
                    dataType: "json"
                });
            }
        };
        AjaxViewer.prototype.handleUpdateRunnerListResponse = function (data) {
            var _this = this;
            if (data != null && data.status == "OK")
			{
                _this.runnerList = data;
            }
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
                        _this.classUpdateTimer = setTimeout(function () {
                            _this.updateClassList();
                        }, _this.classUpdateInterval);
                    },
                    dataType: "json"
                });
            }
        };
        AjaxViewer.prototype.handleUpdateClassListResponse = function (data) {
            var _this = this;
            if (data != null && data.status == "OK")
			{
                if (!data.classes || !$.isArray(data.classes) || data.classes.length == 0)
                    $('#resultsHeader').html("<b>" + this.resources["_NOCLASSESYET"] + "</b>");
                if (data.classes != null)
				{
                    this.relayClasses = [];
                    var classes = data.classes;
					classes.sort(function(a, b)
					{
						var x  = [a.className.toLowerCase(), b.className.toLowerCase()];
						for (var i=0; i<2; i++)
						{
                            if (x[i].includes("åpen") || x[i].includes("open") || x[i].includes("gjest") || x[i].includes("dir") || x[i].includes("utv") )
                                x[i] = 'z' + x[i];
							x[i] = x[i].replace(/(^|[^\d])(\d)($|[^\d])/,'$100$2$3');      // Add 00 ahead of single digits
							x[i] = x[i].replace(/(^|[^\d])(\d)(\d)($|[^\d])/,'$10$2$3$4'); // Add 0 ahead of double digits
                            x[i] = x[i].replace(' ','');
                            x[i] = x[i].replace('-','');
                            x[i] = x[i].replace('+','');
						}
						if (x[0] < x[1]) {return -1;}
						if (x[0] > x[1]) {return 1;}
						return 0;
					});
					var str = "";
					var nClass = classes.length;
					
					var relayNext = false;
					var leg = 0;
					for (var i=0; i<nClass; i++)
					{
						var relay = relayNext;
						var className = classes[i].className;
						param = className.replace('\'', '\\\'');
						if (className && className.length > 0)
						{
                            className = className.replace('Menn','M');
							className = className.replace('Kvinner','K');
							className = className.replace(' Vann','-V');
                            var classNameClean = className.replace(/-\d$/,'');
							classNameClean = classNameClean.replace(/-All$/,'');
							if (i<(nClass-1))
							{
								var classNameCleanNext = classes[i+1].className.replace(/-\d$/,'');
								classNameCleanNext = classNameCleanNext.replace(/-All$/,'');
								if (classNameClean == classNameCleanNext) // Relay trigger
								{
									if (!relay) // First class in relay  
									{
										str += "<b>" + classNameClean + "</b><br/>&nbsp";
										leg = 0;
									}
									relay = true;
									relayNext = true;
								}
								else
									relayNext = false;	
							}
							if (relay)
							{
                                this.relayClasses.push(classes[i].className);
                                var legText = "";
								leg += 1;
								// var relayLeg = className.replace(classNameClean,'Etappe');
								if (className.replace(classNameClean,'') == "-All")
									legText = "<font size=\"+0\">&#" + (9398) +"</font>"
								else
								    legText = "<font size=\"+1\">&#" + (10111+leg) +"</font>"; 
								str += "<a href=\"javascript:LiveResults.Instance.chooseClass('" + param + "')\" style=\"text-decoration: none\"> " + legText + "</a>";
								if (!relayNext)
									str += "<br/>";
							}	
							else	
								str += "<a href=\"javascript:LiveResults.Instance.chooseClass('" + param + "')\">" + className + "</a><br/>";							
						}
                    };
                    str += "</nowrap>";
                    $("#" + this.classesDiv).html(str);
                    $("#numberOfRunnersTotal").html(data.numberOfRunners);
                    $("#numberOfRunnersStarted").html(data.numberOfStartedRunners);
                    $("#numberOfRunnersFinished").html(data.numberOfFinishedRunners);

                    this.lastClassListHash = data.hash;
                }
            }

            if (_this.isCompToday())
                this.classUpdateTimer = setTimeout(function () {_this.updateClassList(); }, this.classUpdateInterval);
        };
		
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
						if (this.curClassIsRelay) // start time + leg time 
							classSplitsBest[this.curClassNumSplits][j] = data.results[i].start + data.results[i].splits[classSplits[classSplits.length-1].code];
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
									classSplitsBest[sp][j]  = data.results[i].start + data.results[i].splits[classSplits[spRef-1].code];
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
                const validateLim = 0.333;
                const minNum = 3; // Minimum numbers of runners to set split to BAD
                this.updateResultVirtualPosition(data.results);
                var classSplits = data.splitcontrols;
                if (classSplits.length == 0) return;
             
                var classSplitsStatus = new Array(this.curClassNumSplits+1);
                var splitFracRunner = new Array(this.curClassNumSplits+1);
                
                for (var sp = 0; sp < this.curClassNumSplits; sp++) {
                    classSplitsStatus[sp] = new Array(1).fill(0);
                    splitFracRunner[sp] = new Array(1).fill(0);
                }
                var nextSplitOK;
                var nextSplit;
                var splitFrac;
                var prevSplit;
                var startTime;
                var runnerOK = new Array(data.results.length);
                
                for (var j = 0; j < data.results.length ; j++)
                {
                    runnerOK[j] = true;
                    if (data.results[j].status != 0 && data.results[j].status != 9 && data.results[j].status != 10)
                        continue;
                                        
                    nextSplitOK = false;
                    nextSplit = null;

                    // Finish time
                    if(data.results[j].place != undefined && data.results[j].place > 0 || data.results[j].place == "=")
                    {
                        nextSplit = parseInt(data.results[j].result);
                        nextSplitOK = true;
                    }
                    // Starttime
                    startTime = (this.curClassIsRelay ? parseInt(data.results[j].splits[0]) : 0);
                    
                    for (var sp = this.curClassNumSplits-1; sp >= 0; sp--)
                    {
                        var spRef = this.splitRef(sp);
                        split = parseInt(data.results[j].splits[classSplits[spRef].code]);
                        if (!isNaN(split)) // Split exist, Status: 0=bad, 1=OK, 2=unknown 
                        {
                            classSplitsStatus[sp][j] = 1; // OK 
                            var spPrevRef = this.splitRef(sp-1);
                            prevSplit = (spPrevRef >= 0 ? parseInt(data.results[j].splits[classSplits[spPrevRef].code]) : startTime);
                            splitFrac = (nextSplit != null && nextSplit - prevSplit > 0 ? (split-prevSplit)/(nextSplit-prevSplit) : 0);
                            splitFracRunner[sp][j] = (splitFrac > 0 && splitFrac < 1 ? splitFrac : null);
                            nextSplit = split;
                            nextSplitOK = true;
                        }
                        else // Split does not exist
                        {
                            if (nextSplitOK)
                            {
                                classSplitsStatus[sp][j] = 0; // Bad split detected
                                runnerOK[j] = false;
                            }
                            else
                                classSplitsStatus[sp][j] = 2; // Unknown
                            nextSplit = null;
                            splitFracRunner[sp][j] = null;
                        }
                    }
                }
                
                // Summarize status and make correlation for split estimates
                var splitsPar = [];
                var classSplitsOK = new Array(this.curClassNumSplits);
                var classSplitsUpdated = new Array(classSplits.length).fill(false);
               
                for (var sp = 0; sp < this.curClassNumSplits; sp++)
                {
                    var statusSum = 0;
                    var statusN = 0;
                    var statusAvg = 0;
                    var count = 0;
                    var xSum = 0;
                    var ySum = 0;
                    var xySum = 0;
                    var xxSum = 0;
                    var a = 0;
                    var b = null;
                    var maxFrac = 0;
                    var minFrac = 1;
                    var std;
                    
                    // Two passes. First pass to calculate mean and st deviation
                    // Average
                    for (var j = 0; j < data.results.length ; j++)
                    {
                        if (classSplitsStatus[sp][j] <= 1 && splitFracRunner[sp][j] != null) 
                        {
                            var frac = splitFracRunner[sp][j];
                            count++;
                            ySum  += frac;
                        }
                    }
                    var avg = (count > 0 ? ySum/count : null)
                    ySum = 0;
                    count = 0;
                    // Standard deviation
                    for (var j = 0; j < data.results.length ; j++)
                    {
                        if (classSplitsStatus[sp][j] <= 1 && splitFracRunner[sp][j] != null) 
                        {
                            var frac = splitFracRunner[sp][j];
                            count++;
                            ySum  += (frac-avg)*(frac-avg);
                        }
                    }
                    var std = (count > 1 ? Math.sqrt(ySum/(count-1)) : 1)
                    ySum = 0;
                    count = 0;

                    // Linear estimation
                    for (var j = 0; j < data.results.length ; j++)
                    {
                        if (classSplitsStatus[sp][j] <= 1) // OK or BAD
                        {
                            statusSum += classSplitsStatus[sp][j];
                            statusN++;
                            if (splitFracRunner[sp][j] != null)
                            {
                                var frac = splitFracRunner[sp][j];
                                if (frac > maxFrac)
                                    maxFrac = frac;
                                if (frac < minFrac)
                                    minFrac = frac;
                                // Least squares variables
                                if (Math.abs(frac - avg)<2*std)
                                {
                                    count++;
                                    xSum  += j;
                                    ySum  += frac;
                                    xxSum += j*j;
                                    xySum += j*frac;
                                }
                            }
                        }
                    }
                    statusAvg = (statusN >= minNum ? statusSum/statusN : 1);
                    classSplitsOK[sp] = (statusAvg > validateLim ? true : false);

                    // Calculate estimation parameters
                    if (count >= 2)
                        a = (count*xySum - xSum*ySum) / (count*xxSum - xSum*xSum);
                    if (count >= 1)
                        b = (ySum - a*xSum)/count;
                    
                    var obj = {avg   : (count > 0 ? ySum/count : null), 
                                 a   : a, 
                                 b   : b, 
                                 max : maxFrac, 
                                 min : minFrac};
                    splitsPar.push(obj);
                }
                this.curClassSplitsOK = classSplitsOK;

                // Calculate nominal split fractions as fraction of total time
                var splitFracNom = new Array(this.curClassNumSplits);
                var lastFrac = 1;
                for (var sp = this.curClassNumSplits-1; sp >= 0; sp--) 
                {
                    var X = splitsPar[sp].avg;
                    for (var spi = sp-1; spi>=0; spi--)
                        X = splitsPar[spi].avg/(1 - X*(1- splitsPar[spi].avg));
                    splitFracNom[sp] = X*lastFrac;
                    lastFrac = splitFracNom[sp];
                }          
                
                // Loop through all runners and insert estimated times when needed
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
                                var spRef = this.splitRef(sp);
                                var split = parseInt(data.results[j].splits[classSplits[spRef].code]);
                                if (isNaN(split) && sp > 0) // Split does not exist
                                {
                                    //var nomSplit = splitFracNom[sp]*finishTime;
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

                    for (var sp = this.curClassNumSplits-1; sp >= 0; sp--) 
                    {
                        if (splitsPar[sp].b == null)
                            continue;
                        var prevSplit = NaN;
                        var spRef = this.splitRef(sp);
                        split = parseInt(data.results[j].splits[classSplits[spRef].code]);
                        if (!isNaN(split)) // Split exist
                            nextSplit = split;
                        else  // Split does not exist
                        {
                            var x = [];
                            var spPrev = sp;                            
                            while (isNaN(prevSplit) && spPrev >= 0) // Find first of previous splits that exist
                            {
                                x.push(Math.max(splitsPar[spPrev].min, Math.min(splitsPar[spPrev].max, splitsPar[spPrev].a*j + splitsPar[spPrev].b)));   
                                spPrev--;
                                var spPrevRef = this.splitRef(spPrev);
                                prevSplit = (spPrevRef >= 0 ? parseInt(data.results[j].splits[classSplits[spPrevRef].code]) : startTime);
                            }
                            var X = x[x.length-1];
                            for (var i = x.length-2; i >=0; i--)
                                X = x[i]/(1 - X*(1- x[i])); // Recursive formula for aggregated fraction
                            
                            if (nextSplit > 0 && !isNaN(prevSplit)) 
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
                var aUndefined = (a.splits[classSplits[split].code] == undefined || a.splits[classSplits[split].code] == "");
                var bUndefined = (b.splits[classSplits[split].code] == undefined || b.splits[classSplits[split].code] == "");

                if (aUndefined && !bUndefined)
                    return 1;
                if (!aUndefined && bUndefined)
                    return -1;
                if (aUndefined && bUndefined)
                    return 0;
                if (!aUndefined && !bUndefined)
                {
                    if (a.splits[classSplits[split].code] == b.splits[classSplits[split].code])
                        return 0;
                    else
                        return (a.splits[classSplits[split].code] < b.splits[classSplits[split].code] ? -1 : 1); 
                }
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
                                        
                    if (curPos == "")
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
		AjaxViewer.prototype.updatePredictedTimes = function (refresh = false) {
            if (this.currentTable != null && this.curClassName != null && this.serverTimeDiff && this.updateAutomatically && this.isCompToday()) {
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
                    var timeDiffStr;
                    var elapsedTimeStr;
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
                        if (!this.EmmaServer){ 
                            if (this.curClassNumSplits==0 || (this.curClassIsUnranked && this.curClassNumSplits==1) ) // Single-result classes. Highlight whole line
                            {
                                var row = table.row(i).node();
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
                            else  // Classes with split times
                            {
                                var spRef = 0;
                                var colNum = 0;
                                // Highlight split times
                                for (var sp = 0; sp < this.curClassNumSplits; sp++){
                                    spRef = this.splitRef(sp);
                                    colNum = offset + 2*sp;
                                    highlight = false;
                                    if (data[i].splits[this.curClassSplits[spRef].code + "_changed"] != "")
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
                                // Highlight finish-time
                                highlight = false;
                                if (data[i].changed != "" && data[i].progress==100){ 
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
                            }
                        }
						
						// *** Update predicted times ***
						if ((data[i].status == 10 || data[i].status == 9) && data[i].start != "" && data[i].start > 0) { 
							var elapsedTime = time - data[i].start;
							if (elapsedTime>=0) 
							{
                                if (elapsedTime < 200 || refresh)
                                {
                                    table.cell( i, 0 ).data("<span class=\"pulsing\">&#9679;</span>");
                                    modifiedTable = true;
                                }                            
                                if(this.isMultiDayEvent && (data[i].totalstatus == 10 || data[i].totalstatus == 9) && !this.curClassIsUnranked)
                                {
                                    var elapsedTotalTime = elapsedTime + data[i].totalresultSave;
                                    var elapsedTotalTimeStr = "<i>(" + this.formatTime(elapsedTotalTime, 0, false) + ")</i>";
                                    table.cell( i, totalTimeCol).data(elapsedTotalTimeStr);
                                }  

								elapsedTimeStr = (this.curClassIsRelay && !this.compactView ? "<br/><i>" : "<i>") + this.formatTime(elapsedTime, 0, false) + "</i>";
                                if (this.curClassSplits == null || this.curClassSplits.length == 0){
                                // No split controls
                                    if (!this.curClassIsUnranked)
                                    {
										if (this.curClassSplitsBests[0][0]>0){
											rank = this.findRank(this.curClassSplitsBests[0],elapsedTime);
											if (rank > 1)
                                                elapsedTimeStr += "<i> (" + rank + ")</i>";
                                            else
                                                elapsedTimeStr += "<i> (..)</i>";	
											timeDiff = elapsedTime - this.curClassSplitsBests[0][0]; 
											timeDiffStr = "<i>" + (timeDiff<0 ? "-" : "+") + this.formatTime(Math.abs(timeDiff), 0, false) + "</i>";
										}
										else
											timeDiffStr = "<i>(..)<\i>";
                                        if (this.isMultiDayEvent && !this.compactView)
                                            elapsedTimeStr += "<br/>" + timeDiffStr;
                                        else
                                            table.cell( i, 6 + MDoffset + (this.curClassHasBibs? 1 : 0)).data(timeDiffStr);
									}
									table.cell( i, 4 + MDoffset + (this.curClassHasBibs? 1 : 0)).data(elapsedTimeStr);
                                }
                                else
                                {
                                // Have split controls. Find next split to reach
                                // Insert default value being the first OK split and last OK
                                    var lastOKSplit = this.curClassNumSplits;
                                    nextSplit       = firstOKSplit;

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
										table.cell( i, offset + this.curClassNumSplits*2 ).data("<i>(..)<\i>");
									}
                                    else
                                    {
										if (this.curClassSplitsBests[nextSplit][0]==0)
										   timeDiffStr = "<i>(..)<\i>";
										else{
                                            if (this.curClassIsRelay)
                                            {
												timeDiff = time - this.curClassSplitsBests[nextSplit][0];
												rank = this.findRank(this.curClassSplitsBests[nextSplit],time);
											}
                                            else
                                            {
												timeDiff = elapsedTime - this.curClassSplitsBests[nextSplit][0];
                                                rank = this.findRank(this.curClassSplitsBests[nextSplit],elapsedTime);                                                                                                
											}
                                            
                                            var rankStr = "";
											if (rank > 1)
                                                rankStr = " <i>(" + rank + ")</i>";
                                            else
                                                rankStr = " <i>(..)</i>";											
											timeDiffStr = "<i>" + (timeDiff<0 ? "-" : "+") + this.formatTime(Math.abs(timeDiff), 0, false) + "</i>";
                                            if (nextSplit==this.curClassNumSplits)
												elapsedTimeStr += rankStr;
											else
                                                timeDiffStr += rankStr;
                                        }
										
										timeDiffCol = offset + nextSplit*2;
										if (nextSplit==this.curClassNumSplits) // Approach finish
											timeDiffCol += 2;
                                        
                                            // Display elapsed time
										if (!this.compactView && !this.curClassIsRelay && !this.curClassLapTimes && nextSplit==this.curClassNumSplits)
                                            elapsedTimeStr += "<br/>" + timeDiffStr;                                      
										table.cell( i, offset + this.curClassNumSplits*2 ).data(elapsedTimeStr);
                                        // Display time diff
										if (this.compactView || this.curClassIsRelay || nextSplit!=this.curClassNumSplits || this.curClassLapTimes)
                                            table.cell( i, timeDiffCol ).data(timeDiffStr);
                                        
                                        // Update predData: Insert current time if longer than a runner with larger index / virtual position
                                        const predOffset = 0;
                                        if (predRank && !this.curClassIsRelay && !this.curClassLapTimes)
                                        {
                                            if (nextSplit == 0 && this.rankedStartlist)
                                                {   
                                                    tmpPredData[i].splits[this.curClassSplits[0].code] = elapsedTime - predOffset;
                                                    tmpPredData[i].progress = 100.0 * 1/(this.curClassNumSplits + 1);
                                                    tmpPredData[i].place = "";
                                                }
                                            else
                                            {
                                                for (var j = i+1; j < data.length; j++) 
                                                {                                                
                                                    if (data[j].status != 0 && data[j].status != 9 && data[j].status != 10)
                                                        break                                                
                                                    if (nextSplit == this.curClassNumSplits && data[j].status == 0 && elapsedTime - predOffset > parseInt(data[j].result))
                                                    {
                                                        tmpPredData[i].result = elapsedTime - predOffset;
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
                    // Update virtal positions if predRank is on
                    if (predRank && !this.curClassIsMassStart && !this.curClassIsRelay && !this.curClassIsUnranked && !this.curClassLapTimes)
                    {
                        this.updateResultVirtualPosition(tmpPredData, false);
                        var updateVP = false;
                        for (var j = 0; j < tmpPredData.length; j++)
                        {
                            if (data[tmpPredData[j].idx].virtual_position != tmpPredData[j].virtual_position)
                            {
                                updateVP = true;    
                                data[tmpPredData[j].idx].virtual_position = tmpPredData[j].virtual_position;
                            }
                        }
                        if (updateVP && this.qualLimits != null && this.qualLimits.length > 0)                        
                            this.updateQualLimMarks(data, this.curClassName); 
                        if (updateVP)
                            table.rows().invalidate().draw();
                    }
                    if (modifiedTable || refresh)
                        table.fixedColumns().update();
                } 
                catch (e) {
                }
            }
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
            if (data != null && data.status == "OK") {
                if (data.passings != null) {
                    var str = "";
                    $.each(data.passings, function (key, value) {
                        var runnerName = (value.runnerName.length > _this.maxNameLength ? _this.nameShort(value.runnerName) : value.runnerName);
                        var cl = value["class"];
                        var status = value["status"];
                        if (cl && cl.length > 0)
                            cl = cl.replace('\'', '\\\'');
                        str += value.passtime + ": " + runnerName 
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
                this.passingsUpdateTimer = setTimeout(function () {_this.updateLastPassings();}, this.updateInterval);
        };

        //Request data for the last radio passings div
        AjaxViewer.prototype.updateRadioPassings = function (code,calltime,minBib,maxBib) {
            var _this = this;
            if (this.updateAutomatically) {
                $.ajax({
                    url: this.radioURL,
                    data: "comp=" + this.competitionId + "&method=getradiopassings&code=" + code + "&calltime=" + calltime +
                          "&minbib=" + minBib + "&maxbib=" + maxBib + 
                          "&lang=" + this.language + "&last_hash=" + this.lastRadioPassingsUpdateHash,
                    success: function (data,status,resp) {
                        var reqTime = new Date();
                        reqTime.setTime(new Date(resp.getResponseHeader("expires")).getTime() - _this.radioUpdateInterval);
                        _this.handleUpdateRadioPassings(data,reqTime); },
                    error: function () {
                        _this.radioPassingsUpdateTimer = setTimeout(function () {
                            _this.updateRadioPassings();
                        }, _this.radioUpdateInterval);
                    },
                    dataType: "json"                   
                });
                if (_this.isCompToday())
                    this.radioPassingsUpdateTimer = setTimeout(function () {_this.updateRadioPassings(code,calltime,minBib,maxBib);}, this.radioUpdateInterval);
            }

        };
        //Handle response for updating the last radio passings..
        AjaxViewer.prototype.handleUpdateRadioPassings = function (data,reqTime) {
            $('#lastupdate').html(new Date(reqTime).toLocaleTimeString());
            // Make live blinker pulsing
            var el = document.getElementById('liveIndicator');
                el.style.animation = 'none';
                el.offsetHeight; /* trigger reflow */
                el.style.animation = null; 
            const maxLines = 40;
            var _this = this;
			var leftInForest = false;
            // Insert data from query
			if (data != null && data.status == "OK") {
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
				this.lastRadioPassingsUpdateHash = data.hash;
			}
            if (this.radioData != null && this.radioData.length > 0 && this.radioData[0].timeDiff == -2)
            {
                leftInForest = true;
                $('#numberOfRunners').html(this.radioData.length);
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
                            passing.DT_RowClass = "yellow_row";
                    else if (age >= 0 && age <= _this.radioHighTime)
                    {
						if (passing.rank == 1)
							passing.DT_RowClass = "green_row";
						else
							passing.DT_RowClass = "red_row";
                    }
                    else
                        passing.DT_RowClass = "";
                });
			}
			
			if (this.currentTable != null) // Existing datatable
			{
				this.currentTable.fnClearTable();
                this.currentTable.fnAddData(this.radioData, true);
                this.filterTable();
			}
			else // New datatable
			{
                if (this.radioData.length==0) return;
                var columns = Array();
                var col = 0;
                var className = "";
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
                            className = row.class;
                            var link = "<a href=\"followfull.php?comp=" + _this.competitionId + "&class=" + encodeURIComponent(row.class);
                            link +=	"\" target=\"_blank\" style=\"text-decoration: none;\">" + row.class + "</a>";
                            return link;
                        }});
                if (this.radioStart)
                {				
                    columns.push({ "sTitle": "Brikke" , "sClass": "left" , "bSortable": false, "aTargets": [col++], "mDataProp": "ecard1", 
                    "render": function (data,type,row) {
                        var ecardstr = "";
                        if (row.ecard1>0) {
                            ecardstr = row.ecard1;
                            if (row.ecard2>0) ecardstr += " / " + row.ecard2;}
                        else
                            if (row.ecard2>0) ecardstr = row.ecard2;
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
                                res += "<span class=\"besttime\">-" + _this.formatTime(-row.timeDiff, 0, _this.showTenthOfSecond) +"</span>";
                            return res;
                        }});
                if (leftInForest)
                    columns.push({ "sTitle": "Status", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "status",
                        "render": function (data,type,row) {
                            var res = "";
                            if (data == 9)
                                res += "Startet";
                            else if (row.checked == 1)
                                res += "Brikkesjekk";
                            return res;
                        }});

                if (this.radioStart){				
                    var message = "<button onclick=\"res.popupDialog('Generell melding',0,0);\">&#128172;</button>";
                    
                    columns.push({ "sTitle": message, "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "controlName",
                        "render": function (data,type,row) 
                        {
                                var defaultDNS = (row.dbid > 0 ? 1 : 0);
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

        };
        
    // Runner name shortener
    AjaxViewer.prototype.nameShort = function (name) {
        if(!name)
           return false;
        var array = name.split(' ');
        if (array.length==1)
            return name;
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
        return shortName;
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
                                    if (data<0) // Relay
                                        return  (-data/100|0) + "-" + (-data%100);
                                    else if (data>0)    // Ordinary
                                        return data;
                                    else
                                        return "";
                                }
                                else
                                    return Math.abs(data);
                            }
            });
            columns.push({ "sTitle": "Navn", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "name",
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
                        className = row.class;
                        var link = "<a href=\"followfull.php?comp=" + _this.competitionId + "&class=" + encodeURIComponent(row.class);
                        link +=	"\" target=\"_blank\" style=\"text-decoration: none;\">" + row.class + "</a>";
                        return link;
                    }});
                    
            columns.push({ "sTitle": "Starttid", "sClass": "right", "bSortable": false, "aTargets": [col++], "mDataProp": "start"});         				
          
            columns.push({ "sTitle": "Brikke#1" , "sClass": "center" , "bSortable": false, "aTargets": [col++], "mDataProp": "ecard1",
                "render": function (data,type,row) 
                {
                    var bibStr = (row.bib == 0 ? "" : "(" + (row.bib < 0 ? (-row.bib/100|0) + "-" + (-row.bib%100) : row.bib ) + ") ");
                    var ecardStr = (row.ecard1 == 0 ? "-" : row.ecard1 );
                    var runnerName = bibStr + row.name;
                    var link = "<button style=\"width:50px\" onclick=\"res.popupDialog('" + runnerName + ". Endre brikke#1 fra " 
                        + ecardStr + " til '," + row.dbid + ",0,1);\">"+ ecardStr +"</button>";						
                    return link;
                }});
            columns.push({ "sTitle": "Brikke#2" , "sClass": "center" , "bSortable": false, "aTargets": [col++], "mDataProp": "ecard2",
                "render": function (data,type,row) 
                {
                    var bibStr = (row.bib == 0 ? "" : "(" + (row.bib < 0 ? (-row.bib/100|0) + "-" + (-row.bib%100) : row.bib ) + ") ");
                    var ecardStr = (row.ecard2 == 0 ? "-" : row.ecard2 );
                    var runnerName = bibStr + row.name;
                    var link = "<button style=\"width:50px\" onclick=\"res.popupDialog('" + runnerName + ". Endre brikke#2 fra " 
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

	
    //Popup window for messages to message center
    AjaxViewer.prototype.popupDialog = function (promptText,dbid,defaultDNS,startListChange = -1) {
        var defaultText ="";
        if (defaultDNS)
            defaultText = "ikke startet";
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
                    $.ajax({
                        url: this.apiURL,
                        data: "comp=" + this.competitionId + "&method=getclassresults&unformattedTimes=true&class=" + encodeURIComponent(this.curClassName) + "&nosplits=" + this.noSplits +
						"&last_hash=" + this.lastClassHash + (this.isMultiDayEvent ? "&includetotal=true" : ""),
                        success: function (data, status, resp) {
                            try {
                                var reqTime = new Date();
                                reqTime.setTime(new Date(resp.getResponseHeader("expires")).getTime() - _this.updateInterval);
                            }
                            catch (e) {
                            }
                            _this.handleUpdateClassResults(data,reqTime);
                        },
                        error: function () {
                            _this.resUpdateTimeout = setTimeout(function () {
                                _this.checkForClassUpdate();
                            }, _this.updateInterval);
                        },
                        dataType: "json"
                    });
                }
            }
        };
        //handle response from class-results-update
        AjaxViewer.prototype.handleUpdateClassResults = function (newData,reqTime) {
            $('#lastupdate').html(new Date(reqTime).toLocaleTimeString());
            var _this = this;
            if (newData.status == "OK") {
                if (this.currentTable != null)
				{
                    var table = this.currentTable.api();
                    var numberOfRunners = newData.results.length;
                    $('#numberOfRunners').html(numberOfRunners);
					var oldData = this.currentTable.fnGetData();
					var shownId = [];
					
					var posLeft = $(table.settings()[0].nScrollBody).scrollLeft();
                    for (var i = 0; i < oldData.length; i++) 
					{
						if( table.row(i).child.isShown() )
							shownId.push(oldData[i].dbid);
                    }
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
                    for (var i = 0; i < shownId.length; i++) 
					{
						let j = newData.results.findIndex(s => s.dbid == shownId[i]);
						if (j > -1)
							table.row(j).nodes().to$().find('td:first-child').trigger('click');
					}
					$(table.settings()[0].nScrollBody).scrollLeft( posLeft );
                    this.updatePredictedTimes(true);
                    this.lastClassHash = newData.hash;

                }
            }
            if (_this.isCompToday()) 
                this.resUpdateTimeout = setTimeout(function () {_this.checkForClassUpdate();}, this.updateInterval);
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
                            var reqTime = new Date();
                            reqTime.setTime(new Date(resp.getResponseHeader("expires")).getTime() - _this.clubUpdateInterval);
                            _this.handleUpdateClubResults(data,reqTime); 
                        },
                        error: function () {
                            _this.resUpdateTimeout = setTimeout(function () {
                                _this.checkForClubUpdate();
                            }, _this.clubUpdateInterval);
                        },
                        dataType: "json"
                    });
                }
            }
        };
        //handle the response on club-results update
        AjaxViewer.prototype.handleUpdateClubResults = function (data,reqTime) {
            var _this = this;
            $('#lastupdate').html(new Date(reqTime).toLocaleTimeString());
            clearTimeout(this.resUpdateTimeout);
            if (data.status == "OK") {
                if (this.currentTable != null) {
                    var numberOfRunners = data.results.length;
                    $('#numberOfRunners').html(numberOfRunners);
					var posLeft = $(this.currentTable.api().settings()[0].nScrollBody).scrollLeft();
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
					$(this.currentTable.api().settings()[0].nScrollBody).scrollLeft( posLeft );
                    this.lastClubHash = data.hash;
                }
            }
            if (_this.isCompToday())
                this.resUpdateTimeout = setTimeout(function () {_this.checkForClubUpdate();}, this.clubUpdateInterval);
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
            $('#resultsHeader').html(this.resources["_LOADINGRESULTS"]);
            $.ajax({
                url: this.apiURL,
                data: "comp=" + this.competitionId + "&method=getclassresults&unformattedTimes=true&class=" + encodeURIComponent(className) + "&nosplits=" + this.noSplits + (this.isMultiDayEvent ? "&includetotal=true" : ""),
                success: function (data, status, resp) {
                    try { 
                        var reqTime = new Date();
                        reqTime.setTime(new Date(resp.getResponseHeader("expires")).getTime() - _this.updateInterval);
                    }
                    catch (e) { }
					_this.updateClassResults(data,reqTime);
                },
                dataType: "json"
            });

            if (!this.isSingleClass) {
                window.location.hash = className;
            }
            if (_this.isCompToday())
                this.resUpdateTimeout = setTimeout(function () { _this.checkForClassUpdate();}, this.updateInterval);
        };
		
        AjaxViewer.prototype.updateClassResults = function (data,reqTime) {
            $('#lastupdate').html(new Date(reqTime).toLocaleTimeString());
            var _this = this;
            if (data != null && data.status == "OK") {
                if (data.className != null) {
                    $('#' + this.resultsHeaderDiv).html('<b>' + data.className + '</b>');
                    $('#' + this.resultsControlsDiv).show();
                }
                $('#' + this.txtResetSorting).html("");
                if (data.results != null) {
                    var haveSplitControls = (data.splitcontrols != null) && (data.splitcontrols.length > 0);
                    // Class properties
                    this.curClassSplits = data.splitcontrols;
                    this.curClassIsRelay = (haveSplitControls && this.curClassSplits[0].code == "0");
                    this.curClassLapTimes = (haveSplitControls && this.curClassSplits[0].code != "0" && this.curClassSplits[this.curClassSplits.length - 1].code == "999");
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

                    this.curClassSplitsOK = new Array(this.curClassNumSplits).fill(true);
                    this.checkRadioControls(data);
                    this.updateClassSplitsBest(data);
                    this.updateResultVirtualPosition(data.results);
                    this.predData = $.extend(true,[],data.results);
                    if (this.highlightID != null)
                        this.setHighlight(data.results,this.highlightID);
                    if (this.qualLimits != null && this.qualLimits.length > 0)
                        this.updateQualLimMarks(data.results, data.className);
                    
                    var numberOfRunners = data.results.length;
                    $('#numberOfRunners').html(numberOfRunners);
                    
                    var columns = Array();
                    var col = 0;
                    var i;
					var fullView = !this.compactView;
                    var isRelayClass = this.relayClasses.includes(data.className);

                    columns.push({
                        "sTitle": "#",
						"responsivePriority": 1,
						"sClass": "right",
                        "bSortable": false,
                        "aTargets": [col++],
                        "mDataProp": "place",
                        "width": (_this.fixedTable ? "5%" : null)
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
                                return link = "<a href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
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
                                var clubLink = "<a href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                                                                                                                                    
                                return (haveSplitControls && fullView ? clubLink + "<br/>" + nameShort : nameShort);
                            }
                        });
                    }
                    else // Not this.curClassIsRelay
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
                                var link = "<a href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                                if ((haveSplitControls || _this.isMultiDayEvent) && !_this.curClassIsUnranked && (fullView || _this.curClassLapTimes))
                                {
                                    if (row.name.length>_this.maxNameLength)
                                            return _this.nameShort(row.name) + "<br/>" + link;
                                        else
                                            return row.name + "<br/>" + link;
                                }
                                else if (_this.fixedTable)
                                    return clubShort;
                                else
                                    return link;
                            }
                        });
                    }
                    
                    if (_this.curClassHasBibs)
                    {
                        columns.push({
                            "sTitle": "&#8470;&nbsp;&nbsp;",
						    "responsivePriority": 1,
						    "sClass": "right",
                            "bSortable": true,
                            "aTargets": [col++],
                            "mDataProp": "bib",
                            "width": (_this.fixedTable ? "5%" : null),
                            "render": function (data,type,row) {
                                if (type === 'display')
                                {
                                    if (data<0) // Relay
                                        return "<span class=\"bib\">" + (-data/100|0) + "</span>";
                                    else if (data>0)    // Ordinary
                                        return "<span class=\"bib\">"  + data + "</span>";
                                    else
                                        return "";                                        
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
                                    if (fullView)
                                    {
                                        if (row.splits["0_place"] == 1)
                                            txt += "<span class=\"besttime\">-" + _this.formatTime(-row.splits["0_timeplus"], 0, _this.showTenthOfSecond) + " (1)</span><br />";
                                        else
                                            txt += "<span>+" + _this.formatTime(row.splits["0_timeplus"], 0, _this.showTenthOfSecond) + " (" + row.splits["0_place"] + ")</span><br />";
                                    }
                                    if (row.splits["0_place"] == 1)									
										txt += "<span class=\"besttime\">" +_this.formatTime(row.start, 0, false, true, true);
									else 
										txt += "<span>" + _this.formatTime(row.start, 0, false, true, true);
                                    if (!fullView && row.splits["0_place"] >=1)
                                        txt += " (" + row.splits["0_place"] + ")";
                                    txt += "</span>";
								}
								else
									txt += _this.formatTime(row.start, 0, false, true, true) 
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
												// First line
                                                if ((!fullView || _this.curClassIsRelay) && (row.splits[value.code + "_place"] != 1) && !_this.curClassIsUnranked && !_this.curClassLapTimes && (value.code > 0))
                                                // Compact view or relay view, all but first place
                                                {
                                                    txt += "<div class=\"";
                                                    if ( row.splits[value.code + "_estimate"] )
                                                        txt += "estimate ";
                                                    txt += "tooltip\">+" + _this.formatTime(row.splits[value.code + "_timeplus"], 0, _this.showTenthOfSecond) 
                                                        + " (" + row.splits[value.code + "_place"] + ")<span class=\"tooltiptext\">" 
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
                                                        txt += " (" + row.splits[value.code + "_place"] + ")</span>";
                                                }
												// Second line
                                                if ((fullView && _this.curClassIsRelay || _this.curClassLapTimes) && (row.splits[(value.code + 100000) + "_timeplus"] != undefined))
                                                // Relay passing, second line with leg time to passing 
                                                {
                                                    txt += "<br/><span class="
                                                    if (row.splits[value.code + 100000 + "_estimate"] )
                                                        txt += "\"estimate\">";
                                                    else if (row.splits[(value.code + 100000) + "_place"] == 1)
                                                        txt += "\"besttime\">";
                                                    else
                                                        txt += "\"legtime\">";
                                                    txt += _this.formatTime(row.splits[(value.code + 100000)], 0, _this.showTenthOfSecond)
                                                        + " (" + row.splits[(value.code + 100000) + "_place"] + ")</span>";
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

                    var timecol = col;
                    columns.push({
                        "sTitle": this.resources["_CONTROLFINISH"] + "&nbsp;&nbsp;",
						"responsivePriority": 2,
                        "sClass": "right",
                        "sType": "numeric",
                        "aDataSort": [col + 1, col, 0],
                        "aTargets": [col],
                        "bUseRendered": false,
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
                                if ((haveSplitControls || _this.isMultiDayEvent) && (row.place == 1))
                                    res += "<span class=\"besttime\">";
								else
									res += "<span>";
                                res += _this.formatTime(row.result, row.status, _this.showTenthOfSecond);
                                res += " (" + row.place + ")</span>";
                                if ((haveSplitControls || _this.isMultiDayEvent) && fullView && !(_this.curClassIsRelay) && !(_this.curClassLapTimes) && row.status == 0)
								{
                                    if (row.place==1)
                                    {
                                        res += "<br/><span class=\"besttime\">";
                                        res += (haveSplitControls ? "-" : "+");
                                        res += _this.formatTime(-row.timeplus, row.status, _this.showTenthOfSecond) + "</span>";
                                    }
                                     else
                                        res += "<br/><span class=\"plustime\">+" 
                                            + _this.formatTime(row.timeplus, row.status, _this.showTenthOfSecond) + "</span>";
                                }
							}
							if (haveSplitControls && (fullView && _this.curClassIsRelay || _this.curClassLapTimes) && (row.splits["999_place"] != undefined))
							{
								if (row.splits[(999)]>0)
								{
								res += "<br/><span class=";
								if (row.splits["999_place"] == 1)
									res += "\"besttime\">";
								else
									res += "\"legtime\">";
								res += _this.formatTime(row.splits[(999)], 0, _this.showTenthOfSecond) + " (" + row.splits["999_place"] + ")";
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
								var res = "";
                                if (row.status == 0)
                                {
                                    if (row.timeplus <= 0 && haveSplitControls)
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
                            "sTitle": "Tot<br/><span class=\"legtime\">Etp</span>",
						    "responsivePriority": 2000,
                            "sClass": "right",
                            "bSortable": false,
                            "aTargets": [col++],
                            "mDataProp": "timeplus",
                            "render": function (data,type,row) {
								if (isNaN(parseInt(data)))
									return data;
                                var res = "";
                                if (row.status == 0)
                                {
                                    if (row.place == 1)
                                        res += "<span class=\"besttime\">-"
                                            + _this.formatTime(-row.timeplus, row.status, _this.showTenthOfSecond) + "</span><br />";
                                    else
                                        res += "<span>+" + _this.formatTime(row.timeplus, row.status, _this.showTenthOfSecond) + "</span><br />";
                                    if (row.splits["999_place"] == 1)
                                        res += "<span class=\"besttime\">-"
                                            + _this.formatTime(-row.splits["999_timeplus"], 0, _this.showTenthOfSecond) + "</span>";
                                    else
                                        res += "<span class=\"legtime\">+"
                                            +_this.formatTime(row.splits["999_timeplus"], 0, _this.showTenthOfSecond) + "</span>";
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
								if (isNaN(parseInt(data)))
									return data;
                                if (row.totalplace == "-" || row.totalplace == "") {
                                    return _this.formatTime(row.totalresult, row.totalstatus);
                                }
                                else {
                                    var res = "";
                                    if (row.totalplace == 1)
                                        res += "<span class=\"besttime\">";
                                    else
                                        res += "<span>";
                                    res += _this.formatTime(row.totalresult, row.totalstatus) + " (" + row.totalplace + ")</span>";
                                    if (fullView) 
                                    {
                                        if (row.totalplace == 1)
                                            res += "<br/><span class=\"besttime\">+";
                                        else
                                            res += "<br/><span class=\"plustime\">+";
                                        res += _this.formatTime(row.totalplus, row.totalstatus) + "</span>";
                                    }
                                    return res;
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
                    columns.push({ "sTitle": "VP", "bVisible": false, "aTargets": [col++], "mDataProp": "virtual_position" });
					
                   this.currentTable = $('#' + this.resultsDiv).dataTable({
                        "scrollX": this.scrollView,
						"fixedColumns": {leftColumns: 2 },
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
                                $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\"><img class=\"eR\" style=\"vertical-align: middle\" src=\"images/cleardot.gif\" border=\"0\"/> " + _this.resources["_RESETTODEFAULT"] + "</a>");
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
                    this.updatePredictedTimes(true);
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
                clearTimeout(this.classUpdateTimer);
                $("#" + this.setAutomaticUpdateText).html("<b>" + this.resources["_AUTOUPDATE"] + ":</b> <a href=\"javascript:LiveResults.Instance.setAutomaticUpdate(true);\">" + this.resources["_ON"] + "</a> | " + this.resources["_OFF"] + "");
                this.serverTimeDiff = null;
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

		AjaxViewer.prototype.setCompactView = function (val) {
            this.compactView = val;
            if (this.compactView) {
                $("#" + this.setCompactViewText).html("<a href=\"javascript:LiveResults.Instance.setCompactView(false);\">&#9868;</a>");
            }
            else {
                $("#" + this.setCompactViewText).html("<a href=\"javascript:LiveResults.Instance.setCompactView(true);\">&#9866;</a>");
            }
			if (this.curClassName!=null)
			{
				this.chooseClass(this.curClassName);
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
					if(aStatus == 0)
						return -1
					else if (bStatus == 0)
						return 1
					else
						return bStatus - aStatus;
				else {
                    if (a.result == b.result) {
                        if (a.place == "=" && b.place != "=") {
                            return 1;
                        }
                        else if (b.place == "=" && a.place != "=") {
                            return -1;
                        }                 
                        else {
                            return 0;
                        }
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
            $('#resultsHeader').html(this.resources["_LOADINGRESULTS"]);
            $.ajax({
                url: this.apiURL,
                data: "comp=" + this.competitionId + "&method=getclubresults&unformattedTimes=true&club=" + encodeURIComponent(clubName) + (this.isMultiDayEvent ? "&includetotal=true" : ""),
                success: function (data) {
                    _this.updateClubResults(data);
                },
                dataType: "json"
            });
            if (!this.isSingleClass) {
                window.location.hash = "club::" + clubName;
            }
            this.resUpdateTimeout = setTimeout(function () {
                _this.checkForClubUpdate();
            }, this.updateInterval);
        };
        
        AjaxViewer.prototype.updateClubResults = function (data) {
            var _this = this;
            if (data != null && data.status == "OK") {
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
                                if (data<0) // Relay
                                    return "<span class=\"bib\">" + (-data/100|0) + "</span>";
                                else if(data>0)       // Ordinary
                                    return "<span class=\"bib\">" + data + "</span>";
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
						"fixedColumns": {leftColumns: 3},
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
                                $("#" + _this.txtResetSorting).html("&nbsp;&nbsp;<a href=\"javascript:LiveResults.Instance.resetSorting()\"><img class=\"eR\" style=\"vertical-align: middle\" src=\"images/cleardot.gif\" border=\"0\"/> " + _this.resources["_RESETTODEFAULT"] + "</a>");
                            }
                        },
                        "bDestroy": true
                    });
					
                    this.lastClubHash = data.hash;
                }
            }
        };
        
        AjaxViewer.prototype.resetSorting = function () {
            var idxCol = 1;
            $.each(this.currentTable.fnSettings().aoColumns, function (idx, val) {
                if (val.sTitle == "VP") {
                    idxCol = idx;
                }
            });
            this.currentTable.fnSort([[idxCol, 'asc']]);
            $("#" + this.txtResetSorting).html("");
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