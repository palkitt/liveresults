
namespace LiveResults.Model
{
    public interface IExternalSystemResultParser
    {
        void Start();
        void Stop();
        event ResultDelegate OnResult;
        event DeleteIDDelegate OnDeleteID;
        event LogMessageDelegate OnLogMessage;
        event RadioControlDelegate OnRadioControl;
    }

    public interface IExternalSystemResultParserEtiming
    {
        void Start();
        void Stop();
        event ResultDelegate OnResult;
        event DeleteIDDelegate OnDeleteID;
        event DeleteVacantIDDelegate OnDeleteVacantID;
        event DeleteUnusedIDDelegate OnDeleteUnusedID;
        event LogMessageDelegate OnLogMessage;
        event RadioControlDelegate OnRadioControl;
        event MergeRadioControlsDelegate OnMergeRadioControls;
        event MergeCourseDataDelegate OnMergeCourseData;
        event MergeVacantsDelegate OnMergeVacants;
    }
}
