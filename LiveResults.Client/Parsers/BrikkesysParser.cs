using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Threading;
using LiveResults.Client.Model;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Xml;
using System.Net;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using LiveResults.Model;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace LiveResults.Client
{

    public class BrikkesysParser : IExternalSystemResultParserEtiming
    {
        private readonly IDbConnection m_connection;
        private readonly bool m_recreateRadioControls;
        private readonly int m_raceID;
        public event DeleteUnusedIDDelegate OnDeleteUnusedID;
        public event MergeRadioControlsDelegate OnMergeRadioControls;
        public event MergeCourseControlsDelegate OnMergeCourseControls;
        public event RadioControlDelegate OnRadioControl;
        public event ResultDelegate OnResult;
        public event LogMessageDelegate OnLogMessage;
        public event DeleteIDDelegate OnDeleteID;
        private bool m_isRelay = false;
        private bool m_continue;
        private int m_compID;

        Thread m_monitorThread;

        public struct SplitRawStruct
        {
            public int controlCode;
            public int passTime;
            public int netTime;
        }

        public class CourseInfo
        {
            public List<CourseControl> courseControls;
            public int length;
            public string name;
        }

        public BrikkesysParser(IDbConnection conn, int BrikkesysID, int compID)
        {
            m_connection = conn;
            m_recreateRadioControls = false;
            m_isRelay = false;
            m_raceID = BrikkesysID;
            m_compID = compID;
        }      

        private void Run()
        {
            string SQLInd = "SELECT N.id, N.startnr, N.name, N.ecardno, N.club, N.time, N.starttime, N.nulltime, N.classid, " +
                            "N.timecalculation, N.codesandtimes, N.status, N.courceid, " +
                            "C.name AS cname, cast(C.nosort AS signed) AS nosort, C.starttime AS cstarttime, CC.courceid AS ccourceid " +
                            "FROM names N " +
                            "LEFT JOIN classes C ON C.id = N.classid " +
                            "LEFT JOIN(SELECT MIN(raceid) AS raceid, MIN(courceid) AS courceid, MIN(classid) AS cclassid " +
                            "FROM classcource WHERE raceid = " + m_raceID + " GROUP BY classid) AS CC ON CC.cclassid = N.classid " +
                            "WHERE N.raceid = " + m_raceID;
            string SQLSplits = string.Format(@"SELECT controlno, ecardno, time, ecardtime FROM onlinecontrols WHERE raceid={0} ORDER BY time", m_raceID);

            while (m_continue)
            {
                try
                {
                    FireLogMsg("Brikkesys Monitor thread started");

                    if (m_connection.State != ConnectionState.Open)
                        m_connection.Open();

                    IDbCommand cmdInd = m_connection.CreateCommand();
                    cmdInd.CommandText = SQLInd;

                    IDbCommand cmdSplits = m_connection.CreateCommand();
                    cmdSplits.CommandText = SQLSplits;

                    string lastRunner = "";
                    List<int> usedID = new List<int>();
                    Dictionary<int, List<SplitRawStruct>> splitList = null;
                    
                    string messageServer = ConfigurationManager.AppSettings["messageServer"];
                    string apiServer = ConfigurationManager.AppSettings["apiServer"];
                    WebClient client = new WebClient();
                    ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; //TLS 1.2

                    Dictionary<int, CourseInfo> courses = new Dictionary<int, CourseInfo>();

                    int m_sleepTime     = 3;                 // Time between each scan
                    int maxMessageTimer = 9;                 // Time between reading messages
                    int messageTimer    = maxMessageTimer;
                    int maxActiveTimer  = 60;                // Time between setting new live active signal
                    int activeTimer     = maxActiveTimer;
                    int maxCCTimer      = 60;                // Time between reading courses and controls
                    int CCTimer         = maxCCTimer;
                    bool failedLast     = false;
                    bool failedThis;                    

                    // Main loop
                    while (m_continue)
                    {
                        try
                        {
                            CCTimer += m_sleepTime;
                            if (CCTimer >= maxCCTimer)
                            {
                                MakeRadioControls();
                                courses = GetCourses();
                                CCTimer = 0;
                            }

                            ParseReaderSplits(cmdSplits, out splitList, out lastRunner);
                            ParseReader(cmdInd, ref splitList, ref courses, out lastRunner, out usedID);
                            FireOnDeleteUnusedID(usedID);

                            activeTimer += m_sleepTime;
                            if (activeTimer >= maxActiveTimer)
                            {
                                SendLiveActive(apiServer, client);
                                activeTimer = 0;
                            }

                            messageTimer += m_sleepTime;
                            if (messageTimer >= maxMessageTimer)
                            {
                                UpdateFromMessages(messageServer, client, failedLast, out failedThis);
                                failedLast = failedThis;
                                messageTimer = 0;
                            }
                            Thread.Sleep(1000 * m_sleepTime);
                        }
                        catch (Exception ee)
                        {
                            FireLogMsg("Brikkesys Parser: " + ee.Message + " {parsing: " + lastRunner + "}");
                            Thread.Sleep(100);
                            switch (m_connection.State)
                            {
                                case ConnectionState.Broken:
                                case ConnectionState.Closed:
                                    m_connection.Close();
                                    m_connection.Open();
                                    break;
                            }
                        }
                    }
                }
                catch (Exception ee)
                {
                    FireLogMsg("Brikkesys Parser: " + ee.Message);
                }
                finally
                {
                    if (m_connection != null)
                        m_connection.Close();
                    FireLogMsg("Brikkesys Monitor thread stopped");
                }
            }

        }

        private void ParseReader(IDbCommand cmd, ref Dictionary<int, List<SplitRawStruct>> splitList, ref Dictionary<int, CourseInfo> courses, out string lastRunner, out List<int> usedID)
        {
            lastRunner = "";
            usedID = new List<int>();
            using (IDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int time = -2, runnerID = 0, iStartTime = 0, iNullTime = 0, iCStartTime = 0, bib = 0, ecard = 0,
                        length = 0, noSort = 0, courseID = -1, timeOffset = 0;
                    int startBehind = 0;
                    int sign = 1;
                    bool chaseStart = false;
                    bool freeStart = false;
                    bool useEcardTime = false;
                    string runnerName = "", club = "", classN = "";
                    string status = "", timeCalc = "", codesAndTimes = "", EcardTimes = "";
                    
                    var SplitTimes = new List<ResultStruct>();

                    try
                    {
                        runnerID = Convert.ToInt32(reader["id"]);
                        runnerName = reader["name"] as string;
                        lastRunner = runnerName;
                        club = reader["club"] as string;
                        classN = reader["cname"] as string;
                        timeCalc = reader["timecalculation"] as string;

                        if (reader["startnr"] != null && reader["startnr"] != DBNull.Value)
                            bib = Convert.ToInt32(reader["startnr"]);

                        if (reader["ecardno"] != null && reader["ecardno"] != DBNull.Value)
                            ecard = Convert.ToInt32(reader["ecardno"]);                   

                        if (reader["courceid"] != null && reader["courceid"] != DBNull.Value)
                            courseID = Convert.ToInt32(reader["courceid"]);
                        else if (reader["ccourceid"] != null && reader["ccourceid"] != DBNull.Value)
                            courseID = Convert.ToInt32(reader["ccourceid"]);
                        else if (reader["classid"] != null && reader["classid"] != DBNull.Value)
                            courseID = Convert.ToInt32(reader["classid"]); 

                        if (courses.ContainsKey(courseID))
                            length = courses[courseID].length;

                        if (reader["nulltime"] != null && reader["nulltime"] != DBNull.Value)
                        {
                            DateTime.TryParse(reader["nulltime"].ToString(), out DateTime parseTime);
                            iNullTime = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);
                        }

                        if (reader["cstarttime"] != null && reader["cstarttime"] != DBNull.Value)
                        {
                            DateTime.TryParse(reader["cstarttime"].ToString(), out DateTime parseTime);
                            iCStartTime = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);
                        }

                        if (reader["starttime"] != null && reader["starttime"] != DBNull.Value)
                        {
                            DateTime.TryParse(reader["starttime"].ToString(), out DateTime parseTime);
                            iStartTime = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);
                        }
                        else // Open start
                        {
                            freeStart = true;
                            iStartTime = -999;
                        }

                        if ((timeCalc == "J" || timeCalc == "S") && (iStartTime - iNullTime > 0))
                            timeOffset = (iStartTime - iNullTime) / 100;

                        if (reader["time"] != null && reader["time"] != DBNull.Value)
                        {
                            DateTime.TryParse(reader["time"].ToString(), out DateTime parseTime);
                            time = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);
                        }

                        if (reader["codesandtimes"] != null && reader["codesandtimes"] != DBNull.Value)
                            codesAndTimes = reader["codesandtimes"] as string;

                        bool allEcardTimesOK = (time > 0 && codesAndTimes != "" || time < 0 && codesAndTimes == "");
                        if (codesAndTimes != "" && courseID > -1)
                            EcardTimes = MakeSplitTimes(codesAndTimes, timeOffset, courseID, courses, out allEcardTimesOK);

                        if (reader["nosort"] != null && reader["nosort"] != DBNull.Value)
                            noSort = Convert.ToInt32(reader["nosort"]);

                        if (reader["status"] != null && reader["status"] != DBNull.Value)
                            status = reader["status"] as string;
                        
                        if (noSort >= 1)
                        {
                            sign = -1;
                            if (status == "A")
                                status = "F";

                            if (noSort == 1 && time > 0 && (status == "F" || status == "D")) // Unranked, show times
                                SplitTimes.Add(new ResultStruct { ControlCode = -999, Time = time });
                        }                                                

                        if (timeCalc == "B") // Use ecard time
                            useEcardTime = true;

                        if (timeCalc == "J") // Chase start
                        {
                            chaseStart = true;
                            startBehind = iStartTime - iCStartTime;
                            if (startBehind >= 0)                                
                                SplitTimes.Add(new ResultStruct{ ControlCode = 0, Time = startBehind });
                            
                            int legTime = time - startBehind;
                            if (legTime > 0)
                                SplitTimes.Add(new ResultStruct{ ControlCode = 999,  Time = legTime });                            
                        }
                        
                        // Add radio times
                        int calcStartTime = -2;
                        if (splitList.ContainsKey(ecard))                                                   
                            AddSplits(ecard, iStartTime, time, startBehind, sign, noSort, chaseStart, freeStart, useEcardTime, allEcardTimesOK, splitList[ecard], ref SplitTimes, out calcStartTime);

                        if (freeStart && (calcStartTime > 0) && (Math.Abs(calcStartTime - iStartTime) > 2000))  // Update starttime if deviation more than 20 sec
                            iStartTime = calcStartTime;

                        int rstatus = GetStatusFromCode(ref time, status, runnerID);
                        if (rstatus != 999)
                        {
                            usedID.Add(runnerID);
                            var res = new Result
                            {
                                ID = runnerID,
                                RunnerName = runnerName,
                                RunnerClub = club,
                                Bib = bib,
                                Class = classN,
                                StartTime = iStartTime,
                                Time = time,
                                Ecard1 = ecard,
                                Length = length,
                                EcardTimes = EcardTimes,
                                SplitTimes = SplitTimes,
                                Course = courseID,
                                Status = rstatus
                            };
                            FireOnResult(res);
                        }
                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("Brikkesys Parser: " + ee.Message + " {Last parsing: " + lastRunner + "}");
                    }
                }
                reader.Close();
            }
        }

        private void AddSplits(int ecard, int iStartTime, int time, int startBehind, int sign, int noSort, bool chaseStart, bool freeStart, bool useEcardTime, bool allEcardOK,
            List<SplitRawStruct> splits, ref List<ResultStruct> SplitTimes, out int calcStartTime)
        {
            var lsplitCodes = new List<int>();
            calcStartTime = -2;
            int lastSplitTime = -1;
            int lastSplitCode = -999;
            foreach (var split in splits)
            {
                int splitPassTime = split.passTime;
                if (splitPassTime < iStartTime || (splitPassTime - lastSplitTime < 3000 && split.controlCode == lastSplitCode))
                    continue;         // Neglect passing before starttime, passing less than 30 s from last when the same splitCode

                int passTime = -2;    // Total time at passing
                int passLegTime = -2; // Time used on leg at passing
                if (split.netTime > 0 && (time < 0 || split.netTime < time) && (freeStart || useEcardTime) && allEcardOK)
                    passTime = split.netTime;
                else if (m_isRelay)
                {
                    //Not implemented yet
                    //passLegTime = splitPassTime - Math.Max(iStartTime, iStartClass); // In case ind. start time not set
                    //passTime = passLegTime + Math.Max(TeamTimePre, iStartTime - iStartClass); // Absolute pass time
                }
                else if (chaseStart)
                {
                    passLegTime = splitPassTime - iStartTime;
                    passTime = splitPassTime - iStartTime + startBehind;
                }
                else if (!freeStart)
                    passTime = splitPassTime - iStartTime;

                if (passTime < 1000 || (time > 0 && passTime > time))  // Neglect pass times less than 10 s from start and pass times longer than finish time
                    continue;

                // Add split code to list
                lastSplitCode = split.controlCode;
                if (time < 0 || passTime < time - 300) // Update only last split time when before finish with 3 sec margin
                    lastSplitTime = splitPassTime;

                int iSplitcode = sign * (split.controlCode + 1000);
                while (lsplitCodes.Contains(iSplitcode))
                    iSplitcode += sign * 1000;

                // All checks passed. Add split time to SplitTime struct
                lsplitCodes.Add(iSplitcode);

                if (noSort == 2) // Not show times
                    passTime = -10;
                var SplitTime = new ResultStruct
                {
                    ControlCode = iSplitcode,
                    Time = passTime
                };
                SplitTimes.Add(SplitTime);

                if (passLegTime > 0 && chaseStart)
                {
                    var passLegTimeStruct = new ResultStruct
                    {
                        ControlCode = iSplitcode + 100000,
                        Time = passLegTime
                    };
                    SplitTimes.Add(passLegTimeStruct);
                }

                if (freeStart && calcStartTime < 0)
                    calcStartTime = split.passTime - split.netTime;
            }
        }


        private void ParseReaderSplits(IDbCommand cmd, out Dictionary<int, List<SplitRawStruct>> splitList, out string lastRunner)
        {
            splitList = new Dictionary<int, List<SplitRawStruct>>();
            lastRunner = "";
            using (IDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int ecard = 0, code = 0, passTime = -2, netTime = -2;
                    try
                    {
                        if (reader["ecardno"] != null && reader["ecardno"] != DBNull.Value)
                        {
                            ecard = Convert.ToInt32(reader["ecardno"].ToString());
                            lastRunner = "Ecard no:" + reader["ecardno"].ToString();
                        }
                        else
                            continue;

                        if (reader["time"] != null && reader["time"] != DBNull.Value)
                        {
                            DateTime.TryParse(reader["time"].ToString(), out DateTime parseTime);
                            passTime = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);
                        }
                        if (reader["ecardtime"] != null && reader["ecardtime"] != DBNull.Value)
                        {
                            DateTime.TryParse(reader["ecardtime"].ToString(), out DateTime parseTime);
                            netTime = (int)Math.Round(parseTime.TimeOfDay.TotalSeconds * 100);
                        }
                        if (reader["controlno"] != null && reader["controlno"] != DBNull.Value)
                            code = Convert.ToInt32(reader["controlno"].ToString());

                        var res = new SplitRawStruct
                        {
                            controlCode = code,                            
                            passTime = passTime,
                            netTime = netTime,
                        };

                        if (!splitList.ContainsKey(ecard))
                        {
                            splitList.Add(ecard, new List<SplitRawStruct>());
                        };
                        splitList[ecard].Add(res);

                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("Brikkesys Parser: " + ee.Message);
                    }
                }
                reader.Close();
            }
        }


        private static int GetStatusFromCode(ref int time, string status, int runnerID)
        {
            int rstatus = 10;
            switch (status)
            {
                case "A": rstatus = 0; break; // OK
                case "N": rstatus = 1; time = -3; break; // DNS
                case "E": rstatus = 2; time = -3; break; // DNF
                case "D": rstatus = 3; time = -3; break; // DSQ 
                case "H": rstatus = 9; time = -3; break; // Started
                case "W": rstatus = 10; time = -3; break; // Entered 
                case "I": rstatus = 10; time = -3; break; // Entered 
                case "F": rstatus = 13; time = runnerID; break; // Not ranked
                default: rstatus = 999; break;  // Unsupported status
            }
            return rstatus;
        }

        private void MakeRadioControls()
        {
            try
            {
                // Setting up extra times               
                List<RadioControl> extraTimes = new List<RadioControl>();
                var dlgMergeRadio = OnMergeRadioControls;

                if (m_connection.State != ConnectionState.Open)
                    m_connection.Open();
                IDbCommand cmd = m_connection.CreateCommand();
                string classTimingType = "SELECT name, cast(nosort AS signed) AS nosort, timecalculation FROM classes WHERE raceid=" + m_raceID;
                cmd.CommandText = classTimingType;

                using (IDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        int noSort = 0;
                        string timecalculation = "";
                        string classN = reader["name"] as string;
                        if (reader["nosort"] != null && reader["nosort"] != DBNull.Value)
                            noSort = Convert.ToInt32(reader["nosort"]);
                        if (reader["timecalculation"] != null && reader["timecalculation"] != DBNull.Value)
                            timecalculation = reader["timecalculation"] as string;

                        if (noSort == 1) // Add neg finish passing for not-ranked, show times class
                            extraTimes.Add(new RadioControl
                            {
                                ClassName = classN,
                                ControlName = "Tid",
                                Code = -999,
                                Order = 999
                            });

                        if (timecalculation == "J")
                        {
                            extraTimes.Add(new RadioControl
                            {
                                ClassName = classN,
                                ControlName = "Start",
                                Code = 0,
                                Order = 0
                            });

                            extraTimes.Add(new RadioControl
                            {
                                ClassName = classN,
                                ControlName = "Leg",
                                Code = 999,
                                Order = 999
                            });
                        }
                    }
                    reader.Close();
                    RadioControl[] radioControls = extraTimes.ToArray();
                    dlgMergeRadio(radioControls, false);
                }
            }
            catch (Exception ee)
            {
                FireLogMsg("Brikkesys Parser makeRadioControls: " + ee.Message);
            }            
        }

        private string MakeSplitTimes(string splitTimeString, int timeOffset, int course, Dictionary<int, CourseInfo> courses, out bool allOK)
        {
            allOK = true;
            string[] ecardTimes = splitTimeString.Split(',');
            string ecardTimeString = "";
            int controlNo = 0, timeNo = 0, timeNoLast = -1, numControls = 0;
            if (courses.ContainsKey(course))
                numControls = courses[course].courseControls.Count;
            bool first = true;
            while (controlNo < numControls)
            {
                int timeMatch = -1;
                int[] codeTime = { 0, 0 }; // Code, time
                timeNo = timeNoLast + 1;
                while (timeNo < ecardTimes.Length)
                {
                    codeTime = Array.ConvertAll(ecardTimes.ElementAt(timeNo).TrimStart().Split(' '), int.Parse);
                    if (codeTime[0] == courses[course].courseControls.ElementAt(controlNo).Code)
                    {
                        timeNoLast = timeNo;
                        break;
                    }
                    timeNo++;
                }
                if (timeNo < ecardTimes.Length) // control found
                    timeMatch = codeTime[1] - timeOffset;
                else
                    allOK = false;

                if (first)
                    first = false;
                else
                    ecardTimeString += ",";
                ecardTimeString += timeMatch.ToString();
                controlNo++;
            }
            allOK = (ecardTimes.Length > 0 ? allOK : true);
            return ecardTimeString;
        }

        private Dictionary<int, CourseInfo> GetCourses()
        {
            Dictionary<int, CourseInfo> courses = new Dictionary<int, CourseInfo>();
            try
            {
                var dlgMergeCourseControls = OnMergeCourseControls;

                if (dlgMergeCourseControls != null) // Read courses
                {
                    List<CourseControl> courseControls = new List<CourseControl>();
                    if (m_connection.State != ConnectionState.Open)
                        m_connection.Open();
                    IDbCommand cmd = m_connection.CreateCommand();
                    string controls = "SELECT id, name, meter, codes FROM classes WHERE raceid=" + m_raceID;
                    cmd.CommandText = controls;
                    using (IDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            int length = 0;
                            string codesStr = reader["codes"] as string;
                            if (codesStr == "")
                                continue;
                            int id = Convert.ToInt32(reader["id"]);
                            string name = reader["name"] as string;
                            if (reader["meter"] != null && reader["meter"] != DBNull.Value)
                                length = Convert.ToInt32(reader["meter"]);

                            int[] codes = Array.ConvertAll(codesStr.Split(' '), int.Parse);
                            for (int i = 0; i < codes.Length - 1; i++) // Last control is finish
                            {
                                var control = new CourseControl
                                {
                                    CourseNo = id,
                                    Code = codes[i],
                                    Order = i
                                };
                                courseControls.Add(control);
                                if (!courses.ContainsKey(id))
                                    courses.Add(id, new CourseInfo
                                    {
                                        courseControls = new List<CourseControl>(),
                                        length = length,
                                        name = name
                                    });
                                courses[id].courseControls.Add(control);
                            }
                        }
                        reader.Close();
                    }
                    CourseControl[] courseControlArray = courseControls.ToArray();
                    dlgMergeCourseControls(courseControlArray, true);
                }
            }
            catch (Exception ee)
            {
                FireLogMsg("Brikkesys Parser getCourses: " + ee.Message);
            }
            return courses;
        }

        private void SendLiveActive(string apiServer, WebClient client)
        {
            string apiResponse = "";
            try
            {
                apiResponse = client.DownloadString(apiServer + "api.php?method=setlastactive&comp=" + m_compID);
                FireLogMsg("Client live active sent to web server");
            }
            catch (Exception ee)
            {
                FireLogMsg("Bad network or config file? Error on sending active signal: " + ee.Message);
            }
        }

        private void UpdateFromMessages(string messageServer, WebClient client, bool failedLast, out bool failedThis)
        {
            failedThis = false;
            string apiResponse = "";
            // Get DNS and ecard changes
            try
            {
                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=getchanges&comp=" + m_compID);
            }
            catch (Exception ee)
            {
                FireLogMsg("Bad network or config file? LiveRes Message error: " + ee.Message);
            }

            var objects = JsonConvert.DeserializeObject<dynamic>(apiResponse);
            if (objects != null && objects.status == "OK")
            {

                // DNS
                // *****************************
                JArray itemsDNS = (JArray)objects["dns"];
                foreach (JObject element in itemsDNS)
                {
                    int messid = (element["messid"]).ToObject<int>();
                    int dbid = (element["dbid"]).ToObject<int>();
                    try
                    {
                        IDbCommand cmd = m_connection.CreateCommand();
                        cmd.CommandText = string.Format(@"SELECT id, name, status FROM names WHERE id={0} AND raceid={1}", dbid, m_raceID);

                        int id = 0;
                        string status = "", name = "";
                        using (IDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                if (reader[0] != null && reader[0] != DBNull.Value)
                                {
                                    status = reader["status"] as string;
                                    name = reader["name"] as string;
                                    id = Convert.ToInt32(reader["id"].ToString());
                                }
                            }
                            reader.Close();
                        }

                        if (status == "I")
                        {
                            cmd.CommandText = string.Format(@"UPDATE names SET status='N' WHERE id={0} AND raceid={1}", id, m_raceID);
                            var update = cmd.ExecuteNonQuery();
                            if (update == 1)
                            {
                                FireLogMsg("LiveRes Message (ID: " + id + ") " + name + " set to DNS");
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setcompleted&completed=1&messid=" + messid);
                            }
                            else if (failedLast)
                            {
                                FireLogMsg("LiveRes Message (ID: " + id + ") " + name + " not possible to set to DNS");
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setdns&dns=0&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Kunne ikke oppdatere. Status:" + status + "&dbid=" + dbid);
                            }
                            else
                                failedThis = true;
                        }
                        else if (failedLast)
                        {
                            FireLogMsg("LiveRes Message (ID: " + id + ") " + name + " not posible to set to DNS. Status: " + status);
                            apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setdns&dns=0&messid=" + messid);
                            apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Kunne ikke oppdatere. Status:" + status + "&dbid=" + dbid);
                        }
                        else
                            failedThis = true;
                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("Bad network or config file? LiveRes Message DNS: " + ee.Message);
                    }
                }

                // Ecard change
                // *****************************
                JArray itemsEcard = (JArray)objects["ecardchange"];
                foreach (JObject element in itemsEcard)
                {
                    int dbidMessage = (element["dbid"]).ToObject<int>();
                    int messid = (element["messid"]).ToObject<int>();
                    int ecard = (element["ecard"]).ToObject<int>();
                    int bib = (element["bib"]).ToObject<int>();

                    try
                    {
                        IDbCommand cmd = m_connection.CreateCommand();
                        cmd.CommandText = string.Format(@"SELECT id, name, ecardno, status FROM names WHERE startnr={0} AND raceid={1}", bib, m_raceID);

                        string status = "", name = "";
                        int dbid = 0, ecardOld = 0, numBibs = 0;
                        bool bibOK = false, ecardOK = true, sameBibEcard = false, statusOK = false;

                        using (IDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                if (reader[0] != null && reader[0] != DBNull.Value)
                                {
                                    numBibs += 1;
                                    status = reader["status"] as string;
                                    statusOK = (status == "I");
                                    name = reader["name"] as string;
                                    dbid = Convert.ToInt32(reader["id"].ToString());
                                    if (reader["ecardno"] != null && reader["ecardno"] != DBNull.Value)
                                        ecardOld = Convert.ToInt32(reader["ecardno"].ToString());
                                }
                            }
                            reader.Close();
                            bibOK = (numBibs == 1 && statusOK);
                        }

                        if (bibOK)
                        {
                            int BrikkesysBib = 0;
                            cmd.CommandText = string.Format(@"SELECT startnr FROM names WHERE ecardno={0} AND raceid={1}", ecard, m_raceID);
                            using (IDataReader reader = cmd.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    if (reader[0] != null && reader[0] != DBNull.Value)
                                    {
                                        ecardOK = false; // ecard already inm use                              
                                        if (reader["startnr"] != null && reader["startnr"] != DBNull.Value)
                                            BrikkesysBib = Convert.ToInt32(reader["startnr"].ToString());
                                        sameBibEcard = (BrikkesysBib == bib);
                                    }
                                }
                                reader.Close();
                            }
                        }

                        if (bibOK && ecardOK)
                        {
                            cmd.CommandText = string.Format(@"UPDATE names SET ecardno={0} WHERE startnr={1} AND raceid={2}", ecard, bib, m_raceID);
                            var update = cmd.ExecuteNonQuery();
                            if (update == 1)
                            {
                                FireLogMsg("LiveRes Message: (bib: " + bib + ") " + name + " replaced ecard: " + ecardOld + " with: " + ecard);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setcompleted&completed=1&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&completed=1&comp=" + m_compID + "&message=Brikke: " + ecardOld +
                                    " byttet til " + ecard + "&dbid=" + dbid);
                            }
                            else if (failedLast)
                            {
                                FireLogMsg("LiveRes Message: (bib: " + bib + ") " + name + " not possible to change ecard " + ecard);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setecardchange&ecardchange=0&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Kunne ikke oppdatere brikke&dbid=" + dbidMessage);
                            }
                            else
                                failedThis = true;
                        }
                        else if (failedLast) // !bibOK || !ecardOK
                        {
                            FireLogMsg("LiveRes Message: (bib: " + bib + ") " + name + " not possible to change ecard " + ecard);
                            apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setecardchange&ecardchange=0&messid=" + messid);
                            if (sameBibEcard)           // Same bib and ecard existing
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&completed=1&comp=" + m_compID + "&message=Startnummer og brikke var allerede koblet&dbid=" + dbidMessage);
                            else if (!statusOK)         // Wrong status
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Brikkenr ikke oppdatert! Løpers status forskjellig fra Påmeldt&dbid=" + dbidMessage);
                            else if (bibOK && !ecardOK) // ecard used by another
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Brikkenr ikke oppdatert! Brikke allerede i bruk av annen løper?&dbid=" + dbidMessage);
                            else                        // !bibOK && ecardOK
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Brikkenr ikke oppdatert! Feil startnummer?&dbid=" + dbidMessage);
                        }
                        else
                            failedThis = true;
                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("Bad network or config file? LiveRes Message ecard: " + ee.Message);
                    }
                }
            }
        }

        private void FireOnResult(Result newResult)
        {
            if (OnResult != null)
            {
                OnResult(newResult);
            }
        }
        private void FireLogMsg(string msg)
        {
            if (OnLogMessage != null)
                OnLogMessage(msg);
        }
        private void FireOnDeleteID(int runnerID)
        {
            if (OnDeleteID != null)
                OnDeleteID(runnerID);
        }
        private void FireOnDeleteUnusedID(List<int> usedIds, bool first = false)
        {
            if (OnDeleteUnusedID != null)
                OnDeleteUnusedID(usedIds, first);
        }

        public void Start()
        {
            m_continue = true;
            if (m_monitorThread == null || !m_monitorThread.IsAlive)
            {
                m_monitorThread = new Thread(Run);
                m_monitorThread.Start();
            }
        }

        public void Stop()
        {
            m_continue = false;
        }
    }
}
