<?php
date_default_timezone_set("Europe/Oslo");
$lang = "no";

if (isset($_GET['lang']))
 $lang = $_GET['lang'];

include_once("../templates/emmalang_en.php");
include_once("../templates/emmalang_$lang.php");
header('Content-Type: text/html; charset=utf-8');

$currentCompNo = $_GET['comp'];
$url = "https://liveresultat.orientering.se/api.php?method=getcompetitioninfo&comp=".$currentCompNo;
$json = file_get_contents($url);
$json = preg_replace('/[[:cntrl:]]/', '', $json);
$currentComp = json_decode($json, true);
$compName = $currentComp["name"];
$compDate = $currentComp["date"];
$compTimeDiff = $currentComp["timediff"];
$isSingleClass = isset($_GET['class']);
$isSingleClub = isset($_GET['club']);
$setFullView = isset($_GET['fullview']);
$setNotScroll = isset($_GET['notscroll']);
$beta = isset($_GET['beta']);
$showPath = true;

if (isset($_GET['showpath']) && $_GET['showpath'] == "false")
  $showPath = false;

$singleClass = "";
$singleClub = "";
if ($isSingleClass)
	$singleClass = $_GET['class'];
if ($isSingleClub)
	$singleClub = rawurldecode($_GET['club']);

$showLastPassings = !($isSingleClass || $isSingleClub) || (isset($_GET['showLastPassings']) && $_GET['showLastPassings'] == "true");
$RunnerStatus = Array("1" =>  $_STATUSDNS, "2" => $_STATUSDNF, "11" =>  $_STATUSWO, "12" => $_STATUSMOVEDUP, "9" => $_STATUSNOTSTARTED,"0" => $_STATUSOK, "3" => $_STATUSMP, "4" => $_STATUSDSQ, "5" => $_STATUSOT, "9" => "", "10" => "", "6" => $_STATUSNC);

$showTimePrediction = true;

