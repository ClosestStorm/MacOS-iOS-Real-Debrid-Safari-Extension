var CHECK = true;
var p = document;
var timerAuthorize;

function addClass(element, class_name) {
    if (typeof element != "undefined" && element !== null && typeof element.className != "undefined") {
        element.className += ' ' + class_name;
        element.className = element.className.replace(/^\s+|\s+$/g, '');
    }
    return;
}

function removeClass(element, class_name) {
    if (typeof element != "undefined" && element !== null && typeof element.className != "undefined") {
        if (class_name == "") {
            element.className = "";
        } else {
            element.className = element.className.replace(new RegExp('(^|\\b)' + class_name.split(' ').join('|') + '(\\b|$)', 'gi'), ' ').replace(/^\s+|\s+$/g, '');
        }
    }
    return;
}

function hasClass(element, class_name) {
    var tmp_class_names = element.className + " ";
    if (element !== null && tmp_class_names.indexOf(class_name + " ") != -1)
        return true;
    else
        return false;
}

function download(url) {
	chrome.runtime.sendMessage({action: "download", url: url});
}

function newtab(url) {
	chrome.runtime.sendMessage({action: "newtab", url: url});
}

function auto() {
	chrome.runtime.sendMessage({action: "getAutoDebrid"}, function (autoDebrid) {
        if (autoDebrid === true) {
            chrome.runtime.sendMessage({action: "setAutoDebrid", autoDebrid: false});
            removeClass(p.querySelector("#popup-auto"), "active");
        } else {
            chrome.runtime.sendMessage({action: "setAutoDebrid", autoDebrid: true});
            addClass(p.querySelector("#popup-auto"), "active");
        }
    });
}

function debrid(href, it) {
    var itt = it;
    chrome.runtime.sendMessage({action: "debridLink", link: href, index_id: it}, function (json) {
        if (typeof json.error === "undefined" && typeof json.download !== "undefined") {
            removeClass(p.querySelector("#link-" + itt), "error");
            removeClass(p.querySelector("#ctn-download-" + itt), "hide");
            p.querySelector("#download-" + itt).setAttribute("href", json.download);
            removeClass(p.querySelector("#info-" + itt), "")
            addClass(p.querySelector("#info-" + itt), "info");
            addClass(p.querySelector("#info-" + itt), "downloadable");
            p.querySelector("#download-" + itt).setAttribute("href", json.download);
			p.querySelector("#download-" + itt).setAttribute("filename", json.filename);
			
			p.querySelector("#download-" + itt).addEventListener("click", function(e) {
				e.preventDefault();
				var downloadLink = e.target.href || e.target.parentElement.href;
				download(downloadLink);
			});
			
			p.querySelector("#link-" + itt).textContent = json.download;
			p.querySelector("#link-" + itt).setAttribute("href", json.download);
            if (json.streamable == 1) {
                removeClass(p.querySelector("#ctn-stream-" + itt), "hide");
                removeClass(p.querySelector("#info-" + itt), "");
				addClass(p.querySelector("#info-" + itt), "info");
                addClass(p.querySelector("#info-" + itt), "streamable");
                p.querySelector("#stream-" + itt).setAttribute("href", "https://real-debrid.com/streaming-" + json.id);
				
				p.querySelector("#stream-" + itt).addEventListener("click", function(e) {
					e.preventDefault();
					var tabLink = e.target.href || e.target.parentElement.href;
					newtab(tabLink);
				});
            }
        } else {
            p.querySelector("#link-" + itt).textContent = json.error;
            addClass(p.querySelector("#link-" + itt), "error");
        }
    });
}

function debrids() {
    var list = p.querySelectorAll(".debrid-link"), it;
    if (list !== null) {
        for (it = 0; it < list.length; it += 1) {
            if (p.querySelector("#label-" + it).checked === true && hasClass(p.querySelector("#info-" + it), "streamable") === false && hasClass(p.querySelector("#info-" + it), "downloadable") === false) {
                debrid(list[it].href, it);
            }
        }
    }
}

