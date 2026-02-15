using EmployeeCore.Shared.Models;
using EmployeeCore.Shared.Services;
using EmployeeCore.Shared.Validators;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace EmployeeApp.RazorPages.Pages;

public class CreateModel : PageModel
{
    private readonly IEmployeeRepository _repository;

    public CreateModel(IEmployeeRepository repository)
    {
        _repository = repository;
    }

    [BindProperty]
    public Employee Employee { get; set; } = new();

    public void OnGet()
    {
        Employee = new Employee
        {
            HireDate = DateTime.Today
        };
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        // Additional validation
        var (isValid, errors) = EmployeeValidator.Validate(Employee);
        if (!isValid)
        {
            foreach (var error in errors)
            {
                ModelState.AddModelError(string.Empty, error);
            }
            return Page();
        }

        await _repository.CreateAsync(Employee);
        return RedirectToPage("./Index");
    }
}
