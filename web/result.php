<?php
date_default_timezone_set("Europe/Oslo");
$lang = "no";

if (isset($_GET['lang']))
	$lang = $_GET['lang'];

include_once("templates/emmalang_en.php");
include_once("templates/emmalang_$lang.php");
include_once("templates/classEmma.class.php");
header('Content-Type: text/html; charset=' . $CHARSET);

$currentComp = new Emma($_GET['comp']);

echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
	<title>LiveRes Result :: <?= $currentComp->CompName() ?> [<?= $currentComp->CompDate() ?>]</title>

	<META HTTP-EQUIV="expires" CONTENT="-1">
	<meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">

	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="theme-color" content="#555556">
	<link rel="stylesheet" type="text/css" href="css/style-freidig.css">
	<link rel="stylesheet" type="text/css" href="css/ui-darkness/jquery-ui-1.8.19.custom.css">
	<link rel="stylesheet" type="text/css" href="css/jquery.dataTables_themeroller-eoc.css">
	<link rel="stylesheet" type="text/css" href="css/jquery-ui.css">

	<script language="javascript" type="text/javascript" src="js/jquery-1.8.0.min.js"></script>
	<script language="javascript" type="text/javascript" src="js/jquery.dataTables.min.js"></script>
	<script language="javascript" type="text/javascript" src="js/jquery-ui.min.js"></script>
	<script language="javascript" type="text/javascript" src="js/liveresults.js"></script>

	<script language="javascript" type="text/javascript">
		var res = null;
		var Resources = {
			_TITLE: "<?= $_TITLE ?>",
			_CHOOSECMP: "<?= $_CHOOSECMP ?>",
			_AUTOUPDATE: "<?= $_AUTOUPDATE ?>",
			_LASTPASSINGS: "<?= $_LASTPASSINGS ?>",
			_LASTPASSFINISHED: "<?= $_LASTPASSFINISHED ?>",
			_LASTPASSPASSED: "<?= $_LASTPASSPASSED ?>",
			_LASTPASSWITHTIME: "<?= $_LASTPASSWITHTIME ?>",
			_CHOOSECLASS: "<?= $_CHOOSECLASS ?>",
			_NOCLASSESYET: "<?= $_NOCLASSESYET ?>",
			_CONTROLFINISH: "<?= $_CONTROLFINISH ?>",
			_NAME: "<?= $_NAME ?>",
			_CLUB: "<?= $_CLUB ?>",
			_TIME: "<?= $_TIME ?>",
			_NOCLASSCHOSEN: "<?= $_NOCLASSCHOSEN ?>",
			_HELPREDRESULTS: "<?= $_HELPREDRESULTS ?>",
			_NOTICE: "<?= $_NOTICE ?>",
			_STATUSDNS: "<?= $_STATUSDNS ?>",
			_STATUSDNF: "<?= $_STATUSDNF ?>",
			_STATUSWO: "<?= $_STATUSWO ?>",
			_STATUSMOVEDUP: "<?= $_STATUSMOVEDUP ?>",
			_STATUSNOTSTARTED: "<?= $_STATUSNOTSTARTED ?>",
			_STATUSOK: "<?= $_STATUSOK ?>",
			_STATUSMP: "<?= $_STATUSMP ?>",
			_STATUSDSQ: "<?= $_STATUSDSQ ?>",
			_STATUSOT: "<?= $_STATUSOT ?>",
			_STATUSNC: "<?= $_STATUSNC ?>",
			_FIRSTPAGECHOOSE: "<?= $_FIRSTPAGECHOOSE ?>",
			_FIRSTPAGEARCHIVE: "<?= $_FIRSTPAGEARCHIVE ?>",
			_LOADINGRESULTS: "<?= $_LOADINGRESULTS ?>",
			_ON: "<?= $_ON ?>",
			_OFF: "<?= $_OFF ?>",
			_TEXTSIZE: "<?= $_TEXTSIZE ?>",
			_LARGER: "<?= $_LARGER ?>",
			_SMALLER: "<?= $_SMALLER ?>",
			_OPENINNEW: "<?= $_OPENINNEW ?>",
			_FORORGANIZERS: "<?= $_FORORGANIZERS ?>",
			_FORDEVELOPERS: "<?= $_FORDEVELOPERS ?>",
			_RESETTODEFAULT: "<?= $_RESETTODEFAULT ?>",
			_OPENINNEWWINDOW: "<?= $_OPENINNEWWINDOW ?>",
			_INSTRUCTIONSHELP: "<?= $_INSTRUCTIONSHELP ?>",
			_LOADINGCLASSES: "<?= $_LOADINGCLASSES ?>",
			_START: "<?= $_START ?>",
			_TOTAL: "<?= $_TOTAL ?>",
			_CLASS: "<?= $_CLASS ?>",
			_FREESTART: "<?= $_FREESTART ?>",
			_NEWSTATUS: "<?= $_NEWSTATUS ?>"
		};

		var runnerStatus = Array();
		runnerStatus[0] = "<?= $_STATUSOK ?>";
		runnerStatus[1] = "<?= $_STATUSDNS ?>";
		runnerStatus[2] = "<?= $_STATUSDNF ?>";
		runnerStatus[3] = "<?= $_STATUSMP ?>";
		runnerStatus[4] = "<?= $_STATUSDSQ ?>";
		runnerStatus[5] = "<?= $_STATUSOT ?>";
		runnerStatus[6] = "<?= $_STATUSNC ?>";
		runnerStatus[9] = "";
		runnerStatus[10] = "";
		runnerStatus[11] = "<?= $_STATUSWO ?>";
		runnerStatus[12] = "<?= $_STATUSMOVEDUP ?>";
		runnerStatus[13] = "<?= $_STATUSFINISHED ?>";

		$(document).ready(function() {
			res = new LiveResults.AjaxViewer(<?= $_GET['comp'] ?>, "<?= $lang ?>", "divClasses", "divLastPassings", "resultsHeader", "resultsControls", "divResults", "txtResetSorting",
				Resources, false, true, "setAutomaticUpdateText", "setCompactViewText", runnerStatus, true, "divRadioPassings", false, "filterText");
			res.compName = "<?= $currentComp->CompName() ?>";
			res.compDate = "<?= $currentComp->CompDate() ?>";
			res.updateResultView('H21-', 0, 1, 10);
		});
	</script>
</head>

<body>
	<table style="width:100%; table-layout:fixed" cellpadding="3px" cellspacing="3" border="0">

		<tr valign=top>
			<td align="left"><b><?= $currentComp->CompName() ?> [<?= $currentComp->CompDate() ?>]</b></td>
		</tr>

		<tr valign=top>
			<td>
				<table id="divResults"></table>
			</td>
		</tr>
	</table>

</body>

</html>