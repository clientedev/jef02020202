# Núcleo 1.03

## Overview

Núcleo 1.03 is a comprehensive business management and prospecting system built for enterprise sales teams. The platform enables company registration, prospecting control, appointment scheduling, call history tracking, and consultant assignment management. It features a dark-themed professional dashboard interface optimized for internal use by administrators and consultants.

Key capabilities include:
- Company database management with CNPJ lookup integration
- Sales pipeline with drag-and-drop stage management
- Prospecting workflow with call tracking and follow-ups
- Appointment scheduling with automated alerts
- Interactive form builder for client surveys
- Real-time chat system for team communication
- Project timeline/schedule management (Cronograma)
- Role-based access control (Admin vs Consultor)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: FastAPI (Python) - async-capable web framework
- **ORM**: SQLAlchemy 2.0 with declarative models
- **Database Migrations**: Alembic for schema version control
- **Server**: Uvicorn (ASGI) with Gunicorn for production

### Frontend Architecture
- **Templating**: Jinja2 server-side rendering
- **Styling**: TailwindCSS via CDN with custom dark theme
- **Interactivity**: Vanilla JavaScript with fetch API for AJAX calls
- **Icons**: Font Awesome 6.x

### Authentication & Authorization
- **Method**: JWT (JSON Web Tokens) via python-jose
- **Password Hashing**: bcrypt through passlib
- **Token Expiry**: 8 hours (480 minutes)
- **User Types**: Two roles - `admin` (full access) and `consultor` (limited to assigned companies)

### Data Models Structure
- **Users**: Role-based with admin/consultor types
- **Companies (Empresas)**: Full business registry with CNPJ, address, contact info
- **Prospecting (Prospeccoes)**: Call/contact tracking with result statuses
- **Appointments (Agendamentos)**: Scheduled follow-ups with status tracking
- **Pipeline**: Kanban-style sales stages with company progression
- **Forms (Formularios)**: Dynamic survey builder with gamification elements
- **Messages (Mensagens)**: Real-time chat with group support
- **Schedule (Cronograma)**: Project timeline and event management

### Database Schema Design
- PostgreSQL as primary database
- Enum types for statuses (user type, prospecting result, appointment status)
- Foreign key relationships between entities
- Automatic timestamp tracking (created_at, updated_at)
- Unique constraints on CNPJ for companies

### Startup & Seeding
- Automatic table creation on startup via SQLAlchemy
- Seed functions for default admin user, sample companies, pipeline stages
- Dynamic column addition for schema evolution without migrations

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connected via `DATABASE_URL` environment variable
- **psycopg2-binary**: PostgreSQL adapter for Python

### Third-Party APIs
- **CNPJ Lookup**: Integration for Brazilian business registry lookups (via httpx)
- **UI Avatars**: External service for generating user avatar images

### Key Python Packages
- **fastapi**: Web framework
- **sqlalchemy**: Database ORM
- **alembic**: Database migrations
- **python-jose[cryptography]**: JWT token handling
- **passlib[bcrypt]**: Password hashing
- **pydantic**: Data validation and settings
- **jinja2**: HTML templating
- **openpyxl**: Excel file import/export
- **reportlab**: PDF generation
- **python-magic**: File type detection

### Deployment Platform
- **Railway**: Primary hosting platform with auto-deploy from GitHub
- **Configuration**: Uses `railway.toml`, `Procfile`, and `start.sh` for deployment
- Environment variables: `DATABASE_URL` (auto-configured), `PORT` (auto-configured), `SESSION_SECRET` (optional)

### Frontend CDN Dependencies
- TailwindCSS (via cdn.tailwindcss.com)
- Font Awesome 6.4.0 (icons)
- SortableJS (drag-and-drop functionality)
- Google Fonts (Inter font family)