using System;
using System.Collections.Generic;
using System.Windows.Forms;
using System.IO;

namespace LiveResults.Client
{
    static class Program
    {
        // The main entry point for the application.
        [STAThread]
        static void Main()
        {
            string configFilePath = AppDomain.CurrentDomain.SetupInformation.ConfigurationFile;
            if(!File.Exists(configFilePath))
            {
                MessageBox.Show("No config file found! Please place the config file ('LiveResults.Client.exe.config') in the same folder as the exe file and try again.",
                    "Missing config file", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Environment.Exit(0);
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new FrmNewCompetition());
        }
    }
}