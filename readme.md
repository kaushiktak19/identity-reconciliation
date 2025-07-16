# Identity Reconciliation Service

A web service that identifies and links customer contacts across multiple purchases using email and phone number matching.

## Live Endpoint
```
POST https://identity-reconciliation-ycvd.onrender.com/identify/
```

## Problem Statement
FluxKart.com needs to identify returning customers who use different email addresses and phone numbers for different purchases. The service consolidates contact information to provide a unified customer identity.

## Solution Approach

### Database Design
- **Contact Table**: Stores customer contact information with linking capabilities
- **Primary/Secondary Structure**: Oldest contact becomes primary, newer related contacts become secondary
- **Linking Logic**: Contacts are linked if they share either email OR phone number

### Core Algorithm
1. **Search**: Find existing contacts matching input email/phone
2. **Create**: If no matches, create new primary contact
3. **Link**: If partial match, create secondary contact linked to primary
4. **Merge**: If request connects separate primary contacts, merge groups (older stays primary)
5. **Consolidate**: Return unified view of all linked contacts

### Key Features
- Handles email-only and phone-only requests
- Maintains chronological primary contact precedence
- Consolidates separate contact groups when connections discovered
- Ensures data consistency through proper linking

## API Specification

### Request
```json
POST /identify
Content-Type: application/json

{
  "email"?: string,
  "phoneNumber"?: string
}
```

### Response
```json
{
  "contact": {
    "primaryContatctId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}
```

## Test Cases

### TC1: New Contact
**Request:**
```json
{"email": "doc@flux.com", "phoneNumber": "123456"}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@flux.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

### TC2: Exact Match
**Request:**
```json
{"email": "doc@flux.com", "phoneNumber": "123456"}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@flux.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

### TC3: New Email, Same Phone
**Request:**
```json
{"email": "doc2@flux.com", "phoneNumber": "123456"}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@flux.com", "doc2@flux.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

### TC4: Same Email, New Phone
**Request:**
```json
{"email": "doc@flux.com", "phoneNumber": "789012"}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@flux.com", "doc2@flux.com"],
    "phoneNumbers": ["123456", "789012"],
    "secondaryContactIds": [2, 3]
  }
}
```

### TC5: Email(existing) Only Query
**Request:**
```json
{"email": "doc@flux.com"}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@flux.com", "doc2@flux.com"],
    "phoneNumbers": ["123456", "789012"],
    "secondaryContactIds": [2, 3]
  }
}
```

### TC6: Phone(existing) Only Query
**Request:**
```json
{"phoneNumber": "123456"}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@flux.com", "doc2@flux.com"],
    "phoneNumbers": ["123456", "789012"],
    "secondaryContactIds": [2, 3]
  }
}
```

### TC7: Create Separate Primary
**Request:**
```json
{"email": "other@flux.com", "phoneNumber": "999999"}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 4,
    "emails": ["other@flux.com"],
    "phoneNumbers": ["999999"],
    "secondaryContactIds": []
  }
}
```

### TC8: Merge Primary Contacts
**Request:**
```json
{"email": "doc@flux.com", "phoneNumber": "999999"}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@flux.com", "doc2@flux.com", "other@flux.com"],
    "phoneNumbers": ["123456", "789012", "999999"],
    "secondaryContactIds": [2, 3, 4, 5]
  }
}
```

### TC9: Email Only Query
**Request:**
```json
{"email": "otherdoc@flux.com"}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 6,
    "emails": ["otherdoc@flux.com"],
    "phoneNumbers": [],
    "secondaryContactIds": []
  }
}
```

### TC10: Phone Only Query
**Request:**
```json
{"phoneNumber": "176734"}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 7,
    "emails": ["otherdoc@flux.com"],
    "phoneNumbers": [],
    "secondaryContactIds": []
  }
}
```

## Technology Stack
- **Backend**: Node.js with TypeScript
- **Database**: PostgreSQL (Supabase)
- **Framework**: Express.js
- **Deployment**: Render.com

## Database Schema
```sql
CREATE TABLE Contact (
  id SERIAL PRIMARY KEY,
  phoneNumber TEXT,
  email TEXT,
  linkedId INT,
  linkPrecedence TEXT CHECK (linkPrecedence IN ('primary', 'secondary')) NOT NULL,
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW(),
  deletedAt TIMESTAMPTZ
);
```

## Setup Instructions
1. Clone repository
2. Install dependencies: `npm install`
3. Set up PostgreSQL database
4. Configure environment variables
5. Run: `npm start`