echo("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
<html>
<base href="../">
<head><title><?=$_TITLE?> :: <?=$compName?> [<?=$compDate?>]</title>

<META HTTP-EQUIV="expires" CONTENT="-1">
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#555556">
<link rel="stylesheet" type="text/css" href="css/style-freidig.css">
<link rel="stylesheet" type="text/css" href="css/ui-darkness/jquery-ui-1.8.19.custom.css">
<link rel="stylesheet" type="text/css" href="css/jquery.dataTables_themeroller-eoc.css">
<link rel="stylesheet" type="text/css" href="css/responsive.dataTables.css">
<link rel="stylesheet" type="text/css" href="css/fixedColumns.dataTables.min.css">
<link rel="stylesheet" type="text/css" href="css/jquery-ui.css">

<script language="javascript" type="text/javascript" src="js/jquery-1.8.0.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery-ui.min.js"></script>
<script language="javascript" type="text/javascript" src="js/dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/dataTables.responsive.js"></script>
<script language="javascript" type="text/javascript" src="js/dataTables.fixedColumns.min.js"></script>
<script language="javascript" type="text/javascript" src="js/velocity.min.js"></script>
<?php if ($beta){?>
	<script language="javascript" type="text/javascript" src="js/liveresults_beta.js"></script> 
<?php } else {?>
	<script language="javascript" type="text/javascript" src="js/liveresults.js"></script> 
<?php }?>
<script language="javascript" type="text/javascript" src="js/NoSleep.min.js"></script>
<script language="javascript" type="text/javascript">

var noSleep = new NoSleep();

function enableNoSleep() {
  noSleep.enable();
  document.removeEventListener('click', enableNoSleep, false);
}
document.addEventListener('click', enableNoSleep, false);

var res = null;
var Resources = {
	_TITLE: "<?= $_TITLE?>",
	_CHOOSECMP: "<?=$_CHOOSECMP?>",
	_AUTOUPDATE: "<?=$_AUTOUPDATE?>",
	_LASTPASSINGS: "<?=$_LASTPASSINGS?>",
	_LASTPASSFINISHED: "<?=$_LASTPASSFINISHED?>",
	_LASTPASSPASSED: "<?=$_LASTPASSPASSED?>",
	_LASTPASSWITHTIME: "<?=$_LASTPASSWITHTIME?>",
	_CHOOSECLASS: "<?=$_CHOOSECLASS?>",
	_NOCLASSESYET: "<?=$_NOCLASSESYET?>",
	_CONTROLFINISH: "<?=$_CONTROLFINISH?>",
	_NAME: "<?=$_NAME?>",
	_CLUB: "<?=$_CLUB?>",
	_TIME: "<?=$_TIME?>",
	_NOCLASSCHOSEN: "<?=$_NOCLASSCHOSEN?>",
	_HELPREDRESULTS: "<?=$_HELPREDRESULTS?>",
	_NOTICE: "<?=$_NOTICE?>",
	_STATUSDNS: "<?=$_STATUSDNS ?>",
	_STATUSDNF: "<?=$_STATUSDNF?>",
	_STATUSWO: "<?=$_STATUSWO?>",
	_STATUSMOVEDUP: "<?=$_STATUSMOVEDUP?>",
	_STATUSNOTSTARTED: "<?=$_STATUSNOTSTARTED?>",
	_STATUSOK: "<?=$_STATUSOK ?>",
	_STATUSMP: "<?=$_STATUSMP ?>",
	_STATUSDSQ: "<?=$_STATUSDSQ?>",
	_STATUSOT: "<?=$_STATUSOT?>",
	_STATUSNC: "<?=$_STATUSNC?>",
	_FIRSTPAGECHOOSE: "<?=$_FIRSTPAGECHOOSE ?>",
	_FIRSTPAGEARCHIVE: "<?=$_FIRSTPAGEARCHIVE?>",
	_LOADINGRESULTS: "<?=$_LOADINGRESULTS ?>",
	_ON: "<?=$_ON ?>",
	_OFF: "<?=$_OFF?>",
	_TEXTSIZE: "<?=$_TEXTSIZE ?>",
	_LARGER: "<?=$_LARGER?>",
	_SMALLER: "<?=$_SMALLER?>",
	_OPENINNEW: "<?=$_OPENINNEW?>",
	_FORORGANIZERS: "<?=$_FORORGANIZERS ?>",
	_FORDEVELOPERS: "<?=$_FORDEVELOPERS ?>",
	_RESETTODEFAULT: "<?=$_RESETTODEFAULT?>",
	_OPENINNEWWINDOW: "<?=$_OPENINNEWWINDOW?>",
	_INSTRUCTIONSHELP: "<?=$_INSTRUCTIONSHELP?>",
	_LOADINGCLASSES: "<?=$_LOADINGCLASSES ?>",
	_START: "<?=$_START?>",
	_TOTAL: "<?=$_TOTAL?>",
	_CLASS: "<?=$_CLASS?>"
};

var runnerStatus = Array();
runnerStatus[0]  = "<?=$_STATUSOK?>";
runnerStatus[1]  = "<?=$_STATUSDNS?>";
runnerStatus[2]  = "<?=$_STATUSDNF?>";
runnerStatus[3]  = "<?=$_STATUSMP?>";
runnerStatus[4]  = "<?=$_STATUSDSQ?>";
runnerStatus[5]  = "<?=$_STATUSOT?>";
runnerStatus[6]  = "<?=$_STATUSNC?>";
runnerStatus[9]  = "";
runnerStatus[10]  = "";
runnerStatus[11] =  "<?=$_STATUSWO?>";
runnerStatus[12] = "<?=$_STATUSMOVEDUP?>";
runnerStatus[13] = "<?=$_STATUSFINISHED?>";

var sideBar = true;
var topBar = false;

$(document).ready(function()
{
	
	res = new LiveResults.AjaxViewer(<?= $_GET['comp']?>,"<?= $lang?>","divClasses","divLastPassings","resultsHeader",
  "resultsControls","divResults","txtResetSorting",Resources,"false",
  <?= (($isSingleClass || $isSingleClub) ? "true": "false")?>,"setAutomaticUpdateText","setCompactViewText", 
  runnerStatus, false, "", true);
  res.rankedStartlist = false;
	<?php if ($isSingleClass){?>
		res.chooseClass('<?=$singleClass?>');
	<?php }
	else if ($isSingleClub)
	{?>
		res.viewClubResults('<?=$singleClub?>');
	<?php }
		else
	{?>
		$("#divClasses").html("<?=$_LOADINGCLASSES?>...");
    res.updateClassList();
	<?php }?>

    <?php if ($showLastPassings){?>
		res.updateLastPassings();
	<?php }?>
	
	<?php if ($showTimePrediction){ ?>
	  res.compDate = "<?=$compDate?>";
		res.eventTimeZoneDiff = <?=$compTimeDiff?>;
		res.startPredictionUpdate();
	<?php }?>

	// Insert comp name
	var compName = "<?=$compName?>";
	compName = compName.substring(0,  (res.browserType == 1 ? 20 : 60) )
	$("#compname").html(compName);

	// Turn off scroll view
	<?php if ($setNotScroll){?>
		res.setScrollView(false); <?php }?>
		
	// Check for mobile and close top if mobile is detected
	var isMobile = res.isMobile();
	if (isMobile)
			closeTop();
		else
		{
			document.getElementById("switchTopClick").classList.toggle("change");
			$("#topBar").height('auto');
			topBar = true;
		}
		
		document.getElementById("switchNavClick").classList.toggle("change");

	loadFontSize();

	// Add function for dropdown list
	window.onclick = function(event) {
  	if (!event.target.matches('.dropbtn')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
    	var openDropdown = dropdowns[i];
    	if (openDropdown.classList.contains('show')) {
        	openDropdown.classList.remove('show');
      }
    }
  }
}

});

function loadFontSize() {
	if (typeof(Storage) !== "undefined") {
    var size = localStorage.getItem("fontSize");
    if (size>0)
      $("td").css("font-size",size + "px");
  }	
}

