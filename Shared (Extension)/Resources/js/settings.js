var p = document;

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

function ucfirst(str) {
    str += '';
    var f = str.charAt(0).toUpperCase();
    return f + str.substr(1);
}

function debrid() {
    window.location.href = "../view/popup.html";
}

function logout() {
	chrome.runtime.sendMessage({action: "logout"}, function (obj) {
        window.location.href = "../view/popup.html";
    });
}

chrome.runtime.sendMessage({action: "getUser", badge: false}, function (user) {
    if (user === null) {
        addClass(p.querySelector("#overview"), "text-center");
        removeClass(p.querySelector("#connection"), "");
    } else {
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
        p.querySelector("#settings-email").textContent = user.email;
        p.querySelector("#settings-username").textContent = user.username;
        if (nb_days <= 0)
			p.querySelector("#settings-expire").textContent = "N/A";
		else
			p.querySelector("#settings-expire").textContent = new Date(user.expiration);
        p.querySelector("#settings-type").textContent = ucfirst(user.type);
        p.querySelector("#settings-points").textContent = user.points;
    }
});

p.querySelector("#popup-back").setAttribute("title", chrome.i18n.getMessage("back"));
p.querySelector("#popup-back").onclick = debrid;
p.querySelector("#popup-logout").setAttribute("title", chrome.i18n.getMessage("logout"));
p.querySelector("#popup-logout").onclick = logout;
p.querySelector("#settings-email-label").textContent = chrome.i18n.getMessage("email");
p.querySelector("#settings-username-label").textContent = chrome.i18n.getMessage("username");
p.querySelector("#settings-expire-label").textContent = chrome.i18n.getMessage("expiration");
p.querySelector("#settings-type-label").textContent = chrome.i18n.getMessage("type");
p.querySelector("#settings-points-label").textContent = chrome.i18n.getMessage("points");
