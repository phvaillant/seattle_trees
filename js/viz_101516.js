var t11 = performance.now();

//define the api url to get data from
var root_api = 'http://ec2-54-234-216-12.compute-1.amazonaws.com:5432/';
//var root_api = 'https://pvaillant.carto.com/api/v2/sql?q=';


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

var treeicon_red = L.icon({
    iconUrl: 'img/tree_red.png',
    iconSize: new L.Point(30, 30),
    popupAnchor: new L.Point(0, -10)
});

// loader settings
var opts = {
  lines: 10, // The number of lines to draw
  length: 15, // The length of each line
  width: 7, // The line thickness
  radius: 14, // The radius of the inner circle
  //color: '#EE3124', // #rgb or #rrggbb or array of colors
  speed: 1.9, // Rounds per second
  trail: 40, // Afterglow percentage
  className: 'spinner', // The CSS class to assign to the spinner
};

//define map center
var mapCenter = {lat: 47.654967,lng:-122.312668};

//define tile
var your_tile = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	,ext: 'png', minZoom:12, maxZoom:17});

//format for date - used later in date grpah
var timeFormat = d3.timeFormat("%Y-%m");

//store some variables for drawing, updating and resizing the graphs
var x_genus = d3.scaleBand(),
	x_date = d3.scaleTime(),
	y = d3.scaleLinear(),
	tip = d3.tip(),
	svg_genus, chart_genus,
	svg_date, chart_date,
	height,
	line = d3.line().x(function(d) { return x_date(new Date(d.planted_da)); })
					    .y(function(d) { return y(+d.total); }),
	//Divides date for tooltip placement
	bisectDate = d3.bisector(function(d) { return d.planted_da; }).left,
	focus;

//store some variables for modal graphs
var x_genus_modal = d3.scaleBand(),
	x_date_modal = d3.scaleTime(),
	y_modal = d3.scaleLinear(),
	tip_modal = d3.tip(),
	focus_modal,
	svg_genus_modal, chart_genus_modal,
	svg_date_modal, chart_date_modal,
	line_modal = d3.line().x(function(d) { return x_date_modal(new Date(d.planted_da)); })
					    .y(function(d) { return y_modal(+d.total); });

//margin function for the graph
var margin = {top: 20, right: 20, bottom: 70, left: 40};

var width_modal = 0.9*window.innerWidth - margin.left - margin.right;

var height_modal = 0.9*window.innerHeight - margin.top - margin.bottom - 45;

//var removed to know when to remove all markers or not
var removed = false;

//store the filters - genus - aiming at inversing indexes
var filters = {};
var filters_active = [];

