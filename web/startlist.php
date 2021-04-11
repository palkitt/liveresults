<?php
date_default_timezone_set("Europe/Oslo");
$closeTime = "2030-09-13 07:32:00 +2:00";
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
<head><title>LiveRes Startliste :: <?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</title>

<META HTTP-EQUIV="expires" CONTENT="-1">
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#555556">
<link rel="stylesheet" type="text/css" href="css/style-freidig.css">
<link rel="stylesheet" type="text/css" href="css/ui-darkness/jquery-ui-1.8.19.custom.css">
<link rel="stylesheet" type="text/css" href="css/jquery.dataTables_themeroller-eoc.css">


<script language="javascript" type="text/javascript" src="js/jquery-1.8.0.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
<script language="javascript" type="text/javascript" src="js/FileSaver.js"></script>
<script language="javascript" type="text/javascript" src="js/liveresults.js"></script> 
<script language="javascript" type="text/javascript">

var res = null;
var Resources = null;
var runnerStatus = null;

$(document).ready(function()
{
	res = new LiveResults.AjaxViewer(<?= $_GET['comp']?>,"<?= $lang?>","divClasses","divLastPassings","resultsHeader","resultsControls","divResults","txtResetSorting",
		  Resources, false, true, "setAutomaticUpdateText", "setCompactViewText", runnerStatus, true, "divRadioPassings", false, "filterText");
    res.updateStartList();
	res.compName = '<?=$currentComp->CompName()?>';
	
	$('#filterText').on('keyup', function () {
        res.filterTable();
	});
	           
});
	
</script>
</head>
<body>

	<?php if (!isset($_GET['comp']) ) { ?>
		<h1 class="categoriesheader">Feil. Har du satt compID</h1>	
	<?php }
	else if ( time() - strtotime($closeTime) > 0 )  { ?>
       <h1 class="categoriesheader">Tjenesten er nå stengt. Se kontaktinfo i Eventor eller henvend deg i løpskontoret.</h1>	
    <?php }
    else
	{ ?>
		<table style="width:100%; table-layout=fixed" cellpadding="0" cellspacing="3" border="0">
	<tr><td width="<?= (isset($_GET['code2']) ? 50 : 100) ?>%"></td><td width="<?= (isset($_GET['code2']) ? 50 : 0) ?>%"></td></tr>
	<tr valign=top>
	<td> 
	<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#555556; color:#FFF; padding: 10px; margin-top: 3px; ">
	<tr>
		<td align="left"><b>Startliste</b></td>
		<td align="center"><b><?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</b></td>
		<td align="right">
		<button style="height:18px" onclick="res.raceSplitterDialog();">RaceSplitter CSV</button> <input type="text" id="filterText" placeholder="søk..." size="10"></td>
	</tr>
	</table>
	<table width="100%" cellpadding="3px" cellspacing="0px" border="0" >
		<tr valign=top><tr><td><table id="startList"></table></td></tr>
	</table>
</td>
</table>
<?php }?> 
</body>
</html>