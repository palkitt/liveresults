﻿using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Threading;
using LiveResults.Client.Model;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Xml;
using System.Net;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using System.Windows.Forms;
using LiveResults.Model;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Microsoft.CSharp;
using Org.BouncyCastle.Asn1.Crmf;
using System.Collections;
using System.Net.Sockets;
using System.Linq.Expressions;
using static System.Windows.Forms.VisualStyles.VisualStyleElement;
using Ubiety.Dns.Core.Records;

namespace LiveResults.Client
{

    public class ETimingParser : IExternalSystemResultParserEtiming
    {
        private readonly IDbConnection m_connection;
        public event ResultDelegate OnResult;
        public event LogMessageDelegate OnLogMessage;
        public event DeleteIDDelegate OnDeleteID;
        public event DeleteUnusedIDDelegate OnDeleteUnusedID;
        public event RadioControlDelegate OnRadioControl;
        public event MergeRadioControlsDelegate OnMergeRadioControls;
        public event MergeCourseControlsDelegate OnMergeCourseControls;
        public event MergeCourseNamesDelegate OnMergeCourseNames;
        public event MergeVacantsDelegate OnMergeVacants;
        public event DeleteVacantIDDelegate OnDeleteVacantID;
        private readonly bool m_updateEcardTimes;
        private readonly bool m_updateRadioControls;
        private readonly int m_sleepTime;
        private readonly double m_minPaceTime;
        private readonly bool m_lapTimes;
        private readonly bool m_MSSQL;
        private readonly bool m_ecardAsBackup;
        private readonly bool m_EventorID;
        private readonly int m_IdOffset;
        private readonly bool m_updateMessage;
        private readonly int m_compID;
        private readonly int m_OsOffset;
        private bool m_continue;

        public ETimingParser(IDbConnection conn, int sleepTime, bool UpdateRadioControls = true, double minPaceTime = 0,
            bool MSSQL = false, bool ecardAsBackup = false, bool lapTimes = false, bool EventorID = false, int IdOffset = 0,
            bool updateMessage = false, bool addEcardSplits = false, int compID = 0, int OsOffset = 0)
        {
            m_connection = conn;
            m_updateRadioControls = UpdateRadioControls;
            m_sleepTime = sleepTime;
            m_minPaceTime = minPaceTime;
            m_MSSQL = MSSQL;
            m_ecardAsBackup = ecardAsBackup;
            m_lapTimes = lapTimes;
            m_EventorID = EventorID;
            m_IdOffset = IdOffset;
            m_updateMessage = updateMessage;
            m_updateEcardTimes = addEcardSplits;
            m_compID = compID;
            m_OsOffset = OsOffset;
        }

        private void FireOnResult(Result newResult)
        {
            OnResult?.Invoke(newResult);
        }
        private void FireLogMsg(string msg)
        {
            OnLogMessage?.Invoke(msg);
        }
        private void FireOnDeleteID(int runnerID)
        {
            OnDeleteID?.Invoke(runnerID);
        }
        private void FireOnDeleteVacantID(int runnerID)
        {
            OnDeleteVacantID?.Invoke(runnerID);
        }
        private void FireOnDeleteUnusedID(List<int> usedIds, bool first = false)
        {
            OnDeleteUnusedID?.Invoke(usedIds, first);
        }

        Thread m_monitorThread;

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

        public struct SplitRawStruct
        {
            public int controlCode;
            public int station;
            public int passTime;
            public int netTime;
            public int changedTime;
        }

        public struct EcardTimesRawStruct
        {
            public int code;
            public int order;
            public int time;
        }

        public class RelayLegInfo
        {
            public string LegStatus;
            public int LegTime;
            public int TotalTime;
            public bool Restart;
        }

        private class RelayTeam
        {
            public string TeamStatus;
            public int StartTime;
            public int TotalTime;
            public int TeamBib;
            public Dictionary<int, RelayLegInfo> TeamMembers;
        }

        public struct ClassStruct
        {
            public int Cource;
            public string ClassName;
            public int NumLegs;
        };

        public struct RadioStruct
        {
            public int Code;
            public int Count;
            public string Description;
            public int RadioType;
            public string TimingPoint;
            public int Leg;
            public int Order;
            public int Distance;
        };