$(document).ready(function() {

	var t10 = performance.now();
	console.log("Call to load document took " + (t10 - t11) + " milliseconds.")

	//set your map and some options of the view
	var zoom = 14
	map = L.map('map-canvas', {
	 		zoomControl: false, maxZoom: 17
	 		}).setView([mapCenter.lat,mapCenter.lng], zoom);

	//add spinning wheel
	map.spin(true, opts);

	//add zoom control with your options
	L.control.zoom({
		     position:'bottomright'
		}).addTo(map);

	//add tile to your map
	your_tile.addTo(map);


	//add the mapbox layer
	//L.mapbox.accessToken = 'pk.eyJ1IjoiZGVicmljYXNzYXJ0IiwiYSI6IndfVTRGZTQifQ.AnvALWzOAOxnzwSvy7Evfg';
	//var featureLayer = L.mapbox.featureLayer();

	//featureLayer.loadID('debricassart.1m5e0loa');

	var featureLayer = L.mapbox.featureLayer('js/seattle_neighborhoods.geojson');

	//get the lookup_family and lookup_order for switching between layers
	var lookup_family = {},
		lookup_orders = {};

	//initialize the filters
	var t0 = performance.now();
	console.log("Call to load tile took " + (t0 - t10) + " milliseconds.")

	set_options_multiselect();
	var t1 = performance.now();
	console.log("Call to set_options_multiselect took " + (t1 - t0) + " milliseconds.")
	initialize_filters();
	var t2 = performance.now();
	console.log("Call to initialize_filters took " + (t2 - t1) + " milliseconds.")

	//initialize the neighborhoods
	initialize_neighborhoods();

	var t3 = performance.now();
	console.log("Call to initialize_neighborhoods took " + (t3 - t2) + " milliseconds.")


	//initialize clusters
	var markers;
	var pruneCluster = new PruneClusterForLeaflet();
	initialize_clusters();

	var t4 = performance.now();
	console.log("Call to initialize_clusters took " + (t4 - t3) + " milliseconds.");

	//draw the new markers when you stop dragging the map
	map.on('dragend', function onDragEnd(){
		(zoom > 16) ? initialize_trees() : redraw_clusters();
	   });

	map.on('zoomend', function onDragEnd(){
		if (zoom_changed_fit) {zoom = map.getZoom();return;};
		var new_zoom = map.getZoom();
		if (new_zoom > 16) {
			remove_all_markers();
			showallLayer();
			initialize_trees();
		}
		else {
			if (new_zoom < zoom) {
				hideallLayer();
				redraw_clusters();
			}
		}
		zoom = new_zoom;
	   });

	//resize svg on resize / use of leaflet map event because conflict with d3 and jquery resize event // problems on resize
	function resize_all(){
		clear_map();
		init_map();
		resize_graphs();
	    // Haven't resized in 100ms!
	}

	var doit;
	map.on('resize', function(){
	  clearTimeout(doit);
	  doit = setTimeout(resize_all, 500);
	});

	// map.on('resize', function() {
	// 	//redraw_map();
	// 	clear_map();
	// 	init_map();
	// 	resize_graphs();
	// });

	//click event of neighborhoods
	var previous_nhood = -1;
	//otherwise fitbounds might trigger a zoom event
	var zoom_changed_fit = false;
	$('#neighborhoods').multiselect({
    		onChange: function(option, select) {

    			var current_nhood = option.val();
    			(previous_nhood != -1) && map.removeLayer(featureLayer.getLayer(previous_nhood));
    			if (current_nhood == -1) {
    					d3.select("#chart_genus")
    					.select("svg").remove();
    					d3.select("#chart_date")
    					.select("svg").remove();
    			}
    			else {
    				draw_graphs(current_nhood);
    				var layer = featureLayer.getLayer(current_nhood);
    				layer.addTo(map);
    				limits = layer.getBounds();
    				zoom_changed_fit = true;
	    			map.fitBounds(limits);
	    			zoom_changed_fit = false;
	    			clear_map();
	    			init_map();
    			}
    			previous_nhood = current_nhood;

    		} // end of on change function

    }); //end of multiselect click event

	function redraw_clusters() {

		map.spin(true);
		initialize_clusters();

	} // end of function redraw_clusters

	function initialize_neighborhoods() {
		var neighborhood_content = '<option value=-1>No neighborhood selected</option>';
		var neighborhood_container = document.getElementById("neighborhoods");
		featureLayer.on('ready', function() {
		    featureLayer.eachLayer(function(layer) {
		    	nhood = layer.feature.properties.nhood;
		    	name = layer.feature.properties.name;
		    	if (nhood == name) {
		    		neighborhood_content += '<option value="' + layer._leaflet_id + '">'+name+'</option>';
		    	}
		    	else {
		    		neighborhood_content += '<option value="' + layer._leaflet_id + '">'+name+ ' (in ' + nhood + ')</option>';
		    	};
		    	neighborhood_container.innerHTML = neighborhood_content;
		    	$("#neighborhoods").multiselect("rebuild");
	    	});
		});
	} // end of initialize_neighborhoods

	function initialize_filters() {
			
			var families = [];
			var orders = [];

			var genus_content = '';
			var genus_container = document.getElementById("genus-filter");

			var family_content = '';
			var family_container = document.getElementById("family-filter");

			var order_content = '';
			var order_container = document.getElementById("order-filter");

			$.getJSON(root_api + "trees/categories", function( data ) {
			//$.getJSON(root_api + "SELECT * FROM tree_category", function( data ) {

			    $.each( data, function(key, val) {

			    	if (lookup_family[val.family_common] === undefined) {
			    		lookup_family[val.family_common] = val.order_plant;
			    		families.push(val.family_common);
			    	}

			    	if (lookup_orders[val.order_plant] === undefined) {
			    		lookup_orders[val.order_plant] = 1;
			    		orders.push(val.order_plant);
			    	}

					genus_content += '<option value="' + val.genus + '" family="' + val.family_common + '" order="' + val.order_plant + '">' + val.genus + '</option>';
					filters[val.genus] = [];

				 });

			    families.sort();
			    orders.sort();

			    for (i=0;i<families.length;i++) {
			    	//bug with the multiselect all behavior when added dynamically
			    	//follow the conversation: https://github.com/davidstutz/bootstrap-multiselect/issues/611
			    	family_content += '<option value="' + families[i] + '" order="' + lookup_family[families[i]] + '">'+families[i]+'</option>';
			    };
			    for (i=0;i<orders.length;i++) {
			    	order_content += '<option value="' + orders[i] + '">'+orders[i]+'</option>';
				};

				genus_container.innerHTML = genus_content;
				family_container.innerHTML = family_content;
				order_container.innerHTML = order_content;

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
	 
	    function initialize_clusters() {
	    	//pruneCluster = new PruneClusterForLeaflet();
	    	pruneCluster.RemoveMarkers();
	    	markers = [];
	    	//size = 0;
	    	$.getJSON( root_api + "trees/" + map.getBounds().getSouth() + "/" + map.getBounds().getNorth() + "/" + map.getBounds().getWest() + "/" + map.getBounds().getEast(), function( data ) {
	    	//$.getJSON( root_api + "SELECT * FROM tree_filter WHERE point_x BETWEEN " map.getBounds().getSouth() + "AND " + map.getBounds().getNorth() + " AND point_y BETWEEN " + map.getBounds().getWest() + " AND " + map.getBounds().getEast(), function( data ) {

				//Jquery method that allows you to iterate over an array: http://api.jquery.com/jquery.each/
				$.each(data, function(k,v){

					var marker = new PruneCluster.Marker(v.point_y, v.point_x);
					marker.data.icon = treeicon;
					marker.data.genus = v.genus;
					marker.data.compkey = v.compkey;
					marker.data.popup = v.genus;
					if (filters_active.indexOf(v.genus) > -1) {
						marker.filtered = true;
					} 
					else {
						marker.filtered = false;
					}
					pruneCluster.RegisterMarker(marker);
					markers.push(marker);
					filters[v.genus].push(marker);

				});

				map.addLayer(pruneCluster);
				size = markers.length;

				pruneCluster.ProcessView();

				map.spin(false);

	    	}) // end of getJSON data

	    } // end of function initialize_clusters

	    //array to store layers for each genus
	    var mapLayerGroups = [];
	    //store previous clicked_marker to color back in green
	    var previous_marker = new L.marker();
	    function initialize_trees() {

        	$.getJSON( root_api + "trees/" + map.getBounds().getSouth() + "/" + map.getBounds().getNorth() + "/" + map.getBounds().getWest() + "/" + map.getBounds().getEast(), function( data ) {

        		//create a variable to count the total number of trees displayed in the window
					//var total_trees = 0;
					
					//Jquery method that allows you to iterate over an array: http://api.jquery.com/jquery.each/
					$.each(data, function(k,v){

						//does layerGroup already exist? if not create it and add to map
					    var layer = mapLayerGroups[v.genus];

					    if (layer === undefined) {
					        layer = new L.layerGroup();
					        //add the layer to the map
					        layer.addTo(map);
					        //store layer
					        mapLayerGroups[v.genus] = layer;
					    } // end of if condition

					    //Create markers with the customized icon.
					    var marker = L.marker([v.point_y, v.point_x],{icon: treeicon});
					    var popup = L.popup({closeButton:false})
							    	.setContent(v.new_common_nam)

						marker.bindPopup(popup);
						marker.on('mouseover', function (e) {
				            this.openPopup();
				        });
				        marker.on('mouseout', function (e) {
				            this.closePopup();
				        });

				        marker.on('click', function() {
				        	$.getJSON( root_api + "trees/description/" + v.compkey, function(data) {
				        		tree_info = data[0];
				        		previous_marker.setIcon(treeicon);
				        		previous_marker = marker;
				        		marker.setIcon(treeicon_red);
				        		var planted_da;
				        		var last_verif;
				        		if (tree_info.planted_da) {
				        			planted_da = tree_info.planted_da.substr(0,10)
				        		}
				        		else {
				        			planted_da = "Unknown"
				        		}
				        		if (tree_info.last_verif) {
				        			last_verif = tree_info.last_verif.substr(0,10)
				        		}
				        		else {
				        			last_verif = "Unknown"
				        		}
				        		var detail_tree = document.getElementById("detail_tree");
				        		detail_tree.innerHTML = "<ul class='list-group'><li class='list-group-item'><b>Tree id:</b> " + tree_info.unitid + "</li><li class='list-group-item'><b>Species (Scientific):</b> " + tree_info.new_scientific + "</li><li class='list-group-item'><b>Species (Common):</b> " + tree_info.new_common_nam + "</li><li class='list-group-item'><b>Genus:</b> "+ tree_info.genus + "</li><li class='list-group-item'><b>Family (Scientific):</b> " + tree_info.family + "</li><li class='list-group-item'><b>Family (Common):</b> " + tree_info.family_common + "</li><li class='list-group-item'><b>Order:</b> " + tree_info.order_plant + "</li><li class='list-group-item'><b>Plantation Date:</b> " + planted_da + "</li><li class='list-group-item'><b>Tree Diameter:</b> " + tree_info.diam + "</li><li class='list-group-item'><b>Address:</b> " + tree_info.unitdesc +"</li><li class='list-group-item'><b>Tree Height:</b> " + tree_info.treeheight + "</li><li class='list-group-item'><b>Ownership:</b> " + tree_info.ownership + "</li><li class='list-group-item'><b>Last time it has been verified:</b> " + last_verif + "</li><li class='list-group-item'><a href=' " + tree_info.wikipedia_url + "' target='_blank'><b>Website for more information</b></a>" 

				        	}); // end of getjson function
				        	if ($(".sidebar").hasClass('collapsed')) {
				        		collapse_sidebar();
				        	};
				        	//show tree tab
				        	$("#top-sidebar li").removeClass("active");
				        	$(".tab-content div").removeClass("active");
				        	$("#tree_top_sidebar").addClass("active");
				        	$("#home").addClass("in active");
				        }); // end of marker on click function

					    //add the feature to the layer
					    //layer.addLayer(featureLayer); 
					    marker.addTo(layer);

						//count the number of trees
						//total_trees += 1;

					}); // end of the each function

			}); // end of the getjson function

        } // end of initialize_trees function

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
	                	filters_active.splice(filters_active.indexOf(filter),1);
	                	(zoom > 16) ? showLayer(filter) : add_markers(filter);
	                	//add_markers(filter);
	                	$('#family-filter').multiselect('select',option.attr("family"));
	                	$('#order-filter').multiselect('select',option.attr("order"));
	                }
	                else {
	                	filters_active.push(filter);
	                	(zoom > 16) ? removeLayer(filter) : remove_markers(filter);
	                	$('#family-filter').multiselect('deselect',option.attr("family"));
	                	$('#order-filter').multiselect('deselect',option.attr("order"));
	                }     
	                
	            }, //end of onchange function
	            onSelectAll: function() {
	            	filters_active = [];
	            	add_all_map();
	            	//(zoom > 16) ? showallLayer() : add_all_markers();
	            	$("#family-filter").multiselect("selectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#order-filter").multiselect("selectAll", false);
				    $("#order-filter").multiselect("refresh");
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	filters_active = Object.keys(filters);
	            	clear_map();
	            	//zoom > 15 ? clearallLayers : remove_all_markers();
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
	                		(zoom > 16) ? showLayer($(this).val()) : add_markers($(this).val());
	                	});
	                	$('#family-filter option').filter('[order="'+ filter +'"]').prop('selected', true);
	                }
	                else {
	                	$('#genus-filter option').filter('[order="'+ filter +'"]').prop('selected', false).each(function() {
	                		(zoom > 16) ? removeLayer($(this).val()) : remove_markers($(this).val());
	                	});
	                	$('#family-filter option').filter('[order="'+ filter +'"]').prop('selected', false);
	                }
	                $("#genus-filter").multiselect("refresh");
	                $("#family-filter").multiselect("refresh");
	            }, //end of onchange function
	            onSelectAll: function() {
	            	$("#family-filter").multiselect("selectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("selectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    zoom > 16 ? showallLayer() : add_all_markers();
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	$("#family-filter").multiselect("deselectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("deselectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    zoom > 16 ? clearallLayers : remove_all_markers();
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
	                		zoom > 16 ? showLayer($(this).val()) : add_markers($(this).val());
	                	});
	                	$('#order-filter').multiselect('select',lookup_family[filter]);
	                }
	                else {
	                	$('#genus-filter option').filter('[family="'+filter+'"]').prop('selected', false).each(function() {
	                		zoom > 16 ? removeLayer($(this).val()) : remove_markers($(this).val());
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
				    zoom > 16 ? showallLayer() : add_all_markers();
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	$("#order-filter").multiselect("deselectAll", false);
				    $("#order-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("deselectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    zoom > 16 ? clearallLayers : remove_all_markers();
	            } //end of onselectall function
	        });

	    } //end of function set multiselect options

	    // function redraw_map() {
	    // 	clear_map();
	    // 	init_map();
	    // }

	    function init_map() {
	    	(zoom > 16) ? initialize_trees() : redraw_clusters();
	    }

	    function clear_map() {
	    	(zoom > 16) ? clearallLayers() : remove_all_markers();
	    }

	    function add_all_map() {
	    	(zoom > 16) ? showallLayer() : add_all_markers();
	    }

	    function remove_markers(filter) {
	    	//remove size from the variables?
	    	        for (var i = 0; i < size; ++i) {
			            markers[i].filtered = (markers[i].filtered | markers[i].data.genus == filter) ? true : false;
			        }
					pruneCluster.ProcessView();
		} // end of remove_markers function

		function add_markers(filter) {
	    	        for (var i = 0; i < size; ++i) {
			            markers[i].filtered = (markers[i].filtered & markers[i].data.genus != filter) ? true : false;
			        }
					pruneCluster.ProcessView();
		} // end of add_makers function

		function remove_all_markers() {
			//remove size from the variables?
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
		} // end of add all markers function

		function showLayer(id) {
		    var layer = mapLayerGroups[id];
		    if (!(layer === undefined)) {
		    	map.addLayer(layer); 
		    }  
		}
		function hideLayer(id) {
		    var layer = mapLayerGroups[id];
		    if (!(layer === undefined)) {
		    	map.removeLayer(layer); 
		    }    
		}

		function showallLayer() {
			for (id in mapLayerGroups) {
				var layer = mapLayerGroups[id];
				map.addLayer(layer);
			}
		}

		function hideallLayer() {
			for (id in mapLayerGroups) {
				var layer = mapLayerGroups[id];
				map.removeLayer(layer);
			}
		}

		function clearallLayers() {
			for (id in mapLayerGroups) {
				var layer = mapLayerGroups[id];
				layer.clearLayers();
			}
		}

