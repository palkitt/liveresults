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

<link rel="stylesheet" type="text/css" href="css/jquery.dataTables.css">
<link rel="stylesheet" type="text/css" href="css/style-freidig.css">

<script language="javascript" type="text/javascript" src="js/jquery-3.7.0.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/messages.js"></script> 

<script language="javascript" type="text/javascript">

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

let wakeLock = null;
async function enableNoSleep() {
  if (wakeLock !== null && !wakeLock.released) {
    console.log("Wake lock is already active");
    return;
  }
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.log("Wake lock is now active");
  } catch (err) {
    console.error("Failed to acquire wake lock:", err);
  }
}

document.addEventListener("click", enableNoSleep );

let soundBuffer;
var audioContext = null

function switchSound()
{
	if (mess.audioMute)
	{	
		// Initiate sound 
		if (audioContext == null) {
		    audioContext = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
		
			var buffer = audioContext.createBuffer(1, 1, 22050);
        	var source = audioContext.createBufferSource();
        	source.buffer = buffer;
        	source.connect(audioContext.destination);
        	source.start ? source.start(0) : source.noteOn(0);

			window.fetch('images/maybe-one-day.mp3')
				.then(response => response.arrayBuffer())
				.then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
				.then(audioBuffer => {soundBuffer = audioBuffer;  });
		}

		$('#audioOnOff').html(" &#128264; ")
		mess.audioMute = false;
	}
	else
	{
		$('#audioOnOff').html(" &#128263; ")
		mess.audioMute = true;
	}
}

function playNotification() {
	const source = audioContext.createBufferSource();
	source.buffer = soundBuffer;
	source.connect(audioContext.destination);
	source.start();
}


document.addEventListener('click', enableNoSleep, false);
var mess = null;

$(document).ready(function()
{
	mess = new Messages.AjaxViewer(<?= $_GET['comp']?>);
	mess.compName = "<?=$currentComp->CompName()?>";
	mess.compDate  = "<?=$currentComp->CompDate()?>";
	mess.runnerStatus = runnerStatus;

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
	<table style="min-width:100%; table-layout:fixed; padding:0; border-spacing:3px; border:none">
		<tr valign=top>
			<td> 
				<table style="width:100%; background-color:#555556; color:#FFF; padding: 10px; margin-top: 3px; border-spacing:0; border:none;">
				<tr>
					<td>
						<span id="liveIndicator"></span>
						<span style="cursor:pointer; color:#FFF; font-size:1.3em" onclick="switchSound()" id="audioOnOff"> &#128263; </span>
						<b>Meldinger</b>
					</td>
					<td style="text-align: center"><input type="text" id="filterText" placeholder="filter..." size="5"></td>
					<td style="text-align: center"><b><?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</b></td>
					<td style="text-align: center"><b><span id="clock"></span></b></td>
					<td style="text-align: right"><b>Vis alle<input type="checkbox" checked="checked" onclick="mess.showAllMessages = !(mess.showAllMessages); mess.updateMessageMarking();"></span></b></td>
				</tr>
				</table>
			</td>
		</tr>
		<tr valign=top>
			<td>
				<table style="width:100%; padding:3px; border-spacing:0x; border:none;">
					<tr valign=top>
						<td><table id="divMessages"></table></td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
<?php }?>
<p style="text-align: left; color: #AAA; font-size: 0.7em;">
Last update: <span id="lastupdate"></span>. Update interval: <span id="updateinterval"></span>s.<br> 
</body>
</html>

