const express = require("express");
const cors = require("cors");
const app = express();
const config = require("./utils/config");
config.setUpEnvironment();
const knex = config.db();
const port = process.env.BACKEND_PORT;
/**
 * This function should not exist, but JavaScript's parseInt somehow reads char-by-char integers
 * @param {string} num - Something that *should* be an integer, using simple regex to validate it 
 */
function parseIntOrUndefined(num) {
    const intRegex = /^[0-9]+$/g;
    if (!num.match(intRegex)) return undefined;
    else return parseInt(num);
}

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.get("/api/:regionId/agencies", async (req, res) => {
    const regionId = req.params.regionId;
    const regionValues = await knex.table("regions")
        .where({abbr: regionId})
        .first("id", "name", "region_tz", "description", "notes", "last_updated", "created_at");
    if (!regionValues) res.status(404).send(`Could not find a region with the id ${regionId}`);
    const agencies = await knex.raw(`
        SELECT DISTINCT ON(id) agency_id, agency_name, transit_mode, secondary_modes, description, notes
        FROM agencies
        JOIN (SELECT agency_id FROM schedules WHERE pre_covid = TRUE) as sched
        ON agencies.id = sched.agency_id
        WHERE region_id = ?
    `, [regionValues.id]);
  // leaving this commented out in case people want agencies that we haven't processed
    // const agencies = await knex.table("agencies")
    //     .where({region_id: regionValues.id})
    //     .select(["id", "agency_name", "transit_mode", "secondary_modes", "description", "notes"]);
    const returnValues = {
        region_abbr: regionId,
        region_name: regionValues.name,
        timezone: regionValues.region_tz,
        description: regionValues.description,
        notes: regionValues.notes,
        last_update: regionValues.last_updated,
        creation_date: regionValues.created_at,
        agencies: agencies.rows
    };
    res.jsonp(returnValues);
})

app.get("/api/:regionId/lines", async (req, res) => {
    const regionId = req.params.regionId;
    const agencyId = parseIntOrUndefined(req.query.agency);
    if (!agencyId) return res.status(404).send(`You must supply the query parameter 'agency' with an integer value`);
    const results = await knex.table("agencies")
        .join("regions", "agencies.region_id", "regions.id")
        .whereRaw(`regions.abbr = ? AND agencies.id = ?`, [regionId, agencyId])
        .first(knex.ref("agencies.id").as("agency_id"), "name", "region_tz", "agency_name")
        .then(async agency => {
            const lineInfo = await knex.table("lines")
                .where({agency_id: agencyId})
                .select(knex.ref("id").as("line_id"), "line_name", "route_mode", "route_color", "route_code");
            return {
                region_name: agency.name,
                region_tz: agency.region_tz,
                agency_id: agency.agency_id,
                agency_name: agency.agency_name,
                lines: lineInfo
            }
        })
        .catch(err => res.status(404).send(`Could not find an agency with region ${regionId} and agency ${agencyId}`));
    res.jsonp(results);
})

app.get("/api/:regionId/schedules", async (req, res) => {
    if (!req.query.agency) return res.status(404).send(`You need to supply an agency`);
    const agencyId = parseIntOrUndefined(req.query.agency);
    if (!req.query.line) return res.status(404).send(`You need to supply a line`);
    const lineId = parseIntOrUndefined(req.query.line);
    if (!agencyId || !lineId) return res.status(404).send(`The agency and line ID parameters must be integers`);
    const regionId = req.params.regionId;
    const regionValues = await knex.table("regions")
        .where({abbr: regionId})
        .first("id", "name", "abbr");
    if (!regionValues) return res.status(404).send(`Could not find a region with the id ${regionId}`);
    const lineInfo = await knex.table("lines")
        .join("agencies", "lines.agency_id", "agencies.id")
        .whereRaw(`region_id = ? AND agency_id = ? AND lines.id = ?`, [regionValues.id, agencyId, lineId])
        .first("agency_name", "line_name", "route_mode", "route_color");
    if (!lineInfo) return res.status(404).send(`Could not find a match for the line with Agency ID ${req.query.agency} and Line ID ${req.query.line}`); 
    const schedules = await knex.table("schedules")
        .where({ agency_id: agencyId })
        .select("id", "schedule_type", "raw_schedule_type", "log_time", "pre_covid")
        .then(scheduleList => scheduleList.map(async schedule => {
            const scheduleResults = knex.table("arrival_departure_points")
                .select(knex.raw(`
                    COUNT(departure_time)::integer as num_departures,
                    JSONB_AGG(departure_time) as departures,
                    JSONB_AGG(arrival_time) as arrivals,
                    stations.station_name,
                    station_id,
                    ST_X(stations.coordinates) as lat,
                    ST_Y(stations.coordinates) as lng
                `))
                .join("stations", "arrival_departure_points.station_id", "stations.id")
                .where({schedule_id: schedule.id, line_id: lineId})
                .groupBy(
                    "line_id",
                    "station_id",
                    "stations.station_name",
                    "stations.coordinates"
                )
                .orderByRaw(`line_id, MAX(stop_sequence)`);
            return {
                log_time: schedule.log_time,
                schedule_type: schedule.schedule_type,
                raw_schedule_type: schedule.raw_schedule_type,
                pre_covid: schedule.pre_covid,
                stops: await scheduleResults
                };
        }))
        .catch(err => {console.error(err);});
    const results =  {
                agency_name: lineInfo.agency_name,
                line_name: lineInfo.line_name,
                route_mode: lineInfo.route_mode,
                route_color: lineInfo.route_color,
                schedules: await Promise.all(schedules)
    };
    return res.jsonp(results);
})

app.listen(port, () => {
    console.log(`🚆 Transportation app running at port ${process.env.BACKEND_PORT} 🚌`)
})