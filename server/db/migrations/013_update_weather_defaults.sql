-- Update weather defaults from Monrovia to El Monte
UPDATE ea_settings
SET weather_lat = 34.0686,
    weather_lng = -118.0276,
    weather_location = 'El Monte, CA'
WHERE weather_location = 'Monrovia, CA';
