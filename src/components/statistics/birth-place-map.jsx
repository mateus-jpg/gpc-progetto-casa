"use client";

import * as React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import Map, {
  FullscreenControl,
  Layer,
  NavigationControl,
  Source,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { IconMapPin, IconWorld } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import countriesData from "@/data/countries.json";

// Build a lookup map from Italian country names to alpha2 codes
const countryNameToAlpha2 = {};
countriesData.forEach((country) => {
  countryNameToAlpha2[country.name.toLowerCase()] =
    country.alpha2.toUpperCase();
});

// Country coordinates (latitude, longitude) for heatmap points
// These are approximate capital/center coordinates
const COUNTRY_COORDINATES = {
  AF: [33.93, 67.71], // Afghanistan
  AL: [41.15, 20.17], // Albania
  DZ: [36.75, 3.06], // Algeria
  AO: [-8.84, 13.23], // Angola
  AR: [-34.61, -58.38], // Argentina
  AM: [40.18, 44.51], // Armenia
  AU: [-35.28, 149.13], // Australia
  AT: [48.21, 16.37], // Austria
  AZ: [40.41, 49.87], // Azerbaijan
  BD: [23.81, 90.41], // Bangladesh
  BY: [53.9, 27.57], // Belarus
  BE: [50.85, 4.35], // Belgium
  BJ: [6.37, 2.43], // Benin
  BA: [43.86, 18.41], // Bosnia
  BR: [-15.79, -47.88], // Brazil
  BG: [42.7, 23.32], // Bulgaria
  BF: [12.37, -1.52], // Burkina Faso
  BI: [-3.43, 29.93], // Burundi
  CM: [3.87, 11.52], // Cameroon
  CA: [45.42, -75.7], // Canada
  CF: [4.39, 18.56], // Central African Republic
  TD: [12.13, 15.05], // Chad
  CL: [-33.45, -70.67], // Chile
  CN: [39.9, 116.41], // China
  CO: [4.71, -74.07], // Colombia
  CG: [-4.27, 15.28], // Congo
  CD: [-4.44, 15.27], // DR Congo
  CR: [9.93, -84.09], // Costa Rica
  CI: [5.32, -4.03], // Ivory Coast
  HR: [45.81, 15.98], // Croatia
  CU: [23.11, -82.37], // Cuba
  CZ: [50.09, 14.42], // Czech Republic
  DK: [55.68, 12.57], // Denmark
  DJ: [11.59, 43.15], // Djibouti
  DO: [18.49, -69.93], // Dominican Republic
  EC: [-0.18, -78.47], // Ecuador
  EG: [30.04, 31.24], // Egypt
  SV: [13.69, -89.19], // El Salvador
  GQ: [3.75, 8.78], // Equatorial Guinea
  ER: [15.33, 38.93], // Eritrea
  EE: [59.44, 24.75], // Estonia
  ET: [9.02, 38.75], // Ethiopia
  FI: [60.17, 24.94], // Finland
  FR: [48.86, 2.35], // France
  GA: [0.39, 9.45], // Gabon
  GM: [13.45, -16.58], // Gambia
  GE: [41.72, 44.79], // Georgia
  DE: [52.52, 13.41], // Germany
  GH: [5.55, -0.2], // Ghana
  GR: [37.98, 23.73], // Greece
  GT: [14.64, -90.51], // Guatemala
  GN: [9.64, -13.58], // Guinea
  GW: [11.87, -15.6], // Guinea-Bissau
  HT: [18.54, -72.34], // Haiti
  HN: [14.08, -87.21], // Honduras
  HU: [47.5, 19.04], // Hungary
  IN: [28.61, 77.21], // India
  ID: [-6.21, 106.85], // Indonesia
  IR: [35.69, 51.39], // Iran
  IQ: [33.31, 44.37], // Iraq
  IE: [53.33, -6.26], // Ireland
  IL: [31.77, 35.22], // Israel
  IT: [41.9, 12.5], // Italy
  JM: [18.0, -76.79], // Jamaica
  JP: [35.68, 139.69], // Japan
  JO: [31.95, 35.93], // Jordan
  KZ: [51.17, 71.47], // Kazakhstan
  KE: [-1.29, 36.82], // Kenya
  KW: [29.38, 47.99], // Kuwait
  KG: [42.87, 74.59], // Kyrgyzstan
  LA: [17.97, 102.61], // Laos
  LV: [56.95, 24.11], // Latvia
  LB: [33.89, 35.5], // Lebanon
  LR: [6.3, -10.8], // Liberia
  LY: [32.9, 13.19], // Libya
  LT: [54.69, 25.28], // Lithuania
  MK: [42.0, 21.43], // North Macedonia
  MG: [-18.88, 47.51], // Madagascar
  MW: [-13.97, 33.79], // Malawi
  MY: [3.14, 101.69], // Malaysia
  ML: [12.64, -8.0], // Mali
  MR: [18.09, -15.98], // Mauritania
  MX: [19.43, -99.13], // Mexico
  MD: [47.01, 28.86], // Moldova
  MN: [47.89, 106.91], // Mongolia
  ME: [42.44, 19.26], // Montenegro
  MA: [34.02, -6.83], // Morocco
  MZ: [-25.97, 32.58], // Mozambique
  MM: [19.75, 96.1], // Myanmar
  NA: [-22.56, 17.08], // Namibia
  NP: [27.72, 85.32], // Nepal
  NL: [52.37, 4.9], // Netherlands
  NZ: [-41.29, 174.78], // New Zealand
  NI: [12.13, -86.25], // Nicaragua
  NE: [13.51, 2.11], // Niger
  NG: [9.08, 7.4], // Nigeria
  NO: [59.91, 10.75], // Norway
  PK: [33.69, 73.06], // Pakistan
  PA: [9.0, -79.52], // Panama
  PY: [-25.3, -57.64], // Paraguay
  PE: [-12.05, -77.04], // Peru
  PH: [14.6, 120.98], // Philippines
  PL: [52.23, 21.01], // Poland
  PT: [38.72, -9.14], // Portugal
  QA: [25.29, 51.53], // Qatar
  RO: [44.43, 26.1], // Romania
  RU: [55.76, 37.62], // Russia
  RW: [-1.94, 30.06], // Rwanda
  SA: [24.69, 46.72], // Saudi Arabia
  SN: [14.69, -17.44], // Senegal
  RS: [44.79, 20.47], // Serbia
  SL: [8.48, -13.23], // Sierra Leone
  SG: [1.29, 103.85], // Singapore
  SK: [48.15, 17.11], // Slovakia
  SI: [46.05, 14.51], // Slovenia
  SO: [2.04, 45.34], // Somalia
  ZA: [-25.75, 28.19], // South Africa
  SS: [4.86, 31.57], // South Sudan
  ES: [40.42, -3.7], // Spain
  LK: [6.93, 79.85], // Sri Lanka
  SD: [15.6, 32.53], // Sudan
  SE: [59.33, 18.07], // Sweden
  CH: [46.95, 7.45], // Switzerland
  SY: [33.51, 36.29], // Syria
  TW: [25.03, 121.57], // Taiwan
  TJ: [38.56, 68.77], // Tajikistan
  TZ: [-6.17, 35.74], // Tanzania
  TH: [13.76, 100.5], // Thailand
  TG: [6.14, 1.21], // Togo
  TN: [36.81, 10.17], // Tunisia
  TR: [39.93, 32.85], // Turkey
  TM: [37.95, 58.38], // Turkmenistan
  UG: [0.31, 32.58], // Uganda
  UA: [50.45, 30.52], // Ukraine
  AE: [24.47, 54.37], // UAE
  GB: [51.51, -0.13], // United Kingdom
  US: [38.9, -77.04], // United States
  UY: [-34.9, -56.19], // Uruguay
  UZ: [41.3, 69.28], // Uzbekistan
  VE: [10.49, -66.88], // Venezuela
  VN: [21.03, 105.85], // Vietnam
  YE: [15.35, 44.21], // Yemen
  ZM: [-15.42, 28.29], // Zambia
  ZW: [-17.83, 31.05], // Zimbabwe
  // Kosovo (not in ISO but commonly used)
  XK: [42.66, 21.17], // Kosovo
};

// Alternative Italian name mappings for countries that might be stored differently
const ITALIAN_NAME_ALTERNATIVES = {
  "costa d'avorio": "CI",
  "costa davorio": "CI",
  "rep. del congo": "CG",
  "repubblica del congo": "CG",
  "rd del congo": "CD",
  rdc: "CD",
  "repubblica democratica del congo": "CD",
  "rep. centrafricana": "CF",
  "repubblica centrafricana": "CF",
  "rep. ceca": "CZ",
  "repubblica ceca": "CZ",
  "rep. dominicana": "DO",
  "repubblica dominicana": "DO",
  birmania: "MM",
  kosovo: "XK",
  palestina: "PS",
  "macedonia del nord": "MK",
  eswatini: "SZ",
};

// Get country code from Italian name
function getCountryCode(italianName) {
  if (!italianName) return null;
  const lowerName = italianName.toLowerCase().trim();

  // Check alternatives first
  if (ITALIAN_NAME_ALTERNATIVES[lowerName]) {
    return ITALIAN_NAME_ALTERNATIVES[lowerName];
  }

  // Check main mapping
  if (countryNameToAlpha2[lowerName]) {
    return countryNameToAlpha2[lowerName];
  }

  return null;
}

// Heatmap layer configuration
const heatmapLayer = {
  id: "heatmap-layer",
  type: "heatmap",
  paint: {
    // Increase weight based on the magnitude property
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "magnitude"],
      0,
      0,
      1,
      1,
    ],
    // Increase intensity as zoom level increases
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
    // Color gradient from blue to red
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(33, 102, 172, 0)",
      0.2,
      "rgb(103, 169, 207)",
      0.4,
      "rgb(209, 229, 240)",
      0.6,
      "rgb(253, 219, 199)",
      0.8,
      "rgb(239, 138, 98)",
      1,
      "rgb(178, 24, 43)",
    ],
    // Adjust radius based on zoom
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 9, 40],
    // Opacity
    "heatmap-opacity": 0.8,
  },
};