function changeFontSize(val) {
	var size = $("td").css("font-size");
	var newSize = parseInt(size.replace(/px/, "")) + val;
	$("td").css("font-size",newSize + "px");
  if (typeof(Storage) !== "undefined")
    localStorage.setItem("fontSize",newSize);
  $('#divResults').DataTable().columns.adjust().responsive.recalc();
}

function switchNav() {
  if (sideBar)
	  closeNav();
  else
	  openNav();
}

function switchTop() {
  if (topBar)
	  closeTop();
  else
	  openTop();
}

function openNav() {
  if(res.currentTable != null && res.curClassName != "plainresults" && res.curClassName != "startlist")
  {
    $(".firstCol").width("6em");  
    $('#divResults').DataTable().columns.adjust().responsive.recalc();
	  $(".firstCol").width("0px");  
  }
  $(".firstCol").animate({'width':'6em'},300);
  $("#navLR").html("←");
  sideBar = true;
}

function closeNav() {
  if(res.currentTable != null)
  {
		$(".firstCol").width("0px");  
		$('#divResults').DataTable().columns.adjust().responsive.recalc();
		$(".firstCol").width("6em");  
  }
  $(".firstCol").animate({'width':'0px'},300);
  $("#navLR").html("→");
  sideBar = false;	
}

function openTop() {
	$("#topBar").height('auto');
	var height = $("#topBar").height();
	$("#topBar").height(0);
	$("#topBar").animate({'height': height},300);
	$("#navUD").html("↑");
  topBar = true;
  res.autoUpdateLastPassings = true;
  res.updateLastPassings();
}

function closeTop() {
  $("#topBar").animate({'height':'0px'},300);  
  topBar = false;
  res.autoUpdateLastPassings = false;
  $("#navUD").html("↓") 
}
</script>
</head>
<body>
<!-- MAIN DIV -->
<div id="main">
<?php if (!$isSingleClass && !$isSingleClub) {?>
  <table style="width:100%; table-layout:fixed;" cellpadding="0" cellspacing="3" border="0">
    <tr>
      <td class="firstCol"></td>
      <td width="100%"></td>
    </tr>
    <tr valign="top">
      <td colspan="2" align="center">
      <div id="topBar" style="overflow: hidden">
        <table border="0" cellpadding="3px" cellspacing="0" width="100%" style="background-color:#555555; padding: 5px">
		    <tr>
          <td valign="top"><span style="color:#FFF; text-decoration: none; font-size: 1em;"><b><?=$_LASTPASSINGS?></b><br><div id="divLastPassings"></div></span></td>
        </tr>
      </table>
      </div>
      </td>
    </tr>

    <tr valign="top" style="background-color:#555555; color:#FFF">
      <td class="firstCol">
        <table border="0" cellpadding="3 px" cellspacing="0">
          <tr>
            <td align="left"><?=$_CHOOSECLASS?></td>
          </tr>
	      </table>
      </td>
      <td width="100%">
        <table border="0" cellpadding="3 px" cellspacing="0" width="100%" style="table-layout:fixed;">
	        <tr>
          <td align="left">
	            <button id="switchNavClick" class="navbtn" onclick="switchNav()"><span id="navLR">←</span></button>
	            <button id="switchTopClick" class="navbtn" onclick="switchTop()"><span id="navUD">↑</span></button>
	            <button class="navbtn" onclick="changeFontSize(2)">&plus;</button>
	            <button class="navbtn" onclick="changeFontSize(-2)">&minus;</button>
	            <button class="navbtn" onclick="location.href='emma/index.php?lang=<?=$lang?>'">↗</button>
              &nbsp;
              <b><span id="compname">loading comp name...</b>
            </td>
	        </tr>
        </table>
      </td>
    </tr>
 
    <tr>
      <td class="firstCol" valign="top" style="background-color:#FFF; color:#000;">
        <div id="divClasses"></div>
      </td>
      <td valign="top" width="100%">  
<?php }?> 
        <table width="100%" style="table-layout:fixed;" cellspacing="0" border="0"> 
          <tr>
            <td>
              <table width="100%" cellpadding="3px" cellspacing="0px" border="0" style="background-color:#555555; color:#FFF">
                <tr>
                  <td align="left" ><span id="resultsHeader" style="font-size: 1.3em;"><b><?=$_NOCLASSCHOSEN?></b></span></td>
                  <td align="right"><span id="txtResetSorting" class="splitChooser"></span></td>
                </tr>
              </table>
            </td>
          </tr>
  
          <tr valign="top">
            <td>
              <table id="divResults" width="100%">
                <tbody>
                  <tr>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </table>

  <?php if (!$isSingleClass && !$isSingleClub) {?> 
        <div align="left">
          Antall: <span id="numberOfRunners"></span>
        </div>
        <div align="left" style="font-size: 0.7em; color:#AAA">
            Last update: <span id="lastupdate"></span>. Update interval: <span id="updateinterval"></span>s.<br>
            * <?=$_HELPREDRESULTS?><br>
            &copy;2012- Liveresults. Source code: https://github.com/palkitt/liveresults
        </div>
      </td>
    </tr>
  </table>
  <?php }?>
</div>
</body>
</html>
