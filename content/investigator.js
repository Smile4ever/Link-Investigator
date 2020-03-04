// TODO: allow wildcards for "skipped" (wiki*.org)
// TODO: distinct list of broken URLs
// TODO: special support for linksearch
// see https://nl.wikipedia.org/w/index.php?title=Speciaal:VerwijzingenZoeken&limit=500&offset=0&target=http%3A%2F%2F%2A.wikibooks.org

/*
Copyright (c) 2008-2011 Jan Janetka, jan@janetka.sk
Copyright (c) 2018 Daniel Muñiz Fontoira, dani@damufo.com
Copyright (c) 2018-2019 Geoffrey De Belie, geoffreydebelie@zoho.com

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

let linkAnalyzer = {};
linkAnalyzer.popup = {};

linkAnalyzer = {	
	// -- first some useful functions --
	// ----------------------------------
	
	// replacement for long "docu.. getelementbyid .." 
	id: function (a, elem) {
		return (elem || document).getElementById(a);		
	},
	
	// get all elements by certain name
	elem: function (name, scope) { 
		// if scope is other then "null", it means we got a selection or link to deal with
		// we will need to get elements from all page and then just filter out those not in scope		
		if (scope != null) {
			// array for all elements in scope
			let r = new Array();
			// get elements with this tag name from whole page, using this same function
			let el = linkAnalyzer.elem (name);
			
			// loop through them and if they are in selection, push them into array			
			for (var i = 0; i < el.length; i++) {
				if (scope.containsNode(el[i], true)) {
					r.push(el[i]);
				} else {}	
			}
			
			// return this array of nodes in selection			
			return r;
		} else {
			return document.getElementsByTagName ( name );
		}
	},	
	
	// replacement for both set and get attribute
	attr: function (elem, attr, set) {
		return (set == null) ? elem.getAttribute(attr) : elem.setAttribute(attr, set);		
	},
	
	// will find selection on page and return true if it exists
	// if there is a parameter passed in, it will return the selection itself
	getSel: function () {
		let s = window.top.getSelection();
		return arguments.length == 0 ? s.rangeCount > 0 && s.toString().length > 0 : s;		
	},
	
	// deselect current selection on page
	deselect: function () {
		// get current selection
		let s = this.getSel(true);
		// remove range
		return s.removeRange( s.getRangeAt(0) );		
	},
	
	// set css to certain element
	css: function (elem, set) {
		for (let i in set) {
			elem.style[i] = set[i];			
		}		
	},
	
	// return current value of elements attribute
	currentCSS: function (elem, name) {
		if (elem.style[name]) {
        	return parseInt(elem.style[name]);
		} else {
        	let s = window.top.document.defaultView.getComputedStyle(elem,"");
        	return parseInt(s && s.getPropertyValue(name));	
		}
	},
	
	// get elements position from top
	getTop: function (elem) {
    	let p = 0;
	    while ( elem.offsetParent ) {
        	p += elem.offsetTop;
        	elem = elem.offsetParent;
    	}
		return p;
	},
	
	// get elements absolute position from left
	getLeft : function (elem ) {
		let p = 0;
		while ( elem.offsetParent ) {
        	p += elem.offsetLeft;
			elem = elem.offsetParent;
    	}
		return p;
	},
	
	// return true if argument "s" is url, otherwise false
	url: function (s) {
    	const regexp = /(ftp|http|https|\/\/):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
     	return regexp.test(s);
    },
	
	// will show certain element on page. If it is already showed, won't do anything
	show: function (el) {
		return (linkAnalyzer.attr(el, "hidden")) ? linkAnalyzer.attr(el, "hidden", false) : true;		
	},

	hide: function (el) {
		return linkAnalyzer.attr(el, "hidden") ? linkAnalyzer.attr(el, "hidden", true) : true;		
	},
	
	// this function is called on every link, option, area .. 
	// if goes through our 'omit list' - see preferences and return false if this link should be omited
	omit: function (a, parentElement) {
		if(linkAnalyzer.pref.hintsToRecognize == "" || linkAnalyzer.pref.hintsToRecognize == null){
			return true;
		}

		let hintsToRecognize = linkAnalyzer.pref.hintsToRecognize.split(","); 
		for (let hint of hintsToRecognize) {
			let realHint = hint.replace("~", "");
			if (a.includes(realHint)){
				return false;
			}

			if(parentElement != null && hint.includes("~")){
				if(parentElement.outerHTML.includes(realHint)){
					return false;
				}
			}
		}
		// being here means 'for' didn't return false
		return true;
	},
	
	// constructors for 2 objects that will be created for every check at the very begining
	// statistics - how many links were checked, how many were broken, how long did it take, etc
	// preferences - everything that can be set in preferences window (sent from the background script)
	statisticsConst: function () {
		this.linkFine =  new Array();
		this.linkBroken = new Array();
		this.linkTimeOut =	new Array();
		this.linkSkipped = new Array();
		this.linkInvalid = new Array();
		this.start = 0;		
		// current time
		this.atm = null;
		// difference between start and end time
		this.diff =	null;
	},

	// default preferences	
	prefConst: function () {    
		this.linkFine = "#B2FFB7";
		this.linkBroken = "#CC0000";
		this.timedOut = "#FFCC99";
		this.linkSkipped = "#CCCCCC";
		this.linkInvalid = "#999900";
		this.secondsTimeOut = 45;
		this.showStats = false;
		this.hideStatsAfter = 0;

		this.anchor = true;
		this.option = true;
		this.area = true;
		this.hintsToRecognize = "~logoff,~logout,~signoff";
	},

	pref: null,
	statistics: null,
	
	// -- end of helping functions, below are the real functions, doing something cool --
	// ----------------------------------------------------------------------------------
	
	showHideEvent: function () {
		// id of menu item with option to check just selection
		let p = linkAnalyzer.id ("pinger-selected-links");
		
		// 	if there is selection, then r will equal false (don't hide), otherwise true (hide it)
		let r = linkAnalyzer.getSel() ? false : true;
		
		// show or hide menu item, depending on existence of selection
		linkAnalyzer.attr (p, "hidden", r);
	},	
	
	// this function will handle any results - styling link, chaning colors, titles, etc
	handler: function (r, el, status, extra) {
		let color = linkAnalyzer.pref[r];
		
		// add this to it's appropriate statistic array
		linkAnalyzer.statistics[r].push(el);
		
		let statusText = status != null ? " (code " + status + ")" : "";
		let extraText = extra != null ? " (code " + status + ", " + extra + ")" : statusText;
		let statusHuman = r.replace("link", "").toLowerCase();
		
		linkAnalyzer.attr(el, "title", "This link was marked as \"" + statusHuman + "\"" + extraText);
		
		// and last, let's check if we didn't check all links already
		let temp = linkAnalyzer.statistics.linkFine.length + 
			linkAnalyzer.statistics.linkBroken.length + 
			linkAnalyzer.statistics.linkTimeOut.length + 
			linkAnalyzer.statistics.linkSkipped.length +
			linkAnalyzer.statistics.linkInvalid.length;
			
		if (temp == linkAnalyzer.statistics.start) {
			linkAnalyzer.end();
		}
		
		if (r == "broken") {
			this.handleBrokenImages (el);		
		}

		// Set code to link
		el.setAttribute("data-statuscode", status);
		
		// change CSS of this link
		return linkAnalyzer.css(el, {backgroundColor: color});
	},
	
	// this function is call on every found broken link
	// if link is "area", or image wrapped around link (that is broken), we create an overlay
	// with color of broken link, from preferences and we put this overlay over the image
	// additional functions used : this.getTop, getLeft, currentCSS
	handleBrokenImages: function (el) {
		let tag = el.nodeName.toLowerCase();
		// if we are dealing with area
		if (tag == "area") {
			// we need to find image associated with this area
			// get all images
			let images = linkAnalyzer.elem ("img");
			for (let image of images) {
				// get their "usermap" attr
				let usemap = linkAnalyzer.attr (image, "usemap");
				// if usemap exicts, check if it's the one we are looking for					
				if (usemap && usemap == "#" + el.parentNode.id) {
					// this is the image we need to color
					// create overlay for this image
					linkAnalyzer.createOverlay (image);												
				}	
			}			
		} else if (tag == "a" && el.childNodes[0].nodeName.toLowerCase() == "img") {
			// this is an image we need to cover
			linkAnalyzer.createOverlay (el.childNodes[0]);
		} else {
			// probably an "option" tag or anchor with no image within ..
		}
		
		return true;
	},
	
	// creates an overlay over image within broken link
	createOverlay: function (el) {
		let overlay = window.top.document.createElement("div");
		window.top.document.body.appendChild ( overlay );
						
		// el => image we need to cover						
		// next we will set CSS for this overlay so it will cover image "el"
												
		linkAnalyzer.css ( overlay, { background: linkAnalyzer.pref.linkBroken,
						opacity: "0.6",
						display: "block",
						position: "absolute",
						top: linkAnalyzer.getTop ( el ) + "px",
						left: linkAnalyzer.getLeft ( el ) + "px",
						width: linkAnalyzer.currentCSS ( el , "width" ) + "px",
						height: linkAnalyzer.currentCSS ( el , "height" ) + "px"
		});
		
		return true;		
	},
	
	// function to get http response code of url
	getHTTP: function (el) {
		let xml = new XMLHttpRequest();
		
		// if we are dealing with a link or area tag, then we get it's .href, otherwise it's probably value from option
		let tag = el.nodeName.toLowerCase();		
		let url = (tag == "a" || tag == "area") ? el.href : linkAnalyzer.attr (el, "value");
				
		let requestDone = false;	
		
		setTimeout(function() { 
			// at this point, XX seconds passed for this request
			// requestDone should be true - it's all fine
			// if it's "false", it means this request timed out
			if (!requestDone) {
				// stop this request
				requestDone = true;
				linkAnalyzer.handler ("linkTimeOut", el);				
			}
		}, (linkAnalyzer.pref.secondsTimeOut * 1000));
		
		xml.onreadystatechange = function() {
        	if ( xml.readyState == 4 && !requestDone ) {
				// responds with status between 200 and 300 are good, 0 means localhost or redirect, otherwise broken
				let betweenValidRange = (xml.status >= 200 && xml.status < 300) || xml.status == 405; // 405 Method Not Allowed

				let response = "";
				let extra = null;

				if (betweenValidRange) {
					response = "linkFine";
				}else{
					response = "linkBroken";
				}

				if (xml.status == 0){
					response = "linkInvalid";
				}

				// Extra - broken via URL
				let isBroken = (xml.responseURL.includes("404") && !xml.url.includes("404")) || (xml.responseURL.includes("error") && !xml.url.includes("error"));
				response = isBroken ? "linkBroken" : response;
				if(isBroken){
					extra = "responseURL indicates 404";
				}
				
				// Extra - broken via GET response
				if(xml.method == "GET" && xml.responseText == ""){
					response = "linkBroken";
					extra = "empty response using GET";
				}

				// Extra - broken via redirect			
				let responseUrl = new URL(xml.responseURL).pathname;
				let requestUrl = new URL(xml.url).pathname;
				
				let specialBlacklistForLevenstein = ["Aptaca","Arbennek","Arbennig","Arnawlı","Arnaýı","Astamiwa","Baxse","Berezi","Dibar","Doxmeli","Er_lheh","Erenoamáš","Eri","Especial","Espesial","Espesiat","Espesiál","Espesyal","Extra","Husus","Ibidasanzwe:","Ihü_kárírí","Immikkut","Ippiziari","Ispetziale","Istimewa","Istimiwa","Jagleel","Kerfissíða","Khas","Kusuih","Maalum","Maasus","Mahsus","Manokana","Maxsus","Mba\'echĩchĩ","Natatangi","Nōncuahquīzqui","Papa_nui","Patikos","Pinaurog","Posebno","Pàtàkì","Sapak","Sapaq","Schbezial","Schbädsjaal","Serstakt","Seviškuo","Sipeciås","Sipesol","Soronko","Specala","Speciaal","Special","Specialaĵo","Speciale","Specialine","Specialis","Specialne","Specialnje","Specialus","Speciaol","Speciel","Specioal","Speciàle","Speciális","Speciální","Speciâl","Specjalna","Specjalnô","Specēlos","Speisialta","Spesiaal","Spesial","Spesyal","Spezial","Speçiale","Speċjali","Spiciali","Spèciâl","Spécial","Syndrig","Szpecyjalna","Sònraichte","Tallituslehekülg","Taybet","Toiminnot","Uslig","Uzalutno","Wiki","Xususi","Xüsusi","Xısusi","khaas","Özel","Ýörite","Đặc_biệt","Špeciálne","Ειδικό","Ειδικόν","Адмысловае","Аналлаах","Арнайы","Атайын","Башка тевень","Башка","Белхан","Вижа","Къуллугъирал_лажин","Къуллукъ","Көдлхнә","Лӱмын_ыштыме","Махсус","Нарочьна","Отсасян","Панель","Посебно","Сæрмагонд","Служебная","Специални","Специјална","Спеціальна","Спецӹлӹштӓш","Спэцыяльныя","Тусгай","Тускай","Тусхай","Цастәи","Шпеціална","Ятарлă","Սպասարկող"];
				let specialBlacklisted = specialBlacklistForLevenstein.some((value) => requestUrl.includes(value + ":"));
				
				let blacklistForLevenstein = [""];
				let blacklisted = blacklistForLevenstein.some((value) => requestUrl.includes(value));
				
				// request
				// http://www.hln.be/hln/nl/957/Belgie/article/detail/1085059/2010/03/25/Jean-Marie-Dedecker-beschuldigd-van-gesjoemel.dhtml
				
				// response
				// https://myprivacy.dpgmedia.be/?siteKey=Uqxf9TXhjmaG4pbQ&callbackUrl=https%3a%2f%2fwww.hln.be%2fprivacy-wall%2faccept%3fredirectUri%3d%2fhln%2fnl%2f957%2fBelgie%2farticle%2fdetail%2f1085059%2f2010%2f03%2f25%2fJean-Marie-Dedecker-beschuldigd-van-gesjoemel.dhtml
				let decodedResponseUrl = decodeURIComponent(xml.responseURL);			
				if(decodedResponseUrl.includes("redirect") && decodedResponseUrl.lastIndexOf("://") > 10){
					responseUrl = decodedResponseUrl.substring(decodedResponseUrl.indexOf("redirect") + 8);
				}
				
				let levenstein = similarity(responseUrl, requestUrl);
				if(levenstein < 0.70 && responseUrl.length < requestUrl.length && !blacklisted && !specialBlacklisted){
					response = "linkBroken"
					extra = "redirect to homepage (" + parseInt(levenstein * 100) + "% similarity)";
				}

				// Color the link according to the response
				linkAnalyzer.handler (response, el, xml.status, extra);
				// Finish the request
				requestDone = true;
				// Empty 'xml' object
				xml = null;				
        	}
    	};
		
		let method = "HEAD";
		if(url.includes("volcano.si.edu")){
			method = "GET";
		}
		xml.open(method, url, true);
		xml.withCredentials = true;
		// Workaround for the fact that the xml object has no requestUrl property
		xml.url = url;
		xml.method = method;
		xml.send();
	},
	
	// checking function, can be called from context menu
	check: function (context, infoLinkUrl) {
		// if preferences exists, it means there is ongoing check in another window .. 
		//if (linkAnalyzer.pref) { return; }
		// load new preferences for this check
		//linkAnalyzer.pref = new linkAnalyzer.prefConst();
		// create new object from statistics
		linkAnalyzer.statistics = new linkAnalyzer.statisticsConst();
		
		// set when we started this check
		linkAnalyzer.statistics.atm = new Date().getTime();
		
		// Are we checking the whole document, or just selection ?
		// If there are any parameters passed with function, it means we are checking a selection
		let scope = context === "selection" ? linkAnalyzer.getSel(true) : null;
		
		// Let's get all links in this scope
		let anchor = linkAnalyzer.pref.anchor ? linkAnalyzer.elem ("a", scope) : new Array();

		// Support for link context
		if(context == "link" && infoLinkUrl != null){
			// Look for absolute link
			let elements = document.querySelectorAll("a[href='" + infoLinkUrl + "']");
			
			if(elements.length == 0){
				// Check if root relative link can be found on the page
				let path = new URL(infoLinkUrl).pathname;
				elements = document.querySelectorAll("a[href='" + path + "']");
				
				if(elements.length == 0){
					// Check if relative link can be found on the page
					let aElements = document.querySelectorAll("a");
					for(let aElement of aElements){
						if(aElement.href == infoLinkUrl){
							elements.push(aElement);
						}
					}
				}
			}

			for(let element of elements){
				anchor.push(element);
			}
		}
		
		linkAnalyzer.statistics.start = anchor.length;
		
		// loop through each link
		for (var i = 0; i < anchor.length; i++) {
			/*if(anchor[i] == null){
				continue;
			}*/
			
			// filter out anchor links to page we are currently on and links with other protocol then http(s)
			if ((anchor[i].href || "#").indexOf("#") != 0 && (anchor[i].href.indexOf("http") == 0 || anchor[i].href.indexOf("file") == 0) && linkAnalyzer.omit(anchor[i].href, anchor[i].parentElement)) {
				// getHTTP will also color link and all other things by passing it with result to function "handler"
				linkAnalyzer.getHTTP(anchor[i]);				
			} else {
				// this link will be skipped
				linkAnalyzer.handler("linkSkipped", anchor[i]);
			}
		}
		
		// ----------------------------------------------
		// Now let's do something similiar for option tags
		let option = linkAnalyzer.pref.option ? linkAnalyzer.elem ("option", scope) : new Array();
		// loop through all option tags
		for (var i = 0; i < option.length; i++) {
			// first, we need to check if they have "value" tag and then if it contains a link
			var value = linkAnalyzer.attr( option[i], "value" );
			// we need to get around //www.. links
			if (value && value.indexOf("//") == 0) {
				value = "http:" + value;
				linkAnalyzer.attr( option[i], "value", value );
			}
			
			if (value && linkAnalyzer.url(value) && linkAnalyzer.omit(value)) {
				linkAnalyzer.statistics.start++;
				linkAnalyzer.getHTTP(option[i]);				
			} else { 
				// not a link, don't do anything
			}
		}
		
		// for <area> tags
		var area = linkAnalyzer.pref.area ? linkAnalyzer.elem ("area", scope) : new Array();
		// loop through area elements
		for (var i = 0; i < area.length; i++) {
			// the exact control as in case of <a> tags .. we need to make sure that it's not anchor to ID on this same page 
			// and that it's http/https link..
			if ((area[i].getAttribute("href") || "#").indexOf("#") != 0 && area[i].href.indexOf("http") == 0 && linkAnalyzer.omit(area[i].href, anchor[i].parentElement)) {
				linkAnalyzer.getHTTP(area[i]);				
			} else {
				// this link will be skipped
				linkAnalyzer.handler("linkSkipped", area[i]);
			}
			linkAnalyzer.statistics.start++;
		}
		
		// --------------------------------------------
		// if there is a scope, then we need to deselect selected text on page
		scope ? linkAnalyzer.deselect() : null;
        //scope ? linkAnalyzer.pref = null : null;
	},
	
	// end function, to say what we found..
	end: function () {	
		// .diff variable will hold difference between start and actual time, so we know how long it took to check the page
		linkAnalyzer.statistics.diff = ( Math.round ( (new Date().getTime() - linkAnalyzer.statistics.atm) / 1000) );
		
		// EYE CANDY
		// this will dim the whole screen and show statistics
		// only show if user has checked it in his preferences
		if (linkAnalyzer.pref.showStats) {
			linkAnalyzer.popup.init();	
		}
		
		sendMessage("updateBrowserAction", JSON.stringify(linkAnalyzer.statistics));
		
		//linkAnalyzer.pref = null;
		//linkAnalyzer.statistics = null;
		//linkAnalyzer.hide ( linkAnalyzer.id ( "pingerSb" ) );
	}
};

