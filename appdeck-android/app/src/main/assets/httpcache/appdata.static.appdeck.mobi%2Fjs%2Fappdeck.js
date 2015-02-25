// ready global
var app_is_ready = false;

var host_is_appdeck = (navigator.userAgent.indexOf("AppDeck") != -1);

// define custom event if needed
if (typeof(CustomEvent) === 'undefined') {
    CustomEvent = function(type, eventInitDict) {
        var event = document.createEvent('CustomEvent');

        event.initCustomEvent(type, eventInitDict['bubbles'], eventInitDict['cancelable'], eventInitDict['detail']);
        return event;
    };
}

// api call helper
function appDeckAPICall(command, param, onAPISuccess, onAPIError)
{
    if (!host_is_appdeck)
    {
        console.log("appDeckAPICall: "+command, param);
        return;
    }
    var eventid = false;
    if (!(typeof(onAPISuccess) === 'undefined' && typeof(onAPIError) === 'undefined'))
        eventid = "appdeck_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    if (eventid)
    {
        var listener = function(e) {
            if (e.detail.type == "success" && typeof(onAPISuccess) !== 'undefined')
                onAPISuccess.apply(onAPISuccess, e.detail.params);
            if (e.detail.type == "error" && typeof(onAPIError) !== 'undefined')
                onAPIError.apply(onAPIError, e.detail.params);
            document.removeEventListener(eventid, listener, false);
        };
        document.addEventListener(eventid, listener, false);
    }
    // value format: {success: true/false, result: result}
    var value_json = window.prompt('appdeckapi:' + command, JSON.stringify({param: param, eventid: eventid}));
    //alert(value_json);
    var value = JSON.parse(value_json);
    //alert(window.prompt('appdeckapi:' + command, JSON.stringify({param: param, eventid: eventid})));
    //alert(value.result);
    if (value === null || typeof(value.result) === 'undefined')
        return null;
    return value.result.shift();
}

// catch console
if (host_is_appdeck)
{
    (function (c) {
        "use strict";
        var oldInfo = c.info;
        var oldLog = c.log;
        var oldwarn = c.warn;
        var oldError = c.error;

        c.info = function () {
            var args = Array.prototype.slice.call(arguments);
            for (var k = 0; k < args.length; k++)
                appDeckAPICall("debug", args[k]);
            return oldLog.apply(c, args);
        };
        c.log = function () {
            var args = Array.prototype.slice.call(arguments);
            for (var k = 0; k < args.length; k++)
                appDeckAPICall("info", args[k]);
            return oldLog.apply(c, args);
        };
        c.warn = function () {
            var args = Array.prototype.slice.call(arguments);
            for (var k = 0; k < args.length; k++)
                appDeckAPICall("warning", args[k]);
            return oldLog.apply(c, args);
        };
        c.error = function () {
            var args = Array.prototype.slice.call(arguments);
            for (var k = 0; k < args.length; k++)
                appDeckAPICall("error", args[k]);
            return oldLog.apply(c, args);
        };
    }(window.console));

    // catch javascript error

    var gOldOnError = window.onerror;
    window.onerror = function myErrorHandler(message, filename, lineno, colno, error) {
        console.error("JavaScript Error: '" + message + "' on line " + lineno + " for " + filename + " (column: " + colno + " error: " + error + ")");
        if (gOldOnError)
            return gOldOnError(errorMsg, url, lineNumber);
        return false;
    };
}

// meta observer

