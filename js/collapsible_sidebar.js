function collapse_sidebar() {
	$(".sidebar").toggleClass('collapsed');
	$("#map-container").toggleClass('col-sm-9 col-sm-12');
	map.invalidateSize(false);
}


$(document).ready(function () {

	$(".toggle-sidebar").click(function (event) {
		event.preventDefault();
		collapse_sidebar();
	});

});
