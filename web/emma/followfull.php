<?php
date_default_timezone_set("Europe/Oslo");
$lang = "no";

if (isset($_GET['lang']))
 $lang = $_GET['lang'];

include_once("../templates/emmalang_en.php");
include_once("../templates/emmalang_$lang.php");
include_once("templates/classEmma.class.php");

header('Content-Type: text/html; charset='.$CHARSET);

$currentComp = new Emma($_GET['comp']);
$currentCompNo = $_GET['comp'];
$orgainzer = $currentComp->Organizer();

$isSingleClass = isset($_GET['class']);
$isSingleClub = isset($_GET['club']);
$setFullView = isset($_GET['fullview']);
$setNotScroll = isset($_GET['notscroll']);
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

echo("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
<html>
<base href="../">
<head><title><?=$_TITLE?> :: <?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</title>

<META HTTP-EQUIV="expires" CONTENT="-1">
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#555556">
<link rel="stylesheet" type="text/css" href="css/style-freidig.css">
<link rel="stylesheet" type="text/css" href="css/ui-darkness/jquery-ui-1.8.19.custom.css">
<link rel="stylesheet" type="text/css" href="css/jquery.dataTables_themeroller-eoc.css">
<link rel="stylesheet" type="text/css" href="css/responsive.dataTables.css">
<link rel="stylesheet" type="text/css" href="css/jquery-ui.css">

<script language="javascript" type="text/javascript" src="js/jquery-1.8.0.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.ba-hashchange.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery-ui.min.js"></script>
<script language="javascript" type="text/javascript" src="js/dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/dataTables.responsive.js"></script>
<script language="javascript" type="text/javascript" src="js/dataTables.fixedColumns.min.js"></script>
<script language="javascript" type="text/javascript" src="js/liveresults.js"></script> 
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
	
	res = new LiveResults.AjaxViewer(<?= $_GET['comp']?>,"<?= $lang?>","divClasses","divLastPassings","resultsHeader","resultsControls","divResults","txtResetSorting",Resources,<?= ($currentComp->IsMultiDayEvent() ? "true" : "false")?>,<?= (($isSingleClass || $isSingleClub) ? "true": "false")?>,"setAutomaticUpdateText","setCompactViewText", runnerStatus, false, "", true);
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
	    res.compDate = "<?=$currentComp->CompDate();?>";
		res.eventTimeZoneDiff = <?=$currentComp->TimeZoneDiff();?>;
		res.startPredictionUpdate();
	<?php }?>


	// Set full view
	<?php if ($setFullView || $currentComp->FullView() ){?>
		res.setCompactView(false); <?php }?>
		
	// Turn off scroll view
	<?php if ($setNotScroll){?>
		res.setScrollView(false); <?php }?>
	
	// Mass start race
	<?php if($currentComp->MassStartSorting() ){?>
		res.curClassIsMassStart = true; <?php }?>
	
	// Show tenth of seconds
	<?php if($currentComp->ShowTenthOfSeconds() ){?>
		res.setShowTenth(true); <?php }?>

	// Modify high time
	<?php if($currentComp->HighTime() ){?> 
	    res.highTime = <?=$currentComp->HighTime(); ?> <?php }?>;
	
	// Qualification limits and classes (last limit is default)
	res.qualLimits = [<?=$currentComp->QualLimits();?>];
	res.qualClasses = [<?=$currentComp->QualClasses();?>];
	
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

});

function changeFontSize(val)
{
	var size = $("td").css("font-size");
	var newSize = parseInt(size.replace(/px/, "")) + val;
	$("td").css("font-size",newSize + "px");
}

function switchNav(x) {
  x.classList.toggle("change");
  if (sideBar)
	  closeNav();
  else
	  openNav();
}

function switchTop(x) {
  x.classList.toggle("change");
  if (topBar)
	  closeTop();
  else
	  openTop();
}


function openNav() {
  if(res.currentTable != null)
  {
	$(".firstCol").width("70px");  
  	$('#divResults').DataTable()
     .columns.adjust()
	 .responsive.recalc();
	 $(".firstCol").width("0px");  
  }
  $(".firstCol").animate({'width':'70px'},"1s");
  sideBar = true;
}

function closeNav() {
  if(res.currentTable != null)
  {
	$(".firstCol").width("0px");  
  	$('#divResults').DataTable()
     .columns.adjust()
	 .responsive.recalc();
    $(".firstCol").width("70px");  
  }

  $(".firstCol").animate({'width':'0px'},"1s");  
  sideBar = false;
}

function openTop() {
	$("#topBar").height('auto');
	var height = $("#topBar").height();
	$("#topBar").height(0);
	$("#topBar").animate({'height': height},"1s");  
  topBar = true;
}

function closeTop() {
  $("#topBar").animate({'height':'0px'},"1s");  
  topBar = false;
}

