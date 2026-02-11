// Functions for converting from Time4o format to LiveRes format
(function (Namespace) {
  "use strict";
  if (Namespace === undefined || Namespace.AjaxViewer === undefined)
    return;
  let AjaxViewer = Namespace.AjaxViewer;


  AjaxViewer.prototype.Time4oClassesToLiveres = function (payload) {
    const classes = (payload?.data ?? []).map(classEntry =>
      this.normalizeClasses(classEntry)).flatMap(c => Array.isArray(c) ? c : [c]);;
    return {
      status: "OK",
      classes: classes ?? "",
      hash: ""
    };
  }


  AjaxViewer.prototype.normalizeClasses = function (classEntry) {
    if (!classEntry) return null;
    var _this = this;

    const relay = (classEntry.eventForm == "Relay");
    const resultListMode = classEntry.resultListMode ?? null;
    const chaseStart = (classEntry.startType == "Chasing");
    const unordered = (resultListMode == "Unordered");
    const ordered = !["Unordered", "UnorderedNoTimes"].includes(resultListMode);
    const showLapTimes = (classEntry.showLapTimes && ordered) ?? false;

    var intermediateControls = [];
    var classInfo = [];
    const legs = (classEntry.legs ? Object.keys(classEntry.legs).length : 1);

    for (var i = 1; i <= legs; i++) {
      var legNo = 0;
      var className = classEntry.name ?? "NoName";
      var id = classEntry.id ?? "NoId";

      // Relay specific fields
      if (relay) {
        legNo = classEntry.legs[i].number ?? 1;
        if (!className.endsWith("-"))
          className += "-";
        className += String(legNo);
        id = id + "." + String(legNo);
        intermediateControls = classEntry.legs[i]?.intermediateControls;
      }
      else {
        intermediateControls = classEntry.intermediateControls;
      }

      const splitcontrols = _this.normalizeIntermediateControls(intermediateControls, resultListMode);

      // Add control for exchange times
      if (chaseStart || (relay && legNo >= 2)) {
        splitcontrols.forEach(ctrl => {
          splitcontrols.push({
            code: ctrl.code + 100000,
            order: (2 * ctrl.order - 1),
            name: ctrl.name + "PassTime",
            updated: true
          });
          ctrl.order = 2 * ctrl.order;
        });
        splitcontrols.push({
          code: 0,
          order: 0,
          name: "Exchange",
          updated: true
        });
        splitcontrols.push({
          code: 999,
          order: 999,
          name: "Leg",
          updated: false
        });
        splitcontrols.sort((a, b) => a.order - b.order);
      }

      // Add control for showing time of unordered classes
      if (unordered)
        splitcontrols.push({
          code: -999,
          order: 999,
          name: "Time",
          updated: false
        });

      // Show lap times
      if (showLapTimes && splitcontrols.length > 0) {
        splitcontrols.forEach(ctrl => {
          splitcontrols.push({
            code: ctrl.code + 100000,
            order: (2 * ctrl.order - 1),
            name: ctrl.name + "PassTime",
            updated: true
          });
          ctrl.order = 2 * ctrl.order;
        });
        splitcontrols.push({
          code: 999,
          order: 999,
          name: "Leg",
          updated: true
        });
        splitcontrols.sort((a, b) => a.order - b.order);
      }

      classInfo.push(
        {
          id: id,
          className: className,
          showLapTimes: classEntry.showLapTimes ?? false,
          startType: classEntry.startType ?? null,
          timingResolution: classEntry.timingResolution ?? null,
          timingStartTimeSource: classEntry.timingStartTimeSource ?? null,
          firstStart: classEntry.firstStart ?? -999,
          cards: classEntry.cardTypes ?? [],
          resultListMode: resultListMode,
          isRelay: relay,
          legs: legs,
          splitcontrols: splitcontrols,
          updatedSplits: splitcontrols.map(ctrl => !!ctrl.updated)
        });
    }
    return classInfo;
  }


  AjaxViewer.prototype.normalizeIntermediateControls = function (intermediateControl, resultListMode) {
    if (!intermediateControl) return [];
    const unordered = ["Unordered", "UnorderedNoTimes"].includes(resultListMode);
    return Object.values(intermediateControl)
      .map((ctrl, idx) => ({
        order: ctrl?.order ?? idx + 1,
        code: (Number(ctrl?.id) + (ctrl?.counter ?? 1) * 1000) * (unordered ? -1 : 1),
        name: ctrl?.name ?? `Split ${idx + 1}`,
        updated: false
      }))
      .sort((a, b) => a.order - b.order);
  }


  AjaxViewer.prototype.Time4oRelayResultsToLiveres = function (payload, className, classes) {
    const entries = (payload?.data ?? []).map(entry => this.normalizeEntry(entry,
      classes.find(c => c.id === entry?.raceClassId)));
    const currentClass = classes.find(c => c.className === className);
    const classNameClean = className.replace(/-[0-9]{1,2}$/, '');

    let legResults = [];
    for (let leg = 1; leg <= currentClass.legs; leg++) {
      legResults[leg - 1] = {
        leg: leg,
        results: entries.filter(e => e.leg == leg)
      };
    }

    return {
      status: "OK",
      className: classNameClean,
      legs: currentClass.legs,
      relayresults: legResults,
    };
  }


  AjaxViewer.prototype.Time4oClubResultsToLiveres = function (payload, classes) {
    const entries = (payload?.data ?? []).map(entry => this.normalizeEntry(entry,
      classes.find(c => c.id === entry?.raceClassId)));

    return {
      status: "OK",
      clubName: entries[0]?.organisation ?? "",
      results: entries,
      lastchanged: false,
      infotext: "",
      active: 0
    };
  }


  AjaxViewer.prototype.Time4oResultsToLiveres = function (payload, classInfo) {
    if (payload.type === "startList" || payload.type === "plainResults") {
      const entries = (payload?.data ?? []).map(entry =>
        this.normalizeEntry(entry, classInfo.find(c => c.id === entry?.raceClassId)));
      const classEntries = this.groupEntriesByClass(entries, payload.type);
      return {
        status: "OK",
        className: payload.type === "startList" ? "startlist" : "plainresults",
        results: classEntries,
        numEntries: entries.length,
        numResults: (classEntries || []).reduce(
          (sum, c) => sum + (Array.isArray(c.results) ? c.results.length : 0),
          0)
      };
    }
    else {
      const entries = (payload?.data ?? []).map(entry =>
        this.normalizeEntry(entry, classInfo));
      return {
        status: "OK",
        className: classInfo?.className ?? "",
        distance: "",
        splitcontrols: classInfo?.splitcontrols ?? [],
        results: entries,
        lastchanged: false,
        infotext: "",
        updatedSplits: classInfo?.updatedSplits ?? [],
        active: 0
      };
    }
  }


  AjaxViewer.prototype.groupEntriesByClass = function (entries, type) {
    const groups = new Map();
    for (const e of (entries || [])) {
      if (type === "plainResults" && (e.status == 9 || e.status == 10))
        continue;
      const name = e.class || "Unknown";
      if (!groups.has(name))
        groups.set(name, []);
      groups.get(name).push(e);
    }

    var sortType = (type === "startList") ? this.startListSorter : this.resultSorter;
    const grouped = Array.from(groups, ([className, results]) => ({
      className,
      results: results.slice().sort(sortType),
      distance: ""
    }));

    return this.sortClasses(grouped);
  };


  AjaxViewer.prototype.Time4oEntryListToLiveres = function (payload, classes) {
    const entries = (payload?.data ?? []).map(entry =>
      this.normalizeEntry(entry, classes.find(c => c.id === entry?.raceClassId)));
    return {
      status: "OK",
      runners: entries,
      active: 0
    };
  }


  AjaxViewer.prototype.Time4oStatusMap = function (statusKey, unordered) {
    const statusMap = {
      "OK": 0,
      "DidNotStart": 1,
      "DidNotFinish": 2,
      "MissingPunch": 3,
      "Disqualified": 4,
      "OverTime": 5,
      "NotClassified": 6,
      "Overtime": 11,
      "Walkover": 12,
      "Finished": 13
      // runnerStatus[9] = "";
      // runnerStatus[10] = "";
    };
    if (statusKey == "OK" && unordered)
      statusKey = "Finished";
    return statusMap[statusKey] ?? 10;
  }


  AjaxViewer.prototype.normalizeEntry = function (entry, classInfo) {
    if (!entry || !classInfo) return null;
    var _this = this;

    // Start time
    const timingStartTimeSource = entry.timingStartTimeSource ?? classInfo.timingStartTimeSource ?? "Timing";
    const startListStartTime = entry.start?.startTime ?? classInfo.firstStart ?? null;
    let rawStartIso = null;
    if (classInfo.startType === "Free") {
      rawStartIso = entry.time?.startTime ?? null;
    } else if (timingStartTimeSource === "Timing") {
      rawStartIso = entry.time?.startTime ?? startListStartTime;
    }
    else {
      rawStartIso = startListStartTime;
    }
    const startTime = rawStartIso ? _this.toHundredthsSinceMidnight(rawStartIso) : -999;
    var timeFromClassStart = 0;
    if (startTime > 0 && classInfo.firstStart) {
      timeFromClassStart = startTime - _this.toHundredthsSinceMidnight(classInfo.firstStart);
    }

    const unordered = ["Unordered", "UnorderedNoTimes"].includes(classInfo.resultListMode);
    const chaseStart = (classInfo.startType == "Chasing");
    var splits = {};
    var rawResult, rawBehind, place, statusKey, statusValue;
    var startTotalTime = 0;
    var restart = false;

    // Chase start or relay leg >= 2
    if (chaseStart || (classInfo.isRelay && entry.leg?.number >= 2)) {
      restart = entry.time?.restart ?? false;
      statusKey = entry.overallStatus?.status ?? "Unknown";
      statusValue = _this.Time4oStatusMap(statusKey, unordered);
      place = entry.overallResult?.position != null ? String(entry.overallResult.position) : "";
      rawResult = entry.overallResult?.time ?? null;
      rawBehind = entry.overallResult?.behind ?? null;
      if (restart) {
        rawResult += _this.restartTimeOffset * 10;
        rawBehind += _this.restartTimeOffset * 10;
      }

      if (entry.startOverallResult?.time) {
        startTotalTime = Math.floor(entry.startOverallResult.time / 10);
      }
      else if (timeFromClassStart > 0) {
        startTotalTime = timeFromClassStart;
      }
      if (startTotalTime > 0) {
        splits["0"] = startTotalTime + (restart ? _this.restartTimeOffset : 0);
      }

      // Leg result
      if (entry.time?.time != null) {
        let legStatusKey = entry.status?.status ?? "Unknown";
        let legStatusValue = _this.Time4oStatusMap(legStatusKey, unordered);
        let rawLegResult = entry.time?.time ?? null;
        let rawLegBehind = entry.time?.behind ?? null;
        let legResult = rawLegResult != null ? Math.floor(rawLegResult / 10) : -3;
        let legBehind = rawLegBehind != null ? Math.floor(rawLegBehind / 10) : null;
        splits["999"] = legResult > 0 ? legResult : "";
        splits["999_status"] = legStatusValue;
        splits["999_timeplus"] = legBehind >= 0 ? legBehind : "";
        splits["999_place"] = entry.position != null ? String(entry.position) : "-";
      }
    }

    // Individual class (no chase start) or relay leg 1)
    else {
      statusKey = entry.status?.status ?? "Unknown";
      statusValue = _this.Time4oStatusMap(statusKey, unordered);
      rawResult = entry.time?.time ?? null;
      rawBehind = entry.time?.behind ?? null;
      place = entry.position != null ? String(entry.position) : "";
    }

    let result = rawResult != null ? Math.floor(rawResult / 10) : -3;
    if (statusValue != 0 && statusValue != 9 && statusValue != 10) {
      place = "-";
    }

    // Intermediate times
    const intermediates = entry.intermediateTimes ?? {};
    var prevSplitTime = 0;
    for (const [key, val] of Object.entries(intermediates)) {
      const changedSplit = val?.updated ? Math.floor(Date.parse(val.updated) / 1000) : 0;
      const code = (Number(key.split('-')[1]) * 1000 + Number(key.split('-')[0])) * (unordered ? -1 : 1);
      var timeHundredths = val?.time != null ? Math.floor(val.time / 10) : "";
      var behindHundredths = val?.behind != null ? Math.floor(val.behind / 10) : "";

      // Leg times relay
      if (classInfo.isRelay && entry.leg?.number >= 2) {
        const legTime = timeHundredths !== "" ? timeHundredths - timeFromClassStart : "";
        splits[code + 100000] = legTime;
      }

      // Leg times chase start
      if (chaseStart) {
        const legTime = timeHundredths !== "" ? timeHundredths - startTotalTime : "";
        splits[code + 100000] = legTime;
      }

      if (restart && timeHundredths !== "") {
        timeHundredths += _this.restartTimeOffset;
        behindHundredths += _this.restartTimeOffset;
      }
      const splitStatus = (statusValue == 9 || statusValue == 10 ? 0 : statusValue);
      splits[code] = timeHundredths;
      splits[`${code}_status`] = splitStatus;
      splits[`${code}_changed`] = changedSplit;
      splits[`${code}_timeplus`] = behindHundredths;
      splits[`${code}_place`] = val?.position ?? "-";

      // Lap times
      if (classInfo.showLapTimes) {
        const lapTime = timeHundredths !== "" ? timeHundredths - prevSplitTime : "";
        splits[code + 100000] = lapTime;
        prevSplitTime = val?.time != null ? Math.floor(val.time / 10) : prevSplitTime;
      }
    }

    // Final lap time
    if (classInfo.showLapTimes && result > 0 && result > prevSplitTime) {
      const lapTime = result - prevSplitTime;
      splits[999] = lapTime;
    }

    const changedIso = entry.time?.updated ?? entry.status?.updated ?? entry.updated_at ?? null;
    const changed = changedIso ? Math.floor(Date.parse(changedIso) / 1000) : 0;

    if (statusValue == 13) { // Finished OK in unordered class
      splits["-999"] = result > 0 ? result : "";
      splits["-999_status"] = 13;
      splits["-999_changed"] = changed;
      splits["-999_timeplus"] = 0;
      splits["-999_place"] = "F";
      result = entry.person?.id != null ? entry.person.id : 100;
      place = "F";
    }

    // Club
    const clubName = classInfo.isRelay ? (entry.team?.name ?? "") : (entry.organisation?.name ?? "");

    // Ecard references
    const ecard1no = classInfo.cards[0]?.id ?? "";
    const ecard2no = classInfo.cards[1]?.id ?? "";

    // Calculate progress
    let progress = 0;
    if (statusValue == 9 || statusValue == 10) {
      if (Object.keys(splits).length > 0) {
        let passedSplits = 0;
        let splitCnt = 0;
        for (const split of classInfo.splitcontrols) {
          splitCnt++;
          if (splits[split['code']] != undefined)
            passedSplits = splitCnt;
        }
        progress = (passedSplits * 100.0) / (splitCnt + 1);
      }
    } else if (place != "") {
      progress = 100;
    }

    return {
      place: place,
      dbid: entry.person?.id ?? 0,
      bib: entry.start?.bibNo ?? 0,
      ecard1: entry.cards?.["card" + ecard1no]?.cardNo ?? "",
      ecard2: entry.cards?.["card" + ecard2no]?.cardNo ?? "",
      name: entry.person?.name ?? "",
      club: clubName,
      organisation: entry.organisation?.name ?? "",
      clubId: entry.organisation?.id ?? 0,
      class: classInfo.className ?? "",
      leg: classInfo.isRelay ? entry.leg?.number ?? 1 : 0,
      pace: -1,
      status: statusValue,
      splits: splits,
      start: startTime,
      result: result,
      timeplus: rawBehind != null ? Math.floor(rawBehind / 10) : "",
      changed: changed,
      progress: progress
    };
  }


  AjaxViewer.prototype.toHundredthsSinceMidnight = function (isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime()))
      return -999;
    const ms = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000 + d.getMilliseconds();
    return Math.round(ms / 10);
  }


})(window.LiveResults || window.Messages || {});