function clipboard() {
    var list = p.querySelectorAll(".debrid-link"), it;
    if (list !== null) {
        removeClass(p.querySelector("#clipboard_text"), "");
        p.querySelector("#clipboard_text").value = "";
        for (it = 0; it < list.length; it += 1) {
            if (p.querySelector("#label-" + it).checked === true && hasClass(p.querySelector("#link-" + it), "error") === false) {
                p.querySelector("#clipboard_text").value = p.querySelector("#clipboard_text").value + p.querySelector("#link-" + it).getAttribute("href") + "\r\n";
            }
        }
        if (list.length !== 0) {
			p.querySelector("#clipboard_text").select();
			document.execCommand("Copy", false, null);
        }
        addClass(p.querySelector("#clipboard_text"), "hide");
    }
}

function check() {
    var list = p.querySelectorAll(".debrid-link"), it;
    if (list !== null) {
        for (it = 0; it < list.length; it += 1) {
            if (CHECK === true) {
                p.querySelector("#label-" + it).removeAttribute("checked");
            } else {
                p.querySelector("#label-" + it).setAttribute("checked", "checked");
            }
        }
        CHECK = CHECK === true ? false : true;
    }
}

function settings() {
	window.location.href = "../view/settings.html";
}

function authorizeDisplay() {
	var mainContainer = p.querySelector("#contain");
	while (mainContainer.hasChildNodes()) {
		mainContainer.removeChild(mainContainer.firstChild);
	}
	
	var offlineWrapper = p.createElement("div");
	var offlineImage   = p.createElement("img");
	var offlineText    = p.createElement("p");
	var offlineButton  = p.createElement("input");
	offlineImage.setAttribute("src", "../img/loading.gif");
	offlineText.setAttribute("id", "offline-text");
	offlineText.textContent = chrome.i18n.getMessage("waiting_authorize");
	offlineButton.setAttribute("id", "authorize");
	offlineButton.setAttribute("name", "authorize");
	offlineButton.setAttribute("type", "button");
	offlineButton.setAttribute("value", chrome.i18n.getMessage("cancel"));
	offlineButton.onclick = cancelAuthorize;
	offlineWrapper.appendChild(offlineImage);
	offlineWrapper.appendChild(offlineText);
	offlineWrapper.appendChild(offlineButton);
	mainContainer.appendChild(offlineWrapper);
	addClass(offlineWrapper, "offline-wrapper");
}

function authorize() {
	authorizeDisplay();

    chrome.runtime.sendMessage({action: "authorize"},function(){});
}

function cancelAuthorize() {
	if (timerAuthorize) {
		clearInterval(timerAuthorize);
		timerAuthorize = null;
	}
	
	chrome.runtime.sendMessage({action: "cancel_authorize"},function(msg) {
		display();
	});
}

