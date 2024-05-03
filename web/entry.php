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

var comp= <?= $_GET['comp']?>;
var ecards = [];

$(document).ready(function()
{	
	var ecards = null;
	fetch('api/messageapi.php?method=getentrydata&comp=' + comp)
        .then(response => response.json())
        .then(data => {
            let clubSelect = document.getElementById('clubSelect');
            data.clubs.forEach(club => {
                let option = document.createElement('option');
                option.text = club.name;
                clubSelect.add(option);
            });
			
			let classSelect = document.getElementById('classSelect');
			data.classes.forEach(classname => {
                let option = document.createElement('option');
                option.text = classname.name;
                classSelect.add(option);
            });
			classSelect.disabled = true;

			ecards = data.ecards;
        });

	$('#submit').click(function() {});
	$('#cancel').click(function() {window.location.href = ('entry.php?comp=' + comp);});



});
	
function step_1_2() {
	document.getElementById('clubSelect').disabled = true;
    document.getElementById('classSelect').disabled = false;
}
function step_2_3() {
    document.getElementById('classSelect').disabled = true;
}
function step_3_4() {
    // Verify ecard
	var ecardNumber = document.getElementById('ecardnumber').value;
	if (ecards.includes(ecardNumber)) {
		document.getElementById('ecardverification').innerHTML = 'Brikkenummeret er allerede i bruk.';
	} else {
		document.getElementById('classSelect').disabled = true;
	}
	
	document.getElementById('classSelect').disabled = true;
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
	<button onclick="step_1_2()">Neste</button>

	<h2>Velg klasse</h2>
	<select id="classSelect" style="width:300px"></select>
	<button onclick="step_2_3()">Neste</button>

	<h2>Brikkenummer</h2>
	<input id="ecardnumber" type="number" style="width:300px"></select>
	<button onclick="step_3_4()">Neste</button>

	<br>Brikkenummer unikt: <div id="ecardverification"></div>

	<h2>Fornavn</h2>
	<input id="firstname" type="text" style="width:300px"></select>
	<button onclick="step_4_5()">Neste</button>

	<h2>Etternavn</h2>
	<input id="lastname" type="text" style="width:300px"></select>
	<button onclick="step_5_6()">Neste</button>

	<h2>Send inn</h2>
	<button id="submit" type="submit">Send in</button>
	<button id="cancel" type="button" onclick="cancelForm()">Avbryt</button>

<?php } 
?>
</html>

