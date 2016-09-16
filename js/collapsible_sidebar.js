
$(document).ready(function () {

	var sidebar = $(".sidebar");
	var content = $("#map-container");

	$(".toggle-sidebar").click(function (event) {
		event.preventDefault();

	    sidebar.toggleClass('collapsed');
	    content.toggleClass('col-md-9 col-md-12');
	    //$("#map-canvas").width("100%");
	    map.invalidateSize(false);
	});

});