///////////////////////////////////////////////////////
////graphs functions

// loader settings
var target_chart_genus = document.getElementById('chart_genus');
var target_chart_date = document.getElementById('chart_date');



//elem variable to draw or not draw graphs
var elem = null;
function draw_graphs(nhood) {
	elem = document.getElementById('svg_genus');
	(elem == null) ? init(nhood) : update_graphs(nhood);
}

function init(nhood) {

	// trigger loader
    var spinner_genus = new Spinner(opts).spin(target_chart_genus);
    var spinner_date = new Spinner(opts).spin(target_chart_date);

	d3.queue()
		.defer(d3.json, root_api + "trees/common/neighborhood/" + nhood)
		.defer(d3.json, root_api + "trees/date/neighborhood/" + nhood)
		.awaitAll(start_graphs);

	function start_graphs(error, data) {
		spinner_genus.stop();
		spinner_date.stop();

        // code to execute within callback
        initialize_graphs(nhood,data[0],data[1]);
	}
} // end of init(nhood) function

function initialize_graphs(nhood, data_genus, data_date) {

	    var width = parseInt(d3.select('#chart_genus').style('width')) - margin.left - margin.right;

		height = parseInt(d3.select('#chart_genus').style('height')) - margin.top - margin.bottom;

			// set the ranges
		x_genus.range([0, width])
				          .padding(0.1);

		x_date.range([0, width]);

		y.range([height, 0]);

		draw_graph_genus(nhood,data_genus);

		initialize_graph_genus_modal();

		draw_graph_date(nhood, data_date);

		initialize_graph_date_modal();

		function draw_graph_genus(nhood,data_genus) {

		    	svg_genus = d3.select("#chart_genus").append("svg")
		    		.attr("id","svg_genus")
				    .attr("width", width + margin.left + margin.right)
				    .attr("height", height + margin.top + margin.bottom);
			
				svg_genus.on('click', function() {
					update_graph_genus_modal(nhood);
					$("#graph_modal").modal();
				});

				chart_genus = svg_genus.append("g")
							.attr("class","chart")
					    	.attr("transform", 
					          "translate(" + margin.left + "," + margin.top + ")");

				tip.attr('class', 'd3-tip')
						  .offset([-10, 0])
						  .html(function(d) {
						    return "<strong>Number of trees:</strong> <span style='color:red'>" + d.total + "</span>";
						  });

				svg_genus.call(tip);

					data_genus.forEach(function(d) {
					    d.total = +d.total;
					  });

					  // Scale the range of the data in the domains
					  x_genus.domain(data_genus.map(function(d) { return d.genus;}))
					  y.domain([0, d3.max(data_genus, function(d) { return d.total;})]);

					  // append the rectangles for the bar chart
					  chart_genus.selectAll(".bar")
					  		.data(data_genus, function(d) { return d.genus;})
					    .enter().append("rect")
					      .attr("class", "bar")
					      .attr("x", function(d) { return x_genus(d.genus); })
					      .attr("width", x_genus.bandwidth())
					      .attr("y", function(d) { return y(d.total); })
					      .attr("height", function(d) { return height - y(d.total); })
		      			  .on('mouseover', function(d,i) {
		      			  	previous_marker.setIcon(treeicon);
		      			  	tip.show(d,i);
		      			  	mapLayerGroups[d.genus].eachLayer(function(marker) {
		      			  		marker.setIcon(treeicon_red);
		      			  	});
		      			  })
		      			  .on('mouseout', function(d,i) {
		      			  	tip.hide(d,i);
		      			  	mapLayerGroups[d.genus].eachLayer(function(marker) {
		      			  		marker.setIcon(treeicon);
		      			  	});
		      			  });

					  // add the x Axis
					  chart_genus.append("g")
					  	  .attr("class","xaxis")
					      .attr("transform", "translate(0," + height + ")")
					      .call(d3.axisBottom(x_genus))
					      .selectAll("text")
						    .attr("y", 0)
						    .attr("x", 9)
						    .attr("dy", ".35em")
						    .attr("transform", "rotate(90)")
						    .style("text-anchor", "start");;

					  // add the y Axis
					  chart_genus.append("g")
					      .attr("class","yaxis")
					      .call(d3.axisLeft(y));

				//}); //end of function getjson

		} // end of function draw_graph_genus

		function draw_graph_date(nhood, data_date) {

				svg_date = d3.select("#chart_date").append("svg")
				    .attr("width", width + margin.left + margin.right)
				    .attr("height", height + margin.top + margin.bottom);

				svg_date.on('click', function() {
					update_graph_date_modal(nhood);
					$("#graph_modal_date").modal();
				});
				  
				chart_date = svg_date.append("g")
				  	.attr("class","chart")
				    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

				// $.getJSON( root_api + "trees/date/neighborhood/" + nhood, function(data) {

				x_date.domain(d3.extent(data_date, function(d) { return new Date(d.planted_da); }));
				 y.domain(d3.extent(data_date, function(d) { return +d.total; }));

				  //Tooltips
				  focus = chart_date.append("g")
				      .attr("class", "focus")
				      .style("display", "none");

				  //Adds circle to focus point on line
				  focus.append("circle")
				      .attr("r", 4);

				  //Adds text to focus point on line    
				  focus.append("text")
				      .attr("x", 9)
				      .attr("dy", ".35em");    
				  
				  //Creates larger area for tooltip   
				  var overlay = chart_date.append("rect")
				      .attr("class", "overlay")
				      .attr("width", width)
				      .attr("height", height)
				      .on("mouseover", function() { focus.style("display", null); })
				      .on("mouseout", function() { focus.style("display", "none"); })
				      .on("mousemove", mousemove);
				  
				  //Tooltip mouseovers 
				  function mousemove() {
				    var x0 = x_date.invert(d3.mouse(this)[0]),
				        i = bisectDate(data_date, x0, 1),
				        d0 = data_date[i - 1],
				        d1 = data_date[i],
				        d = x0 - d0.planted_da > d1.planted_da - x0 ? d1 : d0;
				    focus.attr("transform", "translate(" + x_date(d.planted_da) + "," + y(d.total) + ")");
				    focus.select("text").text(d.total);
				  };            

				  chart_date.append("g")
				      .attr("class", "xaxis")
				      .attr("transform", "translate(0," + height + ")")
				      .call(d3.axisBottom(x_date))
				      .selectAll("text")
						    .attr("y", 0)
						    .attr("x", 9)
						    .attr("dy", ".35em")
						    .attr("transform", "rotate(90)")
						    .style("text-anchor", "start"); ;

				  chart_date.append("g")
				      .attr("class", "yaxis")
				      .call(d3.axisLeft(y))
				    .append("text")
				      .attr("class", "axis-title")
				      .attr("transform", "rotate(-90)")
				      .attr("y", 6)
				      .attr("dy", ".71em")
				      .style("text-anchor", "end")
				      .text("Number of trees planted");

				 chart_date.append("path")
				      .datum(data_date)
				      .attr("class", "line")
				      .attr("d", line);

	    	} // end of function draw_graph_date

	    } // end of function initialize_graphs

	    function initialize_graph_genus_modal() {

			// set the ranges
			x_genus_modal.range([0, width_modal])
				          .padding(0.1);

			y_modal.range([height_modal, 0]);

			svg_genus_modal = d3.select("#graph_modal").select(".modal-body").append("svg")
				    .attr("width", width_modal + margin.left + margin.right)
				    .attr("height", height_modal + margin.top + margin.bottom);
			
			chart_genus_modal = svg_genus_modal.append("g")
							.attr("class","chart")
					    	.attr("transform", 
					          "translate(" + margin.left + "," + margin.top + ")");

			tip_modal.attr('class', 'd3-tip modal-tip')
						  .offset([-10, 0])
						  .html(function(d) {
						    return "<strong>Number of trees:</strong> <span style='color:red'>" + d.total + "</span>";
						  });

			svg_genus_modal.call(tip_modal);

	    } // end of function draw_graph_genus_modal

	    function update_graph_genus_modal(nhood) {

			$.getJSON( root_api + "trees/common/neighborhood/" + nhood, function(data) {

					// format the data
					  data.forEach(function(d) {
					    d.total = +d.total;
					  });

					  // Scale the range of the data in the domains
					  x_genus_modal.domain(data.map(function(d) { return d.genus; }));
					  y_modal.domain([0, d3.max(data, function(d) { return d.total; })]);

					  var bar = chart_genus_modal.selectAll(".bar")
	        			.data(data, function(d) { return d.genus; });

	        		//enter new data
	        		bar.enter().append("rect")
					   .attr("class", "bar")
					   .on('mouseover', function(d,i) {
		      			  	tip_modal.show(d,i);
		      			  })
	      			  .on('mouseout', function(d,i) {
	      			  	tip_modal.hide(d,i);
	      			    })
						   .attr("x", function(d) { return x_genus_modal(d.genus); })
						   .attr("y", function(d) { return y_modal(d.total); })
						   .attr("height", function(d) { return height_modal - y_modal(d.total); })
						   .attr("width", x_genus_modal.bandwidth());

	        		//remove the bars not corresponding to new genus
	        		bar.exit().remove();

	        		//update bars already present
	        		bar.attr("x", function(d) { return x_genus_modal(d.genus); })
								.attr("y", function(d) { return y_modal(d.total); })
								.attr("height", function(d) { return height_modal - y_modal(d.total); })
								.attr("width", x_genus_modal.bandwidth());

					//remove preivous axes
					chart_genus_modal.select(".yaxis").remove();
					chart_genus_modal.select(".xaxis").remove();

					//draw x axis
					chart_genus_modal.append("g")
					  	  .attr("class","xaxis")
					      .attr("transform", "translate(0," + height_modal + ")")
					      .call(d3.axisBottom(x_genus_modal))
					      .selectAll("text")
						    .attr("y", 0)
						    .attr("x", 9)
						    .attr("dy", ".35em")
						    .attr("transform", "rotate(90)")
						    .style("text-anchor", "start"); 

					//draw y axis
					chart_genus_modal.append("g")
					      .attr("class","yaxis")
					      	.call(d3.axisLeft(y_modal));

			}); // end of getjson function

	    } // end of update graph modal function

	    function initialize_graph_date_modal() {

	    	// set the ranges
			x_date_modal.range([0, width_modal]);

	    	svg_date_modal = d3.select("#graph_modal_date").select(".modal-body").append("svg")
				    .attr("width", width_modal + margin.left + margin.right)
				    .attr("height", height_modal + margin.top + margin.bottom);
			
			chart_date_modal = svg_date_modal.append("g")
							.attr("class","chart")
					    	.attr("transform", 
					          "translate(" + margin.left + "," + margin.top + ")");

			//Tooltips
			focus_modal = chart_date_modal.append("g")
				      .attr("class", "focus")
				      .style("display", "none");

			//Adds circle to focus point on line
			focus_modal.append("circle")
				      .attr("r", 4);

			//Adds text to focus point on line    
			focus_modal.append("text")
				      .attr("x", 9)
				      .attr("dy", ".35em");    
				  
			//Creates larger area for tooltip   
			var overlay = chart_date_modal.append("rect")
				      .attr("class", "overlay")
				      .attr("width", width_modal)
				      .attr("height", height_modal)
				      .on("mouseover", function() { focus_modal.style("display", null); })
				      .on("mouseout", function() { focus_modal.style("display", "none"); });

			chart_date_modal.append("path")
				      .attr("class", "line")

			chart_date_modal.append("g")
				      .attr("class", "xaxis")
				      .attr("transform", "translate(0," + height_modal + ")")
				      .call(d3.axisBottom(x_date_modal))
				      .selectAll("text")
						    .attr("y", 0)
						    .attr("x", 9)
						    .attr("dy", ".35em")
						    .attr("transform", "rotate(90)")
						    .style("text-anchor", "start"); ;

			chart_date_modal.append("g")
				      .attr("class", "yaxis")
				      .call(d3.axisLeft(y_modal))
				    .append("text")
				      .attr("class", "axis-title")
				      .attr("transform", "rotate(-90)")
				      .attr("y", 6)
				      .attr("dy", ".71em")
				      .style("text-anchor", "end")
				      .text("Number of trees planted");

	    } // end of initialize graph date modal function

	    function update_graph_date_modal(nhood) {

	    	$.getJSON( root_api + "trees/date/neighborhood/" + nhood, function(data) {

					  // Scale the range of the data in the domains
					  x_date_modal.domain(d3.extent(data, function(d) { return new Date(d.planted_da); }));
				  	  y_modal.domain(d3.extent(data, function(d) { return +d.total; }));

				  	  svg = svg_date_modal.select(".line").datum(data);
					  svg.transition()
					  		.duration(750).attr("d", line_modal);

			          svg_date_modal.transition().select(".xaxis") // change the x axis
			            .duration(750)
			            .call(d3.axisBottom(x_date_modal))
			            .selectAll("text")
						    .attr("y", 0)
						    .attr("x", 9)
						    .attr("dy", ".35em")
						    .attr("transform", "rotate(90)")
						    .style("text-anchor", "start"); ;

			          svg_date_modal.transition().select(".yaxis") // change the y axis
			            .duration(750)
			            .call(d3.axisLeft(y_modal));

			          chart_date_modal.select(".overlay")
			          			.on("mousemove",mousemove);

			          //Tooltip mouseovers            
					  function mousemove() {
					    var x0 = x_date_modal.invert(d3.mouse(this)[0]),
					        i = bisectDate(data, x0, 1),
					        d0 = data[i - 1],
					        d1 = data[i],
					        d = x0 - d0.planted_da > d1.planted_da - x0 ? d1 : d0;
					    focus_modal.attr("transform", "translate(" + x_date_modal(d.planted_da) + "," + y_modal(d.total) + ")");
					    focus_modal.select("text").text(d.total);
					  }; 

				}); //end of getjson function

	    } // end of update graph date modal function



	    function update_graphs(nhood) {

	    	update_graph_genus(nhood);

	    	update_graph_date(nhood);

	    	function update_graph_date(nhood) {

	    		svg_date.on('click', function() {
					$("#graph_modal_date").modal();
					update_graph_date_modal(nhood);
				});

		    	 $.getJSON( root_api + "trees/date/neighborhood/" + nhood, function(data) {

					  // Scale the range of the data in the domains
					  x_date.domain(d3.extent(data, function(d) { return new Date(d.planted_da); }));
				  	  y.domain(d3.extent(data, function(d) { return +d.total; }));

				  	  svg = svg_date.select(".line").datum(data);
					  svg.transition()
					  		.duration(750)
					        .attr("d", line);

			          svg_date.transition().select(".xaxis") // change the x axis
			            .duration(750)
			            .call(d3.axisBottom(x_date))
			            .selectAll("text")
						    .attr("y", 0)
						    .attr("x", 9)
						    .attr("dy", ".35em")
						    .attr("transform", "rotate(90)")
						    .style("text-anchor", "start"); ;

			          svg_date.transition().select(".yaxis") // change the y axis
			            .duration(750)
			            .call(d3.axisLeft(y));

			          chart_date.select(".overlay")
			          			.on("mousemove",mousemove);

			          //Tooltip mouseovers            
					  function mousemove() {
					    var x0 = x_date.invert(d3.mouse(this)[0]),
					        i = bisectDate(data, x0, 1),
					        d0 = data[i - 1],
					        d1 = data[i],
					        d = x0 - d0.planted_da > d1.planted_da - x0 ? d1 : d0;
					    focus.attr("transform", "translate(" + x_date(d.planted_da) + "," + y(d.total) + ")");
					    focus.select("text").text(d.total);
					  }; 

				}); //end of getjson function

		    } // end of function update graph date

	    	function update_graph_genus(nhood) {

	    		svg_genus.on('click', function() {
					$("#graph_modal").modal();
					update_graph_genus_modal(nhood);
				});

	    		$.getJSON( root_api + "trees/common/neighborhood/" + nhood, function(data) {

					// format the data
					  data.forEach(function(d) {
					    d.total = +d.total;
					  });

					  // Scale the range of the data in the domains
					  x_genus.domain(data.map(function(d) { return d.genus; }));
					  y.domain([0, d3.max(data, function(d) { return d.total; })]);

					  var bar = chart_genus.selectAll(".bar")
	        			.data(data, function(d) { return d.genus; });

	        		//enter new data
	        		bar.enter().append("rect")
					   .attr("class", "bar")
					   .on('mouseover', function(d,i) {
		      			  	previous_marker.setIcon(treeicon);
		      			  	tip.show(d,i);
		      			  	mapLayerGroups[d.genus].eachLayer(function(marker) {
		      			  		marker.setIcon(treeicon_red);
		      			  	});
		      			  })
	      			  .on('mouseout', function(d,i) {
	      			  	tip.hide(d,i);
	      			  	mapLayerGroups[d.genus].eachLayer(function(marker) {
		      			  		marker.setIcon(treeicon);
		      			  	})
	      			    })
	       			   .transition()
	       			   		.duration(750)
						   .attr("x", function(d) { return x_genus(d.genus); })
						   .attr("y", function(d) { return y(d.total); })
						   .attr("height", function(d) { return height - y(d.total); })
						   .attr("width", x_genus.bandwidth());

	        		//remove the bars not corresponding to new genus
	        		bar.exit().remove();

	        		//update bars already present
	        		bar.transition()
	       			   		.duration(750)
							   .attr("x", function(d) { return x_genus(d.genus); })
								.attr("y", function(d) { return y(d.total); })
								.attr("height", function(d) { return height - y(d.total); })
								.attr("width", x_genus.bandwidth());

					//remove preivous axes
					chart_genus.select(".yaxis").remove();
					chart_genus.select(".xaxis").remove();

					//draw x axis
					chart_genus.append("g")
					  	  .attr("class","xaxis")
					      .attr("transform", "translate(0," + height + ")")
					      .call(d3.axisBottom(x_genus))
					      .selectAll("text")
						    .attr("y", 0)
						    .attr("x", 9)
						    .attr("dy", ".35em")
						    .attr("transform", "rotate(90)")
						    .style("text-anchor", "start"); 

					//draw y axis
					chart_genus.append("g")
					      .attr("class","yaxis")
					      .transition() // change the y axis
				            .duration(750)
					      	.call(d3.axisLeft(y));

				}); //end of getjson function

	    	} // end of update_graph_genus function
	    	
	    } // end of function update graphs

	    function resize_graphs() {

			if (elem == null) { return };

	    	width_modal = 0.9*window.innerWidth - margin.left - margin.right;

	    	height_modal = 0.9*window.innerHeight - margin.top - margin.bottom - 45;

	    	var width = parseInt(d3.select('#chart_genus').style('width')) - margin.left - margin.right;

			height = parseInt(d3.select('#chart_genus').style('height')) - margin.top - margin.bottom;

			// set the ranges
			x_genus.range([0, width]);	
			x_date.range([0, width]);		
			y.range([height, 0]);

			x_genus_modal.range([0, width_modal]);	
			x_date_modal.range([0, width_modal]);		
			y_modal.range([height_modal, 0]);

			resize_graph_genus();
			resize_graph_date();

			resize_graph_genus_modal();
			resize_graph_date_modal();

			function resize_graph_genus() {

				 svg_genus.attr("width", width + margin.left + margin.right)
			    	.attr("height", height + margin.top + margin.bottom);

				 chart_genus.attr("width", width + margin.left + margin.right)
				    .attr("height", height + margin.top + margin.bottom);

				 chart_genus.selectAll(".bar")
				      .attr("x", function(d) { return x_genus(d.genus); })
				      .attr("width", x_genus.bandwidth())
				      .attr("y", function(d) { return y(d.total); })
				      .attr("height", function(d) { return height - y(d.total); })

				 chart_genus.select(".xaxis").attr("transform", "translate(0," + height + ")")
				 				.call(d3.axisBottom(x_genus));

				 chart_genus.select(".yaxis").call(d3.axisLeft(y));

			} // end of resize graph genus function

			function resize_graph_genus_modal() {

				 svg_genus_modal.attr("width", width_modal + margin.left + margin.right)
			    	.attr("height", height_modal + margin.top + margin.bottom);

				 chart_genus_modal.attr("width", width_modal + margin.left + margin.right)
				    .attr("height", height + margin.top + margin.bottom);

				 chart_genus_modal.selectAll(".bar")
				      .attr("x", function(d) { return x_genus_modal(d.genus); })
				      .attr("width", x_genus_modal.bandwidth())
				      .attr("y", function(d) { return y_modal(d.total); })
				      .attr("height", function(d) { return height_modal - y_modal(d.total); })

				 chart_genus_modal.select(".xaxis").attr("transform", "translate(0," + height_modal + ")")
				 				.call(d3.axisBottom(x_genus_modal));

				 chart_genus_modal.select(".yaxis").call(d3.axisLeft(y_modal));

			} // end of resize graph genus function

			function resize_graph_date() {

				 svg_date.attr("width", width + margin.left + margin.right)
			    	.attr("height", height + margin.top + margin.bottom);

				 chart_date.attr("width", width + margin.left + margin.right)
				    .attr("height", height + margin.top + margin.bottom);

				 chart_date.select(".line")
				      .attr("d", line);

				 chart_date.select(".xaxis")
				 	  .attr("transform", "translate(0," + height + ")")
				      .call(d3.axisBottom(x_date));

				 chart_date.select(".yaxis")
				      .call(d3.axisLeft(y));

			} // end of resize graph date function

			function resize_graph_date_modal() {

				 svg_date_modal.attr("width", width_modal + margin.left + margin.right)
			    	.attr("height", height_modal + margin.top + margin.bottom);

				 chart_date_modal.attr("width", width_modal + margin.left + margin.right)
				    .attr("height", height_modal + margin.top + margin.bottom);

				 chart_date_modal.select(".line")
				      .attr("d", line_modal);

				 chart_date_modal.select(".xaxis")
				 	  .attr("transform", "translate(0," + height_modal + ")")
				      .call(d3.axisBottom(x_date_modal));

				 chart_date_modal.select(".yaxis")
				      .call(d3.axisLeft(y_modal));

			} // end of resize graph date function

	    } // end of resize graphs function

})//end of document ready function