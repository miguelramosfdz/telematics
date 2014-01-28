var args = arguments[0] || {};

$.title.text = "Send "+args.title+" to Vehicle";
$.image.image = args.image;
$.row.applyProperties(args);