        private void Run()
        {
            while (m_continue)
            {
                try
                {
                    FireLogMsg("eTiming Monitor thread started");

                    if (m_connection.State != ConnectionState.Open)
                        m_connection.Open();

                    setEventType(out bool isRelay, out bool isSprint, out bool isSprintRelay, out int day);

                    string purmin = (isRelay ? "AND(C.purmin IS NULL OR C.purmin < 2)" : "");
                    IDbCommand cmdInd = m_connection.CreateCommand();
                    cmdInd.CommandText = string.Format(@"SELECT N.id, N.kid, N.startno, N.ename, N.name, N.times, N.intime, N.totaltime,
                            N.cource, N.place, N.status, N.cource, N.starttime, N.races, N.heat, N.ecard, N.ecard2, N.ecard3, N.ecard4,
                            T.name AS tname, C.class AS cclass, C.timingtype, C.freestart, 
                            C.firststart AS cfirststart, C.cheaseing, C.purmin, C.direct, Co.length 
                            FROM Name N, Class C, Team T, Cource Co 
                            WHERE N.class=C.code AND Co.code=N.cource AND T.code=N.team {0}", purmin);

                    string modulus = (m_MSSQL ? "%" : "MOD");
                    IDbCommand cmdRelay = m_connection.CreateCommand();
                    cmdRelay.CommandText = string.Format(@"SELECT N.id, N.kid, N.startno, N.ename, N.name, N.times, N.intime,
                            N.cource, N.place, N.status, N.cource, N.starttime, N.races, N.ecard, N.ecard2, N.ecard3, N.ecard4,
                            T.name AS tname, C.class AS cclass, C.timingtype, C.freestart,  
                            C.firststart AS cfirststart, C.purmin AS cpurmin, C.direct, Co.length,
                            R.lgstartno, R.teamno, R.lgclass, R.lgtotaltime, R.lglegno, R.lgstatus, R.lgteam  
                            FROM Name N, Class C, Team T, Relay R, Cource Co 
                            WHERE N.class=C.code AND T.code=R.lgteam AND N.rank=R.lgstartno AND Co.code=N.cource AND (N.startno {0} 100)<=C.purmin 
                            ORDER BY N.startno", modulus);

                    IDbCommand cmdSplits = m_connection.CreateCommand();
                    cmdSplits.CommandText = string.Format(@"SELECT mellomid, iplace, stasjon, mintime, nettotid, timechanged, mecard 
                            FROM mellom 
                            WHERE stasjon>=0 AND stasjon<250 AND mecard>0 AND day={0}
                            ORDER BY mintime", day);

                    IDbCommand cmdEcardTimes = m_connection.CreateCommand();
                    cmdEcardTimes.CommandText = string.Format(@"SELECT times, control, ecardno, nr FROM ecard ORDER BY ecardno, times");

                    Dictionary<int, List<EcardTimesRawStruct>> ecardTimesList = null;
                    Dictionary<int, List<SplitRawStruct>> splitList = null;
                    Dictionary<int, List<CourseControl>> courses = null;
                    List<int> unknownRunners = new List<int>();
                    List<int> usedID = new List<int>();
                    List<RadioControl> intermediates = new List<RadioControl>();
                    string lastRunner = "No runners parsed yet";

                    string messageServer = ConfigurationManager.AppSettings["messageServer"];
                    string apiServer = ConfigurationManager.AppSettings["apiServer"];
                    WebClient client = new WebClient();
                    client.Encoding = System.Text.Encoding.UTF8;
                    ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; //TLS 1.2

                    int maxCCTimer = 60;      // Time between reading courses and controls
                    int CCTimer = maxCCTimer;
                    int maxMessageTimer = 9;  // Time between reading messages
                    int messageTimer = maxMessageTimer;
                    int maxActiveTimer = 60;  // Time between setting new live active signal
                    int activeTimer = maxActiveTimer;

                    bool failedLast = false;
                    bool first = true;

                    //  Main loop 
                    while (m_continue)
                    {
                        try
                        {
                            CCTimer += m_sleepTime;
                            if (CCTimer >= maxCCTimer)
                            {
                                setCourses(out courses);
                                setCourseNames();
                                setRadioControls(isRelay, isSprint, day, courses, out intermediates);
                                CCTimer = 0;
                            }

                            if (m_updateEcardTimes || m_ecardAsBackup)
                                ParseReaderEcardTimes(cmdEcardTimes, out ecardTimesList, out lastRunner);
                            ParseReaderSplits(cmdSplits, out splitList, out lastRunner);
                            ParseReader(cmdInd, ref splitList, ref ecardTimesList, ref courses, ref intermediates, false, isSprint, false, day, new List<int>(), out lastRunner, out usedID);
                            if (isRelay)
                                ParseReader(cmdRelay, ref splitList, ref ecardTimesList, ref courses, ref intermediates, true, false, isSprintRelay, day, usedID, out lastRunner, out usedID);
                            lastRunner = "Finished parsing runners";

                            handleUnknowns(splitList, ref unknownRunners);

                            messageTimer += m_sleepTime;
                            if (m_updateMessage && messageTimer >= maxMessageTimer)
                            {
                                setVacants();
                                UpdateFromMessages(messageServer, client, failedLast, out bool failedThis);
                                failedLast = failedThis;
                                messageTimer = 0;
                            }

                            if (m_IdOffset == 0 && !isSprint) //  Delete only when no offset is used and not sprint
                                FireOnDeleteUnusedID(usedID, first);
                            first = false;

                            activeTimer += m_sleepTime;
                            if (activeTimer >= maxActiveTimer)
                            {
                                SendLiveActive(apiServer, client);
                                activeTimer = 0;
                            }

                            Thread.Sleep(1000 * m_sleepTime);
                        }
                        catch (Exception ee)
                        {
                            FireLogMsg("eTiming Parser: " + ee.Message + " {parsing: " + lastRunner);
                            Thread.Sleep(1000);
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
                    FireLogMsg("eTiming Parser: " + ee.Message);
                }
                finally
                {
                    m_connection?.Close();
                    FireLogMsg("eTiming Monitor thread stopped");
                }
            }
        }

        private void setEventType(out bool isRelay, out bool isSprint, out bool isSprintRelay, out int day)
        {
            isRelay = false;
            isSprint = false;
            isSprintRelay = false;
            day = 1;

            IDbCommand cmd = m_connection.CreateCommand();
            cmd.CommandText = "SELECT kid, sub, boloffset FROM arr";
            using (IDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    if (reader[0] != null && reader[0] != DBNull.Value)
                    {
                        if (reader["boloffset"] != null && reader["boloffset"] != DBNull.Value)
                            isSprintRelay = Convert.ToBoolean(reader["boloffset"].ToString());
                        string eventType;
                        int kid = Convert.ToInt16(reader["kid"]);
                        if (kid == 2)
                        {
                            isSprint = true;
                            eventType = " (Sprint)";
                        }
                        else if (kid == 3 || kid == 6)
                        {
                            isRelay = true;
                            if (isSprintRelay)
                                eventType = " (Sprintrelay)";
                            else
                                eventType = " (Relay)";
                        }
                        else
                            eventType = " (Individual)";
                        FireLogMsg("Event type: " + kid + eventType);
                        day = Convert.ToInt16(reader["sub"]);
                    }
                }
                reader.Close();
            }
        }

        private void setCourses(out Dictionary<int, List<CourseControl>> courses)
        {
            courses = new Dictionary<int, List<CourseControl>>();
            try
            {
                var dlgMergeCourseControls = OnMergeCourseControls;
                if (dlgMergeCourseControls != null) // Read courses
                {
                    List<CourseControl> courseControls = new List<CourseControl>();
                    Dictionary<int, int> radioCnt = new Dictionary<int, int>();
                    if (m_updateEcardTimes || m_ecardAsBackup)
                    {
                        int lastCourse = -1;
                        IDbCommand cmd = m_connection.CreateCommand();
                        cmd.CommandText = string.Format(@"SELECT courceno, controlno, code, posttype, dist FROM controls ORDER BY courceno, controlno");
                        using (IDataReader reader = cmd.ExecuteReader())
                        {
                            int accDist = 0;
                            while (reader.Read())
                            {
                                int courseno = 0, order = 0, code = 0, radiocode = 0, posttype = 0, dist = 0;
                                if (reader["posttype"] != null && reader["posttype"] != DBNull.Value)
                                    posttype = Convert.ToInt32(reader["posttype"].ToString());
                                if (posttype == 1)
                                    continue;
                                if (reader["courceno"] != null && reader["courceno"] != DBNull.Value)
                                    courseno = Convert.ToInt32(reader["courceno"].ToString());
                                if (reader["controlno"] != null && reader["controlno"] != DBNull.Value)
                                    order = Convert.ToInt32(reader["controlno"].ToString());
                                if (reader["code"] != null && reader["code"] != DBNull.Value)
                                    code = Convert.ToInt32(reader["code"].ToString());
                                if (reader["dist"] != null && reader["dist"] != DBNull.Value)
                                    dist = Convert.ToInt32(reader["dist"].ToString());

                                if (courseno != lastCourse)
                                {
                                    radioCnt.Clear();
                                    accDist = dist;
                                }
                                else
                                    accDist += dist;
                                lastCourse = courseno;

                                if (!radioCnt.ContainsKey(code))
                                    radioCnt.Add(code, 0);
                                radioCnt[code]++;
                                radiocode = code + radioCnt[code] * 1000;

                                var control = new CourseControl
                                {
                                    CourseNo = courseno,
                                    Code = code,
                                    RadioCode = radiocode,
                                    Order = order,
                                    AccDist = accDist
                                };
                                courseControls.Add(control);
                                if (!courses.ContainsKey(courseno))
                                    courses.Add(courseno, new List<CourseControl>());
                                courses[courseno].Add(control);
                            }
                            reader.Close();
                        }
                    }
                    if (m_updateEcardTimes)
                    {
                        CourseControl[] courseControlArray = courseControls.ToArray();
                        bool deleteUnused = (m_IdOffset == 0); // Delete unused courses only if ID offset = 0
                        dlgMergeCourseControls(courseControlArray, deleteUnused);
                    }
                }
            }
            catch (Exception ee)
            {
                FireLogMsg("eTiming parser setCourses: " + ee.Message);
            }
        }

        private void setCourseNames()
        {
            try
            {
                var dlgMergeCourseNames = OnMergeCourseNames;
                if (dlgMergeCourseNames != null) // Read course names
                {
                    List<CourseName> courseNames = new List<CourseName>();
                    if (m_updateEcardTimes)
                    {
                        IDbCommand cmd = m_connection.CreateCommand();
                        cmd.CommandText = string.Format(@"SELECT code, name FROM cource ORDER BY code");
                        using (IDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                int courseNo = 0;
                                string courseName = "";
                                if (reader["code"] != null && reader["code"] != DBNull.Value)
                                    courseNo = Convert.ToInt32(reader["code"].ToString());
                                courseName = reader["name"] as string;
                                courseNames.Add(new CourseName()
                                {
                                    CourseNo = courseNo,
                                    Name = courseName
                                });
                            }
                            reader.Close();
                        }
                    }
                    CourseName[] courseNameArray = courseNames.ToArray();
                    bool deleteUnused = (m_IdOffset == 0); // Delete unused courses only if ID offset = 0
                    dlgMergeCourseNames(courseNameArray, deleteUnused);
                }
            }
            catch (Exception ee)
            {
                FireLogMsg("eTiming parser setCourseNames: " + ee.Message);
            }
        }

        // Update list of vacant runners
        private void setVacants()
        {
            try
            {
                var dlgMergeVacants = OnMergeVacants;
                if (dlgMergeVacants != null) // Read vacant runners
                {
                    List<VacantRunner> vacantRunner = new List<VacantRunner>();
                    IDbCommand cmd = m_connection.CreateCommand();
                    // Check if vacants are before or behind ordinary starters
                    // max(vacant) < min(ordinary) => all before, use last startno
                    // else after or inbetween => use first startno
                    // Change sign so that smallest startno is first
                    cmd.CommandText = @"
                        SELECT 
                            N.id, N.kid, N.class, C.class as classname,
                            IIF((SELECT MAX(N2.startno) FROM name N2 WHERE N2.class = N.class AND N2.status = 'V') <
                                (SELECT MIN(N2.startno) FROM name N2 WHERE N2.class = N.class AND N2.status <> 'V'),
                                -N.startno, N.startno) AS startno                      
                        FROM 
                            name N INNER JOIN class C ON N.class = C.code 
                        WHERE
                            N.status = 'V'";
                    using (IDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            int eTimeID = Convert.ToInt32(reader["id"].ToString());
                            int EventorID = 0;
                            bool parseOK = false;
                            if (reader["kid"] != null && reader["kid"] != DBNull.Value)
                                parseOK = Int32.TryParse(reader["kid"].ToString(), out EventorID);
                            string bibread = (reader["startno"].ToString()).Trim();
                            int bib = string.IsNullOrEmpty(bibread) ? 0 : Convert.ToInt32(bibread);
                            string classname = reader["classname"] as string;
                            string classid = reader["class"] as string;

                            int runnerID = 0;
                            if (m_EventorID)
                                runnerID = (EventorID > 0 ? EventorID : eTimeID + 1000000);
                            else
                                runnerID = eTimeID;
                            runnerID += m_IdOffset;

                            vacantRunner.Add(new VacantRunner()
                            {
                                dbid = runnerID,
                                bib = bib,
                                classid = classid,
                                classname = classname
                            });
                        }
                        reader.Close();
                    }
                    VacantRunner[] vacantRunnerArray = vacantRunner.ToArray();
                    bool deleteUnused = (m_IdOffset == 0); // Delete unused vacants only if ID offset = 0
                    dlgMergeVacants(vacantRunnerArray, deleteUnused);
                }
            }
            catch (Exception ee)
            {
                FireLogMsg("eTiming parser setVacants: " + ee.Message);
            }
        }

        private void setRadioControls(bool isRelay, bool isSprint, int day, Dictionary<int, List<CourseControl>> courses, out List<RadioControl> intermediates)
        {
            /* ************************************************
            *  Ordinary controls      =  code + 1000*N
            *  Pass/leg time          =  code + 1000*N + 100000
            *  Exchange time          =  0
            *  Leg time               =  999
            *  Unranked fin. time     = -999
            *  Unranked ord. controls = -(code + 1000*N)
            * 
            *  N = number of occurrence
            ***************************************************/

            intermediates = new List<RadioControl>();
            try
            {
                List<RadioControl> extraTimes = new List<RadioControl>();
                IDbCommand cmd = m_connection.CreateCommand();
                cmd.CommandText = string.Format(@"SELECT code, radiocourceno, radiotype, timingpointtype, description, etappe, radiorundenr, live, radiodist 
                                        FROM radiopost WHERE radioday={0} ORDER BY etappe, radiorundenr", day);
                var RadioPosts = new Dictionary<int, List<RadioStruct>>();
                using (IDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        int course = 0, code = 0, radioCode = 0, radiotype = -1, leg = 0, order = 0, distance = 0, count = 0;
                        bool live = false;
                        if (reader["live"] != null && reader["live"] != DBNull.Value)
                            live = Convert.ToBoolean(reader["live"].ToString());
                        if (!live) continue;

                        string timingpoint = reader["timingpointtype"] as string;
                        if (!string.IsNullOrEmpty(timingpoint))
                        {
                            timingpoint = timingpoint.Trim();
                            if (timingpoint != "IM" && timingpoint != "VK")
                                continue;
                        }
                        else
                            continue;

                        if (reader["code"] != null && reader["code"] != DBNull.Value)
                            radioCode = Convert.ToInt32(reader["code"].ToString());

                        // Take away last to digits if code 1000+ and convert radioCode to LiveRes standard
                        if (radioCode > 1000)
                        {
                            code = radioCode / 100;
                            count = radioCode % 100; // Last two digits of code is the counter
                            radioCode = code + 1000 * count;
                        }
                        else
                        {
                            code = radioCode;
                            count = 1;
                        }

                        if (reader["radiocourceno"] != null && reader["radiocourceno"] != DBNull.Value)
                            course = Convert.ToInt32(reader["radiocourceno"].ToString());

                        // Radiotype: 2 = finish/finish-passing; 4 = normal; 10 = exchange
                        if (reader["radiotype"] != null && reader["radiotype"] != DBNull.Value)
                            radiotype = Convert.ToInt32(reader["radiotype"].ToString());

                        if (reader["etappe"] != null && reader["etappe"] != DBNull.Value)
                            leg = Convert.ToInt32(reader["etappe"].ToString());

                        if (reader["radiorundenr"] != null && reader["radiorundenr"] != DBNull.Value)
                            order = Convert.ToInt32(reader["radiorundenr"].ToString());

                        string description = reader["description"] as string;
                        if (!string.IsNullOrEmpty(description))
                            description = description.Trim();

                        if (reader["radiodist"] != null && reader["radiodist"] != DBNull.Value)
                            distance = Convert.ToInt32(reader["radiodist"].ToString());

                        // If description string contains "{dist}" then try to find and insert distance from course controls
                        // If description string contains "{no}" then try to find and insert control number from course controls
                        if ((description.Contains("{dist}") || description.Contains("{no}")) && courses.ContainsKey(course))
                        {
                            foreach (var control in courses[course])
                            {
                                if (control.RadioCode == radioCode)
                                {
                                    if (description.Contains("{dist}") && control.AccDist > 0)
                                    {
                                        if (distance == 0)
                                            distance = control.AccDist;
                                        double distanceInKilometers = Math.Round(control.AccDist / 100.0) / 10.0;
                                        string distanceString = distanceInKilometers.ToString("0.0") + "km";
                                        distanceString = distanceString.Replace(".", ",");
                                        description = description.Replace("{dist}", distanceString);
                                    }
                                    if (description.Contains("{no}"))
                                        description = description.Replace("{no}", "#" + control.Order.ToString());
                                    break;
                                }
                            }
                        }

                        var radioControl = new RadioStruct
                        {
                            Code = code,
                            Count = count,
                            Description = description,
                            RadioType = radiotype,
                            TimingPoint = timingpoint,
                            Order = order,
                            Leg = leg,
                            Distance = distance
                        };

                        if (!RadioPosts.ContainsKey(course))
                            RadioPosts.Add(course, new List<RadioStruct>());
                        RadioPosts[course].Add(radioControl);
                    }
                    reader.Close();
                }

                // Class table
                cmd.CommandText = @"SELECT code, cource, class, purmin, timingtype, cheaseing FROM class";
                using (IDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        int course = 0, numLegs = 0, timingType = 0, sign = 1;
                        bool chaseStart = Convert.ToBoolean(reader["cheaseing"].ToString());

                        string classCode = reader["code"] as string;
                        if (!string.IsNullOrEmpty(classCode))
                            classCode = classCode.Trim();
                        else
                            continue;

                        string className = reader["class"] as string;
                        if (!string.IsNullOrEmpty(className))
                            className = className.Trim();
                        if (className == "NOCLAS") continue; // Skip if NOCLAS

                        if (reader["cource"] != null && reader["cource"] != DBNull.Value)
                            course = Convert.ToInt32(reader["cource"].ToString());

                        if (isRelay && reader["purmin"] != null && reader["purmin"] != DBNull.Value)
                            numLegs = Convert.ToInt32(reader["purmin"].ToString());

                        if (reader["timingtype"] != null && reader["timingtype"] != DBNull.Value)
                            timingType = Convert.ToInt32(reader["timingtype"].ToString());

                        if (timingType == 1 || timingType == 2) // 0 = normal, 1 = not ranked, 2 = not show times
                            sign = -1; // Use negative sign for these timing types
                        if (timingType == 1) // Add neg finish passing for not-ranked class
                            extraTimes.Add(new RadioControl
                            {
                                ClassName = className,
                                ControlName = "Tid",
                                Code = -999,
                                Order = 999
                            });

                        // Add starttime and leg times for chase start
                        if (chaseStart)
                        {
                            extraTimes.Add(new RadioControl
                            {
                                ClassName = className,
                                ControlName = "Start",
                                Code = 0,
                                Order = 0
                            });

                            extraTimes.Add(new RadioControl
                            {
                                ClassName = className,
                                ControlName = "Leg",
                                Code = 999,
                                Order = 999
                            });
                        }

                        // Add lap time for last lap
                        if (m_lapTimes && !isRelay)
                            extraTimes.Add(new RadioControl
                            {
                                ClassName = className,
                                ControlName = "Leg",
                                Code = 999,
                                Order = 999
                            });

                        // Add exchange and leg times for legs 2 and up
                        for (int i = 2; i <= numLegs; i++)
                        {
                            string classN = className;
                            if (!classN.EndsWith("-"))
                                classN += "-";
                            classN += Convert.ToString(i);

                            extraTimes.Add(new RadioControl
                            {
                                ClassName = classN,
                                ControlName = "Exchange",
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

                        if (RadioPosts.ContainsKey(course))
                        {   // Add radio controls to course
                            foreach (var radioControl in RadioPosts[course])
                            {
                                if (radioControl.TimingPoint == "ST") // Skip if radiocontrol is start
                                    continue;
                                int Code = radioControl.Code;
                                if (numLegs == 0 && (Code == 999 || Code == 0))
                                    continue;       // Skip if not relay and finish or start code

                                string classN = className;
                                if (isSprint)
                                    classN += " | Prolog";

                                int nStep = 1;      // Multiplicator used in relay order  
                                if (numLegs > 0 || chaseStart || (m_lapTimes && !isRelay)) // Make ready for pass times
                                    nStep = 2;

                                if (numLegs > 0)    // Relay
                                {
                                    if (!classN.EndsWith("-"))
                                        classN += "-";
                                    classN += Convert.ToString(radioControl.Leg);
                                }

                                if (Code < 999 && Code != 90 && radioControl.TimingPoint != "VK") // Not 90, not 999 and not exchange)
                                {
                                    // Add codes for ordinary classes 
                                    // sign = -1 for unranked classes
                                    intermediates.Add(new RadioControl
                                    {
                                        ClassName = classN,
                                        ControlName = radioControl.Description,
                                        Code = sign * (Code + radioControl.Count * 1000),
                                        Order = nStep * radioControl.Order,
                                        Distance = radioControl.Distance
                                    });

                                    // Add leg passing time for relay, chase start and lap times
                                    if (((numLegs > 0) && (radioControl.Leg > 1)) || chaseStart || (m_lapTimes && !isRelay))
                                    {
                                        intermediates.Add(new RadioControl
                                        {
                                            ClassName = classN,
                                            ControlName = radioControl.Description + "PassTime",
                                            Code = sign* (Code + radioControl.Count * 1000 + 100000),
                                            Order = nStep * radioControl.Order - 1 // Sort this before "normal" intermediate time
                                        });
                                    }
                                }
                            }
                        }
                    }
                    reader.Close();
                }

                var dlgMergeRadio = OnMergeRadioControls;
                if (dlgMergeRadio != null)
                {
                    RadioControl[] radioControls;
                    if (m_updateRadioControls)
                    {
                        intermediates.AddRange(extraTimes);
                        radioControls = intermediates.ToArray();
                    }
                    else
                        radioControls = extraTimes.ToArray();
                    dlgMergeRadio(radioControls, m_updateRadioControls);
                }
            }
            catch (Exception ee)
            {
                FireLogMsg("eTiming parser setRadioControls: " + ee.Message);
            }
        }

        private void ParseReader(IDbCommand cmd, ref Dictionary<int, List<SplitRawStruct>> splitList, ref Dictionary<int, List<EcardTimesRawStruct>> ecardTimesList,
                                 ref Dictionary<int, List<CourseControl>> courses, ref List<RadioControl> intermediates,
                                 bool isRelay, bool isSprint, bool isSprintRelay, int day,
                                 List<int> usedIDin, out string lastRunner, out List<int> usedIDout)
        {
            lastRunner = "No runner parsed yet";
            usedIDout = usedIDin;

            Dictionary<int, RelayTeam> RelayTeams;
            RelayTeams = new Dictionary<int, RelayTeam>();

            using (IDataReader reader = cmd.ExecuteReader())
            {
                string namePre1 = "", namePre2 = "";
                while (reader.Read())
                {
                    int time = 0, runnerID = 0, eTimeID = 0, EventorID = 0, iStartTime = 0, iStartClass = 0, totalTime = 0, course = -1;
                    int bib = 0, teambib = 0, leg = 0, numlegs = 0, intime = -1, timingType = 0, sign = 1, heat = 0, stage = 0, sprintOffset = 0;
                    int length = 0, races = 0;
                    int ecard1 = 0, ecard2 = 0, ecard3 = 0, ecard4 = 0;
                    string famName = "", givName = "", club = "", classN = "", status = "", bibread = "", name = "";
                    bool chaseStart = false, freeStart = false, parseOK = false, useEcardTime = false;
                    string ecardTimeString = "";
                    var SplitTimes = new List<ResultStruct>();

                    try
                    {
                        // Check timing type, status and class before proceeding
                        if (reader["timingtype"] != null && reader["timingtype"] != DBNull.Value)
                            timingType = Convert.ToInt32(reader["timingtype"].ToString());
                        if (timingType == 3) // 0=normal; 1=not ranked; 2=not show times; 3=not show class 
                            continue;
                        if (timingType == 1 || timingType == 2)
                            sign = -1;

                        status = reader["status"] as string;
                        if ((status == "V") || (status == "C")) // Skip if free or not entered  
                            continue;

                        classN = reader["cclass"] as string;
                        if (!string.IsNullOrEmpty(classN))
                            classN = classN.Trim();
                        if (classN == "NOCLAS")  // Skip runner if in NOCLAS
                            continue;

                        eTimeID = Convert.ToInt32(reader["id"].ToString());
                        if (reader["kid"] != null && reader["kid"] != DBNull.Value)
                            parseOK = Int32.TryParse(reader["kid"].ToString(), out EventorID);
                        if (m_EventorID)
                            runnerID = (EventorID > 0 ? EventorID : eTimeID + 1000000);
                        else
                            runnerID = eTimeID;

                        if (reader["races"] != null && reader["races"] != DBNull.Value)
                            races = Convert.ToInt16(reader["races"]);

                        // Sprint class definition
                        if (isSprint)
                        {
                            if (reader["purmin"] != null && reader["purmin"] != DBNull.Value)
                            {
                                stage = Convert.ToInt32(reader["purmin"].ToString());
                                if (stage > 0 && reader["heat"] != null && reader["heat"] != DBNull.Value)
                                    heat = Convert.ToInt32(reader["heat"].ToString());
                            }
                            if (stage == 0) // Prolog
                                classN += " | Prolog";
                            else
                            {
                                if (heat == 0)
                                    continue;   // Skip runners not in heat when heats are ongoing
                                if (stage == 1)
                                {
                                    classN += " | Kvart " + heat;
                                    sprintOffset = 10000;
                                }
                                if (stage == 2)
                                {
                                    classN += " | Semi " + heat;
                                    sprintOffset = 20000;
                                }
                                if (stage >= 3)
                                {
                                    classN += " | Finale " + heat;
                                    sprintOffset = 30000;
                                }
                            }
                        }
                        runnerID += m_IdOffset + sprintOffset;
                        usedIDout.Add(runnerID);

                        // Continue with adding or updating runner
                        if ((m_updateEcardTimes || m_ecardAsBackup) && reader["cource"] != null && reader["cource"] != DBNull.Value)
                            course = Convert.ToInt32(reader["cource"].ToString());

                        if (reader["length"] != null && reader["length"] != DBNull.Value)
                            length = Convert.ToInt32(reader["length"].ToString());

                        club = (reader["tname"] as string);
                        if (!string.IsNullOrEmpty(club))
                            club = club.Trim();

                        famName = (reader["ename"] as string);
                        if (!string.IsNullOrEmpty(famName))
                            famName = famName.Trim();

                        givName = (reader["name"] as string);
                        if (!string.IsNullOrEmpty(famName))
                            givName = givName.Trim();

                        name = givName + " " + famName;
                        lastRunner = name;

                        bibread = (reader["startno"].ToString()).Trim();
                        bib = string.IsNullOrEmpty(bibread) ? 0 : Convert.ToInt32(bibread);

                        time = -2;
                        if (reader["times"] != null && reader["times"] != DBNull.Value)
                        {
                            int timeRead = GetRunTime((reader["times"].ToString()).Trim());
                            if (timeRead > 0)
                                time = timeRead;
                        }

                        if (isRelay)
                            chaseStart = false;
                        else
                            chaseStart = Convert.ToBoolean(reader["cheaseing"].ToString());

                        freeStart = Convert.ToBoolean(reader["freestart"].ToString());
                        useEcardTime = Convert.ToBoolean(reader["direct"].ToString());

                        iStartTime = -1;
                        if (freeStart)
                            iStartTime = -999;
                        else if (reader["starttime"] != null && reader["starttime"] != DBNull.Value)
                            iStartTime = ConvertFromDay2cs(Convert.ToDouble(reader["starttime"]));

                        if (reader["cfirststart"] != null && reader["cfirststart"] != DBNull.Value)
                            iStartClass = ConvertFromDay2cs(Convert.ToDouble(reader["cfirststart"]));

                        if (isRelay)
                            teambib = bib / 100; // Team bib no

                        int TeamTimePre = 0;
                        if (isRelay)
                        {   //RelayTeams
                            leg = bib % 100;   // Leg number

                            if (isSprintRelay & leg > 2) // Keep and use first two names in sprint reLay
                                name = namePre2;
                            namePre2 = namePre1;
                            namePre1 = name;

                            if (!RelayTeams.ContainsKey(teambib))
                            {
                                RelayTeams.Add(teambib, new RelayTeam());
                                RelayTeams[teambib].TeamMembers = new Dictionary<int, RelayLegInfo>();
                            }
                            RelayTeams[teambib].TeamBib = teambib;
                            if (leg == 1)
                                RelayTeams[teambib].StartTime = iStartTime;

                            if (!(RelayTeams[teambib].TeamMembers).ContainsKey(leg))
                                RelayTeams[teambib].TeamMembers.Add(leg, new RelayLegInfo());

                            if (!classN.EndsWith("-"))
                                classN += "-";
                            classN += Convert.ToString(leg);

                            if (reader["teamno"] != null && reader["teamno"] != DBNull.Value)
                                club += "-" + Convert.ToString(reader["teamno"]);

                            if (isRelay && reader["cpurmin"] != null && reader["cpurmin"] != DBNull.Value)
                                numlegs = Convert.ToInt16(reader["cpurmin"]);

                            if (reader["intime"] != null && reader["intime"] != DBNull.Value)
                                intime = ConvertFromDay2cs(Convert.ToDouble(reader["intime"]));

                            RelayTeams[teambib].TeamMembers[leg].Restart = (races > 0);

                            if (time > 0)
                            {
                                RelayTeams[teambib].TeamMembers[leg].LegTime = time;
                                if (leg >= 2) // Add leg time for relay runners at leg 2 and above
                                {
                                    var LegTime = new ResultStruct
                                    {
                                        ControlCode = 999,
                                        Time = time
                                    };
                                    SplitTimes.Add(LegTime);
                                }
                            }
                            RelayTeams[teambib].TeamMembers[leg].LegStatus = status;

                            int TeamTime = 0;
                            RelayTeams[teambib].TotalTime = -2;
                            RelayTeams[teambib].TeamMembers[leg].TotalTime = 0;
                            string TeamStatus = "I";
                            bool TeamOK = true;
                            for (int legs = 1; legs <= leg; legs++)
                            {
                                if (!(RelayTeams[teambib].TeamMembers).ContainsKey(legs))
                                {
                                    if (legs == leg - 1)
                                        FireLogMsg("eTiming Parser. Error with runner. Check team: " + teambib + ", leg: " + legs);
                                    continue;
                                }
                                if (RelayTeams[teambib].TeamMembers[legs].LegTime > 0)
                                {
                                    // Add 100 hours to indicate restart
                                    TeamTime += RelayTeams[teambib].TeamMembers[legs].LegTime
                                             + (RelayTeams[teambib].TeamMembers[legs].Restart ? 100 * 3600 * 100 : 0);
                                    RelayTeams[teambib].TeamMembers[legs].TotalTime = TeamTime;
                                }

                                // Accumulated status
                                if (TeamOK && (RelayTeams[teambib].TeamMembers[legs].LegStatus == "A"))
                                {
                                    TeamOK = true;
                                    TeamStatus = "A";
                                }
                                else
                                    TeamOK = false;

                                if (legs == numlegs && TeamOK)
                                {
                                    TeamStatus = "A";
                                    status = "A";
                                    RelayTeams[teambib].TotalTime = TeamTime;
                                    continue;
                                }

                                switch (RelayTeams[teambib].TeamMembers[legs].LegStatus)
                                {
                                    case "D":
                                        TeamStatus = "D";
                                        status = "D";
                                        break;
                                    case "B":
                                        TeamStatus = "B";
                                        status = "B";
                                        break;
                                    case "N":
                                        if (legs == 1)
                                            TeamStatus = "N";
                                        else if (!(TeamStatus == "N"))
                                            TeamStatus = "B";
                                        break;
                                }
                            }
                            RelayTeams[teambib].TeamStatus = TeamStatus;

                            if (intime > 0)
                                time = Math.Max(intime - RelayTeams[teambib].StartTime, TeamTime);

                            if (leg > 1 && (RelayTeams[teambib].TeamMembers).ContainsKey(leg - 1)
                                && RelayTeams[teambib].TeamMembers[leg - 1].TotalTime > 0)
                            {
                                TeamTimePre = RelayTeams[teambib].TeamMembers[leg - 1].TotalTime +
                                 (RelayTeams[teambib].TeamMembers[leg].Restart ? 100 * 3600 * 100 : 0);
                                var ExchangeTime = new ResultStruct
                                {
                                    ControlCode = 0,  // Note code 0 for change-over!
                                    Time = TeamTimePre
                                };
                                SplitTimes.Add(ExchangeTime);
                            }
                        }

                        if (chaseStart)
                        {
                            if (reader["totaltime"] != null && reader["totaltime"] != DBNull.Value)
                                totalTime = ConvertFromDay2cs(Convert.ToDouble(reader["totaltime"]));
                            else
                                totalTime = Math.Max(0, iStartTime - iStartClass);

                            // Set starttime split to get starting order based on total time
                            var totalTimeStart = new ResultStruct
                            {
                                ControlCode = 0,  // Note code 0 for change-over!
                                Time = totalTime
                            };
                            SplitTimes.Add(totalTimeStart);

                            // Add time as leg time and add totalTime to time for finished runners
                            if (time > 0)
                            {
                                var LegTime = new ResultStruct
                                {
                                    ControlCode = 999,
                                    Time = time
                                };
                                SplitTimes.Add(LegTime);
                                time += totalTime;
                            }
                            // Set status for runners without total time to not classified NC
                            if ((day - races) > 1 && (status == "S" || status == "I" || status == "A"))
                                status = "NC";
                        }

                        // Add split times
                        if (reader["ecard"] != null && reader["ecard"] != DBNull.Value)
                            ecard1 = Convert.ToInt32(reader["ecard"].ToString());
                        if (reader["ecard2"] != null && reader["ecard2"] != DBNull.Value)
                            ecard2 = Convert.ToInt32(reader["ecard2"].ToString());
                        if (reader["ecard3"] != null && reader["ecard3"] != DBNull.Value)
                            ecard3 = Convert.ToInt32(reader["ecard3"].ToString());
                        if (reader["ecard4"] != null && reader["ecard4"] != DBNull.Value)
                            ecard4 = Convert.ToInt32(reader["ecard4"].ToString());

                        var splits = new List<SplitRawStruct>();
                        var numStart = 0;  // Number of ecards with 0 (start) registered
                        var ecardList = new List<int> { ecard1, ecard2, ecard3, ecard4 };
                        foreach (int ecard in ecardList)
                        {
                            if (splitList.ContainsKey(ecard))
                            {
                                if (splitList[ecard].Any(s => s.controlCode == 0))
                                    numStart += 1;
                                splits.AddRange(splitList[ecard]);
                                splitList.Remove(ecard);
                            }
                        }
                        splits = splits.OrderBy(s => s.passTime).ToList();

                        var lsplitCodes = new List<int>();
                        int calcStartTime = -2;
                        int iSplitcode = 0;
                        int lastSplitTime = -1;
                        int lastSplitCode = -999;
                        int passTime = -2;
                        foreach (var split in splits)
                        {
                            if (split.controlCode == 0) // Registering at start
                            {
                                if (status == "I" || status == "N") // Change code of entered and not started (by mistake) runners
                                    status = "S";
                                if (freeStart || useEcardTime)
                                {
                                    if (m_OsOffset > 0) // Set starttime rounded to whole minutes including offset minutes
                                        calcStartTime = (split.passTime / 6000 + m_OsOffset) * 6000;
                                    else
                                        calcStartTime = split.passTime;
                                }
                                continue;
                            }
                            int splitPassTime = split.passTime;
                            if (splitPassTime - iStartTime < -86400 * 100 * 0.5) // Passing midnight
                                splitPassTime += 86400 * 100;

                            if (splitPassTime < iStartTime || (splitPassTime - lastSplitTime < 3000 && split.controlCode == lastSplitCode))
                                continue;         // Neglect passing before starttime, passing less than 30 s from last when the same splitCode
                            if (m_lapTimes && !isRelay && split.controlCode < 0)
                                continue;         // Do not accept negative control codes in cases where lap times are to be calculated

                            passTime = -2;        // Total time at passing
                            int passLegTime = -2; // Time used on leg at passing
                            if (split.netTime > 0 && (time < 0 || split.netTime < time) && (freeStart || useEcardTime))
                                passTime = split.netTime;
                            else if (isRelay)
                            {
                                passLegTime = splitPassTime - Math.Max(iStartTime, iStartClass); // In case ind. start time not set
                                passTime = passLegTime + Math.Max(TeamTimePre, iStartTime - iStartClass); // Absolute pass time
                            }
                            else if (chaseStart)
                            {
                                passLegTime = splitPassTime - iStartTime;
                                passTime = splitPassTime - iStartTime + totalTime;
                            }
                            else if (!freeStart)
                                passTime = splitPassTime - iStartTime;

                            if (passTime < 1000 || (time > 0 && passTime > time))  // Neglect pass times less than 10 s from start and pass times longer than finish time
                                continue;

                            if (m_lapTimes && !isRelay) // Set lap time in for pass leg time
                            {
                                if (lastSplitTime < 0) // First pass
                                    passLegTime = passTime;
                                else
                                    passLegTime = splitPassTime - lastSplitTime;
                            }

                            // Add split code to list
                            lastSplitCode = split.controlCode;
                            if (time < 0 || passTime < time - 300) // Update only last split time when before finish with 3 sec margin
                                lastSplitTime = splitPassTime;

                            if (split.controlCode > 0)
                                iSplitcode = sign * (split.controlCode + 1000);
                            else
                                iSplitcode = sign * (split.station + 1000);

                            while (lsplitCodes.Contains(iSplitcode))
                                iSplitcode += sign * 1000;

                            // Skip radio passings where pacetime is less than minimum
                            int radioCode = iSplitcode + 10000 * leg;
                            var distance = intermediates.Where(item => item.ClassName == classN && item.Code == radioCode).Select(item => item.Distance).FirstOrDefault();
                            if (distance > 0)
                            {
                                var timeToRadio = ((m_lapTimes && !isRelay) || passLegTime < 0 ? passTime : passLegTime);
                                double paceToRadio = ((double)timeToRadio / 6000) / ((double)distance / 1000); // min/km
                                if (paceToRadio < m_minPaceTime)
                                    continue;
                            }

                            // All checks passed. Add split time to SplitTime struct
                            lsplitCodes.Add(iSplitcode);

                            if (timingType == 2) // Not show times
                                passTime = -10;
                            var SplitTime = new ResultStruct
                            {
                                ControlCode = iSplitcode,
                                Time = passTime
                            };
                            SplitTimes.Add(SplitTime);

                            if (passLegTime > 0 && (leg > 1 || chaseStart || m_lapTimes))
                            {
                                var passLegTimeStruct = new ResultStruct
                                {
                                    ControlCode = iSplitcode + sign * 100000,
                                    Time = passLegTime
                                };
                                SplitTimes.Add(passLegTimeStruct);
                            }

                            if (freeStart && calcStartTime < 0)
                                calcStartTime = split.changedTime - split.netTime - 500;
                        }

                        // Add lap time for last lap
                        if (time > 0 && m_lapTimes && !isRelay && lastSplitTime > 0)
                        {
                            var LegTime = new ResultStruct
                            {
                                ControlCode = 999,
                                Time = time - (lastSplitTime - iStartTime)
                            };
                            SplitTimes.Add(LegTime);
                        }

                        if (freeStart && (calcStartTime > 0) && (Math.Abs(calcStartTime - iStartTime) > 2000))  // Update starttime if deviation more than 20 sec
                            iStartTime = calcStartTime;

                        if (time > 0 && (timingType == 1 || timingType == 2)) // Not ranked or not show times
                        {
                            if (timingType == 2) // Do not show times
                                time = -10;
                            else // Not ranked
                            {
                                var FinishTime = new ResultStruct
                                {
                                    ControlCode = -999, // Code used for finish passing
                                    Time = time
                                };
                                SplitTimes.Add(FinishTime);
                            }

                            if (status == "A")
                            {
                                status = "F";    // Finished
                                time = runnerID; // Sets a "random", but unique time for each competitor
                            }
                        }

                        // Add ecard times
                        if ((m_ecardAsBackup || m_updateEcardTimes) && timingType != 2) // Skip if do not show times
                        {
                            var backupRadioTimes = new List<ResultStruct>();
                            var ecardTimes = new List<EcardTimesRawStruct>();
                            foreach (int ecard in ecardList)
                            {
                                if (ecardTimesList.ContainsKey(ecard))
                                    ecardTimes.AddRange(ecardTimesList[ecard]);
                            }
                            ecardTimes = ecardTimes.OrderBy(s => s.time).ToList();

                            int controlNo = 0, timeNo = 0, timeNoLast = -1, numControls = 0;
                            if (courses.ContainsKey(course))
                                numControls = courses[course].Count;

                            int lastMatchedTime = -1;
                            bool first = true;
                            while (controlNo < numControls)
                            {
                                int timeMatch = -1;
                                timeNo = timeNoLast + 1;
                                while (timeNo < ecardTimes.Count)
                                {
                                    if (ecardTimes.ElementAt(timeNo).code == courses[course].ElementAt(controlNo).Code)
                                    {
                                        timeNoLast = timeNo;
                                        break;
                                    }
                                    timeNo++;
                                }
                                if (timeNo < ecardTimes.Count) // control found
                                {
                                    timeMatch = ecardTimes.ElementAt(timeNo).time;
                                    lastMatchedTime = timeMatch * 100;
                                }
                                if (m_updateEcardTimes)
                                {
                                    if (first)
                                        first = false;
                                    else
                                        ecardTimeString += ",";
                                    ecardTimeString += timeMatch.ToString();
                                }

                                // Check if ecardTime should be used as backup for radio times                            
                                if (m_ecardAsBackup && timingType == 0 && !m_lapTimes)
                                {
                                    int radioCode = courses[course].ElementAt(controlNo).RadioCode + 10000 * leg;
                                    bool radioControlExist = intermediates.Any(item => item.ClassName == classN && item.Code == radioCode);
                                    bool radioTimeExist = SplitTimes.Any(item => item.ControlCode == radioCode);
                                    if (radioControlExist && !radioTimeExist && timeMatch > 0)
                                    {
                                        var distance = intermediates.Where(item => item.ClassName == classN &&
                                                            item.Code == radioCode).Select(item => item.Distance).FirstOrDefault();
                                        double paceToRadio = 999999;
                                        if (distance > 0)
                                            paceToRadio = ((double)timeMatch / 60) / ((double)distance / 1000); // min/km
                                        if (paceToRadio > m_minPaceTime)
                                        {
                                            int backupTime = timeMatch * 100;
                                            if (chaseStart)
                                                backupTime += totalTime;
                                            if (isRelay)
                                                backupTime += Math.Max(TeamTimePre, iStartTime - iStartClass);

                                            var radioBackup = new ResultStruct
                                            {
                                                ControlCode = radioCode,
                                                Time = backupTime
                                            };
                                            backupRadioTimes.Add(radioBackup);

                                            if (chaseStart || isRelay) // Leg time
                                            {
                                                var radioBackupLeg = new ResultStruct
                                                {
                                                    ControlCode = radioCode + 100000,
                                                    Time = timeMatch * 100
                                                };
                                                backupRadioTimes.Add(radioBackupLeg);
                                            }
                                        }
                                    }
                                }
                                controlNo++;
                            }

                            int timeToFinish = time - lastMatchedTime;
                            if (chaseStart)
                                timeToFinish -= totalTime;
                            if (isRelay)
                                timeToFinish -= Math.Max(TeamTimePre, iStartTime - iStartClass);
                            if (timeToFinish > 0 && timeToFinish < 5 * 60 * 100) // Last ecard control within 0-5 min from finish time
                            {
                                foreach (ResultStruct backupTime in backupRadioTimes)
                                    SplitTimes.Add(backupTime);
                            }
                        }

                        int rstatus = GetStatusFromCode(ref time, status);
                        if (rstatus != 999)
                        {
                            var res = new Result
                            {
                                ID = runnerID,
                                RunnerName = name,
                                RunnerClub = club,
                                Class = classN,
                                Course = course,
                                Length = length,
                                StartTime = iStartTime,
                                Time = time,
                                Status = rstatus,
                                Ecard1 = ecard1,
                                Ecard2 = ecard2,
                                Bib = (isRelay ? -bib : bib),
                                SplitTimes = SplitTimes,
                                EcardTimes = ecardTimeString
                            };
                            FireOnResult(res);
                        }
                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("eTiming Parser. Runner ID:" + runnerID + " Error: " + ee.Message);
                    }
                }
                reader.Close();
            }
        }
        private void handleUnknowns(Dictionary<int, List<SplitRawStruct>> splitList, ref List<int> unknownRunnersLast)
        {
            // Loop through the remaining entries in the splitList (those linked to runners are removed)
            List<int> unknownRunners = new List<int>();
            List<SplitRawStruct> splits;
            foreach (int ecard in splitList.Keys)
            {
                var split = new SplitRawStruct();
                splits = splitList[ecard];
                splits = splits.OrderByDescending(s => s.passTime).ToList();
                split = splits.Find(s => s.controlCode == 0); // Find last pass at start

                if (split.passTime > 0)
                {
                    unknownRunners.Add(ecard);
                    unknownRunnersLast.Remove(ecard);
                    var res = new Result
                    {
                        ID = -ecard,
                        RunnerName = ecard + " UKJENT",
                        RunnerClub = "NOTEAM",
                        Class = "NOCLAS",
                        StartTime = split.passTime,
                        Time = -3,
                        Status = 9
                    };
                    FireOnResult(res);
                }
            }
            foreach (int ecard in unknownRunnersLast) // Delete those that are still in last array
                FireOnDeleteID(-ecard);

            unknownRunnersLast = unknownRunners;  // Set back new list of unknown runners
        }

        private static int GetStatusFromCode(ref int time, string status)
        {
            int rstatus = 10; //  Default: Entered
            switch (status)
            {
                case "A": rstatus = 0; break; // OK
                case "N": rstatus = 1; time = -3; break; // DNS
                case "B": rstatus = 2; time = -3; break; // DNF
                case "D": rstatus = 3; time = -3; break; // DSQ / MP
                case "NC": rstatus = 6; time = -3; break; // Not classified
                case "S": rstatus = 9; time = -3; break; // Started
                case "I": rstatus = 10; time = -3; break; // Entered
                case "F": rstatus = 13; break; // Finished (Fullført). For not ranked classes
            }
            return rstatus;
        }

        private void ParseReaderSplits(IDbCommand cmd, out Dictionary<int, List<SplitRawStruct>> splitList, out string lastRunner)
        {
            splitList = new Dictionary<int, List<SplitRawStruct>>();
            lastRunner = "";
            using (IDataReader reader = cmd.ExecuteReader())
            {

                while (reader.Read())
                {
                    int ecard = 0, code = 0, station = 0, passTime = -2, netTime = -2, changedTime = 0;
                    try
                    {
                        if (reader["mecard"] != null && reader["mecard"] != DBNull.Value)
                        {
                            ecard = Convert.ToInt32(reader["mecard"].ToString());
                            lastRunner = "Ecard no:" + reader["mecard"].ToString();
                        }
                        else
                            continue;

                        if (reader["mintime"] != null && reader["mintime"] != DBNull.Value)
                            passTime = ConvertFromDay2cs(Convert.ToDouble(reader["mintime"]));

                        if (reader["nettotid"] != null && reader["nettotid"] != DBNull.Value)
                            netTime = ConvertFromDay2cs(Convert.ToDouble(reader["nettotid"]));

                        if (reader["timechanged"] != null && reader["timechanged"] != DBNull.Value)
                            changedTime = ConvertFromDay2cs(Convert.ToDouble(reader["timechanged"]));

                        if (reader["stasjon"] != null && reader["stasjon"] != DBNull.Value)
                            station = Convert.ToInt32(reader["stasjon"].ToString());
                        if (station == 0)
                        {
                            if (netTime > 0)
                                continue;
                            else
                                code = 0;
                        }
                        else
                        {
                            if (reader["iplace"] != null && reader["iplace"] != DBNull.Value)
                                code = Convert.ToInt32(reader["iplace"].ToString());
                            if (code < -999)
                                continue;
                            if (code > 1000)
                                code /= 100; // Take away last to digits if code 1000+
                        }

                        var res = new SplitRawStruct
                        {
                            controlCode = code,
                            station = station,
                            passTime = passTime,
                            netTime = netTime,
                            changedTime = changedTime
                        };

                        if (!splitList.ContainsKey(ecard))
                            splitList.Add(ecard, new List<SplitRawStruct>());
                        splitList[ecard].Add(res);

                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("eTiming Parser: " + ee.Message);
                    }
                }
                reader.Close();
            }
        }

        private void ParseReaderEcardTimes(IDbCommand cmd, out Dictionary<int, List<EcardTimesRawStruct>> ecardTimesList, out string lastRunner)
        {
            ecardTimesList = new Dictionary<int, List<EcardTimesRawStruct>>();
            lastRunner = "";
            using (IDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    //t(@"SELECT times, control, ecardno, nr FROM ecard ORDER BY ecardno, times");

                    int ecard = 0, code = 0, time = -1, order = 0;
                    try
                    {
                        if (reader["ecardno"] != null && reader["ecardno"] != DBNull.Value)
                        {
                            ecard = Convert.ToInt32(reader["ecardno"].ToString());
                            lastRunner = "Ecard no:" + reader["ecardno"].ToString();
                        }
                        else
                            continue;

                        if (reader["times"] != null && reader["times"] != DBNull.Value)
                            time = Convert.ToInt32(reader["times"].ToString());
                        if (reader["control"] != null && reader["control"] != DBNull.Value)
                            code = Convert.ToInt32(reader["control"].ToString());
                        if (reader["nr"] != null && reader["nr"] != DBNull.Value)
                            order = Convert.ToInt32(reader["nr"].ToString());

                        var res = new EcardTimesRawStruct
                        {
                            code = code,
                            time = time,
                            order = order
                        };

                        if (!ecardTimesList.ContainsKey(ecard))
                            ecardTimesList.Add(ecard, new List<EcardTimesRawStruct>());
                        ecardTimesList[ecard].Add(res);

                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("eTiming Parser: " + ee.Message);
                    }
                }
                reader.Close();
            }
        }

        private void UpdateFromMessages(string messageServer, WebClient client, bool failedLast, out bool failedThis)
        {
            failedThis = false;
            string apiResponse = "";
            // Get DNS, ecard changes and new entries
            try
            {
                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=getchanges&comp=" + m_compID);
            }
            catch (Exception ee)
            {
                FireLogMsg("Bad network or config file? eTiming Message error: " + ee.Message);
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
                    dbid -= m_IdOffset;
                    int kid = 0;
                    if (m_EventorID)
                    {
                        if (dbid > 1000000)
                            dbid -= 1000000;
                        else
                            kid = dbid;
                    }
                    try
                    {
                        IDbCommand cmd = m_connection.CreateCommand();

                        if (kid > 0) // use Eventor ID
                            cmd.CommandText = string.Format(@"SELECT id, ename, name, status FROM name WHERE kid='{0}'", kid);
                        else       // use eTiming ID
                            cmd.CommandText = string.Format(@"SELECT id, ename, name, status FROM name WHERE id={0}", dbid);

                        string status = "", givName = "", famName = "", name = "";
                        int eTimingID = 0;
                        using (IDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                if (reader[0] != null && reader[0] != DBNull.Value)
                                {
                                    status = reader["status"] as string;
                                    famName = reader["ename"] as string;
                                    givName = reader["name"] as string;

                                    if (reader["id"] != null && reader["id"] != DBNull.Value)
                                        eTimingID = Convert.ToInt32(reader["id"].ToString());
                                    if (!string.IsNullOrEmpty(famName))
                                        famName = famName.Trim();
                                    if (!string.IsNullOrEmpty(famName))
                                        givName = givName.Trim();
                                    name = givName + " " + famName;
                                }
                            }
                            reader.Close();
                        }

                        if (status == "I")
                        {
                            cmd.CommandText = string.Format(@"UPDATE name SET status='N' WHERE id = {0}", eTimingID);
                            var update = cmd.ExecuteNonQuery();
                            if (update == 1)
                            {
                                FireLogMsg("eTiming Message (ID: " + eTimingID + ") " + name + " set to DNS");
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setcompleted&completed=1&messid=" + messid);
                            }
                            else if (failedLast)
                            {
                                FireLogMsg("eTiming Message (ID: " + eTimingID + ") " + name + " not possible to set to DNS");
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setdns&dns=0&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Kunne ikke oppdatere. Status:" + status + "&dbid=" + dbid);
                            }
                            else
                                failedThis = true;
                        }
                        else if (failedLast)
                        {
                            FireLogMsg("eTiming Message (ID: " + eTimingID + ") " + name + " not posible to set to DNS. Status: " + status);
                            apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setdns&dns=0&messid=" + messid);
                            apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Kunne ikke oppdatere. Status:" + status + "&dbid=" + dbid);
                        }
                        else
                            failedThis = true;
                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("Bad network or config file? eTiming Message DNS: " + ee.Message);
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
                        cmd.CommandText = string.Format(@"SELECT id, kid, ename, name, ecard, ecard2, ecard3, ecard4, status FROM name WHERE startno={0}", bib);

                        string status = "", givName = "", famName = "", name = "";
                        int EventorID = 0, eTimingID = 0, dbid = 0, ecard1 = 0, ecard2 = 0, ecard3 = 0, ecard4 = 0, numBibs = 0;
                        bool parseOK = false, bibOK = false, ecardOK = true, sameBibEcard = false, statusOK = false;

                        using (IDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                if (reader[0] != null && reader[0] != DBNull.Value)
                                {
                                    numBibs += 1;
                                    status = reader["status"] as string;
                                    famName = reader["ename"] as string;
                                    givName = reader["name"] as string;
                                    if (reader["id"] != null && reader["id"] != DBNull.Value)
                                    {
                                        eTimingID = Convert.ToInt32(reader["id"].ToString());
                                        if (reader["kid"] != null && reader["kid"] != DBNull.Value)
                                            parseOK = Int32.TryParse(reader["kid"].ToString(), out EventorID);
                                        if (m_EventorID)
                                            dbid = (EventorID > 0 ? EventorID : eTimingID + 1000000);
                                        else
                                            dbid = eTimingID;
                                        dbid += m_IdOffset;
                                    }
                                    if (!string.IsNullOrEmpty(famName))
                                        famName = famName.Trim();
                                    if (!string.IsNullOrEmpty(famName))
                                        givName = givName.Trim();
                                    name = givName + " " + famName;

                                    if (reader["ecard"] != null && reader["ecard"] != DBNull.Value)
                                        ecard1 = Convert.ToInt32(reader["ecard"].ToString());
                                    if (reader["ecard2"] != null && reader["ecard2"] != DBNull.Value)
                                        ecard2 = Convert.ToInt32(reader["ecard2"].ToString());
                                    if (reader["ecard3"] != null && reader["ecard3"] != DBNull.Value)
                                        ecard3 = Convert.ToInt32(reader["ecard3"].ToString());
                                    if (reader["ecard4"] != null && reader["ecard4"] != DBNull.Value)
                                        ecard4 = Convert.ToInt32(reader["ecard4"].ToString());

                                    statusOK = (status == "I");
                                }
                            }
                            reader.Close();
                            bibOK = (numBibs == 1 && statusOK);
                        }

                        if (bibOK)
                        {
                            CheckEcard(ecard, bib, out ecardOK, out sameBibEcard, out int dbidUnknown);

                            if (dbidUnknown > 0)
                            {
                                cmd.CommandText = string.Format(@"UPDATE name SET ecard=NULL WHERE id={0}", dbidUnknown);
                                var update = cmd.ExecuteNonQuery();
                                if (update == 1)
                                    ecardOK = true;
                                else
                                    ecardOK = false;
                            }
                        }

                        if (bibOK && ecardOK)
                        {
                            bool emiTag = (ecard < 10000 || ecard > 1000000);
                            bool emiTag1 = (ecard1 < 10000 || ecard1 > 1000000);
                            bool emiTag2 = (ecard2 < 10000 || ecard2 > 1000000);
                            int ecardOld = 0;
                            int ecardToChange = 0;

                            // Use ecard1 place if ecard1 is of same type as new tag or empty and ecard2 is of different type or empty  
                            if (emiTag && (emiTag1 || ecard1 == 0) && (!emiTag2 || ecard2 == 0) ||
                               !emiTag && (!emiTag1 || ecard1 == 0) && (emiTag2 || ecard2 == 0))
                            {
                                ecardToChange = 1;
                                ecardOld = ecard1;
                            }
                            // Use ecard2 place if ecard2 is empty or is of same type as new tag
                            else if (ecard2 == 0 || emiTag && emiTag2 && (!emiTag1 || ecard1 == 0) || !emiTag && !emiTag2 && (emiTag1 || ecard1 == 0))
                            {
                                ecardToChange = 2;
                                ecardOld = ecard2;
                            }
                            // No empty place and both tag holders are of same type as new tag
                            else
                            {
                                ecardToChange = 3;
                                ecardOld = ecard3;
                            }

                            if (ecardToChange == 1)
                                cmd.CommandText = string.Format(@"UPDATE name SET ecard={0} WHERE startno={1}", ecard, bib);
                            else
                                cmd.CommandText = string.Format(@"UPDATE name SET ecard{2}={0} WHERE startno={1}", ecard, bib, ecardToChange);
                            var update = cmd.ExecuteNonQuery();
                            if (update == 1)
                            {
                                FireLogMsg("eTiming Message: (bib: " + bib + ") " + name + " replaced ecard " + ecardToChange + ": " + ecardOld + " with: " + ecard);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setcompleted&completed=1&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&completed=1&comp=" + m_compID +
                                   "&message=Brikke " + ecardToChange + ": " + ecardOld + " byttet til " + ecard + "&dbid=" + dbid);

                            }
                            else if (failedLast)
                            {
                                FireLogMsg("eTiming Message: (bib: " + bib + ") " + name + " not possible to change ecard " + ecard);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setecardchange&ecardchange=0&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID + "&message=Kunne ikke oppdatere brikke&dbid=" + dbidMessage);
                            }
                            else
                                failedThis = true;
                        }
                        else if (failedLast) // !bibOK || !ecardOK
                        {
                            FireLogMsg("eTiming Message: (bib: " + bib + ") " + name + " not possible to change ecard " + ecard);
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
                        FireLogMsg("Bad network or config file? eTiming Message ecard change: " + ee.Message);
                    }
                }

                // New entries
                // *****************************
                JArray itemsEntries = (JArray)objects["entry"];
                foreach (JObject element in itemsEntries)
                {
                    int messid = (element["messid"]).ToObject<int>();
                    int dbidIn = (element["dbid"]).ToObject<int>();

                    int dbid = dbidIn - m_IdOffset;
                    int kid = 0;
                    if (m_EventorID)
                    {
                        if (dbid > 1000000)
                            dbid -= 1000000;
                        else
                            kid = dbid;
                    }

                    JObject entry = (JObject)element["entry"];
                    string firstName = (entry["firstName"]).ToObject<string>();
                    string lastName = (entry["lastName"]).ToObject<string>();
                    string club = (entry["club"]).ToObject<string>();
                    string className = (entry["className"]).ToObject<string>();
                    int ecard = (entry["ecardNumber"]).ToObject<int>();
                    int rent = (entry["rent"]).ToObject<int>();

                    try
                    {
                        CheckEcard(ecard, 0, out bool ecardOK, out bool sameBibEcard, out int dbidUnknown);

                        if (!ecardOK)
                        {
                            failedThis = true;
                            if (failedLast)
                            {
                                // ecard already used
                                FireLogMsg("eTiming Message: " + firstName + " " + lastName + " not possible to enter. Ecard " + ecard + " already in use.");
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setnewentry&newentry=0&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID +
                                    "&message=Påmelding av " + firstName + " " + lastName + " ikke utført. Brikkenr " + ecard + " allerede i bruk&dbid=" + dbidIn);
                            }
                        }
                        else
                        {
                            IDbCommand cmd = m_connection.CreateCommand();
                            cmd.CommandText = string.Format(@"SELECT name.id FROM name LEFT JOIN class ON name.class = class.code 
                                                                WHERE name.{0} = {1} AND class.class = '{2}' AND name.status='V'",
                                                                kid > 0 ? "kid" : "id", kid > 0 ? kid : dbid, className);
                            var dbidOut = cmd.ExecuteScalar();
                            if (dbidOut == null || dbidOut == DBNull.Value)
                            {
                                failedThis = true;
                                if (failedLast)
                                {
                                    // No matching entry found
                                    FireLogMsg("eTiming Message: " + firstName + " " + lastName + " not possible to enter. No vacant match for ID " + dbidIn + ".");
                                    apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setnewentry&newentry=0&messid=" + messid);
                                    apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID +
                                                   "&message=Påmelding av " + firstName + " " + lastName + " ikke utført. Oppgitt ID ikke ledig!&dbid=" + dbidIn);
                                }
                            }
                            else
                            {
                                // Vacant runner ID found
                                cmd.CommandText = string.Format(@"SELECT code FROM team WHERE name='{0}'", club);
                                var clubCode = cmd.ExecuteScalar();
                                bool clubOK = false;
                                var update = 0;
                                if (clubCode != null && clubCode != DBNull.Value)
                                    clubCode = clubCode.ToString();
                                else // club not found, make a new negeative one
                                {
                                    string query = (m_MSSQL ? "CAST(ISNULL(MIN(TRY_CAST(code AS INT)), 0) - 1 AS VARCHAR)" :
                                    "CSTR(IIF(MIN(VAL(code)) IS NULL, 0, MIN(VAL(code))) - 1)");
                                    cmd.CommandText = string.Format(@"INSERT INTO team (code, name) SELECT {0}, '{1}' FROM team", query, club);
                                    update = cmd.ExecuteNonQuery();
                                    if (update == 1)
                                    {
                                        cmd.CommandText = string.Format(@"SELECT code FROM team WHERE name='{0}'", club);
                                        clubCode = cmd.ExecuteScalar();
                                    }
                                }
                                if (clubCode != null && clubCode != DBNull.Value)
                                {
                                    clubOK = true;
                                    string ecardstring = (ecard == 0 ? "null" : ecard.ToString());
                                    cmd.CommandText = string.Format(@"UPDATE name SET name='{0}',ename='{1}',ecard={2},team='{3}',ecardfee={4}, status='I' WHERE id={5}",
                                                          firstName, lastName, ecardstring, clubCode, rent, dbidOut);
                                    update = cmd.ExecuteNonQuery();
                                }
                                if (!clubOK || update != 1)
                                {
                                    failedThis = true;
                                    if (failedLast)
                                    {
                                        FireLogMsg("eTiming Message: " + firstName + " " + lastName + " not possible to enter. Error on writing entry with "
                                            + (kid > 0 ? "KID: " + kid : "ID: " + dbid) + ".");
                                        apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setnewentry&newentry=0&messid=" + messid);
                                        apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&comp=" + m_compID +
                                                   "&message=Påmelding av " + firstName + " " + lastName + " ikke utført. Feil ved skriving til oppgitt ID!&dbid=" + dbidIn);
                                    }
                                }
                                else
                                {
                                    FireOnDeleteVacantID(dbidIn); // Remove used vacant ID from list
                                    FireLogMsg("eTiming Message: " + firstName + " " + lastName + " entered class " + className);
                                    apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setmessagedbid&dbid=" + dbidIn + "&messid=" + messid);
                                    apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setcompleted&completed=1&messid=" + messid);
                                    apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&completed=1&comp=" + m_compID +
                                                   "&message=Påmelding av " + firstName + " " + lastName + " i klasse " + className + " utført.&dbid=" + dbidIn);
                                }
                            }
                        }
                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("Bad network or config file? eTiming Message new entry: " + ee.Message);
                    }
                }
            }
        }

        private void CheckEcard(int ecard, int bib, out bool ecardOK, out bool sameBibEcard, out int dbidUnknown)
        {
            ecardOK = true;
            sameBibEcard = false;
            dbidUnknown = 0;

            int eTimingBib = 0;
            int dbid = 0;

            if (ecard < 0)
                return;

            IDbCommand cmd = m_connection.CreateCommand();
            cmd.CommandText = string.Format(@"SELECT id, ename, name, startno, status FROM name WHERE ecard={0} OR ecard2={0} OR ecard3={0} OR ecard4={0}", ecard);
            using (IDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    if (reader[0] != null && reader[0] != DBNull.Value)
                    {
                        string status = reader["status"] as string;
                        string famName = (reader["ename"] as string);

                        if (!string.IsNullOrEmpty(famName))
                            famName = famName.Trim();
                        if (reader["id"] != null && reader["id"] != DBNull.Value)
                            dbid = Convert.ToInt32(reader["id"].ToString());
                        if (reader["startno"] != null && reader["startno"] != DBNull.Value)
                            eTimingBib = Convert.ToInt32(reader["startno"].ToString());
                        if ((status == "U" || status == "S") && famName == "U1 Ukjent løper")
                            dbidUnknown = dbid;
                        else // ecard belongs to existing runner
                        {
                            ecardOK = false;
                            sameBibEcard = (eTimingBib == bib);
                        }
                    }
                }
                reader.Close();
            }
        }

        private void SendLiveActive(string apiServer, WebClient client)
        {
            try
            {
                string apiResponse = client.DownloadString(apiServer + "api.php?method=setlastactive&comp=" + m_compID);
                FireLogMsg("Client live active sent to web server");
            }
            catch (Exception ee)
            {
                FireLogMsg("Bad network or config file? Error on sending active signal: " + ee.Message);
            }
        }

        private static int GetRunTime(string runTime)
        {
            int factor = 1;
            if (runTime.StartsWith("-"))
            {
                factor = -1;
                runTime = runTime.Substring(1);
            }

            DateTime dt;
            if (!DateTime.TryParseExact(runTime, "mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
            {
                if (!DateTime.TryParseExact(runTime, "H:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                {
                    if (!DateTime.TryParseExact(runTime, "mm:ss,f", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                    {
                        if (!DateTime.TryParseExact(runTime, "H:mm:ss,f", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                        {
                            if (!DateTime.TryParseExact(runTime, "mm:ss,ff", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                            {
                                if (!DateTime.TryParseExact(runTime, "H:mm:ss,ff", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                                {
                                    if (!DateTime.TryParseExact(runTime, "HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                                    {
                                        if (runTime != "")
                                        {
                                            throw new ApplicationException("Could not parse Time" + runTime);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return (int)Math.Round(dt.TimeOfDay.TotalSeconds * 100 * factor);
        }

        private static int ConvertFromDay2cs(double timeD)
        {
            int timecs;
            timecs = Convert.ToInt32(100.0 * 86400.0 * (timeD % 1));
            return timecs;
        }

        private void FireOnRadioControl()
        {
            OnRadioControl?.Invoke(null, 0, null, 0);
        }
    }
}
