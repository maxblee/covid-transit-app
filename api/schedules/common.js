const fs = require("fs");
const path = require("path");
const moment = require("moment");
const AdmZip = require("adm-zip");
const axios = require("axios");
const parser = require("papaparse");
const knex = require("../utils/config").db();
const knexPostgis = require('knex-postgis');
const st = knexPostgis(knex);

/**
 * Creates the filename for a temporary zipfile for a GTFS file
 * @param {string} regionId - A unique identifier for the region
 * @param {string} agencyId - A unique identifier for the agency
 */
function getGTFSFileName(regionId, agencyId) {
    var dateFmt = moment().utc().format("YYYYMMDDTHHmmss[Z]");
    return path.join(
        process.env.ROOT_DIR,
        "assets/data/temp",
        `${dateFmt}_${regionId}_${agencyId}.zip`
    );
}

/**
 * Takes a GTFS file and returns a JSON object with records
 * @param {string} fileName - the name of the GTFS zipfile
 * @param {Date} logTime - the time when the GTFS was last updated
 */
function parseGTFS(fileName, logTime) {
    var rawResults = {};
    var zipFile = AdmZip(fileName);
    zipFile.getEntries().forEach(gtfsItem => {
        var zipContent = gtfsItem.getData().toString("utf8");
        var itemData = parser.parse(zipContent, {
            header: true,
            skipEmptyLines: true
        }).data;
        switch (gtfsItem.entryName) {
            case "agency.txt":
                rawResults.agencies = itemData.map(agency => {
                    return {
                        agency_abbr: agency.agency_id,
                        agency_name: agency.agency_name
                    }
                });
                break;
            case "calendar.txt":
                var isActive = itemData.filter(cal => {
                    var startDate = moment(cal.start_date, "YYYYMMDD");
                    var endDate = moment(cal.end_date, "YYYYMMDD");
                    var today = moment();
                    return startDate <= today && today <= endDate;
                })
                rawResults.schedule_overview = {
                    active_weekday: isActive.filter(cal => {
                        var mtof = [
                            cal.monday, 
                            cal.tuesday, 
                            cal.wednesday, 
                            cal.thursday, 
                            cal.friday
                        ];
                        return mtof.every(item => item === "1");
                    }).map(item => {
                        return {
                            schedule_id: item.service_id
                        }
                    }),
                    active_saturday: isActive.filter(cal => cal.saturday === "1")
                        .map(item => {
                            return { schedule_id: item.service_id };
                        }),
                    active_sunday: isActive.filter(cal => cal.sunday === "1")
                        .map(item => {
                            return { schedule_id: item.service_id };
                        })
                };
                break;
            case "calendar_attributes.txt":
                rawResults.schedule_description = itemData;
                break;
            case "routes.txt":
                var transit_modes = ["tram", "metro", "rail", "bus", "ferry", "cable tram", "aerial lift", "funicular", "trolleybus", "monorail"];
                rawResults.lines = itemData.map(line => {
                    // transit mode names from https://developers.google.com/transit/gtfs/reference#routestxt
                    return {
                        agency_abbr: line.agency_id,
                        line_name: line.route_long_name,
                        route_mode: transit_modes[parseInt(line.route_type)],
                        line_id: line.route_id,
                        line_color: line.route_color
                    };
                });
                break;
            case "stops.txt":
                // parent station call filters out stops that have related stations
                // see https://developers.google.com/transit/gtfs/reference#stopstxt
                rawResults.stations = itemData.filter(stop => stop.parent_station === "")
                    .map(station => {
                        return {
                            gtfs_id: station.stop_id,
                            station_name: station.stop_name,
                            lat: station.stop_lat,
                            lng: station.stop_lon
                        }
                    });
                rawResults.allStops = itemData.map(stop => {
                    return {
                        gtfs_id: stop.stop_id,
                        related_station: stop.parent_station === "" ? stop.stop_id : stop.parent_station
                    }
                });
                break;
            case "stop_times.txt":
                rawResults.stopTimes = itemData.map(stop_time => {
                    return {
                        trip_id: stop_time.trip_id,
                        arrival_time: stop_time.arrival_time,
                        departure_time: stop_time.departure_time,
                        stop_id: stop_time.stop_id,
                        stop_sequence: stop_time.stop_sequence
                    }
                })
                break;
            case "trips.txt":
                rawResults.trips = itemData.map(trip => {
                    return {
                        line_id: trip.route_id,
                        schedule_id: trip.service_id,
                        trip_id: trip.trip_id
                    };
                });
                break;
        };
    });    
    var gtfsInfo = {
        agencies: rawResults.agencies.map(agency => {
            var count = {};
            var mcCount = 0;
            var mostCommon;
            var agencyLines = rawResults.lines.filter(line => line.agency_abbr === agency.agency_abbr);
            agencyLines.forEach(line => {
                count[line.route_mode] = (count[line.route_mode] || 0) + 1;
                mostCommon = count[line.route_mode] > mcCount ? line.route_mode : mostCommon;
                mcCount = count[line.route_mode] > mcCount ? count[line.route_mode] : mcCount;
            });
            return {
                agency_abbr: agency.agency_abbr,
                agency_name: agency.agency_name,
                transit_mode: mostCommon,
                secondary_modes: Object.keys(count).sort().filter(mode => mode !== mostCommon).join(",")
            }
        }),
        schedules: rawResults.agencies.map(agency => {
            return rawResults.schedule_description.map(schedule => {
                var scheduleType;
                if (rawResults.schedule_overview.active_weekday.filter(sched_id => sched_id.schedule_id === schedule.service_id).length > 0) {
                    scheduleType = "weekday";
                } else if (rawResults.schedule_overview.active_saturday.filter(sched_id => sched_id.schedule_id === schedule.service_id).length > 0) {
                    scheduleType = "saturday";
                } else if (rawResults.schedule_overview.active_sunday.filter(sched_id => sched_id.schedule_id === schedule.service_id).length > 0) {
                    scheduleType = "sunday";
                }
                return {
                    agency_abbr: agency.agency_abbr,
                    log_time: logTime,
                    schedule_type: scheduleType,
                    rawScheduleType: schedule.service_description,
                    schedule_code: schedule.service_id
                };
            })
        }).flat(),
        lines: rawResults.lines,
        stations: rawResults.stations,
        arrival_departure_points: rawResults.stopTimes.map(stopTime => {
            var line = rawResults.trips
                .filter(trip => trip.trip_id === stopTime.trip_id)[0].line_id;
            var trip = rawResults.trips
                .filter(trip => trip.trip_id === stopTime.trip_id)[0];
            var station = rawResults.allStops
                .filter(stop => stop.gtfs_id === stopTime.stop_id)[0].related_station;
            return {
                stop_sequence: stopTime.stop_sequence,
                schedule_id: trip.schedule_id,
                line_id: trip.line_id,
                station_id: station,
                arrival_time: stopTime.arrival_time,
                departure_time: stopTime.departure_time
            }; 
        })
    };
    return gtfsInfo;
}

