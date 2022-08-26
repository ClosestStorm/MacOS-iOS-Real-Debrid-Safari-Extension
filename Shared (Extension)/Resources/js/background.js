var regexMain = [], regexFolder = [], user = null, foundLinksByTab = [], indexLinksByTab = [], contextMenu, contextMenuStream, currentTabId = -1, currentTabUrl = "", addonSettings = {};
var default_client_id = "CEZWNFZ6BSSMK";
var timerAuthorize;
var authComplete = false;
var currentDomainNum = 1;
var i;

if (typeof chrome.storage.sync !== "undefined") {
	var addonStorage = chrome.storage.sync;
} else {
	var addonStorage = chrome.storage.local;
}

function isLinkAlreadyAdded(link, tabId) {
	var mit, found = 0;
	if (typeof foundLinksByTab[tabId] !== "undefined") {
		for (mit = 0; mit < foundLinksByTab[tabId].length; mit += 1) {
			if (link == foundLinksByTab[tabId][mit].link)
				found = 1;
		}
		if (found == 1)
			return true;
		else
			return false;
	} else {
		return false;
	}
}

function debridLink(argument, callback, error) {
	if (typeof error !== "undefined" || addonSettings.accessToken == '' || addonSettings.refreshToken == '') {
		if (typeof argument.download === "undefined")
			callback({});
		return;
	}
	
	var xhrDebrid = new XMLHttpRequest();
    xhrDebrid.onreadystatechange = function () {
        if (xhrDebrid.readyState === 4) {
			if (xhrDebrid.status == 401) {
				refreshToken(debridLink, argument, callback);
			} else if (xhrDebrid.status == 200 || xhrDebrid.status == 503 || xhrDebrid.status == 403) {
				if (xhrDebrid.responseText.indexOf('{') == 0 || xhrDebrid.responseText.indexOf('[') == 0) {
					var tmp = JSON.parse(xhrDebrid.responseText);
					
					if (typeof tmp.download !== "undefined" && typeof argument.tab_id !== "undefined" && typeof argument.index_id === "number") {
						foundLinksByTab[argument.tab_id][argument.index_id].idd = tmp.id;
						foundLinksByTab[argument.tab_id][argument.index_id].unrestricted_link = tmp.download;
						foundLinksByTab[argument.tab_id][argument.index_id].streamable = tmp.streamable;
					}
					
					if (typeof argument.download !== "undefined") {
						if (typeof tmp.download !== "undefined" && argument.download == 1) {
							// IDM fail:
							// chrome.downloads.download({url: tmp.download});

							// Hack
							var creating = chrome.tabs.create({url: tmp.download, active: false}, function(tab) {
								var createdTab = tab;
								var waitingCounter = 0;
								var checkComplete = setInterval(function() {
									if (typeof createdTab.status !== "undefined") {
										if (createdTab.status == "complete" && waitingCounter > 0) {
											clearInterval(checkComplete);
											checkComplete = null;
											
											chrome.tabs.remove(createdTab.id);
										} else {
											waitingCounter++;
										}
									} else {
										waitingCounter++;
									}
									
									if (waitingCounter >= 30) {
										clearInterval(checkComplete);
										checkComplete = null;
										
										chrome.tabs.remove(createdTab.id);
									}
								}, 1000);
							});
						} else if (typeof tmp.download !== "undefined" && argument.download == 2) {
							if (typeof tmp.streamable !== "undefined" && tmp.streamable == 1) {
								chrome.tabs.create({url: "https://real-debrid.com/streaming-" + tmp.id});
							} else {
								chrome.notifications.create("realdebridNotification", {
									"type": "basic",
									"iconUrl": chrome.extension.getURL("img/icon128.png"),
									"title": "Real-Debrid Extension",
									"message": chrome.i18n.getMessage("not_streamable")
								});
							}
						} else {
							chrome.notifications.create("realdebridNotification", {
								"type": "basic",
								"iconUrl": chrome.extension.getURL("img/icon128.png"),
								"title": "Real-Debrid Extension",
								"message": tmp.error + " (" + argument.link + ")"
							});
						}
					} else {
						return callback(tmp);
					}
				} else {
					return callback({});
				}
			} else {
				if (xhrDebrid.responseText.indexOf('{') == 0 || xhrDebrid.responseText.indexOf('[') == 0) {
					var tmp = JSON.parse(xhrDebrid.responseText);
					return callback(tmp);
				} else {
					return callback({});
				}
			}
        }
    };
    xhrDebrid.open("POST", "https://app.real-debrid.com/rest/1.0/unrestrict/link", true);
	xhrDebrid.setRequestHeader("Authorization", "Bearer " + addonSettings.accessToken);
	xhrDebrid.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhrDebrid.send("link=" + encodeURIComponent(argument.link));
}

