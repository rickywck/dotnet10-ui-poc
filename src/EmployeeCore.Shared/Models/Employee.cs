using System.ComponentModel.DataAnnotations;

namespace EmployeeCore.Shared.Models;

public class Employee
{
    public int Id { get; set; }

    [Required(ErrorMessage = "First name is required")]
    [StringLength(50, ErrorMessage = "First name cannot exceed 50 characters")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Last name is required")]
    [StringLength(50, ErrorMessage = "Last name cannot exceed 50 characters")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Department is required")]
    [StringLength(50, ErrorMessage = "Department cannot exceed 50 characters")]
    public string Department { get; set; } = string.Empty;

    [Required(ErrorMessage = "Hire date is required")]
    [DataType(DataType.Date)]
    public DateTime HireDate { get; set; }

    [Required(ErrorMessage = "Salary is required")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Salary must be a positive number")]
    public decimal Salary { get; set; }

    public string FullName => $"{FirstName} {LastName}";
}
