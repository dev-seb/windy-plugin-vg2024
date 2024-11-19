{#if isMobileOrTablet}
<section class="mobile-boat-ui plugin__content-mobile">    
    {#each listOfBoats as data}
        <div
            class="boat"
            on:click={() => highlightTrack(data)}
            on:mouseover={() => showTrack(data.layer)}
            on:mouseout={() => hideTrack(data.layer)}            
        >
            <div class="boat-rank">
                {data.rank}
                <div class="boat-rank-progress {data.progress}"></div>
            </div>
            <img class="boat-skipper-photo" src="{baseUrl}/assets/photos/{data.key}.webp" />
            <div class="boat-content">
                <div class="boat-skipper-name">
                    <img class="boat-skipper-country" src="{baseUrl}/assets/flags/{data.country}.svg" />
                    <span>{data.skipper}</span>
                    {#if data.foiler}
                    <img class="boat-foiler-icon" src="{baseUrl}/assets/foiler_red.png" />
                    {/if}
                </div>
                <div class="boat-name">
                    {data.boat}
                </div>
                <div class="boat-data">
                    {data.heading}° / {data.last_report_speed.toFixed(2)} {translations[lang].knots_short}
                </div>
            </div>
        </div>
    {/each}
</section>
{:else}
<section class="plugin__content">
    <div class="mb-30 centered">
        <div
            class="button button--variant-orange size-s"
            on:click={() => bcast.emit('rqstOpen', 'menu')}
        >
            Back to menu
        </div>
    </div>
    <div class="size-xl">{translations[lang].ranking_of} {lastRanking}</div>
    {#each listOfBoats as data}
        <div
            class="boat"
            on:click={() => highlightTrack(data)}
            on:mouseover={() => showTrack(data.layer)}
            on:mouseout={() => hideTrack(data.layer)}            
        >
            <div class="boat-rank">
                {data.rank}
                <div class="boat-rank-progress {data.progress}"></div>
            </div>
            <img class="boat-skipper-photo" src="{baseUrl}/assets/photos/{data.key}.webp" />
            <div class="boat-content">
                <div class="boat-skipper-name">
                    <img class="boat-skipper-country" src="{baseUrl}/assets/flags/{data.country}.svg" />
                    <span>{data.skipper}</span>
                    {#if data.foiler}
                    <img class="boat-foiler-icon" src="{baseUrl}/assets/foiler_red.png" />
                    {/if}
                </div>
                <div class="boat-name">
                    {data.boat}
                </div>
                <div class="boat-data">
                    {data.heading}° / {data.last_report_speed.toFixed(2)} {translations[lang].knots_short}
                </div>
            </div>
        </div>
    {/each}
    <div class="size-xl mt-2">{translations[lang].aborts}</div>
    {#each listOfAborts as data}
        <div
            class="boat aborts"
            on:click={() => highlightTrack(data)}
            on:mouseover={() => showTrack(data.layer)}
            on:mouseout={() => hideTrack(data.layer)}   
        >
            <div class="boat-rank">-</div>
            <img class="boat-skipper-photo" src="{baseUrl}/assets/photos/{data.key}.webp" />
            <div class="boat-content">
                <div class="boat-skipper-name">
                    <img class="boat-skipper-country" src="{baseUrl}/assets/flags/{data.country}.svg" />
                    <span>{data.skipper}</span>
                </div>
                <div class="boat-name">
                    {data.boat}
                </div>
            </div>
        </div>
    {/each}    
</section>
{/if}

<script lang="ts">
import bcast from '@windy/broadcast';
import { map } from '@windy/map';
import { isMobileOrTablet } from '@windy/rootScope';
import { getLatLonInterpolator } from '@windy/interpolator';
import store from '@windy/store';
import { wind2obj } from '@windy/utils';
import { onMount, onDestroy } from 'svelte';
import type { Boat, BoatResult } from './boatTypes';
import type { CoordsInterpolationFun } from '@windy/interpolator';

const baseUrl = "https://127.0.0.1:9999";
//const dataUrl = `${baseUrl}/data.json`; // local dev
const dataUrl = 'https://raw.githubusercontent.com/dev-seb/windy-plugin-vg2024/refs/heads/main/data/data.json'

const linesColors: Map<L.Polyline, string> = new Map();
const boats: Map<string, Boat> = new Map();

let markers: L.Marker[] = [];
let lines: L.Polyline[] = [];
let currentLine: L.Polyline | null = null;
let listOfBoats: Boat[] = [];
let listOfAborts: Boat[] = [];
let openedPopup: L.Popup | null = null;
let lastRanking = "";

const lang = navigator.language.substring(0,2) === "fr" ? "fr" : "en";
const translations = {
    en: {
        aborts: "Aborts",
        knots: "knots",
        knots_short: "kts", 
        ranking_of: "Ranking of",
        at: "at",
        speed: "Speed",
        current_speed: "Current speed",
        distance_to_leader: "Distance to leader",
        speed_last_24h: "Avg. speed last 24h",
        distance_last_24h: "Distance last 24h",
        heading: "H.",
        wind_speed: "Wind speed",
        wind_direction: "Wind direction",
        position: "Position",
    },
    fr: {
        aborts: "Abandons",
        knots: "noeuds",
        knots_short: "nds",
        ranking_of: "Classement du",
        at: "à",
        speed: "Vitesse",
        current_speed: "Vitesse actuelle",
        distance_to_leader: "Distance au premier",
        speed_last_24h: "Vitesse moy. sur 24h",
        distance_last_24h: "Distance sur 24h",
        heading: "Cap",
        wind_speed: "Vitesse du vent",
        wind_direction: "Direction du vent",    
        position: "Position",            
    }
};

const updateIconStyles = () => {
    for (const marker of markers) {
        if (marker._icon) {
            marker._icon.style.transformOrigin = '12px 12px';
            const heading = marker._icon.getAttribute('data-heading');
            if (marker._icon.style.transform.indexOf('rotateZ') === -1) {
                marker._icon.style.transform = `${marker._icon.style.transform} rotateZ(${
                    heading || 0
                }deg)`;
            }
        }
    }
};

export const getBoatIcon = (color: string, colorMiddle: string, colorInside: string) =>
    L.divIcon({
        html: `<svg width="22" height="26" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" version="1.1" xml:space="preserve">
  <path d="m11.25,0.25q-4.5,10 -4,25q4,1 8,0q0.5,-15 -4,-25z" fill="${color}" id="svg_1"/>
  <path d="m11.25,8.26q-3,6 -2.5,14l5,0q0.5,-8 -2.5,-14z" fill="${colorMiddle}" id="svg_2"/>
  <path d="m11.25,13.26q-2,0 -2.5,9.2l5,0q-0.5,-9.2 -2.5,-9.2z" fill="${colorInside}" id="svg_3"/>
</svg>`,
        iconSize: [14, 25],
        iconAnchor: [12, 12],
    });

export const getBoatFoilerIcon = (
    color: string,
    colorMiddle: string,
    colorInside: string,
    colorFoil: string,
) =>
    L.divIcon({
        html: `<svg width="22" height="26" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" version="1.1" xml:space="preserve">
      <path class="c4" d="m11.12,13.88l-8.1,-0.1q-1.2,0.2 -1.6,2.5q0.6,-0.3 2,-0.3l7.7,0.2l7.7,-0.2q1.4,0 2,0.3q-0.4,-2.3 -1.6,-2.5l-4.5,0.1l-3.6,0z" fill="${colorFoil}" id="svg_1"/>
      <path class="c1" d="m11.12,0.19q-4.5,10 -4,25q4,1 8,0q0.5,-15 -4,-25zl0,0z" fill="${color}" id="svg_2"/>
      <path class="c2" d="m11.12,8.18q-3,6 -2.5,14l5,0q0.5,-8 -2.5,-14z" fill="${colorMiddle}" id="svg_3"/>
      <path class="c3" d="m11.12,13.19q-2,0 -2.5,9.2l5,0q-0.5,-9.2 -2.5,-9.2z" fill="${colorInside}" id="svg_4"/>
    </svg>`,
        iconSize: [14, 25],
        iconAnchor: [12, 12],
    });

const highlightTrack = (data: Boat) => {
    if(currentLine === data.layer) {
        currentLine = null;
        showTrack(data.layer);
        openedPopup?.remove();
    }
    else {
        console.log("currentLine <=> data.layer");
        currentLine = data.layer;
        lines.forEach((line) => {
            hideTrack(line);
        });
        data.layer.setStyle({ weight: 4, opacity: 1, color: "#FFFFFF" });
        data.layer.bringToFront();      
        displayPopup(data.key);  
    }
};

const showTrack = (layer: L.Polyline) => {
    if(layer !== currentLine) {
        layer.setStyle({ weight: 2, opacity: 1, color: linesColors.get(layer) });
        layer.bringToFront();
    }
};

const hideTrack = (layer: L.Polyline) => {
    if(layer !== currentLine) {
        layer.setStyle({ weight: 1, opacity: 0.3, color: linesColors.get(layer)});
        layer.bringToBack();
    }
};

const getWindDirection = (degree: number) => {
  const directions = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
  ];
  const normalizedDegree = (degree % 360 + 360) % 360;
  const index = Math.round(normalizedDegree / 22.5) % 16;
  return directions[index];
};

const displayPopup = (key: string) => {
    openedPopup?.remove();

    const data = boats.get(key);
    if (!data) {
        throw new Error('Boat not found!');
    }

    // Now we interpolate weather values for the
    // position of the boat
    getLatLonInterpolator().then((interpolateLatLon: CoordsInterpolationFun | null) => {

        const lat = data.lat_dec;
        const lon = data.lon_dec;
        const latestPosition: L.LatLngTuple = [lat, lon];

        let windSpeedKts = 0;
        let windSpeedKmh = 0;
        let windDirection = 0;

        if (interpolateLatLon && store.get('overlay') === 'wind') {
            // Interpolated values can be either invalid (NaN, null, -1)
            // or array of numbers
            const interpolated = interpolateLatLon({ lat, lon });

            if (Array.isArray(interpolated)) {
                // I everything works well, we should get raw meterological values
                // for the position of the boat, as the are in the wind overlay RGBA tile

                const { dir, wind } = wind2obj(interpolated);

                // This will convert wind speed form m/s to user's preferred units
                windSpeedKts = wind * 1.943844;
                windSpeedKmh = wind * 3.6;
                windDirection = dir;
            }
        }

        let progressColor = "";
        let progressContent = "";
        if(data.progress === "up") {
            progressColor = "#269230";
            progressContent = "▲";

        } else if(data.progress === "down") {
            progressColor = "#E30613";
            progressContent = "▼";            
        } else if(data.progress === "eq") {
            progressColor = "#BDCDE3";
            progressContent = "►";            
        }

        const html = `
            <div style="display: flex; justify-content: flex-start; color: #1A1349; width: 350px">
                <div style="font-size: 20px; font-weight: 700; line-height: 20px; text-align: center">
                    ${data.rank}
                    <div style="font-size: 20px; line-height: 20px; color: ${progressColor}">${progressContent}</div>
                </div>
                <div style="margin-left: 10px">
                    <div style="text-transform: uppercase; font-size: 12px; font-weight: 700; line-height: 20px;">
                        <a href="${data.skipperLink}" target="_blank">${data.skipper}</a>
                    </div>
                    <div style="text-transform: uppercase; font-size: 12px; font-weight: 700; line-height: 20px; color: #BDBDBD">
                        ${data.boat}
                    </div>              
                </div>
            </div>
            <div style="margin-top: 20px;">
               <div style="">${translations[lang].position}: <b>${data.lat_ddm},${data.lon_ddm}</b></div>
            </div>            
            <div style="margin-top: 20px; display: flex; justify-content: flex-start">
                <div style="flex: 1">
                    <div style="">${translations[lang].current_speed}: <b>${data.last_report_speed} ${translations[lang].knots_short}</b></div>
                    <div style="">${translations[lang].distance_to_leader}: <b>${data.dtl} nm</b></div>
                    <div style="">${translations[lang].speed_last_24h}: <b>${data.last_24h_speed} ${translations[lang].knots_short}</b></div>
                    <div style="">${translations[lang].distance_last_24h}: <b>${data.last_24h_distance} nm</b></div>
                </div>
                <div style="width: 60px; height: 60px; float: right; position: relative; overflow: hidden">   
                    <img src="${baseUrl}/assets/compass_background.png" style="position: absolute; left: 10px; top: 0; width: 40px;" />
                    <img src="${baseUrl}/assets/compass_needle.png" style="position: absolute; left: 10px; top: 0; width: 40px; transform: rotate(${data.heading}deg); transition-duration: 2s; transition-property: transform;" />
                    <div style="position: absolute; width: 100%; line-height: 20px; bottom: 0; text-align: center">
                        ${translations[lang].heading}: ${data.heading}°
                    </div>
                </div>
                <div style="width: 60px;  height: 60px; float: right; position: relative; overflow: hidden">   
                    <img src="${baseUrl}/assets/speedometer_background.png" style="position: absolute; left: 10px; top: 0; width: 40px;" />
                    <img src="${baseUrl}/assets/speedometer_needle.png" style="position: absolute; left: 10px; top: 0; width: 40px; transform: rotate(${(data.last_report_speed * 6)}deg); transition-duration: 2s; transition-property: transform;" />
                    <div style="position: absolute; width: 100%; line-height: 20px; bottom: 0; text-align: center">
                        ${translations[lang].speed}:<br />${data.last_report_speed} ${translations[lang].knots_short}
                    </div>
                </div>
            </div>
            <div style="margin-top: 20px;line-height: 20px;">
                <div style="width: 20px;  height: 20px; float: left; margin-right: 10px;">
                    <svg viewBox="0 0 27 27">
                        <path stroke="none" d="M19.6493 6.75H21.3582C22.0018 6.75 22.5347 6.90499 22.9618 7.17627C23.386 7.44566 23.6629 7.80226 23.8409 8.14145C24.017 8.47698 24.1014 8.80405 24.1429 9.04138C24.1639 9.16173 24.1748 9.26378 24.1804 9.33885C24.1833 9.37651 24.1848 9.40775 24.1856 9.43154C24.186 9.44344 24.1863 9.45351 24.1864 9.46162L24.1866 9.47232L24.1866 9.47654L24.1866 9.47837C24.1866 9.47877 24.1866 9.48 23.438 9.48H24.1866C24.1866 10.1249 24.0026 10.6562 23.6912 11.0733C23.3866 11.4814 22.9928 11.7371 22.6339 11.8973C22.2758 12.0572 21.9279 12.1335 21.6764 12.1709C21.5488 12.1899 21.4411 12.1996 21.3626 12.2046C21.3233 12.2071 21.291 12.2085 21.2668 12.2092L21.2368 12.2099L21.2265 12.21L21.2227 12.21L21.221 12.21C21.2207 12.21 21.2196 12.21 21.2196 11.46V12.21H4.5V10.71L21.2159 10.71L21.219 10.71L21.2174 10.71L21.2159 10.71L21.2222 10.7098C21.2305 10.7096 21.2459 10.709 21.2671 10.7077C21.3099 10.7049 21.3754 10.6992 21.4556 10.6872C21.6199 10.6628 21.8261 10.6153 22.0223 10.5277C22.2176 10.4404 22.3781 10.3248 22.4892 10.1761C22.5929 10.037 22.6856 9.82723 22.6866 9.48525C22.6866 9.48488 22.6866 9.48446 22.6865 9.48399C22.6864 9.47877 22.6859 9.46748 22.6846 9.451C22.6821 9.41778 22.6768 9.36514 22.6653 9.29987C22.6419 9.16595 22.5964 8.99802 22.5127 8.83855C22.4309 8.68274 22.3181 8.54434 22.1577 8.44248C22.0003 8.34251 21.7538 8.25 21.3582 8.25H19.6493V6.75ZM4.5 15.29V13.79H16.6009V14.54C16.6009 13.79 16.6006 13.79 16.6009 13.79L16.6024 13.79L16.604 13.79L16.6079 13.79L16.6181 13.7901L16.6482 13.7908C16.6723 13.7915 16.7046 13.7929 16.7439 13.7954C16.8224 13.8004 16.9301 13.8101 17.0578 13.8291C17.3092 13.8665 17.6572 13.9428 18.0152 14.1027C18.3741 14.2629 18.7679 14.5186 19.0725 14.9267C19.3839 15.3438 19.5679 15.8751 19.5679 16.52H18.8179C19.5679 16.52 19.5679 16.5196 19.5679 16.52L19.5679 16.5235L19.5679 16.5277L19.5677 16.5384C19.5677 16.5421 19.5676 16.5461 19.5675 16.5506C19.5673 16.556 19.5672 16.562 19.5669 16.5685C19.5661 16.5922 19.5646 16.6235 19.5617 16.6612C19.5561 16.7362 19.5453 16.8383 19.5242 16.9586C19.4827 17.1959 19.3983 17.523 19.2222 17.8585C19.0442 18.1977 18.7673 18.5543 18.3432 18.8237C17.916 19.095 17.3831 19.25 16.7395 19.25H15.0306V17.75H16.7395C17.1351 17.75 17.3816 17.6575 17.539 17.5575C17.6994 17.4557 17.8122 17.3173 17.894 17.1615C17.9777 17.002 18.0232 16.8341 18.0467 16.7001C18.0581 16.6349 18.0635 16.5822 18.0659 16.549C18.0672 16.5325 18.0677 16.5212 18.0679 16.516C18.0679 16.5155 18.0679 16.5151 18.0679 16.5148C18.067 16.1728 17.9743 15.963 17.8705 15.8239C17.7594 15.6752 17.599 15.5596 17.4036 15.4723C17.2074 15.3847 17.0012 15.3372 16.8369 15.3128C16.7567 15.3008 16.6913 15.2951 16.6485 15.2923C16.6272 15.291 16.6119 15.2904 16.6035 15.2902L16.5972 15.29L16.5987 15.29L16.5997 15.29L4.5 15.29Z"></path>
                    </svg>     
                </div>
                ${translations[lang].wind_speed}: ${windSpeedKts.toFixed(2)} ${translations[lang].knots_short} (${windSpeedKmh.toFixed(2)} km/h)      
            </div>
            <div style="clear: both;">
                <div style="width: 20px;  height: 20px; float: left; position: relative; margin-right: 10px; overflow: hidden">   
                    <img src="${baseUrl}/assets/compass_background.png" style="position: absolute; left: 0; top: 0; width: 20px;" />
                    <img src="${baseUrl}/assets/compass_needle.png" style="position: absolute; left: 0; top: 0; width: 20px; transform: rotate(${(windDirection + 180)}deg); transition-duration: 2s; transition-property: transform;" />
                </div>
                ${translations[lang].wind_direction}: ${windDirection}° (${getWindDirection(windDirection)}) 
            </div>
        `;

        openedPopup = new L.Popup({ autoClose: true, closeOnClick: isMobileOrTablet, offset: [0, -5]})
            .setLatLng(latestPosition)
            .setContent(html)
            .openOn(map);
    });
};

const loadResults = () => {
    fetch(dataUrl)
        .then(response => response.json())
        .then(result => result.result)
        .then((results: Record<string, BoatResult>) => {
            const temporaryListOfBoats: Boat[] = [];
            for (const boatName of Object.keys(results)) {

                const result = results[boatName];
                const { key, track, heading, foiler, color, colorFoil, colorInside, colorMiddle } = result;

                const layer = new L.Polyline(track, {
                    color,
                    opacity: 0.3,
                    weight: 1,
                }).addTo(map);

                layer.on('mouseover', () => showTrack(layer));
                layer.on('mouseout', () => hideTrack(layer));

                lines.push(layer);
                linesColors.set(layer, color);

                const latestPosition: L.LatLngTuple = track[track.length - 1];
                const marker = new L.Marker(latestPosition, {
                    icon: foiler
                        ? getBoatFoilerIcon(color, colorMiddle, colorInside, colorFoil) 
                        : getBoatIcon(color, colorMiddle, colorInside),
                }).addTo(map);

                const boat: Boat = { ...result, color, layer, marker };

                marker._icon.setAttribute('data-heading', String(heading));
                marker._icon.style.transform = `${marker._icon.style.transform} rotateZ(${
                    heading || 0
                }deg)`;
                marker.on('click', () => {
                    highlightTrack(boat);
                });
                marker.on('mouseover', () => {
                    marker._icon.style.zIndex = '1';
                    showTrack(layer);
                });
                marker.on('mouseout', () => {
                    marker._icon.style.zIndex = '0',
                    hideTrack(layer);
                });

                markers.push(marker);

                boats.set(key, boat);
                temporaryListOfBoats.push(boat);

                updateIconStyles();
            }

            // Sort temporary list of boats by rank
            listOfBoats = temporaryListOfBoats.sort((a, b) => a.rank - b.rank).filter(b => !b.abort);

            // Keep aborts in separate list
            listOfAborts = temporaryListOfBoats.filter(b => b.abort);

            // Get last ranking
            if(listOfBoats.length > 0) {
                const firstBoat = listOfBoats[0];
                const lastRankingDate = new Date(firstBoat.timestamp);
                lastRanking = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: lang === "fr" ? "h23": "h12",
                }).format(lastRankingDate).replace(" ", ` ${translations[lang].at} `);
            }
        
        })
        .catch(console.error);
};

const removeAllMapFeatures = () => {
    openedPopup?.remove();
    markers.forEach(l => map.removeLayer(l));
    lines.forEach(l => map.removeLayer(l));
    markers = [];
    lines = [];
};

export const onopen = () => {
    loadResults();
    map.setView([14, -29], 4);
};

onMount(() => {
    map.on('zoom', updateIconStyles);
    map.on('zoomend', updateIconStyles);
    map.on('viewreset', updateIconStyles);
});

onDestroy(() => {
    removeAllMapFeatures();

    map.off('zoom', updateIconStyles);
    map.off('zoomend', updateIconStyles);
    map.off('viewreset', updateIconStyles);
});
</script>

<style lang="less">
.plugin__content {
    padding-top: 5px;
}

.boat {
    display: flex;
    justify-content: flex-start;
    cursor: pointer;
    background-color: #FFFFFF;
    color: #1A1349;
    padding: 5px;
    margin: 5px 0;
    border-radius: 5px;
}
.boat:hover {
    background-color: #E30613;
    color: #FFFFFF;
}

.boat-rank {
    font-size: 18px;
    font-weight: 700;
    line-height: 20px;
}

.boat-rank-progress {
    font-size: 16px;
    line-height: 20px;
}
.boat-rank-progress.eq::after {
    color: #BDCDE3;
    content: '►';
}
.boat-rank-progress.up::after {
    color: #269230;
    content: '▲';
}
.boat-rank-progress.down::after {
    color: #E30613;
    content: '▼';
}

.boat-skipper-photo {
  display: block;
  max-width: 58px;
  max-height: 58px;
  width: auto;
  height: auto;
}

.boat-content {
    margin-left: 10px;
}

.boat-skipper-country {
    float: left;
    width: 10px;
    margin-right: 5px;
}

.boat-skipper-name {
    display: flex;
    align-items: center;
    text-transform: uppercase;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 700;
    line-height: 20px;
}

.boat-foiler-icon {
    width: 15px;
    margin-left: 5px;
}

.boat-name {
    text-transform: uppercase;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
}

.boat-data {
    font-size: 10px;
    font-weight: normal;
    line-height: 16px;
}

.plugin__content-mobile {
    overflow-x: scroll;
    display: flex;
    flex-direction: row;
}

.plugin__content-mobile .boat {
    margin-right: 10px;
}
</style>