function refreshToken(callback, argument, callback2) {
	if (addonSettings.client_id == '' || addonSettings.client_secret == '' || addonSettings.refreshToken == '') {
		if (typeof argument !== "undefined" && typeof callback2 !== "undefined") {
			return callback(argument, callback2, true);
		} else if (typeof argument !== "undefined") {
			return callback(argument, true);
		} else {
			return callback(true);
		}
	}
	
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				if (xhr.responseText.indexOf('{') == 0 || xhr.responseText.indexOf('[') == 0) {
					json = JSON.parse(xhr.responseText);
					
					addonSettings.accessToken = json.access_token;
					addonStorage.set({accessToken: json.access_token});
					
					if (typeof argument !== "undefined" && typeof callback2 !== "undefined") {
						return callback(argument, callback2);
					} else if (typeof argument !== "undefined") {
						return callback(argument);
					} else {
						return callback();
					}
				} else {
					if (typeof argument !== "undefined" && typeof callback2 !== "undefined") {
						return callback(argument, callback2, true);
					} else if (typeof argument !== "undefined") {
						return callback(argument, true);
					} else {
						return callback(true);
					}
				}
			} else if (xhr.status === 403) {
				addonSettings.refreshToken = '';
				addonStorage.set({refreshToken: ''});
				addonSettings.accessToken = '';
				addonStorage.set({accessToken: ''});
				addonSettings.client_id = '';
				addonStorage.set({client_id: ''});
				addonSettings.client_password = '';
				addonStorage.set({client_password: ''});
					
				if (typeof argument !== "undefined" && typeof callback2 !== "undefined") {
					return callback(argument, callback2, true);
				} else if (typeof argument !== "undefined") {
					return callback(argument, true);
				} else {
					return callback(true);
				}
			} else {
				if (typeof argument !== "undefined" && typeof callback2 !== "undefined") {
					return callback(argument, callback2, true);
				} else if (typeof argument !== "undefined") {
					return callback(argument, true);
				} else {
					return callback(true);
				}
			}
		}
	};
	xhr.open("POST", "https://app.real-debrid.com/oauth/v2/token", true);
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.send('client_id=' + addonSettings.client_id + '&client_secret=' + addonSettings.client_secret + '&code=' + addonSettings.refreshToken + '&grant_type=' + encodeURIComponent("http://oauth.net/grant_type/device/1.0"));
}

function getUser(callback, error) {
	if (typeof error !== "undefined" || addonSettings.client_id == '' || addonSettings.client_secret == '' || addonSettings.refreshToken == '' || addonSettings.accessToken == '') {
		user = null;
		authComplete = false;
		if (callback !== null)
			callback();
		return false;
	}
	
    var xhr = new XMLHttpRequest(), json;
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
			if (xhr.status === 401) {
				refreshToken(getUser, callback);
            } else if (xhr.status === 200 || xhr.status === 403) {
				if (xhr.responseText.indexOf('{') == 0 || xhr.responseText.indexOf('[') == 0) {
					json = JSON.parse(xhr.responseText);
					if (typeof json.error === "undefined") {
						user = json;
					} else {
						user = null;
						authComplete = false;
					}
					if (callback !== null) {
						callback();
					}
				} else if (callback !== null) {
					callback();
				}
            }
        }
    };
    xhr.open("GET", "https://app.real-debrid.com/rest/1.0/user", true);
	xhr.setRequestHeader("Authorization", "Bearer " + addonSettings.accessToken);
    xhr.send();
}

