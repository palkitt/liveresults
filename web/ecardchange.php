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
	<title>LiveRes Brikkebytte <?= $currentComp->CompName() ?> [<?= $currentComp->CompDate() ?>]</title>

	<META HTTP-EQUIV="expires" CONTENT="-1">
	<meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="theme-color" content="#555556">
	<link rel="stylesheet" type="text/css" href="css/style-liveres.css">
	<script language="javascript" type="text/javascript" src="../js/jquery-3.7.0.min.js"></script>
	<script language="javascript" type="text/javascript">
		<?php if ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['SERVER_NAME'] == 'localhost') { ?>
			var url = "http://localhost/api/";
		<?php } else { ?>
			var url = "https://api.liveres.live/";
		<?php } ?>

		var comp = <?= $_GET['comp'] ?>;
		var eventOffline = false;
		var ecards = [];
		var runners = [];
		var runnerOK = false;
		var ecardOK = false;
		var sendt = false;
		var ecardFieldActive = false;

		$(document).ready(function() {
			$('#submit').hide();

			fetch(url + "api.php?method=getrunners&comp=" + comp)
				.then(response => response.json())
				.then(data => {
					eventOffline = !data.active;
					if (eventOffline) {
						$('#inactiveinfo').html('Løpsbasen er ikke online så du får ikke bekreftet endringen før senere.');
					}
					// parse all data and fill the ecard array with ecard numbers
					for (var i = 0; i < data.runners.length; i++) {
						if (data.runners[i].ecard1 > 0)
							ecards.push(data.runners[i].ecard1);
						if (data.runners[i].ecard2 > 0)
							ecards.push(data.runners[i].ecard2);

						// Only include runners with bib number and status between 9 and 10
						if (data.runners[i].bib == 0 || data.runners[i].status < 9 || data.runners[i].status > 10)
							continue;
						runners.push(data.runners[i]);
						var name = data.runners[i].name;
						var nameParts = name.split(' ');
						var familyName = nameParts.pop();
						var givenName = nameParts.join(' ');
						data.runners[i].familyName = familyName;
						data.runners[i].givenName = givenName;
					}
					// Sort the runners array by family name
					runners.sort(function(a, b) {
						return a.familyName.localeCompare(b.familyName);
					});
					populateSelect(runners, true);
				});

			$('#ecardnumber').on('focusout keypress', function(e) {
				if (e.type === 'keypress' && e.which !== 13) {
					ecardFieldActive = true;
					return; // If the key pressed was not enter, do nothing
				}
				verifyEcard();
			});

			$('#personSelect').change(function() {
				if ($(this).val() === '') {
					alert('Velg en deltager før du går videre.');
					runnerOK = false;
				} else {
					var bib = parseInt($('#personSelect').val());
					var index = runners.findIndex(function(runner) {
						return runner.bib === bib;
					});
					$('#bib').html(Math.abs(bib));
					$('#name').html(runners[index].name);
					$('#oldecard').html(ecardString(runners[index]));
					runnerOK = true;
				}
				if (runnerOK && ecardOK && !sendt)
					$('#submit').show();
				else
					$('#submit').hide();
			});

			$('#searchInput').on('input', function() {
				var searchQuery = $(this).val().toLowerCase();
				var searchNum = parseInt(searchQuery);

				var filteredRunners = runners.filter(function(runner) {
					if (!isNaN(searchNum))
						return (runner.bib === searchNum || runner.ecard1 === searchNum || runner.ecard2 === searchNum);
					else
						return runner.name.toLowerCase().includes(searchQuery);
				});

				if (filteredRunners.length > 0 && filteredRunners.length < runners.length) {
					populateSelect(filteredRunners);
					$('#personSelect').val(filteredRunners[0].bib);
					$('#bib').html(Math.abs(filteredRunners[0].bib));
					$('#name').html(filteredRunners[0].name);
					$('#oldecard').html(ecardString(filteredRunners[0]));
					runnerOK = true;
				} else {
					populateSelect(runners, true);
					$('#bib').html('...');
					$('#name').html('...');
					$('#oldecard').html('...');
					runnerOK = false;
				}
				if (runnerOK && ecardOK && !sendt)
					$('#submit').show();
				else
					$('#submit').hide();
			});
		});

		$(document).on('touchend', function(e) {
			if (e.target.id !== 'ecardnumber' && ecardFieldActive) {
				// The touchend event was fired outside the ecardnumber text box
				verifyEcard();
			}
		});

		function populateSelect(runners, header = false) {
			var personSelect = $('#personSelect');
			personSelect.empty();
			if (header)
				personSelect.append($('<option>').text('--- Velg løper ---').val(''));
			runners.forEach(function(runner) {
				personSelect.append($('<option>').text('(' + runner.bib + ') ' +
					runner.familyName + ', ' + runner.givenName + ': ' + ecardString(runner)
				).val(runner.bib));
			});
		}

		function ecardString(runner) {
			ecardstr = "";
			if (runner.ecard1 > 0) {
				ecardstr = runner.ecard1;
				if (runner.ecard2 > 0)
					ecardstr = ecardstr + " / " + runner.ecard2;
			} else if (runner.ecard2 > 0)
				ecardstr = runner.ecard2;
			else {
				ecardstr = " - ";
			}
			return ecardstr;
		}

		function verifyEcard() {
			if (sendt)
				return false;
			var ecardNumber = parseInt($('#ecardnumber').val());
			if (isNaN(ecardNumber) || ecardNumber < 1 || ecardNumber > 9999999) {
				ecardOK = false;
				$('#ecardverification').html('Brikkenummeret er ikke gyldig. Prøv på nytt.');
				$('#ecardImage').hide();
			} else if (ecards.includes(ecardNumber)) {
				ecardOK = false;
				$('#ecardverification').html('Brikkenummeret er allerede i bruk. Prøv på nytt.');
				$('#ecardImage').hide();
				// Future: Ask if the user wants to exchange the ecard in the database
			} else {
				ecardOK = true;
				var ecard = $('#ecardnumber').val();
				var emiTag = (ecard < 10000 || ecard > 1000000);
				$('#ecardverification').html('Brikke ' + ecard + ' er OK (' + (emiTag ? 'emiTag' : 'EKT/O-brikke') + ').');
				$('#ecardlastuse').html('<small>...</small>');
				$('#firstname').prop('disabled', false);
				$('#lastname').prop('disabled', false);
				var imageSrc = emiTag ? 'images/emiTag.png' : 'images/EKT.png';
				$('#ecardImage').attr('src', imageSrc).show();

				fetch(url + "messageapi.php?method=getnamefromecard&comp=" + comp + "&ecard=" + ecard)
					.then(response => response.json())
					.then(data => {
						if (data.status == "OK" && data.name != "") {
							var name = data.name;
							var nameParts = name.split(' ');
							var familyName = nameParts.pop();
							var givenName = nameParts.join(' ');
							var yearMonthDay = data.date.split(' ')[0];
							$('#submit').show();
							$('#ecardlastuse').html('<small>Sist brukt: ' + data.comp + ' ' + yearMonthDay + ' av ' + name + '.</small>');
						};
					});
			}
			if (runnerOK && ecardOK && !sendt)
				$('#submit').show();
			else
				$('#submit').hide();
			return ecardOK;
		}

		function submit() {
			var bib = parseInt($('#bib').text());
			if (isNaN(bib)) {
				alert('Velg deltager!');
				return;
			}
			var ecardNumber = $('#ecardnumber').val();
			$('#submit').hide();
			$('#cancel').hide();
			$('#searchInput').prop('disabled', true);
			$('#personSelect').prop('disabled', true);
			$('#ecardnumber').prop('disabled', true);
			sendt = true;
			$.ajax({
				url: url + "messageapi.php?method=sendmessage",
				data: "comp=" + comp + "&dbid=" + -ecardNumber + "&ecardchange=1&message=startnummer: " + bib,
				success: function(data) {
					lookForEntry(bib);
				},
				error: function(data) {
					alert('Det oppstod en feil under registreringen. Prøv igjen eller kontakt løpskontoret.');
					window.location.href = ('ecardchange.php?comp=' + comp);
				}
			});
		}

		function cancel() {
			window.location.href = ('ecardchange.php?comp=' + comp);
		}

		function lookForEntry(bib, last_hash = "", no = 1) {
			if (eventOffline) {
				$('#entrydata').html('Melding om brikkebytte er sendt. Når løpet kommer online blir byttet gjort.');
				$('#cancel').html('Ny endring');
				$('#cancel').show();
			} else {
				var ecardNumber = $('#ecardnumber').val();
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
									// Check if the bib and ecard number in the database matches the one we just registered
									if (data.runners[i].bib == bib && (data.runners[i].ecard1 == ecardNumber || data.runners[i].ecard2 == ecardNumber)) {
										found = true;
										$('#entrydata').html('<b>Ditt brikkebytte er registrert som følger:</b><br>' +
											'<table>' +
											'<tr><td>Startnummer:</td><td>' + data.runners[i].bib + '</td></tr>' +
											'<tr><td>Navn:</td><td>' + data.runners[i].name + '</td></tr>' +
											'<tr><td>Brikkenummer:</td><td>' + ecardString(data.runners[i]) + '</td></tr>' +
											'</table>');

										// Show new ecard change button
										$('#cancel').html('Ny endring');
										$('#cancel').show();
										break;
									}
								}
							}
							if (!found) {
								if (no > 6)
									$('#entrydata').html('Ditt bytte ble ikke registrert! Kontakt løpskontor.');
								else {
									$('#entrydata').html('Venter på tilbakemelding for ditt bytte... <br>Dette kan ta inntil 30 sekunder (nå: ' + no * data.rt + 's)');
									setTimeout(function() {
										lookForEntry(bib, hash, (no + 1));
									}, Math.max(5000, data.rt * 1000));
								}
							}
						}
					},
					error: function(data) {
						alert('Det oppstod en feil under forsøk på brikkebytte. Prøv igjen eller kontakt løpskontoret.');
						window.location.href = ('ecardchange.php?comp=' + comp);
					}
				});
			}
		}
	</script>
