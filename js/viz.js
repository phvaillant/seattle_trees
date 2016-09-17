//define the api url to get data from
var root_api = 'http://ec2-54-234-216-12.compute-1.amazonaws.com:5432/'

//define map variable
var map;

//array to store layers for each genus
var mapLayerGroups = [];

//define map center
var mapCenter = {lat: 47.654967,lng:-122.312668};

//define your markers: http://leafletjs.com/examples/custom-icons.html
var treeicon = L.icon({
    iconUrl: 'img/tree.png',
    iconSize: new L.Point(30, 30),
    popupAnchor: new L.Point(0, -10)
});

//define tile
var your_tile = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	,ext: 'png', minZoom:15, maxZoom:20});

//https://learn.jquery.com/using-jquery-core/document-ready/
$(document).ready(function() {

		//set your map and some options of the view
		map = L.map('map-canvas', {
			zoomControl: false
		}).setView([mapCenter.lat,mapCenter.lng], 15);

		//add zoom control with your options
		L.control.zoom({
		     position:'bottomright'
		}).addTo(map);

		//add tile to your map
		your_tile.addTo(map);

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
                		showLayer($(this).val());
                	});
                	$('#family-filter option').filter('[order="'+ filter +'"]').prop('selected', true);
                }
                else {
                	$('#genus-filter option').filter('[order="'+ filter +'"]').prop('selected', false).each(function() {
                		hideLayer($(this).val());
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
			    showallLayer();
            }, //end of onselectall function
            onDeselectAll: function() {
            	$("#family-filter").multiselect("deselectAll", false);
			    $("#family-filter").multiselect("refresh");
			    $("#genus-filter").multiselect("deselectAll", false);
			    $("#genus-filter").multiselect("refresh");
			    hideallLayer();
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
                		showLayer($(this).val());
                	});
                	$('#order-filter').multiselect('select',lookup_family[filter]);
                }
                else {
                	$('#genus-filter option').filter('[family="'+filter+'"]').prop('selected', false).each(function() {
                		hideLayer($(this).val());
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
			    showallLayer();
            }, //end of onselectall function
            onDeselectAll: function() {
            	$("#order-filter").multiselect("deselectAll", false);
			    $("#order-filter").multiselect("refresh");
			    $("#genus-filter").multiselect("deselectAll", false);
			    $("#genus-filter").multiselect("refresh");
			    hideallLayer();
            } //end of onselectall function
        });

        $('#genus-filter').multiselect({
            enableFiltering: true,
            nonSelectedText: 'No genus selected',
            includeSelectAllOption: true,
            allSelectedText: 'All genus selected',
            filterPlaceholder: 'Search for something...',
            onChange: function(option, checked, select) {
            	filter = option.val();
                if (checked) {
                	$('#family-filter').multiselect('select',option.attr("family"));
                	$('#order-filter').multiselect('select',option.attr("order"));
                	showLayer(filter);
                }
                else {
                	$('#family-filter').multiselect('deselect',option.attr("family"));
                	$('#order-filter').multiselect('deselect',option.attr("order"));
                	hideLayer(filter);
                }     
                
            }, //end of onchange function
            onSelectAll: function() {
            	$("#family-filter").multiselect("selectAll", false);
			    $("#family-filter").multiselect("refresh");
			    $("#order-filter").multiselect("selectAll", false);
			    $("#order-filter").multiselect("refresh");
			    showallLayer();
            }, //end of onselectall function
            onDeselectAll: function() {
            	$("#family-filter").multiselect("deselectAll", false);
			    $("#family-filter").multiselect("refresh");
			    $("#order-filter").multiselect("deselectAll", false);
			    $("#order-filter").multiselect("refresh");
			    hideallLayer();
            } //end of onselectall function
        });

        var lookup_family = {};
        var lookup_orders = {};

        //initialize the filters
        initialize_filters();

        //initialize the markers
        initialize_trees();

        //clear markers when you start dragging the map
		map.on('dragstart', function onDragStart() {
			clearallLayers();
		})

		// //draw the new markers when you stop dragging the map
		map.on('dragend', function onDragEnd(){
			initialize_trees();
	    });

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
					    var marker = L.marker([v.point_y, v.point_x],{icon: treeicon})

						marker.bindPopup(v.new_common_nam);
						marker.on('mouseover', function (e) {
				            this.openPopup();
				        });
				        marker.on('mouseout', function (e) {
				            this.closePopup();
				        });

				        marker.on('click', function() {
				        	$.getJSON( root_api + "trees/description/" + v.compkey, function(data) {
				        		$("#detail_tree").html("<br><p>Species (Scientific): " + v.new_scientific + '</p><br><p>Species (Common): ' + v.new_common_nam + '</p><br><p>Genus: '+ v.genus + '</p><br><p>Family (Scientific): ' + v.family + '</p><br><p>Family (Common): ' + v.family_common + '</p><br><p>Plantation Order: ' + v.order_plant + '</p><br><p>Plantation Date: ' + v.planted_da + '</p><br><p>Tree Diameter: ' + v.diam + '</p><br><p>Tree Height: ' + v.treeheight + '</p><br><p>Ownership: ' + v.ownership + '</p><br><p>Last time it has been verified: ' + v.last_verif + '</p>'); 
				        	}); // end of getjson function
				        }); // end of marker on click function

					    //add the feature to the layer
					    //layer.addLayer(featureLayer); 
					    marker.addTo(layer);

						//count the number of trees
						total_trees += 1;

					}); // end of the each function

			}); // end of the getjson function

        } // end of initiqlize function

		        /*
		* show/hide layerGroup   
		*/
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

					$('#genus-filter').append('<option value="' + val.genus + '" family="' + val.family_common + '" order="' + val.order_plant + '">'+ val.genus +'</option>');
					$("#genus-filter").multiselect('selectAll', false);
	        		$("#genus-filter").multiselect('updateButtonText');
					$('#genus-filter').multiselect('rebuild');
									 
				 });

			    families.sort();
			    orders.sort();

			    for (i=0;i<families.length;i++) {
			    	//bug with the multiselect all behavior when added dynamically
			    	//follow the conversation: https://github.com/davidstutz/bootstrap-multiselect/issues/611
			    	$('#family-filter').append('<option value="' + families[i] + '" + order="' + lookup_family[families[i]] + '">'+families[i]+'</option>');
					$("#family-filter").multiselect('selectAll', false);
	        		$("#family-filter").multiselect('updateButtonText');
					$('#family-filter').multiselect('rebuild');
			    };
			    for (i=0;i<orders.length;i++) {
			    	$('#order-filter').append('<option value="' + orders[i] + '">'+orders[i]+'</option>');
					$("#order-filter").multiselect('selectAll', false);
	        		$("#order-filter").multiselect('updateButtonText');
					$('#order-filter').multiselect('rebuild');
				};

			    $("#family-filter").multiselect('selectAll', false);
	        	$("#family-filter").multiselect('updateButtonText');
	        	$("#order-filter").multiselect('selectAll', false);
	        	$("#order-filter").multiselect('updateButtonText');
	        	$("#genus-filter").multiselect('selectAll', false);
	        	$("#genus-filter").multiselect('updateButtonText');

			}); //end of getjson function

        } //end of initialize_filters function

}); // end of document ready function
