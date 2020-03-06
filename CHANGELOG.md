1.3.0 (2020-03-06)
==================
* Statistics popup:
** Add a section for invalid and timed out links when found
* Set default timeout to 15 seconds instead of 45 seconds
* Automatically retrieve addon version for options page
* Expand README with more personal rules for the exclude list
* Rephrase some options

1.2.0 (2020-03-04)
==================
* Rework statistics popup:
** Rephrase explanations in statistics popup
** Add icons to every category
** Add a conclusion icon, to see whether a page contains dead links (dead emoji) or all links are alive (monkey image)
** Broken links: rework to be proper links
** Remove test duration feature
* Use let instead of var
* Remove use of innerHTML in investigator.js

1.1.0 (2020-02-23)
==================
* Introduce ~ to match "more or less" which means parent elements also get checked
* Expand the README file
* Change the default skip links containing to ~logoff,~logout,~signoff

1.0.2 (2019-01-06)
==================
* Fix bug with localisations
* Fix bug with logout being triggered on MediaWiki sites
* Fix bug: Levenstein needs a blacklist, implemented for Special pages on MediaWiki

1.0.1 (2019-01-06)
==================
* Hotfix: keywords cause Link Investigator not to work, needs more investigation

1.0.0 (2019-01-06)
==================

Version 1.0.0 is the first version of Link Investigator.

Changes compared to Link Analyzer:
* Add a Dutch localisation
* Add browser button to check the current page
** The button also indicates whether a page loaded succesfully or not
** The tooltip shows the amount of dead / skipped links versus the total links checked
** The counter will be set to indicate that some unavailable links were found
** The counter will be set shortly in green when all links are available
* Shortcuts: make them work
** The default shortcut to check a page is F4
** The default shortcut to check a selection is Shift+F4
* Add extra checks to detect more accurately whether links work (see README)
* Instead of only the HTTP status, also show the reason why it got color-coded as such

Options page:
* Rephrased some options
* Add option to automatically hide the statistics pop-up, after a set time of seconds (can be customized)
* Use a textarea for links to skip instead of a input field

And some organisational changes:
* Change the PayPal.me link
* Change the name, version and author
