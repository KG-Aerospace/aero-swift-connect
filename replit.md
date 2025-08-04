# Aviation Parts Management System

## Overview

This is a full-stack aviation parts management system that automates the procurement process by handling customer email requests, managing supplier quotes, and tracking orders. The application processes incoming emails from customers, extracts part requirements, creates orders, and automatically sends quote requests to suppliers.

The system provides a real-time dashboard for monitoring the entire procurement workflow, from initial customer requests through order fulfillment. It includes comprehensive supplier management with performance tracking and analytics for business insights.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Real-time Updates**: WebSocket connection for live dashboard updates

The frontend follows a component-based architecture with separate pages for dashboard, orders, quotes, suppliers, customer requests, and analytics. Components are organized into UI primitives, layout components, and feature-specific dashboard components.

### Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Real-time Communication**: WebSocket server for broadcasting live updates
- **Service Layer**: Modular services for email processing and supplier management
- **Middleware**: Custom logging and error handling middleware

The backend implements a layered architecture with controllers (routes), services, and data access layers. The storage interface provides abstraction over database operations.

### Data Storage
- **Database**: PostgreSQL with Neon serverless for scalable cloud hosting
- **Schema Design**: Relational model with entities for users, customers, suppliers, emails, orders, quotes, and activities
- **Connection Pooling**: Neon serverless connection pooling for efficient database access
- **Migrations**: Drizzle Kit for database schema migrations

The database schema supports the complete procurement workflow with proper relationships between entities and audit trails through the activities table.

### Authentication and Authorization
- **Session Management**: PostgreSQL session store with connect-pg-simple
- **User Roles**: Role-based access control with user management
- **Security**: Environment-based configuration for database credentials

### Real-time Features
- **WebSocket Integration**: Live updates for new orders, quotes, and email processing
- **Dashboard Updates**: Real-time KPI updates and activity feeds
- **Notification System**: Toast notifications for important events

### Email Processing System
- **Real Email Integration**: Direct connection to Timweb mail service via IMAP
- **Automated Monitoring**: Continuous monitoring of incoming emails every 30 seconds
- **Smart Filtering**: Intelligent filtering of business-relevant emails vs spam/notifications
- **Aviation Parts Detection**: Advanced pattern matching for part numbers and quantities
- **Customer Management**: Automatic customer creation from sender information
- **Real-time Processing**: Live email processing with dashboard status monitoring

### Supplier Management
- **Performance Tracking**: Response time and success rate metrics
- **Quote Automation**: Automated quote request distribution
- **API Integration**: Framework for connecting to supplier APIs (mock implementation)

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for scalable data storage
- **Connection Pooling**: WebSocket constructor compatibility for serverless environments

### Frontend Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **TanStack Query**: Powerful data synchronization for React applications
- **Wouter**: Minimalist routing library for React
- **Date-fns**: Modern JavaScript date utility library
- **Tailwind CSS**: Utility-first CSS framework

### Backend Dependencies
- **Drizzle ORM**: TypeScript ORM with SQL-like syntax
- **Express.js**: Fast, unopinionated web framework for Node.js
- **WebSocket (ws)**: Simple to use WebSocket library
- **Connect-pg-simple**: PostgreSQL session store for Express

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking for JavaScript
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Integration**: Development environment optimization for Replit platform