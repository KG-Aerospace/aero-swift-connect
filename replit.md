# Aviation Parts Management System

## Overview

This is a full-stack aviation parts management system that serves as an automated broker platform between customers and suppliers. The system processes incoming customer email requests, creates internal procurement requests, manages approval workflows, and tracks orders through fulfillment.

The platform operates as a broker, not directly integrating with suppliers. Instead, it manages an internal procurement approval workflow where team members review and approve supplier quotes before proceeding with orders. The system handles high-volume operations (500+ emails/day, 1000+ orders) with automated email parsing and intelligent part detection.

Key features include real-time email monitoring from Timweb mail service, automated aviation part number detection, internal procurement request creation with approval workflows, comprehensive supplier management, and analytics for business insights.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

- **Procurement Request System**: Added new procurement_requests table and complete approval workflow
- **Internal Approval Process**: Replaced direct supplier quote processing with internal approval system
- **New Procurement Page**: Added dedicated UI for managing procurement requests with approve/reject functionality
- **Enhanced Customer Requests**: Modified to create internal procurement requests instead of direct supplier quotes
- **Database Schema Update**: Added procurement_requests table with comprehensive tracking fields
- **HTML Email Support**: Implemented HTML email rendering with proper formatting in email details view
- **File Attachment Handling**: Added support for email attachments using Replit object storage
- **Email Links**: Added email viewing functionality from orders table to see original requests
- **Object Storage Integration**: Set up Replit object storage for file attachments with public access
- **Airline-Specific Parsing**: Implemented comprehensive airline detection by email domain with company-specific parsers
- **Enhanced Order Creation**: Orders now created using tailored parsing logic for each airline company (Nordwind, S7, UTair, Aeroflot, etc.)

### August 5, 2025 - Part Number Detection Improvements
- **Enhanced Airline Parsers**: Improved part number detection algorithms for all airline-specific parsers
  - Nordwind: Fixed detection to avoid splitting compound part descriptions (e.g., "DRIVE UNIT ASSY-ANT P/N 622-5135-802" now correctly detected as single part)
  - S7 Airlines: Added support for Cyrillic patterns and mixed format part numbers like "2313M591-1"
  - UTair: Added detection for order numbers (format: P17059425) and enhanced structured pattern detection
  - All parsers now better handle aviation-specific terms like "SENSOR", "VALVE", "UNIT"
- **Part Number Validation**: Added stricter validation to exclude:
  - Encoded/base64 strings (length > 30 or containing '/' with length > 20)
  - Common false positives (dates, simple codes, currency abbreviations)
  - Single words that commonly appear in aviation emails (ment, ners, ASSY, DESCRIPTION)
  - Pure letter codes (JSC, LLC, FH) and short numeric codes
- **Generic Parser Enhancement**: Added support for order/request numbers (RQ-0006011, P17059425) commonly used by airlines
- **Order Creation Service**: Created dedicated service with duplicate detection to prevent multiple orders for same part/email
- **Order Number Generation**: Improved uniqueness by including timestamp and random components (format: ORD-YYYYMMDD-TTTTTTRRR)
- **Database Cleanup**: Removed false positive orders with encoded part numbers and common words

### August 5, 2025 - Draft Order Review System Implementation
- **Draft Orders System**: Implemented comprehensive draft order workflow for manual review
  - Added `draft_orders` table to track parsed email parts before approval
  - Created `DraftOrderService` for managing draft order lifecycle
  - Changed email parser to create draft orders instead of direct orders
- **Customer Requests Interface**: Completely redesigned customer-requests page
  - Shows pending draft orders with edit/approve/reject functionality
  - Displays unparsed emails separately for manual processing
  - Added `DraftOrderCard` component with inline editing capabilities
- **Manual Review Workflow**: 
  - Email parsing → Creates draft orders → Manual review in customer-requests → Approve to create verified orders
  - Orders approved through manual review marked with "verified" status
  - Rejected drafts stored with rejection reasons for audit trail
- **API Endpoints**: Added comprehensive draft order API
  - GET /api/draft-orders - List all draft orders with customer/email data
  - PATCH /api/draft-orders/:id - Update draft order details
  - POST /api/draft-orders/:id/approve - Approve and create verified order
  - POST /api/draft-orders/:id/reject - Reject with reason

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
- **Real Email Integration**: Direct connection to Timweb mail service via IMAP (imap.timeweb.ru:993)
- **Automated Monitoring**: Continuous monitoring of incoming emails every 30 seconds
- **Smart Filtering**: Intelligent filtering of business-relevant emails vs spam/notifications
- **Aviation Parts Detection**: Advanced pattern matching for part numbers (e.g., MS24665-156, BACN10YV8PD, PFSC36-6-4-SS)
- **Customer Management**: Automatic customer creation from sender information
- **Real-time Processing**: Live email processing with dashboard status monitoring (613+ emails processed)

### Procurement Workflow
- **Internal Approval System**: All supplier quotes require internal approval before processing
- **Procurement Requests**: JSON-based procurement request creation from supplier quotes
- **Approval Management**: Dedicated procurement page for approving/rejecting requests
- **Status Tracking**: Comprehensive status workflow (pending, approved, rejected, processing, completed)
- **Audit Trail**: Complete activity logging for all procurement decisions
- **Rejection Reasons**: Mandatory reason documentation for rejected requests

### Supplier Management
- **Performance Tracking**: Response time and success rate metrics
- **Quote Template System**: Standardized JSON template for supplier quote data submission
- **Supplier Database**: Automatic supplier creation and management
- **Quote Processing**: Validation and parsing of supplier quotes with comprehensive error handling
- **Broker Model**: Platform operates as broker, managing relationships between customers and suppliers

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