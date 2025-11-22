<?php

include_once("./templates/emmalang_no.php");
include_once("./templates/classEmma.class.php");
include_once("templates/datatablesURL.php");
header('Content-Type: text/html; charset=' . $CHARSET);

echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
  <title>LiveRes Test Results</title>

  <META HTTP-EQUIV="expires" CONTENT="-1">
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#555556">
  <link href="<?= $DataTablesURL ?>datatables.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
  <link rel="stylesheet" type="text/css" href="css/style-liveres.css">
  <script src="<?= $DataTablesURL ?>datatables.min.js"></script>
  <script language="javascript" type="text/javascript">
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

    $(document).ready(function() {
      $('#searchField').on('keypress', function(e) {
        if (e.which === 13) { // 13 is the keycode for Enter
          searchname();
        }
      });
    });

    updateTable = function(data) {
      if (this.currentTable != null) {
        this.currentTable.destroy();
        $('#testresults').html('');
      }
      var columns = Array();
      var col = 0;

      columns.push({
        title: "Dato",
        orderable: true,
        targets: [col++],
        data: "date",
        visible: false,
      });
      columns.push({
        title: "Dato",
        className: "dt-left",
        orderable: true,
        targets: [col++],
        data: "date",
        type: "text",
      });
      columns.push({
        title: "Navn",
        className: "dt-left",
        orderable: true,
        targets: [col++],
        data: "name"
      });
      columns.push({
        title: "Klasse",
        className: "dt-left",
        orderable: true,
        targets: [col++],
        data: "class",
        render: function(data, type, row) {
          var link = "<a href=\"followfull.php?comp=" + row.compid + "&class=" + encodeURIComponent(data);
          link += "\" target=\"_blank\" style=\"text-decoration: none;\">" + data + "</a>";
          return link;
        }
      });
      columns.push({
        title: "Tid",
        className: "dt-right",
        orderable: true,
        targets: [col++],
        data: "result",
        render: function(data, type, row) {
          if (isNaN(parseInt(data)))
            return data;
          else
            return formatTime(data, row.status) + "</span>";
        }
      });

      this.currentTable = $('#testresults').DataTable({
        orderable: true,
        order: true,
        autoWidth: false,
        data: data.results,
        columnDefs: columns,
        destroy: true,
        orderCellsTop: true,
        paging: false,
        lengthChange: false,
        searching: false,
        order: [
          [0]
        ],
        info: false,
        preDrawCallback: function(settings) {
          var api = new $.fn.dataTable.Api(settings);
          if (api.order()[0][0] !== 0)
            $("#resetsorting").html("<a href=\"#\" onclick=\"resetSorting()\">&#8635; Reset sortering</a>");
        }
      });
    };

    searchname = function() {
      var searchtext = $("#searchField").val();
      $races = "11055, 10952, 10686, 10624, 10418, 10347, 10207, 10161, 10076, 10054, 10051, 10012, 10052";
      if (searchtext.length > 0) {
        $.ajax({
          url: "/api/api.php",
          data: "method=gettestresults&name=" + searchtext + "&races=" + $races,
          success: function(data) {
            updateTable(data);
          },
          dataType: "json"
        });
      }
    };

    formatTime = function(time, status, showTenthOs, showHours, padZeros) {
      if (arguments.length == 2 || arguments.length == 3) {
        if (this.language == 'fi' || this.language == 'no') {
          showHours = true;
          padZeros = false;
        } else {
          showHours = false;
          padZeros = true;
        }
      } else if (arguments.length == 4) {
        if (this.language == 'fi' || this.language == 'no')
          padZeros = false;
        else
          padZeros = true;
      }
      if (status != 0) {
        return this.runnerStatus[status];
      } else if (time == -999)
        return this.resources["_FREESTART"];
      else if (time == -1)
        return "";
      else if (time < 0)
        return "*"
      else {
        var minutes;
        var seconds;
        var tenth;

        if (showHours) {
          var hours = Math.floor(time / 360000);
          minutes = Math.floor((time - hours * 360000) / 6000);
          seconds = Math.floor((time - minutes * 6000 - hours * 360000) / 100);
          tenth = Math.floor((time - minutes * 6000 - hours * 360000 - seconds * 100) / 10);
          if (hours > 0) {
            if (padZeros)
              hours = this.strPad(hours, 2);
            return hours + ":" + this.strPad(minutes, 2) + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "");
          } else {
            if (padZeros)
              minutes = this.strPad(minutes, 2);
            return minutes + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "");
          }
        } else {
          minutes = Math.floor(time / 6000);
          seconds = Math.floor((time - minutes * 6000) / 100);
          tenth = Math.floor((time - minutes * 6000 - seconds * 100) / 10);
          if (padZeros) {
            return this.strPad(minutes, 2) + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "");
          } else {
            return minutes + ":" + this.strPad(seconds, 2) + (showTenthOs ? "." + tenth : "");
          }
        }
      }
    };

    strPad = function(num, length) {
      var str = '' + num;
      while (str.length < length) {
        str = '0' + str;
      }
      return str;
    };

    resetSorting = function() {
      this.currentTable.order([0, 'asc']).draw();
      $("#resetsorting").html("");
    };
  </script>
</head>

<body>
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td valign="bottom">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td colspan="4"><span class="mttop"></td>
          </tr>
        </table>
      </td>
      <td align="right" valign="bottom"></td>
    </tr>
    <tr>
      <td class="submenu" colspan="2">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td><a href="./">Tilbake til LiveRes hovedside</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="searchmenu" colspan="2" style="padding: 5px;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h1 class="categoriesheader">Resultater fra 2/3000 m løpstester</h1>
            </td>
          </tr>
          <tr>
            <td>Søk i resultater fra tidligere tester. Første test 16.11.2018.</td>
          </tr>
          <tr>
            <td>
              Søk navn:
              <input type="text" id="searchField" name="searchField">&nbsp;
              <button type="button" onclick="searchname()">Søk</button>
              <div id="resetsorting"></div>
            </td>
          </tr>
        </table>
    </tr>
    <tr>
      <table style="width:100%; table-layout:fixed;" cellpadding="0" cellspacing="3" border="0">
        <tr valign=top>
          <td>
            <table width="100%" cellpadding="3px" cellspacing="0px" border="0">
              <tr valign=top>
              <tr>
                <td>
                  <table id="testresults"></table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </tr>
  </table>
</body>

</html>