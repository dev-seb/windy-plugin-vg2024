export interface BoatResult {
    key: string;
    abort: boolean;
    heading: number;
    rank: number;
    progress: string;
    foiler: boolean;
    color: string;
    colorFoil: string;
    colorMiddle: string;
    colorInside: string;
    sail: string;
    country: string;
    skipper: string;
    skipperLink: string;
    boat: string;
    timestamp: number;
    lat_ddm: number;
    lon_ddm: number;
    lat_dec: number;
    lon_dec: number;
    last_report_heading: number;
    last_report_speed: number;
    last_report_vmg: number;
    last_report_distance: number;
    last_24h_heading: number;
    last_24h_speed: number;
    last_24h_vmg: number;
    last_24h_distance: number;
    dtl: number;
    total_time: string;
    track: [number, number][];
}

export interface Boat extends BoatResult {
    layer: L.Polyline;
    marker: L.Marker;
}
