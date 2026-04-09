using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AngelsLandingv2.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDonationOwnershipFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OwnerEmail",
                table: "Donations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OwnerSubject",
                table: "Donations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Donations_OwnerEmail",
                table: "Donations",
                column: "OwnerEmail");

            migrationBuilder.CreateIndex(
                name: "IX_Donations_OwnerSubject",
                table: "Donations",
                column: "OwnerSubject");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Donations_OwnerEmail",
                table: "Donations");

            migrationBuilder.DropIndex(
                name: "IX_Donations_OwnerSubject",
                table: "Donations");

            migrationBuilder.DropColumn(
                name: "OwnerEmail",
                table: "Donations");

            migrationBuilder.DropColumn(
                name: "OwnerSubject",
                table: "Donations");
        }
    }
}