function getRegex(callback) {
    var xhr = new XMLHttpRequest(), it;
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
				if (xhr.responseText.indexOf('{') == 0 || xhr.responseText.indexOf('[') == 0) {
					regex = JSON.parse(xhr.responseText);
					for (it = 0; it < regex.length; it += 1) {
						regexMain[it] = regex[it].substr(1, regex[it].length - 2);
					}
					
					chrome.contextMenus.create({
						"title": chrome.i18n.getMessage("debrid_now"),
						"contexts": ["link"],
						"onclick" : contextMenu
					});
					
					chrome.contextMenus.create({
						"title": chrome.i18n.getMessage("stream_now"),
						"contexts": ["link"],
						"onclick" : contextMenuStream
					});

					chrome.contextMenus.create({
						"title": chrome.i18n.getMessage("debrid_one"),
						"contexts": ["selection"],
						"onclick" : contextMenu
					});
					
					callback();
					
					return;
				}
            } else {
				chrome.notifications.create("realdebridNotification", {
					"type": "basic",
					"iconUrl": chrome.extension.getURL("img/icon128.png"),
					"title": "Real-Debrid Extension",
					"message": "Fatal error loading RegExp list"
				});
			}
        }
    };
    xhr.open("GET", "https://app.real-debrid.com/rest/1.0/hosts/regex", true);
	xhr.setRequestHeader("Authorization", "Bearer " + addonSettings.accessToken);
    xhr.send();
}

function getRegexFolder(callback) {
    var xhr = new XMLHttpRequest(), it;
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
				if (xhr.responseText.indexOf('{') == 0 || xhr.responseText.indexOf('[') == 0) {
					regex = JSON.parse(xhr.responseText);
					for (it = 0; it < regex.length; it += 1) {
						regexFolder[it] = regex[it].substr(1, regex[it].length - 2);
					}
					
					getRegex(callback);
					
					return;
				}
            }
        }
    };
    xhr.open("GET", "https://app.real-debrid.com/rest/1.0/hosts/regexFolder", true);
	xhr.setRequestHeader("Authorization", "Bearer " + addonSettings.accessToken);
    xhr.send();
}

function getFilename(link) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
			if (xhr.responseText.indexOf('{') == 0 || xhr.responseText.indexOf('[') == 0) {
				json = JSON.parse(xhr.responseText);
				if (typeof json !== "undefined" && json.supported == 1) {
				   addLink({filename: json.filename, filesize: json.filesize, host_icon: json.host_icon, link: json.link, tab_id: currentTabId});
				}
			}
        }
    };
    xhr.open("POST", "https://app-" + currentDomainNum + ".real-debrid.com/rest/1.0/unrestrict/check", true);
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.setRequestHeader("Authorization", "Bearer " + addonSettings.accessToken);
    xhr.send("link=" + encodeURIComponent(link));
	
	currentDomainNum++;
	if (currentDomainNum > 10) currentDomainNum = 1;
}

function resetLinks(tab_id) {
	foundLinksByTab[tab_id] = [];
	indexLinksByTab[tab_id] = 0;
}

function findFolderLinks(link, tabId, timeout, fast, download) {
	setTimeout(function() {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.responseText.indexOf('{') == 0 || xhr.responseText.indexOf('[') == 0) {
					var tmp = JSON.parse(xhr.responseText);
					var fakeContent = "";
					var mit;
					for (mit = 0; mit < tmp.length; mit += 1) { fakeContent += "\n" + tmp[mit] + "\n"; }
					if (typeof download !== "undefined") {
						var foundLinks = findLinks(fakeContent);
						var it;
						for (it = 0; it < foundLinks.length; it += 1) {
							debridLink({link: foundLinks[it], download: download});
						}
					} else {
						addNewLinks(findLinks(fakeContent), tabId);
					}
				}
			}
		};
		xhr.open("POST", "https://app.real-debrid.com/rest/1.0/unrestrict/folder", true);
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.setRequestHeader("Authorization", "Bearer " + addonSettings.accessToken);
		xhr.send("link=" + encodeURIComponent(link) + "&fast=" + fast);
	}, timeout);
}

