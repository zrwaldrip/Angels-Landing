using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AngelsLandingv2.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPropensityColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PropensityLastCalculated",
                table: "Supporters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "PropensityScore",
                table: "Supporters",
                type: "REAL",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PropensityLastCalculated",
                table: "Supporters");

            migrationBuilder.DropColumn(
                name: "PropensityScore",
                table: "Supporters");
        }
    }
}
