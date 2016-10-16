//define the api url to get data from
var root_api = 'http://ec2-54-234-216-12.compute-1.amazonaws.com:5432/';

//define map variable
var map;

//define a size variable for the markers array
var size;

//define your markers: http://leafletjs.com/examples/custom-icons.html
var treeicon = L.icon({
    iconUrl: 'img/tree.png',
    iconSize: new L.Point(30, 30),
    popupAnchor: new L.Point(0, -10)
});

//define map center
var mapCenter = {lat: 47.654967,lng:-122.312668};

//define tile
var your_tile = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	,ext: 'png', minZoom:12, maxZoom:20});

$(document).ready(function() {

	//set your map and some options of the view
	map = L.map('map-canvas', {
	 		zoomControl: false, maxZoom: 20
	 		}).setView([mapCenter.lat,mapCenter.lng], 15);

	//add zoom control with your options
	L.control.zoom({
		     position:'bottomright'
		}).addTo(map);

	//add tile to your map
	your_tile.addTo(map);


	//add the mapbox layer
	L.mapbox.accessToken = 'pk.eyJ1IjoiZGVicmljYXNzYXJ0IiwiYSI6IndfVTRGZTQifQ.AnvALWzOAOxnzwSvy7Evfg';
	var featureLayer = L.mapbox.featureLayer();

	featureLayer.loadID('debricassart.1lo1j111');

	//get the lookup_family and lookup_order for switching between layers
	var lookup_family = {},
		lookup_orders = {};

	//initialize the filters
	set_options_multiselect();
	initialize_filters();

	//initialize the neighborhoods
	initialize_neighborhoods();

	//initialize clusters
	initialize_clusters();

	//click event of neighborhoods
	var previous_nhood;

	$('#neighborhoods').multiselect({
    		onChange: function(option, select) {

    			if (previous_nhood !== undefined) {
    				map.removeLayer(previous_nhood);
    			}

    			previous_nhood = featureLayer.getLayer(option.val());

    			previous_nhood.addTo(map);
    			limits = previous_nhood.getBounds();
    			map.fitBounds(limits);
    		} // end of on change function

    	}); //end of multiselect click event

	function initialize_neighborhoods() {
		featureLayer.on('ready', function() {
		    featureLayer.eachLayer(function(layer) {
		    	nhood = layer.feature.properties.nhood;
		    	name = layer.feature.properties.name;
		    	if (nhood == name) {
		    		  $('#neighborhoods').append('<option value="' + layer._leaflet_id + '">'+name+'</option>');
		    	}
		    	else {
				      $('#neighborhoods').append('<option value="' + layer._leaflet_id + '">'+name+ ' (in ' + nhood + ')</option>');
		    	};
		    	$("#neighborhoods").multiselect("rebuild");
	    	});
		});
	} // end of initialize_neighborhoods

	function initialize_filters() {
			
			var families = [];
			var orders = [];

			$.getJSON(root_api + "trees/categories", function( data ) {

			    $.each( data, function(key, val) {

			    	if (lookup_family[val.family_common] === undefined) {
			    		lookup_family[val.family_common] = val.order_plant;
			    		families.push(val.family_common);
			    	}

			    	if (lookup_orders[val.order_plant] === undefined) {
			    		lookup_orders[val.order_plant] = 1;
			    		orders.push(val.order_plant);
			    	}

					$('#genus-filter').append('<option value="' + val.genus + '" family="' + val.family_common + '" order="' + val.order_plant + '">' + val.genus + '</option>');
									 
				 });

			    families.sort();
			    orders.sort();

			    for (i=0;i<families.length;i++) {
			    	//bug with the multiselect all behavior when added dynamically
			    	//follow the conversation: https://github.com/davidstutz/bootstrap-multiselect/issues/611
			    	$('#family-filter').append('<option value="' + families[i] + '" + order="' + lookup_family[families[i]] + '">'+families[i]+'</option>');
			    };
			    for (i=0;i<orders.length;i++) {
			    	$('#order-filter').append('<option value="' + orders[i] + '">'+orders[i]+'</option>');
				};

				$('#genus-filter').multiselect('rebuild');
				$("#family-filter").multiselect('rebuild');
				$("#order-filter").multiselect('rebuild');
			    $("#family-filter").multiselect('selectAll', false);
	        	$("#family-filter").multiselect('updateButtonText');
	        	$("#order-filter").multiselect('selectAll', false);
	        	$("#order-filter").multiselect('updateButtonText');
	        	$("#genus-filter").multiselect('selectAll', false);
	        	$("#genus-filter").multiselect('updateButtonText');

			}); //end of getjson function

	    } //end of initialize_filters function

	    var markers = [];
	    var pruneCluster = new PruneClusterForLeaflet();
	    function initialize_clusters() {
	    	$.getJSON( root_api + "trees/" + map.getBounds().getSouth() + "/" + map.getBounds().getNorth() + "/" + map.getBounds().getWest() + "/" + map.getBounds().getEast(), function( data ) {

	    		pruneCluster.PrepareLeafletMarker = function(leafletMarker, data) {
				    leafletMarker.setIcon(treeicon); // See http://leafletjs.com/reference.html#icon
				    //listeners can be applied to markers in this function
				    leafletMarker.on('click', function(){
				    	console.log(data)
				    //do click event logic here
				    });
				    // A popup can already be attached to the marker
				    // bindPopup can override it, but it's faster to update the content instead
				    // if (leafletMarker.getPopup()) {
				    //     leafletMarker.setPopupContent(data.name);
				    // } else {
				    //     leafletMarker.bindPopup(data.name);
				    // }
				}; //end of prepareleafletmarker function

				//Jquery method that allows you to iterate over an array: http://api.jquery.com/jquery.each/
				$.each(data, function(k,v){

					var marker = new PruneCluster.Marker(v.point_y, v.point_x);
					marker.data.genus = v.genus;
					marker.filtered = false;
					pruneCluster.RegisterMarker(marker);
					markers.push(marker);

				});

				map.addLayer(pruneCluster);
				size = markers.length;


	    	}) // end of getJSON data

	    } // end of function initialize_clusters

	    function set_options_multiselect() {

	    	$('#genus-filter').multiselect({
	            enableFiltering: true,
	            nonSelectedText: 'No genus selected',
	            includeSelectAllOption: true,
	            allSelectedText: 'All genus selected',
	            filterPlaceholder: 'Search for something...',
	            onChange: function(option, checked, select) {
	            	filter = option.val();
	                if (checked) {
	                	add_markers(filter);
	                	$('#family-filter').multiselect('select',option.attr("family"));
	                	$('#order-filter').multiselect('select',option.attr("order"));
	                }
	                else {
	                	remove_markers(filter);
	                	$('#family-filter').multiselect('deselect',option.attr("family"));
	                	$('#order-filter').multiselect('deselect',option.attr("order"));
	                }     
	                
	            }, //end of onchange function
	            onSelectAll: function() {
	            	add_all_markers();
	            	$("#family-filter").multiselect("selectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#order-filter").multiselect("selectAll", false);
				    $("#order-filter").multiselect("refresh");
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	remove_all_markers();
	            	$("#family-filter").multiselect("deselectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#order-filter").multiselect("deselectAll", false);
				    $("#order-filter").multiselect("refresh");
				    //hideallLayer();
	            } //end of onselectall function
	        }); // end of genus filter multiselect options

			$('#order-filter').multiselect({
	            enableFiltering: true,
	            nonSelectedText: 'No order selected',
	            includeSelectAllOption: true,
	            allSelectedText: 'All orders selected',
	            filterPlaceholder: 'Search for something...',
	            onChange: function(option, checked, select) {
	                filter = option.val();
	                if (checked) {
	                	$('#genus-filter option').filter('[order="'+ filter +'"]').prop('selected', true).each(function() {
	                		add_markers($(this).val());
	                	});
	                	$('#family-filter option').filter('[order="'+ filter +'"]').prop('selected', true);
	                }
	                else {
	                	$('#genus-filter option').filter('[order="'+ filter +'"]').prop('selected', false).each(function() {
	                		remove_markers($(this).val());
	                	});
	                	$('#family-filter option').filter('[order="'+ filter +'"]').prop('selected', true);
	                }
	                $("#genus-filter").multiselect("refresh");
	                $("#family-filter").multiselect("refresh");
	            }, //end of onchange function
	            onSelectAll: function() {
	            	$("#family-filter").multiselect("selectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("selectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    add_all_markers();
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	$("#family-filter").multiselect("deselectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("deselectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    remove_all_markers();
	            } //end of onselectall function
	        });

			//behavior of the filter
	        $('#family-filter').multiselect({
	            enableFiltering: true,
	            nonSelectedText: 'No family selected',
	            includeSelectAllOption: true,
	            allSelectedText: 'All families selected',
	            filterPlaceholder: 'Search for something...',
	            onChange: function(option, checked, select) {
	                filter = option.val();
	                if (checked) {
	                	$('#genus-filter option').filter('[family="'+filter+'"]').prop('selected', true).each(function() {
	                		add_markers($(this).val());
	                	});
	                	$('#order-filter').multiselect('select',lookup_family[filter]);
	                }
	                else {
	                	$('#genus-filter option').filter('[family="'+filter+'"]').prop('selected', false).each(function() {
	                		remove_markers($(this).val());
	                	});
	                	$('#order-filter').multiselect('deselect',lookup_family[filter]);
	                }
	                $("#genus-filter").multiselect("refresh");
	            }, //end of onchange function
	            onSelectAll: function() {
	            	$("#order-filter").multiselect("selectAll", false);
				    $("#order-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("selectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    add_all_markers();
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	$("#order-filter").multiselect("deselectAll", false);
				    $("#order-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("deselectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    remove_all_markers();
	            } //end of onselectall function
	        });

	    } //end of function set multiselect options

	    function remove_markers(filter) {
	    	        for (var i = 0; i < size; ++i) {
			            markers[i].filtered = (markers[i].filtered | markers[i].data.genus == filter) ? true : false;
			        }
					pruneCluster.ProcessView();
		} // end of filter_makers function

		function add_markers(filter) {
	    	        for (var i = 0; i < size; ++i) {
			            markers[i].filtered = (markers[i].filtered & markers[i].data.genus != filter) ? true : false;
			        }
					pruneCluster.ProcessView();
		} // end of add_makers function

		function remove_all_markers() {
			for (var i = 0; i < size; ++i) {
			        markers[i].filtered = true;
			}
			pruneCluster.ProcessView();
		} // end of remove all markers

		function add_all_markers() {
			for (var i = 0; i < size; ++i) {
			        markers[i].filtered = false;
			}
			pruneCluster.ProcessView();
		}

})//end of document ready function