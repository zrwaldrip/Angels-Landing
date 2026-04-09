using System.Text.Json;
using AngelsLandingv2.API.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Data;

/// <summary>
/// Seeds the LighthouseDbContext tables from CSV files in the /data folder.
/// Only runs if the target table is empty.
/// </summary>
public static class CsvSeedingService
{
    public static async Task SeedAllAsync(LighthouseDbContext db, string dataFolder)
    {
        await SeedResidentsAsync(db, dataFolder);
        await SeedSafehousesAsync(db, dataFolder);
        await SeedSafehouseMonthlyMetricsAsync(db, dataFolder);
        await SeedSupportersAsync(db, dataFolder);
        await SeedDonationsAsync(db, dataFolder);
        await SeedDonationAllocationsAsync(db, dataFolder);
        await SeedInKindDonationItemsAsync(db, dataFolder);
        await SeedPartnersAsync(db, dataFolder);
        await SeedPartnerAssignmentsAsync(db, dataFolder);
        await SeedIncidentReportsAsync(db, dataFolder);
        await SeedInterventionPlansAsync(db, dataFolder);
        await SeedHomeVisitationsAsync(db, dataFolder);
        await SeedProcessRecordingsAsync(db, dataFolder);
        await SeedEducationRecordsAsync(db, dataFolder);
        await SeedHealthWellbeingRecordsAsync(db, dataFolder);
        await SeedPublicImpactSnapshotsAsync(db, dataFolder);
        await SeedSocialMediaPostsAsync(db, dataFolder);
        await SeedSocialEngagementInsightsAsync(db, dataFolder);
        await SeedSocialEngagementPostPredictionsAsync(db, dataFolder);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static string[] ReadLines(string dataFolder, string fileName)
    {
        var path = Path.Combine(dataFolder, fileName);
        return File.Exists(path) ? File.ReadAllLines(path) : [];
    }

    private static string[] ParseCsvLine(string line)
    {
        var result = new List<string>();
        bool inQuotes = false;
        var current = new System.Text.StringBuilder();

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }
        result.Add(current.ToString());
        return result.ToArray();
    }

    private static string? Str(string[] cols, int idx) =>
        cols.Length > idx && !string.IsNullOrWhiteSpace(cols[idx]) ? cols[idx].Trim() : null;

    private static int? Int(string[] cols, int idx) =>
        cols.Length > idx && int.TryParse(cols[idx].Trim(), out var v) ? v : null;

