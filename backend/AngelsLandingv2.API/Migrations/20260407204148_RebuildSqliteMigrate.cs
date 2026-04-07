using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AngelsLandingv2.API.Migrations
{
    /// <inheritdoc />
    public partial class RebuildSqliteMigrate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DonationAllocations",
                columns: table => new
                {
                    AllocationId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DonationId = table.Column<int>(type: "INTEGER", nullable: true),
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: true),
                    ProgramArea = table.Column<string>(type: "TEXT", nullable: true),
                    AmountAllocated = table.Column<double>(type: "REAL", nullable: true),
                    AllocationDate = table.Column<string>(type: "TEXT", nullable: true),
                    AllocationNotes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DonationAllocations", x => x.AllocationId);
                });

            migrationBuilder.CreateTable(
                name: "Donations",
                columns: table => new
                {
                    DonationId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SupporterId = table.Column<int>(type: "INTEGER", nullable: true),
                    DonationType = table.Column<string>(type: "TEXT", nullable: true),
                    DonationDate = table.Column<string>(type: "TEXT", nullable: true),
                    IsRecurring = table.Column<bool>(type: "INTEGER", nullable: true),
                    CampaignName = table.Column<string>(type: "TEXT", nullable: true),
                    ChannelSource = table.Column<string>(type: "TEXT", nullable: true),
                    CurrencyCode = table.Column<string>(type: "TEXT", nullable: true),
                    Amount = table.Column<double>(type: "REAL", nullable: true),
                    EstimatedValue = table.Column<double>(type: "REAL", nullable: true),
                    ImpactUnit = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    ReferralPostId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Donations", x => x.DonationId);
                });

            migrationBuilder.CreateTable(
                name: "EducationRecords",
                columns: table => new
                {
                    EducationRecordId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: true),
                    RecordDate = table.Column<string>(type: "TEXT", nullable: true),
                    EducationLevel = table.Column<string>(type: "TEXT", nullable: true),
                    SchoolName = table.Column<string>(type: "TEXT", nullable: true),
                    EnrollmentStatus = table.Column<string>(type: "TEXT", nullable: true),
                    AttendanceRate = table.Column<double>(type: "REAL", nullable: true),
                    ProgressPercent = table.Column<double>(type: "REAL", nullable: true),
                    CompletionStatus = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EducationRecords", x => x.EducationRecordId);
                });

            migrationBuilder.CreateTable(
                name: "HealthWellbeingRecords",
                columns: table => new
                {
                    HealthRecordId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: true),
                    RecordDate = table.Column<string>(type: "TEXT", nullable: true),
                    GeneralHealthScore = table.Column<double>(type: "REAL", nullable: true),
                    NutritionScore = table.Column<double>(type: "REAL", nullable: true),
                    SleepQualityScore = table.Column<double>(type: "REAL", nullable: true),
                    EnergyLevelScore = table.Column<double>(type: "REAL", nullable: true),
                    HeightCm = table.Column<double>(type: "REAL", nullable: true),
                    WeightKg = table.Column<double>(type: "REAL", nullable: true),
                    Bmi = table.Column<double>(type: "REAL", nullable: true),
                    MedicalCheckupDone = table.Column<bool>(type: "INTEGER", nullable: true),
                    DentalCheckupDone = table.Column<bool>(type: "INTEGER", nullable: true),
                    PsychologicalCheckupDone = table.Column<bool>(type: "INTEGER", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HealthWellbeingRecords", x => x.HealthRecordId);
                });

            migrationBuilder.CreateTable(
                name: "HomeVisitations",
                columns: table => new
                {
                    VisitationId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: true),
                    VisitDate = table.Column<string>(type: "TEXT", nullable: true),
                    SocialWorker = table.Column<string>(type: "TEXT", nullable: true),
                    VisitType = table.Column<string>(type: "TEXT", nullable: true),
                    LocationVisited = table.Column<string>(type: "TEXT", nullable: true),
                    FamilyMembersPresent = table.Column<string>(type: "TEXT", nullable: true),
                    Purpose = table.Column<string>(type: "TEXT", nullable: true),
                    Observations = table.Column<string>(type: "TEXT", nullable: true),
                    FamilyCooperationLevel = table.Column<string>(type: "TEXT", nullable: true),
                    SafetyConcernsNoted = table.Column<bool>(type: "INTEGER", nullable: true),
                    FollowUpNeeded = table.Column<bool>(type: "INTEGER", nullable: true),
                    FollowUpNotes = table.Column<string>(type: "TEXT", nullable: true),
                    VisitOutcome = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HomeVisitations", x => x.VisitationId);
                });

            migrationBuilder.CreateTable(
                name: "IncidentReports",
                columns: table => new
                {
                    IncidentId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: true),
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: true),
                    IncidentDate = table.Column<string>(type: "TEXT", nullable: true),
                    IncidentType = table.Column<string>(type: "TEXT", nullable: true),
                    Severity = table.Column<string>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    ResponseTaken = table.Column<string>(type: "TEXT", nullable: true),
                    Resolved = table.Column<bool>(type: "INTEGER", nullable: true),
                    ResolutionDate = table.Column<string>(type: "TEXT", nullable: true),
                    ReportedBy = table.Column<string>(type: "TEXT", nullable: true),
                    FollowUpRequired = table.Column<bool>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncidentReports", x => x.IncidentId);
                });

            migrationBuilder.CreateTable(
                name: "InKindDonationItems",
                columns: table => new
                {
                    ItemId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DonationId = table.Column<int>(type: "INTEGER", nullable: true),
                    ItemName = table.Column<string>(type: "TEXT", nullable: true),
                    ItemCategory = table.Column<string>(type: "TEXT", nullable: true),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: true),
                    UnitOfMeasure = table.Column<string>(type: "TEXT", nullable: true),
                    EstimatedUnitValue = table.Column<double>(type: "REAL", nullable: true),
                    IntendedUse = table.Column<string>(type: "TEXT", nullable: true),
                    ReceivedCondition = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InKindDonationItems", x => x.ItemId);
                });

            migrationBuilder.CreateTable(
                name: "InterventionPlans",
                columns: table => new
                {
                    PlanId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: true),
                    PlanCategory = table.Column<string>(type: "TEXT", nullable: true),
                    PlanDescription = table.Column<string>(type: "TEXT", nullable: true),
                    ServicesProvided = table.Column<string>(type: "TEXT", nullable: true),
                    TargetValue = table.Column<string>(type: "TEXT", nullable: true),
                    TargetDate = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: true),
                    CaseConferenceDate = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedAt = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterventionPlans", x => x.PlanId);
                });

            migrationBuilder.CreateTable(
                name: "PartnerAssignments",
                columns: table => new
                {
                    AssignmentId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PartnerId = table.Column<int>(type: "INTEGER", nullable: true),
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: true),
                    ProgramArea = table.Column<string>(type: "TEXT", nullable: true),
                    AssignmentStart = table.Column<string>(type: "TEXT", nullable: true),
                    AssignmentEnd = table.Column<string>(type: "TEXT", nullable: true),
                    ResponsibilityNotes = table.Column<string>(type: "TEXT", nullable: true),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartnerAssignments", x => x.AssignmentId);
                });

            migrationBuilder.CreateTable(
                name: "Partners",
                columns: table => new
                {
                    PartnerId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PartnerName = table.Column<string>(type: "TEXT", nullable: true),
                    PartnerType = table.Column<string>(type: "TEXT", nullable: true),
                    RoleType = table.Column<string>(type: "TEXT", nullable: true),
                    ContactName = table.Column<string>(type: "TEXT", nullable: true),
                    Email = table.Column<string>(type: "TEXT", nullable: true),
                    Phone = table.Column<string>(type: "TEXT", nullable: true),
                    Region = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: true),
                    StartDate = table.Column<string>(type: "TEXT", nullable: true),
                    EndDate = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Partners", x => x.PartnerId);
                });

            migrationBuilder.CreateTable(
                name: "ProcessRecordings",
                columns: table => new
                {
                    RecordingId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: true),
                    SessionDate = table.Column<string>(type: "TEXT", nullable: true),
                    SocialWorker = table.Column<string>(type: "TEXT", nullable: true),
                    SessionType = table.Column<string>(type: "TEXT", nullable: true),
                    SessionDurationMinutes = table.Column<int>(type: "INTEGER", nullable: true),
                    EmotionalStateObserved = table.Column<string>(type: "TEXT", nullable: true),
                    EmotionalStateEnd = table.Column<string>(type: "TEXT", nullable: true),
                    SessionNarrative = table.Column<string>(type: "TEXT", nullable: true),
                    InterventionsApplied = table.Column<string>(type: "TEXT", nullable: true),
                    FollowUpActions = table.Column<string>(type: "TEXT", nullable: true),
                    ProgressNoted = table.Column<bool>(type: "INTEGER", nullable: true),
                    ConcernsFlagged = table.Column<bool>(type: "INTEGER", nullable: true),
                    ReferralMade = table.Column<bool>(type: "INTEGER", nullable: true),
                    NotesRestricted = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessRecordings", x => x.RecordingId);
                });

            migrationBuilder.CreateTable(
                name: "PublicImpactSnapshots",
                columns: table => new
                {
                    SnapshotId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SnapshotDate = table.Column<string>(type: "TEXT", nullable: true),
                    Headline = table.Column<string>(type: "TEXT", nullable: true),
                    SummaryText = table.Column<string>(type: "TEXT", nullable: true),
                    MetricPayloadJson = table.Column<string>(type: "TEXT", nullable: true),
                    IsPublished = table.Column<bool>(type: "INTEGER", nullable: true),
                    PublishedAt = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicImpactSnapshots", x => x.SnapshotId);
                });

            migrationBuilder.CreateTable(
                name: "Residents",
                columns: table => new
                {
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CaseControlNo = table.Column<string>(type: "TEXT", nullable: true),
                    InternalCode = table.Column<string>(type: "TEXT", nullable: true),
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: true),
                    CaseStatus = table.Column<string>(type: "TEXT", nullable: true),
                    Sex = table.Column<string>(type: "TEXT", nullable: true),
                    DateOfBirth = table.Column<string>(type: "TEXT", nullable: true),
                    BirthStatus = table.Column<string>(type: "TEXT", nullable: true),
                    PlaceOfBirth = table.Column<string>(type: "TEXT", nullable: true),
                    Religion = table.Column<string>(type: "TEXT", nullable: true),
                    CaseCategory = table.Column<string>(type: "TEXT", nullable: true),
                    SubCatOrphaned = table.Column<bool>(type: "INTEGER", nullable: true),
                    SubCatTrafficked = table.Column<bool>(type: "INTEGER", nullable: true),
                    SubCatChildLabor = table.Column<bool>(type: "INTEGER", nullable: true),
                    SubCatPhysicalAbuse = table.Column<bool>(type: "INTEGER", nullable: true),
                    SubCatSexualAbuse = table.Column<bool>(type: "INTEGER", nullable: true),
                    SubCatOsaec = table.Column<bool>(type: "INTEGER", nullable: true),
                    SubCatCicl = table.Column<bool>(type: "INTEGER", nullable: true),
                    SubCatAtRisk = table.Column<bool>(type: "INTEGER", nullable: true),
                    SubCatStreetChild = table.Column<bool>(type: "INTEGER", nullable: true),
                    SubCatChildWithHiv = table.Column<bool>(type: "INTEGER", nullable: true),
                    IsPwd = table.Column<bool>(type: "INTEGER", nullable: true),
                    PwdType = table.Column<string>(type: "TEXT", nullable: true),
                    HasSpecialNeeds = table.Column<bool>(type: "INTEGER", nullable: true),
                    SpecialNeedsDiagnosis = table.Column<string>(type: "TEXT", nullable: true),
                    FamilyIs4ps = table.Column<bool>(type: "INTEGER", nullable: true),
                    FamilySoloParent = table.Column<bool>(type: "INTEGER", nullable: true),
                    FamilyIndigenous = table.Column<bool>(type: "INTEGER", nullable: true),
                    FamilyParentPwd = table.Column<bool>(type: "INTEGER", nullable: true),
                    FamilyInformalSettler = table.Column<bool>(type: "INTEGER", nullable: true),
                    DateOfAdmission = table.Column<string>(type: "TEXT", nullable: true),
                    AgeUponAdmission = table.Column<string>(type: "TEXT", nullable: true),
                    PresentAge = table.Column<string>(type: "TEXT", nullable: true),
                    LengthOfStay = table.Column<string>(type: "TEXT", nullable: true),
                    ReferralSource = table.Column<string>(type: "TEXT", nullable: true),
                    ReferringAgencyPerson = table.Column<string>(type: "TEXT", nullable: true),
                    DateColbRegistered = table.Column<string>(type: "TEXT", nullable: true),
                    DateColbObtained = table.Column<string>(type: "TEXT", nullable: true),
                    AssignedSocialWorker = table.Column<string>(type: "TEXT", nullable: true),
                    InitialCaseAssessment = table.Column<string>(type: "TEXT", nullable: true),
                    DateCaseStudyPrepared = table.Column<string>(type: "TEXT", nullable: true),
                    ReintegrationType = table.Column<string>(type: "TEXT", nullable: true),
                    ReintegrationStatus = table.Column<string>(type: "TEXT", nullable: true),
                    InitialRiskLevel = table.Column<string>(type: "TEXT", nullable: true),
                    CurrentRiskLevel = table.Column<string>(type: "TEXT", nullable: true),
                    DateEnrolled = table.Column<string>(type: "TEXT", nullable: true),
                    DateClosed = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<string>(type: "TEXT", nullable: true),
                    NotesRestricted = table.Column<string>(type: "TEXT", nullable: true),
                    MlPredictionStatus = table.Column<string>(type: "TEXT", nullable: true),
                    MlLastCalculated = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Residents", x => x.ResidentId);
                });

            migrationBuilder.CreateTable(
                name: "SafehouseMonthlyMetrics",
                columns: table => new
                {
                    MetricId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: true),
                    MonthStart = table.Column<string>(type: "TEXT", nullable: true),
                    MonthEnd = table.Column<string>(type: "TEXT", nullable: true),
                    ActiveResidents = table.Column<int>(type: "INTEGER", nullable: true),
                    AvgEducationProgress = table.Column<double>(type: "REAL", nullable: true),
                    AvgHealthScore = table.Column<double>(type: "REAL", nullable: true),
                    ProcessRecordingCount = table.Column<int>(type: "INTEGER", nullable: true),
                    HomeVisitationCount = table.Column<int>(type: "INTEGER", nullable: true),
                    IncidentCount = table.Column<int>(type: "INTEGER", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SafehouseMonthlyMetrics", x => x.MetricId);
                });

            migrationBuilder.CreateTable(
                name: "Safehouses",
                columns: table => new
                {
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SafehouseCode = table.Column<string>(type: "TEXT", nullable: true),
                    Name = table.Column<string>(type: "TEXT", nullable: true),
                    Region = table.Column<string>(type: "TEXT", nullable: true),
                    City = table.Column<string>(type: "TEXT", nullable: true),
                    Province = table.Column<string>(type: "TEXT", nullable: true),
                    Country = table.Column<string>(type: "TEXT", nullable: true),
                    OpenDate = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: true),
                    CapacityGirls = table.Column<int>(type: "INTEGER", nullable: true),
                    CapacityStaff = table.Column<int>(type: "INTEGER", nullable: true),
                    CurrentOccupancy = table.Column<int>(type: "INTEGER", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Safehouses", x => x.SafehouseId);
                });

            migrationBuilder.CreateTable(
                name: "SocialMediaPosts",
                columns: table => new
                {
                    PostId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Platform = table.Column<string>(type: "TEXT", nullable: true),
                    PlatformPostId = table.Column<string>(type: "TEXT", nullable: true),
                    PostUrl = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<string>(type: "TEXT", nullable: true),
                    DayOfWeek = table.Column<string>(type: "TEXT", nullable: true),
                    PostHour = table.Column<int>(type: "INTEGER", nullable: true),
                    PostType = table.Column<string>(type: "TEXT", nullable: true),
                    MediaType = table.Column<string>(type: "TEXT", nullable: true),
                    Caption = table.Column<string>(type: "TEXT", nullable: true),
                    Hashtags = table.Column<string>(type: "TEXT", nullable: true),
                    NumHashtags = table.Column<int>(type: "INTEGER", nullable: true),
                    MentionsCount = table.Column<int>(type: "INTEGER", nullable: true),
                    HasCallToAction = table.Column<bool>(type: "INTEGER", nullable: true),
                    CallToActionType = table.Column<string>(type: "TEXT", nullable: true),
                    ContentTopic = table.Column<string>(type: "TEXT", nullable: true),
                    SentimentTone = table.Column<string>(type: "TEXT", nullable: true),
                    CaptionLength = table.Column<int>(type: "INTEGER", nullable: true),
                    FeaturesResidentStory = table.Column<bool>(type: "INTEGER", nullable: true),
                    CampaignName = table.Column<string>(type: "TEXT", nullable: true),
                    IsBoosted = table.Column<bool>(type: "INTEGER", nullable: true),
                    BoostBudgetPhp = table.Column<double>(type: "REAL", nullable: true),
                    Impressions = table.Column<int>(type: "INTEGER", nullable: true),
                    Reach = table.Column<int>(type: "INTEGER", nullable: true),
                    Likes = table.Column<int>(type: "INTEGER", nullable: true),
                    Comments = table.Column<int>(type: "INTEGER", nullable: true),
                    Shares = table.Column<int>(type: "INTEGER", nullable: true),
                    Saves = table.Column<int>(type: "INTEGER", nullable: true),
                    ClickThroughs = table.Column<int>(type: "INTEGER", nullable: true),
                    VideoViews = table.Column<int>(type: "INTEGER", nullable: true),
                    EngagementRate = table.Column<double>(type: "REAL", nullable: true),
                    ProfileVisits = table.Column<int>(type: "INTEGER", nullable: true),
                    DonationReferrals = table.Column<int>(type: "INTEGER", nullable: true),
                    EstimatedDonationValuePhp = table.Column<double>(type: "REAL", nullable: true),
                    FollowerCountAtPost = table.Column<int>(type: "INTEGER", nullable: true),
                    WatchTimeSeconds = table.Column<double>(type: "REAL", nullable: true),
                    AvgViewDurationSeconds = table.Column<double>(type: "REAL", nullable: true),
                    SubscriberCountAtPost = table.Column<int>(type: "INTEGER", nullable: true),
                    Forwards = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialMediaPosts", x => x.PostId);
                });

            migrationBuilder.CreateTable(
                name: "Supporters",
                columns: table => new
                {
                    SupporterId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SupporterType = table.Column<string>(type: "TEXT", nullable: true),
                    DisplayName = table.Column<string>(type: "TEXT", nullable: true),
                    OrganizationName = table.Column<string>(type: "TEXT", nullable: true),
                    FirstName = table.Column<string>(type: "TEXT", nullable: true),
                    LastName = table.Column<string>(type: "TEXT", nullable: true),
                    RelationshipType = table.Column<string>(type: "TEXT", nullable: true),
                    Region = table.Column<string>(type: "TEXT", nullable: true),
                    Country = table.Column<string>(type: "TEXT", nullable: true),
                    Email = table.Column<string>(type: "TEXT", nullable: true),
                    Phone = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<string>(type: "TEXT", nullable: true),
                    FirstDonationDate = table.Column<string>(type: "TEXT", nullable: true),
                    AcquisitionChannel = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Supporters", x => x.SupporterId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DonationAllocations");

            migrationBuilder.DropTable(
                name: "Donations");

            migrationBuilder.DropTable(
                name: "EducationRecords");

            migrationBuilder.DropTable(
                name: "HealthWellbeingRecords");

            migrationBuilder.DropTable(
                name: "HomeVisitations");

            migrationBuilder.DropTable(
                name: "IncidentReports");

            migrationBuilder.DropTable(
                name: "InKindDonationItems");

            migrationBuilder.DropTable(
                name: "InterventionPlans");

            migrationBuilder.DropTable(
                name: "PartnerAssignments");

            migrationBuilder.DropTable(
                name: "Partners");

            migrationBuilder.DropTable(
                name: "ProcessRecordings");

            migrationBuilder.DropTable(
                name: "PublicImpactSnapshots");

            migrationBuilder.DropTable(
                name: "Residents");

            migrationBuilder.DropTable(
                name: "SafehouseMonthlyMetrics");

            migrationBuilder.DropTable(
                name: "Safehouses");

            migrationBuilder.DropTable(
                name: "SocialMediaPosts");

            migrationBuilder.DropTable(
                name: "Supporters");
        }
    }
}
