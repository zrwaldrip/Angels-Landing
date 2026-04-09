using AngelsLandingv2.API.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Data;

public class LighthouseDbContext : DbContext
{
    public LighthouseDbContext(DbContextOptions<LighthouseDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Donation>().HasIndex(d => d.OwnerEmail);
        modelBuilder.Entity<Donation>().HasIndex(d => d.OwnerSubject);
    }

    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<CampaignFeatureImportance> FeatureImportances => Set<CampaignFeatureImportance>();
    public DbSet<SocialEngagementInsight> SocialEngagementInsights => Set<SocialEngagementInsight>();
}
