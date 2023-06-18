<?php

include_once("templates/emmalang_en.php");
include_once("templates/classEmma.class.php");
header('Content-Type: text/html; charset='.$CHARSET);

$currentComp = new Emma($_GET['comp']);

echo("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head><title>LiveRes Radio Control Editor :: <?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</title>

<META HTTP-EQUIV="expires" CONTENT="-1">
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#555556">
<link rel="stylesheet" type="text/css" href="css/style-freidig.css">
<link rel="stylesheet" type="text/css" href="css/ui-darkness/jquery-ui-1.8.19.custom.css">
<link rel="stylesheet" type="text/css" href="css/jquery.dataTables_themeroller-eoc.css">
<link rel="stylesheet" type="text/css" href="css/jquery.prompt.css">

<script language="javascript" type="text/javascript" src="js/jquery-1.8.0.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.prompt.js"></script>
<script language="javascript" type="text/javascript" src="js/FileSaver.js"></script>
<script language="javascript" type="text/javascript" src="js/liveresults.js"></script> 
<script language="javascript" type="text/javascript">

var res = null;
this.codes = null;

$(document).ready(function()
{
	loadControls(<?= $_GET['comp']?>)
});

loadControls = function(comp) {
  $('#radiocontrols').html('');
  $.ajax({
    url: "/api/api.php",  data: "comp=" + comp + "&method=getsplitcontrols",
    success: function (data, status, resp) { updateControlTable(data,comp); },
    dataType: "json"
  });
};

deleteControl = function (comp, code, className, cell) 
{
  var ret = $.ajax({
          url: "/api/api.php?method=deleteradiocontrol",
          data: "comp=" + comp + "&code=" + code + "&classname=" + className, 
          success: function() {}
  });

  const rowIndex = cell.parentNode.parentNode.rowIndex;
  const colIndex = cell.parentNode.cellIndex;

  var table = this.currentTable.api();
  table.cell(rowIndex-1, colIndex).data("");
}

addControl = function (comp, cell, id) 
{  
  const rowIndex = cell.parentNode.parentNode.rowIndex;
  const colIndex = cell.parentNode.cellIndex;
  var data = this.currentTable.fnGetData();
  var className = data[rowIndex-1].className;
  var code = this.codes[colIndex-1];
  var name = id.value;
  
  var ret = $.ajax({
          url: "/api/api.php?method=addradiocontrol",
          data: "comp=" + comp + "&code=" + code + "&classname=" + className + "&name=" + name, 
          success: function() { loadControls(comp); }
  });

}

addControlForAllClasses = function (comp, idcode, idorder, idname) 
{  
  var code = idcode.value;
  var order = idorder.value;
  var name = idname.value;
  
  var ret = $.ajax({
          url: "/api/api.php?method=addradiocontrolforallclasses",
          data: "comp=" + comp + "&code=" + code + "&order=" + order + "&name=" + name, 
          success: function() { loadControls(comp); }
  });
}


updateControlTable = function(data, comp){
    if (data != null && data.status == "OK" && data.splitcontrols != null) 
    {
        var uniqueCodes = new Set();
        // Iterate over the splitcontrols array
        data.splitcontrols.forEach(function(splitcontrol) {
          var code = splitcontrol.code;
          uniqueCodes.add(code);
        });
        var codes = Array.from(uniqueCodes);
        codes.sort(function(a,b) {
          if (a%1000 == b%1000)
            return a - b
          else
            return a%1000 - b%1000
        })
        this.codes = codes;

        var codeArray = [];        
        data.splitcontrols.forEach(function(splitcontrol) {
          var className = splitcontrol.class;
          var code = splitcontrol.code;
          var order = splitcontrol.order;
          var name = splitcontrol.name;

          var existingRow = codeArray.find(function(row) {
            return row.className === className;
          });

          if (!existingRow) {
            existingRow = { className: className };
            codeArray.push(existingRow);
          }
          existingRow[code] = {
            code : code,
            order : order, 
            name: name};
        });

        codeArray.sort(function(a, b) {
          var classNameA = a.className.toLowerCase();
          var classNameB = b.className.toLowerCase();            
          if (classNameA < classNameB)
            return -1;
          if (classNameA > classNameB) 
            return 1;
          return 0;
        });

        var columns = Array();
        var col = 0;
      
        columns.push({ "sTitle": "Class", "sClass": "left", "bSortable": true, "aTargets": [col++], "mDataProp": "className",
            "render": function (data,type,row) {
              return "<b>" + data + "</b>";
            }  
          });
        
        for (let i in codes) 
        {
          const controlCode = codes[i]%1000;
          const title = `Control: ${controlCode}<br>Code: ${codes[i]}`;

          columns.push({ "sTitle": title, "sClass": "right", "bSortable": true, "aTargets": [col++], "mDataProp": codes[i],
            "render": function (data,type,row) {
              if (data != undefined && data != "")
              {
                const link = `<a onclick="deleteControl(${comp}, ${data.code}, '${row.className}', this)" href="#"><small> -</small></a>`;
                return `${data.name} <small>|${data.order}|</small> ${link}`;
                // &#9940;
              }
              else
              {
                const id = "id" + Math.random().toString(16).slice(2);
                const link = `<input type="text" id=${id} style="width: 50px;"><a onclick="addControl(${comp}, this, ${id})" href="#"><small>+</small></a>`;
                return link;
              }
            }  
          });
        };
        
        const idcode = "id" + Math.random().toString(16).slice(2);
        const idorder = "id" + Math.random().toString(16).slice(2);
        const idname = "id" + Math.random().toString(16).slice(2);

        var addNewTitle = `Code: <input type="text" id=${idcode} style="width: 50px;">`
                        + `<br>Order: <input type="text" id=${idorder} style="width: 50px;">`
                        + `<br><a onclick="addControlForAllClasses(${comp}, ${idcode}, ${idorder}, ${idname})" href="#"><small>+</small></a>`
                        + `Name: <input type="text" id=${idname} style="width: 50px;">`;
        
        columns.push({ "sTitle": addNewTitle, "sClass": "right", "bSortable": true, "aTargets": [col++], "mDataProp": "",
            "render": function (data,type,row) {
              return "";
            }  
          });
        
        this.currentTable = $('#radiocontrols').dataTable({
            "bPaginate": false,
            "bLengthChange": false,
            "bFilter": true,
            "dom": 'lrtip',
            "bSort": false,
            "bInfo": false,
            "bAutoWidth": false,
            "aaData": codeArray,
            "aaSorting": [],
            "aoColumnDefs": columns,
            "bDestroy": true,
            "orderCellsTop": true
            });                   
      };
}

</script>
</head>
<body>
	<table style="width:100%; table-layout=fixed" cellpadding="0" cellspacing="3" border="0">
	<tr><td width="100%"></td></tr>
	<tr valign=top>
	<td> 
	  <table width="100%" cellpadding="3px" cellspacing="0px" border="0" >
		  <tr valign=top><tr><td><table id="radiocontrols"></table></td></tr>
	  </table>
  </td> 
  </table>
</body>
</html>