</head>

<body>

	<?php if (!isset($_GET['comp'])) { ?>
		<h1 class="categoriesheader">Feil. Har du satt compID? Eks: ecardchange.php?comp=10016</h1>
	<?php } else { ?>
		<div style="font-size: 20px; font-weight: bold; height: 50px; background-color: #555555; padding-left: 5px; 
	vertical-align: middle; line-height:45px; color: white; width: 100%">
			<img src="images/LiveRes.png" height="40px" style="vertical-align: middle" />&nbsp;
			Brikkeendring - <?= $currentComp->CompName() ?>
		</div>

		<div class="maindiv" style="padding-left: 10px; width: 95%; font-size:larger">
			<div id="inactiveinfo" style="color:red; font-size: 1.2em; font-weight:bold;"></div>
			Søk opp deltager eller velg fra lista og legg inn nytt brikkenummer.

			<h2>Søk</h2>
			<div style="margin-bottom: 10px;">
				<input type="text" id="searchInput" placeholder="Søk navn, startnummer eller brikkenummer..." style="width:95%;">
			</div>

			<h2>Deltager</h2>
			<select id="personSelect" style="width:95%;"></select>

			<h2>Valgt deltager</h2>
			<table>
				<tr>
					<td>Startnummer</td>
					<td id="bib">...</td>
				</tr>
				<tr>
					<td>Navn</td>
					<td id="name">...</td>
				</tr>
				<tr>
					<td>Brikkenummer</td>
					<td id="oldecard">...</td>
				</tr>
			</table>

			<h2>Nytt brikkenummer</h2>
			<input id="ecardnumber" type="number" style="width:95%" inputmode="numeric">
			<br>
			<div style="display: flex; align-items: left; width: 95%">
				<div id="ecardImageContainer">&nbsp;
					<img id="ecardImage" src="" style="display: inline-block; width: auto; height: 3em;">
				</div>
				&nbsp;
				<div>
					<div id="ecardverification">...</div>
					<div id="ecardlastuse"><small>...</small></div>
				</div>
			</div>
			<br><br>
			<button id="submit" type="submit" onclick="submit();">Send in</button>
			<button id="cancel" type="button" onclick="cancel();">Avbryt</button>
			<br><br>
			<div id="entrydata">...</div>
		</div>
	<?php }
	?>

</html>