var Messages;
(function (Messages) {
    // ReSharper disable once InconsistentNaming
    Messages.Instance = null;
    var AjaxViewer = /** @class */ (function () {
        function AjaxViewer(competitionId) {
            var _this = this;
            this.local = true;
            this.competitionId = competitionId;
            this.compname = "";
            this.radioUpdateInterval = 5000;
            this.lastRadioPassingsUpdateHash = "";
            this.currentTable = null;
            this.radioData = null;
            this.showAllMessages = false;
            this.newMessageAudio = new Audio(src="images/newmessage.ogg");
            this.audioMute = true;
            this.lastNumberOfMessages = null;
            this.browserType = this.isMobile(); // 1:Mobile, 2:iPad, 3:PC and other
            this.maxNameLength = (this.browserType == 1 ? 15 : (this.browserType == 2 ? 22 : 30));
            this.maxClubLength = (this.browserType == 1 ? 12 : (this.browserType == 2 ? 15 : 20));
            this.URL = (this.local ? "api/messageapi.php" : "//api.freidig.idrett.no/messageapi.php");
            Messages.Instance = this;
        }
            
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
        
        //Request data for messages
        AjaxViewer.prototype.updateMessages = function () {
            var _this = this;
            $.ajax({
                url: this.URL,
                data: "comp=" + this.competitionId + "&method=getmessages&last_hash=" + this.lastRadioPassingsUpdateHash,
                success: function (data,status,resp) {
                    _this.handleUpdateMessages(data); },
                error: function () {
                    _this.radioPassingsUpdateTimer = setTimeout(function () {
                        _this.updateMessages();
                    }, _this.radioUpdateInterval);
                },
                dataType: "json"                   
            });
            clearTimeout(this.radioPassingsUpdateTimer);
            this.radioPassingsUpdateTimer = setTimeout(function () { _this.updateMessages();}, this.radioUpdateInterval);
        };
        
        //Handle response for updating the last radio passings..
        AjaxViewer.prototype.handleUpdateMessages = function (data) {
            // Make live blinker pulsingtoLocaleTimeString
            var el = document.getElementById('liveIndicator');
                el.style.animation = 'none';
                el.offsetHeight; /* trigger reflow */
                el.style.animation = null; 
            var _this = this;
                 
            // Insert data from query
            if (data != null && data.status == "OK" && data.messages != null) 
            {
                this.radioData = data.messages;
                this.lastRadioPassingsUpdateHash = data.hash;
                
                if (this.lastNumberOfMessages == null)
                    this.lastNumberOfMessages = this.radioData.length;
                else if (this.radioData.length > this.lastNumberOfMessages)
                {
                    this.lastNumberOfMessages = this.radioData.length;
                    if (!this.audioMute)
                        this.newMessageAudio.play();
                }
						
                // Existing datatable
                if (this.currentTable != null) 
                {
                    this.currentTable.fnClearTable();
                    this.currentTable.fnAddData(this.radioData, true);
                    this.filterTable();
                }
                
                // New datatable
                else 
                {
                    if (this.radioData.length==0) return;
                    var columns = Array();
                    var col = 0;
                    
                    columns.push({ "sTitle": "GroupTime", "bVisible": false, "sClass": "left", "bSortable": true, "aTargets": [col++], "mDataProp": "groupchanged",
                        "render": function (data,type,row) {
                          return data;
                    }});
                    columns.push({ "sTitle": "Time", "bVisible": false, "sClass": "left", "bSortable": true, "aTargets": [col++], "mDataProp": "changed",
                        "render": function (data,type,row) {
                          return data;
                    }});

                    columns.push({ "sTitle": "&#8470;", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "bib",
                        "render": function (data,type,row) {
                            if (type === 'display')
                            {
                                if (data<0) // Relay
                                    return  "(" + (-data/100|0) + "-" + (-data%100) + ")";
                                else if (data>0)    // Ordinary
                                    return "("  + data + ")";
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
                            var ret = "";
                            if (data.length>_this.maxNameLength)
                                ret += _this.nameShort(data);
                            else
                                ret += data;
                            return "<div class=\"wrapok\"><a href=\"javascript:;\" onclick=\"mess.popupDialog('" + row.name + "'," + row.dbid + ")\">" + ret + "</a></div>";
                        }
                        else
                            return data;
                        }});
                    columns.push({ "sTitle": "Klubb", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "club",
                        "render": function (data,type,row) {
                        if (type === 'display')
                        {
                            if (data.length>_this.maxClubLength)
                                return _this.clubShort(data);
                            else
                                return data;
                        }
                        else
                            return data;        
                        }});
                    columns.push({ "sTitle": "Klasse", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "class"});
                    
                    columns.push({ "sTitle": "Brikke" , "sClass": "left" , "bSortable": false, "aTargets": [col++], "mDataProp": "ecard1", 
                        "render": function (data,type,row) {
                            var ecardstr = "";
                            if (row.ecard1>0) {
                                ecardstr = row.ecard1;
                                if (row.ecard2>0) ecardstr += " " + row.ecard2;}
                            else
                                if (row.ecard2>0) ecardstr = row.ecard2;
                            return "<div class=\"wrapok\">" + ecardstr + "</div>";
                        }});
                    
                    columns.push({ "sTitle": "Start", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "start"});
                    
                    columns.push({ "sTitle": "Status", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "status",
                            "render": function (data,type,row) {
                                if (data == 10)
                                    return "Påmeldt";
                                else if (data == 9)
                                    return "Startet";
                                else
                                    return "";
                            }});
                    
                    columns.push({ "sTitle": "Tidsp.", "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "changed",
                            "render": function (data,type,row) {
                            if (type === 'display')
                                return "<div class=\"tooltip\">" + data.substring(11,19) + "<span class=\"tooltiptext\">" + data.substring(2,10) + "</span></div>";
                            else
                                return data;
                        }});
    
                    var messageTitle = "Melding <a href=\"javascript:;\" onclick=\"mess.popupDialog('Generell melding',0)\">(generell)</a>";
                    columns.push({ "sTitle": messageTitle, "sClass": "left", "bSortable": false, "aTargets": [col++], "mDataProp": "message",
                        "render": function (data,type,row) {
                                return ("<div class=\"wrapok\">" + data + "</div>");
                            }});
 
                    columns.push({ "sTitle": "Utført", "sClass": "center", "bSortable": false, "aTargets": [col++], "mDataProp": "completed",
                        "render": function(data, type, row) {
                            if (data == 1 )
                                return '<input type="checkbox" onclick="mess.setMessageCompleted(' + row.messid + ',0);" checked>';
                            else
                                return '<input type="checkbox" onclick="mess.setMessageCompleted(' + row.messid + ',1);">';
                        }});

                    this.currentTable = $('#divMessages').dataTable({
                        "bPaginate": false,
                        "bLengthChange": false,
                        "bFilter": true,
                        "dom": 'lrtip',
                        "bSort": true,
                        "bInfo": false,
                        "bAutoWidth": false,
                        "aaData": this.radioData,
                        "aaSorting": [[0, "desc"],[1, "desc"]],
                        "aoColumnDefs": columns,
                        "bDestroy": true,
                        "orderCellsTop": true
                        });
                    
                };
                this.updateMessageMarking();            
            };
        };

    // Update markings and visibility
    AjaxViewer.prototype.updateMessageMarking = function () 
    {
        if (this.currentTable != null )
        {
            _this = this;
            var table = this.currentTable.api();
            var data = this.currentTable.fnGetData();
            var lastID = null;

            table.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
                var data = this.data();
                if (data.completed)
                {
                    $( table.cell(rowIdx,9).node() ).addClass('green_cell');
                    $( table.cell(rowIdx,10).node() ).addClass('green_cell');
                }
                else
                {
                    $( table.cell(rowIdx,9).node() ).addClass('yellow_cell');
                    $( table.cell(rowIdx,10).node() ).addClass('yellow_cell');
                }

                if (!_this.showAllMessages && data.groupcompleted)
                    $(table.row(rowIdx).node()).hide();
                else
                    $(table.row(rowIdx).node()).show();
                
                if (data.dbid != lastID)
                    $(table.row(rowIdx).node()).addClass('firstnonqualifier');
                lastID =  data.dbid;

            } );
        };
    } 

    // Set message completed status
    AjaxViewer.prototype.setMessageCompleted = function (messid,completed) 
    {
        _this = this;
        $.ajax({
                url: this.URL + "?method=setmessagecompleted", 
                data: "&messid=" + messid + "&completed=" + completed,
                success: function() {_this.updateMessages();}
                });
    }

    // Set message dns status
    AjaxViewer.prototype.setMessageDNS = function (messid,dns) 
    {
        var _this = this;
        var ret = $.ajax({
                url: _this.URL + "?method=setmessagedns",
                data: "&messid=" + messid + "&dns=" + dns,
                success: function() {_this.updateMessages();}
                });
    }

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
        table.search($('#filterText')[0].value).draw()
    };
		
    //Popup window for messages to message center
    AjaxViewer.prototype.popupDialog = function (promptText,dbid) {
        var defaultText ="";
        var message = prompt(promptText, defaultText);
        if (message != null && message != "")
        {
            message = message.substring(0,250);
            $.ajax({
                url: this.URL + "?method=sendmessage", 
                data: "&comp=" + this.competitionId + "&dbid=" + dbid + "&message=" + message
                }
            );
            this.updateMessages();
        }
    };
        
    // ReSharper disable once InconsistentNaming
    AjaxViewer.VERSION = "2016-08-06-01";
    return AjaxViewer;
}());
    
Messages.AjaxViewer = AjaxViewer;
})(Messages || (Messages = {}));



