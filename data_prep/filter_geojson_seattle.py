import json

with open('metro_seattle_neighborhoods.geojson') as data_file:    
    data = json.load(data_file)

#print data["features"]

# Transform json input to python objects
input_dict = data["features"]

# Filter python objects with list comprehensions
output_dict = [x for x in input_dict if x['properties']['city'] == 'Seattle']
output_dict = sorted(output_dict,key=lambda x:x['properties']['name'])

#Save the object as a geojson file
with open('seattle_neighborhoods.geojson', 'w') as outfile:
    json.dump(output_dict, outfile)
