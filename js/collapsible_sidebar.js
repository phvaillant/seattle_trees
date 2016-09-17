function collapse_sidebar() {
	$(".sidebar").toggleClass('collapsed');
	$("#map-container").toggleClass('col-md-9 col-md-12');
	map.invalidateSize(false);
}


$(document).ready(function () {

	$(".toggle-sidebar").click(function (event) {
		event.preventDefault();
		collapse_sidebar();
	});

});