linkAnalyzer.popup = {
	init: function () {
		// let's create an empty "div" element to hold the "black" screen
		let overlay = window.top.document.createElement ("div");
		// append it to body of webpage we are in
		window.top.document.body.appendChild ( overlay );
		// set CSS
		linkAnalyzer.css ( overlay, {	background: "#000",	
					opacity: "0", 
					display: "block", 
					position: "absolute", 
					top: "0px", 
					left: "0px", 
					width: linkAnalyzer.popup.getWidth() + "px", 
					height: linkAnalyzer.popup.getHeight() + "px", 
					zIndex: "99",
					cursor: "pointer"});
		
		// and fade in !
		linkAnalyzer.popup.fadeIn ( overlay, 60, 4 );
		
		// add event listener for clicking on this black background
		// whenever user do so, it means we need to hide it completele
		// and also hide the statistics box
		overlay.addEventListener("click", function () { 
			linkAnalyzer.popup.fadeOut ( overlay, 0, 4 );
			linkAnalyzer.popup.fadeOut ( stats, 0, 4 );
			// if there are any broken links, then there is "additional" window
			if (additional != null) {
				linkAnalyzer.popup.fadeOut ( additional, 0, 4 );
			}
		}, false);
				
		// Screen is in cool black 
		// Now we need to create some sort of information table, about statistics from this check
		// 1 div to hold it all within
		let stats = window.top.document.createElement ("div");
		// append it just beneath our overlay
		window.top.document.body.appendChild ( stats );
		// set CSS
		// first we will make it rounded - i have not figured out how to put this into .css() function, because of "-" at the beginning :((
		linkAnalyzer.attr( stats, "style", "border-radius: 1em");
		// and now we cat adjust all other CSS		
		linkAnalyzer.css ( stats , { position: "fixed",
					top: "100px",
					left: "30%",
					width: "650px",
					maxHeight: "350px",
					zIndex: "100",
					background: "#fff",
					display: "block",
					textAlign: "left",
					fontFamily: "arial,sans-serif",
					fontSize: "12px",
					color: "#000",
					padding: "5px 10px 10px 20px",
					"overflow-y": "auto" });
		
		/* Custom styles */
		let styleTitleElement = "font-size: 20px; color: #000; font-weight: bold; padding-bottom: 5px; margin-bottom: 5px; border-bottom: 2px solid #5595ff;";
		let styleSup = "color: #666666; font-size: 10px";
		let styleH2brokenLinks = "color: #000; font-weight: bold; padding-bottom: 5px; margin-bottom: 5px;";
		
		/* Icon */
		let iconElement = document.createElement("img");
		iconElement.src = browser.runtime.getURL("icons/link-investigator-64.png");
		iconElement.style.width = "22px";
		iconElement.style.height = "22px";
		iconElement.style.display = "inline-block";
		iconElement.style.marginRight = "5px";

		/* Title */
		let titleElement = document.createElement("div");
		titleElement.style.cssText = styleTitleElement;

		let content = document.createTextNode(browser.i18n.getMessage("extensionName"));
		
		titleElement.appendChild(iconElement);
		titleElement.appendChild(content);

		stats.appendChild(titleElement);

		let generateItemForLegend = function(messageId){
			let invalidContentContainer = document.createElement("span");
			invalidContentContainer.style.cssText = styleSup;
			content = document.createTextNode(browser.i18n.getMessage(messageId).replace("{secondsTimeOut}", linkAnalyzer.pref.secondsTimeOut));
			invalidContentContainer.appendChild(content);

			return invalidContentContainer;
		};

		let generateIcon = function(iconName, title, size){
			let imageElement = document.createElement("img");

			if(iconName == ""){
				iconName = "alert";
				imageElement.style.visibility = "hidden";
			}
			

			if(size == undefined){
				size = "16px";
			}

			imageElement.src = browser.runtime.getURL("/icons/" + iconName + ".png");
			imageElement.style.width = size;
			imageElement.style.height = size;
			imageElement.style.marginRight = "4px";
			imageElement.title = title;

			return imageElement;
		}

		// Alert icon sourced from https://www.flaticon.com/free-icon/alert_550096?term=alert&page=1&position=6
		// Emojis sourced from https://www.flaticon.com/packs/emojis-13
		// Monkey from https://freesvg.org/happy-monkeys

		// Conclusion init
		let conclusionIconSet = false;
		const conclusionIconSize = "64px";
		let conclusionElement = document.createElement("div");
		conclusionElement.style.padding = "10px 200px 10px 200px";

		// Links Fine
		if(linkAnalyzer.statistics.linkFine.length >= 0){
			let line = document.createElement("p");

			line.appendChild(generateIcon("cool", "Fine"));

			content = document.createTextNode(browser.i18n.getMessage('linksFineLabel') + ": " + linkAnalyzer.statistics.linkFine.length );
			line.appendChild(content);
			line.appendChild(document.createElement("BR"));

			line.appendChild(generateItemForLegend("linksFinePopup"));

			stats.appendChild(line);
		}

		// Links Broken
		if(linkAnalyzer.statistics.linkBroken.length > 0){
			let line = document.createElement("p");
			
			line.appendChild(generateIcon("dead", "Dead"));

			content = document.createTextNode(browser.i18n.getMessage("linksBrokenLabel") + ": " + linkAnalyzer.statistics.linkBroken.length );
			line.appendChild(content);
			line.appendChild(document.createElement("BR"));

			line.appendChild(generateItemForLegend("linksBrokenPopup"));

			stats.appendChild(line);

			if(!conclusionIconSet){
				conclusionElement.appendChild(generateIcon("dead", "Dead", conclusionIconSize));
				conclusionIconSet = true;
			}
		}

		// Links Timed Out
		if(linkAnalyzer.statistics.linkTimeOut.length > 0){
			let line = document.createElement("p");

			line.appendChild(generateIcon("alert", "Timed out"));

			content = document.createTextNode(browser.i18n.getMessage("linksTimeOutLabel") + ": " + linkAnalyzer.statistics.linkTimeOut.length );
			line.appendChild(content);
			line.appendChild(document.createElement("BR"));

			line.appendChild(generateItemForLegend("linksTimeOutPopup"));

			stats.appendChild(line);

			if(!conclusionIconSet){
				conclusionElement.appendChild(generateIcon("alert", "Timed out", conclusionIconSize));
				conclusionIconSet = true;
			}
		}

		// Links Invalid
		if(linkAnalyzer.statistics.linkInvalid.length > 0){
			let line = document.createElement("p");

			line.appendChild(generateIcon("alert", "Invalid"));

			content = document.createTextNode(browser.i18n.getMessage("linksInvalidLabel") + ": " + linkAnalyzer.statistics.linkInvalid.length );
			line.appendChild(content);
			line.appendChild(document.createElement("BR"));
			
			line.appendChild(generateItemForLegend("linksInvalidPopup"));

			stats.appendChild(line);

			if(!conclusionIconSet){
				conclusionElement.appendChild(generateIcon("alert", "Invalid", conclusionIconSize));
				conclusionIconSet = true;
			}
		}

		// Links Skipped
		if(linkAnalyzer.statistics.linkSkipped.length > 0){
			let line = document.createElement("p");
			
			line.appendChild(generateIcon("muted", "Skipped"));

			content = document.createTextNode(browser.i18n.getMessage("linksSkippedLabel") + ": " + linkAnalyzer.statistics.linkSkipped.length );
			line.appendChild(content);
			line.appendChild(document.createElement("BR"));

			line.appendChild(generateItemForLegend("linksSkippedPopup"));
			line.appendChild(document.createElement("BR"));
			
			stats.appendChild(line);
		}

		// Test duration
		/*let testDuration = document.createElement("P");
		content = document.createTextNode(browser.i18n.getMessage("testDuration") + ": " + linkAnalyzer.statistics.diff + " " + browser.i18n.getMessage("seconds"));
		testDuration.appendChild(content);

		stats.appendChild(testDuration);*/
   
		// Conclusion finish
		if(!conclusionIconSet){
			//content = document.createTextNode("Everything good!");
			//conclusionElement.appendChild(content);
			//conclusionElement.appendChild(generateIcon("cool", "Fine", conclusionIconSize));
			conclusionElement.appendChild(generateIcon("monkey", browser.i18n.getMessage("conclusionFine"), "180px"));
			conclusionIconSet = true;
		}
		stats.appendChild(conclusionElement);
		

		// Show broken link if exists
		if (linkAnalyzer.statistics.linkBroken.length > 0) {		
			let h2brokenLinks = document.createElement("H2");
			h2brokenLinks.style.cssText = styleH2brokenLinks;
			content = document.createTextNode(browser.i18n.getMessage("linksBrokenLabel"));
			h2brokenLinks.appendChild(content);

			stats.appendChild(h2brokenLinks);

			let brokenLinks = document.createElement("P");
			// loop through each of the broken links
			for (let linkBroken of linkAnalyzer.statistics.linkBroken) {			
				content = document.createTextNode(linkBroken.getAttribute("data-statuscode") + " ");
				brokenLinks.appendChild(content);
				
				let link = document.createElement("a");
				link.href = linkBroken.href;
				link.target = "_blank";
				content = document.createTextNode(linkBroken.href);
				link.appendChild(content);
				brokenLinks.appendChild(link);

				content = document.createTextNode(" " + (linkBroken.innerHTML || linkAnalyzer.attr (linkBroken, "alt")).replace("<", "&lt;").replace(">", "&gt;"));
				brokenLinks.appendChild(content);

				//brokenLinks.appendChild(linkBroken);
				brokenLinks.appendChild(document.createElement("BR"));
			}
			
			stats.appendChild(brokenLinks);
		}
		
		if(linkAnalyzer.statistics.linkBroken.length > 0 || linkAnalyzer.statistics.linkInvalid.length > 0 || linkAnalyzer.statistics.linkTimeOut.length > 0){
			if(linkAnalyzer.pref.hideStatsAfter != 0 && linkAnalyzer.pref.hideStatsAfter != undefined){
				setTimeout(function(){
					overlay.click();
				}, linkAnalyzer.pref.hideStatsAfter * 1000);
			}
		}else{
			return; // don't show popup
		}
	},
	
	// following 2 functions are from John Resig : Pro JavaScript techniques . Awesome book btw ! :)
	// I just modified them a little to be completely stand-alone and to fit this extension
	fadeIn: function ( elem, to, speed ) {
    	for ( let i = 0; i <= 100; i += 5 ) {
        	(function(){
        		let opacity = i;
        		setTimeout(function(){
					elem.style.opacity = (( opacity / 100 ) * to) / 100;
            	}, ( i + 1 ) * speed );
        	})();
    	}
	},	

	fadeOut: function ( elem, to, speed ) {
		for ( let i = 0; i < 60; i += 5 ) {
			(function() {
				let opacity = i;
				setTimeout(function() {
					elem.style.opacity = (elem, 60 - opacity) / 100;
					if ( opacity == 55 )
						elem.style.display = "none";
				}, ( i + 1 ) * speed );
			})();
		}
	},
	
	getHeight: function () {
		// take the maximum viewable height, to also dim the part we don't currently see

		// https://stackoverflow.com/questions/1145850/how-to-get-height-of-entire-document-with-javascript
		let body = document.body;
		let html = document.documentElement;

		return Math.max( body.scrollHeight, body.offsetHeight,
                       html.clientHeight, html.scrollHeight, html.offsetHeight );
	},
	
	getWidth: function() {
		// take the maximum viewable width, to also dim the part we don't currently see

		let body = document.body;
		let html = document.documentElement;

		return Math.max( body.scrollWidth, body.offsetWidth,
                       html.clientWidth, html.scrollWidth, html.offsetWidth );
	}
};

