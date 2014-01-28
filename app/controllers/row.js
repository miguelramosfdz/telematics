var args = arguments[0] || {};

$.title.text = "Send "+args.title+" to Vehicle";
$.image.image = args.image;
$.row.applyProperties(args);

function touch(e){
	if(e.type == "touchstart"){
		$.row.backgroundColor = "#901a1d";
		$.title.color = "#fff";
	} else {
		$.row.backgroundColor = "transparent";
		$.title.color = "#000";
	}
}
