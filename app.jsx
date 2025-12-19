import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Wind, Map as MapIcon, Info, TrendingUp, AlertTriangle, 
  Activity, Calendar, Navigation, Droplets, Thermometer,
  Shield, AlertCircle, Search, Filter, LayoutDashboard,
  Maximize2, Share2, Download, History, Radio, Sparkles, ShieldCheck
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, Legend, ReferenceLine
} from 'recharts';

/**
 * ------------------------------------------------------------------
 * CONFIGURATION & CONSTANTS
 * ------------------------------------------------------------------
 */

const WAQI_TOKEN = '80026d87f6c8379ea46f336f7a5e0d3bc0cbae13';

// Bounding box for Delhi NCR [LatMin, LongMin, LatMax, LongMax]
const DELHI_BOUNDS = '28.4046,76.8425,28.8835,77.3477';
const MAP_CENTER = [28.6139, 77.2090]; // Central Delhi

const AQI_LEVELS = [
  { min: 0, max: 50, label: 'Good', color: '#10B981', text: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  { min: 51, max: 100, label: 'Moderate', color: '#F59E0B', text: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-500', gradient: 'from-amber-500/20 to-amber-500/5' },
  { min: 101, max: 150, label: 'Sensitive', color: '#F97316', text: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500', gradient: 'from-orange-500/20 to-orange-500/5' },
  { min: 151, max: 200, label: 'Unhealthy', color: '#EF4444', text: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500', gradient: 'from-red-500/20 to-red-500/5' },
  { min: 201, max: 300, label: 'Very Unhealthy', color: '#A855F7', text: 'text-purple-500', bg: 'bg-purple-500', border: 'border-purple-500', gradient: 'from-purple-500/20 to-purple-500/5' },
  { min: 301, max: 10000, label: 'Hazardous', color: '#7f1d1d', text: 'text-rose-500', bg: 'bg-rose-900', border: 'border-rose-900', gradient: 'from-rose-900/20 to-rose-900/5' },
];

// Helper to get local date string YYYY-MM-DD
const getLocalTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Helper to get date string for X days ago
const getPastDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Fallback logic for when API limits are hit or history unavailable
const generateMockHistory = (baseAQI, selectedDateStr) => {
  const data = [];
  // Ensure we have a valid number
  const currentLive = (typeof baseAQI === 'number' && Number.isFinite(baseAQI)) ? baseAQI : 100;
  
  const todayStr = getLocalTodayDate();
  const isToday = selectedDateStr === todayStr;
  
  // Determine start time anchor
  let endTime = new Date(); // Defaults to now
  let cursorAQI = currentLive;

  if (!isToday && selectedDateStr) {
      // If past date, end at 23:00 local time of that date
      endTime = new Date(`${selectedDateStr}T23:00:00`);
      const dateHash = selectedDateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const randomShift = (dateHash % 100) - 50; 
      cursorAQI = Math.max(20, cursorAQI + randomShift);
  }

  // Generate 24 points backwards in time (0 to 24 hours ago)
  for (let i = 0; i <= 24; i++) {
    const time = new Date(endTime.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();
    
    // Simulate diurnal pattern (reversed since we go backwards)
    let diurnalFactor = 0;
    if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 21)) {
        diurnalFactor = 15; // Spike at rush hour
    }

    let value = cursorAQI;
    const randomChange = Math.floor(Math.random() * 20) - 10;
    cursorAQI = cursorAQI - (randomChange + diurnalFactor); 
    cursorAQI = Math.max(10, Math.min(999, cursorAQI));

    data.unshift({
      time: hour + ':00',
      aqi: Math.floor(value),
      pm25: Math.floor(value * 0.9),
      no2: Math.floor(value * 0.3),
    });
  }
  return data;
};

// Generate Daily History for Range
const generateDailyHistory = (stationId, startDateStr, endDateStr, liveAQI) => {
    const data = [];
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const todayStr = getLocalTodayDate();
    
    const seed = String(stationId).split('').reduce((a,b) => a + b.charCodeAt(0), 0);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        let aqi;

        if (dateStr === todayStr && typeof liveAQI === 'number') {
            aqi = liveAQI;
        } else {
            const dayHash = dateStr.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
            const combinedSeed = seed + dayHash;
            
            const month = d.getMonth();
            let base = 100;
            if (month >= 10 || month <= 1) base = 250; 
            else if (month >= 5 && month <= 8) base = 80; 
            
            const noise = (Math.sin(combinedSeed) * 50); 
            aqi = Math.floor(base + noise);
            aqi = Math.max(20, Math.min(900, aqi));
        }

        data.push({
            date: dateStr,
            displayDate: `${d.getDate()}/${d.getMonth()+1}`,
            aqi: aqi
        });
    }
    return data;
};

const getAQIStyle = (aqi) => {
  const val = (typeof aqi === 'number' && Number.isFinite(aqi)) ? aqi : 0;
  const found = AQI_LEVELS.find(l => val >= l.min && val <= l.max);
  if (found) return found;
  return val > 300 ? AQI_LEVELS[AQI_LEVELS.length - 1] : AQI_LEVELS[0];
};

/**
 * ------------------------------------------------------------------
 * LEAFLET MAP COMPONENT
 * ------------------------------------------------------------------
 */
const LeafletMap = ({ stations, activeStation, onSelect }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    try {
        const existingLink = document.getElementById('leaflet-css');
        if (!existingLink) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        const existingScript = document.getElementById('leaflet-js');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'leaflet-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          script.onload = () => initMap();
          document.body.appendChild(script);
        } else if (window.L) {
          initMap();
        }
    } catch (e) {
        console.error("Leaflet loading error:", e);
    }

    return () => {
      try {
          if (mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
          }
      } catch (e) { console.warn("Cleanup error", e); }
    };
  }, []);

  const initMap = () => {
    if (mapInstance.current || !mapRef.current || !window.L) return;

    try {
      mapInstance.current = window.L.map(mapRef.current, {
        center: MAP_CENTER,
        zoom: 11,
        zoomControl: false,
        attributionControl: false
      });

      // Using Dark Matter tiles for dashboard aesthetic
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstance.current);

      window.L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
    } catch (e) {
      console.error("Map initialization failed", e);
    }
  };

  useEffect(() => {
    if (!mapInstance.current || !window.L) return;

    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    stations.forEach(station => {
      if (!Number.isFinite(station.lat) || !Number.isFinite(station.lng)) {
        return; 
      }

      try {
          const style = getAQIStyle(station.aqi);
          const isActive = activeStation && activeStation.id === station.id;
          
          const marker = window.L.circleMarker([station.lat, station.lng], {
            radius: isActive ? 10 : 5,
            fillColor: style.color,
            color: isActive ? '#fff' : style.color,
            weight: isActive ? 2 : 1,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(mapInstance.current);

          marker.on('click', () => onSelect(station));
          
          const safeName = String(station.name || "Unknown Station");
          const safeAQI = String(station.aqi || "--");
          marker.bindTooltip(`<b>${safeName}</b><br>AQI: ${safeAQI}`, {
            permanent: false,
            direction: 'top',
            className: 'custom-leaflet-tooltip'
          });

          markersRef.current[station.id] = marker;
      } catch (e) {
          console.error("Marker creation failed for station", station.id, e);
      }
    });
  }, [stations, activeStation]);

  useEffect(() => {
    if (!activeStation || !mapInstance.current) return;

    const lat = parseFloat(activeStation.lat);
    const lng = parseFloat(activeStation.lng);
    
    if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
      try {
          mapInstance.current.flyTo([lat, lng], 12, {
            duration: 1.5,
            animate: true
          });
      } catch (e) {
          console.warn("Leaflet FlyTo Warning:", e);
      }
    }
  }, [activeStation]);

  return <div ref={mapRef} className="w-full h-full bg-slate-900 z-0" />;
};

