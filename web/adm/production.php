<?php include_once("../templates/emmalang_se.php");
include_once("../templates/classEmma.class.php");
$lang = "no";
if (isset($_GET['lang']) && $_GET['lang'] != "")
  $lang = $_GET['lang'];
include_once("../templates/emmalang_$lang.php");
header('Content-Type: text/html; charset=' . $CHARSET);

$currentComp = new Emma($_GET['comp']);


?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
  <title>LiveRes Production Control</title>
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="robots" content="noindex">
  <link rel="stylesheet" type="text/css" href="../css/style-liveres.css">
  <script language="javascript">

  </script>
</head>

<body>
  <div style="font-size: 15px; font-weight: bold; height: 50px; width:100%; background-color: #555555; padding-left: 5px; 
            vertical-align: middle; line-height:45px; color: white;">
    LiveRes Production Control: <?= $currentComp->CompName() ?> [<?= $currentComp->CompDate() ?>]
  </div>

  <h1></h1>

  <div class="maindiv">

    <table border="1" cellpadding="2" cellspacing="0" width="100%">
      <tr>
        <td><b>Class</b></td>
        <td><b>Place</b></td>
        <td><b>Rank</b></td>
      </tr>

      <?php

      $rcontrols = Emma::GetRadioControls($_GET['comp']);
      $currentComp = new Emma($_GET['comp']);
      $classes = $currentComp->Classes();
      ?>
      <tr valign="top">
        <td><?php

            $first = true;
            $ret = "";
            foreach ($classes as $class) {
              if (!$first)
                $ret .= "<br>";
              $ret .= $class['Class'];
              $first = false;
            }
            echo ($ret);; ?>
        </td>
        <td><?php
            echo ("Start<br>");
            for ($i = 0; $i < sizeof($rcontrols); $i++) {
              if ($rcontrols[$i]["classname"] == "H21-") {
                echo ($rcontrols[$i]['name']);
                echo ("<br>");
              }
            };
            echo ("Mål");
            ?></td>

        <td>
          all <br>
          1-10<br>
          11-21<br>
          31-40<br>
          41-50<br>
          rest
        </td>

      </tr>


    </table>

  </div>
  <br />
</body>

</html>