/**
 * Downloads a GTFS file.
 * @param {string} fileName - The path to the temporary ZIP file
 * @param {string} scheduleUrl - The URL of the GTFS feed, with http://
 * @param {object} scheduleParams - Extra parameters for the request, like an API key
 */
async function downloadGTFS(fileName, scheduleUrl, scheduleParams) {
    var writer = fs.createWriteStream(fileName);
    var response = await axios.get(scheduleUrl, {
        params: scheduleParams,
        responseType: "stream"
    });
    response.data.pipe(writer);
    var resolution = new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
    return resolution;
}

/**
 * Downloads GTFS data and dumps it to our database
 * @param {number} regionId - The identifier for the region (e.g. sf)
 * @param {string} agencyId  - Idenfier for the agency (e.g. BA)
 * @param {string} scheduleUrl - The URL for the agency, with http://
 * @param {object} scheduleParams - Extra parameters for the request, like an API key
 * @param {Date} logTime - The time the schedule was updated.
 */
async function addGTFSSchedules(regionId, agencyId, scheduleUrl, scheduleParams, logTime) {
    var fileName = getGTFSFileName(regionId, agencyId);
    return await downloadGTFS(fileName, scheduleUrl, scheduleParams)
        .then(async () => {
            var gtfsResults = parseGTFS(fileName, logTime);
            var agencyInfo = gtfsResults.agencies.map(agency => {
                return {
                    region_id: regionId,
                    agency_name: agency.agency_name,
                    transit_mode: agency.transit_mode,
                    agency_abbr: agency.agency_abbr,
                    secondary_modes: agency.secondary_modes
                };
            });
            return knex("agencies").insert(agencyInfo)
                .returning(["id", "agency_abbr"])
                .then(function(agencyResults) {
                    var validSchedules = gtfsResults.schedules
                        .map(schedule => {
                            return {
                                agency_id: agencyResults.filter(agency => agency.agency_abbr === schedule.agency_abbr)[0].id,
                                log_time: moment(schedule.log_time),
                                schedule_type: schedule.schedule_type,
                                raw_schedule_type: schedule.rawScheduleType,
                                schedule_code: schedule.schedule_code
                            }
                        });
                    return knex("schedules").insert(validSchedules)
                        .returning(["id", "schedule_code"])
                        .then(function(scheduleResults) {
                            var lines = gtfsResults.lines
                                .map(line => {
                                    return {
                                        agency_id: agencyResults.filter(agency => agency.agency_abbr === line.agency_abbr)[0].id,
                                        route_color: line.line_color,
                                        route_code: line.line_id,
                                        route_mode: line.route_mode,
                                        line_name: line.line_name
                                    }
                                });
                            return knex("lines").insert(lines)
                                .returning(["id", "route_code"])
                                .then(function(lineResults) {
                                    return knex("stations").insert(gtfsResults.stations.map(station => {
                                        var coords = `Point(${station.lng} ${station.lat})`;
                                        return {
                                            region_id: regionId,
                                            station_name: station.station_name,
                                            coordinates: st.geomFromText(coords, 4326),
                                            station_code: station.gtfs_id
                                        }
                                    }))
                                    .returning(["id", "station_code"])
                                    .then(function(stationResults) {
                                        var arrivalDeparture = gtfsResults.arrival_departure_points.map(stopPoint => {
                                            return {
                                                line_id: lineResults.filter(line => line.route_code === stopPoint.line_id)[0].id,
                                                station_id: stationResults.filter(station => station.station_code === stopPoint.station_id)[0].id,
                                                stop_sequence: parseInt(stopPoint.stop_sequence),
                                                schedule_id: scheduleResults.filter(schedule => schedule.schedule_code === stopPoint.schedule_id)[0].id,
                                                arrival_time: stopPoint.arrival_time,
                                                departure_time: stopPoint.departure_time
                                            }
                                        });
                                        // batchInsert required because there are *a lot* of arrival points
                                        return knex.batchInsert("arrival_departure_points", arrivalDeparture);
                                    })
                                    .catch(err => {console.error(err); })
                                })
                                .catch(err => {console.error(err);})
                        })
                        .catch(err => {console.error(err)});
                })
                .catch(err => { console.error(err); })
        })
        .catch(err => { console.error(err); })
}

