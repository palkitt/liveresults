<?php
date_default_timezone_set("Europe/Oslo");
$lang = "no";

if (isset($_GET['lang']))
 $lang = $_GET['lang'];

include_once("templates/emmalang_en.php");
include_once("templates/emmalang_$lang.php");
include_once("templates/classEmma.class.php");
header('Content-Type: text/html; charset='.$CHARSET);

$currentComp = new Emma($_GET['comp']);
$code = isset($_GET['code']);

echo("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head><title>LiveRes Radio :: <?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</title>

<META HTTP-EQUIV="expires" CONTENT="-1">
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#555556">
<link rel="stylesheet" type="text/css" href="css/style-freidig.css">
<link rel="stylesheet" type="text/css" href="css/ui-darkness/jquery-ui-1.8.19.custom.css">
<link rel="stylesheet" type="text/css" href="css/jquery.dataTables_themeroller-eoc.css">
<link rel="stylesheet" type="text/css" href="css/jquery-ui.css">

<script language="javascript" type="text/javascript" src="js/jquery-1.8.0.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery-ui.min.js"></script>
<script language="javascript" type="text/javascript" src="js/velocity.min.js"></script>
<script language="javascript" type="text/javascript" src="js/liveresults.js"></script> 
<script language="javascript" type="text/javascript" src="js/NoSleep.min.js"></script>
<script language="javascript" type="text/javascript" src="//widget.time.is/t.js"></script>
<script language="javascript" type="text/javascript">

var noSleep = new NoSleep();

function enableNoSleep() {
  noSleep.enable();
  document.removeEventListener('click', enableNoSleep, false);
}

document.addEventListener('click', enableNoSleep, false);
var res = null;
var Resources = null;
var runnerStatus = null;
var callTime = 3;
var postTime = 5;
var minBib = -99999;
var maxBib =  99999;

$(document).ready(function()
{
	try
	{
		time_is_widget.init({Oslo_z71e:{}});
	}
	catch (error)
	{}
	
	<?php 
		if (isset($_GET['calltime']))
			echo 'callTime = ', $_GET['calltime'] ,';'
	?>
	<?php 
		if (isset($_GET['minbib']))
			echo 'minBib = ', $_GET['minbib'] ,';'
	?>
	<?php 
		if (isset($_GET['maxbib']))
			echo 'maxBib = ', $_GET['maxbib'] ,';'
	?>
		
	res = new LiveResults.AjaxViewer(<?= $_GET['comp']?>,"<?= $lang?>","divClasses","divLastPassings","resultsHeader","resultsControls","divResults","txtResetSorting",
		  Resources, false, true, "setAutomaticUpdateText", "setCompactViewText", runnerStatus, true, "divRadioPassings", false, "filterText");
	res.compName = "<?=$currentComp->CompName()?>";
	res.compDate = "<?=$currentComp->CompDate()?>";
	
	if (<?= $_GET['code']?>==0 || <?= $_GET['code']?>==-999 || <?= $_GET['code']?>==-10)
	{ 
		var clockElement = document.getElementById("clock");
		function updateClock(clock) 
		{
			var currTime = new Date();
			var preTime = new Date(currTime.valueOf()+callTime*60*1000);
			var HTMLstring = preTime.toLocaleTimeString('en-GB');
			clock.innerHTML = HTMLstring;
		}
		setInterval(function () {updateClock( clockElement );}, 1000);
		res.radioStart = true;
	}
  if (<?= $_GET['code']?>==-10)
  {
    document.getElementById("callTime").value = callTime;
    document.getElementById("postTime").value = postTime;
    document.getElementById("minBib").value = minBib;
    document.getElementById("maxBib").value = maxBib;
	  res.updateStartRegistration(<?=(isset($_GET['openstart'])?1:0)?>);
  }
  else
    res.updateRadioPassings(<?=$_GET['code']?>,callTime,minBib,maxBib);

	$('#filterText').on('keyup', function () {
    res.filterTable();
	});

  var callTimeTimer = null;
	$('#callTime').on('keyup', function () 
  {
		clearTimeout(callTimeTimer); 
		callTimeTimer = setTimeout(function(){ 
      callTime = document.getElementById("callTime").value;
      res.dynamicStartRegistration(); 
    }, 500);

	});
  
  var postTimeTimer = null;
	$('#postTime').on('keyup', function () 
  {
		clearTimeout(postTimeTimer); 
		postTimeTimer = setTimeout(function(){ res.dynamicStartRegistration(); }, 500);
	});

  var minBibTimer = null;
	$('#minBib').on('keyup', function () 
  {
		clearTimeout(minBibTimer); 
		minBibTimer = setTimeout(function(){ res.dynamicStartRegistration(); }, 500);
	});

  var maxBibTimer = null;
	$('#maxBib').on('keyup', function () 
  {
		clearTimeout(maxBibTimer); 
		maxBibTimer = setTimeout(function(){ res.dynamicStartRegistration(); }, 500);
	});  


});
	
</script>
</head>
<body>

<?php if (!isset($_GET['comp']) || !isset($_GET['code'])) { ?>
  <h1 class="categoriesheader">Feil. Har du satt compID og postkode? Eks: radio.php?comp=15109&code=120</h1>
<?php } else { ?>
<table style="width:100%; table-layout=fixed" cellpadding="0" cellspacing="3" border="0">
	<tr valign=top>
	<td> 
	<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#555556; color:#FFF; padding: 10px; margin-top: 3px; ">
    <tr>
      <td>
        <span id="liveIndicator">◉</span>
        <b>
        <?php 
          if ($_GET['code']==0){?> Start <?php }
          else if ($_GET['code']==-999){?> Fristart <?php }
          else if ($_GET['code']==1000){?> Mål <?php }
          else if ($_GET['code']==-1){?> Meldepost: Alle <?php }
          else if ($_GET['code']==-2){?> Ute i løypa <?php }
          else if ($_GET['code']!=-10){?> Meldepost: <?= $_GET['code']?> <?php } 
        ?>
        <?php if ($_GET['code']==0){ ?> 
          <a href="radio.php?comp=<?= $_GET['comp']?>&code=-999<?php if (isset($_GET['calltime'])) {?>&calltime=<?= $_GET['calltime']?><?php }?>">&nbsp;&nbsp;Fristart→</a>
        <?php } ?>
        <?php if ($_GET['code']==-999){ ?> 
          <a href="radio.php?comp=<?= $_GET['comp']?>&code=0<?php if (isset($_GET['calltime'])) {?>&calltime=<?= $_GET['calltime']?><?php }?>">&nbsp;&nbsp;Tidsstart→</a>
          <?php } ?>
        <?php if ($_GET['code']==-10 && !isset($_GET['openstart'])){ ?> 
          Tidsstart&nbsp;&nbsp;<a href="radio.php?comp=<?= $_GET['comp']?>&code=-10&openstart<?php if (isset($_GET['calltime'])) {?>&calltime=<?= $_GET['calltime']?><?php }?>">Fri→</a>
        <?php } ?>
        <?php if ($_GET['code']==-10 && isset($_GET['openstart'])){ ?> 
          Fristart&nbsp;&nbsp;<a href="radio.php?comp=<?= $_GET['comp']?>&code=-10<?php if (isset($_GET['calltime'])) {?>&calltime=<?= $_GET['calltime']?><?php }?>">Tid→</a>
        <?php } ?>
        </b>
      </td>
      <td align="right"><input type="text" id="filterText" placeholder="filter..." size="5"></td>
      <?php if ($_GET['code']==0 || $_GET['code']==-999 || $_GET['code']==-10){?> 
        <td align="right">(<span id="clock">00:00:00</span>)&nbsp&nbsp</td>
      <?php }?>
      <td align="right"><a href="https://time.is/Oslo" id="time_is_link" rel="nofollow" style="text-decoration: none; color: #FFF"><span id="Oslo_z71e"></span></a></td>
    </tr>
    <?php if ($_GET['code']==-10){?>
      <tr>
        <td align="left">Før start [min] <input type="text" id="callTime" size="1"></td>
        <td align="right">Etter start [min] <input type="text" id="postTime" size="1"></td>
        <td align="right">Min st.nr <input type="text" id="minBib" size="1"></td>
        <td align="right">Maks st.nr <input type="text" id="maxBib" size="1"></td>
      </tr>
    <?php } ?>
	</table>
	<table width="100%" cellpadding="3px" cellspacing="0px" border="0" >
		<tr valign=top><tr><td><table id="divRadioPassings"></table></td></tr>
	</table>
</td>
</table>
<?php }?>
<?php if ($_GET['code']==-2){?> Antall: <span id="numberOfRunners"></span> <?php } ?>
<p align="left"><font color="#AAA" size="0.7em">
Last update: <span id="lastupdate"></span>. Update interval: <span id="updateinterval"></span>s.<br> 
</body>
</html>