</script>
</head>
<body>


<!-- MAIN DIV -->
<div id="main">
<?php if (!$isSingleClass && !$isSingleClub) {?>

  <table style="width:100%; table-layout:fixed;" cellpadding="0" cellspacing="3" border="0" >
  <tr><td class="firstCol"></td><td width="100%"></td></tr>
  <tr valign="top">
  <td colspan="2"><div id="topBar" style="overflow: hidden">
	<table border="0" cellpadding="3px" cellspacing="0" width="100%" style="background-color:#555555; padding: 5px">
		<tr>
			<?php if(in_array($_GET['comp'], array("15821","15822","15823"))){?>
			    <td width="60">
			    <img src="images/SG19.PNG" height="60" /></td>
			<?php } elseif(in_array($_GET['comp'], array("15950","15951","15952"))){?>
			    <td width="60">
			    <img src="images/OF.png" height="60" /></td>
			<?php } elseif(in_array($_GET['comp'], array("16235","16241","16284"))){?>
			    <td width="60">
			    <img src="images/SB-O.png" height="60" /></td>
			<?php } elseif(in_array($_GET['comp'], array("16699"))){?>
			    <td width="70">
			    <img src="images/MOTTV.png" height="60" /></td>
			<?php } elseif($orgainzer=="Freidig"){?>
			    <td width="60">
			    <img src="images/Freidig60.png" height="60" /></td>
			<?php } elseif($orgainzer=="Byåsen IL"){?>
			    <td width="60">
			    <img src="images/BIL.png" height="60" /></td>
		     <?php } elseif($orgainzer=="Byaasen Skiklub"){?>
			    <td width="60">
			    <img src="images/BSK.png" height="60" ></td>
			<?php }?>
<td valign="top"><span style="color:#FFF; text-decoration: none; font-size: 1em;"><b><?=$_LASTPASSINGS?></b><br><div id="divLastPassings"></div></span></td>
</tr>
</table></div>
</td></tr>

<tr valign="top" style="background-color:#555555; color:#FFF">
  <td class="firstCol">&nbsp;Klasser</td>
  <td width="100%">
  <table border="0" cellpadding="3 px" cellspacing="0" width="100%" style="table-layout:fixed;">
	<tr>
  	<td align="left" width="30%">
	<span id="switchNavClick" style="cursor:pointer; color:#FFF" onclick="switchNav(this)"><div class="menuicon">
		<div class="bar1"></div><div class="bar2"></div><div class="bar3"></div></div> <?=$_CHOOSECLASS?></span></td>

	<td align="center" width="30%">
	<span id="switchTopClick" style="cursor:pointer; color:#FFF" onclick="switchTop(this)"><div class="menuicon">
		<div class="bar1"></div><div class="bar2"></div><div class="bar3"></div></div> <?=$_LASTPASSINGS?></span></td>
	  
  	<td align="right"width="30%"><a href="emma/index.php?lang=<?=$lang?>" style="text-decoration: none; color: #FFF"><div class="menuicon">
		<div class="bar1"></div><div class="bar2"></div><div class="bar3"></div></div> <?=$_CHOOSECMP?></a></span></td>
  	<td align="right" width="10%"><span id="setCompactViewText" class="noUnderline"><a href="javascript:LiveResults.Instance.setCompactView(false);">&#9868;</a></span></td>
	</tr>
  </table></td>
</tr>
 
 <tr>
  <td class="firstCol" valign="top" style="background-color:#FFF; color:#000"><div id="divClasses"></div></td>

  <td valign="top" width="100%">  
 
  <?php }?> 
  <table width="100%" style="table-layout:fixed;" cellspacing="0" border="0"> 
  <tr><td>
  <table width="100%" cellpadding="3px" cellspacing="0px" border="0" style="background-color:#555555; color:#FFF"><tr>
  <td align="left" ><span id="resultsHeader" style="font-size: 1.3em;"><b><?=$_NOCLASSCHOSEN?></b></span></td>
  <td align="center"><b><?=$currentComp->CompName()?></b></td>
  <td align="right"><?php if (!$isSingleClass && !$isSingleClub) {?><a href="javascript:LiveResults.Instance.newWin()"> <?=$_OPENINNEWWINDOW?></a> <?php }?> <span id="txtResetSorting"></span></td></tr></table></td></tr>
  
   <tr valign="top"><td>
   <table id="divResults" width="100%"><tbody><tr><td></td></tr></tbody></table>
   </td></tr>
  </table>

  <?php if (!$isSingleClass && !$isSingleClub) {?>  
	<p align="left"><font color="#AAA" size="0.7em">
  * <?=$_HELPREDRESULTS?><br>
  &copy;2012- Liveresults. Source code: https://github.com/palkitt/liveresults</font></p>
  
  </table>
  <?php }?>

  </div>

</body>
</html>