/**
 * Takes a JSON file and adds it to the database
 * @param {string} fileName - Path to the JSON file 
 */
async function addPreCovid(fileName) {
    var pathToJSON = path.join(
        process.env.ROOT_DIR,
        "assets/data/initial",
        fileName
    );
    fs.readFile(pathToJSON, async (err, data) => {
        if (err) throw err;
        var jsonData = JSON.parse(data);
        return await jsonData.map(async schedule => {
            var scheduleInfo = {
                "agency_id": schedule.agency_id,
                "log_time": schedule.log_time,
                "schedule_type": schedule.schedule_type,
                "pre_covid": schedule.pre_covid
            };
            return await knex("schedules").insert(scheduleInfo).returning("id")
                .then(async schedule_id => {
                    var arrivals = schedule.arrivals.map(arrival => {
                        return {
                            "arrival_time": arrival.arrival_time,
                            "departure_time": arrival.departure_time,
                            "schedule_id": schedule_id[0],
                            "stop_sequence": arrival.stop_sequence,
                            "line_id": arrival.line_id,
                            "station_id": arrival.station_id
                        };
                    });
                    return knex.batchInsert("arrival_departure_points", arrivals);
                })
                .catch(err => {console.error(err);});
        });
    });
}

module.exports = {
    addGTFSSchedules
}

addPreCovid("bart-precovid.json");