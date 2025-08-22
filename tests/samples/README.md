# Sample Templates

This directory contains sample DOCX templates for testing the Smart Document Template Generator.

## Templates

### employment_offer_en.docx
A sample employment offer letter template with various field types:
- Text fields (employee name, position, department)
- Number fields (salary, bonus)
- Date fields (start date, offer expiry)
- Select fields (employment type, benefits tier)
- Image field (company logo)

### benefit_en_ar.docx
A benefits enrollment form with mixed language support:
- Text fields in both English and Arabic
- Select fields for benefit options
- Array/loop fields for dependents
- Conditional sections

## Usage

1. Upload these templates using the web interface
2. Test the form generation and validation
3. Verify the rendered output matches expectations

## Placeholder Examples

### Basic Fields
```
{{ employeeName | type=text | label="Employee Name" | required }}
{{ salary | type=number | min=0 | step=0.01 }}
{{ startDate | type=date }}
{{ employmentType | type=select | options="Full-time,Part-time,Contract" }}
{{ companyLogo | type=image | width=120 | height=40 }}
```

### Array/Loop Fields
```
{# dependents }
- {{ name | type=text | label="Dependent Name" }}
- {{ relationship | type=select | options="Spouse,Child,Parent" }}
{/ dependents }
```

## Testing

Run the backend tests to verify template parsing:
```bash
npm run test
```
