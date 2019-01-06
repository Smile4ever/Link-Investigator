# Link Investigator

Investigates the HTTP status of links in a webpage, selection or link. Based on  https://github.com/damufo/link-analyzer

## Features
* Detection and color coding: different colors indicate different statuses of availability or unavailability of links
* Shows the HTTP status of a link when you hover it, including the reason why it got color-coded as such
* Browser action button, to quickly check a webpage
** The counter will be set to indicate that some unavailable links were found
** The counter will be set shortly in green when all links are available
** The tooltip, which can be seen on hover of the button, displays information about the last check on the current tab
* F4, a shortcut to check all links on a webpage
* Shift+F4, a shortcut to check all links in a selection
* Overview window, showing you an overview
** The overview window can be hidden automatically after a timeout
** The overview window is off by default, but can be enabled on the options page
* Options page, where you can set the colors used

## Detection of dead links
###Indicators
Aside from the HTTP status code, a few other indicators are used to mark a page as invalid:
* the response returned is empty for websites configured to use GET requests. (note: HEAD requests are always empty so that's expected behaviour). Link Investigator uses HEAD requests by default. ("empty response using GET")
* the responseUrl contains "404" or "error" ("responseURL indicates 404")
* the Levenshtein distance between the requested URL and the responseUrl is less than 70 percent ("redirect to homepage")

These additional reasons are shown when you hover the specific link which might trigger this behaviour.

As you might guess, these indicators indicate that there is a high chance that there is something wrong with the URLs checked. These aren't 100% accurate though and might return a few false positives. In real life tests, these were an extra asset, catching broken or invalid links that wouldn't have been catched otherwise.

[//]: # (If you'd like to disable these extra indicators, you can do that on the options page. -- TODO: FIXME)

### Skipped links
Some links are not checked, these include JavaScript URLs by default, and links that are related to login and logout. These can be extended by you, the user, by going to the options page where you can add extra keywords.

### Notes about the link context
The "link" context doesn't know which link you clicked, only the URL that was associated with that link. As such, it can happen that multiple elements on the page with the same URL are highlighted while you expect only one element to be highlighted.

## Localisation
Feel free to translate Link Investigator into your own language and submit a pull request. If you need help with this, open an issue on GitHub and I'll be glad to assist you.

These languages are already translated:
* Dutch (Nederlands)
* English
* Galician (Galego)

## Related addons
* https://addons.mozilla.org/addon/get-archive to retrieve (alive) archived versions for dead links using Internet Archive among other digital archival services

## Support and development
### Support assistance
If you notice there are bugs in Link Investigator, open an issue and let me know about it.

### Support the development
If you want to support my work, you're most welcome to send me a donation: https://paypal.me/Smile4ever
