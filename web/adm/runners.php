<?php include_once("../templates/emmalang_no.php");

include_once("../templates/classEmma.class.php");
$lang = "en";
if (isset($_GET['lang']) && $_GET['lang'] != "")
  $lang = $_GET['lang'];
include_once("../templates/emmalang_$lang.php");

header('Content-Type: text/html; charset=' . $CHARSET);

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
  <title><?= $_TITLE ?></title>
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="robots" content="noindex">

  <link rel="stylesheet" type="text/css" href="../css/style-eoc.css">
  <script language="javascript">

  </script>
</head>

<body topmargin="0" leftmargin="0">

  <!-- MAIN DIV -->

  <div class="maindiv">

    <table border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td>

          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td><span class="mttop"></td>
            </tr>
          </table>
      </tr>
      </td>

      <tr>
        <td class="submenu">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td><a href="./index.php">Admin competitions</a></td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td class="searchmenu" style="padding: 5px;">
          <table border="0" cellpadding="0" cellspacing="0">

            <tr>
              <td>
                <h1 class="categoriesheader">Runners</h1>
            </tr>
        </td>

      <tr>
        <td>
          <table border="0" cellpadding="1" cellspacing="2" width="100%">
            <tr>
              <td><b>Bib</b></td>
              <td><b>Name</b></td>
              <td><b>Club</b></td>
              <td><b>Class</b></td>
              <td><b>Time</b></td>
              <td><b>Status</b></td>
              <td><b>Checked</b></td>
            </tr>

            <?php

            $runners = Emma::GetAllRunnerData($_GET['compid'], 0);
            foreach ($runners as $runner) {
            ?>
              <tr>
                <td><?= $runner["bib"] ?></td>
                <td><a href="./editRunner.php?compid=<?= $runner["tavid"] ?>&dbid=<?= $runner["dbid"] ?>"><?= $runner["name"] ?></a></td>
                <td><?= $runner["club"] ?></td>
                <td><?= $runner["class"] ?></td>
                <td><?= $runner["time"] ?></td>
                <td><?= $runner["status"] ?></td>
                <td><?= $runner["ecardchecked"] ?></td>
              </tr>
            <?php
            }
            ?>
          </table>

        </td>
      </tr>
    </table>
    </td>
    </tr>
    </table>
  </div>
  <br />

</body>

</html>