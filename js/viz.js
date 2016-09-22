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

//save the geojson feature of each neighborhood
var neighborhoods = {};

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

		//store previous nhood for layer display
		var previous_nhood = -1;
    	$('#neighborhoods').multiselect({
    		onChange: function(option, select) {
    			var current_nhood = option.val();
    			if (previous_nhood == -1) {
    				initialize_graph_common_genus(current_nhood);
    				limits = neighborhoods[current_nhood].getBounds();
	    			map.fitBounds(limits);
	    			clearallLayers();
	    			initialize_trees();
	    			neighborhoods[current_nhood].addTo(map);
    			}
    			else {
    				map.removeLayer(neighborhoods[previous_nhood]);
    				if (current_nhood == -1) {
    					d3.select("#detail_neighborhood")
    					.select("svg").remove();
    				}
    				else {
    					limits = neighborhoods[current_nhood].getBounds();
		    			map.fitBounds(limits);
		    			clearallLayers();
		    			initialize_trees();
		    			neighborhoods[current_nhood].addTo(map);
		    			update_graph_common_genus(current_nhood);
    				}
    			}
    			previous_nhood = current_nhood;

    		}
    	});

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

        //initialize the neighborhoods filter
        initialize_neighborhoods();

        //clear markers when you start dragging the map
		map.on('dragstart', function onDragStart() {
			clearallLayers();
		})

		// //draw the new markers when you stop dragging the map
		map.on('dragend', function onDragEnd(){
			initialize_trees();
	    });

	    function initialize_neighborhoods() {
	    	// load GeoJSON from an external file
		    $.getJSON("js/seattle_neighborhoods.geojson",function(data){
		    	$.each( data, function( key, val ) {
		    		nhood = val.properties.nhood;
		    		name = val.properties.name;
		    		if (nhood == name) {
		    		  $('#neighborhoods').append('<option value="' + key + '">'+name+'</option>');
		    		}
		    		else {
				      $('#neighborhoods').append('<option value="' + key + '">'+name+ ' (in ' + nhood + ')</option>');
		    		};
		    		$("#family-filter").multiselect("deselectAll", false);
		    		$("#neighborhoods").multiselect("rebuild");
		    		neighborhoods[key] = L.geoJson(val);
				}); //end of each function
		    	// add GeoJSON layer to the map once the file is loaded
		    	//neighborhoods[] = L.geoJson(data)
		    	//neighborhoods.addTo(map);
		    });
	    };

	    //declare the variables for the two following functions
	    var margin, x, y, svg, tip;

	    function initialize_graph_common_genus(nhood) {
			margin = {top: 20, right: 20, bottom: 70, left: 40},
			    width = parseInt(d3.select('#detail_neighborhood').style('width')) - margin.left - margin.right,
			    height = parseInt(d3.select('#detail_neighborhood').style('height'))/2 - margin.top - margin.bottom;

			// set the ranges
			x = d3.scaleBand()
			          .range([0, width])
			          .padding(0.1);
			y = d3.scaleLinear()
			          .range([height, 0]);
			          
			// append the svg object to the body of the page
			// append a 'group' element to 'svg'
			// moves the 'group' element to the top left margin
			svg = d3.select("#detail_neighborhood").append("svg")
			    .attr("width", width + margin.left + margin.right)
			    .attr("height", height + margin.top + margin.bottom)
			  .append("g")
			    .attr("transform", 
			          "translate(" + margin.left + "," + margin.top + ")");

			tip = d3.tip()
				  .attr('class', 'd3-tip')
				  .offset([-10, 0])
				  .html(function(d) {
				    return "<strong>Number of trees:</strong> <span style='color:red'>" + d.total + "</span>";
				  });

			svg.call(tip);

			$.getJSON( root_api + "trees/common/neighborhood/" + nhood, function(data) {

				console.log(data);

				// format the data
				  data.forEach(function(d) {
				    d.total = +d.total;
				  });

				  // Scale the range of the data in the domains
				  x.domain(data.map(function(d) { return d.genus; }));
				  y.domain([0, d3.max(data, function(d) { return d.total; })]);

			  // append the rectangles for the bar chart
			  svg.selectAll(".bar")
			      .data(data, function(d) { return d.genus; })
			    .enter().append("rect")
			      .attr("class", "bar")
			      .attr("x", function(d) { return x(d.genus); })
			      .attr("width", x.bandwidth())
			      .attr("y", function(d) { return y(d.total); })
			      .attr("height", function(d) { return height - y(d.total); })
			      .on('mouseover', tip.show)
      			  .on('mouseout', tip.hide);

			  // add the x Axis
			  svg.append("g")
			  	  .attr("class","xaxis")
			      .attr("transform", "translate(0," + height + ")")
			      .call(d3.axisBottom(x))
			      .selectAll("text")
				    .attr("y", 0)
				    .attr("x", 9)
				    .attr("dy", ".35em")
				    .attr("transform", "rotate(90)")
				    .style("text-anchor", "start");;

			  // add the y Axis
			  svg.append("g")
			      .attr("class","yaxis")
			      .call(d3.axisLeft(y));

			}); //end of function getjson
	    } // end of function initialize graph

	    function update_graph_common_genus(nhood) {

	    	 $.getJSON( root_api + "trees/common/neighborhood/" + nhood, function(data) {

				// format the data
				  data.forEach(function(d) {
				    d.total = +d.total;
				  });

				  // Scale the range of the data in the domains
				  x.domain(data.map(function(d) { return d.genus; }));
				  y.domain([0, d3.max(data, function(d) { return d.total; })]);

				  var bar = svg.selectAll(".bar")
        			.data(data, function(d) { return d.genus; });

        		//enter new data
        		bar.enter().append("rect")
				   .attr("class", "bar")
				   .on('mouseover', tip.show)
       			   .on('mouseout', tip.hide)
       			   .transition()
       			   		.duration(750)
					   .attr("x", function(d) { return x(d.genus); })
					   .attr("y", function(d) { return y(d.total); })
					   .attr("height", function(d) { return height - y(d.total); })
					   .attr("width", x.bandwidth());

        		//remove the bars not corresponding to new genus
        		bar.exit().remove();

        		//update bars already present
        		bar
        			.transition()
       			   		.duration(750)
						   .attr("x", function(d) { return x(d.genus); })
							.attr("y", function(d) { return y(d.total); })
							.attr("height", function(d) { return height - y(d.total); })
							.attr("width", x.bandwidth());

				//remove preivous axes
				svg.select(".yaxis").remove();
				svg.select(".xaxis").remove();

				//draw x axis
				svg.append("g")
				  	  .attr("class","xaxis")
				      .attr("transform", "translate(0," + height + ")")
				      .call(d3.axisBottom(x))
				      .selectAll("text")
					    .attr("y", 0)
					    .attr("x", 9)
					    .attr("dy", ".35em")
					    .attr("transform", "rotate(90)")
					    .style("text-anchor", "start"); 

				//draw y axis
				svg.append("g")
				      .attr("class","yaxis")
				      .transition() // change the y axis
			            .duration(750)
				      	.call(d3.axisLeft(y));

			}); //end of getjson function

	    } // end of function update graph common genus

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
				        		tree_info = data[0];
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
				        		$("#detail_tree").html("<li class='list-group-item'><b>Tree id:</b> " + tree_info.unitid + "</li><li class='list-group-item'><b>Species (Scientific):</b> " + tree_info.new_scientific + "</li><li class='list-group-item'><b>Species (Common):</b> " + tree_info.new_common_nam + "</li><li class='list-group-item'><b>Genus:</b> "+ tree_info.genus + "</li><li class='list-group-item'><b>Family (Scientific):</b> " + tree_info.family + "</li><li class='list-group-item'><b>Family (Common):</b> " + tree_info.family_common + "</li><li class='list-group-item'><b>Order:</b> " + tree_info.order_plant + "</li><li class='list-group-item'><b>Plantation Date:</b> " + planted_da + "</li><li class='list-group-item'><b>Tree Diameter:</b> " + tree_info.diam + "</li><li class='list-group-item'><b>Address:</b> " + tree_info.unitdesc +"</li><li class='list-group-item'><b>Tree Height:</b> " + tree_info.treeheight + "</li><li class='list-group-item'><b>Ownership:</b> " + tree_info.ownership + "</li><li class='list-group-item'><b>Last time it has been verified:</b> " + last_verif + '</li>'); 
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
