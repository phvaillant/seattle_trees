var t11 = performance.now();

//define the api url to get data from
//var root_api = 'http://ec2-54-234-216-12.compute-1.amazonaws.com:5432/';
var root_api = 'https://pvaillant.carto.com/api/v2/sql?q=';

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

//var your_tile = L.tileLayer('http://tile.stamen.com/watercolor/{z}/{x}/{y}.png');
var imageworld = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}),
    stamentonerlite   = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	subdomains: 'abcd',
	minZoom: 11,
	maxZoom: 19,
	ext: 'png'
}),
    watercolor = L.tileLayer('http://tile.stamen.com/watercolor/{z}/{x}/{y}.png');

//var removed to know when to remove all markers or not
var removed = false;

//store the filters - genus - aiming at inversing indexes
var filters = [];
//var filters = {};
var filters_active = [];

//for marker display of trees
var mapLayerGroups = [];

//decide when to stop clustering and show all trees
var zoom_threshold = 16;

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

$(document).ready(function() {

	var t10 = performance.now();
	console.log("Call to load document took " + (t10 - t11) + " milliseconds.")

	//set your map and some options of the view
	var zoom = 14;
	map = L.map('map-canvas', {
		 		zoomControl: false, maxZoom: 19, minZoom: 11,
		 		layers: stamentonerlite
	 		}).setView([mapCenter.lat,mapCenter.lng], zoom);

	var baseMaps = {
		"Watercolor": watercolor,
	    "World Imagery": imageworld,
	    "Stamen Toner Lite": stamentonerlite
	};

	L.control.layers(baseMaps, null, {position: 'topleft'}).addTo(map);

	//add spinning wheel
	map.spin(true, opts);

	//add zoom control with your options
	L.control.zoom({
		     position:'bottomright'
		}).addTo(map);

	//add geocoder search box
	map.addControl( new L.Control.Search({
		url: 'http://nominatim.openstreetmap.org/search?format=json&q={s}&viewbox=-123,47,-121.5,48&bounded=1',
		jsonpParam: 'json_callback',
		propertyName: 'display_name',
		propertyLoc: ['lat','lon'],
		//zoom:17,
		marker: L.circleMarker([0,0],{radius:10, color:'red'}),
		autoCollapse: true,
		autoType: false,
		filterData: 'Seattle',
		minLength: 2,
		moveToLocation: function(latlng, title, map) {
  			map.setView(latlng, 17); // access the zoom
  			if (zoom == 17) {
  				remove_all_markers();
				showallLayer();
				initialize_trees();
  			};
		},
		position:'topleft'
	}) );

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

	//draw the new markers when you stop dragging the map
	map.on('dragend', function onDragEnd(){
		if (zoom > zoom_threshold) {
			clearallLayers();
			initialize_trees();
		};
	});

	map.on('zoomend', onZoomEnd);

	function onZoomEnd() {
		var new_zoom = map.getZoom();
		if (new_zoom > zoom_threshold) {
			if (zoom <= zoom_threshold) {
				remove_all_markers();
				showallLayer();
				initialize_trees();
			}
			else if (zoom > new_zoom) {
				initialize_trees();
			}
		}
		else if (zoom > zoom_threshold) {
			clearallLayers();
			add_all_markers();
		}
		zoom = new_zoom;
		pruneCluster.ProcessView();
	} // end of function onZoomEnd;

	function onSearchEnd() {
		var new_zoom = map.getZoom();
		if (zoom <= zoom_threshold) {
				remove_all_markers();
				showallLayer();
			}
		initialize_trees();	
	}

	var doit;
	map.on('resize', function(){
		if (elem) {resize_graphs()};
		if (zoom > zoom_threshold) {clearallLayers();initialize_trees()}
	});

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
		    		neighborhood_content += "<option value=\"{'layer_id':'" + layer._leaflet_id + "','nhood_no':'" + layer.feature.properties.nhood_no + "'}\">"+name+"</option>";
		    	}
		    	else {
		    		neighborhood_content += "<option value=\"{'layer_id':'" + layer._leaflet_id + "','nhood_no':'" + layer.feature.properties.nhood_no + "'}\">"+name+' (in ' + nhood + ')</option>';
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

			//$.getJSON(root_api + "trees/categories", function( data ) {
			$.getJSON(root_api + "SELECT * FROM tree_category_filters", function( data ) {

			    //$.each( data, function(key, val) {
			    $.each( data.rows, function(key, val) {

			    	if (lookup_family[val.family_common] === undefined) {
			    		lookup_family[val.family_common] = val.order_plant;
			    		families.push(val.family_common);
			    	}

			    	if (lookup_orders[val.order_plant] === undefined) {
			    		lookup_orders[val.order_plant] = 1;
			    		orders.push(val.order_plant);
			    	}

					genus_content += '<option value="' + val.genus + '" family="' + val.family_common + '" order="' + val.order_plant + '">' + val.genus + '</option>';
					filters.push(val.genus);

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

	    //change style of clusters
	    pruneCluster.BuildLeafletClusterIcon = function(cluster) {
		    var population = cluster.population; // the number of markers inside the cluster
		     
		    var c = 'prunecluster prunecluster-';
	        var iconSize = 38;
	        //var maxPopulation = this.Cluster.GetPopulation();
	        var adjust = zoom - 11;
	        if (zoom < 13) {
	        	if (cluster.population < 2000) {
	            	c += 'small';
		        }
		        else if (cluster.population < 5000) {
		            c += 'medium';
		            iconSize = 40;
		        }
		        else {
		            c += 'large';
		            iconSize = 44;
		        }
	        }
	        else if (zoom == 13 ) {
	        	if (cluster.population < 1000) {
		            c += 'small';
		        }
		        else if (cluster.population < 3000) {
		            c += 'medium';
		            iconSize = 40;
		        }
		        else {
		            c += 'large';
		            iconSize = 44;
		        }
	        }
	        else if (zoom == 14 ) {
	        	if (cluster.population < 500) {
		            c += 'small';
		        }
		        else if (cluster.population < 1000) {
		            c += 'medium';
		            iconSize = 40;
		        }
		        else {
		            c += 'large';
		            iconSize = 44;
		        }
	        }
	        else if (zoom == 15 ) {
	        	if (cluster.population < 100) {
		            c += 'small';
		        }
		        else if (cluster.population < 200) {
		            c += 'medium';
		            iconSize = 40;
		        }
		        else {
		            c += 'large';
		            iconSize = 44;
		        }
	        }
	        else if (zoom == 16) {
	        	if (cluster.population < 50) {
		            c += 'small';
		        }
		        else if (cluster.population < 100) {
		            c += 'medium';
		            iconSize = 40;
		        }
		        else {
		            c += 'large';
		            iconSize = 44;
		        }
	        }
	        else {
		        if (cluster.population < 20) {
		            c += 'small';
		        }
		        else if (cluster.population < 50) {
		            c += 'medium';
		            iconSize = 40;
		        }
		        else {
		            c += 'large';
		            iconSize = 44;
		        }
	    	}
	        return new L.DivIcon({
	            html: "<div><span>" + cluster.population + "</span></div>",
	            className: c,
	            iconSize: L.point(iconSize, iconSize)
	        });
		};

	    //change behavior of prunecluster = only change of level once change at a time
	    pruneCluster.BuildLeafletCluster = function(cluster, position) {
		      var m = new L.Marker(position, {
		        icon: pruneCluster.BuildLeafletClusterIcon(cluster)
		      });

		      m.on('click', function() {
		        // Compute the  cluster bounds (it's slow : O(n))
		        var markersArea = pruneCluster.Cluster.FindMarkersInArea(cluster.bounds);
		        var b = pruneCluster.Cluster.ComputeBounds(markersArea);

		        if (b) {
		          var bounds = new L.LatLngBounds(
		            new L.LatLng(b.minLat, b.maxLng),
		            new L.LatLng(b.maxLat, b.minLng));

		          var zoomLevelBefore = pruneCluster._map.getZoom();
		          var zoomLevelAfter = pruneCluster._map.getBoundsZoom(bounds, false, new L.Point(20, 20, null));

		          // If the zoom level doesn't change
		          if (zoomLevelAfter === zoomLevelBefore) {
		            // Send an event for the LeafletSpiderfier
		            pruneCluster._map.fire('overlappingmarkers', {
		              cluster: pruneCluster,
		              markers: markersArea,
		              center: m.getLatLng(),
		              marker: m
		            });

		            pruneCluster._map.setView(position, zoomLevelAfter);
		          }
		          else {
		            pruneCluster._map.setView(position, zoomLevelBefore + 1);
		          }
		        }
		      });

		      return m;
		}; // end of BuildLeafletCluster

	    var previous_marker = new L.marker();
	    pruneCluster.PrepareLeafletMarker = function(leafletMarker, data) {
				    leafletMarker.setIcon(treeicon); // See http://leafletjs.com/reference.html#icon
				    leafletMarker.bindPopup(data.name);
				    //listeners can be applied to markers in this function
				    leafletMarker.on('click', function(e){
				        $.getJSON( root_api + "SELECT * FROM trees_descriptions WHERE compkey=" + data.compkey, function(data) {
				        		tree_info = data.rows[0];
				        		previous_marker.setIcon(treeicon);
				        		previous_marker = leafletMarker;
				        		leafletMarker.setIcon(treeicon_red);
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
				        		$("#tree_intro").remove();
				        		var sv = new google.maps.StreetViewService();
					            var myLatLng = new google.maps.LatLng(e.latlng);
					            sv.getPanorama({location: myLatLng, radius: 50}, processSVData);
				        		$("#detail_tree").html("<li class='list-group-item'><b>Tree id:</b> " + tree_info.unitid + "</li><li class='list-group-item'><b>Species (Common):</b> " + tree_info.new_common_nam + "</li><li class='list-group-item'><a href=' " + tree_info.wikipedia_url + "' target='_blank'><b>Characteristics of the Species</b></a></li><li class='list-group-item'><b>Family (Common):</b> " + tree_info.family_common + "</li><li class='list-group-item'><b>Species (Scientific):</b> " + tree_info.new_scientific + "</li><li class='list-group-item'><b>Genus:</b> "+ tree_info.genus + "</li><li class='list-group-item'><b>Family (Scientific):</b> " + tree_info.family + "</li><li class='list-group-item'><b>Order:</b> " + tree_info.order_plant + "</li><li class='list-group-item'><b>Date of Plantation:</b> " + planted_da + "</li><li class='list-group-item'><b>Tree Diameter:</b> " + tree_info.diam + "</li><li class='list-group-item'><b>Closest Address:</b> " + tree_info.unitdesc +"</li><li class='list-group-item'><b>Tree Height:</b> " + tree_info.treeheight + "</li><li class='list-group-item'><b>Ownership:</b> " + tree_info.ownership + "</li><li class='list-group-item'><b>Last time it has been verified:</b> " + last_verif + "</li><li class='list-group-item'><a href=http://www.seattle.gov/transportation/tree_modify.htm target='_blank'><b>Form to make changes on that tree</b></a></li>"); 
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
				    leafletMarker.on('mouseover', function (e) {
				        this.openPopup();
				    });
				    leafletMarker.on('mouseout', function (e) {
				        this.closePopup();
				    });
		}; //end of prepareleafletmarker function

	    markers = [];
	    function initialize_clusters() {
	    	var start_cluster = performance.now();
	    	console.log('start initializing clusters');

	    	$.getJSON( root_api + "SELECT compkey, genus, new_common_nam, point_x, point_y FROM trees_filters", function( data ) {

				//Jquery method that allows you to iterate over an array: http://api.jquery.com/jquery.each/
				$.each(data.rows, function(k,v){

					marker = new PruneCluster.Marker(v.point_y, v.point_x);
					marker.data.genus = v.genus;
					marker.data.compkey = v.compkey;
					marker.data.name = v.new_common_nam;
					pruneCluster.RegisterMarker(marker);
					markers.push(marker);
				});

				size = markers.length;

				map.addLayer(pruneCluster);

				pruneCluster.ProcessView();

				map.spin(false);
				//progress.style.display = 'none';
				console.log('stop initializing clusters');

	    		var stop_cluster = performance.now();
	    		console.log('it took ' + (stop_cluster-start_cluster) + ' ms');

	    		//$('.alert').hide();
	    		$(".alert").toggleClass('alert-info alert-success');
	    		$(".alert").html("<a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a><strong>Success! </strong> All the data has now been loaded");
	    		 setTimeout(function(){ $('.alert').hide(); }, 5000);


	    	}) // end of getJSON data
	    
	    } // end of function initialize_all_clusters

	    function initialize_trees() {

        	$.getJSON( root_api + "SELECT compkey, genus, new_common_nam, point_x, point_y FROM trees_filters WHERE point_y BETWEEN " + map.getBounds().getSouth() + " AND " + map.getBounds().getNorth() + " AND point_x BETWEEN " + map.getBounds().getWest() + " AND " + map.getBounds().getEast(), function( data ) {

        		//create a variable to count the total number of trees displayed in the window
					var total_trees = 0;
					
					//Jquery method that allows you to iterate over an array: http://api.jquery.com/jquery.each/
					$.each(data.rows, function(k,v){

						//does layerGroup already exist? if not create it and add to map
					    var layer = mapLayerGroups[v.genus];

					    if (layer === undefined) {
					        layer = new L.layerGroup();
					        //store layer
					        mapLayerGroups[v.genus] = layer;
					        //add the layer only if it has not been filtered yet
					        if (filters_active.indexOf(v.genus) == -1) {
					        	layer.addTo(map);
					        }
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

				        marker.on('click', function(e) {
				        	$('#panorama').attr('class','');
				        	$.getJSON( root_api + "SELECT * FROM trees_descriptions WHERE compkey=" + v.compkey, function(data) {
				        		tree_info = data.rows[0];
				        		console.log(tree_info);
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
				        		$("#tree_intro").remove();
				        		var sv = new google.maps.StreetViewService();
					            var myLatLng = new google.maps.LatLng(e.latlng);
					            sv.getPanorama({location: myLatLng, radius: 50}, processSVData);
				        		$("#detail_tree").html("<li class='list-group-item'><b>Tree id:</b> " + tree_info.unitid + "</li><li class='list-group-item'><b>Species (Common):</b> " + tree_info.new_common_nam + "</li><li class='list-group-item'><a href=' " + tree_info.wikipedia_url + "' target='_blank'><b>Characteristics of the Species</b></a></li><li class='list-group-item'><b>Family (Common):</b> " + tree_info.family_common + "</li><li class='list-group-item'><b>Species (Scientific):</b> " + tree_info.new_scientific + "</li><li class='list-group-item'><b>Genus:</b> "+ tree_info.genus + "</li><li class='list-group-item'><b>Family (Scientific):</b> " + tree_info.family + "</li><li class='list-group-item'><b>Order:</b> " + tree_info.order_plant + "</li><li class='list-group-item'><b>Date of Plantation:</b> " + planted_da + "</li><li class='list-group-item'><b>Tree Diameter:</b> " + tree_info.diam + "</li><li class='list-group-item'><b>Closest Address:</b> " + tree_info.unitdesc +"</li><li class='list-group-item'><b>Tree Height:</b> " + tree_info.treeheight + "</li><li class='list-group-item'><b>Ownership:</b> " + tree_info.ownership + "</li><li class='list-group-item'><b>Last time it has been verified:</b> " + last_verif + "</li><li class='list-group-item'><a href=http://www.seattle.gov/transportation/tree_modify.htm target='_blank'><b>Form to make changes on that tree</b></a></li>");  
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

        } // end of initiqlize function

        var previous_nhood = -1;
        $('#neighborhoods').multiselect({
    		onChange: function(option, select) {

    			var current_nhood = option.val();
    			(previous_nhood != -1) && map.removeLayer(featureLayer.getLayer(previous_nhood.layer_id));
    			if (current_nhood == -1) {
    					d3.select("#chart_genus")
    					.select("svg").remove();
    					d3.select("#chart_date")
    					.select("svg").remove();
    			}
    			else {
    				current_nhood = current_nhood.replace(/'/g, '"');
    				current_nhood = JSON.parse(current_nhood);
    				draw_graphs(current_nhood.nhood_no);
    				var layer = featureLayer.getLayer(current_nhood.layer_id);
    				layer.addTo(map);
    				limits = layer.getBounds();
	    			map.fitBounds(limits);

    			}
    			previous_nhood = current_nhood;

    		} // end of on change function

    	}); //end of multiselect click event

	    function set_options_multiselect() {

	    	$('#genus-filter').multiselect({
	            enableFiltering: true,
	            nonSelectedText: 'No genus selected',
	            includeSelectAllOption: true,
	            maxHeight: height_modal,
	            allSelectedText: 'All genus selected',
	            filterPlaceholder: 'Search for something...',
	            onChange: function(option, checked, select) {
	            	filter = option.val();
	                if (checked) {
	                	filters_active.splice(filters_active.indexOf(filter),1);
	                	(zoom > zoom_threshold) ? showLayer(filter) : add_markers(filter);
	                	//add_markers(filter);
	                	$('#family-filter').multiselect('select',option.attr("family"));
	                	$('#order-filter').multiselect('select',option.attr("order"));
	                }
	                else {
	                	filters_active.push(filter);
	                	(zoom > zoom_threshold) ? hideLayer(filter) : remove_markers(filter);
	                	$('#family-filter').multiselect('deselect',option.attr("family"));
	                	$('#order-filter').multiselect('deselect',option.attr("order"));
	                }     
	                
	            }, //end of onchange function
	            onSelectAll: function() {
	            	filters_active = [];
	            	add_all_map();
	            	$("#family-filter").multiselect("selectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#order-filter").multiselect("selectAll", false);
				    $("#order-filter").multiselect("refresh");
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	filters_active = filters;
	            	zoom > zoom_threshold ? hideallLayer() : remove_all_markers();
	            	$("#family-filter").multiselect("deselectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#order-filter").multiselect("deselectAll", false);
				    $("#order-filter").multiselect("refresh");
	            } //end of onselectall function
	        }); // end of genus filter multiselect options

			$('#order-filter').multiselect({
	            enableFiltering: true,
	            nonSelectedText: 'No order selected',
	            includeSelectAllOption: true,
	            maxHeight: height_modal,
	            allSelectedText: 'All orders selected',
	            filterPlaceholder: 'Search for something...',
	            onChange: function(option, checked, select) {
	                filter = option.val();
	                if (checked) {
	                	$('#genus-filter option').filter('[order="'+ filter +'"]').prop('selected', true).each(function() {
	                		(zoom > zoom_threshold) ? showLayer($(this).val()) : add_markers($(this).val());
	                	});
	                	$('#family-filter option').filter('[order="'+ filter +'"]').prop('selected', true);
	                }
	                else {
	                	$('#genus-filter option').filter('[order="'+ filter +'"]').prop('selected', false).each(function() {
	                		(zoom > zoom_threshold) ? hideLayer($(this).val()) : remove_markers($(this).val());
	                	});
	                	$('#family-filter option').filter('[order="'+ filter +'"]').prop('selected', false);
	                }
	                $("#genus-filter").multiselect("refresh");
	                $("#family-filter").multiselect("refresh");
	            }, //end of onchange function
	            onSelectAll: function() {
	            	filters_active = [];
	            	$("#family-filter").multiselect("selectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("selectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    zoom > zoom_threshold ? showallLayer() : add_all_markers();
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	filters_active = filters;
	            	$("#family-filter").multiselect("deselectAll", false);
				    $("#family-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("deselectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    zoom > zoom_threshold ? hideallLayer() : remove_all_markers();
	            } //end of onselectall function
	        });

			//behavior of the filter
	        $('#family-filter').multiselect({
	            enableFiltering: true,
	            nonSelectedText: 'No family selected',
	            includeSelectAllOption: true,
	            maxHeight: height_modal,
	            allSelectedText: 'All families selected',
	            filterPlaceholder: 'Search for something...',
	            onChange: function(option, checked, select) {
	                filter = option.val();
	                if (checked) {
	                	$('#genus-filter option').filter('[family="'+filter+'"]').prop('selected', true).each(function() {
	                		zoom > zoom_threshold ? showLayer($(this).val()) : add_markers($(this).val());
	                	});
	                	$('#order-filter').multiselect('select',lookup_family[filter]);
	                }
	                else {
	                	$('#genus-filter option').filter('[family="'+filter+'"]').prop('selected', false).each(function() {
	                		zoom > zoom_threshold ? hideLayer($(this).val()) : remove_markers($(this).val());
	                	});
	                	$('#order-filter').multiselect('deselect',lookup_family[filter]);
	                }
	                $("#genus-filter").multiselect("refresh");
	            }, //end of onchange function
	            onSelectAll: function() {
	            	filters_active = [];
	            	$("#order-filter").multiselect("selectAll", false);
				    $("#order-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("selectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    zoom > zoom_threshold ? showallLayer() : add_all_markers();
	            }, //end of onselectall function
	            onDeselectAll: function() {
	            	filters_active = filters;
	            	$("#order-filter").multiselect("deselectAll", false);
				    $("#order-filter").multiselect("refresh");
				    $("#genus-filter").multiselect("deselectAll", false);
				    $("#genus-filter").multiselect("refresh");
				    zoom > zoom_threshold ? hideallLayer() : remove_all_markers();
	            } //end of onselectall function
	        });

	    } //end of function set multiselect options

	    function clear_map() {
	    	(zoom > zoom_threshold) ? clearallLayers() : remove_all_markers();
	    }

	    function add_all_map() {
	    	(zoom > zoom_threshold) ? showallLayer() : add_all_markers();
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

		function add_all_markers() {
	    	        for (var i = 0; i < size; ++i) {
	    	        	//only add the markers that have not been filtered
			            markers[i].filtered = (filters_active.indexOf(markers[i].data.genus) > -1) ? true : false;
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
				if (filters_active.indexOf(id) == -1) {
					var layer = mapLayerGroups[id];
					layer.addTo(map);
				}
				// var layer = mapLayerGroups[id];
				// map.addLayer(layer);
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

//////////////////////////////////////////////////
//////// Google street view function

function processSVData(data, status) {

      if (status === google.maps.StreetViewStatus.OK) {
        var panorama;
        panorama = new google.maps.StreetViewPanorama(document.querySelector("#panorama"));
        panorama.setPosition(data.location.latLng);
        panorama.setPov(({
          heading: 265,
          pitch: 0
        }));
        panorama.setOptions({panControl:false,addressControl:false,linksControl:false});
        panorama.setEnableCloseButton(false);
        panorama.setVisible(true);
      } else {
        console.error('Street View data not found for this location.');
      }
} // end of function processSVData


///////////////////////////////////////////////////////
////graphs functions

// loader settings
var target_chart_genus = document.getElementById('chart_genus');
var target_chart_date = document.getElementById('chart_date');

//elem variable to draw or not draw graphs
var elem = false;
function draw_graphs(nhood) {
	//elem = document.getElementById('svg_genus');
	elem ? update_graphs(nhood) : init(nhood);
	//elem = true;
}

function init(nhood) {

	elem = true;

	// trigger loader
    var spinner_genus = new Spinner(opts).spin(target_chart_genus);
    var spinner_date = new Spinner(opts).spin(target_chart_date);

    var sql_common = "SELECT genus, COUNT(compkey) AS total FROM trees_filters a JOIN seattle_neighborhoods b ON ST_INTERSECTS(b.the_geom,ST_SetSRID(ST_POINT(point_x,point_y),4326)) AND nhood_no=" + nhood + " GROUP BY genus ORDER BY total DESC LIMIT 10;";
    var sql_date = "SELECT date_part('epoch',date_trunc('year', planted_da))*1000 AS planted_da, COUNT(planted_da) as total FROM trees_all a JOIN seattle_neighborhoods b ON ST_INTERSECTS(b.the_geom,ST_SetSRID(ST_POINT(point_x,point_y),4326)) WHERE nhood_no=" + nhood + " AND planted_da IS NOT NULL GROUP BY date_trunc('year', planted_da) ORDER BY planted_da ASC;";
	d3.queue()
		.defer(d3.json, root_api + sql_common)
		.defer(d3.json, root_api + sql_date)
		.awaitAll(start_graphs);

	function start_graphs(error, data) {
		spinner_genus.stop();
		spinner_date.stop();

        // code to execute within callback
        initialize_graphs(nhood,data[0].rows,data[1].rows);
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
		      			  	tip.show(d,i);
		      			  	if (zoom > zoom_threshold) {
		      			  		previous_marker.setIcon(treeicon);
		      			  		mapLayerGroups[d.genus].eachLayer(function(marker) {
		      			  			marker.setIcon(treeicon_red);
		      			  		});
		      			  	}
		      			  })
		      			  .on('mouseout', function(d,i) {
		      			  	tip.hide(d,i);
		      			  	if (zoom > zoom_threshold) {
		      			  		mapLayerGroups[d.genus].eachLayer(function(marker) {
		      			  			marker.setIcon(treeicon);
		      			  		});
		      			  	}
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

					  chart_genus.append("text")
					    .attr("class", "title_chart_genus")
				        .attr("x", (width / 2))             
				        .attr("y", 0 - (margin.top / 2))
				        .attr("text-anchor", "middle")  
				        .style("font-size", "1em") 
				        .style("text-decoration", "bold")  
				        .text("Number of trees per genus");

				//}); //end of function getjson

		} // end of function draw_graph_genus

		function draw_graph_date(nhood, data_date) {

			data_date.forEach(function(d) {
					    d.planted_da = new Date(d.planted_da);
					  });

			var data_length = data_date.length;
			for (i = 0; i < data_length-1; i++) {
				var date = new Date(data_date[i].planted_da);
				date.setFullYear(date.getFullYear() + 1);
				while (date < data_date[i+1].planted_da) {
				    data_date.push({'planted_da':new Date(date),'total':0});
				    date.setFullYear(date.getFullYear() + 1);
				}
			};

			data_date = data_date.sort(function(a,b) {
		      return a.planted_da.getFullYear() - b.planted_da.getFullYear();
		    });

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

				x_date.domain(d3.extent(data_date, function(d) { return d.planted_da; }));
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

				 chart_date.append("text")
				 		.attr("class", "title_chart_date")
				        .attr("x", (width / 2))             
				        .attr("y", 0 - (margin.top / 2))
				        .attr("text-anchor", "middle")  
				        .style("font-size", "1em") 
				        .style("text-decoration", "bold")  
				        .text("Number of trees per year");

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

	    	var sql_common = "SELECT genus, COUNT(compkey) AS total FROM trees_filters a JOIN seattle_neighborhoods b ON ST_INTERSECTS(b.the_geom,ST_SetSRID(ST_POINT(point_x,point_y),4326)) AND nhood_no=" + nhood + " GROUP BY genus ORDER BY total DESC LIMIT 10;";

			$.getJSON( root_api + sql_common, function(data) {

				data = data.rows;

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

	    	var sql_date = "SELECT date_part('epoch',date_trunc('year', planted_da))*1000 AS planted_da, COUNT(planted_da) as total FROM trees_all a JOIN seattle_neighborhoods b ON ST_INTERSECTS(b.the_geom,ST_SetSRID(ST_POINT(point_x,point_y),4326)) WHERE nhood_no=" + nhood + " AND planted_da IS NOT NULL GROUP BY date_trunc('year', planted_da) ORDER BY planted_da ASC;";

	    	$.getJSON( root_api + sql_date, function(data) {

	    			data = data.rows;

		    	 	 data.forEach(function(d) {
					    d.planted_da = new Date(d.planted_da);
					  });

					var data_length = data.length;
					for (i = 0; i < data_length; i++) {
						var date = new Date(data[i].planted_da.setFullYear(data[i].planted_da.getFullYear() + 1));
						while (date < data[i+1].planted_da) {
						    data.push({'planted_da':new Date(date),'total':0});
						    date.setFullYear(date.getFullYear() + 1);
						}
					};

					data = data.sort(function(a,b) {
				      return a.planted_da.getFullYear() - b.planted_da.getFullYear();
				    });

					  // Scale the range of the data in the domains
					  x_date_modal.domain(d3.extent(data, function(d) { return d.planted_da; }));
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

				var sql_date = "SELECT date_part('epoch',date_trunc('year', planted_da))*1000 AS planted_da, COUNT(planted_da) as total FROM trees_all a JOIN seattle_neighborhoods b ON ST_INTERSECTS(b.the_geom,ST_SetSRID(ST_POINT(point_x,point_y),4326)) WHERE nhood_no=" + nhood + " AND planted_da IS NOT NULL GROUP BY date_trunc('year', planted_da) ORDER BY planted_da ASC;";

		    	 $.getJSON( root_api + sql_date, function(data) {

		    	 	 data = data.rows;

		    	 	 data.forEach(function(d) {
					    d.planted_da = new Date(d.planted_da);
					  });

					var data_length = data.length;
					for (i = 0; i < data_length; i++) {
						var date = new Date(data[i].planted_da);
						date.setFullYear(date.getFullYear() + 1);
						while (date < data[i+1].planted_da) {
						    data.push({'planted_da':new Date(date),'total':0});
						    date.setFullYear(date.getFullYear() + 1);
						}
					};

					data = data.sort(function(a,b) {
				      return a.planted_da.getFullYear() - b.planted_da.getFullYear();
				    });

					  // Scale the range of the data in the domains
					  x_date.domain(d3.extent(data, function(d) { return d.planted_da; }));
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

				var sql_common = "SELECT genus, COUNT(compkey) AS total FROM trees_filters a JOIN seattle_neighborhoods b ON ST_INTERSECTS(b.the_geom,ST_SetSRID(ST_POINT(point_x,point_y),4326)) AND nhood_no=" + nhood + " GROUP BY genus ORDER BY total DESC LIMIT 10;";

	    		$.getJSON( root_api + sql_common, function(data) {

	    			data = data.rows;

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

				 chart_genus.select(".title_chart_genus")
				 	.attr("x", (width / 2))             
				    .attr("y", 0 - (margin.top / 2));

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

				 chart_date.select(".title_chart_genus")
				 	.attr("x", (width / 2))             
				    .attr("y", 0 - (margin.top / 2));

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

});


