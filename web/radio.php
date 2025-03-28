<?php
date_default_timezone_set("Europe/Oslo");
$lang = "no";

if (isset($_GET['lang']))
  $lang = $_GET['lang'];

include_once("templates/emmalang_en.php");
include_once("templates/emmalang_$lang.php");
include_once("templates/classEmma.class.php");
include_once("templates/datatablesURL.php");
header('Content-Type: text/html; charset=' . $CHARSET);

$currentComp = new Emma($_GET['comp']);
$code = isset($_GET['code']);

echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
  <title>LiveRes Radio :: <?= $currentComp->CompName() ?> [<?= $currentComp->CompDate() ?>]</title>

  <META HTTP-EQUIV="expires" CONTENT="-1">
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#555556">

  <link rel="stylesheet" href="<?= $DataTablesURL ?>datatables.min.css">
  <link rel="stylesheet" type="text/css" href="css/style-liveres.css">
  <link rel="stylesheet" type="text/css" href="css/jquery.prompt.css">

  <script src="<?= $DataTablesURL ?>datatables.min.js"></script>
  <script language="javascript" type="text/javascript" src="js/jquery.prompt.js"></script>
  <script language="javascript" type="text/javascript" src="js/liveresults.js"></script>

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

    document.addEventListener("click", enableNoSleep);

    var res = null;
    var Resources = null;
    var runnerStatus = null;
    var callTime = 3;
    var postTime = 5;
    var minBib = null;
    var maxBib = null;

    function switchOpenTimed(open) {
      if (minBib == "")
        minBib = null;
      if (maxBib == "")
        maxBib = null;
      var url = "radio.php?comp=<?= $_GET['comp'] ?>&code=0&calltime=" + callTime + "&posttime=" + postTime + "&minbib=" + minBib + "&maxbib=" + maxBib;
      if (open)
        url += "&openstart";
      window.location = url;
    }

    var audioContext = null

    function switchSound() {
      if (res.audioMute) {
        // Initiate sound 
        if (audioContext == null) {
          audioContext = new(window.AudioContext || window.webkitAudioContext || window.audioContext);

          var buffer = audioContext.createBuffer(1, 1, 22050);
          var source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);
          source.start ? source.start(0) : source.noteOn(0);
        }

        $('#audioOnOff').html(" &#128264; ")
        res.audioMute = false;
      } else {
        $('#audioOnOff').html(" &#128263; ")
        res.audioMute = true;
      }
    }

    function makeStartBeep(longBeep) {
      var oscillator = audioContext.createOscillator();
      var duration = (longBeep ? 1000 : 200);
      var frequency = (longBeep ? 1100 : 900);
      oscillator.type = "sine";
      oscillator.frequency.value = (frequency);
      oscillator.connect(audioContext.destination);
      oscillator.start(0);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    }

    $(document).ready(function() {
      <?php
      if (isset($_GET['calltime']))
        echo 'callTime = ', $_GET['calltime'], ';';
      if (isset($_GET['posttime']))
        echo 'postTime = ', $_GET['posttime'], ';';
      if (isset($_GET['minbib']))
        echo 'minBib = ', $_GET['minbib'], ';';
      if (isset($_GET['maxbib']))
        echo 'maxBib = ', $_GET['maxbib'], ';';
      ?>

      res = new LiveResults.AjaxViewer(<?= $_GET['comp'] ?>, "<?= $lang ?>", "divClasses", "divLastPassings", "resultsHeader", "resultsControls", "divResults", "txtResetSorting",
        Resources, false, true, "setAutomaticUpdateText", "setCompactViewText", runnerStatus, true, "divRadioPassings", false, "filterText");
      res.compName = "<?= $currentComp->CompName() ?>";
      res.compDate = "<?= $currentComp->CompDate() ?>";
      res.eventTimeZoneDiff = <?= $currentComp->TimeZoneDiff() ?>;

      function updateClock() {
        var time = document.getElementById("time");
        var currTime = new Date();
        var HTMLstringCur = currTime.toLocaleTimeString('en-GB');
        time.innerHTML = HTMLstringCur;

        var preTimeID = document.getElementById("pretime");
        if (preTimeID != null) {
          var preTime = new Date(currTime.valueOf() + callTime * 60 * 1000);
          var HTMLstringPre = preTime.toLocaleTimeString('en-GB');
          preTimeID.innerHTML = HTMLstringPre;
        }
      }
      if (<?= $_GET['code'] ?> != 0)
        setInterval(function() {
          updateClock();
        }, 1000);

      if (<?= $_GET['code'] ?> == 0) {
        document.getElementById("callTime").value = callTime;
        document.getElementById("postTime").value = postTime;
        if (minBib != null)
          document.getElementById("minBib").value = minBib;
        if (maxBib != null)
          document.getElementById("maxBib").value = maxBib;
        res.updateStartRegistration(<?= (isset($_GET['openstart']) ? 1 : 0) ?>);
      } else
        res.updateRadioPassings(<?= $_GET['code'] ?>);

      $('#filterText').on('keyup', function() {
        res.filterTable();
      });
      $('#callTime').on('keyup', function() {
        callTime = document.getElementById("callTime").value
      });
      $('#postTime').on('keyup', function() {
        postTime = document.getElementById("postTime").value;
      });
      $('#minBib').on('keyup', function() {
        minBib = document.getElementById("minBib").value;
      });
      $('#maxBib').on('keyup', function() {
        maxBib = document.getElementById("maxBib").value;
      });

    });
  </script>
