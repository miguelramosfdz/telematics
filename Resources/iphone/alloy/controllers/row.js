function Controller() {
    function touch(e) {
        if ("touchstart" == e.type) {
            $.row.backgroundColor = "#901a1d";
            $.title.color = "#fff";
        } else {
            $.row.backgroundColor = "transparent";
            $.title.color = "#000";
        }
    }
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "row";
    arguments[0] ? arguments[0]["__parentSymbol"] : null;
    arguments[0] ? arguments[0]["$model"] : null;
    arguments[0] ? arguments[0]["__itemTemplate"] : null;
    var $ = this;
    var exports = {};
    var __defers = {};
    $.__views.row = Ti.UI.createView({
        height: 50,
        id: "row"
    });
    $.__views.row && $.addTopLevelView($.__views.row);
    touch ? $.__views.row.addEventListener("touchstart", touch) : __defers["$.__views.row!touchstart!touch"] = true;
    touch ? $.__views.row.addEventListener("touchend", touch) : __defers["$.__views.row!touchend!touch"] = true;
    $.__views.content = Ti.UI.createView({
        touchEnabled: false,
        layout: "horizontal",
        top: 5,
        bottom: 5,
        id: "content"
    });
    $.__views.row.add($.__views.content);
    $.__views.image = Ti.UI.createImageView({
        touchEnabled: false,
        left: 10,
        height: 40,
        width: 40,
        id: "image"
    });
    $.__views.content.add($.__views.image);
    $.__views.title = Ti.UI.createLabel({
        width: Ti.UI.SIZE,
        height: Ti.UI.SIZE,
        color: "#000",
        font: {
            fontSize: 16,
            fontFamily: "Helvetica Neue"
        },
        textAlign: "center",
        top: 10,
        touchEnabled: false,
        left: 10,
        id: "title"
    });
    $.__views.content.add($.__views.title);
    $.__views.divider = Ti.UI.createView({
        touchEnabled: false,
        height: 1,
        left: 5,
        right: 5,
        bottom: 0,
        backgroundColor: "#000",
        id: "divider"
    });
    $.__views.row.add($.__views.divider);
    exports.destroy = function() {};
    _.extend($, $.__views);
    var args = arguments[0] || {};
    $.title.text = "Send " + args.title + " to Vehicle";
    $.image.image = args.image;
    $.row.applyProperties(args);
    __defers["$.__views.row!touchstart!touch"] && $.__views.row.addEventListener("touchstart", touch);
    __defers["$.__views.row!touchend!touch"] && $.__views.row.addEventListener("touchend", touch);
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;