// Circle layer for individual points (visible at higher zoom)
const circleLayer = {
  id: "circle-layer",
  type: "circle",
  minzoom: 5,
  paint: {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "magnitude"],
      0,
      4,
      1,
      20,
    ],
    "circle-color": [
      "interpolate",
      ["linear"],
      ["get", "magnitude"],
      0,
      "#3b82f6",
      0.5,
      "#8b5cf6",
      1,
      "#ec4899",
    ],
    "circle-stroke-color": "white",
    "circle-stroke-width": 1,
    "circle-opacity": 0.8,
  },
};

export function BirthPlaceMap({ stats, isLoading }) {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState({
    longitude: 15,
    latitude: 20,
    zoom: 1.5,
  });

  // Transform birth place data into GeoJSON for the heatmap
  const geojsonData = useMemo(() => {
    if (!stats?.byBirthPlace) {
      return { type: "FeatureCollection", features: [] };
    }

    const entries = Object.entries(stats.byBirthPlace);
    const maxValue = Math.max(...entries.map(([, v]) => v), 1);

    const features = entries
      .map(([name, value]) => {
        const countryCode = getCountryCode(name);
        if (!countryCode || !COUNTRY_COORDINATES[countryCode]) {
          return null;
        }

        const [lat, lng] = COUNTRY_COORDINATES[countryCode];
        return {
          type: "Feature",
          properties: {
            name,
            value,
            magnitude: value / maxValue,
            countryCode,
          },
          geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
        };
      })
      .filter(Boolean);

    return {
      type: "FeatureCollection",
      features,
    };
  }, [stats?.byBirthPlace]);

  // Sorted list for sidebar
  const birthPlaceList = useMemo(() => {
    if (!stats?.byBirthPlace) return [];
    return Object.entries(stats.byBirthPlace)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stats?.byBirthPlace]);

  const maxValue = useMemo(() => {
    if (!birthPlaceList.length) return 1;
    return Math.max(...birthPlaceList.map((d) => d.value));
  }, [birthPlaceList]);

  const totalCountries = Object.keys(stats?.byBirthPlace || {}).length;
  const totalPeople = stats?.totalPersons || 0;

  const onMapClick = useCallback((event) => {
    const feature = event.features?.[0];
    if (feature) {
      console.log("Clicked:", feature.properties);
    }
  }, []);

  if (isLoading) {
    return (
      <Card className="@container/card col-span-full">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full aspect-[2/1] rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!birthPlaceList.length) {
    return (
      <Card className="@container/card col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconWorld className="size-5" />
            Mappa Provenienza
          </CardTitle>
          <CardDescription>Nessun dato disponibile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full aspect-[2/1] rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
            I dati sulla provenienza appariranno qui
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card col-span-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconWorld className="size-5 text-primary" />
              Mappa Provenienza Community
            </CardTitle>
            <CardDescription>
              Distribuzione geografica delle{" "}
              {totalPeople.toLocaleString("it-IT")} persone registrate
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono">
            {totalCountries} paesi
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 @3xl/card:grid-cols-[1fr_280px]">
          {/* Map */}
          <div className="min-h-[300px] @3xl/card:min-h-[400px] relative">
            <Map
              ref={mapRef}
              {...viewState}
              onMove={(evt) => setViewState(evt.viewState)}
              onClick={onMapClick}
              interactiveLayerIds={["circle-layer"]}
              style={{ width: "100%", height: "100%" }}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            >
              <NavigationControl position="top-left" />
              <FullscreenControl position="top-left" />

              <Source id="birthplace-data" type="geojson" data={geojsonData}>
                <Layer {...heatmapLayer} />
                <Layer {...circleLayer} />
              </Source>
            </Map>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border text-xs">
              <p className="font-medium mb-2">Concentrazione</p>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Bassa</span>
                <div className="flex h-2 flex-1 rounded overflow-hidden">
                  <div className="w-1/5 bg-[rgb(103,169,207)]" />
                  <div className="w-1/5 bg-[rgb(209,229,240)]" />
                  <div className="w-1/5 bg-[rgb(253,219,199)]" />
                  <div className="w-1/5 bg-[rgb(239,138,98)]" />
                  <div className="w-1/5 bg-[rgb(178,24,43)]" />
                </div>
                <span className="text-muted-foreground">Alta</span>
              </div>
            </div>
          </div>

          {/* Sidebar list */}
          <div className="border-t @3xl/card:border-t-0 @3xl/card:border-l bg-muted/30">
            <div className="p-4 border-b">
              <h4 className="font-medium text-sm">Top Paesi di Provenienza</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Ordinati per numero di persone
              </p>
            </div>
            <ScrollArea className="h-[280px] @3xl/card:h-[340px]">
              <div className="p-2">
                {birthPlaceList.slice(0, 20).map((item, index) => {
                  const percentage =
                    totalPeople > 0
                      ? Math.round((item.value / totalPeople) * 100)
                      : 0;
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`
                        flex items-center justify-center size-6 rounded-full text-xs font-bold
                        ${index === 0 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : ""}
                        ${index === 1 ? "bg-slate-400/20 text-slate-600 dark:text-slate-300" : ""}
                        ${index === 2 ? "bg-amber-700/20 text-amber-700 dark:text-amber-500" : ""}
                        ${index > 2 ? "bg-muted text-muted-foreground" : ""}
                      `}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <IconMapPin className="size-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all duration-500"
                            style={{
                              width: `${(item.value / maxValue) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-sm tabular-nums">
                          {item.value}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
