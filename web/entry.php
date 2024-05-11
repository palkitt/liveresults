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

this.local = true;
this.URL = (this.local ? "api/messageapi.php" : "//api.liveres.live/messageapi.php");
var comp= <?= $_GET['comp']?>;
var ecards = [];

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
	
	
	fetch('api/messageapi.php?method=getentrydata&comp=' + comp)
        .then(response => response.json())
        .then(data => {
            let clubSelect = $('#clubSelect');
            data.clubs.forEach(club => {
                let option = $('<option>').text(club.name);
				clubSelect.append(option);
            });
			
			let classSelect = $('#classSelect');
			data.classes.forEach(classname => {
                let option = $('<option>').text(classname.name);
				classSelect.append(option);
            });
			classSelect.prop('disabled', true);
			ecards = data.ecards;
        });

	$('#cancel').click(function() {window.location.href = ('entry.php?comp=' + comp);});
	$('#ecardnumber').prop('disabled', true);
	$('#firstname').prop('disabled', true);
	$('#lastname').prop('disabled', true);
	$('#2_3').hide();
	$('#3_4').hide();
	$('#submit').hide();
});
	
function step_1_2() {
	$('#clubSelect').prop('disabled', true);
    $('#classSelect').prop('disabled', false);
	$('#1_2').hide();
	$('#2_3').show();
}
function step_2_3() {
    $('#classSelect').prop('disabled', true);
	$('#ecardnumber').prop('disabled', false);
	$('#2_3').hide();
	$('#3_4').show();
}
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
		$('#ecardnumber').prop('disabled', true);
		$('#firstname').prop('disabled', false);
		$('#lastname').prop('disabled', false);
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
			url: this.URL + "?method=sendmessage", 
			data: "&comp=" + comp + "&dbid=0&newentry=1&message=" + jsonData,
			success: function(data) {
				alert('Din påmelding er registrert!');
				window.location.href = ('entry.php?comp=' + comp);
			},
			error: function(data) {
				alert('Det oppstod en feil under registreringen. Prøv igjen senere.');
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
	<h2>Velg klubb (kontakt løpskontor om ikke din klubb står her)</h2>
	<select id="clubSelect" style="width:300px"></select>
	<button id="1_2" onclick="step_1_2()">Neste</button>

	<h2>Velg klasse</h2>
	<select id="classSelect" style="width:300px"></select>
	<button id="2_3" onclick="step_2_3()">Neste</button>

	<h2>Brikkenummer</h2>
	<input id="ecardnumber" type="number" style="width:300px"></select>
	<button id="3_4" onclick="step_3_4()">Neste</button>

	<br><div id="ecardverification"></div>

	<h2>Fornavn</h2>
	<input id="firstname" type="text" style="width:300px"></select>

	<h2>Etternavn</h2>
	<input id="lastname" type="text" style="width:300px"></select>

	<br><br>
	<button id="submit" type="submit" onclick="submit()">Send in</button>
	<button id="cancel" type="button">Avbryt</button>

<?php } 
?>
</html>