function findLinks(content, tabId, fast, notify) {
	var index = 0, links = [], linksAlready = "";
	var timeout = 0;

	if (regexMain.length == 0) {
		var findLinksAgain = function() {
			findLinks(content, tabId, fast, notify);
		};
		getRegexFolder(findLinksAgain);
		
		return;
	}
	
	if (typeof tabId !== "undefined") {
		for (it = 0; it < regexFolder.length; it += 1) {
			var matches = content.match(new RegExp(regexFolder[it],"g"));
				
			if (matches !== null) {
				var mit;
				for (mit = 0; mit < matches.length; mit += 1) {
					if (linksAlready.indexOf(matches[mit].replace('http://', '').replace('https://', '') + ',') == -1) {
						linksAlready = linksAlready + matches[mit] + ',';

						if (typeof fast === "undefined")
							var fast = 0;
							
						findFolderLinks(matches[mit], tabId, timeout, fast);
						timeout += 200;
					}
				}
			}
		}
	}
	for (it = 0; it < regexMain.length; it += 1) {
		var matches = content.match(new RegExp(regexMain[it],"g"));
		if (matches !== null) {
			var mit;
			for (mit = 0; mit < matches.length; mit += 1) {
				if (linksAlready.indexOf(matches[mit].replace('http://', '').replace('https://', '') + ",") == -1) {
					linksAlready += matches[mit] + ",";
						
					if (typeof tabId !== "undefined") {
						getFilename(matches[mit]);
					}
						
					links[index] = matches[mit];
					index++;
				}
			}
		}
	}
	
	if (typeof notify === "number" && notify == 1 && linksAlready == "") {
		chrome.notifications.create("realdebridNotification", {
			"type": "basic",
			"iconUrl": chrome.extension.getURL("img/icon128.png"),
			"title": "Real-Debrid Extension",
			"message": chrome.i18n.getMessage("no_link_found")
		});
	}
	
	return links;
}

contextMenuStream = function (e) {
    var links, it, text, html;
    if (e.linkUrl) {
		var selectionText = e.linkUrl;
		console.log(e);
		var folderLink = 0;
		var foundLinks = findLinks(selectionText);
		for (it = 0; it < regexFolder.length; it += 1) {
			var matches = selectionText.match(new RegExp(regexFolder[it],"g"));
			if (matches !== null) {
				folderLink = 1;
				findFolderLinks(matches[0], currentTabId, 0, 0, 2);
			}
		}
		if (foundLinks.length > 0 && folderLink == 0) {
			debridLink({link: foundLinks[0], download: 2});
		} else if (folderLink == 0) {
			chrome.notifications.create("realdebridNotification", {
				"type": "basic",
				"iconUrl": chrome.extension.getURL("img/icon128.png"),
				"title": "Real-Debrid Extension",
				"message": chrome.i18n.getMessage("not_supported_link") + " (" + selectionText + ")"
			});
		}
    }
};

contextMenu = function (e) {
    var links, it, text, html;
    if (e.linkUrl) {
		var selectionText = e.linkUrl;
		var folderLink = 0;
		var foundLinks = findLinks(selectionText);
		for (it = 0; it < regexFolder.length; it += 1) {
			var matches = selectionText.match(new RegExp(regexFolder[it],"g"));
			if (matches !== null) {
				folderLink = 1;
				findFolderLinks(matches[0], currentTabId, 0, 0, 1);
			}
		}
		if (foundLinks.length > 0 && folderLink == 0) {
			debridLink({link: foundLinks[0], download: 1});
		} else if (folderLink == 0) {
			chrome.notifications.create("realdebridNotification", {
				"type": "basic",
				"iconUrl": chrome.extension.getURL("img/icon128.png"),
				"title": "Real-Debrid Extension",
				"message": chrome.i18n.getMessage("not_supported_link") + " (" + selectionText + ")"
			});
		}
    } else if (e.selectionText) {
		chrome.tabs.executeScript(currentTabId, {
			code: 'var tabId = ' + currentTabId + ';'
		}, function() {
			chrome.tabs.executeScript(currentTabId, {file: 'js/selection.js'});
		});
    }
};

