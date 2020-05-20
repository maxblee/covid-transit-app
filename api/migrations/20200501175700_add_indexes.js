
exports.up = function(knex) {
    return knex.schema
        .alterTable("arrival_departure_points", function(table) {
            table.index(["line_id", "station_id", "stop_sequence", "schedule_id"], "arrivals_index");
        })
        .alterTable("lines", function(table) {
            table.index(["agency_id"], "lines_index");
    });
};

exports.down = function(knex) {
    return knex.schema
        .alterTable("arrival_departure_points", function(table) {
            table.dropIndex(["line_id", "station_id", "stop_sequence", "schedule_id"], "arrivals_index");
        })
        .alterTable("lines", function(table) {
            table.dropIndex(["agency_id"], "lines_index");
        })
};
