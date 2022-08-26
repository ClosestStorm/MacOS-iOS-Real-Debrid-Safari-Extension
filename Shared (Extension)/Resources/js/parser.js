if (typeof tabId !== "undefined") {
	chrome.runtime.sendMessage({action: "getAutoDebrid"}, function (autoDebrid) {
		if (typeof window.location.href !== "undefined") {
			if (autoDebrid === true) {
				if (typeof document.body !== "undefined") {
					var documentContent = "\"" + window.location.href + "\"" + document.body.innerHTML.replace(/href="\//g, 'href="' + window.location.protocol + '//' + window.location.hostname + '/');
					chrome.runtime.sendMessage({action: "findLinks", tab_id: tabId, content: documentContent}, function (links) {});
				}
			} else {
				var documentContent = "\"" + window.location.href + "\"";
				chrome.runtime.sendMessage({action: "findLinks", tab_id: tabId, content: documentContent}, function (links) {});
			}
		}
	});
}