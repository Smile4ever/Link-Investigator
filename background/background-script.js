"use strict";

const amo = /^https?:\/\/(discovery\.)?(addons\.mozilla\.org|testpilot\.firefox\.com)|^about:/i;

let settings = {};
// Default settings. If there is nothing in storage, use these values.
const defaultSettings = {
	linkFine: "#B2FFB7",
	linkBroken: "#CC0000",
	linkTimeOut: "#FFCC99",
	linkSkipped: "#CCCCCC",
	linkInvalid: "#999900",
	secondsTimeOut: 15,
	showStats: false,
	hideStatsAfter: 0,
	anchor: true,
	option: true,
	area: true,
	hintsToRecognize: "~logoff,~logout,~signoff"
};
const icon_64 = "icons/link-investigator-64.png";
const icon_512 = "icons/link-investigator-512.png";

// Create context menus
browser.contextMenus.create(getContextMenu('page'));
browser.contextMenus.create(getContextMenu('link'));
browser.contextMenus.create(getContextMenu('selection'));

function getContextMenu(context){
	return {
		id: 'menu-link-investigator-' + context,
		title: browser.i18n.getMessage('menu' + context.substring(0, 1).toUpperCase() + context.substring(1)),
		contexts: [context],
		icons: {
			"64": icon_64,
			"512": icon_512
		},
		documentUrlPatterns: ['<all_urls>'],
		onclick : check
	};
}


browser.browserAction.onClicked.addListener((tab) => {
	check({"menuItemId": "menu-link-investigator-page"}, tab);
});

browser.browserAction.setTitle({
	title: browser.i18n.getMessage("browserButtonTitle")
});

browser.commands.onCommand.addListener(function(command) {
	browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
		check({"menuItemId": "menu-link-investigator-" + command.replace("check-", "")}, tabs[0]);
	}, console.error);	
});

function getSettings() {
	return new Promise((resolve, reject) => {
		browser.storage.local.get("settings", (value) => {
			for (let i in defaultSettings) {
				if (value.settings != undefined && value.settings[i] != undefined) {
					settings[i] = value.settings[i];
				} else {
					settings[i] = defaultSettings[i];
				}
			}
			resolve(settings);
		});
	})
}

function check(info, tab){
	let scope = info.menuItemId.split('-').pop();
	
	getSettings().then(function () {
		browser.tabs.sendMessage(tab.id, {scope: scope,
			linkFine: settings.linkFine,
			linkBroken: settings.linkBroken,
			linkTimeOut: settings.linkTimeOut,
			linkSkipped: settings.linkSkipped,
			linkInvalid: settings.linkInvalid,
			secondsTimeOut: settings.secondsTimeOut,
			showStats: settings.showStats,
			hideStatsAfter: settings.hideStatsAfter,
			anchor: settings.anchor,
			option: settings.option,
			area: settings.area,
			hintsToRecognize: settings.hintsToRecognize,
			infoLinkUrl: info.linkUrl
		});
	});
}

/// Messages
// listen for messages from the content or options script
browser.runtime.onMessage.addListener(function(message, sender) {
	switch (message.action) {
		case "updateBrowserAction":
			updateBrowserAction(JSON.parse(message.data), sender.tab.id);
			break;
		default:
			break;
	}
});

function updateBrowserAction(statistics, tabId){
	let total = statistics.linkFine.length + statistics.linkBroken.length + statistics.linkInvalid.length + statistics.linkTimeOut.length;
	let dead = statistics.linkBroken.length + statistics.linkInvalid.length + statistics.linkTimeOut.length;
	let ok = statistics.linkFine.length;
	let skipped = statistics.linkSkipped.length;
		
	let color = defaultSettings.linkBroken;
	
	if(dead === 0){
		color = defaultSettings.linkFine;
		
		setTimeout(function(){
			browser.browserAction.setBadgeText({
				tabId: tabId,
				text: ""
			});
		}, 2000);
	}

	browser.browserAction.setBadgeBackgroundColor({
		tabId: tabId,
		color: color
	});

	browser.browserAction.setBadgeText({
		tabId: tabId,
		text: `${dead}`
	});
	
	browser.browserAction.setTitle({
		tabId: tabId,
		title: `${ok}/${total} (${dead} ${browser.i18n.getMessage('dead')}) - ${skipped} ${browser.i18n.getMessage('skipped')}`
	});
}
