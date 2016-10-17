var t11 = performance.now();

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

var treeicon_red = L.icon({
    iconUrl: 'img/tree_red.png',
    iconSize: new L.Point(30, 30),
    popupAnchor: new L.Point(0, -10)
});

//define map center
var mapCenter = {lat: 47.654967,lng:-122.312668};

//define tile
var your_tile = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	,ext: 'png', minZoom:12, maxZoom:17});

$(document).ready(function() {

	var t10 = performance.now();
	console.log("Call to load document took " + (t10 - t11) + " milliseconds.")

	//set your map and some options of the view
	var zoom = 14
	map = L.map('map-canvas', {
	 		zoomControl: false, maxZoom: 17
	 		}).setView([mapCenter.lat,mapCenter.lng], zoom);

	//add spinning wheel
	map.spin(true);

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
	console.log(featureLayer);

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
	initialize_clusters();

	var t4 = performance.now();
	console.log("Call to initialize_clusters took " + (t4 - t3) + " milliseconds.");

	//draw the new markers when you stop dragging the map
	map.on('dragend', function onDragEnd(){
		(zoom > 16) ? initialize_trees() : redraw_clusters();
	   });

	map.on('zoomend', function onDragEnd(){
		var new_zoom = map.getZoom();
		if (new_zoom > 16) {
			remove_all_markers();
			initialize_trees();
		}
		else {
			if (new_zoom < zoom) {
			redraw_clusters();
			}
		}
		zoom = new_zoom;
	   });

	//resize svg on resize / use of leaflet map event because conflict with d3 and jquery resize event
	map.on('resize', redraw_clusters);

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

    			zoom = map.getZoom();
    			(zoom > 16) ? initialize_trees() : redraw_clusters();
    		} // end of on change function

    	}); //end of multiselect click event

	function redraw_clusters() {

		//markers = [];
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
									 
				 });

			    families.sort();
			    orders.sort();

			    for (i=0;i<families.length;i++) {
			    	//bug with the multiselect all behavior when added dynamically
			    	//follow the conversation: https://github.com/davidstutz/bootstrap-multiselect/issues/611
			    	family_content += '<option value="' + families[i] + '" + order="' + lookup_family[families[i]] + '">'+families[i]+'</option>';
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

	    var markers;
	    var pruneCluster;
	 
	    function initialize_clusters() {
	    	pruneCluster = new PruneClusterForLeaflet();
	    	markers = [];
	    	$.getJSON( root_api + "trees/" + map.getBounds().getSouth() + "/" + map.getBounds().getNorth() + "/" + map.getBounds().getWest() + "/" + map.getBounds().getEast(), function( data ) {

	    		pruneCluster.PrepareLeafletMarker = function(leafletMarker, data) {
				    leafletMarker.setIcon(treeicon); // See http://leafletjs.com/reference.html#icon
				    //listeners can be applied to markers in this function
				    leafletMarker.on('click', function(){
				    	show_info_marker(leafletMarker,data);
				    });
				    leafletMarker.bindPopup(data.genus);
				    leafletMarker.on('mouseover', function (e) {
				            this.openPopup();
					});
					leafletMarker.on('mouseout', function (e) {
						    this.closePopup();
					});
				}; //end of prepareleafletmarker function

				//Jquery method that allows you to iterate over an array: http://api.jquery.com/jquery.each/
				$.each(data, function(k,v){

					var marker = new PruneCluster.Marker(v.point_y, v.point_x);
					marker.data.genus = v.genus;
					marker.data.compkey = v.compkey;
					marker.data.popup = v.genus;
					marker.filtered = false;
					pruneCluster.RegisterMarker(marker);
					markers.push(marker);

				});

				map.addLayer(pruneCluster);
				size = markers.length;

				pruneCluster.ProcessView();

				map.spin(false);


	    	}) // end of getJSON data

	    } // end of function initialize_clusters

	    //array to store layers for each genus
	    var mapLayerGroups = [];
	    function initialize_trees() {

        	$.getJSON( root_api + "trees/" + map.getBounds().getSouth() + "/" + map.getBounds().getNorth() + "/" + map.getBounds().getWest() + "/" + map.getBounds().getEast(), function( data ) {


        		//create a variable to count the total number of trees displayed in the window
					var total_trees = 0;
					
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

						marker.bindPopup(v.new_common_nam);
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
				        		detail_tree.innerHTML = "<li class='list-group-item'><b>Tree id:</b> " + tree_info.unitid + "</li><li class='list-group-item'><b>Species (Scientific):</b> " + tree_info.new_scientific + "</li><li class='list-group-item'><b>Species (Common):</b> " + tree_info.new_common_nam + "</li><li class='list-group-item'><b>Genus:</b> "+ tree_info.genus + "</li><li class='list-group-item'><b>Family (Scientific):</b> " + tree_info.family + "</li><li class='list-group-item'><b>Family (Common):</b> " + tree_info.family_common + "</li><li class='list-group-item'><b>Order:</b> " + tree_info.order_plant + "</li><li class='list-group-item'><b>Plantation Date:</b> " + planted_da + "</li><li class='list-group-item'><b>Tree Diameter:</b> " + tree_info.diam + "</li><li class='list-group-item'><b>Address:</b> " + tree_info.unitdesc +"</li><li class='list-group-item'><b>Tree Height:</b> " + tree_info.treeheight + "</li><li class='list-group-item'><b>Ownership:</b> " + tree_info.ownership + "</li><li class='list-group-item'><b>Last time it has been verified:</b> " + last_verif + '</li>'; 
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
						total_trees += 1;

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
	                	zoom > 15 ? showLayer(filter) : add_markers(filter);
	                	//add_markers(filter);
	                	$('#family-filter').multiselect('select',option.attr("family"));
	                	$('#order-filter').multiselect('select',option.attr("order"));
	                }
	                else {
	                	zoom > 15 ? removeLayer(filter) : remove_markers(filter);
	                	$('#family-filter').multiselect('deselect',option.attr("family"));
	                	$('#order-filter').multiselect('deselect',option.attr("order"));
	                }     
	                
	            }, //end of onchange function
	            onSelectAll: function() {
	            	zoom > 15 ? showallLayer() : add_all_markers();
	            	$("#family-filter").multiselect("selectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#order-filter").multiselect("selectAll", false);
				    $("#order-filter").multiselect("refresh");
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	zoom > 15 ? clearallLayers : remove_all_markers();
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
	                		zoom > 15 ? showLayer($(this).val()) : add_markers($(this).val());
	                	});
	                	$('#family-filter option').filter('[order="'+ filter +'"]').prop('selected', true);
	                }
	                else {
	                	$('#genus-filter option').filter('[order="'+ filter +'"]').prop('selected', false).each(function() {
	                		zoom > 15 ? removeLayer($(this).val()) : remove_markers($(this).val());
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
				    zoom > 15 ? showallLayer() : add_all_markers();
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	$("#family-filter").multiselect("deselectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("deselectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    zoom > 15 ? clearallLayers : remove_all_markers();
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
	                		zoom > 15 ? showLayer($(this).val()) : add_markers($(this).val());
	                	});
	                	$('#order-filter').multiselect('select',lookup_family[filter]);
	                }
	                else {
	                	$('#genus-filter option').filter('[family="'+filter+'"]').prop('selected', false).each(function() {
	                		zoom > 15 ? removeLayer($(this).val()) : remove_markers($(this).val());
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
				    zoom > 15 ? showallLayer() : add_all_markers();
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	$("#order-filter").multiselect("deselectAll", false);
				    $("#order-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("deselectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    zoom > 15 ? clearallLayers : remove_all_markers();
	            } //end of onselectall function
	        });

	    } //end of function set multiselect options

	    //store previous clicked_marker to color back in green
	    var previous_marker = new L.marker();
	    function show_info_marker(marker, data) {
	    	$.getJSON( root_api + "trees/description/" + data.compkey, function(data) {
				        var tree_info = data[0];
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
				        		// $("#tree_intro").html("glou");
				        		// console.log($("#tree_intro"));
				        var detail_tree = document.getElementById("detail_tree");
				        detail_tree.innerHTML = "<li class='list-group-item'><b>Tree id:</b> " + tree_info.unitid + "</li><li class='list-group-item'><b>Species (Scientific):</b> " + tree_info.new_scientific + "</li><li class='list-group-item'><b>Species (Common):</b> " + tree_info.new_common_nam + "</li><li class='list-group-item'><b>Genus:</b> "+ tree_info.genus + "</li><li class='list-group-item'><b>Family (Scientific):</b> " + tree_info.family + "</li><li class='list-group-item'><b>Family (Common):</b> " + tree_info.family_common + "</li><li class='list-group-item'><b>Order:</b> " + tree_info.order_plant + "</li><li class='list-group-item'><b>Plantation Date:</b> " + planted_da + "</li><li class='list-group-item'><b>Tree Diameter:</b> " + tree_info.diam + "</li><li class='list-group-item'><b>Address:</b> " + tree_info.unitdesc +"</li><li class='list-group-item'><b>Tree Height:</b> " + tree_info.treeheight + "</li><li class='list-group-item'><b>Ownership:</b> " + tree_info.ownership + "</li><li class='list-group-item'><b>Last time it has been verified:</b> " + last_verif + '</li>'; 
				}); // end of getjson function
				if ($(".sidebar").hasClass('collapsed')) {
				    collapse_sidebar();
				};
				//show tree tab
				$("#top-sidebar li").removeClass("active");
				$(".tab-content div").removeClass("active");
				$("#tree_top_sidebar").addClass("active");
				$("#home").addClass("in active");
	    } // end of show_info_marker

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

})//end of document ready function