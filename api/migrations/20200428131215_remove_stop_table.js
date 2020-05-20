
exports.up = function(knex) {
    return knex.schema
        .alterTable("arrival_departure_points", function(table) {
            table.dropColumn("stop_id");
            table.integer("line_id").notNullable().references("id").inTable("lines");
            table.integer("station_id").notNullable().references("id").inTable("stations");
        })
        .dropTable("stops");
};

exports.down = function(knex) {
    return knex.schema
        .createTable("stops", function(table) {
            table.increments("id").primary();
            table.integer("line_id").notNullable().references("id").inTable("lines");
            table.integer("station_id").notNullable().references("id").inTable("stations");
        })
        .alterTable("arrival_departure_points", function(table) {
            table.integer("stop_id").notNullable().references("id").inTable("stops");
            table.dropColumn("line_id");
            table.dropColumn("station_id");
        })
};
