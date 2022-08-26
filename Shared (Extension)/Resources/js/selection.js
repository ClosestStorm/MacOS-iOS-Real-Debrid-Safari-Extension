var text = window.getSelection();

if (text.rangeCount) {
	var container = document.createElement("div");
	for (var i = 0, len = text.rangeCount; i < len; ++i) {
		container.appendChild(text.getRangeAt(i).cloneContents());
	}
	text = container.innerHTML;
} else {
	text = text.toString();
}

chrome.runtime.sendMessage({action: "selectedText", data: text}, function () {});