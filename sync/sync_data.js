import fsAsync from 'fs/promises';
import path from 'path';

import xlsx from 'xlsx';

import { startDate, startLatLon, boatsConfig, reportsHistoryExcelDir } from './config.js';

/**
 * Convert Degrees with Hemisphere to Decimal Degrees
 */
const convertHemCoordinate = coordinate => {
    const value = parseFloat(coordinate.slice(0, -1));
    const direction = coordinate.slice(-1);
    if (direction === 'S' || direction === 'W') {
        return -value;
    } else if (direction === 'N' || direction === 'E') {
        return value;
    } else {
        throw new Error(`Invalid coordinate direction: ${direction}`);
    }
};

/**
 * Convert Degrees and Decimal Minutes to Decimal Degrees
 */
const convertDdmCoordinate = coordinate => {
    const matches = coordinate.match(/([0-9]+)°([0-9.]+)'([A-Z]{1})/);
    const degrees = parseInt(matches[1]) + parseFloat(matches[2]) / 60;
    const direction = matches[3];
    return convertHemCoordinate(`${degrees}${direction}`);
};

/**
 * Convert "MM/DD/YY mm:hh" date to
 *
const convertDate = dateString => {
    const [datePart, timePart] = dateString.split(' ');
    const [month, day, year] = datePart.split('/').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    const date = new Date(
        new Date(2000 + year, month - 1, day, hours, minutes).toLocaleString('en-US', {
            timeZone: 'Europe/Paris',
        }),
    );
    return date.getTime();
};
*/

const getTotalTime = timestamp => {
    const diff = timestamp - startDate.getTime();
    const second = 1000;
    const minute = 60 * second;
    const hour = 60 * minute;
    const day = 24 * hour;
    const days = Math.floor(diff / day);
    const hours = Math.floor((diff % day) / hour);
    const minutes = Math.floor((diff % hour) / minute);
    const seconds = Math.floor((diff % minute) / second);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

/*
const getBoats = async () => {
    const boats = {};
    const data = await fsAsync.readFile(
        path.join(reportsConfigurationDir, 'vendeeglobe_BOATS_IDS.txt'),
        {
            encoding: 'latin1',
        },
    );
    const lines = data.split('\n');
    lines.forEach(line => {
        if (line.trim() !== '') {
            const cols = line.split(';');
            const id = cols[0];
            const boat = cols[1];
            boats[id] = boat;
        }
    });
    return boats;
};
*/

/*
const getTracksFromPosreportFiles = async () => {
    const tracks = {};
    const files = await fsAsync.readdir(posreportDir);
    files.sort();
    for (const file of files) {
        const data = await fsAsync.readFile(path.join(posreportDir, file), { encoding: 'latin1' });
        const lines = data.split('\n');
        lines.shift();
        lines.forEach(line => {
            if (line.trim() !== '') {
                const cols = line.split(';');
                const ranking = cols[0];
                const id = cols[1];
                const lat_dec = convertHemCoordinate(cols[2]);
                const lon_dec = convertHemCoordinate(cols[3]);
                const timestamp = convertDate(cols[4]);
                if (!tracks[id]) {
                    tracks[id] = [];
                }
                tracks[id].push({ timestamp, lat_dec, lon_dec });
            }
        });
    }
    const sortedTracks = {};
    for (const [id, arr] of Object.entries(tracks)) {
        sortedTracks[id] = arr.sort((a, b) => {
            a.timestamp - b.timestamp;
        });
    }
    return sortedTracks;
};
*/

const getExcelRows = file => {
    const workbook = xlsx.readFile(file);
    const sheetNames = workbook.SheetNames;
    const sheet = workbook.Sheets[sheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, {});
    return data.slice(3, Object.keys(boatsConfig).length + 3);
};

const getExcelRow = row => {
    const cols = Object.values(row);

    if (!cols[1]) {
        return null;
    }

    const rank = parseInt(cols[0]);
    const abort = cols[0] === 'RET';

    const sailParts = cols[1].split('\r\n');
    const country = sailParts[0];

    let sail = sailParts[1];
    if (sail.indexOf(' ') < 0) {
        const matches = sail.match(/([A-Z]{3})([0-9]+)/);
        if (matches.length === 3) {
            sail = `${matches[1]} ${matches[2]}`;
        }
    }

    const [skipper, boat] = cols[2].split('\r\n');

    // Init
    let timestamp = 0;
    let heading = 0;
    let lat_ddm = 0;
    let lon_ddm = 0;
    let lat_dec = 0;
    let lon_dec = 0;
    let last_30mn_heading = 0;
    let last_30mn_speed = 0;
    let last_30mn_vmg = 0;
    let last_30mn_distance = 0;
    let last_24h_heading = 0;
    let last_24h_speed = 0;
    let last_24h_vmg = 0;
    let last_24h_distance = 0;
    let last_report_heading = 0;
    let last_report_speed = 0;
    let last_report_vmg = 0;
    let last_report_distance = 0;
    let dtf = 0;
    let dtl = 0;

    if (!abort) {
        const [hour, minute] = cols[3].split(' ')[0].split(':').map(Number);
        const currentDate = new Date();
        const date = new Date(currentDate.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
        date.setHours(hour, minute, 0, 0);
        timestamp = date.getTime();

        heading = parseInt(cols[6]);

        lat_ddm = cols[4];
        lon_ddm = cols[5];
        lat_dec = convertDdmCoordinate(cols[4]);
        lon_dec = convertDdmCoordinate(cols[5]);

        last_30mn_heading = parseInt(cols[6]);
        last_30mn_speed = parseFloat(cols[7]);
        last_30mn_vmg = parseFloat(cols[8]);
        last_30mn_distance = parseFloat(cols[9]);

        last_24h_heading = parseInt(cols[10]);
        last_24h_speed = parseFloat(cols[11]);
        last_24h_vmg = parseFloat(cols[12]);
        last_24h_distance = parseFloat(cols[13]);

        last_report_heading = parseInt(cols[14]);
        last_report_speed = parseFloat(cols[15]);
        last_report_vmg = parseFloat(cols[16]);
        last_report_distance = parseFloat(cols[17]);

        dtf = parseFloat(cols[18]);
        dtl = parseFloat(cols[19]);
    }

    const total_time = getTotalTime(timestamp);
    const progress = '';
    const track = [];

    const key = sail.replace(' ', '');

    let skipperLink = '';
    let foiler = false;
    let color = '';
    let colorFoil = '';
    let colorMiddle = '';
    let colorInside = '';
    if (boatsConfig[key]) {
        const boatConfig = boatsConfig[key];
        skipperLink = boatConfig.skipperLink;
        foiler = boatConfig.foiler;
        color = boatConfig.color;
        colorFoil = boatConfig.colorFoil;
        colorMiddle = boatConfig.colorMiddle;
        colorInside = boatConfig.colorInside;
    }

    return {
        key,
        timestamp,
        sail,
        country,
        skipper,
        skipperLink,
        boat,
        rank,
        abort,
        heading,
        lat_ddm,
        lon_ddm,
        lat_dec,
        lon_dec,
        last_30mn_heading,
        last_30mn_speed,
        last_30mn_vmg,
        last_30mn_distance,
        last_24h_distance,
        last_24h_heading,
        last_24h_speed,
        last_24h_vmg,
        last_report_distance,
        last_report_heading,
        last_report_speed,
        last_report_vmg,
        dtf,
        dtl,
        total_time,
        progress,
        foiler,
        color,
        colorFoil,
        colorMiddle,
        colorInside,
        track,
    };
};

const getExcelFiles = async () => {
    const files = await fsAsync.readdir(reportsHistoryExcelDir);
    const excelFiles = files.filter(file => file.match(/.*\.(xlsx)$/));
    const lastExcelFile = excelFiles.length > 0 ? excelFiles[excelFiles.length - 1] : null;
    const previousExcelFile = excelFiles.length > 1 ? excelFiles[excelFiles.length - 2] : null;
    return {
        excelFiles,
        lastExcelFile,
        previousExcelFile,
    };
};

const getTracksFromExcelFiles = async excelFiles => {
    const tracks = {};
    excelFiles.forEach(excelFile => {
        const rows = getExcelRows(path.join(reportsHistoryExcelDir, excelFile));
        rows.forEach(row => {
            const data = getExcelRow(row);
            if (!data.abort && data.timestamp > 0) {
                if (!tracks[data.sail]) {
                    tracks[data.sail] = [
                        {
                            timestamp: startDate.getTime(),
                            lat_dec: startLatLon[0],
                            lon_dec: startLatLon[1],
                        },
                    ];
                }
                tracks[data.sail].push({
                    timestamp: data.timestamp,
                    lat_dec: data.lat_dec,
                    lon_dec: data.lon_dec,
                });
            }
        });
    });

    const sortedTracks = {};
    for (const [sail, arr] of Object.entries(tracks)) {
        sortedTracks[sail] = arr.sort((a, b) => {
            a.timestamp - b.timestamp;
        });
    }
    return sortedTracks;
};

const getResult = async () => {
    const result = {};
    const previousRanks = {};
    const { excelFiles, lastExcelFile, previousExcelFile } = await getExcelFiles();
    const tracks = await getTracksFromExcelFiles(excelFiles);
    if (previousExcelFile) {
        const rows = getExcelRows(path.join(reportsHistoryExcelDir, previousExcelFile));
        rows.forEach(row => {
            const data = getExcelRow(row);
            if (!data.abort && data.timestamp > 0) {
                previousRanks[data.key] = data.rank;
            }
        });
    }
    if (lastExcelFile) {
        const rows = getExcelRows(path.join(reportsHistoryExcelDir, lastExcelFile));
        rows.forEach(row => {
            const data = getExcelRow(row);

            // Rank progress
            if (previousRanks[data.key]) {
                const previousRank = previousRanks[data.key];
                if (previousRank === data.rank) {
                    data.progress = 'eq';
                } else if (previousRank > data.rank) {
                    data.progress = 'up';
                } else if (previousRank < data.rank) {
                    data.progress = 'down';
                }
            }

            // Track
            data.track = tracks[data.sail].map(track => [track.lat_dec, track.lon_dec]);

            result[data.key] = data;
        });
    }
    return { result };
};

(async () => {
    const result = await getResult();
    const dataFile = `${process.cwd()}/data/data.json`;
    fsAsync.writeFile(dataFile, JSON.stringify(result, null, 2));
})();
