# ChessMate Frontend

A modern React-based chess application featuring real-time multiplayer gameplay, customizable time controls, and an intuitive user interface.

## Backend Repository
The backend for this application can be found at [ChessMate Backend Repository](https://github.com/Vishwa1011IIITM/Chess-Mate_Backend.git)

## Features

- Real-time multiplayer chess gameplay
- Interactive chessboard with piece drag-and-drop
- Move validation and legal move highlighting
- Multiple game modes:
  - Blitz (3 minutes)
  - Speed (5 minutes)
  - Classic (10 minutes)
  - Long (30 minutes)
- Color selection (White, Black, or Random)
- Game creation and joining via unique codes
- Captured pieces display
- Player timers with automatic updates
- Pawn promotion interface
- Move sound effects
- Responsive design

## Prerequisites

- Node.js (v12 or higher)
- npm (Node Package Manager)
- Modern web browser with WebSocket support

## Dependencies

```json
{
  "react": "^18.x.x",
  "chess.js": "^1.x.x",
  "chessboardjsx": "^6.x.x",
  "socket.io-client": "^4.x.x"
}
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chess-mate-frontend.git
```

2. Install dependencies:
```bash
cd chess-mate-frontend
npm install
```

3. Create a `.env` file in the root directory:
```env
REACT_APP_SOCKET_SERVER_URL=your_backend_url
```

4. Start the development server:
```bash
npm start
```

# Chess Game Project Structure

## Directory Structure

### Root Directory
```
Chess/
├── index.html                # HTML entry point
├── package.json              # Project dependencies and scripts
├── package-lock.json         # Lock file for dependencies
├── vite.config.js           # Vite configuration
├── eslint.config.js         # ESLint configuration
├── responsive.css           # Global responsive styles
└── README.md                # Project documentation
```

### Source Directory (`src/`)
The main application code resides in the `src` directory:

#### Components (`src/components/`)
Contains all React components and their associated styles:
```
components/
├── ChessBoard.jsx           # Main chess game component
├── ChessBoard.css           # Styles for the chess game
├── LoadingRandomPage.jsx    # Loading screen component
├── LoadingRandomPage.css    # Styles for loading screen
├── PromotionModal.jsx       # Pawn promotion interface
├── PromotionModal.css       # Styles for promotion modal
├── UserTile.jsx            # Player information display
├── UserTile.css            # Styles for user tile
├── WelcomePage.jsx         # Welcome/landing page
└── WelcomePage.css         # Styles for welcome page
```

#### Utilities (`src/utils/`)
Helper functions and game logic:
```
utils/
├── PieceImages.jsx         # Chess piece image handler
└── SoundManager.jsx        # Game sound effects handler
```

#### Assets (`src/assets/`)
Static assets used throughout the application:

##### Images (`src/assets/images/`)
Chess piece images and general assets:
```
images/
├── bb.png                  # Black bishop
├── bk.png                  # Black king
├── bn.png                  # Black knight
├── bp.png                  # Black pawn
├── bq.png                  # Black queen
├── br.png                  # Black rook
├── wb.png                  # White bishop
├── wk.png                  # White king
├── wn.png                  # White knight
├── wp.png                  # White pawn
├── wq.png                  # White queen
├── wr.png                  # White rook
├── chess_image.jpeg       # General chess image
└── logo.svg               # Application logo
```

##### Sounds (`src/assets/sounds/`)
Game sound effects:
```
sounds/
├── capture.mp3            # Piece capture sound
├── castling.mp3           # Castling move sound
├── move-check.mp3         # Check move sound
├── promotion.mp3          # Pawn promotion sound
└── self-move.mp3         # Regular move sound
```

#### Root Files (`src/`)
Application entry points and global styles:
```
src/
├── App.jsx               # Root component
├── App.css              # Root styles
├── main.jsx            # Entry point
└── index.css           # Global styles
```

### Public Directory (`public/`)
Static assets served directly:
```
public/
└── logo.svg            # Application logo
```

## Component Documentation

### ChessBoard Component
The main game component that handles:
- Game state management
- WebSocket connections
- Move validation
- Timer management
- User interactions
- Game creation/joining

### UserTile Component
Displays player information including:
- Player name
- Captured pieces
- Timer
- Color assignment

### PromotionModal Component
Handles pawn promotion with:
- Piece selection interface
- Promotion validation
- Visual feedback

## Deployment

### Vercel Deployment

This frontend application is designed to be deployed on Vercel for optimal performance and ease of use.
You can enjoy chess with friends and family with the link below
The server is hosted on the link:
```javascript
https://chess-mate-one.vercel.app/
```

## WebSocket Connection

The application connects to the backend server using Socket.IO:

```javascript
const socket = io(SOCKET_SERVER_URL, {
  withCredentials: true,
  transports: ['websocket']
});
```

## Game Features

### Time Controls
- Blitz: 3 minutes per player
- Speed: 5 minutes per player
- Classic: 10 minutes per player
- Long: 30 minutes per player

### Move Validation
- Legal move highlighting
- Piece selection feedback
- Invalid move prevention
- Check and checkmate detection

### User Interface
- Drag and drop piece movement
- Click-to-move support
- Visual move indicators
- Game status display
- Timer countdown
- Captured pieces display

## Development

### Adding New Features
1. Create a new component in the `components` directory
2. Import required dependencies
3. Implement the component logic
4. Add styling in a corresponding CSS file
5. Import and use the component where needed

### Modifying Game Logic
The chess game logic is handled by `chess.js` library. To modify game rules or add new features:
1. Locate the relevant section in `ChessBoard.js`
2. Make changes while ensuring move validation remains intact
3. Test thoroughly with different game scenarios
4. Update documentation accordingly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request


## Environment Variables

- `REACT_APP_SOCKET_SERVER_URL`: Backend server URL
- `REACT_APP_VERSION`: Application version
- `REACT_APP_ENV`: Development/Production environment

## Production Considerations

1. Implement error boundaries
2. Add loading states
3. Implement reconnection logic
4. Add proper error messages
5. Implement proper analytics
6. Add performance monitoring
7. Set up proper environment variables in Vercel
