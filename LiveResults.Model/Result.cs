﻿using System.Collections.Generic;

namespace LiveResults.Model
{
    public delegate void ResultDelegate(Result newResult);
    public delegate void DeleteIDDelegate(int runnerID);
    public delegate void DeleteUnusedIDDelegate(List<int> usedID);
    public delegate void RadioControlDelegate(string controlName, int controlCode, string className, int order);

    public class Result
    {
        public int ID { get; set; }
        public string RunnerName { get; set; }
        public string RunnerClub { get; set; }
        public string Class { get; set; }
        public int StartTime { get; set; }
        public int Time { get; set; }
        public int Status { get; set; }
        public int Ecard1 { get; set; }
        public int Ecard2 { get; set; }
        public int Bib { get; set; }
        public List<ResultStruct> SplitTimes { get; set; }
    }

    public class OverallResult : Result
    {
        public int OverallTime { get; set; }
        public int OverallStatus { get; set; }
    }

    public class RelayResult : OverallResult
    {
        public int LegNumber { get; set; }
    }
}
