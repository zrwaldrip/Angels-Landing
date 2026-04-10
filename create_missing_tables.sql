-- ============================================================
-- Angels Landing v2 — Missing Supabase Tables
-- Run this in the Supabase SQL editor to fix the 500 errors.
-- Column names are PascalCase to match the C# EF Core models.
-- ============================================================

-- Partners
CREATE TABLE IF NOT EXISTS "Partners" (
    "PartnerId"   SERIAL PRIMARY KEY,
    "PartnerName" TEXT,
    "PartnerType" TEXT,
    "RoleType"    TEXT,
    "ContactName" TEXT,
    "Email"       TEXT,
    "Phone"       TEXT,
    "Region"      TEXT,
    "Status"      TEXT,
    "StartDate"   TEXT,
    "EndDate"     TEXT,
    "Notes"       TEXT
);

-- ProcessRecordings
CREATE TABLE IF NOT EXISTS "ProcessRecordings" (
    "RecordingId"             SERIAL PRIMARY KEY,
    "ResidentId"              INTEGER,
    "SessionDate"             TEXT,
    "SocialWorker"            TEXT,
    "SessionType"             TEXT,
    "SessionDurationMinutes"  INTEGER,
    "EmotionalStateObserved"  TEXT,
    "EmotionalStateEnd"       TEXT,
    "SessionNarrative"        TEXT,
    "InterventionsApplied"    TEXT,
    "FollowUpActions"         TEXT,
    "ProgressNoted"           BOOLEAN,
    "ConcernsFlagged"         BOOLEAN,
    "ReferralMade"            BOOLEAN,
    "NotesRestricted"         TEXT
);

-- HomeVisitations
CREATE TABLE IF NOT EXISTS "HomeVisitations" (
    "VisitationId"           SERIAL PRIMARY KEY,
    "ResidentId"             INTEGER,
    "VisitDate"              TEXT,
    "SocialWorker"           TEXT,
    "VisitType"              TEXT,
    "LocationVisited"        TEXT,
    "FamilyMembersPresent"   TEXT,
    "Purpose"                TEXT,
    "Observations"           TEXT,
    "FamilyCooperationLevel" TEXT,
    "SafetyConcernsNoted"    BOOLEAN,
    "FollowUpNeeded"         BOOLEAN,
    "FollowUpNotes"          TEXT,
    "VisitOutcome"           TEXT
);

-- IncidentReports
CREATE TABLE IF NOT EXISTS "IncidentReports" (
    "IncidentId"      SERIAL PRIMARY KEY,
    "ResidentId"      INTEGER,
    "SafehouseId"     INTEGER,
    "IncidentDate"    TEXT,
    "IncidentType"    TEXT,
    "Severity"        TEXT,
    "Description"     TEXT,
    "ResponseTaken"   TEXT,
    "Resolved"        BOOLEAN,
    "ResolutionDate"  TEXT,
    "ReportedBy"      TEXT,
    "FollowUpRequired" BOOLEAN
);

-- ============================================================
-- Additional tables likely also missing (same root cause).
-- Uncomment and run whichever ones you need.
-- ============================================================

-- Supporters
-- CREATE TABLE IF NOT EXISTS "Supporters" (
--     "SupporterId"         SERIAL PRIMARY KEY,
--     "SupporterType"       TEXT,
--     "DisplayName"         TEXT,
--     "OrganizationName"    TEXT,
--     "FirstName"           TEXT,
--     "LastName"            TEXT,
--     "RelationshipType"    TEXT,
--     "Region"              TEXT,
--     "Country"             TEXT,
--     "Email"               TEXT,
--     "Phone"               TEXT,
--     "Status"              TEXT,
--     "FirstDonationDate"   TEXT,
--     "AcquisitionChannel"  TEXT,
--     "CreatedAt"           TEXT
-- );

-- PartnerAssignments
-- CREATE TABLE IF NOT EXISTS "PartnerAssignments" (
--     "AssignmentId"        SERIAL PRIMARY KEY,
--     "PartnerId"           INTEGER,
--     "SafehouseId"         INTEGER,
--     "ProgramArea"         TEXT,
--     "AssignmentStart"     TEXT,
--     "AssignmentEnd"       TEXT,
--     "ResponsibilityNotes" TEXT,
--     "IsPrimary"           BOOLEAN,
--     "Status"              TEXT
-- );

