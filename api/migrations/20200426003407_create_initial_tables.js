
exports.up = function(knex) {
  return knex.schema
    .createTable("regions", function(table) {
        table.increments("id").primary();
        table.string("abbr", 15).notNullable().unique().comment("An abbreviation for the region.");
        table.string("name", 255).notNullable();
        table.string("description", 255).comment("A description about the region, identifying data sources, etc.");
        table.text("notes").comment("Notes about data quality for the region as a whole.");
        table.string("region_tz", 100).notNullable();
        table.date("data_updated").comment("The date of the most recent schedule update.");
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
        table.timestamp("last_updated").notNullable().defaultTo(knex.fn.now());
    })
    .createTable("agencies", function(table) {
        table.increments("id").primary();
        table.integer("region_id").notNullable().references("id").inTable("regions");
        table.string("agency_name").notNullable();
        // transit mode names from https://developers.google.com/transit/gtfs/reference#routestxt
        table.enum("transit_mode", ["tram", "metro", "bus", "ferry", "cable tram", "aerial lift", "funicular", "trolleybus", "monorail"], {useNaive: true, enumName: "transit_mode"});
        table.string("description");
        table.text("notes");
    })
    .createTable("schedules", function(table) {
        table.increments("id").primary();
        table.integer("agency_id").notNullable().references("id").inTable("agencies");
        table.date("log_time").comment("The time this schedule was created.");
        table.enum("schedule_type", ["weekday", "saturday", "sunday", "holiday", "special"], {useNaive: true, enumName: "schedule_type"});
        table.string("raw_schedule_type", 200);
    })
    .createTable("lines", function(table) {
        table.increments("id").primary();
        table.integer("agency_id").notNullable().references("id").inTable("agencies");
        table.string("line_name", 255);
        table.enum("line_direction", ["n", "s", "w", "e", "ne", "nw", "se", "sw"]);
    })
    .createTable("stations", function(table) {
        table.increments("id").primary();
        table.integer("region_id").notNullable().references("id").inTable("regions");
        table.string("station_name", 255);
        table.specificType("coordinates", "geometry(point, 4326)");
    })
    .createTable("stops", function(table) {
        table.increments("id").primary();
        table.integer("line_id").notNullable().references("id").inTable("lines");
        table.integer("station_id").notNullable().references("id").inTable("stations");
    })
    .createTable("arrival_departure_points", function(table) {
        table.increments("id").primary();
        table.integer("schedule_id").notNullable().references("id").inTable("schedules");
        table.integer("stop_id").notNullable().references("id").inTable("stops");
        table.time("arrival_time");
        table.time("departure_time");
    });
};

exports.down = function(knex) {
    return knex.schema
        .dropTable("arrival_departure_points")
        .dropTable("stops")
        .dropTable("stations")
        .dropTable("lines")
        .dropTable("schedules")
        .dropTable("agencies")
        .dropTable("regions");
};
