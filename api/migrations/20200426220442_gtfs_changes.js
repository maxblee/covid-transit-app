
exports.up = function(knex) {
  return knex.schema
    .alterTable("agencies", function(table) {
        table.string("agency_abbr", 15).notNullable();
        table.string("secondary_modes", 150);
        table.string("transit_mode", 25).alter();
    })
    .alterTable("schedules", function(table) {
        table.string("schedule_code", 50);
    })
    .alterTable("lines", function(table) {
        table.enum("route_mode", ["tram", "metro", "rail", "bus", "ferry", "cable tram", "aerial lift", "funicular", "trolleybus", "monorail"], {useNaive: true, enumName: "transit_method"});
        table.string("route_color", 6);
        table.string("route_code", 100);
        table.dropColumn("line_direction");
    })
    .alterTable("arrival_departure_points", function(table) {
        // times can have values of > 24:00:00 in GTFS
        // see https://developers.google.com/transit/gtfs/reference#stop_timestxt
        table.string("arrival_time", 8).alter();
        table.string("departure_time", 8).alter();
        table.integer("stop_sequence");
    })
};

exports.down = function(knex) {
    knex.schema
        .alterTable("arrival_departure_points", function(table) {
            table.dropColumn("stop_sequence");
            table.time("arrival_time").alter();
            table.time("departure_time").alter();
        })
        .alterTable("lines", function(table) {
            table.enum("line_direction", ["n", "s", "w", "e", "ne", "nw", "se", "sw"]);
            table.dropColumn("route_code");
            table.dropColumn("route_color");
            table.dropColumn("route_mode");
        })
        .alterTable("schedules", function(table) {
            table.dropColumn("schedule_code");
        })
        .alterTable("agencies", function(table) {
            table.enum("transit_mode", ["tram", "metro", "bus", "ferry", "cable tram", "aerial lift", "funicular", "trolleybus", "monorail"], {useNaive: true, enumName: "transit_mode"}).alter();
            table.dropColumn("secondary_modes");
            table.dropColumn("agency_abbr");
        })
};
