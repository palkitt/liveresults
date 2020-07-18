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

echo("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head><title>LiveRes Message <?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</title>

<META HTTP-EQUIV="expires" CONTENT="-1">
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#555556">
<link rel="stylesheet" type="text/css" href="css/style-freidig.css">
<link rel="stylesheet" type="text/css" href="css/ui-darkness/jquery-ui-1.8.19.custom.css">
<link rel="stylesheet" type="text/css" href="css/jquery.dataTables_themeroller-eoc.css">

<script language="javascript" type="text/javascript" src="js/jquery-1.7.2.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.ba-hashchange.min.js"></script>
<script language="javascript" type="text/javascript" src="js/messages.js"></script> 
<script language="javascript" type="text/javascript" src="js/NoSleep.min.js"></script>
<script language="javascript" type="text/javascript">
var noSleep = new NoSleep();

function enableNoSleep() {
  noSleep.enable();
  document.removeEventListener('click', enableNoSleep, false);
}

function switchSound()
{
	if (mess.audioMute)
	{
		$('#audioOnOff').html(" &#128264; ")
		mess.audioMute = false;
	}
	else
	{
		$('#audioOnOff').html(" &#128263; ")
		mess.audioMute = true;
	}
}


document.addEventListener('click', enableNoSleep, false);
var mess = null;

$(document).ready(function()
{
	mess = new Messages.AjaxViewer(<?= $_GET['comp']?>);
	mess.compName = '<?=$currentComp->CompName()?>';
	mess.updateMessages();
	$('#filterText').on('keyup', function () {
        mess.filterTable();
	});
	var clockElement = document.getElementById( "clock" );
	
	function updateClock ( clock ) 
	{
		var currTime = new Date();
		var HTMLstring = currTime.toLocaleTimeString('en-GB');
		clock.innerHTML = HTMLstring;
	}
	setInterval(function () {updateClock( clockElement );}, 1000);  
});
	
</script>
</head>
<body>

	<?php if (!isset($_GET['comp']) ) 
	{ ?>
		<h1 class="categoriesheader">Feil. Har du satt compID? Eks: message.php?comp=10016</h1>
	<?php }
	else
	{ ?>
<table style="width:100%; table-layout=fixed" cellpadding="0" cellspacing="3" border="0">
	<tr><td width=100%"></td></tr>
	<tr valign=top>
	<td> 
	<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#555556; color:#FFF; padding: 10px; margin-top: 3px; ">
	<tr>
		<td><span class="pulsingLive" id="liveIndicator">&#9679;</span>
		<span style="cursor:pointer; color:#FFF; font-size:1.3em" onclick="switchSound()" id="audioOnOff"> &#128263; </span>
		<b>Meldinger</b>
		</td>
		<td align="center"><input type="text" id="filterText" placeholder="filter..." size="5"></td>
		<td align="center"><b><?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</b></td>
		<td align="center"><b><span id="clock"></span></b></td>
		<td align="right"><b>Vis alle<input type="checkbox" checked="checked" onclick="mess.showAllMessages = !(mess.showAllMessages); mess.updateMessageMarking();"></span></b></td>

	</tr>
	</table>
	<table width="100%" cellpadding="3px" cellspacing="0px" border="0" >
		<tr valign=top><tr><td><table id="divMessages"></table></td></tr>
	</table>
	</td>
</table>
<?php }?>
<p align="left"><font color="#AAA" size="0.7em">
</body>
</html>

