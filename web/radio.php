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
<link rel="stylesheet" type="text/css" href="css/jquery.prompt.css">

<script language="javascript" type="text/javascript" src="js/jquery-1.8.0.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery-ui.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.prompt.js"></script>
<script language="javascript" type="text/javascript" src="js/velocity.min.js"></script>
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
var Resources = null;
var runnerStatus = null;
var callTime = 3;
var postTime = 5;
var minBib = -100000;
var maxBib =  100000;

function switchOpenTimed(open)
{
  var url = "radio.php?comp=<?= $_GET['comp']?>&code=0&calltime="+callTime+"&posttime="+postTime+"&minbib="+minBib+"&maxbib="+maxBib;
  if (open) 
    url += "&openstart";
  window.location = url;
}

function switchSound()
{
	if (res.audioMute)
	{	
    // Initiate sound
    if (res.audioCtx == null)
    {
      res.audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
      var buffer = res.audioCtx.createBuffer(1, 1, 22050);
      var source = res.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(res.audioCtx.destination);
      source.start ? source.start(0) : source.noteOn(0);
    }
    
    $('#audioOnOff').html(" &#128264; ")
		res.audioMute = false;
	}
	else
	{
		$('#audioOnOff').html(" &#128263; ")
		res.audioMute = true;
	}
}

$(document).ready(function()
{
	<?php 
		if (isset($_GET['calltime']))
			echo 'callTime = ', $_GET['calltime'] ,';';
    if (isset($_GET['posttime']))
			echo 'postTime = ', $_GET['posttime'] ,';';
		if (isset($_GET['minbib']))
			echo 'minBib = ', $_GET['minbib'] ,';';
		if (isset($_GET['maxbib']))
			echo 'maxBib = ', $_GET['maxbib'] ,';';
	?>
		
	res = new LiveResults.AjaxViewer(<?= $_GET['comp']?>,"<?= $lang?>","divClasses","divLastPassings","resultsHeader","resultsControls","divResults","txtResetSorting",
		  Resources, false, true, "setAutomaticUpdateText", "setCompactViewText", runnerStatus, true, "divRadioPassings", false, "filterText");
	res.compName = "<?=$currentComp->CompName()?>";
	res.compDate = "<?=$currentComp->CompDate()?>";
	
  function updateClock() 
  {
    var time = document.getElementById("time");
    var currTime = new Date();
    var HTMLstringCur = currTime.toLocaleTimeString('en-GB');
    time.innerHTML = HTMLstringCur;

    var preTimeID = document.getElementById("pretime");
    if ( preTimeID!= null)
    {
      var preTime = new Date(currTime.valueOf()+callTime*60*1000);
      var HTMLstringPre = preTime.toLocaleTimeString('en-GB');
      preTimeID.innerHTML = HTMLstringPre;
    }
  }
  if (<?=$_GET['code']?>!=0)
    setInterval(function () {updateClock( );}, 1000);
	
  if (<?=$_GET['code']?>==0)
  {
    document.getElementById("callTime").value = callTime;
    document.getElementById("postTime").value = postTime;
    document.getElementById("minBib").value = minBib;
    document.getElementById("maxBib").value = maxBib;
	  res.updateStartRegistration(<?=(isset($_GET['openstart'])?1:0)?>);
  }
  else
    res.updateRadioPassings(<?=$_GET['code']?>,callTime,minBib,maxBib);

	$('#filterText').on('keyup', function () { res.filterTable();	});
	$('#callTime').on('keyup', function () { callTime = document.getElementById("callTime").value	});  
	$('#postTime').on('keyup', function () { postTime = document.getElementById("postTime").value; });
	$('#minBib').on('keyup', function () { minBib = document.getElementById("minBib").value; });
	$('#maxBib').on('keyup', function () { maxBib = document.getElementById("maxBib").value; });
	
});	
</script>
</head>
<body>

<?php if (!isset($_GET['comp']) || !isset($_GET['code'])) { ?>
  <h1 class="categoriesheader">Feil. Har du satt compID og postkode? Eks: radio.php?comp=15109&code=120</h1>
<?php } else { ?>
	<table style="width:100%; table-layout=fixed" cellpadding="0" cellspacing="3" border="0">
	<tr valign=top><td> 
	<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#555556; color:#FFF; padding: 10px; margin-top: 3px; ">
    <tr>
    <?php if ($_GET['code']==0) { ?>
      <tr>
        <td align="left"><span id="liveIndicator">◉</span>
        <span style="cursor:pointer; color:#FFF;" onclick="switchSound()" id="audioOnOff"> &#128263; </span>
          <?php if (isset($_GET['openstart'])){ ?> 
            <b>Fristart</b>&nbsp;&nbsp;<a href="javascript:switchOpenTimed(0)">Tid→</a>
          <?php } else { ?> 
            <b>Tidsstart</b>&nbsp;&nbsp;<a href="javascript:switchOpenTimed(1)">Fri→</a>
          <?php } ?>
        </td>
        <td align="right">Før ⏲ <input type="text" id="callTime" style="width: 20px;"></td>
        <td align="right">Min № <input type="text" id="minBib" style="width: 50px;"></td>
        <td align="right" width="10%"><span id="pretime" style="font-style:italic; color:lightgray">00:00:00</span></td>
      </tr>
      <tr>
        <td align="left"><input type="text" id="filterText" placeholder="filter..." style="width: 90px;"></td>
        <td align="right">Etter ⏲ <input type="text" id="postTime" style="width: 20px;"></td>
        <td align="right">Max № <input type="text" id="maxBib" style="width: 50px;"></td>      
        <td align="right" width="10%"><span id="time">00:00:00</span></td>
      </tr>
    <?php } else { ?>
      <tr>
        <td><span id="liveIndicator">◉</span><b>
          <?php 
          if ($_GET['code']==1000){?> Mål <?php }
          else if ($_GET['code']==-1){?> Meldepost: Alle <?php }
          else if ($_GET['code']==-2){?> Ute i løypa <?php }
          else {?> Meldepost: <?= $_GET['code']?> <?php } ?>        
          </b>
        </td>
        <td align="right"><input type="text" id="filterText" placeholder="filter..." style="width: 30px;"></td>
        <td align="right"><span id="time">00:00:00</span></td>
      </tr>
    <?php } ?>
  </table>
  </td></tr>
  <tr><td>
    <table width="100%" cellpadding="3px" cellspacing="0px" border="0">
      <tr valign=top><td><table id="divRadioPassings"></table></td></tr>
    </table>
  </td></tr>
  </table>
  <?php if ($_GET['code']==-2){?> Antall: <span id="numberOfRunners"></span> <?php } ?>
<?php } ?>

<p align="left"><font color="#AAA" size="0.7em">
Last update: <span id="lastupdate"></span>. Update interval: <span id="updateinterval"></span>s.<br> 
</body>
</html>

