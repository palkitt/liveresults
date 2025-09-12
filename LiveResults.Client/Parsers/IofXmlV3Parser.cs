using LiveResults.Model;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;
using System.Runtime.ExceptionServices;
using System.Text;
using System.Xml;

namespace LiveResults.Client.Parsers
{
    internal class IofXmlV3Parser
    {
        static readonly Dictionary<string, string> m_suppressedIDCalculationErrors = new Dictionary<string, string>();

        public static Runner[] ParseXmlData(XmlDocument xmlDoc, LogMessageDelegate logit, bool deleteFile, LiveResults.Client.Parsers.IofXmlParser.GetIdDelegate getIdFunc, bool readRadioControls,
            out RadioControl[] radioControls, out CourseName[] courseNames, out CourseControl[] courseControls)
        {
            List<CourseName> courseNameList = new List<CourseName>();
            List<CourseControl> courseControlList = new List<CourseControl>();

            var nsMgr = new XmlNamespaceManager(xmlDoc.NameTable);
            nsMgr.AddNamespace("iof", "http://www.orienteering.org/datastandard/3.0");
            var runners = new List<Runner>();
            var t_radioControls = readRadioControls ? new List<RadioControl>() : null;

            #region parseStartlist
            foreach (XmlNode classStartNode in xmlDoc.GetElementsByTagName("ClassStart"))
            {
                XmlNode classNode = classStartNode.SelectSingleNode("iof:Class", nsMgr);
                if (classNode == null)
                    continue;
                XmlNode classNameNode = classNode.SelectSingleNode("iof:Name", nsMgr);
                if (classNameNode == null)
                    continue;

                string className = classNameNode.InnerText;
                /*Relay*/
                var teamStartNodes = classStartNode.SelectNodes("iof:TeamStart", nsMgr);
                if (teamStartNodes != null)
                {
                    foreach (XmlNode teamStartNode in teamStartNodes)
                    {
                        var teamNameNode = teamStartNode.SelectSingleNode("iof:Name", nsMgr);
                        if (teamNameNode == null)
                            continue;
                        string teamName = teamNameNode.InnerText;

                        var teamMemberStartNodes = teamStartNode.SelectNodes("iof:TeamMemberStart", nsMgr);
                        if (teamMemberStartNodes != null)
                        {
                            foreach (XmlNode teamMemberStartNode in teamMemberStartNodes)
                            {
                                string name = GetNameForTeamMember(nsMgr, teamMemberStartNode);
                                var legNode = teamMemberStartNode.SelectSingleNode("iof:Start/iof:Leg", nsMgr);

                                if (legNode != null)
                                {
                                    string leg = legNode.InnerText;

                                    var startTimeNode = teamMemberStartNode.SelectSingleNode("iof:Start/iof:StartTime", nsMgr);
                                    if (startTimeNode == null)
                                        continue;
                                    string starttime = startTimeNode.InnerText;

                                    var runner = new Runner(-1, name, teamName, className + "-" + leg, 0, 0, 0);

                                    if (!string.IsNullOrEmpty(starttime))
                                    {
                                        int istarttime = ParseTime(starttime);
                                        runner.SetStartTime(istarttime);
                                    }

                                    runners.Add(runner);
                                }
                            }
                        }
                    }
                }

                /*Individual*/
                var personNodes = classStartNode.SelectNodes("iof:PersonStart", nsMgr);
                if (personNodes != null)
                {
                    foreach (XmlNode personNode in personNodes)
                    {
                        string familyname;
                        string givenname;
                        string club;
                        int bib;
                        int controlCard;

                        if (!ParsePersonData(personNode, nsMgr, true, out familyname, out givenname, out club, out controlCard, out bib))
                            continue;

                        var startTimeNode = personNode.SelectSingleNode("iof:Start/iof:StartTime", nsMgr);
                        if (startTimeNode == null)
                            continue;
                        string starttime = startTimeNode.InnerText;

                        var runner = new Runner(-1, givenname + " " + familyname, club, className, controlCard, 0, bib);

                        int istarttime = -999; // Open start
                        if (!string.IsNullOrEmpty(starttime))
                            istarttime = ParseTime(starttime);
                        runner.SetStartTime(istarttime);


                        runners.Add(runner);
                    }
                }
            }
            #endregion

            int numClass = 0;

            foreach (XmlNode classResultNode in xmlDoc.GetElementsByTagName("ClassResult"))
            {
                XmlNode classNode = classResultNode.SelectSingleNode("iof:Class", nsMgr);
                if (classNode == null)
                    continue;

                XmlNode classNameNode = classNode.SelectSingleNode("iof:Name", nsMgr);
                if (classNameNode == null)
                    continue;

                string className = classNameNode.InnerText;
                numClass++;

                // Make one course per class
                courseNameList.Add(new CourseName()
                {
                    CourseNo = numClass,
                    Name = "L" + numClass
                });

                /*Read splitcontrols-extension*/
                if (readRadioControls)
                {
                    CheckReadRadioDefinitionFromComment(t_radioControls, classNode, className);

                    var legNodes = classResultNode.SelectNodes("iof:Class/iof:Leg", nsMgr);
                    if (legNodes != null)
                    {
                        for (int leg = 0; leg < legNodes.Count; leg++)
                        {
                            var legNode = legNodes[leg];
                            CheckReadRadioDefinitionFromComment(t_radioControls, legNode, className + "-" + (leg + 1));
                        }
                    }
                }

                int maxLeg = 1;
                var teamResultNodes = classResultNode.SelectNodes("iof:TeamResult", nsMgr);
                if (teamResultNodes != null)
                {
                    foreach (XmlNode teamResultNode in teamResultNodes)
                    {
                        var teamNameNode = teamResultNode.SelectSingleNode("iof:Name", nsMgr);
                        if (teamNameNode == null)
                            continue;
                        string teamName = teamNameNode.InnerText;

                        var teamBibNode = teamResultNode.SelectSingleNode("iof:BibNumber", nsMgr);
                        if (teamBibNode == null)
                            continue;
                        int teamBib = Int32.Parse(teamBibNode.InnerText);

                        var teamMemberResultNodes = teamResultNode.SelectNodes("iof:TeamMemberResult", nsMgr);
                        if (teamMemberResultNodes != null)
                        {
                            string totalTime = "";
                            foreach (XmlNode teamMemberResult in teamMemberResultNodes)
                            {
                                string name = GetNameForTeamMember(nsMgr, teamMemberResult);
                                var legNode = teamMemberResult.SelectSingleNode("iof:Result/iof:Leg", nsMgr);

                                if (legNode != null)
                                {
                                    string leg = legNode.InnerText;
                                    int bib = -(teamBib * 100 + Int32.Parse(leg));

                                    var controlCardNode = teamMemberResult.SelectSingleNode("iof:Result/iof:ControlCard", nsMgr);
                                    int controlCard = 0;
                                    if (controlCardNode != null)
                                        controlCard = Int32.Parse(controlCardNode.InnerText);

                                    var runner = new Runner(-1, name, teamName, className + "-" + leg, controlCard, 0, bib);

                                    var competitorStatusNode = teamMemberResult.SelectSingleNode("iof:Result/iof:OverallResult/iof:Status", nsMgr);
                                    var resultTimeNode = teamMemberResult.SelectSingleNode("iof:Result/iof:OverallResult/iof:Time", nsMgr);
                                    var startTimeNode = teamMemberResult.SelectSingleNode("iof:Result/iof:StartTime", nsMgr);

                                    string status = "notActivated";
                                    if (competitorStatusNode != null)
                                        status = competitorStatusNode.InnerText;

                                    if (status.ToLower() == "notcompeting" || status.ToLower() == "cancelled")
                                    {
                                        //Does not compete, exclude
                                        continue;
                                    }

                                    string time;
                                    ParseResult(runner, resultTimeNode, startTimeNode, status, out time);

                                    List<CourseControl> newCourseControlList = null;
                                    XmlNodeList splittimes = teamMemberResult.SelectNodes("iof:Result/iof:SplitTime", nsMgr);
                                    ParseSplitTimes(nsMgr, runner, time, splittimes, numClass, out newCourseControlList);

                                    int legNo = Int32.Parse(leg);
                                    if (legNo > maxLeg)
                                    {
                                        t_radioControls.Add(new RadioControl
                                        {
                                            Order = 0,
                                            ClassName = className + "-" + leg,
                                            Code = 0,
                                            ControlName = "Exchange"
                                        });
                                        t_radioControls.Add(new RadioControl
                                        {
                                            Order = 999,
                                            ClassName = className + "-" + leg,
                                            Code = 999,
                                            ControlName = "LegTime"
                                        });
                                        maxLeg = Math.Max(legNo, maxLeg);
                                    }

                                    if (legNo > 1)
                                    {
                                        var legTimeNode = teamMemberResult.SelectSingleNode("iof:Result/iof:Time", nsMgr);
                                        string legTime = "";
                                        if (legTimeNode != null)
                                            legTime = legTimeNode.InnerText;

                                        FixKraemerTimeFormat(ref legTime);
                                        int iLegTime = string.IsNullOrEmpty(legTime) ? -10 : (int)(Convert.ToDouble(legTime, CultureInfo.InvariantCulture) * 100);

                                        if (iLegTime > 0)
                                            runner.SetSplitTime(999, iLegTime);

                                        int iTotalTime = (int)(Convert.ToDouble(totalTime, CultureInfo.InvariantCulture) * 100);
                                        if (iTotalTime > 0)
                                            runner.SetSplitTime(0, iTotalTime);
                                    }

                                    runners.Add(runner);
                                    totalTime = time;
                                }
                            }
                        }
                    }
                }

                bool newClass = true;
                var personNodes = classResultNode.SelectNodes("iof:PersonResult", nsMgr);
                if (personNodes != null)
                {
                    foreach (XmlNode personNode in personNodes)
                    {
                        string familyname;
                        string givenname;
                        string club;
                        int bib;
                        int controlCard;

                        if (!ParsePersonData(personNode, nsMgr, false, out familyname, out givenname, out club, out controlCard, out bib))
                            continue;

                        var runner = new Runner(-1, givenname + " " + familyname, club, className, controlCard, 0, bib);

                        var competitorStatusNode = personNode.SelectSingleNode("iof:Result/iof:Status", nsMgr);
                        var resultTimeNode = personNode.SelectSingleNode("iof:Result/iof:Time", nsMgr);
                        var startTimeNode = personNode.SelectSingleNode("iof:Result/iof:StartTime", nsMgr);
                        if (competitorStatusNode == null)
                            continue;

                        string status = competitorStatusNode.InnerText;

                        if (status.ToLower() == "notcompeting" || status.ToLower() == "cancelled")
                        {
                            //Does not compete, exclude
                            continue;
                        }

                        string time;
                        ParseResult(runner, resultTimeNode, startTimeNode, status, out time);

                        int courseNo = numClass;
                        List<CourseControl> newCourseControlList = null;

                        XmlNodeList splittimes = personNode.SelectNodes("iof:Result/iof:SplitTime", nsMgr);
                        ParseSplitTimes(nsMgr, runner, time, splittimes, courseNo, out newCourseControlList);
                        runner.SetCourse(courseNo);
                        runners.Add(runner);

                        if (newClass && newCourseControlList != null)
                        {
                            courseControlList.AddRange(newCourseControlList);
                        }

                        newClass = false;
                    }
                }
            }

            radioControls = (t_radioControls != null && t_radioControls.Count > 0) ? t_radioControls.ToArray() : null;
            courseNames = courseNameList.ToArray();
            courseControls = courseControlList.ToArray();

            return runners.ToArray();
        }

