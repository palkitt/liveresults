<?php
date_default_timezone_set("Europe/Oslo");

include_once("templates/emmalang_no.php");
include_once("templates/classEmma.class.php");
$lang = "no";
if (isset($_GET['lang']) && $_GET['lang'] != "")
  $lang = $_GET['lang'];
include_once("templates/emmalang_$lang.php");
$emma = isset($_GET['emma']);
$linkPrefix = ($emma ? "emma&" : "");

function renderHeaderRow($DATE, $EVENTNAME, $SPORT, $ORGANIZER, $emma)
{
  echo "<tr>";
  echo "<th></th>"; // Live indicator
  echo "<th style=\"text-align: left;\">" . $DATE . "</th>";
  echo "<th></th>"; // Icon
  echo "<th style=\"text-align: left;\">" . $EVENTNAME . "</th>";
  echo "<th style=\"text-align: left;\">" . ($emma ? "" : $SPORT) . "</th>";
  echo "<th style=\"text-align: left;\">" . $ORGANIZER . "</th>";
  echo "<th style=\"text-align: left;\">" . ($emma ? "" : "Link") . "</th>";
  echo "</tr>";
}

function renderCompRow($comp, $emma, $lang, $isMobile, $isToday, $todayDiv = false)
{
  $compName = substr($comp["name"], 0, ($isMobile ? 30 : 60));
  $time4oComp = ($comp['time4ocomp'] ?? false);
  $linkPrefix = ($emma ? "emma&" : ($time4oComp ? "time4o&" : ""));
  $isActive = false;
  if (!$emma && isset($comp["lastactive"]) && $comp["lastactive"] != "") {
    $isActive = (time() - strtotime($comp["lastactive"])) < 120;
  }
  $rowId = "row" . $comp["id"];
  $rowStyle = $isToday ? "font-weight:bold;" : ($todayDiv ? "border-top: 2px solid gray;" : "");

  echo "<tr id=\"$rowId\"" . ($rowStyle ? " style=\"$rowStyle\"" : "") . ">";
  echo "<td>";
  if ($isActive) echo "<span class=\"pulsing\">◉</span>";
  echo "</td>";
  echo "<td>" . date("Y-m-d", strtotime($comp['date'])) . "</td>";
  echo "<td>";
  if (!$emma) {
    if ($time4oComp) {
      echo "<img src=\"images/time4o_small.svg\" width=\"12px\" style=\"vertical-align: bottom\">";
    } else {
      echo "<img src=\"images/LiveRes.png\" width=\"12px\" style=\"vertical-align: bottom\">";
    }
  }
  echo "</td>";
  echo "<td>";
  echo "<a onmouseover=\"colorRow('$rowId')\" onmouseout=\"resetRow('$rowId')\" ";
  echo "href=\"followfull.php?{$linkPrefix}comp={$comp['id']}&amp;lang=$lang\">$compName</a>";
  echo "</td>";
  echo "<td>";
  if (!$emma) {
    echo ($comp["sport"] ?? "");
  }
  echo "</td>";
  echo "<td>" . ($comp["organizer"] ?? "") . "</td>";
  echo "<td>";
  if (!$emma) {
    if (isset($comp['livecenterurl']) && strlen($comp['livecenterurl']) > 0) {
      echo "<a onmouseover=\"colorRow('$rowId')\" onmouseout=\"resetRow('$rowId')\" href=\"{$comp['livecenterurl']}\">Livesenter</a>";
    } else if ($time4oComp && isset($comp['eventorid']) && strlen($comp['eventorid']) > 0) {
      echo "<a onmouseover=\"colorRow('$rowId')\" onmouseout=\"resetRow('$rowId')\" href=\"https://eventor.orientering.no/Events/Show/{$comp['eventorid']}\">Eventor</a>";
    }
  }
  echo "</td>";
  echo "</tr>";
}

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

  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
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
    <?php } else { ?>
      <img src="images/LiveRes.png" height="40px" style="vertical-align: middle" />&nbsp; LiveRes online resultater
    <?php } ?>
  </div>
  <div class="maindiv" style="padding-left: 5px;">
    <br>
    <?php if ($emma) { ?>
      <a href='index.php'><img src="images/LiveRes.png" width="12px" style="vertical-align: bottom" />&nbsp;Results from LiveRes</a><br>
    <?php } else { ?>
      <a href='index.php?emma'><img src="images/svenskorientering.png" width="12px" style="vertical-align: bottom" />&nbsp;Results from liveresultat.orientering.se</a><br>
    <?php } ?>
    <br>
    <b>Choose language</b><br>
    <?php
    $languages = [
      'no' => ['img' => 'no.png', 'alt' => 'Norsk'],
      'sv' => ['img' => 'se.png', 'alt' => 'Svenska'],
      'en' => ['img' => 'en.png', 'alt' => 'English'],
      'fi' => ['img' => 'fi.png', 'alt' => 'Suomeksi'],
      'ru' => ['img' => 'ru.png', 'alt' => 'Русский'],
      'cz' => ['img' => 'cz.png', 'alt' => 'Česky'],
      'de' => ['img' => 'de.png', 'alt' => 'Deutsch'],
      'bg' => ['img' => 'bg.png', 'alt' => 'български'],
      'fr' => ['img' => 'fr.png', 'alt' => 'Français'],
      'it' => ['img' => 'it.png', 'alt' => 'Italiano'],
      'hu' => ['img' => 'hu.png', 'alt' => 'Magyar'],
      'es' => ['img' => 'es.png', 'alt' => 'Español'],
      'pl' => ['img' => 'pl.png', 'alt' => 'Polska'],
      'pt' => ['img' => 'pt.png', 'alt' => 'Português'],
    ];
    foreach ($languages as $code => $data) {
      echo "<a href='index.php?{$linkPrefix}lang=$code' style='text-decoration: none'><img src='images/{$data['img']}?a' alt='{$data['alt']}'></a>&nbsp;\n";
    }
    ?>
    <br>
    <table style="border: none; border-collapse: collapse; width: 100%; padding: 0;" id="tblLiveComps">
      <tr>
        <td></td>
        <td colspan=6>
          <h1 class="categoriesheader">LIVE TODAY!</h1>
        </td>
      </tr>
      <?php
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

      if (!$emma) {
        $url = "https://center.time4o.com/api/v1/race";
        $json = file_get_contents($url);
        $data = json_decode($json, true);
        $compsTime4o = $data["data"];
        foreach ($compsTime4o as &$c) {
          $c['time4ocomp'] = true;
          $c['lastactive'] = null;
          $c['livecenterurl'] = '';
          $c['sport'] = '';
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
      }
      $comps = array_merge($comps, $compsTime4o ?? []);
      usort($comps, function ($a, $b) {
        return strtotime($b['date']) <=> strtotime($a['date']);
      });

      $todayStr = date("Y-m-d");
      $today = strtotime($todayStr);
      $yearPre = date("Y");
      $isMobile = preg_match("/(android|avantgo|blackberry|bolt|boost|cricket|docomo|fone|hiptop|mini|mobi|palm|phone|pie|tablet|up\.browser|up\.link|webos|wos)/i", $_SERVER["HTTP_USER_AGENT"]);

      // Today's competitions
      renderHeaderRow($_DATE, $_EVENTNAME, $_SPORT, $_ORGANIZER, $emma);
      foreach ($comps as $comp) {
        if (isset($comp['public']) && $comp['public'] == false)
          continue;
        if ($comp["date"] === $todayStr) {
          renderCompRow($comp, $emma, $lang, $isMobile, true);
        }
      }
      ?>
      <tr>
        <td>&nbsp;</td>
      </tr>
      <tr>
        <td></td>
        <td colspan=6>
          <h1 class="categoriesheader"><?= $_CHOOSECMP ?></h1>
        </td>
      </tr>
      <?php

      // All competitions
      $firstAfterToday = false;
      renderHeaderRow($_DATE, $_EVENTNAME, $_SPORT, $_ORGANIZER, $emma);
      foreach ($comps as $comp) {
        if (isset($comp['public']) && $comp['public'] == false)
          continue;
        $date = strtotime($comp["date"]);
        $year = date("Y", $date);
        if ($year != $yearPre) {
          $yearPre = $year;
      ?>
          <tr>
            <td></td>
            <td colspan=6>
              <h1 class="categoriesheader"><?= $year ?></h1>
            </td>
          </tr>
      <?php }

        $todayDiv = ($date < $today && !$firstAfterToday);
        if ($todayDiv)
          $firstAfterToday = true;
        renderCompRow($comp, $emma, $lang, $isMobile, false, $todayDiv);
      }
      ?>
    </table>
    <p style="text-align: left; font-size: 0.7em; color:#AAA">&copy;2012- Liveresults. Source code: https://github.com/palkitt/liveresults</p>
  </div>
</body>

</html>