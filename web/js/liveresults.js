var LiveResults;
(function (LiveResults) {
    // ReSharper disable once InconsistentNaming
    LiveResults.Instance = null;
    var AjaxViewer = /** @class */ (function () {
        function AjaxViewer(competitionId, language, classesDiv, lastPassingsDiv, resultsHeaderDiv, resultsControlsDiv, resultsDiv, txtResetSorting, 
            resources, isMultiDayEvent, isSingleClass, setAutomaticUpdateText, setCompactViewText, runnerStatus, showTenthOfSecond, radioPassingsDiv, 
            EmmaServer=false,filterDiv=null) {
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
            this.showTenthOfSecond = false;
            this.updateAutomatically = true;
            this.autoUpdateLastPassings = true;
            this.compactView = true;
			this.scrollView = true;
            this.updateInterval = (this.local ? 2000 : (EmmaServer ? 15000 : 10000));
            this.radioUpdateInterval = (this.local ? 2000 : 5000);
            this.classUpdateInterval = 60000;
            this.radioHighTime = 15;
            this.highTime = 60;
            this.classUpdateTimer = null;
            this.passingsUpdateTimer = null;
            this.resUpdateTimeout = null;
            this.updatePredictedTimeTimer = null;
            this.lastClassListHash = "";
            this.lastPassingsUpdateHash = "";
            this.lastRadioPassingsUpdateHash = "";
            this.curClassName = "";
            this.lastClassHash = "";
            this.curClassSplits = null;
			this.curClassSplitsBest = null;
            this.curClassIsMassStart = false;
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
            return (dt.getDate() == compDay.getDate() || this.local ? true : false)
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
        
        // Update the classlist
        AjaxViewer.prototype.updateClassList = function () {
            var _this = this;
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
				var classSplitsBest = new Array(classSplits.length+1);
				for (var i = 0; i < classSplitsBest.length; i++) {
					classSplitsBest[i] = new Array(1).fill(0);
				}
				var relay = (classSplits.length>0 && classSplits[0].code == "0"); 
				// Fill in finish times
				var j = 0;
				for (var i = 0; i< data.results.length; i++)
				{
					if(data.results[i].place != undefined && data.results[i].place > 0 || data.results[i].place == "=")
					{
						if (relay)
							classSplitsBest[classSplits.length][j] = data.results[i].start + data.results[i].splits[classSplits[classSplits.length-1].code];
						else
							classSplitsBest[classSplits.length][j] = parseInt(data.results[i].result);
						j++;
					}
				}
				classSplitsBest[classSplits.length].sort(function (a, b) {  return a - b;  });			
				if (classSplits.length > 0)
				{
			        // Fill in split times
					for (var sp = 0; sp < classSplits.length; sp++)
					{
						j = 0;
						for (var i = 0; i< data.results.length ; i++)
						{
							if(data.results[i].splits[classSplits[sp].code + "_place"] != undefined && data.results[i].splits[classSplits[sp].code + "_place"] > 0)
							{
								if (relay && sp>0) // If relay store pass time stamp instead of used time. Using leg time and start time
									classSplitsBest[sp][j]  = data.results[i].start + data.results[i].splits[classSplits[sp-1].code];
								else
									classSplitsBest[sp][j]  = data.results[i].splits[classSplits[sp].code];
								j++;
							}
						}
						classSplitsBest[sp].sort(function (a, b) {  return a - b;  });
					}
				}
				this.curClassSplitsBests = classSplitsBest;
			}
		};
				
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
                        results[i].DT_RowClass = "firstnonqualifier";
                    }
                    else
                        results[i].DT_RowClass = "nostyle";
                    
                    if (curPos == "")
                        curPos = "-";	                    					
				}
			}
		};		
		
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
					var haveSplitControls = (this.curClassSplits != null) && (this.curClassSplits.length > 0);
                    var relay = (haveSplitControls && this.curClassSplits[0].code == "0");
                    var lapTimes = (haveSplitControls && this.curClassSplits[0].code != "0" && this.curClassSplits[this.curClassSplits.length - 1].code == "999");
                    var hasBibs = (data[0].bib != undefined && data[0].bib != 0);
                    var timeDiff = 0;
					var timeDiffCol = 0;
                    var highlight = false;
                    var modifiedTable = false;
					var age = 0;
					var table = this.currentTable.api();					
                    var unranked = !(this.curClassSplits.every(function check(el) {return el.code != "-999";})); 
                    var offset = 3 + (hasBibs? 1 : 0) + ((unranked || (this.compactView && !lapTimes)) ? 1 : 0);
                    var MDoffset = (this.isMultiDayEvent && !this.compactView && !unranked ? -1 : 0) // Multiday offset
                    var rank;
                    var timeDiffStr;
                    var elapsedTimeStr;
                    const predRank = true;
                    
                    var numSplits;
					if (this.curClassSplits == null)
						numSplits = 0;
					else if (relay)
						numSplits = this.curClassSplits.length/2-1;
					else if (lapTimes)
						numSplits = (this.curClassSplits.length-1)/2;
					else
                        numSplits = this.curClassSplits.length;
                        
                    if (this.isMultiDayEvent){
                        var totalTimeCol = offset + numSplits*2 + (this.compactView ? 3 : 2);
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
                            if (numSplits==0 || (unranked && numSplits==1) ) // Single-result classes. Highlight whole line
                            {
                                var row = table.row(i).node();
                                highlight = false;
                                if (data[i].changed != "" && data[i].progress==100){ 
                                    age = timeServer - data[i].changed;
                                    highlight = (age < this.highTime);
                                }
                                if (highlight)
                                {
                                    if( !$(row).hasClass('red_row') && !$(row).hasClass('new_fnq') )
                                    {
                                        modifiedTable = true;
                                        if (data[i].DT_RowClass != undefined && (data[i].DT_RowClass == "firstnonqualifier" || data[i].DT_RowClass == "new_fnq"))
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
                                var splitRef = 0;
                                var colNum = 0;
                                // Highlight split times
                                for (var sp = 0; sp < numSplits; sp++){
                                    if (relay)
                                        splitRef = sp*2+1;
                                    else if (lapTimes)
                                        splitRef = sp*2;
                                    else
                                        splitRef = sp;
                                    colNum = offset + 2*sp;
                                    highlight = false;
                                    if (data[i].splits[this.curClassSplits[splitRef].code + "_changed"] != ""){
                                        age = timeServer - data[i].splits[this.curClassSplits[splitRef].code + "_changed"];
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
                                    if (this.compactView || relay || lapTimes)
                                    {
                                        if (!$( table.cell(i,(offset + numSplits*2)).node() ).hasClass('red_cell_sqr'))
                                        {
                                            modifiedTable = true;
                                            $( table.cell(i,(offset + numSplits*2)).node() ).addClass('red_cell_sqr');
                                            $( table.cell(i,(offset + numSplits*2 + 2)).node() ).addClass('red_cell');
                                            if (this.isMultiDayEvent)
                                            {
                                                $( table.cell(i,(offset + numSplits*2 + 3)).node() ).addClass('red_cell_sqr');
                                                $( table.cell(i,(offset + numSplits*2 + 5)).node() ).addClass('red_cell');
                                            }
                                        }
                                    }
                                    else
                                    {
                                        if (!$( table.cell(i,(offset + numSplits*2)).node() ).hasClass('red_cell'))
                                        {
                                            modifiedTable = true;
                                            $( table.cell(i,(offset + numSplits*2)).node() ).addClass('red_cell');
                                            if (this.isMultiDayEvent)
                                                $( table.cell(i,(offset + numSplits*2 + 2)).node() ).addClass('red_cell');
                                        }
                                    }
                                }
                                else // Not highlight
                                {	
                                    if (this.compactView || relay || lapTimes)
                                    {
                                        if ($( table.cell(i,(offset + numSplits*2)).node() ).hasClass('red_cell_sqr'))
                                        {
                                            modifiedTable = true;
                                            $( table.cell(i,(offset + numSplits*2)).node() ).removeClass('red_cell_sqr');
                                            $( table.cell(i,(offset + numSplits*2 + 2)).node() ).removeClass('red_cell');
                                            if (this.isMultiDayEvent)
                                            {
                                                $( table.cell(i,(offset + numSplits*2 + 3)).node() ).removeClass('red_cell_sqr');
                                                $( table.cell(i,(offset + numSplits*2 + 5)).node() ).removeClass('red_cell');
                                            }
                                        }
                                    }
                                    else
                                    {
                                        if ($( table.cell(i,(offset + numSplits*2)).node() ).hasClass('red_cell'))
                                        {
                                            modifiedTable = true;
                                            $( table.cell(i,(offset + numSplits*2)).node() ).removeClass('red_cell');
                                            if (this.isMultiDayEvent)
                                                $( table.cell(i,(offset + numSplits*2 + 2)).node() ).removeClass('red_cell');
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
                                if(this.isMultiDayEvent && (data[i].totalstatus == 10 || data[i].totalstatus == 9) && !unranked)
                                {
                                    var elapsedTotalTime = elapsedTime + data[i].totalresultSave;
                                    var elapsedTotalTimeStr = "<i>(" + this.formatTime(elapsedTotalTime, 0, false) + ")</i>";
                                    table.cell( i, totalTimeCol).data(elapsedTotalTimeStr);
                                }  

								elapsedTimeStr = (relay && !this.compactView ? "<br/><i>" : "<i>") + this.formatTime(elapsedTime, 0, false) + "</i>";
                                if (this.curClassSplits == null || this.curClassSplits.length == 0){
                                // No split controls
                                    if (!unranked)
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
                                            table.cell( i, 6 + MDoffset + (hasBibs? 1 : 0)).data(timeDiffStr);
									}
									table.cell( i, 4 + MDoffset + (hasBibs? 1 : 0)).data(elapsedTimeStr);
                                }
                                else{
                                // Have split controls. Find next split to reach
									var nextSplit = 0;
                                    var nextSplitRef = 0;
                                    for (var sp = this.curClassSplits.length - 1; sp >= 0; sp--) {
                                        if (!isNaN(parseInt(data[i].splits[this.curClassSplits[sp].code]))) {
											if (relay){
												nextSplit = sp/2;
												nextSplitRef = sp + 2;
											}
											else if (lapTimes){
												nextSplit = (sp+1)/2;
												nextSplitRef = sp + 2;
											}	
											else{
												nextSplit = sp + 1;
												nextSplitRef = sp + 1;
											}
                                            break;
                                        }
                                    }
									if (unranked){
										table.cell( i, offset + nextSplit*2 ).data(elapsedTimeStr);
										table.cell( i, offset + numSplits*2 ).data("<i>(..)<\i>");
									}
                                    else
                                    {
										if (this.curClassSplitsBests[nextSplitRef][0]==0)
										   timeDiffStr = "<i>(..)<\i>";
										else{
                                            if (relay)
                                            {
												timeDiff = time - this.curClassSplitsBests[nextSplitRef][0];
												rank = this.findRank(this.curClassSplitsBests[nextSplitRef],time);
											}
                                            else
                                            {
												timeDiff = elapsedTime - this.curClassSplitsBests[nextSplitRef][0];
                                                rank = this.findRank(this.curClassSplitsBests[nextSplitRef],elapsedTime);                                                                                                
											}
                                            
                                            var rankStr = "";
											if (rank > 1)
                                                rankStr = " <i>(" + rank + ")</i>";
                                            else
                                                rankStr = " <i>(..)</i>";											
											timeDiffStr = "<i>" + (timeDiff<0 ? "-" : "+") + this.formatTime(Math.abs(timeDiff), 0, false) + "</i>";
                                            if (nextSplit==numSplits)
												elapsedTimeStr += rankStr;
											else
                                                timeDiffStr += rankStr;
                                        }
										
										timeDiffCol = offset + nextSplit*2;
										if (nextSplit==numSplits) // Approach finish
											timeDiffCol += 2;
                                        
                                            // Display elapsed time
										if (!this.compactView && !relay && !lapTimes && nextSplit==numSplits)
                                            elapsedTimeStr += "<br/>" + timeDiffStr;                                      
										table.cell( i, offset + numSplits*2 ).data(elapsedTimeStr);
                                        // Display time diff
										if (this.compactView || relay || nextSplit!=numSplits || lapTimes)
                                            table.cell( i, timeDiffCol ).data(timeDiffStr);
                                        
                                        // Update predData: Insert current time if longer than a runner with larger index / virtual position
                                        const predOffset = 0;
                                        if (predRank && !relay && !lapTimes)
                                        {
                                            if (nextSplit == 0 && this.rankedStartlist)
                                                {   
                                                    tmpPredData[i].splits[this.curClassSplits[0].code] = elapsedTime - predOffset;
                                                    tmpPredData[i].progress = 100.0 * 1/(numSplits + 1);
                                                    tmpPredData[i].place = "";
                                                }
                                            else
                                            {
                                                for (var j = i+1; j < data.length; j++) 
                                                {                                                
                                                    if (data[j].status != 0 && data[j].status != 9 && data[j].status != 10)
                                                        break                                                
                                                    if (nextSplit == numSplits && data[j].status == 0 && elapsedTime - predOffset > parseInt(data[j].result))
                                                    {
                                                        tmpPredData[i].result = elapsedTime - predOffset;
                                                        tmpPredData[i].progress = 100;
                                                        tmpPredData[i].place = "p";
                                                        tmpPredData[i].status = 0;
                                                        break;
                                                    }
                                                    if (nextSplit < numSplits && parseInt(data[j].splits[this.curClassSplits[nextSplit].code]) > 0)
                                                    {
                                                        if (elapsedTime - predOffset > parseInt(data[j].splits[this.curClassSplits[nextSplit].code]))
                                                        {
                                                            tmpPredData[i].splits[this.curClassSplits[nextSplit].code] = elapsedTime - predOffset;
                                                            tmpPredData[i].progress = 100.0 * (nextSplit + 1) / (numSplits + 1);
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
                    if (predRank && !this.curClassIsMassStart && !relay && !unranked && !lapTimes)
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
          
            columns.push({ "sTitle": "O-brikke" , "sClass": "center" , "bSortable": false, "aTargets": [col++], "mDataProp": "ecard1",
                "render": function (data,type,row) 
                {
                    var bibStr = (row.bib == 0 ? "" : "(" + (row.bib < 0 ? (-row.bib/100|0) + "-" + (-row.bib%100) : row.bib ) + ") ");
                    var ecardStr = (row.ecard1 == 0 ? "-" : row.ecard1 );
                    var runnerName = bibStr + row.name;
                    var link = "<button style=\"width:50px\" onclick=\"res.popupDialog('" + runnerName + ". Endre o-brikke fra " 
                        + ecardStr + " til '," + row.dbid + ",0,1);\">"+ ecardStr +"</button>";						
                    return link;
                }});
            columns.push({ "sTitle": "emiTag" , "sClass": "center" , "bSortable": false, "aTargets": [col++], "mDataProp": "ecard2",
                "render": function (data,type,row) 
                {
                    var bibStr = (row.bib == 0 ? "" : "(" + (row.bib < 0 ? (-row.bib/100|0) + "-" + (-row.bib%100) : row.bib ) + ") ");
                    var ecardStr = (row.ecard2 == 0 ? "-" : row.ecard2 );
                    var runnerName = bibStr + row.name;
                    var link = "<button style=\"width:50px\" onclick=\"res.popupDialog('" + runnerName + ". Endre emiTag fra " 
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
        var shortClub = club.replace('Orienterings', 'O.');
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
                    this.updateResultVirtualPosition(newData.results);
                    this.predData = $.extend(true,[],newData.results);
                    if (this.qualLimits != null && this.qualLimits.length > 0)
                        this.updateQualLimMarks(newData.results, newData.className); 
                    this.updateClassSplitsBest(newData);
					this.currentTable.fnClearTable();
					this.currentTable.fnAddData(newData.results, true);
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
            if (this.updateAutomatically) {
                if (this.currentTable != null) {
                    $.ajax({
                        url: this.apiURL,
                        data: "comp=" + this.competitionId + "&method=getclubresults&unformattedTimes=true&club=" + encodeURIComponent(this.curClubName) + "&last_hash=" + this.lastClubHash + (this.isMultiDayEvent ? "&includetotal=true" : ""),
                        success: function (data,status,resp) {
                            var reqTime = new Date();
                            reqTime.setTime(new Date(resp.getResponseHeader("expires")).getTime() - _this.updateInterval);
                            _this.handleUpdateClubResults(data,reqTime); 
                        },
                        error: function () {
                            _this.resUpdateTimeout = setTimeout(function () {
                                _this.checkForClubUpdate();
                            }, _this.updateInterval);
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
                this.resUpdateTimeout = setTimeout(function () {_this.checkForClubUpdate();}, this.updateInterval);
        };	
		
		AjaxViewer.prototype.chooseClass = function (className) {
            if (className.length == 0)
				return;
			var _this = this;
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
                    this.curClassSplits = data.splitcontrols;
                    this.updateResultVirtualPosition(data.results);
                    this.predData = $.extend(true,[],data.results);
                    if (this.qualLimits != null && this.qualLimits.length > 0)
						this.updateQualLimMarks(data.results, data.className);
                    this.updateClassSplitsBest(data);
                    var numberOfRunners = data.results.length;
                    $('#numberOfRunners').html(numberOfRunners);
                    
                    var columns = Array();
                    var col = 0;
                    var i;
					fullView = !this.compactView;
                    var unranked = !(this.curClassSplits.every(function check(el) {return el.code != "-999";})) || 
                                   !(data.results.every(function check(el) {return el.status != 13;}));
                    var relay = (haveSplitControls && (this.curClassSplits[0].code == "0" || data.className.slice(-4) == "-All"));
                    var lapTimes = (haveSplitControls && this.curClassSplits[0].code != "0" && this.curClassSplits[this.curClassSplits.length - 1].code == "999");
                    var hasBibs = (data.results[0].bib != undefined && data.results[0].bib != 0);

                    columns.push({
                        "sTitle": "#",
						"responsivePriority": 1,
						"sClass": "right",
                        "bSortable": false,
                        "aTargets": [col++],
                        "mDataProp": "place"
                    });
                    
                    if (!(haveSplitControls || _this.isMultiDayEvent)|| unranked || (!fullView && !lapTimes))
                        columns.push({
                            "sTitle": this.resources["_NAME"],
						    "responsivePriority": 1,
                            "sClass": "left",
                            "bSortable": false,
                            "aTargets": [col++],
                            "mDataProp": "name",
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
                        "sTitle": ((haveSplitControls || _this.isMultiDayEvent) && !unranked && (fullView || lapTimes)) ? this.resources["_NAME"] + " / " + this.resources["_CLUB"] : this.resources["_CLUB"],
                        "sClass": "left",
						"responsivePriority": ((haveSplitControls|| _this.isMultiDayEvent) && !unranked && (fullView || lapTimes)) ? 1 : 10000,
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
                            var link = "<a href=\"javascript:LiveResults.Instance.viewClubResults('" + param + "')\">" + clubShort + "</a>";
                            if ((haveSplitControls || _this.isMultiDayEvent) && !unranked && (fullView || lapTimes))
                            {
                                if (row.name.length>_this.maxNameLength)
                                        return _this.nameShort(row.name) + "<br/>" + link;
                                    else
                                        return row.name + "<br/>" + link;
                            }
                            else
                                return link;
                        }
                    });
                    
                    if (hasBibs)
                    {
                        columns.push({
                            "sTitle": "&#8470;&nbsp;&nbsp;",
						    "responsivePriority": 1,
						    "sClass": "right",
                            "bSortable": true,
                            "aTargets": [col++],
                            "mDataProp": "bib",
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
									if (row.splits["0_place"] == 1)									
										txt += "<span class=\"besttime\">" +_this.formatTime(row.start, 0, false, true, true)+ " (1)<\span>";
									else if (row.splits["0_place"] > 1)
										txt += _this.formatTime(row.start, 0, false, true, true) + " (" + row.splits["0_place"] + ")";
									else
										txt += _this.formatTime(row.start, 0, false, true, true); 
                                    if (fullView)
                                    {
                                        if (row.splits["0_place"] == 1)
                                            txt += "<br /><span class=\"besttime\">-" + _this.formatTime(-row.splits["0_timeplus"], 0, _this.showTenthOfSecond) + "</span>";
                                        else
                                            txt += "<br /><span>+" + _this.formatTime(row.splits["0_timeplus"], 0, _this.showTenthOfSecond) + "</span>";
                                    }
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
						if (value.code != 0 && value.code != 999 && !((relay || lapTimes) && value.code>100000)) // Code = 0 for exchange, 999 for leg time, 100000+ for leg passing
                            {
                                columns.push(
                                    {
                                        "sTitle": value.name + "&nbsp;&nbsp;",
										"responsivePriority": 100,
                                        "sClass": "right",
										"bSortable": !unranked,
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
                                                if ((!fullView || relay) && (row.splits[value.code + "_place"] != 1) && !unranked && !lapTimes && (value.code > 0)) 
											    // Compact view or relay view, all but first place
                                                {
                                                    txt += "<div class=\"tooltip\">+" + _this.formatTime(row.splits[value.code + "_timeplus"], 0, _this.showTenthOfSecond) + " (" + row.splits[value.code + "_place"] + ")<span class=\"tooltiptext\">" + _this.formatTime(row.splits[value.code], 0, _this.showTenthOfSecond) + "</span></div>";
                                                }
                                                else 
											    // Ordinary passing or first place at passing for relay (drop place if code is negative - unranked)
                                                {
													if (row.splits[value.code + "_place"] == 1)
														txt += "<span class=\"besttime\">";
													else
														txt += "<span>";
                                                    txt += _this.formatTime(row.splits[value.code], 0, _this.showTenthOfSecond);
                                                    if (value.code > 0) 
                                                        txt += " (" + row.splits[value.code + "_place"] + ")</span>";
                                                }
												// Second line
                                                if ((fullView && relay || lapTimes) && (row.splits[(value.code + 100000) + "_timeplus"] != undefined))
                                                // Relay passing, second line with leg time to passing 
                                                {
                                                    txt += "<br/><span class="
                                                    if (row.splits[(value.code + 100000) + "_place"] == 1)
                                                        txt += "\"besttime\">";
                                                    else
                                                        txt += "\"legtime\">";
                                                    txt += _this.formatTime(row.splits[(value.code + 100000)], 0, _this.showTenthOfSecond)
                                                        + " (" + row.splits[(value.code + 100000) + "_place"] + ")</span>";
                                                }
                                                else if ((row.splits[value.code + "_timeplus"] != undefined) && fullView && !relay && (value.code > 0))
												// Second line for ordinary passing (drop if code is negative - unranked)
                                                {
                                                    if (row.splits[value.code + "_place"] == 1)
                                                       txt += "<br/><span class=\"besttime\">-" 
                                                           + _this.formatTime(-row.splits[value.code + "_timeplus"], 0, _this.showTenthOfSecond) + "</span>";
                                                    else
                                                       txt += "<br/><span class=\"plustime\">+" 
                                                           + _this.formatTime(row.splits[value.code + "_timeplus"], 0, _this.showTenthOfSecond) + "</span>";
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
                                if ((haveSplitControls || _this.isMultiDayEvent) && fullView && !(relay) && !(lapTimes) && row.status == 0)
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
							if (haveSplitControls && (fullView && relay || lapTimes) && (row.splits["999_place"] != undefined))
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
                    if (!(haveSplitControls || _this.isMultiDayEvent) || !fullView || lapTimes) {
                        columns.push({
                            "sTitle": "&nbsp;&nbsp;&nbsp;&nbsp;",
                            "bVisible": !unranked,
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
						if (relay && fullView){
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
                            if (unranked || (this.compactView && !lapTimes)) // Club and bib col 
                                clubBibWidth = 9 + parseInt($('#' + this.resultsDiv +' thead th:eq(2)').css('width'))
                                    + (hasBibs? 9 + parseInt($('#' + this.resultsDiv +' thead th:eq(3)').css('width')) : 0); 
                            else // Bib col
                                clubBibWidth = (hasBibs? 9 + parseInt($('#' + this.resultsDiv +' thead th:eq(2)').css('width')) : 0); 

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
                    var hasBibs = (data.results[0].bib != undefined);
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
                    columns.push({ "sTitle": "&#8470;&nbsp;&nbsp;", "sClass": "right", "aTargets": [col++], "mDataProp": (hasBibs ? "bib" : null),
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
                    columns.push({ "sTitle": "bibSortable", "bVisible": false, "mDataProp": (hasBibs ? "bib" : null), "aTargets": [col++], "render": function (data,type,row) {
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