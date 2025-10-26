namespace LiveResults.Client
{
    partial class OEForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(OEForm));
            this.groupBox1 = new System.Windows.Forms.GroupBox();
            this.txtRefresh = new System.Windows.Forms.TextBox();
            this.txtRefreshTitle = new System.Windows.Forms.Label();
            this.txtURL = new System.Windows.Forms.TextBox();
            this.label6 = new System.Windows.Forms.Label();
            this.txtZeroTime = new System.Windows.Forms.TextBox();
            this.lblZeroTime = new System.Windows.Forms.Label();
            this.lblFormatInfo = new System.Windows.Forms.Label();
            this.label5 = new System.Windows.Forms.Label();
            this.cmbFormat = new System.Windows.Forms.ComboBox();
            this.label3 = new System.Windows.Forms.Label();
            this.txtExtension = new System.Windows.Forms.TextBox();
            this.button1 = new System.Windows.Forms.Button();
            this.txtOEDirectory = new System.Windows.Forms.TextBox();
            this.label1 = new System.Windows.Forms.Label();
            this.folderBrowserDialog1 = new System.Windows.Forms.FolderBrowserDialog();
            this.listBox1 = new System.Windows.Forms.ListBox();
            this.button2 = new System.Windows.Forms.Button();
            this.fileSystemWatcher1 = new System.IO.FileSystemWatcher();
            this.listBox2 = new System.Windows.Forms.ListBox();
            this.timer1 = new System.Windows.Forms.Timer(this.components);
            this.label2 = new System.Windows.Forms.Label();
            this.txtCompID = new System.Windows.Forms.TextBox();
            this.button3 = new System.Windows.Forms.Button();
            this.fsWatcherOS = new System.IO.FileSystemWatcher();
            this.label4 = new System.Windows.Forms.Label();
            this.button4 = new System.Windows.Forms.Button();
            this.chkAutoCreateRadioControls = new System.Windows.Forms.CheckBox();
            this.txtOrganizer = new System.Windows.Forms.TextBox();
            this.label7 = new System.Windows.Forms.Label();
            this.chkDeleteUnused = new System.Windows.Forms.CheckBox();
            this.groupBox1.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.fileSystemWatcher1)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.fsWatcherOS)).BeginInit();
            this.SuspendLayout();
            // 
            // groupBox1
            // 
            this.groupBox1.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.groupBox1.Controls.Add(this.txtRefresh);
            this.groupBox1.Controls.Add(this.txtRefreshTitle);
            this.groupBox1.Controls.Add(this.txtURL);
            this.groupBox1.Controls.Add(this.label6);
            this.groupBox1.Controls.Add(this.txtZeroTime);
            this.groupBox1.Controls.Add(this.lblZeroTime);
            this.groupBox1.Controls.Add(this.lblFormatInfo);
            this.groupBox1.Controls.Add(this.label5);
            this.groupBox1.Controls.Add(this.cmbFormat);
            this.groupBox1.Controls.Add(this.label3);
            this.groupBox1.Controls.Add(this.txtExtension);
            this.groupBox1.Controls.Add(this.button1);
            this.groupBox1.Controls.Add(this.txtOEDirectory);
            this.groupBox1.Controls.Add(this.label1);
            this.groupBox1.Location = new System.Drawing.Point(12, 3);
            this.groupBox1.Name = "groupBox1";
            this.groupBox1.Size = new System.Drawing.Size(311, 200);
            this.groupBox1.TabIndex = 0;
            this.groupBox1.TabStop = false;
            this.groupBox1.Text = "Settings (set directory or URL)";
            // 
            // txtRefresh
            // 
            this.txtRefresh.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.txtRefresh.Location = new System.Drawing.Point(250, 150);
            this.txtRefresh.Name = "txtRefresh";
            this.txtRefresh.Size = new System.Drawing.Size(55, 20);
            this.txtRefresh.TabIndex = 5;
            this.txtRefresh.Text = "15";
            // 
            // txtRefreshTitle
            // 
            this.txtRefreshTitle.AutoSize = true;
            this.txtRefreshTitle.Location = new System.Drawing.Point(247, 136);
            this.txtRefreshTitle.Name = "txtRefreshTitle";
            this.txtRefreshTitle.Size = new System.Drawing.Size(58, 13);
            this.txtRefreshTitle.TabIndex = 16;
            this.txtRefreshTitle.Text = "Refresh [s]";
            // 
            // txtURL
            // 
            this.txtURL.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.txtURL.Location = new System.Drawing.Point(10, 149);
            this.txtURL.Name = "txtURL";
            this.txtURL.Size = new System.Drawing.Size(229, 20);
            this.txtURL.TabIndex = 4;
            // 
            // label6
            // 
            this.label6.AutoSize = true;
            this.label6.Location = new System.Drawing.Point(7, 136);
            this.label6.Name = "label6";
            this.label6.Size = new System.Drawing.Size(161, 13);
            this.label6.TabIndex = 14;
            this.label6.Text = "Export URL (for XML or ZIP files)";
            // 
            // txtZeroTime
            // 
            this.txtZeroTime.Location = new System.Drawing.Point(159, 173);
            this.txtZeroTime.Name = "txtZeroTime";
            this.txtZeroTime.Size = new System.Drawing.Size(146, 20);
            this.txtZeroTime.TabIndex = 6;
            // 
            // lblZeroTime
            // 
            this.lblZeroTime.AutoSize = true;
            this.lblZeroTime.Location = new System.Drawing.Point(7, 176);
            this.lblZeroTime.Name = "lblZeroTime";
            this.lblZeroTime.Size = new System.Drawing.Size(146, 13);
            this.lblZeroTime.TabIndex = 13;
            this.lblZeroTime.Text = "Event ZeroTime (HH:MM:SS)";
            // 
            // lblFormatInfo
            // 
            this.lblFormatInfo.Location = new System.Drawing.Point(7, 135);
            this.lblFormatInfo.Name = "lblFormatInfo";
            this.lblFormatInfo.Size = new System.Drawing.Size(298, 49);
            this.lblFormatInfo.TabIndex = 11;
            // 
            // label5
            // 
            this.label5.AutoSize = true;
            this.label5.Location = new System.Drawing.Point(7, 97);
            this.label5.Name = "label5";
            this.label5.Size = new System.Drawing.Size(39, 13);
            this.label5.TabIndex = 10;
            this.label5.Text = "Format";
            // 
            // cmbFormat
            // 
            this.cmbFormat.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.cmbFormat.FormattingEnabled = true;
            this.cmbFormat.Location = new System.Drawing.Point(10, 111);
            this.cmbFormat.Name = "cmbFormat";
            this.cmbFormat.Size = new System.Drawing.Size(295, 21);
            this.cmbFormat.TabIndex = 3;
            this.cmbFormat.SelectedIndexChanged += new System.EventHandler(this.cmbFormat_SelectedIndexChanged);
            // 
            // label3
            // 
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(7, 59);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(210, 13);
            this.label3.TabIndex = 8;
            this.label3.Text = "Export file extension (to monitor in directory)";
            // 
            // txtExtension
            // 
            this.txtExtension.Location = new System.Drawing.Point(10, 75);
            this.txtExtension.Name = "txtExtension";
            this.txtExtension.Size = new System.Drawing.Size(112, 20);
            this.txtExtension.TabIndex = 2;
            this.txtExtension.Text = "*.xml";
            // 
            // button1
            // 
            this.button1.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.button1.Location = new System.Drawing.Point(274, 35);
            this.button1.Name = "button1";
            this.button1.Size = new System.Drawing.Size(31, 20);
            this.button1.TabIndex = 1;
            this.button1.Text = "...";
            this.button1.UseVisualStyleBackColor = true;
            this.button1.Click += new System.EventHandler(this.button1_Click);
            // 
            // txtOEDirectory
            // 
            this.txtOEDirectory.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.txtOEDirectory.Location = new System.Drawing.Point(10, 36);
            this.txtOEDirectory.Name = "txtOEDirectory";
            this.txtOEDirectory.Size = new System.Drawing.Size(258, 20);
            this.txtOEDirectory.TabIndex = 1;
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(7, 20);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(80, 13);
            this.label1.TabIndex = 0;
            this.label1.Text = "Export directory";
            // 
            // listBox1
            // 
            this.listBox1.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.listBox1.FormattingEnabled = true;
            this.listBox1.Location = new System.Drawing.Point(12, 248);
            this.listBox1.Name = "listBox1";
            this.listBox1.Size = new System.Drawing.Size(576, 199);
            this.listBox1.TabIndex = 98;
            this.listBox1.TabStop = false;
            // 
            // button2
            // 
            this.button2.Location = new System.Drawing.Point(170, 212);
            this.button2.Name = "button2";
            this.button2.Size = new System.Drawing.Size(75, 31);
            this.button2.TabIndex = 11;
            this.button2.Text = "Start upload";
            this.button2.UseVisualStyleBackColor = true;
            this.button2.Click += new System.EventHandler(this.button2_Click);
            // 
            // fileSystemWatcher1
            // 
            this.fileSystemWatcher1.EnableRaisingEvents = true;
            this.fileSystemWatcher1.SynchronizingObject = this;
            // 
            // listBox2
            // 
            this.listBox2.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.listBox2.FormattingEnabled = true;
            this.listBox2.Location = new System.Drawing.Point(329, 32);
            this.listBox2.Name = "listBox2";
            this.listBox2.Size = new System.Drawing.Size(251, 69);
            this.listBox2.TabIndex = 97;
            this.listBox2.TabStop = false;
            // 
            // timer1
            // 
            this.timer1.Enabled = true;
            this.timer1.Interval = 1000;
            this.timer1.Tick += new System.EventHandler(this.timer1_Tick);
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(9, 206);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(73, 13);
            this.label2.TabIndex = 4;
            this.label2.Text = "CompetitionID";
            // 
            // txtCompID
            // 
            this.txtCompID.Location = new System.Drawing.Point(12, 222);
            this.txtCompID.Name = "txtCompID";
            this.txtCompID.Size = new System.Drawing.Size(74, 20);
            this.txtCompID.TabIndex = 9;
            // 
            // button3
            // 
            this.button3.Location = new System.Drawing.Point(252, 212);
            this.button3.Name = "button3";
            this.button3.Size = new System.Drawing.Size(73, 31);
            this.button3.TabIndex = 12;
            this.button3.Text = "Stop upload";
            this.button3.UseVisualStyleBackColor = true;
            this.button3.Click += new System.EventHandler(this.button3_Click);
            // 
            // fsWatcherOS
            // 
            this.fsWatcherOS.EnableRaisingEvents = true;
            this.fsWatcherOS.Filter = "*.csv.emma";
            this.fsWatcherOS.NotifyFilter = System.IO.NotifyFilters.LastWrite;
            this.fsWatcherOS.SynchronizingObject = this;
            this.fsWatcherOS.Changed += new System.IO.FileSystemEventHandler(this.fsWatcherOS_Changed);
            // 
            // label4
            // 
            this.label4.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.label4.AutoSize = true;
            this.label4.Location = new System.Drawing.Point(329, 12);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(43, 13);
            this.label4.TabIndex = 9;
            this.label4.Text = "Servers";
            // 
            // button4
            // 
            this.button4.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.button4.Location = new System.Drawing.Point(466, 212);
            this.button4.Name = "button4";
            this.button4.Size = new System.Drawing.Size(114, 33);
            this.button4.TabIndex = 13;
            this.button4.Text = "Copy log to clipboard";
            this.button4.UseVisualStyleBackColor = true;
            this.button4.Click += new System.EventHandler(this.button4_Click);
            // 
            // chkAutoCreateRadioControls
            // 
            this.chkAutoCreateRadioControls.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.chkAutoCreateRadioControls.AutoSize = true;
            this.chkAutoCreateRadioControls.Checked = true;
            this.chkAutoCreateRadioControls.CheckState = System.Windows.Forms.CheckState.Checked;
            this.chkAutoCreateRadioControls.Location = new System.Drawing.Point(330, 117);
            this.chkAutoCreateRadioControls.Name = "chkAutoCreateRadioControls";
            this.chkAutoCreateRadioControls.Size = new System.Drawing.Size(187, 17);
            this.chkAutoCreateRadioControls.TabIndex = 7;
            this.chkAutoCreateRadioControls.Text = "Automatically create radio controls";
            this.chkAutoCreateRadioControls.UseVisualStyleBackColor = true;
            // 
            // txtOrganizer
            // 
            this.txtOrganizer.Location = new System.Drawing.Point(93, 222);
            this.txtOrganizer.Name = "txtOrganizer";
            this.txtOrganizer.Size = new System.Drawing.Size(74, 20);
            this.txtOrganizer.TabIndex = 10;
            // 
            // label7
            // 
            this.label7.AutoSize = true;
            this.label7.Location = new System.Drawing.Point(90, 206);
            this.label7.Name = "label7";
            this.label7.Size = new System.Drawing.Size(52, 13);
            this.label7.TabIndex = 13;
            this.label7.Text = "Organizer";
            // 
            // chkDeleteUnused
            // 
            this.chkDeleteUnused.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.chkDeleteUnused.AutoSize = true;
            this.chkDeleteUnused.Checked = true;
            this.chkDeleteUnused.CheckState = System.Windows.Forms.CheckState.Checked;
            this.chkDeleteUnused.Location = new System.Drawing.Point(330, 139);
            this.chkDeleteUnused.Name = "chkDeleteUnused";
            this.chkDeleteUnused.Size = new System.Drawing.Size(149, 17);
            this.chkDeleteUnused.TabIndex = 8;
            this.chkDeleteUnused.Text = "Delete runners not in XML";
            this.chkDeleteUnused.UseVisualStyleBackColor = true;
            // 
            // OEForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(592, 475);
            this.Controls.Add(this.chkDeleteUnused);
            this.Controls.Add(this.txtOrganizer);
            this.Controls.Add(this.label7);
            this.Controls.Add(this.chkAutoCreateRadioControls);
            this.Controls.Add(this.button4);
            this.Controls.Add(this.label4);
            this.Controls.Add(this.button3);
            this.Controls.Add(this.txtCompID);
            this.Controls.Add(this.label2);
            this.Controls.Add(this.listBox2);
            this.Controls.Add(this.button2);
            this.Controls.Add(this.listBox1);
            this.Controls.Add(this.groupBox1);
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.Name = "OEForm";
            this.Text = "LiveResults Client, UploadClient";
            this.FormClosing += new System.Windows.Forms.FormClosingEventHandler(this.OEForm_FormClosing);
            this.groupBox1.ResumeLayout(false);
            this.groupBox1.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.fileSystemWatcher1)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.fsWatcherOS)).EndInit();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.GroupBox groupBox1;
        private System.Windows.Forms.Button button1;
        private System.Windows.Forms.TextBox txtOEDirectory;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.FolderBrowserDialog folderBrowserDialog1;
        private System.Windows.Forms.ListBox listBox1;
        private System.Windows.Forms.Button button2;
        private System.IO.FileSystemWatcher fileSystemWatcher1;
        private System.Windows.Forms.ListBox listBox2;
        private System.Windows.Forms.Timer timer1;
        private System.Windows.Forms.TextBox txtCompID;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.Button button3;
        private System.IO.FileSystemWatcher fsWatcherOS;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.TextBox txtExtension;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.Label label5;
        private System.Windows.Forms.ComboBox cmbFormat;
        private System.Windows.Forms.Label lblFormatInfo;
        private System.Windows.Forms.TextBox txtZeroTime;
        private System.Windows.Forms.Label lblZeroTime;
        private System.Windows.Forms.Button button4;
        private System.Windows.Forms.CheckBox chkAutoCreateRadioControls;
        private System.Windows.Forms.TextBox txtURL;
        private System.Windows.Forms.Label label6;
        private System.Windows.Forms.Label txtRefreshTitle;
        private System.Windows.Forms.TextBox txtRefresh;
        private System.Windows.Forms.TextBox txtOrganizer;
        private System.Windows.Forms.Label label7;
        private System.Windows.Forms.CheckBox chkDeleteUnused;
    }
}