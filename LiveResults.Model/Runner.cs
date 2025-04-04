﻿using System;
using System.Collections.Generic;
using System.Linq;

namespace LiveResults.Model
{
    public class RunnerPair
    {
        public Result Runner1;
        public Result Runner2;

        public Result CombinedRunner
        {
            get
            {
                if (Runner1 == null || Runner2 == null)
                    return null;
                else if (Runner1.Status == 999 || Runner2.Status == 999)
                    return null;

                string club = Runner1.RunnerClub;
                if (club != Runner2.RunnerClub)
                    club += "/" + Runner2.RunnerClub;

                int totalStatus = Runner1.Status;
                if (totalStatus == 0 && Runner2.Status != 0)
                    totalStatus = Runner2.Status;

                int time = Math.Max(Runner1.Time, Runner2.Time);
                

                var combinedSplits = new List<ResultStruct>();
                if (Runner1.SplitTimes != null)
                {
                    if (Runner2.SplitTimes == null)
                        combinedSplits = Runner1.SplitTimes;
                    else
                    {
                        foreach (var spl in Runner1.SplitTimes)
                        {
                            var os = Runner2.SplitTimes.FirstOrDefault(x => x.ControlCode == spl.ControlCode);
                            if (os.ControlCode == 0)
                                combinedSplits.Add(spl);
                            else
                                combinedSplits.Add(spl.Time > os.Time ? spl : os);
                        }

                        //Add those in Runner2 that are not in Runner1
                        foreach (var spl in Runner2.SplitTimes)
                        {
                            var os = Runner1.SplitTimes.FirstOrDefault(x => x.ControlCode == spl.ControlCode);
                            if (os.ControlCode == 0)
                                combinedSplits.Add(spl);
                        }
                    }
                }
                else if (Runner2.SplitTimes != null)
                    combinedSplits = Runner2.SplitTimes;

                var res = new Result
                {
                    ID = Math.Min(Runner1.ID,Runner2.ID),
                    Class = Runner1.Class,
                    Time = time,
                    RunnerClub = club,
                    StartTime = Runner1.StartTime,
                    SplitTimes = combinedSplits,
                    RunnerName = Runner1.RunnerName + "/" + Runner2.RunnerName,
                    Status = totalStatus
                };

                return res;
            }
        }
    }

    class DelRadioControl : DbItem
    {
        public RadioControl ToDelete;
    }

    public class RadioControl : DbItem
    {
        public string ClassName { get; set; }
        public int Code { get; set; }
        public string ControlName { get; set; }
        public int Order { get; set; }
        public int Distance { get; set; } = 0;
    }

    class DelCourseControl : DbItem
    {
        public CourseControl ToDelete;
    }

    public class CourseControl : DbItem
    {
        public int CourseNo { get; set; }
        public int Code { get; set; }
        public int RadioCode { get; set; }
        public int Order { get; set; }
        public int AccDist { get; set; }
    }

    class DelCourseName : DbItem
    {
        public CourseName ToDelete;
    }

    public class CourseName : DbItem
    {
        public int CourseNo { get; set; }
        public string Name { get; set; }
    }

    class DelVacantRunner : DbItem
    {
        public VacantRunner ToDelete;
    }

    public class VacantRunner : DbItem
    {
        public int dbid { get; set; }
        public int bib { get; set; }
        public string classid { get; set; }
        public string classname { get; set; }
    }


    public class DbItem
    {
    }

    class DelRunner : DbItem
    {
        public int RunnerID;
    }

    class DelSplitTime : DbItem
    {
        public int RunnerID;
        public int ControlCode;
    }

    public class Runner : DbItem
    {
        private int m_id;
        private string m_name;
        private string m_club;
        private string m_class;
        private int m_course;
        private int m_length;
        private int m_start;
        private int m_time;
        private int m_status;
        private int m_ecard1;
        private int m_ecard2;
        private int m_bib;
        private string m_sourceId;
        private string m_ecardTimes;

        public bool RunnerUpdated;
        public bool ResultUpdated;
        public bool StartTimeUpdated;

        private readonly Dictionary<int,SplitTime> m_splitTimes;
        public Runner(int dbID, string name, string club, string Class, int ecard1 = 0, int ecard2 = 0, int bib = 0, string sourceId = null, int course = 0, int length = 0, string ecardTimes = "")
        {
            RunnerUpdated = true;
            ResultUpdated = false;
            StartTimeUpdated = false;

            m_splitTimes = new Dictionary<int, SplitTime>();
            m_id = dbID;
            m_name = name;
            m_club = club;
            m_course = course;
            m_length = length;
            m_class = Class;
            m_ecard1 = ecard1;
            m_ecard2 = ecard2;
            m_bib = bib;
            m_sourceId = sourceId;
            m_ecardTimes = ecardTimes; 
        }

