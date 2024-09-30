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
	<title>LiveRes Entry <?= $currentComp->CompName() ?> [<?= $currentComp->CompDate() ?>]</title>

	<META HTTP-EQUIV="expires" CONTENT="-1">
	<meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">

	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="theme-color" content="#555556">

	<link rel="stylesheet" type="text/css" href="css/style-freidig.css">
	<script language="javascript" type="text/javascript" src="../js/jquery-3.7.0.min.js"></script>
	<script language="javascript" type="text/javascript">
		<?php if ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['SERVER_NAME'] == 'localhost') { ?>
			var url = "http://localhost/api/";
		<?php } else { ?>
			var url = "https://api.liveres.live/";
		<?php } ?>

		var comp = <?= $_GET['comp'] ?>;
		var ecards = [];
		var vacants = [];
		var reservedID = 0;
		var ecardFieldActive = false;

		$(document).ready(function() {
			fetch(url + "messageapi.php?method=getentrydata&comp=" + comp)
				.then(response => response.json())
				.then(data => {
					if (!data.active) {
						$('#inactiveinfo').html('Løpet er ikke online! Kontakt løpskontor eller prøv igjen senere.');
						$('#clubSelect').prop('disabled', true);
						$('#clubSelect').prop('disabled', true).css('background-color', '');
					}
					let clubSelect = $('#clubSelect');
					clubSelect.append($('<option>').text('--- Velg klubb ---').val(''));
					var noClubOption = false;
					data.clubs.forEach(club => {
						clubSelect.append($('<option>').text(club.name));
						if (club.name == 'NOTEAM')
							noClubOption = true;
					});
					if (!noClubOption)
						clubSelect.append($('<option>').text('NOTEAM'));
					vacants = data.vacants;
					var classes = vacants.map(vacant => vacant.class);
					var classCounts = classes.reduce((counts, className) => {
						counts[className] = (counts[className] || 0) + 1;
						return counts;
					}, {});
					var classNames = Object.keys(classCounts).sort();
					let classSelect = $('#classSelect');
					if (classNames.length == 0)
						classSelect.append($('<option>').text('--- Ingen ledige plasser ---').val(''));
					else
						classSelect.append($('<option>').text('--- Velg klasse ---').val(''));
					classNames.forEach(classname => {
						classSelect.append($('<option>').text(`${classname} (${classCounts[classname]} ledig)`).val(classname));
					});
					classSelect.prop('disabled', true);
					ecards = data.ecards;
				});

			$('#clubSelect').change(function() {
				if ($(this).val() === '')
					alert('Velg en klubb før du går videre.');
				else {
					var club = $('#clubSelect').val();
					$('#clubverification').html(club + ' er valgt klubb');
					$('#classSelect').prop('disabled', false);
				}
			});

			$('#classSelect').change(function() {
				if ($(this).val() === '')
					alert('Velg en klasse før du går videre.');
				else {
					var reservedOK = false
					var className = $('#classSelect').val();
					var classNameURI = encodeURIComponent(className);
					var randomNo = Date.now().toString().slice(-4);
					fetch(url + "messageapi.php?method=reservevacant&comp=" + comp + "&class=" + classNameURI + "&cancelid=" + reservedID + "&rand=" + randomNo)
						.then(response => response.json())
						.then(data => {
							reservedOK = data.status == "OK";
							if (!reservedOK) {
								alert('Det oppsto en feil under reservering av ledig plass. Prøv igjen eller kontakt løpskontoret.');
								window.location.href = ('entry.php?comp=' + comp);
							} else
								reservedID = data.reservedID;
						});
					$('#classverification').html('En plass i klasse ' + className + ' er reservert i 5 minutter.');
					$('#ecardnumber').prop('disabled', false);
					$('#rent').prop('disabled', false);
				}
			});

			$('#ecardnumber').on('focusout keypress', function(e) {
				if (e.type === 'keypress' && e.which !== 13) {
					ecardFieldActive = true;
					return; // If the key pressed was not enter, do nothing
				}
				verifyEcard();
			});

			$('#firstname, #lastname').on('input', function() {
				var firstName = $('#firstname').val();
				var lastName = $('#lastname').val();
				if (firstName.trim() !== '' && lastName.trim() !== '')
					$('#submit').show();
				else
					$('#submit').hide();
			});

			$('#classSelect').prop('disabled', true);
			$('#ecardnumber').prop('disabled', true);
			$('#rent').prop('disabled', true);
			$('#firstname').prop('disabled', true);
			$('#lastname').prop('disabled', true);
			$('#submit').hide();
		});

		$(document).on('touchend', function(e) {
			if (e.target.id !== 'ecardnumber' && ecardFieldActive) {
				// The touchend event was fired outside the ecardnumber text box
				verifyEcard();
			}
		});

		function verifyEcard() {
			var ecardNumber = parseInt($('#ecardnumber').val());
			if (isNaN(ecardNumber) || ecardNumber < 1 || ecardNumber > 9999999) {
				$('#ecardverification').html('Brikkenummeret er ikke gyldig. Prøv på nytt.');
			} else if (ecards.includes(ecardNumber)) {
				$('#ecardverification').html('Brikkenummeret er allerede i bruk. Prøv på nytt.');
			} else {
				var ecard = $('#ecardnumber').val();
				$('#ecardverification').html('Brikke ' + ecard + ' er OK.');
				$('#ecardlastuse').html('<small>...</small>');
				$('#firstname').prop('disabled', false);
				$('#lastname').prop('disabled', false);
				ecardFieldActive = false;

				fetch(url + "messageapi.php?method=getnamefromecard&comp=" + comp + "&ecard=" + ecard)
					.then(response => response.json())
					.then(data => {
						if (data.status == "OK" && data.name != "") {
							var name = data.name;
							var nameParts = name.split(' ');
							var familyName = nameParts.pop();
							var givenName = nameParts.join(' ');
							var yearMonthDay = data.date.split(' ')[0];
							$('#firstname').val(givenName);
							$('#lastname').val(familyName);
							$('#submit').show();
							$('#ecardlastuse').html('<small>Sist brukt: ' + data.comp + ' ' + yearMonthDay + ' av ' + name + '.</small>');
						};
					});
			}
		}

		function submit() {
			var firstName = $('#firstname').val();
			var lastName = $('#lastname').val();
			var ecardNumber = $('#ecardnumber').val();
			var club = $('#clubSelect').val();
			var className = $('#classSelect').val();
			var rent = $('#rent').prop('checked');
			$('#clubSelect').prop('disabled', true);
			$('#classSelect').prop('disabled', true);
			$('#ecardnumber').prop('disabled', true);
			$('#rent').prop('disabled', true);
			$('#firstname').prop('disabled', true);
			$('#lastname').prop('disabled', true);
			$('#submit').hide();
			$('#cancel').hide();

			var data = {
				firstName: firstName,
				lastName: lastName,
				ecardNumber: ecardNumber,
				club: club,
				className: className,
				rent: rent
			};

			var jsonData = JSON.stringify(data);
			if (jsonData != null && jsonData != "") {
				jsonData = jsonData.substring(0, 250);
				$.ajax({
					url: url + "messageapi.php?method=sendmessage",
					data: "comp=" + comp + "&dbid=" + reservedID + "&newentry=1&message=" + jsonData,
					success: function(data) {
						lookForEntry(reservedID);
					},
					error: function(data) {
						alert('Det oppstod en feil under registreringen. Prøv igjen eller kontakt løpskontoret.');
						window.location.href = ('entry.php?comp=' + comp);
					}
				});
			}
		}

		function cancel() {
			if (reservedID > 0)
				fetch(url + "messageapi.php?method=reservevacant&comp=" + comp + "&class=None&cancelid=" + reservedID)
			window.location.href = ('entry.php?comp=' + comp);
		}

		function lookForEntry(dbid, last_hash = "", no = 1) {
			var ecardNumber = $('#ecardnumber').val();
			var className = encodeURIComponent($('#classSelect').val());
			$.ajax({
				url: url + "api.php?method=getrunners",
				data: "comp=" + comp + "&last_hash=" + last_hash,
				success: function(data) {
					if (data != null && data != "") {
						found = false;
						hash = last_hash;
						if (data.status = "OK" && data.runners != undefined) {
							hash = data.hash;
							for (var i = 0; i < data.runners.length; i++) {
								// Check if the dbid and ecard number in the database matches the one we just registered
								if (data.runners[i].dbid == dbid && data.runners[i].ecard1 == ecardNumber) {
									found = true;
									$('#entrydata').html('<b>Din påmelding er registrert som følger:</b><br>' +
										'<table>' +
										'<tr><td>Navn:</td><td>' + data.runners[i].name + '</td></tr>' +
										'<tr><td>Klubb:</td><td>' + data.runners[i].club + '</td></tr>' +
										'<tr><td>Klasse:</td><td>' + data.runners[i].class + '</td></tr>' +
										'<tr><td>Brikkenummer:</td><td>' + data.runners[i].ecard1 + '</td></tr>' +
										'<tr><td>Startnummer:</td><td>' + (data.runners[i].bib > 0 ? data.runners[i].bib : " - ") + '</td></tr>' +
										'<tr><td>Starttid:</td><td>' + data.runners[i].start + '</td></tr>' +
										'</table>');
									break;
								}
							}
						}
						if (!found) {
							if (no > 6)
								$('#entrydata').html('Din påmelding ble ikke registrert! Kontakt løpskontor.');
							else {
								$('#entrydata').html('Venter på tilbakemelding for din registering... <br>Dette kan ta inntil 30 sekunder (nå: ' + no * data.rt + 's)');
								setTimeout(function() {
									lookForEntry(dbid, hash, (no + 1));
								}, Math.max(5000, data.rt * 1000));
							}
						}
					}
				},
				error: function(data) {
					alert('Det oppstod en feil under søk etter påmelding. Prøv igjen eller kontakt løpskontoret.');
					window.location.href = ('entry.php?comp=' + comp);
				}
			});
		}
	</script>
