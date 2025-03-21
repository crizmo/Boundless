import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { DEFAULT_POSITION } from '@/config/mapConfig';

// Custom player icon
const playerIcon = new L.Icon({
  iconUrl: '/images/marker-icon.png', // Replace with your player icon path
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const MapComponent = () => {
  const [playerPosition, setPlayerPosition] = useState(DEFAULT_POSITION);
  const [username, setUsername] = useState('');
  const [players, setPlayers] = useState({});
  const [isMoving, setIsMoving] = useState(false);
  const socketRef = useRef(null);
  const mousePosition = useRef(null);
  const animationFrameRef = useRef(null);

  // Handle username submission
  const [usernameInput, setUsernameInput] = useState('');
  const [showUsernameForm, setShowUsernameForm] = useState(true);

  const handleUsernameSubmit = () => {
    if (usernameInput.trim()) {
      setUsername(usernameInput.trim());
      setShowUsernameForm(false);
    }
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    if (username) {
      socketRef.current = io('http://localhost:3000');

      socketRef.current.emit('join', { username, position: DEFAULT_POSITION });

      socketRef.current.on('updatePlayers', (updatedPlayers) => {
        setPlayers(updatedPlayers);
      });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [username]);

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (event) => {
      mousePosition.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Smooth movement logic
  useEffect(() => {
    const step = 0.00001;
    const movePlayer = () => {
      if (isMoving && mousePosition.current) {
        setPlayerPosition((prevPosition) => {
          const [lat, lng] = prevPosition;
          const map = document.querySelector('.leaflet-container');
          const rect = map.getBoundingClientRect();
          const mapCenterX = rect.width / 2;
          const mapCenterY = rect.height / 2;
          const dx = mousePosition.current.x - mapCenterX;
          const dy = mapCenterY - mousePosition.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance === 0) return prevPosition;
          const normalizedDx = dx / distance;
          const normalizedDy = dy / distance;
          const newLat = lat + normalizedDy * step;
          const newLng = lng + normalizedDx * step;
          socketRef.current.emit('move', [newLat, newLng]);
          return [newLat, newLng];
        });
      }
      animationFrameRef.current = requestAnimationFrame(movePlayer);
    };
    animationFrameRef.current = requestAnimationFrame(movePlayer);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isMoving]);

  // Hotkey for Pause/Resume
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key.toLowerCase() === 'p') {
        setIsMoving((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Center the map on the player's position
  const MapUpdater = () => {
    const map = useMap();
    useEffect(() => {
      map.setView(playerPosition, map.getZoom());
    }, [playerPosition, map]);
    return null;
  };

  return (
    <section id="map-container">
      {showUsernameForm ? (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
          }}
        >
          <h2>Enter your username:</h2>
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            style={{
              padding: '10px', fontSize: '16px', width: '200px',
              border: '1px solid #ccc', borderRadius: '5px'

            }}
          />
          <button
            onClick={handleUsernameSubmit}
            style={{
              marginLeft: '10px',
              padding: '10px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Join
          </button>
        </div>
      ) : (
        <>
          <MapContainer
            center={DEFAULT_POSITION}
            zoom={18}
            style={{ height: '100vh', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            {Object.entries(players).map(([id, player]) => (
              <Marker key={id} position={player.position} icon={playerIcon}>
                <Popup>{player.username}</Popup>
              </Marker>
            ))}
            <MapUpdater />
          </MapContainer>

          <div
            style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.9)',
              borderTop: '1px solid black',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '10px',
              zIndex: 1000,
            }}
          >
            <button
              onClick={() => setIsMoving((prev) => !prev)}
              style={{
                padding: '10px 20px',
                background: 'white',
                border: '1px solid black',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              {isMoving ? 'Pause' : 'Resume'}
            </button>
            <p style={{ marginLeft: '20px' }}>Press "P" to Pause/Resume</p>
          </div>
        </>
      )}
    </section>
  );
};

export default MapComponent;
