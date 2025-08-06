# Aviation Parts Management System

## Overview

This is a full-stack aviation parts management system that serves as an automated broker platform between customers and suppliers. The system processes incoming customer email requests, creates internal procurement requests, manages approval workflows, and tracks orders through fulfillment. It handles high-volume operations with automated email parsing and intelligent part detection. Key capabilities include real-time email monitoring, automated aviation part number detection, internal procurement request creation with approval workflows, comprehensive supplier management, and analytics for business insights. The platform acts as a broker, managing internal procurement approval workflows for supplier quotes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables
- **Real-time Updates**: WebSocket connection for live dashboard updates
- **Design**: Component-based architecture with separate pages for dashboard, orders, quotes, suppliers, customer requests, and analytics. Components organized into UI primitives, layout components, and feature-specific dashboard components.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Real-time Communication**: WebSocket server
- **Service Layer**: Modular services for email processing and supplier management
- **Middleware**: Custom logging and error handling
- **Design**: Layered architecture with controllers (routes), services, and data access layers. Storage interface provides abstraction over database operations.

### Data Storage
- **Database**: PostgreSQL with Neon serverless
- **Schema Design**: Relational model with entities for users, customers, suppliers, emails, orders, quotes, and activities. Supports complete procurement workflow with proper relationships and audit trails.
- **Connection Pooling**: Neon serverless connection pooling
- **Migrations**: Drizzle Kit

### Authentication and Authorization
- **Session Management**: PostgreSQL session store with connect-pg-simple
- **User Authentication**: Username/password based authentication with bcrypt password hashing
- **User Roles**: Role-based access control (admin, user roles)
- **Security**: Environment-based configuration for database credentials
- **Activity Tracking**: All user actions are logged with userId for complete audit trail
- **Login Credentials**: Default admin user - username: "admin", password: "admin123"

### Real-time Features
- **WebSocket Integration**: Live updates for new orders, quotes, and email processing
- **Dashboard Updates**: Real-time KPI updates and activity feeds

### Email Processing System
- **Integration**: Direct connection to Timweb mail service via IMAP
- **Automation**: Continuous monitoring of incoming emails, smart filtering of business-relevant emails, automated customer creation from sender information.
- **Aviation Parts Detection**: Hybrid approach using company-specific parsers first, then AI-powered extraction as fallback. Company-specific parsers for Aeroflot, Azur Air, Pobeda, Ural Airlines, Rossiya Airlines, Yakutia, S7, Nordwind, and Lukoil. AI extraction for part numbers, descriptions, quantities, alternates, and AC types. Includes robust validation to exclude false positives.
- **Company Parser Service**: Intelligent email parser selection based on sender domain. Each airline has customized parsing logic adapted to their specific email formats and table structures. Falls back to generic table parser or AI when company-specific parser doesn't find parts.
- **Draft Order Workflow**: Email parsing creates draft orders, which are then manually reviewed, edited, approved, or rejected in a dedicated interface. This includes a `draft_orders` table and `DraftOrderService`.
- **CR/Requisition Numbers**: Automatic generation of unique CR (Customer Reference) and Item ID numbers. CR numbers are generated per email (e.g., CR-00001). Item IDs are based on CR numbers with format ID-XXYY where XX is first 2 digits of CR and YY is sequential (e.g., CR-23999 generates ID-23001, ID-23002).
- **In Progress Tab Enhancement**: The "In Progress" tab now displays full draft order cards grouped by email instead of simple email listings. Includes procurement status indicators showing green "All items done (X sent)" badge when all draft items are converted to orders, and blue badge showing "X of Y requested" to track procurement status. Individual draft items are hidden when all items are converted to orders while keeping the email card visible.
- **Email Assignment**: Emails can be assigned to users for dedicated work. Authentication is required for assignment functionality. Assigned emails are tracked via assignedToUserId field.

### Procurement Workflow
- **Internal Approval System**: All supplier quotes require internal approval.
- **Procurement Requests**: JSON-based request creation from supplier quotes.
- **Approval Management**: Dedicated procurement page for approving/rejecting requests.
- **Status Tracking**: Comprehensive status workflow (pending, approved, rejected, processing, completed).
- **Audit Trail**: Complete activity logging for procurement decisions.

### Supplier Management
- **Performance Tracking**: Response time and success rate metrics.
- **Quote Template System**: Standardized JSON template for supplier quote data submission.
- **Supplier Database**: Automatic supplier creation and management.
- **Broker Model**: Platform acts as a broker, managing relationships between customers and suppliers.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.

### Frontend Libraries
- **Radix UI**: Unstyled, accessible UI primitives.
- **TanStack Query**: Data synchronization for React applications.
- **Wouter**: Minimalist routing library for React.
- **Date-fns**: JavaScript date utility library.
- **Tailwind CSS**: Utility-first CSS framework.

### Backend Dependencies
- **Drizzle ORM**: TypeScript ORM.
- **Express.js**: Web framework for Node.js.
- **WebSocket (ws)**: WebSocket library.
- **Connect-pg-simple**: PostgreSQL session store for Express.
- **Deepseek API**: For AI-powered part extraction and analysis.

### Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Static type checking.
- **ESBuild**: JavaScript bundler.
- **Replit Integration**: Development environment optimization.