if (typeof(window.WebKitMutationObserver) != "undefined")
{
    //var MutationObserver = MutationObserver || WebKitMutationObserver || MozMutationObserver;
    var obs = new WebKitMutationObserver(function(mutations, observer) {
        // app must be ready
        if (app_is_ready !== true)
            return;
        // look through all mutations that just occured
        var buttonUpdated = false;
        var previousNextUpdated = false;
        mutations.forEach(function(mutation) {
            Array.prototype.map.call(mutation.addedNodes, function(addedNode) {
                if (addedNode.name == "appdeck-menu-entry")
                    buttonUpdated = true;
                if (addedNode.name == "appdeck-next-page" || addedNode.name == "next-page" ||
                    addedNode.name == "appdeck-previous-page" || addedNode.name == "previous-page")
                    previousNextUpdated = true;

            });
        });
        if (buttonUpdated)
            app.refreshTopMenu();
        if (previousNextUpdated)
            app.refreshPreviousNextPage();
    });

    // have the observer observe foo for changes in children
    obs.observe(document.head, {
        attributes: true,
        childList: true
    });
} else {
    document.head.addEventListener("DOMSubtreeModified", function() {
        app.refreshUI();
    });
}

var helper =
{
    addinhistory: function(url)
    {
        var desired_url = url;
        var current_url = window.location.href;
        window.history.replaceState({}, '', desired_url);
        window.history.replaceState({}, '', current_url);
    },

    hasClass: function (ele,cls)
    {
        return ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
    },

    addClass: function (ele,cls)
    {
        if (!this.hasClass(ele,cls)) ele.className += " "+cls;
    },

    removeClass: function (ele,cls)
    {
        if (this.hasClass(ele,cls)) {
            var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
            ele.className=ele.className.replace(reg,' ');
        }
    },

    checkConfig: function(name, command)
    {
        Array.prototype.forEach.call(document.getElementsByTagName('meta'), function(meta) {
            if (meta.name == name)
            {
                if (meta.content == 'true')
                    appDeckAPICall(command, 1);
                else
                    appDeckAPICall(command, 0);
            }
        });
    }

};

var pref =
{
    get: function(name, value)
    {
        return appDeckAPICall("preferencesget", {name: name, value: value});
    },
    set: function(name, value)
    {
        return appDeckAPICall("preferencesset", {name: name, value: value});
    }
};

