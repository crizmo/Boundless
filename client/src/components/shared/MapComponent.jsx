import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, Polyline, useMapEvents, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { DEFAULT_POSITION, MAP_BOUNDS } from '@/config/mapConfig';

// Fix icon path issues by using absolute URLs
const playerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Spawn selector icon
const spawnIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapComponent = () => {
  const [playerPosition, setPlayerPosition] = useState(DEFAULT_POSITION);
  const [username, setUsername] = useState('');
  const [players, setPlayers] = useState({});
  const [isMoving, setIsMoving] = useState(false);
  const [gameNotification, setGameNotification] = useState(null);
  const socketRef = useRef(null);
  const mousePosition = useRef(null);
  const animationFrameRef = useRef(null);
  const playerIdRef = useRef(null);
  const [hasSpawned, setHasSpawned] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const tempSocketRef = useRef(null);

  // Spawn location selection state
  const [selectedSpawn, setSelectedSpawn] = useState(DEFAULT_POSITION);
  const [showSpawnSelector, setShowSpawnSelector] = useState(true);

  // Handle username submission
  const [usernameInput, setUsernameInput] = useState('');
  const [showUsernameForm, setShowUsernameForm] = useState(true);

  const [showRejoinPrompt, setShowRejoinPrompt] = useState(false);

  // Connect socket ONE TIME to get player data for spawn screen
  useEffect(() => {
    // Only create the socket if we don't already have one
    if (!tempSocketRef.current) {
      const tempSocket = io('http://localhost:3000', { autoConnect: true });

      tempSocket.on('updatePlayers', (updatedPlayers) => {
        setPlayers(updatedPlayers);
      });

      tempSocket.emit('getPlayers'); // Request current players data

      tempSocketRef.current = tempSocket;

      // Clean up on unmount
      return () => {
        if (tempSocketRef.current) {
          tempSocketRef.current.disconnect();
          tempSocketRef.current = null;
        }
      };
    }
  }, []); // Empty dependency array - only run once

  const SpawnLocationPicker = () => {
    const map = useMap();
    const selectedPositionRef = useRef(null);

    // Set initial zoom level for better view ONLY ONCE on initial render
    useEffect(() => {
      // Only set the initial view once when the component mounts
      map.setZoom(16);

      // Only set default position if no selection has been made yet
      if (!selectedPositionRef.current) {
        map.setView(DEFAULT_POSITION);
      } else {
        map.setView(selectedPositionRef.current);
      }
    }, []);

    // Keep map focused on selected spawn whenever the map re-renders
    useEffect(() => {
      if (selectedSpawn && selectedSpawn !== DEFAULT_POSITION) {
        map.setView(selectedSpawn);
        selectedPositionRef.current = selectedSpawn;
      }
    }, [selectedSpawn, map]);

    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        setSelectedSpawn([lat, lng]);
        selectedPositionRef.current = [lat, lng];

        // Update map view to focus on the selected spawn point
        map.setView([lat, lng]);

        // Check if this location is inside any player's territory
        let isInsideTerritory = false;
        for (const [id, player] of Object.entries(players)) {
          if (player.territory && isPointInPolygon([lat, lng], player.territory)) {
            isInsideTerritory = true;
            break;
          }
        }

        if (isInsideTerritory) {
          setGameNotification("Warning: This location is inside another player's territory!");
        } else {
          setGameNotification(null);
        }
      },
    });

    return selectedSpawn ? (
      <Marker position={selectedSpawn} icon={spawnIcon}>
        <Popup>Your spawn location</Popup>
      </Marker>
    ) : null;
  };

  const handleUsernameSubmit = () => {
    if (usernameInput.trim()) {
      setUsername(usernameInput.trim());
      setShowUsernameForm(false);

      // Disconnect temporary socket if it exists
      if (tempSocketRef.current) {
        tempSocketRef.current.disconnect();
        tempSocketRef.current = null;
      }

      // Connect to socket and send username + selected spawn
      socketRef.current = io('http://localhost:3000');
      socketRef.current.emit('join', { username: usernameInput.trim(), requestedPosition: selectedSpawn });

      // Listen for the server to assign a spawn position
      socketRef.current.on('spawnPosition', (position) => {
        setPlayerPosition(position);
        setHasSpawned(true);
      });

      setupSocketListeners();
    }
  };

  // Helper function to check if a point is in a polygon
  function isPointInPolygon(point, polygon) {
    if (!polygon || polygon.length < 3) return false;

    // Simple ray-casting algorithm
    let inside = false;
    const [x, y] = point;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  }

  const handleDefaultLocation = () => {
    setSelectedSpawn(DEFAULT_POSITION);
    setGameNotification(null);
  };

  // Add this rejoin handler function
  const handleRejoin = () => {
    // Reset game state
    setShowRejoinPrompt(false);
    setHasSpawned(false);
    setShowUsernameForm(true);
    setGameNotification(null);

    // Disconnect current socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Reset player ID
    playerIdRef.current = null;
  };

  // Setup all socket event listeners
  const setupSocketListeners = () => {
    socketRef.current.on('updatePlayers', (updatedPlayers) => {
      setPlayers(updatedPlayers);
      // Store your own player ID for easy reference
      if (!playerIdRef.current) {
        for (const [id, player] of Object.entries(updatedPlayers)) {
          if (player.username === username) {
            playerIdRef.current = id;
            break;
          }
        }
      }
    });

    // Handle territory capture events
    socketRef.current.on('territoryCaptured', ({ capturedFrom, username }) => {
      setGameNotification(`You captured territory from ${username}!`);
      setTimeout(() => setGameNotification(null), 3000);
    });

    socketRef.current.on('territoryLost', ({ capturedBy, username }) => {
      setGameNotification(`${username} captured some of your territory!`);
      setTimeout(() => setGameNotification(null), 3000);
    });

    socketRef.current.on('trailCrossed', ({ crossedWith, username }) => {
      setGameNotification(`Your trail crossed with ${username}'s trail! You lost.`);
      setTimeout(() => setGameNotification(null), 3000);
    });

    socketRef.current.on('invalidSpawnLocation', () => {
      setGameNotification(`Invalid spawn location! The server selected a safe location for you.`);
      setTimeout(() => setGameNotification(null), 3000);
    });

    // Add these handlers to the setupSocketListeners function
    socketRef.current.on('playerDied', ({ killedBy, username }) => {
      setGameNotification(`You were captured by ${username}! Game over.`);
      setShowRejoinPrompt(true);
      setIsMoving(false); // Stop player movement
    });

    socketRef.current.on('playerKilled', ({ killed, username }) => {
      setGameNotification(`You captured and eliminated ${username}!`);
      setTimeout(() => setGameNotification(null), 3000);
    });
  };

  // Calculate and update leaderboard
  useEffect(() => {
    if (Object.keys(players).length > 0) {
      const playerScores = Object.entries(players).map(([id, player]) => ({
        id,
        username: player.username,
        score: player.score || 0,
        color: player.color
      }));

      // Sort by score in descending order
      playerScores.sort((a, b) => b.score - a.score);
      setLeaderboard(playerScores.slice(0, 5)); // Top 5 players
    }
  }, [players]);

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
      if (isMoving && mousePosition.current && hasSpawned && socketRef.current) {
        setPlayerPosition((prevPosition) => {
          const [lat, lng] = prevPosition;
          const map = document.querySelector('.leaflet-container');
          if (!map) return prevPosition;

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
  }, [isMoving, hasSpawned]);

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
            width: '80%',
            maxWidth: '800px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2>Enter your username:</h2>
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            style={{
              padding: '10px',
              fontSize: '16px',
              width: '200px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              marginBottom: '15px'
            }}
          />

          <h3>Select your spawn location:</h3>
          <div style={{ height: '500px', marginBottom: '15px', position: 'relative', zIndex: 1 }}>
            <MapContainer
              center={DEFAULT_POSITION}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Google Satellite">
                  <TileLayer
                    attribution='© Google'
                    url='https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="OpenStreetMap">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                  />
                </LayersControl.BaseLayer>
              </LayersControl>
              <SpawnLocationPicker />

              {/* Show existing players territories */}
              {Object.entries(players).map(([id, player]) => (
                player.territory && (
                  <Polygon
                    key={`territory-${id}`}
                    positions={player.territory}
                    pathOptions={{
                      color: player.color || '#3388ff',
                      fillColor: player.color || '#3388ff',
                      fillOpacity: 0.3,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <strong>{player.username}'s territory</strong>
                      <br />
                      Score: {player.score || 0}
                    </Popup>
                  </Polygon>
                )
              ))}

              {/* Show existing players markers */}
              {Object.entries(players).map(([id, player]) => (
                <Marker
                  key={`spawn-marker-${id}`}
                  position={player.position}
                  icon={playerIcon}
                >
                  <Popup>
                    <strong>{player.username}</strong>
                    <br />
                    Score: {player.score || 0}
                  </Popup>
                </Marker>
              ))}

              {/* Show existing player trails */}
              {Object.entries(players).map(([id, player]) => (
                player.trail && player.trail.length > 1 && (
                  <Polyline
                    key={`spawn-trail-${id}`}
                    positions={player.trail}
                    pathOptions={{
                      color: player.color || '#3388ff',
                      weight: 3,
                      dashArray: '5, 10',
                      lineCap: 'round'
                    }}
                  />
                )
              ))}
            </MapContainer>
          </div>

          {gameNotification && (
            <div style={{
              background: 'rgba(255, 165, 0, 0.2)',
              border: '1px solid orange',
              color: 'darkorange',
              padding: '10px',
              marginBottom: '10px',
              borderRadius: '5px',
              textAlign: 'center'
            }}>
              {gameNotification}
            </div>
          )}

          <div style={{ textAlign: 'center', zIndex: 2, position: 'relative' }}>
            <p>Click on the map to choose your spawn location</p>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px' }}>
              <button
                onClick={handleDefaultLocation}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  marginRight: '10px'
                }}
              >
                Default Location
              </button>
              <button
                onClick={handleUsernameSubmit}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px'
                }}
                disabled={!usernameInput.trim()}
              >
                Join Game
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Game notification overlay */}
          {gameNotification && (
            <div style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              zIndex: 1000,
              fontSize: '18px'
            }}>
              {gameNotification}
            </div>
          )}

          {showRejoinPrompt && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.3)',
              zIndex: 1001,
              textAlign: 'center',
              width: '300px'
            }}>
              <h2>You were eliminated!</h2>
              <p>Your marker was captured by another player.</p>
              <button
                onClick={handleRejoin}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  marginTop: '10px'
                }}
              >
                Rejoin Game
              </button>
            </div>
          )}

          {/* Leaderboard */}
          <div style={{
            position: 'absolute',
            top: '70px', // Increased from 10px to make room for layer controls
            right: '10px',
            background: 'rgba(255, 255, 255, 0.8)',
            padding: '10px',
            borderRadius: '5px',
            zIndex: 1000,
            minWidth: '200px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Leaderboard</h3>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              {leaderboard.map(player => (
                <li key={player.id} style={{
                  marginBottom: '5px',
                  color: player.id === playerIdRef.current ? 'blue' : 'black'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: player.color,
                    marginRight: '5px'
                  }}></span>
                  {player.username}: {player.score}
                </li>
              ))}
            </ol>
          </div>


          <MapContainer
            center={playerPosition}
            zoom={18}
            style={{ height: '100vh', width: '100%' }}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Google Satellite">
                <TileLayer
                  attribution='© Google'
                  url='https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="OpenStreetMap">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {/* Render player territories */}
            {Object.entries(players).map(([id, player]) => (
              player.territory && (
                <Polygon
                  key={`territory-${id}`}
                  positions={player.territory}
                  pathOptions={{
                    color: player.color || '#3388ff',
                    fillColor: player.color || '#3388ff',
                    fillOpacity: 0.3,
                    weight: 2
                  }}
                />
              )
            ))}

            {/* Render player trails */}
            {Object.entries(players).map(([id, player]) => (
              player.trail && player.trail.length > 1 && (
                <Polyline
                  key={`trail-${id}`}
                  positions={player.trail}
                  pathOptions={{
                    color: player.color || '#3388ff',
                    weight: 3,
                    dashArray: '5, 10',
                    lineCap: 'round'
                  }}
                />
              )
            ))}

            {/* Render player markers */}
            {Object.entries(players).map(([id, player]) => (
              <Marker
                key={`marker-${id}`}
                position={player.position}
                icon={playerIcon}
              >
                <Popup>
                  <strong>{player.username}</strong>
                  <br />
                  {player.isInsideTerritory ? 'Inside territory' : 'Outside territory'}
                  <br />
                  Score: {player.score || 0}
                </Popup>
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
            {playerIdRef.current && players[playerIdRef.current] && (
              <>
                <p style={{ marginLeft: '20px' }}>
                  Status: {players[playerIdRef.current].isInsideTerritory ? 'In Territory' : 'Creating Trail'}
                </p>
                <p style={{ marginLeft: '20px' }}>
                  Score: {players[playerIdRef.current].score || 0}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default MapComponent;