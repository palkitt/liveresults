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
<head><title>LiveRes Entry <?=$currentComp->CompName()?> [<?=$currentComp->CompDate()?>]</title>

<META HTTP-EQUIV="expires" CONTENT="-1">
<meta http-equiv="Content-Type" content="text/html;charset=<?=$CHARSET?>">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#555556">

<link rel="stylesheet" type="text/css" href="css/style-freidig.css">
<script language="javascript" type="text/javascript" src="../js/jquery-3.7.0.min.js"></script>
<script language="javascript" type="text/javascript">

<?php if($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['SERVER_NAME'] == 'localhost'){ ?> 
	var url = "http://localhost/api/messageapi.php";
<?php } else { ?> 
	var url = "https://api.liveres.live/messageapi.php";
<?php } ?>

var comp= <?= $_GET['comp']?>;
var ecards = [];
var vacants = [];
var reservedID = 0;

$(document).ready(function()
{	
	$('#firstname, #lastname').on('input', function() {
		var firstName = $('#firstname').val();
		var lastName = $('#lastname').val();
		if (firstName.trim() !== '' && lastName.trim() !== '') {
			$('#submit').show();
		} else {
			$('#submit').hide();
		}
	});	
	
	fetch(url + "?method=getentrydata&comp=" + comp)
        .then(response => response.json())
        .then(data => {
            let clubSelect = $('#clubSelect');
            data.clubs.forEach(club => {
                let option = $('<option>').text(club.name);
				clubSelect.append(option);
            });
			
			vacants = data.vacants;
			var classes = vacants.map(vacant => vacant.class);
			var classNames = [...new Set(classes)];
			classNames.sort();

			let classSelect = $('#classSelect');
			classNames.forEach(classname => {
                let option = $('<option>').text(classname);
				classSelect.append(option);
            });
			classSelect.prop('disabled', true);
			ecards = data.ecards;
        });

	$('#clubSelect').change(function() {
		$('#clubSelect').prop('disabled', true).css('background-color', 'lightgrey');
		$('#classSelect').prop('disabled', false).css('background-color', 'yellow');
	});

	$('#classSelect').change(function() {
		// Reserve a dbid
		var reservedOK = false
		var className = $('#classSelect').val();
		fetch(url + "?method=reservevacant&comp=" + comp + "&class='" + className + "'")
			.then(response => response.json())
			.then(data => {
				reservedOK = data.status == "OK";
				if (!reservedOK) {
					alert('Det oppstod en feil under reservering av ledig plass. Prøv igjen eller kontakt løpskontoret.');
					window.location.href = ('entry.php?comp=' + comp);
				}
				else
					reservedID = data.reservedID;
			});
		$('#classverification').html('En plass i klasse ' + className + ' er reservert i 5 minutter.');
		$('#classSelect').prop('disabled', true).css('background-color', 'lightgrey');
		$('#ecardnumber').prop('disabled', false).css('background-color', 'yellow');
		$('#3_4').show();
	});
	
	$('#cancel').click(function() {window.location.href = ('entry.php?comp=' + comp);});
	$('#classSelect').prop('disabled', true).css('background-color', 'lightgrey');
	$('#ecardnumber').prop('disabled', true).css('background-color', 'lightgrey');
	$('#firstname').prop('disabled', true).css('background-color', 'lightgrey');
	$('#lastname').prop('disabled', true).css('background-color', 'lightgrey');
	$('#2_3').hide();
	$('#3_4').hide();
	$('#submit').hide();
});
	

function step_3_4() {
    // Verify ecard
	var ecardNumber = parseInt($('#ecardnumber').val());
	if (isNaN(ecardNumber) || ecardNumber < 1 || ecardNumber > 9999999) {
		$('#ecardverification').html('Brikkenummeret er ikke gyldig. Prøv på nytt.');
	}
	else if (ecards.includes(ecardNumber)) {
		$('#ecardverification').html('Brikkenummeret er allerede i bruk. Prøv på nytt.');
	} else {
		$('#ecardverification').html('Brikkenummer OK');
		$('#ecardnumber').prop('disabled', true).css('background-color', 'lightgrey');
		$('#firstname').prop('disabled', false).css('background-color', 'yellow');
		$('#lastname').prop('disabled', false).css('background-color', 'yellow');
		$('#3_4').hide();
	}
}
function submit() {
	var firstName = $('#firstname').val();
	var lastName = $('#lastname').val();
	var ecardNumber = $('#ecardnumber').val();
	var club = $('#clubSelect').val();
	var className = $('#classSelect').val();

	var data = {
		firstName: firstName,
		lastName: lastName,
		ecardNumber: ecardNumber,
		club: club,
		className: className
	};

	var jsonData = JSON.stringify(data);

	if (jsonData != null && jsonData != ""){
		jsonData = jsonData.substring(0,250);
		$.ajax({
			url: url + "?method=sendmessage", 
			data: "&comp=" + comp + "&dbid=" + reservedID + "&newentry=1&message=" + jsonData,
			success: function(data) {
				alert('Din påmelding er registrert! Om arrangør er online vil du dukke opp i startlistene innen ett minutt. Du sendes videre til klassen din.');
				window.location.href = ('followfull.php?comp=' + comp + '&#' + className);
			},
			error: function(data) {
				alert('Det oppstod en feil under registreringen. Prøv igjen eller kontakt løpskontoret.');
				window.location.href = ('entry.php?comp=' + comp);
			}
		});
	}
}

</script>
</head>
<body>

<?php if (!isset($_GET['comp']) ) 
{ ?> 
	<h1 class="categoriesheader">Feil. Har du satt compID? Eks: entry.php?comp=10016</h1>
<?php }	
else
{ ?>
	<div style="font-size: 20px; font-weight: bold; height: 50px; background-color: #555555; padding-left: 5px; 
	vertical-align: middle; line-height:45px; color: white; width: 100%">
	<img src="images/LiveRes.png" height="40px" style="vertical-align: middle"/>&nbsp; 
	Direktepåmelding til <?=$currentComp->CompName()?>, <small><?=$currentComp->CompDate()?></small>
	</div>
	
	<h2>Velg klubb</h2>
	<select id="clubSelect" style="width:300px; background-color: yellow;"></select>
	<br>Kontakt løpskontor om din klubb ikke er i lista.

	<h2>Velg klasse</h2>
	<select id="classSelect" style="width:300px"></select>
	<br><div id="classverification">Tilbakemelding klasse</div>

	<h2>Brikkenummer</h2>
	<input id="ecardnumber" type="number" style="width:300px"></select>
	<button id="3_4" onclick="step_3_4();" style="background-color: yellow;">Sjekk</button>
	<br><div id="ecardverification">Tilbakemelding brikke</div>

	<h2>Fornavn</h2>
	<input id="firstname" type="text" style="width:300px"></select>

	<h2>Etternavn</h2>
	<input id="lastname" type="text" style="width:300px"></select>

	<br><br>
	<button id="submit" type="submit" onclick="submit();" style="background-color: yellow;">Send in</button>
	<button id="cancel" type="button">Avbryt</button>

<?php } 
?>
</html>

