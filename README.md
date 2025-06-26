# GeoDrink 🚰

An interactive web application for finding and exploring water points, fountains, and drinking water sources on an interactive map.

## Features

- 🗺️ **Interactive Map**: Powered by MapLibre GL for smooth, responsive mapping experience
- 💧 **Water Point Discovery**: Find drinking fountains, water taps, and other water sources
- 🔍 **Advanced Search**: Filter and search water points by various criteria
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🎨 **Modern UI**: Built with Radix UI components and Tailwind CSS
- 🌙 **Dark/Light Theme**: Toggle between themes for comfortable viewing
- 📊 **Data Visualization**: Charts and statistics about water points
- 💾 **Offline Support**: Cache management for improved performance

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Tailwind Animate
- **UI Components**: Radix UI primitives
- **Maps**: MapLibre GL
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React + Radix Icons
- **Theme**: Next Themes

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/fxi/geodrink.git
cd geodrink
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── map/            # Map-related components
│   └── ...             # Feature components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Water point data sourced from OpenStreetMap
- Built with modern web technologies and best practices
- Inspired by the need for accessible water source information
