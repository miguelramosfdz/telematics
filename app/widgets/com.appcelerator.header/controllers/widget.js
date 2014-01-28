$.setBanner = function(banners){
	$.banner.images = banner;
};

$.setTitle = function(text){
	$.title.text = text;
};

$.setLogout = function(param){

	if(param===true){
		$.logout.show();
	} else {
		$.logout.hide();
	}
};

function logout(){
	Alloy.Globals.login.open();
}