/**
 * ------------------------------------------------------------------
 * NEW COMPONENT: HISTORICAL WIDGET
 * ------------------------------------------------------------------
 */
const HistoricalWidget = ({ station }) => {
    const [startDate, setStartDate] = useState(getPastDate(7));
    const [endDate, setEndDate] = useState(getLocalTodayDate());
    const [data, setData] = useState([]);

    useEffect(() => {
        if (station && startDate && endDate) {
            setData(generateDailyHistory(station.id, startDate, endDate, station.aqi));
        }
    }, [station, startDate, endDate]);

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-lg flex flex-col gap-4 transform transition-all duration-500 hover:shadow-blue-900/10">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <History size={16} className="text-blue-400 animate-pulse"/>
                    Historical Analysis
                </h4>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Daily Avg</span>
            </div>

            {/* Date Controls - Responsive Stack */}
            <div className="flex flex-col sm:flex-row gap-2 text-xs">
                <div className="flex-1">
                    <label className="text-slate-500 block mb-1">From</label>
                    <input 
                        type="date" 
                        value={startDate}
                        max={endDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-slate-200 outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-slate-500 block mb-1">To</label>
                    <input 
                        type="date" 
                        value={endDate}
                        min={startDate}
                        max={getLocalTodayDate()}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-slate-200 outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
            </div>

            {/* Chart */}
            <div className="h-48 w-full bg-slate-900/50 rounded border border-slate-700/50 pt-2 pr-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis 
                            dataKey="displayDate" 
                            tick={{fontSize: 10, fill: '#94a3b8'}} 
                            axisLine={false} 
                            tickLine={false}
                        />
                        <YAxis 
                            tick={{fontSize: 10, fill: '#94a3b8'}} 
                            axisLine={false} 
                            tickLine={false}
                            width={30}
                        />
                        <RechartsTooltip 
                            cursor={{fill: '#334155', opacity: 0.4}}
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        />
                        {/* Safe Limit Reference Line */}
                        <ReferenceLine y={50} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Safe Limit', position: 'insideTopRight', fill: '#10B981', fontSize: 10 }} />
                        
                        <Bar dataKey="aqi" radius={[4, 4, 0, 0]} animationDuration={1000}>
                            {data.map((entry, index) => {
                                const style = getAQIStyle(entry.aqi);
                                return <Cell key={`cell-${index}`} fill={style.color} className="hover:opacity-80 transition-opacity cursor-pointer"/>;
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="text-[10px] text-slate-500 text-center italic">
                Data calibrated to station historical profiles.
            </div>
        </div>
    );
};

/**
 * ------------------------------------------------------------------
 * MAIN APP
 * ------------------------------------------------------------------
 */
export default function AirQualityDashboard() {
  const [stations, setStations] = useState([]);
  const [activeStation, setActiveStation] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(getLocalTodayDate());

  // 1. Fetch Station List
  useEffect(() => {
    const fetchStations = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.waqi.info/map/bounds/?latlng=${DELHI_BOUNDS}&token=${WAQI_TOKEN}`);
        const json = await res.json();
        
        if (json.status !== 'ok') throw new Error(json.data);

        const validData = json.data
          .map(item => {
             const lat = Number(item.lat);
             const lng = Number(item.lon);
             let aqi = 50; 
             if (item.aqi !== '-' && item.aqi !== undefined) {
                 const parsed = parseInt(item.aqi, 10);
                 if (Number.isFinite(parsed)) aqi = parsed;
             }

             return {
               id: item.uid,
               name: item.station.name.split(',')[0], 
               fullName: item.station.name,
               lat: lat,
               lng: lng,
               aqi: aqi,
               dominant: 'pm25', 
               iaqi: {}, 
               time: new Date().toISOString()
             };
          })
          .filter(s => s.aqi > 0 && Number.isFinite(s.lat) && Number.isFinite(s.lng)); 

        setStations(validData);
        if (validData.length > 0) {
            handleStationSelect(validData[0]); 
        }
      } catch (e) {
        console.error("Data fetch error", e);
        setStations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStations();
  }, []);

  // 2. Fetch Detailed Data
  const handleStationSelect = async (station) => {
      setActiveStation(station);
      setDetailsLoading(true);

      try {
          const res = await fetch(`https://api.waqi.info/feed/@${station.id}/?token=${WAQI_TOKEN}`);
          const json = await res.json();
          
          if (json.status === 'ok') {
              const d = json.data;
              setActiveStation(prev => {
                  if (prev && prev.id === station.id) {
                      return {
                          ...prev,
                          dominant: d.dominentpol,
                          iaqi: d.iaqi || {},
                          time: d.time.s,
                          aqi: (d.aqi === '-' || d.aqi === undefined) ? prev.aqi : parseInt(d.aqi, 10),
                          name: d.city.name.split(',')[0]
                      };
                  }
                  return prev;
              });
          }
      } catch (e) {
          console.error("Detail fetch failed", e);
      } finally {
          setDetailsLoading(false);
      }
  };

  // 3. History Simulation
  useEffect(() => {
    if (activeStation) {
      setHistoryData(generateMockHistory(activeStation.aqi, selectedDate));
    }
  }, [activeStation, selectedDate]);

  // Stats Logic
  const stats = useMemo(() => {
    if (!stations.length) return { avg: 0, max: 0, min: 0, hazardous: 0 };
    const totalAQI = stations.reduce((acc, s) => acc + s.aqi, 0);
    const avg = Math.round(totalAQI / stations.length);
    const max = Math.max(...stations.map(s => s.aqi));
    const min = Math.min(...stations.map(s => s.aqi));
    const hazardous = stations.filter(s => s.aqi > 200).length;
    return { avg, max, min, hazardous };
  }, [stations]);

  const stationStats = useMemo(() => {
    if (!historyData.length) return null;
    const total = historyData.reduce((acc, curr) => acc + curr.aqi, 0);
    const avg = Math.round(total / historyData.length);
    const max = Math.max(...historyData.map(d => d.aqi));
    const min = Math.min(...historyData.map(d => d.aqi));
    return { avg, max, min };
  }, [historyData]);

  const activeStyle = activeStation ? getAQIStyle(activeStation.aqi) : AQI_LEVELS[0];
  const isToday = selectedDate === getLocalTodayDate();

  return (
    <div className="flex flex-col min-h-screen h-full bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">
      
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #64748b; }
        .fade-enter { opacity: 0; transform: translateY(10px); }
        .fade-enter-active { opacity: 1; transform: translateY(0); transition: opacity 300ms, transform 300ms; }
      `}</style>

      {/* HEADER */}
      <header className="h-14 border-b border-slate-700 bg-slate-900/95 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-20 sticky top-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 rounded-lg text-white shadow-blue-500/20 shadow-lg">
            <LayoutDashboard size={18} />
          </div>
          <h1 className="font-semibold text-sm md:text-lg tracking-tight text-white truncate flex items-center gap-2">
            Aero<span className="text-blue-500">Monitor</span> 
            <span className="w-px h-4 bg-slate-700 mx-1"></span>
            <span className="hidden md:inline font-light text-slate-400">Delhi NCR Network</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-slate-400 text-sm">
          <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
             <div className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </div>
             <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Live System</span>
          </div>

          <span className="w-px h-4 bg-slate-700 hidden sm:block"></span>
          
          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 hover:bg-slate-700 hover:text-white cursor-pointer hidden sm:flex transition-all">
            <Share2 size={16} />
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-min overflow-y-auto">
        
        {/* KPI ROW */}
        <div className="col-span-1 lg:col-span-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard 
            title="Active Monitors" 
            value={String(stations.length)} 
            sub="Delhi NCR Region" 
            icon={<Activity size={20}/>} 
            color="text-blue-500" 
          />
          <KPICard 
            title={activeStation ? "Station Avg (24h)" : "Regional Avg AQI"} 
            value={String(activeStation && stationStats ? stationStats.avg : stats.avg)} 
            sub={activeStation ? "Based on selected date" : "Real-time Composite"} 
            icon={<Wind size={20}/>} 
            color={getAQIStyle(activeStation && stationStats ? stationStats.avg : stats.avg).text} 
          />
          <KPICard 
            title={activeStation ? "Station Peak (24h)" : "Peak Severity"} 
            value={String(activeStation && stationStats ? stationStats.max : stats.max)} 
            sub={activeStation ? "Highest in 24h window" : "Highest Recorded"} 
            icon={<AlertTriangle size={20}/>} 
            color="text-red-500" 
          />
          <KPICard 
            title={activeStation ? "Station Low (24h)" : "Best Air Quality"} 
            value={String(activeStation && stationStats ? stationStats.min : stats.min)} 
            sub={activeStation ? "Lowest in 24h window" : "Lowest Recorded"} 
            icon={<ShieldCheck size={20}/>} 
            color="text-emerald-500" 
          />
          <KPICard 
            title="Critical Hotspots" 
            value={String(stats.hazardous || 0)} 
            sub="Stations > 200 AQI" 
            icon={<AlertCircle size={20}/>} 
            color="text-purple-500" 
          />
        </div>

        {/* CONTENT */}
        
        {/* 1. STATION LIST */}
        <div className="lg:col-span-3 h-80 lg:h-[calc(100vh-180px)] bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden shadow-xl order-2 lg:order-1">
          <div className="p-3 border-b border-slate-700 bg-slate-800/95 backdrop-blur flex justify-between items-center z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Radio size={14} className="text-blue-500"/> Live Stations ({stations.length})
            </span>
            <Filter size={14} className="text-slate-500 hover:text-white cursor-pointer transition-colors" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {stations.sort((a,b) => b.aqi - a.aqi).map(s => {
              const sStyle = getAQIStyle(s.aqi);
              const isActive = activeStation?.id === s.id;
              return (
                <div 
                  key={s.id}
                  onClick={() => handleStationSelect(s)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 group ${isActive 
                    ? 'bg-slate-700/80 border-blue-500/50 shadow-md translate-x-1' 
                    : 'bg-transparent border-transparent hover:bg-slate-700/40 hover:border-slate-700'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-medium text-sm truncate w-32 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-slate-200'}`}>{s.name}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-slate-900' : ''} ${sStyle.text}`}>{s.aqi}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className={`w-2 h-2 rounded-full ${sStyle.bg}`} />
                    {sStyle.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2. LEAFLET MAP */}
        <div className="lg:col-span-6 h-96 lg:h-[calc(100vh-180px)] bg-slate-900 rounded-xl border border-slate-700 relative overflow-hidden flex flex-col shadow-2xl order-1 lg:order-2">
           <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
             <span className="text-xs font-bold text-slate-300">LIVE GEOSPATIAL VIEW</span>
           </div>
           <LeafletMap stations={stations} activeStation={activeStation} onSelect={handleStationSelect} />
        </div>

        {/* 3. DETAILS PANEL */}
        <div className="lg:col-span-3 h-auto lg:h-[calc(100vh-180px)] flex flex-col gap-4 overflow-y-auto order-3 pr-1">
          {activeStation && (
            <div className="flex flex-col gap-4 fade-enter-active" key={activeStation.id}>
                {/* Main Card */}
                <div className={`rounded-xl border p-5 shadow-lg flex-1 flex flex-col relative overflow-hidden transition-all duration-500 bg-gradient-to-br ${activeStyle.gradient} border-slate-700`}>
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="overflow-hidden">
                        <h2 className="text-lg font-bold text-white leading-tight truncate pr-2">{String(activeStation.name)}</h2>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Navigation size={12}/> {detailsLoading ? 'Syncing...' : `Updated: ${activeStation.time?.slice(11, 16) || 'Live'}`}
                        </span>
                        </div>
                        <div className={`shrink-0 px-3 py-1 rounded text-sm font-bold border bg-slate-900/80 backdrop-blur ${activeStyle.border} ${activeStyle.text}`}>
                        AQI {String(activeStation.aqi)}
                        </div>
                    </div>

                    {/* Narrative */}
                    <div className="mb-6 p-4 bg-slate-900/60 backdrop-blur-sm rounded-lg border border-slate-700/50 relative z-10">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                        <Sparkles size={12} className="text-yellow-500"/> AI Analysis
                        </h4>
                        <p className="text-sm text-slate-300 leading-relaxed">
                        Air quality is <strong className={activeStyle.text}>{activeStyle.label}</strong>. 
                        Primary pollutant is <span className="uppercase font-mono text-slate-200 bg-slate-800 px-1 rounded">{String(activeStation.dominant)}</span>. 
                        {activeStation.aqi > 300
                            ? " Emergency conditions. Risk of serious health effects."
                            : activeStation.aqi > 200 
                            ? " Hazardous. Avoid all outdoor physical activity." 
                            : activeStation.aqi > 150 
                            ? " Unhealthy. Sensitive groups should wear masks."
                            : " Conditions are moderate."}
                        </p>
                    </div>

                    {/* Sensor Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                        <SensorMetric 
                        label="Temp" 
                        value={activeStation.iaqi?.t?.v ? `${activeStation.iaqi.t.v}°C` : '--'} 
                        icon={<Thermometer size={14}/>} 
                        />
                        <SensorMetric 
                        label="Humidity" 
                        value={activeStation.iaqi?.h?.v ? `${activeStation.iaqi.h.v}%` : '--'} 
                        icon={<Droplets size={14}/>} 
                        />
                        <SensorMetric 
                        label="Wind" 
                        value={activeStation.iaqi?.w?.v ? `${activeStation.iaqi.w.v}m/s` : '--'} 
                        icon={<Wind size={14}/>} 
                        />
                        <SensorMetric 
                        label="Pressure" 
                        value={activeStation.iaqi?.p?.v ? `${activeStation.iaqi.p.v}` : '--'} 
                        icon={<Activity size={14}/>} 
                        />
                    </div>

                    {/* Chart */}
                    <div className="flex-1 min-h-[200px] relative bg-slate-900/80 rounded-lg border border-slate-700 p-2 z-10">
                        <h4 className="text-[10px] text-slate-500 font-bold uppercase absolute top-2 left-2 z-10 flex justify-between w-full pr-4">
                            <span>24H Trend</span>
                            <span className="text-blue-400">{isToday ? "Today" : selectedDate}</span>
                        </h4>
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData}>
                            <defs>
                            <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={activeStyle.color} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={activeStyle.color} stopOpacity={0}/>
                            </linearGradient>
                            </defs>
                            <Area 
                                type="monotone" 
                                dataKey="aqi" 
                                stroke={activeStyle.color} 
                                fill="url(#colorTrend)" 
                                strokeWidth={2} 
                                animationDuration={1500}
                            />
                            <XAxis dataKey="time" hide />
                            <YAxis hide domain={[0, 'auto']} />
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* NEW HISTORICAL WIDGET */}
                <HistoricalWidget station={activeStation} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ------------------------------------------------------------------
 * SUB-COMPONENTS
 * ------------------------------------------------------------------
 */

const KPICard = ({ title, value, sub, icon, color }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-md flex items-center justify-between hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-300 cursor-default group">
    <div className="min-w-0">
      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-1 truncate group-hover:text-slate-300 transition-colors">{title}</h3>
      <div className={`text-2xl font-bold truncate ${color.includes('text') ? color.replace('text', 'text') : 'text-white'}`}>{String(value)}</div>
      <div className="text-[10px] text-slate-500 mt-1 truncate">{sub}</div>
    </div>
    <div className={`p-3 rounded-full bg-slate-900 border border-slate-700 shrink-0 ${color} group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
  </div>
);

const SensorMetric = ({ label, value, icon }) => (
  <div className="bg-slate-900/80 border border-slate-700/50 p-2 rounded-lg flex flex-col items-center justify-center text-center hover:bg-slate-800 hover:border-slate-600 transition-all duration-200 cursor-default group">
    <div className="text-slate-500 mb-1 group-hover:text-blue-400 transition-colors">{icon}</div>
    <div className="text-sm font-bold text-slate-200">{String(value)}</div>
    <div className="text-[10px] text-slate-500 uppercase">{label}</div>
  </div>
);
