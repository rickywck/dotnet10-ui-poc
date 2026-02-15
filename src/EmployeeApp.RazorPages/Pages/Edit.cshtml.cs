using EmployeeCore.Shared.Models;
using EmployeeCore.Shared.Services;
using EmployeeCore.Shared.Validators;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace EmployeeApp.RazorPages.Pages;

public class EditModel : PageModel
{
    private readonly IEmployeeRepository _repository;

    public EditModel(IEmployeeRepository repository)
    {
        _repository = repository;
    }

    [BindProperty]
    public Employee Employee { get; set; } = new();

    public async Task<IActionResult> OnGetAsync(int id)
    {
        var employee = await _repository.GetByIdAsync(id);
        if (employee == null)
        {
            return NotFound();
        }

        Employee = employee;
        return Page();
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

        var updated = await _repository.UpdateAsync(Employee);
        if (updated == null)
        {
            return NotFound();
        }

        return RedirectToPage("./Index");
    }
}