        private static string GetNameForTeamMember(XmlNamespaceManager nsMgr, XmlNode sourceNode)
        {
            string name = "";
            var runnerFamilyNameNode = sourceNode.SelectSingleNode("iof:Person/iof:Name/iof:Family", nsMgr);
            var runnerGivenNameNode = sourceNode.SelectSingleNode("iof:Person/iof:Name/iof:Given", nsMgr);
            if (runnerGivenNameNode != null)
            {
                name = runnerGivenNameNode.InnerText;
            }
            if (runnerFamilyNameNode != null)
            {
                name = name + (!string.IsNullOrEmpty(name) ? " " : "") + runnerFamilyNameNode.InnerText;
            }

            if (string.IsNullOrEmpty(name))
            {
                name = "n.n";
            }
            return name;
        }

        private static void CheckReadRadioDefinitionFromComment(List<RadioControl> t_radioControls, XmlNode nodeToCheckForComment, string className)
        {
            if (nodeToCheckForComment.FirstChild is XmlComment)
            {
                var commentNode = nodeToCheckForComment.FirstChild as XmlComment;
                if (commentNode != null)
                {
                    var comment = commentNode.InnerText;
                    if (!string.IsNullOrEmpty(comment) && comment.ToLower().IndexOf("splittimecontrols:") >= 0)
                    {
                        var parts = comment.Split(':');
                        if (string.Compare(parts[0].Trim(), "splittimecontrols", StringComparison.InvariantCultureIgnoreCase) == 0)
                        {
                            var splitControls = parts[1].Trim().Split(',');
                            Dictionary<int, int> radioCnt = new Dictionary<int, int>();
                            for (int i = 0; i < splitControls.Length; i++)
                            {
                                if (splitControls[i].Trim() != "999")
                                {
                                    int code = Convert.ToInt32(splitControls[i].Trim());
                                    if (!radioCnt.ContainsKey(code))
                                        radioCnt.Add(code, 0);
                                    radioCnt[code]++;
                                    t_radioControls.Add(new RadioControl
                                    {
                                        Order = i,
                                        ClassName = className,
                                        Code = radioCnt[code] * 1000 + code,
                                        ControlName = "(" + code + ")"
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        private static void ParseResult(Runner runner, XmlNode resultTimeNode, XmlNode startTimeNode, string status, out string time)
        {
            int itime;
            int istatus;
            time = "";
            if (resultTimeNode != null)
                time = resultTimeNode.InnerText;

            FixKraemerTimeFormat(ref time);

            string starttime = "";
            if (startTimeNode != null)
                starttime = startTimeNode.InnerText;

            if (!string.IsNullOrEmpty(starttime))
            {
                int istarttime = ParseTime(starttime);
                runner.SetStartTime(istarttime);
            }

            itime = string.IsNullOrEmpty(time) ? -10 : (int)(Convert.ToDouble(time, CultureInfo.InvariantCulture) * 100);//ParseTime(time);
            istatus = 10;

            switch (status.ToLower())
            {
                case "missingpunch":
                    istatus = 3;
                    break;
                case "disqualified":
                    istatus = 4;
                    break;
                case "didnotfinish":
                    istatus = 3;
                    itime = -3;
                    break;
                case "didnotstart":
                    istatus = 1;
                    itime = -3;
                    break;
                case "overtime":
                    istatus = 5;
                    break;
                case "ok":
                    istatus = 0;
                    break;
            }

            if (istatus == 0 && itime < 0) // Completed without time
            {
                istatus = 13;
                itime = 100;
            }

            runner.SetResult(itime, istatus);
        }

        private static void FixKraemerTimeFormat(ref string time)
        {
            if (!string.IsNullOrEmpty(time) && time.Contains(","))
            {
                //Hack for krämer-software exporting decimal numbers with local numberformat for which can be , for decimal separator
                time = time.Replace(",", ".");
            }
        }

        private static void ParseSplitTimes(XmlNamespaceManager nsMgr, Runner runner, string time, XmlNodeList splittimes, int courseNo, out List<CourseControl> courseControls)
        {
            courseControls = new List<CourseControl>();
            if (splittimes != null)
            {
                var lsplitCodes = new List<int>();
                var lsplitTimes = new List<int>();
                string splitTimeList = "";
                int i = 0;
                foreach (XmlNode splitNode in splittimes)
                {
                    XmlNode splitcode = splitNode.SelectSingleNode("iof:ControlCode", nsMgr);
                    XmlNode splittime = splitNode.SelectSingleNode("iof:Time", nsMgr);
                    if (splitcode == null)
                        continue;
                    i++;
                    int iSplitcode;
                    bool parseOK = int.TryParse(splitcode.InnerText, out iSplitcode);

                    if (parseOK)
                    {
                        courseControls.Add(new CourseControl()
                        {
                            CourseNo = courseNo,
                            Code = iSplitcode,
                            Order = i
                        });
                    }

                    if (parseOK && splittime == null)
                    {
                        splitTimeList += "-1,";
                    }
                    else
                    {
                        string sSplittime = splittime.InnerText;
                        bool isFinishPunch = splitcode.InnerText.StartsWith("F", StringComparison.InvariantCultureIgnoreCase) || iSplitcode == 999;
                        if ((parseOK || isFinishPunch) && sSplittime.Length > 0)
                        {
                            if (isFinishPunch)
                            {
                                if ((runner.Status == 0 && runner.Time == -1) || (runner.Status == 10 && runner.Time == -9))
                                {
                                    // Punch at finish
                                    if (!string.IsNullOrEmpty(time))
                                    {
                                        FixKraemerTimeFormat(ref time);
                                        var itime = (int)(Convert.ToDouble(time, CultureInfo.InvariantCulture) * 100);
                                        runner.SetResult(itime, 0);
                                    }
                                }
                            }
                            else
                            {
                                iSplitcode += 1000;
                                while (lsplitCodes.Contains(iSplitcode))
                                {
                                    iSplitcode += 1000;
                                }

                                if (!string.IsNullOrEmpty(sSplittime))
                                {
                                    FixKraemerTimeFormat(ref sSplittime);
                                    int iSplittime = (int)(Convert.ToDouble(sSplittime, CultureInfo.InvariantCulture) * 100);
                                    lsplitCodes.Add(iSplitcode);
                                    lsplitTimes.Add(iSplittime);
                                    runner.SetSplitTime(iSplitcode, iSplittime);
                                    splitTimeList += (iSplittime / 100) + ",";
                                }
                                else
                                {
                                    splitTimeList += "-1,";
                                }
                            }
                        }
                    }
                }
                splitTimeList = splitTimeList.TrimEnd(',');
                runner.SetEcardTimes(splitTimeList);
            }

        }

        private static bool ParsePersonData(XmlNode personResultNode, XmlNamespaceManager nsMgr, bool startList, out string familyname, out string givenname,
           out string club, out int controlCard, out int bib)
        {

            club = null;
            familyname = null;
            givenname = null;
            bib = 0;
            controlCard = 0;

            XmlNode personNameNode = personResultNode.SelectSingleNode("iof:Person/iof:Name", nsMgr);
            if (personNameNode == null)
            {
                return false;
            }

            var familyNameNode = personNameNode.SelectSingleNode("iof:Family", nsMgr);
            var giveNameNode = personNameNode.SelectSingleNode("iof:Given", nsMgr);
            if (familyNameNode == null || giveNameNode == null)
            {
                return false;
            }

            familyname = familyNameNode.InnerText;
            givenname = giveNameNode.InnerText;
            // sourceId = personIdNode.InnerText;

            var bibNode = (startList ? personResultNode.SelectSingleNode("iof:Start/iof:BibNumber", nsMgr) :
                personResultNode.SelectSingleNode("iof:Result/iof:BibNumber", nsMgr));
            if (bibNode != null && bibNode.InnerText != "")
                bib = Int32.Parse(bibNode.InnerText);

            var controlCardNode = (startList ? personResultNode.SelectSingleNode("iof:Start/iof:ControlCard", nsMgr) :
                personResultNode.SelectSingleNode("iof:Result/iof:ControlCard", nsMgr));
            if (controlCardNode != null && controlCardNode.InnerText != "")
                controlCard = Int32.Parse(controlCardNode.InnerText);

            club = "";
            var clubNode = personResultNode.SelectSingleNode("iof:Organisation/iof:ShortName", nsMgr);
            if (clubNode != null)
            {
                club = clubNode.InnerText;
            }
            else
            {
                clubNode = personResultNode.SelectSingleNode("iof:Organisation/iof:Name", nsMgr);
                if (clubNode != null)
                {
                    club = clubNode.InnerText;
                }
            }
            return true;
        }

        private static int ParseTime(string time)
        {
            int itime = -9;
            if (!string.IsNullOrEmpty(time))
            {
                var dttime = DateTime.Parse(time, System.Globalization.CultureInfo.InvariantCulture);
                itime = (int)(dttime.TimeOfDay.TotalMilliseconds / 10);
            }
            return itime;
        }

    }
}