    private static double? Dbl(string[] cols, int idx) =>
        cols.Length > idx && double.TryParse(cols[idx].Trim(), System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : null;

    private static bool? Bool(string[] cols, int idx)
    {
        if (cols.Length <= idx) return null;
        var s = cols[idx].Trim().ToLowerInvariant();
        return s is "true" or "1" or "yes" ? true : s is "false" or "0" or "no" ? false : null;
    }

    // ─── Seeders ──────────────────────────────────────────────────────────────

    private static async Task SeedResidentsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.Residents.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "residents.csv");
        if (lines.Length <= 1) return;
        var batch = new List<Resident>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new Resident
            {
                ResidentId = Int(c, 0) ?? 0,
                CaseControlNo = Str(c, 1), InternalCode = Str(c, 2),
                SafehouseId = Int(c, 3), CaseStatus = Str(c, 4), Sex = Str(c, 5),
                DateOfBirth = Str(c, 6), BirthStatus = Str(c, 7), PlaceOfBirth = Str(c, 8),
                Religion = Str(c, 9), CaseCategory = Str(c, 10),
                SubCatOrphaned = Bool(c, 11), SubCatTrafficked = Bool(c, 12),
                SubCatChildLabor = Bool(c, 13), SubCatPhysicalAbuse = Bool(c, 14),
                SubCatSexualAbuse = Bool(c, 15), SubCatOsaec = Bool(c, 16),
                SubCatCicl = Bool(c, 17), SubCatAtRisk = Bool(c, 18),
                SubCatStreetChild = Bool(c, 19), SubCatChildWithHiv = Bool(c, 20),
                IsPwd = Bool(c, 21), PwdType = Str(c, 22),
                HasSpecialNeeds = Bool(c, 23), SpecialNeedsDiagnosis = Str(c, 24),
                FamilyIs4ps = Bool(c, 25), FamilySoloParent = Bool(c, 26),
                FamilyIndigenous = Bool(c, 27), FamilyParentPwd = Bool(c, 28),
                FamilyInformalSettler = Bool(c, 29),
                DateOfAdmission = Str(c, 30), AgeUponAdmission = Str(c, 31),
                PresentAge = Str(c, 32), LengthOfStay = Str(c, 33),
                ReferralSource = Str(c, 34), ReferringAgencyPerson = Str(c, 35),
                DateColbRegistered = Str(c, 36), DateColbObtained = Str(c, 37),
                AssignedSocialWorker = Str(c, 38), InitialCaseAssessment = Str(c, 39),
                DateCaseStudyPrepared = Str(c, 40), ReintegrationType = Str(c, 41),
                ReintegrationStatus = Str(c, 42), InitialRiskLevel = Str(c, 43),
                CurrentRiskLevel = Str(c, 44), DateEnrolled = Str(c, 45),
                DateClosed = Str(c, 46), CreatedAt = Str(c, 47), NotesRestricted = Str(c, 48)
            });
        }
        db.Residents.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedSafehousesAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.Safehouses.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "safehouses.csv");
        if (lines.Length <= 1) return;
        var batch = new List<Safehouse>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new Safehouse
            {
                SafehouseId = Int(c, 0) ?? 0,
                SafehouseCode = Str(c, 1), Name = Str(c, 2), Region = Str(c, 3),
                City = Str(c, 4), Province = Str(c, 5), Country = Str(c, 6),
                OpenDate = Str(c, 7), Status = Str(c, 8),
                CapacityGirls = Int(c, 9), CapacityStaff = Int(c, 10),
                CurrentOccupancy = Int(c, 11), Notes = Str(c, 12)
            });
        }
        db.Safehouses.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedSafehouseMonthlyMetricsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.SafehouseMonthlyMetrics.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "safehouse_monthly_metrics.csv");
        if (lines.Length <= 1) return;
        var batch = new List<SafehouseMonthlyMetric>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new SafehouseMonthlyMetric
            {
                MetricId = Int(c, 0) ?? 0,
                SafehouseId = Int(c, 1), MonthStart = Str(c, 2), MonthEnd = Str(c, 3),
                ActiveResidents = Int(c, 4), AvgEducationProgress = Dbl(c, 5),
                AvgHealthScore = Dbl(c, 6), ProcessRecordingCount = Int(c, 7),
                HomeVisitationCount = Int(c, 8), IncidentCount = Int(c, 9), Notes = Str(c, 10)
            });
        }
        db.SafehouseMonthlyMetrics.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedSupportersAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.Supporters.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "supporters.csv");
        if (lines.Length <= 1) return;
        var batch = new List<Supporter>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new Supporter
            {
                SupporterId = Int(c, 0) ?? 0,
                SupporterType = Str(c, 1), DisplayName = Str(c, 2),
                OrganizationName = Str(c, 3), FirstName = Str(c, 4), LastName = Str(c, 5),
                RelationshipType = Str(c, 6), Region = Str(c, 7), Country = Str(c, 8),
                Email = Str(c, 9), Phone = Str(c, 10), Status = Str(c, 11),
                CreatedAt = Str(c, 12), FirstDonationDate = Str(c, 13), AcquisitionChannel = Str(c, 14)
            });
        }
        db.Supporters.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedDonationsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.Donations.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "donations.csv");
        if (lines.Length <= 1) return;
        var batch = new List<Donation>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new Donation
            {
                DonationId = Int(c, 0) ?? 0,
                SupporterId = Int(c, 1), DonationType = Str(c, 2), DonationDate = Str(c, 3),
                IsRecurring = Bool(c, 4), CampaignName = Str(c, 5), ChannelSource = Str(c, 6),
                CurrencyCode = Str(c, 7), Amount = Dbl(c, 8), EstimatedValue = Dbl(c, 9),
                ImpactUnit = Str(c, 10), Notes = Str(c, 11), ReferralPostId = Int(c, 12)
            });
        }
        db.Donations.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedDonationAllocationsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.DonationAllocations.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "donation_allocations.csv");
        if (lines.Length <= 1) return;
        var batch = new List<DonationAllocation>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new DonationAllocation
            {
                AllocationId = Int(c, 0) ?? 0,
                DonationId = Int(c, 1), SafehouseId = Int(c, 2), ProgramArea = Str(c, 3),
                AmountAllocated = Dbl(c, 4), AllocationDate = Str(c, 5), AllocationNotes = Str(c, 6)
            });
        }
        db.DonationAllocations.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedInKindDonationItemsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.InKindDonationItems.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "in_kind_donation_items.csv");
        if (lines.Length <= 1) return;
        var batch = new List<InKindDonationItem>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new InKindDonationItem
            {
                ItemId = Int(c, 0) ?? 0,
                DonationId = Int(c, 1), ItemName = Str(c, 2), ItemCategory = Str(c, 3),
                Quantity = Int(c, 4), UnitOfMeasure = Str(c, 5),
                EstimatedUnitValue = Dbl(c, 6), IntendedUse = Str(c, 7), ReceivedCondition = Str(c, 8)
            });
        }
        db.InKindDonationItems.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedPartnersAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.Partners.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "partners.csv");
        if (lines.Length <= 1) return;
        var batch = new List<Partner>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new Partner
            {
                PartnerId = Int(c, 0) ?? 0,
                PartnerName = Str(c, 1), PartnerType = Str(c, 2), RoleType = Str(c, 3),
                ContactName = Str(c, 4), Email = Str(c, 5), Phone = Str(c, 6),
                Region = Str(c, 7), Status = Str(c, 8), StartDate = Str(c, 9),
                EndDate = Str(c, 10), Notes = Str(c, 11)
            });
        }
        db.Partners.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedPartnerAssignmentsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.PartnerAssignments.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "partner_assignments.csv");
        if (lines.Length <= 1) return;
        var batch = new List<PartnerAssignment>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new PartnerAssignment
            {
                AssignmentId = Int(c, 0) ?? 0,
                PartnerId = Int(c, 1), SafehouseId = Int(c, 2), ProgramArea = Str(c, 3),
                AssignmentStart = Str(c, 4), AssignmentEnd = Str(c, 5),
                ResponsibilityNotes = Str(c, 6), IsPrimary = Bool(c, 7), Status = Str(c, 8)
            });
        }
        db.PartnerAssignments.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedIncidentReportsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.IncidentReports.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "incident_reports.csv");
        if (lines.Length <= 1) return;
        var batch = new List<IncidentReport>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new IncidentReport
            {
                IncidentId = Int(c, 0) ?? 0,
                ResidentId = Int(c, 1), SafehouseId = Int(c, 2), IncidentDate = Str(c, 3),
                IncidentType = Str(c, 4), Severity = Str(c, 5), Description = Str(c, 6),
                ResponseTaken = Str(c, 7), Resolved = Bool(c, 8), ResolutionDate = Str(c, 9),
                ReportedBy = Str(c, 10), FollowUpRequired = Bool(c, 11)
            });
        }
        db.IncidentReports.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedInterventionPlansAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.InterventionPlans.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "intervention_plans.csv");
        if (lines.Length <= 1) return;
        var batch = new List<InterventionPlan>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new InterventionPlan
            {
                PlanId = Int(c, 0) ?? 0,
                ResidentId = Int(c, 1), PlanCategory = Str(c, 2), PlanDescription = Str(c, 3),
                ServicesProvided = Str(c, 4), TargetValue = Str(c, 5), TargetDate = Str(c, 6),
                Status = Str(c, 7), CaseConferenceDate = Str(c, 8),
                CreatedAt = Str(c, 9), UpdatedAt = Str(c, 10)
            });
        }
        db.InterventionPlans.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedHomeVisitationsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.HomeVisitations.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "home_visitations.csv");
        if (lines.Length <= 1) return;
        var batch = new List<HomeVisitation>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new HomeVisitation
            {
                VisitationId = Int(c, 0) ?? 0,
                ResidentId = Int(c, 1), VisitDate = Str(c, 2), SocialWorker = Str(c, 3),
                VisitType = Str(c, 4), LocationVisited = Str(c, 5), FamilyMembersPresent = Str(c, 6),
                Purpose = Str(c, 7), Observations = Str(c, 8), FamilyCooperationLevel = Str(c, 9),
                SafetyConcernsNoted = Bool(c, 10), FollowUpNeeded = Bool(c, 11),
                FollowUpNotes = Str(c, 12), VisitOutcome = Str(c, 13)
            });
        }
        db.HomeVisitations.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedProcessRecordingsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.ProcessRecordings.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "process_recordings.csv");
        if (lines.Length <= 1) return;
        var batch = new List<ProcessRecording>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new ProcessRecording
            {
                RecordingId = Int(c, 0) ?? 0,
                ResidentId = Int(c, 1), SessionDate = Str(c, 2), SocialWorker = Str(c, 3),
                SessionType = Str(c, 4), SessionDurationMinutes = Int(c, 5),
                EmotionalStateObserved = Str(c, 6), EmotionalStateEnd = Str(c, 7),
                SessionNarrative = Str(c, 8), InterventionsApplied = Str(c, 9),
                FollowUpActions = Str(c, 10), ProgressNoted = Bool(c, 11),
                ConcernsFlagged = Bool(c, 12), ReferralMade = Bool(c, 13), NotesRestricted = Str(c, 14)
            });
        }
        db.ProcessRecordings.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedEducationRecordsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.EducationRecords.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "education_records.csv");
        if (lines.Length <= 1) return;
        var batch = new List<EducationRecord>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new EducationRecord
            {
                EducationRecordId = Int(c, 0) ?? 0,
                ResidentId = Int(c, 1), RecordDate = Str(c, 2), EducationLevel = Str(c, 3),
                SchoolName = Str(c, 4), EnrollmentStatus = Str(c, 5),
                AttendanceRate = Dbl(c, 6), ProgressPercent = Dbl(c, 7),
                CompletionStatus = Str(c, 8), Notes = Str(c, 9)
            });
        }
        db.EducationRecords.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedHealthWellbeingRecordsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.HealthWellbeingRecords.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "health_wellbeing_records.csv");
        if (lines.Length <= 1) return;
        var batch = new List<HealthWellbeingRecord>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new HealthWellbeingRecord
            {
                HealthRecordId = Int(c, 0) ?? 0,
                ResidentId = Int(c, 1), RecordDate = Str(c, 2),
                GeneralHealthScore = Dbl(c, 3), NutritionScore = Dbl(c, 4),
                SleepQualityScore = Dbl(c, 5), EnergyLevelScore = Dbl(c, 6),
                HeightCm = Dbl(c, 7), WeightKg = Dbl(c, 8), Bmi = Dbl(c, 9),
                MedicalCheckupDone = Bool(c, 10), DentalCheckupDone = Bool(c, 11),
                PsychologicalCheckupDone = Bool(c, 12), Notes = Str(c, 13)
            });
        }
        db.HealthWellbeingRecords.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedPublicImpactSnapshotsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.PublicImpactSnapshots.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "public_impact_snapshots.csv");
        if (lines.Length <= 1) return;
        var batch = new List<PublicImpactSnapshot>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new PublicImpactSnapshot
            {
                SnapshotId = Int(c, 0) ?? 0,
                SnapshotDate = Str(c, 1), Headline = Str(c, 2), SummaryText = Str(c, 3),
                MetricPayloadJson = Str(c, 4), IsPublished = Bool(c, 5), PublishedAt = Str(c, 6)
            });
        }
        db.PublicImpactSnapshots.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedSocialMediaPostsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.SocialMediaPosts.AnyAsync()) return;
        var lines = ReadLines(dataFolder, "social_media_posts.csv");
        if (lines.Length <= 1) return;
        var batch = new List<SocialMediaPost>();
        foreach (var line in lines.Skip(1))
        {
            var c = ParseCsvLine(line);
            batch.Add(new SocialMediaPost
            {
                PostId = Int(c, 0) ?? 0,
                Platform = Str(c, 1), PlatformPostId = Str(c, 2), PostUrl = Str(c, 3),
                CreatedAt = Str(c, 4), DayOfWeek = Str(c, 5), PostHour = Int(c, 6),
                PostType = Str(c, 7), MediaType = Str(c, 8), Caption = Str(c, 9),
                Hashtags = Str(c, 10), NumHashtags = Int(c, 11), MentionsCount = Int(c, 12),
                HasCallToAction = Bool(c, 13), CallToActionType = Str(c, 14),
                ContentTopic = Str(c, 15), SentimentTone = Str(c, 16), CaptionLength = Int(c, 17),
                FeaturesResidentStory = Bool(c, 18), CampaignName = Str(c, 19),
                IsBoosted = Bool(c, 20), BoostBudgetPhp = Dbl(c, 21),
                Impressions = Int(c, 22), Reach = Int(c, 23), Likes = Int(c, 24),
                Comments = Int(c, 25), Shares = Int(c, 26), Saves = Int(c, 27),
                ClickThroughs = Int(c, 28), VideoViews = Int(c, 29), EngagementRate = Dbl(c, 30),
                ProfileVisits = Int(c, 31), DonationReferrals = Int(c, 32),
                EstimatedDonationValuePhp = Dbl(c, 33), FollowerCountAtPost = Int(c, 34),
                WatchTimeSeconds = Dbl(c, 35), AvgViewDurationSeconds = Dbl(c, 36),
                SubscriberCountAtPost = Int(c, 37), Forwards = Int(c, 38)
            });
        }
        db.SocialMediaPosts.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedSocialEngagementInsightsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.SocialEngagementInsights.AnyAsync()) return;

        var path = Path.Combine(dataFolder, "social_engagement_insights.json");
        if (!File.Exists(path)) return;

        using var doc = JsonDocument.Parse(await File.ReadAllTextAsync(path));
        var root = doc.RootElement;
        var computedAt = root.TryGetProperty("computedAt", out var ca) ? ca.GetString() : null;
        var modelVersion = root.TryGetProperty("modelVersion", out var mv) ? mv.GetString() : null;

        if (!root.TryGetProperty("factors", out var factors) || factors.ValueKind != JsonValueKind.Array)
            return;

        var batch = new List<SocialEngagementInsight>();
        foreach (var el in factors.EnumerateArray())
        {
            batch.Add(new SocialEngagementInsight
            {
                FactorKey = el.TryGetProperty("factorKey", out var fk) ? fk.GetString() : null,
                DisplayName = el.TryGetProperty("displayName", out var dn) ? dn.GetString() : null,
                Coefficient = el.TryGetProperty("coefficient", out var co) && co.TryGetDouble(out var cd) ? cd : null,
                PValue = el.TryGetProperty("pValue", out var pv) && pv.TryGetDouble(out var pd) ? pd : null,
                RankOrder = el.TryGetProperty("rankOrder", out var ro) && ro.TryGetInt32(out var ri) ? ri : null,
                ComputedAt = computedAt,
                ModelVersion = modelVersion
            });
        }

        if (batch.Count == 0) return;
        db.SocialEngagementInsights.AddRange(batch);
        await db.SaveChangesAsync();
    }

    private static async Task SeedSocialEngagementPostPredictionsAsync(LighthouseDbContext db, string dataFolder)
    {
        if (await db.SocialMediaPosts.AnyAsync(p => p.PredictedEngagementRate != null)) return;

        var path = Path.Combine(dataFolder, "social_engagement_post_predictions.json");
        if (!File.Exists(path)) return;

        using var doc = JsonDocument.Parse(await File.ReadAllTextAsync(path));
        if (doc.RootElement.ValueKind != JsonValueKind.Array) return;

        foreach (var el in doc.RootElement.EnumerateArray())
        {
            if (!el.TryGetProperty("postId", out var pidEl) || !pidEl.TryGetInt32(out var postId))
                continue;
            var pred = el.TryGetProperty("predictedEngagementRate", out var pr) && pr.TryGetDouble(out var p) ? p : (double?)null;
            var scored = el.TryGetProperty("engagementScoredAt", out var sc) ? sc.GetString() : null;
            if (pred is null) continue;

            var post = await db.SocialMediaPosts.FindAsync(postId);
            if (post is null) continue;
            post.PredictedEngagementRate = pred;
            post.EngagementScoredAt = scored;
        }

        await db.SaveChangesAsync();
    }
}
