function WPATH(s) {
    var index = s.lastIndexOf("/");
    var path = -1 === index ? "com.appcelerator.header/" + s : s.substring(0, index) + "/com.appcelerator.header/" + s.substring(index + 1);
    return path;
}

function Controller() {
    new (require("alloy/widget"))("com.appcelerator.header");
    this.__widgetId = "com.appcelerator.header";
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "widget";
    arguments[0] ? arguments[0]["__parentSymbol"] : null;
    arguments[0] ? arguments[0]["$model"] : null;
    arguments[0] ? arguments[0]["__itemTemplate"] : null;
    var $ = this;
    var exports = {};
    $.__views.widget = Ti.UI.createView({
        height: 60,
        width: Ti.UI.FILL,
        top: 0,
        backgroundImage: "/bg.png",
        id: "widget"
    });
    $.__views.widget && $.addTopLevelView($.__views.widget);
    $.__views.logo = Ti.UI.createView({
        backgroundImage: "/appicon.png",
        height: 35,
        width: 35,
        left: 5,
        bottom: 5,
        id: "logo"
    });
    $.__views.widget.add($.__views.logo);
    $.__views.banner = Ti.UI.createImageView({
        bottom: 0,
        left: 50,
        height: 40,
        width: Ti.UI.FILL,
        duration: 1e4,
        id: "banner"
    });
    $.__views.widget.add($.__views.banner);
    $.__views.title = Ti.UI.createLabel({
        width: Ti.UI.FILL,
        height: 40,
        color: "#fff",
        font: {
            fontWeight: "bold",
            fontSize: "18"
        },
        textAlign: "center",
        top: 10,
        bottom: 0,
        left: 0,
        paddingLeft: 50,
        paddingRight: 50,
        textAlignment: "center",
        verticalAlign: Ti.UI.TEXT_VERTICAL_ALIGNMENT_BOTTOM,
        id: "title"
    });
    $.__views.widget.add($.__views.title);
    exports.destroy = function() {};
    _.extend($, $.__views);
    $.setBanner = function() {
        $.banner.images = banner;
    };
    $.setTitle = function(text) {
        $.title.text = text;
    };
    $.setLogout = function(param) {
        true === param ? $.logout.show() : $.logout.hide();
    };
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;