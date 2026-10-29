import { useEffect, useRef } from 'react';

export default function MapComponent({ 
  latitude, 
  longitude, 
  radius = 100, 
  onChange = null, 
  isEditable = false,
  studentLocation = null 
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const circleRef = useRef(null);
  const centerMarkerRef = useRef(null);
  const studentMarkerRef = useRef(null);

  // SVG Pin Icons for Premium Look
  const centerPinSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-blue-600">
      <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clip-rule="evenodd" />
    </svg>
  `;

  const studentPinSVG = (isInside) => `
    <div class="relative flex items-center justify-center">
      <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full ${isInside ? 'bg-green-400' : 'bg-red-400'} opacity-75"></span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="relative w-8 h-8 ${isInside ? 'text-green-600' : 'text-red-600'}">
        <path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clip-rule="evenodd" />
      </svg>
    </div>
  `;

  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    const latVal = parseFloat(latitude) || 15.1684;
    const lonVal = parseFloat(longitude) || 76.8505;

    if (!mapRef.current) {
      mapRef.current = window.L.map(mapContainerRef.current).setView([latVal, lonVal], 17);

      const satellite = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      });

      const streets = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });

      // Default to satellite to show buildings
      satellite.addTo(mapRef.current);

      window.L.control.layers({
        "Satellite (Buildings Visible)": satellite,
        "Streets": streets
      }, null, { position: 'topright' }).addTo(mapRef.current);

      if (isEditable && onChange) {
        mapRef.current.on('click', (e) => {
          const { lat, lng } = e.latlng;
          onChange(lat.toFixed(6), lng.toFixed(6));
        });
      }
    }

    const centerLatLng = [latVal, lonVal];
    const centerIcon = window.L.divIcon({
      html: centerPinSVG,
      className: 'custom-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    if (!centerMarkerRef.current) {
      centerMarkerRef.current = window.L.marker(centerLatLng, { 
        icon: centerIcon,
        draggable: isEditable 
      }).addTo(mapRef.current);

      if (isEditable && onChange) {
        centerMarkerRef.current.on('dragend', (e) => {
          const marker = e.target;
          const { lat, lng } = marker.getLatLng();
          onChange(lat.toFixed(6), lng.toFixed(6));
        });
      }
    } else {
      centerMarkerRef.current.setLatLng(centerLatLng);
    }

    const circleRadius = parseInt(radius) || 100;
    if (!circleRef.current) {
      circleRef.current = window.L.circle(centerLatLng, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2,
        radius: circleRadius
      }).addTo(mapRef.current);
    } else {
      circleRef.current.setLatLng(centerLatLng);
      circleRef.current.setRadius(circleRadius);
    }

    if (studentLocation && studentLocation.latitude && studentLocation.longitude) {
      const sLat = parseFloat(studentLocation.latitude);
      const sLon = parseFloat(studentLocation.longitude);
      
      const dist = mapRef.current.distance([latVal, lonVal], [sLat, sLon]);
      const isInside = dist <= circleRadius;

      const studentIcon = window.L.divIcon({
        html: studentPinSVG(isInside),
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      if (!studentMarkerRef.current) {
        studentMarkerRef.current = window.L.marker([sLat, sLon], { icon: studentIcon })
          .addTo(mapRef.current)
          .bindPopup(`<b>Your Location</b><br>${isInside ? 'Inside' : 'Outside'} Geofence<br>Distance: ${Math.round(dist)}m`)
          .openPopup();
      } else {
        studentMarkerRef.current.setLatLng([sLat, sLon]);
        studentMarkerRef.current.setIcon(studentIcon);
        studentMarkerRef.current.setPopupContent(`<b>Your Location</b><br>${isInside ? 'Inside' : 'Outside'} Geofence<br>Distance: ${Math.round(dist)}m`);
      }
      
      const group = new window.L.featureGroup([centerMarkerRef.current, studentMarkerRef.current]);
      mapRef.current.fitBounds(group.getBounds().pad(0.2));
    } else {
      if (studentMarkerRef.current) {
        mapRef.current.removeLayer(studentMarkerRef.current);
        studentMarkerRef.current = null;
      }
      mapRef.current.setView(centerLatLng, 17);
    }

  }, [latitude, longitude, radius, isEditable, studentLocation]);

  return (
    <div className="relative w-full h-[350px] rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700 bg-gray-100">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      {isEditable && (
        <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-3 py-1 rounded text-xs font-semibold shadow z-20 pointer-events-none text-gray-700 dark:text-gray-200">
          📍 Drag the blue marker or click map to move geofence
        </div>
      )}
    </div>
  );
}