function addNewLinks(links, tabId) {
	var mit, timeout = 0;
	for (mit = 0; mit < links.length; mit += 1) {
		if (!isLinkAlreadyAdded(links[mit], tabId)) {
			getFilename(links[mit]);
		}
	}
}

function addLink(message) {
	if (typeof foundLinksByTab[message.tab_id] === "undefined") {
		resetLinks(message.tab_id);
	}
	
	if (!isLinkAlreadyAdded(message.link, message.tab_id)) {
		foundLinksByTab[message.tab_id][indexLinksByTab[message.tab_id]] = {filename: message.filename, filesize: message.filesize, host_icon: message.host_icon, link: message.link, tab_id: message.tab_id};
		indexLinksByTab[message.tab_id]++;
				
		chrome.browserAction.setBadgeBackgroundColor({color: "#61AD6F"});
		chrome.browserAction.setBadgeText({text: foundLinksByTab[message.tab_id].length.toString()});
	}
}

chrome.runtime.onMessage.addListener(function (message, request, response) {
	if (message.action === "selectedText") {
		if (typeof message.data !== "undefined") {
			var ll = findLinks(message.data, currentTabId, 0, 1);
		}
    } else if (message.action === "reloadRegex") {
        getRegex();
		return true;
	} else if (message.action === "reloadRegexFolder") {
        getRegexFolder();
		return true;
	} else if (message.action === "debridLink") {
		debridLink({link: message.link, tab_id: currentTabId, index_id: message.index_id}, function (data) {
			response(data);
        });
        return true;
    } else if (message.action === "getRegex") {
        response(regex);
		return true;
	} else if (message.action === "getRegexFolder") {
        response(regexFolder);
		return true;
    } else if (message.action === "getUser") {
        getUser(function () {
            response(user);
        });
        return true;
    } else if (message.action === "getUrl") {
        chrome.tabs.getSelected(null, function (tab) {
            response(tab.url);
        });
        return true;
    } else if (message.action === "addLink") {
		if (typeof message !== "undefined" && typeof message.link !== "undefined") {
			addLink(message);
		}
	} else if (message.action === "findLinks") {
		if (typeof message.content !== "undefined" && typeof message.tab_id !== "undefined")
			findLinks(message.content, message.tab_id, 1);
    } else if (message.action === "getLinks") {
		if (typeof currentTabId !== "undefined") {
			if (currentTabId > -1) {
				if (typeof foundLinksByTab[currentTabId] === "undefined") {
					resetLinks(currentTabId);
				}
				
				response(foundLinksByTab[currentTabId]);
			} else {
				response([]);
			}
		} else {
			response([]);
		}
	} else if (message.action === "authorize") {
		var xhrCode = new XMLHttpRequest();
		xhrCode.onreadystatechange = function () {
			if (xhrCode.readyState === 4) {
				if (xhrCode.responseText.indexOf('{') == 0 || xhrCode.responseText.indexOf('[') == 0) {
					var tmp = JSON.parse(xhrCode.responseText);
					
					if (typeof tmp.device_code !== "undefined" && typeof tmp.interval !== "undefined") {
					
						chrome.tabs.create({url: "https://real-debrid.com/authorize?client_id=" + default_client_id + "&device_id=" + tmp.device_code});
						
						if (timerAuthorize) {
							clearInterval(timerAuthorize);
							timerAuthorize = null;
						}
						
						var waitingCounter = 0;
						timerAuthorize = setInterval(function() {
							var xhrCreds = new XMLHttpRequest();
							xhrCreds.onreadystatechange = function () {
								if (xhrCreds.readyState === 4) {
									if (xhrCreds.responseText.indexOf('{') == 0 || xhrCreds.responseText.indexOf('[') == 0) {
										var tmp2 = JSON.parse(xhrCreds.responseText);
									} else {
										var tmp2 = {};
									}
								
									if (typeof tmp2.client_id !== "undefined") {
										clearInterval(timerAuthorize);
										timerAuthorize = null;
										
										addonSettings.client_id = tmp2.client_id;
										addonStorage.set({client_id: tmp2.client_id});
										addonSettings.client_secret = tmp2.client_secret;
										addonStorage.set({client_secret: tmp2.client_secret});
										
										var xhrToken = new XMLHttpRequest();
										xhrToken.onreadystatechange = function () {
											if (xhrToken.readyState === 4) {
												if (xhrToken.responseText.indexOf('{') == 0 || xhrToken.responseText.indexOf('[') == 0) {
													var tmp3 = JSON.parse(xhrToken.responseText);
													
													addonSettings.refreshToken = tmp3.refresh_token;
													addonStorage.set({refreshToken: tmp3.refresh_token});
													addonSettings.accessToken = tmp3.access_token;
													addonStorage.set({accessToken: tmp3.access_token});
													
													authComplete = true;
													response("loggedin");
												}
											}
										};
										xhrToken.open("POST", "https://app.real-debrid.com/oauth/v2/token", true);
										xhrToken.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
										xhrToken.send('client_id=' + addonSettings.client_id + '&client_secret=' + addonSettings.client_secret + '&code=' + tmp.device_code + '&grant_type=' + encodeURIComponent("http://oauth.net/grant_type/device/1.0"));
									} else {
										waitingCounter++;
									}
								}
								
								if (tmp.interval > 0 && waitingCounter > (tmp.expires_in / tmp.interval)) {
									clearInterval(timerAuthorize);
									timerAuthorize = null;
								}
							};
							
							xhrCreds.open("GET", "https://app.real-debrid.com/oauth/v2/device/credentials?client_id=" + default_client_id + "&code=" + tmp.device_code, true);
							xhrCreds.send();
						}, (tmp.interval * 1000));
					} else {
						chrome.notifications.create("realdebridNotification", {
							"type": "basic",
							"iconUrl": chrome.extension.getURL("img/icon128.png"),
							"title": "Real-Debrid Extension",
							"message": "An error occured while getting credentials, operation aborted"
						});
					}
				}
			}
		};
		xhrCode.open("GET", "https://app.real-debrid.com/oauth/v2/device/code?client_id=" + default_client_id + "&new_credentials=yes", true);
		xhrCode.send();
	} else if (message.action === "is_auth_complete") {
		if (authComplete === true)
			response(true);
		else
			response(false);
	} else if (message.action === "waiting_authorize") {
		if (timerAuthorize) {
			response(true);
		} else {
			response(false);
		}
	} else if (message.action === "cancel_authorize") {
		if (timerAuthorize) {
			clearInterval(timerAuthorize);
			timerAuthorize = null;
		}
		response(true);
    } else if (message.action === "download") {
        // IDM fail:
		// chrome.downloads.download({url: message.url});

		// Hack
		var creating = chrome.tabs.create({url: message.url, active: false}, function(tab) {
			var createdTab = tab;
			var waitingCounter = 0;
			var checkComplete = setInterval(function() {
				if (typeof createdTab.status !== "undefined") {
					if (createdTab.status == "complete" && waitingCounter > 0) {
						clearInterval(checkComplete);
						checkComplete = null;
						
						chrome.tabs.remove(createdTab.id);
					} else {
						waitingCounter++;
					}
				} else {
					waitingCounter++;
				}
				
				if (waitingCounter >= 30) {
					clearInterval(checkComplete);
					checkComplete = null;
					
					chrome.tabs.remove(createdTab.id);
				}
			}, 1000);
		});
	} else if (message.action === "newtab") {
        chrome.tabs.create({url: message.url});
	} else if (message.action === "logout") {
        addonSettings.refreshToken = '';
		addonStorage.set({refreshToken: ''});
		addonSettings.accessToken = '';
		addonStorage.set({accessToken: ''});
		addonSettings.client_id = '';
		addonStorage.set({client_id: ''});
		addonSettings.client_password = '';
		addonStorage.set({client_password: ''});
		
		response(true);
    } else if (message.action === "setAutoDebrid") {
        addonStorage.set({autoDebrid: message.autoDebrid});
    } else if (message.action === "getAutoDebrid") {
        addonStorage.get("autoDebrid", function (autoDebrid) {
            response(autoDebrid.autoDebrid);
        });
        return true;
    }
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	var tab_id = activeInfo.tabId;
	chrome.browserAction.setBadgeText({text: ""});
	currentTabId = tab_id;
	if (typeof foundLinksByTab[tab_id] === "undefined") {
		resetLinks(tab_id);
		chrome.tabs.get(tab_id, (function(tab) {
			if (typeof tab !== "undefined") {
				currentTabUrl = tab.url;
				if (typeof tab.url !== "undefined" && tab.url.indexOf("chrome://") == -1 && tab.url.indexOf("browser://") == -1 && tab.url.indexOf("data:") != 0) {
					chrome.tabs.executeScript(tab_id, {
						code: 'var tabId = ' + tab_id + ';'
					}, function() {
						chrome.tabs.executeScript(tab_id, {file: 'js/parser.js'});
					});
				}
			}
		}));
	} else {
		var nbLinks = foundLinksByTab[tab_id].length;
		if (nbLinks > 0) {
			chrome.browserAction.setBadgeBackgroundColor({color: "#61AD6F"});
			chrome.browserAction.setBadgeText({text: nbLinks.toString()});
		}
	}
});
chrome.tabs.onCreated.addListener(function (tab) {
	if (typeof tab.active !== "undefined") {
		if (tab.active === true) {
			currentTabId = tab.id;
			currentTabUrl = tab.url;
		}
	}
});
chrome.tabs.onUpdated.addListener(function (tab_id, changeinfo, tab) {
	if (typeof tab.active !== "undefined") {
		if (tab.active === true) {
			if (typeof tab.url !== "undefined" && tab.url.indexOf("chrome://") == -1 && tab.url.indexOf("browser://") == -1 && tab.url.indexOf("data:") != 0 && changeinfo.status == "complete") {
				chrome.browserAction.setBadgeText({text: ""});
				resetLinks(tab_id);
				currentTabId = tab_id;
				currentTabUrl = tab.url;
				chrome.tabs.executeScript(tab_id, {
					code: 'var tabId = ' + tab_id + ';'
				}, function() {
					chrome.tabs.executeScript(tab_id, {file: 'js/parser.js'});
				});
			}
		}
	}
});
chrome.tabs.onRemoved.addListener(function (tab_id) {
	delete foundLinksByTab[tab_id];
	delete indexLinksByTab[tab_id];
	if (currentTabId == tab_id) {
		currentTabId = -1;
		currentTabUrl = "";
	}
});

addonStorage.get(null, function (items) {
	if (typeof items !== "undefined") {
		addonSettings = items;

		if (typeof addonSettings.autoDebrid !== "boolean") {
			addonSettings.autoDebrid = true;
			addonStorage.set({autoDebrid: true});
		}
		if (typeof addonSettings.refreshToken === "undefined") {
			addonSettings.refreshToken = '';
			addonStorage.set({refreshToken: ''});
		}
		if (typeof addonSettings.accessToken === "undefined") {
			addonSettings.accessToken = '';
			addonStorage.set({accessToken: ''});
		}
		if (typeof addonSettings.client_id === "undefined") {
			addonSettings.client_id = '';
			addonStorage.set({client_id: ''});
		}
		if (typeof addonSettings.client_password === "undefined") {
			addonSettings.client_password = '';
			addonStorage.set({client_password: ''});
		}
	}
	
	getUser(null);
});