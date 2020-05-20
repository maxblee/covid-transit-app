// From https://github.com/knex/knex/issues/1699
const formatAlterTableEnumSql = (
    tableName,
    columnName,
    enums,
  ) => {
    const constraintName = `${tableName}_${columnName}_check`;
    return [
      `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`,
      `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} CHECK (${columnName} = ANY (ARRAY['${enums.join(
        "'::text, '"
      )}'::text]));`,
    ].join('\n');
  };
const gtfsTransitModes = ["tram", "metro", "rail", "bus", "ferry", "cable tram", "aerial lift", "funicular", "trolleybus", "monorail"];
const previousTransitModes = ["tram", "metro", "bus", "ferry", "cable tram", "aerial lift", "funicular", "trolleybus", "monorail"];
  
  exports.up = async function up(knex) {
    await knex.raw(
      formatAlterTableEnumSql('agencies', 'transit_mode', gtfsTransitModes)
    );
  };
  
  exports.down = async function down(knex) {
    await knex.raw(
      formatAlterTableEnumSql('agencies', 'transit_mode', previousTransitModes)
    );
  };