        public string SourceId
        {
            get
            {
                return m_sourceId;
            }
            set
            {
                m_sourceId = value;
            }
        
        }
        public string EcardTimes
        {
            get
            {
                return m_ecardTimes;
            }
            set
            {
                m_ecardTimes = value;
            }

        }
        public int ID
        {
            get
            {
                return m_id;
            }
            set
            {
                m_id = value;
            }
        }
        public int Ecard1
        {
            get
            {
                return m_ecard1;
            }
            set
            {
                m_ecard1 = value;
            }
        }
        public int Ecard2
        {
            get
            {
                return m_ecard2;
            }
            set
            {
                m_ecard2 = value;
            }
        }
        public int Bib
        {
            get
            {
                return m_bib;
            }
            set
            {
                m_bib = value;
            }
        }
        public int Course
        {
            get
            {
                return m_course;
            }
            set
            {
                m_course = value;
            }
        }
        public int Length
        {
            get
            {
                return m_length;
            }
            set
            {
                m_length = value;
            }
        }
        public bool HasUpdatedSplitTimes()
        {
            return m_splitTimes.Values.Any(t => t.Updated);
        }

        public bool HasEcardTimesChanged(string EcardTimes)
        {
            return m_ecardTimes != EcardTimes;
        }

        public void ResetUpdatedSplits()
        {
            foreach (SplitTime t in m_splitTimes.Values)
            {
                t.Updated = false;
            }
        }
        public List<SplitTime> GetUpdatedSplitTimes()
        {
            return SplitTimes.Where(t => t.Updated).ToList();
        }

        public bool HasStartTimeChanged(int starttime)
        {
            return m_start != starttime;
        }

        public void SetStartTime(int starttime)
        {
            if (m_start != starttime)
            {
                m_start = starttime;
                StartTimeUpdated = true;
            }
        }

        public int Time
        {
            get
            {
                return m_time;
            }
        }

        public string Club
        {
            get
            {
                return m_club;
            }
            set
            {
                m_club = value;
                RunnerUpdated = true;
            }
        }

        public SplitTime[] SplitTimes
        {
            get
            {
                return m_splitTimes.Values.ToArray();
            }
        }

        public string Class
        {
            get
            {
                return m_class;
            }
            set
            {
                m_class = value;
                RunnerUpdated = true;
            }
        }

        public int Status
        {
            get
            {
                return m_status;
            }
        }
        public int StageStatus
        {
            get
            {
                return m_status;
            }
        }

        public int StartTime
        {
            get
            {
                return m_start;
            }
        }

        public bool HasSplitChanged(int controlCode, int time)
        {
            return !(m_splitTimes.ContainsKey(controlCode) && m_splitTimes[controlCode].Time == time);
        }

        public void SetSplitTime(int controlCode, int time)
        {
            if (HasSplitChanged(controlCode, time))
            {
                if (m_splitTimes.ContainsKey(controlCode))
                {
                    SplitTime t = m_splitTimes[controlCode];
                    t.Time = time;
                    t.Updated = true;
                }
                else
                {
                    var t = new SplitTime();
                    t.Control = controlCode;
                    t.Time = time;
                    t.Updated = true;
                    m_splitTimes.Add(controlCode, t);
                }

            }
        }

        public void DeleteSplitTime(int controlCode)
        {
            if (m_splitTimes.ContainsKey(controlCode))
                m_splitTimes.Remove(controlCode);
        }

        public bool HasResultChanged(int time, int status)
        {
            return m_time != time || m_status != status;
        }

        public void SetEcardTimes(string ecardTimes)
        {
            if (HasEcardTimesChanged(ecardTimes))
            {
                m_ecardTimes = ecardTimes;
                RunnerUpdated = true;
            }
        }
        
        public void SetResult(int time, int status)
        {
            if (HasResultChanged(time,status))
            {
                m_time = time;
                m_status = status;
                ResultUpdated = true;
            }
        }

        public string Name
        {
            get
            {
                return m_name;
            }
            set
            {
                m_name = value;
                RunnerUpdated = true;
            }
        }

        public void SetResultStatus(int status)
        {
            if (m_status != status)
            {
                m_status = status;
                ResultUpdated = true;
            }
        }

        public void ClearTimeAndSplits()
        {
            m_time = 0;
            m_status = 0;
            if (m_splitTimes != null)
                m_splitTimes.Clear();

            RunnerUpdated = true;
        }
    }

    public class SplitTime
    {
        public int Control;
        public int Time;
        public bool Updated;
    }
}
