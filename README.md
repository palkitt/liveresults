# LiveRes
LiveRes is a client-server system for publishing live results from sport events. The web frontend is published here: http://liveres.live. Admin page requires user/password. For questions and to get login information contact: Pål Kittilsen, pal.kittilsen@gmail.com

[Norwegian user guide](https://docs.google.com/document/d/1MGTH807QShXwFZVL1RiB1azCDjvMclou3DKP0TuHw84)

This project is forked from Peter Löfås's [liveresults](https://github.com/petlof/liveresults). 

New and improved features compared to original project:

* Interface to eTiming with support of individual, mass start, chase start, relay, lap time race. Radio control setup is read from eTiming and automatically configured. Supports both Access and SQL server
* Interface to Brikkesys with support of individual and chase start races
* Animated transitions in result table
* Ecard split times (optional)
* Estimated radio times when missing times for runners. 
* Shifting of radio times of multi pass controls that fits better with average split times of the class. 
* Auto hiding of radio controls if bad quality (less than 1/3 of runners registered)
* Integration with Torgeir Aune's [ecard check program](https://github.com/Taune/EmiTagCheck)
* Responsive web design (mobile phone friendly). Scroll view if too narrow view
* Shows live rank number on approaching intermediate time and in finish with difference to current leader
* Highlight single intermediate times (not just whole row) if race with radio controls
* Relay and chase start views including total time and leg times (with ranking number)
* Support for classes with no-time or no-rank show
* Column for bib number with optional sorting
* Start list and complete result list view
* Organizer views
   * Speaker page with bib numer search and automatically class lookup and runner highlighting
   * Complete start list with ecard numbers and possibility for runners to send ecard number change messages
   * Live scroll of finish
   * Live scroll of any selected radio control or all radio controls in a single view
   * Start view showing line up for start. Integrated message system for communication with race admin
   * Left in forest function
* Admin page:
   * Configurable highlight duration
   * Select one or two lines view by default
   * Tenths of seconds resolution
   * Qualification or price limit setting
   
![Mobile view](Doc/LiveResiPhone.png?raw=true "Example of mobile view")
![Mobile animated](Doc/AnimatedResultsCrop.gif?raw=true "Example of animated mobile view")
![Class view](Doc/classview.png?raw=true "Example of class view")
![Guide](web/images/LiveResGuide.jpg?raw=true "LiveRes guide")
