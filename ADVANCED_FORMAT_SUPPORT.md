# Advanced Placeholder Format Support

## Overview
Your DynamicFormGen system **already supports** the advanced placeholder format with pipes and parameters! This document explains how to use this powerful feature.

## Supported Format
```
{{ variableName | parameter1=value1 | parameter2=value2 | ... }}
```

## ✅ **YES, We Handle This Format!**

All your examples are **fully supported**:

### 1. Image with Dimensions
```
{{ logo | type=image | width=120 | height=40 }}
```
**Parsed as:**
```json
{
  "key": "logo",
  "type": "image",
  "width": 120,
  "height": 40
}
```

### 2. Number with Constraints
```
{{ salary | type=number | min=0 | step=0.01 }}
```
**Parsed as:**
```json
{
  "key": "salary",
  "type": "number",
  "min": 0,
  "step": 0.01
}
```

### 3. Text with Label and Required
```
{{ employeeName | type=text | label="Employee Name" | required }}
```
**Parsed as:**
```json
{
  "key": "employeeName",
  "type": "text",
  "label": "Employee Name",
  "required": true
}
```

### 4. Date Field
```
{{ hireDate | type=date }}
```
**Parsed as:**
```json
{
  "key": "hireDate",
  "type": "date"
}
```

### 5. Select with Options and Default
```
{{ gender | type=select | options="Male,Female,Other" | default="Male" }}
```
**Parsed as:**
```json
{
  "key": "gender",
  "type": "select",
  "options": ["Male", "Female", "Other"],
  "default": "Male"
}
```

## Supported Parameters

### Field Type Parameters
| Parameter | Values | Description |
|-----------|--------|-------------|
| `type` | `text`, `number`, `date`, `select`, `image` | Specifies the field type |

### Text Field Parameters
| Parameter | Values | Description |
|-----------|--------|-------------|
| `label` | `"Custom Label"` | Custom label for the field |
| `required` | `true`, `false` (or just `required`) | Makes field required |
| `maxLength` | `number` | Maximum character length |

### Number Field Parameters
| Parameter | Values | Description |
|-----------|--------|-------------|
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |
| `step` | `number` | Step increment (e.g., 0.01 for currency) |

### Select Field Parameters
| Parameter | Values | Description |
|-----------|--------|-------------|
| `options` | `"option1,option2,option3"` | Comma-separated options |
| `default` | `"default value"` | Default selected option |

### Image Field Parameters
| Parameter | Values | Description |
|-----------|--------|-------------|
| `width` | `number` | Image width in pixels |
| `height` | `number` | Image height in pixels |

## Complete Examples

### Employee Information Form
```
Employee Name: {{ employeeName | type=text | label="Employee Name" | required }}
Email: {{ email | type=text | label="Email Address" | required }}
Salary: {{ salary | type=number | min=0 | step=0.01 | label="Annual Salary" }}
Hire Date: {{ hireDate | type=date | label="Date of Hire" }}
Department: {{ department | type=select | options="HR,IT,Finance,Marketing" | default="IT" }}
Profile Picture: {{ profilePic | type=image | width=200 | height=200 }}
```

### Invoice Template
```
Invoice Number: {{ invoiceNumber | type=text | label="Invoice #" | required }}
Client Name: {{ clientName | type=text | label="Client Name" | required }}
Amount: {{ amount | type=number | min=0 | step=0.01 | label="Invoice Amount" }}
Due Date: {{ dueDate | type=date | label="Due Date" }}
Status: {{ status | type=select | options="Pending,Paid,Overdue" | default="Pending" }}
Company Logo: {{ logo | type=image | width=120 | height=40 }}
```

### Dependencies Section (Array/Loop)
```
{# dependents }
- {{ name | type=text | label="Dependent Name" }} ({{ relation | type=select | options="Spouse,Child,Other" | default="Child" }})
{/ dependents }
```

## Auto-Type Inference

If you don't specify a `type`, the system automatically infers the type based on the field name:

| Field Name Pattern | Inferred Type | Example |
|-------------------|---------------|---------|
| Contains "email" or "mail" | `text` with `email` format | `{{ userEmail }}` |
| Contains "date", "birth", "hire" | `date` | `{{ birthDate }}` |
| Contains "salary", "amount", "price" | `number` | `{{ totalAmount }}` |
| Contains "logo", "image", "photo" | `image` | `{{ companyLogo }}` |
| Contains "description", "comment" | `text` with `maxLength: 500` | `{{ jobDescription }}` |

## Usage in DOCX Templates

1. **Create your DOCX template** with placeholders using the advanced format
2. **Upload the template** to your system
3. **The system automatically parses** all placeholders and their parameters
4. **Generate dynamic forms** based on the parsed specifications
5. **Render documents** with user-provided data

## Testing Your Templates

You can test the parsing logic by running:
```bash
npx ts-node src/modules/templates/format-parser-test.ts
```

This will show you exactly how each placeholder is parsed and what parameters are extracted.

## Backward Compatibility

The system also supports the simple format:
```
{ variableName }
```

Both formats work together in the same document!

## Implementation Details

The parsing logic is implemented in `src/modules/templates/docx-parser.ts` in the `parsePlaceholder` method. It uses regex patterns to:

1. **Extract the variable name** from between `{{` and `}}`
2. **Parse pipe-separated parameters** using `|`
3. **Handle quoted and unquoted values** for parameters
4. **Convert parameters to appropriate data types** (numbers, booleans, arrays)
5. **Apply type inference** when no type is specified

## Error Handling

The parser gracefully handles:
- **Malformed placeholders** (skips them)
- **Invalid parameter values** (uses defaults)
- **Missing parameters** (uses inferred values)
- **Mixed formats** (supports both `{{}}` and `{}` in same document)

---

## 🎉 **Conclusion**

**YES, your system already handles the advanced format perfectly!** 

All your examples work out of the box:
- ✅ `{{ logo | type=image | width=120 | height=40 }}`
- ✅ `{{ salary | type=number | min=0 | step=0.01 }}`
- ✅ `{{ employeeName | type=text | label="Employee Name" | required }}`
- ✅ `{{ hireDate | type=date }}`
- ✅ `{{ gender | type=select | options="Male,Female,Other" | default="Male" }}`

Just create your DOCX templates with these placeholders and upload them to your system!
