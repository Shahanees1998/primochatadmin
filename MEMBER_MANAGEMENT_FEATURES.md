# Member Management Features

## Overview
The member management system now includes enhanced features for adding individual members and bulk uploading multiple members via CSV.

## Individual Member Management

### Adding a New Member
1. Click the "Add Member" button in the Member Management page
2. Fill in the required fields:
   - **First Name** (required)
   - **Last Name** (required)
   - **Email** (required)
   - **Phone** (optional)
   - **Member ID** (optional - leave blank for auto-generation)
   - **Status** (required - PENDING, ACTIVE, INACTIVE, DEACTIVATED)
   - **Join Date** (optional)
   - **Paid Date** (optional - only for editing existing members)
   - **Password** (optional - leave blank for default password)

### Member ID Field
- The Member ID field allows administrators to specify a custom membership number
- If left blank, the system will automatically generate a unique membership number in the format `primoXXXX`
- Member IDs must be unique across all members
- The field is optional and can be left empty for auto-generation

### Editing Members
- Click the edit icon next to any member to modify their information
- All fields can be updated except for the password (password changes are handled separately)
- Member ID can be changed, but must remain unique

## Bulk Upload via CSV

### Overview
The bulk upload feature allows administrators to add multiple members at once using a CSV file.

### CSV Format
The CSV file should include the following columns (headers are case-insensitive):

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| firstname | Yes | Member's first name | John |
| lastname | Yes | Member's last name | Doe |
| email | Yes | Member's email address | john.doe@example.com |
| phone | No | Member's phone number | +1234567890 |
| status | No | Member status (PENDING, ACTIVE, INACTIVE, DEACTIVATED) | PENDING |
| membershipnumber | No | Custom member ID (leave blank for auto-generation) | primo1234 |
| joindate | No | Join date in YYYY-MM-DD format | 2024-01-15 |
| paiddate | No | Paid date in YYYY-MM-DD format | 2024-01-15 |

### Using Bulk Upload
1. Click the "Bulk Upload" button in the Member Management page
2. Download the CSV template to understand the correct format
3. Prepare your CSV file with member data
4. Click "Choose CSV File" and select your file
5. Review the preview and validation results
6. Click "Upload Members" to process the file

### Validation
The system validates the CSV file for:
- Required fields (firstname, lastname, email)
- Email format validation
- Column count consistency
- Duplicate email addresses (within the file)

### Upload Process
- Members are processed one by one with progress indication
- Successful uploads are immediately added to the member list
- Failed uploads are logged with error details
- The system continues processing even if some records fail

### CSV Template
A template file is available at `/public/member_upload_template.csv` with example data showing the correct format.

## Error Handling

### Individual Member Errors
- Validation errors are shown in toast notifications
- Required field validation
- Email format validation
- Duplicate email/membership number validation

### Bulk Upload Errors
- CSV parsing errors are displayed in the upload dialog
- Individual record errors are logged to the browser console
- Progress bar shows upload completion status
- Success/failure counts are displayed after completion

## Best Practices

### For Individual Members
- Always verify email addresses before adding
- Use descriptive member IDs when manually assigning
- Set appropriate status based on membership status
- Include join dates for accurate record keeping

### For Bulk Uploads
- Test with a small file first
- Ensure all required fields are filled
- Use consistent date formats (YYYY-MM-DD)
- Verify email addresses are valid and unique
- Check for duplicate membership numbers if manually assigning

## Technical Notes

### Auto-Generated Member IDs
- Format: `primoXXXX` where XXXX is a random 4-digit number
- System ensures uniqueness across all members
- Retry logic handles potential conflicts

### CSV Processing
- File size limit: 1MB
- Supported format: CSV only
- Encoding: UTF-8 recommended
- Line endings: CRLF or LF supported

### Performance
- Bulk uploads process members sequentially to avoid database conflicts
- Progress is shown in real-time
- Large files may take several minutes to process
- Browser remains responsive during upload 