</head>

<body>

  <?php if (!isset($_GET['comp']) || !isset($_GET['code'])) { ?>
    <h1 class="categoriesheader">Feil. Har du satt compID og postkode? Eks: radio.php?comp=15109&code=120</h1>
  <?php } else { ?>
    <table style="border:none; width:100%; table-layout:fixed; padding:3; border-spacing:3px;">
      <tr style="vertical-align: top;">
        <td>
          <table style="border:none; background-color:#555556; color:#FFF; padding:10px; margin-top:3px; width:100%;">
            <?php if ($_GET['code'] == 0) { ?>
              <tr>
                <td style="text-align: left"><span id="liveIndicator">◉</span>
                  <span style="cursor:pointer; color:#FFF;" onclick="switchSound()" id="audioOnOff"> &#128263; </span>
                  <?php if (isset($_GET['openstart'])) { ?>
                    <b>Fristart</b>&nbsp;&nbsp;<a href="javascript:switchOpenTimed(0)">Tid→</a>
                  <?php } else { ?>
                    <b>Tidsstart</b>&nbsp;&nbsp;<a href="javascript:switchOpenTimed(1)">Fri→</a>
                  <?php } ?>
                </td>
                <td style="text-align: right">Før ⏲ <input type="text" id="callTime" style="width: 30px;"></td>
                <td style="text-align: right">Min № <input type="text" id="minBib" style="width: 30px;"></td>
                <td style="text-align: right" width="10%"><span id="pretime" style="font-style:italic; color:lightgray">00:00:00</span></td>
              </tr>
              <tr>
                <td style="text-align: left"><input type="text" id="filterText" placeholder="filter..." style="width: 90px;"></td>
                <td style="text-align: right">Etter ⏲ <input type="text" id="postTime" style="width: 30px;"></td>
                <td style="text-align: right">Max № <input type="text" id="maxBib" style="width: 30px;"></td>
                <td style="text-align: right" width="10%"><span id="time">00:00:00</span></td>
              </tr>
            <?php } else { ?>
              <tr>
                <td><span id="liveIndicator">◉</span><b>
                    <?php
                    if ($_GET['code'] == 1000) { ?> Mål <?php } else if ($_GET['code'] == -1) { ?> Meldepost: Alle <?php } else if ($_GET['code'] == -2) { ?> Ute i løypa <?php } else { ?> Meldepost: <?= $_GET['code'] ?> <?php } ?>
                  </b>
                </td>
                <td style="text-align: right"><input type="text" id="filterText" placeholder="filter..." style="width: 30px;"></td>
                <td style="text-align: right"><span id="time">00:00:00</span></td>
              </tr>
            <?php } ?>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table id="divRadioPassings" style="width:100%"></table>
        </td>
      </tr>
    </table>
    <?php if ($_GET['code'] == -2) { ?> Antall: <span id="numberOfRunners"></span> <?php } ?>
  <?php } ?>

  <p style="text-align: left; color: #AAA; font-size: 0.7em;">
    Last update: <span id="lastupdate"></span>. Update interval: <span id="updateinterval"></span>s.<br>
</body>

</html>