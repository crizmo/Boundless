# Boundless 
> **Developers Wanted !** Looking for developers to help improve the territory mapping and capturing logic !

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green.svg)](https://leafletjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-black.svg)](https://socket.io/)
[![Vite](https://img.shields.io/badge/Vite-5.2.0-purple.svg)](https://vitejs.dev/)

**Expand. Dominate. Become Boundless.**

Boundless is an immersive real-time multiplayer game inspired by Paper.io, where you compete against other players to capture and control territory on real-world maps. Expand your domain, outmaneuver opponents, and rise to the top of the leaderboard!

## 🎮 Play Now

Experience Boundless today:
- **Beta Version:** [boundless-beta.vercel.app](https://boundless-beta.vercel.app)

## 📋 Table of Contents

- Features
- How to Play
- Technology Stack
- Installation for Developers
- Project Structure
- Contributing
- Roadmap
- License
- Contact & Support

## 🌟 Features

- **Real-World Map Integration**: Play on actual geographic locations using Leaflet maps
- **Real-time Multiplayer**: Compete with players globally through WebSocket connections
- **Territory Control Mechanics**: Expand your area by creating loops and capture land
- **Dynamic Leaderboard**: Track your rank against other players in real-time
- **Customizable Spawn Points**: Select your starting location strategically
- **Responsive Controls**: Smooth movement and precise territory capture
- **Cross-platform Support**: Play on desktop and mobile devices
- **Visual Territory Marking**: Each player has unique color identification
- **Game Events & Notifications**: Receive alerts when capturing territory or eliminating players

## 🎯 How to Play

1. **Enter Your Username**: Start by creating your identity in the game
2. **Select Spawn Location**: Choose your strategic starting point on the map
3. **Movement**:
   - Use your mouse position to guide movement direction
   - Press 'P' or click the Pause/Resume button to stop/start
   - Stay inside your territory to remain safe
4. **Territory Expansion**:
   - Leave your territory to create a trail
   - Return to your territory to close the loop and capture new land
   - The larger your enclosed area, the higher your score
5. **Strategy**:
   - Capture territory from other players to increase your score
   - Beware of other players trying to cross your trail
   - If another player crosses your trail or captures you, game over!

## 🛠️ Technology Stack

**Frontend:**
- [React](https://reactjs.org/) - UI component library
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [Socket.IO Client](https://socket.io/docs/v4/client-api/) - Real-time communication
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vite](https://vitejs.dev/) - Build tool and development environment

**Backend:**
- [Node.js](https://nodejs.org/) - Server runtime
- [Express](https://expressjs.com/) - Web server framework
- [Socket.IO](https://socket.io/) - WebSocket server
- [Turf.js](https://turfjs.org/) - Geospatial analysis

**Hosting:**
- [Vercel](https://vercel.com/) - Frontend hosting
- [Render](https://render.com/) - Backend hosting

## 💻 Installation for Developers

To set up the project locally for development:

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Client Setup
```bash
# Clone the repository
git clone https://github.com/crizmo/Boundless.git
cd Boundless/client

# Install dependencies
npm install

# Start development server
npm run dev
```

### Server Setup
```bash
# Navigate to server directory
cd ../server

# Install dependencies
npm install

# Start server
npm run dev
```

## 👥 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please see CONTRIBUTING.md for detailed contribution guidelines.

## 🔍 Developers Wanted!

**Looking for developers to help improve and optimize Boundless!**

Whether you're experienced with game development, real-time multiplayer systems, or geospatial applications, we'd love your help in taking Boundless to the next level. Areas we're particularly focused on:

- Performance optimization for smooth gameplay
- Enhanced territory capture algorithms
- Mobile experience improvements
- Server-side scalability enhancements
- Creative game mechanics and features

Interested? Join our [Discord](https://discord.gg/RPaWHVBb7B) or reach out via GitHub issues to discuss how you can get involved!

## 🗺️ Roadmap

- [ ] Additional game modes (Team battles, Capture the Flag)
- [ ] Player accounts and persistent statistics
- [ ] Power-ups and special abilities
- [ ] Custom map themes and skins
- [ ] Mobile app version

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📢 Contact & Support

Have suggestions or found a bug? Let us know!

- **Discord**: [Join Our Community](https://discord.gg/RPaWHVBb7B)
- **GitHub Issues**: [Report Issues](https://github.com/crizmo/Boundless/issues)
