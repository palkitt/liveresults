using System;
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
        private bool m_updateEcardTimes;
        private bool m_updateRadioControls;
        private bool m_continue;
        private int  m_sleepTime;
        private bool m_oneLineRelayRes;
        private bool m_lapTimes;
        private bool m_MSSQL;
        private bool m_twoEcards;
        private bool m_EventorID;
        private int m_IdOffset;
        private bool m_updateMessage;
        private int m_compID;
        private int day;
        private int m_OsOffset;

        public ETimingParser(IDbConnection conn, int sleepTime, bool notUpdateRadioControls = true, bool oneLineRelayRes = false, 
            bool MSSQL = false, bool twoEcards = false, bool lapTimes = false, bool EventorID = false, int IdOffset = 0, 
            bool updateMessage = false, bool addEcardSplits = false, int compID = 0, int OsOffset = 0)
        {
            m_connection = conn;
            m_updateRadioControls = !notUpdateRadioControls;
            m_sleepTime = sleepTime;
            m_oneLineRelayRes = oneLineRelayRes;
            m_MSSQL = MSSQL;
            m_twoEcards = twoEcards;
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


        Thread m_monitorThread;

        public void Start()
        {
            m_continue = true;
            m_monitorThread = new Thread(Run);
            m_monitorThread.Start();
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
            public string LegName;
            public string LegStatus;
            public int LegTime;
            public int TotalTime;
        }

        private class RelayTeam
        {
            public string ClassName;
            public string TeamName;
            public string TeamStatus;
            public int StartTime;
            public int TotalTime;
            public int TeamBib;
            public List<ResultStruct> SplitTimes;
            public Dictionary<int,RelayLegInfo> TeamMembers;
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
            public string Description;
            public int RadioType;
            public string TimingPoint;
            public int Leg;
            public int Order;
        };

        private void Run()
        {
            while (m_continue)
            {
                try
                {
                    if (m_connection.State != ConnectionState.Open)
                    {
                        m_connection.Open();
                    }

                    IDbCommand cmd           = m_connection.CreateCommand();
                    IDbCommand cmdInd        = m_connection.CreateCommand();
                    IDbCommand cmdRelay      = m_connection.CreateCommand();
                    IDbCommand cmdSplits     = m_connection.CreateCommand();
                    IDbCommand cmdEcardTimes = m_connection.CreateCommand();
                    
                    /*Detect event type*/
                    bool isRelay = false;
                    bool isSprint = false;
                    day = 1;
                    cmd.CommandText = "SELECT kid, sub FROM arr";
                    using (IDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            if (reader[0] != null && reader[0] != DBNull.Value)
                            {
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

                    /* Set up courses */
                    var dlgMergeCourseControls = OnMergeCourseControls;
                    var courses = new Dictionary<int, List<CourseControl>>();

                    if (dlgMergeCourseControls != null) // Read courses
                    {
                        List<CourseControl> courseControls = new List<CourseControl>();
                        if (m_updateEcardTimes)
                        {
                            cmd.CommandText = string.Format(@"SELECT courceno, controlno, code, posttype FROM controls ORDER BY courceno, controlno");
                            using (IDataReader reader = cmd.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    int courseno = 0, order = 0, code = 0, posttype=0;
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

                                    var control = new CourseControl
                                    {
                                        CourseNo = courseno,
                                        Code = code,
                                        Order = order
                                    };
                                    courseControls.Add(control);

                                    if (!courses.ContainsKey(courseno))
                                    {
                                        courses.Add(courseno, new List<CourseControl>());
                                    };
                                    courses[courseno].Add(control);
                                }
                                reader.Close();
                            }
                        }
                        CourseControl[] courseControlArray = courseControls.ToArray();
                        bool deleteUnused = (m_IdOffset == 0); // Delete unused courses only if ID offset = 0
                        dlgMergeCourseControls(courseControlArray, deleteUnused);
                    }


                    // *** Set up radiocontrols ***
                    /* ****************************
                     *  Ordinary controls       =  code + 1000*N
                     *  Pass/leg time           =  code + 1000*N           + 100000
                     *  Relay controls          =  code + 1000*N + 10000*L 
                     *  Pass/leg time for relay =  code + 1000*N + 10000*L + 100000
                     *  Change-over code        =  999  + 1000   + 10000*L
                     *  Exchange time code      =  0
                     *  Leg time code           =  999
                     *  Unranked fin. time code = -999
                     *  Unranked ord. controls  = -(code + 1000*N)
                     * 
                     *  N = number of occurrence
                     *  L = leg number
                     */


                    var dlgMergeRadio = OnMergeRadioControls;                              
                    if (m_updateRadioControls && dlgMergeRadio != null)
                    {
                        List<RadioControl> intermediates = new List<RadioControl>();
                        List<RadioControl> extraTimes = new List<RadioControl>();
                        
                        // radiotype, 2=finish/finish-passing, 4 = normal, 10 = exchange
                        cmd.CommandText = string.Format(@"SELECT code, radiocourceno, radiotype, timingpointtype, description, etappe, radiorundenr, live 
                                            FROM radiopost WHERE radioday={0} ORDER BY radiorundenr", day);
                        var RadioPosts = new Dictionary<int, List<RadioStruct>>();

                        using (IDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                int cource = 0, code = 0, radiotype = -1, leg = 0, order = 0;
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
                                    code = Convert.ToInt32(reader["code"].ToString());

                                if (code > 1000)
                                    code = code / 100; // Take away last to digits if code 1000+

                                if (reader["radiocourceno"] != null && reader["radiocourceno"] != DBNull.Value)
                                    cource = Convert.ToInt32(reader["radiocourceno"].ToString());
                                   
                                if (reader["radiotype"] != null && reader["radiotype"] != DBNull.Value)
                                    radiotype = Convert.ToInt32(reader["radiotype"].ToString());

                                if (reader["etappe"] != null && reader["etappe"] != DBNull.Value)
                                    leg = Convert.ToInt32(reader["etappe"].ToString());

                                if (reader["radiorundenr"] != null && reader["radiorundenr"] != DBNull.Value)
                                    order = Convert.ToInt32(reader["radiorundenr"].ToString());

                                string description = reader["description"] as string;
                                if (!string.IsNullOrEmpty(description))
                                    description = description.Trim();

                                var radioControl = new RadioStruct
                                {
                                    Code        = code,         
                                    Description = description,
                                    RadioType   = radiotype,
                                    TimingPoint = timingpoint,
                                    Order       = order,
                                    Leg         = leg
                                };

                                if (!RadioPosts.ContainsKey(cource))
                                {
                                    RadioPosts.Add(cource, new List<RadioStruct>());
                                };
                                RadioPosts[cource].Add(radioControl);
                            }
                            reader.Close();
                        }

                        // Class table
                        cmd.CommandText = @"SELECT code, cource, class, purmin, timingtype, cheaseing FROM class";
                        using (IDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                int cource = 0, numLegs = 0, timingType = 0, sign = 1;

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
                                    cource = Convert.ToInt32(reader["cource"].ToString());

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

                                string classAll = className;
                                if (!classAll.EndsWith("-"))
                                    classAll += "-";
                                classAll += "All";

                                if (numLegs > 0 && m_oneLineRelayRes)
                                { // Add leg time for last leg in one-line results
                                    extraTimes.Add(new RadioControl
                                    {
                                        ClassName = classAll,
                                        ControlName = "Leg",
                                        Code = 999,
                                        Order = 999
                                    });
                                }

                                if (RadioPosts.ContainsKey(cource))
                                {   // Add radio controls to course
                                    Dictionary<int, int> radioCnt = new Dictionary<int, int>();
                                    foreach (var radioControl in RadioPosts[cource])
                                    {
                                        if (radioControl.TimingPoint == "ST") // Skip if radiocontrol is start
                                            continue;
                                        int Code = radioControl.Code;    
                                        if (numLegs == 0 && (Code == 999 || Code == 0))
                                            continue;       // Skip if not relay and finish or start code

                                        string classN = className;
                                        if (isSprint)
                                            classN += " | Prolog";
                                        
                                        int CodeforCnt = 0; // Code for counter
                                        int AddforLeg = 0;  // Addition for relay legs
                                        int nStep = 1;      // Multiplicator used in relay order  

                                        if (numLegs > 0 || chaseStart || (m_lapTimes && !isRelay)) // Make ready for pass times
                                            nStep = 2;

                                        if (numLegs > 0)    // Relay
                                        {
                                            if (!classN.EndsWith("-"))
                                                classN += "-";
                                            classN += Convert.ToString(radioControl.Leg);
                                            AddforLeg = 10000 * radioControl.Leg;
                                        }

                                        if (Code < 999 && Code != 90 && radioControl.TimingPoint != "VK") // Not 90, not 999 and not exchange)
                                        {
                                            CodeforCnt = Code + AddforLeg;
                                            if (!radioCnt.ContainsKey(CodeforCnt))
                                                radioCnt.Add(CodeforCnt, 0);
                                            radioCnt[CodeforCnt]++;

                                            // Add codes for ordinary classes and leg based classes
                                            // sign = -1 for unranked classes
                                            intermediates.Add(new RadioControl
                                            {
                                                ClassName = classN,
                                                ControlName = radioControl.Description,
                                                Code = sign*(Code + radioCnt[CodeforCnt] * 1000 + AddforLeg),
                                                Order = nStep*radioControl.Order
                                            });

                                            // Add leg passing time for relay, chase start and lap times
                                            if (((numLegs > 0) && (radioControl.Leg > 1)) || chaseStart || (m_lapTimes && !isRelay)) 
                                            {
                                                intermediates.Add(new RadioControl
                                                {
                                                    ClassName = classN,
                                                    ControlName = radioControl.Description + "PassTime",
                                                    Code = Code + radioCnt[CodeforCnt] * 1000 + AddforLeg + 100000,
                                                    Order = nStep * radioControl.Order - 1 // Sort this before "normal" intermediate time
                                                });
                                            }
                                        }
                                            
                                        // Add codes for one-line relay classes
                                        if (numLegs > 0 && m_oneLineRelayRes)  
                                        {
                                            string Description = Convert.ToString(radioControl.Leg) +":"+ radioControl.Description;
                                            int position = 0;
                                            if (radioControl.TimingPoint == "VK") // Exchange
                                                position = 999 + 1000 + AddforLeg;
                                            else // Normal radio control
                                                position = Code + radioCnt[CodeforCnt] * 1000 + AddforLeg;

                                            intermediates.Add(new RadioControl
                                            {
                                                ClassName = classAll,
                                                ControlName = Description,
                                                Code = position,
                                                Order = 2*radioControl.Order
                                            });

                                            // Passing time
                                            intermediates.Add(new RadioControl
                                            {
                                                ClassName = classAll,
                                                ControlName = Description + "PassTime",
                                                Code = position + 100000,
                                                Order = 2*radioControl.Order - 1
                                            });
                                        }
                                    }
                                }
                            }
                            reader.Close();
                        }
                        intermediates.AddRange(extraTimes);
                        RadioControl[] radioControls = intermediates.ToArray();
                        dlgMergeRadio(radioControls);
                        
                    }

                    string modulus = (m_MSSQL ? "%" : "MOD");
                    string purmin = (isRelay ? "AND(C.purmin IS NULL OR C.purmin < 2)" : "");
                    
                    string baseCommandRelay = string.Format(@"SELECT N.id, N.kid, N.startno, N.ename, N.name, N.times, N.intime,
                            N.cource, N.place, N.status, N.cource, N.starttime, N.ecard, N.ecard2, N.ecard3, N.ecard4,
                            T.name AS tname, C.class AS cclass, C.timingtype, C.freestart,  
                            C.firststart AS cfirststart, C.purmin AS cpurmin, C.direct, Co.length,
                            R.lgstartno, R.teamno, R.lgclass, R.lgtotaltime, R.lglegno, R.lgstatus, R.lgteam  
                            FROM Name N, Class C, Team T, Relay R, Cource Co 
                            WHERE N.class=C.code AND T.code=R.lgteam AND N.rank=R.lgstartno AND Co.code=N.cource AND (N.startno {0} 100)<=C.purmin 
                            ORDER BY N.startno", modulus);

                    string baseCommandInd = string.Format(@"SELECT N.id, N.kid, N.startno, N.ename, N.name, N.times, N.intime, N.totaltime,
                            N.cource, N.place, N.status, N.cource, N.starttime, N.races, N.heat, N.ecard, N.ecard2, N.ecard3, N.ecard4,
                            T.name AS tname, C.class AS cclass, C.timingtype, C.freestart, C.cheaseing, C.purmin, C.direct, Co.length 
                            FROM Name N, Class C, Team T, Cource Co 
                            WHERE N.class=C.code AND Co.code=N.cource AND T.code=N.team {0}", purmin);

                    string baseSplitCommand = string.Format(@"SELECT mellomid, iplace, stasjon, mintime, nettotid, timechanged, mecard 
                            FROM mellom 
                            WHERE stasjon>=0 AND stasjon<250 AND mecard>0 AND day={0}
                            ORDER BY mintime",day);

                    string baseEcardTimesCommand = string.Format(@"SELECT times, control, ecardno, nr FROM ecard ORDER BY ecardno, times");

                    Dictionary<int, List<EcardTimesRawStruct>> ecardTimesList = null;
                    Dictionary<int, List<SplitRawStruct>> splitList = null;
                    List<int> unknownRunners = new List<int>();

                    string lastRunner = "";
                    List<int> usedID = new List<int>();

                    if (m_updateEcardTimes)
                    {
                        cmdEcardTimes.CommandText = baseEcardTimesCommand;
                        ParseReaderEcardTimes(cmdEcardTimes, out ecardTimesList, out lastRunner);
                    }

                    cmdSplits.CommandText = baseSplitCommand;
                    ParseReaderSplits(cmdSplits, out splitList, out lastRunner);

                    cmdInd.CommandText = baseCommandInd;
                    ParseReader(cmdInd, ref splitList, ref ecardTimesList, ref courses, false, isSprint, usedID, out lastRunner, out usedID);

                    if (isRelay)
                    {
                        cmdRelay.CommandText = baseCommandRelay;
                        ParseReader(cmdRelay, ref splitList, ref ecardTimesList, ref courses, true, false, usedID, out lastRunner, out usedID);
                    }

                    FireLogMsg("eTiming Monitor thread started");

                    string messageServer = ConfigurationManager.AppSettings["messageServer"];
                    WebClient client = new WebClient();
                    ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; //TLS 1.2

                    int maxSleepTimeMessage = 9; // Time between reading messages
                    int sleepTimeMessage = maxSleepTimeMessage;
                    int maxSleepTimeCleanupID = 60; // Time between cleaning/deleting unused IDs
                    int sleepTimeCleanupID = maxSleepTimeCleanupID;
                    bool failedLast = false;
                    bool failedThis;
                    bool first = true;

                    /* ***            Main loop        ***
                    /* ************************************/
                    while (m_continue)
                    {
                        try
                        {
                            if (m_updateEcardTimes)
                                ParseReaderEcardTimes(cmdEcardTimes, out ecardTimesList, out lastRunner);
                            ParseReaderSplits(cmdSplits, out splitList, out lastRunner);
                            ParseReader(cmdInd, ref splitList, ref ecardTimesList, ref courses, false, isSprint, new List<int>(), out lastRunner, out usedID);
                            if (isRelay)
                                ParseReader(cmdRelay, ref splitList, ref ecardTimesList, ref courses, true, false, usedID, out lastRunner, out usedID);
                            lastRunner = "Finished parsing runners";

                            if (first && m_IdOffset==0 && !isSprint)
                                FireOnDeleteUnusedID(usedID, first);
                            first = false;

                            handleUnknowns(splitList, ref unknownRunners);
                            sleepTimeMessage += m_sleepTime;

                            if (m_updateMessage && sleepTimeMessage >= maxSleepTimeMessage)
                            {
                                UpdateFromMessages(messageServer, client, failedLast, out failedThis);
                                failedLast = failedThis;
                                sleepTimeMessage = 0;
                            }

                            sleepTimeCleanupID += m_sleepTime;

                            if (sleepTimeCleanupID >= maxSleepTimeCleanupID)
                            {
                                if (m_IdOffset == 0 && !isSprint) //  Delete only when no offset is used and not sprint
                                    FireOnDeleteUnusedID(usedID);
                                sleepTimeCleanupID = 0;
                            }
                            
                            Thread.Sleep(1000*m_sleepTime);
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
                    FireLogMsg("eTiming Parser: " +ee.Message);
                }
                finally
                {
                    if (m_connection != null)
                        m_connection.Close();                    
                    FireLogMsg("eTiming Monitor thread stopped");
                }
            }
        }
        

        private void ParseReader(IDbCommand cmd, ref Dictionary<int, List<SplitRawStruct>> splitList, ref Dictionary<int, List<EcardTimesRawStruct>> ecardTimesList, 
                                 ref Dictionary<int, List<CourseControl>> courses, bool isRelay, bool isSprint, List<int> usedIDin, out string lastRunner, out List<int> usedIDout)
        {
            lastRunner = "";
            usedIDout = usedIDin;

            Dictionary<int, RelayTeam> RelayTeams;
            RelayTeams = new Dictionary<int, RelayTeam>();

            using (IDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int time = 0, runnerID = 0, eTimeID = 0, EventorID = 0, iStartTime = 0, iStartClass = 0, totalTime = 0, course = -1;
                    int bib = 0, teambib = 0, leg = 0, numlegs = 0, intime = -1, timingType = 0, sign = 1, heat = 0, stage = 0, sprintOffset = 0;
                    int length = 0;
                    int ecard1 = 0, ecard2 = 0, ecard3 = 0, ecard4 = 0;
                    string famName = "", givName = "", club = "", classN = "", status = "", bibread = "", name = "", shortName = "-";
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
                        if (classN == "NOCLAS")                // Skip runner if in NOCLAS
                            continue;

                        if (m_updateEcardTimes && reader["cource"] != null && reader["cource"] != DBNull.Value)
                            course = Convert.ToInt32(reader["cource"].ToString());

                        if (reader["length"] != null)
                            length = Convert.ToInt32(reader["length"].ToString());

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

                        // Continue with adding or updating runner
                        eTimeID = Convert.ToInt32(reader["id"].ToString());
                        if (reader["kid"] != null && reader["kid"] != DBNull.Value)
                            parseOK = Int32.TryParse(reader["kid"].ToString(), out EventorID);
                        if (m_EventorID)
                            runnerID = (EventorID > 0 ? EventorID : eTimeID + 1000000);
                        else
                            runnerID = eTimeID;
                        runnerID += m_IdOffset + sprintOffset;
                        usedIDout.Add(runnerID);

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

                        if (isRelay)
                            teambib = bib / 100; // Team bib no

                        int TeamTimePre = 0;
                        if (isRelay)
                        {   //RelayTeams
                            leg = bib % 100;   // Leg number

                            if (!RelayTeams.ContainsKey(teambib))
                            {
                                RelayTeams.Add(teambib, new RelayTeam());
                                RelayTeams[teambib].TeamMembers = new Dictionary<int, RelayLegInfo>();
                                RelayTeams[teambib].SplitTimes = new List<ResultStruct>();
                            }
                            RelayTeams[teambib].TeamBib = teambib;
                            RelayTeams[teambib].ClassName = classN;
                            if (leg == 1)
                                RelayTeams[teambib].StartTime = iStartTime;

                            if (!(RelayTeams[teambib].TeamMembers).ContainsKey(leg))
                                RelayTeams[teambib].TeamMembers.Add(leg, new RelayLegInfo());

                            if (givName != null)
                            {
                                if (givName.Length == 0) givName = "-";
                                shortName = givName[0] + "." + famName;
                            }

                            RelayTeams[teambib].TeamMembers[leg].LegName = shortName;

                            if (!classN.EndsWith("-"))
                                classN += "-";
                            classN += Convert.ToString(leg);

                            if (reader["teamno"] != null && reader["teamno"] != DBNull.Value)
                                club += "-" + Convert.ToString(reader["teamno"]);
                            RelayTeams[teambib].TeamName = club;

                            if (reader["cfirststart"] != null && reader["cfirststart"] != DBNull.Value)
                                iStartClass = ConvertFromDay2cs(Convert.ToDouble(reader["cfirststart"]));

                            if (isRelay && reader["cpurmin"] != null && reader["cpurmin"] != DBNull.Value)
                                numlegs = Convert.ToInt16(reader["cpurmin"]);

                            if (reader["intime"] != null && reader["intime"] != DBNull.Value)
                                intime = ConvertFromDay2cs(Convert.ToDouble(reader["intime"]));

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
                                if (RelayTeams[teambib].TeamMembers[legs].LegTime > 0)
                                {
                                    TeamTime += RelayTeams[teambib].TeamMembers[legs].LegTime;
                                    RelayTeams[teambib].TeamMembers[legs].TotalTime = TeamTime;

                                    var SplitTime = new ResultStruct
                                    {
                                        ControlCode = 999 + 1000 + 10000 * legs,           // Note code 999 for change-over!
                                        Time = TeamTime
                                    };
                                    RelayTeams[teambib].SplitTimes.Add(SplitTime);

                                    int controlCode = 0;
                                    if (legs == numlegs)
                                        controlCode = 999;
                                    else
                                        controlCode = 999 + 1000 + 10000 * legs + 100000;

                                    var LegTime = new ResultStruct
                                    {
                                        ControlCode = controlCode,
                                        Time = RelayTeams[teambib].TeamMembers[legs].LegTime
                                    };
                                    RelayTeams[teambib].SplitTimes.Add(LegTime);
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

                                if (RelayTeams[teambib].TeamMembers[legs].LegStatus == "D")
                                {
                                    TeamStatus = "D";
                                    status = "D";
                                }
                                else if (RelayTeams[teambib].TeamMembers[legs].LegStatus == "B")
                                {
                                    TeamStatus = "B";
                                    status = "B";
                                }
                                else if (RelayTeams[teambib].TeamMembers[legs].LegStatus == "N")
                                {
                                    if (legs == 1)
                                        TeamStatus = "N";
                                    else if (!(TeamStatus == "N"))
                                        TeamStatus = "B";
                                }

                            }
                            RelayTeams[teambib].TeamStatus = TeamStatus;

                            if (intime > 0)
                                time = Math.Max(intime - iStartClass, TeamTime);

                            if (leg > 1 && RelayTeams[teambib].TeamMembers[leg - 1].TotalTime > 0)
                            {
                                TeamTimePre = RelayTeams[teambib].TeamMembers[leg - 1].TotalTime;
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
                            int races = 0;

                            if (reader["totaltime"] != null && reader["totaltime"] != DBNull.Value)
                                totalTime = ConvertFromDay2cs(Convert.ToDouble(reader["totaltime"]));

                            if (reader["races"] != null && reader["races"] != DBNull.Value)
                                races = Convert.ToInt16(reader["races"]);

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
                        if (splitList.ContainsKey(ecard1))
                        {
                            if (splitList[ecard1].Any(s => s.controlCode == 0))
                                numStart += 1;
                            splits.AddRange(splitList[ecard1]);
                            splitList.Remove(ecard1);
                        }
                        if (splitList.ContainsKey(ecard2))
                        {
                            if (splitList[ecard2].Any(s => s.controlCode == 0))
                                numStart += 1;
                            splits.AddRange(splitList[ecard2]);
                            splitList.Remove(ecard2);
                        }
                        if (splitList.ContainsKey(ecard3))
                        {
                            splits.AddRange(splitList[ecard3]);
                            splitList.Remove(ecard3);
                        }
                        if (splitList.ContainsKey(ecard4))
                        {
                            splits.AddRange(splitList[ecard4]);
                            splitList.Remove(ecard4);
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
                                continue;         // Neglect passing before starttime, passing less than 3 s from last when the same splitCode
                            if (m_lapTimes && !isRelay && split.controlCode < 0)
                                continue;         // Do not accept negative control codes in cases where lap times are to be calculated

                            passTime = -2;        // Total time at passing
                            int passLegTime = -2; // Time used on leg at passing
                            if ((time < 0 || (split.netTime>0 && split.netTime<time)) && (freeStart || useEcardTime))
                                passTime = split.netTime;
                            else if (isRelay)
                            {
                                passLegTime = splitPassTime - Math.Max(iStartTime, iStartClass); // In case ind. start time not set
                                passTime = passLegTime + Math.Max(TeamTimePre, iStartTime - iStartClass); // Absolute pass time
                            }
                            else if (chaseStart)
                            {
                                passTime = splitPassTime - iStartTime + totalTime;
                                passLegTime = splitPassTime - iStartTime;
                            }
                            else if (!freeStart)
                                passTime = splitPassTime - iStartTime;
                            if (passTime < 1000 || (time > 0 && passTime > time))  // Neglect pass times less than 10 s from start and pass times longer than finish time
                                continue;
                            if (m_lapTimes && !isRelay)
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
                            lsplitCodes.Add(iSplitcode);

                            // Add split time to SplitTime struct
                            if (timingType == 2) // Not show times
                                passTime = -10;
                            var SplitTime = new ResultStruct
                            {
                                ControlCode = iSplitcode + 10000 * leg,
                                Time = passTime
                            };
                            SplitTimes.Add(SplitTime);

                            if (isRelay)
                                RelayTeams[teambib].SplitTimes.Add(SplitTime);

                            if (passLegTime > 0)
                            {
                                var passLegTimeStruct = new ResultStruct
                                {
                                    ControlCode = iSplitcode + 10000 * leg + 100000,
                                    Time = passLegTime
                                };
                                if (leg > 1 || chaseStart || m_lapTimes)
                                    SplitTimes.Add(passLegTimeStruct);
                                if (isRelay)
                                    RelayTeams[teambib].SplitTimes.Add(passLegTimeStruct);
                            }

                            if (freeStart && calcStartTime < 0)
                                calcStartTime = split.changedTime - split.netTime - 500;
                        }

                        if (time > 0 && m_lapTimes && !isRelay && lastSplitTime > 0) // Add lap time for last lap
                        {
                            var LegTime = new ResultStruct
                            {
                                ControlCode = 999,
                                Time = time - (lastSplitTime - iStartTime)
                            };
                            SplitTimes.Add(LegTime);
                        }

                        if (m_twoEcards && numStart < 2 && (status == "S"))
                            status = "I"; // Set status to "Entered" if only one eCard at start when 2 required 

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
                        if (m_updateEcardTimes && timingType != 2) // Skip if do not show times
                        {
                            var ecardTimes = new List<EcardTimesRawStruct>();
                            if (ecardTimesList.ContainsKey(ecard1)) ecardTimes.AddRange(ecardTimesList[ecard1]);
                            if (ecardTimesList.ContainsKey(ecard2)) ecardTimes.AddRange(ecardTimesList[ecard2]);
                            if (ecardTimesList.ContainsKey(ecard3)) ecardTimes.AddRange(ecardTimesList[ecard3]);
                            if (ecardTimesList.ContainsKey(ecard4)) ecardTimes.AddRange(ecardTimesList[ecard4]);
                            ecardTimes = ecardTimes.OrderBy(s => s.time).ToList();

                            int controlNo = 0, timeNo = 0, timeNoLast = -1, numControls = 0;
                            if (courses.ContainsKey(course))
                                numControls = courses[course].Count;

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
                                    timeMatch = ecardTimes.ElementAt(timeNo).time;
                                if (first)
                                    first = false;
                                else
                                    ecardTimeString += ",";
                                ecardTimeString += timeMatch.ToString();
                                controlNo++;
                            }
                        }
                        
                    }
                    catch (Exception ee)
                    {
                        FireLogMsg("eTiming Parser. Runner ID:" + runnerID + " Error: " + ee.Message);
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
                            Bib = (isRelay? -bib : bib),
                            SplitTimes = SplitTimes,
                            EcardTimes = ecardTimeString
                        };
                        FireOnResult(res);
                    }
                }
                reader.Close();
            }

            // Loop through relay teams and add one-line results
            if (isRelay && m_oneLineRelayRes)
            {
                foreach (var Team in RelayTeams)
                {
                    int rstatus = GetStatusFromCode(ref Team.Value.TotalTime, Team.Value.TeamStatus);
                    if (rstatus != 999)
                    {
                        const int maxLength = 50; // Max lenght of one-line name
                        int numlegs   = Team.Value.TeamMembers.Count;
                        int legLength = maxLength / numlegs;
                        string name = "", classAll = "";
                        foreach (var Runner in Team.Value.TeamMembers)
                        {
                            int numChars = Math.Min(Runner.Value.LegName.Length, legLength);
                            if (Runner.Key == 1)
                                name = Runner.Value.LegName.Substring(0,numChars);
                            else
                                name += ", " + Runner.Value.LegName.Substring(0, numChars);
                        }

                        classAll = Team.Value.ClassName;
                        if (!classAll.EndsWith("-"))
                            classAll += "-";
                        classAll += "All";

                        var res = new Result
                        {
                            ID = 100000 + Team.Value.TeamBib,
                            RunnerName = name,
                            RunnerClub = Team.Value.TeamName,
                            Bib = Team.Value.TeamBib,
                            Class = classAll,
                            StartTime = Team.Value.StartTime,
                            Time = Team.Value.TotalTime,
                            Status = rstatus,
                            SplitTimes = Team.Value.SplitTimes
                        };
                        FireOnResult(res);
                    }
                }
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
                case "S": // Started
                    rstatus = 9;
                    time = -3;
                    break;
                case "I": // Entered 
                    rstatus = 10;
                    time = -3;
                    break;
                case "A": // OK
                    rstatus = 0;
                    break;
                case "N": // Ikke startet
                    rstatus = 1;
                    time = -3;
                    break;
                case "B": // Brutt
                    rstatus = 2;
                    time = -3;
                    break;
                case "D": // Disk / mp
                    rstatus = 3;
                    time = -3;
                    break;
                case "NC": // Not classified
                    rstatus = 6;
                    time = -3;
                    break;
                case "F": // Finished (Fullført). For not ranked classes
                    rstatus = 13;
                    break;
            }
            return rstatus;
        }

        private void ParseReaderSplits(IDbCommand cmd, out Dictionary<int,List<SplitRawStruct>> splitList, out string lastRunner)
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
                                code = code / 100; // Take away last to digits if code 1000+
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
                        {
                            splitList.Add(ecard, new List<SplitRawStruct>());
                        };
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
                        {
                            ecardTimesList.Add(ecard, new List<EcardTimesRawStruct>());
                        };
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
            // Get DNS and ecard changes
            try
            {
                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=getchanges&comp=" + m_compID);
            }
            catch (Exception ee)
            {
                FireLogMsg("Bad network? eTiming Message error: " + ee.Message);
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
                            cmd.CommandText = string.Format(@"SELECT id, ename, name, status FROM name WHERE kid={0}", kid);
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
                        FireLogMsg("Bad network? eTiming Message DNS: " + ee.Message);
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
                            bool replaceUnknown = false;
                            int dbidUnknown = 0;
                            int eTimingBib = 0;
                            cmd.CommandText = string.Format(@"SELECT id, ename, name, startno, status FROM name WHERE ecard={0} OR ecard2={0} OR ecard3={0} OR ecard4={0}", ecard);
                            using (IDataReader reader = cmd.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    if (reader[0] != null && reader[0] != DBNull.Value)
                                    {
                                        status = reader["status"] as string;
                                        famName = (reader["ename"] as string);
                                        if (!string.IsNullOrEmpty(famName))
                                            famName = famName.Trim();
                                        if (reader["id"] != null && reader["id"] != DBNull.Value)
                                            dbidUnknown = Convert.ToInt32(reader["id"].ToString());
                                        if (reader["startno"] != null && reader["startno"] != DBNull.Value)
                                            eTimingBib = Convert.ToInt32(reader["startno"].ToString());
                                        if ((status == "U" || status == "S") && famName == "U1 Ukjent løper")
                                            replaceUnknown = true;
                                        else // ecard belongs to existing runner
                                        {
                                            ecardOK = false;
                                            sameBibEcard = (eTimingBib == bib);
                                        }
                                    }
                                }
                                reader.Close();
                            }
                            if (replaceUnknown)
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
                            int ecardToChange = 3; // Use tag 3 place if both tag holders are of same type as new tag

                            if (emiTag && emiTag1 && !emiTag2 || !emiTag && !emiTag1 && emiTag2 || ecard1 == 0)
                            {
                                ecardToChange = 1;
                                ecardOld = ecard1;
                            }
                            else if (emiTag && emiTag2 && !emiTag1 || !emiTag && !emiTag2 && emiTag1 || ecard2 == 0)
                            {
                                ecardToChange = 2;
                                ecardOld = ecard2;
                            }

                            if (ecardToChange == 1)
                                cmd.CommandText = string.Format(@"UPDATE name SET ecard={0} WHERE startno={1}", ecard, bib);
                            else
                                cmd.CommandText = string.Format(@"UPDATE name SET ecard{2}={0} WHERE startno={1}", ecard, bib, ecardToChange);
                            var update = cmd.ExecuteNonQuery();
                            if (update == 1)
                            {
                                FireLogMsg("eTiming Message: (bib: " + bib + ") " + name + " replaced ecard: " + ecardOld + " with: " + ecard);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=setcompleted&completed=1&messid=" + messid);
                                apiResponse = client.DownloadString(messageServer + "messageapi.php?method=sendmessage&completed=1&comp=" + m_compID + "&message=Brikke: " + ecardOld +
                                    " byttet til " + ecard + "&dbid=" + dbid);

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
                        FireLogMsg("Bad network? eTiming Message ecard: " + ee.Message);
                    }
                }
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
                                            throw new ApplicationException ("Could not parse Time" + runTime);
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

    }
}
