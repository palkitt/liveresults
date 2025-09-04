<?php
include_once("../templates/emmalang_no.php");
include_once("../templates/classEmma.class.php");
include_once("../templates/datatablesURL.php");
header('Content-Type: text/html; charset=' . $CHARSET);

$compID = isset($_GET['comp']) ? (int) $_GET['comp'] : 0;
$oldCompID = isset($_GET['oldcomp']) ? (int) $_GET['oldcomp'] : $compID - 1;
$currentComp = new Emma($compID);

echo ("<?xml version=\"1.0\" encoding=\"$CHARSET\" ?>\n");
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>

<head>
  <title>LiveRes Copy Ecards</title>

  <META HTTP-EQUIV="expires" CONTENT="-1">
  <meta http-equiv="Content-Type" content="text/html;charset=<?= $CHARSET ?>">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#555555">
  <style>
    .leftline {
      border-left: 1px solid #555;
      padding-left: 1px;
    }
  </style>
  <link rel="stylesheet" href="../<?= $DataTablesURL ?>datatables.min.css">
  <link rel="stylesheet" type="text/css" href="../css/style-liveres.css">
  <script src="../<?= $DataTablesURL ?>datatables.min.js"></script>
  <script language="javascript" type="text/javascript">
    let currentTable = null;
    let compID = <?= $compID ?>;
    let defaultOldCompID = <?= $oldCompID ?>;
    let currentOldCompID = defaultOldCompID;

    function loadEcardDiff(oldCompID) {
      $.ajax({
        url: "../api/api.php",
        data: "method=getecarddiff&comp=" + compID + "&oldcomp=" + oldCompID,
        dataType: "json",
        success: function(data) {
          updateTable(data);
          // If API returns meta, update labels (adjust keys if different)
          if (data && data.oldcomp) {
            $('#oldCompIdLabel').text(data.oldcomp.ID);
            $('#oldCompDateLabel').text(data.oldcomp.date || '');
            $('#oldCompNameLabel').text(data.oldcomp.name || '');
          } else {
            // Fallback: just show ID
            $('#oldCompIdLabel').text(oldCompID);
            $('#oldCompDateLabel').text('');
            $('#oldCompNameLabel').text('');
          }
        },
        error: function() {
          alert("Feil ved henting av data fra server");
        }
      });
    }

    $(document).ready(function() {

      // Reflect in controls & URL
      $('#oldCompInput').val(currentOldCompID);
      const params = new URLSearchParams(window.location.search);
      params.set('oldcomp', currentOldCompID);
      history.replaceState(null, "", location.pathname + "?" + params.toString());

      loadEcardDiff(currentOldCompID);

      $('#changeOldCompBtn').on('click', function() {
        let newId = parseInt($('#oldCompInput').val(), 10);
        // if (isNaN(newId) || newId === currentOldCompID) return;
        currentOldCompID = newId;
        // Update URL
        const p = new URLSearchParams(window.location.search);
        p.set('oldcomp', newId);
        history.replaceState(null, "", location.pathname + "?" + p.toString());
        loadEcardDiff(newId);
      });
    });

    function updateTable(data) {
      if (currentTable) {
        currentTable.destroy();
        $('#ecards').empty();
      }
      if (!data || !data.ecards) return;

      let columns = [{
          title: "St.nr",
          data: "bib",
          className: "dt-right"
        },
        {
          title: "Navn",
          data: "name",
          className: "dt-left"
        },
        {
          title: "Klubb",
          data: "club",
          className: "dt-left"
        },
        {
          title: "Klasse",
          data: "class",
          className: "dt-left"
        },
        {
          title: "Brikke #1",
          data: "new1",
          className: "dt-right leftline",
          render: d => (!d || d == 0) ? "-" : d
        },
        {
          title: "Kilde #1",
          data: "old1",
          className: "dt-right",
          render: (d, t, row, meta) => renderOld(d, row, meta.row, 1)
        },
        {
          title: "Brikke #2",
          data: "new2",
          className: "dt-right leftline",
          render: d => (!d || d == 0) ? "-" : d
        },
        {
          title: "Kilde #2",
          data: "old2",
          className: "dt-right",
          render: (d, t, row, meta) => renderOld(d, row, meta.row, 2)
        }
      ];

      currentTable = $('#ecards').DataTable({
        data: data.ecards,
        columns: columns,
        paging: false,
        searching: true,
        info: false,
        order: [0]
      });
    }

    function renderOld(d, row, idx, no) {
      if (!d || d == 0) return "-";
      if (isNaN(parseInt(d))) return d;
      if (d == row.new1 || d == row.new2) return d;
      return `<a href="javascript:;" onclick="sendMessage(${row.bib}, ${d}, ${idx}, ${no})">${d}</a>`;
    }

    function sendMessage(bib, ecard, idx, no) {
      fetch(`../api/messageapi.php?method=sendmessage&ecardchange=1&comp=${compID}&dbid=-${ecard}&message=startnummer:${bib}`)
        .then(() => {
          const r = currentTable.row(idx);
          let rd = r.data();
          if (no === 1) rd.old1 = 'Sent!';
          else rd.old2 = 'Sent!';
          r.data(rd).invalidate();
        });
    }
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
        <h1 class="categoriesheader">Overføring av brikkenummer mellom løp</h1>
        <table>
          <tr>
            <td>Oppdatere til løp: </td>
            <td><?= $currentComp->CompDate() ?></td>
            <td><?= $currentComp->CompName() ?></td>
            <td style="padding-left:5px"><?= $compID ?></td>
          </tr>
          <tr>
            <td>Kopiere fra løp (kilde) :</td>
            <td id="oldCompDateLabel">...</td>
            <td id="oldCompNameLabel">...</td>
            <td style="padding-left:5px">
              <input id="oldCompInput" type="number" style="width:6em">
              <button class="navbtn" id="changeOldCompBtn" title="Refresh">&#8635;</button>
            </td>
          </tr>
        </table>
        <span>Løpere med avvikende brikkenummer i de to løpene vises nedenfor. Klikk på et brikkenummer i kolonnen "Kilde". LiveRes klienten oppdateres så basen basert på disse meldingene.</span>
      </td>
    </tr>
    <tr>
      <table style="width:100%; table-layout:fixed;" cellpadding="0" cellspacing="3" border="0">
        <tr valign=top>
          <td>
            <table width="100%" cellpadding="3px" cellspacing="0px" border="0">
              <tr valign=top>
              <tr>
                <td>
                  <table id="ecards"></table>
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