</head>

<body>

	<?php if (!isset($_GET['comp'])) { ?>
		<h1 class="categoriesheader">Feil. Har du satt compID? Eks: entry.php?comp=10016</h1>
	<?php } else { ?>
		<div style="font-size: 20px; font-weight: bold; height: 50px; background-color: #555555; padding-left: 5px; 
	vertical-align: middle; line-height:45px; color: white; width: 100%">
			<img src="images/LiveRes.png" height="40px" style="vertical-align: middle" />&nbsp;
			Direktepåmelding til <?= $currentComp->CompName() ?>, <small><?= $currentComp->CompDate() ?></small>
		</div>

		<div class="maindiv" style="padding-left: 10px; width: 95%; font-size:larger">

			<div id="inactiveinfo" style="color:red; font-size: 1.5em; font-weight:bold;"></div>

			<h2>Velg klubb</h2>
			<select id="clubSelect" style="width:95%;"></select>
			<br>
			<div id="clubverification">Kontakt løpskontor om din klubb ikke er i lista.</div>

			<h2>Velg klasse</h2>
			<select id="classSelect" style="width:95%"></select>
			<br>
			<div id="classverification">...</div>

			<h2>Brikkenummer</h2>
			<input id="ecardnumber" type="number" style="width:70%" inputmode="numeric">
			<div style="text-align: right; display: inline-block; width: 25%;">&nbsp;
				<input id="rent" type="checkbox" value="no">&nbsp;Leiebrikke
			</div>
			<br>
			<div id="ecardverification">...</div>
			<div id="ecardlastuse"><small>...</small></div>

			<h2>Fornavn</h2>
			<input id="firstname" type="text" style="width:95%">

			<h2>Etternavn</h2>
			<input id="lastname" type="text" style="width:95%">

			<br><br>
			<button id="submit" type="submit" onclick="submit();">Send in</button>
			<button id="cancel" type="button" onclick="cancel();">Avbryt</button>

			<br><br>
			<div id="entrydata">...</div>

		</div>
	<?php }
	?>

</html>