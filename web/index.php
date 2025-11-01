<?php
date_default_timezone_set("Europe/Oslo");

include_once("templates/emmalang_no.php");
include_once("templates/classEmma.class.php");
$lang = "no";
if (isset($_GET['lang']) && $_GET['lang'] != "")
  $lang = $_GET['lang'];
include_once("templates/emmalang_$lang.php");
$emma = isset($_GET['emma']);
$time4o = isset($_GET['time4o']);
$liveres = (!$emma && !$time4o);
$linkPrefix = ($emma ? "emma&" : ($time4o ? "time4o&" : ""));

header('Content-Type: text/html; charset=' . $CHARSET);
echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
  <title><?= $_TITLE ?></title>
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#555556">

  <link rel="stylesheet" type="text/css" href="css/style-liveres.css">

  <script language="javascript" type="text/javascript">
    function colorRow(row) {
      var el = document.getElementById(row);
      if (el === null)
        return;
      el.style.backgroundColor = "#C0D6FF";
    }

    function resetRow(row) {
      var el = document.getElementById(row);
      if (el === null)
        return;
      el.style.backgroundColor = "";
    }
  </script>
</head>

<body>
  <!-- MAIN DIV -->
  <div style="font-size: 20px; font-weight: bold; height: 50px; background-color: #555555; padding-left: 5px; 
  vertical-align: middle; line-height:45px; color: white; width: 100%">
    <?php if ($emma) { ?>
      <img src="images/svenskorientering.png" height="40px" style="vertical-align: middle" />&nbsp; Liveresults from liveresultat.orientering.se
    <?php } else if ($time4o) { ?>
      <img src="images/time4o_small.svg" height="40px" style="vertical-align: middle" />&nbsp; Liveresults from Time4o (center.time4o.com)
    <?php } else { ?>
      <img src="images/LiveRes.png" height="40px" style="vertical-align: middle" />&nbsp; LiveRes online resultater
    <?php } ?>

  </div>

  <div class="maindiv" style="padding-left: 5px;">
    <br>
    <?php if ($emma) { ?>
      <a href='index.php'><img src="images/LiveRes.png" width="12px" style="vertical-align: bottom" />&nbsp;Results from LiveRes</a><br>
      <a href='index.php?time4o'><img src="images/time4o_small.svg" width="12px" style="vertical-align: bottom" />&nbsp;Results from Time4o</a><br>
    <?php } else if ($time4o) { ?>
      <a href='index.php'><img src="images/LiveRes.png" width="12px" style="vertical-align: bottom" />&nbsp;Results from LiveRes</a><br>
      <a href='index.php?emma'><img src="images/svenskorientering.png" width="12px" style="vertical-align: bottom" />&nbsp;Results from liveresultat.orientering.se</a><br>
    <?php } else { ?>
      <a href='index.php?time4o'><img src="images/time4o_small.svg" width="12px" style="vertical-align: bottom" />&nbsp;Results from Time4o</a><br>
      <a href='index.php?emma'><img src="images/svenskorientering.png" width="12px" style="vertical-align: bottom" />&nbsp;Results from liveresultat.orientering.se</a><br>
    <?php } ?>
    <br>
    <b>Choose language</b><br>
    <a href=index.php?<?= $linkPrefix ?>lang=no style='text-decoration: none'><img src='images/no.png?a' alt='Norsk'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=sv style='text-decoration: none'><img src='images/se.png?a' alt='Svenska'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=en style='text-decoration: none'><img src='images/en.png?a' alt='English'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=fi style='text-decoration: none'><img src='images/fi.png?a' alt='Suomeksi'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=ru style='text-decoration: none'><img src='images/ru.png?a' alt='Русский'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=cz style='text-decoration: none'><img src='images/cz.png?a' alt='Česky'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=de style='text-decoration: none'><img src='images/de.png?a' alt='Deutsch'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=bg style='text-decoration: none'><img src='images/bg.png?a' alt='български'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=fr style='text-decoration: none'><img src='images/fr.png?a' alt='Français'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=it style='text-decoration: none'><img src='images/it.png?a' alt='Italiano'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=hu style='text-decoration: none'><img src='images/hu.png?a' alt='Magyar'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=es style='text-decoration: none'><img src='images/es.png?a' alt='Español'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=pl style='text-decoration: none'><img src='images/pl.png?a' alt='Polska'></a>&nbsp;
    <a href=index.php?<?= $linkPrefix ?>lang=pt style='text-decoration: none'><img src='images/pt.png?a' alt='Português'></a>
    <br>

    <table style="border: none; border-collapse: collapse; width: 100%; padding: 0;" id="tblLiveComps">
      <td></td>
      <td colspan=<?= (!$liveres ? 3 : 5) ?>>
        <h1 class="categoriesheader">LIVE TODAY!</h1>
      </td>
      <tr>
      <tr>
        <th></th>
        <th style="text-align: left;"><?= $_DATE ?></th>
        <th style="text-align: left;"><?= $_EVENTNAME ?></th>
        <?= (!$liveres  ? "" : "<th style=\"text-align: left;\">" . $_SPORT . "</th>") ?>
        <th style="text-align: left;"><?= $_ORGANIZER ?></th>
        <?= ($emma ? "" : "<th style=\"text-align: left;\">" . ($time4o ? "Eventor" : "Livesenter") . "</th>") ?>
      </tr>

      <?php
      if ($time4o) {
        $url = "https://center.time4o.com/api/v1/race";
        $json = file_get_contents($url);
        $data = json_decode($json, true);
        $comps = $data["data"];
        usort($comps, function ($a, $b) {
          return strtotime($b['date']) <=> strtotime($a['date']);
        });
        foreach ($comps as &$c) {
          $c['name'] = $c['title'];
          if (!isset($c['organizer'])) {
            $c['organizer'] = $c['event']['organisers'][0]['name'] ?? "";
          }
          if (isset($c["identifierType"]) && $c["identifierType"] == "Norway") {
            $c['eventorid'] = $c["identifier"];
          } else {
            $c['eventorid'] = "";
          }
        }
      } else {
        if ($emma)
          $url = "https://liveresultat.orientering.se/api.php?method=getcompetitions";
        else if ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['SERVER_NAME'] == 'localhost')
          $url = "http://localhost/api/api.php?method=getcompetitions";
        else
          $url = "https://api.liveres.live/api.php?method=getcompetitions";
        $json = file_get_contents($url);
        $json = preg_replace('/[[:cntrl:]]/', '', $json);
        $json = str_replace('"O"', 'O', $json);
        $data = json_decode($json, true);
        $comps = $data["competitions"];
      }
      $today = date("Y-m-d");
      $yearPre = date("Y");
      $isMobile = preg_match("/(android|avantgo|blackberry|bolt|boost|cricket|docomo|fone|hiptop|mini|mobi|palm|phone|pie|tablet|up\.browser|up\.link|webos|wos)/i", $_SERVER["HTTP_USER_AGENT"]);

      // Today's competitions
      foreach ($comps as $comp) {
        if ($comp["date"] === $today) {
          $compName = $comp["name"];
          $compName = substr($compName, 0, ($isMobile ? 30 : 60));
          $isActive = false;
          if ($liveres && $comp["lastactive"] != "")
            $isActive = (time() - strtotime($comp["lastactive"])) < 120;
      ?>
          <tr id="row<?= $comp["id"] ?>" style="font-weight:bold;">
            <td>
              <?php if ($isActive) { ?>
                <span class="pulsing">◉</span>
              <?php } ?>
            </td>
            <td><?= date("Y-m-d", strtotime($comp['date'])) ?></td>
            <td><a onmouseover="colorRow('row<?= $comp["id"] ?>')" onmouseout="resetRow('row<?= $comp["id"] ?>')"
                href="followfull.php?<?= $linkPrefix ?>comp=<?= $comp['id'] ?>&amp;lang=<?= $lang ?>"><?= $compName ?></a></td>
            <?= (!$liveres  ? "" : "<td style=\"font-weight:normal\">" . $comp["sport"] . "</td>") ?>
            <td style="font-weight:normal"><?= $comp["organizer"] ?></td>
            <?php if ($liveres && strlen($comp['livecenterurl']) > 0) { ?>
              <td><a onmouseover="colorRow('row<?= $comp["id"] ?>')" onmouseout="resetRow('row<?= $comp["id"] ?>')"
                  href="<?= $comp['livecenterurl'] ?>">Livesenter</a></td>
            <?php } else if ($time4o && strlen($comp['eventorid']) > 0) { ?>
              <td><a onmouseover="colorRow('row<?= $comp["id"] ?>')" onmouseout="resetRow('row<?= $comp["id"] ?>')"
                  href="https://eventor.orientering.no/Events/Show/<?= $comp['eventorid'] ?>">Eventor</a></td>
            <?php } else { ?>
              <td></td>
            <?php } ?>
          </tr>
      <?php
        }
      }
      ?>
      <tr>
        <td>&nbsp;</td>
      </tr>
      <tr>
        <td></td>
        <td colspan=<?= (!$liveres ? 3 : 5) ?>>
          <h1 class="categoriesheader"><?= $_CHOOSECMP ?></h1>
        </td>
      <tr>
        <th></th>
        <th style="text-align: left;"><?= $_DATE ?></th>
        <th style="text-align: left;"><?= $_EVENTNAME ?></th>
        <?= (!$liveres  ? "" : "<th style=\"text-align: left;\">" . $_SPORT . "</th>") ?>
        <th style="text-align: left;"><?= $_ORGANIZER ?></th>
        <?= ($emma ? "" : "<th style=\"text-align: left;\">" . ($time4o ? "Eventor" : "Livesenter") . "</th>") ?>
      </tr>

      <?php
      // All competitions
      $today = strtotime(date("Y-m-d"));
      $firstAfterToday = false;
      foreach ($comps as $comp) {
        $compName = $comp["name"];
        $compName = substr($compName, 0, ($isMobile ? 30 : 60));
        $date = strtotime($comp["date"]);
        $year = date("Y", $date);
        if ($year != $yearPre) {
          $yearPre = $year;
      ?>
          <tr>
            <td></td>
            <td colspan=<?= (!$liveres ? 3 : 5) ?>>
              <h1 class="categoriesheader"><?= $year ?></h1>
            </td>
          </tr>
        <?php
        }
        $isActive = false;
        if ($liveres && $comp["lastactive"] != "")
          $isActive = (time() - strtotime($comp["lastactive"])) < 120;
        if ($date < $today && !$firstAfterToday) {
          $firstAfterToday = true;
        ?>
          <tr id="row<?= $comp["id"] ?>" style="border-top: 2px solid gray;">
          <?php } else { ?>
          <tr id="row<?= $comp["id"] ?>">
          <?php } ?>
          <td>
            <?php if ($isActive) { ?>
              <span class="pulsing">◉</span>
            <?php } ?>
          </td>
          <td><?= date("Y-m-d", strtotime($comp['date'])) ?></td>
          <td><a onmouseover="colorRow('row<?= $comp["id"] ?>')" onmouseout="resetRow('row<?= $comp["id"] ?>')"
              href="followfull.php?<?= $linkPrefix ?>comp=<?= $comp["id"] ?>&amp;lang=<?= $lang ?>"><?= $compName ?></a></td>
          <?= (!$liveres  ? "" : "<td>" .  $comp["sport"] . "</td>") ?>
          <td><?= $comp["organizer"] ?></td>
          <?php if ($liveres && strlen($comp['livecenterurl']) > 0) { ?>
            <td><a onmouseover="colorRow('row<?= $comp["id"] ?>')" onmouseout="resetRow('row<?= $comp["id"] ?>')"
                href="<?= $comp['livecenterurl'] ?>">Livesenter</a></td>
          <?php } else if ($time4o && strlen($comp['eventorid']) > 0) { ?>
            <td><a onmouseover="colorRow('row<?= $comp["id"] ?>')" onmouseout="resetRow('row<?= $comp["id"] ?>')"
                href="https://eventor.orientering.no/Events/Show/<?= $comp['eventorid'] ?>">Eventor</a></td>
          <?php } else { ?>
            <td></td>
          <?php } ?>
          </tr>
        <?php
      }
        ?>
    </table>
    <p style="text-align: left; font-size: 0.7em; color:#AAA">&copy;2012- Liveresults. Source code: https://github.com/palkitt/liveresults</p>
  </div>
</body>

</html>