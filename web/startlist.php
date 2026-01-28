<?php
date_default_timezone_set("Europe/Oslo");
$closeTime = "2030-09-13 07:32:00 +2:00";
$lang = "no";

if (isset($_GET['lang']))
	$lang = $_GET['lang'];

include_once("templates/emmalang_en.php");
include_once("templates/emmalang_$lang.php");
include_once("templates/classEmma.class.php");
include_once("templates/datatablesURL.php");

$isLocal = ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['SERVER_NAME'] == 'localhost');

header('Content-Type: text/html; charset=' . $CHARSET);

$currentComp = new Emma($_GET['comp']);
$code = isset($_GET['code']);

echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
	<title>LiveRes Startliste :: <?= $currentComp->CompName() ?> [<?= $currentComp->CompDate() ?>]</title>

	<META HTTP-EQUIV="expires" CONTENT="-1">
	<meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">

	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="theme-color" content="#555556">

	<link rel="stylesheet" href="<?= $DataTablesURL ?>datatables.min.css">
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
	<link rel="stylesheet" type="text/css" href="css/style-liveres.css">
	<link rel="stylesheet" type="text/css" href="css/jquery.prompt.css">
	<script src="<?= $DataTablesURL ?>datatables.min.js"></script>
	<script language="javascript" type="text/javascript" src="js/jquery.prompt.js"></script>
	<script language="javascript" type="text/javascript" src="js/FileSaver.js"></script>
	<script language="javascript" type="text/javascript" src="js/liveresults.js"></script>
	<script language="javascript" type="text/javascript" src="js/liveresults.common.js"></script>
	<script language="javascript" type="text/javascript" src="js/liveresults.radio.js"></script>
	<script language="javascript" type="text/javascript">
		var res = null;
		var Resources = null;
		var runnerStatus = null;

		$(document).ready(function() {
			res = new LiveResults.AjaxViewer(<?= ($isLocal ? "true" : "false") ?>, <?= $_GET['comp'] ?>, "<?= $lang ?>",
				"divClasses", "divLastPassings", "resultsHeader", "resultsControls", "divResults", "txtResetSorting",
				Resources, false, true, "setAutomaticUpdateText", "setCompactViewText", runnerStatus, true, "divRadioPassings",
				false, false, "filterText");
			res.updateStartList();
			res.compName = '<?= $currentComp->CompName() ?>';

			$('#filterText').on('keyup', function() {
				res.filterTable();
			});

		});
	</script>
</head>

<body>
	<?php if (!isset($_GET['comp'])) { ?>
		<h1 class="categoriesheader">Feil. Har du satt compID</h1>
	<?php } else if (time() - strtotime($closeTime) > 0) { ?>
		<h1 class="categoriesheader">Tjenesten er nå stengt. Se kontaktinfo i Eventor eller henvend deg i løpskontoret.</h1>
	<?php } else { ?>
		<table style="min-width:100%; table-layout:fixed; padding:0; border-spacing:3px; border:none">
			<tr style="vertical-align: top;">
				<td>
					<table style="border:none; background-color:#555556; color:#FFF; padding:10px; margin-top:3px; width:100%;">
						<tr>
							<td style="text-align:left"><b>Startliste</b></td>
							<td style="text-align:center"><b><?= $currentComp->CompName() ?> [<?= $currentComp->CompDate() ?>]</b></td>
							<td style="text-align:right"><button style="height:18px" onclick="res.raceSplitterDialog();">RaceSplitter CSV</button>
								<input type="text" id="filterText" placeholder="søk..." size="10">
							</td>
						</tr>
					</table>
				</td>
			</tr>
			<tr style="vertical-align: top;">
				<td>
					<table id="startList" style="width:100%"></table>
				</td>
			</tr>
		</table>
	<?php } ?>
</body>

</html>