var app =
{
    helper: helper,

    addTopMenuButton: function (icon, link, title)
    {
        var button = document.createElement('meta');
        button.setAttribute("type", "button");
        button.setAttribute("name", "appdeck-menu-entry");
        button.setAttribute("content", link);
        button.setAttribute("icon", icon);
        button.setAttribute("title", title);
        document.getElementsByTagName('head')[0].appendChild(button);
    },

    refreshConfig: function()
    {
        app.helper.checkConfig('appdeck-disable-catch-link', 'disable_catch_link');
        app.helper.checkConfig('appdeck-disable-cache', 'disable_cache');
        app.helper.checkConfig('appdeck-disable-ad', 'disable_ad');
    },

    refreshTopMenu: function()
    {
        var entries = [];
        Array.prototype.forEach.call(document.getElementsByTagName('meta'), function(meta) {
            if (meta.name == 'appdeck-menu-entry')
            {
                var entry = {};
                for (var k = 0; k < meta.attributes.length; k++)
                {
                    var attr = meta.attributes[k];
                    if(attr.name != 'class')
                        entry[attr.name] = attr.value;
                }
                entries.push(entry);
        }
        });
        appDeckAPICall("menu", entries);
    },

    refreshPreviousNextPage : function()
    {
        var previous_page = false;
        var next_page = false;
        Array.prototype.forEach.call(document.getElementsByTagName('meta'), function(meta) {
            if (meta.name == 'appdeck-previous-page' || meta.name == 'previous-page')
                previous_page = meta.content;
            if (meta.name == 'appdeck-next-page' || meta.name == 'next-page')
                next_page = meta.content;
        });
        appDeckAPICall("previousnext", {previous_page: previous_page, next_page: next_page});
    },

    refreshUI: function()
    {
        this.refreshConfig();
        this.refreshTopMenu();
        this.refreshPreviousNextPage();
    },

    ready: function ()
    {
        if (app_is_ready === true)
        {
            //appDeckAPICall("info", "appdeck already ready");
            return;
        }
        //appDeckAPICall("info", "appdeck ready begin");
        app_is_ready = true;
        // init all
        this.refreshUI();
        this.helper.addClass(document.body, "appdeck");
        if (this.info.isIOS())
            this.helper.addClass(document.body, "appdeck_ios");
        else
            this.helper.addClass(document.body, "appdeck_android");
        if (this.info.isTablet())
            this.helper.addClass(document.body, "appdeck_tablet");
        else
            this.helper.addClass(document.body, "appdeck_phone");
        appDeckAPICall("ready", {ready: "ready"});
        var evt = document.createEvent('Event');
        evt.initEvent('appdeckready', true, true);
        evt.detail = "";
        document.dispatchEvent(evt);
        // disable long touch
        document.documentElement.style.webkitTouchCallout = 'none';
        // enable fastclick
        if (typeof(FastClick) !== 'undefined')
            FastClick.attach(document.body);
        //appDeckAPICall("info", "appdeck ready end");
    },

    // child

    share: function(title, url, imageurl)
    {
        appDeckAPICall("share", {title: title, url: url, imageurl: imageurl});
    },

    gotoprevious: function()
    {
        appDeckAPICall("gotoprevious");
    },

    gotonext: function()
    {
        appDeckAPICall("gotonext");
    },

    popup: function(url)
    {
        appDeckAPICall("popup", url);
    },


    popover: function(config)
    {
        appDeckAPICall("popover", config);
    },

    inhistory: function(url)
    {
        return appDeckAPICall("inhistory", url);
    },

    loadextern: function(url)
    {
        return appDeckAPICall("loadextern", url);
    },

    select: function(values, title, cb)
    {
        return appDeckAPICall("select", {title: title, values: values}, cb);
    },

    selectdate: function(title, year, month, day)
    {
        return appDeckAPICall("selectdate", {title: title, year: year, month: month, day: day});
    },

    shownotice: function(message)
    {
        return appDeckAPICall("shownotice", message);
    },
    showerror: function(message)
    {
        return appDeckAPICall("showerror", message);
    },

    slidemenu: function(command, position)
    {
        return appDeckAPICall("slidemenu", {command: command, position: position});
    },

    // {images: images, startIndex: index, bgcolor: '#000000', gbalpha: 0.8}
    // images: [{url: url, thumbnail: thumbnail_url, caption: 'title'} ...]
    photoBrowser: function(config)
    {
        return appDeckAPICall("photobrowser", config);
    },


    getElementCoordinate: function (element)
    {
        for (var el=element, lx=0, ly=0;
            el !== null;
            lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);
        return {x: lx,y: ly, width: element.offsetWidth, height: element.offsetHeight};
    },

    page:
        {
            push: function(url) { appDeckAPICall("pagepush", url); },
            pop: function(url) { appDeckAPICall("pagepop", url); },
            poproot: function(url) { appDeckAPICall("pagepoproot", url); },
            root: function(url, reload) { appDeckAPICall("pageroot", url); },
            rootandreload: function(url, reload) { appDeckAPICall("pagerootreload", url); },
            popup: function(url) { appDeckAPICall("popup", url); }
        },

    loading:
        {
            show: function() { appDeckAPICall("loadingshow"); },
            set: function(value) { appDeckAPICall("loadingset", value); },
            hide: function() { appDeckAPICall("loadinghide"); }
        },

    menu:
        {
            left: {
                open: function() { return appDeckAPICall("slidemenu", {command: "open", position: "left"}); },
                close: function() { return appDeckAPICall("slidemenu", {command: "close", position: "left"}); }
            },
            right: {
                open: function() { return appDeckAPICall("slidemenu", {command: "open", position: "right"}); },
                close: function() { return appDeckAPICall("slidemenu", {command: "close", position: "right"}); }
            },
            close: function() { return appDeckAPICall("slidemenu", {command: "close", position: "main"}); }
        },

    info:
        {
            isTablet: function() { return appDeckAPICall("istablet"); },
            isPhone: function() { return appDeckAPICall("isphone"); },
            isIOS: function() { return appDeckAPICall("isios"); },
            isAndroid: function() { return appDeckAPICall("isandroid"); },
            isLandscape: function() { return appDeckAPICall("islandscape"); },
            isPortrait: function() { return appDeckAPICall("isportrait"); }
    },

    clearcache: function (data, cb) { appDeckAPICall("clearcache"); },
    reload: function (data, cb) { appDeckAPICall("reload"); },

    demography:
        {
            postal: function(value) { appDeckAPICall("demography", {name: "postal", value: value}); },
            city: function(value) { appDeckAPICall("demography", {name: "city", value: value}); },
            yearOfBirth: function(value) { appDeckAPICall("demography", {name: "yearOfBirth", value: value}); },
            gender: function(value) { appDeckAPICall("demography", {name: "gender", value: value}); },
            login: function(value) { appDeckAPICall("demography", {name: "login", value: value}); },
            session: function(value) { appDeckAPICall("demography", {name: "session", value: value}); },
            facebook: function(value) { appDeckAPICall("demography", {name: "facebook", value: value}); },
            mail: function(value) { appDeckAPICall("demography", {name: "mail", value: value}); },
            msn: function(value) { appDeckAPICall("demography", {name: "msn", value: value}); },
            twitter: function(value) { appDeckAPICall("demography", {name: "twitter", value: value}); },
            skype: function(value) { appDeckAPICall("demography", {name: "skype", value: value}); },
            yahoo: function(value) { appDeckAPICall("demography", {name: "yahoo", value: value}); },
            googleplus: function(value) { appDeckAPICall("demography", {name: "googleplus", value: value}); },
            linkedin: function(value) { appDeckAPICall("demography", {name: "linkedin", value: value}); },
            youtube: function(value) { appDeckAPICall("demography", {name: "youtube", value: value}); },
            viadeo: function(value) { appDeckAPICall("demography", {name: "viadeo", value: value}); },
            education: function(value) { appDeckAPICall("demography", {name: "education", value: value}); },
            dateOfBirth: function(value) { appDeckAPICall("demography", {name: "dateOfBirth", value: value}); },
            income: function(value) { appDeckAPICall("demography", {name: "income", value: value}); },
            age: function(value) { appDeckAPICall("demography", {name: "age", value: value}); },
            areaCode: function(value) { appDeckAPICall("demography", {name: "areaCode", value: value}); },
            interests: function(value) { appDeckAPICall("demography", {name: "interests", value: value}); },
            maritalStatus: function(value) { appDeckAPICall("demography", {name: "maritalStatus", value: value}); },
            language: function(value) { appDeckAPICall("demography", {name: "language", value: value}); },
            hasChildren: function(value) { appDeckAPICall("demography", {name: "hasChildren", value: value}); },
            custom: function(name, value) { appDeckAPICall("demography", {name: name, value: value}); }
        },

    profile:
        {
            setEnablePrefetch: function(value) { appDeckAPICall("demography", {name: "enable_prefetch", value: (value ? "1" : "0")}); },
            setEnableAd: function(value) { appDeckAPICall("demography", {name: "enable_ad", value: (value ? "1" : "0")}); }
        },

    loadapp: function (url, cache) { appDeckAPICall("loadapp", {url: url, cache: cache}); },

    ping: function (data, cb) { appDeckAPICall("ping", data, cb); }

};

window.addEventListener('DOMContentLoaded', function(e) {
    app.ready();
});

window.addEventListener('load', function(e) {
    app.ready();
});

if (document.readyState == "complete" || document.readyState == "loaded") {
    app.ready();
}

//appDeckAPICall("info", "end of appdeck script");