# Dynamic Form Generator - Backend API

A robust Node.js backend API for the Dynamic Form Generator system that processes DOCX templates and generates documents with dynamic content.

## Features

- 📄 **DOCX Processing**: Parse and render DOCX templates with placeholders
- 🔍 **Template Analysis**: Extract form fields and validation rules from templates
- 📝 **Document Generation**: Generate filled documents from template + data
- 🗄️ **Template Storage**: SQLite database with template versioning
- 🔒 **Security**: Rate limiting, CORS protection, file validation
- 🚀 **Performance**: Efficient file handling and caching

## Technology Stack

- **Node.js** with TypeScript
- **Express.js** for REST API
- **SQLite** with Drizzle ORM
- **Docxtemplater** for DOCX processing
- **Multer** for file uploads
- **Zod** for validation
- **Pino** for logging

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone or download this backend project**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   # Copy .env file and update if needed
   cp .env .env.local
   ```

4. **Initialize database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **API available at**: http://localhost:4000

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Database (SQLite)
DATABASE_URL=./storage/app.db

# File Storage
STORAGE_PATH=./storage/templates
MAX_FILE_SIZE=10485760

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio (database GUI)
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Endpoints

### Template Operations

#### Upload and Inspect Template
```http
POST /api/templates/inspect
Content-Type: multipart/form-data

Form Data:
- file: DOCX file
```

**Response**:
```json
{
  "success": true,
  "data": {
    "templateId": "uuid",
    "version": 1,
    "fields": [
      {
        "key": "name",
        "type": "text",
        "label": {"en": "Name", "ar": "الاسم"},
        "required": true
      }
    ]
  }
}
```

#### Generate Document
```http
POST /api/templates/render/docx
Content-Type: application/json

{
  "templateId": "uuid",
  "data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response**: Binary DOCX file

#### Get Template Specification
```http
GET /api/templates/{templateId}/spec?version=1
```

## Project Structure

```
src/
├── config/             # Configuration
│   └── env.ts         # Environment variables
├── db/                # Database
│   ├── drizzle.ts     # Database connection
│   ├── init.ts        # Database initialization
│   └── schema.ts      # Database schema
├── middleware/        # Express middleware
│   ├── error.ts       # Error handling
│   ├── rateLimit.ts   # Rate limiting
│   └── upload.ts      # File upload
├── modules/           # Feature modules
│   └── templates/     # Template processing
│       ├── docx-parser.ts      # DOCX parsing
│       ├── docx-renderer.ts    # DOCX rendering
│       ├── inspect.controller.ts
│       ├── inspect.service.ts
│       ├── render.controller.ts
│       ├── render.service.ts
│       └── router.ts
├── utils/             # Utilities
│   ├── file.ts        # File helpers
│   ├── logger.ts      # Logging setup
│   └── zod.ts         # Validation schemas
└── server.ts          # Express app setup
```

## Supported Placeholder Formats

The system supports mixed placeholder formats in DOCX templates:

### Simple Format
- `{variable}` - Basic placeholder
- `{company}` - Company name
- `{date}` - Date field

### Advanced Format
- `{{variable | options}}` - Advanced with metadata
- `{{name | type=text | required=true}}` - Text with validation
- `{{email | type=email | format=email}}` - Email field
- `{{salary | type=number | min=0 | max=10000}}` - Number with range
- `{{gender | type=select | options="Male,Female,Other"}}` - Select field

### Auto-detection
The parser automatically detects field types based on variable names:
- Names containing "email" → email type
- Names containing "date" → date type  
- Names containing "salary", "amount" → number type
- Names containing "image", "logo" → image type

## Database Schema

### Templates Table
- `id` - UUID primary key
- `name` - Template name
- `fileHash` - SHA-256 of original file
- `createdAt` - Creation timestamp

### Template Versions Table
- `id` - UUID primary key
- `templateId` - Foreign key to templates
- `version` - Version number
- `fieldsSpec` - JSON field specifications
- `filePath` - Storage path
- `createdAt` - Creation timestamp

## Error Handling

The API uses standardized error responses:

```json
{
  "error": "Error type",
  "message": "Human readable message",
  "details": "Additional details (optional)"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `413` - Payload Too Large (file size)
- `415` - Unsupported Media Type (not DOCX)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

## Security Features

- **File Validation**: Only DOCX files accepted
- **File Size Limits**: Configurable maximum file size
- **Rate Limiting**: Prevent API abuse
- **CORS Protection**: Configurable allowed origins
- **Input Validation**: Zod schema validation
- **Error Sanitization**: No sensitive data in error responses

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY storage ./storage
EXPOSE 4000
CMD ["npm", "start"]
```

### Environment Configuration

For production, update environment variables:

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-frontend-domain.com
DATABASE_URL=/app/data/app.db
```

## Troubleshooting

### Common Issues

1. **File Upload Errors**: Check file size limits and CORS settings
2. **Database Errors**: Ensure SQLite file permissions are correct
3. **DOCX Processing**: Verify template has valid placeholder syntax
4. **Memory Issues**: Large DOCX files may need increased Node.js memory

### Development Tips

- Use `npm run db:studio` to inspect database visually
- Check logs for detailed error information
- Test with sample DOCX files from `tests/samples/`
- Use Postman collection for API testing

## Performance Optimization

- **File Caching**: Templates are cached after first parse
- **Database Indexing**: Optimized queries for template lookup
- **Memory Management**: Efficient buffer handling for large files
- **Concurrent Processing**: Multiple template operations supported

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Run linting and tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details