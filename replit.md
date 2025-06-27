# Tactical RPG Character Generator

## Overview

This is a full-stack web application for generating and managing characters for a tactical RPG boarding party scenario. The application allows users to create, organize, and manage groups of combat-ready characters with tactical combat statistics, abilities, and card-based combat mechanics.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server:

- **Frontend**: React-based SPA with TypeScript, using Vite for development and building
- **Backend**: Express.js server with TypeScript support
- **Database**: PostgreSQL with Drizzle ORM for database operations
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing

## Key Components

### Frontend Architecture
- **React + TypeScript**: Modern component-based architecture
- **Vite**: Fast development server and optimized production builds
- **shadcn/ui**: Comprehensive UI component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with tactical RPG theming
- **TanStack Query**: Efficient server state management and caching

### Backend Architecture
- **Express.js**: Lightweight web framework for API routes
- **TypeScript**: Type-safe server-side development
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **In-memory storage**: Currently using MemStorage class for development

### Database Schema
- **Users table**: Basic user authentication structure (id, username, password)
- **Character schemas**: Comprehensive tactical RPG character definitions including:
  - Character stats (HP, armor, constitution)
  - Class system (6 different classes with unique base stats)
  - Card-based combat system (10 different combat cards)
  - Initiative tracking for turn-based combat

### Combat System
- **6 Character Classes**: Each with unique base HP and armor values
- **Constitution System**: Additional HP based on constitution score (0-2)
- **Card-based Combat**: 10 different combat cards with tactical effects
- **Turn-based Initiative**: Initiative tracking from 1-20
- **Group Management**: Organize characters into tactical groups

## Data Flow

1. **Character Generation**: Frontend generates random characters using predefined class stats and card combinations
2. **Group Management**: Characters are organized into named groups for tactical scenarios
3. **State Persistence**: Scenarios can be saved/loaded using localStorage
4. **Real-time Updates**: Character stats can be modified in real-time during gameplay
5. **Combat Tracking**: HP tracking with visual indicators and card usage tracking

## External Dependencies

### Frontend Dependencies
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **@tanstack/react-query**: Server state management
- **class-variance-authority**: Utility for managing component variants
- **clsx + tailwind-merge**: CSS class manipulation utilities
- **date-fns**: Date manipulation library
- **embla-carousel-react**: Carousel component
- **wouter**: Lightweight client-side routing

### Backend Dependencies
- **drizzle-orm**: Type-safe ORM for database operations
- **@neondatabase/serverless**: PostgreSQL database driver
- **express**: Web framework
- **tsx**: TypeScript execution for development

### Development Dependencies
- **Vite**: Build tool and development server
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Styling framework
- **PostCSS**: CSS processing

## Deployment Strategy

The application is configured for deployment on Replit with autoscaling:

- **Development**: `npm run dev` starts both frontend and backend in development mode
- **Build Process**: `npm run build` creates optimized production builds
- **Production**: `npm run start` serves the built application
- **Database**: PostgreSQL 16 module configured for production database
- **Port Configuration**: Application runs on port 5000 internally, exposed on port 80

The build process:
1. Vite builds the frontend React application
2. esbuild bundles the Express server
3. Static files are served from the dist directory in production

## Changelog

```
Changelog:
- June 25, 2025: Initial tactical RPG character generator setup
- June 25, 2025: Added WAR system with:
  * Editable group names with inline editing
  * Card effect indicators showing active effects on characters
  * Turn-based combat simulation with dice rolling mechanics
  * Group vs group battles with attack/defend actions
  * Combat logging and war outcome tracking
  * Character status tracking (alive/dead, temp armor, active effects)
  * Updated character schema with new combat properties
- June 26, 2025: Complete system overhaul:
  * New 6-class system: Shooter, Engineer, Scavenger, Tinkerer, Brute, Breaker
  * Class-based deck system: Melee/Ranged/Support deck access by class
  * Updated armor values: Shooter=3, Engineer=4, Scavenger=4, Tinkerer=4, Brute=6, Breaker=5
  * Gun points health bar visualization
  * Alternating turn-based combat (Group 1 → Group 2 → Group 1)
  * Round-based pausing system with continue functionality
  * Advanced AI behavior: Melee 85% attack, Ranged prioritizes reload/repair, Support helps allies first
  * Proper targeting rules: Melee must target enemy Melee first
- June 27, 2025: Combat system fixes and improvements:
  * Fixed single damage roll system - removed duplicate attack/damage rolls
  * Ranged weapon users and ranged classes now use 1d4 melee damage dice
  * Scavenger class now draws from SUPPORT deck for junk token acquisition
  * Updated combat logs to show single roll determining hit and damage
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```

## Notes

- The application currently uses in-memory storage for development but is configured to use PostgreSQL in production
- The combat system is designed around a card-based tactical RPG with 6 distinct character classes
- Character generation includes randomized names, stats, and combat cards
- The UI features a tactical military aesthetic with dark theme colors
- All character data follows strict TypeScript schemas for type safety