browser.runtime.onMessage.addListener(request => {
	linkAnalyzer.pref = {
		linkFine: request.linkFine,
		linkBroken: request.linkBroken,
		linkTimeOut: request.linkTimeOut,
		linkSkipped: request.linkSkipped,
		linkInvalid: request.linkInvalid,
		secondsTimeOut:  request.secondsTimeOut,
		showStats: request.showStats,
		hideStatsAfter: request.hideStatsAfter,     
		anchor: request.anchor,
		option: request.option,
		area: request.area,
		hintsToRecognize: request.hintsToRecognize
	};

	if (request.scope == "page") {
		linkAnalyzer.check("page");
	} else if (request.scope == "selection") {
		linkAnalyzer.check("selection");
	} else if (request.scope == "link") {
		linkAnalyzer.check("link", request.infoLinkUrl);
	}
  
	//return Promise.resolve({response: "Rematou de comprobar"});
});

// https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely
function similarity(s1, s2) {
	let longer = s1;
	let shorter = s2;
	
	if (s1.length < s2.length) {
		longer = s2;
		shorter = s1;
	}
	
	let longerLength = longer.length;
	if (longerLength == 0) {
		return 1.0;
	}
	
	return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  let costs = new Array();
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function sendMessage(action, data){
	browser.runtime.sendMessage({"action": action, "data": data});
}
