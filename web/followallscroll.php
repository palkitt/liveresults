<?php
date_default_timezone_set("Europe/Oslo");
$lang = "no";

if (isset($_GET['lang']))
	$lang = $_GET['lang'];

$isTime4oComp = isset($_GET['time4o']);
$compID = $_GET['comp'];

include_once("templates/emmalang_en.php");
include_once("templates/emmalang_$lang.php");
include_once("templates/datatablesURL.php");

$isLocal = ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['SERVER_NAME'] == 'localhost');

if (!$isTime4oComp) {
	include_once("templates/classEmma.class.php");
	$currentComp = new Emma($compID);
	$Time4oID = $currentComp->Time4oID();
	error_log("followallscroll.php: Time4oID for LiveRes competition " . $compID . ": " . $Time4oID);
	if ($Time4oID != "") {
		$isTime4oComp = true;
		$compID = $Time4oID;
	}
}

if ($isTime4oComp) {
	$CHARSET = 'utf-8';
	$url = "https://center.time4o.com/api/v1/race/" . rawurlencode((string)$compID);
	$json = file_get_contents($url);
	$data = json_decode($json, true);
	$currentComp = $data["data"];
	$compName = $currentComp["title"];
	$compDate = $currentComp["date"];
	$timeZone = $currentComp["event"]["timezone"] ?? "Europe/Oslo";
	$eventTimeZoneDiff = 0;
	$massStartSorting = false;
	$showTenths = false;
	$highTime = 60;
	$rankedStartlist = -1;
	$qualLimits = "";
	$qualClasses = "";
	$classListUrl = "https://center.time4o.com/api/v1/race/" . rawurlencode((string)$compID) . "/raceClass";
	$classListData = null;
} else {
	$compName = $currentComp->CompName();
	$compDate = $currentComp->CompDate();
	$eventTimeZoneDiff = $currentComp->TimeZoneDiff();
	$timeZone = "Europe/Oslo";
	$massStartSorting = $currentComp->MassStartSorting();
	$showTenths = $currentComp->ShowTenthOfSeconds();
	$highTime = $currentComp->HighTime();
	$rankedStartlist = $currentComp->RankedStartlist();
	$qualLimits = $currentComp->QualLimits();
	$qualClasses = $currentComp->QualClasses();
	$classListUrl = "api/api.php";
	$classListData = "comp=" . $compID . "&method=getclasses";
}

header('Content-Type: text/html; charset=' . $CHARSET);

$showPath = true;

$showTimePrediction = true;

echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
	<title><?= $_TITLE ?> :: <?= $compName ?> [<?= $compDate ?>]</title>

	<META HTTP-EQUIV="expires" CONTENT="-1">
	<meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">

	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="theme-color" content="#555556">
	<link href="<?= $DataTablesURL ?>datatables.min.css" rel="stylesheet">
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
	<link rel="stylesheet" type="text/css" href="css/style-liveres.css">
	<script src="<?= $DataTablesURL ?>datatables.min.js"></script>
	<script language="javascript" type="text/javascript" src="js/liveresults.js"></script>
	<script language="javascript" type="text/javascript" src="js/liveresults.common.js"></script>
	<?php if ($isTime4oComp) { ?>
		<script language="javascript" type="text/javascript" src="js/liveresults.time4o.js"></script>
	<?php } ?>
	<script language="javascript" type="text/javascript">
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
			_STATUSNOTSHOWN: "<?= $_STATUSNOTSHOWN ?>",
			_NEWSTATUS: "<?= $_NEWSTATUS ?>"
		};

		var runnerStatus = Array();
		runnerStatus[0] = "<?= $_STATUSOK ?>";
		runnerStatus[1] = "<?= $_STATUSDNS ?>";
		runnerStatus[2] = "<?= $_STATUSDNF ?>";
		runnerStatus[3] = "<?= $_STATUSMP ?>";
		runnerStatus[4] = "<?= $_STATUSDSQ ?>";
		runnerStatus[5] = "<?= $_STATUSOT ?>";
		runnerStatus[9] = "";
		runnerStatus[10] = "";
		runnerStatus[11] = "<?= $_STATUSWO ?>";
		runnerStatus[12] = "<?= $_STATUSMOVEDUP ?>";
		runnerStatus[13] = "<?= $_STATUSFINISHED ?>";

		function handleGetClasses(data, compID, first, last) {
			<?php if ($isTime4oComp) { ?>
				if (!data || !Array.isArray(data.data)) {
					return;
				}
				var classNormalizer = Object.create(LiveResults.AjaxViewer.prototype);
				var classes = classNormalizer.Time4oClassesToLiveres(data).classes;
				data = {
					status: "OK",
					classes: classes
				};
			<?php } ?>
			if (data != null && data.status == "OK") {
				if (!data.classes || !$.isArray(data.classes) || data.classes.length == 0) {
					return null;
				}
				if (data.classes != null) {

					var classes = data.classes;
					classes.sort(function(a, b) {
						var x = [a.className.toLowerCase(), b.className.toLowerCase()];
						for (var i = 0; i < 2; i++) {
							if (x[i].includes("åpen") || x[i].includes("open") || x[i].includes("gjest") || x[i].includes("dir") || x[i].includes("utv"))
								x[i] = 'z' + x[i];
							x[i] = x[i].replace(/(^|[^\d])(\d)($|[^\d])/, '$100$2$3'); // Add 00 ahead of single digits
							x[i] = x[i].replace(/(^|[^\d])(\d)(\d)($|[^\d])/, '$10$2$3$4'); // Add  0 ahead of double digits
							x[i] = x[i].replace(' ', '');
							x[i] = x[i].replace('-', '');
							x[i] = x[i].replace('+', '');
						}
						if (x[0] < x[1]) {
							return -1;
						}
						if (x[0] > x[1]) {
							return 1;
						}
						return 0;
					});

					var res = Array();
					var j = 0;
					var n = 0;
					var resH = "resultsHeader";
					var resD = "divResults";

					$.each(classes, function(key, value) {
						var className = value.className;
						n++;
						if (className && className.length > 0 && n >= first && n <= last) {
							var resultsHeader = resH.concat(j);
							var divResults = resD.concat(j);

							var divH = document.createElement('table');
							document.body.appendChild(divH);
							let style = "margin-top: 20px; padding-left: 10px; font-size: 20px;";
							style += "width: 100%; position: sticky; top: 0; z-index:1000; background: white;";
							divH.style = style;
							divH.id = resultsHeader;

							var divR = document.createElement('table');
							document.body.appendChild(divR);
							divR.style = "width: 100%";
							divR.id = divResults;

							res[j] = new LiveResults.AjaxViewer(<?= ($isLocal ? "true" : "false") ?>, compID, "no", "divClasses", "divLastPassings", resultsHeader, divResults,
								"txtResetSorting", Resources, false, true, "setAutomaticUpdateText", "setCompactViewText", runnerStatus, false, "", false, <?= ($isTime4oComp ? "true" : "false") ?>, null, true);
							res[j].highTime = 0;
							res[j].noSplits = true;
							res[j].compDate = "<?= $compDate ?>";
							res[j].eventTimeZoneDiff = <?= $eventTimeZoneDiff ?>;
							res[j].timeZone = "<?= $timeZone ?>";

							<?php if ($massStartSorting) { ?>
								res[j].curClassIsMassStart = true;
							<?php } ?>

							<?php if ($showTenths) { ?>
								res[j].setShowTenth(true);
							<?php } ?>

							<?php if ($highTime) { ?>
								res[j].highTime = <?= $highTime ?>
							<?php } ?>

							<?php if ($rankedStartlist > -1) { ?>
								res[j].rankedStartlist = <?= $rankedStartlist ?>
							<?php } ?>

							<?php if ($isTime4oComp) { ?>
								res[j].activeClasses = classes;
							<?php } ?>

							res[j].chooseClass(className);

							// Qualification limits and classes (last limit is default)
							res[j].qualLimits = [<?= $qualLimits ?>];
							res[j].qualClasses = [<?= $qualClasses ?>];

							j++;
						}
					});
				}
			}
			return;
		};


		$(document).ready(function() {
			first = <?= (isset($_GET['first']) ? $_GET['first'] : 1) ?>;
			last = <?= (isset($_GET['last']) ? $_GET['last'] : 999) ?>;
			$.ajax({
				url: <?= json_encode($classListUrl) ?>,
				<?php if ($classListData !== null) { ?>
					data: <?= json_encode($classListData) ?>,
				<?php } ?>
				success: function(data) {
					handleGetClasses(data, <?= json_encode((string)$compID) ?>, first, last);
				},
				error: function() {},
				dataType: "json"
			});

			setTimeout(function() {
				var divText = document.createElement('text');
				document.body.appendChild(divText);
				divText.style = "margin-top: 20px; font-size: 20px";
				divText.innerHTML = "<p>...</p>";
			}, 10000);

			// Add no screen sleep
			document.addEventListener("click", enableNoSleep);
		});
	</script>
	<script language="javascript" type="text/javascript">
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

		var stepSize = 1;
		var speed = <?= (isset($_GET['speed']) ? $_GET['speed'] : 5) ?>;
		var delayTime = 25 * (5 / speed);

		function pageScroll() {
			var currentY = window.scrollY;
			var bodyHeight = document.body.offsetHeight;
			var yPos = currentY + window.innerHeight;
			var scroller = setTimeout('pageScroll()', delayTime);
			currentY += stepSize;
			if (yPos >= bodyHeight) {
				clearTimeout(scroller);
				scroller = setTimeout(() => {
					window.scroll(0, 0);
					scroller = setTimeout('pageScroll()', 5000);
				}, 5000);
			} else {
				window.scroll(0, currentY);
			}
		}
		setTimeout('pageScroll()', 5000);
	</script>

</head>

<body>
</body>

</html>