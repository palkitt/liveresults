using System.Collections.Generic;

namespace LiveResults.Model
{
    public delegate void ResultDelegate(Result newResult);
    public delegate void DeleteIDDelegate(int runnerID);
    public delegate void DeleteVacantIDDelegate(int runnerID);
    public delegate void MergeRadioControlsDelegate(RadioControl[] radiocontrols, bool update = true);
    public delegate void DeleteUnusedIDDelegate(List<int> usedID, bool first = false);
    public delegate void RadioControlDelegate(string controlName, int controlCode, string className, int order);
    public delegate void MergeCourseControlsDelegate(CourseControl[] courseControls, bool deleteUnused);
    public delegate void MergeCourseDataDelegate(CourseData[] courseNames, bool deleteUnused);
    public delegate void MergeVacantsDelegate(VacantRunner[] vacantRunners, bool deleteUnused);

    public class Result
    {
        public int ID { get; set; }
        public string RunnerName { get; set; }
        public string RunnerClub { get; set; }
        public string Class { get; set; }
        public int StartTime { get; set; }
        public int Time { get; set; }
        public int Status { get; set; }
        public int Course { get; set; }
        public int Length { get; set; }
        public int Ecard1 { get; set; }
        public int Ecard2 { get; set; }
        public int Bib { get; set; }
        public List<ResultStruct> SplitTimes { get; set; }
        public string EcardTimes { get; set; }
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
