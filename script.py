import geopandas as gpd

eth = gpd.read_file('geodata/eth.geojson')
som = gpd.read_file('geodata/som.geojson')

som = som.drop(columns=['OBJECTID', 'admin0RefN', 'admin0AltN', 
                  'admin0Al_1', 'validOn', 'validTo', 'Shape_Leng', 'Shape_Area'])

eth['admin0Name'] = eth['ADM0_EN']
eth['admin0Pcod'] = eth['ADM0_PCODE']

eth = eth.drop(columns=['ADM0_REF', 'ADM0ALT1EN', 'ADM0ALT2EN', 'ADM0_EN', 'ADM0_PCODE',
                  'validOn', 'validTo', 'Shape_Leng', 'Shape_Area'])




regions = eth.append(som)


print(regions)
regions.to_file('geodata/regions.geojson', driver='GeoJSON')

