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

<?php
//$debug = isset($_GET['debug']) && $_GET["debug"] == "true";
$debug = true;
if ($debug)
{
?>
<!-- DEBUG -->
<script language="javascript" type="text/javascript" src="js/jquery-1.7.2.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.ba-hashchange.min.js"></script>
<script language="javascript" type="text/javascript" src="js/liveresults.js"></script> 
<!-- <script language="javascript" type="text/javascript" src="js/LiveResults.debug.js?rnd=<?=time()?>"></script>
-->
<?php }
else
{?>
<!-- RELEASE-->
<script language="javascript" type="text/javascript" src="js/liveresults.min.20170627.js"></script>

<?php }?>
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
var res2 = null;
var Resources = null;
var runnerStatus = null;
var calltime = 3;
var minbib = -99999999;
var maxbib =  99999999;

$(document).ready(function()
{
	time_is_widget.init({Oslo_z71e:{}});
	
	<?php 
		if (isset($_GET['calltime']))
			echo 'calltime = ', $_GET['calltime'] ,';'
	?>
	<?php 
		if (isset($_GET['minbib']))
			echo 'minbib = ', $_GET['minbib'] ,';'
	?>
	<?php 
		if (isset($_GET['maxbib']))
			echo 'maxbib = ', $_GET['maxbib'] ,';'
	?>
		
	res = new LiveResults.AjaxViewer(<?= $_GET['comp']?>,"<?= $lang?>","divClasses","divLastPassings","resultsHeader","resultsControls","divResults","txtResetSorting",
		  Resources, false, true, "setAutomaticUpdateText", "setCompactViewText", runnerStatus, true, "divRadioPassings", false, "filterText");
	res.compName = '<?=$currentComp->CompName()?>';
	res.compDate = "<?=$currentComp->CompDate();?>";
	
	if (<?= $_GET['code']?>==0)
	{ 
		var clockElement = document.getElementById( "clock" );
		function updateClock ( clock ) 
		{
			var currTime = new Date();
			var preTime = new Date(currTime.valueOf()+calltime*60*1000);
			var HTMLstring = preTime.toLocaleTimeString('en-GB');
			clock.innerHTML = HTMLstring;
		}
		setInterval(function () {updateClock( clockElement );}, 1000);
		res.radioStart = true;
	}
	res.updateRadioPassings(<?= $_GET['code']?>,calltime,minbib,maxbib);

	$('#filterText').on('keyup', function () {
        res.filterTable();
	}); 	

	if (<?= (isset($_GET['code2']) ? 1 : 0 ) ?>)
	{
		res2 = new LiveResults.AjaxViewer(<?= $_GET['comp']?>,"<?= $lang?>","divClasses","divLastPassings","resultsHeader","resultsControls","divResults","txtResetSorting",
		       Resources,false,true,"setAutomaticUpdateText","setCompactViewText", runnerStatus, true,"divRadioPassings2",false, "filterText2");
  	    res2.compName = '<?=$currentComp->CompName()?>';
        res2.compDate = "<?=$currentComp->CompDate();?>";
		res2.updateRadioPassings(<?= (isset($_GET['code2']) ? $_GET['code2'] : 1) ?>,calltime,minbib,maxbib);
		
		$('#filterText2').on('keyup', function () {
        	res2.filterTable();
	}); 

	}

            
});
	
</script>
</head>
<body>

	<?php if (!isset($_GET['comp']) || !isset($_GET['code'])) 
	{ ?>
		<h1 class="categoriesheader">Feil. Har du satt compID og postkode? Eks: radio.php?comp=15109&code=120</h1>
	<?php }
	else
	{ ?>
<table style="width:100%; table-layout=fixed" cellpadding="0" cellspacing="3" border="0">
	<tr><td width="<?= (isset($_GET['code2']) ? 50 : 100) ?>%"></td><td width="<?= (isset($_GET['code2']) ? 50 : 0) ?>%"></td></tr>
	<tr valign=top>
	<td> 
	<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#555556; color:#FFF; padding: 10px; margin-top: 3px; ">
	<tr>
		<td><span class="pulsingLive" id="liveIndicator">&#9679;</span>
		<b>
   			<?php if ($_GET['code']==0){?> Start <?php }
	  			else if ($_GET['code']==1000){?> Mål <?php }
	  			else if ($_GET['code']==-1){?> Meldepost: Alle <?php }
	  			else if ($_GET['code']==-2){?> Ute i løypa <?php }
	  			else {?> Meldepost: <?= $_GET['code']?> <?php } ?>
			</b>
		</td>
		<td align="center"><input type="text" id="filterText" placeholder="filter..." size="5"></td>
		<td align="center"><b><?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</b></td>
		<?php if ($_GET['code']==0){?> <td align="right"><b>(<span id="clock"></span></b>)&nbsp&nbsp</td><?php }?>
		<td align="right"><a href="https://time.is/Oslo" id="time_is_link" rel="nofollow" style="text-decoration: none; color: #FFF">Time.is:</a>
<span id="Oslo_z71e"></span></td>
	</tr>
	</table>
	<table width="100%" cellpadding="3px" cellspacing="0px" border="0" >
		<tr valign=top><tr><td><table id="divRadioPassings"></table></td></tr>
	</table>
</td>
<?php if (isset($_GET['code2'])) { ?>
	<td>
	<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#555556; color:#FFF; padding: 10px; margin-top: 3px; ">
	<tr>
		<td><b>
   			<?php if ($_GET['code2']==0){?> Start <?php }
	  			else if ($_GET['code2']==1000){?> Mål <?php }
	  			else if ($_GET['code2']==-1){?> Meldepost: Alle <?php }
	  			else if ($_GET['code2']==-2){?> Ute i løypa <?php }
	  			else {?> Meldepost: <?= $_GET['code2']?> <?php } ?>
			</b>
		</td>
		<td align="center"><input type="text" id="filterText2" placeholder="filter..." size="5"></td>
		<td align="center"><b><?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</b></td>
	</tr>
	</table>
	<table width="100%" cellpadding="3px" cellspacing="0px" border="0" >
		<tr valign=top><tr><td><table id="divRadioPassings2"></table></td></tr>
	</table>
	</td>
<?php } ?> 
</table>
<?php }?>
<?php if ($_GET['code']==-2){?> Antall: <span id="numberOfRunners"></span> <?php } ?>
<p align="left"><font color="#AAA" size="0.7em">
Last update: <span id="lastupdate"></span><br> 
</body>
</html>