function display() {
	chrome.runtime.sendMessage({action: "getUser"}, function (user) {
		var html, it;
		if (user === null) {
			p.querySelector("#username").textContent = "";
			addClass(p.querySelector("#overview"), "text-center");
			removeClass(p.querySelector("#connection"), "");
			addClass(p.querySelector("#premium-ctn"), "hide");
			addClass(p.querySelector("#popup-logout"), "hide");
			addClass(p.querySelector("#contain"), "offline");
			
			var mainContainer = p.querySelector("#contain");
			while (mainContainer.hasChildNodes()) {
				mainContainer.removeChild(mainContainer.firstChild);
			}
			
			var offlineWrapper = p.createElement("div");
			var offlineImage   = p.createElement("img");
			var offlineText    = p.createElement("p");
			var offlineButton  = p.createElement("input");
			offlineImage.setAttribute("src", "../img/offline.svg");
			offlineImage.setAttribute("height", "100");
			offlineImage.setAttribute("width", "100");
			offlineText.setAttribute("id", "offline-text");
			offlineText.textContent = chrome.i18n.getMessage("offline");
			offlineButton.setAttribute("id", "authorize");
			offlineButton.setAttribute("name", "authorize");
			offlineButton.setAttribute("type", "button");
			offlineButton.setAttribute("value", chrome.i18n.getMessage("authorize"));
			offlineButton.onclick = authorize;
			offlineWrapper.appendChild(offlineImage);
			offlineWrapper.appendChild(offlineText);
			offlineWrapper.appendChild(offlineButton);
			mainContainer.appendChild(offlineWrapper);
			addClass(offlineWrapper, "offline-wrapper");
			
			chrome.runtime.sendMessage({action: "waiting_authorize"},function(rsp){
				if (rsp === true) {
					authorizeDisplay();
					
					if (timerAuthorize) {
						clearInterval(timerAuthorize);
						timerAuthorize = null;
					}
					
					var checkTimes = 0;
					timerAuthorize = setInterval(function() {
						chrome.runtime.sendMessage({action: "is_auth_complete"},function(rsp2){
							if (rsp2 === true) {
								if (timerAuthorize) {
									clearInterval(timerAuthorize);
									timerAuthorize = null;
								}
								display();
							}
						});
						
						if (checkTimes > 600) {
							clearInterval(timerAuthorize);
							timerAuthorize = null;
						}
						
						checkTimes++;
					}, 500);
				}
			});
		} else {
			p.querySelector("#popup-settings").onclick = settings;
			if (user.premium > 0)
				var nb_days = Math.round((user.premium * 10) / 86400) / 10;
			else
				var nb_days = 0;
				
			if (nb_days <= 0)
				var days_txt = "day";
			else
				var days_txt = "days";
				
			if (p.querySelector("#username") !== null)
				p.querySelector("#username").textContent = user.username;
			if (p.querySelector("#premium") !== null)
				p.querySelector("#premium").textContent = nb_days + " " + chrome.i18n.getMessage(days_txt);
			if (p.querySelector("#premium-ctn") !== null && nb_days > 0)
				removeClass(p.querySelector("#premium-ctn"), "hide");
			else
				addClass(p.querySelector("#premium-ctn"), "hide");
			
			var mainContainer = p.querySelector("#contain");
			while (mainContainer.hasChildNodes()) {
				mainContainer.removeChild(mainContainer.firstChild);
			}
			
			chrome.runtime.sendMessage({action: "getLinks", tab_id: 0}, function (links) {
				for (it = 0; it < links.length; it += 1) {
					var linkWrapper  = p.createElement("div");
					addClass(linkWrapper, "link");
					
					var divCheck     = p.createElement("div");
					addClass(divCheck, "check");
					addClass(divCheck, "switch");
					addClass(divCheck, "round");
					addClass(divCheck, "tiny");
					var checkButton  = p.createElement("input");
					checkButton.setAttribute("id", "label-" + it);
					checkButton.setAttribute("type", "checkbox");
					checkButton.setAttribute("checked", "checked");
					var labelButton  = p.createElement("label");
					labelButton.setAttribute("for", "label-" + it);
					
					divCheck.appendChild(checkButton);
					divCheck.appendChild(labelButton);
					
					linkWrapper.appendChild(divCheck);
					
					var divInfo     = p.createElement("div");
					divInfo.setAttribute("id", "info-" + it);
					addClass(divInfo, "info");
					var titleP      = p.createElement("p");
					var wrapperInfo = p.createElement("p");
					var hosterIcon  = p.createElement("img");
					var debridURL   = p.createElement("a");
					titleP.setAttribute("id", "title-" + it);
					hosterIcon.setAttribute("src", "../img/icon16.png");
					hosterIcon.setAttribute("id", "icon-" + it);
					addClass(hosterIcon, "icon");
					wrapperInfo.appendChild(hosterIcon);
					wrapperInfo.appendChild(p.createTextNode(" "));
					debridURL.setAttribute("href", "#");
					debridURL.setAttribute("id", "link-" + it);
					addClass(debridURL, "debrid-link");
					wrapperInfo.appendChild(debridURL);
					
					divInfo.appendChild(titleP);
					divInfo.appendChild(wrapperInfo);
					
					linkWrapper.appendChild(divInfo);
					
					var divStream = p.createElement("div");
					divStream.setAttribute("id", "ctn-stream-" + it);
					addClass(divStream, "stream");
					addClass(divStream, "hide");
					var streamURL = p.createElement("a");
					var iconStream = p.createElement("i");
					streamURL.setAttribute("href", "#");
					streamURL.setAttribute("id", "stream-" + it);
					addClass(iconStream, "fi-play-video");
					streamURL.appendChild(iconStream);
					
					divStream.appendChild(streamURL);
					
					linkWrapper.appendChild(divStream);
					
					var divDownload = p.createElement("div");
					divDownload.setAttribute("id", "ctn-download-" + it);
					addClass(divDownload, "download");
					addClass(divDownload, "hide");
					var downloadURL  = p.createElement("a");
					var iconDownload = p.createElement("i");
					downloadURL.setAttribute("href", "#");
					downloadURL.setAttribute("id", "download-" + it);
					addClass(iconDownload, "fi-download");
					downloadURL.appendChild(iconDownload);
					
					divDownload.appendChild(downloadURL);
					
					linkWrapper.appendChild(divDownload);
					
					mainContainer.appendChild(linkWrapper);
			
					p.querySelector("#title-" + it).textContent = links[it].filename;
					p.querySelector("#title-" + it).setAttribute("id", "title-" + links[it].filename);
					p.querySelector("#icon-" + it).setAttribute("src", links[it].host_icon);
					p.querySelector("#link-" + it).setAttribute("href", links[it].link);
					p.querySelector("#link-" + it).setAttribute("title", links[it].link);
					p.querySelector("#link-" + it).textContent = links[it].link;
					if (typeof links[it].unrestricted_link !== "undefined" && typeof links[it].unrestricted_link != '') {
						removeClass(p.querySelector("#info-" + it), "");
						addClass(p.querySelector("#info-" + it), "info");
						addClass(p.querySelector("#info-" + it), "downloadable");
						removeClass(p.querySelector("#ctn-download-" + it), "hide");
						if (typeof links[it].streamable !== "undefined" && links[it].streamable == 1) {
							removeClass(p.querySelector("#ctn-stream-" + it), "hide");
							removeClass(p.querySelector("#info-" + it), "");
							addClass(p.querySelector("#info-" + it), "info");
							addClass(p.querySelector("#info-" + it), "streamable");
							
							p.querySelector("#stream-" + it).setAttribute("href", "https://real-debrid.com/streaming-" + links[it].idd);
							
							p.querySelector("#stream-" + it).addEventListener("click", function(e) {
								e.preventDefault();
								var tabLink = e.target.href || e.target.parentElement.href;
								newtab(tabLink);
							});
						}
						
						p.querySelector("#download-" + it).setAttribute("href", links[it].unrestricted_link);
						p.querySelector("#download-" + it).setAttribute("filename", links[it].filename);
						
						p.querySelector("#download-" + it).addEventListener("click", function(e) {
							e.preventDefault();
							var downloadLink = e.target.href || e.target.parentElement.href;
							download(downloadLink);
						});
						
						p.querySelector("#link-" + it).setAttribute("href", links[it].unrestricted_link);
						p.querySelector("#link-" + it).textContent = links[it].unrestricted_link;
					}
					
					p.querySelector("#link-" + it).addEventListener("click", function(e) {
						e.preventDefault();
						var tabLink = e.target.href || e.target.parentElement.href;
						newtab(tabLink);
					});
					
					p.querySelector("#stream-" + it).setAttribute("title", chrome.i18n.getMessage("view"));
					p.querySelector("#download-" + it).setAttribute("title", chrome.i18n.getMessage("download"));
				}
			});
		}
	});
}
display();

p.querySelector("#popup-auto").setAttribute("title", chrome.i18n.getMessage("auto_debrid"));
p.querySelector("#popup-debrid").setAttribute("title", chrome.i18n.getMessage("debrid"));
p.querySelector("#popup-check").setAttribute("title", chrome.i18n.getMessage("check"));
p.querySelector("#popup-clipboard").setAttribute("title", chrome.i18n.getMessage("clipboard"));
p.querySelector("#popup-settings").setAttribute("title", chrome.i18n.getMessage("settings"));

p.querySelector("#popup-auto").onclick = auto;
p.querySelector("#popup-debrid").onclick = debrids;
p.querySelector("#popup-check").onclick = check;
p.querySelector("#popup-clipboard").onclick = clipboard;

chrome.runtime.sendMessage({action: "getAutoDebrid"}, function (autoDebrid) {
    if (autoDebrid === true) {
        addClass(p.querySelector("#popup-auto"), "active");
    }
});
