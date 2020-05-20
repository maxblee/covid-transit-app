
exports.up = function(knex) {
    return knex.schema
        .alterTable("stations", function(table) {
            table.string("station_code", 100);
        })
};

exports.down = function(knex) {
    return knex.schema
        .alterTable("stations", function(table) {
            table.dropColumn("station_code");
        })
};
