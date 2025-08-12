# Instagram Scraper App

A modern, well-organized Instagram scraper built with Tauri, React, and TypeScript. This app allows users to scrape Instagram followers with persistent storage capabilities.

## 🏗️ Project Structure

The app is organized into a clean, maintainable structure:

```
src/
├── components/          # React components
│   ├── LoadingScreen.tsx
│   ├── LoginCard.tsx
│   ├── ScrapeForm.tsx
│   ├── PersistentOperations.tsx
│   ├── ResultsTable.tsx
│   └── index.ts
├── hooks/              # Custom React hooks
│   └── useAppState.ts
├── utils/              # Utility functions
│   ├── api.ts          # API calls
│   ├── download.ts     # Download utilities
│   └── styles.ts       # Styling
├── types/              # TypeScript type definitions
│   └── index.ts
├── constants/          # App constants
│   └── index.ts
├── App.tsx             # Main App component
└── main.tsx            # Entry point
```

## 🚀 Features

### Core Functionality
- **Instagram Login**: Secure browser-based login with cookie persistence
- **Follower Scraping**: Extract follower data from Instagram accounts
- **Real-time Monitoring**: Live status updates during scraping operations
- **Persistent Storage**: Operations continue even when app is closed

### User Experience
- **Loading Indicators**: Visual feedback for all async operations
- **Operation History**: View and manage past scraping operations
- **Download Options**: Export results as CSV or JSON
- **Error Handling**: Graceful error handling with user feedback

### Technical Features
- **Type Safety**: Full TypeScript implementation
- **Component Architecture**: Modular, reusable components
- **Custom Hooks**: Clean state management
- **Utility Functions**: Organized API and utility functions

## 🛠️ Development

### Prerequisites
- Node.js (v16 or higher)
- Rust (latest stable)
- Tauri CLI

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run tauri dev

# Build for production
npm run tauri build
```

### Key Technologies
- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Tauri (Rust)
- **Styling**: Inline styles with TypeScript
- **State Management**: Custom React hooks
- **API**: Tauri invocations for backend communication

## 📁 Component Overview

### `LoadingScreen`
- Displays during app initialization
- Shows loading spinner and status message

### `LoginCard`
- Handles Instagram login process
- Shows login status and error states
- Provides login refresh functionality

### `ScrapeForm`
- Configuration interface for scraping
- Account input and follower count slider
- Action buttons for scraping and testing

### `PersistentOperations`
- Displays operation history
- Shows operation status and results
- Provides operation management actions

### `ResultsTable`
- Displays scraping results
- Download functionality for CSV/JSON
- Clean table layout with profile links

## 🔧 Custom Hooks

### `useAppState`
- Centralized state management
- Handles all app state and side effects
- Manages polling for operation status
- Handles persistent storage operations

## 🎨 Styling

The app uses a centralized styling system:
- **`styles.ts`**: All styles defined in one place
- **TypeScript Integration**: Type-safe style objects
- **Consistent Design**: Unified color scheme and spacing
- **Responsive**: Works on different screen sizes

## 📊 API Structure

### Core Functions
- `checkLoginStatus()`: Verify existing login
- `startLogin()`: Initiate Instagram login
- `startScrape()`: Begin scraping operation
- `checkScrapeStatus()`: Check operation progress
- `getPersistentOperations()`: Load saved operations
- `clearCompletedOperations()`: Clean up history

### Download Functions
- `downloadCSV()`: Export results as CSV
- `downloadJSON()`: Export results as JSON

## 🔄 State Management

The app uses a custom hook pattern for state management:

```typescript
const {
  // State
  account, desired, loginState, results, busy,
  persistentOperations, loadingOperations,
  
  // Actions
  setAccount, setDesired, handleLogin,
  handleStartScrape, loadPersistentOperations
} = useAppState();
```

## 🎯 Benefits of This Organization

1. **Maintainability**: Clear separation of concerns
2. **Reusability**: Components can be easily reused
3. **Type Safety**: Full TypeScript coverage
4. **Testability**: Isolated functions and components
5. **Scalability**: Easy to add new features
6. **Readability**: Clean, self-documenting code

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development: `npm run tauri dev`
4. Build for production: `npm run tauri build`

## 📝 Contributing

When adding new features:
1. Create appropriate types in `src/types/`
2. Add constants to `src/constants/`
3. Create utility functions in `src/utils/`
4. Build components in `src/components/`
5. Update the main App component as needed

This organized structure makes the codebase much more maintainable and easier to work with!
