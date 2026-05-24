<?php
date_default_timezone_set("Europe/Oslo");
header('Content-Type: text/html; charset=utf-8');

$lang = "no";

if (isset($_GET['lang']))
  $lang = $_GET['lang'];
$compID = $_GET['comp'];
$Time4oID = "";
$LiveResID = "";
$isTime4oComp = "false";

include_once("templates/emmalang_en.php");
include_once("templates/emmalang_$lang.php");
include_once("templates/classEmma.class.php");
include_once("templates/datatablesURL.php");

$isLocal = ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['SERVER_NAME'] == 'localhost');

$currentComp = new Emma($compID);
$compName = $currentComp->CompName();
$compDate = $currentComp->CompDate();
$eventTimeZoneDiff = $currentComp->TimeZoneDiff();
$Time4oID = $currentComp->Time4oID();
$LiveResID = $compID;
if ($Time4oID != "") {
  $isTime4oComp = "true";
  $compID = $Time4oID;
}
echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
  <title>LiveRes Radio :: <?= $compName ?> [<?= $compDate ?>]</title>

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
  <script language="javascript" type="text/javascript" src="js/liveresults.js"></script>
  <script language="javascript" type="text/javascript" src="js/liveresults.common.js"></script>
  <script language="javascript" type="text/javascript" src="js/liveresults.radio.js"></script>
  <?php if ($isTime4oComp) { ?>
    <script language="javascript" type="text/javascript" src="js/liveresults.time4o.js"></script>
  <?php } ?>
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
    var Resources = {
      _FREESTART: "<?= $_FREESTART ?>"
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
    var preTime = 1;
    var callTime = 3;
    var postTime = 5;
    var minBib = null;
    var maxBib = null;

    function switchOpenTimed(open) {
      if (minBib == "")
        minBib = null;
      if (maxBib == "")
        maxBib = null;
      var url = "radio.php?comp=<?= $_GET['comp'] ?>&code=0&calltime=" + callTime + "&posttime=" + postTime +
        "&pretime=" + preTime + "&minbib=" + minBib + "&maxbib=" + maxBib;
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
      if (isset($_GET['pretime']))
        echo 'preTime = ', $_GET['pretime'], ';';
      if (isset($_GET['minbib']))
        echo 'minBib = ', $_GET['minbib'], ';';
      if (isset($_GET['maxbib']))
        echo 'maxBib = ', $_GET['maxbib'], ';';
      ?>

      res = new LiveResults.AjaxViewer(<?= ($isLocal ? "true" : "false") ?>, "<?= $compID ?>", "<?= $lang ?>",
        "divClasses", "divLastPassings", "resultsHeader", "divResults", "txtResetSorting",
        Resources, false, true,
        "setAutomaticUpdateText", "setCompactViewText", runnerStatus, false, "divRadioPassings",
        false, <?= ($isTime4oComp) ?>, "filterText");

      res.compName = "<?= $compName ?>";
      res.compDate = "<?= $compDate ?>";
      res.eventTimeZoneDiff = <?= $eventTimeZoneDiff ?>;
      res.Time4oId = "<?= $Time4oID ?>";
      res.LiveResID = <?= $LiveResID ?>;

      // Load user alias from localStorage
      var savedAlias = res.getUserAlias();
      if (savedAlias) {
        $('#userAlias').val(savedAlias);
      }

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

      var delay = 0;
      if (<?= $isTime4oComp ?>) {
        res.updateClassList();
        var delay = 500;
      }

      if (<?= $_GET['code'] ?> == 0) {
        document.getElementById("callTime").value = callTime;
        document.getElementById("postTime").value = postTime;
        document.getElementById("preTime").value = preTime;
        if (minBib != null)
          document.getElementById("minBib").value = minBib;
        if (maxBib != null)
          document.getElementById("maxBib").value = maxBib;

        setTimeout(function() {
          res.updateStartRegistration(<?= (isset($_GET['openstart']) ? 1 : 0) ?>);
        }, delay);

      } else {
        setTimeout(function() {
          res.updateRadioPassings(<?= $_GET['code'] ?>);
        }, delay);
      }

      $('#filterText').on('keyup', function() {
        res.filterTable();
      });
      $('#callTime').on('keyup', function() {
        callTime = document.getElementById("callTime").value
      });
      $('#postTime').on('keyup', function() {
        postTime = document.getElementById("postTime").value;
      });
      $('#preTime').on('keyup', function() {
        preTime = document.getElementById("preTime").value;
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
                <td style="text-align: left"><span id="liveIndicator">◉</span> <b>Startregistrering</b></td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Før</span> <input type="text" id="preTime" style="width: 40px; background-color: lightgray;"></td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Filter</span> <input type="text" id="filterText" placeholder="filter..." style="width: 40px;"></td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Nå</span><span style="cursor:pointer; color:#FFF;" onclick="switchSound()" id="audioOnOff"> &#128263;</span>
                  <span style="display:inline-block; width: 50px;" id="time">00:00:00</span>
                </td>
              </tr>
              <tr>
                <td style="text-align: left">Type:
                  <?php if (isset($_GET['openstart'])) { ?>
                    Fristart
                  <?php } else { ?>
                    Tidsstart
                  <?php } ?>
                </td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Opprop</span> <input type="text" id="callTime" style="width: 40px; background-color: yellow;"></td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Min №</span> <input type="text" id="minBib" style="width: 40px;"></td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Opprop</span> <span id="callClock" style="display:inline-block; font-style:italic; color:yellow; width: 50px;">00:00:00</span></td>
              </tr>
              <tr>
                <td style="text-align: left">
                  <?php if (isset($_GET['openstart'])) { ?>
                    <a href="javascript:switchOpenTimed(0)" style="color:#FFF; text-decoration:none; cursor:pointer;">
                    <?php } else { ?>
                      <a href="javascript:switchOpenTimed(1)" style="color:#FFF; text-decoration:none; cursor:pointer;">
                      <?php } ?>
                      ⇄ Bytt starttype</a>
                </td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Etter</span> <input type="text" id="postTime" style="width: 40px; background-color: lightgray;"></td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Max №</span> <input type="text" id="maxBib" style="width: 40px;"></td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Bruker</span> <input type="text" id="userAlias" placeholder="navn..." style="width: 50px;" onchange="res.setUserAlias(this.value)"></td>
              </tr>
            <?php } else { ?>
              <tr>
                <td style="text-align: left"><span id="liveIndicator">◉</span> <b>
                    <?php
                    if ($_GET['code'] == 1000) { ?> Mål <?php } else if ($_GET['code'] == -1) { ?> Meldepost: Alle <?php } else if ($_GET['code'] == -2) { ?> Ute i løypa <?php } else { ?> Meldepost: <?= $_GET['code'] ?> <?php } ?>
                  </b>
                </td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Bruker</span> <input type="text" id="userAlias" placeholder="navn" style="width: 60px;" onchange="res.setUserAlias(this.value)"></td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Filter</span> <input type="text" id="filterText" placeholder="filter..." style="width: 40px;"></td>
                <td style="text-align: right"><span style="display:inline-block; width:50px; text-align:right;">
                    Nå</span> <span id="time" style="display:inline-block; width: 60px;">00:00:00</span></td>
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