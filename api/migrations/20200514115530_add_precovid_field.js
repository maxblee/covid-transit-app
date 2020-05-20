
exports.up = function(knex) {
    return knex.schema
        .alterTable("schedules", function(table) {
            table.boolean("pre_covid");
        })
};

exports.down = function(knex) {
    return knex.schema
        .alterTable("schedules", function(table) {
            table.dropColumn("pre_covid");
        })
};
