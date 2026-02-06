

## LeMaitre Partner Portal — Phase 1

### Overview
A clean, minimal portal for **recovery partners** to submit donor information and upload documents, with **LeMaitre staff** reviewing and approving first-level screenings.

---

### Users & Roles

| Role | What They Do |
|------|--------------|
| **Admin** (LeMaitre Staff) | Create partner accounts, review submissions, approve/reject screenings |
| **Partner** (Recovery Partners) | Create donors, fill screening forms, upload documents |

---

### Features

**1. Authentication**
- Admin creates partner login credentials
- Role-based access (different dashboards for admin vs partner)
- Secure login with email/password

**2. Partner Dashboard**
- List of their submitted donors
- Status tracking: Draft → Submitted → Under Review → Approved/Rejected
- Quick "Add New Donor" button

**3. Donor Creation & Forms**
- Create new donor record
- Structured screening form (the questions currently asked on phone)
- Save as draft or submit for review
- Edit until submitted

**4. Document Upload**
- Upload files against each donor (medical records, consent forms, etc.)
- View/download uploaded documents
- Multiple files per donor

**5. Admin Panel**
- View all partners and their submissions
- Create/manage partner accounts
- Review submitted donors
- Approve or reject with notes
- Filter by status/partner

**6. In-App Notifications**
- Partners see when their submissions are reviewed
- Admins see new submissions requiring attention

---

### Tech Stack
- **Frontend**: React + Tailwind (clean, minimal UI)
- **Backend**: Supabase (auth, database, file storage)
- **No external integrations needed for Phase 1**

---

### Database Structure
- Users with roles (admin/partner)
- Partners table (organization details)
- Donors table (linked to partner)
- Documents table (linked to donor)
- Screening form responses
- Status history/audit log

---

### What's NOT in Phase 1 (Future)
- AI-assisted screening with rule engine
- Retell voice integration
- Email notifications
- Corrections tracking for AI learning

