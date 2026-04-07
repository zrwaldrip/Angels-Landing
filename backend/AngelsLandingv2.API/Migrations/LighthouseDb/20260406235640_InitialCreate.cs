using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AngelsLandingv2.API.Migrations.LighthouseDb
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DonationAllocations",
                columns: table => new
                {
                    AllocationId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DonationId = table.Column<int>(type: "integer", nullable: true),
                    SafehouseId = table.Column<int>(type: "integer", nullable: true),
                    ProgramArea = table.Column<string>(type: "text", nullable: true),
                    AmountAllocated = table.Column<double>(type: "double precision", nullable: true),
                    AllocationDate = table.Column<string>(type: "text", nullable: true),
                    AllocationNotes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DonationAllocations", x => x.AllocationId);
                });

            migrationBuilder.CreateTable(
                name: "Donations",
                columns: table => new
                {
                    DonationId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupporterId = table.Column<int>(type: "integer", nullable: true),
                    DonationType = table.Column<string>(type: "text", nullable: true),
                    DonationDate = table.Column<string>(type: "text", nullable: true),
                    IsRecurring = table.Column<bool>(type: "boolean", nullable: true),
                    CampaignName = table.Column<string>(type: "text", nullable: true),
                    ChannelSource = table.Column<string>(type: "text", nullable: true),
                    CurrencyCode = table.Column<string>(type: "text", nullable: true),
                    Amount = table.Column<double>(type: "double precision", nullable: true),
                    EstimatedValue = table.Column<double>(type: "double precision", nullable: true),
                    ImpactUnit = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    ReferralPostId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Donations", x => x.DonationId);
                });

            migrationBuilder.CreateTable(
                name: "EducationRecords",
                columns: table => new
                {
                    EducationRecordId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: true),
                    RecordDate = table.Column<string>(type: "text", nullable: true),
                    EducationLevel = table.Column<string>(type: "text", nullable: true),
                    SchoolName = table.Column<string>(type: "text", nullable: true),
                    EnrollmentStatus = table.Column<string>(type: "text", nullable: true),
                    AttendanceRate = table.Column<double>(type: "double precision", nullable: true),
                    ProgressPercent = table.Column<double>(type: "double precision", nullable: true),
                    CompletionStatus = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EducationRecords", x => x.EducationRecordId);
                });

            migrationBuilder.CreateTable(
                name: "HealthWellbeingRecords",
                columns: table => new
                {
                    HealthRecordId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: true),
                    RecordDate = table.Column<string>(type: "text", nullable: true),
                    GeneralHealthScore = table.Column<double>(type: "double precision", nullable: true),
                    NutritionScore = table.Column<double>(type: "double precision", nullable: true),
                    SleepQualityScore = table.Column<double>(type: "double precision", nullable: true),
                    EnergyLevelScore = table.Column<double>(type: "double precision", nullable: true),
                    HeightCm = table.Column<double>(type: "double precision", nullable: true),
                    WeightKg = table.Column<double>(type: "double precision", nullable: true),
                    Bmi = table.Column<double>(type: "double precision", nullable: true),
                    MedicalCheckupDone = table.Column<bool>(type: "boolean", nullable: true),
                    DentalCheckupDone = table.Column<bool>(type: "boolean", nullable: true),
                    PsychologicalCheckupDone = table.Column<bool>(type: "boolean", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HealthWellbeingRecords", x => x.HealthRecordId);
                });

            migrationBuilder.CreateTable(
                name: "HomeVisitations",
                columns: table => new
                {
                    VisitationId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: true),
                    VisitDate = table.Column<string>(type: "text", nullable: true),
                    SocialWorker = table.Column<string>(type: "text", nullable: true),
                    VisitType = table.Column<string>(type: "text", nullable: true),
                    LocationVisited = table.Column<string>(type: "text", nullable: true),
                    FamilyMembersPresent = table.Column<string>(type: "text", nullable: true),
                    Purpose = table.Column<string>(type: "text", nullable: true),
                    Observations = table.Column<string>(type: "text", nullable: true),
                    FamilyCooperationLevel = table.Column<string>(type: "text", nullable: true),
                    SafetyConcernsNoted = table.Column<bool>(type: "boolean", nullable: true),
                    FollowUpNeeded = table.Column<bool>(type: "boolean", nullable: true),
                    FollowUpNotes = table.Column<string>(type: "text", nullable: true),
                    VisitOutcome = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HomeVisitations", x => x.VisitationId);
                });

            migrationBuilder.CreateTable(
                name: "IncidentReports",
                columns: table => new
                {
                    IncidentId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: true),
                    SafehouseId = table.Column<int>(type: "integer", nullable: true),
                    IncidentDate = table.Column<string>(type: "text", nullable: true),
                    IncidentType = table.Column<string>(type: "text", nullable: true),
                    Severity = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ResponseTaken = table.Column<string>(type: "text", nullable: true),
                    Resolved = table.Column<bool>(type: "boolean", nullable: true),
                    ResolutionDate = table.Column<string>(type: "text", nullable: true),
                    ReportedBy = table.Column<string>(type: "text", nullable: true),
                    FollowUpRequired = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncidentReports", x => x.IncidentId);
                });

            migrationBuilder.CreateTable(
                name: "InKindDonationItems",
                columns: table => new
                {
                    ItemId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DonationId = table.Column<int>(type: "integer", nullable: true),
                    ItemName = table.Column<string>(type: "text", nullable: true),
                    ItemCategory = table.Column<string>(type: "text", nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: true),
                    UnitOfMeasure = table.Column<string>(type: "text", nullable: true),
                    EstimatedUnitValue = table.Column<double>(type: "double precision", nullable: true),
                    IntendedUse = table.Column<string>(type: "text", nullable: true),
                    ReceivedCondition = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InKindDonationItems", x => x.ItemId);
                });

            migrationBuilder.CreateTable(
                name: "InterventionPlans",
                columns: table => new
                {
                    PlanId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: true),
                    PlanCategory = table.Column<string>(type: "text", nullable: true),
                    PlanDescription = table.Column<string>(type: "text", nullable: true),
                    ServicesProvided = table.Column<string>(type: "text", nullable: true),
                    TargetValue = table.Column<string>(type: "text", nullable: true),
                    TargetDate = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: true),
                    CaseConferenceDate = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterventionPlans", x => x.PlanId);
                });

            migrationBuilder.CreateTable(
                name: "PartnerAssignments",
                columns: table => new
                {
                    AssignmentId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PartnerId = table.Column<int>(type: "integer", nullable: true),
                    SafehouseId = table.Column<int>(type: "integer", nullable: true),
                    ProgramArea = table.Column<string>(type: "text", nullable: true),
                    AssignmentStart = table.Column<string>(type: "text", nullable: true),
                    AssignmentEnd = table.Column<string>(type: "text", nullable: true),
                    ResponsibilityNotes = table.Column<string>(type: "text", nullable: true),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartnerAssignments", x => x.AssignmentId);
                });

            migrationBuilder.CreateTable(
                name: "Partners",
                columns: table => new
                {
                    PartnerId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PartnerName = table.Column<string>(type: "text", nullable: true),
                    PartnerType = table.Column<string>(type: "text", nullable: true),
                    RoleType = table.Column<string>(type: "text", nullable: true),
                    ContactName = table.Column<string>(type: "text", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Phone = table.Column<string>(type: "text", nullable: true),
                    Region = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: true),
                    StartDate = table.Column<string>(type: "text", nullable: true),
                    EndDate = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Partners", x => x.PartnerId);
                });

            migrationBuilder.CreateTable(
                name: "ProcessRecordings",
                columns: table => new
                {
                    RecordingId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: true),
                    SessionDate = table.Column<string>(type: "text", nullable: true),
                    SocialWorker = table.Column<string>(type: "text", nullable: true),
                    SessionType = table.Column<string>(type: "text", nullable: true),
                    SessionDurationMinutes = table.Column<int>(type: "integer", nullable: true),
                    EmotionalStateObserved = table.Column<string>(type: "text", nullable: true),
                    EmotionalStateEnd = table.Column<string>(type: "text", nullable: true),
                    SessionNarrative = table.Column<string>(type: "text", nullable: true),
                    InterventionsApplied = table.Column<string>(type: "text", nullable: true),
                    FollowUpActions = table.Column<string>(type: "text", nullable: true),
                    ProgressNoted = table.Column<bool>(type: "boolean", nullable: true),
                    ConcernsFlagged = table.Column<bool>(type: "boolean", nullable: true),
                    ReferralMade = table.Column<bool>(type: "boolean", nullable: true),
                    NotesRestricted = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessRecordings", x => x.RecordingId);
                });

            migrationBuilder.CreateTable(
                name: "PublicImpactSnapshots",
                columns: table => new
                {
                    SnapshotId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SnapshotDate = table.Column<string>(type: "text", nullable: true),
                    Headline = table.Column<string>(type: "text", nullable: true),
                    SummaryText = table.Column<string>(type: "text", nullable: true),
                    MetricPayloadJson = table.Column<string>(type: "text", nullable: true),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: true),
                    PublishedAt = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicImpactSnapshots", x => x.SnapshotId);
                });

            migrationBuilder.CreateTable(
                name: "Residents",
                columns: table => new
                {
                    ResidentId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CaseControlNo = table.Column<string>(type: "text", nullable: true),
                    InternalCode = table.Column<string>(type: "text", nullable: true),
                    SafehouseId = table.Column<int>(type: "integer", nullable: true),
                    CaseStatus = table.Column<string>(type: "text", nullable: true),
                    Sex = table.Column<string>(type: "text", nullable: true),
                    DateOfBirth = table.Column<string>(type: "text", nullable: true),
                    BirthStatus = table.Column<string>(type: "text", nullable: true),
                    PlaceOfBirth = table.Column<string>(type: "text", nullable: true),
                    Religion = table.Column<string>(type: "text", nullable: true),
                    CaseCategory = table.Column<string>(type: "text", nullable: true),
                    SubCatOrphaned = table.Column<bool>(type: "boolean", nullable: true),
                    SubCatTrafficked = table.Column<bool>(type: "boolean", nullable: true),
                    SubCatChildLabor = table.Column<bool>(type: "boolean", nullable: true),
                    SubCatPhysicalAbuse = table.Column<bool>(type: "boolean", nullable: true),
                    SubCatSexualAbuse = table.Column<bool>(type: "boolean", nullable: true),
                    SubCatOsaec = table.Column<bool>(type: "boolean", nullable: true),
                    SubCatCicl = table.Column<bool>(type: "boolean", nullable: true),
                    SubCatAtRisk = table.Column<bool>(type: "boolean", nullable: true),
                    SubCatStreetChild = table.Column<bool>(type: "boolean", nullable: true),
                    SubCatChildWithHiv = table.Column<bool>(type: "boolean", nullable: true),
                    IsPwd = table.Column<bool>(type: "boolean", nullable: true),
                    PwdType = table.Column<string>(type: "text", nullable: true),
                    HasSpecialNeeds = table.Column<bool>(type: "boolean", nullable: true),
                    SpecialNeedsDiagnosis = table.Column<string>(type: "text", nullable: true),
                    FamilyIs4ps = table.Column<bool>(type: "boolean", nullable: true),
                    FamilySoloParent = table.Column<bool>(type: "boolean", nullable: true),
                    FamilyIndigenous = table.Column<bool>(type: "boolean", nullable: true),
                    FamilyParentPwd = table.Column<bool>(type: "boolean", nullable: true),
                    FamilyInformalSettler = table.Column<bool>(type: "boolean", nullable: true),
                    DateOfAdmission = table.Column<string>(type: "text", nullable: true),
                    AgeUponAdmission = table.Column<string>(type: "text", nullable: true),
                    PresentAge = table.Column<string>(type: "text", nullable: true),
                    LengthOfStay = table.Column<string>(type: "text", nullable: true),
                    ReferralSource = table.Column<string>(type: "text", nullable: true),
                    ReferringAgencyPerson = table.Column<string>(type: "text", nullable: true),
                    DateColbRegistered = table.Column<string>(type: "text", nullable: true),
                    DateColbObtained = table.Column<string>(type: "text", nullable: true),
                    AssignedSocialWorker = table.Column<string>(type: "text", nullable: true),
                    InitialCaseAssessment = table.Column<string>(type: "text", nullable: true),
                    DateCaseStudyPrepared = table.Column<string>(type: "text", nullable: true),
                    ReintegrationType = table.Column<string>(type: "text", nullable: true),
                    ReintegrationStatus = table.Column<string>(type: "text", nullable: true),
                    InitialRiskLevel = table.Column<string>(type: "text", nullable: true),
                    CurrentRiskLevel = table.Column<string>(type: "text", nullable: true),
                    DateEnrolled = table.Column<string>(type: "text", nullable: true),
                    DateClosed = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<string>(type: "text", nullable: true),
                    NotesRestricted = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Residents", x => x.ResidentId);
                });

            migrationBuilder.CreateTable(
                name: "SafehouseMonthlyMetrics",
                columns: table => new
                {
                    MetricId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SafehouseId = table.Column<int>(type: "integer", nullable: true),
                    MonthStart = table.Column<string>(type: "text", nullable: true),
                    MonthEnd = table.Column<string>(type: "text", nullable: true),
                    ActiveResidents = table.Column<int>(type: "integer", nullable: true),
                    AvgEducationProgress = table.Column<double>(type: "double precision", nullable: true),
                    AvgHealthScore = table.Column<double>(type: "double precision", nullable: true),
                    ProcessRecordingCount = table.Column<int>(type: "integer", nullable: true),
                    HomeVisitationCount = table.Column<int>(type: "integer", nullable: true),
                    IncidentCount = table.Column<int>(type: "integer", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SafehouseMonthlyMetrics", x => x.MetricId);
                });

            migrationBuilder.CreateTable(
                name: "Safehouses",
                columns: table => new
                {
                    SafehouseId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SafehouseCode = table.Column<string>(type: "text", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: true),
                    Region = table.Column<string>(type: "text", nullable: true),
                    City = table.Column<string>(type: "text", nullable: true),
                    Province = table.Column<string>(type: "text", nullable: true),
                    Country = table.Column<string>(type: "text", nullable: true),
                    OpenDate = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: true),
                    CapacityGirls = table.Column<int>(type: "integer", nullable: true),
                    CapacityStaff = table.Column<int>(type: "integer", nullable: true),
                    CurrentOccupancy = table.Column<int>(type: "integer", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Safehouses", x => x.SafehouseId);
                });

            migrationBuilder.CreateTable(
                name: "SocialMediaPosts",
                columns: table => new
                {
                    PostId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Platform = table.Column<string>(type: "text", nullable: true),
                    PlatformPostId = table.Column<string>(type: "text", nullable: true),
                    PostUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<string>(type: "text", nullable: true),
                    DayOfWeek = table.Column<string>(type: "text", nullable: true),
                    PostHour = table.Column<int>(type: "integer", nullable: true),
                    PostType = table.Column<string>(type: "text", nullable: true),
                    MediaType = table.Column<string>(type: "text", nullable: true),
                    Caption = table.Column<string>(type: "text", nullable: true),
                    Hashtags = table.Column<string>(type: "text", nullable: true),
                    NumHashtags = table.Column<int>(type: "integer", nullable: true),
                    MentionsCount = table.Column<int>(type: "integer", nullable: true),
                    HasCallToAction = table.Column<bool>(type: "boolean", nullable: true),
                    CallToActionType = table.Column<string>(type: "text", nullable: true),
                    ContentTopic = table.Column<string>(type: "text", nullable: true),
                    SentimentTone = table.Column<string>(type: "text", nullable: true),
                    CaptionLength = table.Column<int>(type: "integer", nullable: true),
                    FeaturesResidentStory = table.Column<bool>(type: "boolean", nullable: true),
                    CampaignName = table.Column<string>(type: "text", nullable: true),
                    IsBoosted = table.Column<bool>(type: "boolean", nullable: true),
                    BoostBudgetPhp = table.Column<double>(type: "double precision", nullable: true),
                    Impressions = table.Column<int>(type: "integer", nullable: true),
                    Reach = table.Column<int>(type: "integer", nullable: true),
                    Likes = table.Column<int>(type: "integer", nullable: true),
                    Comments = table.Column<int>(type: "integer", nullable: true),
                    Shares = table.Column<int>(type: "integer", nullable: true),
                    Saves = table.Column<int>(type: "integer", nullable: true),
                    ClickThroughs = table.Column<int>(type: "integer", nullable: true),
                    VideoViews = table.Column<int>(type: "integer", nullable: true),
                    EngagementRate = table.Column<double>(type: "double precision", nullable: true),
                    ProfileVisits = table.Column<int>(type: "integer", nullable: true),
                    DonationReferrals = table.Column<int>(type: "integer", nullable: true),
                    EstimatedDonationValuePhp = table.Column<double>(type: "double precision", nullable: true),
                    FollowerCountAtPost = table.Column<int>(type: "integer", nullable: true),
                    WatchTimeSeconds = table.Column<double>(type: "double precision", nullable: true),
                    AvgViewDurationSeconds = table.Column<double>(type: "double precision", nullable: true),
                    SubscriberCountAtPost = table.Column<int>(type: "integer", nullable: true),
                    Forwards = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialMediaPosts", x => x.PostId);
                });

            migrationBuilder.CreateTable(
                name: "Supporters",
                columns: table => new
                {
                    SupporterId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupporterType = table.Column<string>(type: "text", nullable: true),
                    DisplayName = table.Column<string>(type: "text", nullable: true),
                    OrganizationName = table.Column<string>(type: "text", nullable: true),
                    FirstName = table.Column<string>(type: "text", nullable: true),
                    LastName = table.Column<string>(type: "text", nullable: true),
                    RelationshipType = table.Column<string>(type: "text", nullable: true),
                    Region = table.Column<string>(type: "text", nullable: true),
                    Country = table.Column<string>(type: "text", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Phone = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<string>(type: "text", nullable: true),
                    FirstDonationDate = table.Column<string>(type: "text", nullable: true),
                    AcquisitionChannel = table.Column<string>(type: "text", nullable: true)
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
