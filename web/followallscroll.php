<?php
date_default_timezone_set("Europe/Oslo");
$lang = "no";
$first = 1;
$last = 999;

if (isset($_GET['lang']))
	$lang = $_GET['lang'];
if (isset($_GET['first']))
	$first = $_GET['first'];
if (isset($_GET['last']))
	$last = $_GET['last'];

include_once("templates/emmalang_en.php");
include_once("templates/emmalang_$lang.php");
include_once("templates/classEmma.class.php");

header('Content-Type: text/html; charset=' . $CHARSET);

$currentComp = new Emma($_GET['comp']);

$showPath = true;

$RunnerStatus = array("1" =>  $_STATUSDNS, "2" => $_STATUSDNF, "11" =>  $_STATUSWO, "12" => $_STATUSMOVEDUP, "9" => $_STATUSNOTSTARTED, "0" => $_STATUSOK, "3" => $_STATUSMP, "4" => $_STATUSDSQ, "5" => $_STATUSOT, "9" => "", "10" => "");
$showTimePrediction = true;

echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
	<title><?= $_TITLE ?> :: <?= $currentComp->CompName() ?> [<?= $currentComp->CompDate() ?>]</title>

	<META HTTP-EQUIV="expires" CONTENT="-1">
	<meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">

	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="theme-color" content="#555556">
	<link href="https://cdn.datatables.net/v/dt/jq-3.7.0/dt-2.1.3/fc-5.0.1/fh-4.0.1/datatables.min.css" rel="stylesheet">
	<link rel="stylesheet" type="text/css" href="css/style-liveres.css">
	<script src="https://cdn.datatables.net/v/dt/jq-3.7.0/dt-2.1.3/fc-5.0.1/fh-4.0.1/datatables.min.js"></script>
	<script language="javascript" type="text/javascript" src="js/liveresults.js"></script>
	<script language="javascript" type="text/javascript" src="js/liveresults.js"></script>
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
							divH.style = "margin-top: 20px; margin-left: 10px; margin-right: 10px; font-size: 20px";
							divH.id = resultsHeader;

							var divR = document.createElement('table');
							document.body.appendChild(divR);
							divR.style = "width: 100%";
							divR.id = divResults;

							res[j] = new LiveResults.AjaxViewer(compID, "no", "divClasses", "divLastPassings", resultsHeader, "resultsControls", divResults,
								"txtResetSorting", Resources, false, true, "setAutomaticUpdateText", "setCompactViewText", runnerStatus, false, "", false, "", true);
							res[j].highTime = 0;
							res[j].noSplits = true;
							res[j].chooseClass(className);

							res[j].compDate = "<?= $currentComp->CompDate(); ?>";
							res[j].eventTimeZoneDiff = <?= $currentComp->TimeZoneDiff(); ?>;
							res[j].updateInterval = 6000;

							<?php if ($currentComp->MassStartSorting()) { ?>
								res[j].curClassIsMassStart = true;
							<?php } ?>

							<?php if ($currentComp->ShowTenthOfSeconds()) { ?>
								res[j].setShowTenth(true);
							<?php } ?>

							<?php if ($currentComp->HighTime()) { ?>
								res[j].highTime = <?= $currentComp->HighTime(); ?> <?php } ?>

								// Set ranked startlist
								<?php if ($currentComp->RankedStartlist() > -1) { ?>
									res[j].rankedStartlist = <?= $currentComp->RankedStartlist(); ?> <?php } ?>

									// Qualification limits and classes (last limit is default)
									res[j].qualLimits = [<?= $currentComp->QualLimits(); ?>];
									res[j].qualClasses = [<?= $currentComp->QualClasses(); ?>];

									j++;
						}
					});
				}
			}
			return;
		};


		function scrollDown(element, document) {
			element.animate({
				scrollTop: document.height()
			}, 20000, scrollUp(element, document));
		};

		function scrollUp(element, document) {
			element.animate({
				scrollTop: -document.height()
			}, 5000);
		};

		$(document).ready(function() {
			first = <?= (isset($_GET['first']) ? $_GET['first'] : 1) ?>;
			last = <?= (isset($_GET['last']) ? $_GET['last'] : 999) ?>;
			$.ajax({
				url: "api/api.php",
				data: "comp=" + <?= $_GET['comp'] ?> + "&method=getclasses",
				success: function(data) {
					handleGetClasses(data, <?= $_GET['comp'] ?>, first, last);
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


		var delayTime = 25;
		var stepSize = 1;

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