-- InKindDonationItems
-- CREATE TABLE IF NOT EXISTS "InKindDonationItems" (
--     "ItemId"               SERIAL PRIMARY KEY,
--     "DonationId"           INTEGER,
--     "ItemName"             TEXT,
--     "ItemCategory"         TEXT,
--     "Quantity"             INTEGER,
--     "UnitOfMeasure"        TEXT,
--     "EstimatedUnitValue"   DOUBLE PRECISION,
--     "IntendedUse"          TEXT,
--     "ReceivedCondition"    TEXT
-- );

-- DonationAllocations
-- CREATE TABLE IF NOT EXISTS "DonationAllocations" (
--     "AllocationId"     SERIAL PRIMARY KEY,
--     "DonationId"       INTEGER,
--     "SafehouseId"      INTEGER,
--     "ProgramArea"      TEXT,
--     "AmountAllocated"  DOUBLE PRECISION,
--     "AllocationDate"   TEXT,
--     "AllocationNotes"  TEXT
-- );

-- EducationRecords
-- CREATE TABLE IF NOT EXISTS "EducationRecords" (
--     "EducationRecordId" SERIAL PRIMARY KEY,
--     "ResidentId"        INTEGER,
--     "RecordDate"        TEXT,
--     "EducationLevel"    TEXT,
--     "SchoolName"        TEXT,
--     "EnrollmentStatus"  TEXT,
--     "AttendanceRate"    DOUBLE PRECISION,
--     "ProgressPercent"   DOUBLE PRECISION,
--     "CompletionStatus"  TEXT,
--     "Notes"             TEXT
-- );

-- HealthWellbeingRecords
-- NOTE: C# model uses SleepQualityScore / EnergyLevelScore — NOT SleepScore / EnergyScore.
-- Make sure your Supabase columns match these names exactly.
-- CREATE TABLE IF NOT EXISTS "HealthWellbeingRecords" (
--     "HealthRecordId"           SERIAL PRIMARY KEY,
--     "ResidentId"               INTEGER,
--     "RecordDate"               TEXT,
--     "GeneralHealthScore"       DOUBLE PRECISION,
--     "NutritionScore"           DOUBLE PRECISION,
--     "SleepQualityScore"        DOUBLE PRECISION,
--     "EnergyLevelScore"         DOUBLE PRECISION,
--     "HeightCm"                 DOUBLE PRECISION,
--     "WeightKg"                 DOUBLE PRECISION,
--     "Bmi"                      DOUBLE PRECISION,
--     "MedicalCheckupDone"       BOOLEAN,
--     "DentalCheckupDone"        BOOLEAN,
--     "PsychologicalCheckupDone" BOOLEAN,
--     "Notes"                    TEXT
-- );

-- InterventionPlans
-- CREATE TABLE IF NOT EXISTS "InterventionPlans" (
--     "PlanId"               SERIAL PRIMARY KEY,
--     "ResidentId"           INTEGER,
--     "PlanCategory"         TEXT,
--     "PlanDescription"      TEXT,
--     "ServicesProvided"     TEXT,
--     "TargetValue"          TEXT,
--     "TargetDate"           TEXT,
--     "Status"               TEXT,
--     "CaseConferenceDate"   TEXT,
--     "CreatedAt"            TEXT,
--     "UpdatedAt"            TEXT
-- );

-- SafehouseMonthlyMetrics
-- CREATE TABLE IF NOT EXISTS "SafehouseMonthlyMetrics" (
--     "MetricId"                  SERIAL PRIMARY KEY,
--     "SafehouseId"               INTEGER,
--     "MonthStart"                TEXT,
--     "MonthEnd"                  TEXT,
--     "ActiveResidents"           INTEGER,
--     "AvgEducationProgress"      DOUBLE PRECISION,
--     "AvgHealthScore"            DOUBLE PRECISION,
--     "ProcessRecordingCount"     INTEGER,
--     "HomeVisitationCount"       INTEGER,
--     "IncidentCount"             INTEGER,
--     "Notes"                     TEXT
-- );
