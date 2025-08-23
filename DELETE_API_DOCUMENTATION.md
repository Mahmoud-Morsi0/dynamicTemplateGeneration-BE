# Delete Template API Documentation

## Overview
The delete template API provides two endpoints for deleting templates and template versions. Both endpoints require authentication via JWT token.

## Authentication
All delete endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. Delete Template (All Versions)

### Endpoint
```
DELETE /api/templates/:templateId
```

### Request Structure

#### Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### URL Parameters
- `templateId` (string, required): The unique identifier of the template to delete

#### Example Request
```bash
curl -X DELETE "http://localhost:4000/api/templates/78cfbf22-5452-4d13-9e3e-7b4d0a7917cc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Response Structure

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Template deleted successfully",
  "data": {
    "templateId": "78cfbf22-5452-4d13-9e3e-7b4d0a7917cc",
    "versionsDeleted": 3
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**404 Not Found**
```json
{
  "error": "Template not found or access denied"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to delete template",
  "message": "Database connection error"
}
```

---

## 2. Delete Template Version

### Endpoint
```
DELETE /api/templates/:templateId/version/:version
```

### Request Structure

#### Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### URL Parameters
- `templateId` (string, required): The unique identifier of the template
- `version` (number, required): The version number to delete

#### Example Request
```bash
curl -X DELETE "http://localhost:4000/api/templates/78cfbf22-5452-4d13-9e3e-7b4d0a7917cc/version/1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Response Structure

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Template version deleted successfully",
  "data": {
    "templateId": "78cfbf22-5452-4d13-9e3e-7b4d0a7917cc",
    "version": 1,
    "templateDeleted": false
  }
}
```

**Note**: If this was the last version of the template, `templateDeleted` will be `true` and the main template record will also be deleted.

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid version number"
}
```

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**404 Not Found**
```json
{
  "error": "Template version not found or access denied"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to delete template version",
  "message": "File system error"
}
```

---

## Behavior Details

### Delete Template (All Versions)
1. **Authentication Check**: Verifies the JWT token and user identity
2. **Template Retrieval**: Fetches all versions of the template for the authenticated user
3. **File Deletion**: Deletes all physical template files from storage
4. **Database Cleanup**: Removes all template versions and the main template record
5. **Response**: Returns success with count of deleted versions

### Delete Template Version
1. **Authentication Check**: Verifies the JWT token and user identity
2. **Version Validation**: Validates the version number format
3. **Version Retrieval**: Fetches the specific template version
4. **File Deletion**: Deletes the physical template file
5. **Database Cleanup**: Removes the specific version record
6. **Template Cleanup**: If no versions remain, deletes the main template record
7. **Response**: Returns success with deletion details

### Security Features
- **User Isolation**: Users can only delete their own templates
- **Authentication Required**: All endpoints require valid JWT tokens
- **Parameter Validation**: Version numbers are validated before processing
- **Error Handling**: Graceful handling of file system and database errors

### File System Operations
- **Physical File Deletion**: Template files are removed from the `storage/templates/` directory
- **Error Tolerance**: Database operations continue even if file deletion fails
- **Logging**: All file operations are logged for debugging purposes

---

## Frontend Integration Examples

### JavaScript/TypeScript
```typescript
// Delete entire template
const deleteTemplate = async (templateId: string) => {
  const response = await fetch(`/api/templates/${templateId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  if (result.success) {
    console.log(`Deleted ${result.data.versionsDeleted} versions`);
  }
};

// Delete specific version
const deleteTemplateVersion = async (templateId: string, version: number) => {
  const response = await fetch(`/api/templates/${templateId}/version/${version}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  if (result.success) {
    console.log(`Version ${version} deleted`);
    if (result.data.templateDeleted) {
      console.log('Template also deleted (no versions remaining)');
    }
  }
};
```

### React Hook Example
```typescript
const useDeleteTemplate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteTemplate = async (templateId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete template');
      }
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteTemplate, loading, error };
};
```
