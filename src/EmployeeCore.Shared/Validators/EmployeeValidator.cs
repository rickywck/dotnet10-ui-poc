using EmployeeCore.Shared.Models;
using System.ComponentModel.DataAnnotations;

namespace EmployeeCore.Shared.Validators;

public static class EmployeeValidator
{
    public static (bool IsValid, List<string> Errors) Validate(Employee employee)
    {
        var errors = new List<string>();
        var context = new ValidationContext(employee);
        var results = new List<ValidationResult>();

        if (!Validator.TryValidateObject(employee, context, results, true))
        {
            errors.AddRange(results.Select(r => r.ErrorMessage ?? "Validation error"));
        }

        // Additional custom validation
        if (employee.HireDate > DateTime.Today)
        {
            errors.Add("Hire date cannot be in the future");
        }

        if (employee.HireDate < DateTime.Today.AddYears(-50))
        {
            errors.Add("Hire date is too far in the past");
        }

        return (errors.Count == 0, errors);
    }
}
